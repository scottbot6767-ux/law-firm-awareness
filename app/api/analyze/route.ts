import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { scrapeSite, buildContentSummary } from '../../lib/scraper';
import { detectMetro } from '../../lib/metroDetector';

/** Attempt to parse LLM JSON output, repairing common issues (trailing commas, truncation, code fences). */
function repairAndParseJSON(raw: string): any {
  let text = raw.replace(/```json|```/g, '').trim();
  // Try direct parse first
  try { return JSON.parse(text); } catch {}
  // Extract outermost JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}?\s*$/);
  if (!jsonMatch) throw new Error('No JSON object found in LLM response');
  text = jsonMatch[0];
  try { return JSON.parse(text); } catch {}
  // Repair common LLM JSON errors
  text = text
    .replace(/,\s*([}\]])/g, '$1')           // trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"')       // single-quoted strings
    .replace(/\n/g, ' ');                      // newlines inside strings
  try { return JSON.parse(text); } catch {}
  // Try closing truncated JSON
  let repaired = text.replace(/,\s*$/, '');
  repaired = repaired.replace(/"[^"]*$/, '""');
  const stack: string[] = [];
  for (const ch of repaired) {
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  repaired += stack.reverse().join('');
  try { return JSON.parse(repaired); } catch (e: any) {
    throw new Error(`Failed to parse LLM JSON after repair: ${e.message}\nFirst 500 chars: ${raw.slice(0, 500)}`);
  }
}

export const maxDuration = 60;

const EXEMPLAR_BENCHMARKS = {
  socialMediaPresence: 84,
  socialMediaActivity: 71,
  brandConsistency: 79,
  newsAndPR: 68,
  broadcastAndOutdoor: 62,
  communityAndSponsorship: 73,
  directoryAndListings: 81,
  metroBrandSaturation: 66,
};

