'use client';

import { useState, useEffect, useRef } from 'react';

interface CategoryScore {
  score: number;
  label: string;
  summary: string;
  findings: string[];
}

interface AnalysisResult {
  firmName: string;
  firmType: string;
  targetMetro: string;
  metroConfidence: string;
  overallScore: number;
  verdict: string;
  categories: {
    socialMediaPresence: CategoryScore;
    socialMediaActivity: CategoryScore;
    brandConsistency: CategoryScore;
    newsAndPR: CategoryScore;
    broadcastAndOutdoor: CategoryScore;
    communityAndSponsorship: CategoryScore;
    directoryAndListings: CategoryScore;
    metroBrandSaturation: CategoryScore;
  };
  topStrength: string;
  criticalGap: string;
  peerComparison: string;
  detectedMetro?: { city: string; state: string; confidence: string };
  scrapedPagesCount?: number;
}

const BENCHMARKS = {
  socialMediaPresence: 84, socialMediaActivity: 71, brandConsistency: 79,
  newsAndPR: 68, broadcastAndOutdoor: 62, communityAndSponsorship: 73,
  directoryAndListings: 81, metroBrandSaturation: 66,
};

function getGrade(score: number): string {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getScoreClass(score: number): string {
  if (score >= 75) return 'score-excellent';
  if (score >= 60) return 'score-good';
  if (score >= 45) return 'score-average';
  if (score >= 30) return 'score-below';
  return 'score-poor';
}

function getPillClass(score: number): string {
  if (score >= 75) return 'pill-excellent';
  if (score >= 60) return 'pill-good';
  if (score >= 45) return 'pill-average';
  if (score >= 30) return 'pill-below';
  return 'pill-poor';
}

function getGradeClass(score: number): string {
  if (score >= 75) return 'grade-excellent';
  if (score >= 60) return 'grade-good';
  if (score >= 45) return 'grade-average';
  if (score >= 30) return 'grade-below';
  return 'grade-poor';
}

function getRingClass(score: number): string {
  if (score >= 75) return 'ring-excellent';
  if (score >= 60) return 'ring-good';
  if (score >= 45) return 'ring-average';
  if (score >= 30) return 'ring-below';
  return 'ring-poor';
}

function getBgClass(score: number): string {
  if (score >= 75) return 'bg-excellent';
  if (score >= 60) return 'bg-good';
  if (score >= 45) return 'bg-average';
  if (score >= 30) return 'bg-below';
  return 'bg-poor';
}

const LOADING_STEPS = [
  'Scanning website for social media signals...',
  'Detecting target metro area...',
  'Analyzing news and media presence...',
  'Checking advertising and sponsorship signals...',
  'Calculating awareness score...',
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(-1);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) {
      setActiveStep(0);
      setDoneSteps([]);
      let step = 0;
      const interval = setInterval(() => {
        setDoneSteps(prev => [...prev, step]);
        step++;
        if (step < LOADING_STEPS.length) {
          setActiveStep(step);
        } else {
          clearInterval(interval);
        }
      }, 4500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const circumference = 2 * Math.PI * 90;

  return (
    <>
      <div className="deco-orbs">
        <div className="deco-orb" />
        <div className="deco-orb" />
        <div className="deco-orb" />
      </div>

      <header>
        <a className="logo" href="https://scottbot6767-ux.github.io/law-firm-audits/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="LawFirmAudits" style={{ height: '26px', width: 'auto', display: 'block', mixBlendMode: 'multiply' }} />
        </a>
        <div className="header-tag">Powered by Rankings.io</div>
      </header>

      {/* INPUT SECTION */}
      <div id="inputSection" style={{ display: result || loading ? 'none' : 'block' }}>
        <div className="hero">
          <div className="hero-eyebrow">Awareness Intelligence for Law Firms</div>
          <h1>How visible is your firm<br /><em>in your market</em>?</h1>
          <p className="hero-sub">Enter your firm&apos;s website and get an instant awareness score across 8 dimensions — from social media presence to broadcast advertising and community footprint.</p>
        </div>

        <div className="input-card">
          <form onSubmit={handleSubmit}>
            <div className="input-row">
              <div className="url-input-wrap">
                <label className="url-label" htmlFor="urlInput">Law Firm Website URL</label>
                <input
                  type="url"
                  id="urlInput"
                  className="url-input"
                  placeholder="https://yourfirm.com"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <button className="grade-btn" type="submit" disabled={loading || !url.trim()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Audit My Awareness
              </button>
            </div>
            {error && <div className="error-msg visible">{error}</div>}
          </form>
        </div>

        <div className="section-line delay-1" style={{ marginTop: '80px' }} />

        {/* WHY AWARENESS MATTERS */}
        <div className="why-matters-section">
          <div className="why-matters-header">
            <h2 className="why-matters-title">Why Your Awareness Footprint Matters</h2>
            <p className="why-matters-subtitle">In legal, the firm people remember is the firm people call.</p>
          </div>
          <div className="why-matters-grid">
            <div className="why-matters-card">
              <div className="why-matters-card-body">
                <h3 className="why-matters-card-title">Most Firms Are Invisible Before Intent</h3>
                <p className="why-matters-card-text">Potential clients form opinions before they ever need a lawyer. If your brand isn&apos;t in the room before the need arises, you&apos;re starting the conversation behind. Awareness is the upstream investment that makes every other channel work harder.</p>
              </div>
            </div>
            <div className="why-matters-card">
              <div className="why-matters-card-body">
                <h3 className="why-matters-card-title">Consistency Is the Brand</h3>
                <p className="why-matters-card-text">A firm that looks different on Facebook than it does on billboards than it does on their website is a firm that doesn&apos;t stick. Recall comes from repetition and coherence. Inconsistency doesn&apos;t just dilute awareness — it actively erodes trust.</p>
              </div>
            </div>
            <div className="why-matters-card">
              <div className="why-matters-card-body">
                <h3 className="why-matters-card-title">Top Firms Own the Market</h3>
                <p className="why-matters-card-text">The strongest personal injury and criminal defense firms aren&apos;t just advertising — they&apos;re embedded in the community, in the news, on billboards, at local events. They become the obvious choice. Awareness is how you graduate from competitor to institution.</p>
              </div>
            </div>
            <div className="why-matters-card">
              <div className="why-matters-card-body">
                <h3 className="why-matters-card-title">You Can&apos;t Improve What You Don&apos;t Track</h3>
                <p className="why-matters-card-text">Most firms have no idea how many platforms they&apos;re on, whether their accounts are active, or how many publications have mentioned them. This audit gives you the baseline — so you can stop guessing and start building deliberately.</p>
              </div>
            </div>
          </div>
          <div className="why-matters-cta">
            <div className="why-matters-cta-content">
              <h3 className="why-matters-cta-title">See where your firm stands in the market</h3>
              <p className="why-matters-cta-text">Get your free awareness scorecard in 60 seconds &uarr;</p>
            </div>
          </div>
        </div>
      </div>

      {/* LOADING STATE */}
      <div className={`loading-state${loading ? ' active' : ''}`}>
        <div className="loading-ring" />
        <div className="loading-title">Scanning your firm&apos;s footprint...</div>
        <div className="loading-sub">Analyzing awareness signals across all channels</div>
        <div className="loading-steps">
          {LOADING_STEPS.map((step, i) => (
            <div
              key={i}
              className={`loading-step${activeStep === i ? ' visible' : ''}${doneSteps.includes(i) && activeStep !== i ? ' done' : ''}`}
            >
              <div className="step-dot" />
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* RESULTS */}
      {result && (
        <div className="results-section active" ref={resultRef}>

          {/* Score hero */}
          <div className="score-hero">
            <div>
              <div className="score-firm-name">{result.firmType} &middot; {result.targetMetro}</div>
              {result.scrapedPagesCount && (
                <div className="data-source-indicator">
                  Analysis based on {result.scrapedPagesCount} page{result.scrapedPagesCount !== 1 ? 's' : ''} scanned
                </div>
              )}
              <h2 className="score-headline">{result.firmName}</h2>
              <p className="score-verdict">{result.verdict}</p>
            </div>
            <div className="score-ring-wrap">
              <div className="score-ring">
                <svg viewBox="0 0 200 200">
                  <circle className="score-ring-bg" cx="100" cy="100" r="90" />
                  <circle
                    className={`score-ring-fill ${getRingClass(result.overallScore)}`}
                    cx="100" cy="100" r="90"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (result.overallScore / 100) * circumference}
                  />
                </svg>
                <div className="score-ring-text">
                  <div className={`score-number ${getScoreClass(result.overallScore)}`}>{result.overallScore}</div>
                  <div className="score-denom">/ 100</div>
                </div>
              </div>
              <div className={`score-grade-badge ${getGradeClass(result.overallScore)}`}>
                Grade {getGrade(result.overallScore)}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="categories-label">Awareness Breakdown</div>
          <div className="categories-grid">
            {(Object.entries(result.categories) as [keyof typeof result.categories, CategoryScore][]).map(
              ([key, cat], i) => {
                const benchmark = BENCHMARKS[key] ?? 70;
                return (
                  <div className="cat-card" key={key} style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
                    <div className="cat-card-top">
                      <div className="cat-name">{cat.label}</div>
                      <div className={`cat-score-pill ${getPillClass(cat.score)}`}>{cat.score}/100</div>
                    </div>
                    <div className="cat-bar-track">
                      <div className={`cat-bar-fill ${getBgClass(cat.score)}`} style={{ width: `${cat.score}%` }} />
                    </div>
                    <p className="cat-summary">{cat.summary}</p>
                    <div className="cat-findings">
                      {cat.findings.map((f, j) => (
                        <div className="cat-finding" key={j}>
                          <span className="cat-finding-icon">&#x2014;</span>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Benchmark bar */}
          <div className="benchmark-section">
            <h3 className="benchmark-title">Market Benchmark Comparison</h3>
            <p className="benchmark-sub">How your firm&apos;s awareness footprint compares to elite firms in your market. The benchmark represents what top-tier firms in your practice area typically score.</p>
            <div className="benchmark-track">
              <div className="benchmark-avg-fill" style={{ width: '72%' }} />
              <div className={`benchmark-firm-fill ${getBgClass(result.overallScore)}`} style={{ width: `${result.overallScore}%` }} />
            </div>
            <div className="benchmark-labels">
              <span>0</span>
              <span>Elite Benchmark: 72</span>
              <span>100</span>
            </div>
            <div className="benchmark-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--surface-3)' }} />
                Elite Benchmark Avg (72)
              </div>
              <div className="legend-item">
                <div className={`legend-dot ${getBgClass(result.overallScore)}`} />
                {result.firmName} ({result.overallScore})
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="exemplar-section">
            <div className="exemplar-section-title">Key Insights</div>
            <div className="exemplar-grid">
              <div className="exemplar-card">
                <div className="exemplar-name">Top Strength</div>
                <div className="exemplar-type">What&apos;s Working</div>
                <p style={{ marginTop: '12px', fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{result.topStrength}</p>
              </div>
              <div className="exemplar-card">
                <div className="exemplar-name">Critical Gap</div>
                <div className="exemplar-type">Biggest Opportunity</div>
                <p style={{ marginTop: '12px', fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{result.criticalGap}</p>
              </div>
              <div className="exemplar-card" style={{ gridColumn: 'span 2' }}>
                <div className="exemplar-name">Market Position</div>
                <div className="exemplar-type">Peer Comparison</div>
                <p style={{ marginTop: '12px', fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{result.peerComparison}</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="cta-section">
            <div className="cta-eyebrow">Full Audit Available</div>
            <h3 className="cta-title">Ready to dominate your market?</h3>
            <p className="cta-sub">This awareness score is just one piece of the picture. See how your firm performs across all four audit dimensions — perception, consideration, and operational readiness included.</p>
            <div className="cta-buttons">
              <a href="https://scottbot6767-ux.github.io/law-firm-audits/" className="cta-btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                View All Audits
              </a>
              <button className="cta-btn-secondary" onClick={() => { setResult(null); setUrl(''); window.scrollTo(0, 0); }}>
                Audit Another Firm
              </button>
            </div>
          </div>

          <div className="score-again">
            <button className="score-again-btn" onClick={() => { setResult(null); setUrl(''); window.scrollTo(0, 0); }}>
              Audit another firm
            </button>
          </div>
        </div>
      )}
    </>
  );
}
