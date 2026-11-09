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

    const isDragging = useRef(false);
    const currentPivot = useRef(new THREE.Vector3(0, 1.5, 7.5));
    const currentLookAt = useRef(new THREE.Vector3(0, 1.5, 3.0));
    const currentDistance = useRef(playerTelemetry.cameraDistance);

    useEffect(() => {
        const dom = gl.domElement;

        const onMouseDown = (e: MouseEvent) => {
            if (phase !== 'exploring' || activeModal !== 'none') return;
            if (e.button === 0 || e.button === 2) {
                isDragging.current = true;
            }
        };

        const onMouseUp = () => {
            isDragging.current = false;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (phase !== 'exploring' || activeModal !== 'none') return;
            const pointerLocked = document.pointerLockElement === dom;
            if (!isDragging.current && !pointerLocked) return;

            const sensitivity = 0.0032;
            playerTelemetry.cameraYaw -= e.movementX * sensitivity;
            playerTelemetry.cameraPitch = THREE.MathUtils.clamp(
                playerTelemetry.cameraPitch + e.movementY * sensitivity,
                MIN_PITCH,
                MAX_PITCH
            );
        };

        const onWheel = (e: WheelEvent) => {
            if (phase !== 'exploring' || activeModal !== 'none') return;
            playerTelemetry.cameraDistance = THREE.MathUtils.clamp(
                playerTelemetry.cameraDistance + e.deltaY * 0.004,
                2.8,
                MAX_DISTANCE
            );
        };

        dom.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('mousemove', onMouseMove);
        dom.addEventListener('wheel', onWheel, { passive: true });

        return () => {
            dom.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
            dom.removeEventListener('wheel', onWheel);
        };
    }, [gl, phase, activeModal]);

    useFrame((state, rawDelta) => {
        if (phase !== 'exploring') return;
        const delta = Math.min(rawDelta, 0.05);

        const [px, py, pz] = playerTelemetry.position;

        // 1. Smoothly interpolate the over-the-shoulder pivot point above the player
        const desiredPivot = new THREE.Vector3(px, py + 1.58, pz);
        currentPivot.current.lerp(desiredPivot, Math.min(1, delta * 12));

        // 2. Compute ideal spherical camera offset from yaw & pitch
        const yaw = playerTelemetry.cameraYaw;
        const pitch = playerTelemetry.cameraPitch;
        const desiredDist = playerTelemetry.cameraDistance;

        const dirX = Math.sin(yaw) * Math.cos(pitch);
        const dirY = Math.sin(pitch);
        const dirZ = Math.cos(yaw) * Math.cos(pitch);
        const offsetDir = new THREE.Vector3(dirX, dirY, dirZ).normalize();

        const idealCamPos = currentPivot.current
            .clone()
            .addScaledVector(offsetDir, desiredDist);

        // 3. Multi-Probe Obstacle Raycast (Center + Left/Right/Up/Down Whiskers)
        const rightWhisker = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(0.28);
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

        // Weighted minimum fraction so grazing a tree trunk pulls the camera in smoothly
        const safeFraction = Math.min(
            fCenter,
            (fCenter + Math.min(fLeft, fRight, fUp)) * 0.5
        );
        let targetSafeDist = Math.max(MIN_DISTANCE, desiredDist * safeFraction);

        // 4. Terrain Slope & Ground Collision Prevention (Multi-point sample along camera ray)
        for (const sampleT of [0.4, 0.7, 1.0]) {
            const testPos = currentPivot.current
                .clone()
                .addScaledVector(offsetDir, targetSafeDist * sampleT);
            const groundH = getGardenTerrainHeight(testPos.x, testPos.z) + 0.52;
            if (testPos.y < groundH && sampleT === 1.0) {
                // Pull camera closer or lift slightly if terrain slope rises behind player
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

        // 5. Asymmetric Distance Interpolation:
        // Pull in fast when obstructed (no clipping), restore gently when clear (no snapping)
        const distLerpSpeed =
            targetSafeDist < currentDistance.current ? 18.0 : 4.5;
        currentDistance.current = THREE.MathUtils.lerp(
            currentDistance.current,
            targetSafeDist,
            Math.min(1, delta * distLerpSpeed)
        );

        const finalCamPos = currentPivot.current
            .clone()
            .addScaledVector(offsetDir, currentDistance.current);

        // Final hard guarantee that camera never enters the terrain mesh
        const camGroundFloor =
            getGardenTerrainHeight(finalCamPos.x, finalCamPos.z) + 0.45;
        if (finalCamPos.y < camGroundFloor) {
            finalCamPos.y = camGroundFloor;
        }

        state.camera.position.copy(finalCamPos);

        // Look slightly ahead of the character's shoulder for cinematic framing
        const forwardAim = new THREE.Vector3(
            -Math.sin(yaw) * 1.6,
            0.25,
            -Math.cos(yaw) * 1.6
        );
        const desiredLook = currentPivot.current.clone().add(forwardAim);
        currentLookAt.current.lerp(desiredLook, Math.min(1, delta * 14));
        state.camera.lookAt(currentLookAt.current);
    });

    return null;
};