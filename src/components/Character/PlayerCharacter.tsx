// src/components/Character/PlayerCharacter.tsx
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import {
    getGardenTerrainHeight,
    getGardenTerrainNormal,
} from '../../scenes/Environment/lowPolyUtils';
import { collisionManager } from '../../systems/Collision/collisionSystem';
import { ExplorerModelMesh, type ExplorerRigRefs } from './ExplorerModelMesh';
import {
    FemaleWandererGLB,
    type WandererAnimState,
} from './FemaleWandererGLB';

const GRAVITY = -22.0;
const JUMP_VELOCITY = 7.8;
const WALK_SPEED = 4.6;
const RUN_SPEED = 8.2;
const ACCELERATION = 11.5;
const DECELERATION = 14.0;

/**
 * Error boundary so that if the user has not yet copied KeepSakeFemale-v2-animated.glb
 * into public/, the character gracefully falls back without crashing the 3D scene.
 */
class CharacterGLBErrorBoundary extends React.Component<
    { fallback: React.ReactNode; children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        console.error(
            '[Keepsake] Failed to load /KeepSakeFemale-v2-animated.glb. Ensure the file is placed in public/KeepSakeFemale-v2-animated.glb.',
            error
        );
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

export const PlayerCharacter: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const activeModal = useGameStore((state) => state.activeModal);
    const characterModel = useGameStore((state) => state.characterModel);

    const rootRef = useRef<THREE.Group>(null);

    // Reactive animation state & telemetry for FemaleWandererGLB
    const [animMoveState, setAnimMoveState] =
        useState<WandererAnimState>('idle');
    const [currentHorizSpeed, setCurrentHorizSpeed] = useState<number>(0);
    const [isGroundedState, setIsGroundedState] = useState<boolean>(true);
    const lastSyncMoveStateRef = useRef<WandererAnimState>('idle');
    const lastSyncSpeedRef = useRef<number>(0);
    const lastSyncGroundedRef = useRef<boolean>(true);

    // Articulated Rig References for Male / Fallback ExplorerModelMesh
    const bodyGroup = useRef<THREE.Group>(null);
    const headGroup = useRef<THREE.Group>(null);
    const ponchoGroup = useRef<THREE.Group>(null);
    const scarfTailGroup = useRef<THREE.Group>(null);
    const backpackGroup = useRef<THREE.Group>(null);
    const lanternGroup = useRef<THREE.Group>(null);
    const lanternLight = useRef<THREE.PointLight>(null);
    const leftArmGroup = useRef<THREE.Group>(null);
    const rightArmGroup = useRef<THREE.Group>(null);
    const leftLegGroup = useRef<THREE.Group>(null);
    const rightLegGroup = useRef<THREE.Group>(null);

    const rigRefs: ExplorerRigRefs = {
        bodyGroup,
        headGroup,
        ponchoGroup,
        scarfTailGroup,
        backpackGroup,
        lanternGroup,
        lanternLight,
        leftArmGroup,
        rightArmGroup,
        leftLegGroup,
        rightLegGroup,
    };

    const keys = useRef<{ [key: string]: boolean }>({});
    const velocity = useRef(new THREE.Vector3(0, 0, 0));
    const animCycle = useRef(0);

    useEffect(() => {
        const startY = getGardenTerrainHeight(
            playerTelemetry.position[0],
            playerTelemetry.position[2]
        );
        playerTelemetry.position[1] = startY;
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            keys.current[e.code] = true;

            if (
                e.code === 'Space' &&
                playerTelemetry.isGrounded &&
                phase === 'exploring' &&
                activeModal === 'none'
            ) {
                velocity.current.y = JUMP_VELOCITY;
                playerTelemetry.isGrounded = false;
                playerTelemetry.moveState = 'jump';
                if (lastSyncMoveStateRef.current !== 'jump') {
                    lastSyncMoveStateRef.current = 'jump';
                    setAnimMoveState('jump');
                }
                if (lastSyncGroundedRef.current !== false) {
                    lastSyncGroundedRef.current = false;
                    setIsGroundedState(false);
                }
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            keys.current[e.code] = false;
        };

        const onBlur = () => {
            keys.current = {};
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, [phase, activeModal]);

    useFrame((_, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        if (!rootRef.current) return;

        const canMove = phase === 'exploring' && activeModal === 'none';

        // 1. Camera-Relative Movement Vector
        let inputForward = 0;
        let inputRight = 0;
        if (canMove) {
            if (keys.current['KeyW'] || keys.current['ArrowUp']) inputForward += 1;
            if (keys.current['KeyS'] || keys.current['ArrowDown']) inputForward -= 1;
            if (keys.current['KeyD'] || keys.current['ArrowRight']) inputRight += 1;
            if (keys.current['KeyA'] || keys.current['ArrowLeft']) inputRight -= 1;
        }

        const inputLen = Math.hypot(inputForward, inputRight);
        const isSprinting =
            Boolean(keys.current['ShiftLeft'] || keys.current['ShiftRight']) &&
            inputLen > 0;
        const targetSpeed =
            inputLen > 0 ? (isSprinting ? RUN_SPEED : WALK_SPEED) : 0;

        const camYaw = playerTelemetry.cameraYaw;
        const forwardVec = new THREE.Vector3(
            -Math.sin(camYaw),
            0,
            -Math.cos(camYaw)
        );
        const rightVec = new THREE.Vector3(
            Math.cos(camYaw),
            0,
            -Math.sin(camYaw)
        );

        const moveDir = new THREE.Vector3();
        if (inputLen > 0.001) {
            moveDir
                .addScaledVector(forwardVec, inputForward / inputLen)
                .addScaledVector(rightVec, inputRight / inputLen)
                .normalize();
        }

        // 2. Smooth Acceleration, Deceleration & Slope Handling
        const [curX, curY, curZ] = playerTelemetry.position;
        const surfaceNormal = getGardenTerrainNormal(curX, curZ);
        const slopeFactor = THREE.MathUtils.clamp(surfaceNormal.y, 0.65, 1.0);

        const desiredVelX = moveDir.x * targetSpeed * slopeFactor;
        const desiredVelZ = moveDir.z * targetSpeed * slopeFactor;

        const accelRate = inputLen > 0 ? ACCELERATION : DECELERATION;
        velocity.current.x = THREE.MathUtils.lerp(
            velocity.current.x,
            desiredVelX,
            Math.min(1, delta * accelRate)
        );
        velocity.current.z = THREE.MathUtils.lerp(
            velocity.current.z,
            desiredVelZ,
            Math.min(1, delta * accelRate)
        );

        // 3. Gravity & Jump Physics
        velocity.current.y += GRAVITY * delta;

        let nextX = curX + velocity.current.x * delta;
        let nextZ = curZ + velocity.current.z * delta;
        let nextY = curY + velocity.current.y * delta;

        // 4. Obstacle Collision Resolution
        [nextX, nextZ] = collisionManager.resolvePlayerMovement(
            nextX,
            nextY,
            nextZ,
            0.42
        );

        // 5. Ground Clamping & Downhill Slope Adherence
        const groundHeight = getGardenTerrainHeight(nextX, nextZ);
        if (nextY <= groundHeight + 0.03 && velocity.current.y <= 0) {
            nextY = groundHeight;
            velocity.current.y = 0;
            playerTelemetry.isGrounded = true;
        } else if (
            playerTelemetry.isGrounded &&
            nextY - groundHeight < 0.38 &&
            velocity.current.y <= 0
        ) {
            nextY = groundHeight;
            velocity.current.y = 0;
        } else {
            playerTelemetry.isGrounded = false;
        }

        playerTelemetry.position = [nextX, nextY, nextZ];
        playerTelemetry.velocity = [
            velocity.current.x,
            velocity.current.y,
            velocity.current.z,
        ];

        // 6. Natural Shortest-Arc Turning (Character faces direction of travel)
        const horizSpeed = Math.hypot(velocity.current.x, velocity.current.z);
        if (horizSpeed > 0.2) {
            const targetAngle = Math.atan2(velocity.current.x, velocity.current.z);
            let angleDiff = targetAngle - playerTelemetry.rotationY;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            playerTelemetry.rotationY += angleDiff * Math.min(1, delta * 12.5);
        }

        rootRef.current.position.set(nextX, nextY, nextZ);
        rootRef.current.rotation.y = playerTelemetry.rotationY;

        // 7. Determine Animation State (Walk_2, Sprint, Jump_2_RM, or Stationary)
        let nextMoveState: WandererAnimState = 'idle';
        if (!playerTelemetry.isGrounded) {
            nextMoveState = 'jump';
        } else if (isSprinting && horizSpeed > 5.2) {
            nextMoveState = 'run';
        } else if (horizSpeed > 0.22) {
            nextMoveState = 'walk';
        } else {
            nextMoveState = 'idle';
        }

        playerTelemetry.moveState = nextMoveState;

        if (lastSyncMoveStateRef.current !== nextMoveState) {
            lastSyncMoveStateRef.current = nextMoveState;
            setAnimMoveState(nextMoveState);
        }
        if (Math.abs(lastSyncSpeedRef.current - horizSpeed) > 0.15) {
            lastSyncSpeedRef.current = horizSpeed;
            setCurrentHorizSpeed(horizSpeed);
        }
        if (lastSyncGroundedRef.current !== playerTelemetry.isGrounded) {
            lastSyncGroundedRef.current = playerTelemetry.isGrounded;
            setIsGroundedState(playerTelemetry.isGrounded);
        }

        // 8. Procedural Rig Animation for Male Archetype / Fallback Mesh
        const cycleSpeed =
            playerTelemetry.moveState === 'run'
                ? 13.8
                : playerTelemetry.moveState === 'walk'
                    ? 8.6
                    : 2.0;
        animCycle.current += delta * cycleSpeed;
        const c = animCycle.current;
        const stride = THREE.MathUtils.clamp(horizSpeed / RUN_SPEED, 0, 1);

        if (
            leftLegGroup.current &&
            rightLegGroup.current &&
            leftArmGroup.current &&
            rightArmGroup.current &&
            bodyGroup.current &&
            ponchoGroup.current &&
            scarfTailGroup.current &&
            backpackGroup.current &&
            lanternGroup.current &&
            headGroup.current
        ) {
            if (!playerTelemetry.isGrounded) {
                leftLegGroup.current.rotation.x = THREE.MathUtils.lerp(
                    leftLegGroup.current.rotation.x,
                    0.48,
                    delta * 10
                );
                rightLegGroup.current.rotation.x = THREE.MathUtils.lerp(
                    rightLegGroup.current.rotation.x,
                    -0.38,
                    delta * 10
                );
                leftArmGroup.current.rotation.x = THREE.MathUtils.lerp(
                    leftArmGroup.current.rotation.x,
                    -0.45,
                    delta * 10
                );
                rightArmGroup.current.rotation.x = THREE.MathUtils.lerp(
                    rightArmGroup.current.rotation.x,
                    0.35,
                    delta * 10
                );
                scarfTailGroup.current.rotation.x = THREE.MathUtils.lerp(
                    scarfTailGroup.current.rotation.x,
                    0.55,
                    delta * 8
                );
                lanternGroup.current.rotation.x = THREE.MathUtils.lerp(
                    lanternGroup.current.rotation.x,
                    0.38,
                    delta * 8
                );
            } else if (horizSpeed > 0.18) {
                const legSwing = Math.sin(c) * (0.58 * stride + 0.14);
                leftLegGroup.current.rotation.x = legSwing;
                rightLegGroup.current.rotation.x = -legSwing;

                leftArmGroup.current.rotation.x = -legSwing * 0.62;
                rightArmGroup.current.rotation.x = legSwing * 0.62;

                bodyGroup.current.position.y = Math.abs(Math.cos(c)) * 0.062 * stride;
                bodyGroup.current.rotation.x = 0.06 + stride * 0.13;
                bodyGroup.current.rotation.z = Math.sin(c) * 0.025 * stride;

                ponchoGroup.current.rotation.x =
                    0.05 + stride * 0.1 + Math.sin(c * 2) * 0.03;
                scarfTailGroup.current.rotation.x =
                    0.18 + stride * 0.38 + Math.sin(c * 2 + 0.6) * 0.09;
                scarfTailGroup.current.rotation.z = Math.cos(c) * 0.08 * stride;
                backpackGroup.current.position.y =
                    1.07 + Math.sin(c * 2 - 0.5) * 0.018 * stride;
                lanternGroup.current.rotation.x =
                    0.12 * stride + Math.sin(c * 2 - 0.8) * 0.18 * stride;
                lanternGroup.current.rotation.z = Math.cos(c) * 0.14 * stride;
            } else {
                leftLegGroup.current.rotation.x = THREE.MathUtils.lerp(
                    leftLegGroup.current.rotation.x,
                    0,
                    delta * 10
                );
                rightLegGroup.current.rotation.x = THREE.MathUtils.lerp(
                    rightLegGroup.current.rotation.x,
                    0,
                    delta * 10
                );
                leftArmGroup.current.rotation.x = THREE.MathUtils.lerp(
                    leftArmGroup.current.rotation.x,
                    0,
                    delta * 10
                );
                rightArmGroup.current.rotation.x = THREE.MathUtils.lerp(
                    rightArmGroup.current.rotation.x,
                    0,
                    delta * 10
                );
                bodyGroup.current.position.y = Math.sin(c) * 0.016;
                bodyGroup.current.rotation.x = THREE.MathUtils.lerp(
                    bodyGroup.current.rotation.x,
                    0,
                    delta * 8
                );
                bodyGroup.current.rotation.z = THREE.MathUtils.lerp(
                    bodyGroup.current.rotation.z,
                    0,
                    delta * 8
                );
                ponchoGroup.current.rotation.x = Math.sin(c) * 0.015;
                scarfTailGroup.current.rotation.x = 0.08 + Math.sin(c * 1.2) * 0.035;
                lanternGroup.current.rotation.x = Math.sin(c * 1.1) * 0.04;
                lanternGroup.current.rotation.z = Math.cos(c * 0.9) * 0.03;
                headGroup.current.rotation.y = Math.sin(c * 0.45) * 0.07;
            }
        }

        // 9. Signature Memory Lantern Feature for Male / Fallback Mesh
        if (lanternLight.current) {
            const memDist = playerTelemetry.nearestMemoryDistance;
            const proximityBoost =
                memDist < 7.0 ? Math.pow(1 - memDist / 7.0, 1.5) * 2.2 : 0;
            lanternLight.current.intensity = THREE.MathUtils.lerp(
                lanternLight.current.intensity,
                1.1 + proximityBoost,
                delta * 6
            );
        }
    });

    if (phase !== 'exploring') return null;

    const fallbackExplorer = (
        <ExplorerModelMesh archetype={characterModel} rig={rigRefs} />
    );

    return (
        <group ref={rootRef} position={[0, 0, 7.5]} rotation={[0, Math.PI, 0]}>
            {characterModel === 'female' ? (
                <CharacterGLBErrorBoundary fallback={fallbackExplorer}>
                    <Suspense fallback={fallbackExplorer}>
                        <FemaleWandererGLB
                            moveState={animMoveState}
                            horizSpeed={currentHorizSpeed}
                            isGrounded={isGroundedState}
                            walkSpeedRef={WALK_SPEED}
                            runSpeedRef={RUN_SPEED}
                        />
                    </Suspense>
                </CharacterGLBErrorBoundary>
            ) : (
                fallbackExplorer
            )}
        </group>
    );
};