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
import { MemoryRadiance } from './MemoryRadiance';
import { collisionManager } from '../../systems/Collision/collisionSystem';
import { playerTelemetry } from '../../store/useGameStore';
import {
    AncientOldTreeGLB,
    CozyStorybookCottage,
    ExplorerCampsite,
    GardenPondGLB,
    GlowingButterflies,
    MemoryFlowerGLB,
    MonumentalBlossomTreeGLB,
    MonumentalEvergreenTreeGLB,
    RedToriiGate,
    SlenderTallTreeGLB,
    StandingStonePillar,
    StoneArchwayGLB,
    WoodenArchedBridge,
    WoodenCargoCart,
    WoodenFenceSection,
    WoodenLanternPost,
    WoodenMemoryNoticeboard,
    WoodenSignpost,
} from '../../components/Environment/WorldAssetLibrary';

const WorldSpaceBlossomPetals: React.FC = () => {
    const instancedRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const petalGeo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);

    const particles = useMemo(
        () =>
            Array.from({ length: 20 }).map((_, i) => ({
                wx: (seededRandom(i * 13 + 1) - 0.5) * 44,
                wy: 1.5 + seededRandom(i * 29 + 2) * 8.5,
                wz: (seededRandom(i * 47 + 3) - 0.5) * 44,
                vx: -0.55 - seededRandom(i * 61) * 0.35,
                vy: -0.62 - seededRandom(i * 73) * 0.28,
                vz: 0.15 + (seededRandom(i * 89) - 0.5) * 0.35,
                phase: seededRandom(i * 97) * Math.PI * 2,
                rotSpeedX: 0.9 + seededRandom(i * 103) * 1.1,
                rotSpeedY: 0.7 + seededRandom(i * 109) * 1.0,
            })),
        []
    );

    useFrame(({ clock }, rawDelta) => {
        if (!instancedRef.current) return;
        const delta = Math.min(rawDelta, 0.05);
        const t = clock.getElapsedTime();
        const [px, , pz] = playerTelemetry.position;
        const maxRadius = 28;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            p.wx += (p.vx + Math.sin(t * 1.4 + p.phase) * 0.28) * delta;
            p.wy += (p.vy + Math.cos(t * 2.1 + p.phase) * 0.12) * delta;
            p.wz += (p.vz + Math.cos(t * 1.2 + p.phase) * 0.24) * delta;

            const groundY = getGardenTerrainHeight(p.wx, p.wz);

            if (p.wy < groundY + 0.15) {
                p.wy = groundY + 7.5 + seededRandom(i + t) * 3.5;
                p.wx = px + (seededRandom(i * 19 + t) - 0.5) * 38;
                p.wz = pz + (seededRandom(i * 31 + t) - 0.5) * 38;
            }

            const dx = p.wx - px;
            const dz = p.wz - pz;
            if (dx > maxRadius) p.wx -= maxRadius * 2;
            else if (dx < -maxRadius) p.wx += maxRadius * 2;

            if (dz > maxRadius) p.wz -= maxRadius * 2;
            else if (dz < -maxRadius) p.wz += maxRadius * 2;

            dummy.position.set(p.wx, p.wy, p.wz);
            dummy.rotation.set(
                t * p.rotSpeedX + p.phase,
                t * p.rotSpeedY + p.phase,
                Math.sin(t + p.phase) * 0.5
            );
            dummy.scale.set(0.085, 0.022, 0.052);
            dummy.updateMatrix();
            instancedRef.current.setMatrixAt(i, dummy.matrix);
        }

        instancedRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={instancedRef}
            args={[petalGeo, undefined, particles.length]}
            frustumCulled={false}
        >
            <meshBasicMaterial color="#f5b8b0" transparent opacity={0.86} />
        </instancedMesh>
    );
};

