// src/components/Memory/PedestalModels.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createSculptedFacetedGeometry } from '../../scenes/Environment/lowPolyUtils';

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
 * Shared 5-Petal White Keepsake Blossom with Golden Center & Leaves
 */
const PedestalFlowerCluster: React.FC<{
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
    <group position={position} rotation={rotation} scale={scale}>
        <mesh>
            <dodecahedronGeometry args={[0.045, 0]} />
            <meshStandardMaterial color={PEDESTAL_PALETTE.flowerCenter} flatShading />
        </mesh>
        {[0, 1, 2, 3, 4].map((p) => {
            const a = (p / 5) * Math.PI * 2;
            return (
                <mesh
                    key={p}
                    position={[Math.cos(a) * 0.085, 0.005, Math.sin(a) * 0.085]}
                    rotation={[0, -a, 0]}
                    scale={[1.3, 0.3, 0.85]}
                >
                    <octahedronGeometry args={[0.055, 0]} />
                    <meshStandardMaterial
                        color={PEDESTAL_PALETTE.flowerWhite}
                        roughness={0.65}
                        flatShading
                    />
                </mesh>
            );
        })}
    </group>
);

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
                {/* Main Floating Faceted Bipyramid Crystal */}
                <group ref={animRefs?.crystalRef}>
                    {/* Upper Faceted Pyramid */}
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
                    {/* Lower Inverted Faceted Pyramid */}
                    <mesh position={[0, -0.22, 0]} rotation={[Math.PI, Math.PI / 6, 0]} castShadow>
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

                {/* Delicate Tilted Golden Orbit Ring */}
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

                {/* Floating Magical Diamond Shards & Vertical Light Accents */}
                <group ref={animRefs?.shardsRef}>
                    {[
                        [-0.38, 0.32, 0.12, 0.055],
                        [0.36, -0.18, 0.14, 0.048],
                        [-0.28, -0.32, -0.12, 0.042],
                        [0.24, 0.42, -0.1, 0.05],
                    ].map(([sx, sy, sz, s], i) => (
                        <mesh key={i} position={[sx, sy, sz]} scale={[0.7, 1.35, 0.7]}>
                            <octahedronGeometry args={[s, 0]} />
                            <meshBasicMaterial color={PEDESTAL_PALETTE.orbitGold} />
                        </mesh>
                    ))}
                </group>
            </group>
        );
    };

/**
 *Shared Orange-Red Hanging Fabric Banner with 4-Petal Golden Floral Emblem
 */
const HangingBannerWithEmblem: React.FC<{
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
    <group position={position} rotation={rotation} scale={scale}>
        {/* Upper Banner Fold over Stone Ledge */}
        <mesh position={[0, 0.04, -0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <boxGeometry args={[0.32, 0.14, 0.035]} />
            <meshStandardMaterial color={PEDESTAL_PALETTE.bannerDark} roughness={0.85} flatShading />
        </mesh>
        {/* Main Hanging Cloth Body */}
        <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.32, 0.56, 0.03]} />
            <meshStandardMaterial color={PEDESTAL_PALETTE.bannerRed} roughness={0.82} flatShading />
        </mesh>
        {/* Angled Swallowtail Bottom Tips */}
        <mesh position={[-0.08, -0.6, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.028]} />
            <meshStandardMaterial color={PEDESTAL_PALETTE.bannerRed} roughness={0.82} flatShading />
        </mesh>
        <mesh position={[0.08, -0.6, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.028]} />
            <meshStandardMaterial color={PEDESTAL_PALETTE.bannerRed} roughness={0.82} flatShading />
        </mesh>
        {/* 4-Petal Golden Floral Emblem on Banner Face */}
        <group position={[0, -0.34, 0.02]}>
            {[0, 1, 2, 3].map((p) => {
                const a = (p / 4) * Math.PI * 2;
                return (
                    <mesh
                        key={p}
                        position={[Math.cos(a) * 0.055, Math.sin(a) * 0.055, 0]}
                        rotation={[0, 0, a + Math.PI / 4]}
                        scale={[1, 0.55, 0.3]}
                    >
                        <octahedronGeometry args={[0.042, 0]} />
                        <meshStandardMaterial
                            color={PEDESTAL_PALETTE.emblemGold}
                            emissive="#d98a2b"
                            emissiveIntensity={0.35}
                            flatShading
                        />
                    </mesh>
                );
            })}
            <mesh position={[0, 0, 0.008]}>
                <dodecahedronGeometry args={[0.02, 0]} />
                <meshBasicMaterial color={PEDESTAL_PALETTE.flowerWhite} />
            </mesh>
        </group>
    </group>
);

