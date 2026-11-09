// src/store/useGameStore.ts
import { create } from 'zustand';
import type { MemoryItem } from '../systems/MemoryManager/memoryTypes';

export type AppPhase = 'loading' | 'intro' | 'exploring';
export type IntroStage = 1 | 2 | 3 | 4 | 5 | 6;
export type QualityPreset = 'high' | 'low';
export type ActiveModal = 'none' | 'memory' | 'journal' | 'friends' | 'settings' | 'createMemory';

/**
 * Shared real-time mutable telemetry for 60fps Three.js systems
 * (avoids triggering React re-renders on every frame while player moves).
 */
export const playerTelemetry = {
    position: [0, 0, 7.5] as [number, number, number],
    velocity: [0, 0, 0] as [number, number, number],
    rotationY: Math.PI, // Facing down the garden path (-Z)
    cameraYaw: 0,
    cameraPitch: 0.24,
    cameraDistance: 5.6,
    isGrounded: true,
    moveState: 'idle' as 'idle' | 'walk' | 'run' | 'jump',
};

interface GameState {
    phase: AppPhase;
    setPhase: (phase: AppPhase) => void;

    introStage: IntroStage;
    setIntroStage: (stage: IntroStage) => void;

    quality: QualityPreset;
    toggleQuality: () => void;

    activeChunkCoord: [number, number];
    setActiveChunkCoord: (coord: [number, number]) => void;

    nearbyMemory: MemoryItem | null;
    setNearbyMemory: (memory: MemoryItem | null) => void;

    activeMemory: MemoryItem | null;
    openMemory: (memory: MemoryItem) => void;
    closeMemory: () => void;

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
            activeModal: 'memory',
            lastInteractedId: memory.id,
            discoveredIds: state.discoveredIds.includes(memory.id)
                ? state.discoveredIds
                : [...state.discoveredIds, memory.id],
        })),
    closeMemory: () => set({ activeMemory: null, activeModal: 'none' }),

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