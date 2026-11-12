// src/scenes/Environment/lowPolyUtils.ts
import * as THREE from 'three';

export const CHUNK_SIZE = 40;
export const CHUNK_SEGMENTS = 18;
// 5x5 chunk grid (200m x 200m) provides a naturally continuous world into the atmospheric fog
// without needing any artificial player-following hill wall.
export const ACTIVE_CHUNK_RADIUS = 2;

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
        name: 'Keepsake Village',
        subtitle: 'Welcoming Homestead & Memory Square',
        baseColor: '#5d7c52',
        sunlitColor: '#7d9c64',
        shadowColor: '#3f593b',
        pathColor: '#b59f84',
        treeDensity: 0.38,
        rockDensity: 0.28,
        flowerDensity: 0.78,
        elevationScale: 0.45,
        roughnessScale: 0.35,
    },
    blossom_grove: {
        id: 'blossom_grove',
        name: 'Sakura Grove',
        subtitle: 'Blossom Trees, Lotus Ponds & Torii Shrines',
        baseColor: '#697f54',
        sunlitColor: '#8fa16a',
        shadowColor: '#485c3d',
        pathColor: '#baa096',
        treeDensity: 0.62,
        rockDensity: 0.34,
        flowerDensity: 0.9,
        elevationScale: 0.78,
        roughnessScale: 0.52,
    },
    evergreen_forest: {
        id: 'evergreen_forest',
        name: 'Ancient Forest',
        subtitle: 'Towering Elder Trees & Mossy Monoliths',
        baseColor: '#436343',
        sunlitColor: '#618257',
        shadowColor: '#2c452e',
        pathColor: '#8c7e6a',
        treeDensity: 0.8,
        rockDensity: 0.64,
        flowerDensity: 0.45,
        elevationScale: 1.1,
        roughnessScale: 0.88,
    },
    meadow: {
        id: 'meadow',
        name: 'Riverside / Pondlands',
        subtitle: 'Crystal Waters, Flower Banks & Open Glades',
        baseColor: '#628558',
        sunlitColor: '#86a86e',
        shadowColor: '#43613e',
        pathColor: '#b5a68b',
        treeDensity: 0.34,
        rockDensity: 0.45,
        flowerDensity: 0.95,
        elevationScale: 0.54,
        roughnessScale: 0.38,
    },
    ancient_ruins: {
        id: 'ancient_ruins',
        name: 'Ruins of Memory',
        subtitle: 'Carved Stone Arches & Ancient Pillars',
        baseColor: '#5c6b57',
        sunlitColor: '#7c8a6d',
        shadowColor: '#3f4a3d',
        pathColor: '#96938e',
        treeDensity: 0.4,
        rockDensity: 0.82,
        flowerDensity: 0.52,
        elevationScale: 0.98,
        roughnessScale: 0.82,
    },
    explorers_rest: {
        id: 'explorers_rest',
        name: 'Woodland Campsite',
        subtitle: 'Traveler Tents, Cargo Carts & Lantern Trails',
        baseColor: '#657a4e',
        sunlitColor: '#889964',
        shadowColor: '#465738',
        pathColor: '#ad9474',
        treeDensity: 0.5,
        rockDensity: 0.44,
        flowerDensity: 0.7,
        elevationScale: 0.64,
        roughnessScale: 0.44,
    },
};

const SEED_STORAGE_KEY = 'keepsake_world_seed_v1';

export function hashSeedString(seedStr: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function generateNewSeedString(): string {
    const adjectives = [
        'SAKURA',
        'EMERALD',
        'STARLIGHT',
        'WHISPER',
        'LANTERN',
        'CRYSTAL',
        'SOLSTICE',
        'AZURE',
        'SERENE',
        'BLOOM',
        'ECHO',
        'WILLOW',
        'LOTUS',
        'AURORA',
        'VERDANT',
        'SYLVAN',
    ];
    const nouns = [
        'VILLAGE',
        'GROVE',
        'FOREST',
        'PONDLAND',
        'GLADE',
        'SANCTUARY',
        'HORIZON',
        'ARCHWAY',
        'GARDEN',
        'VALLEY',
        'HAVEN',
        'SHORE',
    ];

    let entropyA = Date.now() ^ Math.floor(Math.random() * 0xffffffff);
    let entropyB = Math.floor(Math.random() * 0xffffffff);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
        const buf = new Uint32Array(2);
        window.crypto.getRandomValues(buf);
        entropyA ^= buf[0];
        entropyB ^= buf[1];
    }

    const r1 = Math.abs(entropyA) % adjectives.length;
    const r2 = Math.abs(entropyB) % nouns.length;
    const num = (Math.abs(entropyA ^ entropyB) % 9000) + 1000;
    return `${adjectives[r1]}-${nouns[r2]}-${num}`;
}

