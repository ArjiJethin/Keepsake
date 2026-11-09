// src/scenes/GardenScene/GardenScene.tsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GardenLighting } from '../Lighting/GardenLighting';
import { GardenEnvironment } from '../Environment/GardenEnvironment';
import { useGameStore } from '../../store/useGameStore';
import './GardenScene.css';

/**
 * Choreographs the 3D Camera during the Loading/Intro sequence:
 * - Stages 1-3 (Opening Canvas & Brushstroke Reveal): Camera gazes slightly upward
 *   into the misty sunset sky & upper olive canopy (matching LoadingAnimation.png Frames 1-4).
 * - Stages 4-5 (Intro Screen & Circular Loader): Camera settles smoothly into the
 *   iconic LoadingScreen.png composition framing the archway, floating waterfall island,
 *   winding path, and giant sakura tree.
 */
const IntroCameraDirector: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const introStage = useGameStore((state) => state.introStage);
    const lookAtTarget = useRef(new THREE.Vector3(-0.6, 5.2, -16));

    useFrame((state, delta) => {
        if (phase !== 'loading') return;

        const t = state.clock.getElapsedTime();
        const pointerX = state.pointer.x * 0.28;
        const pointerY = state.pointer.y * 0.16;

        // Early frames look slightly higher toward the sky canvas; Frame 4+ pans down to the full garden vista
        const isSkyCanvasFrame = introStage <= 2;

        const desiredPos = new THREE.Vector3(
            pointerX,
            isSkyCanvasFrame ? 3.1 : 2.35 + Math.sin(t * 0.45) * 0.04,
            isSkyCanvasFrame ? 11.4 : 12.2
        );

        const desiredTarget = new THREE.Vector3(
            -0.4 + pointerX * 0.6,
            isSkyCanvasFrame ? 5.6 + pointerY : 2.55 + pointerY,
            -16
        );

        state.camera.position.lerp(desiredPos, delta * 1.65);
        lookAtTarget.current.lerp(desiredTarget, delta * 1.65);
        state.camera.lookAt(lookAtTarget.current);
    });

    return null;
};

export const GardenScene: React.FC = () => {
    const quality = useGameStore((state) => state.quality);
    const phase = useGameStore((state) => state.phase);

    return (
        <div className="garden-canvas-wrapper">
            <Canvas
                shadows
                dpr={quality === 'high' ? [1, 2] : [1, 1.25]}
                camera={{
                    position: [0, 3.1, 11.4],
                    fov: 42,
                    near: 0.1,
                    far: 240,
                }}
                gl={{
                    antialias: quality === 'high',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.06,
                    powerPreference: 'high-performance',
                }}
            >
                <GardenLighting />
                <GardenEnvironment />
                <IntroCameraDirector />

                {phase === 'exploring' && (
                    <OrbitControls
                        enablePan={false}
                        enableDamping
                        dampingFactor={0.05}
                        minDistance={5}
                        maxDistance={22}
                        maxPolarAngle={Math.PI / 2 - 0.04}
                        target={[-0.4, 2.2, -4]}
                    />
                )}
            </Canvas>
        </div>
    );
};