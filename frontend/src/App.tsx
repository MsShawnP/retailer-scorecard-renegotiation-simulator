import { useEffect, useState } from 'react';
import type { Retailer, AppView, LeverOverrides } from './types';
import { loadRetailers } from './data';
import EntryView from './entry/EntryView';
import MethodologyView from './methodology/MethodologyView';
import RankingView from './ranking/RankingView';
import SimulatorView from './simulator/SimulatorView';

export default function App() {
  const [retailers, setRetailers] = useState<Retailer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('entry');
  const [overridesByRetailerId, setOverridesByRetailerId] = useState<Record<string, LeverOverrides>>({});
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('walmart');

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
      <RankingView retailers={retailers} overrides={overridesByRetailerId} />
      <SimulatorView
        retailers={retailers}
        selectedRetailerId={selectedRetailerId}
        overridesByRetailerId={overridesByRetailerId}
        onSelectRetailer={setSelectedRetailerId}
        onOverridesChange={(retailerId, overrides) =>
          setOverridesByRetailerId((prev) => ({ ...prev, [retailerId]: overrides }))
        }
        onResetRetailer={(retailerId) =>
          setOverridesByRetailerId((prev) => {
            const next = { ...prev };
            delete next[retailerId];
            return next;
          })
        }
      />
    </div>
  );
}
