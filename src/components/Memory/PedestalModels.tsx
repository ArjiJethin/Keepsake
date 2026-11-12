// src/components/Memory/PedestalModels.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import type {
    MemoryCategory,
    MemoryGrowthStage,
    PedestalVariant,
} from '../../systems/MemoryManager/memoryTypes';
import { createSculptedFacetedGeometry } from '../../scenes/Environment/lowPolyUtils';
import {
    CachedGLBAsset,
    GLB_ASSET_PATHS,
} from '../Environment/GLBWorldAssets';

interface PedestalVisualProps {
    variant: PedestalVariant;
    category: MemoryCategory;
    growthStage: MemoryGrowthStage;
    isNearby: boolean;
    isEchoing: boolean;
    isDiscovered: boolean;
}

const SPARKLE_STAR_GEO = new THREE.OctahedronGeometry(0.032, 0);

/**
 * Renders the floating crystal memory element and a delicate constellation
 * of twinkling starlight sparkles directly around the crystal (no torch beams).
 */
export const FloatingMemoryArtifact: React.FC<{
    category: MemoryCategory;
    yOffset: number;
    isNearby: boolean;
    isEchoing: boolean;
}> = ({ category, yOffset, isNearby, isEchoing }) => {
    const groupRef = useRef<THREE.Group>(null);
    const outerShellRef = useRef<THREE.Mesh>(null);
    const sparkleOrbitRef = useRef<THREE.Group>(null);
    const starRefs = useRef<Array<THREE.Mesh | null>>([]);

    const sparkles = useMemo(
        () =>
            Array.from({ length: 8 }).map((_, i) => ({
                angle: (i / 8) * Math.PI * 2,
                radius: 0.28 + (i % 3) * 0.09,
                y: (i % 2 === 0 ? 1 : -1) * (0.06 + (i % 3) * 0.05),
                speed: 1.8 + i * 0.35,
                phase: i * 0.9,
            })),
        []
    );

    useFrame(({ clock }, delta) => {
        const t = clock.getElapsedTime();
        if (groupRef.current) {
            groupRef.current.position.y = yOffset + Math.sin(t * 2.1) * 0.065;
            groupRef.current.rotation.y +=
                delta * (isEchoing ? 1.6 : isNearby ? 0.95 : 0.45);
        }
        if (outerShellRef.current) {
            const pulse =
                1.0 + Math.sin(t * 3.2) * (isNearby || isEchoing ? 0.1 : 0.04);
            outerShellRef.current.scale.setScalar(pulse);
        }
        if (sparkleOrbitRef.current) {
            sparkleOrbitRef.current.rotation.y = t * 0.42;
            for (let i = 0; i < sparkles.length; i++) {
                const mesh = starRefs.current[i];
                if (!mesh) continue;
                const sp = sparkles[i];
                const twinkle = Math.pow(
                    Math.max(0, Math.sin(t * sp.speed + sp.phase)),
                    2.4
                );
                const s = (isNearby || isEchoing ? 1.25 : 0.85) * (0.35 + twinkle * 1.15);
                mesh.scale.set(s * 0.65, s * 1.55, s * 0.65);
                mesh.position.y = sp.y + Math.sin(t * 1.7 + sp.phase) * 0.04;
            }
        }
    });

    const coreColor =
        category === 'music' || category === 'voice'
            ? '#fff0d4'
            : category === 'shrine'
                ? '#ffd9e8'
                : THEME.colors.memoryCore;

    const accentColor =
        category === 'shrine'
            ? '#ff85b3'
            : category === 'music'
                ? '#70e5ff'
                : THEME.colors.memoryGold;

    return (
        <group ref={groupRef} position={[0, yOffset, 0]}>
            {/* Faceted Inner Memory Crystal */}
            <mesh>
                <octahedronGeometry args={[0.17, 0]} />
                <meshBasicMaterial color={coreColor} />
            </mesh>

            {/* Subtle Shimmering Crystal Aura Shell */}
            <mesh ref={outerShellRef}>
                <octahedronGeometry args={[0.24, 1]} />
                <meshBasicMaterial
                    color={accentColor}
                    transparent
                    opacity={isNearby || isEchoing ? 0.42 : 0.24}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Delicate Twinkling Starlight Motes around the Crystal */}
            <group ref={sparkleOrbitRef}>
                {sparkles.map((sp, i) => (
                    <mesh
                        key={i}
                        ref={(el) => {
                            starRefs.current[i] = el;
                        }}
                        geometry={SPARKLE_STAR_GEO}
                        position={[
                            Math.cos(sp.angle) * sp.radius,
                            sp.y,
                            Math.sin(sp.angle) * sp.radius,
                        ]}
                    >
                        <meshBasicMaterial
                            color={i % 2 === 0 ? '#ffffff' : '#ffe488'}
                            transparent
                            opacity={0.92}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                        />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

export const BloomingMemoryFlora: React.FC<{
    growthStage: MemoryGrowthStage;
}> = React.memo(({ growthStage }) => {
    if (growthStage === 'seed') return null;

    const flowerCount =
        growthStage === 'plant' ? 3 : growthStage === 'tree' ? 5 : 7;

    return (
        <group>
            {Array.from({ length: flowerCount }).map((_, idx) => {
                const angle = (idx / flowerCount) * Math.PI * 2 + 0.5;
                const dist = 0.65 + (idx % 2) * 0.22;
                const x = Math.cos(angle) * dist;
                const z = Math.sin(angle) * dist;
                return (
                    <group key={idx} position={[x, 0.05, z]} rotation={[0, angle, 0]}>
                        <mesh position={[0, 0.1, 0]}>
                            <cylinderGeometry args={[0.015, 0.02, 0.2, 4]} />
                            <meshStandardMaterial color={THEME.colors.meadowBase} />
                        </mesh>
                        <mesh position={[0, 0.21, 0]}>
                            <dodecahedronGeometry args={[0.075, 0]} />
                            <meshStandardMaterial
                                color={
                                    idx % 2 === 0
                                        ? THEME.colors.flowerPetal
                                        : THEME.colors.sakuraLight
                                }
                                emissive={THEME.colors.memoryGold}
                                emissiveIntensity={0.22}
                                roughness={0.6}
                                flatShading
                            />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
});

export const PedestalFallbackMesh: React.FC<{ variant: PedestalVariant }> = ({
    variant,
}) => {
    const stoneGeo = useMemo(
        () =>
            createSculptedFacetedGeometry(
                variant === 'grand_portal' ? 1.1 : 0.72,
                1,
                [1.1, 1.25, 1.0],
                0.15,
                84,
                true
            ),
        [variant]
    );
    return (
        <mesh geometry={stoneGeo} position={[0, 0.55, 0]} castShadow receiveShadow>
            <meshStandardMaterial
                color={THEME.colors.stoneBase}
                roughness={0.86}
                flatShading
            />
        </mesh>
    );
};

export const PedestalModelSelector: React.FC<PedestalVisualProps> = React.memo(
    ({ variant, category, growthStage, isNearby, isEchoing }) => {
        const { glbUrl, targetHeight, crystalHeight } = useMemo(() => {
            switch (variant) {
                case 'grand_portal':
                    return {
                        glbUrl: GLB_ASSET_PATHS.pedestalV3,
                        targetHeight: 3.15,
                        crystalHeight: 1.52,
                    };
                case 'arched':
                    return {
                        glbUrl: GLB_ASSET_PATHS.pedestalV2,
                        targetHeight: 2.65,
                        crystalHeight: 1.38,
                    };
                case 'seed_mound':
                    return {
                        glbUrl: GLB_ASSET_PATHS.pedestalV1,
                        targetHeight: 1.45,
                        crystalHeight: 1.05,
                    };
                case 'minimal':
                default:
                    return {
                        glbUrl: GLB_ASSET_PATHS.pedestalV1,
                        targetHeight: 1.95,
                        crystalHeight: 1.32,
                    };
            }
        }, [variant]);

        return (
            <group>
                <CachedGLBAsset
                    url={glbUrl}
                    targetHeight={targetHeight}
                    sinkOffset={-0.04}
                    fallback={<PedestalFallbackMesh variant={variant} />}
                />
                <FloatingMemoryArtifact
                    category={category}
                    yOffset={crystalHeight}
                    isNearby={isNearby}
                    isEchoing={isEchoing}
                />
                <BloomingMemoryFlora growthStage={growthStage} />
            </group>
        );
    }
);

