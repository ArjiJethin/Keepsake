// src/components/Memory/MemoryPedestals.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import {
    ACTIVE_CHUNK_RADIUS,
    CHUNK_SIZE,
    getGardenTerrainHeight,
} from '../../scenes/Environment/lowPolyUtils';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import type { MemoryItem } from '../../systems/MemoryManager/memoryTypes';

export const INITIAL_GARDEN_MEMORIES: MemoryItem[] = [
    {
        id: 'mem-seed-first-step',
        title: 'Seed of First Footsteps',
        subtitle: 'Living Memory Sprout',
        date: 'Autumn Equinox',
        location: 'Sanctuary Trailhead',
        category: 'voice',
        importance: 'cherished',
        growthStage: 'seed',
        interactionState: 'dormant',
        people: ['Elena', 'Kael'],
        groupName: 'Beginnings',
        description:
            'A warm golden memory seed planted beside the mossy stepping stones. When nurtured with remembrance, its twin leaves unfurl toward the sunset light.',
        position: [1.35, 0, 5.8],
        tags: ['Seed', 'Beginning', 'Lantern'],
        echo: {
            floatingPhotoTitle: 'Lanterns at Dusk',
            floatingPhotoPalette: ['#e8a598', '#ffcf70', '#5d6b46'],
            voiceTranscript:
                '"Leave a small light beside the first stone so we always find our way back to the garden."',
            ambientAudioLabel: 'Soft Chimes & Evening Breeze',
            writtenNote: 'Planted at the start of the trail. Press Nourish to watch this memory grow.',
        },
    },
    {
        id: 'mem-golden-meadow',
        title: 'Golden Hour in the Sanctuary',
        subtitle: 'First Photograph Preserved',
        date: 'October 14',
        location: 'Eastern Sakura Bough',
        category: 'photo',
        importance: 'milestone',
        growthStage: 'plant',
        interactionState: 'dormant',
        people: ['Elena'],
        groupName: 'Sanctuary Chronicles',
        description:
            'The late afternoon sunlight filtered through the sakura canopy, casting warm amber facets across the mossy stepping stones. We paused by the old stone plinth just as the wind carried a drift of petals across the valley.',
        position: [2.35, 0, 4.2],
        tags: ['Sunset', 'Sakura', 'Sanctuary'],
        echo: {
            floatingPhotoTitle: 'Under the Eastern Bough',
            floatingPhotoPalette: ['#d9918b', '#ffdf9e', '#68744e'],
            voiceTranscript:
                '"Look how the petals catch the gold right before the sun dips behind the floating island."',
            ambientAudioLabel: 'Rustling Sakura Blossoms (01:42)',
            writtenNote: 'Captured on instant film near the prayer banners.',
        },
    },
    {
        id: 'mem-painted-valley',
        title: 'Canvas by the Western Arch',
        subtitle: 'Watercolour Study on Linen',
        date: 'September 28',
        location: 'Ancient Archway Overlook',
        category: 'shrine',
        importance: 'milestone',
        growthStage: 'plant',
        interactionState: 'dormant',
        people: ['Kael'],
        groupName: 'Sketchbook Studies',
        description:
            'Set up the wooden easel beside the ivy-draped ruins. From this ridge, the floating island waterfall catches the last peach glow of dusk before the evening mist settles over the hills.',
        position: [-3.6, 0, 2.2],
        tags: ['Painting', 'Archway', 'Dusk'],
        echo: {
            floatingPhotoTitle: 'Western Arch Watercolour',
            floatingPhotoPalette: ['#8e7b9b', '#e8b49a', '#877974'],
            voiceTranscript:
                '"Mixing dusty rose and warm ochre—still trying to get the mist around the waterfall right."',
            ambientAudioLabel: 'Brushstrokes & Distant Waterfall',
            writtenNote: 'Page 14 of the leather-bound Memory Journal.',
        },
    },
    {
        id: 'mem-wind-melody',
        title: 'Lullaby of the Paper Banners',
        subtitle: 'Acoustic Field Recording',
        date: 'November 2',
        location: 'Whispering Knoll',
        category: 'music',
        audioDuration: '02:18',
        importance: 'cherished',
        growthStage: 'tree',
        interactionState: 'dormant',
        people: ['Elena', 'Kael'],
        groupName: 'Field Recordings',
        description:
            'A quiet acoustic melody recorded beneath the prayer banners. You can hear the distant rush of the waterfall blending with the rustle of olive leaves.',
        position: [1.9, 0, -4.8],
        tags: ['Melody', 'Banners', 'Breeze'],
        echo: {
            floatingPhotoTitle: 'Song of the Knoll',
            floatingPhotoPalette: ['#b88c94', '#ffd478', '#5c704e'],
            voiceTranscript:
                '"Let the tape roll for a moment—listen to the wind chimes in the upper branches."',
            ambientAudioLabel: 'Acoustic Guitar & Wind Chimes (02:18)',
            writtenNote: 'Recorded with the vintage field cassette recorder.',
        },
    },
    {
        id: 'mem-archway-lanterns',
        title: 'Footsteps Through the Stone Gate',
        subtitle: 'Moving Memory Fragment',
        date: 'August 19',
        location: 'Northern Ruin Threshold',
        category: 'video',
        importance: 'core',
        growthStage: 'landmark',
        interactionState: 'dormant',
        people: ['The Wanderers'],
        groupName: 'Northern Passage',
        description:
            'Walking through the mossy stone archway as fireflies and golden motes began to rise from the wildflowers along the trail.',
        position: [-2.4, 0, -6.5],
        tags: ['Archway', 'Fireflies', 'Trail'],
        echo: {
            floatingPhotoTitle: 'Northern Gate at Twilight',
            floatingPhotoPalette: ['#7d6d8a', '#ffcf70', '#615653'],
            voiceTranscript:
                '"Beyond this archway the valley opens into the endless hills. Every step leaves an echo."',
            ambientAudioLabel: 'Footsteps on Flagstone & Night Crickets',
            writtenNote: 'A core landmark memory anchoring the northern trail.',
        },
    },
    {
        id: 'mem-distant-horizon-seed',
        title: 'Echo of the Outer Meadow',
        subtitle: 'Distant Chunk Persistent Seed',
        date: 'November 9',
        location: 'Northern Outer Valley (Chunk 0, -1)',
        category: 'letter',
        importance: 'whisper',
        growthStage: 'seed',
        interactionState: 'dormant',
        people: ['Traveler'],
        groupName: 'Outer Reaches',
        description:
            'A memory seed nestled far down the northern trail. Even if you travel far away and unload this terrain chunk, this memory remains anchored to its exact world coordinates.',
        position: [-1.8, 0, -26.0],
        tags: ['Persistent', 'Outer Valley', 'Seed'],
        echo: {
            floatingPhotoTitle: 'Outer Meadow Vista',
            floatingPhotoPalette: ['#9e8191', '#f7cfc4', '#68744e'],
            voiceTranscript:
                '"No matter how far we wander, the garden remembers where every seed was placed."',
            ambientAudioLabel: 'High Meadow Wind',
            writtenNote: 'Tests cross-chunk memory persistence.',
        },
    },
];

