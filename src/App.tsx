// src/App.tsx
import React from 'react';
import { GardenScene } from './scenes/GardenScene/GardenScene';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { GameHUD } from './components/UI/GameHUD';
import { CustomCursor } from './components/UI/CustomCursor';

export const App: React.FC = () => {
  return (
    <main className="app-container">
      {/* Custom Botanical SVG Pointer (Active on Loading Screen, Modals, and while holding Alt) */}
      <CustomCursor />

      {/* Calligraphic Brushstroke Loading & Intro Screen */}
      <LoadingScreen />

      {/* Infinite Chunk-Based 3D Low-Poly World, Explorer Character & Pointer-Lock Camera */}
      <GardenScene />

      {/* Parchment Exploration HUD & Memory Inspection Modal */}
      <GameHUD />
    </main>
  );
};

export default App;