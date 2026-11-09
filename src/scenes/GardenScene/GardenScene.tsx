// src/scenes/GardenScene/GardenScene.tsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GardenLighting } from '../Lighting/GardenLighting';
import { THEME } from '../../styles/theme';
import { useGameStore } from '../../store/useGameStore';
import './GardenScene.css';

const FoundationPreviewIsland: React.FC = () => {
    const crystalRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        const t = state.clock.getElapsedTime();
        if (crystalRef.current) {
            crystalRef.current.rotation.y += delta * 0.8;
            crystalRef.current.position.y = 1.9 + Math.sin(t * 2.2) * 0.12;
        }
        if (ringRef.current) {
            ringRef.current.rotation.z -= delta * 0.5;
            const scale = 1 + Math.sin(t * 3) * 0.04;
            ringRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <group position={[0, -0.5, 0]}>
            {/* Faceted Low-Poly Terrain Mound */}
            <mesh receiveShadow castShadow position={[0, -0.6, 0]}>
                <cylinderGeometry args={[6.5, 5.2, 1.2, 9]} />
                <meshStandardMaterial
                    color={THEME.colors.grassPrimary}
                    roughness={0.88}
                    flatShading
                />
            </mesh>

            {/* Stylized Stepping Stones */}
            {[-1.8, -0.4, 1.1, 2.5].map((zPos, idx) => (
                <mesh
                    key={idx}
                    receiveShadow
                    castShadow
                    position={[Math.sin(idx) * 0.5, 0.04, zPos]}
                    rotation={[0, idx * 0.7, 0]}
                >
                    <cylinderGeometry args={[0.65, 0.75, 0.14, 7]} />
                    <meshStandardMaterial
                        color={THEME.colors.stoneLight}
                        roughness={0.9}
                        flatShading
                    />
                </mesh>
            ))}

            {/* Low-Poly Stylized Tree (Right Side Preview) */}
            <group position={[2.8, 0, -1.5]}>
                <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
                    <cylinderGeometry args={[0.25, 0.48, 2.4, 6]} />
                    <meshStandardMaterial
                        color={THEME.colors.trunkBrown}
                        roughness={0.9}
                        flatShading
                    />
                </mesh>
                <mesh castShadow receiveShadow position={[0, 2.8, 0]}>
                    <icosahedronGeometry args={[1.45, 1]} />
                    <meshStandardMaterial
                        color={THEME.colors.blossomPink}
                        roughness={0.8}
                        flatShading
                    />
                </mesh>
                <mesh castShadow receiveShadow position={[-0.9, 2.3, 0.5]}>
                    <icosahedronGeometry args={[1.0, 1]} />
                    <meshStandardMaterial
                        color={THEME.colors.blossomLight}
                        roughness={0.8}
                        flatShading
                    />
                </mesh>
                <mesh castShadow receiveShadow position={[0.95, 2.4, -0.4]}>
                    <icosahedronGeometry args={[1.1, 1]} />
                    <meshStandardMaterial
                        color={THEME.colors.blossomPink}
                        roughness={0.8}
                        flatShading
                    />
                </mesh>
            </group>

            {/* Low-Poly Stone Pedestal & Glowing Memory Object */}
            <group position={[-2.2, 0, -0.5]}>
                <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
                    <cylinderGeometry args={[0.75, 0.95, 0.9, 7]} />
                    <meshStandardMaterial
                        color={THEME.colors.stoneBase}
                        roughness={0.85}
                        flatShading
                    />
                </mesh>

                <mesh ref={crystalRef} position={[0, 1.9, 0]}>
                    <octahedronGeometry args={[0.38, 0]} />
                    <meshStandardMaterial
                        color={THEME.colors.memoryCore}
                        emissive={THEME.colors.memoryEmissive}
                        emissiveIntensity={2.2}
                        roughness={0.2}
                        flatShading
                    />
                </mesh>

                <mesh ref={ringRef} position={[0, 1.9, 0]}>
                    <torusGeometry args={[0.68, 0.025, 8, 24]} />
                    <meshBasicMaterial
                        color={THEME.colors.memoryGold}
                        transparent
                        opacity={0.85}
                    />
                </mesh>

                <pointLight
                    position={[0, 1.8, 0]}
                    color={THEME.colors.memoryGold}
                    intensity={2.4}
                    distance={6}
                    decay={2}
                />
            </group>
        </group>
    );
};

export const GardenScene: React.FC = () => {
    const quality = useGameStore((state) => state.quality);

    return (
        <div className="garden-canvas-wrapper">
            <Canvas
                shadows
                dpr={quality === 'high' ? [1, 2] : [1, 1]}
                camera={{ position: [0, 3.5, 8.5], fov: 45, near: 0.1, far: 250 }}
                gl={{
                    antialias: quality === 'high',
                    powerPreference: 'high-performance',
                }}
            >
                <GardenLighting />
                <FoundationPreviewIsland />
                <OrbitControls
                    enablePan={false}
                    minDistance={4}
                    maxDistance={18}
                    maxPolarAngle={Math.PI / 2 - 0.05}
                    target={[0, 1, 0]}
                />
            </Canvas>
        </div>
    );
};