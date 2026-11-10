// src/components/Environment/WorldAssetLibrary.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
    createSculptedFacetedGeometry,
    seededRandom,
} from '../../scenes/Environment/lowPolyUtils';

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
 * 1. STRUCTURES & LANDMARKS (Assets.jpeg — Middle Left)
 * ============================================================================
 */

/**
 * Cozy Storybook Cottage (Rounded stone/plaster walls, domed shingle roof,
 * arched timber door, glowing 4-pane window & chimney)
 */
export const CozyStorybookCottage: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        {/* Stone Foundation Plinth */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.35, 2.55, 0.44, 10]} />
            <meshStandardMaterial color={ASSET_PALETTE.stoneMid} roughness={0.9} flatShading />
        </mesh>

        {/* Main Cylindrical Plaster & Stone Cottage Wall */}
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.15, 2.28, 1.9, 10]} />
            <meshStandardMaterial color={ASSET_PALETTE.plasterWall} roughness={0.86} flatShading />
        </mesh>

        {/* Vertical Timber Wall Beams */}
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

        {/* Layered Domed Low-Poly Shingle Roof */}
        <mesh position={[0, 2.65, 0]} castShadow receiveShadow>
            <coneGeometry args={[2.68, 1.15, 10]} />
            <meshStandardMaterial color={ASSET_PALETTE.shingleDark} roughness={0.88} flatShading />
        </mesh>
        <mesh position={[0, 3.15, 0]} rotation={[0, 0.3, 0]} castShadow receiveShadow>
            <coneGeometry args={[1.95, 0.95, 10]} />
            <meshStandardMaterial color={ASSET_PALETTE.shingleMid} roughness={0.86} flatShading />
        </mesh>
        <mesh position={[0, 3.65, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.55, 0.32, 8]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
        </mesh>

        {/* Front-Left Arched Wooden Doorway & Stone Step */}
        <group position={[-0.78, 0.95, 2.08]} rotation={[0, -0.35, 0]}>
            <mesh castShadow>
                <boxGeometry args={[0.88, 1.35, 0.24]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0, -0.04, 0.06]}>
                <boxGeometry args={[0.7, 1.18, 0.16]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.82} flatShading />
            </mesh>
            {/* Brass Door Ring Handle */}
            <mesh position={[0.2, -0.05, 0.16]}>
                <torusGeometry args={[0.045, 0.014, 6, 12]} />
                <meshStandardMaterial color={ASSET_PALETTE.goldEmblem} metalness={0.5} />
            </mesh>
            {/* Doorstep Stone */}
            <mesh position={[0, -0.72, 0.25]} receiveShadow>
                <boxGeometry args={[1.05, 0.18, 0.55]} />
                <meshStandardMaterial color={ASSET_PALETTE.stoneLight} roughness={0.9} flatShading />
            </mesh>
        </group>

        {/* Front-Right Glowing 4-Pane Window */}
        <group position={[0.78, 1.25, 2.06]} rotation={[0, 0.35, 0]}>
            {/* Outer Timber Window Frame */}
            <mesh castShadow>
                <boxGeometry args={[0.82, 0.78, 0.18]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} />
            </mesh>
            {/* Warm Glowing Window Glass */}
            <mesh position={[0, 0, 0.05]}>
                <boxGeometry args={[0.66, 0.62, 0.1]} />
                <meshStandardMaterial
                    color={ASSET_PALETTE.lanternCore}
                    emissive={ASSET_PALETTE.lanternGlow}
                    emissiveIntensity={1.85}
                    roughness={0.2}
                />
            </mesh>
            {/* Cross Mullions */}
            <mesh position={[0, 0, 0.11]}>
                <boxGeometry args={[0.68, 0.055, 0.04]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} />
            </mesh>
            <mesh position={[0, 0, 0.11]}>
                <boxGeometry args={[0.055, 0.64, 0.04]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} />
            </mesh>
            {/* Window Sill */}
            <mesh position={[0, -0.42, 0.1]} castShadow>
                <boxGeometry args={[0.94, 0.1, 0.28]} />
                <meshStandardMaterial color={ASSET_PALETTE.stoneLight} flatShading />
            </mesh>
        </group>

        {/* Warm Interior Window Light Spill */}
        <pointLight
            position={[0.9, 1.25, 2.6]}
            color={ASSET_PALETTE.lanternGlow}
            intensity={1.3}
            distance={5.5}
            decay={2}
        />
    </group>
));

/**
 * Red Wooden Torii Gate with Upturned Roof Lintel & Hanging Floral Banner
 */
