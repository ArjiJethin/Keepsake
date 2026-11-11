// src/components/Character/FemaleWandererGLB.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { playerTelemetry } from '../../store/useGameStore';

export const FEMALE_WANDERER_GLB_PATH = '/KeepSakeFemale-v2-animated.glb';

export type WandererAnimState = 'idle' | 'walk' | 'run' | 'jump';

export interface FemaleWandererGLBProps {
    moveState: WandererAnimState;
    horizSpeed: number;
    isGrounded: boolean;
    walkSpeedRef: number;
    runSpeedRef: number;
}

/**
 * Native height of KeepSakeFemale-v2-animated.glb is ~0.9787m
 * (min Y = -0.489288, max Y = +0.489380).
 * Scaling by 1.78 yields a 1.742m tall character that matches the Keepsake
 * environment, doorways, bridges, pedestals, and 1.56m camera pivot.
 */
const CHARACTER_SCALE = 1.78;
const NATIVE_MIN_Y = -0.489288330078125;
const GROUND_FOOT_OFFSET = -NATIVE_MIN_Y * CHARACTER_SCALE;

/**
 * Clones an AnimationClip and strips root-motion translation tracks that would
 * otherwise fight the existing PlayerCharacter physics & jump controller.
 */
function prepareAnimationClip(
    originalClip: THREE.AnimationClip,
    stripRootMotion: boolean
): THREE.AnimationClip {
    const clip = originalClip.clone();

    if (!stripRootMotion) {
        return clip;
    }

    const filteredTracks: THREE.KeyframeTrack[] = [];

    for (const track of clip.tracks) {
        // Channel 0 in Jump_2_RM animates "root.position" from Y=-0.489 to +0.287.
        // Removing this track keeps the root bone anchored to the controller origin.
        if (track.name.endsWith('root.position')) {
            continue;
        }

        // Channel 2 in Jump_2_RM animates "pelvis.position" Z from 0.426 to 0.600.
        // Dampen vertical/forward root displacement on pelvis during Jump_2_RM so
        // PlayerCharacter's gravity/jump parabola controls the exact airborne height.
        if (track.name.endsWith('pelvis.position')) {
            const clonedTrack = track.clone();
            const values = clonedTrack.values;
            const baseZ = 0.5409435444687573;
            for (let i = 0; i < values.length; i += 3) {
                // Keep subtle hip tuck (25%) without launching the mesh away from the collider
                values[i] = values[i] * 0.25;
                values[i + 1] = values[i + 1] * 0.25;
                values[i + 2] = baseZ + (values[i + 2] - baseZ) * 0.25;
            }
            filteredTracks.push(clonedTrack);
            continue;
        }

        filteredTracks.push(track);
    }

    clip.tracks = filteredTracks;
    return clip;
}

