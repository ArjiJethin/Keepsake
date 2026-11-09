// src/store/useGameStore.ts
import { create } from 'zustand';
import type { MemoryItem } from '../systems/MemoryManager/memoryTypes';

export type AppPhase = 'loading' | 'intro' | 'exploring';
export type QualityPreset = 'high' | 'low';
export type ActiveModal = 'none' | 'memory' | 'journal' | 'friends' | 'settings' | 'createMemory';

interface GameState {
    phase: AppPhase;
    setPhase: (phase: AppPhase) => void;

    quality: QualityPreset;
    toggleQuality: () => void;

    nearbyMemory: MemoryItem | null;
    setNearbyMemory: (memory: MemoryItem | null) => void;

    activeMemory: MemoryItem | null;
    openMemory: (memory: MemoryItem) => void;
    closeMemory: () => void;

    activeModal: ActiveModal;
    setActiveModal: (modal: ActiveModal) => void;

    discoveredIds: string[];
    markDiscovered: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
    // Starts at 'loading' so the Phase 2 animated intro sequence plays on launch
    phase: 'loading',
    setPhase: (phase) => set({ phase }),

    quality: 'high',
    toggleQuality: () =>
        set((state) => ({
            quality: state.quality === 'high' ? 'low' : 'high',
        })),

    nearbyMemory: null,
    setNearbyMemory: (memory) => set({ nearbyMemory: memory }),

    activeMemory: null,
    openMemory: (memory) =>
        set((state) => ({
            activeMemory: memory,
            activeModal: 'memory',
            discoveredIds: state.discoveredIds.includes(memory.id)
                ? state.discoveredIds
                : [...state.discoveredIds, memory.id],
        })),
    closeMemory: () => set({ activeMemory: null, activeModal: 'none' }),

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