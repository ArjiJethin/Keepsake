// src/components/Memory/MemoryPedestals.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import {
    ACTIVE_CHUNK_RADIUS,
    CHUNK_SIZE,
    getBiomeSampleAt,
    getDistanceToNearestPath,
    getGardenTerrainHeight,
    hash2D,
} from '../../scenes/Environment/lowPolyUtils';
import {
    playerTelemetry,
    useGameStore,
} from '../../store/useGameStore';
import type {
    MemoryCategory,
    MemoryImportance,
    MemoryItem,
    PedestalVariant,
} from '../../systems/MemoryManager/memoryTypes';
import { PedestalModelSelector } from './PedestalModels';

/**
 * The Keepsake Village (Fixed Spawn Area) contains 3 carefully placed memory pedestals
 * spread naturally across the village so the starting area feels welcoming and uncluttered.
 */
const INITIAL_MEMORIES: Array<Omit<MemoryItem, 'position'> & { xz: [number, number] }> = [
    {
        id: 'mem-golden-hour',
        title: 'Laughter Beneath the Petals',
        subtitle: 'Village Blossom Shrine',
        date: 'April 14, 2024',
        location: 'Keepsake Village East Knoll',
        category: 'photo',
        pedestalVariant: 'grand_portal',
        importance: 'core',
        growthStage: 'landmark',
        interactionState: 'dormant',
        description:
            'We spread an old woven blanket beneath the great blossom tree as the warm afternoon breeze drifted across the village green.',
        xz: [6.4, 5.4],
        rotationY: -0.45,
        tags: ['Village', 'Sakura', 'Spring', 'Golden Hour'],
        people: ['Elena', 'Marcus', 'Sora'],
        groupName: 'Keepsake Village',
        echo: {
            floatingPhotoTitle: 'Spring Picnic Under the Petals',
            floatingPhotoPalette: ['#f77eab', '#ffd89b', '#499e4c'],
            voiceTranscript:
                '"Wait, don’t move! Look at the blossom petals catching the sunlight right above us..."',
            ambientAudioLabel: 'Soft breeze & distant laughter',
            writtenNote:
                'The afternoon felt endless, as if the village itself was holding its breath.',
        },
    },
    {
        id: 'mem-rainy-window',
        title: 'Lanterns Along the Cobbles',
        subtitle: 'Village Commons',
        date: 'October 28, 2024',
        location: 'Keepsake Village West Path',
        category: 'music',
        pedestalVariant: 'minimal',
        importance: 'cherished',
        growthStage: 'plant',
        interactionState: 'dormant',
        description:
            'As twilight settled over the stone cottages, warm street lamps flickered on one by one along the village path.',
        xz: [-7.2, 4.2],
        rotationY: 0.52,
        audioDuration: '02:18',
        tags: ['Acoustic', 'Lanterns', 'Evening', 'Village'],
        people: ['Marcus', 'Elena'],
        groupName: 'Keepsake Village',
        echo: {
            floatingPhotoTitle: 'Warm Hearth & Acoustic Chords',
            floatingPhotoPalette: ['#e8a558', '#8c583a', '#3b2820'],
            voiceTranscript:
                '"Play that second chord progression again—the one that sounds like home."',
            ambientAudioLabel: 'Warm acoustic guitar & gentle wind',
            writtenNote:
                'Every time I walk past the cottages, those same three notes return.',
        },
    },
    {
        id: 'mem-mountain-trail',
        title: 'Crossing the Northern Gate',
        subtitle: 'Threshold of the Wild Biomes',
        date: 'August 09, 2023',
        location: 'Keepsake Village North Torii',
        category: 'voice',
        pedestalVariant: 'arched',
        importance: 'milestone',
        growthStage: 'tree',
        interactionState: 'dormant',
        description:
            'Standing before the vermilion entrance at the edge of the village, looking out toward the forests, ruins, and ponds beyond.',
        xz: [3.2, -8.6],
        rotationY: -0.25,
        audioDuration: '01:04',
        tags: ['Journey', 'Gate', 'Horizon', 'Adventure'],
        people: ['Sora', 'Liam', 'Elena'],
        groupName: 'Keepsake Village',
        echo: {
            floatingPhotoTitle: 'Beyond the Village Gate',
            floatingPhotoPalette: ['#9eb8d9', '#f2b880', '#4f6d5a'],
            voiceTranscript:
                '"Every path out of the village leads to a different memory waiting to be found."',
            ambientAudioLabel: 'Wind chimes & rustling leaves',
            writtenNote:
                'We promised we would return to the village square once our journals were full.',
        },
    },
];

