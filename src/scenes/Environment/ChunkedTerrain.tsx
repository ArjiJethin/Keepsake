// src/scenes/Environment/ChunkedTerrain.tsx
import React, {
    Suspense,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
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
    getGardenTerrainNormal,
    getPathCenterX,
    getSecondaryPathCenterZ,
    getTerrainSlope,
    hash2D,
} from './lowPolyUtils';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import {
    collisionManager,
    type SolidCollider,
} from '../../systems/Collision/collisionSystem';
import { isInsideSanctuaryClearing } from './sanctuaryLayout';
import { GLB_ASSET_PATHS } from '../../components/Environment/GLBWorldAssets';
import { InstancedGLBField } from '../../components/Environment/InstancedGLBField';
import {
    MonumentalBlossomTreeGLB,
    MonumentalEvergreenTreeGLB,
    RedToriiGate,
    StoneArchwayGLB,
    WoodenArchedBridge,
} from '../../components/Environment/WorldAssetLibrary';

const SHARED_GEOMETRIES = {
    trunk: new THREE.CylinderGeometry(0.18, 0.36, 2.2, 6),
    pineTier1: new THREE.ConeGeometry(1.35, 1.9, 7),
    pineTier2: new THREE.ConeGeometry(1.05, 1.65, 7),
    pineTier3: new THREE.ConeGeometry(0.72, 1.35, 7),
    canopyMain: createSculptedFacetedGeometry(1.35, 1, [1.15, 0.9, 1.1], 0.16, 12),
    canopySub: createSculptedFacetedGeometry(0.95, 1, [1.1, 0.85, 1.05], 0.18, 29),
    boulder: createSculptedFacetedGeometry(0.85, 1, [1.3, 0.82, 1.15], 0.22, 41, true),
    mossCap: createSculptedFacetedGeometry(0.72, 1, [1.25, 0.35, 1.08], 0.15, 52),
    fallenLog: new THREE.CylinderGeometry(0.22, 0.26, 2.6, 6),
    steppingStone: new THREE.CylinderGeometry(0.68, 0.78, 0.14, 7),
    groundCloverMound: createSculptedFacetedGeometry(0.48, 1, [1.35, 0.36, 1.25], 0.14, 67, true),
    meadowShrub: createSculptedFacetedGeometry(0.58, 1, [1.22, 0.78, 1.18], 0.15, 83, true),
    meadowShrubLobe: createSculptedFacetedGeometry(0.42, 1, [1.15, 0.72, 1.12], 0.15, 97, true),
    wildflowerBlossom: new THREE.DodecahedronGeometry(0.11, 0),
};

const SURFACE_MATERIAL_CACHE = new Map<string, THREE.MeshStandardMaterial>();

function surfaceMaterial(
    color: string,
    roughness: number
): THREE.MeshStandardMaterial {
    const key = `${color}|${roughness}`;
    const cached = SURFACE_MATERIAL_CACHE.get(key);
    if (cached) return cached;

    const material = new THREE.MeshStandardMaterial({
        color,
        roughness,
        flatShading: true,
    });
    SURFACE_MATERIAL_CACHE.set(key, material);
    return material;
}

let sharedTerrainMaterialInstance: THREE.MeshStandardMaterial | null = null;
function getSharedTerrainMaterial(): THREE.MeshStandardMaterial {
    if (sharedTerrainMaterialInstance) return sharedTerrainMaterialInstance;

    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
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
        
        vec3 magicalGlow = vec3(1.12, 1.05, 0.88);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * magicalGlow + vec3(0.07, 0.06, 0.02), radianceFactor * 0.42);
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

    sharedTerrainMaterialInstance = mat;
    return mat;
}

interface ChunkInstanceBatch {
    key: string;
    geometry: THREE.BufferGeometry;
    material: THREE.MeshStandardMaterial;
    matrices: THREE.Matrix4[];
    castShadow: boolean;
}

interface BatchCollector {
    batches: Map<string, ChunkInstanceBatch>;
    push: (
        geometryKey: string,
        geometry: THREE.BufferGeometry,
        color: string,
        roughness: number,
        matrix: THREE.Matrix4,
        castShadow?: boolean
    ) => void;
}

function createBatchCollector(): BatchCollector {
    const batches = new Map<string, ChunkInstanceBatch>();

    const push: BatchCollector['push'] = (
        geometryKey,
        geometry,
        color,
        roughness,
        matrix,
        castShadow = true
    ) => {
        const key = `${geometryKey}|${color}|${roughness}|${
            castShadow ? 'cast' : 'nocast'
        }`;
        let batch = batches.get(key);
        if (!batch) {
            batch = {
                key,
                geometry,
                material: surfaceMaterial(color, roughness),
                matrices: [],
                castShadow,
            };
            batches.set(key, batch);
        }
        batch.matrices.push(matrix.clone());
    };

    return { batches, push };
}

const TREE_PART_OFFSETS = {
    trunk: [0, 1.0, 0],
    pineTier1: [0, 1.85, 0],
    pineTier2: [0, 2.85, 0],
    pineTier3: [0, 3.7, 0],
    canopyMain: [0, 2.7, 0],
    canopySubLeft: [-0.85, 2.3, 0.45],
    canopySubRight: [0.85, 2.4, -0.35],
} as const;

const _instancePos = new THREE.Vector3();
const _instanceQuat = new THREE.Quaternion();
const _instanceScale = new THREE.Vector3();
const _instanceEuler = new THREE.Euler();
const _instanceParentMatrix = new THREE.Matrix4();
const _instancePartMatrix = new THREE.Matrix4();
const _combinedMatrix = new THREE.Matrix4();

function composeInstanceMatrix(
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
    target: THREE.Matrix4
): THREE.Matrix4 {
    _instancePos.set(x, y, z);
    _instanceQuat.setFromEuler(_instanceEuler.set(rx, ry, rz));
    _instanceScale.set(sx, sy, sz);
    return target.compose(_instancePos, _instanceQuat, _instanceScale);
}

