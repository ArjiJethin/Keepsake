// src/scenes/Environment/ChunkedTerrain.tsx
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import {
    ACTIVE_CHUNK_RADIUS,
    BIOME_CONFIGS,
    type BiomeType,
    CHUNK_SEGMENTS,
    CHUNK_SIZE,
    createSculptedFacetedGeometry,
    getBiomeSampleAt,
    getDistanceToNearestPath,
    getGardenTerrainHeight,
    getPathCenterX,
    getSecondaryPathCenterZ,
    getTerrainSlope,
    hash2D,
    seededRandom,
} from './lowPolyUtils';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import {
    collisionManager,
    type SolidCollider,
} from '../../systems/Collision/collisionSystem';
import {
    CozyStorybookCottage,
    ExplorerCampsite,
    MemoryFlowerGLB,
    MonumentalBlossomTreeGLB,
    MonumentalEvergreenTreeGLB,
    RedToriiGate,
    SpottedMushroomCluster,
    StandingStonePillar,
    StoneArchwayGLB,
    WoodenCargoCart,
    WoodenLanternPost,
    WoodenMemoryNoticeboard,
} from '../../components/Environment/WorldAssetLibrary';

const SHARED_GEOMETRIES = {
    trunk: new THREE.CylinderGeometry(0.18, 0.36, 2.2, 6),
    pineTier1: new THREE.ConeGeometry(1.35, 1.9, 7),
    pineTier2: new THREE.ConeGeometry(1.05, 1.65, 7),
    pineTier3: new THREE.ConeGeometry(0.72, 1.35, 7),
    canopyMain: createSculptedFacetedGeometry(1.35, 1, [1.15, 0.9, 1.1], 0.16, 12),
    canopySub: createSculptedFacetedGeometry(0.95, 1, [1.1, 0.85, 1.05], 0.18, 29),
    shrubGeo: createSculptedFacetedGeometry(0.55, 1, [1.25, 0.85, 1.15], 0.18, 63),
    boulder: createSculptedFacetedGeometry(0.85, 1, [1.3, 0.82, 1.15], 0.22, 41, true),
    mossCap: createSculptedFacetedGeometry(0.72, 1, [1.25, 0.35, 1.08], 0.15, 52),
    fallenLog: new THREE.CylinderGeometry(0.22, 0.26, 2.6, 6),
    steppingStone: new THREE.CylinderGeometry(0.68, 0.78, 0.14, 7),
    grassBlade: new THREE.ConeGeometry(0.08, 0.42, 4),
    flowerHead: new THREE.CylinderGeometry(0.16, 0.08, 0.06, 5),
};

interface TreeData {
    id: string;
    x: number;
    y: number;
    z: number;
    scale: number;
    rotY: number;
    species: 'sakura' | 'pine' | 'oak' | 'shrub';
}

interface PropData {
    id: string;
    x: number;
    y: number;
    z: number;
    scale: [number, number, number];
    rot: [number, number, number];
    type: 'rock' | 'mossy_rock' | 'log' | 'stone';
    color: string;
}

interface BiomeLandmarkData {
    id: string;
    kind:
    | 'huge_sakura_glb'
    | 'huge_green_glb'
    | 'cottage_glb'
    | 'campsite_glb'
    | 'cart_glb'
    | 'noticeboard_glb'
    | 'lamp_glb'
    | 'torii_glb'
    | 'rock_arch_glb'
    | 'rock_pillar_glb'
    | 'flower_v1_glb'
    | 'flower_v2_glb'
    | 'mushroom_cluster';
    x: number;
    y: number;
    z: number;
    rotY: number;
    scale: number;
}

interface TerrainChunkProps {
    cx: number;
    cz: number;
    worldSeed: string;
    onChunkReady?: (key: string) => void;
}

