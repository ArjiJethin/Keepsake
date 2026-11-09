// src/components/Character/PlayerCharacter.tsx
import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import {
    getGardenTerrainHeight,
    getGardenTerrainNormal,
} from '../../scenes/Environment/lowPolyUtils';
import { collisionManager } from '../../systems/Collision/collisionSystem';

const GRAVITY = -22.0;
const JUMP_VELOCITY = 7.8;
const WALK_SPEED = 4.6;
const RUN_SPEED = 8.2;
const ACCELERATION = 11.5;
const DECELERATION = 14.0;

export const PlayerCharacter: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const activeModal = useGameStore((state) => state.activeModal);

    const rootRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);
    const cloakRef = useRef<THREE.Mesh>(null);
    const leftLegRef = useRef<THREE.Group>(null);
    const rightLegRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);
    const satchelRef = useRef<THREE.Group>(null);

    const keys = useRef<{ [key: string]: boolean }>({});
    const velocity = useRef(new THREE.Vector3(0, 0, 0));
    const animCycle = useRef(0);

    // Initialize spawn elevation
    useEffect(() => {
        const startY = getGardenTerrainHeight(
            playerTelemetry.position[0],
            playerTelemetry.position[2]
        );
        playerTelemetry.position[1] = startY;
    }, []);

    // Keyboard Listeners (WASD, Shift, Space)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const code = e.code;
            keys.current[code] = true;

            if (
                code === 'Space' &&
                playerTelemetry.isGrounded &&
                phase === 'exploring' &&
                activeModal === 'none'
            ) {
                velocity.current.y = JUMP_VELOCITY;
                playerTelemetry.isGrounded = false;
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            keys.current[e.code] = false;
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [phase, activeModal]);

    useFrame((_, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        if (!rootRef.current) return;

        const canMove = phase === 'exploring' && activeModal === 'none';

        // 1. Compute Camera-Relative Input Vector
        let inputForward = 0;
        let inputRight = 0;
        if (canMove) {
            if (keys.current['KeyW'] || keys.current['ArrowUp']) inputForward += 1;
            if (keys.current['KeyS'] || keys.current['ArrowDown']) inputForward -= 1;
            if (keys.current['KeyD'] || keys.current['ArrowRight']) inputRight += 1;
            if (keys.current['KeyA'] || keys.current['ArrowLeft']) inputLeftOrRight: inputRight -= 1;
        }

        const inputLen = Math.hypot(inputForward, inputRight);
        const isSprinting =
            keys.current['ShiftLeft'] || keys.current['ShiftRight'];
        const targetSpeed =
            inputLen > 0 ? (isSprinting ? RUN_SPEED : WALK_SPEED) : 0;

        // Direction relative to current camera yaw
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

        // 2. Smooth Horizontal Acceleration & Deceleration + Slope Adjustment
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

        // 3. Apply Gravity & Vertical Velocity
        velocity.current.y += GRAVITY * delta;

        let nextX = curX + velocity.current.x * delta;
        let nextZ = curZ + velocity.current.z * delta;
        let nextY = curY + velocity.current.y * delta;

        // 4. Resolve Solid Obstacle Collisions (Trees, Boulders, Archway, Pedestals)
        [nextX, nextZ] = collisionManager.resolvePlayerMovement(
            nextX,
            nextY,
            nextZ,
            0.42
        );

        // 5. Ground Elevation Detection & Smooth Terrain Sticking
        const groundHeight = getGardenTerrainHeight(nextX, nextZ);
        if (nextY <= groundHeight + 0.03 && velocity.current.y <= 0) {
            nextY = groundHeight;
            velocity.current.y = 0;
            playerTelemetry.isGrounded = true;
        } else if (
            playerTelemetry.isGrounded &&
            nextY - groundHeight < 0.35 &&
            velocity.current.y <= 0
        ) {
            // Stick smoothly when walking downhill over slopes
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

        // 6. Smooth Character Rotation along Movement Direction
        const horizSpeed = Math.hypot(velocity.current.x, velocity.current.z);
        if (horizSpeed > 0.25) {
            const targetAngle = Math.atan2(velocity.current.x, velocity.current.z);
            let angleDiff = targetAngle - playerTelemetry.rotationY;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            playerTelemetry.rotationY += angleDiff * Math.min(1, delta * 12);
        }

        rootRef.current.position.set(nextX, nextY, nextZ);
        rootRef.current.rotation.y = playerTelemetry.rotationY;

        // 7. Procedural Character Animation (Idle, Walk, Run, Jump)
        if (!playerTelemetry.isGrounded) {
            playerTelemetry.moveState = 'jump';
        } else if (horizSpeed > 5.8) {
            playerTelemetry.moveState = 'run';
        } else if (horizSpeed > 0.25) {
            playerTelemetry.moveState = 'walk';
        } else {
            playerTelemetry.moveState = 'idle';
        }

        const cycleSpeed =
            playerTelemetry.moveState === 'run'
                ? 13.5
                : playerTelemetry.moveState === 'walk'
                    ? 8.5
                    : 2.2;
        animCycle.current += delta * cycleSpeed;
        const c = animCycle.current;

        const strideAmp = THREE.MathUtils.clamp(horizSpeed / RUN_SPEED, 0, 1);

        if (
            leftLegRef.current &&
            rightLegRef.current &&
            leftArmRef.current &&
            rightArmRef.current &&
            bodyRef.current &&
            cloakRef.current &&
            headRef.current &&
            satchelRef.current
        ) {
            if (!playerTelemetry.isGrounded) {
                // Jump / Airborne pose
                leftLegRef.current.rotation.x = THREE.MathUtils.lerp(
                    leftLegRef.current.rotation.x,
                    0.45,
                    delta * 10
                );
                rightLegRef.current.rotation.x = THREE.MathUtils.lerp(
                    rightLegRef.current.rotation.x,
                    -0.35,
                    delta * 10
                );
                leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
                    leftArmRef.current.rotation.x,
                    -0.5,
                    delta * 10
                );
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
                    rightArmRef.current.rotation.x,
                    0.4,
                    delta * 10
                );
                cloakRef.current.rotation.x = THREE.MathUtils.lerp(
                    cloakRef.current.rotation.x,
                    0.32,
                    delta * 8
                );
            } else if (horizSpeed > 0.2) {
                // Walking / Running cycle
                const legSwing = Math.sin(c) * (0.55 * strideAmp + 0.15);
                leftLegRef.current.rotation.x = legSwing;
                rightLegRef.current.rotation.x = -legSwing;

                leftArmRef.current.rotation.x = -legSwing * 0.65;
                rightArmRef.current.rotation.x = legSwing * 0.65;

                // Vertical step bounce & forward torso lean
                bodyRef.current.position.y = Math.abs(Math.cos(c)) * 0.065 * strideAmp;
                bodyRef.current.rotation.x = 0.08 + strideAmp * 0.12;

                // Flowing cloak & satchel bounce
                cloakRef.current.rotation.x =
                    0.12 + strideAmp * 0.22 + Math.sin(c * 2) * 0.04;
                satchelRef.current.rotation.z = Math.sin(c) * 0.08 * strideAmp;
            } else {
                // Gentle breathing idle
                leftLegRef.current.rotation.x = THREE.MathUtils.lerp(
                    leftLegRef.current.rotation.x,
                    0,
                    delta * 10
                );
                rightLegRef.current.rotation.x = THREE.MathUtils.lerp(
                    rightLegRef.current.rotation.x,
                    0,
                    delta * 10
                );
                leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
                    leftArmRef.current.rotation.x,
                    0,
                    delta * 10
                );
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
                    rightArmRef.current.rotation.x,
                    0,
                    delta * 10
                );
                bodyRef.current.position.y = Math.sin(c) * 0.018;
                bodyRef.current.rotation.x = THREE.MathUtils.lerp(
                    bodyRef.current.rotation.x,
                    0,
                    delta * 8
                );
                cloakRef.current.rotation.x = 0.06 + Math.sin(c) * 0.02;
                headRef.current.rotation.y = Math.sin(c * 0.5) * 0.06;
            }
        }
    });

    if (phase !== 'exploring') return null;

    return (
        <group ref={rootRef} position={[0, 0, 7.5]} rotation={[0, Math.PI, 0]}>
            <group ref={bodyRef}>
                {/* Left Leg & Boot */}
                <group ref={leftLegRef} position={[-0.13, 0.72, 0]}>
                    {/* Rolled Slate Trousers */}
                    <mesh position={[0, -0.22, 0]} castShadow>
                        <cylinderGeometry args={[0.095, 0.085, 0.44, 6]} />
                        <meshStandardMaterial color="#4a4d57" roughness={0.88} flatShading />
                    </mesh>
                    {/* Warm Brown Leather Boot */}
                    <mesh position={[0, -0.54, 0.02]} castShadow>
                        <boxGeometry args={[0.15, 0.24, 0.22]} />
                        <meshStandardMaterial color="#5e3e2e" roughness={0.85} flatShading />
                    </mesh>
                </group>

                {/* Right Leg & Boot */}
                <group ref={rightLegRef} position={[0.13, 0.72, 0]}>
                    <mesh position={[0, -0.22, 0]} castShadow>
                        <cylinderGeometry args={[0.095, 0.085, 0.44, 6]} />
                        <meshStandardMaterial color="#4a4d57" roughness={0.88} flatShading />
                    </mesh>
                    <mesh position={[0, -0.54, 0.02]} castShadow>
                        <boxGeometry args={[0.15, 0.24, 0.22]} />
                        <meshStandardMaterial color="#5e3e2e" roughness={0.85} flatShading />
                    </mesh>
                </group>

                {/* Inner Warm Tunic Torso */}
                <mesh position={[0, 0.98, 0]} castShadow>
                    <cylinderGeometry args={[0.21, 0.25, 0.62, 7]} />
                    <meshStandardMaterial color="#7d5942" roughness={0.85} flatShading />
                </mesh>

                {/* Signature Warm Parchment-Beige Traveler Poncho / Cloak (Matches Home Screen.jpg) */}
                <mesh
                    ref={cloakRef}
                    position={[0, 1.06, -0.02]}
                    rotation={[0.06, 0, 0]}
                    castShadow
                >
                    <coneGeometry args={[0.48, 0.68, 7, 1, true]} />
                    <meshStandardMaterial
                        color="#d8c09e"
                        roughness={0.82}
                        side={THREE.DoubleSide}
                        flatShading
                    />
                </mesh>

                {/* Draped Hood / Collar */}
                <mesh position={[0, 1.32, -0.03]} rotation={[0.18, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.22, 0.31, 0.18, 7]} />
                    <meshStandardMaterial color="#b39370" roughness={0.85} flatShading />
                </mesh>

                {/* Left & Right Arms */}
                <group ref={leftArmRef} position={[-0.28, 1.22, 0]}>
                    <mesh position={[-0.04, -0.22, 0]} rotation={[0, 0, 0.15]} castShadow>
                        <cylinderGeometry args={[0.075, 0.065, 0.42, 6]} />
                        <meshStandardMaterial color="#c9ae8c" roughness={0.85} flatShading />
                    </mesh>
                </group>
                <group ref={rightArmRef} position={[0.28, 1.22, 0]}>
                    <mesh position={[0.04, -0.22, 0]} rotation={[0, 0, -0.15]} castShadow>
                        <cylinderGeometry args={[0.075, 0.065, 0.42, 6]} />
                        <meshStandardMaterial color="#c9ae8c" roughness={0.85} flatShading />
                    </mesh>
                </group>

                {/* Cross-Body Strap & Left-Hip Leather Satchel Bag (Matches Home Screen.jpg) */}
                <group ref={satchelRef}>
                    <mesh
                        position={[0, 1.04, 0]}
                        rotation={[0, 0, -0.62]}
                        castShadow
                    >
                        <torusGeometry args={[0.28, 0.028, 5, 14]} />
                        <meshStandardMaterial color="#593a28" roughness={0.8} flatShading />
                    </mesh>
                    <group position={[-0.27, 0.78, -0.06]} rotation={[0.08, 0.2, 0.12]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.18, 0.24, 0.28]} />
                            <meshStandardMaterial color="#8f5d3c" roughness={0.8} flatShading />
                        </mesh>
                        <mesh position={[0, 0.06, 0.01]} castShadow>
                            <boxGeometry args={[0.19, 0.12, 0.29]} />
                            <meshStandardMaterial color="#73482d" roughness={0.82} flatShading />
                        </mesh>
                    </group>
                </group>

                {/* Stylized Head & Layered Low-Poly Dark Hair */}
                <group ref={headRef} position={[0, 1.54, 0]}>
                    <mesh castShadow>
                        <icosahedronGeometry args={[0.19, 1]} />
                        <meshStandardMaterial color="#e6bda3" roughness={0.75} flatShading />
                    </mesh>
                    {/* Sculpted Spiky Low-Poly Dark Espresso Hair */}
                    <mesh position={[0, 0.06, -0.02]} castShadow>
                        <icosahedronGeometry args={[0.22, 1]} />
                        <meshStandardMaterial color="#362826" roughness={0.85} flatShading />
                    </mesh>
                    <mesh position={[-0.12, 0.08, -0.06]} rotation={[0.3, 0, 0.5]} castShadow>
                        <coneGeometry args={[0.1, 0.22, 5]} />
                        <meshStandardMaterial color="#362826" roughness={0.85} flatShading />
                    </mesh>
                    <mesh position={[0.12, 0.08, -0.06]} rotation={[0.3, 0, -0.5]} castShadow>
                        <coneGeometry args={[0.1, 0.22, 5]} />
                        <meshStandardMaterial color="#362826" roughness={0.85} flatShading />
                    </mesh>
                    <mesh position={[0, 0.14, -0.1]} rotation={[-0.4, 0, 0]} castShadow>
                        <coneGeometry args={[0.11, 0.24, 5]} />
                        <meshStandardMaterial color="#2b1f1e" roughness={0.85} flatShading />
                    </mesh>
                </group>
            </group>
        </group>
    );
};