// src/components/Environment/WorldAssetLibrary.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
    createSculptedFacetedGeometry,
    seededRandom,
} from '../../scenes/Environment/lowPolyUtils';
import { CachedGLBAsset, GLB_ASSET_PATHS } from './GLBWorldAssets';

const ASSET_PALETTE = {
    woodLight: '#a6744c',
    woodMid: '#855836',
    woodDark: '#593822',
    woodDeep: '#3d2516',
    shingleDark: '#4f3529',
    shingleMid: '#694736',
    plasterWall: '#ccb096',
    stoneLight: '#b59d90',
    stoneMid: '#947e73',
    stoneDark: '#705e56',
    toriiRed: '#b8402e',
    toriiDarkRed: '#8f2e1e',
    bannerRed: '#c84b31',
    goldEmblem: '#f5b851',
    lanternGlow: '#ffd269',
    lanternCore: '#fff6db',
    waterSurface: '#7ec4cf',
    waterDeep: '#569ea8',
    waterFoam: '#e6f7f5',
    mossGreen: '#6d8748',
    mossLight: '#88a35a',
    canvasLight: '#DEC5A4',
    canvasMid: '#b58d67',
    mushroomRed: '#c44332',
    mushroomCream: '#f0e2ce',
    parchmentNote: '#f2e3cc',
};

export interface WorldAssetProps {
    position?: [number, number, number];
    rotationY?: number;
    scale?: number;
}

export interface GlowingButterfliesProps {
    center?: [number, number, number];
    count?: number;
}

/**
 * ============================================================================
 * 1. STRUCTURES & LANDMARKS (Integrated with Project GLB Models)
 * ============================================================================
 */

const ProceduralStorybookCottage: React.FC<WorldAssetProps> = ({
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
}) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.35, 2.55, 0.44, 10]} />
            <meshStandardMaterial color={ASSET_PALETTE.stoneMid} roughness={0.9} flatShading />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.15, 2.28, 1.9, 10]} />
            <meshStandardMaterial color={ASSET_PALETTE.plasterWall} roughness={0.86} flatShading />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2 + 0.2;
            return (
                <mesh
                    key={`beam-${i}`}
                    position={[Math.cos(a) * 2.18, 1.35, Math.sin(a) * 2.18]}
                    rotation={[0, -a, 0]}
                    castShadow
                >
                    <boxGeometry args={[0.16, 1.9, 0.18]} />
                    <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
                </mesh>
            );
        })}
        <mesh position={[0, 2.65, 0]} castShadow receiveShadow>
            <coneGeometry args={[2.68, 1.15, 10]} />
            <meshStandardMaterial color={ASSET_PALETTE.shingleDark} roughness={0.88} flatShading />
        </mesh>
        <mesh position={[0, 3.15, 0]} rotation={[0, 0.3, 0]} castShadow receiveShadow>
            <coneGeometry args={[1.95, 0.95, 10]} />
            <meshStandardMaterial color={ASSET_PALETTE.shingleMid} roughness={0.86} flatShading />
        </mesh>
    </group>
);

/**
 * Stone Cottage (`public/models/Structures/KeepSakeRockHouse-compressed.glb`)
 */
export const CozyStorybookCottage: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.rockHouse}
            targetHeight={6.2}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.08}
            fallback={
                <ProceduralStorybookCottage
                    position={position}
                    rotationY={rotationY}
                    scale={scale}
                />
            }
        >
            <pointLight
                position={[0.8, 1.3, 2.2]}
                color={ASSET_PALETTE.lanternGlow}
                intensity={1.3}
                distance={5.8}
                decay={2}
            />
        </CachedGLBAsset>
    )
);

