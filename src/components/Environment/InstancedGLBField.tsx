// src/components/Environment/InstancedGLBField.tsx
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface GLBInstancedPart {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    matrix: THREE.Matrix4;
}

const instancedPartsCache = new Map<string, GLBInstancedPart[]>();

/**
 * Extracts the normalized geometry of a GLB into parts that can each be drawn
 * with one InstancedMesh instead of cloning the whole model per scattered copy.
 */
export function useInstancedGLBParts(
    url: string,
    targetHeight: number
): GLBInstancedPart[] {
    const gltf = useGLTF(url, true, true, (loader) => {
        loader.setMeshoptDecoder(MeshoptDecoder);
    });

    return useMemo(() => {
        const cacheKey = `${url}_${targetHeight}`;
        const cached = instancedPartsCache.get(cacheKey);
        if (cached) return cached;

        const root = gltf.scene;
        root.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);

        const maxDim = Math.max(size.y, size.x * 0.5, size.z * 0.5, 0.001);
        const unitScale = targetHeight / maxDim;

        const normalize = new THREE.Matrix4()
            .makeScale(unitScale, unitScale, unitScale)
            .setPosition(0, -box.min.y * unitScale, 0);

        const parts: GLBInstancedPart[] = [];
        root.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            parts.push({
                geometry: mesh.geometry,
                material: (Array.isArray(mesh.material)
                    ? mesh.material[0]
                    : mesh.material) as THREE.Material,
                matrix: new THREE.Matrix4().multiplyMatrices(
                    normalize,
                    mesh.matrixWorld
                ),
            });
        });

        instancedPartsCache.set(cacheKey, parts);
        return parts;
    }, [gltf.scene, url, targetHeight]);
}

interface InstancedPartMeshProps {
    part: GLBInstancedPart;
    transforms: THREE.Matrix4[];
    castShadow: boolean;
}

const InstancedPartMesh: React.FC<InstancedPartMeshProps> = React.memo(
    ({ part, transforms, castShadow }: InstancedPartMeshProps) => {
        const meshRef = useRef<THREE.InstancedMesh>(null);
        const scratch = useMemo(() => new THREE.Matrix4(), []);

        useLayoutEffect(() => {
            const mesh = meshRef.current;
            if (!mesh) return;
            for (let i = 0; i < transforms.length; i++) {
                scratch.multiplyMatrices(transforms[i], part.matrix);
                mesh.setMatrixAt(i, scratch);
            }
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
        }, [part, transforms, scratch]);

        if (transforms.length === 0) return null;

        return (
            <instancedMesh
                ref={meshRef}
                args={[part.geometry, part.material, transforms.length]}
                castShadow={castShadow}
                receiveShadow
            />
        );
    }
);

InstancedPartMesh.displayName = 'InstancedPartMesh';

export interface InstancedGLBFieldProps {
    url: string;
    targetHeight: number;
    transforms: THREE.Matrix4[];
    castShadow?: boolean;
}

/**
 * Draws many copies of one GLB with a single instanced draw call per mesh.
 */
export const InstancedGLBField: React.FC<InstancedGLBFieldProps> = React.memo(
    ({ url, targetHeight, transforms, castShadow = false }: InstancedGLBFieldProps) => {
        const parts = useInstancedGLBParts(url, targetHeight);

        return (
            <group>
                {parts.map((part, idx) => (
                    <InstancedPartMesh
                        key={`${url}-part-${idx}`}
                        part={part}
                        transforms={transforms}
                        castShadow={castShadow}
                    />
                ))}
            </group>
        );
    }
);

InstancedGLBField.displayName = 'InstancedGLBField';