const PROCEDURAL_MEMORY_TEMPLATES: Array<{
    title: string;
    subtitle: string;
    location: string;
    category: MemoryCategory;
    pedestalVariant: PedestalVariant;
    importance: MemoryImportance;
    description: string;
    tags: string[];
    people: string[];
    groupName: string;
    palette: [string, string, string];
    transcript: string;
    audioLabel: string;
    note: string;
}> = [
    {
        title: 'Reflections in the Blossom Pond',
        subtitle: 'Sakura Grove Shrine',
        location: 'Sakura Grove',
        category: 'shrine',
        pedestalVariant: 'arched',
        importance: 'milestone',
        description:
            'Pink petals drifted onto the mirror-still pond water, forming concentric ripples around the stone shrine.',
        tags: ['Sakura', 'Pond', 'Blossoms'],
        people: ['Sora', 'Elena'],
        groupName: 'Sakura Grove',
        palette: ['#ff8cb6', '#7bc4f7', '#54b358'],
        transcript: '"Watch how the water catches every single petal as it falls."',
        audioLabel: 'Gentle water ripples & wind chimes',
        note: 'A peaceful woodland sanctuary painted in pink and emerald.',
    },
    {
        title: 'Whispers of the Elder Boughs',
        subtitle: 'Ancient Forest Clearing',
        location: 'Ancient Forest',
        category: 'voice',
        pedestalVariant: 'grand_portal',
        importance: 'core',
        description:
            'Towering ancient trees part around a sunlit mossy glade where carved monoliths stand guard over old stories.',
        tags: ['Forest', 'Ancient', 'Trees'],
        people: ['Marcus', 'Liam'],
        groupName: 'Ancient Forest',
        palette: ['#3d9447', '#8c6244', '#a8d472'],
        transcript: '"These trees were already ancient when our grandparents walked this trail."',
        audioLabel: 'Deep forest breeze & birdsong',
        note: 'Sunbeams filter through the high green canopy onto the moss.',
    },
    {
        title: 'Skipping Stones at Stillwater',
        subtitle: 'Pondlands Bank',
        location: 'Riverside / Pondlands',
        category: 'photo',
        pedestalVariant: 'minimal',
        importance: 'cherished',
        description:
            'At the water’s edge, wildflowers lean over smooth river stones while dragonflies skim across the bright blue surface.',
        tags: ['Pondlands', 'Water', 'Summer'],
        people: ['Elena', 'Sora'],
        groupName: 'Riverside / Pondlands',
        palette: ['#5cb8ff', '#57bd5b', '#ffe082'],
        transcript: '"Four skips! That flat slate stone made it all the way to the lilies!"',
        audioLabel: 'Lapping water & summer breeze',
        note: 'Open skies and cool water reflecting the surrounding hills.',
    },
    {
        title: 'Inscriptions of the Forgotten Arch',
        subtitle: 'Ruins of Memory',
        location: 'Ruins of Memory',
        category: 'letter',
        pedestalVariant: 'grand_portal',
        importance: 'core',
        description:
            'Weathered rock pillars and an ancient stone entrance frame this quiet sanctuary where time seems to stand still.',
        tags: ['Ruins', 'Monolith', 'Ancient'],
        people: ['Liam', 'Elena'],
        groupName: 'Ruins of Memory',
        palette: ['#8b97a8', '#70e5ff', '#4b8f52'],
        transcript: '"Each carved pillar marks a vow that refused to fade with the seasons."',
        audioLabel: 'Resonant stone echo & soft wind',
        note: 'Even weathered stone remembers the hands that shaped it.',
    },
    {
        title: 'Starlight Around the Campfire',
        subtitle: 'Woodland Campsite',
        location: 'Woodland Campsite',
        category: 'music',
        pedestalVariant: 'minimal',
        importance: 'cherished',
        description:
            'Beside the canvas tent and wooden traveler cart, a warm lantern illuminates notes pinned to the trail notice board.',
        tags: ['Campsite', 'Lantern', 'Travelers'],
        people: ['Elena', 'Marcus', 'Sora', 'Liam'],
        groupName: 'Woodland Campsite',
        palette: ['#ffbe5c', '#549e4b', '#8c5a3c'],
        transcript: '"Let’s leave a note on the board for the next wanderer who rests here."',
        audioLabel: 'Crackling campfire & acoustic hum',
        note: 'A welcoming clearing for every traveler crossing the woodland.',
    },
];