export const RedToriiGate: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        {/* Left & Right Stone Pedestal Bases + Vermilion Columns */}
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
                {/* Side Decorative Lattice Braces */}
                <mesh position={[idx === 0 ? -0.36 : 0.36, 2.75, 0]} castShadow>
                    <boxGeometry args={[0.45, 0.85, 0.12]} />
                    <meshStandardMaterial color={ASSET_PALETTE.toriiDarkRed} roughness={0.8} flatShading />
                </mesh>
            </group>
        ))}

        {/* Lower Crossbeam (Nuki) */}
        <mesh position={[0, 2.95, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.9, 0.24, 0.26]} />
            <meshStandardMaterial color={ASSET_PALETTE.toriiRed} roughness={0.78} flatShading />
        </mesh>

        {/* Center Strut (Gakuzuka) */}
        <mesh position={[0, 3.32, 0]} castShadow>
            <boxGeometry args={[0.24, 0.55, 0.22]} />
            <meshStandardMaterial color={ASSET_PALETTE.toriiDarkRed} roughness={0.8} flatShading />
        </mesh>

        {/* Upper Main Lintel (Kasagi) & Dark Shingle Cap */}
        <mesh position={[0, 3.65, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.45, 0.26, 0.38]} />
            <meshStandardMaterial color={ASSET_PALETTE.toriiRed} roughness={0.78} flatShading />
        </mesh>
        <mesh position={[0, 3.84, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.65, 0.16, 0.46]} />
            <meshStandardMaterial color={ASSET_PALETTE.shingleDark} roughness={0.85} flatShading />
        </mesh>
        {/* Upturned Lintel Wing Tips */}
        {[-2.25, 2.25].map((wx, i) => (
            <mesh
                key={`wing-${i}`}
                position={[wx, 3.88, 0]}
                rotation={[0, 0, i === 0 ? 0.22 : -0.22]}
                castShadow
            >
                <boxGeometry args={[0.55, 0.18, 0.46]} />
                <meshStandardMaterial color={ASSET_PALETTE.shingleDark} roughness={0.85} flatShading />
            </mesh>
        ))}

        {/* Central Hanging Red Banner with Golden Blossom Emblem */}
        <group position={[0, 2.82, 0]}>
            <mesh position={[0, -0.48, 0]} castShadow>
                <boxGeometry args={[0.46, 0.96, 0.03]} />
                <meshStandardMaterial color={ASSET_PALETTE.bannerRed} roughness={0.82} flatShading />
            </mesh>
            <mesh position={[0, -0.48, 0.02]}>
                <dodecahedronGeometry args={[0.11, 0]} />
                <meshStandardMaterial
                    color={ASSET_PALETTE.goldEmblem}
                    emissive="#d98a2b"
                    emissiveIntensity={0.35}
                    flatShading
                />
            </mesh>
        </group>
    </group>
));

/**
 * Individual Standing Weathered Stone Pillar with Moss & Ivy
 */
export const StandingStonePillar: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
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
        {/* Pillar Capital Block */}
        <mesh position={[0, 2.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.02, 0.36, 1.02]} />
            <meshStandardMaterial color={ASSET_PALETTE.stoneLight} roughness={0.85} flatShading />
        </mesh>
        {/* Clinging Moss Patches */}
        <mesh position={[0.38, 1.65, 0.38]} scale={[0.7, 1.2, 0.5]} castShadow>
            <dodecahedronGeometry args={[0.26, 0]} />
            <meshStandardMaterial color={ASSET_PALETTE.mossGreen} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[-0.36, 0.65, 0.42]} scale={[0.8, 0.9, 0.5]} castShadow>
            <dodecahedronGeometry args={[0.24, 0]} />
            <meshStandardMaterial color={ASSET_PALETTE.mossLight} roughness={0.85} flatShading />
        </mesh>
    </group>
));

/**
 * ============================================================================
 * 2. WATER & BRIDGES (Assets.jpeg — Top Right)
 * ============================================================================
 */

