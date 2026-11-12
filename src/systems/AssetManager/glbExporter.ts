// src/systems/AssetManager/glbExporter.ts
import type * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export interface AssetManifestEntry {
    id: string;
    name: string;
    category:
    | 'characters'
    | 'memory-pedestals'
    | 'vegetation'
    | 'rocks'
    | 'water'
    | 'bridges'
    | 'structures'
    | 'memory-elements'
    | 'world-props'
    | 'ambient-details';
    filename: string;
    dimensions: string;
    worldCoords: [number, number]; // [x, z] in the Sanctuary for instant inspection
    intendedUse: string;
}

/**
 * Verified 17-Asset Binary GLB Manifest matching public/ directory structure.
 */
export const KEEPSAKE_ASSET_MANIFEST: AssetManifestEntry[] = [
    {
        id: 'memory-wanderer-female',
        name: '01. The Memory Wanderer — Female',
        category: 'characters',
        filename: '/KeepSakeFemale-v2-animated.glb',
        dimensions: '0.88m × 1.74m × 0.72m',
        worldCoords: [0, 7.5],
        intendedUse:
            'Default female explorer character with rigged skeleton (Walk_2, Sprint, Jump_2_RM).',
    },
    {
        id: 'memory-wanderer-male',
        name: '02. The Memory Wanderer — Male',
        category: 'characters',
        filename: '/KeepSakeMale-v2-animated.glb',
        dimensions: '0.70m × 1.74m × 0.47m',
        worldCoords: [0, 7.5],
        intendedUse:
            'Playable male explorer character with rigged skeleton (Walk, Sprint, Jump_2_RM).',
    },
    {
        id: 'minimal-memory-pedestal-v1',
        name: '03. Memory Pedestal V1 (Minimal Shrine)',
        category: 'memory-pedestals',
        filename: '/models/MemElements/Pedestals/KeepSakePedestalV1-v1.glb',
        dimensions: '1.8m × 2.15m × 1.8m',
        worldCoords: [5.2, 7.2],
        intendedUse:
            'Compact carved sandstone memorial altar supporting floating memory crystals.',
    },
    {
        id: 'arched-memory-pedestal-v2',
        name: '04. Memory Pedestal V2 (Arched Shrine)',
        category: 'memory-pedestals',
        filename: '/models/MemElements/Pedestals/KeepSakePedestalV2-v1.glb',
        dimensions: '2.6m × 2.95m × 2.6m',
        worldCoords: [-7.4, 4.0],
        intendedUse:
            'Weathered tiered stone altar with curved stone arch arm and orbital ring.',
    },
    {
        id: 'grand-memory-pedestal-v3',
        name: '05. Memory Pedestal V3 (Grand Portal)',
        category: 'memory-pedestals',
        filename: '/models/MemElements/Pedestals/KeepSakePedestalV3-v1.glb',
        dimensions: '3.8m × 3.5m × 3.8m',
        worldCoords: [2.85, 5.8],
        intendedUse:
            'Grand monolithic stone portal for core milestone memory discoveries.',
    },
    {
        id: 'wooden-noticeboard',
        name: '06. Wooden Memory Notice Board',
        category: 'memory-elements',
        filename: '/models/MemElements/KeepSakeNoticeBoard.glb',
        dimensions: '2.2m × 2.35m × 0.6m',
        worldCoords: [6.2, 26.0],
        intendedUse:
            "Low-poly wooden notice board placed at trailheads and Explorer's Rest clearings.",
    },
    {
        id: 'street-lamp',
        name: '07. Garden Street Lamp & Lantern',
        category: 'memory-elements',
        filename: '/models/MemElements/StreetLamp/KeepSakeLamp-v1.glb',
        dimensions: '0.9m × 2.85m × 0.6m',
        worldCoords: [4.6, 15.8],
        intendedUse:
            'Stylized wooden lamp post with hanging lantern emitting warm golden light along winding trails.',
    },
    {
        id: 'campsite-tent',
        name: '08. Explorer Campsite Tent',
        category: 'world-props',
        filename: '/models/Props/KeepSakeTent.glb',
        dimensions: '2.6m × 2.35m × 2.8m',
        worldCoords: [5.2, -10.5],
        intendedUse:
            "Canvas explorer tent anchoring the Explorer's Rest biome and Sanctuary campsite.",
    },
    {
        id: 'wooden-vehicle-cart',
        name: '09. Traveler Wooden Cargo Cart',
        category: 'world-props',
        filename: '/models/Props/KeepSakeWoodenVehicle.glb',
        dimensions: '2.2m × 1.55m × 1.4m',
        worldCoords: [19.0, -13.0],
        intendedUse:
            "Two-wheeled wooden carriage loaded with traveler crates in Explorer's Rest areas.",
    },
    {
        id: 'japanese-entrance-gate',
        name: '10. Japanese Torii Entrance Gate',
        category: 'structures',
        filename: '/models/Structures/KeepSakeEntranceJapanese.glb',
        dimensions: '4.6m × 4.4m × 1.2m',
        worldCoords: [-0.6, -10.2],
        intendedUse:
            'Iconic vermilion Torii entrance gate framing sacred Memory Sanctuary & Meadow thresholds.',
    },
    {
        id: 'rock-entrance-archway',
        name: '11. Ancient Carved Rock Entrance',
        category: 'structures',
        filename: '/models/Structures/KeepSakeRockEntrance.glb',
        dimensions: '4.8m × 5.4m × 2.2m',
        worldCoords: [-6.8, -3.5],
        intendedUse:
            'Ancient carved stone archway marking transitions into the Ancient Ruins biome.',
    },
    {
        id: 'rock-house-cottage',
        name: '12. Storybook Stone Cottage',
        category: 'structures',
        filename: '/models/Structures/KeepSakeRockHouse-compressed.glb',
        dimensions: '5.2m × 4.2m × 5.2m',
        worldCoords: [11.5, -6.5],
        intendedUse:
            "Quaint stone and timber cottage landmark in the Sanctuary and Explorer's Rest biome.",
    },
    {
        id: 'rock-pillar',
        name: '13. Standing Monolith Rock Pillar',
        category: 'structures',
        filename: '/models/Structures/KeepSakeRockPiller.glb',
        dimensions: '1.2m × 3.1m × 1.2m',
        worldCoords: [-18.2, 9.6],
        intendedUse:
            'Standing monolith stone pillar marking perimeter boundaries and Ancient Ruins.',
    },
    {
        id: 'memory-flower-v1',
        name: '14. Memory Blossom Flower (Variant 1)',
        category: 'vegetation',
        filename: '/models/Vegetation/Flowers/KeepSakeFlower-v1.glb',
        dimensions: '0.55m × 0.62m × 0.55m',
        worldCoords: [-3.4, 10.8],
        intendedUse:
            'Blooming memory blossom clustered around Blossom Grove landmarks and shrines.',
    },
    {
        id: 'memory-flower-v2',
        name: '15. Bioluminescent Bell Flower (Variant 2)',
        category: 'vegetation',
        filename: '/models/Vegetation/Flowers/KeepSakeFlowerV2-v1.glb',
        dimensions: '0.55m × 0.62m × 0.55m',
        worldCoords: [14.2, 11.5],
        intendedUse:
            'Bell-shaped memory flower illuminating Golden Meadow and Blossom Grove clearings.',
    },
    {
        id: 'monumental-blossom-tree',
        name: '16. Monumental Ancient Blossom Tree',
        category: 'vegetation',
        filename: '/models/Vegetation/KeepSakeHugeTree.glb',
        dimensions: '8.5m × 9.2m × 8.5m',
        worldCoords: [6.2, 2.2],
        intendedUse:
            'Colossal ancient flowering tree acting as the focal landmark of Blossom Grove biomes.',
    },
    {
        id: 'monumental-evergreen-tree',
        name: '17. Monumental Great Evergreen Tree',
        category: 'vegetation',
        filename: '/models/Vegetation/KeepSakeHugeTreeGreen.glb',
        dimensions: '8.5m × 9.4m × 8.5m',
        worldCoords: [-11.5, 4.8],
        intendedUse:
            'Towering green canopy elder tree anchoring Evergreen Forest biome clearings.',
    },
];

export function exportObjectToGLB(
    object3D: THREE.Object3D,
    filename: string
): void {
    const exporter = new GLTFExporter();
    exporter.parse(
        object3D,
        (result) => {
            if (result instanceof ArrayBuffer) {
                const blob = new Blob([result], {
                    type: 'model/gltf-binary',
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename.split('/').pop() || 'asset.glb';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        },
        (error) => {
            console.error('GLB Export Error:', error);
        },
        { binary: true }
    );
}