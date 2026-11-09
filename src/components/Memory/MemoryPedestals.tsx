// src/components/Memory/MemoryPedestals.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import { getGardenTerrainHeight } from '../../scenes/Environment/lowPolyUtils';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import type { MemoryItem } from '../../systems/MemoryManager/memoryTypes';

export const GARDEN_MEMORIES: MemoryItem[] = [
    {
        id: 'mem-golden-meadow',
        title: 'Golden Hour in the Sanctuary',
        subtitle: 'First Photograph Preserved',
        date: 'October 14',
        location: 'Eastern Sakura Bough',
        category: 'photo',
        description:
            'The late afternoon sunlight filtered through the sakura canopy, casting warm amber facets across the mossy stepping stones. We paused by the old stone plinth just as the wind carried a drift of petals across the valley.',
        position: [2.35, 0, 4.8],
        tags: ['Sunset', 'Sakura', 'Sanctuary'],
    },
    {
        id: 'mem-painted-valley',
        title: 'Canvas by the Western Arch',
        subtitle: 'Watercolour Study on Linen',
        date: 'September 28',
        location: 'Ancient Archway Overlook',
        category: 'shrine',
        description:
            'Set up the wooden easel beside the ivy-draped ruins. From this ridge, the floating island waterfall catches the last peach glow of dusk before the evening mist settles over the hills.',
        position: [-3.6, 0, 2.2],
        tags: ['Painting', 'Archway', 'Dusk'],
    },
    {
        id: 'mem-wind-melody',
        title: 'Lullaby of the Paper Banners',
        subtitle: 'Acoustic Field Recording',
        date: 'November 2',
        location: 'Whispering Knoll',
        category: 'music',
        audioDuration: '02:18',
        description:
            'A quiet acoustic melody recorded beneath the prayer banners. You can hear the distant rush of the waterfall blending with the rustle of olive leaves.',
        position: [1.9, 0, -4.8],
        tags: ['Melody', 'Banners', 'Breeze'],
    },
    {
        id: 'mem-archway-lanterns',
        title: 'Footsteps Through the Stone Gate',
        subtitle: 'Moving Memory Fragment',
        date: 'August 19',
        location: 'Northern Ruin Threshold',
        category: 'video',
        description:
            'Walking through the mossy stone archway as fireflies and golden motes began to rise from the wildflowers along the trail.',
        position: [-2.4, 0, -6.5],
        tags: ['Archway', 'Fireflies', 'Trail'],
    },
];

const INTERACTION_RADIUS = 3.8;

