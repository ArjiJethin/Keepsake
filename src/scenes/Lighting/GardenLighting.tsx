// src/scenes/Lighting/GardenLighting.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import { useGameStore } from '../../store/useGameStore';

/**
 * Custom Sunset Gradient Sky Dome matching LoadingScreen.png
 */
const SunsetSkyDome: React.FC = () => {
    const skyGeo = useMemo(() => {
        const geo = new THREE.SphereGeometry(165, 32, 24);
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);

        const cZenith = new THREE.Color(THEME.colors.skyZenith);
        const cMid = new THREE.Color(THEME.colors.skyMid);
        const cHorizon = new THREE.Color(THEME.colors.skyHorizon);
        const temp = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const normY = THREE.MathUtils.clamp(y / 95, 0, 1);

            if (normY < 0.35) {
                temp.copy(cHorizon).lerp(cMid, normY / 0.35);
            } else {
                temp.copy(cMid).lerp(cZenith, (normY - 0.35) / 0.65);
            }

            colors[i * 3] = temp.r;
            colors[i * 3 + 1] = temp.g;
            colors[i * 3 + 2] = temp.b;
        }

        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geo;
    }, []);

    return (
        <mesh geometry={skyGeo}>
            <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} />
        </mesh>
    );
};

export const GardenLighting: React.FC = () => {
    const quality = useGameStore((state) => state.quality);
    const phase = useGameStore((state) => state.phase);
    const introStage = useGameStore((state) => state.introStage);
    const fogRef = useRef<THREE.FogExp2>(null);

    const shadowMapSize = quality === 'high' ? 2048 : 1024;

    // Choreograph atmospheric fog density with the loading stages:
    // Early stages (1-3) have dreamy painterly mist; Stages 4-6 & exploring reveal full depth.
    useFrame((_, delta) => {
        if (!fogRef.current) return;
        const targetDensity =
            phase === 'loading' && introStage <= 3 ? 0.026 : 0.0125;
        fogRef.current.density = THREE.MathUtils.lerp(
            fogRef.current.density,
            targetDensity,
            delta * 1.8
        );
    });

    return (
        <>
            <color attach="background" args={[THEME.colors.fogColor]} />
            <fogExp2 ref={fogRef} attach="fog" args={[THEME.colors.fogColor, 0.024]} />

            <SunsetSkyDome />

            {/* Warm Sunset Ambient & Hemisphere Fill */}
            <ambientLight intensity={0.72} color="#cfa8b2" />
            <hemisphereLight
                args={[THEME.colors.skyHorizon, THEME.colors.meadowShadow, 0.95]}
            />

            {/* Low Golden-Peach Sunset Key Light aligned with the Setting Sun */}
            <directionalLight
                position={[-28, 15, -38]}
                intensity={2.15}
                color="#ffd7ad"
                castShadow
                shadow-mapSize-width={shadowMapSize}
                shadow-mapSize-height={shadowMapSize}
                shadow-camera-near={1}
                shadow-camera-far={110}
                shadow-camera-left={-24}
                shadow-camera-right={24}
                shadow-camera-top={24}
                shadow-camera-bottom={-24}
                shadow-bias={-0.0004}
            />

            {/* Soft Front-Right Rim Fill so foreground rocks & tree bark show rich facets */}
            <directionalLight
                position={[18, 10, 22]}
                intensity={0.55}
                color="#e6b09c"
            />
        </>
    );
};