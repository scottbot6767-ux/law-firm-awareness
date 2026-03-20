'use client';

import { useState } from 'react';
import { encodeResults } from './lib/share';

interface CategoryScore {
  score: number;
  label: string;
  summary: string;
  findings: string[];
}

export interface AnalysisResult {
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

export function ResultsSection({ result, isShared }: { result: AnalysisResult; isShared?: boolean }) {
  const circumference = 2 * Math.PI * 90;

  const [shareMsg, setShareMsg] = useState('');
  const handleShare = () => {
    const encoded = encodeResults(result);
    const shareUrl = `${window.location.origin}/share#${encoded}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareMsg('Link Copied!');
      setTimeout(() => setShareMsg(''), 2000);
    });
  };

  return (
    <div className="results-section active">
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

      {/* SHARE + PDF BUTTONS */}
      {!isShared && (
        <div className="share-btn-wrap">
          <button className="share-btn" onClick={handleShare}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            {shareMsg || 'Share Results'}
          </button>
          <button className="share-btn pdf-btn" onClick={() => window.print()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
            </svg>
            Download PDF
          </button>
        </div>
      )}

      {/* SHARED BANNER */}
      {isShared && (
        <div className="shared-banner">Shared results — <a href="/">Run your own audit</a></div>
      )}

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
        <p className="benchmark-sub">How your firm&apos;s awareness footprint compares to elite firms in your market.</p>
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
      {!isShared ? (
        <div className="cta-section">
          <div className="cta-eyebrow">Full Audit Available</div>
          <h3 className="cta-title">Ready to dominate your market?</h3>
          <p className="cta-sub">This awareness score is just one piece of the picture. See how your firm performs across all four audit dimensions.</p>
          <div className="cta-buttons">
            <a href="https://lawfirmaudits.com" className="cta-btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              View All Audits
            </a>
          </div>
        </div>
      ) : (
        <div className="cta-section">
          <div className="cta-title">See how your firm scores.</div>
          <div className="cta-sub">Run your own Awareness Audit — free, instant, no login required.</div>
          <div className="cta-buttons">
            <a href="/" className="cta-btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Run Your Own Audit
            </a>
          </div>
        </div>
      )}

      {/* SCORE AGAIN */}
      {!isShared && (
        <div className="score-again">
          <button className="score-again-btn" onClick={() => window.location.href = '/'}>
            Audit another firm
          </button>
        </div>
      )}
    </div>
  );
}