const ProceduralToriiGate: React.FC<WorldAssetProps> = ({
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
}) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        {[-1.45, 1.45].map((px, idx) => (
            <group key={`col-${idx}`} position={[px, 0, 0]}>
                <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.32, 0.4, 0.44, 8]} />
                    <meshStandardMaterial color={ASSET_PALETTE.stoneDark} roughness={0.9} flatShading />
                </mesh>
                <mesh position={[0, 1.95, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.21, 0.25, 3.5, 8]} />
                    <meshStandardMaterial color={ASSET_PALETTE.toriiRed} roughness={0.78} flatShading />
                </mesh>
            </group>
        ))}
        <mesh position={[0, 2.95, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.9, 0.24, 0.26]} />
            <meshStandardMaterial color={ASSET_PALETTE.toriiRed} roughness={0.78} flatShading />
        </mesh>
        <mesh position={[0, 3.65, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.45, 0.26, 0.38]} />
            <meshStandardMaterial color={ASSET_PALETTE.toriiRed} roughness={0.78} flatShading />
        </mesh>
    </group>
);

/**
 * Japanese Entrance Gate (`public/models/Structures/KeepSakeEntranceJapanese.glb`)
 */
export const RedToriiGate: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.entranceJapanese}
            targetHeight={4.4}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.06}
            fallback={
                <ProceduralToriiGate
                    position={position}
                    rotationY={rotationY}
                    scale={scale}
                />
            }
        />
    )
);

const ProceduralStonePillar: React.FC<WorldAssetProps> = ({
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
}) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.12, 0.44, 1.12]} />
            <meshStandardMaterial color={ASSET_PALETTE.stoneDark} roughness={0.9} flatShading />
        </mesh>
        {[0.72, 1.38, 2.04].map((py, i) => (
            <mesh
                key={i}
                position={[(i % 2 === 0 ? 1 : -1) * 0.03, py, 0]}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[0.88 - i * 0.03, 0.64, 0.88 - i * 0.03]} />
                <meshStandardMaterial
                    color={i % 2 === 0 ? ASSET_PALETTE.stoneMid : ASSET_PALETTE.stoneLight}
                    roughness={0.86}
                    flatShading
                />
            </mesh>
        ))}
    </group>
);

/**
 * Standing Rock Pillar (`public/models/Structures/KeepSakeRockPiller.glb`)
 */
export const StandingStonePillar: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.rockPillar}
            targetHeight={3.1}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.08}
            fallback={
                <ProceduralStonePillar
                    position={position}
                    rotationY={rotationY}
                    scale={scale}
                />
            }
        />
    )
);

/**
 * Stone Archway Entrance (`public/models/Structures/KeepSakeRockEntrance.glb`)
 */
export const StoneArchwayGLB: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.rockEntrance}
            targetHeight={5.4}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.12}
            fallback={
                <ProceduralStonePillar
                    position={position}
                    rotationY={rotationY}
                    scale={scale * 1.4}
                />
            }
        />
    )
);

/**
 * Monumental Blossom Tree (`public/models/Vegetation/KeepSakeHugeTree.glb`)
 */
export const MonumentalBlossomTreeGLB: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.hugeTree}
            targetHeight={9.2}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.18}
        />
    )
);

/**
 * Monumental Evergreen Tree (`public/models/Vegetation/KeepSakeHugeTreeGreen.glb`)
 */
export const MonumentalEvergreenTreeGLB: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.hugeTreeGreen}
            targetHeight={9.4}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.18}
        />
    )
);

/**
 * Broad old-growth tree (`public/models/Vegetation/KeepSakeOldTreeV1|V2.glb`)
 */
export const AncientOldTreeGLB: React.FC<
    WorldAssetProps & { variant?: 1 | 2 }
> = React.memo(
    ({
        position = [0, 0, 0],
        rotationY = 0,
        scale = 1,
        variant = 1,
    }: WorldAssetProps & { variant?: 1 | 2 }) => (
        <CachedGLBAsset
            url={
                variant === 1
                    ? GLB_ASSET_PATHS.oldTreeV1
                    : GLB_ASSET_PATHS.oldTreeV2
            }
            targetHeight={7.2}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.16}
        />
    )
);

/**
 * Slender tall tree (`public/models/Vegetation/KeepSakeTallTreeV1|V2.glb`)
 */
export const SlenderTallTreeGLB: React.FC<
    WorldAssetProps & { variant?: 1 | 2 }