function buildTreeBatches(trees: TreeData[]): ChunkInstanceBatch[] {
    if (trees.length === 0) return [];
    const collector = createBatchCollector();

    for (let i = 0; i < trees.length; i++) {
        const tree = trees[i];
        composeInstanceMatrix(
            tree.x,
            tree.y,
            tree.z,
            0,
            tree.rotY,
            0,
            tree.scale,
            tree.scale,
            tree.scale,
            _instanceParentMatrix
        );

        const pushPart = (
            part: keyof typeof TREE_PART_OFFSETS,
            geometry: THREE.BufferGeometry,
            color: string,
            roughness: number
        ) => {
            const [ox, oy, oz] = TREE_PART_OFFSETS[part];
            _instancePartMatrix.makeTranslation(ox, oy, oz);
            _combinedMatrix.multiplyMatrices(_instanceParentMatrix, _instancePartMatrix);
            collector.push(
                part,
                geometry,
                color,
                roughness,
                _combinedMatrix
            );
        };

        pushPart('trunk', SHARED_GEOMETRIES.trunk, THEME.colors.barkBase, 0.9);

        if (tree.species === 'pine') {
            pushPart(
                'pineTier1',
                SHARED_GEOMETRIES.pineTier1,
                THEME.colors.canopyDark,
                0.85
            );
            pushPart(
                'pineTier2',
                SHARED_GEOMETRIES.pineTier2,
                THEME.colors.canopyOlive,
                0.85
            );
            pushPart(
                'pineTier3',
                SHARED_GEOMETRIES.pineTier3,
                THEME.colors.canopyLight,
                0.85
            );
        } else {
            const isSakura = tree.species === 'sakura';
            pushPart(
                'canopyMain',
                SHARED_GEOMETRIES.canopyMain,
                isSakura ? THEME.colors.sakuraMid : THEME.colors.meadowBase,
                0.82
            );
            pushPart(
                'canopySubLeft',
                SHARED_GEOMETRIES.canopySub,
                isSakura ? THEME.colors.sakuraLight : THEME.colors.meadowSunlit,
                0.82
            );
            pushPart(
                'canopySubRight',
                SHARED_GEOMETRIES.canopySub,
                isSakura ? THEME.colors.sakuraDeep : THEME.colors.canopyOlive,
                0.82
            );
        }
    }

    return Array.from(collector.batches.values());
}

function buildPropBatches(propsList: PropData[]): ChunkInstanceBatch[] {
    if (propsList.length === 0) return [];
    const collector = createBatchCollector();

    for (let i = 0; i < propsList.length; i++) {
        const prop = propsList[i];
        composeInstanceMatrix(
            prop.x,
            prop.y,
            prop.z,
            prop.rot[0],
            prop.rot[1],
            prop.rot[2],
            prop.scale[0],
            prop.scale[1],
            prop.scale[2],
            _instanceParentMatrix
        );

        let geometry: THREE.BufferGeometry = SHARED_GEOMETRIES.steppingStone;
        if (prop.type === 'rock' || prop.type === 'mossy_rock') {
            geometry = SHARED_GEOMETRIES.boulder;
        } else if (prop.type === 'log') {
            geometry = SHARED_GEOMETRIES.fallenLog;
        } else if (prop.type === 'clover_mound') {
            geometry = SHARED_GEOMETRIES.groundCloverMound;
        } else if (prop.type === 'meadow_shrub') {
            geometry = SHARED_GEOMETRIES.meadowShrub;
        } else if (prop.type === 'wildflower_dot') {
            geometry = SHARED_GEOMETRIES.wildflowerBlossom;
        }

        const castsShadow =
            prop.type === 'rock' ||
            prop.type === 'mossy_rock';

        collector.push(
            prop.type,
            geometry,
            prop.color,
            0.86,
            _instanceParentMatrix,
            castsShadow
        );

        if (prop.type === 'mossy_rock') {
            _instancePartMatrix.makeTranslation(0, 0.52, 0);
            _combinedMatrix.multiplyMatrices(_instanceParentMatrix, _instancePartMatrix);
            collector.push(
                'mossCap',
                SHARED_GEOMETRIES.mossCap,
                THEME.colors.meadowBase,
                0.86,
                _combinedMatrix,
                false
            );
        } else if (prop.type === 'meadow_shrub') {
            _instancePartMatrix.makeTranslation(0.32, -0.06, 0.18);
            _combinedMatrix.multiplyMatrices(_instanceParentMatrix, _instancePartMatrix);
            collector.push(
                'meadowShrubLobeA',
                SHARED_GEOMETRIES.meadowShrubLobe,
                THEME.colors.meadowSunlit,
                0.85,
                _combinedMatrix,
                false
            );
            _instancePartMatrix.makeTranslation(-0.28, -0.08, -0.22);
            _combinedMatrix.multiplyMatrices(_instanceParentMatrix, _instancePartMatrix);
            collector.push(
                'meadowShrubLobeB',
                SHARED_GEOMETRIES.meadowShrubLobe,
                THEME.colors.canopyOlive,
                0.85,
                _combinedMatrix,
                false
            );
        }
    }

    return Array.from(collector.batches.values());
}

const ChunkInstancedBatch: React.FC<{ batch: ChunkInstanceBatch }> = React.memo(
    ({ batch }) => {
        const meshRef = useRef<THREE.InstancedMesh>(null);

        useLayoutEffect(() => {
            const mesh = meshRef.current;
            if (!mesh) return;
            for (let i = 0; i < batch.matrices.length; i++) {
                mesh.setMatrixAt(i, batch.matrices[i]);
            }
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
        }, [batch]);

        return (
            <instancedMesh
                ref={meshRef}
                args={[batch.geometry, batch.material, batch.matrices.length]}
                castShadow={batch.castShadow}
                receiveShadow
                frustumCulled={true}
            />
        );
    }
);
ChunkInstancedBatch.displayName = 'ChunkInstancedBatch';

interface TreeData {
    id: string;
    x: number;
    y: number;
    z: number;
    scale: number;
    rotY: number;
    species: 'sakura' | 'pine' | 'oak';
}

interface PropData {
    id: string;
    x: number;
    y: number;
    z: number;
    scale: [number, number, number];
    rot: [number, number, number];
    type:
        | 'rock'
        | 'mossy_rock'
        | 'log'
        | 'stone'
        | 'clover_mound'
        | 'meadow_shrub'
        | 'wildflower_dot';
    color: string;
}

interface BiomeLandmarkData {
    id: string;
    kind:
        | 'huge_sakura_glb'
        | 'huge_green_glb'
        | 'tent_glb'
        | 'cart_glb'
        | 'noticeboard_glb'
        | 'lamp_glb'
        | 'torii_glb'
        | 'rock_arch_glb'
        | 'rock_pillar_glb'
        | 'flower_v1_glb'
        | 'flower_v2_glb'
        | 'old_tree_v1_glb'
        | 'old_tree_v2_glb'
        | 'tall_tree_v1_glb'
        | 'tall_tree_v2_glb'
        | 'pond_glb'
        | 'bridge_arched';
    x: number;
    y: number;
    z: number;
    rotY: number;
    scale: number;
}

