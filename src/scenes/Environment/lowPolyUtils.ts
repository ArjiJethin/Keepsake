// src/scenes/Environment/lowPolyUtils.ts
import * as THREE from 'three';

/**
 * Deterministic pseudo-random generator so every low-poly facet
 * is sculpted identically across reloads.
 */
export function seededRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
}

/**
 * Creates an artistically faceted low-poly boulder or foliage cluster
 * by displacing vertices along organic noise vectors and computing flat vertex normals.
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

    // Group identical vertices by spatial hash so shared corners stay welded
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

/**
 * Evaluates the exact terrain height at any (x, z) coordinate in the garden.
 * Ensures the winding valley path dips naturally in the center and rises into
 * rolling hills on the left (archway) and right (giant sakura tree).
 */
export function getGardenTerrainHeight(x: number, z: number): number {
    // Gentle valley channel along the winding pathway center
    const pathCenterX = Math.sin(z * 0.09) * 2.2 - x * 0.04;
    const distFromPath = Math.abs(x - pathCenterX);
    const valleyRise = Math.min(Math.pow(distFromPath * 0.085, 1.55), 5.5);

    // Left archway ridge & right sakura tree knoll
    const leftHill =
        x < -4 ? Math.smoothstep(Math.abs(x + 4), 0, 22) * 2.4 : 0;
    const rightKnoll =
        x > 4 ? Math.smoothstep(x - 4, 0, 20) * 2.8 : 0;

    // Gentle slope downward away from the camera toward the middle meadow
    const zSlope = Math.sin(z * 0.05) * 0.45 + (z > 0 ? z * 0.04 : -z * 0.015);

    // Subtle organic undulation
    const ripples =
        Math.sin(x * 0.22 + z * 0.18) * 0.18 +
        Math.cos(x * 0.14 - z * 0.25) * 0.14;

    return valleyRise + leftHill + rightKnoll + zSlope + ripples - 0.65;
}

// Add Math.smoothstep helper
declare global {
    interface Math {
        smoothstep(x: number, min: number, max: number): number;
    }
}

Math.smoothstep = function (x: number, min: number, max: number): number {
    const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
    return t * t * (3 - 2 * t);
};