/**
 * ============================================================================
 * VARIATION A: GRAND MEMORY PORTAL (Pedestals.jpg — Left Reference)
 * ============================================================================
 */
export const GrandMemoryPortal: React.FC<PedestalModelProps> = React.memo(
    ({ isNear, isEchoing, animRefs }) => {
        // Broken Circular Stone Portal Arch Segments (Left & Right Arms)
        const archSegments = useMemo(() => {
            const segs: Array<{
                pos: [number, number, number];
                rotZ: number;
                scale: [number, number, number];
                isInnerGlow?: boolean;
            }> = [];
            const radius = 1.38;

            // Left Arch Arm (from 195 deg up to 112 deg)
            for (let i = 0; i < 6; i++) {
                const deg = 195 - i * 16.5;
                const rad = (deg * Math.PI) / 180;
                segs.push({
                    pos: [Math.cos(rad) * radius, 2.15 + Math.sin(rad) * radius, -0.18],
                    rotZ: rad - Math.PI / 2,
                    scale: [0.42 - i * 0.015, 0.48, 0.44],
                });
            }

            // Right Arch Arm (from -15 deg up to 62 deg)
            for (let i = 0; i < 5; i++) {
                const deg = -15 + i * 18;
                const rad = (deg * Math.PI) / 180;
                segs.push({
                    pos: [Math.cos(rad) * radius, 2.15 + Math.sin(rad) * radius, -0.18],
                    rotZ: rad - Math.PI / 2,
                    scale: [0.4 - i * 0.015, 0.46, 0.42],
                });
            }

            return segs;
        }, []);

        const baseRocks = useMemo(
            () => [
                { pos: [-1.45, 0.18, 0.65] as [number, number, number], s: [0.42, 0.28, 0.38] as [number, number, number], seed: 11 },
                { pos: [1.48, 0.16, 0.55] as [number, number, number], s: [0.38, 0.25, 0.35] as [number, number, number], seed: 22 },
                { pos: [0.85, 0.15, 1.35] as [number, number, number], s: [0.34, 0.22, 0.32] as [number, number, number], seed: 33 },
                { pos: [-1.15, 0.22, -1.05] as [number, number, number], s: [0.45, 0.32, 0.4] as [number, number, number], seed: 44 },
                { pos: [1.22, 0.2, -0.95] as [number, number, number], s: [0.4, 0.28, 0.36] as [number, number, number], seed: 55 },
            ].map((r) => ({
                ...r,
                geo: createSculptedFacetedGeometry(1, 1, r.s, 0.2, r.seed, true),
            })),
            []
        );

        return (
            <group>
                {/* 1. Layered Circular Stepped Sandstone Flagstone Base */}
                <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[1.75, 1.92, 0.22, 10]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneDark} roughness={0.88} flatShading />
                </mesh>
                <mesh position={[0, 0.28, 0]} rotation={[0, 0.3, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[1.42, 1.58, 0.2, 9]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneMid} roughness={0.86} flatShading />
                </mesh>
                <mesh position={[0, 0.44, 0]} rotation={[0, 0.15, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[1.15, 1.26, 0.16, 8]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneLight} roughness={0.84} flatShading />
                </mesh>

                {/* Front Stepped Stone Stairs */}
                {[0, 1, 2].map((step) => (
                    <mesh
                        key={`stair-${step}`}
                        position={[0, 0.08 + step * 0.13, 1.68 - step * 0.26]}
                        castShadow
                        receiveShadow
                    >
                        <boxGeometry args={[0.92 - step * 0.08, 0.14, 0.36]} />
                        <meshStandardMaterial
                            color={step % 2 === 0 ? PEDESTAL_PALETTE.sandstoneLight : PEDESTAL_PALETTE.sandstoneMid}
                            roughness={0.85}
                            flatShading
                        />
                    </mesh>
                ))}

                {/* 2. Hexagonal Sandstone Altar Body & Overhanging Top Cap */}
                <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.86, 0.98, 0.72, 6]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneDeep} roughness={0.86} flatShading />
                </mesh>
                {/* Sculpted Altar Corner Pillars */}
                {[0, 1, 2, 3, 4, 5].map((corner) => {
                    const a = (corner / 6) * Math.PI * 2 + Math.PI / 6;
                    return (
                        <mesh
                            key={`pil-${corner}`}
                            position={[Math.cos(a) * 0.86, 0.86, Math.sin(a) * 0.86]}
                            rotation={[0, -a, 0]}
                            castShadow
                        >
                            <boxGeometry args={[0.22, 0.74, 0.22]} />
                            <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneMid} roughness={0.84} flatShading />
                        </mesh>
                    );
                })}

                {/* Broad Polygonal Altar Crown Slab */}
                <mesh position={[0, 1.28, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[1.08, 0.98, 0.22, 6]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneLight} roughness={0.82} flatShading />
                </mesh>

                {/* Front Carved Stone Relief Shield with 4-Point Golden Star Emblem */}
                <group position={[0, 0.96, 0.88]}>
                    <mesh castShadow>
                        <octahedronGeometry args={[0.26, 0]} />
                        <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneLight} roughness={0.82} flatShading />
                    </mesh>
                    {[0, 1, 2, 3].map((pt) => {
                        const a = (pt / 4) * Math.PI * 2;
                        return (
                            <mesh
                                key={pt}
                                position={[Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.14]}
                                rotation={[0, 0, a]}
                                scale={[0.55, 1.2, 0.4]}
                            >
                                <octahedronGeometry args={[0.075, 0]} />
                                <meshStandardMaterial
                                    color={PEDESTAL_PALETTE.emblemGold}
                                    emissive="#d98a2b"
                                    emissiveIntensity={0.45}
                                    flatShading
                                />
                            </mesh>
                        );
                    })}
                </group>

                {/* 3. Dual Hanging Orange-Red Banners (Front-Left & Front-Right) */}
                <HangingBannerWithEmblem
                    position={[-0.64, 1.22, 0.74]}
                    rotation={[-0.14, 0.48, 0.06]}
                />
                <HangingBannerWithEmblem
                    position={[0.64, 1.22, 0.74]}
                    rotation={[-0.14, -0.48, -0.06]}
                />

                {/* 4. Glowing Golden Basin on Altar Top */}
                <mesh
                    ref={animRefs?.wellGlowRef}
                    position={[0, 1.4, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <circleGeometry args={[0.62, 12]} />
                    <meshStandardMaterial
                        color={PEDESTAL_PALETTE.crystalCore}
                        emissive={PEDESTAL_PALETTE.wellGlow}
                        emissiveIntensity={isNear || isEchoing ? 2.4 : 1.4}
                    />
                </mesh>

                {/* 5. Broken Circular Stone Portal Arch Rising Behind Altar */}
                <group>
                    {archSegments.map((seg, idx) => (
                        <group
                            key={`arch-seg-${idx}`}
                            position={seg.pos}
                            rotation={[0, 0, seg.rotZ]}
                        >
                            <mesh castShadow receiveShadow>
                                <boxGeometry args={seg.scale} />
                                <meshStandardMaterial
                                    color={
                                        idx % 2 === 0
                                            ? PEDESTAL_PALETTE.sandstoneLight
                                            : PEDESTAL_PALETTE.terracottaStone
                                    }
                                    roughness={0.85}
                                    flatShading
                                />
                            </mesh>
                            {/* Recessed Golden Light Channel along Inner Arch Rim */}
                            <mesh position={[0, -seg.scale[1] * 0.48, 0.08]}>
                                <boxGeometry args={[seg.scale[0] * 0.92, 0.05, 0.12]} />
                                <meshStandardMaterial
                                    color={PEDESTAL_PALETTE.orbitGold}
                                    emissive={PEDESTAL_PALETTE.crystalMid}
                                    emissiveIntensity={1.5}
                                />
                            </mesh>
                        </group>
                    ))}
                </group>

                {/* 6. Arch Foliage, Ivy Vines & White Keepsake Blossoms */}
                {[
                    [-1.32, 2.75, -0.05],
                    [-1.42, 2.35, 0.02],
                    [-1.12, 3.15, -0.05],
                    [1.35, 2.45, -0.02],
                    [1.22, 1.85, 0.04],
                ].map(([vx, vy, vz], i) => (
                    <mesh
                        key={`arch-leaf-${i}`}
                        position={[vx, vy, vz]}
                        rotation={[0.2, i * 0.8, i * 0.5]}
                        scale={[1.2, 0.5, 0.7]}
                        castShadow
                    >
                        <octahedronGeometry args={[0.18, 0]} />
                        <meshStandardMaterial
                            color={i % 2 === 0 ? PEDESTAL_PALETTE.vineGreen : PEDESTAL_PALETTE.vineLight}
                            roughness={0.82}
                            flatShading
                        />
                    </mesh>
                ))}
                <PedestalFlowerCluster position={[-1.22, 2.88, 0.08]} rotation={[0.4, 0.3, 0]} scale={1.15} />
                <PedestalFlowerCluster position={[1.25, 1.92, 0.1]} rotation={[0.4, -0.3, 0]} scale={1.0} />
                <PedestalFlowerCluster position={[-1.08, 0.38, 1.18]} rotation={[0.2, 0.2, 0]} scale={0.95} />
                <PedestalFlowerCluster position={[0.72, 0.52, 0.95]} rotation={[0.2, -0.2, 0]} scale={0.85} />

                {/* Base Rocks & Grass Tufts */}
                {baseRocks.map((r, i) => (
                    <mesh key={`b-rock-${i}`} geometry={r.geo} position={r.pos} castShadow receiveShadow>
                        <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneDark} roughness={0.88} flatShading />
                    </mesh>
                ))}

                {/* 7. Central Floating Golden-Orange Crystal & Orbit Ring */}
                <FloatingMemoryCrystalAssembly
                    position={[0, 2.25, 0]}
                    hasOrbitRing={true}
                    isNear={isNear}
                    isEchoing={isEchoing}
                    animRefs={animRefs}
                />
            </group>
        );
    }
);

