// src/components/Character/MaleWandererGLB.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { playerTelemetry } from '../../store/useGameStore';
import { gameAudio } from '../../systems/Audio/gameAudio';
import type { WandererAnimState } from './FemaleWandererGLB';

export const MALE_WANDERER_GLB_PATH = '/KeepSakeMale-v2-animated.glb';

export interface MaleWandererGLBProps {
    moveState: WandererAnimState;
    horizSpeed: number;
    isGrounded: boolean;
    walkSpeedRef: number;
    runSpeedRef: number;
}

const CHARACTER_SCALE = 1.78;
const NATIVE_MIN_Y = -0.489471435546875;
const SOLE_CONTACT_SINK = -0.058;
const GROUND_FOOT_OFFSET = -NATIVE_MIN_Y * CHARACTER_SCALE + SOLE_CONTACT_SINK;

/**
 * Physical stride calibration derived from KeepSakeMale-v2-animated.glb:
 * - Walk (duration 1.6667s, 2 steps) covers ~2.24m per cycle.
 * - Sprint (duration 0.8333s, 2 steps) covers ~3.65m per cycle.
 * Allows timeScale up to 2.25x so sprinting at 8.45 m/s stays locked to the ground.
 */
const WALK_CYCLE_DISTANCE = 2.24;
const SPRINT_CYCLE_DISTANCE = 3.65;

const sanitizedMaleClipCache = new Map<string, THREE.AnimationClip>();

function getOrPrepareMaleAnimationClip(
    originalClip: THREE.AnimationClip,
    mode: 'walk' | 'sprint' | 'jump'
): THREE.AnimationClip {
    const cacheKey = `male_${originalClip.name}_${mode}`;
    const cached = sanitizedMaleClipCache.get(cacheKey);
    if (cached) return cached;

    const clip = originalClip.clone();
    const filteredTracks: THREE.KeyframeTrack[] = [];
    const bindPelvisZ = 0.5068215554328458;

    for (const track of clip.tracks) {
        if (mode === 'jump' && track.name.endsWith('root.position')) {
            continue;
        }

        if (track.name.endsWith('pelvis.position')) {
            const clonedTrack = track.clone();
            const values = clonedTrack.values;

            if (mode === 'jump') {
                for (let i = 0; i < values.length; i += 3) {
                    values[i] = values[i] * 0.25;
                    values[i + 1] = values[i + 1] * 0.25;
                    values[i + 2] =
                        bindPelvisZ + (values[i + 2] - bindPelvisZ) * 0.25;
                }
            } else {
                let minZ = Infinity;
                for (let i = 2; i < values.length; i += 3) {
                    if (values[i] < minZ) minZ = values[i];
                }
                const groundShift =
                    minZ < Infinity ? bindPelvisZ - 0.032 - minZ : 0;
                for (let i = 2; i < values.length; i += 3) {
                    values[i] += groundShift * 0.35;
                }
            }

            filteredTracks.push(clonedTrack);
            continue;
        }

        filteredTracks.push(track);
    }

    clip.tracks = filteredTracks;
    sanitizedMaleClipCache.set(cacheKey, clip);
    return clip;
}

