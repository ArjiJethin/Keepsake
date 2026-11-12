// src/components/Camera/ThirdPersonCamera.tsx
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import { getGardenTerrainHeight } from '../../scenes/Environment/lowPolyUtils';
import { collisionManager } from '../../systems/Collision/collisionSystem';

const MIN_PITCH = -0.16;
const MAX_PITCH = 0.95;
const MIN_DISTANCE = 1.45;
const MAX_DISTANCE = 8.8;

const PIVOT_HEIGHT = 1.15;
const LOOK_AT_HEIGHT_OFFSET = 0.14;

const _desiredPivot = new THREE.Vector3();
const _offsetDir = new THREE.Vector3();
const _idealCamPos = new THREE.Vector3();
const _rightWhisker = new THREE.Vector3();
const _upWhisker = new THREE.Vector3(0, 0.25, 0);
const _probeOrigin = new THREE.Vector3();
const _probeTarget = new THREE.Vector3();
const _testPos = new THREE.Vector3();
const _finalCamPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();

function isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia?.('(pointer: coarse)').matches
    );
}

export const ThirdPersonCamera: React.FC = () => {
    const { gl } = useThree();
    const phase = useGameStore((state) => state.phase);
    const inputMode = useGameStore((state) => state.inputMode);
    const setInputMode = useGameStore((state) => state.setInputMode);
    const activeModal = useGameStore((state) => state.activeModal);

    const currentPivot = useRef(new THREE.Vector3(0, 1.15, 7.5));
    const currentLookAt = useRef(new THREE.Vector3(0, 1.29, 7.5));
    const currentDistance = useRef(playerTelemetry.cameraDistance);
    const isInitializedRef = useRef(false);

    // Track dedicated camera touch identifier on mobile so joystick and camera never conflict
    const cameraTouchIdRef = useRef<number | null>(null);
    const lastTouchPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
        const dom = gl.domElement;
        const touchCapable = isTouchDevice();

        const requestLock = () => {
            if (touchCapable) return;
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

        if (
            phase === 'exploring' &&
            inputMode === 'camera' &&
            activeModal === 'none'
        ) {
            requestLock();
        } else {
            releaseLock();
        }

        const onCanvasClick = (e: MouseEvent) => {
            if (touchCapable) return;
            const state = useGameStore.getState();
            if (state.phase !== 'exploring' || state.activeModal !== 'none')
                return;

            if (state.inputMode === 'cursor') {
                e.preventDefault();
                state.setInputMode('camera');
                requestLock();
            } else {
                requestLock();
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const state = useGameStore.getState();
            if (state.phase !== 'exploring') return;

            if (
                e.key === 'Alt' ||
                e.code === 'AltLeft' ||
                e.code === 'AltRight'
            ) {
                e.preventDefault();
                state.toggleInputMode();
            } else if (e.key === 'Escape' && state.inputMode === 'camera') {
                e.preventDefault();
                state.setInputMode('cursor');
            }
        };

        const onPointerLockChange = () => {
            if (touchCapable) return;
            const locked = document.pointerLockElement === dom;
            const state = useGameStore.getState();
            if (
                !locked &&
                state.inputMode === 'camera' &&
                state.activeModal === 'none'
            ) {
                state.setInputMode('cursor');
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            const state = useGameStore.getState();
            if (
                state.phase !== 'exploring' ||
                state.inputMode !== 'camera' ||
                state.activeModal !== 'none'
            ) {
                return;
            }
            if (document.pointerLockElement !== dom) return;

            const sensitivity = 0.0026;
            const dx = e.movementX;
            const dy = e.movementY;

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
            if (state.phase !== 'exploring' || state.inputMode !== 'camera')
                return;
            playerTelemetry.cameraDistance = THREE.MathUtils.clamp(
                playerTelemetry.cameraDistance + e.deltaY * 0.0035,
                2.4,
                MAX_DISTANCE
            );
        };

        // Mobile Touch Camera Look (independent of left-side joystick and UI buttons)
        const isInteractiveUIElement = (target: EventTarget | null): boolean => {
            if (!(target instanceof Element)) return false;
            return Boolean(
                target.closest(
                    'button, a, input, textarea, select, [data-joystick-zone], [data-ui-interactive]'
                )
            );
        };

        const onTouchStart = (e: TouchEvent) => {
            const state = useGameStore.getState();
            if (state.phase !== 'exploring' || state.activeModal !== 'none') return;
            if (cameraTouchIdRef.current !== null) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (isInteractiveUIElement(t.target)) continue;

                // Ignore touches starting inside the bottom-left joystick safety region
                const inBottomLeftJoystickArea =
                    t.clientX < 210 && t.clientY > window.innerHeight - 210;
                if (inBottomLeftJoystickArea) continue;

                cameraTouchIdRef.current = t.identifier;
                lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
                break;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (cameraTouchIdRef.current === null) return;
            const state = useGameStore.getState();
            if (state.phase !== 'exploring' || state.activeModal !== 'none') {
                cameraTouchIdRef.current = null;
                return;
            }

            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === cameraTouchIdRef.current) {
                    const dx = t.clientX - lastTouchPosRef.current.x;
                    const dy = t.clientY - lastTouchPosRef.current.y;
                    lastTouchPosRef.current = { x: t.clientX, y: t.clientY };

                    const touchSensitivity = 0.0046;
                    playerTelemetry.cameraYaw -= dx * touchSensitivity;
                    playerTelemetry.cameraPitch = THREE.MathUtils.clamp(
                        playerTelemetry.cameraPitch + dy * touchSensitivity,
                        MIN_PITCH,
                        MAX_PITCH
                    );
                    break;
                }
            }
        };

        const onTouchEndOrCancel = (e: TouchEvent) => {
            if (cameraTouchIdRef.current === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === cameraTouchIdRef.current) {
                    cameraTouchIdRef.current = null;
                    break;
                }
            }
        };

        dom.addEventListener('click', onCanvasClick);
        window.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        window.addEventListener('mousemove', onMouseMove);
        dom.addEventListener('wheel', onWheel, { passive: true });

        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEndOrCancel, { passive: true });
        window.addEventListener('touchcancel', onTouchEndOrCancel, { passive: true });

        return () => {
            dom.removeEventListener('click', onCanvasClick);
            window.removeEventListener('keydown', onKeyDown);
            document.removeEventListener(
                'pointerlockchange',
                onPointerLockChange
            );
            window.removeEventListener('mousemove', onMouseMove);
            dom.removeEventListener('wheel', onWheel);

            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEndOrCancel);
            window.removeEventListener('touchcancel', onTouchEndOrCancel);
        };
    }, [gl, phase, inputMode, activeModal, setInputMode]);

    useFrame((state, rawDelta) => {
        if (phase !== 'exploring') return;
        const delta = Math.min(rawDelta, 0.05);

        const [px, py, pz] = playerTelemetry.position;
        _desiredPivot.set(px, py + PIVOT_HEIGHT, pz);

        if (!isInitializedRef.current) {
            currentPivot.current.copy(_desiredPivot);
            currentLookAt.current.set(
                px,
                py + PIVOT_HEIGHT + LOOK_AT_HEIGHT_OFFSET,
                pz
            );
            isInitializedRef.current = true;
        }

        const horizDamp = 1.0 - Math.exp(-18.0 * delta);
        const vertLambda = playerTelemetry.isGrounded ? 15.0 : 8.5;
        const vertDamp = 1.0 - Math.exp(-vertLambda * delta);

        currentPivot.current.x = THREE.MathUtils.lerp(
            currentPivot.current.x,
            _desiredPivot.x,
            horizDamp
        );
        currentPivot.current.z = THREE.MathUtils.lerp(
            currentPivot.current.z,
            _desiredPivot.z,
            horizDamp
        );
        currentPivot.current.y = THREE.MathUtils.lerp(
            currentPivot.current.y,
            _desiredPivot.y,
            vertDamp
        );

        const yaw = playerTelemetry.cameraYaw;
        const pitch = playerTelemetry.cameraPitch;
        const desiredDist = playerTelemetry.cameraDistance;

        _offsetDir
            .set(
                Math.sin(yaw) * Math.cos(pitch),
                Math.sin(pitch),
                Math.cos(yaw) * Math.cos(pitch)
            )
            .normalize();

        _idealCamPos
            .copy(currentPivot.current)
            .addScaledVector(_offsetDir, desiredDist);

        _rightWhisker.set(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(0.26);

        const fCenter = collisionManager.computeSafeCameraFraction(
            currentPivot.current,
            _idealCamPos,
            0.4
        );

        _probeOrigin.copy(currentPivot.current).sub(_rightWhisker);
        _probeTarget.copy(_idealCamPos).sub(_rightWhisker);
        const fLeft = collisionManager.computeSafeCameraFraction(
            _probeOrigin,
            _probeTarget,
            0.3
        );

        _probeOrigin.copy(currentPivot.current).add(_rightWhisker);
        _probeTarget.copy(_idealCamPos).add(_rightWhisker);
        const fRight = collisionManager.computeSafeCameraFraction(
            _probeOrigin,
            _probeTarget,
            0.3
        );

        _probeOrigin.copy(currentPivot.current).add(_upWhisker);
        _probeTarget.copy(_idealCamPos).add(_upWhisker);
        const fUp = collisionManager.computeSafeCameraFraction(
            _probeOrigin,
            _probeTarget,
            0.3
        );

        const safeFraction = Math.min(
            fCenter,
            (fCenter + Math.min(fLeft, fRight, fUp)) * 0.5
        );
        let targetSafeDist = Math.max(MIN_DISTANCE, desiredDist * safeFraction);

        for (const sampleT of [0.4, 0.72, 1.0]) {
            _testPos
                .copy(currentPivot.current)
                .addScaledVector(_offsetDir, targetSafeDist * sampleT);
            const groundH = getGardenTerrainHeight(_testPos.x, _testPos.z) + 0.45;
            if (_testPos.y < groundH && sampleT === 1.0) {
                const dyNeeded = groundH - currentPivot.current.y;
                if (_offsetDir.y < 0.05) {
                    targetSafeDist = Math.max(
                        MIN_DISTANCE,
                        targetSafeDist * 0.8
                    );
                } else {
                    targetSafeDist = Math.max(
                        MIN_DISTANCE,
                        Math.min(
                            targetSafeDist,
                            dyNeeded / Math.max(0.1, _offsetDir.y)
                        )
                    );
                }
            }
        }

        const distLambda =
            targetSafeDist < currentDistance.current ? 20.0 : 6.5;
        currentDistance.current = THREE.MathUtils.lerp(
            currentDistance.current,
            targetSafeDist,
            1.0 - Math.exp(-distLambda * delta)
        );

        _finalCamPos
            .copy(currentPivot.current)
            .addScaledVector(_offsetDir, currentDistance.current);

        const camGroundFloor =
            getGardenTerrainHeight(_finalCamPos.x, _finalCamPos.z) + 0.42;
        if (_finalCamPos.y < camGroundFloor) {
            _finalCamPos.y = camGroundFloor;
        }

        state.camera.position.copy(_finalCamPos);

        _desiredLook.set(
            currentPivot.current.x - Math.sin(yaw) * 0.35,
            currentPivot.current.y + LOOK_AT_HEIGHT_OFFSET,
            currentPivot.current.z - Math.cos(yaw) * 0.35
        );

        const lookDamp = 1.0 - Math.exp(-22.0 * delta);
        currentLookAt.current.lerp(_desiredLook, lookDamp);
        state.camera.lookAt(currentLookAt.current);
    });

    return null;
};
