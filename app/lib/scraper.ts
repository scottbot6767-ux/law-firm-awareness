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

export interface StatureSignals {
  dollarsRecovered: string | null;       // e.g. "$4.1 billion", "$600 million"
  dollarsRecoveredNumeric: number;       // normalized to dollars (4100000000, 600000000)
  officeCount: number;                   // number of office locations detected
  attorneyCount: number;                 // number of attorneys/lawyers mentioned
  yearsInPractice: number;               // years since founding
  reviewVolume: number;                  // numeric review count
  awardBadgeCount: number;              // number of distinct awards/badges
  multiStatePresence: string[];          // states detected
  hasVanityPhone: boolean;
  statureTier: 'mega' | 'national' | 'regional' | 'established' | 'standard';
  statureFloor: number;                  // minimum awareness score
}

export interface ScrapedPage {
  url: string;
  title: string | null;
  bodyText: string;
  html: string;
  signals: AwarenessSignals;
  internalLinks: { href: string; text: string }[];
}

export interface ScrapedSite {
  homepage: ScrapedPage | null;
  subpages: ScrapedPage[];
  errors: string[];
  stature: StatureSignals;
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

function detectStature(pages: ScrapedPage[]): StatureSignals {
  const allText = pages.map(p => p.bodyText).join(' ').toLowerCase();
  const allHtml = pages.map(p => p.html).join(' ').toLowerCase();
  // Also check raw HTML for stature signals (survives JS rendering better)
  const combinedText = allText + ' ' + allHtml;

  // --- Dollars recovered ---
  let dollarsRecovered: string | null = null;
  let dollarsRecoveredNumeric = 0;

  // Match patterns like "$4.1 billion", "$600+ million", "$2 billion recovered"
  const billionMatch = combinedText.match(/\$\s*([\d,.]+)\s*\+?\s*billion/i);
  const millionMatch = combinedText.match(/\$\s*([\d,.]+)\s*\+?\s*million/i);
  // Also match "over $X billion/million"
  const overBillionMatch = combinedText.match(/over\s*\$\s*([\d,.]+)\s*\+?\s*billion/i);
  const overMillionMatch = combinedText.match(/over\s*\$\s*([\d,.]+)\s*\+?\s*million/i);

  if (billionMatch || overBillionMatch) {
    const match = overBillionMatch || billionMatch;
    const num = parseFloat(match![1].replace(/,/g, ''));
    dollarsRecoveredNumeric = num * 1_000_000_000;
    dollarsRecovered = match![0];
  } else if (millionMatch || overMillionMatch) {
    const match = overMillionMatch || millionMatch;
    const num = parseFloat(match![1].replace(/,/g, ''));
    dollarsRecoveredNumeric = num * 1_000_000;
    dollarsRecovered = match![0];
  }

  // --- Office count ---
  let officeCount = 0;
  // Count from schema JSON-LD (LegalService/LocalBusiness with different addresses)
  const schemaLocations = new Set<string>();
  for (const page of pages) {
    for (const schema of page.signals.schemaOrgData) {
      try {
        const parsed = JSON.parse(schema);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item?.address?.streetAddress) schemaLocations.add(item.address.streetAddress);
          if (item?.location?.address?.streetAddress) schemaLocations.add(item.location.address.streetAddress);
          // Check @graph array
          if (item?.['@graph']) {
            for (const g of item['@graph']) {
              if (g?.address?.streetAddress) schemaLocations.add(g.address.streetAddress);
            }
          }
        }
      } catch {}
    }
  }
  officeCount = schemaLocations.size;

  // Also check for "X offices" or "X locations" in text
  const officeTextMatch = combinedText.match(/(\d+)\s*(?:offices|locations|office locations)/i);
  if (officeTextMatch) {
    const textCount = parseInt(officeTextMatch[1]);
    if (textCount > officeCount) officeCount = textCount;
  }
  if (officeCount === 0) {
    // Count distinct city/state mentions in addresses
    const addressMatches = allText.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2}\b/g);
    if (addressMatches) {
      officeCount = new Set(addressMatches).size;
    }
  }

  // --- Attorney count ---
  let attorneyCount = 0;
  const attorneyTextMatch = combinedText.match(/(\d+)\s*\+?\s*(?:attorneys|lawyers)/i);
  if (attorneyTextMatch) {
    attorneyCount = parseInt(attorneyTextMatch[1]);
  }
  // Check schema for employee count
  for (const page of pages) {
    for (const schema of page.signals.schemaOrgData) {
      try {
        const parsed = JSON.parse(schema);
        if (parsed?.numberOfEmployees?.value) {
          const empCount = parseInt(parsed.numberOfEmployees.value);
          if (empCount > attorneyCount) attorneyCount = empCount;
        }
        if (parsed?.employee && Array.isArray(parsed.employee)) {
          if (parsed.employee.length > attorneyCount) attorneyCount = parsed.employee.length;
        }
      } catch {}
    }
  }

  // --- Years in practice ---
  let yearsInPractice = 0;
  const currentYear = new Date().getFullYear();
  // "since 1985", "established 1992", "founded in 1990", "est. 1985"
  const yearMatch = combinedText.match(/(?:since|established|founded|est\.?|serving\s+since)\s*(?:in\s+)?(\d{4})/i);
  if (yearMatch) {
    const foundedYear = parseInt(yearMatch[1]);
    if (foundedYear > 1900 && foundedYear <= currentYear) {
      yearsInPractice = currentYear - foundedYear;
    }
  }
  // Also check schema for foundingDate
  for (const page of pages) {
    for (const schema of page.signals.schemaOrgData) {
      try {
        const parsed = JSON.parse(schema);
        if (parsed?.foundingDate) {
          const fy = parseInt(parsed.foundingDate);
          if (fy > 1900 && fy <= currentYear) {
            const yrs = currentYear - fy;
            if (yrs > yearsInPractice) yearsInPractice = yrs;
          }
        }
      } catch {}
    }
  }
  // Also match "X+ years" or "over X years"
  const yearsExpMatch = combinedText.match(/(?:over\s+)?(\d+)\s*\+?\s*years?\s*(?:of\s+)?(?:experience|practice|serving|combined)/i);
  if (yearsExpMatch) {
    const yrs = parseInt(yearsExpMatch[1]);
    if (yrs > yearsInPractice) yearsInPractice = yrs;
  }

  // --- Review volume ---
  let reviewVolume = 0;
  // From schema aggregateRating
  for (const page of pages) {
    for (const schema of page.signals.schemaOrgData) {
      try {
        const parsed = JSON.parse(schema);
        const findRating = (obj: any): number => {
          if (!obj || typeof obj !== 'object') return 0;
          if (obj.aggregateRating?.reviewCount) return parseInt(obj.aggregateRating.reviewCount) || 0;
          if (obj.aggregateRating?.ratingCount) return parseInt(obj.aggregateRating.ratingCount) || 0;
          for (const val of Object.values(obj)) {
            if (typeof val === 'object') {
              const found = findRating(val);
              if (found > 0) return found;
            }
          }
          return 0;
        };
        const count = findRating(parsed);
        if (count > reviewVolume) reviewVolume = count;
      } catch {}
    }
  }
  // From text mentions
  const reviewTextMatch = combinedText.match(/(\d[\d,]+)\s*\+?\s*(?:reviews?|5[\s-]*star|client\s+reviews?|satisfied\s+clients?)/i);
  if (reviewTextMatch) {
    const count = parseInt(reviewTextMatch[1].replace(/,/g, ''));
    if (count > reviewVolume) reviewVolume = count;
  }

  // --- Award badge count ---
  const awardPatterns = [
    /super\s*lawyer/i, /best\s*lawyer/i, /million\s*dollar\s*advocate/i,
    /national\s*trial\s*lawyer/i, /avvo\s*(?:rating|superb|10)/i,
    /martindale.*distinguished/i, /best\s*law\s*firm/i, /top\s*\d+/i,
    /board\s*certified/i, /lead\s*counsel/i, /litigator\s*award/i,
    /rising\s*star/i, /outstanding\s*trial/i, /best\s*of\s*the\s*bar/i,
    /lawyer\s*of\s*the\s*year/i, /preeminent/i, /av\s*rated/i,
  ];
  let awardBadgeCount = 0;
  for (const pattern of awardPatterns) {
    if (pattern.test(combinedText)) awardBadgeCount++;
  }

  // --- Multi-state presence ---
  const stateAbbrevs = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
  const multiStatePresence: string[] = [];
  // Check for state abbreviations in schema addresses
  for (const page of pages) {
    for (const schema of page.signals.schemaOrgData) {
      try {
        const parsed = JSON.parse(schema);
        const findStates = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.addressRegion && stateAbbrevs.includes(obj.addressRegion)) {
            if (!multiStatePresence.includes(obj.addressRegion)) multiStatePresence.push(obj.addressRegion);
          }
          for (const val of Object.values(obj)) {
            if (typeof val === 'object') findStates(val);
          }
        };
        findStates(parsed);
      } catch {}
    }
  }
  // Check for "nationwide" or "national"
  if (/\bnationwide\b|\bnational\b|\bacross\s+the\s+(?:country|nation|united\s+states)\b/i.test(combinedText)) {
    if (!multiStatePresence.includes('NATIONAL')) multiStatePresence.push('NATIONAL');
  }

  // --- Vanity phone ---
  const hasVanityPhone = pages.some(p => p.signals.vanityPhone !== null);

  // --- Determine tier ---
  let statureTier: 'mega' | 'national' | 'regional' | 'established' | 'standard' = 'standard';
  let statureFloor = 0;

  if (
    dollarsRecoveredNumeric >= 10_000_000_000 ||
    attorneyCount >= 1000 ||
    officeCount >= 20
  ) {
    statureTier = 'mega';
    statureFloor = 75;
  } else if (
    dollarsRecoveredNumeric >= 1_000_000_000 ||
    attorneyCount >= 100 ||
    officeCount >= 10 ||
    multiStatePresence.includes('NATIONAL')
  ) {
    statureTier = 'national';
    statureFloor = 60;
  } else if (
    dollarsRecoveredNumeric >= 100_000_000 ||
    officeCount >= 5 ||
    attorneyCount >= 50 ||
    reviewVolume >= 500 ||
    (multiStatePresence.length >= 3)
  ) {
    statureTier = 'regional';
    statureFloor = 50;
  } else if (
    dollarsRecoveredNumeric >= 10_000_000 ||
    officeCount >= 3 ||
    reviewVolume >= 100 ||
    yearsInPractice >= 10 ||
    awardBadgeCount >= 3
  ) {
    statureTier = 'established';
    statureFloor = 45;
  }

  return {
    dollarsRecovered,
    dollarsRecoveredNumeric,
    officeCount,
    attorneyCount,
    yearsInPractice,
    reviewVolume,
    awardBadgeCount,
    multiStatePresence,
    hasVanityPhone,
    statureTier,
    statureFloor,
  };
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
    const $raw = cheerio.load(html);

    // Extract internal links from full HTML before truncation
    const base = new URL(url);
    const internalLinks: { href: string; text: string }[] = [];
    $raw('a[href]').each((_, el) => {
      const href = $raw(el).attr('href') || '';
      const text = $raw(el).text().trim().replace(/\s+/g, ' ');
      try {
        const resolved = new URL(href, url);
        if (resolved.hostname === base.hostname && resolved.pathname !== '/' && resolved.pathname !== '') {
          internalLinks.push({ href: resolved.origin + resolved.pathname.replace(/\/$/, ''), text });
        }
      } catch {}
    });

    const signals = extractSignals(html, $raw);

    // Clean up noise for body text extraction
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
    const title = $raw('title').text().trim() || null;

    return { url, title, bodyText, html: html.slice(0, 15000), signals, internalLinks };
  } catch {
    return null;
  }
}

