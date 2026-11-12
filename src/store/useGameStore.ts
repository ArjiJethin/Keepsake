// src/store/useGameStore.ts
import { create } from 'zustand';
import type {
    EnvironmentLandmarkZone,
    MemoryItem,
} from '../systems/MemoryManager/memoryTypes';
import {
    type BiomeType,
    generateNewSeedString,
    getGardenTerrainHeight,
    getWorldSeed,
    setWorldSeedGlobal,
} from '../scenes/Environment/lowPolyUtils';

export type AppPhase =
    | 'loading'
    | 'intro'
    | 'characterSelect'
    | 'exploring';
export type IntroStage = 1 | 2 | 3 | 4 | 5 | 6;
export type QualityPreset = 'high' | 'low';
export type CharacterArchetype = 'female' | 'male';
export type ActiveModal =
    | 'none'
    | 'memory'
    | 'journal'
    | 'friends'
    | 'settings'
    | 'createMemory';

export type InputMode = 'camera' | 'cursor';

export const playerTelemetry = {
    position: [0, 0, 7.5] as [number, number, number],
    velocity: [0, 0, 0] as [number, number, number],
    rotationY: Math.PI,
    cameraYaw: 0,
    cameraPitch: 0.18,
    cameraDistance: 4.35,
    isGrounded: true,
    moveState: 'idle' as 'idle' | 'walk' | 'run' | 'jump',
    nearestMemoryDistance: 999,
    nearestMemoryPosition: [0, 0, 0] as [number, number, number],
    nearestMemoryRadiance: 0,
    // Shared virtual joystick state (-1..1 for x and y) consumed by PlayerCharacter
    joystick: {
        x: 0,
        y: 0,
        active: false,
    },
};

function detectDefaultQuality(): QualityPreset {
    if (typeof window === 'undefined') return 'high';
    const isSmallTouch =
        window.matchMedia?.('(pointer: coarse)').matches &&
        window.innerWidth < 900;
    const lowCores =
        typeof navigator !== 'undefined' &&
        navigator.hardwareConcurrency !== undefined &&
        navigator.hardwareConcurrency <= 4;
    return isSmallTouch || lowCores ? 'low' : 'high';
}

interface GameState {
    phase: AppPhase;
    setPhase: (phase: AppPhase) => void;

    introStage: IntroStage;
    setIntroStage: (stage: IntroStage) => void;
    introSeen: boolean;
    markIntroSeen: () => void;

    quality: QualityPreset;
    toggleQuality: () => void;

    // Deterministic World Seed & Biome State
    worldSeed: string;
    setWorldSeed: (seed: string) => void;
    regenerateWorldSeed: () => string;
    currentBiome: BiomeType;
    setCurrentBiome: (biome: BiomeType) => void;

    // Input Mode FSM (Mutually exclusive: camera mode vs cursor mode)
    inputMode: InputMode;
    setInputMode: (mode: InputMode) => void;
    toggleInputMode: () => void;

    // Character selection
    characterModel: CharacterArchetype;
    setCharacterModel: (model: CharacterArchetype) => void;
    toggleCharacterModel: () => void;

    // Terrain generation & ready state
    isInitialTerrainReady: boolean;
    setInitialTerrainReady: (ready: boolean) => void;
    activeChunkCoord: [number, number];
    setActiveChunkCoord: (coord: [number, number]) => void;

    // Persistent memory storage
    persistentMemories: MemoryItem[];
    registerPersistentMemories: (memories: MemoryItem[], forceReplace?: boolean) => void;
    advanceMemoryGrowth: (id: string) => void;
    addNewMemory: (memory: MemoryItem) => void;

    // Landmark zones
    landmarkZones: EnvironmentLandmarkZone[];
    setLandmarkZones: (zones: EnvironmentLandmarkZone[]) => void;
    nearbyZone: EnvironmentLandmarkZone | null;
    setNearbyZone: (zone: EnvironmentLandmarkZone | null) => void;

    // Memory interaction
    nearbyMemory: MemoryItem | null;
    setNearbyMemory: (memory: MemoryItem | null) => void;

    activeMemory: MemoryItem | null;
    openMemory: (memory: MemoryItem) => void;
    closeMemory: () => void;

    activeEchoId: string | null;
    setActiveEchoId: (id: string | null) => void;

    activeModal: ActiveModal;
    setActiveModal: (modal: ActiveModal) => void;

    discoveredIds: string[];
    markDiscovered: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
    phase: 'loading',
    setPhase: (phase) =>
        set({
            phase,
            inputMode: phase === 'exploring' ? 'camera' : 'cursor',
        }),

    introStage: 1,
    setIntroStage: (introStage) => set({ introStage }),
    introSeen: false,
    markIntroSeen: () => set({ introSeen: true }),

    quality: detectDefaultQuality(),
    toggleQuality: () =>
        set((state) => ({
            quality: state.quality === 'high' ? 'low' : 'high',
        })),

