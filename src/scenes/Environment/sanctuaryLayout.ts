// src/scenes/Environment/sanctuaryLayout.ts

/**
 * Sanctuary landmark clearings.
 *
 * The opening area is deliberately loose: the hero landmarks stay legible while
 * secondary props are spread out along the surrounding hillside. Chunk
 * generation reads these circles so procedurally scattered trees, boulders and
 * grass never grow through a hand-placed model.
 */
export interface SanctuaryClearing {
    x: number;
    z: number;
    radius: number;
    label: string;
}

export const SANCTUARY_CLEARINGS: SanctuaryClearing[] = [
    // Hero landmarks
    { x: -6.8, z: -3.5, radius: 3.6, label: 'stone archway' },
    { x: 6.2, z: 2.2, radius: 4.6, label: 'great sakura' },
    { x: -11.5, z: 4.8, radius: 4.6, label: 'great evergreen' },
    { x: 11.5, z: -6.5, radius: 4.2, label: 'stone cottage' },
    { x: -0.6, z: -10.2, radius: 2.8, label: 'torii gate' },
    { x: -5.8, z: -14.2, radius: 5.2, label: 'reflection pond' },
    { x: 4.2, z: -9.2, radius: 2.8, label: 'straight bridge' },
    { x: 6.8, z: -13.5, radius: 3.6, label: 'campsite' },

    // Core memory pedestals
    { x: 1.65, z: 5.8, radius: 2.0, label: 'minimal pedestal' },
    { x: 2.85, z: 3.6, radius: 2.6, label: 'grand portal' },
    { x: -3.6, z: 2.2, radius: 2.2, label: 'arched pedestal' },
    { x: 2.1, z: -4.8, radius: 2.2, label: 'arched pedestal' },
    { x: -2.6, z: -6.8, radius: 2.6, label: 'northern portal' },

    // Spread-out decorative props
    { x: 2.4, z: 24.5, radius: 2.2, label: 'notice board' },
    { x: -14.0, z: 16.0, radius: 2.4, label: 'memory monument' },
    { x: 6.4, z: -21.5, radius: 1.8, label: 'memory banner' },
    { x: -8.2, z: -23.0, radius: 1.8, label: 'memory banner' },
    { x: 1.6, z: 14.6, radius: 1.4, label: 'lantern post' },
    { x: -10.4, z: -13.8, radius: 1.4, label: 'lantern post' },
    { x: 10.2, z: 7.4, radius: 1.4, label: 'lantern post' },
    { x: 19.0, z: -13.0, radius: 2.4, label: 'cargo cart' },
    { x: 0.6, z: 12.4, radius: 1.4, label: 'signpost' },
    { x: 16.2, z: -3.4, radius: 1.8, label: 'fence' },
    { x: 18.4, z: -5.1, radius: 1.8, label: 'fence' },
    { x: -18.2, z: 9.6, radius: 1.8, label: 'standing pillar' },
    { x: -21.0, z: -12.0, radius: 1.8, label: 'standing pillar' },
    { x: -3.4, z: 10.8, radius: 1.1, label: 'memory flower' },
    { x: 14.2, z: 11.5, radius: 1.1, label: 'memory flower' },
    { x: -15.8, z: -6.2, radius: 1.1, label: 'memory flower' },
    { x: 2.4, z: -17.5, radius: 1.1, label: 'memory flower' },
    { x: 10.4, z: 13.4, radius: 1.5, label: 'mushroom cluster' },
    { x: -13.6, z: -2.8, radius: 1.5, label: 'mushroom cluster' },
    { x: -4.2, z: -20.5, radius: 1.5, label: 'mushroom cluster' },
];

const CLEARING_CELL_SIZE = 12;
const CLEARING_GRID = new Map<string, SanctuaryClearing[]>();

for (const clearing of SANCTUARY_CLEARINGS) {
    const cellX = Math.floor(clearing.x / CLEARING_CELL_SIZE);
    const cellZ = Math.floor(clearing.z / CLEARING_CELL_SIZE);
    const key = `${cellX}|${cellZ}`;
    const bucket = CLEARING_GRID.get(key);
    if (bucket) bucket.push(clearing);
    else CLEARING_GRID.set(key, [clearing]);
}

/**
 * Cheap bucket lookup so the chunk generator can test hundreds of candidate
 * positions per chunk without scanning every landmark.
 */
export function isInsideSanctuaryClearing(
    wx: number,
    wz: number,
    objectRadius = 0
): boolean {
    const cellX = Math.floor(wx / CLEARING_CELL_SIZE);
    const cellZ = Math.floor(wz / CLEARING_CELL_SIZE);

    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            const bucket = CLEARING_GRID.get(`${cellX + dx}|${cellZ + dz}`);
            if (!bucket) continue;

            for (let i = 0; i < bucket.length; i++) {
                const clearing = bucket[i];
                const minDist = clearing.radius + objectRadius * 0.5;
                const offX = wx - clearing.x;
                const offZ = wz - clearing.z;
                if (offX * offX + offZ * offZ < minDist * minDist) return true;
            }
        }
    }

    return false;
}
