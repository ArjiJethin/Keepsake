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
    skin: '#f2cbb2',
    skinBlush: '#e39e87',
    hairDark: '#362724',
    hairHighlight: '#4f3934',
    scarfRust: '#a84b3a',
    scarfDeep: '#873829',
    ponchoCream: '#efe3d1',
    ponchoWarm: '#e2d0b8',
    ponchoPattern: '#c69258',
    innerSage: '#6e7565',
    tunicDark: '#3b2e2a',
    pantsDark: '#382c28',
    pantsCuff: '#4d3d37',
    leatherWarm: '#6e4730',
    leatherDark: '#4a3020',
    bedrollTan: '#b89f82',
    brassGold: '#dfa857',
    lanternGlow: '#ffd478',
    lanternCore: '#fff6de',
    flowerWhite: '#fbf5ea',
    petalPink: '#f29ca3',
};

export const ExplorerModelMesh: React.FC<ExplorerModelMeshProps> = React.memo(
    ({ archetype, rig }) => {
        // Custom sculpted poncho cape geometry with flared hem and sleeve drapes
        const ponchoMainGeo = useMemo(() => {
            const geo = new THREE.CylinderGeometry(0.23, 0.56, 0.66, 12, 3, true);
            const pos = geo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                // Flare wider at the shoulders/arms (X) and slightly tapered front-to-back (Z)
                const bottomFactor = (0.33 - y) / 0.66;
                const wave = Math.sin(Math.atan2(x, z) * 6) * 0.025 * bottomFactor;
                pos.setXYZ(
                    i,
                    x * (1.12 + bottomFactor * 0.14) + wave,
                    y,
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
                {/* LEFT LEG */}
                <group ref={rig.leftLegGroup} position={[-0.135, 0.74, 0]}>
                    {/* Wide Dark Chocolate Culotte Trouser Leg */}
                    <mesh position={[0, -0.17, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.13, 0.165, 0.36, 9]} />
                        <meshStandardMaterial color={PALETTE.pantsDark} roughness={0.86} />
                    </mesh>
                    {/* Turned-up Trouser Cuff */}
                    <mesh position={[0, -0.34, 0]} castShadow>
                        <cylinderGeometry args={[0.155, 0.145, 0.065, 9]} />
                        <meshStandardMaterial color={PALETTE.pantsCuff} roughness={0.84} />
                    </mesh>
                    {/* Lower Shin & Cream Ankle Sock */}
                    <mesh position={[0, -0.43, 0]} castShadow>
                        <cylinderGeometry args={[0.068, 0.062, 0.16, 8]} />
                        <meshStandardMaterial color={PALETTE.skin} roughness={0.75} />
                    </mesh>
                    <mesh position={[0, -0.49, 0]} castShadow>
                        <cylinderGeometry args={[0.078, 0.075, 0.09, 8]} />
                        <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.85} />
                    </mesh>
                    {/* Rugged Laced Explorer Boot */}
                    <group position={[0, -0.61, 0.025]}>
                        {/* Boot Ankle Shaft */}
                        <mesh position={[0, 0.07, -0.015]} castShadow>
                            <cylinderGeometry args={[0.088, 0.095, 0.15, 8]} />
                            <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.8} />
                        </mesh>
                        {/* Boot Main Vamp & Rounded Toe */}
                        <mesh position={[0, -0.01, 0.02]} castShadow>
                            <boxGeometry args={[0.165, 0.12, 0.25]} />
                            <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.8} />
                        </mesh>
                        <mesh position={[0, -0.015, 0.12]} castShadow>
                            <sphereGeometry args={[0.082, 8, 8]} />
                            <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} />
                        </mesh>
                        {/* Thick Cream/Dark Lugged Sole */}
                        <mesh position={[0, -0.075, 0.025]} castShadow>
                            <boxGeometry args={[0.18, 0.042, 0.28]} />
                            <meshStandardMaterial
                                color={archetype === 'female' ? '#d9c5ad' : '#2e221d'}
                                roughness={0.9}
                            />
                        </mesh>
                        {/* Brass Boot Laces Detail */}
                        <mesh position={[0, 0.05, 0.075]} rotation={[0.4, 0, 0]}>
                            <boxGeometry args={[0.09, 0.08, 0.02]} />
                            <meshStandardMaterial color={PALETTE.brassGold} roughness={0.5} />
                        </mesh>
                    </group>
                </group>

                {/* RIGHT LEG */}
                <group ref={rig.rightLegGroup} position={[0.135, 0.74, 0]}>
                    <mesh position={[0, -0.17, 0]} castShadow receiveShadow>
                        <cylinderGeometry args={[0.13, 0.165, 0.36, 9]} />
                        <meshStandardMaterial color={PALETTE.pantsDark} roughness={0.86} />
                    </mesh>
                    <mesh position={[0, -0.34, 0]} castShadow>
                        <cylinderGeometry args={[0.155, 0.145, 0.065, 9]} />
                        <meshStandardMaterial color={PALETTE.pantsCuff} roughness={0.84} />
                    </mesh>
                    <mesh position={[0, -0.43, 0]} castShadow>
                        <cylinderGeometry args={[0.068, 0.062, 0.16, 8]} />
                        <meshStandardMaterial color={PALETTE.skin} roughness={0.75} />
                    </mesh>
                    <mesh position={[0, -0.49, 0]} castShadow>
                        <cylinderGeometry args={[0.078, 0.075, 0.09, 8]} />
                        <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.85} />
                    </mesh>
                    <group position={[0, -0.61, 0.025]}>
                        <mesh position={[0, 0.07, -0.015]} castShadow>
                            <cylinderGeometry args={[0.088, 0.095, 0.15, 8]} />
                            <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.8} />
                        </mesh>
                        <mesh position={[0, -0.01, 0.02]} castShadow>
                            <boxGeometry args={[0.165, 0.12, 0.25]} />
                            <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.8} />
                        </mesh>
                        <mesh position={[0, -0.015, 0.12]} castShadow>
                            <sphereGeometry args={[0.082, 8, 8]} />
                            <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} />
                        </mesh>
                        <mesh position={[0, -0.075, 0.025]} castShadow>
                            <boxGeometry args={[0.18, 0.042, 0.28]} />
                            <meshStandardMaterial
                                color={archetype === 'female' ? '#d9c5ad' : '#2e221d'}
                                roughness={0.9}
                            />
                        </mesh>
                        <mesh position={[0, 0.05, 0.075]} rotation={[0.4, 0, 0]}>
                            <boxGeometry args={[0.09, 0.08, 0.02]} />
                            <meshStandardMaterial color={PALETTE.brassGold} roughness={0.5} />
                        </mesh>
                    </group>
                </group>

                {/* ============================================================
            2. TORSO, INNER TRAVEL TUNIC, BELT, SASH & MEMORY JOURNAL
           ============================================================ */}
                {/* Lower Tunic Skirt / Pelvis */}
                <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.22, 0.27, 0.28, 10]} />
                    <meshStandardMaterial color={PALETTE.tunicDark} roughness={0.85} />
                </mesh>
                {/* Upper Chest & Sage Inner Shirt */}
                <mesh position={[0, 1.06, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.2, 0.22, 0.42, 10]} />
                    <meshStandardMaterial color={PALETTE.innerSage} roughness={0.82} />
                </mesh>
                {/* Leather Waist Belt & Brass Buckle */}
                <mesh position={[0, 0.84, 0]} castShadow>
                    <cylinderGeometry args={[0.235, 0.235, 0.06, 10]} />
                    <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.75} />
                </mesh>
                <mesh position={[0, 0.84, 0.235]}>
                    <boxGeometry args={[0.07, 0.075, 0.025]} />
                    <meshStandardMaterial color={PALETTE.brassGold} metalness={0.4} roughness={0.4} />
                </mesh>
                {/* Hanging Rust Waist Ribbon & Side Tassels */}
                <mesh position={[0.12, 0.66, 0.19]} rotation={[0.05, 0, -0.08]} castShadow>
                    <boxGeometry args={[0.055, 0.34, 0.02]} />
                    <meshStandardMaterial color={PALETTE.scarfRust} roughness={0.8} />
                </mesh>
                {/* Leather-Bound Memory Journal Holstered at Hip */}
                <group position={[-0.24, 0.78, 0.08]} rotation={[0.12, 0.25, 0.18]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.06, 0.21, 0.16]} />
                        <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.78} />
                    </mesh>
                    <mesh position={[0.005, 0, 0]}>
                        <boxGeometry args={[0.045, 0.19, 0.145]} />
                        <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.9} />
                    </mesh>
                    {/* Gold Leaf Emblem on Journal Cover */}
                    <mesh position={[-0.032, 0.01, 0]} rotation={[0, 0, Math.PI / 4]}>
                        <boxGeometry args={[0.008, 0.055, 0.055]} />
                        <meshStandardMaterial color={PALETTE.brassGold} roughness={0.45} />
                    </mesh>
                </group>

                {/* ============================================================
            3. LAYERED CREAM BOTANICAL PONCHO & OVERSIZED RUST SCARF
           ============================================================ */}
                <group ref={rig.ponchoGroup} position={[0, 1.03, 0]}>
                    {/* Main Cream Poncho Body */}
                    <mesh geometry={ponchoMainGeo} castShadow receiveShadow>
                        <meshStandardMaterial
                            color={PALETTE.ponchoCream}
                            roughness={0.82}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Ochre-Gold Geometric Trim Band near Poncho Hem */}
                    <mesh position={[0, -0.25, 0]}>
                        <cylinderGeometry args={[0.49, 0.545, 0.075, 12, 1, true]} />
                        <meshStandardMaterial
                            color={PALETTE.ponchoPattern}
                            roughness={0.8}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Front Split V-Opening Lapels */}
                    <mesh position={[-0.08, 0.02, 0.27]} rotation={[-0.32, 0.15, 0.12]}>
                        <boxGeometry args={[0.09, 0.54, 0.025]} />
                        <meshStandardMaterial color={PALETTE.ponchoWarm} roughness={0.82} />
                    </mesh>
                    <mesh position={[0.08, 0.02, 0.27]} rotation={[-0.32, -0.15, -0.12]}>
                        <boxGeometry args={[0.09, 0.54, 0.025]} />
                        <meshStandardMaterial color={PALETTE.ponchoWarm} roughness={0.82} />
                    </mesh>

                    {/* Botanical Leaf Motifs on Left & Right Poncho Shoulders */}
                    {[-1, 1].map((side) => (
                        <group
                            key={`leaf-motif-${side}`}
                            position={[side * 0.34, -0.05, 0.12]}
                            rotation={[0.2, side * 0.9, -side * 0.42]}
                        >
                            <mesh>
                                <boxGeometry args={[0.015, 0.24, 0.012]} />
                                <meshStandardMaterial color={PALETTE.ponchoPattern} />
                            </mesh>
                            {[-0.06, 0.0, 0.06].map((ly, idx) => (
                                <React.Fragment key={idx}>
                                    <mesh
                                        position={[0.035, ly, 0]}
                                        rotation={[0, 0, -0.6]}
                                        scale={[1, 0.45, 0.2]}
                                    >
                                        <octahedronGeometry args={[0.045, 0]} />
                                        <meshStandardMaterial color={PALETTE.ponchoPattern} />
                                    </mesh>
                                    <mesh
                                        position={[-0.035, ly - 0.02, 0]}
                                        rotation={[0, 0, 0.6]}
                                        scale={[1, 0.45, 0.2]}
                                    >
                                        <octahedronGeometry args={[0.045, 0]} />
                                        <meshStandardMaterial color={PALETTE.ponchoPattern} />
                                    </mesh>
                                </React.Fragment>
                            ))}
                        </group>
                    ))}

                    {/* Cream Inner Hood resting under the Rust Scarf */}
                    <mesh position={[0, 0.29, -0.06]} rotation={[0.28, 0, 0]} castShadow>
                        <torusGeometry args={[0.21, 0.075, 8, 14]} />
                        <meshStandardMaterial color={PALETTE.ponchoWarm} roughness={0.84} />
                    </mesh>

                    {/* Oversized Voluminous Rust-Red Scarf (Signature Element) */}
                    <group position={[0, 0.34, 0.01]}>
                        <mesh rotation={[Math.PI / 2 + 0.12, 0, 0]} castShadow>
                            <torusGeometry args={[0.2, 0.095, 9, 16]} />
                            <meshStandardMaterial color={PALETTE.scarfRust} roughness={0.78} />
                        </mesh>
                        <mesh
                            position={[0, 0.05, -0.02]}
                            rotation={[Math.PI / 2 + 0.05, 0, 0]}
                            castShadow
                        >
                            <torusGeometry args={[0.185, 0.078, 8, 14]} />
                            <meshStandardMaterial color={PALETTE.scarfDeep} roughness={0.8} />
                        </mesh>

                        {/* Trailing Rust Scarf Tails with Sway Physics */}
                        <group ref={rig.scarfTailGroup} position={[0.14, -0.06, -0.18]}>
                            <mesh
                                position={[0.04, -0.24, -0.05]}
                                rotation={[0.22, 0.1, -0.15]}
                                castShadow
                            >
                                <boxGeometry args={[0.14, 0.48, 0.035]} />
                                <meshStandardMaterial color={PALETTE.scarfRust} roughness={0.8} />
                            </mesh>
                            <mesh
                                position={[-0.08, -0.2, -0.07]}
                                rotation={[0.28, -0.1, 0.12]}
                                castShadow
                            >
                                <boxGeometry args={[0.12, 0.38, 0.03]} />
                                <meshStandardMaterial color={PALETTE.scarfDeep} roughness={0.8} />
                            </mesh>
                        </group>
                    </group>
                </group>

                {/* ============================================================
            4. ARMS, SLEEVES & FINGERLESS TRAVEL GLOVES
           ============================================================ */}
                {/* LEFT ARM */}
                <group ref={rig.leftArmGroup} position={[-0.29, 1.24, 0]}>
                    <mesh position={[-0.05, -0.19, 0]} rotation={[0, 0, 0.18]} castShadow>
                        <cylinderGeometry args={[0.065, 0.058, 0.34, 8]} />
                        <meshStandardMaterial color={PALETTE.tunicDark} roughness={0.85} />
                    </mesh>
                    {/* Fingerless Brown Glove & Warm Hand */}
                    <mesh position={[-0.09, -0.37, 0.01]} castShadow>
                        <boxGeometry args={[0.075, 0.095, 0.085]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.8} />
                    </mesh>
                    <mesh position={[-0.09, -0.42, 0.015]} castShadow>
                        <sphereGeometry args={[0.042, 7, 7]} />
                        <meshStandardMaterial color={PALETTE.skin} roughness={0.75} />
                    </mesh>
                </group>

                {/* RIGHT ARM */}
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
            5. DETAILED EXPLORER BACKPACK, BEDROLL, CHARMS & MEMORY LANTERN
           ============================================================ */}
                <group ref={rig.backpackGroup} position={[0, 1.07, -0.25]}>
                    {/* Main Structured Leather Rucksack Body */}
                    <mesh position={[0, -0.02, -0.07]} castShadow receiveShadow>
                        <boxGeometry args={[0.38, 0.44, 0.24]} />
                        <meshStandardMaterial color={PALETTE.leatherWarm} roughness={0.8} />
                    </mesh>
                    {/* Top Flap with Buckle Straps */}
                    <mesh position={[0, 0.16, -0.065]} castShadow>
                        <boxGeometry args={[0.4, 0.14, 0.26]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.78} />
                    </mesh>
                    {/* Dual Vertical Leather Straps & Brass Buckles */}
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
                    {/* Back Pocket & Side Pouches */}
                    <mesh position={[0, -0.09, -0.2]} castShadow>
                        <boxGeometry args={[0.26, 0.22, 0.06]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} />
                    </mesh>
                    <mesh position={[-0.21, -0.08, -0.07]} castShadow>
                        <boxGeometry args={[0.07, 0.2, 0.16]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} />
                    </mesh>
                    <mesh position={[0.21, -0.08, -0.07]} castShadow>
                        <boxGeometry args={[0.07, 0.2, 0.16]} />
                        <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.82} />
                    </mesh>

                    {/* Rolled Top Canvas Bedroll */}
                    <group position={[0, 0.28, -0.06]}>
                        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                            <cylinderGeometry args={[0.088, 0.088, 0.44, 10]} />
                            <meshStandardMaterial color={PALETTE.bedrollTan} roughness={0.86} />
                        </mesh>
                        {[-0.13, 0.13].map((bx, i) => (
                            <mesh
                                key={i}
                                position={[bx, 0, 0]}
                                rotation={[0, 0, Math.PI / 2]}
                            >
                                <cylinderGeometry args={[0.094, 0.094, 0.038, 10]} />
                                <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.75} />
                            </mesh>
                        ))}
                    </group>

                    {/* Keepsake White Flowers Tucked into Backpack Side */}
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

                    {/* Framed Mountain Sunset Photograph Charm Hanging from Pack */}
                    <group position={[0.18, -0.06, -0.2]} rotation={[0.08, -0.2, -0.1]}>
                        {/* Cream Polaroid Frame */}
                        <mesh castShadow>
                            <boxGeometry args={[0.11, 0.13, 0.012]} />
                            <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.8} />
                        </mesh>
                        {/* Mountain Sunset Photo Print */}
                        <mesh position={[0, 0.01, -0.008]}>
                            <boxGeometry args={[0.088, 0.088, 0.004]} />
                            <meshBasicMaterial color="#d98a6c" />
                        </mesh>
                        {/* Tiny Purple Mountain Silhouette inside Photo */}
                        <mesh position={[0, -0.01, -0.011]}>
                            <coneGeometry args={[0.038, 0.045, 4]} />
                            <meshBasicMaterial color="#594157" />
                        </mesh>
                    </group>

                    {/* SIGNATURE MEMORY LANTERN (Swings on Pendulum Rig & Glows Near Memories) */}
                    <group
                        ref={rig.lanternGroup}
                        position={[
                            archetype === 'female' ? 0.22 : -0.22,
                            -0.02,
                            -0.14,
                        ]}
                    >
                        {/* Brass Hanging Chain */}
                        <mesh position={[0, -0.04, 0]}>
                            <cylinderGeometry args={[0.012, 0.012, 0.08, 6]} />
                            <meshStandardMaterial color={PALETTE.brassGold} metalness={0.5} />
                        </mesh>

                        {archetype === 'female' ? (
                            /* FEMALE EXPLORER: Spherical Glass Floral Orb Lantern (Character Model F.png) */
                            <group position={[0, -0.15, 0]}>
                                {/* Brass Neck Cap */}
                                <mesh position={[0, 0.085, 0]}>
                                    <cylinderGeometry args={[0.032, 0.042, 0.035, 8]} />
                                    <meshStandardMaterial color={PALETTE.brassGold} metalness={0.5} />
                                </mesh>
                                {/* Glowing Outer Glass Orb */}
                                <mesh>
                                    <sphereGeometry args={[0.09, 12, 12]} />
                                    <meshStandardMaterial
                                        color="#ffe3a8"
                                        emissive="#ffae42"
                                        emissiveIntensity={0.85}
                                        transparent
                                        opacity={0.72}
                                        roughness={0.15}
                                    />
                                </mesh>
                                {/* Glowing Inner 5-Petal Keepsake Blossom */}
                                <mesh>
                                    <dodecahedronGeometry args={[0.048, 0]} />
                                    <meshBasicMaterial color={PALETTE.lanternCore} />
                                </mesh>
                                {/* Bottom Brass Base Rim */}
                                <mesh position={[0, -0.085, 0]}>
                                    <cylinderGeometry args={[0.045, 0.03, 0.025, 8]} />
                                    <meshStandardMaterial color={PALETTE.brassGold} metalness={0.5} />
                                </mesh>
                            </group>
                        ) : (
                            /* MALE EXPLORER: Hexagonal Brass & Leaf-Pane Lantern + Blossom Vial (Character Model M.png) */
                            <group position={[0, -0.16, 0]}>
                                {/* Lantern Pitched Roof */}
                                <mesh position={[0, 0.09, 0]}>
                                    <coneGeometry args={[0.085, 0.065, 6]} />
                                    <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.6} />
                                </mesh>
                                {/* Glowing Warm Hexagonal Glass Core */}
                                <mesh>
                                    <cylinderGeometry args={[0.068, 0.058, 0.13, 6]} />
                                    <meshStandardMaterial
                                        color={PALETTE.lanternCore}
                                        emissive="#ffaa33"
                                        emissiveIntensity={1.65}
                                        roughness={0.2}
                                    />
                                </mesh>
                                {/* Lantern Base */}
                                <mesh position={[0, -0.075, 0]}>
                                    <cylinderGeometry args={[0.068, 0.05, 0.03, 6]} />
                                    <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.6} />
                                </mesh>
                                {/* Companion Pink Blossom Glass Vial Charm */}
                                <group position={[-0.08, -0.08, 0.03]} rotation={[0, 0, 0.15]}>
                                    <mesh>
                                        <cylinderGeometry args={[0.026, 0.028, 0.085, 8]} />
                                        <meshStandardMaterial
                                            color="#ffd4dc"
                                            emissive="#ff8da1"
                                            emissiveIntensity={0.75}
                                            transparent
                                            opacity={0.82}
                                        />
                                    </mesh>
                                    <mesh position={[0, 0.05, 0]}>
                                        <cylinderGeometry args={[0.016, 0.018, 0.025, 6]} />
                                        <meshStandardMaterial color={PALETTE.bedrollTan} />
                                    </mesh>
                                </group>
                            </group>
                        )}

                        {/* Dynamic Warm Point Light from the Explorer's Memory Lantern */}
                        <pointLight
                            ref={rig.lanternLight}
                            position={[0, -0.15, -0.05]}
                            color={PALETTE.lanternGlow}
                            intensity={1.1}
                            distance={4.2}
                            decay={2}
                        />
                    </group>
                </group>

                {/* ============================================================
            6. EXPRESSIVE HEAD, FACE, TOUSLED HAIR & ARCHETYPE HEADGEAR
           ============================================================ */}
                <group ref={rig.headGroup} position={[0, 1.56, 0.02]}>
                    {/* Stylized Sculpted Head */}
                    <mesh castShadow>
                        <sphereGeometry args={[0.195, 14, 14]} />
                        <meshStandardMaterial color={PALETTE.skin} roughness={0.72} />
                    </mesh>

                    {/* Warm Rosy Cheek Blush & Expressive Dark Amber Eyes */}
                    {[-0.072, 0.072].map((ex, i) => (
                        <React.Fragment key={`eye-${i}`}>
                            {/* Eye Iris */}
                            <mesh position={[ex, -0.01, 0.175]}>
                                <sphereGeometry args={[0.026, 8, 8]} />
                                <meshBasicMaterial color="#2b1d19" />
                            </mesh>
                            {/* Eye Catchlight Sparkle */}
                            <mesh position={[ex + 0.008, 0.002, 0.196]}>
                                <sphereGeometry args={[0.008, 6, 6]} />
                                <meshBasicMaterial color="#fff8eb" />
                            </mesh>
                            {/* Warm Cheek Blush */}
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

                    {/* Male Explorer Signature Cheek Bandage (Character Model M.png) */}
                    {archetype === 'male' && (
                        <mesh
                            position={[0.115, -0.055, 0.148]}
                            rotation={[0, 0.55, 0.25]}
                        >
                            <boxGeometry args={[0.048, 0.022, 0.008]} />
                            <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.85} />
                        </mesh>
                    )}

                    {/* Layered Tousled Dark Espresso Hair Crown & locks */}
                    <mesh position={[0, 0.045, -0.015]} castShadow>
                        <sphereGeometry args={[0.212, 12, 12]} />
                        <meshStandardMaterial color={PALETTE.hairDark} roughness={0.84} />
                    </mesh>
                    {/* Sculpted Forehead Bangs & Tousled Side Strands */}
                    {[
                        { pos: [0, 0.12, 0.15], rot: [0.45, 0, 0], scale: [0.9, 1.1, 0.8] },
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
                            <coneGeometry args={[0.078, 0.22, 6]} />
                            <meshStandardMaterial
                                color={idx % 2 === 0 ? PALETTE.hairDark : PALETTE.hairHighlight}
                                roughness={0.82}
                            />
                        </mesh>
                    ))}

                    {/* ARCHETYPE SPECIFIC HEADGEAR */}
                    {archetype === 'female' ? (
                        /* FEMALE EXPLORER: Cream Over-Ear Headphones with Leaf Emblem & Back Ribbon Bow (Character Model F.png) */
                        <group>
                            {/* Headphone Arch Band */}
                            <mesh position={[0, 0.04, 0]} rotation={[0, 0, 0]}>
                                <torusGeometry args={[0.215, 0.022, 8, 20, Math.PI]} />
                                <meshStandardMaterial color={PALETTE.ponchoCream} roughness={0.6} />
                            </mesh>
                            {/* Left & Right Earcups with Gold Leaf Emblem */}
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
                            {/* Back-of-Hair Terracotta Ribbon Bow & Flower Pin */}
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
                        /* MALE EXPLORER: Brass & Amber Aviator Explorer Goggles on Forehead (Character Model M.png) */
                        <group position={[0, 0.13, 0.03]} rotation={[-0.42, 0, 0]}>
                            {/* Leather Head Strap */}
                            <mesh rotation={[Math.PI / 2, 0, 0]}>
                                <torusGeometry args={[0.205, 0.022, 7, 18]} />
                                <meshStandardMaterial color={PALETTE.leatherDark} roughness={0.8} />
                            </mesh>
                            {/* Left & Right Brass Goggle Frames + Warm Amber Lenses */}
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
                                            color="#d97b38"
                                            emissive="#9e4716"
                                            emissiveIntensity={0.35}
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