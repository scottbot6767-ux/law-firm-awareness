import * as cheerio from 'cheerio';

export interface AwarenessSignals {
  socialLinks: string[];
  socialPlatforms: string[];
  mediaLogos: string[];
  pressKeywords: string[];
  sponsorshipKeywords: string[];
  directoryLinks: string[];
  directoryNames: string[];
  vanityPhone: string | null;
  phone: string | null;
  address: string | null;
  tvKeywords: string[];
  radioKeywords: string[];
  billboardKeywords: string[];
  reviewCount: string | null;
  reviewPlatformMentions: string[];
  metaPixel: boolean;
  gtag: boolean;
  schemaOrgData: string[];
}

export interface ScrapedPage {
  url: string;
  title: string | null;
  bodyText: string;
  html: string;
  signals: AwarenessSignals;
}

export interface ScrapedSite {
  homepage: ScrapedPage | null;
  subpages: ScrapedPage[];
  errors: string[];
}

const SOCIAL_DOMAINS: Record<string, string> = {
  'facebook.com': 'Facebook',
  'fb.com': 'Facebook',
  'instagram.com': 'Instagram',
  'linkedin.com': 'LinkedIn',
  'twitter.com': 'Twitter/X',
  'x.com': 'Twitter/X',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'tiktok.com': 'TikTok',
  'threads.net': 'Threads',
  'pinterest.com': 'Pinterest',
};

const DIRECTORY_DOMAINS: Record<string, string> = {
  'avvo.com': 'Avvo',
  'martindale.com': 'Martindale-Hubbell',
  'findlaw.com': 'FindLaw',
  'justia.com': 'Justia',
  'superlawyers.com': 'Super Lawyers',
  'bestlawyers.com': 'Best Lawyers',
  'lawyers.com': 'Lawyers.com',
  'hg.org': 'HG.org',
  'nolo.com': 'Nolo',
  'lawinfo.com': 'LawInfo',
  'legalmatch.com': 'LegalMatch',
};

const PRESS_KEYWORDS = [
  'as seen on', 'featured in', 'in the media', 'press room', 'news room',
  'media coverage', 'press release', 'in the news', 'media mentions',
  'our media', 'press', 'publications', 'awarded', 'recognized by',
];

const SPONSORSHIP_KEYWORDS = [
  'proud sponsor', 'community sponsor', 'sponsoring', 'we sponsor',
  'giving back', 'community involvement', 'community partner', 'foundation',
  'charity', 'nonprofit', 'charitable', 'donate', 'donation',
  'local event', 'community event', 'fundraiser', 'scholarship',
];

const TV_KEYWORDS = [
  'as seen on tv', 'seen on tv', 'tv commercial', 'television',
  'tv ad', 'broadcast', 'channel', 'local news', 'news channel', 'abc', 'nbc', 'cbs', 'fox news',
];

const RADIO_KEYWORDS = [
  'radio', 'radio ad', 'radio commercial', 'radio station', 'am radio', 'fm radio',
  'heard on radio', 'radio spot',
];

const BILLBOARD_KEYWORDS = [
  'billboard', 'outdoor advertising', 'outdoor ad', 'freeway sign',
  'highway sign', 'bus bench', 'bus stop', 'transit ad',
];

function extractSignals(html: string, $: cheerio.CheerioAPI): AwarenessSignals {
  const signals: AwarenessSignals = {
    socialLinks: [],
    socialPlatforms: [],
    mediaLogos: [],
    pressKeywords: [],
    sponsorshipKeywords: [],
    directoryLinks: [],
    directoryNames: [],
    vanityPhone: null,
    phone: null,
    address: null,
    tvKeywords: [],
    radioKeywords: [],
    billboardKeywords: [],
    reviewCount: null,
    reviewPlatformMentions: [],
    metaPixel: false,
    gtag: false,
    schemaOrgData: [],
  };

  const bodyText = $('body').text().toLowerCase();
  const fullText = html.toLowerCase();

  // Social media links
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const [domain, platform] of Object.entries(SOCIAL_DOMAINS)) {
      if (href.includes(domain) && !signals.socialLinks.includes(href)) {
        signals.socialLinks.push(href);
        if (!signals.socialPlatforms.includes(platform)) {
          signals.socialPlatforms.push(platform);
        }
      }
    }
    // Directory links
    for (const [domain, name] of Object.entries(DIRECTORY_DOMAINS)) {
      if (href.includes(domain) && !signals.directoryLinks.includes(href)) {
        signals.directoryLinks.push(href);
        if (!signals.directoryNames.includes(name)) {
          signals.directoryNames.push(name);
        }
      }
    }
  });

  // Media logo alt text
  $('img[alt]').each((_, el) => {
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const mediaKeywords = ['abc', 'nbc', 'cbs', 'fox', 'cnn', 'news', 'times', 'journal',
      'herald', 'gazette', 'tribune', 'post', 'press', 'magazine', 'radio', 'tv', 'channel'];
    if (mediaKeywords.some(k => alt.includes(k))) {
      signals.mediaLogos.push($(el).attr('alt') || '');
    }
  });

  // Press keywords
  PRESS_KEYWORDS.forEach(kw => {
    if (bodyText.includes(kw)) signals.pressKeywords.push(kw);
  });

  // Sponsorship keywords
  SPONSORSHIP_KEYWORDS.forEach(kw => {
    if (bodyText.includes(kw)) signals.sponsorshipKeywords.push(kw);
  });

  // TV/Radio/Billboard keywords
  TV_KEYWORDS.forEach(kw => { if (bodyText.includes(kw)) signals.tvKeywords.push(kw); });
  RADIO_KEYWORDS.forEach(kw => { if (bodyText.includes(kw)) signals.radioKeywords.push(kw); });
  BILLBOARD_KEYWORDS.forEach(kw => { if (bodyText.includes(kw)) signals.billboardKeywords.push(kw); });

  // Vanity phone (1-800-LAWYERS style)
  const vanityMatch = bodyText.match(/1[-.]?800[-.]?[a-z]{6,}/i) ||
    bodyText.match(/\d[-.]?800[-.]?[a-z]{4,}/i);
  if (vanityMatch) signals.vanityPhone = vanityMatch[0];

  // Regular phone
  const phoneMatch = bodyText.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
  if (phoneMatch) signals.phone = phoneMatch[0];

  // Address — look for state abbreviations near numbers
  const addressMatch = $('address, footer, .footer, #footer').text().match(
    /\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5}/
  );
  if (addressMatch) signals.address = addressMatch[0];

  // Review count mentions
  const reviewMatch = bodyText.match(/(\d[\d,]+)\+?\s*(google\s*)?reviews?/i) ||
    bodyText.match(/(\d[\d,]+)\+?\s*client\s+reviews?/i) ||
    bodyText.match(/(\d[\d,]+)\+?\s*5[\s-]*star/i);
  if (reviewMatch) signals.reviewCount = reviewMatch[0];

  // Review platform mentions
  ['google', 'yelp', 'avvo', 'facebook', 'martindale'].forEach(p => {
    if (bodyText.includes(p + ' review') || bodyText.includes(p + ' rating')) {
      signals.reviewPlatformMentions.push(p);
    }
  });

  // Tracking pixels
  signals.metaPixel = fullText.includes('connect.facebook.net') || fullText.includes('fbevents.js');
  signals.gtag = fullText.includes('gtag') || fullText.includes('google-analytics');

  // Schema.org JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html() || '';
    if (content.length < 2000) signals.schemaOrgData.push(content);
  });

  return signals;
}

