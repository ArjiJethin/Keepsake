// src/App.tsx
import React from 'react';
import { GardenScene } from './scenes/GardenScene/GardenScene';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const phase = useGameStore((state) => state.phase);
  const setPhase = useGameStore((state) => state.setPhase);
  const setIntroStage = useGameStore((state) => state.setIntroStage);
  const quality = useGameStore((state) => state.quality);
  const toggleQuality = useGameStore((state) => state.toggleQuality);

  const handleReplayIntro = () => {
    setIntroStage(1);
    setPhase('loading');
  };

  return (
    <main className="app-container">
      {/* Overhauled 6-Stage Brushstroke Loading & Intro Screen */}
      <LoadingScreen />

      {/* Full 3D Artistic Low-Poly Sunset Fantasy Garden */}
      <GardenScene />

      {/* Exploration Controls & Replay Bar (Visible after entering the garden) */}
      {phase === 'exploring' && (
        <div className="phase1-status-badge">
          <h2>Keepsake — Sunset Memory Garden</h2>
          <p>
            Drag with left-click to orbit the 3D garden, or replay the
            brushstroke intro sequence at any time.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="phase1-quality-toggle" onClick={toggleQuality}>
              <span>Quality:</span>
              <strong>{quality === 'high' ? 'High (2x)' : 'Low (1x)'}</strong>
            </button>
            <button
              className="phase1-quality-toggle"
              onClick={handleReplayIntro}
            >
              <strong>↻ Replay Loading Sequence</strong>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default App;