import { useEffect, useState } from 'react';
import type { Retailer } from './types';
import { loadRetailers } from './data';
import RankingView from './ranking/RankingView';

export default function App() {
  const [retailers, setRetailers] = useState<Retailer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRetailers()
      .then(setRetailers)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!retailers) return <div className="loading">Loading…</div>;

  return (
    <div className="page">
      <div className="brand">
        <span className="brand-name">Lailara LLC</span>
        <span className="brand-sub">Retailer Scorecard &amp; Renegotiation Simulator</span>
      </div>
      <div className="hero">
        <h1 className="headline">Your proudest customer is your heaviest anchor.</h1>
        <p className="subhead">
          Rank your retail partners by gross revenue — then by true all-in contribution.
          The lists don't match.
        </p>
      </div>
      <RankingView retailers={retailers} />
    </div>
  );
}
