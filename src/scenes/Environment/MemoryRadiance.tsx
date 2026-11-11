// src/scenes/Environment/MemoryRadiance.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import { THEME } from '../../styles/theme';

const SHARED_MOTE_GEOMETRY = new THREE.OctahedronGeometry(1, 0);

export const MemoryRadiance: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const persistentMemories = useGameStore((state) => state.persistentMemories);

    const motesMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Ray cones and volumetric motes around active memories
    const motes = useMemo(
        () =>
            Array.from({ length: 48 }).map((_, i) => ({
                offsetAngle: (i / 48) * Math.PI * 2,
                dist: 0.6 + (i % 6) * 0.75,
                baseY: 0.4 + (i % 8) * 0.32,
                speed: 0.8 + (i % 4) * 0.4,
                scale: 0.04 + (i % 3) * 0.025,
            })),
        []
    );

    useFrame(({ clock }, rawDelta) => {
        if (phase !== 'exploring') return;
        const delta = Math.min(rawDelta, 0.05);
        const t = clock.getElapsedTime();
        const [px, , pz] = playerTelemetry.position;

        // 1. Calculate nearest memory and smooth radial falloff
        let minDist = 999;
        let nearestPos: [number, number, number] = [0, 0, 0];

        for (let i = 0; i < persistentMemories.length; i++) {
            const mem = persistentMemories[i];
            const d = Math.hypot(px - mem.position[0], pz - mem.position[2]);
            if (d < minDist) {
                minDist = d;
                nearestPos = [mem.position[0], mem.position[1], mem.position[2]];
            }
        }

        playerTelemetry.nearestMemoryDistance = minDist;
        playerTelemetry.nearestMemoryPosition = nearestPos;

        // Smooth radiance falloff (0 outside 8m, ramp to 1 at <2.5m)
        const targetRadiance =
            minDist < 8.0
                ? Math.pow(THREE.MathUtils.clamp(1.0 - minDist / 8.0, 0, 1), 1.25)
                : 0;

        playerTelemetry.nearestMemoryRadiance = THREE.MathUtils.lerp(
            playerTelemetry.nearestMemoryRadiance,
            targetRadiance,
            delta * 4.5
        );

        const rad = playerTelemetry.nearestMemoryRadiance;

        // 2. Animate Golden Motes rising in the illuminated memory zone
        if (motesMeshRef.current) {
            const isVisible = rad > 0.04;
            motesMeshRef.current.visible = isVisible;

            if (isVisible) {
                for (let idx = 0; idx < motes.length; idx++) {
                    const m = motes[idx];
                    const angle = m.offsetAngle + t * 0.15 * m.speed;
                    const r = m.dist * (0.8 + Math.sin(t * 1.5 + idx) * 0.2);
                    const wx = nearestPos[0] + Math.cos(angle) * r;
                    const wz = nearestPos[2] + Math.sin(angle) * r;
                    const wy =
                        nearestPos[1] + ((m.baseY + t * 0.45 * m.speed) % 3.6);

                    dummy.position.set(wx, wy, wz);
                    const s =
                        m.scale *
                        (0.4 + rad * 0.6) *
                        Math.max(0, 1.0 - (wy - nearestPos[1]) / 4.0);
                    dummy.scale.set(s, s, s);
                    dummy.updateMatrix();
                    motesMeshRef.current.setMatrixAt(idx, dummy.matrix);
                }
                motesMeshRef.current.instanceMatrix.needsUpdate = true;
            }
        }
    });

    if (phase !== 'exploring') return null;

    return (
        <group>
            {/* Volumetric Soft Rays over Active Memories */}
            {persistentMemories.map((mem) => (
                <group key={`radiance-rays-${mem.id}`} position={mem.position}>
                    {/* Gentle Downward Angled Volumetric Light Cone */}
                    <mesh position={[0, 2.2, 0]} rotation={[0, 0, Math.PI]}>
                        <coneGeometry args={[2.8, 4.4, 16, 1, true]} />
                        <meshBasicMaterial
                            color={THEME.colors.memoryGold}
                            transparent
                            opacity={0.14}
                            side={THREE.DoubleSide}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                        />
                    </mesh>
                </group>
            ))}

            {/* Radiant Floating Motes */}
            <instancedMesh
                ref={motesMeshRef}
                args={[SHARED_MOTE_GEOMETRY, undefined, motes.length]}
                frustumCulled={false}
            >
                <meshBasicMaterial
                    color={THEME.colors.memoryCore}
                    transparent
                    opacity={0.85}
                    blending={THREE.AdditiveBlending}
                />
            </instancedMesh>
        </group>
    );
};