> = React.memo(
    ({
        position = [0, 0, 0],
        rotationY = 0,
        scale = 1,
        variant = 1,
    }: WorldAssetProps & { variant?: 1 | 2 }) => (
        <CachedGLBAsset
            url={
                variant === 1
                    ? GLB_ASSET_PATHS.tallTreeV1
                    : GLB_ASSET_PATHS.tallTreeV2
            }
            targetHeight={9.6}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.16}
        />
    )
);

/**
 * Sculpted pond (`public/models/Vegetation/KeepSakePond.glb`)
 */
export const GardenPondGLB: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.pond}
            targetHeight={3.6}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.04}
        />
    )
);

/**
 * Memory Flower Cluster (`KeepSakeFlower-v1.glb` & `KeepSakeFlowerV2-v1.glb`)
 */
export const MemoryFlowerGLB: React.FC<
    WorldAssetProps & { variant?: 1 | 2 }
> = React.memo(
    ({
        position = [0, 0, 0],
        rotationY = 0,
        scale = 1,
        variant = 1,
    }: WorldAssetProps & { variant?: 1 | 2 }) => (
        <CachedGLBAsset
            url={
                variant === 1
                    ? GLB_ASSET_PATHS.flowerV1
                    : GLB_ASSET_PATHS.flowerV2
            }
            targetHeight={0.62}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.03}
        />
    )
);

/**
 * ============================================================================
 * 2. WATER & BRIDGES
 * ============================================================================
 */

export const StylizedReflectionPond: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], scale = 1 }: WorldAssetProps) => {
        const rippleRef = useRef<THREE.Mesh>(null);

        const shoreRocks = useMemo(
            () =>
                [
                    [-2.8, 0.15, -1.2, 0.65, 11],
                    [-2.2, 0.12, -2.1, 0.48, 22],
                    [2.6, 0.18, -1.5, 0.72, 33],
                    [2.9, 0.12, 0.8, 0.52, 44],
                    [-2.5, 0.14, 1.8, 0.58, 55],
                    [1.8, 0.12, 2.3, 0.46, 66],
                ].map(([rx, ry, rz, rScale, seed]) => ({
                    pos: [rx, ry, rz] as [number, number, number],
                    geo: createSculptedFacetedGeometry(
                        rScale,
                        1,
                        [1.3, 0.65, 1.1],
                        0.2,
                        seed,
                        true
                    ),
                })),
            []
        );

        useFrame(({ clock }) => {
            if (rippleRef.current) {
                const t = clock.getElapsedTime();
                const s = 1 + Math.sin(t * 1.4) * 0.04;
                rippleRef.current.scale.set(s, s, 1);
            }
        });

        return (
            <group position={position} scale={scale}>
                <mesh position={[0, 0.03, 0]} receiveShadow>
                    <cylinderGeometry args={[3.45, 3.65, 0.08, 14]} />
                    <meshStandardMaterial color="#b89f86" roughness={0.9} flatShading />
                </mesh>
                <mesh position={[0, 0.08, 0]} receiveShadow>
                    <cylinderGeometry args={[3.15, 3.25, 0.06, 14]} />
                    <meshStandardMaterial
                        color={ASSET_PALETTE.waterSurface}
                        emissive={ASSET_PALETTE.waterDeep}
                        emissiveIntensity={0.22}
                        roughness={0.18}
                        metalness={0.15}
                        flatShading
                    />
                </mesh>
                <mesh
                    ref={rippleRef}
                    position={[0.4, 0.115, -0.3]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <ringGeometry args={[0.85, 0.94, 24]} />
                    <meshBasicMaterial
                        color={ASSET_PALETTE.waterFoam}
                        transparent
                        opacity={0.45}
                        side={THREE.DoubleSide}
                    />
                </mesh>
                {shoreRocks.map((r, i) => (
                    <mesh
                        key={i}
                        geometry={r.geo}
                        position={r.pos}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color={ASSET_PALETTE.stoneMid}
                            roughness={0.88}
                            flatShading
                        />
                    </mesh>
                ))}
            </group>
        );
    }
);

