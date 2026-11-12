// src/App.tsx
import React from 'react';
import { GardenScene } from './scenes/GardenScene/GardenScene';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { CharacterSelectScreen } from './components/CharacterSelect/CharacterSelectScreen';
import { GameHUD } from './components/UI/GameHUD';
import { MobileJoystick } from './components/UI/MobileJoystick';
import { CustomCursor } from './components/UI/CustomCursor';

export const App: React.FC = () => {
  return (
    <main className="app-container">
      {/* Custom Botanical SVG Pointer (Active on Loading Screen, Modals, and while holding Alt) */}
      <CustomCursor />

      {/* Calligraphic Brushstroke Loading & Intro Screen */}
      <LoadingScreen />

      {/* Minimalist Centered Wanderer Selection Window (Male Left, Female Right) */}
      <CharacterSelectScreen />

      {/* Infinite Chunk-Based 3D Low-Poly World, Explorer Character & Camera */}
      <GardenScene />

      {/* Mobile Touchscreen Virtual Joystick (Bottom-Left, auto-fades when idle) */}
      <MobileJoystick />

      {/* Parchment Exploration HUD & Memory Inspection Modal */}
      <GameHUD />
    </main>
  );
};

export default App;
