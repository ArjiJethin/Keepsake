// src/scenes/Environment/lowPolyUtils.ts
import * as THREE from 'three';
import { THEME } from '../../styles/theme';

export const CHUNK_SIZE = 40;
export const CHUNK_SEGMENTS = 28;
export const ACTIVE_CHUNK_RADIUS = 1; // 3x3 chunk grid = 120m x 120m active around player

export type BiomeType =
    | 'memory_sanctuary'
    | 'blossom_grove'
    | 'evergreen_forest'
    | 'meadow'
    | 'ancient_ruins'
    | 'explorers_rest';

export interface BiomeMetadata {
    id: BiomeType;
    name: string;
    subtitle: string;
    baseColor: string;
    sunlitColor: string;
    shadowColor: string;
    pathColor: string;
    treeDensity: number;
    rockDensity: number;
    flowerDensity: number;
    elevationScale: number;
    roughnessScale: number;
}

export const BIOME_CONFIGS: Record<BiomeType, BiomeMetadata> = {
    memory_sanctuary: {
        id: 'memory_sanctuary',
        name: 'Memory Sanctuary',
        subtitle: 'Sacred Threshold of Shared Echoes',
        baseColor: THEME.colors.meadowBase,
        sunlitColor: THEME.colors.meadowSunlit,
        shadowColor: THEME.colors.meadowShadow,
        pathColor: '#8d8266',
        treeDensity: 0.42,
        rockDensity: 0.35,
        flowerDensity: 0.85,
        elevationScale: 0.65,
        roughnessScale: 0.5,
    },
    blossom_grove: {
        id: 'blossom_grove',
        name: 'Blossom Grove',
        subtitle: 'Sunlit Sakura Hills & Memory Petals',
        baseColor: '#737a52',
        sunlitColor: '#9ca16b',
        shadowColor: '#525c3e',
        pathColor: '#917f6c',
        treeDensity: 0.68,
        rockDensity: 0.3,
        flowerDensity: 0.95,
        elevationScale: 0.95,
        roughnessScale: 0.7,
    },
    evergreen_forest: {
        id: 'evergreen_forest',
        name: 'Evergreen Forest',
        subtitle: 'Ancient Whispering Pines & Mossy Stones',
        baseColor: '#4e6342',
        sunlitColor: '#6d8256',
        shadowColor: '#35472d',
        pathColor: '#6e6854',
        treeDensity: 0.88,
        rockDensity: 0.65,
        flowerDensity: 0.35,
        elevationScale: 1.35,
        roughnessScale: 1.15,
    },
    meadow: {
        id: 'meadow',
        name: 'Golden Meadow',
        subtitle: 'Open Rolling Pastures & Wildflower Breeze',
        baseColor: '#768252',
        sunlitColor: '#a3ab6c',
        shadowColor: '#55613c',
        pathColor: '#8a8262',
        treeDensity: 0.22,
        rockDensity: 0.2,
        flowerDensity: 1.0,
        elevationScale: 0.75,
        roughnessScale: 0.45,
    },
    ancient_ruins: {
        id: 'ancient_ruins',
        name: 'Ancient Ruins',
        subtitle: 'Weathered Monoliths & Forgotten Archways',
        baseColor: '#6c7056',
        sunlitColor: '#8f9172',
        shadowColor: '#4c4f3d',
        pathColor: '#857d73',
        treeDensity: 0.36,
        rockDensity: 0.92,
        flowerDensity: 0.45,
        elevationScale: 1.15,
        roughnessScale: 1.05,
    },
    explorers_rest: {
        id: 'explorers_rest',
        name: "Explorer's Rest",
        subtitle: 'Quiet Wayside Haven & Lantern Camp',
        baseColor: '#6d784f',
        sunlitColor: '#919966',
        shadowColor: '#4d5739',
        pathColor: '#8c7b60',
        treeDensity: 0.45,
        rockDensity: 0.42,
        flowerDensity: 0.65,
        elevationScale: 0.55,
        roughnessScale: 0.4,
    },
};

const SEED_STORAGE_KEY = 'keepsake_world_seed_v1';
const DEFAULT_WORLD_SEED = 'KEEPSAKE-2026';