/**
 * Distant Skybox Horizon Vista:
 * - Removes the artificial player-following `distantHillRef` ring (at 76m) that
 *   caused a wave-like terrain wall to move through the world with the player.
 * - Keeps only true skybox elements (sunset sun disk, high floating sanctuary isle,
 *   and outer mountain silhouettes at 175m..205m) locked to skybox parallax (1.0)
 *   so they sit beyond the 5x5 chunk grid and never slide across playable terrain.
 */
const HorizonVista: React.FC = () => {
    const vistaRef = useRef<THREE.Group>(null);
    const islandRef = useRef<THREE.Group>(null);

    const rockGeo = useMemo(
        () => createSculptedFacetedGeometry(6.2, 1, [1.45, 0.95, 1.1], 0.2, 77),
        []
    );

    const mountainPeaks = useMemo(() => {
        return Array.from({ length: 14 }).map((_, idx) => {
            const angle = (idx / 14) * Math.PI * 2 + 0.22;
            const dist = 178 + (idx % 3) * 12;
            return {
                pos: [Math.cos(angle) * dist, -6, Math.sin(angle) * dist] as [
                    number,
                    number,
                    number,
                ],
                radius: 28 + (idx % 4) * 6,
                height: 28 + (idx % 5) * 7,
                sides: idx % 2 === 0 ? 7 : 6,
                color:
                    idx % 2 === 0
                        ? THEME.colors.mountainFar
                        : THEME.colors.mountainMid,
                rotY: idx * 0.7,
            };
        });
    }, []);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        const px = playerTelemetry.position[0];
        const pz = playerTelemetry.position[2];

        if (vistaRef.current) {
            // Locked 1:1 with the sky dome so distant mountains behave as true infinity skybox
            vistaRef.current.position.set(px, 0, pz);
        }
        if (islandRef.current) {
            islandRef.current.position.y = 14.5 + Math.sin(t * 0.65) * 0.25;
        }
    });

    return (
        <group ref={vistaRef}>
            {/* Distant Floating Sanctuary Isle & Warm Sunset Sun */}
            <group position={[-24.0, 0, -142]}>
                <mesh position={[-10.5, 22.0, -24]}>
                    <circleGeometry args={[7.5, 24]} />
                    <meshBasicMaterial color="#ffefd1" fog={false} />
                </mesh>
                <mesh position={[-10.5, 22.0, -24.4]}>
                    <circleGeometry args={[12.8, 24]} />
                    <meshBasicMaterial
                        color="#f7c8a3"
                        transparent
                        opacity={0.34}
                        fog={false}
                    />
                </mesh>

                <group ref={islandRef} position={[0, 14.5, 0]}>
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

            {mountainPeaks.map((m, idx) => (
                <mesh
                    key={`mt-${idx}`}
                    position={m.pos}
                    rotation={[0, m.rotY, 0]}
                >
                    <coneGeometry args={[m.radius, m.height, m.sides]} />
                    <meshStandardMaterial color={m.color} roughness={0.95} flatShading />
                </mesh>
            ))}
        </group>
    );
};

