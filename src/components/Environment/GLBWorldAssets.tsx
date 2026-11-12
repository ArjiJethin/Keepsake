// src/components/Environment/GLBWorldAssets.tsx
import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * World asset paths switched to the original master GLB assets in `public/models/`.
 * Every path matches the exact directory and filename structure in `public/models/`.
 */
export const GLB_ASSET_PATHS = {
    femaleCharacter: '/KeepSakeFemale-v2-animated.glb',
    maleCharacter: '/KeepSakeMale-v2-animated.glb',
    pedestalV1: '/models/MemElements/Pedestals/KeepSakePedestalV1-v1.glb',
    pedestalV2: '/models/MemElements/Pedestals/KeepSakePedestalV2-v1.glb',
    pedestalV3: '/models/MemElements/Pedestals/KeepSakePedestalV3-v1.glb',
    noticeBoard: '/models/MemElements/KeepSakeNoticeBoard.glb',
    streetLamp: '/models/MemElements/StreetLamp/KeepSakeLamp-v1.glb',
    tent: '/models/Props/KeepSakeTent.glb',
    woodenVehicle: '/models/Props/KeepSakeWoodenVehicle.glb',
    entranceJapanese: '/models/Structures/KeepSakeEntranceJapanese.glb',
    rockEntrance: '/models/Structures/KeepSakeRockEntrance.glb',
    rockHouse: '/models/Structures/KeepSakeRockHouse-compressed.glb',
    rockPillar: '/models/Structures/KeepSakeRockPiller.glb',
    flowerV1: '/models/Vegetation/Flowers/KeepSakeFlower-v1.glb',
    flowerV2: '/models/Vegetation/Flowers/KeepSakeFlowerV2-v1.glb',
    hugeTree: '/models/Vegetation/KeepSakeHugeTree.glb',
    hugeTreeGreen: '/models/Vegetation/KeepSakeHugeTreeGreen.glb',
    grass: '/models/Vegetation/KeepSakeGrass.glb',
    grassBush: '/models/Vegetation/KeepSakeGrassBush.glb',
    pond: '/models/Vegetation/KeepSakePond.glb',
    oldTreeV1: '/models/Vegetation/KeepSakeOldTreeV1.glb',
    oldTreeV2: '/models/Vegetation/KeepSakeOldTreeV2.glb',
    tallTreeV1: '/models/Vegetation/KeepSakeTallTreeV1.glb',
    tallTreeV2: '/models/Vegetation/KeepSakeTallTreeV2.glb',
} as const;

export type GLBAssetKey = keyof typeof GLB_ASSET_PATHS;

interface NormalizedTemplate {
    scene: THREE.Group;
    unitScale: number;
    groundOffsetY: number;
    centerOffsetX: number;
    centerOffsetZ: number;
}

const normalizedTemplateCache = new Map<string, NormalizedTemplate>();

/**
 * Normalizes a loaded master GLTF scene once per asset URL so its base sits
 * cleanly on Y = 0, its horizontal bounding box center aligns to (0, 0), and all
 * child meshes have precomputed bounding spheres for hardware frustum culling.
 */
function getNormalizedGLBTemplate(
    url: string,
    rawScene: THREE.Group,
    targetHeightMeters: number
): NormalizedTemplate {
    const cacheKey = `${url}_${targetHeightMeters.toFixed(2)}`;
    const cached = normalizedTemplateCache.get(cacheKey);
    if (cached) return cached;

    const template = rawScene.clone(true);
    template.position.set(0, 0, 0);
    template.rotation.set(0, 0, 0);
    template.scale.set(1, 1, 1);
    template.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(template);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.y, size.x * 0.55, size.z * 0.55, 0.001);
    const unitScale = targetHeightMeters / maxDim;
    const groundOffsetY = -box.min.y * unitScale;
    const centerOffsetX = -center.x * unitScale;
    const centerOffsetZ = -center.z * unitScale;

    // Only cast shadows from large hero landmarks (>= 2.8m) so 7-9MB master meshes
    // do not bottleneck the shadow map pass.
    const shouldCastShadow = targetHeightMeters >= 2.8;

    template.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = shouldCastShadow;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;

            if (mesh.geometry) {
                if (!mesh.geometry.boundingBox) {
                    mesh.geometry.computeBoundingBox();
                }
                if (!mesh.geometry.boundingSphere) {
                    mesh.geometry.computeBoundingSphere();
                }
            }

            const mats = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
            mats.forEach((mat) => {
                if (
                    mat &&
                    (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial
                ) {
                    const stdMat = mat as THREE.MeshStandardMaterial;
                    stdMat.envMapIntensity = 1.0;
                    if (stdMat.map) {
                        stdMat.map.anisotropy = 2;
                        stdMat.map.generateMipmaps = true;
                    }
                }
            });
        }
    });

    const entry: NormalizedTemplate = {
        scene: template,
        unitScale,
        groundOffsetY,
        centerOffsetX,
        centerOffsetZ,
    };
    normalizedTemplateCache.set(cacheKey, entry);
    return entry;
}

