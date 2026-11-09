// src/systems/MemoryManager/memoryTypes.ts

export type MemoryCategory = 'photo' | 'music' | 'video' | 'shrine';

export interface MemoryItem {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    location: string;
    category: MemoryCategory;
    description: string;
    position: [number, number, number];
    rotationY?: number;
    imageUrl?: string;
    audioDuration?: string;
    tags: string[];
    isDiscovered?: boolean;
}