export const WoodenStraightBridge: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
            {[-0.82, 0.82].map((sx, i) => (
                <mesh key={`str-${i}`} position={[sx, 0.22, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.16, 0.18, 3.8]} />
                    <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.86} flatShading />
                </mesh>
            ))}
            {Array.from({ length: 11 }).map((_, idx) => {
                const z = -1.7 + idx * 0.34;
                return (
                    <mesh key={`plank-${idx}`} position={[0, 0.34, z]} castShadow receiveShadow>
                        <boxGeometry args={[1.95, 0.08, 0.28]} />
                        <meshStandardMaterial
                            color={idx % 2 === 0 ? ASSET_PALETTE.woodLight : ASSET_PALETTE.woodMid}
                            roughness={0.84}
                            flatShading
                        />
                    </mesh>
                );
            })}
            {[-0.92, 0.92].map((rx, sideIdx) => (
                <group key={`rail-side-${sideIdx}`}>
                    {[-1.65, 0, 1.65].map((pz, pIdx) => (
                        <mesh key={`post-${pIdx}`} position={[rx, 0.68, pz]} castShadow>
                            <boxGeometry args={[0.16, 0.96, 0.16]} />
                            <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
                        </mesh>
                    ))}
                    {[0.65, 0.98].map((ry, rIdx) => (
                        <mesh key={`bar-${rIdx}`} position={[rx, ry, 0]} castShadow>
                            <boxGeometry args={[0.09, 0.09, 3.55]} />
                            <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    )
);

export const WoodenArchedBridge: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => {
        const planks = useMemo(() => {
            const count = 13;
            return Array.from({ length: count }).map((_, i) => {
                const u = (i / (count - 1)) * 2 - 1;
                const z = u * 2.35;
                const archY = (1 - u * u) * 0.68 + 0.15;
                const pitch = Math.atan2(-2 * u * 0.68, 2.35);
                return { z, archY, pitch };
            });
        }, []);

        return (
            <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
                {planks.map((p, idx) => (
                    <mesh
                        key={`ap-${idx}`}
                        position={[0, p.archY, p.z]}
                        rotation={[p.pitch, 0, 0]}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry args={[1.95, 0.09, 0.34]} />
                        <meshStandardMaterial
                            color={idx % 2 === 0 ? ASSET_PALETTE.woodLight : ASSET_PALETTE.woodMid}
                            roughness={0.84}
                            flatShading
                        />
                    </mesh>
                ))}
                {[-0.92, 0.92].map((rx, sIdx) => (
                    <group key={`arail-${sIdx}`}>
                        {[-2.2, -1.1, 0, 1.1, 2.2].map((pz, pIdx) => {
                            const u = pz / 2.35;
                            const py = (1 - u * u) * 0.68 + 0.55;
                            return (
                                <mesh key={`apost-${pIdx}`} position={[rx, py, pz]} castShadow>
                                    <boxGeometry args={[0.15, 0.88, 0.15]} />
                                    <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
                                </mesh>
                            );
                        })}
                        {[-1.65, -0.55, 0.55, 1.65].map((rz, rIdx) => {
                            const u = rz / 2.35;
                            const ry = (1 - u * u) * 0.68 + 0.92;
                            const pitch = Math.atan2(-2 * u * 0.68, 2.35);
                            return (
                                <mesh
                                    key={`top-seg-${rIdx}`}
                                    position={[rx, ry, rz]}
                                    rotation={[pitch, 0, 0]}
                                    castShadow
                                >
                                    <boxGeometry args={[0.1, 0.1, 1.22]} />
                                    <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
                                </mesh>
                            );
                        })}
                    </group>
                ))}
            </group>
        );
    }
);

/**
 * ============================================================================
 * 3. INTERACTABLES / MEMORY ELEMENTS (Integrated with Project GLB Models)
 * ============================================================================
 */

export const StandingMemoryBanner: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0 }: WorldAssetProps) => (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, 1.25, 0]} castShadow>
                <cylinderGeometry args={[0.06, 0.08, 2.5, 6]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0, 2.28, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.048, 0.048, 0.92, 6]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0, 1.55, 0.04]} castShadow>
                <boxGeometry args={[0.56, 1.35, 0.028]} />
                <meshStandardMaterial color={ASSET_PALETTE.bannerRed} roughness={0.82} flatShading />
            </mesh>
            <mesh position={[0, 1.55, 0.06]}>
                <dodecahedronGeometry args={[0.11, 0]} />
                <meshStandardMaterial color={ASSET_PALETTE.goldEmblem} emissive="#d98a2b" emissiveIntensity={0.4} flatShading />
            </mesh>
        </group>
    )
);

