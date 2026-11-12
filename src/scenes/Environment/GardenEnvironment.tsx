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
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import {
    AncientOldTreeGLB,
    CozyStorybookCottage,
    EngravedMemoryMonument,
    ExplorerCampsite,
    GardenPondGLB,
    GlowingButterflies,
    MemoryFlowerGLB,
    MonumentalBlossomTreeGLB,
    MonumentalEvergreenTreeGLB,
    RedToriiGate,
    SlenderTallTreeGLB,
    SpottedMushroomCluster,
    StandingMemoryBanner,
    StandingStonePillar,
    StoneArchwayGLB,
    WoodenArchedBridge,
    WoodenCargoCart,
    WoodenFenceSection,
    WoodenLanternPost,
    WoodenMemoryNoticeboard,
    WoodenSignpost,
    WoodenStraightBridge,
} from '../../components/Environment/WorldAssetLibrary';

const WorldSpaceBlossomPetals: React.FC = () => {
    const instancedRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const petalGeo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);

    const particles = useMemo(
        () =>
            Array.from({ length: 24 }).map((_, i) => ({
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

const HorizonVista: React.FC = () => {
    const vistaRef = useRef<THREE.Group>(null);
    const islandRef = useRef<THREE.Group>(null);

    const rockGeo = useMemo(
        () => createSculptedFacetedGeometry(6.2, 1, [1.45, 0.95, 1.1], 0.2, 77),
        []
    );

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        const px = playerTelemetry.position[0];
        const pz = playerTelemetry.position[2];

        if (vistaRef.current) {
            vistaRef.current.position.set(px * 0.92, 0, pz * 0.92);
        }
        if (islandRef.current) {
            islandRef.current.position.y = 8.2 + Math.sin(t * 0.7) * 0.28;
        }
    });

    return (
        <group ref={vistaRef}>
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
    );
};

export const GardenEnvironment: React.FC = () => {
    const worldSeed = useGameStore((state) => state.worldSeed);

    // Recompute Sanctuary landmark terrain heights whenever worldSeed changes
    const coords = useMemo(() => {
        const h = (x: number, z: number) => getGardenTerrainHeight(x, z);
        return {
            archY: h(-6.8, -3.5),
            sakuraY: h(6.2, 2.2),
            evergreenY: h(-11.5, 4.8),
            cottageY: h(11.5, -6.5),
            toriiY: h(-0.6, -10.2),
            pondY: h(-5.8, -14.2),
            campY: h(6.8, -13.5),
            pillar1Y: h(-18.2, 9.6),
            pillar2Y: h(-21.0, -12.0),
            bridge2Y: h(4.2, -9.2),
            noticeY: h(6.2, 26.0),
            monumentY: h(-14.0, 16.0),
            banner1Y: h(6.4, -21.5),
            banner2Y: h(-8.2, -23.0),
            lamp1Y: h(4.6, 15.8),
            lamp2Y: h(-10.4, -13.8),
            lamp3Y: h(10.2, 7.4),
            cartY: h(19.0, -13.0),
            signY: h(3.6, 12.8),
            fence1Y: h(19.4, -7.6),
            fence2Y: h(16.8, -8.4),
            mush1Y: h(10.4, 13.4),
            mush2Y: h(-13.6, -2.8),
            mush3Y: h(-7.4, -21.8),
            fl1Y: h(-3.4, 10.8),
            fl2Y: h(14.2, 11.5),
            fl3Y: h(-17.4, -4.0),
            fl4Y: h(2.4, -17.5),
            oldTree1Y: h(-24.0, 18.0),
            oldTree2Y: h(28.0, 10.0),
            tallTree1Y: h(-26.0, -22.0),
            tallTree2Y: h(23.0, -27.0),
        };
    }, [worldSeed]);

    useEffect(() => {
        const h = (x: number, z: number) => getGardenTerrainHeight(x, z);
        collisionManager.setStaticColliders([
            // Giant Sakura Tree (KeepSakeHugeTree.glb)
            { id: 'hero_sakura_trunk', x: 6.2, y: coords.sakuraY, z: 2.2, radius: 1.55, height: 8.5, blocksCamera: true },
            // Giant Evergreen Tree (KeepSakeHugeTreeGreen.glb)
            { id: 'hero_evergreen_trunk', x: -11.5, y: coords.evergreenY, z: 4.8, radius: 1.5, height: 8.5, blocksCamera: true },
            // Stone Archway Pillars (KeepSakeRockEntrance.glb)
            { id: 'arch_pillar_left', x: -6.8 - 1.75 * Math.cos(0.34), y: coords.archY, z: -3.5 + 1.75 * Math.sin(0.34), radius: 0.85, height: 5.5, blocksCamera: true },
            { id: 'arch_pillar_right', x: -6.8 + 1.75 * Math.cos(0.34), y: coords.archY, z: -3.5 - 1.75 * Math.sin(0.34), radius: 0.85, height: 5.5, blocksCamera: true },
            // Cozy Storybook Cottage (KeepSakeRockHouse-compressed.glb)
            { id: 'cottage_col', x: 11.5, y: coords.cottageY, z: -6.5, radius: 3.2, height: 5.4, blocksCamera: true },
            // Red Torii Gate Pillars (KeepSakeEntranceJapanese.glb)
            { id: 'torii_left', x: -0.6 - 1.45, y: coords.toriiY, z: -10.2, radius: 0.42, height: 3.8, blocksCamera: true },
            { id: 'torii_right', x: -0.6 + 1.45, y: coords.toriiY, z: -10.2, radius: 0.42, height: 3.8, blocksCamera: true },
            // Explorer Campsite Tent & Campfire (KeepSakeTent.glb)
            { id: 'camp_tent', x: 7.65, y: coords.campY, z: -13.9, radius: 1.35, height: 2.2, blocksCamera: false },
            { id: 'camp_fire', x: 5.85, y: coords.campY, z: -12.35, radius: 0.65, height: 1.0, blocksCamera: false },
            // Core Sanctuary Memory Pedestals
            { id: 'ped_1', x: 5.2, y: h(5.2, 7.2), z: 7.2, radius: 0.9, height: 2.0, blocksCamera: false },
            { id: 'ped_2', x: 2.85, y: h(2.85, 3.6), z: 3.6, radius: 1.65, height: 3.2, blocksCamera: false },
            { id: 'ped_3', x: -7.4, y: h(-7.4, 4.0), z: 4.0, radius: 1.15, height: 2.8, blocksCamera: false },
            { id: 'ped_4', x: 8.6, y: h(8.6, -8.4), z: -8.4, radius: 1.15, height: 2.8, blocksCamera: false },
            { id: 'ped_5', x: -7.6, y: h(-7.6, -9.8), z: -9.8, radius: 1.65, height: 3.2, blocksCamera: false },
            // New rim trees
            { id: 'old_tree_1', x: -24.0, y: coords.oldTree1Y, z: 18.0, radius: 0.95, height: 6.0, blocksCamera: true },
            { id: 'old_tree_2', x: 28.0, y: coords.oldTree2Y, z: 10.0, radius: 0.95, height: 6.0, blocksCamera: true },
            { id: 'tall_tree_1', x: -26.0, y: coords.tallTree1Y, z: -22.0, radius: 0.8, height: 8.0, blocksCamera: true },
            { id: 'tall_tree_2', x: 23.0, y: coords.tallTree2Y, z: -27.0, radius: 0.8, height: 8.0, blocksCamera: true },
        ]);
    }, [coords, worldSeed]);

    return (
        <group>
            <ChunkedTerrain />

            {/* Hero Sanctuary Landmarks (Using Project GLB Assets) */}
            {/* Both entrances are authored facing along their local X axis, so a
                quarter turn points the openings down the trail towards the camera. */}
            <StoneArchwayGLB
                position={[-6.8, coords.archY, -3.5]}
                rotationY={0.34 + Math.PI / 2}
                scale={1.08}
            />
            <MonumentalBlossomTreeGLB position={[6.2, coords.sakuraY, 2.2]} rotationY={0.25} scale={1.05} />
            <MonumentalEvergreenTreeGLB position={[-11.5, coords.evergreenY, 4.8]} rotationY={-0.6} scale={0.98} />

            {/* Broad old-growth and tall trees spread around the sanctuary rim */}
            <AncientOldTreeGLB position={[-24.0, coords.oldTree1Y, 18.0]} rotationY={0.6} variant={1} scale={1.05} />
            <AncientOldTreeGLB position={[28.0, coords.oldTree2Y, 10.0]} rotationY={-1.4} variant={2} scale={1.1} />
            <SlenderTallTreeGLB position={[-26.0, coords.tallTree1Y, -22.0]} rotationY={0.35} variant={1} scale={1.02} />
            <SlenderTallTreeGLB position={[23.0, coords.tallTree2Y, -27.0]} rotationY={-2.2} variant={2} scale={1.08} />

            {/* Structures & Landmarks */}
            <CozyStorybookCottage position={[11.5, coords.cottageY, -6.5]} rotationY={-0.65} />
            <RedToriiGate
                position={[-0.6, coords.toriiY, -10.2]}
                rotationY={0.08 + Math.PI / 2}
            />
            <StandingStonePillar position={[-18.2, coords.pillar1Y, 9.6]} rotationY={0.4} />
            <StandingStonePillar position={[-21.0, coords.pillar2Y, -12.0]} rotationY={-0.25} scale={0.88} />

            {/* Water & Bridges */}
            <GardenPondGLB position={[-5.8, coords.pondY + 0.02, -14.2]} rotationY={-0.42} scale={1.05} />
            <WoodenArchedBridge position={[-5.8, coords.pondY + 0.05, -14.2]} rotationY={0.42} />
            <WoodenStraightBridge position={[4.2, coords.bridge2Y + 0.04, -9.2]} rotationY={-0.3} />

            {/* Interactables & Memory Elements */}
            <WoodenMemoryNoticeboard position={[6.2, coords.noticeY, 26.0]} rotationY={0.45} />
            <EngravedMemoryMonument position={[-14.0, coords.monumentY, 16.0]} rotationY={0.62} />
            <StandingMemoryBanner position={[6.4, coords.banner1Y, -21.5]} rotationY={-0.2} />
            <StandingMemoryBanner position={[-8.2, coords.banner2Y, -23.0]} rotationY={0.2} />
            <WoodenLanternPost position={[4.6, coords.lamp1Y, 15.8]} rotationY={-2.4} />
            <WoodenLanternPost position={[-10.4, coords.lamp2Y, -13.8]} rotationY={0.5} />
            <WoodenLanternPost position={[10.2, coords.lamp3Y, 7.4]} rotationY={-2.6} />

            {/* Both GLB Flower Variants around the Sanctuary */}
            <MemoryFlowerGLB position={[-3.4, coords.fl1Y, 10.8]} rotationY={0.4} scale={1.1} variant={1} />
            <MemoryFlowerGLB position={[14.2, coords.fl2Y, 11.5]} rotationY={1.2} scale={1.0} variant={2} />
            <MemoryFlowerGLB position={[-17.4, coords.fl3Y, -4.0]} rotationY={-0.7} scale={1.05} variant={1} />
            <MemoryFlowerGLB position={[2.4, coords.fl4Y, -17.5]} rotationY={2.1} scale={1.15} variant={2} />

            {/* Utility & World Props */}
            <ExplorerCampsite position={[6.8, coords.campY, -13.5]} rotationY={-0.45} />
            <WoodenCargoCart position={[19.0, coords.cartY, -13.0]} rotationY={-0.8} />
            <WoodenSignpost position={[3.6, coords.signY, 12.8]} rotationY={0.35} />
            <WoodenFenceSection position={[19.4, coords.fence1Y, -7.6]} rotationY={-0.55} />
            <WoodenFenceSection position={[16.8, coords.fence2Y, -8.4]} rotationY={-0.55} />

            {/* Ambient Details: Spotted Mushrooms & Glowing Butterflies */}
            <SpottedMushroomCluster position={[10.4, coords.mush1Y, 13.4]} scale={1.15} />
            <SpottedMushroomCluster position={[-13.6, coords.mush2Y, -2.8]} scale={1.0} />
            <SpottedMushroomCluster position={[-7.4, coords.mush3Y, -21.8]} scale={1.2} />
            <GlowingButterflies center={[0, 1.5, 2]} count={10} />
            <GlowingButterflies center={[-5.8, coords.pondY + 1.2, -14.2]} count={6} />

            <HorizonVista />
            <WorldSpaceBlossomPetals />
            <MemoryPedestals />
            <MemoryRadiance />
        </group>
    );
};