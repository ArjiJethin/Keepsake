// src/components/Camera/ThirdPersonCamera.tsx
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import { getGardenTerrainHeight } from '../../scenes/Environment/lowPolyUtils';
import { collisionManager } from '../../systems/Collision/collisionSystem';

const MIN_PITCH = -0.22;
const MAX_PITCH = 1.05;
const MIN_DISTANCE = 1.35;
const MAX_DISTANCE = 10.5;

export const ThirdPersonCamera: React.FC = () => {
    const { gl } = useThree();
    const phase = useGameStore((state) => state.phase);
    const inputMode = useGameStore((state) => state.inputMode);
    const setInputMode = useGameStore((state) => state.setInputMode);
    const activeModal = useGameStore((state) => state.activeModal);

    const currentPivot = useRef(new THREE.Vector3(0, 1.56, 7.5));
    const currentLookAt = useRef(new THREE.Vector3(0, 1.56, 3.0));
    const currentDistance = useRef(playerTelemetry.cameraDistance);

    // Synchronize Pointer Lock and Canvas Event Listeners
    useEffect(() => {
        const dom = gl.domElement;

        const requestLock = () => {
            if (document.pointerLockElement !== dom) {
                try {
                    dom.requestPointerLock?.();
                } catch {
                    // Browser may defer until user gesture
                }
            }
        };

        const releaseLock = () => {
            if (document.pointerLockElement === dom) {
                try {
                    document.exitPointerLock?.();
                } catch {
                    // Ignore
                }
            }
        };

        // When entering exploring phase in Camera Mode, automatically request lock
        if (phase === 'exploring' && inputMode === 'camera' && activeModal === 'none') {
            requestLock();
        } else {
            releaseLock();
        }

        // Left clicking the 3D canvas while in cursor mode immediately returns to camera mode
        const onCanvasClick = (e: MouseEvent) => {
            const state = useGameStore.getState();
            if (state.phase !== 'exploring' || state.activeModal !== 'none') return;

            if (state.inputMode === 'cursor') {
                e.preventDefault();
                state.setInputMode('camera');
                requestLock();
            } else {
                requestLock();
            }
        };

        // Toggle between Camera Mode & Cursor Mode using Alt or Escape
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const state = useGameStore.getState();
            if (state.phase !== 'exploring') return;

            if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
                e.preventDefault();
                // Toggle input mode cleanly
                state.toggleInputMode();
            } else if (e.key === 'Escape' && state.inputMode === 'camera') {
                e.preventDefault();
                state.setInputMode('cursor');
            }
        };

        const onPointerLockChange = () => {
            const locked = document.pointerLockElement === dom;
            const state = useGameStore.getState();
            // If the browser exited pointer lock via Escape, ensure state switches to cursor mode
            if (!locked && state.inputMode === 'camera' && state.activeModal === 'none') {
                state.setInputMode('cursor');
            }
        };

        // Camera Rotation: Strictly active in MODE A (Camera Mode), frozen in MODE B (Cursor Mode)
        const onMouseMove = (e: MouseEvent) => {
            const state = useGameStore.getState();
            if (
                state.phase !== 'exploring' ||
                state.inputMode !== 'camera' ||
                state.activeModal !== 'none'
            ) {
                return; // Zero camera movement while in cursor mode
            }

            const sensitivity = 0.0028;
            const dx = e.movementX;
            const dy = e.movementY;

            // Filter extreme browser pointer attach spikes
            if (Math.abs(dx) > 300 || Math.abs(dy) > 300) return;

            playerTelemetry.cameraYaw -= dx * sensitivity;
            playerTelemetry.cameraPitch = THREE.MathUtils.clamp(
                playerTelemetry.cameraPitch + dy * sensitivity,
                MIN_PITCH,
                MAX_PITCH
            );
        };

        const onWheel = (e: WheelEvent) => {
            const state = useGameStore.getState();
            if (state.phase !== 'exploring' || state.inputMode !== 'camera') return;
            playerTelemetry.cameraDistance = THREE.MathUtils.clamp(
                playerTelemetry.cameraDistance + e.deltaY * 0.004,
                2.6,
                MAX_DISTANCE
            );
        };

        dom.addEventListener('click', onCanvasClick);
        window.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        window.addEventListener('mousemove', onMouseMove);
        dom.addEventListener('wheel', onWheel, { passive: true });

        return () => {
            dom.removeEventListener('click', onCanvasClick);
            window.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerlockchange', onPointerLockChange);
            window.removeEventListener('mousemove', onMouseMove);
            dom.removeEventListener('wheel', onWheel);
        };
    }, [gl, phase, inputMode, activeModal, setInputMode]);

    useFrame((state, rawDelta) => {
        if (phase !== 'exploring') return;
        const delta = Math.min(rawDelta, 0.05);

        const [px, py, pz] = playerTelemetry.position;

        // Follow character pivot smoothly
        const desiredPivot = new THREE.Vector3(px, py + 1.56, pz);
        currentPivot.current.lerp(desiredPivot, Math.min(1, delta * 13));

        const yaw = playerTelemetry.cameraYaw;
        const pitch = playerTelemetry.cameraPitch;
        const desiredDist = playerTelemetry.cameraDistance;

        const offsetDir = new THREE.Vector3(
            Math.sin(yaw) * Math.cos(pitch),
            Math.sin(pitch),
            Math.cos(yaw) * Math.cos(pitch)
        ).normalize();

        const idealCamPos = currentPivot.current
            .clone()
            .addScaledVector(offsetDir, desiredDist);

        // Multi-Probe Collision handling (whiskers against obstacles)
        const rightWhisker = new THREE.Vector3(
            Math.cos(yaw),
            0,
            -Math.sin(yaw)
        ).multiplyScalar(0.28);
        const upWhisker = new THREE.Vector3(0, 0.25, 0);

        const fCenter = collisionManager.computeSafeCameraFraction(
            currentPivot.current,
            idealCamPos,
            0.42
        );
        const fLeft = collisionManager.computeSafeCameraFraction(
            currentPivot.current.clone().sub(rightWhisker),
            idealCamPos.clone().sub(rightWhisker),
            0.32
        );
        const fRight = collisionManager.computeSafeCameraFraction(
            currentPivot.current.clone().add(rightWhisker),
            idealCamPos.clone().add(rightWhisker),
            0.32
        );
        const fUp = collisionManager.computeSafeCameraFraction(
            currentPivot.current.clone().add(upWhisker),
            idealCamPos.clone().add(upWhisker),
            0.32
        );

        const safeFraction = Math.min(
            fCenter,
            (fCenter + Math.min(fLeft, fRight, fUp)) * 0.5
        );
        let targetSafeDist = Math.max(MIN_DISTANCE, desiredDist * safeFraction);

        // Prevent ground clipping
        for (const sampleT of [0.35, 0.68, 1.0]) {
            const testPos = currentPivot.current
                .clone()
                .addScaledVector(offsetDir, targetSafeDist * sampleT);
            const groundH = getGardenTerrainHeight(testPos.x, testPos.z) + 0.52;
            if (testPos.y < groundH && sampleT === 1.0) {
                const dyNeeded = groundH - currentPivot.current.y;
                if (offsetDir.y < 0.05) {
                    targetSafeDist = Math.max(MIN_DISTANCE, targetSafeDist * 0.78);
                } else {
                    targetSafeDist = Math.max(
                        MIN_DISTANCE,
                        Math.min(targetSafeDist, dyNeeded / Math.max(0.1, offsetDir.y))
                    );
                }
            }
        }

        const distLerpSpeed =
            targetSafeDist < currentDistance.current ? 18.5 : 4.8;
        currentDistance.current = THREE.MathUtils.lerp(
            currentDistance.current,
            targetSafeDist,
            Math.min(1, delta * distLerpSpeed)
        );

        const finalCamPos = currentPivot.current
            .clone()
            .addScaledVector(offsetDir, currentDistance.current);

        const camGroundFloor =
            getGardenTerrainHeight(finalCamPos.x, finalCamPos.z) + 0.46;
        if (finalCamPos.y < camGroundFloor) {
            finalCamPos.y = camGroundFloor;
        }

        state.camera.position.copy(finalCamPos);

        const forwardAim = new THREE.Vector3(
            -Math.sin(yaw) * 1.45,
            0.22,
            -Math.cos(yaw) * 1.45
        );
        const desiredLook = currentPivot.current.clone().add(forwardAim);
        currentLookAt.current.lerp(desiredLook, Math.min(1, delta * 15));
        state.camera.lookAt(currentLookAt.current);
    });

    return null;
};