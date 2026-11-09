// src/scenes/Lighting/GardenLighting.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';

const SunsetSkyDome: React.FC = () => {
    const domeRef = useRef<THREE.Mesh>(null);

    const skyGeo = useMemo(() => {
        const geo = new THREE.SphereGeometry(185, 32, 24);
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);

        const cZenith = new THREE.Color(THEME.colors.skyZenith);
        const cMid = new THREE.Color(THEME.colors.skyMid);
        const cHorizon = new THREE.Color(THEME.colors.skyHorizon);
        const temp = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const normY = THREE.MathUtils.clamp(y / 105, 0, 1);

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
            const targetDensity =
                phase === 'loading' && introStage <= 2 ? 0.022 : 0.011;
            fogRef.current.density = THREE.MathUtils.lerp(
                fogRef.current.density,
                targetDensity,
                delta * 1.8
            );
        }

        // Keep directional shadow frustum centered near the player
        if (dirLightRef.current) {
            const px = playerTelemetry.position[0];
            const pz = playerTelemetry.position[2];
            dirLightRef.current.position.set(px - 28, 18, pz - 36);
            dirLightRef.current.target.position.set(px, 0, pz);
            dirLightRef.current.target.updateMatrixWorld();
        }
    });

    return (
        <>
            <color attach="background" args={[THEME.colors.fogColor]} />
            <fogExp2 ref={fogRef} attach="fog" args={[THEME.colors.fogColor, 0.02]} />

            <SunsetSkyDome />

            <ambientLight intensity={0.75} color="#cfa8b2" />
            <hemisphereLight
                args={[THEME.colors.skyHorizon, THEME.colors.meadowShadow, 0.95]}
            />

            <directionalLight
                ref={dirLightRef}
                position={[-28, 18, -36]}
                intensity={2.15}
                color="#ffd7ad"
                castShadow
                shadow-mapSize-width={shadowMapSize}
                shadow-mapSize-height={shadowMapSize}
                shadow-camera-near={1}
                shadow-camera-far={120}
                shadow-camera-left={-32}
                shadow-camera-right={32}
                shadow-camera-top={32}
                shadow-camera-bottom={-32}
                shadow-bias={-0.0004}
            />

            <directionalLight
                position={[18, 10, 22]}
                intensity={0.55}
                color="#e6b09c"
            />
        </>
    );
};