    worldSeed: getWorldSeed(),
    setWorldSeed: (newSeed: string) => {
        const applied = setWorldSeedGlobal(newSeed);
        const spawnY = getGardenTerrainHeight(0, 7.5);
        playerTelemetry.position = [0, spawnY, 7.5];
        playerTelemetry.velocity = [0, 0, 0];
        playerTelemetry.rotationY = Math.PI;
        playerTelemetry.joystick.x = 0;
        playerTelemetry.joystick.y = 0;
        playerTelemetry.joystick.active = false;
        set({
            worldSeed: applied,
            activeChunkCoord: [0, 0],
            currentBiome: 'memory_sanctuary',
            nearbyMemory: null,
            nearbyZone: null,
            activeMemory: null,
            activeEchoId: null,
        });
    },
    regenerateWorldSeed: () => {
        const generated = generateNewSeedString();
        const applied = setWorldSeedGlobal(generated);
        const spawnY = getGardenTerrainHeight(0, 7.5);
        playerTelemetry.position = [0, spawnY, 7.5];
        playerTelemetry.velocity = [0, 0, 0];
        playerTelemetry.rotationY = Math.PI;
        playerTelemetry.joystick.x = 0;
        playerTelemetry.joystick.y = 0;
        playerTelemetry.joystick.active = false;
        set({
            worldSeed: applied,
            activeChunkCoord: [0, 0],
            currentBiome: 'memory_sanctuary',
            nearbyMemory: null,
            nearbyZone: null,
            activeMemory: null,
            activeEchoId: null,
            discoveredIds: [],
        });
        return applied;
    },

    currentBiome: 'memory_sanctuary',
    setCurrentBiome: (biome) =>
        set((state) => {
            if (state.currentBiome === biome) return state;
            return { currentBiome: biome };
        }),

    inputMode: 'cursor',
    setInputMode: (inputMode) => set({ inputMode }),
    toggleInputMode: () =>
        set((state) => ({
            inputMode: state.inputMode === 'camera' ? 'cursor' : 'camera',
        })),

    characterModel: 'female',
    setCharacterModel: (characterModel) => set({ characterModel }),
    toggleCharacterModel: () =>
        set((state) => ({
            characterModel: state.characterModel === 'female' ? 'male' : 'female',
        })),

    isInitialTerrainReady: false,
    setInitialTerrainReady: (isInitialTerrainReady) =>
        set({ isInitialTerrainReady }),

    activeChunkCoord: [0, 0],
    setActiveChunkCoord: (coord) =>
        set((state) => {
            if (
                state.activeChunkCoord[0] === coord[0] &&
                state.activeChunkCoord[1] === coord[1]
            ) {
                return state;
            }
            return { activeChunkCoord: coord };
        }),

    persistentMemories: [],
    registerPersistentMemories: (memories, forceReplace = false) =>
        set((state) => {
            if (state.persistentMemories.length > 0 && !forceReplace) return state;
            return { persistentMemories: memories };
        }),

    advanceMemoryGrowth: (id) =>
        set((state) => ({
            persistentMemories: state.persistentMemories.map((m) => {
                if (m.id !== id) return m;
                const order: Array<MemoryItem['growthStage']> = [
                    'seed',
                    'plant',
                    'tree',
                    'landmark',
                ];
                const idx = order.indexOf(m.growthStage || 'seed');
                const nextStage = order[Math.min(idx + 1, order.length - 1)];
                return {
                    ...m,
                    growthStage: nextStage,
                    interactionState: 'awakened',
                    isDiscovered: true,
                };
            }),
        })),

    addNewMemory: (memory) =>
        set((state) => ({
            persistentMemories: [memory, ...state.persistentMemories],
            discoveredIds: [...state.discoveredIds, memory.id],
        })),

    landmarkZones: [
        {
            id: 'zone-sakura-kinship',
            name: 'Great Sakura Memory Tree',
            zoneType: 'memory_tree',
            position: [6.2, 0, 2.2],
            radius: 6.0,
            description: 'An ancient blossom tree preserving chapters of shared kinship.',
            associatedCollectionId: 'chapter-kinship',
            unlocked: true,
        },
        {
            id: 'zone-western-arch',
            name: 'Threshold of Hidden Pathways',
            zoneType: 'hidden_pathway',
            position: [-6.8, 0, -3.5],
            radius: 5.2,
            description: 'A moss-draped stone gate leading toward distant memory valleys.',
            associatedCollectionId: 'chapter-journeys',
            unlocked: true,
        },
        {
            id: 'zone-reflection-basin',
            name: 'Stillwater Reflection Glade',
            zoneType: 'reflection_pond',
            position: [-5.8, 0, -14.2],
            radius: 5.5,
            description: 'A quiet hollow where past seasons ripple across the surface.',
            unlocked: true,
        },
    ],
    setLandmarkZones: (landmarkZones) => set({ landmarkZones }),
    nearbyZone: null,
    setNearbyZone: (zone) =>
        set((state) => {
            if (state.nearbyZone?.id === zone?.id) return state;
            return { nearbyZone: zone };
        }),

    nearbyMemory: null,
    setNearbyMemory: (memory) =>
        set((state) => {
            if (state.nearbyMemory?.id === memory?.id) return state;
            return { nearbyMemory: memory };
        }),

    activeMemory: null,
    openMemory: (memory) =>
        set((state) => ({
            activeMemory: memory,
            activeEchoId: memory.id,
            activeModal: 'memory',
            inputMode: 'cursor',
            discoveredIds: state.discoveredIds.includes(memory.id)
                ? state.discoveredIds
                : [...state.discoveredIds, idOf(memory)],
        })),
    closeMemory: () =>
        set({
            activeMemory: null,
            activeEchoId: null,
            activeModal: 'none',
            inputMode: 'camera',
        }),

    activeEchoId: null,
    setActiveEchoId: (activeEchoId) => set({ activeEchoId }),

    activeModal: 'none',
    setActiveModal: (activeModal) =>
        set({
            activeModal,
            inputMode: activeModal === 'none' ? 'camera' : 'cursor',
        }),

    discoveredIds: [],
    markDiscovered: (id) =>
        set((state) => ({
            discoveredIds: state.discoveredIds.includes(id)
                ? state.discoveredIds
                : [...state.discoveredIds, id],
        })),
}));

function idOf(memory: MemoryItem): string {
    return memory.id;
}
