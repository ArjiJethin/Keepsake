// src/components/Environment/InstancedGLBField.tsx
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

interface ExtractedPrimitive {
    geometry: THREE.BufferGeometry;
    material: THREE.Material | THREE.Material[];
    localMatrix: THREE.Matrix4;
}

interface CachedInstancedTemplate {
    primitives: ExtractedPrimitive[];
    normalizationMatrix: THREE.Matrix4;
}

const INSTANCED_TEMPLATE_CACHE = new Map<string, CachedInstancedTemplate>();

function getOrExtractInstancedTemplate(
    url: string,
    rawScene: THREE.Group,
    targetHeight: number,
    sinkOffset: number
): CachedInstancedTemplate {
    const cacheKey = `${url}|${targetHeight.toFixed(2)}|${sinkOffset.toFixed(3)}`;
    const existing = INSTANCED_TEMPLATE_CACHE.get(cacheKey);
    if (existing) return existing;

    const clone = rawScene.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.y, size.x * 0.55, size.z * 0.55, 0.001);
    const unitScale = targetHeight / maxDim;
    const offsetX = -center.x * unitScale;
    const offsetY = -box.min.y * unitScale + sinkOffset;
    const offsetZ = -center.z * unitScale;

    const normMatrix = new THREE.Matrix4().compose(
        new THREE.Vector3(offsetX, offsetY, offsetZ),
        new THREE.Quaternion(),
        new THREE.Vector3(unitScale, unitScale, unitScale)
    );

    const primitives: ExtractedPrimitive[] = [];

    clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (!mesh.geometry) return;

            if (!mesh.geometry.boundingSphere) {
                mesh.geometry.computeBoundingSphere();
            }

            const mats = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
            mats.forEach((mat) => {
                if (
                    mat &&
                    (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial
                ) {
                    const std = mat as THREE.MeshStandardMaterial;
                    std.envMapIntensity = 1.0;
                    if (std.map) {
                        std.map.anisotropy = 2;
                    }
                }
            });

            primitives.push({
                geometry: mesh.geometry,
                material: mesh.material,
                localMatrix: mesh.matrixWorld.clone(),
            });
        }
    });

    const template: CachedInstancedTemplate = {
        primitives,
        normalizationMatrix: normMatrix,
    };
    INSTANCED_TEMPLATE_CACHE.set(cacheKey, template);
    return template;
}

export interface InstancedGLBFieldProps {
    url: string;
    targetHeight: number;
    transforms: THREE.Matrix4[];
    sinkOffset?: number;
}

const PrimitiveInstancedLayer: React.FC<{
    primitive: ExtractedPrimitive;
    normalizationMatrix: THREE.Matrix4;
    transforms: THREE.Matrix4[];
    castShadow: boolean;
}> = React.memo(
    ({ primitive, normalizationMatrix, transforms, castShadow }) => {
        const meshRef = useRef<THREE.InstancedMesh>(null);

        useLayoutEffect(() => {
            const inst = meshRef.current;
            if (!inst || transforms.length === 0) return;

            const combinedLocal = new THREE.Matrix4().multiplyMatrices(
                normalizationMatrix,
                primitive.localMatrix
            );
            const finalMat = new THREE.Matrix4();

            for (let i = 0; i < transforms.length; i++) {
                finalMat.multiplyMatrices(transforms[i], combinedLocal);
                inst.setMatrixAt(i, finalMat);
            }

            inst.instanceMatrix.needsUpdate = true;
            inst.computeBoundingSphere();
        }, [primitive, normalizationMatrix, transforms]);

        if (transforms.length === 0) return null;

        return (
            <instancedMesh
                ref={meshRef}
                args={[
                    primitive.geometry,
                    primitive.material,
                    transforms.length,
                ]}
                castShadow={castShadow}
                receiveShadow
                frustumCulled={true}
            />
        );
    }
);

export const InstancedGLBField: React.FC<InstancedGLBFieldProps> = React.memo(
    ({ url, targetHeight, transforms, sinkOffset = -0.04 }) => {
        const gltf = useGLTF(url, true, true, (loader) => {
            loader.setMeshoptDecoder(MeshoptDecoder);
        });

        const template = useMemo(
            () =>
                getOrExtractInstancedTemplate(
                    url,
                    gltf.scene,
                    targetHeight,
                    sinkOffset
                ),
            [url, gltf.scene, targetHeight, sinkOffset]
        );

        const shouldCastShadow = targetHeight >= 2.5;

        if (transforms.length === 0) return null;

        return (
            <group>
                {template.primitives.map((prim, idx) => (
                    <PrimitiveInstancedLayer
                        key={`${url}_prim_${idx}`}
                        primitive={prim}
                        normalizationMatrix={template.normalizationMatrix}
                        transforms={transforms}
                        castShadow={shouldCastShadow}
                    />
                ))}
            </group>
        );
    }
);