export const MemoryPedestals: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const nearbyMemory = useGameStore((state) => state.nearbyMemory);
    const setNearbyMemory = useGameStore((state) => state.setNearbyMemory);
    const openMemory = useGameStore((state) => state.openMemory);
    const activeModal = useGameStore((state) => state.activeModal);
    const discoveredIds = useGameStore((state) => state.discoveredIds);

    const relicRefs = useRef<Array<THREE.Group | null>>([]);
    const ringRefs = useRef<Array<THREE.Mesh | null>>([]);
    const lightRefs = useRef<Array<THREE.PointLight | null>>([]);

    const pedestalsWithElevation = useMemo(() => {
        return GARDEN_MEMORIES.map((m) => {
            const y = getGardenTerrainHeight(m.position[0], m.position[2]);
            return {
                ...m,
                position: [m.position[0], y, m.position[2]] as [number, number, number],
            };
        });
    }, []);

    // Listen for 'E' key interaction when inside proximity radius
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (
                e.code === 'KeyE' &&
                phase === 'exploring' &&
                activeModal === 'none'
            ) {
                const currentNearby = useGameStore.getState().nearbyMemory;
                if (currentNearby) {
                    openMemory(currentNearby);
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [phase, activeModal, openMemory]);

    useFrame(({ clock }, delta) => {
        const t = clock.getElapsedTime();
        const [px, , pz] = playerTelemetry.position;

        let closestMemory: MemoryItem | null = null;
        let closestDist = INTERACTION_RADIUS;

        pedestalsWithElevation.forEach((mem, idx) => {
            const dx = px - mem.position[0];
            const dz = pz - mem.position[2];
            const dist = Math.hypot(dx, dz);

            if (phase === 'exploring' && dist < closestDist) {
                closestDist = dist;
                closestMemory = mem;
            }

            const isNear = nearbyMemory?.id === mem.id;
            const relic = relicRefs.current[idx];
            const ring = ringRefs.current[idx];
            const light = lightRefs.current[idx];

            if (relic) {
                const floatSpeed = isNear ? 3.2 : 1.8;
                relic.position.y =
                    1.72 + Math.sin(t * floatSpeed + idx * 1.3) * 0.09;
                relic.rotation.y += delta * (isNear ? 1.25 : 0.45);
            }

            if (ring) {
                const targetScale = isNear
                    ? 1.18 + Math.sin(t * 4.5) * 0.06
                    : 1.0 + Math.sin(t * 2.2 + idx) * 0.03;
                ring.scale.lerp(
                    new THREE.Vector3(targetScale, targetScale, targetScale),
                    delta * 8
                );
            }

            if (light) {
                const targetIntensity = isNear ? 3.4 : 1.65;
                light.intensity = THREE.MathUtils.lerp(
                    light.intensity,
                    targetIntensity,
                    delta * 6
                );
            }
        });

        if (phase === 'exploring') {
            setNearbyMemory(closestMemory);
        }
    });

    if (phase !== 'exploring') return null;

    return (
        <group>
            {pedestalsWithElevation.map((p, idx) => {
                const isNear = nearbyMemory?.id === p.id;
                const isDiscovered = discoveredIds.includes(p.id);

                return (
                    <group key={p.id} position={p.position}>
                        {/* Faceted Stone Plinth Base */}
                        <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[1.12, 1.36, 0.48, 7]} />
                            <meshStandardMaterial
                                color={THEME.colors.stoneBase}
                                roughness={0.88}
                                flatShading
                            />
                        </mesh>

                        {/* Sculpted Stone Pedestal Column */}
                        <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[0.8, 0.96, 0.72, 7]} />
                            <meshStandardMaterial
                                color={THEME.colors.stoneSunlit}
                                roughness={0.85}
                                flatShading
                            />
                        </mesh>

                        {/* Pedestal Top Altar Slab */}
                        <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[0.92, 0.88, 0.14, 7]} />
                            <meshStandardMaterial
                                color={
                                    isNear ? '#c9b39b' : THEME.colors.stoneSunlit
                                }
                                roughness={0.8}
                                flatShading
                            />
                        </mesh>

                        {/* Glowing Golden Top Plate Ring */}
                        <mesh
                            position={[0, 1.26, 0]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <ringGeometry args={[0.42, 0.68, 7]} />
                            <meshBasicMaterial
                                color={THEME.colors.memoryGold}
                                transparent
                                opacity={isNear ? 0.9 : 0.45}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        {/* Floating Golden Memory Relic & Halo */}
                        <group
                            ref={(el) => {
                                relicRefs.current[idx] = el;
                            }}
                            position={[0, 1.72, 0]}
                        >
                            {/* Golden Halo Ring */}
                            <mesh
                                ref={(el) => {
                                    ringRefs.current[idx] = el;
                                }}
                            >
                                <torusGeometry args={[0.48, 0.02, 8, 32]} />
                                <meshBasicMaterial
                                    color={THEME.colors.memoryGold}
                                    transparent
                                    opacity={isNear ? 0.95 : 0.72}
                                />
                            </mesh>

                            {/* Central Memory Artifact */}
                            <mesh>
                                {p.category === 'music' ? (
                                    <octahedronGeometry args={[0.26, 0]} />
                                ) : (
                                    <boxGeometry args={[0.42, 0.34, 0.05]} />
                                )}
                                <meshStandardMaterial
                                    color={THEME.colors.memoryCore}
                                    emissive={
                                        isDiscovered ? '#ffd27d' : THEME.colors.memoryEmissive
                                    }
                                    emissiveIntensity={isNear ? 2.4 : 1.35}
                                    roughness={0.25}
                                    flatShading
                                />
                            </mesh>
                        </group>

                        {/* Warm Golden Point Light */}
                        <pointLight
                            ref={(el) => {
                                lightRefs.current[idx] = el;
                            }}
                            position={[0, 1.65, 0]}
                            color={THEME.colors.memoryGold}
                            intensity={1.65}
                            distance={6.5}
                            decay={2}
                        />
                    </group>
                );
            })}
        </group>
    );
};