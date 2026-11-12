// src/scenes/Lighting/GardenLighting.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';

/**
 * Restores the gentle, dreamy Keepsake sky dome with soft twilight mauve at the
 * zenith, dusty rose at mid-sky, and a warm apricot-cream horizon.
 */
const DreamySkyDome: React.FC = () => {
    const domeRef = useRef<THREE.Mesh>(null);

    const skyGeo = useMemo(() => {
        const geo = new THREE.SphereGeometry(235, 32, 24);
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);

        const cZenith = new THREE.Color(THEME.colors.skyZenith);
        const cMid = new THREE.Color(THEME.colors.skyMid);
        const cHorizon = new THREE.Color(THEME.colors.skyHorizon);
        const cGlow = new THREE.Color(THEME.colors.skyGlow);
        const temp = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const normY = THREE.MathUtils.clamp(y / 135, 0, 1);

            if (normY < 0.14) {
                temp.copy(cGlow).lerp(cHorizon, normY / 0.14);
            } else if (normY < 0.45) {
                temp.copy(cHorizon).lerp(cMid, (normY - 0.14) / 0.31);
            } else {
                temp.copy(cMid).lerp(cZenith, (normY - 0.45) / 0.55);
            }

            colors[i * 3] = temp.r;
            colors[i * 3 + 1] = temp.g;
            colors[i * 3 + 2] = temp.b;
        }

        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geo;
    }, []);

    useFrame(() => {
        if (domeRef.current) {
            domeRef.current.position.set(
                playerTelemetry.position[0],
                0,
                playerTelemetry.position[2]
            );
        }
    });

    return (
        <mesh ref={domeRef} geometry={skyGeo}>
            <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} />
        </mesh>
    );
};

export const GardenLighting: React.FC = () => {
    const quality = useGameStore((state) => state.quality);
    const phase = useGameStore((state) => state.phase);
    const introStage = useGameStore((state) => state.introStage);

    const fogRef = useRef<THREE.FogExp2>(null);
    const dirLightRef = useRef<THREE.DirectionalLight>(null);

    const shadowMapSize = quality === 'high' ? 2048 : 1024;

    useFrame((_, delta) => {
        if (fogRef.current) {
            // Soft atmospheric haze that blends distant chunks into the horizon
            const targetDensity =
                phase === 'loading' && introStage <= 2 ? 0.015 : 0.0052;
            fogRef.current.density = THREE.MathUtils.lerp(
                fogRef.current.density,
                targetDensity,
                delta * 1.8
            );
        }

        if (dirLightRef.current) {
            const px = playerTelemetry.position[0];
            const pz = playerTelemetry.position[2];
            dirLightRef.current.position.set(px - 28, 24, pz - 34);
            dirLightRef.current.target.position.set(px, 0, pz);
            dirLightRef.current.target.updateMatrixWorld();
        }
    });

    return (
        <>
            <color attach="background" args={[THEME.colors.fogColor]} />
            <fogExp2 ref={fogRef} attach="fog" args={[THEME.colors.fogColor, 0.0052]} />

            <DreamySkyDome />

            {/* Soft rose-cream ambient & hemisphere fill for a cohesive, gentle palette */}
            <ambientLight intensity={0.72} color="#e6cfd5" />
            <hemisphereLight
                args={[THEME.colors.skyHorizon, THEME.colors.meadowShadow, 0.88]}
            />

            {/* Warm golden-hour directional sunlight */}
            <directionalLight
                ref={dirLightRef}
                position={[-28, 24, -34]}
                intensity={1.85}
                color="#ffe4c4"
                castShadow
                shadow-mapSize-width={shadowMapSize}
                shadow-mapSize-height={shadowMapSize}
                shadow-camera-near={1}
                shadow-camera-far={130}
                shadow-camera-left={-38}
                shadow-camera-right={38}
                shadow-camera-top={38}
                shadow-camera-bottom={-38}
                shadow-bias={-0.0004}
            />

            {/* Gentle lavender-rose counter-fill light */}
            <directionalLight
                position={[22, 12, 24]}
                intensity={0.45}
                color="#d8b4c4"
            />
        </>
    );
};