/**
 * ============================================================================
 * VARIATION B: MINIMAL MEMORY PEDESTAL (Pedestals.jpg — Center Reference)
 * ============================================================================
 */
export const MinimalMemoryPedestal: React.FC<PedestalModelProps> = React.memo(
    ({ isNear, isEchoing, animRefs }) => {
        const cornerStones = useMemo(
            () => [
                { pos: [-0.72, 0.14, 0.42] as [number, number, number], s: [0.28, 0.22, 0.26] as [number, number, number], seed: 71 },
                { pos: [0.68, 0.12, 0.38] as [number, number, number], s: [0.24, 0.18, 0.22] as [number, number, number], seed: 82 },
            ].map((r) => ({
                ...r,
                geo: createSculptedFacetedGeometry(1, 1, r.s, 0.18, r.seed, true),
            })),
            []
        );

        return (
            <group>
                {/* 1. Squat Tapered Polygonal Sandstone Base */}
                <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.68, 0.88, 0.84, 7]} />
                    <meshStandardMaterial
                        color={PEDESTAL_PALETTE.sandstoneMid}
                        roughness={0.86}
                        flatShading
                    />
                </mesh>

                {/* 2. Broad Layered Overhanging Polygonal Top Slab */}
                <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.92, 0.78, 0.24, 7]} />
                    <meshStandardMaterial
                        color={PEDESTAL_PALETTE.sandstoneLight}
                        roughness={0.82}
                        flatShading
                    />
                </mesh>

                {/* 3. Circular Golden Ring Symbol on Top Surface */}
                <mesh
                    ref={animRefs?.wellGlowRef}
                    position={[0, 1.05, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <ringGeometry args={[0.36, 0.52, 24]} />
                    <meshStandardMaterial
                        color={PEDESTAL_PALETTE.orbitGold}
                        emissive={PEDESTAL_PALETTE.wellGlow}
                        emissiveIntensity={isNear || isEchoing ? 2.2 : 1.25}
                        side={THREE.DoubleSide}
                    />
                </mesh>
                <mesh position={[0, 1.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.35, 16]} />
                    <meshStandardMaterial
                        color={PEDESTAL_PALETTE.crystalCore}
                        emissive={PEDESTAL_PALETTE.crystalMid}
                        emissiveIntensity={isNear || isEchoing ? 1.8 : 0.85}
                    />
                </mesh>

                {/* 4. Single Prominent Orange-Red Banner on Front-Right */}
                <HangingBannerWithEmblem
                    position={[0.24, 0.92, 0.76]}
                    rotation={[-0.08, 0.22, 0]}
                />

                {/* 5. Base Stones & Minimal Leaf Tufts */}
                {cornerStones.map((r, i) => (
                    <mesh key={i} geometry={r.geo} position={r.pos} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={PEDESTAL_PALETTE.sandstoneDark}
                            roughness={0.88}
                            flatShading
                        />
                    </mesh>
                ))}
                {[-0.82, 0.78].map((lx, idx) => (
                    <mesh
                        key={`tuft-${idx}`}
                        position={[lx, 0.18, 0.25]}
                        rotation={[0.1, idx * 0.5, idx === 0 ? 0.35 : -0.35]}
                    >
                        <coneGeometry args={[0.12, 0.38, 4]} />
                        <meshStandardMaterial
                            color={PEDESTAL_PALETTE.vineGreen}
                            roughness={0.85}
                            flatShading
                        />
                    </mesh>
                ))}

                {/* 6. Floating Golden-Orange Crystal above Pedestal */}
                <FloatingMemoryCrystalAssembly
                    position={[0, 1.82, 0]}
                    hasOrbitRing={false}
                    isNear={isNear}
                    isEchoing={isEchoing}
                    animRefs={animRefs}
                />
            </group>
        );
    }
);

