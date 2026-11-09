// src/App.tsx
import React from 'react';
import { GardenScene } from './scenes/GardenScene/GardenScene';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { GameHUD } from './components/UI/GameHUD';

export const App: React.FC = () => {
  return (
    <main className="app-container">
      {/* Path-Synchronized Calligraphic Brushstroke Loading & Intro Screen */}
      <LoadingScreen />

      {/* Infinite Chunk-Based 3D Low-Poly World, Third-Person Character & Camera */}
      <GardenScene />

      {/* Parchment Exploration HUD & Memory Inspection Modal */}
      <GameHUD />
    </main>
  );
};

export default App;