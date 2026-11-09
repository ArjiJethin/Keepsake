// src/components/Memory/MemoryPedestals.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import { getGardenTerrainHeight } from '../../scenes/Environment/lowPolyUtils';
import { useGameStore } from '../../store/useGameStore';

export const MemoryPedestals: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const orbRefs = useRef<Array<THREE.Group | null>>([]);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        orbRefs.current.forEach((orb, idx) => {
            if (orb) {
                orb.position.y = 1.65 + Math.sin(t * 1.8 + idx * 1.4) * 0.08;
                orb.rotation.y = Math.sin(t * 0.5 + idx) * 0.15;
            }
        });
    });

    // Only show full memory pedestals once entering/exploring the garden (or subtle in distance)
    const opacityScale = phase === 'exploring' ? 1 : 0;
    if (opacityScale === 0) return null;

    const pedestals = [
        // 1. Right Foreground Hero Photo Pedestal (Matches Home Screen.jpg)
        { id: 'mem-photo-right', x: 2.35, z: 4.8, scale: 1.05, type: 'photo' },
        // 2. Left Midground Framed Painting Pedestal
        { id: 'mem-frame-left', x: -3.6, z: 2.2, scale: 0.95, type: 'frame' },
        // 3. Midground Music Shrine Pedestal
        { id: 'mem-music-mid', x: 1.9, z: -4.8, scale: 0.78, type: 'music' },
        // 4. Distant Video Shrine near Archway
        { id: 'mem-video-far', x: -2.4, z: -6.5, scale: 0.75, type: 'video' },
    ];

    return (
        <group>
            {pedestals.map((p, idx) => {
                const y = getGardenTerrainHeight(p.x, p.z);
                return (
                    <group key={p.id} position={[p.x, y, p.z]} scale={p.scale}>
                        {/* Faceted Stone Base Plinth */}
                        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[1.15, 1.38, 0.5, 7]} />
                            <meshStandardMaterial
                                color={THEME.colors.stoneBase}
                                roughness={0.88}
                                flatShading
                            />
                        </mesh>
                        {/* Sculpted Stone Pedestal Column */}
                        <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[0.82, 0.96, 0.72, 7]} />
                            <meshStandardMaterial
                                color={THEME.colors.stoneSunlit}
                                roughness={0.86}
                                flatShading
                            />
                        </mesh>
                        {/* Pedestal Cap Slab */}
                        <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
                            <cylinderGeometry args={[0.92, 0.88, 0.14, 7]} />
                            <meshStandardMaterial
                                color={THEME.colors.stoneSunlit}
                                roughness={0.82}
                                flatShading
                            />
                        </mesh>

                        {/* Warm Glowing Memory Relic & Restrained Golden Halo */}
                        <group
                            ref={(el) => {
                                orbRefs.current[idx] = el;
                            }}
                            position={[0, 1.65, 0]}
                        >
                            {/* Soft Outer Golden Halo Ring */}
                            <mesh>
                                <torusGeometry args={[0.48, 0.016, 8, 32]} />
                                <meshBasicMaterial
                                    color={THEME.colors.memoryGold}
                                    transparent
                                    opacity={0.75}
                                />
                            </mesh>
                            {/* Inner Memory Icon / Frame */}
                            <mesh>
                                <boxGeometry args={[0.42, 0.34, 0.04]} />
                                <meshStandardMaterial
                                    color={THEME.colors.memoryCore}
                                    emissive={THEME.colors.memoryEmissive}
                                    emissiveIntensity={1.35}
                                    roughness={0.3}
                                />
                            </mesh>
                        </group>

                        {/* Restrained Warm Point Light */}
                        <pointLight
                            position={[0, 1.55, 0]}
                            color={THEME.colors.memoryGold}
                            intensity={1.6}
                            distance={5.5}
                            decay={2}
                        />
                    </group>
                );
            })}
        </group>
    );
};