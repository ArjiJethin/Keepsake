// src/components/CharacterSelect/CharacterPreview.tsx
import React, { useEffect, useMemo, useRef } from 'react';
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

const PreviewCamera: React.FC = () => {
    const camera = useThree((state) => state.camera);

    useEffect(() => {
        camera.position.set(0, 1.04, 3.65);
        camera.lookAt(0, 0.92, 0);
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = 30;
        }
        camera.updateProjectionMatrix();
    }, [camera]);

    return null;
};

const PreviewLights: React.FC = () => (
    <>
        <ambientLight intensity={1.0} color="#f7e3cc" />
        <hemisphereLight args={['#ffe6c8', '#6b5a55', 0.78]} />
        <directionalLight position={[2.4, 3.8, 4.2]} intensity={2.1} color="#ffe5c2" />
        <directionalLight position={[-2.8, 2.0, -2.4]} intensity={0.75} color="#d4b2cc" />
    </>
);

interface CharacterPreviewProps {
    archetype: CharacterArchetype;
    isSelected?: boolean;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({
    archetype,
    isSelected = false,
}) => {
    const gltf = useGLTF(
        archetype === 'female' ? FEMALE_PREVIEW_PATH : MALE_PREVIEW_PATH,
        true,
        true,
        (loader) => {
            loader.setMeshoptDecoder(MeshoptDecoder);
        }
    );

    const turntableRef = useRef<THREE.Group>(null);

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
            action.timeScale = 0.52;
            action.play();
        }

        return instance;
    }, [scene, gltf.animations]);

    useEffect(() => {
        mixer.setTime(0.45);
        return () => {
            mixer.stopAllAction();
            mixer.uncacheRoot(scene);
        };
    }, [mixer, scene]);

    useFrame((_, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        mixer.update(isSelected ? delta : delta * 0.35);

        if (turntableRef.current) {
            const targetRot = isSelected ? 0.14 : -0.12;
            turntableRef.current.rotation.y = THREE.MathUtils.lerp(
                turntableRef.current.rotation.y,
                targetRot,
                delta * 4.5
            );
        }
    });

    return (
        <group>
            <group ref={turntableRef}>
                <primitive
                    object={scene}
                    scale={PREVIEW_SCALE}
                    position={[0, PREVIEW_FOOT_OFFSET, 0]}
                />
                {/* Soft ground contact shadow disc */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
                    <circleGeometry args={[0.42, 24]} />
                    <meshBasicMaterial
                        color="#3b2c24"
                        transparent
                        opacity={isSelected ? 0.28 : 0.16}
                    />
                </mesh>
            </group>
            <PreviewCamera />
            <PreviewLights />
        </group>
    );
};
