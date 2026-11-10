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
    const toggleInputMode = useGameStore((state) => state.toggleInputMode);
    const activeModal = useGameStore((state) => state.activeModal);

    const currentPivot = useRef(new THREE.Vector3(0, 1.55, 7.5));
    const currentLookAt = useRef(new THREE.Vector3(0, 1.55, 3.0));
    const currentDistance = useRef(playerTelemetry.cameraDistance);

    // Sync Pointer Lock with Mode A / Mode B
    useEffect(() => {
        const dom = gl.domElement;

        const requestLock = async () => {
            if (document.pointerLockElement !== dom) {
                try {
                    await dom.requestPointerLock();
                } catch {
                    // Handled gracefully by browser security policies
                }
            }
        };

        const exitLock = () => {
            if (document.pointerLockElement === dom) {
                try {
                    document.exitPointerLock();
                } catch {
                    // Handled gracefully
                }
            }
        };

        if (phase === 'exploring') {
            if (inputMode === 'CAMERA' && activeModal === 'none') {
                requestLock();
            } else {
                exitLock();
            }
        }

        const onPointerLockChange = () => {
            const isLocked = document.pointerLockElement === dom;
            // If user presses Escape, synchronize to CURSOR mode
            if (!isLocked && useGameStore.getState().inputMode === 'CAMERA') {
                setInputMode('CURSOR');
            }
        };

        document.addEventListener('pointerlockchange', onPointerLockChange);
        return () => {
            document.removeEventListener('pointerlockchange', onPointerLockChange);
            exitLock();
        };
    }, [gl, phase, inputMode, activeModal, setInputMode]);

    // Global Keyboard & Mouse Listener (Mode Toggling)
    useEffect(() => {
        const dom = gl.domElement;

        const onKeyDown = (e: KeyboardEvent) => {
            if (phase !== 'exploring') return;

            // ALT Toggles between Mode A (Camera) and Mode B (Cursor)
            if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
                e.preventDefault();
                toggleInputMode();
            }
        };

        // Clicking the 3D World in Cursor Mode returns to Camera Mode
        const onCanvasMouseDown = (e: MouseEvent) => {
            if (phase !== 'exploring') return;
            if (useGameStore.getState().activeModal !== 'none') return;

            if (useGameStore.getState().inputMode === 'CURSOR') {
                // Return to camera mode
                setInputMode('CAMERA');
                e.preventDefault();
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            const state = useGameStore.getState();
            // CRITICAL FIX: In Mode B (CURSOR) or when a modal is open, mouse movement is COMPLETELY ignored by the camera
            if (
                state.phase !== 'exploring' ||
                state.inputMode !== 'CAMERA' ||
                state.activeModal !== 'none'
            ) {
                return;
            }

            const sensitivity = 0.0028;
            const dx = e.movementX || 0;
            const dy = e.movementY || 0;

            // Spike suppression
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
            if (state.phase !== 'exploring' || state.inputMode !== 'CAMERA') return;

            playerTelemetry.cameraDistance = THREE.MathUtils.clamp(
                playerTelemetry.cameraDistance + e.deltaY * 0.004,
                2.6,
                MAX_DISTANCE
            );
        };

        window.addEventListener('keydown', onKeyDown);
        dom.addEventListener('mousedown', onCanvasMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        dom.addEventListener('wheel', onWheel, { passive: true });

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            dom.removeEventListener('mousedown', onCanvasMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            dom.removeEventListener('wheel', onWheel);
        };
    }, [gl, phase, setInputMode, toggleInputMode]);

    useFrame((state, rawDelta) => {
        if (phase !== 'exploring') return;
        const delta = Math.min(rawDelta, 0.05);

        const [px, py, pz] = playerTelemetry.position;

        // Follow character shoulder/head pivot smoothly
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

        // Multi-Probe Whisker Obstacle Collision
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

        // Terrain slope avoidance
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