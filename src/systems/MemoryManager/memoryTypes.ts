// src/systems/MemoryManager/memoryTypes.ts

export type MemoryCategory = 'photo' | 'music' | 'video' | 'shrine' | 'voice' | 'letter';

export type MemoryGrowthStage = 'seed' | 'plant' | 'tree' | 'landmark';

export type MemoryImportance = 'whisper' | 'cherished' | 'milestone' | 'core';

export type MemoryInteractionState = 'dormant' | 'nearby' | 'echoing' | 'awakened';

export interface MemoryEchoContent {
    floatingPhotoTitle?: string;
    floatingPhotoPalette?: [string, string, string];
    voiceTranscript?: string;
    ambientAudioLabel?: string;
    writtenNote?: string;
}

export interface MemoryItem {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    location: string;
    category: MemoryCategory;
    description: string;
    position: [number, number, number];
    chunkKey?: string; // Computed dynamically from world position (cx_cz)
    rotationY?: number;
    imageUrl?: string;
    audioDuration?: string;
    tags: string[];
    // Extended Phase 2 Memory Foundations
    people?: string[];
    groupName?: string;
    importance?: MemoryImportance;
    growthStage?: MemoryGrowthStage;
    interactionState?: MemoryInteractionState;
    echo?: MemoryEchoContent;
    isDiscovered?: boolean;
}

export type EnvironmentZoneType =
    | 'memory_tree'
    | 'reflection_pond'
    | 'memory_cave'
    | 'lantern_release'
    | 'hidden_pathway';

export interface EnvironmentLandmarkZone {
    id: string;
    name: string;
    zoneType: EnvironmentZoneType;
    position: [number, number, number];
    radius: number;
    description: string;
    associatedCollectionId?: string;
    unlocked: boolean;
}