/**
 * Hashes an arbitrary string seed into a deterministic 32-bit unsigned integer.
 */
export function hashSeedString(seedStr: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

// Module-level active seed state synchronized with Zustand & localStorage
let currentSeedString: string = (() => {
    if (typeof window !== 'undefined') {
        try {
            const saved = window.localStorage.getItem(SEED_STORAGE_KEY);
            if (saved && saved.trim().length > 0) {
                return saved.trim().toUpperCase();
            }
        } catch {
            // Ignore storage errors
        }
    }
    return DEFAULT_WORLD_SEED;
})();

let currentSeedNumeric: number = hashSeedString(currentSeedString);

export function getWorldSeed(): string {
    return currentSeedString;
}

export function getWorldSeedNumeric(): number {
    return currentSeedNumeric;
}

export function setWorldSeedGlobal(newSeed: string): string {
    const sanitized = (newSeed || DEFAULT_WORLD_SEED).trim().toUpperCase();
    currentSeedString = sanitized;
    currentSeedNumeric = hashSeedString(sanitized);
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(SEED_STORAGE_KEY, sanitized);
        } catch {
            // Ignore storage errors
        }
    }
    return sanitized;
}

export function generateNewSeedString(): string {
    const adjectives = [
        'GOLDEN',
        'SAKURA',
        'WHISPER',
        'AUTUMN',
        'LANTERN',
        'VELVET',
        'SOLSTICE',
        'MISTY',
        'SERENE',
        'AMBER',
        'ECHO',
        'WILLOW',
    ];
    const nouns = [
        'VALLEY',
        'GROVE',
        'HAVEN',
        'MEADOW',
        'GLADE',
        'SANCTUARY',
        'HORIZON',
        'ARCHWAY',
        'GARDEN',
        'RIDGE',
    ];
    const nowEntropy = Date.now() ^ (Math.random() * 0xffffffff);
    const r1 = Math.abs(Math.imul(nowEntropy, 1597334677)) % adjectives.length;
    const r2 = Math.abs(Math.imul(nowEntropy ^ 0x5bd1e995, 3812015801)) % nouns.length;
    const num = (Math.abs(nowEntropy) % 900) + 100;
    return `${adjectives[r1]}-${nouns[r2]}-${num}`;
}

/**
 * Mulberry32 deterministic PRNG returning [0, 1)
 */
export function mulberry32(a: number): number {
    let t = (a + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Deterministic seeded random function incorporating the active world seed.
 */
export function seededRandom(seed: number): number {
    const intSeed = Math.floor(seed * 1000003) ^ currentSeedNumeric;
    return mulberry32(intSeed);
}

/**
 * Deterministic 2D spatial hash incorporating the active world seed.
 * Completely independent of chunk loading order.
 */
export function hash2D(ix: number, iz: number, salt = 0): number {
    let h = currentSeedNumeric ^ Math.imul(Math.floor(salt), 374761393);
    h = Math.imul(h ^ Math.imul(Math.floor(ix), 3266489917), 668265263);
    h = Math.imul(h ^ Math.imul(Math.floor(iz), 2246822519), 3266489917);
    return mulberry32(h);
}

export function smoothstep(x: number, min: number, max: number): number {
    const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
    return t * t * (3 - 2 * t);
}

/**
 * Continuous 2D Value Noise for seamless cross-chunk terrain generation
 */
export function valueNoise2D(x: number, z: number, salt = 0): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;

    const u = fx * fx * (3 - 2 * fx);
    const v = fz * fz * (3 - 2 * fz);

    const a = hash2D(ix, iz, salt);
    const b = hash2D(ix + 1, iz, salt);
    const c = hash2D(ix, iz + 1, salt);
    const d = hash2D(ix + 1, iz + 1, salt);

    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Multi-octave Fractal Brownian Motion (fBM)
 */
export function fbm2D(x: number, z: number, octaves = 3, salt = 0): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let i = 0; i < octaves; i++) {
        value +=
            amplitude *
            (valueNoise2D(x * frequency, z * frequency, salt + i * 17) * 2 - 1);
        frequency *= 2.04;
        amplitude *= 0.5;
    }
    return value;
}

