// src/components/Memory/PedestalModels.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createSculptedFacetedGeometry } from '../../scenes/Environment/lowPolyUtils';
import { CachedGLBAsset, GLB_ASSET_PATHS } from '../Environment/GLBWorldAssets';

export interface PedestalAnimRefs {
    crystalRef: (el: THREE.Group | null) => void;
    orbitRingRef: (el: THREE.Mesh | null) => void;
    shardsRef: (el: THREE.Group | null) => void;
    wellGlowRef: (el: THREE.Mesh | null) => void;
}

interface PedestalModelProps {
    isNear: boolean;
    isEchoing: boolean;
    animRefs?: PedestalAnimRefs;
}

const PEDESTAL_PALETTE = {
    sandstoneLight: '#d8b298',
    sandstoneMid: '#bf967c',
    sandstoneDark: '#99735c',
    sandstoneDeep: '#785745',
    terracottaStone: '#c98e70',
    bannerRed: '#c84b31',
    bannerDark: '#9e3620',
    emblemGold: '#f5b851',
    crystalCore: '#fff3c4',
    crystalMid: '#ffaa33',
    crystalDeep: '#e67e17',
    orbitGold: '#ffdf85',
    wellGlow: '#ffcf66',
    vineGreen: '#5e7840',
    vineLight: '#7b9652',
    flowerWhite: '#fcf5e8',
    flowerCenter: '#e89d48',
};

/**
 * Shared 3D Faceted Bipyramidal Memory Crystal, Orbit Ring & Floating Shards
 */
const FloatingMemoryCrystalAssembly: React.FC<{
    position: [number, number, number];
    hasOrbitRing: boolean;
    ringTilt?: [number, number, number];
    isNear: boolean;
    isEchoing: boolean;
    animRefs?: PedestalAnimRefs;
}> = ({
    position,
    hasOrbitRing,
    ringTilt = [0.38, 0.15, -0.42],
    isNear,
    isEchoing,
    animRefs,
}) => {
        const emissiveBoost = isEchoing ? 2.6 : isNear ? 2.1 : 1.35;

        return (
            <group position={position}>
                <group ref={animRefs?.crystalRef}>
                    <mesh position={[0, 0.24, 0]} castShadow>
                        <coneGeometry args={[0.26, 0.48, 6]} />
                        <meshStandardMaterial
                            color={PEDESTAL_PALETTE.crystalCore}
                            emissive={PEDESTAL_PALETTE.crystalMid}
                            emissiveIntensity={emissiveBoost}
                            roughness={0.18}
                            metalness={0.1}
                            flatShading
                        />
                    </mesh>
                    <mesh
                        position={[0, -0.22, 0]}
                        rotation={[Math.PI, Math.PI / 6, 0]}
                        castShadow
                    >
                        <coneGeometry args={[0.26, 0.44, 6]} />
                        <meshStandardMaterial
                            color={PEDESTAL_PALETTE.crystalMid}
                            emissive={PEDESTAL_PALETTE.crystalDeep}
                            emissiveIntensity={emissiveBoost * 0.9}
                            roughness={0.22}
                            metalness={0.1}
                            flatShading
                        />
                    </mesh>
                </group>

                {hasOrbitRing && (
                    <mesh ref={animRefs?.orbitRingRef} rotation={ringTilt}>
                        <torusGeometry args={[0.48, 0.018, 8, 36]} />
                        <meshStandardMaterial
                            color={PEDESTAL_PALETTE.orbitGold}
                            emissive={PEDESTAL_PALETTE.wellGlow}
                            emissiveIntensity={1.6}
                            roughness={0.2}
                        />
                    </mesh>
                )}

                <group ref={animRefs?.shardsRef}>
                    {[
                        [-0.38, 0.32, 0.12, 0.055],
                        [0.36, -0.18, 0.14, 0.048],
                        [-0.28, -0.32, -0.12, 0.042],
                        [0.24, 0.42, -0.1, 0.05],
                    ].map(([sx, sy, sz, s], i) => (
                        <mesh
                            key={i}
                            position={[sx, sy, sz]}
                            scale={[0.7, 1.35, 0.7]}
                        >
                            <octahedronGeometry args={[s, 0]} />
                            <meshBasicMaterial color={PEDESTAL_PALETTE.orbitGold} />
                        </mesh>
                    ))}
                </group>
            </group>
        );
    };