const ProceduralLanternPost: React.FC<WorldAssetProps> = ({
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
}) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.36, 0.4, 0.36]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDeep} roughness={0.88} flatShading />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 2.4, 0.2]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0.28, 2.28, 0]} castShadow>
            <boxGeometry args={[0.88, 0.15, 0.15]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
        </mesh>
    </group>
);

/**
 * Street Lamp (`public/models/MemElements/StreetLamp/KeepSakeLamp-v1.glb`)
 */
export const WoodenLanternPost: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.streetLamp}
            targetHeight={2.85}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.04}
            fallback={
                <ProceduralLanternPost
                    position={position}
                    rotationY={rotationY}
                    scale={scale}
                />
            }
        >
            <pointLight
                position={[0.35, 2.1, 0]}
                color={ASSET_PALETTE.lanternGlow}
                intensity={1.35}
                distance={6.5}
                decay={2}
            />
        </CachedGLBAsset>
    )
);

export const EngravedMemoryMonument: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0 }: WorldAssetProps) => (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.65, 0.28, 0.95]} />
                <meshStandardMaterial color={ASSET_PALETTE.stoneDark} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.38, 0.18, 0.78]} />
                <meshStandardMaterial color={ASSET_PALETTE.stoneMid} roughness={0.88} flatShading />
            </mesh>
            <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.12, 1.45, 0.44]} />
                <meshStandardMaterial color={ASSET_PALETTE.stoneLight} roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0, 1.92, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                <coneGeometry args={[0.68, 0.36, 4]} />
                <meshStandardMaterial color={ASSET_PALETTE.stoneLight} roughness={0.85} flatShading />
            </mesh>
        </group>
    )
);

const ProceduralNoticeboard: React.FC<WorldAssetProps> = ({
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
}) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        {[-0.82, 0.82].map((px, i) => (
            <mesh key={i} position={[px, 1.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.18, 2.1, 0.18]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.86} flatShading />
            </mesh>
        ))}
        <mesh position={[0, 1.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.88, 1.18, 0.14]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
        </mesh>
    </group>
);

/**
 * Wooden Notice Board (`public/models/MemElements/KeepSakeNoticeBoard.glb`)
 */
export const WoodenMemoryNoticeboard: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.noticeBoard}
            targetHeight={2.35}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.05}
            fallback={
                <ProceduralNoticeboard
                    position={position}
                    rotationY={rotationY}
                    scale={scale}
                />
            }
        />
    )
);

/**
 * ============================================================================
 * 4. UTILITY & WORLD PROPS (Integrated with Project GLB Models)
 * ============================================================================
 */

export const WoodenSignpost: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0 }: WorldAssetProps) => (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.18, 1.9, 0.18]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.86} flatShading />
            </mesh>
            <mesh position={[0.28, 1.55, 0.08]} rotation={[0, 0, 0.06]} castShadow>
                <boxGeometry args={[0.82, 0.24, 0.06]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodLight} roughness={0.84} flatShading />
            </mesh>
            <mesh position={[-0.26, 1.22, -0.08]} rotation={[0, 0, -0.08]} castShadow>
                <boxGeometry args={[0.78, 0.24, 0.06]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
            </mesh>
        </group>
    )
);

export const WoodenFenceSection: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0 }: WorldAssetProps) => (
        <group position={position} rotation={[0, rotationY, 0]}>
            {[-1.1, 0, 1.1].map((px, i) => (
                <mesh key={i} position={[px, 0.48, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.16, 0.96, 0.16]} />
                    <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.86} flatShading />
                </mesh>
            ))}
            {[0.32, 0.68].map((ry, i) => (
                <mesh key={i} position={[0, ry, 0.06]} rotation={[0, 0, (i - 0.5) * 0.03]} castShadow>
                    <boxGeometry args={[2.55, 0.11, 0.06]} />
                    <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
                </mesh>
            ))}
        </group>
    )
);