export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const errors: string[] = [];
  const base = new URL(url);

  const homepage = await fetchPage(url);
  if (!homepage) errors.push(`Failed to fetch homepage: ${url}`);

  // Discover subpages from nav links (more reliable than guessing paths)
  const subpages: ScrapedPage[] = [];
  const visited = new Set<string>([url]);
  const awarenessKeywords = ['about', 'media', 'press', 'news', 'community', 'contact', 'team', 'attorney', 'lawyer', 'result', 'review', 'testimonial', 'award', 'recognition', 'sponsor'];

  if (homepage) {
    const navUrls: { url: string; priority: number }[] = [];
    for (const link of homepage.internalLinks) {
      if (/\.(pdf|jpg|png|gif|svg|css|js|zip)$/i.test(link.href)) continue;
      if (visited.has(link.href)) continue;
      visited.add(link.href);
      const pathAndText = (link.href + ' ' + link.text).toLowerCase();
      let priority = 0;
      for (const k of awarenessKeywords) {
        if (pathAndText.includes(k)) priority++;
      }
      if (priority > 0) navUrls.push({ url: link.href, priority });
    }
    navUrls.sort((a, b) => b.priority - a.priority);
    // Fetch nav subpages in parallel for speed
    const navResults = await Promise.allSettled(
      navUrls.slice(0, 4).map(navUrl => fetchPage(navUrl.url))
    );
    for (const r of navResults) {
      if (r.status === 'fulfilled' && r.value) subpages.push(r.value);
    }
  }

  // Fallback: try common awareness-relevant paths in parallel if we found fewer than 3
  const fallbackPaths = ['/about', '/about-us', '/media', '/press', '/news', '/community', '/results', '/case-results', '/testimonials', '/reviews'];
  if (subpages.length < 3) {
    const fallbackUrls = fallbackPaths
      .map(p => `${base.origin}${p}`)
      .filter(u => !visited.has(u))
      .slice(0, 4);
    const fallbackResults = await Promise.allSettled(
      fallbackUrls.map(u => fetchPage(u))
    );
    for (const r of fallbackResults) {
      if (r.status === 'fulfilled' && r.value) subpages.push(r.value);
    }
  }

  const allPages = homepage ? [homepage, ...subpages] : subpages;
  const stature = detectStature(allPages);

  return { homepage, subpages, errors, stature };
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

  // Stature signals
  parts.push('\n--- FIRM STATURE SIGNALS ---');
  parts.push(`Dollars recovered: ${site.stature.dollarsRecovered || 'NOT FOUND'}`);
  parts.push(`Office count: ${site.stature.officeCount}`);
  parts.push(`Attorney count: ${site.stature.attorneyCount}`);
  parts.push(`Years in practice: ${site.stature.yearsInPractice || 'UNKNOWN'}`);
  parts.push(`Review volume: ${site.stature.reviewVolume}`);
  parts.push(`Award/badge count: ${site.stature.awardBadgeCount}`);
  parts.push(`Multi-state presence: ${site.stature.multiStatePresence.join(', ') || 'SINGLE STATE'}`);
  parts.push(`Vanity phone: ${site.stature.hasVanityPhone ? 'YES' : 'NO'}`);
  parts.push(`STATURE TIER: ${site.stature.statureTier.toUpperCase()}`);
  parts.push(`AWARENESS SCORE FLOOR: ${site.stature.statureFloor}`);

  return parts.join('\n');
}