/**
 * ============================================================================
 * VARIATION C: ARCHED MEMORY PEDESTAL (Pedestals.jpg — Right Reference)
 * ============================================================================
 */
export const ArchedMemoryPedestal: React.FC<PedestalModelProps> = React.memo(
    ({ isNear, isEchoing, animRefs }) => {
        // Partial Curved Stone Arch Arm on Left Side
        const archArmBlocks = useMemo(() => {
            const list: Array<{
                pos: [number, number, number];
                rotZ: number;
                scale: [number, number, number];
            }> = [];
            const radius = 1.12;
            for (let i = 0; i < 7; i++) {
                const deg = 200 - i * 19;
                const rad = (deg * Math.PI) / 180;
                list.push({
                    pos: [Math.cos(rad) * radius + 0.12, 1.92 + Math.sin(rad) * radius, -0.08],
                    rotZ: rad - Math.PI / 2,
                    scale: [0.36 - i * 0.012, 0.44, 0.38],
                });
            }
            return list;
        }, []);

        return (
            <group>
                {/* 1. Stepped Sandstone Base */}
                <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[1.18, 1.32, 0.24, 8]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneDark} roughness={0.88} flatShading />
                </mesh>
                <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.98, 1.08, 0.18, 8]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneMid} roughness={0.86} flatShading />
                </mesh>

                {/* 2. Medium Tapered Altar Column & Bevelled Top Slab */}
                <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.76, 0.88, 0.68, 7]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneDeep} roughness={0.86} flatShading />
                </mesh>
                <mesh position={[0, 1.14, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.96, 0.84, 0.22, 7]} />
                    <meshStandardMaterial color={PEDESTAL_PALETTE.sandstoneLight} roughness={0.82} flatShading />
                </mesh>

                {/* 3. Carved 4-Petal Golden Relief Symbol on Front-Right Altar Face */}
                <group position={[0.26, 0.72, 0.78]} rotation={[0, 0.32, 0]}>
                    {[0, 1, 2, 3].map((p) => {
                        const a = (p / 4) * Math.PI * 2;
                        return (
                            <mesh
                                key={p}
                                position={[Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0]}
                                rotation={[0, 0, a + Math.PI / 4]}
                                scale={[1, 0.55, 0.35]}
                            >
                                <octahedronGeometry args={[0.05, 0]} />
                                <meshStandardMaterial
                                    color={PEDESTAL_PALETTE.emblemGold}
                                    emissive="#d98a2b"
                                    emissiveIntensity={0.4}
                                    flatShading
                                />
                            </mesh>
                        );
                    })}
                </group>

                {/* 4. Prominent Orange-Red Hanging Banner on Front-Left */}
                <HangingBannerWithEmblem
                    position={[-0.36, 1.08, 0.74]}
                    rotation={[-0.1, -0.28, 0.04]}
                />

                {/* 5. Warm Glowing Centre Basin Beneath Crystal */}
                <mesh
                    ref={animRefs?.wellGlowRef}
                    position={[0, 1.26, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <circleGeometry args={[0.56, 12]} />
                    <meshStandardMaterial
                        color={PEDESTAL_PALETTE.crystalCore}
                        emissive={PEDESTAL_PALETTE.wellGlow}
                        emissiveIntensity={isNear || isEchoing ? 2.4 : 1.45}
                    />
                </mesh>

                {/* 6. Partial Curved Stone Arch Arm Rising from Left */}
                <group>
                    {archArmBlocks.map((b, idx) => (
                        <mesh
                            key={`c-arch-${idx}`}
                            position={b.pos}
                            rotation={[0, 0, b.rotZ]}
                            castShadow
                            receiveShadow
                        >
                            <boxGeometry args={b.scale} />
                            <meshStandardMaterial
                                color={
                                    idx % 2 === 0
                                        ? PEDESTAL_PALETTE.sandstoneLight
                                        : PEDESTAL_PALETTE.terracottaStone
                                }
                                roughness={0.85}
                                flatShading
                            />
                        </mesh>
                    ))}
                </group>

                {/* 7. Integrated Vine Leaves & White Blossom on Arch Arm */}
                {[
                    [-0.88, 2.32, 0.08],
                    [-0.68, 2.68, 0.06],
                    [-0.95, 1.85, 0.05],
                ].map(([vx, vy, vz], i) => (
                    <mesh
                        key={`c-leaf-${i}`}
                        position={[vx, vy, vz]}
                        rotation={[0.2, i * 0.6, 0.4]}
                        scale={[1.2, 0.5, 0.7]}
                        castShadow
                    >
                        <octahedronGeometry args={[0.17, 0]} />
                        <meshStandardMaterial
                            color={i % 2 === 0 ? PEDESTAL_PALETTE.vineGreen : PEDESTAL_PALETTE.vineLight}
                            roughness={0.82}
                            flatShading
                        />
                    </mesh>
                ))}
                <PedestalFlowerCluster
                    position={[-0.74, 2.48, 0.14]}
                    rotation={[0.35, 0.25, 0]}
                    scale={1.1}
                />

                {/* 8. Floating Golden-Orange Crystal with Thin Golden Orbit Ring */}
                <FloatingMemoryCrystalAssembly
                    position={[0.05, 1.98, 0]}
                    hasOrbitRing={true}
                    ringTilt={[0.32, -0.18, 0.28]}
                    isNear={isNear}
                    isEchoing={isEchoing}
                    animRefs={animRefs}
                />
            </group>
        );
    }
);