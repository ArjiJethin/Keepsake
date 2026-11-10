// src/scenes/Environment/ChunkedTerrain.tsx
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import {
    ACTIVE_CHUNK_RADIUS,
    CHUNK_SEGMENTS,
    CHUNK_SIZE,
    createSculptedFacetedGeometry,
    getGardenTerrainHeight,
    getGardenTerrainNormal,
    getPathCenterX,
    hash2D,
    seededRandom,
} from './lowPolyUtils';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import {
    collisionManager,
    type SolidCollider,
} from '../../systems/Collision/collisionSystem';

const SHARED_GEOMETRIES = {
    trunk: new THREE.CylinderGeometry(0.18, 0.36, 2.2, 6),
    pineTier1: new THREE.ConeGeometry(1.35, 1.9, 7),
    pineTier2: new THREE.ConeGeometry(1.05, 1.65, 7),
    pineTier3: new THREE.ConeGeometry(0.72, 1.35, 7),
    canopyMain: createSculptedFacetedGeometry(1.35, 1, [1.15, 0.9, 1.1], 0.16, 12),
    canopySub: createSculptedFacetedGeometry(0.95, 1, [1.1, 0.85, 1.05], 0.18, 29),
    boulder: createSculptedFacetedGeometry(0.85, 1, [1.3, 0.82, 1.15], 0.22, 41, true),
    fallenLog: new THREE.CylinderGeometry(0.22, 0.26, 2.6, 6),
    steppingStone: new THREE.CylinderGeometry(0.68, 0.78, 0.14, 7),
    grassBlade: new THREE.ConeGeometry(0.08, 0.42, 4),
    flowerHead: new THREE.CylinderGeometry(0.16, 0.08, 0.06, 5),
};

// Custom Shader Injection for Localized Memory Radiance on Terrain
const injectMemoryRadianceShader = (
    shader: THREE.WebGLProgramParametersWithUniforms
) => {
    shader.uniforms.uMemoryCount = { value: 0 };
    shader.uniforms.uMemoryCenters = { value: new Float32Array(16 * 3) };
    shader.uniforms.uMemoryRadiance = { value: new Float32Array(16) };
    shader.uniforms.uMemoryColors = { value: new Float32Array(16 * 3) };

    shader.vertexShader = `
    varying vec3 vWorldPosition;
    ${shader.vertexShader}
  `.replace(
        '#include <worldpos_vertex>',
        `
    #include <worldpos_vertex>
    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
    `
    );

    shader.fragmentShader = `
    varying vec3 vWorldPosition;
    uniform int uMemoryCount;
    uniform vec3 uMemoryCenters[16];
    uniform float uMemoryRadiance[16];
    uniform vec3 uMemoryColors[16];
    ${shader.fragmentShader}
  `.replace(
        '#include <dithering_fragment>',
        `
    #include <dithering_fragment>
    // Localized Memory Radiance Enrichment
    for (int i = 0; i < 16; i++) {
      if (i >= uMemoryCount) break;
      float d = distance(vWorldPosition.xz, uMemoryCenters[i].xz);
      float rad = uMemoryRadiance[i];
      if (d < 14.0 && rad > 0.01) {
        float falloff = smoothstep(14.0, 1.5, d) * rad;
        // Lift saturation & add warm golden peach ground glow
        vec3 glow = uMemoryColors[i] * falloff * 0.42;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 1.35 + glow, falloff * 0.75);
      }
    }
    `
    );
};

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
    type: 'rock' | 'log' | 'stone';
    color: string;
}

interface TerrainChunkProps {
    cx: number;
    cz: number;
}