interface PrecomputedChunkData {
    terrainGeo: THREE.BufferGeometry;
    treeBatches: ChunkInstanceBatch[];
    propBatches: ChunkInstanceBatch[];
    heroLandmarks: BiomeLandmarkData[];
    glbFieldTransforms: Record<string, THREE.Matrix4[]>;
    colliders: SolidCollider[];
}

const CHUNK_DATA_CACHE = new Map<string, PrecomputedChunkData>();
const MAX_CACHED_CHUNKS = 49;

function evictOldChunksIfNeeded(activeCoord: [number, number], seed: string) {
    if (CHUNK_DATA_CACHE.size <= MAX_CACHED_CHUNKS) return;

    for (const [key, data] of CHUNK_DATA_CACHE.entries()) {
        const parts = key.split('_');
        const cx = Number(parts[0]);
        const cz = Number(parts[1]);
        const keySeed = parts.slice(2).join('_');
        const dist = Math.max(
            Math.abs(cx - activeCoord[0]),
            Math.abs(cz - activeCoord[1])
        );
        if (keySeed !== seed || dist > ACTIVE_CHUNK_RADIUS + 2) {
            data.terrainGeo.dispose();
            CHUNK_DATA_CACHE.delete(key);
        }
    }
}

// Reusable scratch colors for terrain vertex color calculation
const _cBaseA = new THREE.Color();
const _cSunA = new THREE.Color();
const _cShadA = new THREE.Color();
const _cPathA = new THREE.Color();
const _cBaseB = new THREE.Color();
const _cSunB = new THREE.Color();
const _cShadB = new THREE.Color();
const _cPathB = new THREE.Color();
const _tempA = new THREE.Color();
const _tempB = new THREE.Color();
const _dummyObj = new THREE.Object3D();

