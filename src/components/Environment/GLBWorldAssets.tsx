// src/components/Environment/GLBWorldAssets.tsx
import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Exact binary GLB paths from the Keepsake public/ Asset Manifest.
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
} as const;

export type GLBAssetKey = keyof typeof GLB_ASSET_PATHS;

interface NormalizedTemplate {
    scene: THREE.Group;
    unitScale: number;
    groundOffsetY: number;
}

const normalizedTemplateCache = new Map<string, NormalizedTemplate>();

/**
 * Clones and normalizes a loaded GLTF scene once per asset URL so its base sits
 * cleanly on Y = 0 and its height scales predictably to targetHeightMeters.
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
    template.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(template);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.y, size.x * 0.5, size.z * 0.5, 0.001);
    const unitScale = targetHeightMeters / maxDim;
    const groundOffsetY = -box.min.y * unitScale;

    template.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const mats = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
            mats.forEach((mat) => {
                if (
                    mat &&
                    (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial
                ) {
                    const stdMat = mat as THREE.MeshStandardMaterial;
                    stdMat.envMapIntensity = 1.05;
                    if (stdMat.map) {
                        stdMat.map.anisotropy = 4;
                    }
                }
            });
        }
    });

    const entry: NormalizedTemplate = {
        scene: template,
        unitScale,
        groundOffsetY,
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
    scale?: number;
    sinkOffset?: number;
    children?: React.ReactNode;
}

const CachedGLBInner: React.FC<CachedGLBInnerProps> = React.memo(
    ({
        url,
        targetHeight,
        position = [0, 0, 0],
        rotation = [0, 0, 0],
        scale = 1,
        sinkOffset = -0.04,
        children,
    }: CachedGLBInnerProps) => {
        const gltf = useGLTF(url, true, true, (loader) => {
            loader.setMeshoptDecoder(MeshoptDecoder);
        });

        const instanceData = useMemo(() => {
            const norm = getNormalizedGLBTemplate(
                url,
                gltf.scene,
                targetHeight
            );
            return {
                cloned: norm.scene.clone(true),
                finalScale: norm.unitScale * scale,
                yOffset: norm.groundOffsetY * scale + sinkOffset,
            };
        }, [url, gltf.scene, targetHeight, scale, sinkOffset]);

        return (
            <group position={position} rotation={rotation}>
                <primitive
                    object={instanceData.cloned}
                    scale={instanceData.finalScale}
                    position={[0, instanceData.yOffset, 0]}
                />
                {children}
            </group>
        );
    }
);

export interface GLBAssetInstanceProps {
    url: string;
    targetHeight: number;
    position?: [number, number, number];
    rotationY?: number;
    rotation?: [number, number, number];
    scale?: number;
    sinkOffset?: number;
    fallback?: React.ReactNode;
    children?: React.ReactNode;
}

/**
 * Safe, cached GLB model renderer with automatic Draco + Meshopt decoding,
 * bounding-box ground alignment, and procedural fallback support.
 */
export const CachedGLBAsset: React.FC<GLBAssetInstanceProps> = React.memo(
    ({
        url,
        targetHeight,
        position = [0, 0, 0],
        rotationY = 0,
        rotation,
        scale = 1,
        sinkOffset = -0.04,
        fallback = null,
        children,
    }: GLBAssetInstanceProps) => {
        const rot: [number, number, number] = rotation || [0, rotationY, 0];

        return (
            <GLBModelErrorBoundary fallback={fallback}>
                <Suspense fallback={fallback}>
                    <CachedGLBInner
                        url={url}
                        targetHeight={targetHeight}
                        position={position}
                        rotation={rot}
                        scale={scale}
                        sinkOffset={sinkOffset}
                    >
                        {children}
                    </CachedGLBInner>
                </Suspense>
            </GLBModelErrorBoundary>
        );
    }
);

/**
 * Staggered non-blocking preload of core world GLB assets after initial canvas mount
 */
if (typeof window !== 'undefined') {
    window.setTimeout(() => {
        const priorityPaths = [
            GLB_ASSET_PATHS.hugeTree,
            GLB_ASSET_PATHS.hugeTreeGreen,
            GLB_ASSET_PATHS.pedestalV1,
            GLB_ASSET_PATHS.pedestalV2,
            GLB_ASSET_PATHS.pedestalV3,
            GLB_ASSET_PATHS.entranceJapanese,
            GLB_ASSET_PATHS.rockEntrance,
            GLB_ASSET_PATHS.rockHouse,
            GLB_ASSET_PATHS.rockPillar,
            GLB_ASSET_PATHS.streetLamp,
            GLB_ASSET_PATHS.noticeBoard,
            GLB_ASSET_PATHS.tent,
            GLB_ASSET_PATHS.woodenVehicle,
            GLB_ASSET_PATHS.flowerV1,
            GLB_ASSET_PATHS.flowerV2,
        ];
        priorityPaths.forEach((path, idx) => {
            window.setTimeout(() => {
                useGLTF.preload(path, true, true, (loader) => {
                    loader.setMeshoptDecoder(MeshoptDecoder);
                });
            }, idx * 120);
        });
    }, 900);
}