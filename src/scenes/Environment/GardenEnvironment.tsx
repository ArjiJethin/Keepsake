// src/scenes/Environment/GardenEnvironment.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import {
    createSculptedFacetedGeometry,
    getGardenTerrainHeight,
    seededRandom,
} from './lowPolyUtils';
import { MemoryPedestals } from '../../components/Memory/MemoryPedestals';

/**
 * 1. Sculpted Vertex-Colored Low-Poly Meadow Terrain
 */
const MeadowTerrain: React.FC = () => {
    const geometry = useMemo(() => {
        const plane = new THREE.PlaneGeometry(130, 130, 72, 72);
        plane.rotateX(-Math.PI / 2);
        const nonIndexed = plane.toNonIndexed();
        const pos = nonIndexed.attributes.position;
        const colors = new Float32Array(pos.count * 3);

        const cShadow = new THREE.Color(THEME.colors.meadowShadow);
        const cBase = new THREE.Color(THEME.colors.meadowBase);
        const cSunlit = new THREE.Color(THEME.colors.meadowSunlit);
        const cPathEdge = new THREE.Color('#7d7b58');
        const tempColor = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const y = getGardenTerrainHeight(x, z);
            pos.setY(i, y);

            // Blend vertex colors based on elevation, sunlight direction, and path proximity
            const sunFactor = THREE.MathUtils.clamp(
                (-x * 0.025 - z * 0.018 + 0.55) + seededRandom(x * 13 + z * 29) * 0.14,
                0,
                1
            );

            if (z > 4) {
                tempColor.copy(cBase).lerp(cShadow, Math.min((z - 4) / 14, 0.75));
            } else {
                tempColor.copy(cBase).lerp(cSunlit, sunFactor * 0.75);
            }

            const pathCenterX = Math.sin(z * 0.09) * 2.2 - x * 0.04;
            if (Math.abs(x - pathCenterX) < 2.5) {
                tempColor.lerp(cPathEdge, 0.3);
            }

            colors[i * 3] = tempColor.r;
            colors[i * 3 + 1] = tempColor.g;
            colors[i * 3 + 2] = tempColor.b;
        }

        nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        nonIndexed.computeVertexNormals();
        return nonIndexed;
    }, []);

    return (
        <mesh geometry={geometry} receiveShadow>
            <meshStandardMaterial
                vertexColors
                roughness={0.92}
                metalness={0.02}
                flatShading
            />
        </mesh>
    );
};

/**
 * 2. Winding Polygonal Stone Pathway (Foreground to Distant Archway)
 */
const StonePathway: React.FC = () => {
    const stones = useMemo(() => {
        const list: Array<{
            position: [number, number, number];
            rotation: [number, number, number];
            scale: [number, number, number];
            color: string;
            geo: THREE.BufferGeometry;
        }> = [];

        // Main central winding stepping stones
        for (let i = 0; i < 28; i++) {
            const t = i / 27;
            const z = 11.5 - t * 38;
            // Curve gently in foreground and sweep left toward the stone archway in midground
            const curveX =
                z > -4
                    ? Math.sin(z * 0.28) * 1.15 + 0.4
                    : Math.sin(-4 * 0.28) * 1.15 + 0.4 - Math.pow((-z - 4) * 0.26, 1.28);

            const xOffset = ((i % 2 === 0 ? 1 : -1) * 0.32) + (seededRandom(i * 7) - 0.5) * 0.25;
            const x = curveX + xOffset;
            const y = getGardenTerrainHeight(x, z) + 0.04;

            const radius = 0.72 + seededRandom(i * 13) * 0.35;
            const sides = 6 + (i % 3);
            const cyl = new THREE.CylinderGeometry(
                radius * 0.92,
                radius * 1.06,
                0.16,
                sides
            ).toNonIndexed();

            // Slightly bevel & facet the stone top vertices
            const pos = cyl.attributes.position;
            for (let v = 0; v < pos.count; v++) {
                const vx = pos.getX(v);
                const vy = pos.getY(v);
                const vz = pos.getZ(v);
                const jitter = (seededRandom(v * 3.1 + i) - 0.5) * 0.08;
                pos.setXYZ(v, vx + jitter, vy, vz + jitter);
            }
            cyl.computeVertexNormals();

            list.push({
                position: [x, y, z],
                rotation: [
                    (seededRandom(i * 19) - 0.5) * 0.08,
                    seededRandom(i * 23) * Math.PI,
                    (seededRandom(i * 31) - 0.5) * 0.08,
                ],
                scale: [
                    1.15 + seededRandom(i * 41) * 0.35,
                    1,
                    0.85 + seededRandom(i * 43) * 0.25,
                ],
                color: i % 3 === 0 ? THEME.colors.stoneSunlit : THEME.colors.stoneBase,
                geo: cyl,
            });
        }
        return list;
    }, []);

    return (
        <group>
            {stones.map((s, idx) => (
                <mesh
                    key={idx}
                    geometry={s.geo}
                    position={s.position}
                    rotation={s.rotation}
                    scale={s.scale}
                    receiveShadow
                    castShadow
                >
                    <meshStandardMaterial
                        color={s.color}
                        roughness={0.88}
                        flatShading
                    />
                </mesh>
            ))}
        </group>
    );
};