function buildChunkData(
    cx: number,
    cz: number,
    worldSeed: string
): PrecomputedChunkData {
    const cacheKey = `${cx}_${cz}_${worldSeed}`;
    const existing = CHUNK_DATA_CACHE.get(cacheKey);
    if (existing) return existing;

    const worldOriginX = cx * CHUNK_SIZE;
    const worldOriginZ = cz * CHUNK_SIZE;

    // 1. Seamlessly Stitched Biome Terrain Geometry
    const plane = new THREE.PlaneGeometry(
        CHUNK_SIZE,
        CHUNK_SIZE,
        CHUNK_SEGMENTS,
        CHUNK_SEGMENTS
    );
    plane.rotateX(-Math.PI / 2);

    const nonIndexed = plane.toNonIndexed();
    plane.dispose();

    const pos = nonIndexed.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Cache vertex evaluations within the chunk so all 6 shared triangle vertices at
    // grid intersections get the exact same height and color (eliminates micro-seams)
    const vertexSampleCache = new Map<string, { wy: number; r: number; g: number; b: number }>();

    for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const lz = pos.getZ(i);
        // Snap world coordinates to 0.001m grid so adjacent chunk borders match bit-for-bit
        const wx = Math.round((lx + worldOriginX) * 1000) / 1000;
        const wz = Math.round((lz + worldOriginZ) * 1000) / 1000;
        const vKey = `${wx}_${wz}`;

        let cachedV = vertexSampleCache.get(vKey);
        if (!cachedV) {
            const wy = getGardenTerrainHeight(wx, wz);
            const biomeSample = getBiomeSampleAt(wx, wz);
            const cfgA = BIOME_CONFIGS[biomeSample.primary];
            const cfgB = BIOME_CONFIGS[biomeSample.secondary];

            _cBaseA.set(cfgA.baseColor);
            _cSunA.set(cfgA.sunlitColor);
            _cShadA.set(cfgA.shadowColor);
            _cPathA.set(cfgA.pathColor);

            _cBaseB.set(cfgB.baseColor);
            _cSunB.set(cfgB.sunlitColor);
            _cShadB.set(cfgB.shadowColor);
            _cPathB.set(cfgB.pathColor);

            const dapple =
                0.48 +
                wy * 0.08 +
                Math.sin(wx * 0.09 - wz * 0.07) * 0.18 +
                Math.cos(wx * 0.21 + wz * 0.19) * 0.08;
            const sunBlend = THREE.MathUtils.clamp(dapple, 0, 1);

            _tempA.copy(_cBaseA).lerp(_cSunA, sunBlend * 0.72);
            _tempB.copy(_cBaseB).lerp(_cSunB, sunBlend * 0.72);

            if (wy < -0.25) {
                const shadowStrength = Math.min(Math.abs(wy + 0.25) * 0.35, 0.45);
                _tempA.lerp(_cShadA, shadowStrength);
                _tempB.lerp(_cShadB, shadowStrength);
            }

            _tempA.lerp(_tempB, biomeSample.blend);
            _cPathA.lerp(_cPathB, biomeSample.blend);

            if (biomeSample.clearingFactor > 0.05) {
                _tempA.lerp(_cSunA, biomeSample.clearingFactor * 0.18);
            }

            const distToPath = getDistanceToNearestPath(wx, wz);
            if (distToPath < 2.45) {
                _tempA.lerp(_cPathA, (1 - distToPath / 2.45) * 0.58);
            }

            cachedV = { wy, r: _tempA.r, g: _tempA.g, b: _tempA.b };
            vertexSampleCache.set(vKey, cachedV);
        }

        pos.setY(i, cachedV.wy);
        colors[i * 3] = cachedV.r;
        colors[i * 3 + 1] = cachedV.g;
        colors[i * 3 + 2] = cachedV.b;
    }

    nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    nonIndexed.computeVertexNormals();

    // 2. Deterministic Biome Composition & Natural Plains Clusters
    const generatedTrees: TreeData[] = [];
    const generatedProps: PropData[] = [];
    const generatedLandmarks: BiomeLandmarkData[] = [];
    const generatedColliders: SolidCollider[] = [];

    const occupiedCircles: Array<{ x: number; z: number; r: number }> = [];

    const isPositionFree = (
        wx: number,
        wz: number,
        radius: number,
        minPathClearance = 2.6,
        allowVillageRim = false
    ): boolean => {
        const distOrigin = Math.hypot(wx, wz);
        if (!allowVillageRim && distOrigin < 22.5) return false;
        if (allowVillageRim && distOrigin < 14.0) return false;
        if (isInsideSanctuaryClearing(wx, wz, radius)) return false;
        if (getDistanceToNearestPath(wx, wz) < minPathClearance + radius * 0.5) {
            return false;
        }
        if (getTerrainSlope(wx, wz) > 0.25) return false;

        for (let i = 0; i < occupiedCircles.length; i++) {
            const oc = occupiedCircles[i];
            if (Math.hypot(wx - oc.x, wz - oc.z) < radius + oc.r + 0.5) {
                return false;
            }
        }
        return true;
    };

    const registerOccupied = (wx: number, wz: number, r: number) => {
        occupiedCircles.push({ x: wx, z: wz, r });
    };

    // A. Winding Path Stepping Stones
    const zStart = worldOriginZ - CHUNK_SIZE / 2;
    const zEnd = worldOriginZ + CHUNK_SIZE / 2;
    const xStart = worldOriginX - CHUNK_SIZE / 2;
    const xEnd = worldOriginX + CHUNK_SIZE / 2;
    const stepSpacing = 2.1;

    const firstZIdx = Math.ceil(zStart / stepSpacing);
    const lastZIdx = Math.floor(zEnd / stepSpacing);
    for (let sIdx = firstZIdx; sIdx <= lastZIdx; sIdx++) {
        const wz = sIdx * stepSpacing;
        const pathX = getPathCenterX(wz);
        const wx = pathX + (sIdx % 2 === 0 ? 0.24 : -0.24);

        if (wx >= xStart && wx < xEnd) {
            const wy = getGardenTerrainHeight(wx, wz);
            generatedProps.push({
                id: `stone_ns_${cacheKey}_${sIdx}`,
                x: wx - worldOriginX,
                y: wy + 0.02,
                z: wz - worldOriginZ,
                scale: [0.95, 1, 0.85],
                rot: [0, (sIdx * 0.7) % Math.PI, 0],
                type: 'stone',
                color: sIdx % 3 === 0 ? THEME.colors.stoneSunlit : THEME.colors.stoneBase,
            });
        }
    }

    const firstXIdx = Math.ceil(xStart / stepSpacing);
    const lastXIdx = Math.floor(xEnd / stepSpacing);
    for (let xIdx = firstXIdx; xIdx <= lastXIdx; xIdx++) {
        const wx = xIdx * stepSpacing;
        const pathZ = getSecondaryPathCenterZ(wx);
        if (Math.abs(wx - getPathCenterX(pathZ)) < 1.8) continue;

        const wz = pathZ + (xIdx % 2 === 0 ? 0.22 : -0.22);

        if (wz >= zStart && wz < zEnd) {
            const wy = getGardenTerrainHeight(wx, wz);
            generatedProps.push({
                id: `stone_ew_${cacheKey}_${xIdx}`,
                x: wx - worldOriginX,
                y: wy + 0.02,
                z: wz - worldOriginZ,
                scale: [0.9, 1, 0.85],
                rot: [0, (xIdx * 0.9) % Math.PI, 0],
                type: 'stone',
                color: xIdx % 2 === 0 ? THEME.colors.stoneBase : THEME.colors.stoneSunlit,
            });
        }
    }

    // B. Structured Biome Landmarks (for non-origin chunks)
    const centerBiomeSample = getBiomeSampleAt(worldOriginX, worldOriginZ);
    const chunkBiome: BiomeType = centerBiomeSample.primary;

    if (cx !== 0 || cz !== 0) {
        const focalX =
            worldOriginX + (hash2D(cx, cz, 211) - 0.5) * (CHUNK_SIZE * 0.42);
        const focalZ =
            worldOriginZ + (hash2D(cx, cz, 223) - 0.5) * (CHUNK_SIZE * 0.42);
        const focalRot = hash2D(cx, cz, 229) * Math.PI * 2;

        if (chunkBiome === 'blossom_grove') {
            if (isPositionFree(focalX, focalZ, 3.4, 3.6)) {
                const fy = getGardenTerrainHeight(focalX, focalZ);
                generatedLandmarks.push({
                    id: `lm_sakura_${cacheKey}`,
                    kind: 'huge_sakura_glb',
                    x: focalX - worldOriginX,
                    y: fy,
                    z: focalZ - worldOriginZ,
                    rotY: focalRot,
                    scale: 0.95 + hash2D(cx, cz, 233) * 0.18,
                });
                registerOccupied(focalX, focalZ, 3.4);
                generatedColliders.push({
                    id: `col_lm_sakura_${cacheKey}`,
                    x: focalX,
                    y: fy,
                    z: focalZ,
                    radius: 1.45,
                    height: 8.0,
                    blocksCamera: true,
                });

                const subX = focalX + Math.cos(focalRot + 1.4) * 6.8;
                const subZ = focalZ + Math.sin(focalRot + 1.4) * 6.8;
                if (
                    isPositionFree(subX, subZ, 3.0, 2.6) &&
                    getTerrainSlope(subX, subZ) < 0.14
                ) {
                    const sy = getGardenTerrainHeight(subX, subZ);
                    const useTorii = hash2D(cx, cz, 239) > 0.45;
                    generatedLandmarks.push({
                        id: `lm_sakura_sub_${cacheKey}`,
                        kind: useTorii ? 'torii_glb' : 'pond_glb',
                        x: subX - worldOriginX,
                        y: sy,
                        z: subZ - worldOriginZ,
                        rotY: focalRot + Math.PI / 2,
                        scale: useTorii ? 0.94 : 0.72,
                    });
                    registerOccupied(subX, subZ, 3.0);
                }
            }
        } else if (chunkBiome === 'evergreen_forest') {
            if (isPositionFree(focalX, focalZ, 3.4, 3.6)) {
                const fy = getGardenTerrainHeight(focalX, focalZ);
                generatedLandmarks.push({
                    id: `lm_green_${cacheKey}`,
                    kind: 'huge_green_glb',
                    x: focalX - worldOriginX,
                    y: fy,
                    z: focalZ - worldOriginZ,
                    rotY: focalRot,
                    scale: 0.96 + hash2D(cx, cz, 263) * 0.2,
                });
                registerOccupied(focalX, focalZ, 3.4);
                generatedColliders.push({
                    id: `col_lm_green_${cacheKey}`,
                    x: focalX,
                    y: fy,
                    z: focalZ,
                    radius: 1.5,
                    height: 8.5,
                    blocksCamera: true,
                });

                const ruinX = focalX + Math.cos(focalRot + 2.1) * 6.5;
                const ruinZ = focalZ + Math.sin(focalRot + 2.1) * 6.5;
                if (isPositionFree(ruinX, ruinZ, 2.4, 2.6)) {
                    const ry = getGardenTerrainHeight(ruinX, ruinZ);
                    generatedLandmarks.push({
                        id: `lm_forest_ruin_${cacheKey}`,
                        kind: 'rock_pillar_glb',
                        x: ruinX - worldOriginX,
                        y: ry,
                        z: ruinZ - worldOriginZ,
                        rotY: focalRot,
                        scale: 0.95,
                    });
                    registerOccupied(ruinX, ruinZ, 1.4);
                }
            }
        } else if (chunkBiome === 'meadow') {
            if (
                isPositionFree(focalX, focalZ, 4.2, 3.4) &&
                getTerrainSlope(focalX, focalZ) < 0.14
            ) {
                const fy = getGardenTerrainHeight(focalX, focalZ);
                generatedLandmarks.push({
                    id: `lm_pond_main_${cacheKey}`,
                    kind: 'pond_glb',
                    x: focalX - worldOriginX,
                    y: fy + 0.02,
                    z: focalZ - worldOriginZ,
                    rotY: focalRot,
                    scale: 0.86 + hash2D(cx, cz, 281) * 0.16,
                });
                registerOccupied(focalX, focalZ, 4.2);

                if (hash2D(cx, cz, 283) > 0.4) {
                    generatedLandmarks.push({
                        id: `lm_pond_bridge_${cacheKey}`,
                        kind: 'bridge_arched',
                        x: focalX - worldOriginX,
                        y: fy + 0.05,
                        z: focalZ - worldOriginZ,
                        rotY: focalRot + 0.4,
                        scale: 0.95,
                    });
                }
            }
        } else if (chunkBiome === 'ancient_ruins') {
            if (isPositionFree(focalX, focalZ, 3.2, 3.0)) {
                const fy = getGardenTerrainHeight(focalX, focalZ);
                generatedLandmarks.push({
                    id: `lm_arch_${cacheKey}`,
                    kind: 'rock_arch_glb',
                    x: focalX - worldOriginX,
                    y: fy,
                    z: focalZ - worldOriginZ,
                    rotY: focalRot,
                    scale: 0.98,
                });
                registerOccupied(focalX, focalZ, 3.2);

                for (let p = 0; p < 3; p++) {
                    const pa = focalRot + (p - 1) * 0.95;
                    const pr = 5.0 + (p % 2) * 1.1;
                    const px = focalX + Math.cos(pa) * pr;
                    const pz = focalZ + Math.sin(pa) * pr;
                    if (isPositionFree(px, pz, 1.1, 2.4)) {
                        const py = getGardenTerrainHeight(px, pz);
                        generatedLandmarks.push({
                            id: `lm_pillar_${cacheKey}_${p}`,
                            kind: 'rock_pillar_glb',
                            x: px - worldOriginX,
                            y: py,
                            z: pz - worldOriginZ,
                            rotY: pa + Math.PI,
                            scale: 0.88 + hash2D(cx + p, cz, 271) * 0.22,
                        });
                        registerOccupied(px, pz, 1.1);
                        generatedColliders.push({
                            id: `col_pillar_${cacheKey}_${p}`,
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
            if (
                isPositionFree(focalX, focalZ, 3.2, 3.2) &&
                getTerrainSlope(focalX, focalZ) < 0.16
            ) {
                const fy = getGardenTerrainHeight(focalX, focalZ);
                generatedLandmarks.push({
                    id: `lm_tent_${cacheKey}`,
                    kind: 'tent_glb',
                    x: focalX - worldOriginX,
                    y: fy,
                    z: focalZ - worldOriginZ,
                    rotY: focalRot,
                    scale: 0.96,
                });
                registerOccupied(focalX, focalZ, 2.4);
                generatedColliders.push({
                    id: `col_tent_${cacheKey}`,
                    x: focalX,
                    y: fy,
                    z: focalZ,
                    radius: 1.35,
                    height: 2.5,
                    blocksCamera: false,
                });

                const cartX = focalX + Math.cos(focalRot + 1.2) * 4.5;
                const cartZ = focalZ + Math.sin(focalRot + 1.2) * 4.5;
                if (isPositionFree(cartX, cartZ, 1.5, 2.4)) {
                    generatedLandmarks.push({
                        id: `lm_cart_${cacheKey}`,
                        kind: 'cart_glb',
                        x: cartX - worldOriginX,
                        y: getGardenTerrainHeight(cartX, cartZ),
                        z: cartZ - worldOriginZ,
                        rotY: focalRot - 0.4,
                        scale: 0.95,
                    });
                    registerOccupied(cartX, cartZ, 1.5);
                }

                const nbX = focalX + Math.cos(focalRot - 1.05) * 4.0;
                const nbZ = focalZ + Math.sin(focalRot - 1.05) * 4.0;
                if (isPositionFree(nbX, nbZ, 1.2, 2.2)) {
                    generatedLandmarks.push({
                        id: `lm_nb_${cacheKey}`,
                        kind: 'noticeboard_glb',
                        x: nbX - worldOriginX,
                        y: getGardenTerrainHeight(nbX, nbZ),
                        z: nbZ - worldOriginZ,
                        rotY: focalRot + Math.PI,
                        scale: 0.95,
                    });
                    registerOccupied(nbX, nbZ, 1.2);
                }

                const lampX = focalX + Math.cos(focalRot - 0.35) * 3.6;
                const lampZ = focalZ + Math.sin(focalRot - 0.35) * 3.6;
                if (isPositionFree(lampX, lampZ, 0.8, 2.0)) {
                    generatedLandmarks.push({
                        id: `lm_lamp_${cacheKey}`,
                        kind: 'lamp_glb',
                        x: lampX - worldOriginX,
                        y: getGardenTerrainHeight(lampX, lampZ),
                        z: lampZ - worldOriginZ,
                        rotY: focalRot,
                        scale: 0.95,
                    });
                    registerOccupied(lampX, lampZ, 0.8);
                }
            }
        }
    }

    // C. Instanced Master GLB Old Trees & Tall Trees (from `public/models/`)
    const GLB_TREE_KINDS = [
        'old_tree_v1_glb',
        'old_tree_v2_glb',
        'tall_tree_v1_glb',
        'tall_tree_v2_glb',
    ] as const;

    const glbTreeSlots =
        chunkBiome === 'evergreen_forest'
            ? 4
            : chunkBiome === 'meadow'
                ? 2
                : 3;

    for (let i = 0; i < glbTreeSlots; i++) {
        const lx = (hash2D(cx, cz, i * 17 + 900) - 0.5) * (CHUNK_SIZE - 6);
        const lz = (hash2D(cx, cz, i * 17 + 901) - 0.5) * (CHUNK_SIZE - 6);
        const wx = worldOriginX + lx;
        const wz = worldOriginZ + lz;

        const sample = getBiomeSampleAt(wx, wz);
        if (sample.clearingFactor > 0.45) continue;

        const treeScale = 0.82 + hash2D(cx + i, cz, 907) * 0.42;
        if (!isPositionFree(wx, wz, 0.95 * treeScale, 3.6)) continue;

        const wy = getGardenTerrainHeight(wx, wz);
        const variant = Math.floor(hash2D(cx, cz + i, 911) * 4) % 4;

        generatedLandmarks.push({
            id: `lm_glbtree_${cacheKey}_${i}`,
            kind: GLB_TREE_KINDS[variant],
            x: lx,
            y: wy,
            z: lz,
            rotY: hash2D(cx, cz, 919 + i) * Math.PI * 2,
            scale: treeScale,
        });
        registerOccupied(wx, wz, 0.9 * treeScale);
        generatedColliders.push({
            id: `col_glbtree_${cacheKey}_${i}`,
            x: wx,
            y: wy,
            z: wz,
            radius: 0.5 * treeScale,
            height: 6.0,
            blocksCamera: false,
        });
    }

    // D. Biome-Specific Procedural Trees (Sakura, Pine, Oak)
    const maxTreeSlots = 16;
    for (let i = 0; i < maxTreeSlots; i++) {
        const seed = hash2D(cx * 37 + i, cz * 53 + i, 101);
        const lx = (hash2D(cx, cz, i * 11 + 1) - 0.5) * (CHUNK_SIZE - 4);
        const lz = (hash2D(cx, cz, i * 11 + 2) - 0.5) * (CHUNK_SIZE - 4);
        const wx = worldOriginX + lx;
        const wz = worldOriginZ + lz;

        const sample = getBiomeSampleAt(wx, wz);
        const cfg = sample.config;

        if (sample.clearingFactor > 0.5) continue;
        if (seed > cfg.treeDensity) continue;

        const scale = 0.82 + hash2D(cx + i, cz, 409) * 0.65;
        if (!isPositionFree(wx, wz, 0.85 * scale, 3.4)) continue;

        const wy = getGardenTerrainHeight(wx, wz);
        const speciesRoll = hash2D(cx, cz + i, 419);

        let species: TreeData['species'] = 'oak';
        if (sample.primary === 'blossom_grove') {
            species = speciesRoll < 0.78 ? 'sakura' : 'oak';
        } else if (sample.primary === 'evergreen_forest') {
            species = speciesRoll < 0.75 ? 'pine' : 'oak';
        } else if (sample.primary === 'meadow') {
            species = speciesRoll < 0.55 ? 'sakura' : 'oak';
        } else if (sample.primary === 'ancient_ruins') {
            species = speciesRoll < 0.55 ? 'pine' : 'oak';
        } else {
            species =
                speciesRoll < 0.4
                    ? 'sakura'
                    : speciesRoll < 0.75
                        ? 'oak'
                        : 'pine';
        }

        generatedTrees.push({
            id: `tree_${cacheKey}_${i}`,
            x: lx,
            y: wy - 0.04,
            z: lz,
            scale,
            rotY: hash2D(cx, cz, 431 + i) * Math.PI * 2,
            species,
        });
        registerOccupied(wx, wz, 0.85 * scale);

        generatedColliders.push({
            id: `col_tree_${cacheKey}_${i}`,
            x: wx,
            y: wy,
            z: wz,
            radius: 0.42 * scale,
            height: 4.2 * scale,
            blocksCamera: true,
        });
    }

    // E. Biome-Modulated Rocks, Mossy Boulders & Logs
    const maxRockSlots = 12;
    for (let r = 0; r < maxRockSlots; r++) {
        const rSeed = hash2D(cx * 19 + r, cz * 29 + r, 303);
        const lx = (hash2D(cx, cz, r * 17 + 70) - 0.5) * (CHUNK_SIZE - 3);
        const lz = (hash2D(cx, cz, r * 17 + 71) - 0.5) * (CHUNK_SIZE - 3);
        const wx = worldOriginX + lx;
        const wz = worldOriginZ + lz;

        const sample = getBiomeSampleAt(wx, wz);
        if (rSeed > sample.config.rockDensity) continue;
        if (!isPositionFree(wx, wz, 1.0, 2.8)) continue;

        const wy = getGardenTerrainHeight(wx, wz);
        const isFallenLog =
            (sample.primary === 'evergreen_forest' ||
                sample.primary === 'explorers_rest') &&
            r % 4 === 0;

        if (isFallenLog) {
            const logScale = 0.78 + rSeed * 0.42;
            const normal = getGardenTerrainNormal(wx, wz);
            generatedProps.push({
                id: `log_${cacheKey}_${r}`,
                x: lx,
                y: wy + 0.05,
                z: lz,
                scale: [logScale, logScale, logScale],
                rot: [
                    Math.PI / 2 + normal.z * 0.25,
                    rSeed * Math.PI,
                    -normal.x * 0.25,
                ],
                type: 'log',
                color: THEME.colors.barkBase,
            });
            registerOccupied(wx, wz, 1.1);
        } else {
            const sizeMult = sample.primary === 'ancient_ruins' ? 1.25 : 1.0;
            const sx = (0.62 + rSeed * 0.82) * sizeMult;
            const sy = (0.52 + hash2D(cx + r, cz, 521) * 0.62) * sizeMult;
            const sz = (0.62 + hash2D(cx, cz + r, 523) * 0.82) * sizeMult;

            generatedProps.push({
                id: `rock_${cacheKey}_${r}`,
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
                    id: `col_rock_${cacheKey}_${r}`,
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

    // F. Seed-Driven Organic Meadow Clusters
    const clusterCentersCount = 9;
    for (let c = 0; c < clusterCentersCount; c++) {
        const clx = (hash2D(cx, cz, c * 13 + 600) - 0.5) * (CHUNK_SIZE - 5);
        const clz = (hash2D(cx, cz, c * 13 + 601) - 0.5) * (CHUNK_SIZE - 5);
        const cwx = worldOriginX + clx;
        const cwz = worldOriginZ + clz;

        if (!isPositionFree(cwx, cwz, 0.9, 2.4, true)) continue;

        const biomeSample = getBiomeSampleAt(cwx, cwz);
        const clusterItems = 3 + (Math.floor(hash2D(cx + c, cz, 605) * 3) % 3);

        for (let m = 0; m < clusterItems; m++) {
            const angle = hash2D(cx, cz + m, c * 19 + 610) * Math.PI * 2;
            const dist = m === 0 ? 0 : 0.65 + hash2D(cx + m, cz, c * 19 + 611) * 2.2;
            const wx = cwx + Math.cos(angle) * dist;
            const wz = cwz + Math.sin(angle) * dist;

            if (
                wx < xStart + 1.5 ||
                wx > xEnd - 1.5 ||
                wz < zStart + 1.5 ||
                wz > zEnd - 1.5
            ) {
                continue;
            }
            if (!isPositionFree(wx, wz, 0.45, 2.2, true)) continue;

            const lx = wx - worldOriginX;
            const lz = wz - worldOriginZ;
            const wy = getGardenTerrainHeight(wx, wz);
            const rotY = hash2D(cx + m, cz + c, 617) * Math.PI * 2;
            const roll = hash2D(cx, cz, c * 29 + m * 7 + 620);

            if (roll < 0.36) {
                const bushScale = 0.62 + hash2D(cx + c, cz + m, 623) * 0.52;
                generatedProps.push({
                    id: `shrub_${cacheKey}_${c}_${m}`,
                    x: lx,
                    y: wy + 0.18 * bushScale,
                    z: lz,
                    scale: [bushScale, bushScale * 0.88, bushScale],
                    rot: [0, rotY, 0],
                    type: 'meadow_shrub',
                    color:
                        m % 2 === 0
                            ? THEME.colors.meadowBase
                            : THEME.colors.canopyOlive,
                });
            } else if (roll < 0.68) {
                const sx = 0.65 + hash2D(cx, cz + m, 629) * 0.65;
                const sy = 0.45 + hash2D(cx + m, cz, 631) * 0.4;
                generatedProps.push({
                    id: `clover_${cacheKey}_${c}_${m}`,
                    x: lx,
                    y: wy + 0.02,
                    z: lz,
                    scale: [sx, sy, sx * (0.85 + (m % 2) * 0.2)],
                    rot: [0, rotY, 0],
                    type: 'clover_mound',
                    color:
                        m % 2 === 0
                            ? biomeSample.config.sunlitColor
                            : THEME.colors.grassTuft,
                });
            } else if (roll < 0.8 && m === 0 && c < 3) {
                const flScale = 0.78 + hash2D(cx + m, cz + c, 641) * 0.42;
                generatedLandmarks.push({
                    id: `cluster_fl_${cacheKey}_${c}_${m}`,
                    kind: (c + m) % 2 === 0 ? 'flower_v1_glb' : 'flower_v2_glb',
                    x: lx,
                    y: wy,
                    z: lz,
                    rotY,
                    scale: flScale,
                });
            } else {
                const dotScale = 0.78 + hash2D(cx, cz, 647 + m) * 0.45;
                generatedProps.push({
                    id: `wfdot_${cacheKey}_${c}_${m}`,
                    x: lx,
                    y: wy + 0.12,
                    z: lz,
                    scale: [dotScale, dotScale * 0.7, dotScale],
                    rot: [0.15, rotY, 0],
                    type: 'wildflower_dot',
                    color:
                        (c + m) % 3 === 0
                            ? THEME.colors.flowerCenter
                            : (c + m) % 2 === 0
                                ? THEME.colors.flowerPetalPink
                                : THEME.colors.flowerPetal,
                });
            }
        }
    }

    // G. Separate Instanced Master GLB Field Transforms from Unique Hero Landmarks
    const glbFieldTransforms: Record<string, THREE.Matrix4[]> = {
        old_tree_v1_glb: [],
        old_tree_v2_glb: [],
        tall_tree_v1_glb: [],
        tall_tree_v2_glb: [],
        pond_glb: [],
        flower_v1_glb: [],
        flower_v2_glb: [],
        rock_pillar_glb: [],
        lamp_glb: [],
        tent_glb: [],
        cart_glb: [],
        noticeboard_glb: [],
    };

    const heroLandmarks: BiomeLandmarkData[] = [];

    for (const lm of generatedLandmarks) {
        const bucket = glbFieldTransforms[lm.kind];
        if (bucket) {
            _dummyObj.position.set(lm.x, lm.y, lm.z);
            _dummyObj.rotation.set(0, lm.rotY, 0);
            _dummyObj.scale.setScalar(lm.scale);
            _dummyObj.updateMatrix();
            bucket.push(_dummyObj.matrix.clone());
        } else {
            heroLandmarks.push(lm);
        }
    }

    const result: PrecomputedChunkData = {
        terrainGeo: nonIndexed,
        treeBatches: buildTreeBatches(generatedTrees),
        propBatches: buildPropBatches(generatedProps),
        heroLandmarks,
        glbFieldTransforms,
        colliders: generatedColliders,
    };

    CHUNK_DATA_CACHE.set(cacheKey, result);
    return result;
}

interface TerrainChunkProps {
    cx: number;
    cz: number;
    data: PrecomputedChunkData;
    onChunkReady?: (key: string) => void;
}

const TerrainChunk: React.FC<TerrainChunkProps> = React.memo(
    ({ cx, cz, data, onChunkReady }) => {
        const worldOriginX = cx * CHUNK_SIZE;
        const worldOriginZ = cz * CHUNK_SIZE;
        const sharedMaterial = useMemo(() => getSharedTerrainMaterial(), []);

        const detailGroupRef = useRef<THREE.Group>(null);
        const midGlbGroupRef = useRef<THREE.Group>(null);

        useLayoutEffect(() => {
            onChunkReady?.(`${cx}_${cz}`);
        }, [onChunkReady, cx, cz]);

        useEffect(() => {
            const colKey = `${cx}_${cz}`;
            collisionManager.registerChunk(colKey, data.colliders);
            return () => {
                collisionManager.unregisterChunk(colKey);
            };
        }, [cx, cz, data.colliders]);

        useFrame(() => {
            const dx = playerTelemetry.position[0] - worldOriginX;
            const dz = playerTelemetry.position[2] - worldOriginZ;
            const distSq = dx * dx + dz * dz;
            if (detailGroupRef.current) {
                detailGroupRef.current.visible = distSq < 54 * 54;
            }
            if (midGlbGroupRef.current) {
                midGlbGroupRef.current.visible = distSq < 88 * 88;
            }
        });

        const {
            terrainGeo,
            treeBatches,
            propBatches,
            heroLandmarks,
            glbFieldTransforms,
        } = data;

        return (
            <group position={[worldOriginX, 0, worldOriginZ]}>
                <mesh
                    geometry={terrainGeo}
                    material={sharedMaterial}
                    receiveShadow
                />

                {heroLandmarks.map((lm) => {
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
                        case 'bridge_arched':
                            return (
                                <WoodenArchedBridge
                                    key={lm.id}
                                    position={pos}
                                    rotationY={lm.rotY}
                                    scale={lm.scale}
                                />
                            );
                        default:
                            return null;
                    }
                })}

                {treeBatches.map((batch) => (
                    <ChunkInstancedBatch key={batch.key} batch={batch} />
                ))}

                {propBatches.map((batch) => (
                    <ChunkInstancedBatch key={batch.key} batch={batch} />
                ))}

                <group ref={midGlbGroupRef}>
                    <Suspense fallback={null}>
                        {glbFieldTransforms.old_tree_v1_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.oldTreeV1}
                                targetHeight={7.2}
                                transforms={glbFieldTransforms.old_tree_v1_glb}
                            />
                        )}
                        {glbFieldTransforms.old_tree_v2_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.oldTreeV2}
                                targetHeight={7.2}
                                transforms={glbFieldTransforms.old_tree_v2_glb}
                            />
                        )}
                        {glbFieldTransforms.tall_tree_v1_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.tallTreeV1}
                                targetHeight={9.6}
                                transforms={glbFieldTransforms.tall_tree_v1_glb}
                            />
                        )}
                        {glbFieldTransforms.tall_tree_v2_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.tallTreeV2}
                                targetHeight={9.6}
                                transforms={glbFieldTransforms.tall_tree_v2_glb}
                            />
                        )}
                        {glbFieldTransforms.pond_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.pond}
                                targetHeight={3.6}
                                transforms={glbFieldTransforms.pond_glb}
                                sinkOffset={-0.05}
                            />
                        )}
                        {glbFieldTransforms.rock_pillar_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.rockPillar}
                                targetHeight={3.1}
                                transforms={glbFieldTransforms.rock_pillar_glb}
                                sinkOffset={-0.08}
                            />
                        )}
                        {glbFieldTransforms.tent_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.tent}
                                targetHeight={2.35}
                                transforms={glbFieldTransforms.tent_glb}
                                sinkOffset={-0.06}
                            />
                        )}
                        {glbFieldTransforms.cart_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.woodenVehicle}
                                targetHeight={1.65}
                                transforms={glbFieldTransforms.cart_glb}
                                sinkOffset={-0.05}
                            />
                        )}
                        {glbFieldTransforms.noticeboard_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.noticeBoard}
                                targetHeight={2.35}
                                transforms={glbFieldTransforms.noticeboard_glb}
                                sinkOffset={-0.06}
                            />
                        )}
                        {glbFieldTransforms.lamp_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.streetLamp}
                                targetHeight={2.85}
                                transforms={glbFieldTransforms.lamp_glb}
                                sinkOffset={-0.06}
                            />
                        )}
                    </Suspense>
                </group>

                <group ref={detailGroupRef}>
                    <Suspense fallback={null}>
                        {glbFieldTransforms.flower_v1_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.flowerV1}
                                targetHeight={0.58}
                                transforms={glbFieldTransforms.flower_v1_glb}
                                sinkOffset={-0.03}
                            />
                        )}
                        {glbFieldTransforms.flower_v2_glb.length > 0 && (
                            <InstancedGLBField
                                url={GLB_ASSET_PATHS.flowerV2}
                                targetHeight={0.58}
                                transforms={glbFieldTransforms.flower_v2_glb}
                                sinkOffset={-0.03}
                            />
                        )}
                    </Suspense>
                </group>
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
    const lastBiomeRef = useRef<BiomeType>('memory_sanctuary');
    const [, setStreamTick] = useState(0);

    // Pre-build initial 3x3 inner grid immediately so spawn & surroundings are ready on frame 1
    useMemo(() => {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                buildChunkData(dx, dz, worldSeed);
            }
        }
    }, [worldSeed]);

    const handleChunkReady = (key: string) => {
        readyChunks.current.add(key);
        if (readyChunks.current.has('0_0')) {
            setInitialTerrainReady(true);
        }
    };

    const desiredActiveCoords = useMemo(() => {
        const list: Array<[number, number]> = [];
        for (let dx = -ACTIVE_CHUNK_RADIUS; dx <= ACTIVE_CHUNK_RADIUS; dx++) {
            for (let dz = -ACTIVE_CHUNK_RADIUS; dz <= ACTIVE_CHUNK_RADIUS; dz++) {
                list.push([activeChunkCoord[0] + dx, activeChunkCoord[1] + dz]);
            }
        }
        list.sort(
            (a, b) =>
                Math.hypot(a[0] - activeChunkCoord[0], a[1] - activeChunkCoord[1]) -
                Math.hypot(b[0] - activeChunkCoord[0], b[1] - activeChunkCoord[1])
        );
        return list;
    }, [activeChunkCoord]);

    useFrame(() => {
        const px = playerTelemetry.position[0];
        const pz = playerTelemetry.position[2];
        const cx = Math.round(px / CHUNK_SIZE);
        const cz = Math.round(pz / CHUNK_SIZE);
        if (cx !== activeChunkCoord[0] || cz !== activeChunkCoord[1]) {
            setActiveChunkCoord([cx, cz]);
            evictOldChunksIfNeeded([cx, cz], worldSeed);
        }

        const liveBiome = getBiomeSampleAt(px, pz).primary;
        if (liveBiome !== lastBiomeRef.current) {
            lastBiomeRef.current = liveBiome;
            setCurrentBiome(liveBiome);
        }

        const mat = getSharedTerrainMaterial();
        const shader = mat.userData.shader;
        if (shader) {
            const [mx, my, mz] = playerTelemetry.nearestMemoryPosition;
            shader.uniforms.uMemoryCenter.value.set(mx, my, mz);
            shader.uniforms.uRadianceStrength.value =
                playerTelemetry.nearestMemoryRadiance;
        }

        // Progressive background chunk builder (max 1 chunk per frame)
        for (let i = 0; i < desiredActiveCoords.length; i++) {
            const [qcx, qcz] = desiredActiveCoords[i];
            const key = `${qcx}_${qcz}_${worldSeed}`;
            if (!CHUNK_DATA_CACHE.has(key)) {
                buildChunkData(qcx, qcz, worldSeed);
                setStreamTick((t) => t + 1);
                break;
            }
        }
    });

    return (
        <group>
            {desiredActiveCoords.map(([cx, cz]) => {
                const key = `${cx}_${cz}_${worldSeed}`;
                const data = CHUNK_DATA_CACHE.get(key);
                if (!data) return null;
                return (
                    <TerrainChunk
                        key={key}
                        cx={cx}
                        cz={cz}
                        data={data}
                        onChunkReady={handleChunkReady}
                    />
                );
            })}
        </group>
    );
};