const ProceduralCargoCart: React.FC<WorldAssetProps> = ({
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
}) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.45, 0.12, 1.05]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.86} flatShading />
        </mesh>
    </group>
);

/**
 * Wooden Cargo Cart (`public/models/Props/KeepSakeWoodenVehicle.glb`)
 */
export const WoodenCargoCart: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
        <CachedGLBAsset
            url={GLB_ASSET_PATHS.woodenVehicle}
            targetHeight={1.55}
            position={position}
            rotationY={rotationY}
            scale={scale}
            sinkOffset={-0.04}
            fallback={
                <ProceduralCargoCart
                    position={position}
                    rotationY={rotationY}
                    scale={scale}
                />
            }
        />
    )
);

/**
 * Explorer Campsite (`public/models/Props/KeepSakeTent.glb` + Animated Campfire)
 */
export const ExplorerCampsite: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => {
        const flameRef = useRef<THREE.Group>(null);
        const fireLightRef = useRef<THREE.PointLight>(null);

        useFrame(({ clock }) => {
            const t = clock.getElapsedTime();
            if (flameRef.current) {
                const s = 1 + Math.sin(t * 7.5) * 0.12;
                flameRef.current.scale.set(1, s, 1);
                flameRef.current.rotation.y = Math.sin(t * 3.2) * 0.25;
            }
            if (fireLightRef.current) {
                fireLightRef.current.intensity = 1.85 + Math.sin(t * 8.2) * 0.35;
            }
        });

        const tentFallback = (
            <group position={[0.85, 0, -0.4]} rotation={[0, -0.35, 0]}>
                <mesh position={[-0.62, 0.92, 0]} rotation={[0, 0, 0.58]} castShadow receiveShadow>
                    <boxGeometry args={[0.06, 2.15, 2.45]} />
                    <meshStandardMaterial color={ASSET_PALETTE.canvasLight} roughness={0.85} flatShading />
                </mesh>
                <mesh position={[0.62, 0.92, 0]} rotation={[0, 0, -0.58]} castShadow receiveShadow>
                    <boxGeometry args={[0.06, 2.15, 2.45]} />
                    <meshStandardMaterial color={ASSET_PALETTE.canvasMid} roughness={0.86} flatShading />
                </mesh>
            </group>
        );

        return (
            <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
                {/* 1. GLB Explorer Tent */}
                <CachedGLBAsset
                    url={GLB_ASSET_PATHS.tent}
                    targetHeight={2.35}
                    position={[0.85, 0, -0.4]}
                    rotationY={-0.35}
                    sinkOffset={-0.05}
                    fallback={tentFallback}
                />

                {/* 2. Stone-Ringed Campfire with Animated Low-Poly Flame */}
                <group position={[-0.95, 0, 1.15]}>
                    {Array.from({ length: 8 }).map((_, i) => {
                        const a = (i / 8) * Math.PI * 2;
                        return (
                            <mesh
                                key={`fstone-${i}`}
                                position={[Math.cos(a) * 0.46, 0.09, Math.sin(a) * 0.46]}
                                rotation={[0, a, 0]}
                                castShadow
                                receiveShadow
                            >
                                <dodecahedronGeometry args={[0.14, 0]} />
                                <meshStandardMaterial color={ASSET_PALETTE.stoneDark} roughness={0.9} flatShading />
                            </mesh>
                        );
                    })}
                    {[0, 1, 2].map((l) => (
                        <mesh
                            key={`flog-${l}`}
                            position={[0, 0.1, 0]}
                            rotation={[Math.PI / 2 - 0.25, (l * Math.PI) / 3, 0]}
                            castShadow
                        >
                            <cylinderGeometry args={[0.06, 0.07, 0.68, 6]} />
                            <meshStandardMaterial color={ASSET_PALETTE.woodDeep} roughness={0.9} flatShading />
                        </mesh>
                    ))}
                    <group ref={flameRef} position={[0, 0.14, 0]}>
                        <mesh position={[0, 0.22, 0]}>
                            <coneGeometry args={[0.22, 0.52, 6]} />
                            <meshBasicMaterial color="#ff9d2e" />
                        </mesh>
                        <mesh position={[0, 0.18, 0]}>
                            <coneGeometry args={[0.13, 0.36, 5]} />
                            <meshBasicMaterial color="#fff3b8" />
                        </mesh>
                    </group>
                    <pointLight
                        ref={fireLightRef}
                        position={[0, 0.55, 0]}
                        color="#ffaa42"
                        intensity={1.85}
                        distance={6.8}
                        decay={2}
                    />
                </group>
            </group>
        );
    }
);

