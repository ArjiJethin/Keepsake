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

export const KEEPSAKE_ASSET_MANIFEST: AssetManifestEntry[] = [
    {
        id: 'memory-wanderer',
        name: 'The Memory Wanderer (Protagonist)',
        category: 'characters',
        filename: 'assets/characters/memory-wanderer.glb',
        dimensions: '0.85m × 1.75m × 0.72m',
        worldCoords: [0, 7.5],
        intendedUse: 'Main single-player explorer with articulated rig, poncho, scarf, goggles & lantern.',
    },
    {
        id: 'grand-memory-portal',
        name: 'A. Grand Memory Portal',
        category: 'memory-pedestals',
        filename: 'assets/memory-pedestals/grand-memory-portal.glb',
        dimensions: '3.8m × 3.6m × 3.8m',
        worldCoords: [2.85, 5.8],
        intendedUse: 'Core milestone memory portal with broken circular stone arch, dual banners & crystal.',
    },
    {
        id: 'minimal-memory-pedestal',
        name: 'B. Minimal Memory Pedestal',
        category: 'memory-pedestals',
        filename: 'assets/memory-pedestals/minimal-memory-pedestal.glb',
        dimensions: '1.8m × 2.3m × 1.8m',
        worldCoords: [1.65, 7.5],
        intendedUse: 'Compact trailside memory pedestal with single red floral banner & floating crystal.',
    },
    {
        id: 'arched-memory-pedestal',
        name: 'C. Arched Memory Pedestal',
        category: 'memory-pedestals',
        filename: 'assets/memory-pedestals/arched-memory-pedestal.glb',
        dimensions: '2.6m × 3.1m × 2.6m',
        worldCoords: [-3.6, 4.4],
        intendedUse: 'Medium memory shrine with partial curved stone arch arm, vines & orbiting ring.',
    },
    {
        id: 'cozy-cottage',
        name: 'Cozy Storybook Cottage',
        category: 'structures',
        filename: 'assets/structures/cozy-cottage.glb',
        dimensions: '5.4m × 4.2m × 5.4m',
        worldCoords: [8.5, -4.2],
        intendedUse: 'Sanctuary dwelling landmark with warm lit windows and timber-framed stone walls.',
    },
    {
        id: 'red-torii-gate',
        name: 'Red Wooden Torii Gate',
        category: 'structures',
        filename: 'assets/structures/red-torii-gate.glb',
        dimensions: '4.6m × 4.4m × 1.2m',
        worldCoords: [-0.6, -7.2],
        intendedUse: 'Pathway threshold landmark with hanging floral emblem banner.',
    },
    {
        id: 'reflection-pond-bridge',
        name: 'Reflection Pond & Arched Bridge',
        category: 'water',
        filename: 'assets/water/reflection-pond.glb',
        dimensions: '7.2m × 1.8m × 7.2m',
        worldCoords: [-5.8, -10.8],
        intendedUse: 'Turquoise reflection basin spanned by a curved wooden arched bridge.',
    },
    {
        id: 'campsite-tent-fire',
        name: 'Explorer Campsite Tent & Campfire',
        category: 'world-props',
        filename: 'assets/world-props/campsite-tent-fire.glb',
        dimensions: '4.2m × 2.4m × 4.5m',
        worldCoords: [5.2, -10.5],
        intendedUse: 'Rest & reflection landmark with flickering low-poly campfire and hanging lantern.',
    },
    {
        id: 'wooden-noticeboard',
        name: 'Memory Noticeboard & Monument',
        category: 'memory-elements',
        filename: 'assets/memory-elements/wooden-noticeboard.glb',
        dimensions: '2.2m × 2.3m × 0.6m',
        worldCoords: [-2.4, 8.2],
        intendedUse: 'Interactive chapter memory board with pinned notes, red cloth drape & engraved stone.',
    },
];

export function exportObjectToGLB(object3D: THREE.Object3D, filename: string): void {
    const exporter = new GLTFExporter();
    exporter.parse(
        object3D,
        (result) => {
            if (result instanceof ArrayBuffer) {
                const blob = new Blob([result], { type: 'model/gltf-binary' });
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