export const GardenEnvironment: React.FC = () => {
    const coords = useMemo(() => {
        const h = (x: number, z: number) => getGardenTerrainHeight(x, z);
        return {
            cottageEastY: h(11.5, -5.5),
            cottageWestY: h(-11.8, -4.2),
            cottageSouthY: h(10.4, 12.8),
            toriiNorthY: h(-0.4, -13.5),
            rockArchWestY: h(-15.5, 4.5),
            sakuraY: h(7.8, 2.2),
            evergreenY: h(-9.5, 12.5),
            pondY: h(-6.2, -15.2),
            tentY: h(-7.5, -9.2),
            cartY: h(6.8, -12.0),
            noticeY: h(3.4, 10.5),
            signY: h(-2.8, 10.2),
            lamp1Y: h(2.8, 5.2),
            lamp2Y: h(-3.2, 5.2),
            lamp3Y: h(2.6, -4.5),
            lamp4Y: h(-3.0, -4.5),
            fence1Y: h(14.5, -1.2),
            fence2Y: h(14.5, 1.8),
            pillar1Y: h(-18.2, 9.6),
            pillar2Y: h(16.8, -12.5),
            oldTree1Y: h(-18.5, -11.5),
            oldTree2Y: h(18.0, 6.5),
            tallTree1Y: h(-19.0, 16.0),
            tallTree2Y: h(17.5, -16.5),
            fl1Y: h(4.8, 3.2),
            fl2Y: h(-5.2, 2.4),
            fl3Y: h(5.2, -6.5),
            fl4Y: h(-4.4, -11.8),
        };
    }, []);

    useEffect(() => {
        const h = (x: number, z: number) => getGardenTerrainHeight(x, z);
        collisionManager.setStaticColliders([
            { id: 'cottage_east', x: 11.5, y: coords.cottageEastY, z: -5.5, radius: 3.2, height: 5.4, blocksCamera: true },
            { id: 'cottage_west', x: -11.8, y: coords.cottageWestY, z: -4.2, radius: 3.2, height: 5.4, blocksCamera: true },
            { id: 'cottage_south', x: 10.4, y: coords.cottageSouthY, z: 12.8, radius: 3.2, height: 5.4, blocksCamera: true },

            { id: 'hero_sakura_trunk', x: 7.8, y: coords.sakuraY, z: 2.2, radius: 1.5, height: 8.5, blocksCamera: true },
            { id: 'hero_evergreen_trunk', x: -9.5, y: coords.evergreenY, z: 12.5, radius: 1.45, height: 8.5, blocksCamera: true },

            { id: 'torii_left', x: -0.4 - 1.45, y: coords.toriiNorthY, z: -13.5, radius: 0.42, height: 3.8, blocksCamera: true },
            { id: 'torii_right', x: -0.4 + 1.45, y: coords.toriiNorthY, z: -13.5, radius: 0.42, height: 3.8, blocksCamera: true },

            { id: 'arch_pillar_1', x: -15.5, y: coords.rockArchWestY, z: 4.5 - 1.7, radius: 0.85, height: 5.5, blocksCamera: true },
            { id: 'arch_pillar_2', x: -15.5, y: coords.rockArchWestY, z: 4.5 + 1.7, radius: 0.85, height: 5.5, blocksCamera: true },

            { id: 'village_tent', x: -7.5, y: coords.tentY, z: -9.2, radius: 1.4, height: 2.2, blocksCamera: false },
            { id: 'village_cart', x: 6.8, y: coords.cartY, z: -12.0, radius: 1.2, height: 1.8, blocksCamera: false },

            { id: 'ped_village_1', x: 6.4, y: h(6.4, 5.4), z: 5.4, radius: 1.45, height: 3.0, blocksCamera: false },
            { id: 'ped_village_2', x: -7.2, y: h(-7.2, 4.2), z: 4.2, radius: 0.95, height: 2.2, blocksCamera: false },
            { id: 'ped_village_3', x: 3.2, y: h(3.2, -8.6), z: -8.6, radius: 1.15, height: 2.8, blocksCamera: false },

            { id: 'old_tree_1', x: -18.5, y: coords.oldTree1Y, z: -11.5, radius: 0.9, height: 6.0, blocksCamera: true },
            { id: 'old_tree_2', x: 18.0, y: coords.oldTree2Y, z: 6.5, radius: 0.9, height: 6.0, blocksCamera: true },
            { id: 'tall_tree_1', x: -19.0, y: coords.tallTree1Y, z: 16.0, radius: 0.8, height: 8.0, blocksCamera: true },
            { id: 'tall_tree_2', x: 17.5, y: coords.tallTree2Y, z: -16.5, radius: 0.8, height: 8.0, blocksCamera: true },
        ]);
    }, [coords]);

    return (
        <group>
            <ChunkedTerrain />

            {/* THE KEEPSAKE VILLAGE (Consistent Fixed Spawn Biome using `public/models/`) */}
            <CozyStorybookCottage position={[11.5, coords.cottageEastY, -5.5]} rotationY={-0.75} />
            <CozyStorybookCottage position={[-11.8, coords.cottageWestY, -4.2]} rotationY={0.85} />
            <CozyStorybookCottage position={[10.4, coords.cottageSouthY, 12.8]} rotationY={-2.25} scale={0.94} />

            <RedToriiGate
                position={[-0.4, coords.toriiNorthY, -13.5]}
                rotationY={Math.PI / 2}
            />
            <StoneArchwayGLB
                position={[-15.5, coords.rockArchWestY, 4.5]}
                rotationY={0}
                scale={1.04}
            />

            <MonumentalBlossomTreeGLB position={[7.8, coords.sakuraY, 2.2]} rotationY={0.35} scale={1.02} />
            <MonumentalEvergreenTreeGLB position={[-9.5, coords.evergreenY, 12.5]} rotationY={-0.6} scale={0.95} />

            <WoodenLanternPost position={[2.8, coords.lamp1Y, 5.2]} rotationY={-Math.PI / 2} />
            <WoodenLanternPost position={[-3.2, coords.lamp2Y, 5.2]} rotationY={Math.PI / 2} />
            <WoodenLanternPost position={[2.6, coords.lamp3Y, -4.5]} rotationY={-Math.PI / 2} />
            <WoodenLanternPost position={[-3.0, coords.lamp4Y, -4.5]} rotationY={Math.PI / 2} />

            <WoodenMemoryNoticeboard position={[3.4, coords.noticeY, 10.5]} rotationY={-0.35} />
            <WoodenSignpost position={[-2.8, coords.signY, 10.2]} rotationY={0.4} />
            <ExplorerCampsite position={[-7.5, coords.tentY, -9.2]} rotationY={0.55} />
            <WoodenCargoCart position={[6.8, coords.cartY, -12.0]} rotationY={-0.65} />

            <GardenPondGLB position={[-6.2, coords.pondY + 0.02, -15.2]} rotationY={-0.4} scale={0.98} />
            <WoodenArchedBridge position={[-6.2, coords.pondY + 0.05, -15.2]} rotationY={0.4} />

            <AncientOldTreeGLB position={[-18.5, coords.oldTree1Y, -11.5]} rotationY={0.6} variant={1} scale={1.02} />
            <AncientOldTreeGLB position={[18.0, coords.oldTree2Y, 6.5]} rotationY={-1.4} variant={2} scale={1.05} />
            <SlenderTallTreeGLB position={[-19.0, coords.tallTree1Y, 16.0]} rotationY={0.35} variant={1} scale={1.0} />
            <SlenderTallTreeGLB position={[17.5, coords.tallTree2Y, -16.5]} rotationY={-2.1} variant={2} scale={1.04} />

            <StandingStonePillar position={[-18.2, coords.pillar1Y, 9.6]} rotationY={0.4} />
            <StandingStonePillar position={[16.8, coords.pillar2Y, -12.5]} rotationY={-0.35} scale={0.9} />

            <WoodenFenceSection position={[14.5, coords.fence1Y, -1.2]} rotationY={0.1} />
            <WoodenFenceSection position={[14.5, coords.fence2Y, 1.8]} rotationY={0.1} />

            <MemoryFlowerGLB position={[4.8, coords.fl1Y, 3.2]} rotationY={0.4} scale={1.05} variant={1} />
            <MemoryFlowerGLB position={[-5.2, coords.fl2Y, 2.4]} rotationY={1.2} scale={1.0} variant={2} />
            <MemoryFlowerGLB position={[5.2, coords.fl3Y, -6.5]} rotationY={-0.7} scale={1.05} variant={1} />
            <MemoryFlowerGLB position={[-4.4, coords.fl4Y, -11.8]} rotationY={2.1} scale={1.1} variant={2} />

            <GlowingButterflies center={[0, 1.5, 2]} count={8} />
            <GlowingButterflies center={[-6.2, coords.pondY + 1.2, -15.2]} count={5} />

            <HorizonVista />
            <WorldSpaceBlossomPetals />
            <MemoryPedestals />
            <MemoryRadiance />
        </group>
    );
};