const INTERACTION_RADIUS = 3.8;

/**
 * Renders the 3D Living Memory Foliage/Artifact atop a pedestal or soil mound
 * according to its current growthStage ('seed' | 'plant' | 'tree' | 'landmark')
 */
const MemoryGrowthVisual: React.FC<{
    memory: MemoryItem;
    isNear: boolean;
    isEchoing: boolean;
}> = ({ memory, isNear, isEchoing }) => {
    const stage = memory.growthStage || 'seed';

    if (stage === 'seed') {
        return (
            <group>
                {/* Glowing Golden Seed Core */}
                <mesh position={[0, 0.12, 0]} castShadow>
                    <octahedronGeometry args={[0.19, 1]} />
                    <meshStandardMaterial
                        color={THEME.colors.memoryCore}
                        emissive={THEME.colors.memoryEmissive}
                        emissiveIntensity={isNear || isEchoing ? 2.6 : 1.5}
                        roughness={0.2}
                        flatShading
                    />
                </mesh>
                {/* Two Delicate Sprouting Cotyledon Leaves */}
                <mesh
                    position={[-0.14, 0.24, 0]}
                    rotation={[0, 0, 0.55]}
                    scale={[1, 0.35, 0.5]}
                >
                    <octahedronGeometry args={[0.14, 0]} />
                    <meshStandardMaterial
                        color="#a8c278"
                        emissive="#859e52"
                        emissiveIntensity={0.4}
                        flatShading
                    />
                </mesh>
                <mesh
                    position={[0.14, 0.24, 0]}
                    rotation={[0, 0, -0.55]}
                    scale={[1, 0.35, 0.5]}
                >
                    <octahedronGeometry args={[0.14, 0]} />
                    <meshStandardMaterial
                        color="#a8c278"
                        emissive="#859e52"
                        emissiveIntensity={0.4}
                        flatShading
                    />
                </mesh>
            </group>
        );
    }

    if (stage === 'plant') {
        return (
            <group>
                {/* Graceful Stem & Golden Keepsake Blossom */}
                <mesh position={[0, 0.18, 0]}>
                    <cylinderGeometry args={[0.025, 0.04, 0.38, 6]} />
                    <meshStandardMaterial color="#7e9458" flatShading />
                </mesh>
                {[-1, 1].map((side) => (
                    <mesh
                        key={side}
                        position={[side * 0.14, 0.18, 0]}
                        rotation={[0, 0, -side * 0.65]}
                        scale={[1.2, 0.35, 0.6]}
                    >
                        <octahedronGeometry args={[0.13, 0]} />
                        <meshStandardMaterial color="#96ad68" flatShading />
                    </mesh>
                ))}
                {/* Blooming 5-Petal Golden Keepsake Flower */}
                <group position={[0, 0.4, 0]} rotation={[0.25, 0, 0]}>
                    <mesh>
                        <dodecahedronGeometry args={[0.09, 0]} />
                        <meshStandardMaterial
                            color={THEME.colors.memoryCore}
                            emissive={THEME.colors.memoryEmissive}
                            emissiveIntensity={2.2}
                        />
                    </mesh>
                    {[0, 1, 2, 3, 4].map((p) => {
                        const a = (p / 5) * Math.PI * 2;
                        return (
                            <mesh
                                key={p}
                                position={[Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16]}
                                rotation={[0, -a, 0]}
                                scale={[1.3, 0.28, 0.85]}
                            >
                                <octahedronGeometry args={[0.1, 0]} />
                                <meshStandardMaterial
                                    color="#fff0d4"
                                    emissive="#ffbb54"
                                    emissiveIntensity={isNear ? 1.4 : 0.75}
                                    flatShading
                                />
                            </mesh>
                        );
                    })}
                </group>
            </group>
        );
    }

    if (stage === 'tree') {
        return (
            <group>
                {/* Miniature Bonsai Memory Tree with Glowing Blossom Crown */}
                <mesh position={[0, 0.25, 0]} castShadow>
                    <cylinderGeometry args={[0.055, 0.11, 0.52, 6]} />
                    <meshStandardMaterial color={THEME.colors.barkHighlight} flatShading />
                </mesh>
                <mesh position={[0, 0.62, 0]} castShadow>
                    <icosahedronGeometry args={[0.34, 1]} />
                    <meshStandardMaterial
                        color="#f5c2b8"
                        emissive="#ffaa44"
                        emissiveIntensity={isNear ? 1.2 : 0.55}
                        flatShading
                    />
                </mesh>
                <mesh position={[-0.22, 0.5, 0.12]}>
                    <icosahedronGeometry args={[0.22, 1]} />
                    <meshStandardMaterial
                        color="#ffe3ba"
                        emissive="#ffbb55"
                        emissiveIntensity={0.8}
                        flatShading
                    />
                </mesh>
            </group>
        );
    }

    // 'landmark' stage: Radiant Framed Relic & Dual Halo Rings
    return (
        <group>
            <mesh position={[0, 0.32, 0]}>
                <boxGeometry args={[0.46, 0.38, 0.05]} />
                <meshStandardMaterial
                    color={THEME.colors.memoryCore}
                    emissive={THEME.colors.memoryEmissive}
                    emissiveIntensity={isNear ? 2.5 : 1.45}
                    roughness={0.25}
                    flatShading
                />
            </mesh>
        </group>
    );
};