export const FemaleWandererGLB: React.FC<FemaleWandererGLBProps> = React.memo(
    ({ moveState, horizSpeed, walkSpeedRef, runSpeedRef }) => {
        const gltf = useGLTF(FEMALE_WANDERER_GLB_PATH);

        const modelContainerRef = useRef<THREE.Group>(null);
        const lanternLightRef = useRef<THREE.PointLight>(null);

        // Clone the skinned scene graph so skeleton, bones, and materials are preserved cleanly
        const { clonedScene, footOffset } = useMemo(() => {
            const sceneClone = cloneSkeleton(gltf.scene);

            sceneClone.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    // Prevent frustum culling artifacts when bones animate limbs
                    mesh.frustumCulled = false;

                    if (mesh.material) {
                        const materials = Array.isArray(mesh.material)
                            ? mesh.material
                            : [mesh.material];
                        materials.forEach((mat) => {
                            if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                                const stdMat = mat as THREE.MeshStandardMaterial;
                                stdMat.envMapIntensity = 1.05;
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

        // Set up AnimationMixer and inspect actual animation clips by name
        const mixerRef = useRef<THREE.AnimationMixer | null>(null);
        const actionsRef = useRef<{
            Walk_2: THREE.AnimationAction | null;
            Sprint: THREE.AnimationAction | null;
            Jump_2_RM: THREE.AnimationAction | null;
        }>({
            Walk_2: null,
            Sprint: null,
            Jump_2_RM: null,
        });

        const activeStateRef = useRef<WandererAnimState>('idle');
        const isJumpPlayingRef = useRef<boolean>(false);

        useEffect(() => {
            const mixer = new THREE.AnimationMixer(clonedScene);
            mixerRef.current = mixer;

            const rawWalk = THREE.AnimationClip.findByName(
                gltf.animations,
                'Walk_2'
            );
            const rawSprint = THREE.AnimationClip.findByName(
                gltf.animations,
                'Sprint'
            );
            const rawJump = THREE.AnimationClip.findByName(
                gltf.animations,
                'Jump_2_RM'
            );

            const walkAction = rawWalk
                ? mixer.clipAction(prepareAnimationClip(rawWalk, false))
                : null;
            const sprintAction = rawSprint
                ? mixer.clipAction(prepareAnimationClip(rawSprint, false))
                : null;
            const jumpAction = rawJump
                ? mixer.clipAction(prepareAnimationClip(rawJump, true))
                : null;

            if (walkAction) {
                walkAction.setLoop(THREE.LoopRepeat, Infinity);
                walkAction.clampWhenFinished = false;
                walkAction.setEffectiveWeight(0);
            }

            if (sprintAction) {
                sprintAction.setLoop(THREE.LoopRepeat, Infinity);
                sprintAction.clampWhenFinished = false;
                sprintAction.setEffectiveWeight(0);
            }

            if (jumpAction) {
                jumpAction.setLoop(THREE.LoopOnce, 1);
                jumpAction.clampWhenFinished = true;
                jumpAction.setEffectiveWeight(0);
            }

            actionsRef.current = {
                Walk_2: walkAction,
                Sprint: sprintAction,
                Jump_2_RM: jumpAction,
            };

            // Advance mixer by 0 delta immediately to apply the initial standing pose
            mixer.update(0);

            return () => {
                mixer.stopAllAction();
                mixer.uncacheRoot(clonedScene);
                mixerRef.current = null;
            };
        }, [clonedScene, gltf.animations]);

        // Handle Animation State Transitions & Crossfading
        useEffect(() => {
            const { Walk_2, Sprint, Jump_2_RM } = actionsRef.current;
            const prevState = activeStateRef.current;

            if (moveState === prevState) return;
            activeStateRef.current = moveState;

            const CROSSFADE_DURATION = 0.22;

            if (moveState === 'jump') {
                // Play Jump_2_RM once per jump; do not restart if already airborne
                if (Jump_2_RM && !isJumpPlayingRef.current) {
                    isJumpPlayingRef.current = true;
                    Jump_2_RM.reset();
                    Jump_2_RM.setLoop(THREE.LoopOnce, 1);
                    Jump_2_RM.clampWhenFinished = true;
                    // Scale 1.625s clip to match ~0.72s airtime of the physics jump
                    Jump_2_RM.timeScale = 1.65;
                    Jump_2_RM.setEffectiveWeight(1.0);
                    Jump_2_RM.fadeIn(0.14);
                    Jump_2_RM.play();

                    if (Walk_2 && Walk_2.isRunning()) {
                        Walk_2.fadeOut(0.16);
                    }
                    if (Sprint && Sprint.isRunning()) {
                        Sprint.fadeOut(0.16);
                    }
                }
                return;
            }

            // Player has landed or is grounded
            isJumpPlayingRef.current = false;

            if (moveState === 'walk') {
                if (Walk_2) {
                    Walk_2.enabled = true;
                    Walk_2.timeScale = 1.0;
                    Walk_2.setEffectiveWeight(1.0);
                    if (!Walk_2.isRunning()) {
                        Walk_2.play();
                    }
                    Walk_2.fadeIn(CROSSFADE_DURATION);
                }
                if (Sprint && Sprint.isRunning()) {
                    Sprint.fadeOut(CROSSFADE_DURATION);
                }
                if (Jump_2_RM && Jump_2_RM.isRunning()) {
                    Jump_2_RM.fadeOut(0.18);
                }
            } else if (moveState === 'run') {
                if (Sprint) {
                    Sprint.enabled = true;
                    Sprint.timeScale = 1.0;
                    Sprint.setEffectiveWeight(1.0);
                    if (!Sprint.isRunning()) {
                        Sprint.reset();
                        Sprint.play();
                    }
                    Sprint.fadeIn(CROSSFADE_DURATION);
                }
                if (Walk_2 && Walk_2.isRunning()) {
                    Walk_2.fadeOut(CROSSFADE_DURATION);
                }
                if (Jump_2_RM && Jump_2_RM.isRunning()) {
                    Jump_2_RM.fadeOut(0.18);
                }
            } else if (moveState === 'idle') {
                // When idle, smoothly fade out all movement animations so character rests in natural standing pose
                if (Walk_2 && Walk_2.isRunning()) {
                    Walk_2.fadeOut(CROSSFADE_DURATION);
                }
                if (Sprint && Sprint.isRunning()) {
                    Sprint.fadeOut(CROSSFADE_DURATION);
                }
                if (Jump_2_RM && Jump_2_RM.isRunning()) {
                    Jump_2_RM.fadeOut(0.2);
                }
            }
        }, [moveState]);

        // Per-Frame Mixer Update, Speed Synchronization & Lantern Glow
        useFrame((_, rawDelta) => {
            const delta = Math.min(rawDelta, 0.05);
            const mixer = mixerRef.current;
            const { Walk_2, Sprint } = actionsRef.current;

            if (mixer) {
                if (moveState === 'walk' && Walk_2) {
                    // Synchronize Walk_2 playback rate with actual controller speed
                    const speedRatio = THREE.MathUtils.clamp(
                        horizSpeed / Math.max(0.1, walkSpeedRef),
                        0.45,
                        1.35
                    );
                    Walk_2.timeScale = THREE.MathUtils.lerp(
                        Walk_2.timeScale,
                        speedRatio,
                        delta * 10
                    );
                } else if (moveState === 'run' && Sprint) {
                    // Synchronize Sprint playback rate with actual sprint speed
                    const sprintRatio = THREE.MathUtils.clamp(
                        horizSpeed / Math.max(0.1, runSpeedRef),
                        0.7,
                        1.3
                    );
                    Sprint.timeScale = THREE.MathUtils.lerp(
                        Sprint.timeScale,
                        sprintRatio,
                        delta * 10
                    );
                }

                mixer.update(delta);
            }

            // Preserve Keepsake's signature Memory Lantern proximity glow
            if (lanternLightRef.current) {
                const memDist = playerTelemetry.nearestMemoryDistance;
                const proximityBoost =
                    memDist < 7.0 ? Math.pow(1 - memDist / 7.0, 1.5) * 2.2 : 0;
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

                {/* Warm Keepsake Explorer Aura Light (Brightens near Memory Pedestals) */}
                <pointLight
                    ref={lanternLightRef}
                    position={[0.22, 0.95, -0.25]}
                    color="#ffd478"
                    intensity={1.15}
                    distance={4.8}
                    decay={2}
                />
            </group>
        );
    }
);

// Preload the GLB asset for immediate availability on scene mount
useGLTF.preload(FEMALE_WANDERER_GLB_PATH);