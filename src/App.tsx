// src/App.tsx
import React from 'react';
import { GardenScene } from './scenes/GardenScene/GardenScene';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const phase = useGameStore((state) => state.phase);
  const setPhase = useGameStore((state) => state.setPhase);
  const quality = useGameStore((state) => state.quality);
  const toggleQuality = useGameStore((state) => state.toggleQuality);

  return (
    <main className="app-container">
      {/* Phase 2 Animated Loading & Intro Sequence */}
      <LoadingScreen />

      {/* Main 3D Interactive World (Pre-renders underneath for seamless transition) */}
      <GardenScene />

      {/* Phase 2 Verification Badge (Visible once inside the garden) */}
      {phase === 'exploring' && (
        <div className="phase1-status-badge">
          <h2>Keepsake — Phase 2 Active</h2>
          <p>
            Animated brushstroke loading sequence complete. Ready for Phase 3
            (Full 3D Memory Garden Environment).
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="phase1-quality-toggle" onClick={toggleQuality}>
              <span>Quality:</span>
              <strong>{quality === 'high' ? 'High (2x)' : 'Low (1x)'}</strong>
            </button>
            <button
              className="phase1-quality-toggle"
              onClick={() => setPhase('loading')}
            >
              <strong>↻ Replay Loading Intro</strong>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default App;