function isValidSeedString(candidate: unknown): candidate is string {
    if (typeof candidate !== 'string') return false;
    const trimmed = candidate.trim();
    return trimmed.length >= 3 && trimmed.length <= 48 && /^[A-Z0-9_-]+$/i.test(trimmed);
}

function loadOrCreatePersistentDeviceSeed(): string {
    if (typeof window !== 'undefined') {
        try {
            const saved = window.localStorage.getItem(SEED_STORAGE_KEY);
            if (
                isValidSeedString(saved) &&
                saved.trim().toUpperCase() !== 'KEEPSAKE-2026'
            ) {
                return saved.trim().toUpperCase();
            }
            const freshDeviceSeed = generateNewSeedString();
            window.localStorage.setItem(SEED_STORAGE_KEY, freshDeviceSeed);
            return freshDeviceSeed;
        } catch {
            // Fallback if localStorage is blocked
        }
    }
    return generateNewSeedString();
}

let currentSeedString: string = loadOrCreatePersistentDeviceSeed();
let currentSeedNumeric: number = hashSeedString(currentSeedString);

export function getWorldSeed(): string {
    return currentSeedString;
}

export function getWorldSeedNumeric(): number {
    return currentSeedNumeric;
}

export function setWorldSeedGlobal(newSeed: string): string {
    const sanitized = isValidSeedString(newSeed)
        ? newSeed.trim().toUpperCase()
        : generateNewSeedString();
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

export function mulberry32(a: number): number {
    let t = (a + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function seededRandom(seed: number): number {
    const intSeed = Math.floor(seed * 1000003) ^ currentSeedNumeric;
    return mulberry32(intSeed);
}

export function hash2D(ix: number, iz: number, salt = 0): number {
    let h = currentSeedNumeric ^ Math.imul(Math.floor(salt), 374761393);
    h = Math.imul(h ^ Math.imul(Math.floor(ix), 3266489917), 668265263);
    h = Math.imul(h ^ Math.imul(Math.floor(iz), 2246822519), 3266489917);
    return mulberry32(h);
}

function villageFixedHash2D(ix: number, iz: number, salt = 0): number {
    let h = 0x5f3759df ^ Math.imul(Math.floor(salt), 374761393);
    h = Math.imul(h ^ Math.imul(Math.floor(ix), 3266489917), 668265263);
    h = Math.imul(h ^ Math.imul(Math.floor(iz), 2246822519), 3266489917);
    return mulberry32(h);
}

export function smoothstep(x: number, min: number, max: number): number {
    const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
    return t * t * (3 - 2 * t);
}

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

function fixedVillageNoise2D(x: number, z: number, salt = 0): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;

    const u = fx * fx * (3 - 2 * fx);
    const v = fz * fz * (3 - 2 * fz);

    const a = villageFixedHash2D(ix, iz, salt);
    const b = villageFixedHash2D(ix + 1, iz, salt);
    const c = villageFixedHash2D(ix, iz + 1, salt);
    const d = villageFixedHash2D(ix + 1, iz + 1, salt);

    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

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

export function getPathCenterX(z: number): number {
    const villageFixedPath = Math.sin(z * 0.045) * 1.4 - 0.4;
    const villageExitBlend = smoothstep(Math.abs(z), 22, 42);
    if (villageExitBlend <= 0.001) return villageFixedPath;

    const phase1 = (currentSeedNumeric & 0xff) * 0.024;
    const phase2 = ((currentSeedNumeric >> 8) & 0xff) * 0.024;
    const seededOffset =
        Math.sin(z * 0.052 + phase1) * 4.2 +
        Math.cos(z * 0.027 + phase2) * 2.4;

    return THREE.MathUtils.lerp(villageFixedPath, seededOffset, villageExitBlend);
}

export function getSecondaryPathCenterZ(x: number): number {
    const villageFixedCross = Math.sin(x * 0.04) * 1.2 - 3.5;
    const villageExitBlend = smoothstep(Math.abs(x), 22, 42);
    if (villageExitBlend <= 0.001) return villageFixedCross;

    const phase1 = ((currentSeedNumeric >> 4) & 0xff) * 0.024;
    const phase2 = ((currentSeedNumeric >> 12) & 0xff) * 0.024;
    const seededOffset =
        Math.sin(x * 0.048 + phase1) * 3.8 +
        Math.cos(x * 0.025 + phase2) * 2.1 -
        3.5;

    return THREE.MathUtils.lerp(villageFixedCross, seededOffset, villageExitBlend);
}

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
    blend: number;
    config: BiomeMetadata;
    clearingFactor: number;
    ClearingCenter: [number, number];
}

export function getBiomeSampleAt(x: number, z: number): BiomeSample {
    const distFromOrigin = Math.hypot(x, z);
    if (distFromOrigin < 24) {
        return {
            primary: 'memory_sanctuary',
            secondary: 'blossom_grove',
            blend: 0,
            config: BIOME_CONFIGS.memory_sanctuary,
            clearingFactor: smoothstep(distFromOrigin, 20, 8),
            ClearingCenter: [0, 0],
        };
    }

    const warpX = x + fbm2D(x * 0.013, z * 0.013, 2, 401) * 16.0;
    const warpZ = z + fbm2D(x * 0.013, z * 0.013, 2, 509) * 16.0;

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
        const h = Math.floor(hash2D(cellX, cellZ, 907) * 1000);
        const idx =
            Math.abs(h + cellX * 7 + cellZ * 13) % OUTER_BIOME_POOL.length;
        return OUTER_BIOME_POOL[idx];
    };

    let primary = resolveCellBiome(bestCellX, bestCellZ);
    let secondary = resolveCellBiome(secondCellX, secondCellZ);

    if (distFromOrigin < 48 && primary !== 'memory_sanctuary') {
        secondary = primary;
        primary = 'memory_sanctuary';
        const sanctBlend = smoothstep(distFromOrigin, 24, 48);
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

    // Wider 36m transition zone ensures biome height and color blend gradually with zero ridges
    const edgeDelta = Math.max(0.001, minDist2 - minDist1);
    const blend = 1.0 - smoothstep(edgeDelta, 0, 36.0);
    const rawClearDist = Math.hypot(x - bestPointX, z - bestPointZ);
    const clearingFactor = 1.0 - smoothstep(rawClearDist, 6.0, 15.0);

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

export function getGardenTerrainHeight(x: number, z: number): number {
    const distFromPath = getDistanceToNearestPath(x, z);
    const pathFlatten = smoothstep(distFromPath, 1.6, 6.8);

    const distFromOrigin = Math.hypot(x, z);
    const outerSeedBlend = smoothstep(distFromOrigin, 22, 42);

    const villageHills =
        (fixedVillageNoise2D(x * 0.025, z * 0.025, 11) - 0.5) * 1.15 *
        smoothstep(distFromOrigin, 10, 26);
    const villageHeight = villageHills * pathFlatten + (1 - pathFlatten) * -0.14 - 0.35;

    if (outerSeedBlend <= 0.001) {
        return villageHeight;
    }

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

    const clearingFlatten = 1.0 - sample.clearingFactor * 0.72;

    const macroHills =
        fbm2D(x * 0.014, z * 0.014, 3, 101) * 4.1 * elevScale;
    const mesoSlopes =
        fbm2D(x * 0.044 + 11.3, z * 0.044 - 7.9, 2, 202) * 1.0 * roughScale;
    const scenicOutcrop =
        sample.primary === 'ancient_ruins' || sample.primary === 'evergreen_forest'
            ? Math.max(0, valueNoise2D(x * 0.032, z * 0.032, 309) - 0.6) * 2.4
            : 0;
    const microUndulation = Math.sin(x * 0.16 + z * 0.14) * 0.06;

    const seededElevation =
        (macroHills + mesoSlopes + scenicOutcrop) * clearingFlatten * pathFlatten +
        microUndulation * pathFlatten +
        (1 - pathFlatten) * -0.14 -
        0.35;

    return THREE.MathUtils.lerp(villageHeight, seededElevation, outerSeedBlend);
}

const _sharedNormal = new THREE.Vector3();

export function getGardenTerrainNormal(x: number, z: number, target = _sharedNormal): THREE.Vector3 {
    const eps = 0.25;
    const hL = getGardenTerrainHeight(x - eps, z);
    const hR = getGardenTerrainHeight(x + eps, z);
    const hD = getGardenTerrainHeight(x, z - eps);
    const hU = getGardenTerrainHeight(x, z + eps);
    return target.set(hL - hR, 2 * eps, hD - hU).normalize();
}

export function getTerrainSlope(x: number, z: number): number {
    const normal = getGardenTerrainNormal(x, z);
    return Math.max(0, 1.0 - normal.y);
}

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
    baseGeo.dispose();
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