class GLBModelErrorBoundary extends React.Component<
    {
        fallback: React.ReactNode;
        children: React.ReactNode;
    },
    { hasError: boolean }
> {
    constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

interface CachedGLBInnerProps {
    url: string;
    targetHeight: number;
    position?: [number, number, number];
    rotation?: [number, number, number];
    rotationY?: number;
    scale?: number;
    sinkOffset?: number;
    children?: React.ReactNode;
}

const CachedGLBInner: React.FC<CachedGLBInnerProps> = React.memo(
    ({
        url,
        targetHeight,
        position = [0, 0, 0],
        rotation,
        rotationY,
        scale = 1,
        sinkOffset = -0.04,
        children,
    }: CachedGLBInnerProps) => {
        const gltf = useGLTF(url, true, true, (loader) => {
            loader.setMeshoptDecoder(MeshoptDecoder);
        });

        const {
            clonedInstance,
            finalScale,
            finalOffsetX,
            finalOffsetY,
            finalOffsetZ,
        } = useMemo(() => {
            const norm = getNormalizedGLBTemplate(
                url,
                gltf.scene,
                targetHeight
            );
            const instance = norm.scene.clone(true);
            return {
                clonedInstance: instance,
                finalScale: norm.unitScale * scale,
                finalOffsetX: norm.centerOffsetX * scale,
                finalOffsetY: norm.groundOffsetY * scale + sinkOffset,
                finalOffsetZ: norm.centerOffsetZ * scale,
            };
        }, [url, gltf.scene, targetHeight, scale, sinkOffset]);

        const rot: [number, number, number] = rotation ?? [0, rotationY ?? 0, 0];

        return (
            <group position={position} rotation={rot}>
                <primitive
                    object={clonedInstance}
                    scale={finalScale}
                    position={[finalOffsetX, finalOffsetY, finalOffsetZ]}
                />
                {children}
            </group>
        );
    }
);

export interface CachedGLBAssetProps extends CachedGLBInnerProps {
    fallback?: React.ReactNode;
}

export const CachedGLBAsset: React.FC<CachedGLBAssetProps> = React.memo(
    ({ fallback = null, ...props }) => {
        return (
            <GLBModelErrorBoundary fallback={fallback}>
                <Suspense fallback={fallback}>
                    <CachedGLBInner {...props} />
                </Suspense>
            </GLBModelErrorBoundary>
        );
    }
);

/**
 * Tiered Idle Preloader for Master `public/models/` Assets:
 * Because the master files in `public/models/` are 2MB–9.7MB each (~76MB total),
 * we preload them progressively with wide spacing during browser idle windows
 * so decoding never blocks the main thread or causes frame drops while moving.
 */
if (typeof window !== 'undefined') {
    const preloadAssets = [
        // Tier 1: Spawn Village core structures & trees
        GLB_ASSET_PATHS.rockHouse,
        GLB_ASSET_PATHS.hugeTree,
        GLB_ASSET_PATHS.hugeTreeGreen,
        GLB_ASSET_PATHS.entranceJapanese,
        GLB_ASSET_PATHS.rockEntrance,
        GLB_ASSET_PATHS.pond,
        // Tier 2: Pedestals & Village props
        GLB_ASSET_PATHS.pedestalV1,
        GLB_ASSET_PATHS.pedestalV2,
        GLB_ASSET_PATHS.pedestalV3,
        GLB_ASSET_PATHS.tent,
        GLB_ASSET_PATHS.woodenVehicle,
        GLB_ASSET_PATHS.noticeBoard,
        GLB_ASSET_PATHS.streetLamp,
        // Tier 3: Biome trees, pillars & flowers
        GLB_ASSET_PATHS.oldTreeV1,
        GLB_ASSET_PATHS.oldTreeV2,
        GLB_ASSET_PATHS.tallTreeV1,
        GLB_ASSET_PATHS.tallTreeV2,
        GLB_ASSET_PATHS.rockPillar,
        GLB_ASSET_PATHS.flowerV1,
        GLB_ASSET_PATHS.flowerV2,
    ];

    preloadAssets.forEach((assetUrl, index) => {
        window.setTimeout(() => {
            const triggerPreload = () => {
                useGLTF.preload(assetUrl, true, true, (loader) => {
                    loader.setMeshoptDecoder(MeshoptDecoder);
                });
            };
            const win = window as Window & {
                requestIdleCallback?: (cb: () => void) => number;
            };
            if (typeof win.requestIdleCallback === 'function') {
                win.requestIdleCallback(triggerPreload);
            } else {
                triggerPreload();
            }
        }, 700 + index * 420);
    });
}
