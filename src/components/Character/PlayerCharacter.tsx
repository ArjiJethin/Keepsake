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
const JUMP_VELOCITY = 7.6;

/**
 * Movement speeds calibrated to match the physical stride length of
 * KeepSakeFemale-v2-animated.glb (Walk_2 and Sprint clips) while feeling
 * responsive and fluid across the garden.
 */
const WALK_SPEED = 2.65;
const RUN_SPEED = 5.85;
const ACCELERATION = 10.5;
const DECELERATION = 13.5;
const TURN_SMOOTHING = 13.0;
const STOP_SPEED_DEADZONE = 0.035;

// Pre-allocated scratch vectors to avoid per-frame garbage collection
const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

/**
 * Samples terrain height across the character's center and left/right foot
 * stance positions so the character's feet never float above or sink into
 * angled low-poly terrain facets.
 */
function getFootContactTerrainHeight(
    x: number,
    z: number,
    rotationY: number
): number {
    const centerH = getGardenTerrainHeight(x, z);
    const footSpread = 0.14;
    const cosR = Math.cos(rotationY);
    const sinR = Math.sin(rotationY);

    const leftFootH = getGardenTerrainHeight(
        x - cosR * footSpread,
        z + sinR * footSpread
    );
    const rightFootH = getGardenTerrainHeight(
        x + cosR * footSpread,
        z - sinR * footSpread
    );

    // Blend center height with the supporting foot contact plane
    const avgFootH = (leftFootH + rightFootH) * 0.5;
    return centerH * 0.55 + avgFootH * 0.45;
}