/**
 * 3. Left Stone Archway Ruin with Carved Blocks, Steps & Hanging Ivy
 *    Matches LoadingScreen.png & Home Screen.jpg
 */
const StoneArchwayRuin: React.FC<{
    position: [number, number, number];
    rotationY?: number;
    scale?: number;
}> = ({ position, rotationY = 0.28, scale = 1 }) => {
    const ivyClusters = useMemo(() => {
        return [
            { pos: [-1.7, 4.9, 0.35] as [number, number, number], s: [0.9, 1.3, 0.6] as [number, number, number], seed: 11 },
            { pos: [-1.85, 3.6, 0.42] as [number, number, number], s: [0.65, 1.5, 0.5] as [number, number, number], seed: 22 },
            { pos: [-0.6, 5.7, 0.35] as [number, number, number], s: [1.3, 0.85, 0.65] as [number, number, number], seed: 33 },
            { pos: [0.65, 5.5, 0.35] as [number, number, number], s: [1.1, 0.9, 0.6] as [number, number, number], seed: 44 },
            { pos: [1.65, 4.4, 0.38] as [number, number, number], s: [0.75, 1.4, 0.55] as [number, number, number], seed: 55 },
            { pos: [1.75, 2.9, 0.4] as [number, number, number], s: [0.6, 1.2, 0.5] as [number, number, number], seed: 66 },
        ].map((item) => ({
            ...item,
            geo: createSculptedFacetedGeometry(0.65, 1, item.s, 0.22, item.seed),
        }));
    }, []);

    // Archway voussoir blocks around the curved top
    const archBlocks = useMemo(() => {
        const blocks: Array<{
            pos: [number, number, number];
            rotZ: number;
            size: [number, number, number];
        }> = [];
        const count = 9;
        const radius = 1.75;
        for (let i = 0; i < count; i++) {
            const angle = Math.PI - (i / (count - 1)) * Math.PI;
            const bx = Math.cos(angle) * radius;
            const by = 3.85 + Math.sin(angle) * radius;
            blocks.push({
                pos: [bx, by, 0],
                rotZ: angle - Math.PI / 2,
                size: [0.72, 0.88, 1.05 + (i % 2) * 0.08],
            });
        }
        return blocks;
    }, []);

    return (
        <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
            {/* Base Stone Platform & Steps */}
            <mesh position={[-1.75, 0.3, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.65, 0.6, 1.65]} />
                <meshStandardMaterial color={THEME.colors.stoneShadow} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[1.75, 0.3, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.65, 0.6, 1.65]} />
                <meshStandardMaterial color={THEME.colors.stoneShadow} roughness={0.9} flatShading />
            </mesh>

            {/* Left Pillar Stacked Masonry Blocks */}
            {[0.95, 1.85, 2.75, 3.6].map((py, idx) => (
                <mesh
                    key={`lp-${idx}`}
                    position={[-1.75 + (idx % 2) * 0.04, py, 0]}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry
                        args={[
                            1.18 - (idx % 2) * 0.06,
                            0.86,
                            1.15 - (idx % 2) * 0.05,
                        ]}
                    />
                    <meshStandardMaterial
                        color={idx % 2 === 0 ? THEME.colors.stoneBase : THEME.colors.stoneSunlit}
                        roughness={0.88}
                        flatShading
                    />
                </mesh>
            ))}

            {/* Right Pillar Stacked Masonry Blocks */}
            {[0.95, 1.85, 2.75, 3.6].map((py, idx) => (
                <mesh
                    key={`rp-${idx}`}
                    position={[1.75 - (idx % 2) * 0.04, py, 0]}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry
                        args={[
                            1.15 - (idx % 2) * 0.05,
                            0.86,
                            1.15 - (idx % 2) * 0.05,
                        ]}
                    />
                    <meshStandardMaterial
                        color={idx % 2 === 1 ? THEME.colors.stoneBase : THEME.colors.stoneSunlit}
                        roughness={0.88}
                        flatShading
                    />
                </mesh>
            ))}

            {/* Curved Arch Voussoir Stones */}
            {archBlocks.map((b, i) => (
                <mesh
                    key={`arch-${i}`}
                    position={b.pos}
                    rotation={[0, 0, b.rotZ]}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={b.size} />
                    <meshStandardMaterial
                        color={i % 2 === 0 ? THEME.colors.stoneSunlit : THEME.colors.stoneBase}
                        roughness={0.86}
                        flatShading
                    />
                </mesh>
            ))}

            {/* Broken Upper Crown Stones (Left side matching LoadingScreen.png) */}
            <mesh position={[-1.65, 5.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.3, 0.9, 1.2]} />
                <meshStandardMaterial color={THEME.colors.stoneBase} roughness={0.88} flatShading />
            </mesh>
            <mesh position={[-0.75, 5.85, 0]} rotation={[0, 0, 0.18]} castShadow receiveShadow>
                <boxGeometry args={[1.25, 0.75, 1.1]} />
                <meshStandardMaterial color={THEME.colors.stoneSunlit} roughness={0.88} flatShading />
            </mesh>

            {/* Companion Broken Ruin Wall on Right of Arch */}
            <mesh position={[3.15, 0.9, -0.2]} castShadow receiveShadow>
                <boxGeometry args={[1.1, 1.8, 0.95]} />
                <meshStandardMaterial color={THEME.colors.stoneShadow} roughness={0.9} flatShading />
            </mesh>

            {/* Hanging Ivy & Moss Clusters */}
            {ivyClusters.map((ivy, idx) => (
                <mesh
                    key={`ivy-${idx}`}
                    geometry={ivy.geo}
                    position={ivy.pos}
                    castShadow
                >
                    <meshStandardMaterial
                        color={idx % 2 === 0 ? THEME.colors.ivyGreen : THEME.colors.ivyLight}
                        roughness={0.85}
                        flatShading
                    />
                </mesh>
            ))}
        </group>
    );
};

