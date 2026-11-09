// src/scenes/Environment/lowPolyUtils.ts
import * as THREE from 'three';

export const CHUNK_SIZE = 40;
export const CHUNK_SEGMENTS = 28;
export const ACTIVE_CHUNK_RADIUS = 1; // 3x3 chunk grid = 120m x 120m active around player

export function seededRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
}

export function hash2D(ix: number, iz: number, salt = 0): number {
    const dot = ix * 127.1 + iz * 311.7 + salt * 74.7;
    const s = Math.sin(dot) * 43758.5453123;
    return s - Math.floor(s);
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
export function fbm2D(x: number, z: number, octaves = 3): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let i = 0; i < octaves; i++) {
        value += amplitude * (valueNoise2D(x * frequency, z * frequency, i * 17) * 2 - 1);
        frequency *= 2.04;
        amplitude *= 0.5;
    }
    return value;
}

/**
 * Returns the exact X-center of the meandering garden trail for any Z coordinate
 */
export function getPathCenterX(z: number): number {
    return Math.sin(z * 0.075) * 2.4 + Math.cos(z * 0.032) * 1.3 - 0.5;
}

/**
 * Seamless World-Space Terrain Height Function.
 * Because this depends purely on global (x, z), adjacent chunk edges match with
 * 0.00000m error while blending the curated Sanctuary Basin with infinite rolling hills.
 */
export function getGardenTerrainHeight(x: number, z: number): number {
    const pathX = getPathCenterX(z);
    const distFromPath = Math.abs(x - pathX);

    // Smooth flat-bottomed walking valley along the meandering trail
    const pathFlatten = smoothstep(distFromPath, 1.4, 7.5);

    // Sanctuary Basin near origin so the hero Sakura Tree & Stone Archway sit naturally
    const distFromOrigin = Math.sqrt(x * x + z * z);
    const sanctuaryBlend = smoothstep(distFromOrigin, 12, 38);

    // Curated hero knolls near origin (Left archway ridge & Right sakura knoll)
    const leftArchHill =
        x < -3.5 ? smoothstep(Math.abs(x + 3.5), 0, 18) * 1.95 * (1 - sanctuaryBlend * 0.5) : 0;
    const rightSakuraKnoll =
        x > 3.5 ? smoothstep(x - 3.5, 0, 16) * 2.15 * (1 - sanctuaryBlend * 0.5) : 0;

    // Continuous procedural rolling hills & gentle valleys across the infinite world
    const macroHills = fbm2D(x * 0.018, z * 0.018, 3) * 4.6;
    const mesoSlopes = fbm2D(x * 0.055 + 11.3, z * 0.055 - 7.9, 2) * 1.15;
    const microUndulation = Math.sin(x * 0.19 + z * 0.15) * 0.11;

    const rawElevation =
        (macroHills * (0.35 + 0.65 * sanctuaryBlend) +
            mesoSlopes * (0.4 + 0.6 * sanctuaryBlend) +
            leftArchHill +
            rightSakuraKnoll +
            microUndulation) *
        pathFlatten;

    // Slight path depression so flagstones sit nestled in the meadow
    const pathChannel = (1 - pathFlatten) * -0.18;

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
            const hash = vx * 19.19 + vy * 37.37 + vz * 73.73 + seedOffset * 13.37;
            const n1 = (seededRandom(hash) - 0.5) * 2 * jitterAmount;
            const n2 = (seededRandom(hash + 7.1) - 0.5) * 2 * jitterAmount;
            const n3 = (seededRandom(hash + 19.3) - 0.5) * 2 * jitterAmount;

            let nx = (vx + n1 * radius) * scaleXYZ[0];
            let ny = (vy + n2 * radius) * scaleXYZ[1];
            let nz = (vz + n3 * radius) * scaleXYZ[2];

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