class CharacterGLBErrorBoundary extends React.Component<
    { fallback: React.ReactNode; children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: {
        fallback: React.ReactNode;
        children: React.ReactNode;
    }) {
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

    const [animMoveState, setAnimMoveState] =
        useState<WandererAnimState>('idle');
    const [isGroundedState, setIsGroundedState] = useState<boolean>(true);
    const lastSyncMoveStateRef = useRef<WandererAnimState>('idle');
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
    const smoothedVisualY = useRef<number>(0);
    const isVisualYInitialized = useRef<boolean>(false);
    const animCycle = useRef(0);

    useEffect(() => {
        const startY = getFootContactTerrainHeight(
            playerTelemetry.position[0],
            playerTelemetry.position[2],
            playerTelemetry.rotationY
        );
        playerTelemetry.position[1] = startY;
        smoothedVisualY.current = startY;
        isVisualYInitialized.current = true;
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

        // 1. Camera-Relative Movement Input
        let inputForward = 0;
        let inputRight = 0;
        if (canMove) {
            if (keys.current['KeyW'] || keys.current['ArrowUp'])
                inputForward += 1;
            if (keys.current['KeyS'] || keys.current['ArrowDown'])
                inputForward -= 1;
            if (keys.current['KeyD'] || keys.current['ArrowRight'])
                inputRight += 1;
            if (keys.current['KeyA'] || keys.current['ArrowLeft'])
                inputRight -= 1;
        }

        const inputLen = Math.hypot(inputForward, inputRight);
        const isSprinting =
            Boolean(keys.current['ShiftLeft'] || keys.current['ShiftRight']) &&
            inputLen > 0;
        const targetSpeed =
            inputLen > 0 ? (isSprinting ? RUN_SPEED : WALK_SPEED) : 0;

        const camYaw = playerTelemetry.cameraYaw;
        _forwardVec.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        _rightVec.set(Math.cos(camYaw), 0, -Math.sin(camYaw));

        _moveDir.set(0, 0, 0);
        if (inputLen > 0.001) {
            _moveDir
                .addScaledVector(_forwardVec, inputForward / inputLen)
                .addScaledVector(_rightVec, inputRight / inputLen)
                .normalize();
        }

        // 2. Exponential Acceleration, Deceleration & Slope Compensation
        const [curX, curY, curZ] = playerTelemetry.position;
        const surfaceNormal = getGardenTerrainNormal(curX, curZ);
        const slopeFactor = THREE.MathUtils.clamp(surfaceNormal.y, 0.72, 1.0);

        const desiredVelX = _moveDir.x * targetSpeed * slopeFactor;
        const desiredVelZ = _moveDir.z * targetSpeed * slopeFactor;

        const accelLambda = inputLen > 0 ? ACCELERATION : DECELERATION;
        const dampFactor = 1.0 - Math.exp(-accelLambda * delta);

        velocity.current.x = THREE.MathUtils.lerp(
            velocity.current.x,
            desiredVelX,
            dampFactor
        );
        velocity.current.z = THREE.MathUtils.lerp(
            velocity.current.z,
            desiredVelZ,
            dampFactor
        );

        // Snap residual velocity to 0 when keys are released so character never drifts
        if (
            inputLen === 0 &&
            Math.hypot(velocity.current.x, velocity.current.z) <
            STOP_SPEED_DEADZONE
        ) {
            velocity.current.x = 0;
            velocity.current.z = 0;
        }

        // 3. Gravity & Vertical Jump Trajectory
        velocity.current.y += GRAVITY * delta;

        let nextX = curX + velocity.current.x * delta;
        let nextZ = curZ + velocity.current.z * delta;
        let nextY = curY + velocity.current.y * delta;

        // 4. Spatial Cylinder Collision Resolution
        [nextX, nextZ] = collisionManager.resolvePlayerMovement(
            nextX,
            nextY,
            nextZ,
            0.42
        );

        // 5. Accurate Foot-to-Terrain Alignment & Slope Contact
        const rawGroundHeight = getFootContactTerrainHeight(
            nextX,
            nextZ,
            playerTelemetry.rotationY
        );
        // Subtle slope contact compensation so the uphill/downhill foot doesn't hover on slopes
        const slopeContactSink = (1.0 - surfaceNormal.y) * 0.075;
        const effectiveGroundHeight = rawGroundHeight - slopeContactSink;

        if (nextY <= effectiveGroundHeight + 0.03 && velocity.current.y <= 0) {
            nextY = effectiveGroundHeight;
            velocity.current.y = 0;
            playerTelemetry.isGrounded = true;
        } else if (
            playerTelemetry.isGrounded &&
            nextY - effectiveGroundHeight < 0.42 &&
            velocity.current.y <= 0
        ) {
            // Adhere smoothly when walking/sprinting downhill
            nextY = effectiveGroundHeight;
            velocity.current.y = 0;
        } else {
            playerTelemetry.isGrounded = false;
        }

        // Smooth micro-steps across low-poly triangle edges when grounded
        if (!isVisualYInitialized.current) {
            smoothedVisualY.current = nextY;
            isVisualYInitialized.current = true;
        } else if (playerTelemetry.isGrounded) {
            const ySmoothFactor = 1.0 - Math.exp(-26.0 * delta);
            smoothedVisualY.current = THREE.MathUtils.lerp(
                smoothedVisualY.current,
                nextY,
                ySmoothFactor
            );
        } else {
            smoothedVisualY.current = nextY;
        }

        playerTelemetry.position = [nextX, smoothedVisualY.current, nextZ];
        playerTelemetry.velocity = [
            velocity.current.x,
            velocity.current.y,
            velocity.current.z,
        ];

        // 6. Smooth Shortest-Arc Character Rotation Toward Travel Direction
        const horizSpeed = Math.hypot(velocity.current.x, velocity.current.z);
        if (horizSpeed > 0.08 && inputLen > 0) {
            const targetAngle = Math.atan2(
                velocity.current.x,
                velocity.current.z
            );
            let angleDiff = targetAngle - playerTelemetry.rotationY;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            const turnFactor = 1.0 - Math.exp(-TURN_SMOOTHING * delta);
            playerTelemetry.rotationY += angleDiff * turnFactor;
        }

        rootRef.current.position.set(nextX, smoothedVisualY.current, nextZ);
        rootRef.current.rotation.y = playerTelemetry.rotationY;

        // 7. Synchronize Movement State
        let nextMoveState: WandererAnimState = 'idle';
        if (!playerTelemetry.isGrounded) {
            nextMoveState = 'jump';
        } else if (isSprinting && horizSpeed > 3.25) {
            nextMoveState = 'run';
        } else if (horizSpeed > 0.08) {
            nextMoveState = 'walk';
        } else {
            nextMoveState = 'idle';
        }

        playerTelemetry.moveState = nextMoveState;

        if (lastSyncMoveStateRef.current !== nextMoveState) {
            lastSyncMoveStateRef.current = nextMoveState;
            setAnimMoveState(nextMoveState);
        }
        if (lastSyncGroundedRef.current !== playerTelemetry.isGrounded) {
            lastSyncGroundedRef.current = playerTelemetry.isGrounded;
            setIsGroundedState(playerTelemetry.isGrounded);
        }

        // 8. Procedural Rig Animation for Male Archetype / Fallback Mesh
        if (characterModel === 'male') {
            const cycleSpeed =
                playerTelemetry.moveState === 'run'
                    ? 12.5
                    : playerTelemetry.moveState === 'walk'
                        ? 7.8
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
                } else if (horizSpeed > 0.08) {
                    const legSwing = Math.sin(c) * (0.58 * stride + 0.14);
                    leftLegGroup.current.rotation.x = legSwing;
                    rightLegGroup.current.rotation.x = -legSwing;

                    leftArmGroup.current.rotation.x = -legSwing * 0.62;
                    rightArmGroup.current.rotation.x = legSwing * 0.62;

                    bodyGroup.current.position.y =
                        Math.abs(Math.cos(c)) * 0.062 * stride;
                    bodyGroup.current.rotation.x = 0.06 + stride * 0.13;
                    bodyGroup.current.rotation.z =
                        Math.sin(c) * 0.025 * stride;

                    ponchoGroup.current.rotation.x =
                        0.05 + stride * 0.1 + Math.sin(c * 2) * 0.03;
                    scarfTailGroup.current.rotation.x =
                        0.18 + stride * 0.38 + Math.sin(c * 2 + 0.6) * 0.09;
                    scarfTailGroup.current.rotation.z =
                        Math.cos(c) * 0.08 * stride;
                    backpackGroup.current.position.y =
                        1.07 + Math.sin(c * 2 - 0.5) * 0.018 * stride;
                    lanternGroup.current.rotation.x =
                        0.12 * stride + Math.sin(c * 2 - 0.8) * 0.18 * stride;
                    lanternGroup.current.rotation.z =
                        Math.cos(c) * 0.14 * stride;
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
                    scarfTailGroup.current.rotation.x =
                        0.08 + Math.sin(c * 1.2) * 0.035;
                    lanternGroup.current.rotation.x =
                        Math.sin(c * 1.1) * 0.04;
                    lanternGroup.current.rotation.z =
                        Math.cos(c * 0.9) * 0.03;
                    headGroup.current.rotation.y =
                        Math.sin(c * 0.45) * 0.07;
                }
            }

            if (lanternLight.current) {
                const memDist = playerTelemetry.nearestMemoryDistance;
                const proximityBoost =
                    memDist < 7.0
                        ? Math.pow(1 - memDist / 7.0, 1.5) * 2.2
                        : 0;
                lanternLight.current.intensity = THREE.MathUtils.lerp(
                    lanternLight.current.intensity,
                    1.1 + proximityBoost,
                    delta * 6
                );
            }
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
                            horizSpeed={0}
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