function getProceduralMemoryForChunk(
    cx: number,
    cz: number,
    worldSeed: string
): MemoryItem | null {
    // Origin chunk (0, 0) uses the fixed Keepsake Village memories
    if (cx === 0 && cz === 0) return null;

    // Spawn a pedestal in roughly 60% of outer chunks so pedestals feel special, not spammed
    const spawnRoll = hash2D(cx, cz, 701);
    if (spawnRoll > 0.62) return null;

    const worldOriginX = cx * CHUNK_SIZE;
    const worldOriginZ = cz * CHUNK_SIZE;
    const biomeSample = getBiomeSampleAt(worldOriginX, worldOriginZ);

    // Map biome directly to its matching thematic memory template
    const biomeTemplateIndex: Record<string, number> = {
        blossom_grove: 0,
        evergreen_forest: 1,
        meadow: 2,
        ancient_ruins: 3,
        explorers_rest: 4,
    };

    const templateIdx =
        biomeTemplateIndex[biomeSample.primary] ??
        Math.floor(hash2D(cx, cz, 709) * PROCEDURAL_MEMORY_TEMPLATES.length) %
            PROCEDURAL_MEMORY_TEMPLATES.length;

    const template = PROCEDURAL_MEMORY_TEMPLATES[templateIdx];

    // Place thoughtfully near the biome's natural clearing or trailside
    const offsetAngle = hash2D(cx, cz, 719) * Math.PI * 2;
    const offsetDist = 5.5 + hash2D(cx, cz, 727) * 7.5;
    let wx = worldOriginX + Math.cos(offsetAngle) * offsetDist;
    const wz = worldOriginZ + Math.sin(offsetAngle) * offsetDist;

    // Keep off the immediate center of the walking path
    if (getDistanceToNearestPath(wx, wz) < 3.2) {
        wx += 3.8;
    }

    const wy = getGardenTerrainHeight(wx, wz);

    return {
        id: `mem-proc-${worldSeed}-${cx}-${cz}`,
        title: template.title,
        subtitle: template.subtitle,
        date: `Season ${(Math.abs(cx + cz) % 4) + 1}, 2024`,
        location: template.location,
        category: template.category,
        pedestalVariant: template.pedestalVariant,
        importance: template.importance,
        growthStage: 'tree',
        interactionState: 'dormant',
        description: template.description,
        position: [wx, wy, wz],
        chunkKey: `${cx}_${cz}`,
        rotationY: hash2D(cx, cz, 733) * Math.PI * 2,
        tags: template.tags,
        people: template.people,
        groupName: template.groupName,
        echo: {
            floatingPhotoTitle: template.title,
            floatingPhotoPalette: template.palette,
            voiceTranscript: template.transcript,
            ambientAudioLabel: template.audioLabel,
            writtenNote: template.note,
        },
    };
}

interface PedestalInstanceProps {
    memory: MemoryItem;
    isNearby: boolean;
    isEchoing: boolean;
    isDiscovered: boolean;
    onSelect: (memory: MemoryItem) => void;
}

const PedestalInstance: React.FC<PedestalInstanceProps> = React.memo(
    ({ memory, isNearby, isEchoing, isDiscovered, onSelect }) => {
        const ringRef = useRef<THREE.Mesh>(null);
        const outerHaloRef = useRef<THREE.Mesh>(null);
        const pointLightRef = useRef<THREE.PointLight>(null);

        useFrame(({ clock }, delta) => {
            const t = clock.getElapsedTime();
            if (ringRef.current) {
                ringRef.current.rotation.z = t * 0.45;
                const s = isNearby || isEchoing ? 1.12 + Math.sin(t * 3.5) * 0.05 : 0.95;
                ringRef.current.scale.setScalar(s);
            }
            if (outerHaloRef.current) {
                const pulse = 1.0 + Math.sin(t * 2.2) * 0.06;
                outerHaloRef.current.scale.setScalar(pulse);
            }
            if (pointLightRef.current) {
                const targetIntensity = isEchoing
                    ? 2.2
                    : isNearby
                        ? 1.55
                        : isDiscovered
                            ? 0.85
                            : 0.65;
                pointLightRef.current.intensity = THREE.MathUtils.lerp(
                    pointLightRef.current.intensity,
                    targetIntensity,
                    delta * 5
                );
            }
        });

        const variant: PedestalVariant = memory.pedestalVariant || 'minimal';

        return (
            <group
                position={memory.position}
                rotation={[0, memory.rotationY || 0, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(memory);
                }}
            >
                <PedestalModelSelector
                    variant={variant}
                    category={memory.category}
                    growthStage={memory.growthStage || 'plant'}
                    isNearby={isNearby}
                    isEchoing={isEchoing}
                    isDiscovered={isDiscovered}
                />

                {/* Subtle Ground Starlight Ring */}
                <mesh
                    ref={ringRef}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.05, 0]}
                >
                    <ringGeometry args={[0.92, 1.04, 32]} />
                    <meshBasicMaterial
                        color={isNearby ? '#fff5cc' : THEME.colors.memoryGold}
                        transparent
                        opacity={isNearby || isEchoing ? 0.75 : 0.28}
                        side={THREE.DoubleSide}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>

                {/* Soft Ground Shimmer Disc */}
                <mesh
                    ref={outerHaloRef}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.03, 0]}
                >
                    <circleGeometry args={[1.35, 24]} />
                    <meshBasicMaterial
                        color={THEME.colors.memoryGold}
                        transparent
                        opacity={isNearby || isEchoing ? 0.18 : 0.07}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>

                {/* Gentle Point Light around the Memory Crystal */}
                <pointLight
                    ref={pointLightRef}
                    position={[0, 1.45, 0]}
                    color="#ffe299"
                    intensity={0.75}
                    distance={6.5}
                    decay={2}
                />
            </group>
        );
    }
);

