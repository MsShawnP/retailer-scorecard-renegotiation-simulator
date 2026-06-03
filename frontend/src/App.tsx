import { useEffect, useState } from 'react';
import type { Retailer, AppView } from './types';
import { loadRetailers } from './data';

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

  // Views will be composed here in U4-U7
  return (
    <div className="page">
      <div className="brand">
        <span className="brand-name">Lailara LLC</span>
        <span className="brand-sub">Retailer Scorecard</span>
      </div>
      <p className="section-body">
        {retailers.length} retailers loaded. Views coming in U4–U7.
        Current view: {view}
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {(['entry', 'methodology', 'simulator'] as AppView[]).map((v) => (
          <button key={v} onClick={() => setView(v)}
            style={{ opacity: view === v ? 1 : 0.5 }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
