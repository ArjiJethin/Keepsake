// src/scenes/Environment/sanctuaryLayout.ts

/**
 * The Keepsake Village (Fixed Spawn Biome) Layout & Clearings.
 *
 * Every coordinate here is fixed so the starting village looks identical for
 * all players regardless of their world seed, and procedural chunk assets
 * never overlap any village cottage, gate, lamp, or pedestal.
 */
export interface SanctuaryClearing {
    x: number;
    z: number;
    radius: number;
    label: string;
}

export const SANCTUARY_CLEARINGS: SanctuaryClearing[] = [
    // Player Spawn Plaza
    { x: 0, z: 7.5, radius: 5.5, label: 'player spawn plaza' },

    // Village Cottages (Rock Houses)
    { x: 11.5, z: -5.5, radius: 4.8, label: 'east village cottage' },
    { x: -11.8, z: -4.2, radius: 4.8, label: 'west village cottage' },
    { x: 10.4, z: 12.8, radius: 4.8, label: 'south-east village cottage' },

    // Village Entrances & Landmarks
    { x: -0.4, z: -13.5, radius: 3.6, label: 'north japanese torii gate' },
    { x: -15.5, z: 4.5, radius: 4.0, label: 'west stone rock entrance' },
    { x: 7.8, z: 2.2, radius: 4.8, label: 'village sakura tree' },
    { x: -9.5, z: 12.5, radius: 4.5, label: 'village elder green tree' },
    { x: -6.2, z: -15.2, radius: 5.2, label: 'village reflection pond' },

    // Village Traveler Camp & Notice Board
    { x: -7.5, z: -9.2, radius: 3.8, label: 'village tent clearing' },
    { x: 6.8, z: -12.0, radius: 2.8, label: 'village wooden cart' },
    { x: 3.4, z: 10.5, radius: 2.4, label: 'village notice board' },

    // 3 Village Memory Pedestals
    { x: 6.4, z: 5.4, radius: 2.6, label: 'village east pedestal' },
    { x: -7.2, z: 4.2, radius: 2.4, label: 'village west pedestal' },
    { x: 3.2, z: -8.6, radius: 2.4, label: 'village north pedestal' },

    // Village Street Lamps
    { x: 2.8, z: 5.2, radius: 1.5, label: 'village lamp 1' },
    { x: -3.2, z: 5.2, radius: 1.5, label: 'village lamp 2' },
    { x: 2.6, z: -4.5, radius: 1.5, label: 'village lamp 3' },
    { x: -3.0, z: -4.5, radius: 1.5, label: 'village lamp 4' },
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

