import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { scrapeSite, buildContentSummary } from '../../lib/scraper';
import { detectMetro } from '../../lib/metroDetector';

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

IMPORTANT — JS-RENDERED SITE DETECTION:
If the scraped content appears thin, repetitive, or mostly CSS/JS noise (common with React, Next.js, Drupal, Angular sites), DO NOT assume the firm lacks these signals. Instead:
- If the site appears to be a major, well-known firm (based on URL, title, or any detectable branding), score based on reasonable inference of what a firm of that caliber likely has.
- If Meta Pixel or Google Analytics is detected but social links are not, the links are likely rendered client-side — score socialMediaPresence at 35-50 (unknown, not absent).
- If the site loads but body text is minimal, note this as a scraping limitation, not a firm deficiency.
- Look for signals in schema.org data, meta tags, and title — these survive JS rendering.

FIRM STATURE & AWARENESS FLOOR:
This firm's detected stature tier is: ${stature.tier.toUpperCase()}
Minimum awareness score (floor): ${stature.floor}/100

The stature tier is determined by objective signals found on the website:
- MEGA tier (floor 75): $10B+ recovered, 1000+ attorneys, or 20+ offices. These are industry-dominant firms (e.g. Morgan & Morgan, Kirkland & Ellis) whose brand awareness is a given — they are household names or institutional powerhouses. Score them accordingly.
- NATIONAL tier (floor 60): $1B+ recovered, 100+ attorneys, 10+ offices, or nationwide presence
- REGIONAL tier (floor 50): $100M+ recovered, 5+ offices, 50+ attorneys, 500+ reviews, or 3+ states
- ESTABLISHED tier (floor 45): $10M+ recovered, 3+ offices, 100+ reviews, 10+ years, or 3+ major awards
- STANDARD tier (no floor): None of the above signals detected

CRITICAL: The overallScore MUST NOT be lower than ${stature.floor}. These stature signals ARE awareness signals — a firm that has recovered billions of dollars, operates across multiple states, and has hundreds of reviews CANNOT have low awareness. Their brand exists in courtrooms, communities, and client networks even if their website doesn't explicitly showcase every channel.

For MEGA tier firms: these are among the most recognized legal brands in the world. Even if their website doesn't showcase TV ads or community sponsorships, their sheer scale guarantees high awareness. Score individual categories generously — a 1000+ attorney firm with 20+ offices has brand saturation, directory presence, and institutional recognition that smaller firms cannot match. The overallScore should typically be 75-90.

Individual category scores CAN still be low if genuinely no signals exist in that specific dimension, but the overallScore composite must respect the floor. If the raw category average would fall below the floor, boost the categories where the firm's stature most likely implies hidden strength (metroBrandSaturation, brandConsistency, directoryAndListings).

SCORING CALIBRATION RULES:
- Average/mediocre law firms score 35-50 on awareness.
- Well-established firms with visible awareness signals should score 50-65.
- Strong awareness firms with multiple channels active should score 65-78.
- Elite awareness (top firms in their market) score 78+.
- The overallScore should reflect the COMPOSITE picture — if a firm has strong signals in 4-5 categories, the overall should be solidly above 55 even if 2-3 categories are weak.

CATEGORY-SPECIFIC RULES:
- socialMediaPresence: If 2+ platform links found → 45-65. If 3+ platforms → 55-75. If NO links AND no pixels → 10-25. If pixels but no links → 30-45.
- socialMediaActivity: If Meta Pixel or Google Ads detected → minimum 35. Active posting signals → 50+.
- newsAndPR: If press keywords OR media logos found → 40-60. If BOTH → 55-75. If NEITHER → 15-30.
- broadcastAndOutdoor: If TV/radio/billboard keywords found → 45-65. If NONE → 20-35 (unknown ≠ absent).
- communityAndSponsorship: If sponsorship/charity keywords found → 40-60. If foundation or scholarship → 55-70. If NONE → 15-30.
- directoryAndListings: If 2+ directory links → 55-75. If 1 → 35-50. If NONE → 25-40 (most firms ARE listed).
- metroBrandSaturation: Vanity phone = +15 pts. 500+ reviews = +10 pts. 100+ reviews = +5 pts. Multiple offices = +10 pts.
- brandConsistency: If schema.org data matches firm branding → 45-65. If slogan/tagline detected → +10.
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
      model: 'claude-3-haiku-20240307',
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
