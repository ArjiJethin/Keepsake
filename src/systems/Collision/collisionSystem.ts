// src/systems/Collision/collisionSystem.ts
import * as THREE from 'three';

export interface SolidCollider {
    id: string;
    x: number;
    y: number;
    z: number;
    radius: number;
    height: number;
    blocksCamera: boolean;
}

class SpatialCollisionManager {
    private chunkColliders = new Map<string, SolidCollider[]>();
    private staticColliders: SolidCollider[] = [];

    public setStaticColliders(colliders: SolidCollider[]) {
        this.staticColliders = colliders;
    }

    public registerChunk(chunkKey: string, colliders: SolidCollider[]) {
        this.chunkColliders.set(chunkKey, colliders);
    }

    public unregisterChunk(chunkKey: string) {
        this.chunkColliders.delete(chunkKey);
    }

    /**
     * Resolves horizontal cylinder pushback so the player cannot walk through
     * trees, boulders, archway pillars, or memory pedestals.
     */
    public resolvePlayerMovement(
        nextX: number,
        nextY: number,
        nextZ: number,
        playerRadius = 0.42
    ): [number, number] {
        let resolvedX = nextX;
        let resolvedZ = nextZ;

        const allLists = [this.staticColliders, ...this.chunkColliders.values()];

        for (const list of allLists) {
            for (let i = 0; i < list.length; i++) {
                const col = list[i];
                // Quick vertical overlap check
                if (nextY > col.y + col.height || nextY + 1.7 < col.y) continue;

                const dx = resolvedX - col.x;
                const dz = resolvedZ - col.z;
                const minDist = playerRadius + col.radius;
                const distSq = dx * dx + dz * dz;

                if (distSq < minDist * minDist && distSq > 0.00001) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    resolvedX += (dx / dist) * overlap;
                    resolvedZ += (dz / dist) * overlap;
                }
            }
        }

        return [resolvedX, resolvedZ];
    }

    /**
     * Multi-probe ray vs cylinder + bounding intersection for the Third-Person Camera.
     * Returns the maximum safe fraction [0.12 .. 1.0] along the pivot->camera segment.
     */
    public computeSafeCameraFraction(
        pivot: THREE.Vector3,
        desiredCam: THREE.Vector3,
        cameraMargin = 0.38
    ): number {
        const segDir = desiredCam.clone().sub(pivot);
        const segLen = segDir.length();
        if (segLen < 0.001) return 1.0;
        segDir.divideScalar(segLen);

        let minFraction = 1.0;
        const allLists = [this.staticColliders, ...this.chunkColliders.values()];

        for (const list of allLists) {
            for (let i = 0; i < list.length; i++) {
                const col = list[i];
                if (!col.blocksCamera) continue;

                // 2D ray-circle intersection in XZ plane with vertical height bounds check
                const ox = pivot.x - col.x;
                const oz = pivot.z - col.z;
                const dx = segDir.x;
                const dz = segDir.z;

                const a = dx * dx + dz * dz;
                if (a < 0.0001) continue;

                const r = col.radius + cameraMargin;
                const b = 2 * (ox * dx + oz * dz);
                const c = ox * ox + oz * oz - r * r;
                const disc = b * b - 4 * a * c;

                if (disc >= 0) {
                    const sqrtDisc = Math.sqrt(disc);
                    const t1 = (-b - sqrtDisc) / (2 * a);
                    if (t1 > 0.05 && t1 < segLen) {
                        const hitY = pivot.y + segDir.y * t1;
                        if (hitY >= col.y - 0.3 && hitY <= col.y + col.height + 0.3) {
                            const frac = Math.max(0.15, (t1 - 0.15) / segLen);
                            if (frac < minFraction) {
                                minFraction = frac;
                            }
                        }
                    }
                }
            }
        }

        return minFraction;
    }
}

export const collisionManager = new SpatialCollisionManager();