function buildPrompt(
  url: string,
  content: string,
  metro: { city: string; state: string; confidence: string },
  stature: { tier: string; floor: number }
): string {
  return `You are a legal marketing analyst specializing in law firm awareness and visibility. Analyze the law firm at: ${url}

TARGET METRO (detected): ${metro.city}, ${metro.state} (confidence: ${metro.confidence})
If confidence is low or unknown, use the website content to infer the most likely market.

SCRAPED CONTENT AND AWARENESS SIGNALS:
${content}

Score this firm on 8 awareness dimensions. Base scores on WHAT WAS ACTUALLY FOUND in the signals above — be specific about what exists and what is conspicuously absent.

Return ONLY valid JSON — no markdown, no explanation, no preamble:

{
  "firmName": "string",
  "firmType": "string (e.g. Personal Injury, Criminal Defense, Family Law, etc.)",
  "targetMetro": "string (City, State — use your best inference)",
  "metroConfidence": "high|medium|low",
  "overallScore": number (0-100, weighted composite),
  "verdict": "string (2-3 sentences — direct, honest assessment of their awareness footprint in their market)",
  "categories": {
    "socialMediaPresence": {
      "score": number,
      "label": "Social Media Setup",
      "summary": "string (1 sentence, name platforms present or absent)",
      "findings": ["string", "string"]
    },
    "socialMediaActivity": {
      "score": number,
      "label": "Social Engagement & Activity",
      "summary": "string (activity level, ad pixels found)",
      "findings": ["string", "string"]
    },
    "brandConsistency": {
      "score": number,
      "label": "Cross-Channel Brand Consistency",
      "summary": "string (name/tagline/identity consistency)",
      "findings": ["string", "string"]
    },
    "newsAndPR": {
      "score": number,
      "label": "News & Media Coverage",
      "summary": "string (press sections, media logos found?)",
      "findings": ["string", "string"]
    },
    "broadcastAndOutdoor": {
      "score": number,
      "label": "Broadcast & Outdoor Advertising",
      "summary": "string (TV, radio, billboard signals)",
      "findings": ["string", "string"]
    },
    "communityAndSponsorship": {
      "score": number,
      "label": "Community & Sponsorship Presence",
      "summary": "string (sponsorships, charities, events)",
      "findings": ["string", "string"]
    },
    "directoryAndListings": {
      "score": number,
      "label": "Legal Directory & Listings",
      "summary": "string (which directories linked)",
      "findings": ["string", "string"]
    },
    "metroBrandSaturation": {
      "score": number,
      "label": "Metro Brand Saturation",
      "summary": "string (vanity phone, review volume, local dominance)",
      "findings": ["string", "string"]
    }
  },
  "topStrength": "string (single strongest awareness signal — be specific)",
  "criticalGap": "string (single most important awareness gap — tease the insight, don't fully solve it)",
  "peerComparison": "string (1 sentence comparing to top awareness firms in their practice area and market)"
}

SCORING CALIBRATION — elite benchmarks (top law firm awareness):
- Social Media Setup: ${EXEMPLAR_BENCHMARKS.socialMediaPresence}/100
- Social Engagement: ${EXEMPLAR_BENCHMARKS.socialMediaActivity}/100
- Brand Consistency: ${EXEMPLAR_BENCHMARKS.brandConsistency}/100
- News & PR: ${EXEMPLAR_BENCHMARKS.newsAndPR}/100
- Broadcast & Outdoor: ${EXEMPLAR_BENCHMARKS.broadcastAndOutdoor}/100
- Community & Sponsorship: ${EXEMPLAR_BENCHMARKS.communityAndSponsorship}/100
- Directory & Listings: ${EXEMPLAR_BENCHMARKS.directoryAndListings}/100
- Metro Brand Saturation: ${EXEMPLAR_BENCHMARKS.metroBrandSaturation}/100

FIRM STATURE: ${stature.tier.toUpperCase()} (floor: ${stature.floor}/100)
The overallScore MUST be >= ${stature.floor}.

SCORING RULES:
- socialMediaPresence: 2+ platforms → 45-65, 3+ → 55-75, none → 10-25, pixels only → 30-45
- socialMediaActivity: Meta Pixel/GA detected → min 35
- newsAndPR: press keywords OR media logos → 40-60, both → 55-75, neither → 15-30
- broadcastAndOutdoor: TV/radio/billboard keywords → 45-65, none → 20-35
- communityAndSponsorship: keywords found → 40-60, foundation/scholarship → 55-70, none → 15-30
- directoryAndListings: 2+ links → 55-75, 1 → 35-50, none → 25-40
- metroBrandSaturation: vanity phone +15, 500+ reviews +10, 100+ reviews +5, multi-office +10
- brandConsistency: schema matches branding → 45-65, slogan → +10
- If scraped content is thin (JS site), infer from stature tier — don't penalize for scraping limits
- Findings: 8-14 words each, be specific, name platforms/directories by name
- criticalGap: create urgency without fully solving the problem`;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let normalizedUrl = url;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      if (!url.startsWith('http')) normalizedUrl = `https://${url}`;
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
    }

    // Scrape
    let site;
    try {
      site = await scrapeSite(normalizedUrl);
    } catch (err: any) {
      site = { homepage: null, subpages: [], errors: [err.message], stature: { dollarsRecovered: null, dollarsRecoveredNumeric: 0, officeCount: 0, attorneyCount: 0, yearsInPractice: 0, reviewVolume: 0, awardBadgeCount: 0, multiStatePresence: [], hasVanityPhone: false, statureTier: 'standard' as const, statureFloor: 0 } };
    }

    const content = buildContentSummary(site);

    // Detect metro
    const allSignals = site.homepage?.signals;
    const allText = content;
    const metro = detectMetro(allText, allSignals?.address ?? null, allSignals?.phone ?? null);

    // Build prompt and call Claude
    const stature = site.stature;
    const prompt = buildPrompt(normalizedUrl, content, metro, { tier: stature.statureTier, floor: stature.statureFloor });
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    const result = repairAndParseJSON(text);

    // Enforce stature floor programmatically (don't rely on prompt alone)
    const rawScore = result.overallScore;
    const adjustedScore = Math.max(rawScore, stature.statureFloor);
    const wasAdjusted = adjustedScore > rawScore;

    return NextResponse.json({
      ...result,
      overallScore: adjustedScore,
      rawScore,
      statureAdjustment: wasAdjusted
        ? `Raw score of ${rawScore} was raised to ${adjustedScore} based on ${stature.statureTier} stature tier floor. ` +
          `This firm's objective stature signals (e.g. ${[
            stature.dollarsRecovered ? `${stature.dollarsRecovered} recovered` : null,
            stature.attorneyCount > 0 ? `${stature.attorneyCount} attorneys` : null,
            stature.officeCount > 0 ? `${stature.officeCount} offices` : null,
            stature.reviewVolume > 0 ? `${stature.reviewVolume} reviews` : null,
          ].filter(Boolean).join(', ') || 'detected signals'}) indicate awareness that may not be fully visible on-site.`
        : null,
      detectedMetro: metro,
      firmStature: {
        tier: site.stature.statureTier,
        floor: site.stature.statureFloor,
        signals: {
          dollarsRecovered: site.stature.dollarsRecovered,
          officeCount: site.stature.officeCount,
          attorneyCount: site.stature.attorneyCount,
          yearsInPractice: site.stature.yearsInPractice,
          reviewVolume: site.stature.reviewVolume,
          awardBadgeCount: site.stature.awardBadgeCount,
          multiStatePresence: site.stature.multiStatePresence,
          hasVanityPhone: site.stature.hasVanityPhone,
        },
      },
      scrapedPagesCount: (site.homepage ? 1 : 0) + site.subpages.length,
      scrapingErrors: site.errors,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    if (error.name === 'SyntaxError') {
      return NextResponse.json({ error: 'Failed to parse API response' }, { status: 500 });
    }
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