/**
 * Stylized Reflection Pond with Shoreline Rocks, Reeds & Ripples
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
            {/* Sandy Pond Bed Rim */}
            <mesh position={[0, 0.03, 0]} receiveShadow>
                <cylinderGeometry args={[3.45, 3.65, 0.08, 14]} />
                <meshStandardMaterial color="#b89f86" roughness={0.9} flatShading />
            </mesh>
            {/* Turquoise Reflective Water Surface */}
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
            {/* Subtle Water Surface Ripple Ring */}
            <mesh ref={rippleRef} position={[0.4, 0.115, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.85, 0.94, 24]} />
                <meshBasicMaterial
                    color={ASSET_PALETTE.waterFoam}
                    transparent
                    opacity={0.45}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Shoreline Boulders */}
            {shoreRocks.map((r, i) => (
                <mesh key={i} geometry={r.geo} position={r.pos} castShadow receiveShadow>
                    <meshStandardMaterial color={ASSET_PALETTE.stoneMid} roughness={0.88} flatShading />
                </mesh>
            ))}
            {/* Shoreline Reed Tufts */}
            {[
                [-2.6, 0.1, -0.4],
                [2.4, 0.1, -0.8],
                [-1.9, 0.1, 2.1],
            ].map(([tx, ty, tz], idx) => (
                <group key={`reed-${idx}`} position={[tx, ty, tz]}>
                    {[-0.12, 0, 0.12].map((ox, j) => (
                        <mesh
                            key={j}
                            position={[ox, 0.35, 0]}
                            rotation={[0.08, j * 0.4, (j - 1) * 0.22]}
                        >
                            <coneGeometry args={[0.08, 0.75, 4]} />
                            <meshStandardMaterial color={ASSET_PALETTE.mossGreen} flatShading />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    );
});

/**
 * Wooden Straight Bridge (Plank deck, 6 posts & twin side rails)
 */
export const WoodenStraightBridge: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
        {/* Longitudinal Support Stringers */}
        {[-0.82, 0.82].map((sx, i) => (
            <mesh key={`str-${i}`} position={[sx, 0.22, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.16, 0.18, 3.8]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.86} flatShading />
            </mesh>
        ))}
        {/* Transverse Wooden Deck Planks */}
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
        {/* 6 Vertical Posts & Twin Side Handrails */}
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
));

/**
 * Wooden Arched Bridge (Curved deck planks, arched stringers & handrails)
 */
export const WoodenArchedBridge: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0, scale = 1 }: WorldAssetProps) => {
    const planks = useMemo(() => {
        const count = 13;
        return Array.from({ length: count }).map((_, i) => {
            const u = (i / (count - 1)) * 2 - 1; // -1 .. +1
            const z = u * 2.35;
            const archY = (1 - u * u) * 0.68 + 0.15;
            const pitch = Math.atan2(-2 * u * 0.68, 2.35);
            return { z, archY, pitch };
        });
    }, []);

    return (
        <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
            {/* Curved Deck Planks */}
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

            {/* Side Posts & Arched Handrails */}
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
                    {/* Segmented Arched Top Rail */}
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
});

/**
 * ============================================================================
 * 3. INTERACTABLES / MEMORY ELEMENTS (Assets.jpeg — Middle Right)
 * ============================================================================
 */

/**
 * Decorative Standing Memory Banner Post
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
));

/**
 * Wooden Lantern Post with Glowing Hanging Lantern
 */
export const WoodenLanternPost: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0 }: WorldAssetProps) => (
    <group position={position} rotation={[0, rotationY, 0]}>
        {/* Tapered Base & Timber Post */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.36, 0.4, 0.36]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDeep} roughness={0.88} flatShading />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 2.4, 0.2]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
        </mesh>
        {/* Cross Arm & Diagonal Brace */}
        <mesh position={[0.28, 2.28, 0]} castShadow>
            <boxGeometry args={[0.88, 0.15, 0.15]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0.22, 2.02, 0]} rotation={[0, 0, 0.72]} castShadow>
            <boxGeometry args={[0.1, 0.55, 0.1]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.85} flatShading />
        </mesh>
        {/* Hanging Glowing Lantern */}
        <group position={[0.56, 1.92, 0]}>
            <mesh position={[0, 0.18, 0]}>
                <coneGeometry args={[0.19, 0.14, 6]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDeep} flatShading />
            </mesh>
            <mesh>
                <cylinderGeometry args={[0.14, 0.11, 0.28, 6]} />
                <meshStandardMaterial
                    color={ASSET_PALETTE.lanternCore}
                    emissive={ASSET_PALETTE.lanternGlow}
                    emissiveIntensity={2.1}
                    roughness={0.2}
                />
            </mesh>
            <mesh position={[0, -0.16, 0]}>
                <cylinderGeometry args={[0.13, 0.1, 0.05, 6]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDeep} flatShading />
            </mesh>
            <pointLight
                position={[0, -0.05, 0]}
                color={ASSET_PALETTE.lanternGlow}
                intensity={1.35}
                distance={6.5}
                decay={2}
            />
        </group>
    </group>
));