/**
 * Returns the exact X-center of the primary North-South meandering trail for any Z coordinate.
 * Uses the active seed while keeping (0, 7.5) player spawn near the trailhead.
 */
export function getPathCenterX(z: number): number {
    const phase1 = (currentSeedNumeric & 0xff) * 0.024;
    const phase2 = ((currentSeedNumeric >> 8) & 0xff) * 0.024;
    const rawOffset =
        Math.sin(z * 0.055 + phase1) * 3.8 +
        Math.cos(z * 0.028 + phase2) * 2.1;
    const spawnOffset =
        Math.sin(7.5 * 0.055 + phase1) * 3.8 +
        Math.cos(7.5 * 0.028 + phase2) * 2.1;
    // Anchor trail near X = 0 at player spawn Z = 7.5
    const originTaper = smoothstep(Math.abs(z - 7.5), 0, 22);
    return (rawOffset - spawnOffset * (1 - originTaper * 0.65)) - 0.4;
}

/**
 * Returns the exact Z-center of the secondary East-West cross-trail for any X coordinate.
 */
export function getSecondaryPathCenterZ(x: number): number {
    const phase1 = ((currentSeedNumeric >> 4) & 0xff) * 0.024;
    const phase2 = ((currentSeedNumeric >> 12) & 0xff) * 0.024;
    const rawOffset =
        Math.sin(x * 0.05 + phase1) * 3.4 +
        Math.cos(x * 0.025 + phase2) * 1.9;
    const originValue =
        Math.sin(phase1) * 3.4 + Math.cos(phase2) * 1.9;
    const originTaper = smoothstep(Math.abs(x), 0, 20);
    return rawOffset - originValue * (1 - originTaper * 0.7) - 3.5;
}

/**
 * Returns the minimum distance from (x, z) to any winding path in the world.
 */
export function getDistanceToNearestPath(x: number, z: number): number {
    const dMain = Math.abs(x - getPathCenterX(z));
    const dCross = Math.abs(z - getSecondaryPathCenterZ(x));
    return Math.min(dMain, dCross);
}

const OUTER_BIOME_POOL: BiomeType[] = [
    'blossom_grove',
    'evergreen_forest',
    'meadow',
    'ancient_ruins',
    'explorers_rest',
];

export interface BiomeSample {
    primary: BiomeType;
    secondary: BiomeType;
    blend: number; // 0 = 100% primary, 0.5 = equal boundary
    config: BiomeMetadata;
    clearingFactor: number; // [0..1] 1 = inside an intentional landmark clearing
    ClearingCenter: [number, number];
}

/**
 * Deterministic Voronoi + Domain-Warped Biome Resolver.
 * Guarantees:
 * - Origin radius < 26m is always 'memory_sanctuary'
 * - Neighboring regions form coherent 65m-90m biome territories with smooth transitions
 * - Every biome cell has a deterministic clearing center for intentional landmark placement
 */
