// src/components/CharacterSelect/CharacterPreview.tsx
import React, { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { CharacterArchetype } from '../../store/useGameStore';

const FEMALE_PREVIEW_PATH = '/KeepSakeFemale-v2-animated.glb';
const MALE_PREVIEW_PATH = '/KeepSakeMale-v2-animated.glb';

// Both wanderers share the same authored scale and native ~0.979m bounding height
const PREVIEW_SCALE = 1.78;
const PREVIEW_FOOT_OFFSET = 0.871;

export type CharacterPreviewMode = 'portrait' | 'upper';

interface CameraSetup {
    position: [number, number, number];
    lookAt: [number, number, number];
    fov: number;
}

const CAMERA_SETUPS: Record<CharacterPreviewMode, CameraSetup> = {
    // Full-body portrait
    portrait: { position: [0, 1.02, 4.35], lookAt: [0, 0.68, 0], fov: 30 },
    // Waist-up close-up so the walk cycle reads clearly
    upper: { position: [0, 1.52, 1.85], lookAt: [0, 1.24, 0], fov: 36 },
};

const PreviewCamera: React.FC<{ mode: CharacterPreviewMode }> = ({ mode }) => {
    const camera = useThree((state) => state.camera);
    const setup = CAMERA_SETUPS[mode];

    useEffect(() => {
        camera.position.set(...setup.position);
        camera.lookAt(...setup.lookAt);
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = setup.fov;
        }
        camera.updateProjectionMatrix();
    }, [camera, setup]);

    return null;
};

const PreviewLights: React.FC = () => (
    <>
        <ambientLight intensity={0.9} color="#f7dfc6" />
        <hemisphereLight args={['#ffe2bd', '#6b5a55', 0.7]} />
        <directionalLight position={[2.6, 3.6, 4.4]} intensity={2.2} color="#ffe3bd" />
        <directionalLight position={[-3.2, 2.0, -2.6]} intensity={0.85} color="#c9a8c3" />
    </>
);

interface CharacterModelProps {
    archetype: CharacterArchetype;
    rotationY?: number;
    position?: [number, number, number];
    animate?: boolean;
}

/**
 * One skeleton clone, one mixer, optional walk cycle. Shared by the waist-up
 * preview and the four-view sheet so both use the same loaded GLB.
 */
const CharacterModel: React.FC<CharacterModelProps> = ({
    archetype,
    rotationY = 0,
    position = [0, 0, 0],
    animate = false,
}) => {
    const gltf = useGLTF(
        archetype === 'female' ? FEMALE_PREVIEW_PATH : MALE_PREVIEW_PATH,
        true,
        true,
        (loader) => {
            loader.setMeshoptDecoder(MeshoptDecoder);
        }
    );

    const scene = useMemo(() => {
        const clone = cloneSkeleton(gltf.scene);
        clone.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
                mesh.castShadow = false;
                mesh.receiveShadow = false;
                mesh.frustumCulled = false;
            }
        });
        return clone;
    }, [gltf.scene]);

    const mixer = useMemo(() => {
        const instance = new THREE.AnimationMixer(scene);
        const clip =
            THREE.AnimationClip.findByName(gltf.animations, 'Walk_2') ||
            THREE.AnimationClip.findByName(gltf.animations, 'Walk') ||
            gltf.animations[0];

        if (clip) {
            // Strip root translation so the wanderer strides in place
            const tracks = clip.tracks.filter(
                (track) => !track.name.endsWith('root.position')
            );
            const prepared = new THREE.AnimationClip(
                `${clip.name}_preview`,
                clip.duration,
                tracks
            );
            const action = instance.clipAction(prepared);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.timeScale = 0.55;
            action.play();
        }

        return instance;
    }, [scene, gltf.animations]);

    useEffect(() => {
        // Freeze a readable mid-stride pose for the static views
        mixer.setTime(0.6);
        return () => {
            mixer.stopAllAction();
            mixer.uncacheRoot(scene);
        };
    }, [mixer, scene]);

    useFrame((_, rawDelta) => {
        if (animate) {
            mixer.update(Math.min(rawDelta, 0.05));
        }
    });

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <primitive
                object={scene}
                scale={PREVIEW_SCALE}
                position={[0, PREVIEW_FOOT_OFFSET, 0]}
            />
        </group>
    );
};

interface CharacterPreviewProps {
    archetype: CharacterArchetype;
    mode?: CharacterPreviewMode;
}

/**
 * Animated wanderer used by the walk-cycle half of the select stage.
 */
export const CharacterPreview: React.FC<CharacterPreviewProps> = ({
    archetype,
    mode = 'upper',
}) => (
    <group>
        <CharacterModel archetype={archetype} animate />
        <PreviewCamera mode={mode} />
        <PreviewLights />
    </group>
);

const SHEET_VIEWS: Array<{
    label: string;
    rotation: number;
    x: number;
    y: number;
}> = [
    { label: 'Front', rotation: 0, x: -0.98, y: 2.42 },
    { label: 'Side', rotation: -Math.PI / 2, x: 0.98, y: 2.42 },
    { label: 'Back', rotation: Math.PI, x: -0.98, y: 0 },
    { label: '3/4', rotation: -Math.PI / 4, x: 0.98, y: 0 },
];

const SheetCamera: React.FC = () => {
    const camera = useThree((state) => state.camera);

    useEffect(() => {
        camera.position.set(0, 2.05, 8.6);
        camera.lookAt(0, 2.05, 0);
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = 30;
        }
        camera.updateProjectionMatrix();
    }, [camera]);

    return null;
};

/**
 * Front / side / back / three-quarter turnaround on a 2x2 grid, drawn in one
 * canvas (four poses, one render loop) instead of four separate WebGL contexts.
 */
export const CharacterSheet: React.FC<{ archetype: CharacterArchetype }> = ({
    archetype,
}) => (
    <group>
        {SHEET_VIEWS.map((view) => (
            <group key={view.label}>
                <CharacterModel
                    archetype={archetype}
                    rotationY={view.rotation}
                    position={[view.x, view.y, 0]}
                />
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[view.x, view.y + 0.012, 0]}
                >
                    <circleGeometry args={[0.34, 18]} />
                    <meshBasicMaterial color="#0a0709" transparent opacity={0.26} />
                </mesh>
            </group>
        ))}
        <SheetCamera />
        <PreviewLights />
    </group>
);