/**
 * Engraved Memory Stone Monument (Stepped base & carved floral stele)
 */
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
        {/* Main Tapered Sandstone Stele */}
        <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.12, 1.45, 0.44]} />
            <meshStandardMaterial color={ASSET_PALETTE.stoneLight} roughness={0.85} flatShading />
        </mesh>
        {/* Pitched Monument Crown */}
        <mesh position={[0, 1.92, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.68, 0.36, 4]} />
            <meshStandardMaterial color={ASSET_PALETTE.stoneLight} roughness={0.85} flatShading />
        </mesh>
        {/* Carved 5-Petal Floral Emblem Medallion */}
        <group position={[0, 1.18, 0.23]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.28, 0.28, 0.03, 12]} />
                <meshStandardMaterial color={ASSET_PALETTE.stoneDark} roughness={0.9} flatShading />
            </mesh>
            {[0, 1, 2, 3, 4].map((p) => {
                const a = (p / 5) * Math.PI * 2;
                return (
                    <mesh
                        key={p}
                        position={[Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.02]}
                        rotation={[0, 0, a]}
                        scale={[1, 0.65, 0.35]}
                    >
                        <octahedronGeometry args={[0.075, 0]} />
                        <meshStandardMaterial color={ASSET_PALETTE.stoneLight} roughness={0.82} flatShading />
                    </mesh>
                );
            })}
        </group>
    </group>
));

/**
 * Wooden Memory Noticeboard (Pinned parchment notices & red cloth drape)
 */
export const WoodenMemoryNoticeboard: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0 }: WorldAssetProps) => (
    <group position={position} rotation={[0, rotationY, 0]}>
        {[-0.82, 0.82].map((px, i) => (
            <mesh key={i} position={[px, 1.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.18, 2.1, 0.18]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.86} flatShading />
            </mesh>
        ))}
        {/* Noticeboard Frame & Backing */}
        <mesh position={[0, 1.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.88, 1.18, 0.14]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
        </mesh>
        {/* Pitched Overhanging Roof */}
        <mesh position={[0, 2.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.18, 0.18, 0.48]} />
            <meshStandardMaterial color={ASSET_PALETTE.shingleDark} roughness={0.86} flatShading />
        </mesh>
        {/* Red Cloth Roll Draped on Top-Left Roof Corner */}
        <mesh position={[-0.68, 2.16, 0.06]} rotation={[0.1, 0.2, 0.12]} castShadow>
            <boxGeometry args={[0.52, 0.18, 0.38]} />
            <meshStandardMaterial color={ASSET_PALETTE.bannerRed} roughness={0.8} flatShading />
        </mesh>
        {/* Pinned Parchment Notices */}
        {[
            [-0.45, 1.48, 0.08, 0.38, 0.46, 0.04],
            [0.05, 1.52, 0.08, 0.32, 0.36, -0.05],
            [0.48, 1.36, 0.08, 0.42, 0.52, 0.03],
            [-0.12, 1.12, 0.08, 0.34, 0.28, -0.03],
        ].map(([nx, ny, nz, nw, nh, rotZ], idx) => (
            <mesh
                key={`note-${idx}`}
                position={[nx, ny, nz]}
                rotation={[0, 0, rotZ]}
                castShadow
            >
                <boxGeometry args={[nw, nh, 0.015]} />
                <meshStandardMaterial color={ASSET_PALETTE.parchmentNote} roughness={0.88} />
            </mesh>
        ))}
    </group>
));

/**
 * ============================================================================
 * 4. UTILITY & WORLD PROPS (Assets.jpeg — Bottom Left)
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
));

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
));

export const WoodenCargoCart: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0 }: WorldAssetProps) => (
    <group position={position} rotation={[0, rotationY, 0]}>
        {/* Cart Bed & Side Slats */}
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.45, 0.12, 1.05]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.86} flatShading />
        </mesh>
        {[-0.48, 0.48].map((sz, i) => (
            <mesh key={i} position={[0, 0.78, sz]} castShadow>
                <boxGeometry args={[1.42, 0.42, 0.08]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
            </mesh>
        ))}
        {/* Pull Handles */}
        {[-0.38, 0.38].map((hz, i) => (
            <mesh key={i} position={[-0.95, 0.48, hz]} rotation={[0, 0, 0.15]} castShadow>
                <boxGeometry args={[0.68, 0.08, 0.08]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDark} />
            </mesh>
        ))}
        {/* Spoked Wooden Wheels */}
        {[
            [-0.42, 0.32, 0.58],
            [0.42, 0.32, 0.58],
            [-0.42, 0.32, -0.58],
            [0.42, 0.32, -0.58],
        ].map(([wx, wy, wz], idx) => (
            <mesh
                key={`wheel-${idx}`}
                position={[wx, wy, wz]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
            >
                <cylinderGeometry args={[0.32, 0.32, 0.1, 10]} />
                <meshStandardMaterial color={ASSET_PALETTE.woodDeep} roughness={0.88} flatShading />
            </mesh>
        ))}
        {/* Stacked Wooden Crates Inside Cart */}
        <mesh position={[0.15, 0.86, -0.1]} rotation={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.56, 0.56, 0.56]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodLight} roughness={0.82} flatShading />
        </mesh>
        <mesh position={[-0.32, 0.78, 0.12]} rotation={[0, -0.18, 0]} castShadow>
            <boxGeometry args={[0.42, 0.42, 0.42]} />
            <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
        </mesh>
    </group>
));