export function getBiomeSampleAt(x: number, z: number): BiomeSample {
    const distFromOrigin = Math.hypot(x, z);
    if (distFromOrigin < 22) {
        return {
            primary: 'memory_sanctuary',
            secondary: 'blossom_grove',
            blend: 0,
            config: BIOME_CONFIGS.memory_sanctuary,
            clearingFactor: smoothstep(distFromOrigin, 16, 6),
            ClearingCenter: [0, 0],
        };
    }

    // Domain warp coordinates slightly so biome borders feel organic, not grid-like
    const warpX = x + fbm2D(x * 0.015, z * 0.015, 2, 401) * 14.0;
    const warpZ = z + fbm2D(x * 0.015, z * 0.015, 2, 509) * 14.0;

    const cellScale = 68.0;
    const cx = Math.floor(warpX / cellScale);
    const cz = Math.floor(warpZ / cellScale);

    let minDist1 = 999999;
    let minDist2 = 999999;
    let bestCellX = cx;
    let bestCellZ = cz;
    let secondCellX = cx;
    let secondCellZ = cz;
    let bestPointX = 0;
    let bestPointZ = 0;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            const ncx = cx + dx;
            const ncz = cz + dz;
            const px = (ncx + 0.2 + hash2D(ncx, ncz, 811) * 0.6) * cellScale;
            const pz = (ncz + 0.2 + hash2D(ncx, ncz, 823) * 0.6) * cellScale;

            const d = Math.hypot(warpX - px, warpZ - pz);
            if (d < minDist1) {
                minDist2 = minDist1;
                secondCellX = bestCellX;
                secondCellZ = bestCellZ;
                minDist1 = d;
                bestCellX = ncx;
                bestCellZ = ncz;
                bestPointX = px;
                bestPointZ = pz;
            } else if (d < minDist2) {
                minDist2 = d;
                secondCellX = ncx;
                secondCellZ = ncz;
            }
        }
    }

    const resolveCellBiome = (cellX: number, cellZ: number): BiomeType => {
        if (cellX === 0 && cellZ === 0) return 'memory_sanctuary';
        const h = Math.floor(hash2D(cellX, cellZ, 907) * 1000);
        // Ensure adjacent cells vary naturally
        const idx = Math.abs(h + cellX * 3 + cellZ * 5) % OUTER_BIOME_POOL.length;
        return OUTER_BIOME_POOL[idx];
    };

    let primary = resolveCellBiome(bestCellX, bestCellZ);
    let secondary = resolveCellBiome(secondCellX, secondCellZ);

    // Smoothly transition out of the central Memory Sanctuary between 22m and 34m
    if (distFromOrigin < 34 && primary !== 'memory_sanctuary') {
        secondary = primary;
        primary = 'memory_sanctuary';
        const sanctBlend = smoothstep(distFromOrigin, 22, 34);
        const rawClearDist = Math.hypot(x - bestPointX, z - bestPointZ);
        return {
            primary,
            secondary,
            blend: sanctBlend,
            config: BIOME_CONFIGS[sanctBlend > 0.5 ? secondary : primary],
            clearingFactor: 1.0 - smoothstep(rawClearDist, 4.0, 13.0),
            ClearingCenter: [bestPointX, bestPointZ],
        };
    }

    const edgeDelta = Math.max(0.001, minDist2 - minDist1);
    const blend = 1.0 - smoothstep(edgeDelta, 0, 18.0);
    const rawClearDist = Math.hypot(x - bestPointX, z - bestPointZ);
    const clearingFactor = 1.0 - smoothstep(rawClearDist, 5.5, 14.5);

    return {
        primary,
        secondary,
        blend: blend * 0.5,
        config: BIOME_CONFIGS[primary],
        clearingFactor,
        ClearingCenter: [bestPointX, bestPointZ],
    };
}

export function getBiomeAt(x: number, z: number): BiomeType {
    return getBiomeSampleAt(x, z).primary;
}

/**
 * Seamless World-Space Terrain Height Function.
 * Driven deterministically by the active world seed and smooth biome blending.
 */
