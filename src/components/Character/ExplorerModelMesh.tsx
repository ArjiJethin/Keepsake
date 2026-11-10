// src/components/Character/ExplorerModelMesh.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { CharacterArchetype } from '../../store/useGameStore';

export interface ExplorerRigRefs {
    bodyGroup: React.RefObject<THREE.Group | null>;
    headGroup: React.RefObject<THREE.Group | null>;
    ponchoGroup: React.RefObject<THREE.Group | null>;
    scarfTailGroup: React.RefObject<THREE.Group | null>;
    backpackGroup: React.RefObject<THREE.Group | null>;
    lanternGroup: React.RefObject<THREE.Group | null>;
    lanternLight: React.RefObject<THREE.PointLight | null>;
    leftArmGroup: React.RefObject<THREE.Group | null>;
    rightArmGroup: React.RefObject<THREE.Group | null>;
    leftLegGroup: React.RefObject<THREE.Group | null>;
    rightLegGroup: React.RefObject<THREE.Group | null>;
}

interface ExplorerModelMeshProps {
    archetype: CharacterArchetype;
    rig: ExplorerRigRefs;
}

const PALETTE = {
    skin: '#f3ccb4',
    skinBlush: '#e39b82',
    hairDark: '#332421',
    hairHighlight: '#543b34',
    scarfRust: '#b54d38',
    scarfDeep: '#8f3927',
    ponchoCream: '#f2e6d5',
    ponchoWarm: '#e3d1b8',
    ponchoPattern: '#c98e52',
    innerSage: '#6b7565',
    tunicDark: '#382b27',
    pantsDark: '#362a26',
    pantsCuff: '#4c3c36',
    leatherWarm: '#6e4730',
    leatherDark: '#4a2f1f',
    bedrollTan: '#bfa588',
    brassGold: '#e3ab56',
    lanternGlow: '#ffd478',
    lanternCore: '#fff6de',
    flowerWhite: '#fcf6eb',
    petalPink: '#f59ca9',
};