const TerrainChunk: React.FC<TerrainChunkProps> = React.memo(
    ({ cx, cz, worldSeed, onChunkReady }) => {
        const chunkKey = `${cx}_${cz}_${worldSeed}`;
        const worldOriginX = cx * CHUNK_SIZE;
        const worldOriginZ = cz * CHUNK_SIZE;

        const grassMeshRef = useRef<THREE.InstancedMesh>(null);
        const flowerMeshRef = useRef<THREE.InstancedMesh>(null);
        const terrainMeshRef = useRef<THREE.Mesh>(null);

        // 1. Biome-Aware Vertex-Colored Low-Poly Terrain Geometry
        const terrainGeo = useMemo(() => {
            const plane = new THREE.PlaneGeometry(
                CHUNK_SIZE,
                CHUNK_SIZE,
                CHUNK_SEGMENTS,
                CHUNK_SEGMENTS
            );
            plane.rotateX(-Math.PI / 2);

            const nonIndexed = plane.toNonIndexed();
            const pos = nonIndexed.attributes.position;
            const colors = new Float32Array(pos.count * 3);

            const cBaseA = new THREE.Color();
            const cSunA = new THREE.Color();
            const cShadA = new THREE.Color();
            const cPathA = new THREE.Color();

            const cBaseB = new THREE.Color();
            const cSunB = new THREE.Color();
            const cShadB = new THREE.Color();
            const cPathB = new THREE.Color();

            const tempA = new THREE.Color();
            const tempB = new THREE.Color();

            for (let i = 0; i < pos.count; i++) {
                const lx = pos.getX(i);
                const lz = pos.getZ(i);
                const wx = lx + worldOriginX;
                const wz = lz + worldOriginZ;

                const wy = getGardenTerrainHeight(wx, wz);
                pos.setY(i, wy);

                const biomeSample = getBiomeSampleAt(wx, wz);
                const cfgA = BIOME_CONFIGS[biomeSample.primary];
                const cfgB = BIOME_CONFIGS[biomeSample.secondary];

                cBaseA.set(cfgA.baseColor);
                cSunA.set(cfgA.sunlitColor);
                cShadA.set(cfgA.shadowColor);
                cPathA.set(cfgA.pathColor);

                cBaseB.set(cfgB.baseColor);
                cSunB.set(cfgB.sunlitColor);
                cShadB.set(cfgB.shadowColor);
                cPathB.set(cfgB.pathColor);

                const sunBlend = THREE.MathUtils.clamp(
                    0.5 + wy * 0.09 + Math.sin(wx * 0.08 - wz * 0.06) * 0.22,
                    0,
                    1
                );

                tempA.copy(cBaseA).lerp(cSunA, sunBlend * 0.78);
                tempB.copy(cBaseB).lerp(cSunB, sunBlend * 0.78);

                if (wy < -0.25) {
                    const shadowStrength = Math.min(Math.abs(wy + 0.25) * 0.4, 0.55);
                    tempA.lerp(cShadA, shadowStrength);
                    tempB.lerp(cShadB, shadowStrength);
                }

                // Smoothly blend between neighboring biome palettes
                tempA.lerp(tempB, biomeSample.blend);
                cPathA.lerp(cPathB, biomeSample.blend);

                // Highlight natural clearings slightly
                if (biomeSample.clearingFactor > 0.05) {
                    tempA.lerp(cSunA, biomeSample.clearingFactor * 0.24);
                }

                const distToPath = getDistanceToNearestPath(wx, wz);
                if (distToPath < 2.35) {
                    tempA.lerp(cPathA, (1 - distToPath / 2.35) * 0.52);
                }

                colors[i * 3] = tempA.r;
                colors[i * 3 + 1] = tempA.g;
                colors[i * 3 + 2] = tempA.b;
            }

            nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            nonIndexed.computeVertexNormals();

            return nonIndexed;
        }, [worldOriginX, worldOriginZ, worldSeed]);

        // 2. Deterministic Biome-Composed Landmarks, Vegetation, Paths & Colliders
        const {
            trees,
            propsList,
            biomeLandmarks,
            grassTransforms,
            flowerTransforms,
            colliders,
        } = useMemo(() => {
            const generatedTrees: TreeData[] = [];
            const generatedProps: PropData[] = [];
            const generatedLandmarks: BiomeLandmarkData[] = [];
            const generatedColliders: SolidCollider[] = [];
            const grassMatrices: THREE.Matrix4[] = [];
            const flowerMatrices: THREE.Matrix4[] = [];

            // Track occupied [wx, wz, radius] to guarantee zero overlapping props
            const occupiedCircles: Array<{ x: number; z: number; r: number }> = [];

            const isPositionFree = (
                wx: number,
                wz: number,
                radius: number,
                minPathClearance = 2.8
            ): boolean => {
                // Keep player spawn point (0, 7.5) unobstructed
                if (Math.hypot(wx, wz - 7.5) < 4.5 + radius) return false;
                // Keep central Sanctuary hero landmarks unobstructed in chunk (0,0)
                if (Math.hypot(wx, wz + 2.0) < 15.5) return false;
                // Keep winding trails clear
                if (getDistanceToNearestPath(wx, wz) < minPathClearance + radius * 0.5) {
                    return false;
                }
                // Prevent placing structures or trees on steep cliffs
                if (getTerrainSlope(wx, wz) > 0.28) return false;

                for (let i = 0; i < occupiedCircles.length; i++) {
                    const oc = occupiedCircles[i];
                    if (Math.hypot(wx - oc.x, wz - oc.z) < radius + oc.r + 0.6) {
                        return false;
                    }
                }
                return true;
            };

            const registerOccupied = (wx: number, wz: number, r: number) => {
                occupiedCircles.push({ x: wx, z: wz, r });
            };

            const dummy = new THREE.Object3D();

            // A. Winding Path Stepping Stones (Main N-S Trail + Cross E-W Trail)
            const zStart = worldOriginZ - CHUNK_SIZE / 2;
            const zEnd = worldOriginZ + CHUNK_SIZE / 2;
            const xStart = worldOriginX - CHUNK_SIZE / 2;
            const xEnd = worldOriginX + CHUNK_SIZE / 2;
            const stepSpacing = 1.75;

            const firstZIdx = Math.ceil(zStart / stepSpacing);
            const lastZIdx = Math.floor(zEnd / stepSpacing);
            for (let sIdx = firstZIdx; sIdx <= lastZIdx; sIdx++) {
                const wz = sIdx * stepSpacing;
                const pathX = getPathCenterX(wz);
                const lateralJitter =
                    (sIdx % 2 === 0 ? 0.25 : -0.25) +
                    (hash2D(sIdx, 19, 101) - 0.5) * 0.16;
                const wx = pathX + lateralJitter;

                if (wx >= xStart && wx < xEnd) {
                    const wy = getGardenTerrainHeight(wx, wz);
                    generatedProps.push({
                        id: `stone_ns_${chunkKey}_${sIdx}`,
                        x: wx - worldOriginX,
                        y: wy + 0.02,
                        z: wz - worldOriginZ,
                        scale: [
                            0.92 + hash2D(sIdx, 7, 102) * 0.32,
                            1,
                            0.78 + hash2D(sIdx, 13, 103) * 0.25,
                        ],
                        rot: [0, hash2D(sIdx, 29, 104) * Math.PI, 0],
                        type: 'stone',
                        color:
                            sIdx % 3 === 0
                                ? THEME.colors.stoneSunlit
                                : THEME.colors.stoneBase,
                    });
                }
            }

            const firstXIdx = Math.ceil(xStart / stepSpacing);
            const lastXIdx = Math.floor(xEnd / stepSpacing);
            for (let xIdx = firstXIdx; xIdx <= lastXIdx; xIdx++) {
                const wx = xIdx * stepSpacing;
                const pathZ = getSecondaryPathCenterZ(wx);
                // Avoid doubling stones right at the main trail intersection
                if (Math.abs(wx - getPathCenterX(pathZ)) < 1.8) continue;

                const lateralJitter =
                    (xIdx % 2 === 0 ? 0.24 : -0.24) +
                    (hash2D(xIdx, 31, 105) - 0.5) * 0.16;
                const wz = pathZ + lateralJitter;

                if (wz >= zStart && wz < zEnd) {
                    const wy = getGardenTerrainHeight(wx, wz);
                    generatedProps.push({
                        id: `stone_ew_${chunkKey}_${xIdx}`,
                        x: wx - worldOriginX,
                        y: wy + 0.02,
                        z: wz - worldOriginZ,
                        scale: [
                            0.85 + hash2D(xIdx, 11, 106) * 0.3,
                            1,
                            0.85 + hash2D(xIdx, 17, 107) * 0.25,
                        ],
                        rot: [0, hash2D(xIdx, 37, 108) * Math.PI, 0],
                        type: 'stone',
                        color:
                            xIdx % 2 === 0
                                ? THEME.colors.stoneBase
                                : THEME.colors.stoneSunlit,
                    });
                }
            }

            // B. Curated Biome Focal Landmark Composition (1 per non-origin chunk)
            const centerBiomeSample = getBiomeSampleAt(worldOriginX, worldOriginZ);
            const chunkBiome: BiomeType = centerBiomeSample.primary;

            if (cx !== 0 || cz !== 0) {
                const focalX =
                    worldOriginX + (hash2D(cx, cz, 211) - 0.5) * (CHUNK_SIZE * 0.45);
                const focalZ =
                    worldOriginZ + (hash2D(cx, cz, 223) - 0.5) * (CHUNK_SIZE * 0.45);
                const focalRot = hash2D(cx, cz, 229) * Math.PI * 2;

                if (chunkBiome === 'blossom_grove') {
                    // Monumental Blossom Tree Landmark + Surrounding GLB Memory Flowers
                    if (isPositionFree(focalX, focalZ, 3.2, 3.8)) {
                        const fy = getGardenTerrainHeight(focalX, focalZ);
                        generatedLandmarks.push({
                            id: `lm_sakura_${chunkKey}`,
                            kind: 'huge_sakura_glb',
                            x: focalX - worldOriginX,
                            y: fy,
                            z: focalZ - worldOriginZ,
                            rotY: focalRot,
                            scale: 0.92 + hash2D(cx, cz, 233) * 0.22,
                        });
                        registerOccupied(focalX, focalZ, 3.2);
                        generatedColliders.push({
                            id: `col_lm_sakura_${chunkKey}`,
                            x: focalX,
                            y: fy,
                            z: focalZ,
                            radius: 1.45,
                            height: 8.0,
                            blocksCamera: true,
                        });

                        // Ring of GLB memory flowers around the monumental tree
                        for (let f = 0; f < 5; f++) {
                            const fa = (f / 5) * Math.PI * 2 + focalRot;
                            const fr = 3.2 + hash2D(cx + f, cz, 241) * 1.8;
                            const flx = focalX + Math.cos(fa) * fr;
                            const flz = focalZ + Math.sin(fa) * fr;
                            const fly = getGardenTerrainHeight(flx, flz);
                            generatedLandmarks.push({
                                id: `lm_fl_${chunkKey}_${f}`,
                                kind: f % 2 === 0 ? 'flower_v1_glb' : 'flower_v2_glb',
                                x: flx - worldOriginX,
                                y: fly,
                                z: flz - worldOriginZ,
                                rotY: fa,
                                scale: 0.9 + hash2D(cx, cz + f, 251) * 0.35,
                            });
                        }
                    }
                } else if (chunkBiome === 'evergreen_forest') {
                    // Monumental Green Elder Tree + Mushroom Clusters
                    if (isPositionFree(focalX, focalZ, 3.2, 3.8)) {
                        const fy = getGardenTerrainHeight(focalX, focalZ);
                        generatedLandmarks.push({
                            id: `lm_green_${chunkKey}`,
                            kind: 'huge_green_glb',
                            x: focalX - worldOriginX,
                            y: fy,
                            z: focalZ - worldOriginZ,
                            rotY: focalRot,
                            scale: 0.95 + hash2D(cx, cz, 263) * 0.25,
                        });
                        registerOccupied(focalX, focalZ, 3.2);
                        generatedColliders.push({
                            id: `col_lm_green_${chunkKey}`,
                            x: focalX,
                            y: fy,
                            z: focalZ,
                            radius: 1.5,
                            height: 8.5,
                            blocksCamera: true,
                        });

                        for (let m = 0; m < 3; m++) {
                            const ma = (m / 3) * Math.PI * 2 + focalRot;
                            const mx = focalX + Math.cos(ma) * 2.8;
                            const mz = focalZ + Math.sin(ma) * 2.8;
                            generatedLandmarks.push({
                                id: `lm_mush_${chunkKey}_${m}`,
                                kind: 'mushroom_cluster',
                                x: mx - worldOriginX,
                                y: getGardenTerrainHeight(mx, mz),
                                z: mz - worldOriginZ,
                                rotY: ma,
                                scale: 1.0 + (m % 2) * 0.25,
                            });
                        }
                    }
                } else if (chunkBiome === 'ancient_ruins') {
                    // Stone Archway Entrance + Standing Rock Pillars
                    if (isPositionFree(focalX, focalZ, 3.0, 3.0)) {
                        const fy = getGardenTerrainHeight(focalX, focalZ);
                        generatedLandmarks.push({
                            id: `lm_arch_${chunkKey}`,
                            kind: 'rock_arch_glb',
                            x: focalX - worldOriginX,
                            y: fy,
                            z: focalZ - worldOriginZ,
                            rotY: focalRot,
                            scale: 0.95,
                        });
                        registerOccupied(focalX, focalZ, 3.0);

                        for (let p = 0; p < 3; p++) {
                            const pa = focalRot + (p - 1) * 0.95;
                            const pr = 4.6 + p * 1.1;
                            const px = focalX + Math.cos(pa) * pr;
                            const pz = focalZ + Math.sin(pa) * pr;
                            if (isPositionFree(px, pz, 1.1, 2.2)) {
                                const py = getGardenTerrainHeight(px, pz);
                                generatedLandmarks.push({
                                    id: `lm_pillar_${chunkKey}_${p}`,
                                    kind: 'rock_pillar_glb',
                                    x: px - worldOriginX,
                                    y: py,
                                    z: pz - worldOriginZ,
                                    rotY: pa + 0.4,
                                    scale: 0.85 + hash2D(cx + p, cz, 271) * 0.28,
                                });
                                registerOccupied(px, pz, 1.1);
                                generatedColliders.push({
                                    id: `col_pillar_${chunkKey}_${p}`,
                                    x: px,
                                    y: py,
                                    z: pz,
                                    radius: 0.65,
                                    height: 3.0,
                                    blocksCamera: true,
                                });
                            }
                        }
                    }
                } else if (chunkBiome === 'explorers_rest') {
                    // Explorer's Rest Clearing: Stone Cottage or Tent + Cart + Noticeboard + Street Lamp
                    const useCottage = hash2D(cx, cz, 277) > 0.45;
                    if (isPositionFree(focalX, focalZ, 3.5, 3.4)) {
                        const fy = getGardenTerrainHeight(focalX, focalZ);
                        generatedLandmarks.push({
                            id: `lm_rest_main_${chunkKey}`,
                            kind: useCottage ? 'cottage_glb' : 'campsite_glb',
                            x: focalX - worldOriginX,
                            y: fy,
                            z: focalZ - worldOriginZ,
                            rotY: focalRot,
                            scale: 0.95,
                        });
                        registerOccupied(focalX, focalZ, 3.4);
                        generatedColliders.push({
                            id: `col_rest_main_${chunkKey}`,
                            x: focalX,
                            y: fy,
                            z: focalZ,
                            radius: useCottage ? 2.35 : 1.45,
                            height: 3.6,
                            blocksCamera: useCottage,
                        });

                        // Companion Wooden Cart
                        const cartX = focalX + Math.cos(focalRot + 1.1) * 4.5;
                        const cartZ = focalZ + Math.sin(focalRot + 1.1) * 4.5;
                        if (isPositionFree(cartX, cartZ, 1.4, 2.2)) {
                            const cy = getGardenTerrainHeight(cartX, cartZ);
                            generatedLandmarks.push({
                                id: `lm_cart_${chunkKey}`,
                                kind: 'cart_glb',
                                x: cartX - worldOriginX,
                                y: cy,
                                z: cartZ - worldOriginZ,
                                rotY: focalRot - 0.5,
                                scale: 1.0,
                            });
                            registerOccupied(cartX, cartZ, 1.4);
                        }

                        // Companion Notice Board & Street Lamp
                        const nbX = focalX + Math.cos(focalRot - 0.9) * 4.2;
                        const nbZ = focalZ + Math.sin(focalRot - 0.9) * 4.2;
                        if (isPositionFree(nbX, nbZ, 1.2, 2.0)) {
                            generatedLandmarks.push({
                                id: `lm_nb_${chunkKey}`,
                                kind: 'noticeboard_glb',
                                x: nbX - worldOriginX,
                                y: getGardenTerrainHeight(nbX, nbZ),
                                z: nbZ - worldOriginZ,
                                rotY: focalRot + Math.PI,
                                scale: 1.0,
                            });
                            registerOccupied(nbX, nbZ, 1.2);
                        }

                        const lampX = focalX + Math.cos(focalRot - 0.3) * 3.8;
                        const lampZ = focalZ + Math.sin(focalRot - 0.3) * 3.8;
                        if (isPositionFree(lampX, lampZ, 0.8, 1.8)) {
                            generatedLandmarks.push({
                                id: `lm_lamp_${chunkKey}`,
                                kind: 'lamp_glb',
                                x: lampX - worldOriginX,
                                y: getGardenTerrainHeight(lampX, lampZ),
                                z: lampZ - worldOriginZ,
                                rotY: focalRot,
                                scale: 1.0,
                            });
                            registerOccupied(lampX, lampZ, 0.8);
                        }
                    }
                } else if (chunkBiome === 'meadow') {
                    // Open Scenic Meadow: Japanese Torii Gate framing the trail or Flower Sanctuary Ring
                    const pathZ = worldOriginZ;
                    const pathX = getPathCenterX(pathZ);
                    if (
                        Math.abs(pathX - worldOriginX) < CHUNK_SIZE * 0.38 &&
                        hash2D(cx, cz, 283) > 0.4
                    ) {
                        const ty = getGardenTerrainHeight(pathX, pathZ);
                        generatedLandmarks.push({
                            id: `lm_torii_${chunkKey}`,
                            kind: 'torii_glb',
                            x: pathX - worldOriginX,
                            y: ty,
                            z: pathZ - worldOriginZ,
                            rotY: 0.08,
                            scale: 0.96,
                        });
                        registerOccupied(pathX - 1.5, pathZ, 0.7);
                        registerOccupied(pathX + 1.5, pathZ, 0.7);
                    }
                    // Lush GLB Flower clusters across the meadow
                    for (let f = 0; f < 6; f++) {
                        const fx =
                            worldOriginX +
                            (hash2D(cx + f, cz, 293) - 0.5) * (CHUNK_SIZE - 8);
                        const fz =
                            worldOriginZ +
                            (hash2D(cx, cz + f, 307) - 0.5) * (CHUNK_SIZE - 8);
                        if (isPositionFree(fx, fz, 0.8, 2.2)) {
                            generatedLandmarks.push({
                                id: `lm_meadow_fl_${chunkKey}_${f}`,
                                kind: f % 2 === 0 ? 'flower_v1_glb' : 'flower_v2_glb',
                                x: fx - worldOriginX,
                                y: getGardenTerrainHeight(fx, fz),
                                z: fz - worldOriginZ,
                                rotY: hash2D(cx, cz, 311 + f) * Math.PI * 2,
                                scale: 0.85 + hash2D(cx, cz, 317 + f) * 0.45,
                            });
                        }
                    }
                }
            }

            // C. Trailside Street Lamps at Key Path Bends
            if ((Math.abs(cx) + Math.abs(cz)) % 2 === 1) {
                const wz = worldOriginZ;
                const wx = getPathCenterX(wz) + (cx % 2 === 0 ? 2.45 : -2.45);
                if (
                    wx >= xStart + 2 &&
                    wx <= xEnd - 2 &&
                    isPositionFree(wx, wz, 0.8, 1.6)
                ) {
                    const wy = getGardenTerrainHeight(wx, wz);
                    generatedLandmarks.push({
                        id: `trail_lamp_${chunkKey}`,
                        kind: 'lamp_glb',
                        x: wx - worldOriginX,
                        y: wy,
                        z: wz - worldOriginZ,
                        rotY: cx % 2 === 0 ? -Math.PI / 2 : Math.PI / 2,
                        scale: 0.95,
                    });
                    registerOccupied(wx, wz, 0.8);
                }
            }

            // D. Biome-Specific Trees & Shrubs
            const maxTreeSlots = 24;
            for (let i = 0; i < maxTreeSlots; i++) {
                const seed = hash2D(cx * 37 + i, cz * 53 + i, 101);
                const lx = (hash2D(cx, cz, i * 11 + 1) - 0.5) * (CHUNK_SIZE - 4);
                const lz = (hash2D(cx, cz, i * 11 + 2) - 0.5) * (CHUNK_SIZE - 4);
                const wx = worldOriginX + lx;
                const wz = worldOriginZ + lz;

                const sample = getBiomeSampleAt(wx, wz);
                const cfg = sample.config;

                // Keep natural clearings open
                if (sample.clearingFactor > 0.55) continue;
                if (seed > cfg.treeDensity) continue;

                const scale = 0.78 + hash2D(cx + i, cz, 409) * 0.72;
                if (!isPositionFree(wx, wz, 0.85 * scale, 3.4)) continue;

                const wy = getGardenTerrainHeight(wx, wz);
                const speciesRoll = hash2D(cx, cz + i, 419);

                let species: TreeData['species'] = 'oak';
                if (sample.primary === 'blossom_grove') {
                    species =
                        speciesRoll < 0.68
                            ? 'sakura'
                            : speciesRoll < 0.86
                                ? 'oak'
                                : 'shrub';
                } else if (sample.primary === 'evergreen_forest') {
                    species =
                        speciesRoll < 0.72
                            ? 'pine'
                            : speciesRoll < 0.88
                                ? 'oak'
                                : 'shrub';
                } else if (sample.primary === 'meadow') {
                    species =
                        speciesRoll < 0.45
                            ? 'shrub'
                            : speciesRoll < 0.78
                                ? 'sakura'
                                : 'oak';
                } else if (sample.primary === 'ancient_ruins') {
                    species =
                        speciesRoll < 0.48
                            ? 'pine'
                            : speciesRoll < 0.78
                                ? 'shrub'
                                : 'oak';
                } else {
                    species =
                        speciesRoll < 0.35
                            ? 'sakura'
                            : speciesRoll < 0.65
                                ? 'oak'
                                : speciesRoll < 0.85
                                    ? 'pine'
                                    : 'shrub';
                }

                generatedTrees.push({
                    id: `tree_${chunkKey}_${i}`,
                    x: lx,
                    y: wy - 0.04,
                    z: lz,
                    scale,
                    rotY: hash2D(cx, cz, 431 + i) * Math.PI * 2,
                    species,
                });
                registerOccupied(wx, wz, 0.85 * scale);

                if (species !== 'shrub') {
                    generatedColliders.push({
                        id: `col_tree_${chunkKey}_${i}`,
                        x: wx,
                        y: wy,
                        z: wz,
                        radius: 0.42 * scale,
                        height: 4.2 * scale,
                        blocksCamera: true,
                    });
                }
            }

            // E. Biome-Modulated Boulders, Mossy Rocks & Fallen Logs
            const maxRockSlots = 16;
            for (let r = 0; r < maxRockSlots; r++) {
                const rSeed = hash2D(cx * 19 + r, cz * 29 + r, 303);
                const lx = (hash2D(cx, cz, r * 17 + 70) - 0.5) * (CHUNK_SIZE - 3);
                const lz = (hash2D(cx, cz, r * 17 + 71) - 0.5) * (CHUNK_SIZE - 3);
                const wx = worldOriginX + lx;
                const wz = worldOriginZ + lz;

                const sample = getBiomeSampleAt(wx, wz);
                if (rSeed > sample.config.rockDensity) continue;
                if (!isPositionFree(wx, wz, 1.0, 2.6)) continue;

                const wy = getGardenTerrainHeight(wx, wz);
                const isFallenLog =
                    (sample.primary === 'evergreen_forest' ||
                        sample.primary === 'explorers_rest') &&
                    r % 4 === 0;

                if (isFallenLog) {
                    const logScale = 0.75 + rSeed * 0.45;
                    generatedProps.push({
                        id: `log_${chunkKey}_${r}`,
                        x: lx,
                        y: wy + 0.08,
                        z: lz,
                        scale: [logScale, logScale, logScale],
                        rot: [
                            Math.PI / 2 + (rSeed - 0.5) * 0.12,
                            rSeed * Math.PI,
                            (rSeed - 0.5) * 0.15,
                        ],
                        type: 'log',
                        color: THEME.colors.barkBase,
                    });
                    registerOccupied(wx, wz, 1.1);
                } else {
                    const sizeMult =
                        sample.primary === 'ancient_ruins' ? 1.25 : 1.0;
                    const sx = (0.6 + rSeed * 0.85) * sizeMult;
                    const sy =
                        (0.5 + hash2D(cx + r, cz, 521) * 0.65) * sizeMult;
                    const sz =
                        (0.6 + hash2D(cx, cz + r, 523) * 0.85) * sizeMult;

                    generatedProps.push({
                        id: `rock_${chunkKey}_${r}`,
                        x: lx,
                        y: wy - 0.12,
                        z: lz,
                        scale: [sx, sy, sz],
                        rot: [0, rSeed * Math.PI * 2, 0],
                        type:
                            sample.primary === 'evergreen_forest' || r % 3 === 0
                                ? 'mossy_rock'
                                : 'rock',
                        color:
                            r % 2 === 0
                                ? THEME.colors.stoneBase
                                : THEME.colors.stoneSunlit,
                    });
                    registerOccupied(wx, wz, 0.75 * sx);

                    if (sx > 0.82) {
                        generatedColliders.push({
                            id: `col_rock_${chunkKey}_${r}`,
                            x: wx,
                            y: wy,
                            z: wz,
                            radius: 0.68 * sx,
                            height: 1.1 * sy,
                            blocksCamera: sx > 1.1,
                        });
                    }
                }
            }

            // F. Instanced Grass & Wildflowers Scaled by Biome Flower Density
            const grassCount = 145;
            for (let g = 0; g < grassCount; g++) {
                const lx = (hash2D(cx, cz, g * 3 + 500) - 0.5) * CHUNK_SIZE;
                const lz = (hash2D(cx, cz, g * 3 + 501) - 0.5) * CHUNK_SIZE;
                const wx = worldOriginX + lx;
                const wz = worldOriginZ + lz;

                if (getDistanceToNearestPath(wx, wz) < 1.45) continue;

                const sample = getBiomeSampleAt(wx, wz);
                const wy = getGardenTerrainHeight(wx, wz);
                const s = 0.65 + hash2D(cx, cz, g * 3 + 502) * 0.85;

                dummy.position.set(lx, wy + 0.12 * s, lz);
                dummy.rotation.set(
                    (seededRandom(g * 7) - 0.5) * 0.25,
                    seededRandom(g * 13) * Math.PI * 2,
                    (seededRandom(g * 19) - 0.5) * 0.25
                );
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                grassMatrices.push(dummy.matrix.clone());

                const flowerRoll = hash2D(cx + g, cz, 601);
                if (flowerRoll < sample.config.flowerDensity * 0.28) {
                    dummy.position.set(lx, wy + 0.3 * s, lz);
                    dummy.rotation.set(
                        0.2,
                        seededRandom(g * 31) * Math.PI * 2,
                        0
                    );
                    dummy.scale.set(s * 0.9, s * 0.9, s * 0.9);
                    dummy.updateMatrix();
                    flowerMatrices.push(dummy.matrix.clone());
                }
            }

            return {
                trees: generatedTrees,
                propsList: generatedProps,
                biomeLandmarks: generatedLandmarks,
                grassTransforms: grassMatrices,
                flowerTransforms: flowerMatrices,
                colliders: generatedColliders,
            };
        }, [cx, cz, chunkKey, worldOriginX, worldOriginZ]);

        useLayoutEffect(() => {
            if (grassMeshRef.current) {
                grassTransforms.forEach((mat, idx) => {
                    grassMeshRef.current!.setMatrixAt(idx, mat);
                });
                grassMeshRef.current.instanceMatrix.needsUpdate = true;
            }
            if (flowerMeshRef.current) {
                flowerTransforms.forEach((mat, idx) => {
                    flowerMeshRef.current!.setMatrixAt(idx, mat);
                });
                flowerMeshRef.current.instanceMatrix.needsUpdate = true;
            }
            onChunkReady?.(`${cx}_${cz}`);
        }, [grassTransforms, flowerTransforms, onChunkReady, cx, cz]);

        useEffect(() => {
            const colKey = `${cx}_${cz}`;
            collisionManager.registerChunk(colKey, colliders);
            return () => {
                collisionManager.unregisterChunk(colKey);
                terrainGeo.dispose();
            };
        }, [cx, cz, colliders, terrainGeo]);

        const customTerrainMaterial = useMemo(() => {
            const mat = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.92,
                metalness: 0.02,
                flatShading: true,
            });

            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uMemoryCenter = {
                    value: new THREE.Vector3(0, 0, 0),
                };
                shader.uniforms.uRadianceRadius = { value: 7.5 };
                shader.uniforms.uRadianceStrength = { value: 0.0 };

                mat.userData.shader = shader;

                shader.fragmentShader =
                    `
        uniform vec3 uMemoryCenter;
        uniform float uRadianceRadius;
        uniform float uRadianceStrength;
        varying vec3 vWorldPos;
      ` + shader.fragmentShader;

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <color_fragment>',
                    `
        #include <color_fragment>
        float memDist = distance(vWorldPos, uMemoryCenter);
        float radianceFactor = clamp(1.0 - (memDist / uRadianceRadius), 0.0, 1.0);
        radianceFactor = smoothstep(0.0, 1.0, radianceFactor) * uRadianceStrength;
        
        vec3 goldenGlow = vec3(1.15, 0.98, 0.65);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * goldenGlow + vec3(0.12, 0.08, 0.02), radianceFactor * 0.65);
        `
                );

                shader.vertexShader =
                    `
        varying vec3 vWorldPos;
      ` + shader.vertexShader;

                shader.vertexShader = shader.vertexShader.replace(
                    '#include <worldpos_vertex>',
                    `
        #include <worldpos_vertex>
        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
                );
            };

            return mat;
        }, []);

        useFrame(() => {
            if (terrainMeshRef.current) {
                const mat = terrainMeshRef.current
                    .material as THREE.MeshStandardMaterial;
                const shader = mat.userData.shader;
                if (shader) {
                    const [mx, my, mz] = playerTelemetry.nearestMemoryPosition;
                    shader.uniforms.uMemoryCenter.value.set(mx, my, mz);
                    shader.uniforms.uRadianceStrength.value =
                        playerTelemetry.nearestMemoryRadiance;
                }
            }
        });

        return (
            <group position={[worldOriginX, 0, worldOriginZ]}>
                <mesh
                    ref={terrainMeshRef}
                    geometry={terrainGeo}
                    material={customTerrainMaterial}
                    receiveShadow
                />

                {/* Biome-Composed GLB Landmarks & Props */}
                {biomeLandmarks.map((lm) => {
                    const pos: [number, number, number] = [lm.x, lm.y, lm.z];
                    switch (lm.kind) {
                        case 'huge_sakura_glb':
                            return (
                                <MonumentalBlossomTreeGLB
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'huge_green_glb':
                            return (
                                <MonumentalEvergreenTreeGLB
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'cottage_glb':
                            return (
                                <CozyStorybookCottage
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'campsite_glb':
                            return (
                                <ExplorerCampsite
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'cart_glb':
                            return (
                                <WoodenCargoCart
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'noticeboard_glb':
                            return (
                                <WoodenMemoryNoticeboard
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'lamp_glb':
                            return (
                                <WoodenLanternPost
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'torii_glb':
                            return (
                                <RedToriiGate
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'rock_arch_glb':
                            return (
                                <StoneArchwayGLB
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'rock_pillar_glb':
                            return (
                                <StandingStonePillar
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        case 'flower_v1_glb':
                            return (
                                <MemoryFlowerGLB
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                    variant={1}
                                />
                            );
                        case 'flower_v2_glb':
                            return (
                                <MemoryFlowerGLB
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                    variant={2}
                                />
                            );
                        case 'mushroom_cluster':
                            return (
                                <SpottedMushroomCluster
                                    key={lm.id}
                                    position={pos}
                                    scale={lm.scale}
                                />
                            );
                        default:
                            return null;
                    }
                })}

                {trees.map((t) => (
                    <group
                        key={t.id}
                        position={[t.x, t.y, t.z]}
                        rotation={[0, t.rotY, 0]}
                        scale={t.scale}
                    >
                        {t.species === 'shrub' ? (
                            <mesh
                                geometry={SHARED_GEOMETRIES.shrubGeo}
                                position={[0, 0.38, 0]}
                                castShadow
                                receiveShadow
                            >
                                <meshStandardMaterial
                                    color={THEME.colors.meadowBase}
                                    roughness={0.85}
                                    flatShading
                                />
                            </mesh>
                        ) : (
                            <>
                                <mesh
                                    geometry={SHARED_GEOMETRIES.trunk}
                                    position={[0, 1.0, 0]}
                                    castShadow
                                    receiveShadow
                                >
                                    <meshStandardMaterial
                                        color={THEME.colors.barkBase}
                                        roughness={0.9}
                                        flatShading
                                    />
                                </mesh>

                                {t.species === 'pine' ? (
                                    <group position={[0, 1.85, 0]}>
                                        <mesh
                                            geometry={SHARED_GEOMETRIES.pineTier1}
                                            position={[0, 0, 0]}
                                            castShadow
                                            receiveShadow
                                        >
                                            <meshStandardMaterial
                                                color={THEME.colors.canopyDark}
                                                roughness={0.85}
                                                flatShading
                                            />
                                        </mesh>
                                        <mesh
                                            geometry={SHARED_GEOMETRIES.pineTier2}
                                            position={[0, 1.0, 0]}
                                            castShadow
                                            receiveShadow
                                        >
                                            <meshStandardMaterial
                                                color={THEME.colors.meadowBase}
                                                roughness={0.85}
                                                flatShading
                                            />
                                        </mesh>
                                        <mesh
                                            geometry={SHARED_GEOMETRIES.pineTier3}
                                            position={[0, 1.85, 0]}
                                            castShadow
                                            receiveShadow
                                        >
                                            <meshStandardMaterial
                                                color={THEME.colors.canopyLight}
                                                roughness={0.85}
                                                flatShading
                                            />
                                        </mesh>
                                    </group>
                                ) : (
                                    <group position={[0, 2.55, 0]}>
                                        <mesh
                                            geometry={SHARED_GEOMETRIES.canopyMain}
                                            position={[0, 0.15, 0]}
                                            castShadow
                                            receiveShadow
                                        >
                                            <meshStandardMaterial
                                                color={
                                                    t.species === 'sakura'
                                                        ? THEME.colors.sakuraMid
                                                        : THEME.colors.meadowBase
                                                }
                                                roughness={0.8}
                                                flatShading
                                            />
                                        </mesh>
                                        <mesh
                                            geometry={SHARED_GEOMETRIES.canopySub}
                                            position={[-0.85, -0.25, 0.45]}
                                            castShadow
                                            receiveShadow
                                        >
                                            <meshStandardMaterial
                                                color={
                                                    t.species === 'sakura'
                                                        ? THEME.colors.sakuraLight
                                                        : THEME.colors.meadowSunlit
                                                }
                                                roughness={0.8}
                                                flatShading
                                            />
                                        </mesh>
                                        <mesh
                                            geometry={SHARED_GEOMETRIES.canopySub}
                                            position={[0.85, -0.15, -0.35]}
                                            castShadow
                                            receiveShadow
                                        >
                                            <meshStandardMaterial
                                                color={
                                                    t.species === 'sakura'
                                                        ? THEME.colors.sakuraDeep
                                                        : THEME.colors.canopyOlive
                                                }
                                                roughness={0.8}
                                                flatShading
                                            />
                                        </mesh>
                                    </group>
                                )}
                            </>
                        )}
                    </group>
                ))}

                {propsList.map((p) => (
                    <group
                        key={p.id}
                        position={[p.x, p.y, p.z]}
                        rotation={p.rot}
                        scale={p.scale}
                    >
                        <mesh
                            geometry={
                                p.type === 'rock' || p.type === 'mossy_rock'
                                    ? SHARED_GEOMETRIES.boulder
                                    : p.type === 'log'
                                        ? SHARED_GEOMETRIES.fallenLog
                                        : SHARED_GEOMETRIES.steppingStone
                            }
                            castShadow={p.type !== 'stone'}
                            receiveShadow
                        >
                            <meshStandardMaterial
                                color={p.color}
                                roughness={0.88}
                                flatShading
                            />
                        </mesh>
                        {p.type === 'mossy_rock' && (
                            <mesh
                                geometry={SHARED_GEOMETRIES.mossCap}
                                position={[0, 0.55, 0]}
                                castShadow
                            >
                                <meshStandardMaterial
                                    color={THEME.colors.meadowBase}
                                    roughness={0.85}
                                    flatShading
                                />
                            </mesh>
                        )}
                    </group>
                ))}

                {grassTransforms.length > 0 && (
                    <instancedMesh
                        ref={grassMeshRef}
                        args={[
                            SHARED_GEOMETRIES.grassBlade,
                            undefined,
                            grassTransforms.length,
                        ]}
                        frustumCulled={false}
                    >
                        <meshStandardMaterial
                            color={THEME.colors.grassTuftLight}
                            roughness={0.86}
                            flatShading
                        />
                    </instancedMesh>
                )}

                {flowerTransforms.length > 0 && (
                    <instancedMesh
                        ref={flowerMeshRef}
                        args={[
                            SHARED_GEOMETRIES.flowerHead,
                            undefined,
                            flowerTransforms.length,
                        ]}
                        frustumCulled={false}
                    >
                        <meshStandardMaterial
                            color={THEME.colors.flowerPetal}
                            roughness={0.7}
                            flatShading
                        />
                    </instancedMesh>
                )}
            </group>
        );
    }
);

export const ChunkedTerrain: React.FC = () => {
    const activeChunkCoord = useGameStore((state) => state.activeChunkCoord);
    const setActiveChunkCoord = useGameStore((state) => state.setActiveChunkCoord);
    const worldSeed = useGameStore((state) => state.worldSeed);
    const setCurrentBiome = useGameStore((state) => state.setCurrentBiome);
    const setInitialTerrainReady = useGameStore(
        (state) => state.setInitialTerrainReady
    );

    const readyChunks = useRef(new Set<string>());

    const handleChunkReady = (key: string) => {
        readyChunks.current.add(key);
        if (readyChunks.current.has('0_0')) {
            setInitialTerrainReady(true);
        }
    };

    useFrame(() => {
        const px = playerTelemetry.position[0];
        const pz = playerTelemetry.position[2];
        const cx = Math.round(px / CHUNK_SIZE);
        const cz = Math.round(pz / CHUNK_SIZE);
        if (cx !== activeChunkCoord[0] || cz !== activeChunkCoord[1]) {
            setActiveChunkCoord([cx, cz]);
        }
        const liveBiome = getBiomeSampleAt(px, pz).primary;
        setCurrentBiome(liveBiome);
    });

    const visibleChunks = useMemo(() => {
        const coords: Array<[number, number]> = [];
        for (let dx = -ACTIVE_CHUNK_RADIUS; dx <= ACTIVE_CHUNK_RADIUS; dx++) {
            for (let dz = -ACTIVE_CHUNK_RADIUS; dz <= ACTIVE_CHUNK_RADIUS; dz++) {
                coords.push([activeChunkCoord[0] + dx, activeChunkCoord[1] + dz]);
            }
        }
        return coords;
    }, [activeChunkCoord]);

    return (
        <group>
            {visibleChunks.map(([cx, cz]) => (
                <TerrainChunk
                    key={`${cx}_${cz}_${worldSeed}`}
                    cx={cx}
                    cz={cz}
                    worldSeed={worldSeed}
                    onChunkReady={handleChunkReady}
                />
            ))}
        </group>
    );
};