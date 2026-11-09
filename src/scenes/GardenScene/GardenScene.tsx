// src/scenes/GardenScene/GardenScene.tsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GardenLighting } from '../Lighting/GardenLighting';
import { GardenEnvironment } from '../Environment/GardenEnvironment';
import { PlayerCharacter } from '../../components/Character/PlayerCharacter';
import { ThirdPersonCamera } from '../../components/Camera/ThirdPersonCamera';
import { useGameStore } from '../../store/useGameStore';
import './GardenScene.css';

/**
 * Choreographs the 3D Camera during the Loading/Intro sequence before handing
 * control seamlessly to the ThirdPersonCamera upon entering the garden.
 */
const IntroCameraDirector: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const introStage = useGameStore((state) => state.introStage);
    const lookAtTarget = useRef(new THREE.Vector3(-0.6, 5.2, -16));

    useFrame((state, delta) => {
        if (phase !== 'loading') return;

        const t = state.clock.getElapsedTime();
        const pointerX = state.pointer.x * 0.25;
        const pointerY = state.pointer.y * 0.14;

        const isSkyCanvasFrame = introStage <= 2;

        const desiredPos = new THREE.Vector3(
            pointerX,
            isSkyCanvasFrame ? 3.05 : 2.35 + Math.sin(t * 0.45) * 0.04,
            isSkyCanvasFrame ? 11.4 : 12.2
        );

        const desiredTarget = new THREE.Vector3(
            -0.4 + pointerX * 0.6,
            isSkyCanvasFrame ? 5.2 + pointerY : 2.5 + pointerY,
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

    return (
        <div className="garden-canvas-wrapper">
            <Canvas
                shadows
                dpr={quality === 'high' ? [1, 2] : [1, 1.25]}
                camera={{
                    position: [0, 3.05, 11.4],
                    fov: 42,
                    near: 0.1,
                    far: 260,
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
                <PlayerCharacter />
                <IntroCameraDirector />
                <ThirdPersonCamera />
            </Canvas>
        </div>
    );
};