/**
 * ============================================================================
 * 5. AMBIENT DETAILS: SPOTTED MUSHROOMS & GLOWING BUTTERFLIES
 * ============================================================================
 */

export const SpottedMushroomCluster: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], scale = 1 }: WorldAssetProps) => (
        <group position={position} scale={scale}>
            {[
                [0, 0, 0, 1.0],
                [-0.18, 0, 0.12, 0.65],
            ].map(([mx, my, mz, ms], i) => (
                <group key={i} position={[mx, my, mz]} scale={ms}>
                    <mesh position={[0, 0.11, 0]} castShadow>
                        <cylinderGeometry args={[0.045, 0.065, 0.22, 7]} />
                        <meshStandardMaterial color={ASSET_PALETTE.mushroomCream} roughness={0.85} flatShading />
                    </mesh>
                    <mesh position={[0, 0.24, 0]} castShadow>
                        <coneGeometry args={[0.16, 0.15, 8]} />
                        <meshStandardMaterial color={ASSET_PALETTE.mushroomRed} roughness={0.78} flatShading />
                    </mesh>
                    {[
                        [0.06, 0.25, 0.06],
                        [-0.07, 0.24, 0.05],
                        [0, 0.28, -0.06],
                    ].map(([sx, sy, sz], j) => (
                        <mesh key={j} position={[sx, sy, sz]}>
                            <sphereGeometry args={[0.022, 5, 5]} />
                            <meshBasicMaterial color="#fff9ee" />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    )
);

export const GlowingButterflies: React.FC<GlowingButterfliesProps> = React.memo(
    ({ center = [0, 1.4, 0], count = 8 }: GlowingButterfliesProps) => {
        const groupRef = useRef<THREE.Group>(null);

        const butterflies = useMemo(
            () =>
                Array.from({ length: count }).map((_, i) => ({
                    radius: 1.5 + seededRandom(i * 17) * 5.5,
                    speed: 0.45 + seededRandom(i * 29) * 0.45,
                    phase: seededRandom(i * 43) * Math.PI * 2,
                    yOffset: 0.8 + seededRandom(i * 61) * 1.8,
                })),
            [count]
        );

        useFrame(({ clock }) => {
            if (!groupRef.current) return;
            const t = clock.getElapsedTime();
            groupRef.current.children.forEach((child, idx) => {
                const b = butterflies[idx];
                const angle = t * b.speed + b.phase;
                child.position.set(
                    center[0] + Math.cos(angle) * b.radius,
                    center[1] + b.yOffset + Math.sin(t * 2.4 + b.phase) * 0.35,
                    center[2] + Math.sin(angle * 0.8) * b.radius
                );
                child.rotation.y = -angle + Math.PI / 2;
                const leftWing = child.children[0];
                const rightWing = child.children[1];
                const flap = Math.sin(t * 14 + b.phase) * 0.65;
                if (leftWing) leftWing.rotation.z = flap;
                if (rightWing) rightWing.rotation.z = -flap;
            });
        });

        return (
            <group ref={groupRef}>
                {butterflies.map((_, i) => (
                    <group key={i}>
                        <mesh position={[-0.045, 0, 0]} scale={[1.2, 0.15, 0.85]}>
                            <octahedronGeometry args={[0.05, 0]} />
                            <meshBasicMaterial color="#ffe885" />
                        </mesh>
                        <mesh position={[0.045, 0, 0]} scale={[1.2, 0.15, 0.85]}>
                            <octahedronGeometry args={[0.05, 0]} />
                            <meshBasicMaterial color="#ffe885" />
                        </mesh>
                    </group>
                ))}
            </group>
        );
    }
);