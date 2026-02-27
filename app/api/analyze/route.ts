import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { scrapeSite, buildContentSummary } from '../../lib/scraper';
import { detectMetro } from '../../lib/metroDetector';

export const maxDuration = 30;

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
  metro: { city: string; state: string; confidence: string }
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
      "summary": "string (1 sentence, specific — name which platforms are present or absent)",
      "findings": ["string", "string", "string"]
    },
    "socialMediaActivity": {
      "score": number,
      "label": "Social Engagement & Activity",
      "summary": "string (what signals suggest activity level — posting frequency, ad pixels found, etc.)",
      "findings": ["string", "string", "string"]
    },
    "brandConsistency": {
      "score": number,
      "label": "Cross-Channel Brand Consistency",
      "summary": "string (is the name/tagline/visual identity consistent across platforms and site?)",
      "findings": ["string", "string", "string"]
    },
    "newsAndPR": {
      "score": number,
      "label": "News & Media Coverage",
      "summary": "string (press sections, media logos, journalist quotes, publications found?)",
      "findings": ["string", "string", "string"]
    },
    "broadcastAndOutdoor": {
      "score": number,
      "label": "Broadcast & Outdoor Advertising",
      "summary": "string (TV, radio, billboard signals — be honest about what is unknown)",
      "findings": ["string", "string", "string"]
    },
    "communityAndSponsorship": {
      "score": number,
      "label": "Community & Sponsorship Presence",
      "summary": "string (sponsorships, charities, local events, foundations found?)",
      "findings": ["string", "string", "string"]
    },
    "directoryAndListings": {
      "score": number,
      "label": "Legal Directory & Listings",
      "summary": "string (which directories are linked — Avvo, Martindale, FindLaw, Super Lawyers, etc.)",
      "findings": ["string", "string", "string"]
    },
    "metroBrandSaturation": {
      "score": number,
      "label": "Metro Brand Saturation",
      "summary": "string (vanity phone numbers, review volume, branded recall signals, local dominance indicators)",
      "findings": ["string", "string", "string"]
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

CRITICAL SCORING RULES — be strict:
- Most law firms score 30-55 on awareness. This is the norm.
- ONLY score social media presence high if multiple active platforms are confirmed via links.
- If NO social links were found: socialMediaPresence = 10-25 max.
- If NO press keywords or media logos: newsAndPR = 15-30 max.
- If NO TV/radio/billboard keywords: broadcastAndOutdoor = 10-30 max (note it as unknown, not zero, unless the firm is small/boutique).
- If NO directory links found: directoryAndListings = 20-40 (directories may exist even if not linked).
- Vanity phone number = strong metroBrandSaturation signal (+15 pts).
- High review count (500+) = strong metroBrandSaturation signal (+10 pts).
- Meta Pixel = social advertising signal → boost socialMediaActivity.
- Be specific in findings — name platforms, publications, directories by name. No generic findings.
- Findings should be 8-14 words each.
- criticalGap should create urgency without fully solving the problem.`;
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
      site = { homepage: null, subpages: [], errors: [err.message] };
    }

    const content = buildContentSummary(site);

    // Detect metro
    const allSignals = site.homepage?.signals;
    const allText = content;
    const metro = detectMetro(allText, allSignals?.address ?? null, allSignals?.phone ?? null);

    // Build prompt and call Claude
    const prompt = buildPrompt(normalizedUrl, content, metro);
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return NextResponse.json({
      ...result,
      detectedMetro: metro,
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