export const MaleWandererGLB: React.FC<MaleWandererGLBProps> = React.memo(
    () => {
        const gltf = useGLTF(
            MALE_WANDERER_GLB_PATH,
            true,
            true,
            (loader) => {
                loader.setMeshoptDecoder(MeshoptDecoder);
            }
        );

        const modelContainerRef = useRef<THREE.Group>(null);
        const lanternLightRef = useRef<THREE.PointLight>(null);

        const { clonedScene, footOffset } = useMemo(() => {
            const sceneClone = cloneSkeleton(gltf.scene);

            sceneClone.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.frustumCulled = false;

                    if (mesh.material) {
                        const materials = Array.isArray(mesh.material)
                            ? mesh.material
                            : [mesh.material];
                        materials.forEach((mat) => {
                            if (
                                (mat as THREE.MeshStandardMaterial)
                                    .isMeshStandardMaterial
                            ) {
                                const stdMat =
                                    mat as THREE.MeshStandardMaterial;
                                stdMat.envMapIntensity = 1.05;
                                stdMat.roughness = Math.max(
                                    0.65,
                                    stdMat.roughness
                                );

                                const texList = [
                                    stdMat.map,
                                    stdMat.normalMap,
                                    stdMat.roughnessMap,
                                    stdMat.metalnessMap,
                                ];
                                texList.forEach((tex) => {
                                    if (tex) {
                                        tex.anisotropy = 4;
                                        tex.generateMipmaps = true;
                                    }
                                });

                                stdMat.needsUpdate = true;
                            }
                        });
                    }
                }
            });

            return {
                clonedScene: sceneClone,
                footOffset: GROUND_FOOT_OFFSET,
            };
        }, [gltf.scene]);

        const mixerRef = useRef<THREE.AnimationMixer | null>(null);
        const actionsRef = useRef<{
            Walk: THREE.AnimationAction | null;
            Sprint: THREE.AnimationAction | null;
            Jump_2_RM: THREE.AnimationAction | null;
        }>({
            Walk: null,
            Sprint: null,
            Jump_2_RM: null,
        });

        const prevGroundedRef = useRef<boolean>(true);
        const isJumpActiveRef = useRef<boolean>(false);
        const walkWeightRef = useRef<number>(0);
        const sprintWeightRef = useRef<number>(0);

        useEffect(() => {
            const mixer = new THREE.AnimationMixer(clonedScene);
            mixerRef.current = mixer;

            const rawWalk =
                THREE.AnimationClip.findByName(gltf.animations, 'Walk') ||
                THREE.AnimationClip.findByName(gltf.animations, 'Walk_2');
            const rawSprint = THREE.AnimationClip.findByName(
                gltf.animations,
                'Sprint'
            );
            const rawJump = THREE.AnimationClip.findByName(
                gltf.animations,
                'Jump_2_RM'
            );

            const walkAction = rawWalk
                ? mixer.clipAction(
                    getOrPrepareMaleAnimationClip(rawWalk, 'walk')
                )
                : null;
            const sprintAction = rawSprint
                ? mixer.clipAction(
                    getOrPrepareMaleAnimationClip(rawSprint, 'sprint')
                )
                : null;
            const jumpAction = rawJump
                ? mixer.clipAction(
                    getOrPrepareMaleAnimationClip(rawJump, 'jump')
                )
                : null;

            if (walkAction) {
                walkAction.setLoop(THREE.LoopRepeat, Infinity);
                walkAction.clampWhenFinished = false;
                walkAction.enabled = true;
                walkAction.setEffectiveWeight(0);
                walkAction.play();
            }

            if (sprintAction) {
                sprintAction.setLoop(THREE.LoopRepeat, Infinity);
                sprintAction.clampWhenFinished = false;
                sprintAction.enabled = true;
                sprintAction.setEffectiveWeight(0);
                sprintAction.play();
            }

            if (jumpAction) {
                jumpAction.setLoop(THREE.LoopOnce, 1);
                jumpAction.clampWhenFinished = true;
                jumpAction.enabled = true;
                jumpAction.setEffectiveWeight(0);
            }

            actionsRef.current = {
                Walk: walkAction,
                Sprint: sprintAction,
                Jump_2_RM: jumpAction,
            };

            mixer.update(0);

            return () => {
                mixer.stopAllAction();
                mixer.uncacheRoot(clonedScene);
                mixerRef.current = null;
            };
        }, [clonedScene, gltf.animations]);

        useFrame((_, rawDelta) => {
            const delta = Math.min(rawDelta, 0.05);
            const mixer = mixerRef.current;
            const { Walk, Sprint, Jump_2_RM } = actionsRef.current;

            if (mixer) {
                const vx = playerTelemetry.velocity[0];
                const vz = playerTelemetry.velocity[2];
                const liveSpeed = Math.hypot(vx, vz);
                const isGrounded = playerTelemetry.isGrounded;
                const moveState = playerTelemetry.moveState;

                if (!isGrounded) {
                    if (
                        prevGroundedRef.current &&
                        Jump_2_RM &&
                        !isJumpActiveRef.current
                    ) {
                        isJumpActiveRef.current = true;
                        Jump_2_RM.reset();
                        Jump_2_RM.enabled = true;
                        Jump_2_RM.setLoop(THREE.LoopOnce, 1);
                        Jump_2_RM.clampWhenFinished = true;
                        Jump_2_RM.timeScale = 1.62;
                        Jump_2_RM.setEffectiveWeight(1.0);
                        Jump_2_RM.fadeIn(0.12);
                        Jump_2_RM.play();
                    }
                    walkWeightRef.current = THREE.MathUtils.lerp(
                        walkWeightRef.current,
                        0,
                        Math.min(1, delta * 12)
                    );
                    sprintWeightRef.current = THREE.MathUtils.lerp(
                        sprintWeightRef.current,
                        0,
                        Math.min(1, delta * 12)
                    );
                } else {
                    if (!prevGroundedRef.current && Jump_2_RM) {
                        isJumpActiveRef.current = false;
                        Jump_2_RM.fadeOut(0.16);
                    }

                    let targetWalkW = 0;
                    let targetSprintW = 0;

                    if (liveSpeed > 0.08) {
                        const sprintBlend =
                            moveState === 'run'
                                ? THREE.MathUtils.smoothstep(
                                    liveSpeed,
                                    2.85,
                                    4.8
                                )
                                : THREE.MathUtils.smoothstep(
                                    liveSpeed,
                                    3.2,
                                    5.4
                                );

                        const locomotionEnvelope = THREE.MathUtils.smoothstep(
                            liveSpeed,
                            0.06,
                            0.42
                        );

                        targetWalkW = (1.0 - sprintBlend) * locomotionEnvelope;
                        targetSprintW = sprintBlend * locomotionEnvelope;
                    }

                    const blendRate = liveSpeed > 0.08 ? 11.5 : 9.5;
                    walkWeightRef.current = THREE.MathUtils.lerp(
                        walkWeightRef.current,
                        targetWalkW,
                        Math.min(1, delta * blendRate)
                    );
                    sprintWeightRef.current = THREE.MathUtils.lerp(
                        sprintWeightRef.current,
                        targetSprintW,
                        Math.min(1, delta * blendRate)
                    );

                    if (walkWeightRef.current < 0.005 && targetWalkW === 0) {
                        walkWeightRef.current = 0;
                    }
                    if (
                        sprintWeightRef.current < 0.005 &&
                        targetSprintW === 0
                    ) {
                        sprintWeightRef.current = 0;
                    }
                }

                prevGroundedRef.current = isGrounded;

                if (Walk) {
                    Walk.enabled = true;
                    Walk.setEffectiveWeight(walkWeightRef.current);

                    const walkClipDur = Walk.getClip().duration || 1.666667;
                    if (liveSpeed > 0.08 && isGrounded) {
                        const exactWalkRate =
                            (liveSpeed * walkClipDur) / WALK_CYCLE_DISTANCE;
                        Walk.timeScale = THREE.MathUtils.clamp(
                            exactWalkRate,
                            0.25,
                            2.1
                        );
                    } else {
                        Walk.timeScale = THREE.MathUtils.lerp(
                            Walk.timeScale,
                            0,
                            Math.min(1, delta * 12)
                        );
                    }
                }

                if (Sprint) {
                    Sprint.enabled = true;
                    Sprint.setEffectiveWeight(sprintWeightRef.current);

                    const sprintClipDur =
                        Sprint.getClip().duration || 0.833333;
                    if (liveSpeed > 0.2 && isGrounded) {
                        const exactSprintRate =
                            (liveSpeed * sprintClipDur) / SPRINT_CYCLE_DISTANCE;
                        Sprint.timeScale = THREE.MathUtils.clamp(
                            exactSprintRate,
                            0.55,
                            2.25
                        );
                    } else {
                        Sprint.timeScale = THREE.MathUtils.lerp(
                            Sprint.timeScale,
                            0,
                            Math.min(1, delta * 12)
                        );
                    }
                }

                mixer.update(delta);

                // Footsteps fire on the clip's own foot-contact boundaries so
                // the SFX stays locked to the visible stride at any speed.
                if (Walk && Sprint) {
                    const walkW = walkWeightRef.current;
                    const sprintW = sprintWeightRef.current;
                    if (sprintW > walkW) {
                        gameAudio.syncLocomotion({
                            source: 'sprint',
                            phase:
                                Sprint.time /
                                (Sprint.getClip().duration || 0.833333),
                            weight: sprintW,
                            speed: liveSpeed,
                            grounded: isGrounded,
                        });
                    } else {
                        gameAudio.syncLocomotion({
                            source: 'walk',
                            phase:
                                Walk.time /
                                (Walk.getClip().duration || 1.666667),
                            weight: walkW,
                            speed: liveSpeed,
                            grounded: isGrounded,
                        });
                    }
                }
            }

            if (lanternLightRef.current) {
                const memDist = playerTelemetry.nearestMemoryDistance;
                const proximityBoost =
                    memDist < 7.0
                        ? Math.pow(1 - memDist / 7.0, 1.5) * 2.2
                        : 0;
                lanternLightRef.current.intensity = THREE.MathUtils.lerp(
                    lanternLightRef.current.intensity,
                    1.15 + proximityBoost,
                    delta * 6
                );
            }
        });

        return (
            <group ref={modelContainerRef}>
                <primitive
                    object={clonedScene}
                    scale={CHARACTER_SCALE}
                    position={[0, footOffset, 0]}
                />

                <pointLight
                    ref={lanternLightRef}
                    position={[-0.22, 0.95, -0.25]}
                    color="#ffd478"
                    intensity={1.15}
                    distance={4.8}
                    decay={2}
                />
            </group>
        );
    }
);

if (typeof window !== 'undefined') {
    window.setTimeout(() => {
        useGLTF.preload(MALE_WANDERER_GLB_PATH, true, true, (loader) => {
            loader.setMeshoptDecoder(MeshoptDecoder);
        });
    }, 600);
}