async function fetchPage(url: string): Promise<ScrapedPage | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LawFirmAwarenessBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Clean up noise
    $('script, style, noscript, iframe').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
    const title = $('title').text().trim() || null;
    const signals = extractSignals(html, cheerio.load(html));

    return { url, title, bodyText, html: html.slice(0, 15000), signals };
  } catch {
    return null;
  }
}

export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const errors: string[] = [];
  const base = new URL(url);

  const homepage = await fetchPage(url);
  if (!homepage) errors.push(`Failed to fetch homepage: ${url}`);

  // Try awareness-relevant subpages
  const subpageTargets = ['/about', '/about-us', '/media', '/press', '/news', '/community', '/contact'];
  const subpages: ScrapedPage[] = [];

  for (const path of subpageTargets.slice(0, 3)) {
    const subUrl = `${base.origin}${path}`;
    const page = await fetchPage(subUrl);
    if (page) subpages.push(page);
  }

  return { homepage, subpages, errors };
}

export function buildContentSummary(site: ScrapedSite): string {
  const parts: string[] = [];

  if (site.homepage) {
    parts.push(`=== HOMEPAGE (${site.homepage.url}) ===`);
    parts.push(`Title: ${site.homepage.title}`);
    parts.push(site.homepage.bodyText.slice(0, 4000));

    const s = site.homepage.signals;
    parts.push('\n--- AWARENESS SIGNALS (HOMEPAGE) ---');
    parts.push(`Social platforms found: ${s.socialPlatforms.join(', ') || 'NONE'}`);
    parts.push(`Social links: ${s.socialLinks.slice(0, 8).join(', ') || 'NONE'}`);
    parts.push(`Directory links: ${s.directoryNames.join(', ') || 'NONE'}`);
    parts.push(`Press keywords found: ${s.pressKeywords.join(', ') || 'NONE'}`);
    parts.push(`Sponsorship keywords: ${s.sponsorshipKeywords.join(', ') || 'NONE'}`);
    parts.push(`TV/broadcast keywords: ${s.tvKeywords.join(', ') || 'NONE'}`);
    parts.push(`Radio keywords: ${s.radioKeywords.join(', ') || 'NONE'}`);
    parts.push(`Billboard keywords: ${s.billboardKeywords.join(', ') || 'NONE'}`);
    parts.push(`Vanity phone: ${s.vanityPhone || 'NONE'}`);
    parts.push(`Phone: ${s.phone || 'NONE'}`);
    parts.push(`Address: ${s.address || 'NOT FOUND'}`);
    parts.push(`Review count mention: ${s.reviewCount || 'NONE'}`);
    parts.push(`Review platforms mentioned: ${s.reviewPlatformMentions.join(', ') || 'NONE'}`);
    parts.push(`Media logo alts: ${s.mediaLogos.slice(0, 10).join(', ') || 'NONE'}`);
    parts.push(`Meta Pixel (Facebook ads): ${s.metaPixel ? 'YES' : 'NO'}`);
    parts.push(`Google Analytics/Ads: ${s.gtag ? 'YES' : 'NO'}`);
    if (s.schemaOrgData.length > 0) {
      parts.push(`Schema.org data: ${s.schemaOrgData[0].slice(0, 500)}`);
    }
  }

  site.subpages.forEach(page => {
    parts.push(`\n=== SUBPAGE: ${page.url} ===`);
    parts.push(page.bodyText.slice(0, 1500));
    const s = page.signals;
    if (s.pressKeywords.length) parts.push(`Press keywords: ${s.pressKeywords.join(', ')}`);
    if (s.sponsorshipKeywords.length) parts.push(`Sponsorship keywords: ${s.sponsorshipKeywords.join(', ')}`);
    if (s.mediaLogos.length) parts.push(`Media logos: ${s.mediaLogos.join(', ')}`);
  });

  return parts.join('\n');
}