export const MemoryPedestals: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const activeChunkCoord = useGameStore((state) => state.activeChunkCoord);
    const persistentMemories = useGameStore((state) => state.persistentMemories);
    const registerPersistentMemories = useGameStore(
        (state) => state.registerPersistentMemories
    );
    const nearbyMemory = useGameStore((state) => state.nearbyMemory);
    const setNearbyMemory = useGameStore((state) => state.setNearbyMemory);
    const openMemory = useGameStore((state) => state.openMemory);
    const activeModal = useGameStore((state) => state.activeModal);
    const activeEchoId = useGameStore((state) => state.activeEchoId);
    const landmarkZones = useGameStore((state) => state.landmarkZones);
    const setNearbyZone = useGameStore((state) => state.setNearbyZone);

    const floatGroupRefs = useRef<Record<string, THREE.Group | null>>({});
    const echoWaveRefs = useRef<Record<string, THREE.Mesh | null>>({});
    const lightRefs = useRef<Record<string, THREE.PointLight | null>>({});

    // Initialize persistent memories in global store once
    useEffect(() => {
        const initialized = INITIAL_GARDEN_MEMORIES.map((m) => {
            const y = getGardenTerrainHeight(m.position[0], m.position[2]);
            const cx = Math.round(m.position[0] / CHUNK_SIZE);
            const cz = Math.round(m.position[2] / CHUNK_SIZE);
            return {
                ...m,
                position: [m.position[0], y, m.position[2]] as [number, number, number],
                chunkKey: `${cx}_${cz}`,
            };
        });
        registerPersistentMemories(initialized);
    }, [registerPersistentMemories]);

    // Filter memories to those inside currently loaded terrain chunks (3x3 active grid)
    // Demonstrates true persistence: memories in unloaded chunks unmount cleanly and
    // re-mount with their preserved growthStage & state when the chunk reloads!
    const activeChunkMemories = useMemo(() => {
        const [acx, acz] = activeChunkCoord;
        return persistentMemories.filter((m) => {
            const mcx = Math.round(m.position[0] / CHUNK_SIZE);
            const mcz = Math.round(m.position[2] / CHUNK_SIZE);
            return (
                Math.abs(mcx - acx) <= ACTIVE_CHUNK_RADIUS &&
                Math.abs(mcz - acz) <= ACTIVE_CHUNK_RADIUS
            );
        });
    }, [persistentMemories, activeChunkCoord]);

    // Keyboard 'E' Interaction Listener
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
        let absoluteNearestDist = 999;

        for (let i = 0; i < activeChunkMemories.length; i++) {
            const mem = activeChunkMemories[i];
            const dx = px - mem.position[0];
            const dz = pz - mem.position[2];
            const dist = Math.hypot(dx, dz);

            if (dist < absoluteNearestDist) {
                absoluteNearestDist = dist;
            }

            if (phase === 'exploring' && dist < closestDist) {
                closestDist = dist;
                closestMemory = mem;
            }

            const isNear = nearbyMemory?.id === mem.id;
            const isEchoing = activeEchoId === mem.id;

            const floatGrp = floatGroupRefs.current[mem.id];
            if (floatGrp) {
                const baseH = mem.id === 'mem-seed-first-step' ? 0.55 : 1.48;
                floatGrp.position.y =
                    baseH + Math.sin(t * (isNear ? 3.0 : 1.7) + i) * 0.08;
                floatGrp.rotation.y += delta * (isEchoing ? 1.4 : isNear ? 0.9 : 0.38);
            }

            const echoWave = echoWaveRefs.current[mem.id];
            if (echoWave) {
                const pulse = ((t * 0.85 + i * 0.3) % 1);
                const s = 1 + pulse * (isEchoing ? 2.4 : 1.35);
                echoWave.scale.set(s, s, 1);
                const mat = echoWave.material as THREE.MeshBasicMaterial;
                mat.opacity = (1 - pulse) * (isEchoing ? 0.75 : isNear ? 0.45 : 0.2);
            }

            const light = lightRefs.current[mem.id];
            if (light) {
                const targetIntensity = isEchoing ? 3.8 : isNear ? 2.9 : 1.45;
                light.intensity = THREE.MathUtils.lerp(
                    light.intensity,
                    targetIntensity,
                    delta * 6
                );
            }
        }

        // Update telemetry so the Explorer's backpack Memory Lantern glows brighter near memories
        playerTelemetry.nearestMemoryDistance = absoluteNearestDist;

        if (phase === 'exploring') {
            setNearbyMemory(closestMemory);

            // Check proximity to Future Interactive Environment Landmark Zones
            let activeZone = null;
            for (const z of landmarkZones) {
                const d = Math.hypot(px - z.position[0], pz - z.position[2]);
                if (d <= z.radius) {
                    activeZone = z;
                    break;
                }
            }
            setNearbyZone(activeZone);
        }
    });

    if (phase !== 'exploring') return null;

    return (
        <group>
            {activeChunkMemories.map((p) => {
                const isNear = nearbyMemory?.id === p.id;
                const isEchoing = activeEchoId === p.id;
                const isOrganicSeedMound =
                    p.id === 'mem-seed-first-step' || p.id === 'mem-distant-horizon-seed';

                return (
                    <group key={p.id} position={p.position}>
                        {isOrganicSeedMound ? (
                            /* Organic Mossy Soil Mound & Pebble Ring for Memory Seeds */
                            <group>
                                <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
                                    <cylinderGeometry args={[0.52, 0.78, 0.28, 8]} />
                                    <meshStandardMaterial
                                        color="#5c6946"
                                        roughness={0.9}
                                        flatShading
                                    />
                                </mesh>
                                <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
                                    <cylinderGeometry args={[0.36, 0.52, 0.12, 8]} />
                                    <meshStandardMaterial
                                        color="#6b5344"
                                        roughness={0.92}
                                        flatShading
                                    />
                                </mesh>
                            </group>
                        ) : (
                            /* Sculpted Low-Poly Stone Pedestal Shrine */
                            <group>
                                <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
                                    <cylinderGeometry args={[1.08, 1.32, 0.48, 7]} />
                                    <meshStandardMaterial
                                        color={THEME.colors.stoneBase}
                                        roughness={0.88}
                                        flatShading
                                    />
                                </mesh>
                                <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
                                    <cylinderGeometry args={[0.78, 0.94, 0.72, 7]} />
                                    <meshStandardMaterial
                                        color={THEME.colors.stoneSunlit}
                                        roughness={0.85}
                                        flatShading
                                    />
                                </mesh>
                                <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
                                    <cylinderGeometry args={[0.9, 0.86, 0.14, 7]} />
                                    <meshStandardMaterial
                                        color={isNear ? '#c9b39b' : THEME.colors.stoneSunlit}
                                        roughness={0.8}
                                        flatShading
                                    />
                                </mesh>
                            </group>
                        )}

                        {/* Ground Acoustic / Memory Ripple Ring */}
                        <mesh
                            ref={(el) => {
                                echoWaveRefs.current[p.id] = el;
                            }}
                            position={[0, isOrganicSeedMound ? 0.36 : 1.27, 0]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <ringGeometry args={[0.38, 0.46, 24]} />
                            <meshBasicMaterial
                                color={THEME.colors.memoryGold}
                                transparent
                                opacity={0.35}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        {/* Floating Living Memory Object + 3D In-World Echo Projection */}
                        <group
                            ref={(el) => {
                                floatGroupRefs.current[p.id] = el;
                            }}
                            position={[0, isOrganicSeedMound ? 0.55 : 1.48, 0]}
                        >
                            {/* Soft Golden Halo Ring */}
                            <mesh position={[0, 0.22, 0]}>
                                <torusGeometry args={[0.46, 0.018, 8, 32]} />
                                <meshBasicMaterial
                                    color={THEME.colors.memoryGold}
                                    transparent
                                    opacity={isNear || isEchoing ? 0.92 : 0.65}
                                />
                            </mesh>

                            {/* Growth-Stage Specific 3D Mesh ('seed' | 'plant' | 'tree' | 'landmark') */}
                            <MemoryGrowthVisual
                                memory={p}
                                isNear={isNear}
                                isEchoing={isEchoing}
                            />

                            {/* 3D Floating Photograph Echo Hologram when nearby or actively echoing */}
                            {(isNear || isEchoing) && (
                                <group position={[0, 0.82, 0]}>
                                    {/* Floating Cream Polaroid Frame in 3D World Space */}
                                    <mesh>
                                        <boxGeometry args={[0.56, 0.64, 0.02]} />
                                        <meshStandardMaterial
                                            color="#f7ecda"
                                            emissive="#ffcf70"
                                            emissiveIntensity={0.35}
                                            roughness={0.6}
                                        />
                                    </mesh>
                                    <mesh position={[0, 0.05, 0.014]}>
                                        <planeGeometry args={[0.46, 0.44]} />
                                        <meshBasicMaterial
                                            color={p.echo?.floatingPhotoPalette?.[0] || '#e8a598'}
                                        />
                                    </mesh>
                                </group>
                            )}
                        </group>

                        {/* Restrained Warm Golden Point Light */}
                        <pointLight
                            ref={(el) => {
                                lightRefs.current[p.id] = el;
                            }}
                            position={[0, isOrganicSeedMound ? 0.8 : 1.65, 0]}
                            color={THEME.colors.memoryGold}
                            intensity={1.45}
                            distance={6.0}
                            decay={2}
                        />
                    </group>
                );
            })}
        </group>
    );
};