/**
 * Explorer Campsite (A-Frame Tent, Hanging Peak Lantern & Animated Campfire)
 */
export const ExplorerCampsite: React.FC<WorldAssetProps> = React.memo(
    ({ position = [0, 0, 0], rotationY = 0 }: WorldAssetProps) => {
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

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* 1. A-Frame Canvas Explorer Tent */}
            <group position={[0.85, 0, -0.4]} rotation={[0, -0.35, 0]}>
                {/* Tent Roof Slopes */}
                <mesh position={[-0.62, 0.92, 0]} rotation={[0, 0, 0.58]} castShadow receiveShadow>
                    <boxGeometry args={[0.06, 2.15, 2.45]} />
                    <meshStandardMaterial color={ASSET_PALETTE.canvasLight} roughness={0.85} flatShading />
                </mesh>
                <mesh position={[0.62, 0.92, 0]} rotation={[0, 0, -0.58]} castShadow receiveShadow>
                    <boxGeometry args={[0.06, 2.15, 2.45]} />
                    <meshStandardMaterial color={ASSET_PALETTE.canvasMid} roughness={0.86} flatShading />
                </mesh>
                {/* Crossed Front & Back Timber Tent Poles */}
                {[1.25, -1.25].map((pz, idx) => (
                    <group key={`poles-${idx}`} position={[0, 0, pz]}>
                        <mesh position={[-0.55, 1.02, 0]} rotation={[0, 0, -0.54]} castShadow>
                            <cylinderGeometry args={[0.04, 0.05, 2.35, 6]} />
                            <meshStandardMaterial color={ASSET_PALETTE.woodDark} />
                        </mesh>
                        <mesh position={[0.55, 1.02, 0]} rotation={[0, 0, 0.54]} castShadow>
                            <cylinderGeometry args={[0.04, 0.05, 2.35, 6]} />
                            <meshStandardMaterial color={ASSET_PALETTE.woodDark} />
                        </mesh>
                    </group>
                ))}
                {/* Ridge Pole & Hanging Tent Lantern */}
                <mesh position={[0, 1.82, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.045, 0.045, 2.75, 6]} />
                    <meshStandardMaterial color={ASSET_PALETTE.woodDark} />
                </mesh>
                <mesh position={[0, 1.52, 1.32]}>
                    <cylinderGeometry args={[0.08, 0.065, 0.18, 6]} />
                    <meshStandardMaterial
                        color={ASSET_PALETTE.lanternCore}
                        emissive={ASSET_PALETTE.lanternGlow}
                        emissiveIntensity={2.0}
                    />
                </mesh>
            </group>

            {/* 2. Stone-Ringed Campfire with Animated Low-Poly Flame */}
            <group position={[-0.95, 0, 1.15]}>
                {/* Ring of 8 Campfire Stones */}
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
                {/* Crossed Firewood Logs */}
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
                {/* Flickering Multi-Faceted Flame */}
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

            {/* Companion Barrel, Crate & Tree Stump */}
            <group position={[-2.25, 0, -0.35]}>
                {/* Wooden Barrel */}
                <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.26, 0.24, 0.72, 9]} />
                    <meshStandardMaterial color={ASSET_PALETTE.woodMid} roughness={0.84} flatShading />
                </mesh>
                {/* Wooden Crate */}
                <mesh position={[-0.58, 0.25, 0.18]} rotation={[0, 0.28, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshStandardMaterial color={ASSET_PALETTE.woodLight} roughness={0.84} flatShading />
                </mesh>
                {/* Tree Stump */}
                <mesh position={[0.72, 0.2, 0.25]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.22, 0.36, 0.4, 7]} />
                    <meshStandardMaterial color={ASSET_PALETTE.woodDark} roughness={0.88} flatShading />
                </mesh>
            </group>
        </group>
    );
});

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
                {/* White Toadstool Spots */}
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
));

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
});