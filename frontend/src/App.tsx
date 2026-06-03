import { useEffect, useState } from 'react';
import type { Retailer, AppView } from './types';
import { loadRetailers } from './data';
import EntryView from './entry/EntryView';
import MethodologyView from './methodology/MethodologyView';
import RankingView from './ranking/RankingView';

export default function App() {
  const [retailers, setRetailers] = useState<Retailer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('entry');

  useEffect(() => {
    loadRetailers()
      .then(setRetailers)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!retailers) return <div className="loading">Loading…</div>;

  if (view === 'entry') {
    return (
      <EntryView
        onExplore={() => setView('simulator')}
        onMethodology={() => setView('methodology')}
      />
    );
  }

  if (view === 'methodology') {
    return (
      <MethodologyView
        retailers={retailers}
        onContinue={() => setView('simulator')}
        onBack={() => setView('entry')}
      />
    );
  }

  // simulator view
  return (
    <div className="page">
      <div className="brand">
        <span className="brand-name">Lailara LLC</span>
        <span className="brand-sub">Retailer Scorecard &amp; Renegotiation Simulator</span>
      </div>
      <button className="nav-back" onClick={() => setView('entry')}>← Back to start</button>
      <RankingView retailers={retailers} />
      <p className="section-body" style={{ marginTop: 32, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        Simulator coming next.
      </p>
    </div>
  );
}