const ProceduralPedestalFallback: React.FC<{ height: number; radius: number }> = ({
    height,
    radius,
}) => {
    const rockGeo = useMemo(
        () =>
            createSculptedFacetedGeometry(
                radius * 0.25,
                1,
                [1.2, 0.7, 1.1],
                0.18,
                31,
                true
            ),
        [radius]
    );
    return (
        <group>
            <mesh position={[0, height * 0.25, 0]} castShadow receiveShadow>
                <cylinderGeometry
                    args={[radius * 0.65, radius * 0.85, height * 0.5, 7]}
                />
                <meshStandardMaterial
                    color={PEDESTAL_PALETTE.sandstoneMid}
                    roughness={0.86}
                    flatShading
                />
            </mesh>
            <mesh geometry={rockGeo} position={[radius * 0.6, 0.12, 0.35]}>
                <meshStandardMaterial
                    color={PEDESTAL_PALETTE.sandstoneDark}
                    roughness={0.88}
                    flatShading
                />
            </mesh>
        </group>
    );
};

/**
 * ============================================================================
 * VARIATION A: GRAND MEMORY PORTAL (`KeepSakePedestalV3-v1.glb`)
 * ============================================================================
 */
export const GrandMemoryPortal: React.FC<PedestalModelProps> = React.memo(
    ({ isNear, isEchoing, animRefs }) => (
        <group>
            <CachedGLBAsset
                url={GLB_ASSET_PATHS.pedestalV3}
                targetHeight={3.5}
                sinkOffset={-0.06}
                fallback={<ProceduralPedestalFallback height={2.4} radius={1.4} />}
            />

            <mesh
                ref={animRefs?.wellGlowRef}
                position={[0, 1.38, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <circleGeometry args={[0.52, 16]} />
                <meshStandardMaterial
                    color={PEDESTAL_PALETTE.crystalCore}
                    emissive={PEDESTAL_PALETTE.wellGlow}
                    emissiveIntensity={isNear || isEchoing ? 2.4 : 1.4}
                />
            </mesh>

            <FloatingMemoryCrystalAssembly
                position={[0, 2.15, 0]}
                hasOrbitRing={true}
                isNear={isNear}
                isEchoing={isEchoing}
                animRefs={animRefs}
            />
        </group>
    )
);

/**
 * ============================================================================
 * VARIATION B: MINIMAL MEMORY PEDESTAL (`KeepSakePedestalV1-v1.glb`)
 * ============================================================================
 */
export const MinimalMemoryPedestal: React.FC<PedestalModelProps> = React.memo(
    ({ isNear, isEchoing, animRefs }) => (
        <group>
            <CachedGLBAsset
                url={GLB_ASSET_PATHS.pedestalV1}
                targetHeight={2.15}
                sinkOffset={-0.05}
                fallback={<ProceduralPedestalFallback height={1.6} radius={0.9} />}
            />

            <mesh
                ref={animRefs?.wellGlowRef}
                position={[0, 1.05, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <ringGeometry args={[0.32, 0.48, 24]} />
                <meshStandardMaterial
                    color={PEDESTAL_PALETTE.orbitGold}
                    emissive={PEDESTAL_PALETTE.wellGlow}
                    emissiveIntensity={isNear || isEchoing ? 2.2 : 1.25}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <FloatingMemoryCrystalAssembly
                position={[0, 1.78, 0]}
                hasOrbitRing={false}
                isNear={isNear}
                isEchoing={isEchoing}
                animRefs={animRefs}
            />
        </group>
    )
);

/**
 * ============================================================================
 * VARIATION C: ARCHED MEMORY PEDESTAL (`KeepSakePedestalV2-v1.glb`)
 * ============================================================================
 */
export const ArchedMemoryPedestal: React.FC<PedestalModelProps> = React.memo(
    ({ isNear, isEchoing, animRefs }) => (
        <group>
            <CachedGLBAsset
                url={GLB_ASSET_PATHS.pedestalV2}
                targetHeight={2.95}
                sinkOffset={-0.06}
                fallback={<ProceduralPedestalFallback height={2.1} radius={1.15} />}
            />

            <mesh
                ref={animRefs?.wellGlowRef}
                position={[0, 1.22, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <circleGeometry args={[0.48, 14]} />
                <meshStandardMaterial
                    color={PEDESTAL_PALETTE.crystalCore}
                    emissive={PEDESTAL_PALETTE.wellGlow}
                    emissiveIntensity={isNear || isEchoing ? 2.4 : 1.45}
                />
            </mesh>

            <FloatingMemoryCrystalAssembly
                position={[0.04, 1.95, 0]}
                hasOrbitRing={true}
                ringTilt={[0.32, -0.18, 0.28]}
                isNear={isNear}
                isEchoing={isEchoing}
                animRefs={animRefs}
            />
        </group>
    )
);