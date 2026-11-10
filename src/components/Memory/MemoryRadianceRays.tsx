// src/components/Memory/MemoryRadianceRays.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import { THEME } from '../../styles/theme';

export const MemoryRadianceRays: React.FC = () => {
    const persistentMemories = useGameStore((state) => state.persistentMemories);
    const phase = useGameStore((state) => state.phase);

    const raysGroupRef = useRef<THREE.Group>(null);
    const firefliesMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Soft cone ray geometry
    const rayGeo = useMemo(() => {
        const geo = new THREE.ConeGeometry(2.4, 8.5, 8, 1, true);
        geo.translate(0, 4.25, 0);
        return geo;
    }, []);

    const fireflies = useMemo(() => {
        return Array.from({ length: 48 }).map((_, i) => ({
            offset: [
                (Math.sin(i * 3.7) - 0.5) * 6,
                0.8 + (Math.sin(i * 7.1) + 1) * 1.6,
                (Math.cos(i * 5.3) - 0.5) * 6,
            ],
            speed: 0.6 + (i % 5) * 0.25,
            phase: i * 0.4,
        }));
    }, []);

    useFrame(({ clock }, delta) => {
        if (phase !== 'exploring') return;
        const t = clock.getElapsedTime();
        const [px, , pz] = playerTelemetry.position;

        let nearestMem = null;
        let nearestDist = 999;
        for (const m of persistentMemories) {
            const d = Math.hypot(px - m.position[0], pz - m.position[2]);
            if (d < nearestDist) {
                nearestDist = d;
                nearestMem = m;
            }
        }

        if (raysGroupRef.current) {
            if (nearestMem && nearestDist < 16) {
                const falloff = THREE.MathUtils.smoothstep(16, 2.5, nearestDist);
                raysGroupRef.current.position.set(
                    nearestMem.position[0],
                    nearestMem.position[1],
                    nearestMem.position[2]
                );
                raysGroupRef.current.rotation.y = t * 0.08;
                raysGroupRef.current.scale.setScalar(0.7 + falloff * 0.5);

                raysGroupRef.current.children.forEach((child, idx) => {
                    const mesh = child as THREE.Mesh;
                    const mat = mesh.material as THREE.MeshBasicMaterial;
                    mat.opacity = (0.08 + Math.sin(t * 1.4 + idx) * 0.04) * falloff;
                });
            } else {
                raysGroupRef.current.scale.setScalar(0);
            }
        }

        if (firefliesMeshRef.current && nearestMem && nearestDist < 14) {
            const falloff = THREE.MathUtils.smoothstep(14, 3, nearestDist);
            for (let i = 0; i < fireflies.length; i++) {
                const ff = fireflies[i];
                const fx =
                    nearestMem.position[0] +
                    ff.offset[0] +
                    Math.sin(t * ff.speed + ff.phase) * 0.75;
                const fy =
                    nearestMem.position[1] +
                    ff.offset[1] +
                    Math.cos(t * ff.speed * 1.3 + ff.phase) * 0.45;
                const fz =
                    nearestMem.position[2] +
                    ff.offset[2] +
                    Math.sin(t * ff.speed * 0.8 + ff.phase) * 0.75;

                const s = (0.04 + Math.sin(t * 3.5 + ff.phase) * 0.02) * falloff;
                dummy.position.set(fx, fy, fz);
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                firefliesMeshRef.current.setMatrixAt(i, dummy.matrix);
            }
            firefliesMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Volumetric Radiance Rays */}
            <group ref={raysGroupRef} scale={0}>
                {[0, 1.05, 2.1, 3.14, 4.2, 5.24].map((rot, idx) => (
                    <mesh
                        key={idx}
                        geometry={rayGeo}
                        rotation={[0.18 * (idx % 2 === 0 ? 1 : -1), rot, 0.12]}
                    >
                        <meshBasicMaterial
                            color={THEME.colors.memoryGold}
                            transparent
                            opacity={0.12}
                            side={THREE.DoubleSide}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                        />
                    </mesh>
                ))}
            </group>

            {/* Localized Floating Fireflies */}
            <instancedMesh
                ref={firefliesMeshRef}
                args={[undefined, undefined, fireflies.length]}
            >
                <dodecahedronGeometry args={[1, 0]} />
                <meshBasicMaterial color="#fff3cc" />
            </instancedMesh>
        </group>
    );
};