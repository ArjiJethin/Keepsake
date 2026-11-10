// src/store/useGameStore.ts
import { create } from 'zustand';
import type {
    EnvironmentLandmarkZone,
    MemoryItem,
} from '../systems/MemoryManager/memoryTypes';

export type AppPhase = 'loading' | 'intro' | 'exploring';
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

/**
 * High-frequency 60fps mutable telemetry shared across Three.js systems
 */
export const playerTelemetry = {
    position: [0, 0, 7.5] as [number, number, number],
    velocity: [0, 0, 0] as [number, number, number],
    rotationY: Math.PI,
    cameraYaw: 0,
    cameraPitch: 0.22,
    cameraDistance: 5.2,
    isGrounded: true,
    moveState: 'idle' as 'idle' | 'walk' | 'run' | 'jump',
    nearestMemoryDistance: 999,
};

interface GameState {
    phase: AppPhase;
    setPhase: (phase: AppPhase) => void;

    introStage: IntroStage;
    setIntroStage: (stage: IntroStage) => void;

    quality: QualityPreset;
    toggleQuality: () => void;

    // Selectable Explorer Model ('female' = Character Model F, 'male' = Character Model M)
    characterModel: CharacterArchetype;
    setCharacterModel: (model: CharacterArchetype) => void;
    toggleCharacterModel: () => void;

    // Pointer Lock & Alt UI Cursor Mode
    isPointerLocked: boolean;
    setPointerLocked: (locked: boolean) => void;
    isAltCursorMode: boolean;
    setAltCursorMode: (active: boolean) => void;

    // Infinite Chunk Tracking
    activeChunkCoord: [number, number];
    setActiveChunkCoord: (coord: [number, number]) => void;

    // Persistent Memory Entities (Survive Chunk Unloads)
    persistentMemories: MemoryItem[];
    registerPersistentMemories: (memories: MemoryItem[]) => void;
    advanceMemoryGrowth: (id: string) => void;

    // Future Interactive Environment Zones
    landmarkZones: EnvironmentLandmarkZone[];
    nearbyZone: EnvironmentLandmarkZone | null;
    setNearbyZone: (zone: EnvironmentLandmarkZone | null) => void;

    // Proximity & Active Echo Interaction
    nearbyMemory: MemoryItem | null;
    setNearbyMemory: (memory: MemoryItem | null) => void;

    activeMemory: MemoryItem | null;
    openMemory: (memory: MemoryItem) => void;
    closeMemory: () => void;

    activeEchoId: string | null;
    setActiveEchoId: (id: string | null) => void;

    lastInteractedId: string | null;
    triggerMemoryPulse: (id: string) => void;

    activeModal: ActiveModal;
    setActiveModal: (modal: ActiveModal) => void;

    discoveredIds: string[];
    markDiscovered: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
    phase: 'loading',
    setPhase: (phase) => set({ phase }),

    introStage: 1,
    setIntroStage: (introStage) => set({ introStage }),

    quality: 'high',
    toggleQuality: () =>
        set((state) => ({
            quality: state.quality === 'high' ? 'low' : 'high',
        })),

    characterModel: 'female',
    setCharacterModel: (characterModel) => set({ characterModel }),
    toggleCharacterModel: () =>
        set((state) => ({
            characterModel: state.characterModel === 'female' ? 'male' : 'female',
        })),

    isPointerLocked: false,
    setPointerLocked: (isPointerLocked) => set({ isPointerLocked }),
    isAltCursorMode: false,
    setAltCursorMode: (isAltCursorMode) => set({ isAltCursorMode }),

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
    registerPersistentMemories: (memories) =>
        set((state) => {
            if (state.persistentMemories.length > 0) return state;
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

    landmarkZones: [
        {
            id: 'zone-sakura-kinship',
            name: 'Great Sakura Memory Tree',
            zoneType: 'memory_tree',
            position: [6.2, 0, 2.2],
            radius: 5.5,
            description: 'An ancient blossom tree preserving chapters of shared kinship.',
            associatedCollectionId: 'chapter-kinship',
            unlocked: true,
        },
        {
            id: 'zone-western-arch',
            name: 'Threshold of Hidden Pathways',
            zoneType: 'hidden_pathway',
            position: [-6.8, 0, -3.5],
            radius: 4.8,
            description: 'A moss-draped stone gate leading toward distant memory valleys.',
            associatedCollectionId: 'chapter-journeys',
            unlocked: true,
        },
        {
            id: 'zone-reflection-basin',
            name: 'Stillwater Reflection Glade',
            zoneType: 'reflection_pond',
            position: [-1.5, 0, -14.5],
            radius: 5.0,
            description: 'A quiet hollow where past seasons ripple across the surface.',
            unlocked: true,
        },
    ],
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
            lastInteractedId: memory.id,
            discoveredIds: state.discoveredIds.includes(memory.id)
                ? state.discoveredIds
                : [...state.discoveredIds, memory.id],
        })),
    closeMemory: () =>
        set({ activeMemory: null, activeEchoId: null, activeModal: 'none' }),

    activeEchoId: null,
    setActiveEchoId: (activeEchoId) => set({ activeEchoId }),

    lastInteractedId: null,
    triggerMemoryPulse: (id) => set({ lastInteractedId: id }),

    activeModal: 'none',
    setActiveModal: (modal) => set({ activeModal: modal }),

    discoveredIds: [],
    markDiscovered: (id) =>
        set((state) => ({
            discoveredIds: state.discoveredIds.includes(id)
                ? state.discoveredIds
                : [...state.discoveredIds, id],
        })),
}));