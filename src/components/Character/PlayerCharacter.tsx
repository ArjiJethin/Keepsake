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
import { gameAudio } from '../../systems/Audio/gameAudio';
import { ExplorerModelMesh, type ExplorerRigRefs } from './ExplorerModelMesh';
import {
    FemaleWandererGLB,
    type WandererAnimState,
} from './FemaleWandererGLB';
import { MaleWandererGLB } from './MaleWandererGLB';

const GRAVITY = -22.0;
const JUMP_VELOCITY = 7.6;

const WALK_SPEED = 2.65;
const RUN_SPEED = 8.45;
const ACCELERATION = 11.5;
const DECELERATION = 14.0;
const TURN_SMOOTHING = 13.5;
const STOP_SPEED_DEADZONE = 0.035;

const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

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

    const avgFootH = (leftFootH + rightFootH) * 0.5;
    return centerH * 0.55 + avgFootH * 0.45;
}

class CharacterGLBErrorBoundary extends React.Component<
    {
        modelName: string;
        fallback: React.ReactNode;
        children: React.ReactNode;
    },
    { hasError: boolean }
> {
    constructor(props: {
        modelName: string;
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
            `[Keepsake] Failed to load ${this.props.modelName}. Ensure the GLB file is placed in public/.`,
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

    // Articulated Rig References for Procedural Fallback ExplorerModelMesh
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
            playerTelemetry.joystick.x = 0;
            playerTelemetry.joystick.y = 0;
            playerTelemetry.joystick.active = false;
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

        // 1. Unified Camera-Relative Movement Input (Keyboard + Mobile Touch Joystick)
        let kbForward = 0;
        let kbRight = 0;
        if (canMove) {
            if (keys.current['KeyW'] || keys.current['ArrowUp'])
                kbForward += 1;
            if (keys.current['KeyS'] || keys.current['ArrowDown'])
                kbForward -= 1;
            if (keys.current['KeyD'] || keys.current['ArrowRight'])
                kbRight += 1;
            if (keys.current['KeyA'] || keys.current['ArrowLeft'])
                kbRight -= 1;
        }

        const joyActive = canMove && playerTelemetry.joystick.active;
        const joyRight = joyActive ? playerTelemetry.joystick.x : 0;
        const joyForward = joyActive ? playerTelemetry.joystick.y : 0;

        // Combine inputs predictably, clamping magnitude to 1.0
        const rawForward = kbForward + joyForward;
        const rawRight = kbRight + joyRight;
        const rawMag = Math.hypot(rawForward, rawRight);
        const inputLen = Math.min(1.0, rawMag);

        const kbSprint =
            Boolean(keys.current['ShiftLeft'] || keys.current['ShiftRight']) &&
            Math.hypot(kbForward, kbRight) > 0;
        const joySprint = joyActive && Math.hypot(joyRight, joyForward) > 0.88;
        const isSprinting = kbSprint || joySprint;

        let targetSpeed = 0;
        if (inputLen > 0.01) {
            if (isSprinting) {
                targetSpeed = RUN_SPEED;
            } else if (joyActive && Math.hypot(kbForward, kbRight) === 0) {
                // Smooth analog speed modulation on mobile joystick
                targetSpeed = WALK_SPEED * THREE.MathUtils.clamp(inputLen * 1.15, 0.25, 1.0);
            } else {
                targetSpeed = WALK_SPEED;
            }
        }

        const camYaw = playerTelemetry.cameraYaw;
        _forwardVec.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        _rightVec.set(Math.cos(camYaw), 0, -Math.sin(camYaw));

        _moveDir.set(0, 0, 0);
        if (rawMag > 0.001) {
            _moveDir
                .addScaledVector(_forwardVec, rawForward / rawMag)
                .addScaledVector(_rightVec, rawRight / rawMag)
                .normalize();
        }

        // 2. Exponential Acceleration, Deceleration & Slope Compensation
        const [curX, curY, curZ] = playerTelemetry.position;
        const surfaceNormal = getGardenTerrainNormal(curX, curZ);
        const slopeFactor = THREE.MathUtils.clamp(surfaceNormal.y, 0.72, 1.0);

        const desiredVelX = _moveDir.x * targetSpeed * slopeFactor;
        const desiredVelZ = _moveDir.z * targetSpeed * slopeFactor;

        // Immediate stop response when joystick is released and no keys are held
        const accelLambda = inputLen > 0.01 ? ACCELERATION : DECELERATION * 1.25;
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

        if (
            inputLen <= 0.01 &&
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
            nextY = effectiveGroundHeight;
            velocity.current.y = 0;
        } else {
            playerTelemetry.isGrounded = false;
        }

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
        if (horizSpeed > 0.08 && inputLen > 0.01) {
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
        } else if (isSprinting && horizSpeed > 3.1) {
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

        // 8. Procedural Rig Animation if Fallback Mesh is mounted during Suspense
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
            const cycleSpeed =
                playerTelemetry.moveState === 'run'
                    ? 16.5
                    : playerTelemetry.moveState === 'walk'
                        ? 7.8
                        : 2.0;
            animCycle.current += delta * cycleSpeed;
            const c = animCycle.current;
            const stride = THREE.MathUtils.clamp(horizSpeed / RUN_SPEED, 0, 1);

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
            } else if (horizSpeed > 0.08) {
                const legSwing = Math.sin(c) * (0.62 * stride + 0.14);
                leftLegGroup.current.rotation.x = legSwing;
                rightLegGroup.current.rotation.x = -legSwing;
                leftArmGroup.current.rotation.x = -legSwing * 0.62;
                rightArmGroup.current.rotation.x = legSwing * 0.62;
                bodyGroup.current.position.y =
                    Math.abs(Math.cos(c)) * 0.062 * stride;
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
            }

            // Keep footstep SFX locked to the procedural stride phase.
            gameAudio.syncLocomotion({
                source: 'fallback',
                phase: (c % (Math.PI * 2)) / (Math.PI * 2),
                weight: 1,
                speed: horizSpeed,
                grounded: playerTelemetry.isGrounded,
            });
        }
    });

    if (phase !== 'exploring') return null;

    const fallbackExplorer = (
        <ExplorerModelMesh archetype={characterModel} rig={rigRefs} />
    );

    return (
        <group ref={rootRef} position={[0, 0, 7.5]} rotation={[0, Math.PI, 0]}>
            {characterModel === 'female' ? (
                <CharacterGLBErrorBoundary
                    key="female-glb-boundary"
                    modelName="/KeepSakeFemale-v2-animated.glb"
                    fallback={fallbackExplorer}
                >
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
                <CharacterGLBErrorBoundary
                    key="male-glb-boundary"
                    modelName="/KeepSakeMale-v2-animated.glb"
                    fallback={fallbackExplorer}
                >
                    <Suspense fallback={fallbackExplorer}>
                        <MaleWandererGLB
                            moveState={animMoveState}
                            horizSpeed={0}
                            isGrounded={isGroundedState}
                            walkSpeedRef={WALK_SPEED}
                            runSpeedRef={RUN_SPEED}
                        />
                    </Suspense>
                </CharacterGLBErrorBoundary>
            )}
        </group>
    );
};
