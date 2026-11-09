// src/scenes/Lighting/GardenLighting.tsx
import React from 'react';
import { THEME } from '../../styles/theme';
import { useGameStore } from '../../store/useGameStore';

export const GardenLighting: React.FC = () => {
    const quality = useGameStore((state) => state.quality);
    const shadowMapSize = quality === 'high' ? 2048 : 1024;

    return (
        <>
            <color attach="background" args={[THEME.colors.fog]} />
            <fogExp2 attach="fog" args={[THEME.colors.fog, 0.014]} />

            <ambientLight intensity={0.65} color={THEME.lighting.ambientColor} />

            <hemisphereLight
                args={[
                    THEME.lighting.hemisphereSky,
                    THEME.lighting.hemisphereGround,
                    0.85,
                ]}
            />

            <directionalLight
                position={THEME.lighting.sunPosition}
                intensity={1.75}
                color={THEME.lighting.sunColor}
                castShadow
                shadow-mapSize-width={shadowMapSize}
                shadow-mapSize-height={shadowMapSize}
                shadow-camera-near={0.5}
                shadow-camera-far={140}
                shadow-camera-left={-35}
                shadow-camera-right={35}
                shadow-camera-top={35}
                shadow-camera-bottom={-35}
                shadow-bias={-0.0005}
            />

            <directionalLight
                position={[25, 12, 30]}
                intensity={0.4}
                color="#e8b49a"
            />
        </>
    );
};