export const ExplorerModelMesh: React.FC<ExplorerModelMeshProps> = React.memo(
    ({ archetype, rig }) => {
        // Sculpted flared poncho cape geometry with wide kimono-style shoulder drape
        const ponchoMainGeo = useMemo(() => {
            const geo = new THREE.CylinderGeometry(0.22, 0.58, 0.68, 14, 4, true);
            const pos = geo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                const bottomFactor = (0.34 - y) / 0.68;
                const angle = Math.atan2(x, z);
                // Create front V-split and wide wing-like shoulder sleeves
                const sleeveFlare = Math.abs(Math.sin(angle)) * 0.14 * bottomFactor;
                const wave = Math.sin(angle * 6) * 0.022 * bottomFactor;
                pos.setXYZ(
                    i,
                    x * (1.14 + bottomFactor * 0.16 + sleeveFlare) + wave,
                    y - Math.abs(x) * 0.06,
                    z * (0.94 + bottomFactor * 0.08) + wave
                );
            }
            geo.computeVertexNormals();
            return geo;
        }, []);

        return (
            <group ref={rig.bodyGroup}>
                {/* ============================================================
                    1. LEGS, WIDE CUFFED CULOTTES & LACED EXPLORER BOOTS
                   ============================================================ */}
                {(['left', 'right'] as const).map((side) => {
                    const isLeft = side === 'left';
                    const legRef = isLeft ? rig.leftLegGroup : rig.rightLegGroup;
                    const xPos = isLeft ? -0.135 : 0.135;

                    return (
                        <group key={side} ref={legRef} position={[xPos, 0.74, 0]}>
                            {/* Wide Dark Chocolate Culotte Trouser Leg */}
                            <mesh position={[0, -0.17, 0]} castShadow receiveShadow>
                                <cylinderGeometry args={[0.132, 0.168, 0.36, 9]} />
                                <meshStandardMaterial color={PALETTE.pantsDark} roughness={0.86} flatShading />
                            </mesh>
                            {/* Side Cargo Pocket on Trouser Leg */}
                            <mesh position={[isLeft ? -0.13 : 0.13, -0.16, 0.02]} castShadow>
                                <boxGeometry args={[0.04, 0.14, 0.12]} />
                                <meshStandardMaterial color={PALETTE.pantsCuff} roughness={0.85} flatShading />
                            </mesh>
                            {/* Turned-up Trouser Cuff */}
                            <mesh position={[0, -0.34, 0]} castShadow>
                                <cylinderGeometry args={[0.158, 0.148, 0.065, 9]} />
                                <meshStandardMaterial color={PALETTE.pantsCuff} roughness={0.84} flatShading />
                            </mesh>
                            {/* Lower Shin & Ribbed Cream Sock */}
                            <mesh position={[0, -0.43, 0]} castShadow>
                                <cylinderGeometry args={[0.068, 0.062, 0.16, 8]} />
                                <meshStandardMaterial color={PALETTE.skin} roughness={0.75} />
                            </mesh>
                            <mesh position={[0, -0.49, 0]} castShadow>
                                <cylinderGeometry args={[0.08, 0.076, 0.09, 8]} />
                                <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.85} />
                            </mesh>
                            {/* Rugged Laced Explorer Boot with Orange Tongue Accent */}
                            <group position={[0, -0.61, 0.025]}>
                                <mesh position={[0, 0.07, -0.015]} castShadow>
                                    <cylinderGeometry args={[0.09, 0.096, 0.15, 8]} />
                                    <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.8} flatShading />
                                </mesh>
                                {/* Orange/Rust Padded Boot Tongue */}
                                <mesh position={[0, 0.08, 0.065]} rotation={[0.25, 0, 0]}>
                                    <boxGeometry args={[0.075, 0.1, 0.03]} />
                                    <meshStandardMaterial color={PALETTE.scarfRust} roughness={0.78} />
                                </mesh>
                                <mesh position={[0, -0.01, 0.02]} castShadow>
                                    <boxGeometry args={[0.168, 0.12, 0.25]} />
                                    <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.8} flatShading />
                                </mesh>
                                <mesh position={[0, -0.015, 0.12]} castShadow>
                                    <dodecahedronGeometry args={[0.084, 1]} />
                                    <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} flatShading />
                                </mesh>
                                {/* Lugged Boot Sole */}
                                <mesh position={[0, -0.075, 0.025]} castShadow>
                                    <boxGeometry args={[0.182, 0.044, 0.282]} />
                                    <meshStandardMaterial
                                        color={archetype === 'female' ? '#d9c5ad' : '#2e221d'}
                                        roughness={0.9}
                                    />
                                </mesh>
                                {/* Crossed Boot Laces */}
                                <mesh position={[0, 0.045, 0.08]} rotation={[0.42, 0, 0]}>
                                    <boxGeometry args={[0.092, 0.08, 0.02]} />
                                    <meshStandardMaterial color={PALETTE.brassGold} roughness={0.5} />
                                </mesh>
                            </group>
                        </group>
                    );
                })}

                {/* ============================================================
                    2. TORSO, INNER TRAVEL TUNIC, BELT, SASH & MEMORY JOURNAL
                   ============================================================ */}
                <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.22, 0.27, 0.28, 10]} />
                    <meshStandardMaterial color={PALETTE.tunicDark} roughness={0.85} flatShading />
                </mesh>
                <mesh position={[0, 1.06, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.2, 0.22, 0.42, 10]} />
                    <meshStandardMaterial color={PALETTE.innerSage} roughness={0.82} flatShading />
                </mesh>
                {/* Leather Waist Belt & Brass Ring Clasp */}
                <mesh position={[0, 0.84, 0]} castShadow>
                    <cylinderGeometry args={[0.236, 0.236, 0.06, 10]} />
                    <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.75} />
                </mesh>
                <mesh position={[0, 0.84, 0.236]}>
                    <torusGeometry args={[0.036, 0.01, 6, 12]} />
                    <meshStandardMaterial color={PALETTE.brassGold} metalness={0.45} roughness={0.35} />
                </mesh>
                {/* Hanging Terracotta Waist Sash & Cord Tassel */}
                <mesh position={[0.12, 0.65, 0.19]} rotation={[0.05, 0, -0.08]} castShadow>
                    <boxGeometry args={[0.058, 0.36, 0.022]} />
                    <meshStandardMaterial color={PALETTE.scarfRust} roughness={0.8} />
                </mesh>

                {/* Leather-Bound Memory Journal Holstered at Hip */}
                <group position={[-0.24, 0.78, 0.08]} rotation={[0.12, 0.25, 0.18]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.062, 0.21, 0.16]} />
                        <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.78} flatShading />
                    </mesh>
                    <mesh position={[0.005, 0, 0]}>
                        <boxGeometry args={[0.046, 0.19, 0.145]} />
                        <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.9} />
                    </mesh>
                    <mesh position={[-0.033, 0.01, 0]} rotation={[0, 0, Math.PI / 4]}>
                        <boxGeometry args={[0.008, 0.055, 0.055]} />
                        <meshStandardMaterial color={PALETTE.brassGold} roughness={0.45} />
                    </mesh>
                </group>

                {/* ============================================================
                    3. LAYERED CREAM BOTANICAL PONCHO & OVERSIZED RUST SCARF
                   ============================================================ */}
                <group ref={rig.ponchoGroup} position={[0, 1.03, 0]}>
                    {/* Main Sculpted Cream Poncho */}
                    <mesh geometry={ponchoMainGeo} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={PALETTE.ponchoCream}
                            roughness={0.82}
                            side={THREE.DoubleSide}
                            flatShading
                        />
                    </mesh>

                    {/* Ochre-Gold Geometric Triangle Border along Poncho Hem */}
                    <mesh position={[0, -0.25, 0]}>
                        <cylinderGeometry args={[0.5, 0.56, 0.075, 14, 1, true]} />
                        <meshStandardMaterial
                            color={PALETTE.ponchoPattern}
                            roughness={0.8}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Split Front V-Neck Lapel Trim */}
                    <mesh position={[-0.085, 0.02, 0.27]} rotation={[-0.32, 0.15, 0.12]}>
                        <boxGeometry args={[0.09, 0.54, 0.025]} />
                        <meshStandardMaterial color={PALETTE.ponchoWarm} roughness={0.82} />
                    </mesh>
                    <mesh position={[0.085, 0.02, 0.27]} rotation={[-0.32, -0.15, -0.12]}>
                        <boxGeometry args={[0.09, 0.54, 0.025]} />
                        <meshStandardMaterial color={PALETTE.ponchoWarm} roughness={0.82} />
                    </mesh>

                    {/* Botanical Leaf-Sprig Embroidery on Both Poncho Sleeves */}
                    {[-1, 1].map((side) => (
                        <group
                            key={`leaf-motif-${side}`}
                            position={[side * 0.36, -0.04, 0.11]}
                            rotation={[0.2, side * 0.9, -side * 0.44]}
                        >
                            <mesh>
                                <boxGeometry args={[0.016, 0.26, 0.012]} />
                                <meshStandardMaterial color={PALETTE.ponchoPattern} />
                            </mesh>
                            {[-0.07, 0.0, 0.07].map((ly, idx) => (
                                <React.Fragment key={idx}>
                                    <mesh
                                        position={[0.038, ly, 0]}
                                        rotation={[0, 0, -0.6]}
                                        scale={[1, 0.45, 0.2]}
                                    >
                                        <octahedronGeometry args={[0.048, 0]} />
                                        <meshStandardMaterial color={PALETTE.ponchoPattern} />
                                    </mesh>
                                    <mesh
                                        position={[-0.038, ly - 0.02, 0]}
                                        rotation={[0, 0, 0.6]}
                                        scale={[1, 0.45, 0.2]}
                                    >
                                        <octahedronGeometry args={[0.048, 0]} />
                                        <meshStandardMaterial color={PALETTE.ponchoPattern} />
                                    </mesh>
                                </React.Fragment>
                            ))}
                        </group>
                    ))}

                    {/* Cream Inner Hood */}
                    <mesh position={[0, 0.29, -0.06]} rotation={[0.28, 0, 0]} castShadow>
                        <torusGeometry args={[0.21, 0.078, 8, 14]} />
                        <meshStandardMaterial color={PALETTE.ponchoWarm} roughness={0.84} flatShading />
                    </mesh>

                    {/* Oversized Terracotta-Rust Scarf with Layered Folds */}
                    <group position={[0, 0.34, 0.01]}>
                        <mesh rotation={[Math.PI / 2 + 0.12, 0, 0]} castShadow>
                            <torusGeometry args={[0.205, 0.098, 9, 16]} />
                            <meshStandardMaterial color={PALETTE.scarfRust} roughness={0.78} flatShading />
                        </mesh>
                        <mesh
                            position={[0, 0.055, -0.02]}
                            rotation={[Math.PI / 2 + 0.05, 0, 0]}
                            castShadow
                        >
                            <torusGeometry args={[0.19, 0.08, 8, 14]} />
                            <meshStandardMaterial color={PALETTE.scarfDeep} roughness={0.8} flatShading />
                        </mesh>

                        {/* Trailing Scarf Tails with Golden Leaf Detail */}
                        <group ref={rig.scarfTailGroup} position={[0.14, -0.06, -0.18]}>
                            <mesh
                                position={[0.04, -0.25, -0.05]}
                                rotation={[0.22, 0.1, -0.15]}
                                castShadow
                            >
                                <boxGeometry args={[0.145, 0.5, 0.035]} />
                                <meshStandardMaterial color={PALETTE.scarfRust} roughness={0.8} flatShading />
                            </mesh>
                            <mesh
                                position={[-0.08, -0.21, -0.07]}
                                rotation={[0.28, -0.1, 0.12]}
                                castShadow
                            >
                                <boxGeometry args={[0.125, 0.4, 0.03]} />
                                <meshStandardMaterial color={PALETTE.scarfDeep} roughness={0.8} flatShading />
                            </mesh>
                        </group>
                    </group>
                </group>

                {/* ============================================================
                    4. ARMS, SLEEVES & FINGERLESS TRAVEL GLOVES
                   ============================================================ */}
                <group ref={rig.leftArmGroup} position={[-0.29, 1.24, 0]}>
                    <mesh position={[-0.05, -0.19, 0]} rotation={[0, 0, 0.18]} castShadow>
                        <cylinderGeometry args={[0.065, 0.058, 0.34, 8]} />
                        <meshStandardMaterial color={PALETTE.tunicDark} roughness={0.85} />
                    </mesh>
                    <mesh position={[-0.09, -0.37, 0.01]} castShadow>
                        <boxGeometry args={[0.075, 0.095, 0.085]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.8} />
                    </mesh>
                    <mesh position={[-0.09, -0.42, 0.015]} castShadow>
                        <sphereGeometry args={[0.042, 7, 7]} />
                        <meshStandardMaterial color={PALETTE.skin} roughness={0.75} />
                    </mesh>
                </group>

                <group ref={rig.rightArmGroup} position={[0.29, 1.24, 0]}>
                    <mesh position={[0.05, -0.19, 0]} rotation={[0, 0, -0.18]} castShadow>
                        <cylinderGeometry args={[0.065, 0.058, 0.34, 8]} />
                        <meshStandardMaterial color={PALETTE.tunicDark} roughness={0.85} />
                    </mesh>
                    <mesh position={[0.09, -0.37, 0.01]} castShadow>
                        <boxGeometry args={[0.075, 0.095, 0.085]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.8} />
                    </mesh>
                    <mesh position={[0.09, -0.42, 0.015]} castShadow>
                        <sphereGeometry args={[0.042, 7, 7]} />
                        <meshStandardMaterial color={PALETTE.skin} roughness={0.75} />
                    </mesh>
                </group>

                {/* ============================================================
                    5. EXPLORER BACKPACK, BEDROLL, POLAROID, PETAL BOTTLE & LANTERN
                   ============================================================ */}
                <group ref={rig.backpackGroup} position={[0, 1.07, -0.25]}>
                    {/* Structured Leather Rucksack */}
                    <mesh position={[0, -0.02, -0.07]} castShadow receiveShadow>
                        <boxGeometry args={[0.38, 0.44, 0.24]} />
                        <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.8} flatShading />
                    </mesh>
                    <mesh position={[0, 0.16, -0.065]} castShadow>
                        <boxGeometry args={[0.4, 0.14, 0.26]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.78} flatShading />
                    </mesh>
                    {[-0.11, 0.11].map((sx, idx) => (
                        <React.Fragment key={`strap-${idx}`}>
                            <mesh position={[sx, 0.01, -0.195]} castShadow>
                                <boxGeometry args={[0.042, 0.42, 0.02]} />
                                <meshStandardMaterial color="#382316" roughness={0.75} />
                            </mesh>
                            <mesh position={[sx, 0.05, -0.208]}>
                                <boxGeometry args={[0.058, 0.058, 0.015]} />
                                <meshStandardMaterial
                                    color={PALETTE.brassGold}
                                    metalness={0.45}
                                    roughness={0.35}
                                />
                            </mesh>
                        </React.Fragment>
                    ))}
                    <mesh position={[0, -0.09, -0.2]} castShadow>
                        <boxGeometry args={[0.26, 0.22, 0.06]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} flatShading />
                    </mesh>
                    <mesh position={[-0.21, -0.08, -0.07]} castShadow>
                        <boxGeometry args={[0.07, 0.2, 0.16]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} flatShading />
                    </mesh>
                    <mesh position={[0.21, -0.08, -0.07]} castShadow>
                        <boxGeometry args={[0.07, 0.2, 0.16]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} flatShading />
                    </mesh>

                    {/* Rolled Top Canvas Bedroll */}
                    <group position={[0, 0.28, -0.06]}>
                        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                            <cylinderGeometry args={[0.088, 0.088, 0.44, 10]} />
                            <meshStandardMaterial color={PALETTE.bedrollTan} roughness={0.86} flatShading />
                        </mesh>
                        {[-0.13, 0.13].map((bx, i) => (
                            <mesh key={i} position={[bx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                <cylinderGeometry args={[0.094, 0.094, 0.038, 10]} />
                                <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.75} />
                            </mesh>
                        ))}
                    </group>

                    {/* Keepsake White Flowers Tucked into Backpack */}
                    <group position={[-0.21, 0.16, -0.05]} rotation={[0.15, 0, 0.35]}>
                        <mesh position={[0, 0.06, 0]}>
                            <cylinderGeometry args={[0.01, 0.012, 0.18, 5]} />
                            <meshStandardMaterial color="#5c7046" />
                        </mesh>
                        {[
                            [0, 0.15, 0],
                            [-0.04, 0.12, 0.03],
                            [0.04, 0.11, -0.02],
                        ].map(([fx, fy, fz], i) => (
                            <group key={i} position={[fx, fy, fz]}>
                                <mesh>
                                    <dodecahedronGeometry args={[0.038, 0]} />
                                    <meshStandardMaterial color={PALETTE.flowerWhite} />
                                </mesh>
                                <mesh position={[0, 0.015, 0]}>
                                    <sphereGeometry args={[0.015, 6, 6]} />
                                    <meshBasicMaterial color={PALETTE.brassGold} />
                                </mesh>
                            </group>
                        ))}
                    </group>

                    {/* Hanging Framed Mountain Sunset Polaroid Charm */}
                    <group position={[0.18, -0.06, -0.2]} rotation={[0.08, -0.2, -0.1]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.11, 0.13, 0.012]} />
                            <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.8} />
                        </mesh>
                        <mesh position={[0, 0.01, -0.008]}>
                            <boxGeometry args={[0.088, 0.088, 0.004]} />
                            <meshBasicMaterial color="#d98a6c" />
                        </mesh>
                        <mesh position={[0, -0.01, -0.011]}>
                            <coneGeometry args={[0.038, 0.045, 4]} />
                            <meshBasicMaterial color="#594157" />
                        </mesh>
                    </group>

                    {/*SIGNATURE MEMORY LANTERN & KEEPSAKE BOTTLE PENDANT */}
                    <group
                        ref={rig.lanternGroup}
                        position={[archetype === 'female' ? 0.22 : -0.22, -0.02, -0.14]}
                    >
                        <mesh position={[0, -0.04, 0]}>
                            <cylinderGeometry args={[0.012, 0.012, 0.08, 6]} />
                            <meshStandardMaterial color={PALETTE.brassGold} metalness={0.5} />
                        </mesh>

                        {archetype === 'female' ? (
                            <group position={[0, -0.15, 0]}>
                                <mesh position={[0, 0.085, 0]}>
                                    <cylinderGeometry args={[0.032, 0.042, 0.035, 8]} />
                                    <meshStandardMaterial color={PALETTE.brassGold} metalness={0.5} />
                                </mesh>
                                <mesh>
                                    <sphereGeometry args={[0.09, 12, 12]} />
                                    <meshStandardMaterial
                                        color="#ffe3a8"
                                        emissive="#ffae42"
                                        emissiveIntensity={0.95}
                                        transparent
                                        opacity={0.74}
                                        roughness={0.15}
                                    />
                                </mesh>
                                <mesh>
                                    <dodecahedronGeometry args={[0.048, 0]} />
                                    <meshBasicMaterial color={PALETTE.lanternCore} />
                                </mesh>
                                <mesh position={[0, -0.085, 0]}>
                                    <cylinderGeometry args={[0.045, 0.03, 0.025, 8]} />
                                    <meshStandardMaterial color={PALETTE.brassGold} metalness={0.5} />
                                </mesh>
                            </group>
                        ) : (
                            <group position={[0, -0.16, 0]}>
                                <mesh position={[0, 0.09, 0]}>
                                    <coneGeometry args={[0.085, 0.065, 6]} />
                                    <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.6} flatShading />
                                </mesh>
                                <mesh>
                                    <cylinderGeometry args={[0.068, 0.058, 0.13, 6]} />
                                    <meshStandardMaterial
                                        color={PALETTE.lanternCore}
                                        emissive="#ffaa33"
                                        emissiveIntensity={1.75}
                                        roughness={0.2}
                                        flatShading
                                    />
                                </mesh>
                                <mesh position={[0, -0.075, 0]}>
                                    <cylinderGeometry args={[0.068, 0.05, 0.03, 6]} />
                                    <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.6} flatShading />
                                </mesh>
                                {/* Corked Keepsake Glass Bottle with Glowing Pink Petal */}
                                <group position={[-0.085, -0.085, 0.03]} rotation={[0, 0, 0.15]}>
                                    <mesh>
                                        <cylinderGeometry args={[0.026, 0.028, 0.088, 8]} />
                                        <meshStandardMaterial
                                            color="#ffd4dc"
                                            emissive="#ff8da1"
                                            emissiveIntensity={0.85}
                                            transparent
                                            opacity={0.82}
                                        />
                                    </mesh>
                                    <mesh position={[0, 0.052, 0]}>
                                        <cylinderGeometry args={[0.016, 0.018, 0.026, 6]} />
                                        <meshStandardMaterial color={PALETTE.bedrollTan} />
                                    </mesh>
                                </group>
                            </group>
                        )}

                        <pointLight
                            ref={rig.lanternLight}
                            position={[0, -0.15, -0.05]}
                            color={PALETTE.lanternGlow}
                            intensity={1.15}
                            distance={4.5}
                            decay={2}
                        />
                    </group>
                </group>

                {/* ============================================================
                    6. EXPRESSIVE HEAD, FACETED HAIR LOCKS & EXPLORER GOGGLES
                   ============================================================ */}
                <group ref={rig.headGroup} position={[0, 1.56, 0.02]}>
                    <mesh castShadow>
                        <sphereGeometry args={[0.195, 14, 14]} />
                        <meshStandardMaterial color={PALETTE.skin} roughness={0.72} />
                    </mesh>

                    {[-0.072, 0.072].map((ex, i) => (
                        <React.Fragment key={`eye-${i}`}>
                            <mesh position={[ex, -0.01, 0.175]}>
                                <sphereGeometry args={[0.027, 8, 8]} />
                                <meshBasicMaterial color="#2b1d19" />
                            </mesh>
                            <mesh position={[ex + 0.008, 0.003, 0.196]}>
                                <sphereGeometry args={[0.009, 6, 6]} />
                                <meshBasicMaterial color="#fff8eb" />
                            </mesh>
                            <mesh
                                position={[ex * 1.35, -0.05, 0.162]}
                                scale={[1.2, 0.65, 0.4]}
                            >
                                <sphereGeometry args={[0.024, 7, 7]} />
                                <meshBasicMaterial
                                    color={PALETTE.skinBlush}
                                    transparent
                                    opacity={0.65}
                                />
                            </mesh>
                        </React.Fragment>
                    ))}

                    {archetype === 'male' && (
                        <mesh position={[0.115, -0.055, 0.148]} rotation={[0, 0.55, 0.25]}>
                            <boxGeometry args={[0.048, 0.022, 0.008]} />
                            <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.85} />
                        </mesh>
                    )}

                    {/* Tousled Dark Brown Hair Base & Warm Highlighted Locks */}
                    <mesh position={[0, 0.045, -0.015]} castShadow>
                        <icosahedronGeometry args={[0.214, 2]} />
                        <meshStandardMaterial color={PALETTE.hairDark} roughness={0.84} flatShading />
                    </mesh>
                    {[
                        { pos: [0, 0.12, 0.15], rot: [0.45, 0, 0], scale: [0.9, 1.15, 0.8] },
                        { pos: [-0.09, 0.1, 0.14], rot: [0.4, 0.2, 0.35], scale: [0.85, 1.1, 0.8] },
                        { pos: [0.09, 0.1, 0.14], rot: [0.4, -0.2, -0.35], scale: [0.85, 1.1, 0.8] },
                        { pos: [-0.17, 0.01, 0.06], rot: [0.1, 0, 0.45], scale: [0.8, 1.35, 0.8] },
                        { pos: [0.17, 0.01, 0.06], rot: [0.1, 0, -0.45], scale: [0.8, 1.35, 0.8] },
                        { pos: [-0.14, 0.06, -0.14], rot: [-0.4, 0, 0.4], scale: [0.9, 1.2, 0.9] },
                        { pos: [0.14, 0.06, -0.14], rot: [-0.4, 0, -0.4], scale: [0.9, 1.2, 0.9] },
                        { pos: [0, 0.04, -0.18], rot: [-0.55, 0, 0], scale: [1.1, 1.25, 0.9] },
                    ].map((strand, idx) => (
                        <mesh
                            key={`strand-${idx}`}
                            position={strand.pos as [number, number, number]}
                            rotation={strand.rot as [number, number, number]}
                            scale={strand.scale as [number, number, number]}
                            castShadow
                        >
                            <coneGeometry args={[0.078, 0.22, 5]} />
                            <meshStandardMaterial
                                color={idx % 2 === 0 ? PALETTE.hairDark : PALETTE.hairHighlight}
                                roughness={0.82}
                                flatShading
                            />
                        </mesh>
                    ))}

                    {archetype === 'female' ? (
                        <group>
                            <mesh position={[0, 0.04, 0]}>
                                <torusGeometry args={[0.215, 0.022, 8, 20, Math.PI]} />
                                <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.6} />
                            </mesh>
                            {[-0.21, 0.21].map((hx, idx) => (
                                <group
                                    key={`earcup-${idx}`}
                                    position={[hx, 0.0, 0.01]}
                                    rotation={[0, 0, Math.PI / 2]}
                                >
                                    <mesh castShadow>
                                        <cylinderGeometry args={[0.068, 0.068, 0.048, 12]} />
                                        <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.55} />
                                    </mesh>
                                    <mesh position={[0, idx === 0 ? 0.026 : -0.026, 0]}>
                                        <cylinderGeometry args={[0.036, 0.036, 0.008, 8]} />
                                        <meshStandardMaterial color={PALETTE.ponchoPattern} roughness={0.4} />
                                    </mesh>
                                </group>
                            ))}
                            <group position={[0.14, 0.02, -0.17]} rotation={[0.2, 0.5, -0.3]}>
                                <mesh>
                                    <dodecahedronGeometry args={[0.035, 0]} />
                                    <meshStandardMaterial color={PALETTE.flowerWhite} />
                                </mesh>
                                <mesh position={[-0.04, -0.08, -0.02]} rotation={[0, 0, -0.35]}>
                                    <boxGeometry args={[0.028, 0.18, 0.01]} />
                                    <meshStandardMaterial color={PALETTE.scarfRust} />
                                </mesh>
                                <mesh position={[0.04, -0.09, -0.02]} rotation={[0, 0, 0.28]}>
                                    <boxGeometry args={[0.028, 0.18, 0.01]} />
                                    <meshStandardMaterial color={PALETTE.scarfRust} />
                                </mesh>
                            </group>
                        </group>
                    ) : (
                        /* Explorer Goggles Resting on Forehead */
                        <group position={[0, 0.13, 0.03]} rotation={[-0.42, 0, 0]}>
                            <mesh rotation={[Math.PI / 2, 0, 0]}>
                                <torusGeometry args={[0.205, 0.022, 7, 18]} />
                                <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.8} />
                            </mesh>
                            {[-0.082, 0.082].map((gx, i) => (
                                <group
                                    key={`goggle-${i}`}
                                    position={[gx, 0.01, 0.185]}
                                    rotation={[0, i === 0 ? -0.22 : 0.22, 0]}
                                >
                                    <mesh castShadow>
                                        <boxGeometry args={[0.105, 0.072, 0.042]} />
                                        <meshStandardMaterial
                                            color={PALETTE.brassGold}
                                            metalness={0.45}
                                            roughness={0.35}
                                        />
                                    </mesh>
                                    <mesh position={[0, 0, 0.016]}>
                                        <boxGeometry args={[0.078, 0.048, 0.018]} />
                                        <meshStandardMaterial
                                            color="#e08338"
                                            emissive="#a84c14"
                                            emissiveIntensity={0.4}
                                            roughness={0.2}
                                        />
                                    </mesh>
                                </group>
                            ))}
                        </group>
                    )}
                </group>
            </group>
        );
    }
);