export function getGardenTerrainHeight(x: number, z: number): number {
    const distFromPath = getDistanceToNearestPath(x, z);

    // Smooth flat-bottomed walking valley along the winding trails
    const pathFlatten = smoothstep(distFromPath, 1.5, 7.2);

    // Sanctuary Basin near origin so the hero landmarks & spawn sit naturally
    const distFromOrigin = Math.hypot(x, z);
    const sanctuaryBlend = smoothstep(distFromOrigin, 14, 38);

    // Biome-modulated elevation & roughness
    const sample = getBiomeSampleAt(x, z);
    const cfgA = BIOME_CONFIGS[sample.primary];
    const cfgB = BIOME_CONFIGS[sample.secondary];
    const elevScale = THREE.MathUtils.lerp(
        cfgA.elevationScale,
        cfgB.elevationScale,
        sample.blend
    );
    const roughScale = THREE.MathUtils.lerp(
        cfgA.roughnessScale,
        cfgB.roughnessScale,
        sample.blend
    );

    // Flatten natural clearings so cottages, pedestals, and campsites sit level
    const clearingFlatten = 1.0 - sample.clearingFactor * 0.68;

    // Curated hero knolls near origin (Left archway ridge & Right sakura knoll)
    const leftArchHill =
        x < -3.5
            ? smoothstep(Math.abs(x + 3.5), 0, 18) *
            1.75 *
            (1 - sanctuaryBlend * 0.55)
            : 0;
    const rightSakuraKnoll =
        x > 3.5
            ? smoothstep(x - 3.5, 0, 16) *
            1.95 *
            (1 - sanctuaryBlend * 0.55)
            : 0;

    // Seeded multi-scale rolling hills, scenic ridges & valleys
    const macroHills =
        fbm2D(x * 0.015, z * 0.015, 3, 101) * 4.8 * elevScale;
    const mesoSlopes =
        fbm2D(x * 0.048 + 11.3, z * 0.048 - 7.9, 2, 202) * 1.25 * roughScale;
    const scenicOutcrop =
        sample.primary === 'ancient_ruins' || sample.primary === 'evergreen_forest'
            ? Math.max(0, valueNoise2D(x * 0.035, z * 0.035, 309) - 0.58) * 3.6
            : 0;
    const microUndulation = Math.sin(x * 0.17 + z * 0.14) * 0.09;

    const rawElevation =
        ((macroHills * (0.28 + 0.72 * sanctuaryBlend) +
            mesoSlopes * (0.35 + 0.65 * sanctuaryBlend) +
            scenicOutcrop * sanctuaryBlend) *
            clearingFlatten +
            leftArchHill +
            rightSakuraKnoll +
            microUndulation) *
        pathFlatten;

    // Slight path channel depression so flagstones sit nestled in the terrain
    const pathChannel = (1 - pathFlatten) * -0.16;

    return rawElevation + pathChannel - 0.35;
}

/**
 * Computes terrain surface normal via finite differences for slope handling
 */
export function getGardenTerrainNormal(x: number, z: number): THREE.Vector3 {
    const eps = 0.25;
    const hL = getGardenTerrainHeight(x - eps, z);
    const hR = getGardenTerrainHeight(x + eps, z);
    const hD = getGardenTerrainHeight(x, z - eps);
    const hU = getGardenTerrainHeight(x, z + eps);
    return new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
}

/**
 * Computes maximum terrain slope angle (0 = flat, 1 = vertical) at (x, z)
 */
export function getTerrainSlope(x: number, z: number): number {
    const normal = getGardenTerrainNormal(x, z);
    return Math.max(0, 1.0 - normal.y);
}

/**
 * Creates an artistically faceted low-poly mesh with welded vertices
 * and intentional flat-shaded facets.
 */
export function createSculptedFacetedGeometry(
    radius: number,
    detail: number,
    scaleXYZ: [number, number, number],
    jitterAmount: number,
    seedOffset: number,
    flattenBottom = false
): THREE.BufferGeometry {
    const baseGeo = new THREE.IcosahedronGeometry(radius, detail);
    const geo = baseGeo.toNonIndexed();
    const pos = geo.attributes.position;

    const vertexMap = new Map<string, [number, number, number]>();

    for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const key = `${vx.toFixed(3)}_${vy.toFixed(3)}_${vz.toFixed(3)}`;

        let displaced = vertexMap.get(key);
        if (!displaced) {
            const hash =
                vx * 19.19 + vy * 37.37 + vz * 73.73 + seedOffset * 13.37;
            // Geometry shapes stay artistically consistent across seeds
            const detRand = (s: number) => {
                const x = Math.sin(s * 127.1 + 311.7) * 43758.5453123;
                return x - Math.floor(x);
            };
            const n1 = (detRand(hash) - 0.5) * 2 * jitterAmount;
            const n2 = (detRand(hash + 7.1) - 0.5) * 2 * jitterAmount;
            const n3 = (detRand(hash + 19.3) - 0.5) * 2 * jitterAmount;

            const nx = (vx + n1 * radius) * scaleXYZ[0];
            let ny = (vy + n2 * radius) * scaleXYZ[1];
            const nz = (vz + n3 * radius) * scaleXYZ[2];

            if (flattenBottom && ny < -radius * scaleXYZ[1] * 0.35) {
                ny = -radius * scaleXYZ[1] * 0.38;
            }

            displaced = [nx, ny, nz];
            vertexMap.set(key, displaced);
        }

        pos.setXYZ(i, displaced[0], displaced[1], displaced[2]);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
}