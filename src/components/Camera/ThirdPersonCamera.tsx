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
    const activeModal = useGameStore((state) => state.activeModal);
    const setPointerLocked = useGameStore((state) => state.setPointerLocked);
    const setAltCursorMode = useGameStore((state) => state.setAltCursorMode);

    const currentPivot = useRef(new THREE.Vector3(0, 1.55, 7.5));
    const currentLookAt = useRef(new THREE.Vector3(0, 1.55, 3.0));
    const currentDistance = useRef(playerTelemetry.cameraDistance);
    const lastClientPos = useRef<{ x: number; y: number } | null>(null);
    const isAltHeldRef = useRef(false);

    useEffect(() => {
        const dom = gl.domElement;

        // 1. Engage Pointer Lock on Canvas Click during normal exploration
        const onCanvasClick = () => {
            const state = useGameStore.getState();
            if (
                state.phase === 'exploring' &&
                state.activeModal === 'none' &&
                !isAltHeldRef.current &&
                document.pointerLockElement !== dom
            ) {
                try {
                    dom.requestPointerLock?.();
                } catch {
                    // Gracefully ignore if browser blocks automatic lock
                }
            }
        };

        const onPointerLockChange = () => {
            const locked = document.pointerLockElement === dom;
            setPointerLocked(locked);
            lastClientPos.current = null;
        };

        // 2. Alt Interaction Mode: Hold Alt to release lock & show Botanical SVG Cursor
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
                e.preventDefault();
                if (!isAltHeldRef.current) {
                    isAltHeldRef.current = true;
                    setAltCursorMode(true);
                    lastClientPos.current = null;
                    if (document.pointerLockElement === dom) {
                        try {
                            document.exitPointerLock?.();
                        } catch {
                            // Ignore
                        }
                    }
                }
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
                e.preventDefault();
                isAltHeldRef.current = false;
                setAltCursorMode(false);
                lastClientPos.current = null;
            }
        };

        const onWindowBlur = () => {
            isAltHeldRef.current = false;
            setAltCursorMode(false);
            lastClientPos.current = null;
        };

        // 3. Automatic Mouse-Look without holding Left-Click
        const onMouseMove = (e: MouseEvent) => {
            const state = useGameStore.getState();
            if (
                state.phase !== 'exploring' ||
                state.activeModal !== 'none' ||
                isAltHeldRef.current
            ) {
                lastClientPos.current = null;
                return;
            }

            const sensitivity = 0.0029;
            let dx = 0;
            let dy = 0;

            if (document.pointerLockElement === dom) {
                dx = e.movementX;
                dy = e.movementY;
            } else {
                // Fallback automatic mouse-look before pointer lock is captured
                if (lastClientPos.current !== null) {
                    dx = e.clientX - lastClientPos.current.x;
                    dy = e.clientY - lastClientPos.current.y;
                }
                lastClientPos.current = { x: e.clientX, y: e.clientY };
            }

            // Guard against browser pointer-lock attachment spikes
            if (Math.abs(dx) > 280 || Math.abs(dy) > 280) return;

            playerTelemetry.cameraYaw -= dx * sensitivity;
            playerTelemetry.cameraPitch = THREE.MathUtils.clamp(
                playerTelemetry.cameraPitch + dy * sensitivity,
                MIN_PITCH,
                MAX_PITCH
            );
        };

        const onWheel = (e: WheelEvent) => {
            const state = useGameStore.getState();
            if (state.phase !== 'exploring' || state.activeModal !== 'none') return;
            playerTelemetry.cameraDistance = THREE.MathUtils.clamp(
                playerTelemetry.cameraDistance + e.deltaY * 0.004,
                2.6,
                MAX_DISTANCE
            );
        };

        dom.addEventListener('click', onCanvasClick);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onWindowBlur);
        window.addEventListener('mousemove', onMouseMove);
        dom.addEventListener('wheel', onWheel, { passive: true });

        return () => {
            dom.removeEventListener('click', onCanvasClick);
            document.removeEventListener('pointerlockchange', onPointerLockChange);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onWindowBlur);
            window.removeEventListener('mousemove', onMouseMove);
            dom.removeEventListener('wheel', onWheel);
        };
    }, [gl, setPointerLocked, setAltCursorMode]);

    // Automatically release pointer lock if a modal (like Memory Echo card) opens
    useEffect(() => {
        if (activeModal !== 'none' && document.pointerLockElement) {
            try {
                document.exitPointerLock?.();
            } catch {
                // Ignore
            }
        }
    }, [activeModal]);

    useFrame((state, rawDelta) => {
        if (phase !== 'exploring') return;
        const delta = Math.min(rawDelta, 0.05);

        const [px, py, pz] = playerTelemetry.position;

        // 1. Smoothly follow character shoulder/head pivot
        const desiredPivot = new THREE.Vector3(px, py + 1.56, pz);
        currentPivot.current.lerp(desiredPivot, Math.min(1, delta * 13));

        // 2. Spherical camera position from yaw & pitch
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

        // 3. Multi-Probe Obstacle Collision (Center + Left/Right/Up Whiskers)
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

        // 4. Terrain Slope & Ground Collision Prevention
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

        // 5. Smooth Pull-In on Obstruction & Gentle Restore When Clear
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