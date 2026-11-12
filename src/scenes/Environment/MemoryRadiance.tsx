// src/scenes/Environment/MemoryRadiance.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';

// Crisp diamond star-sparkle geometry for floating magical twinkles
const SPARKLE_DIAMOND_GEO = new THREE.OctahedronGeometry(1, 0);

interface SparkleParticle {
    pedestalOffset: number;
    angle: number;
    radius: number;
    heightOffset: number;
    speed: number;
    twinkleFreq: number;
    twinklePhase: number;
    baseScale: number;
}

/**
 * Replaces the old downward torch-cone beam with an elegant, high-performance
 * magical sparkle & starlight twinkle system around pedestals and memory crystals.
 */
export const MemoryRadiance: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const persistentMemories = useGameStore((state) => state.persistentMemories);

    const goldSparklesRef = useRef<THREE.InstancedMesh>(null);
    const crystalTwinklesRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const SPARKLES_PER_PEDESTAL = 14;
    const MAX_VISIBLE_PEDESTALS = 8;
    const TOTAL_SPARKLES = SPARKLES_PER_PEDESTAL * MAX_VISIBLE_PEDESTALS;

    const sparkles = useMemo<SparkleParticle[]>(() => {
        return Array.from({ length: TOTAL_SPARKLES }).map((_, i) => ({
            pedestalOffset: Math.floor(i / SPARKLES_PER_PEDESTAL),
            angle: ((i % SPARKLES_PER_PEDESTAL) / SPARKLES_PER_PEDESTAL) * Math.PI * 2 + (i * 0.41),
            radius: 0.32 + (i % 5) * 0.28,
            heightOffset: 0.45 + (i % 7) * 0.34,
            speed: 0.45 + (i % 4) * 0.22,
            twinkleFreq: 2.2 + (i % 5) * 0.85,
            twinklePhase: i * 1.13,
            baseScale: 0.026 + (i % 3) * 0.014,
        }));
    }, [TOTAL_SPARKLES]);

    useFrame(({ clock }, rawDelta) => {
        if (phase !== 'exploring') return;
        const delta = Math.min(rawDelta, 0.05);
        const t = clock.getElapsedTime();
        const [px, , pz] = playerTelemetry.position;

        // 1. Find nearest memory & collect up to MAX_VISIBLE_PEDESTALS within 48m
        let minDist = 999;
        let nearestPos: [number, number, number] = [0, 0, 0];
        const nearbyMemories: Array<{ pos: [number, number, number]; dist: number }> = [];

        for (let i = 0; i < persistentMemories.length; i++) {
            const mem = persistentMemories[i];
            const d = Math.hypot(px - mem.position[0], pz - mem.position[2]);
            if (d < minDist) {
                minDist = d;
                nearestPos = [mem.position[0], mem.position[1], mem.position[2]];
            }
            if (d < 48) {
                nearbyMemories.push({ pos: mem.position, dist: d });
            }
        }

        nearbyMemories.sort((a, b) => a.dist - b.dist);

        playerTelemetry.nearestMemoryDistance = minDist;
        playerTelemetry.nearestMemoryPosition = nearestPos;

        const targetRadiance =
            minDist < 8.5
                ? Math.pow(THREE.MathUtils.clamp(1.0 - minDist / 8.5, 0, 1), 1.25)
                : 0;

        playerTelemetry.nearestMemoryRadiance = THREE.MathUtils.lerp(
            playerTelemetry.nearestMemoryRadiance,
            targetRadiance,
            delta * 4.5
        );

        // 2. Animate subtle floating sparkles and occasional bright twinkles around nearby pedestals
        if (goldSparklesRef.current && crystalTwinklesRef.current) {
            for (let idx = 0; idx < TOTAL_SPARKLES; idx++) {
                const sp = sparkles[idx];
                const targetMem = nearbyMemories[sp.pedestalOffset];

                if (!targetMem) {
                    dummy.position.set(0, -500, 0);
                    dummy.scale.setScalar(0.0001);
                    dummy.updateMatrix();
                    goldSparklesRef.current.setMatrixAt(idx, dummy.matrix);
                    crystalTwinklesRef.current.setMatrixAt(idx, dummy.matrix);
                    continue;
                }

                const [mx, my, mz] = targetMem.pos;
                const distFade = THREE.MathUtils.clamp(1.0 - targetMem.dist / 45.0, 0, 1);

                const spiralAngle = sp.angle + t * sp.speed * 0.65;
                const verticalCycle = (sp.heightOffset + t * sp.speed * 0.42) % 2.55;
                const heightEnvelope = Math.sin((verticalCycle / 2.55) * Math.PI);

                const curRadius =
                    sp.radius * (0.78 + 0.25 * Math.sin(t * 1.3 + sp.twinklePhase));

                const wx = mx + Math.cos(spiralAngle) * curRadius;
                const wz = mz + Math.sin(spiralAngle) * curRadius;
                const wy = my + 0.55 + verticalCycle;

                // Twinkle pulse: gentle floating mote with periodic star-like flash
                const rawWave = Math.sin(t * sp.twinkleFreq + sp.twinklePhase);
                const twinklePulse = Math.pow(Math.max(0, rawWave), 3.0);
                const scale =
                    sp.baseScale *
                    heightEnvelope *
                    distFade *
                    (0.65 + twinklePulse * 1.45);

                dummy.position.set(wx, wy, wz);
                dummy.rotation.set(0, t * 1.8 + sp.twinklePhase, 0);
                // Elongate Y slightly for a delicate four-point star/diamond silhouette
                dummy.scale.set(scale * 0.72, scale * 1.65, scale * 0.72);
                dummy.updateMatrix();

                if (idx % 3 === 0) {
                    crystalTwinklesRef.current.setMatrixAt(idx, dummy.matrix);
                    dummy.scale.setScalar(0.0001);
                    dummy.updateMatrix();
                    goldSparklesRef.current.setMatrixAt(idx, dummy.matrix);
                } else {
                    goldSparklesRef.current.setMatrixAt(idx, dummy.matrix);
                    dummy.scale.setScalar(0.0001);
                    dummy.updateMatrix();
                    crystalTwinklesRef.current.setMatrixAt(idx, dummy.matrix);
                }
            }

            goldSparklesRef.current.instanceMatrix.needsUpdate = true;
            crystalTwinklesRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    if (phase !== 'exploring') return null;

    return (
        <group>
            {/* Warm Golden Floating Sparkles */}
            <instancedMesh
                ref={goldSparklesRef}
                args={[SPARKLE_DIAMOND_GEO, undefined, TOTAL_SPARKLES]}
                frustumCulled={false}
            >
                <meshBasicMaterial
                    color="#ffe699"
                    transparent
                    opacity={0.92}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* Luminous Starlight White-Cyan Twinkle Highlights */}
            <instancedMesh
                ref={crystalTwinklesRef}
                args={[SPARKLE_DIAMOND_GEO, undefined, TOTAL_SPARKLES]}
                frustumCulled={false}
            >
                <meshBasicMaterial
                    color="#e6fbff"
                    transparent
                    opacity={0.95}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </instancedMesh>
        </group>
    );
};

