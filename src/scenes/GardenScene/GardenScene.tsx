// src/scenes/GardenScene/GardenScene.tsx
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GardenLighting } from '../Lighting/GardenLighting';
import { GardenEnvironment } from '../Environment/GardenEnvironment';
import { PlayerCharacter } from '../../components/Character/PlayerCharacter';
import { ThirdPersonCamera } from '../../components/Camera/ThirdPersonCamera';
import { useGameStore } from '../../store/useGameStore';
import './GardenScene.css';

const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

/**
 * Choreographs the 3D Camera during the Loading/Intro sequence before handing
 * control seamlessly to the ThirdPersonCamera upon entering the garden.
 */
const IntroCameraDirector: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const introStage = useGameStore((state) => state.introStage);
    const lookAtTarget = useRef(new THREE.Vector3(-0.6, 5.2, -16));

    useFrame((state, rawDelta) => {
        if (phase !== 'loading') return;
        const delta = Math.min(rawDelta, 0.05);

        const t = state.clock.getElapsedTime();
        const pointerX = state.pointer.x * 0.25;
        const pointerY = state.pointer.y * 0.14;

        const isSkyCanvasFrame = introStage <= 2;

        _desiredPos.set(
            pointerX,
            isSkyCanvasFrame ? 3.05 : 2.35 + Math.sin(t * 0.45) * 0.04,
            isSkyCanvasFrame ? 11.4 : 12.2
        );

        _desiredTarget.set(
            -0.4 + pointerX * 0.6,
            isSkyCanvasFrame ? 5.2 + pointerY : 2.5 + pointerY,
            -16
        );

        state.camera.position.lerp(_desiredPos, delta * 1.65);
        lookAtTarget.current.lerp(_desiredTarget, delta * 1.65);
        state.camera.lookAt(lookAtTarget.current);
    });

    return null;
};

export const GardenScene: React.FC = () => {
    const quality = useGameStore((state) => state.quality);

    // Cap DPR sensibly on mid-range/high-DPI laptops so fill-rate never bottlenecks
    const dprRange = useMemo<[number, number]>(() => {
        if (quality === 'low') return [1, 1.2];
        const isLowCoreDevice =
            typeof navigator !== 'undefined' &&
            navigator.hardwareConcurrency &&
            navigator.hardwareConcurrency <= 4;
        return isLowCoreDevice ? [1, 1.35] : [1, 1.75];
    }, [quality]);

    return (
        <div className="garden-canvas-wrapper">
            <Canvas
                shadows
                dpr={dprRange}
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