/**
 * 4. Giant Low-Poly Sakura Tree (Right Foreground/Midground)
 *    Includes sculpted roots, gnarled trunk, sweeping branches, layered faceted
 *    blossom clouds, and 2 swaying fabric banners with flower motifs.
 */
const GiantSakuraTree: React.FC<{ position: [number, number, number] }> = ({
    position,
}) => {
    const banner1Ref = useRef<THREE.Group>(null);
    const banner2Ref = useRef<THREE.Group>(null);
    const canopyGroupRef = useRef<THREE.Group>(null);

    const blossomClusters = useMemo(() => {
        const specs: Array<{
            pos: [number, number, number];
            scale: [number, number, number];
            radius: number;
            color: string;
            seed: number;
        }> = [
                // Main overhead & left-reaching canopy clusters (framing top-right of screen)
                { pos: [-3.8, 7.6, 1.4], scale: [1.65, 0.92, 1.35], radius: 1.85, color: THEME.colors.sakuraLight, seed: 101 },
                { pos: [-2.1, 8.4, 0.8], scale: [1.85, 1.05, 1.5], radius: 2.1, color: THEME.colors.sakuraMid, seed: 102 },
                { pos: [-0.2, 8.9, 0.2], scale: [2.1, 1.15, 1.7], radius: 2.3, color: THEME.colors.sakuraDeep, seed: 103 },
                { pos: [1.8, 8.2, -0.4], scale: [1.9, 1.1, 1.6], radius: 2.2, color: THEME.colors.sakuraMid, seed: 104 },
                { pos: [-4.9, 6.9, 1.9], scale: [1.35, 0.82, 1.15], radius: 1.55, color: THEME.colors.sakuraRim, seed: 105 },
                { pos: [-2.6, 6.4, 1.8], scale: [1.45, 0.85, 1.2], radius: 1.6, color: THEME.colors.sakuraLight, seed: 106 },
                { pos: [-1.1, 7.1, 2.2], scale: [1.5, 0.9, 1.3], radius: 1.75, color: THEME.colors.sakuraMid, seed: 107 },
                { pos: [0.9, 6.8, 1.6], scale: [1.65, 0.95, 1.4], radius: 1.85, color: THEME.colors.sakuraDeep, seed: 108 },
                { pos: [-3.2, 9.3, -0.3], scale: [1.6, 0.95, 1.4], radius: 1.9, color: THEME.colors.sakuraRim, seed: 109 },
            ];

        return specs.map((s) => ({
            ...s,
            geo: createSculptedFacetedGeometry(s.radius, 1, s.scale, 0.18, s.seed),
        }));
    }, []);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (banner1Ref.current) {
            banner1Ref.current.rotation.z = Math.sin(t * 1.3) * 0.045 + 0.03;
            banner1Ref.current.rotation.x = Math.cos(t * 0.9) * 0.03;
        }
        if (banner2Ref.current) {
            banner2Ref.current.rotation.z = Math.sin(t * 1.3 + 1.1) * 0.05 + 0.04;
            banner2Ref.current.rotation.x = Math.cos(t * 0.9 + 0.8) * 0.035;
        }
        if (canopyGroupRef.current) {
            canopyGroupRef.current.rotation.z = Math.sin(t * 0.6) * 0.008;
        }
    });

    return (
        <group position={position}>
            {/* Sculpted Buttress Roots */}
            {[
                { pos: [-1.1, 0.45, 0.9], rot: [0.3, 0.4, 0.48], size: [0.55, 0.95, 2.4] },
                { pos: [-0.6, 0.35, 1.35], rot: [0.45, 0.1, 0.25], size: [0.45, 0.8, 2.1] },
                { pos: [0.4, 0.4, 1.1], rot: [0.35, -0.2, -0.2], size: [0.5, 0.85, 2.0] },
                { pos: [-1.3, 0.4, -0.4], rot: [-0.2, 0.5, 0.52], size: [0.5, 0.9, 2.2] },
            ].map((r, i) => (
                <mesh
                    key={`root-${i}`}
                    position={r.pos as [number, number, number]}
                    rotation={r.rot as [number, number, number]}
                    castShadow
                    receiveShadow
                >
                    <cylinderGeometry args={[r.size[0], r.size[1], r.size[2], 6]} />
                    <meshStandardMaterial
                        color={i % 2 === 0 ? THEME.colors.barkHighlight : THEME.colors.barkBase}
                        roughness={0.9}
                        flatShading
                    />
                </mesh>
            ))}

            {/* Main Lower & Upper Gnarled Trunk */}
            <mesh position={[0, 2.1, 0]} rotation={[0.04, 0.2, 0.12]} castShadow receiveShadow>
                <cylinderGeometry args={[1.05, 1.65, 4.4, 7]} />
                <meshStandardMaterial color={THEME.colors.barkBase} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[-0.38, 4.6, 0.15]} rotation={[0.06, -0.3, 0.22]} castShadow receiveShadow>
                <cylinderGeometry args={[0.78, 1.12, 3.2, 7]} />
                <meshStandardMaterial color={THEME.colors.barkHighlight} roughness={0.88} flatShading />
            </mesh>

            {/* Sweeping Left Hero Branch (Holds the 2 Banners & Blossoms) */}
            <mesh position={[-1.95, 5.95, 0.75]} rotation={[0.18, 0.15, 0.88]} castShadow receiveShadow>
                <cylinderGeometry args={[0.32, 0.68, 4.2, 6]} />
                <meshStandardMaterial color={THEME.colors.barkBase} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[-3.7, 7.1, 1.3]} rotation={[0.15, 0.1, 1.12]} castShadow receiveShadow>
                <cylinderGeometry args={[0.18, 0.34, 2.8, 6]} />
                <meshStandardMaterial color={THEME.colors.barkShadow} roughness={0.9} flatShading />
            </mesh>

            {/* Secondary Upper Branches */}
            <mesh position={[-0.7, 6.8, 0.1]} rotation={[-0.1, 0.2, 0.38]} castShadow receiveShadow>
                <cylinderGeometry args={[0.28, 0.58, 3.4, 6]} />
                <meshStandardMaterial color={THEME.colors.barkBase} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[0.85, 6.5, -0.25]} rotation={[-0.15, -0.2, -0.35]} castShadow receiveShadow>
                <cylinderGeometry args={[0.35, 0.65, 3.2, 6]} />
                <meshStandardMaterial color={THEME.colors.barkShadow} roughness={0.9} flatShading />
            </mesh>

            {/* Hanging Banner 1 (Left Larger Banner with Flower Motif) */}
            <group ref={banner1Ref} position={[-2.25, 5.65, 0.92]}>
                {/* Hanging cords */}
                <mesh position={[-0.25, -0.15, 0]}>
                    <cylinderGeometry args={[0.018, 0.018, 0.35, 4]} />
                    <meshBasicMaterial color="#3d281e" />
                </mesh>
                <mesh position={[0.25, -0.15, 0]}>
                    <cylinderGeometry args={[0.018, 0.018, 0.35, 4]} />
                    <meshBasicMaterial color="#3d281e" />
                </mesh>
                {/* Banner Cloth Body */}
                <mesh position={[0, -0.95, 0]} castShadow>
                    <boxGeometry args={[0.68, 1.45, 0.03]} />
                    <meshStandardMaterial
                        color={THEME.colors.bannerFabric}
                        roughness={0.85}
                        flatShading
                    />
                </mesh>
                {/* Flower Emblem on Banner */}
                <group position={[0, -0.92, 0.022]}>
                    {[0, 1, 2, 3, 4, 5].map((p) => {
                        const a = (p / 6) * Math.PI * 2;
                        return (
                            <mesh
                                key={p}
                                position={[Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0]}
                                rotation={[0, 0, a]}
                            >
                                <circleGeometry args={[0.06, 6]} />
                                <meshBasicMaterial color={THEME.colors.bannerEmblem} />
                            </mesh>
                        );
                    })}
                    <mesh position={[0, 0, 0.005]}>
                        <circleGeometry args={[0.045, 8]} />
                        <meshBasicMaterial color="#e8b86d" />
                    </mesh>
                </group>
            </group>

            {/* Hanging Banner 2 (Right Smaller Banner) */}
            <group ref={banner2Ref} position={[-1.25, 5.2, 0.65]}>
                <mesh position={[0, -0.82, 0]} castShadow>
                    <boxGeometry args={[0.56, 1.22, 0.03]} />
                    <meshStandardMaterial
                        color="#cfa87e"
                        roughness={0.85}
                        flatShading
                    />
                </mesh>
                <group position={[0, -0.8, 0.022]} scale={0.82}>
                    {[0, 1, 2, 3, 4, 5].map((p) => {
                        const a = (p / 6) * Math.PI * 2;
                        return (
                            <mesh
                                key={p}
                                position={[Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0]}
                            >
                                <circleGeometry args={[0.06, 6]} />
                                <meshBasicMaterial color={THEME.colors.bannerEmblem} />
                            </mesh>
                        );
                    })}
                </group>
            </group>

            {/* Faceted Blossom Canopy Clusters */}
            <group ref={canopyGroupRef}>
                {blossomClusters.map((c, idx) => (
                    <mesh
                        key={`blossom-${idx}`}
                        geometry={c.geo}
                        position={c.pos}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color={c.color}
                            roughness={0.78}
                            flatShading
                        />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

/**
 * 5. Distant Floating Island with Waterfall, Trees & Sunset Orb
 *    Matches LoadingScreen.png center-left vista
 */
const FloatingWaterfallIsland: React.FC = () => {
    const islandRef = useRef<THREE.Group>(null);
    const waterfallRef = useRef<THREE.Mesh>(null);

    const rockGeo = useMemo(
        () =>
            createSculptedFacetedGeometry(
                6.2,
                1,
                [1.45, 0.95, 1.1],
                0.2,
                77
            ),
        []
    );

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (islandRef.current) {
            islandRef.current.position.y = 7.5 + Math.sin(t * 0.7) * 0.28;
        }
        if (waterfallRef.current) {
            const mat = waterfallRef.current.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.62 + Math.sin(t * 3.5) * 0.08;
        }
    });

    return (
        <group position={[-15.5, 0, -48]}>
            {/* Glowing Sunset Sun Disc behind the Floating Island */}
            <mesh position={[-6.8, 8.8, -14]}>
                <circleGeometry args={[4.6, 24]} />
                <meshBasicMaterial color="#ffebc2" fog={false} />
            </mesh>
            <mesh position={[-6.8, 8.8, -14.2]}>
                <circleGeometry args={[7.4, 24]} />
                <meshBasicMaterial
                    color="#f7c59f"
                    transparent
                    opacity={0.38}
                    fog={false}
                />
            </mesh>

            {/* Floating Island Group */}
            <group ref={islandRef} position={[0, 7.5, 0]}>
                {/* Inverted Tapered Low-Poly Cliff Base */}
                <mesh geometry={rockGeo} position={[0, -1.8, 0]}>
                    <meshStandardMaterial
                        color="#8e7884"
                        roughness={0.9}
                        flatShading
                    />
                </mesh>
                <mesh position={[0, -5.2, 0]} rotation={[Math.PI, 0.4, 0]}>
                    <coneGeometry args={[5.2, 6.5, 7]} />
                    <meshStandardMaterial
                        color="#7d6a76"
                        roughness={0.9}
                        flatShading
                    />
                </mesh>

                {/* Flat Grassy Island Top */}
                <mesh position={[0, 0.6, 0]}>
                    <cylinderGeometry args={[7.8, 7.2, 1.1, 9]} />
                    <meshStandardMaterial
                        color={THEME.colors.meadowBase}
                        roughness={0.9}
                        flatShading
                    />
                </mesh>

                {/* Small Trees atop the Floating Island */}
                {[
                    [-2.8, 1.5, 0.5, 1.2],
                    [-0.6, 1.8, -0.8, 1.55],
                    [3.1, 1.4, 0.4, 1.1],
                ].map(([tx, ty, tz, s], idx) => (
                    <group key={idx} position={[tx, ty, tz]} scale={s}>
                        <mesh position={[0, 0.6, 0]}>
                            <cylinderGeometry args={[0.14, 0.24, 1.2, 5]} />
                            <meshStandardMaterial color={THEME.colors.barkBase} flatShading />
                        </mesh>
                        <mesh position={[0, 1.6, 0]}>
                            <icosahedronGeometry args={[0.95, 1]} />
                            <meshStandardMaterial color={THEME.colors.meadowBase} flatShading />
                        </mesh>
                    </group>
                ))}

                {/* Cascading Waterfall Stream */}
                <mesh ref={waterfallRef} position={[1.2, -7.2, 3.8]}>
                    <planeGeometry args={[1.35, 15.5]} />
                    <meshBasicMaterial
                        color="#faead7"
                        transparent
                        opacity={0.65}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            </group>
        </group>
    );
};

/**
 * 6. Foreground & Midground Faceted Boulders, Wildflowers & Grass Tufts
 */
const ForegroundRocksAndFlora: React.FC = () => {
    // Sculpted foreground and midground boulders matching LoadingScreen.png
    const boulders = useMemo(() => {
        const configs: Array<{
            pos: [number, number, number];
            scale: [number, number, number];
            radius: number;
            color: string;
            seed: number;
        }> = [
                // Bottom-left foreground rocks
                { pos: [-4.4, 0.25, 8.2], scale: [1.55, 0.95, 1.35], radius: 1.15, color: THEME.colors.stoneSunlit, seed: 1 },
                { pos: [-2.7, -0.25, 9.6], scale: [1.45, 0.82, 1.25], radius: 1.0, color: THEME.colors.stoneBase, seed: 2 },
                { pos: [-5.8, 0.9, 6.2], scale: [1.7, 1.15, 1.4], radius: 1.25, color: THEME.colors.stoneBase, seed: 3 },
                // Bottom-right foreground rocks
                { pos: [2.8, -0.15, 7.6], scale: [1.3, 0.78, 1.1], radius: 0.82, color: THEME.colors.stoneBase, seed: 4 },
                { pos: [4.9, 0.35, 8.8], scale: [1.6, 0.95, 1.35], radius: 1.15, color: THEME.colors.stoneShadow, seed: 5 },
                { pos: [5.6, 0.65, 4.8], scale: [1.4, 0.9, 1.2], radius: 1.0, color: THEME.colors.stoneBase, seed: 6 },
                // Midground scattered stones
                { pos: [-4.2, 0.2, 1.2], scale: [1.2, 0.75, 1.0], radius: 0.75, color: THEME.colors.stoneBase, seed: 7 },
                { pos: [1.9, -0.35, -2.5], scale: [1.1, 0.65, 0.95], radius: 0.65, color: THEME.colors.stoneBase, seed: 8 },
            ];

        return configs.map((c) => {
            const groundY = getGardenTerrainHeight(c.pos[0], c.pos[2]);
            return {
                ...c,
                worldPos: [c.pos[0], groundY + c.pos[1], c.pos[2]] as [number, number, number],
                geo: createSculptedFacetedGeometry(
                    c.radius,
                    1,
                    c.scale,
                    0.22,
                    c.seed,
                    true
                ),
            };
        });
    }, []);

    // 5-Petal Stylized Cosmos Flowers (Foreground Left, Right & Path Edges)
    const flowers = useMemo(() => {
        const coords: Array<[number, number, number]> = [
            // Left foreground cluster near boulders
            [-4.9, 8.9, 1.15],
            [-4.2, 9.2, 0.95],
            [-3.5, 7.8, 1.05],
            [-2.1, 9.1, 0.9],
            [-4.6, 6.2, 0.95],
            [-3.2, 5.1, 0.85],
            // Right foreground cluster near tree base & rocks
            [4.5, 8.1, 1.1],
            [5.1, 7.6, 1.2],
            [4.8, 8.5, 0.95],
            [3.6, 7.4, 0.9],
            [3.9, 6.8, 0.85],
            [1.8, 6.9, 0.8],
            // Midground pathside wildflowers
            [-1.5, 3.8, 0.75],
            [1.4, 2.2, 0.75],
            [-2.8, 1.5, 0.7],
            [2.6, 0.4, 0.75],
        ];

        return coords.map(([fx, fz, scale], idx) => {
            const fy = getGardenTerrainHeight(fx, fz);
            return {
                pos: [fx, fy, fz] as [number, number, number],
                scale,
                rotY: seededRandom(idx * 31) * Math.PI * 2,
                isPink: idx % 3 === 1,
            };
        });
    }, []);

    // Low-Poly Grass Blade Clusters
    const grassClusters = useMemo(() => {
        const list: Array<{
            pos: [number, number, number];
            rotY: number;
            scale: number;
        }> = [];

        for (let i = 0; i < 95; i++) {
            const gx = (seededRandom(i * 17) - 0.5) * 26;
            const gz = 11.5 - seededRandom(i * 29) * 32;
            // Keep center of stepping stones clear
            const pathCenterX = Math.sin(gz * 0.28) * 1.15 + 0.4;
            if (Math.abs(gx - pathCenterX) < 1.15 && gz > -6) continue;

            const gy = getGardenTerrainHeight(gx, gz);
            list.push({
                pos: [gx, gy, gz],
                rotY: seededRandom(i * 43) * Math.PI,
                scale: 0.65 + seededRandom(i * 53) * 0.65,
            });
        }
        return list;
    }, []);

    return (
        <group>
            {/* Faceted Boulders */}
            {boulders.map((b, idx) => (
                <mesh
                    key={`rock-${idx}`}
                    geometry={b.geo}
                    position={b.worldPos}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial
                        color={b.color}
                        roughness={0.88}
                        flatShading
                    />
                </mesh>
            ))}

            {/* Stylized 5-Petal Cosmos Wildflowers */}
            {flowers.map((f, idx) => (
                <group
                    key={`flower-${idx}`}
                    position={f.pos}
                    rotation={[0.15, f.rotY, 0]}
                    scale={f.scale}
                >
                    {/* Stem */}
                    <mesh position={[0, 0.22, 0]}>
                        <cylinderGeometry args={[0.018, 0.024, 0.45, 5]} />
                        <meshStandardMaterial color={THEME.colors.grassTuft} flatShading />
                    </mesh>
                    {/* Flower Head */}
                    <group position={[0, 0.45, 0.02]} rotation={[0.55, 0, 0]}>
                        <mesh>
                            <dodecahedronGeometry args={[0.055, 0]} />
                            <meshStandardMaterial color={THEME.colors.flowerCenter} flatShading />
                        </mesh>
                        {[0, 1, 2, 3, 4].map((p) => {
                            const angle = (p / 5) * Math.PI * 2;
                            return (
                                <mesh
                                    key={p}
                                    position={[
                                        Math.cos(angle) * 0.11,
                                        0.01,
                                        Math.sin(angle) * 0.11,
                                    ]}
                                    rotation={[0, -angle, 0]}
                                    scale={[1.35, 0.25, 0.85]}
                                >
                                    <octahedronGeometry args={[0.075, 0]} />
                                    <meshStandardMaterial
                                        color={
                                            f.isPink
                                                ? THEME.colors.flowerPetalPink
                                                : THEME.colors.flowerPetal
                                        }
                                        roughness={0.65}
                                        flatShading
                                    />
                                </mesh>
                            );
                        })}
                    </group>
                </group>
            ))}

            {/* Low-Poly Grass Tufts */}
            {grassClusters.map((g, idx) => (
                <group
                    key={`grass-${idx}`}
                    position={g.pos}
                    rotation={[0, g.rotY, 0]}
                    scale={g.scale}
                >
                    <mesh position={[0, 0.18, 0]} rotation={[0.12, 0, -0.18]}>
                        <coneGeometry args={[0.06, 0.42, 4]} />
                        <meshStandardMaterial
                            color={
                                idx % 2 === 0
                                    ? THEME.colors.grassTuft
                                    : THEME.colors.grassTuftLight
                            }
                            roughness={0.85}
                            flatShading
                        />
                    </mesh>
                    <mesh position={[0.06, 0.15, 0.03]} rotation={[-0.1, 0.4, 0.24]}>
                        <coneGeometry args={[0.05, 0.34, 4]} />
                        <meshStandardMaterial
                            color={THEME.colors.grassTuftLight}
                            roughness={0.85}
                            flatShading
                        />
                    </mesh>
                    <mesh position={[-0.06, 0.14, -0.02]} rotation={[0.08, -0.3, -0.28]}>
                        <coneGeometry args={[0.05, 0.3, 4]} />
                        <meshStandardMaterial
                            color={THEME.colors.grassTuft}
                            roughness={0.85}
                            flatShading
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

/**
 * 7. Top-Left Overhanging Olive Foliage Vignette, Distant Mountains,
 *    Secondary Ruins, Background Trees & Faceted Sunset Clouds
 */
const DistantVistaAndCanopy: React.FC = () => {
    const cloudsRef = useRef<THREE.Group>(null);
    const petalsRef = useRef<THREE.Group>(null);

    const mountainPeaks = useMemo(
        () => [
            { pos: [-38, -2, -62], radius: 22, height: 24, sides: 7, color: THEME.colors.mountainFar },
            { pos: [-16, -2, -68], radius: 19, height: 18, sides: 6, color: THEME.colors.mountainFar },
            { pos: [12, -2, -65], radius: 24, height: 22, sides: 7, color: THEME.colors.mountainFar },
            { pos: [34, -2, -55], radius: 22, height: 26, sides: 6, color: THEME.colors.mountainMid },
            { pos: [18, -1.5, -36], radius: 16, height: 12, sides: 7, color: '#6b7552' },
            { pos: [-26, -1.5, -38], radius: 18, height: 14, sides: 7, color: '#6d7557' },
        ],
        []
    );

    // Drifting 3D sakura petals across the scene
    const petalData = useMemo(
        () =>
            Array.from({ length: 28 }).map((_, i) => ({
                x: (seededRandom(i * 11) - 0.5) * 18,
                y: 1.2 + seededRandom(i * 23) * 7,
                z: -4 + seededRandom(i * 37) * 16,
                speed: 0.45 + seededRandom(i * 41) * 0.45,
                phase: seededRandom(i * 59) * Math.PI * 2,
            })),
        []
    );

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (cloudsRef.current) {
            cloudsRef.current.position.x = Math.sin(t * 0.08) * 1.2;
        }
        if (petalsRef.current) {
            petalsRef.current.children.forEach((child, idx) => {
                const p = petalData[idx];
                const cycle = (t * p.speed + p.phase) % 8;
                child.position.x = p.x - cycle * 1.1 + Math.sin(t + p.phase) * 0.35;
                child.position.y = p.y - cycle * 0.65;
                if (child.position.y < 0.2) child.position.y += 6.5;
                child.rotation.x = t * 1.4 + p.phase;
                child.rotation.y = t * 1.1 + p.phase;
            });
        }
    });

    return (
        <group>
            {/* Distant Low-Poly Mountain Range */}
            {mountainPeaks.map((m, idx) => (
                <mesh
                    key={`mt-${idx}`}
                    position={m.pos as [number, number, number]}
                    rotation={[0, idx * 0.8, 0]}
                >
                    <coneGeometry args={[m.radius, m.height, m.sides]} />
                    <meshStandardMaterial
                        color={m.color}
                        roughness={0.95}
                        flatShading
                    />
                </mesh>
            ))}

            {/* Distant Small Stone Ruin on Right Hillside (Matches LoadingScreen.png) */}
            <group position={[11.5, 4.2, -31]} rotation={[0, -0.35, 0]} scale={0.52}>
                <StoneArchwayRuin position={[0, 0, 0]} rotationY={0} />
            </group>

            {/* Midground Deciduous & Pine Trees (Inspired by Assets.jpg) */}
            {[
                { pos: [-14, 1.5, -18], scale: 1.35, type: 'round' },
                { pos: [-5.5, 0.2, -16], scale: 0.95, type: 'pine' },
                { pos: [-3.2, 0.1, -15], scale: 1.1, type: 'pine' },
                { pos: [6.8, 1.4, -14], scale: 1.25, type: 'round' },
                { pos: [14.5, 3.2, -19], scale: 1.4, type: 'round' },
            ].map((tree, idx) => (
                <group
                    key={`bg-tree-${idx}`}
                    position={tree.pos as [number, number, number]}
                    scale={tree.scale}
                >
                    <mesh position={[0, 1.0, 0]} castShadow>
                        <cylinderGeometry args={[0.18, 0.32, 2.0, 6]} />
                        <meshStandardMaterial color={THEME.colors.barkBase} flatShading />
                    </mesh>
                    {tree.type === 'round' ? (
                        <group position={[0, 2.4, 0]}>
                            <mesh castShadow>
                                <icosahedronGeometry args={[1.35, 1]} />
                                <meshStandardMaterial color={THEME.colors.meadowBase} flatShading />
                            </mesh>
                            <mesh position={[0.75, -0.25, 0.4]} castShadow>
                                <icosahedronGeometry args={[0.95, 1]} />
                                <meshStandardMaterial color={THEME.colors.meadowSunlit} flatShading />
                            </mesh>
                        </group>
                    ) : (
                        <group position={[0, 1.8, 0]}>
                            <mesh position={[0, 0, 0]} castShadow>
                                <coneGeometry args={[1.2, 1.8, 7]} />
                                <meshStandardMaterial color={THEME.colors.canopyDark} flatShading />
                            </mesh>
                            <mesh position={[0, 0.95, 0]} castShadow>
                                <coneGeometry args={[0.95, 1.5, 7]} />
                                <meshStandardMaterial color={THEME.colors.meadowBase} flatShading />
                            </mesh>
                            <mesh position={[0, 1.75, 0]} castShadow>
                                <coneGeometry args={[0.65, 1.2, 7]} />
                                <meshStandardMaterial color={THEME.colors.canopyLight} flatShading />
                            </mesh>
                        </group>
                    )}
                </group>
            ))}

            {/* Top-Left Overhanging Olive Foliage Framing the Camera View */}
            <group position={[-4.2, 5.1, 8.2]}>
                {[
                    { pos: [0, 0, 0], s: [1.5, 0.75, 1.1], c: THEME.colors.canopyDark },
                    { pos: [1.2, 0.35, -0.4], s: [1.35, 0.65, 0.95], c: THEME.colors.canopyOlive },
                    { pos: [2.2, 0.55, -0.6], s: [1.1, 0.55, 0.85], c: THEME.colors.canopyLight },
                    { pos: [-0.8, -0.55, 0.3], s: [1.2, 0.65, 0.9], c: THEME.colors.canopyOlive },
                ].map((leaf, i) => (
                    <mesh
                        key={`canopy-${i}`}
                        position={leaf.pos as [number, number, number]}
                        scale={leaf.s as [number, number, number]}
                    >
                        <icosahedronGeometry args={[1.05, 1]} />
                        <meshStandardMaterial color={leaf.c} roughness={0.85} flatShading />
                    </mesh>
                ))}
            </group>

            {/* Low-Poly Sunset Clouds */}
            <group ref={cloudsRef}>
                {[
                    { pos: [-22, 16, -42], scale: [4.8, 1.1, 1.8] },
                    { pos: [-11, 13.5, -45], scale: [3.2, 0.75, 1.4] },
                    { pos: [18, 13, -44], scale: [4.5, 1.15, 1.7] },
                ].map((cl, idx) => (
                    <mesh
                        key={`cloud-${idx}`}
                        position={cl.pos as [number, number, number]}
                        scale={cl.scale as [number, number, number]}
                    >
                        <icosahedronGeometry args={[1.4, 1]} />
                        <meshStandardMaterial
                            color="#f3c5ab"
                            emissive="#d99b88"
                            emissiveIntensity={0.25}
                            roughness={0.95}
                            flatShading
                        />
                    </mesh>
                ))}
            </group>

            {/* 3D Floating Sakura Petals */}
            <group ref={petalsRef}>
                {petalData.map((_, i) => (
                    <mesh key={`petal3d-${i}`} scale={[0.11, 0.03, 0.07]}>
                        <octahedronGeometry args={[1, 0]} />
                        <meshBasicMaterial color="#f5b8b0" />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

export const GardenEnvironment: React.FC = () => {
    return (
        <group>
            <MeadowTerrain />
            <StonePathway />
            {/* Left Stone Archway Ruin */}
            <StoneArchwayRuin position={[-6.8, 0.55, -3.5]} rotationY={0.34} scale={1.08} />
            {/* Right Giant Sakura Tree with Hanging Banners */}
            <GiantSakuraTree position={[6.2, 0.45, 2.2]} />
            {/* Distant Floating Waterfall Island & Sunset Sun */}
            <FloatingWaterfallIsland />
            {/* Foreground Boulders, 5-Petal Flowers & Grass */}
            <ForegroundRocksAndFlora />
            {/* Distant Mountains, Secondary Ruins, Clouds & Petals */}
            <DistantVistaAndCanopy />
            {/* Interactive Stone Memory Pedestals */}
            <MemoryPedestals />
        </group>
    );
};