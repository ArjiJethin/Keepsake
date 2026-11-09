// src/scenes/Environment/GardenEnvironment.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import {
    createSculptedFacetedGeometry,
    getGardenTerrainHeight,
    seededRandom,
} from './lowPolyUtils';
import { ChunkedTerrain } from './ChunkedTerrain';
import { MemoryPedestals } from '../../components/Memory/MemoryPedestals';
import { collisionManager } from '../../systems/Collision/collisionSystem';
import { playerTelemetry } from '../../store/useGameStore';

/**
 * Left Stone Archway Ruin with Carved Masonry & Hanging Ivy
 */
const StoneArchwayRuin: React.FC<{
    position: [number, number, number];
    rotationY?: number;
    scale?: number;
}> = ({ position, rotationY = 0.34, scale = 1.08 }) => {
    const ivyClusters = useMemo(() => {
        return [
            { pos: [-1.7, 4.9, 0.35] as [number, number, number], s: [0.9, 1.3, 0.6] as [number, number, number], seed: 11 },
            { pos: [-1.85, 3.6, 0.42] as [number, number, number], s: [0.65, 1.5, 0.5] as [number, number, number], seed: 22 },
            { pos: [-0.6, 5.7, 0.35] as [number, number, number], s: [1.3, 0.85, 0.65] as [number, number, number], seed: 33 },
            { pos: [0.65, 5.5, 0.35] as [number, number, number], s: [1.1, 0.9, 0.6] as [number, number, number], seed: 44 },
            { pos: [1.65, 4.4, 0.38] as [number, number, number], s: [0.75, 1.4, 0.55] as [number, number, number], seed: 55 },
        ].map((item) => ({
            ...item,
            geo: createSculptedFacetedGeometry(0.65, 1, item.s, 0.22, item.seed),
        }));
    }, []);

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
            blocks.push({
                pos: [Math.cos(angle) * radius, 3.85 + Math.sin(angle) * radius, 0],
                rotZ: angle - Math.PI / 2,
                size: [0.72, 0.88, 1.08],
            });
        }
        return blocks;
    }, []);

    return (
        <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
            <mesh position={[-1.75, 0.3, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.65, 0.6, 1.65]} />
                <meshStandardMaterial color={THEME.colors.stoneShadow} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[1.75, 0.3, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.65, 0.6, 1.65]} />
                <meshStandardMaterial color={THEME.colors.stoneShadow} roughness={0.9} flatShading />
            </mesh>

            {[0.95, 1.85, 2.75, 3.6].map((py, idx) => (
                <React.Fragment key={idx}>
                    <mesh position={[-1.75, py, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.16, 0.86, 1.15]} />
                        <meshStandardMaterial
                            color={idx % 2 === 0 ? THEME.colors.stoneBase : THEME.colors.stoneSunlit}
                            roughness={0.88}
                            flatShading
                        />
                    </mesh>
                    <mesh position={[1.75, py, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1.16, 0.86, 1.15]} />
                        <meshStandardMaterial
                            color={idx % 2 === 1 ? THEME.colors.stoneBase : THEME.colors.stoneSunlit}
                            roughness={0.88}
                            flatShading
                        />
                    </mesh>
                </React.Fragment>
            ))}

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

            {ivyClusters.map((ivy, idx) => (
                <mesh key={`ivy-${idx}`} geometry={ivy.geo} position={ivy.pos} castShadow>
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
 * Giant Low-Poly Sakura Tree (Hero Landmark on Right Knoll)
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

            <mesh position={[0, 2.1, 0]} rotation={[0.04, 0.2, 0.12]} castShadow receiveShadow>
                <cylinderGeometry args={[1.05, 1.65, 4.4, 7]} />
                <meshStandardMaterial color={THEME.colors.barkBase} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[-0.38, 4.6, 0.15]} rotation={[0.06, -0.3, 0.22]} castShadow receiveShadow>
                <cylinderGeometry args={[0.78, 1.12, 3.2, 7]} />
                <meshStandardMaterial color={THEME.colors.barkHighlight} roughness={0.88} flatShading />
            </mesh>

            <mesh position={[-1.95, 5.95, 0.75]} rotation={[0.18, 0.15, 0.88]} castShadow receiveShadow>
                <cylinderGeometry args={[0.32, 0.68, 4.2, 6]} />
                <meshStandardMaterial color={THEME.colors.barkBase} roughness={0.9} flatShading />
            </mesh>
            <mesh position={[-3.7, 7.1, 1.3]} rotation={[0.15, 0.1, 1.12]} castShadow receiveShadow>
                <cylinderGeometry args={[0.18, 0.34, 2.8, 6]} />
                <meshStandardMaterial color={THEME.colors.barkShadow} roughness={0.9} flatShading />
            </mesh>

            <group ref={banner1Ref} position={[-2.25, 5.65, 0.92]}>
                <mesh position={[0, -0.95, 0]} castShadow>
                    <boxGeometry args={[0.68, 1.45, 0.03]} />
                    <meshStandardMaterial color={THEME.colors.bannerFabric} roughness={0.85} flatShading />
                </mesh>
            </group>

            <group ref={banner2Ref} position={[-1.25, 5.2, 0.65]}>
                <mesh position={[0, -0.82, 0]} castShadow>
                    <boxGeometry args={[0.56, 1.22, 0.03]} />
                    <meshStandardMaterial color="#cfa87e" roughness={0.85} flatShading />
                </mesh>
            </group>

            <group ref={canopyGroupRef}>
                {blossomClusters.map((c, idx) => (
                    <mesh
                        key={`blossom-${idx}`}
                        geometry={c.geo}
                        position={c.pos}
                        castShadow
                        receiveShadow
                    >
                        <meshStandardMaterial color={c.color} roughness={0.78} flatShading />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

/**
 * Sky-Anchored Horizon Vista (Floating Waterfall Island, Sunset Sun, Distant Peaks & Drifting Petals)
 */
const HorizonVista: React.FC = () => {
    const vistaRef = useRef<THREE.Group>(null);
    const islandRef = useRef<THREE.Group>(null);
    const petalsRef = useRef<THREE.Group>(null);

    const rockGeo = useMemo(
        () => createSculptedFacetedGeometry(6.2, 1, [1.45, 0.95, 1.1], 0.2, 77),
        []
    );

    const petalData = useMemo(
        () =>
            Array.from({ length: 32 }).map((_, i) => ({
                x: (seededRandom(i * 11) - 0.5) * 22,
                y: 1.5 + seededRandom(i * 23) * 7,
                z: (seededRandom(i * 37) - 0.5) * 22,
                speed: 0.45 + seededRandom(i * 41) * 0.45,
                phase: seededRandom(i * 59) * Math.PI * 2,
            })),
        []
    );

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        const px = playerTelemetry.position[0];
        const pz = playerTelemetry.position[2];

        // Keep distant horizon mountains & floating island anchored at infinity
        if (vistaRef.current) {
            vistaRef.current.position.set(px * 0.88, 0, pz * 0.88);
        }
        if (islandRef.current) {
            islandRef.current.position.y = 8.2 + Math.sin(t * 0.7) * 0.28;
        }
        if (petalsRef.current) {
            petalsRef.current.position.set(px, 0, pz);
            petalsRef.current.children.forEach((child, idx) => {
                const p = petalData[idx];
                const cycle = (t * p.speed + p.phase) % 8;
                child.position.x = p.x - cycle * 0.9 + Math.sin(t + p.phase) * 0.35;
                child.position.y = p.y - cycle * 0.65;
                if (child.position.y < 0.3) child.position.y += 6.5;
                child.position.z = p.z;
                child.rotation.x = t * 1.4 + p.phase;
                child.rotation.y = t * 1.1 + p.phase;
            });
        }
    });

    return (
        <>
            <group ref={vistaRef}>
                {/* Distant Floating Waterfall Island & Sunset Sun */}
                <group position={[-15.5, 0, -52]}>
                    <mesh position={[-6.8, 9.2, -16]}>
                        <circleGeometry args={[4.8, 24]} />
                        <meshBasicMaterial color="#ffebc2" fog={false} />
                    </mesh>
                    <mesh position={[-6.8, 9.2, -16.2]}>
                        <circleGeometry args={[7.8, 24]} />
                        <meshBasicMaterial
                            color="#f7c59f"
                            transparent
                            opacity={0.38}
                            fog={false}
                        />
                    </mesh>

                    <group ref={islandRef} position={[0, 8.2, 0]}>
                        <mesh geometry={rockGeo} position={[0, -1.8, 0]}>
                            <meshStandardMaterial color="#8e7884" roughness={0.9} flatShading />
                        </mesh>
                        <mesh position={[0, -5.2, 0]} rotation={[Math.PI, 0.4, 0]}>
                            <coneGeometry args={[5.2, 6.5, 7]} />
                            <meshStandardMaterial color="#7d6a76" roughness={0.9} flatShading />
                        </mesh>
                        <mesh position={[0, 0.6, 0]}>
                            <cylinderGeometry args={[7.8, 7.2, 1.1, 9]} />
                            <meshStandardMaterial
                                color={THEME.colors.meadowBase}
                                roughness={0.9}
                                flatShading
                            />
                        </mesh>
                        <mesh position={[1.2, -7.2, 3.8]}>
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

                {/* Distant Low-Poly Horizon Mountains */}
                {[
                    { pos: [-45, -2, -75], radius: 26, height: 28, sides: 7, color: THEME.colors.mountainFar },
                    { pos: [-18, -2, -82], radius: 22, height: 22, sides: 6, color: THEME.colors.mountainFar },
                    { pos: [16, -2, -78], radius: 28, height: 26, sides: 7, color: THEME.colors.mountainFar },
                    { pos: [42, -2, -68], radius: 26, height: 30, sides: 6, color: THEME.colors.mountainMid },
                ].map((m, idx) => (
                    <mesh
                        key={`mt-${idx}`}
                        position={m.pos as [number, number, number]}
                        rotation={[0, idx * 0.8, 0]}
                    >
                        <coneGeometry args={[m.radius, m.height, m.sides]} />
                        <meshStandardMaterial color={m.color} roughness={0.95} flatShading />
                    </mesh>
                ))}
            </group>

            {/* 3D Floating Sakura Petals around Player */}
            <group ref={petalsRef}>
                {petalData.map((_, i) => (
                    <mesh key={`petal3d-${i}`} scale={[0.1, 0.03, 0.06]}>
                        <octahedronGeometry args={[1, 0]} />
                        <meshBasicMaterial color="#f5b8b0" />
                    </mesh>
                ))}
            </group>
        </>
    );
};

export const GardenEnvironment: React.FC = () => {
    const archY = useMemo(() => getGardenTerrainHeight(-6.8, -3.5), []);
    const sakuraY = useMemo(() => getGardenTerrainHeight(6.2, 2.2), []);

    // Register static hero landmark colliders (Sakura Trunk, Archway Pillars, Memory Pedestals)
    useEffect(() => {
        collisionManager.setStaticColliders([
            // Giant Sakura Tree Trunk
            {
                id: 'hero_sakura_trunk',
                x: 6.2,
                y: sakuraY,
                z: 2.2,
                radius: 1.55,
                height: 8.5,
                blocksCamera: true,
            },
            // Stone Archway Left & Right Pillars
            {
                id: 'arch_pillar_left',
                x: -6.8 - 1.75 * Math.cos(0.34),
                y: archY,
                z: -3.5 + 1.75 * Math.sin(0.34),
                radius: 0.85,
                height: 5.5,
                blocksCamera: true,
            },
            {
                id: 'arch_pillar_right',
                x: -6.8 + 1.75 * Math.cos(0.34),
                y: archY,
                z: -3.5 - 1.75 * Math.sin(0.34),
                radius: 0.85,
                height: 5.5,
                blocksCamera: true,
            },
            // Memory Pedestal Colliders
            { id: 'ped_1', x: 2.35, y: getGardenTerrainHeight(2.35, 4.8), z: 4.8, radius: 1.15, height: 2.2, blocksCamera: false },
            { id: 'ped_2', x: -3.6, y: getGardenTerrainHeight(-3.6, 2.2), z: 2.2, radius: 1.05, height: 2.2, blocksCamera: false },
            { id: 'ped_3', x: 1.9, y: getGardenTerrainHeight(1.9, -4.8), z: -4.8, radius: 0.95, height: 2.2, blocksCamera: false },
            { id: 'ped_4', x: -2.4, y: getGardenTerrainHeight(-2.4, -6.5), z: -6.5, radius: 0.95, height: 2.2, blocksCamera: false },
        ]);
    }, [archY, sakuraY]);

    return (
        <group>
            {/* Infinite Dynamic Chunk-Based Terrain & Natural Biome */}
            <ChunkedTerrain />

            {/* Sanctuary Hero Landmarks */}
            <StoneArchwayRuin
                position={[-6.8, archY - 0.1, -3.5]}
                rotationY={0.34}
                scale={1.08}
            />
            <GiantSakuraTree position={[6.2, sakuraY - 0.15, 2.2]} />

            {/* Horizon Vista & Drifting Petals */}
            <HorizonVista />

            {/* Interactive Stone Memory Pedestals */}
            <MemoryPedestals />
        </group>
    );
};