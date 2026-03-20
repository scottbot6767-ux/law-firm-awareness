'use client';

import { useState, useEffect, useRef } from 'react';
import { ResultsSection, AnalysisResult } from './results';

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

  return (
    <>
      <div className="deco-orbs">
        <div className="deco-orb" />
        <div className="deco-orb" />
        <div className="deco-orb" />
      </div>

      <header>
        <a className="logo" href="https://lawfirmaudits.com" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt="LawFirmAudits" style={{ height: '26px', width: 'auto', display: 'block', mixBlendMode: 'multiply' }} />
        </a>
        <a href="https://lawfirmaudits.com" className="header-tag" style={{textDecoration:'none',color:'inherit'}}>LawFirmAudits.com</a>
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
                  type="text"
                  id="urlInput"
                  className="url-input"
                  placeholder="yourfirm.com or www.yourfirm.com"
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
        <div ref={resultRef}>
          <ResultsSection result={result} />
        </div>
      )}
    </>
  );
}