export const MemoryPedestals: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const activeModal = useGameStore((state) => state.activeModal);
    const worldSeed = useGameStore((state) => state.worldSeed);
    const activeChunkCoord = useGameStore((state) => state.activeChunkCoord);
    const persistentMemories = useGameStore((state) => state.persistentMemories);
    const registerPersistentMemories = useGameStore(
        (state) => state.registerPersistentMemories
    );
    const nearbyMemory = useGameStore((state) => state.nearbyMemory);
    const setNearbyMemory = useGameStore((state) => state.setNearbyMemory);
    const landmarkZones = useGameStore((state) => state.landmarkZones);
    const setNearbyZone = useGameStore((state) => state.setNearbyZone);
    const openMemory = useGameStore((state) => state.openMemory);
    const activeEchoId = useGameStore((state) => state.activeEchoId);
    const setActiveEchoId = useGameStore((state) => state.setActiveEchoId);
    const discoveredIds = useGameStore((state) => state.discoveredIds);

    // Build initial Village Memories whenever worldSeed initializes or changes
    useEffect(() => {
        const computed: MemoryItem[] = INITIAL_MEMORIES.map((item) => {
            const [x, z] = item.xz;
            const y = getGardenTerrainHeight(x, z);
            return {
                ...item,
                position: [x, y, z],
            };
        });
        registerPersistentMemories(computed, true);
    }, [registerPersistentMemories, worldSeed]);

    // Merge Village Memories with deterministic procedural memories in active chunks
    const allActiveMemories = useMemo(() => {
        const list = [...persistentMemories];
        const existingIds = new Set(list.map((m) => m.id));

        for (let dx = -ACTIVE_CHUNK_RADIUS; dx <= ACTIVE_CHUNK_RADIUS; dx++) {
            for (let dz = -ACTIVE_CHUNK_RADIUS; dz <= ACTIVE_CHUNK_RADIUS; dz++) {
                const cx = activeChunkCoord[0] + dx;
                const cz = activeChunkCoord[1] + dz;
                const procMem = getProceduralMemoryForChunk(cx, cz, worldSeed);
                if (procMem && !existingIds.has(procMem.id)) {
                    list.push(procMem);
                    existingIds.add(procMem.id);
                }
            }
        }
        return list;
    }, [persistentMemories, activeChunkCoord, worldSeed]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (phase !== 'exploring' || activeModal !== 'none') return;

            if (e.code === 'KeyE' && nearbyMemory) {
                e.preventDefault();
                if (activeEchoId !== nearbyMemory.id) {
                    setActiveEchoId(nearbyMemory.id);
                } else {
                    openMemory(nearbyMemory);
                }
            } else if (e.code === 'KeyF' && nearbyMemory) {
                e.preventDefault();
                openMemory(nearbyMemory);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        phase,
        activeModal,
        nearbyMemory,
        activeEchoId,
        setActiveEchoId,
        openMemory,
    ]);

    useFrame(() => {
        if (phase !== 'exploring') return;
        const [px, , pz] = playerTelemetry.position;

        let closestMem: MemoryItem | null = null;
        let closestDist = 3.5;

        for (let i = 0; i < allActiveMemories.length; i++) {
            const mem = allActiveMemories[i];
            const d = Math.hypot(px - mem.position[0], pz - mem.position[2]);
            if (d < closestDist) {
                closestDist = d;
                closestMem = mem;
            }
        }

        setNearbyMemory(closestMem);

        let closestZone = null;
        let closestZoneDist = 999;
        for (let i = 0; i < landmarkZones.length; i++) {
            const z = landmarkZones[i];
            const d = Math.hypot(px - z.position[0], pz - z.position[2]);
            if (d <= z.radius && d < closestZoneDist) {
                closestZoneDist = d;
                closestZone = z;
            }
        }
        setNearbyZone(closestZone);
    });

    return (
        <group>
            {allActiveMemories.map((mem) => (
                <PedestalInstance
                    key={mem.id}
                    memory={mem}
                    isNearby={nearbyMemory?.id === mem.id}
                    isEchoing={activeEchoId === mem.id}
                    isDiscovered={discoveredIds.includes(mem.id)}
                    onSelect={(m) => openMemory(m)}
                />
            ))}
        </group>
    );
};