const TerrainChunk: React.FC<TerrainChunkProps> = React.memo(({ cx, cz }) => {
    const chunkKey = `${cx}_${cz}`;
    const worldOriginX = cx * CHUNK_SIZE;
    const worldOriginZ = cz * CHUNK_SIZE;

    const grassMeshRef = useRef<THREE.InstancedMesh>(null);
    const flowerMeshRef = useRef<THREE.InstancedMesh>(null);
    const terrainMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

    // 1. Synchronized Seamless Heightmap Generation
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

        const cShadow = new THREE.Color(THEME.colors.meadowShadow);
        const cBase = new THREE.Color(THEME.colors.meadowBase);
        const cSunlit = new THREE.Color(THEME.colors.meadowSunlit);
        const cPath = new THREE.Color('#7d7956');
        const temp = new THREE.Color();

        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const lz = pos.getZ(i);
            const wx = lx + worldOriginX;
            const wz = lz + worldOriginZ;

            const wy = getGardenTerrainHeight(wx, wz);
            pos.setY(i, wy);

            const sunBlend = THREE.MathUtils.clamp(
                0.5 + wy * 0.09 + Math.sin(wx * 0.08 - wz * 0.06) * 0.22,
                0,
                1
            );
            temp.copy(cBase).lerp(cSunlit, sunBlend * 0.78);

            if (wy < -0.25) {
                temp.lerp(cShadow, Math.min(Math.abs(wy + 0.25) * 0.4, 0.55));
            }

            const distToPath = Math.abs(wx - getPathCenterX(wz));
            if (distToPath < 2.2) {
                temp.lerp(cPath, (1 - distToPath / 2.2) * 0.42);
            }

            colors[i * 3] = temp.r;
            colors[i * 3 + 1] = temp.g;
            colors[i * 3 + 2] = temp.b;
        }

        nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        nonIndexed.computeVertexNormals();
        return nonIndexed;
    }, [worldOriginX, worldOriginZ]);

    // 2. Exact Ground Height Sampling for Props
    const { trees, propsList, grassTransforms, flowerTransforms, colliders } =
        useMemo(() => {
            const generatedTrees: TreeData[] = [];
            const generatedProps: PropData[] = [];
            const generatedColliders: SolidCollider[] = [];
            const grassMatrices: THREE.Matrix4[] = [];
            const flowerMatrices: THREE.Matrix4[] = [];

            const dummy = new THREE.Object3D();

            // Pathway stones
            const zStart = worldOriginZ - CHUNK_SIZE / 2;
            const zEnd = worldOriginZ + CHUNK_SIZE / 2;
            const stepSpacing = 1.65;
            const firstStepIdx = Math.ceil(zStart / stepSpacing);
            const lastStepIdx = Math.floor(zEnd / stepSpacing);

            for (let sIdx = firstStepIdx; sIdx <= lastStepIdx; sIdx++) {
                const wz = sIdx * stepSpacing;
                const pathX = getPathCenterX(wz);
                const lateralJitter =
                    (sIdx % 2 === 0 ? 0.26 : -0.26) +
                    (seededRandom(sIdx * 19.3) - 0.5) * 0.18;
                const wx = pathX + lateralJitter;

                if (
                    wx >= worldOriginX - CHUNK_SIZE / 2 &&
                    wx < worldOriginX + CHUNK_SIZE / 2
                ) {
                    const wy = getGardenTerrainHeight(wx, wz) + 0.04;
                    const norm = getGardenTerrainNormal(wx, wz);

                    generatedProps.push({
                        id: `stone_${chunkKey}_${sIdx}`,
                        x: wx - worldOriginX,
                        y: wy,
                        z: wz - worldOriginZ,
                        scale: [
                            0.95 + seededRandom(sIdx * 7) * 0.35,
                            1,
                            0.8 + seededRandom(sIdx * 13) * 0.25,
                        ],
                        rot: [norm.z * 0.2, seededRandom(sIdx * 29) * Math.PI, -norm.x * 0.2],
                        type: 'stone',
                        color:
                            sIdx % 3 === 0 ? THEME.colors.stoneSunlit : THEME.colors.stoneBase,
                    });
                }
            }

            // Clustered Trees
            const treeSlots = 18;
            for (let i = 0; i < treeSlots; i++) {
                const seed = hash2D(cx * 37 + i, cz * 53 + i, 101);
                const lx = (hash2D(cx, cz, i * 11 + 1) - 0.5) * (CHUNK_SIZE - 4);
                const lz = (hash2D(cx, cz, i * 11 + 2) - 0.5) * (CHUNK_SIZE - 4);
                const wx = worldOriginX + lx;
                const wz = worldOriginZ + lz;

                if (Math.abs(wx - getPathCenterX(wz)) < 3.6) continue;
                if (Math.hypot(wx - 0, wz - 7.5) < 4.5) continue;
                if (Math.hypot(wx - 6.2, wz - 2.2) < 5.2) continue;
                if (Math.hypot(wx + 6.8, wz + 3.5) < 5.0) continue;

                const groveDensity =
                    Math.sin(wx * 0.065) * Math.cos(wz * 0.065) * 0.5 + 0.5;
                if (seed > groveDensity + 0.32) continue;

                const wy = getGardenTerrainHeight(wx, wz);
                const scale = 0.78 + seededRandom(seed * 97) * 0.75;
                const speciesRoll = seededRandom(seed * 43);
                const species: TreeData['species'] =
                    speciesRoll < 0.34
                        ? 'sakura'
                        : speciesRoll < 0.68
                            ? 'oak'
                            : 'pine';

                generatedTrees.push({
                    id: `tree_${chunkKey}_${i}`,
                    x: lx,
                    y: wy,
                    z: lz,
                    scale,
                    rotY: seededRandom(seed * 61) * Math.PI * 2,
                    species,
                });

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

            // Boulders & Fallen Logs
            const rockCount = 11;
            for (let r = 0; r < rockCount; r++) {
                const rSeed = hash2D(cx * 19 + r, cz * 29 + r, 303);
                const lx = (hash2D(cx, cz, r * 17 + 70) - 0.5) * (CHUNK_SIZE - 3);
                const lz = (hash2D(cx, cz, r * 17 + 71) - 0.5) * (CHUNK_SIZE - 3);
                const wx = worldOriginX + lx;
                const wz = worldOriginZ + lz;

                if (Math.abs(wx - getPathCenterX(wz)) < 2.5) continue;
                if (Math.hypot(wx, wz - 7.5) < 3.5) continue;

                const wy = getGardenTerrainHeight(wx, wz);
                const isFallenLog = r % 5 === 0 && rSeed > 0.35;

                if (isFallenLog) {
                    const logScale = 0.75 + rSeed * 0.45;
                    generatedProps.push({
                        id: `log_${chunkKey}_${r}`,
                        x: lx,
                        y: wy + 0.14,
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
                    generatedColliders.push({
                        id: `col_log_${chunkKey}_${r}`,
                        x: wx,
                        y: wy,
                        z: wz,
                        radius: 0.65 * logScale,
                        height: 0.65,
                        blocksCamera: false,
                    });
                } else {
                    const sx = 0.6 + rSeed * 0.9;
                    const sy = 0.5 + seededRandom(rSeed * 13) * 0.65;
                    const sz = 0.6 + seededRandom(rSeed * 29) * 0.85;
                    generatedProps.push({
                        id: `rock_${chunkKey}_${r}`,
                        x: lx,
                        y: wy - 0.08,
                        z: lz,
                        scale: [sx, sy, sz],
                        rot: [0, rSeed * Math.PI * 2, 0],
                        type: 'rock',
                        color:
                            r % 2 === 0 ? THEME.colors.stoneBase : THEME.colors.stoneSunlit,
                    });

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

            // Instanced Grass & Wildflowers (Perfect Normal Alignment)
            const grassCount = 150;
            for (let g = 0; g < grassCount; g++) {
                const lx = (hash2D(cx, cz, g * 3 + 500) - 0.5) * CHUNK_SIZE;
                const lz = (hash2D(cx, cz, g * 3 + 501) - 0.5) * CHUNK_SIZE;
                const wx = worldOriginX + lx;
                const wz = worldOriginZ + lz;

                if (Math.abs(wx - getPathCenterX(wz)) < 1.35) continue;

                const wy = getGardenTerrainHeight(wx, wz);
                const norm = getGardenTerrainNormal(wx, wz);
                const s = 0.65 + hash2D(cx, cz, g * 3 + 502) * 0.85;

                dummy.position.set(lx, wy + 0.16 * s, lz);
                dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
                dummy.rotateY(seededRandom(g * 13) * Math.PI * 2);
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();
                grassMatrices.push(dummy.matrix.clone());

                if (g % 5 === 0) {
                    dummy.position.set(lx, wy + 0.34 * s, lz);
                    dummy.scale.set(s * 0.9, s * 0.9, s * 0.9);
                    dummy.updateMatrix();
                    flowerMatrices.push(dummy.matrix.clone());
                }
            }

            return {
                trees: generatedTrees,
                propsList: generatedProps,
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
    }, [grassTransforms, flowerTransforms]);

    // Update Memory Radiance Shader Uniforms dynamically
    useFrame(() => {
        if (!terrainMaterialRef.current?.userData?.shader) return;
        const shader = terrainMaterialRef.current.userData.shader;
        const persistentMemories = useGameStore.getState().persistentMemories;

        const count = Math.min(16, persistentMemories.length);
        shader.uniforms.uMemoryCount.value = count;

        const centers = shader.uniforms.uMemoryCenters.value;
        const radiance = shader.uniforms.uMemoryRadiance.value;
        const colors = shader.uniforms.uMemoryColors.value;

        const px = playerTelemetry.position[0];
        const pz = playerTelemetry.position[2];

        for (let i = 0; i < count; i++) {
            const m = persistentMemories[i];
            centers[i * 3 + 0] = m.position[0];
            centers[i * 3 + 1] = m.position[1];
            centers[i * 3 + 2] = m.position[2];

            const dist = Math.hypot(px - m.position[0], pz - m.position[2]);
            const isAwakened = m.interactionState === 'awakened';
            // Base gentle radiance, with localized surge when player approaches
            const surge = dist < 14 ? Math.pow(1 - dist / 14, 1.4) * 0.85 : 0;
            radiance[i] = (isAwakened ? 0.9 : 0.45) + surge;

            colors[i * 3 + 0] = 1.0;
            colors[i * 3 + 1] = 0.82;
            colors[i * 3 + 2] = 0.44;
        }
    });

    useEffect(() => {
        collisionManager.registerChunk(chunkKey, colliders);
        return () => {
            collisionManager.unregisterChunk(chunkKey);
            terrainGeo.dispose();
        };
    }, [chunkKey, colliders, terrainGeo]);

    return (
        <group position={[worldOriginX, 0, worldOriginZ]}>
            <mesh geometry={terrainGeo} receiveShadow>
                <meshStandardMaterial
                    ref={terrainMaterialRef}
                    vertexColors
                    roughness={0.92}
                    metalness={0.02}
                    flatShading
                    onBeforeCompile={(shader) => {
                        injectMemoryRadianceShader(shader);
                        if (terrainMaterialRef.current) {
                            terrainMaterialRef.current.userData.shader = shader;
                        }
                    }}
                />
            </mesh>

            {trees.map((t) => (
                <group
                    key={t.id}
                    position={[t.x, t.y, t.z]}
                    rotation={[0, t.rotY, 0]}
                    scale={t.scale}
                >
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
                </group>
            ))}

            {propsList.map((p) => (
                <mesh
                    key={p.id}
                    geometry={
                        p.type === 'rock'
                            ? SHARED_GEOMETRIES.boulder
                            : p.type === 'log'
                                ? SHARED_GEOMETRIES.fallenLog
                                : SHARED_GEOMETRIES.steppingStone
                    }
                    position={[p.x, p.y, p.z]}
                    rotation={p.rot}
                    scale={p.scale}
                    castShadow={p.type !== 'stone'}
                    receiveShadow
                >
                    <meshStandardMaterial
                        color={p.color}
                        roughness={0.88}
                        flatShading
                    />
                </mesh>
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
});

export const ChunkedTerrain: React.FC = () => {
    const activeChunkCoord = useGameStore((state) => state.activeChunkCoord);
    const setActiveChunkCoord = useGameStore((state) => state.setActiveChunkCoord);
    const setWorldReady = useGameStore((state) => state.setWorldReady);

    useFrame(() => {
        const px = playerTelemetry.position[0];
        const pz = playerTelemetry.position[2];
        const cx = Math.round(px / CHUNK_SIZE);
        const cz = Math.round(pz / CHUNK_SIZE);
        if (cx !== activeChunkCoord[0] || cz !== activeChunkCoord[1]) {
            setActiveChunkCoord([cx, cz]);
        }
    });

    const visibleChunks = useMemo(() => {
        const coords: Array<[number, number]> = [];
        for (
            let dx = -ACTIVE_CHUNK_RADIUS;
            dx <= ACTIVE_CHUNK_RADIUS;
            dx++
        ) {
            for (
                let dz = -ACTIVE_CHUNK_RADIUS;
                dz <= ACTIVE_CHUNK_RADIUS;
                dz++
            ) {
                coords.push([activeChunkCoord[0] + dx, activeChunkCoord[1] + dz]);
            }
        }
        return coords;
    }, [activeChunkCoord]);

    // Mark world ready once initial chunks are computed
    useEffect(() => {
        setWorldReady(true);
    }, [setWorldReady]);

    return (
        <group>
            {visibleChunks.map(([cx, cz]) => (
                <TerrainChunk key={`${cx}_${cz}`} cx={cx} cz={cz} />
            ))}
        </group>
    );
};