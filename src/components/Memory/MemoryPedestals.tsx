// src/components/Memory/MemoryPedestals.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME } from '../../styles/theme';
import {
  ACTIVE_CHUNK_RADIUS,
  BIOME_CONFIGS,
  CHUNK_SIZE,
  getBiomeSampleAt,
  getGardenTerrainHeight,
  hash2D,
} from '../../scenes/Environment/lowPolyUtils';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import type { MemoryItem } from '../../systems/MemoryManager/memoryTypes';
import {
  ArchedMemoryPedestal,
  GrandMemoryPortal,
  MinimalMemoryPedestal,
} from './PedestalModels';

export const INITIAL_GARDEN_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-seed-first-step',
    title: 'Seed of First Footsteps',
    subtitle: 'Minimal Memory Pedestal',
    date: 'Autumn Equinox',
    location: 'Sanctuary Trailhead',
    category: 'voice',
    pedestalVariant: 'minimal',
    importance: 'cherished',
    growthStage: 'seed',
    interactionState: 'dormant',
    people: ['Elena', 'Kael'],
    groupName: 'Beginnings',
    description:
      'A compact sandstone memory pedestal beside the first stepping stones. Its floating golden crystal hums softly as the evening breeze stirs the red floral banner.',
    position: [5.2, 0, 7.2],
    tags: ['Minimal Pedestal', 'Beginning', 'Lantern'],
    echo: {
      floatingPhotoTitle: 'Lanterns at Dusk',
      floatingPhotoPalette: ['#e8a598', '#ffcf70', '#5d6b46'],
      voiceTranscript:
        '"Leave a small light beside the first stone so we always find our way back to the garden."',
      ambientAudioLabel: 'Soft Chimes & Evening Breeze',
      writtenNote: 'Preserved on the trailhead Minimal Memory Pedestal.',
    },
  },
  {
    id: 'mem-golden-meadow',
    title: 'Golden Hour in the Sanctuary',
    subtitle: 'Grand Memory Portal',
    date: 'October 14',
    location: 'Eastern Sakura Bough',
    category: 'photo',
    pedestalVariant: 'grand_portal',
    importance: 'core',
    growthStage: 'landmark',
    interactionState: 'dormant',
    people: ['Elena'],
    groupName: 'Sanctuary Chronicles',
    description:
      'The Grand Memory Portal beneath the eastern sakura bough. Late afternoon sunlight filters through the broken stone arch as the golden crystal and its orbit ring illuminate the stepped flagstones.',
    position: [2.85, 0, 3.6],
    tags: ['Grand Portal', 'Sakura', 'Sanctuary'],
    echo: {
      floatingPhotoTitle: 'Under the Eastern Bough',
      floatingPhotoPalette: ['#d9918b', '#ffdf9e', '#68744e'],
      voiceTranscript:
        '"Look how the petals catch the gold right before the sun dips behind the floating island."',
      ambientAudioLabel: 'Rustling Sakura Blossoms (01:42)',
      writtenNote: 'Anchored at the Grand Memory Portal.',
    },
  },
  {
    id: 'mem-painted-valley',
    title: 'Canvas by the Western Arch',
    subtitle: 'Arched Memory Pedestal',
    date: 'September 28',
    location: 'Ancient Archway Overlook',
    category: 'shrine',
    pedestalVariant: 'arched',
    importance: 'milestone',
    growthStage: 'plant',
    interactionState: 'dormant',
    people: ['Kael'],
    groupName: 'Sketchbook Studies',
    description:
      'An Arched Memory Pedestal overlooking the western ridge. A single curved stone arm draped in white blossoms cradles the orbiting golden memory crystal.',
    position: [-7.4, 0, 4.0],
    tags: ['Arched Pedestal', 'Painting', 'Dusk'],
    echo: {
      floatingPhotoTitle: 'Western Arch Watercolour',
      floatingPhotoPalette: ['#8e7b9b', '#e8b49a', '#877974'],
      voiceTranscript:
        '"Mixing dusty rose and warm ochre—still trying to get the mist around the waterfall right."',
      ambientAudioLabel: 'Brushstrokes & Distant Waterfall',
      writtenNote: 'Page 14 of the leather-bound Memory Journal.',
    },
  },
  {
    id: 'mem-wind-melody',
    title: 'Lullaby of the Paper Banners',
    subtitle: 'Arched Memory Pedestal',
    date: 'November 2',
    location: 'Whispering Knoll',
    category: 'music',
    pedestalVariant: 'arched',
    audioDuration: '02:18',
    importance: 'cherished',
    growthStage: 'tree',
    interactionState: 'dormant',
    people: ['Elena', 'Kael'],
    groupName: 'Field Recordings',
    description:
      'A quiet acoustic melody recorded beside the arched sandstone shrine. You can hear the distant rush of the waterfall blending with the rustle of olive leaves.',
    position: [8.6, 0, -8.4],
    tags: ['Melody', 'Banners', 'Breeze'],
    echo: {
      floatingPhotoTitle: 'Song of the Knoll',
      floatingPhotoPalette: ['#b88c94', '#ffd478', '#5c704e'],
      voiceTranscript:
        '"Let the tape roll for a moment—listen to the wind chimes in the upper branches."',
      ambientAudioLabel: 'Acoustic Guitar & Wind Chimes (02:18)',
      writtenNote: 'Recorded with the vintage field cassette recorder.',
    },
  },
  {
    id: 'mem-archway-lanterns',
    title: 'Footsteps Through the Stone Gate',
    subtitle: 'Grand Memory Portal',
    date: 'August 19',
    location: 'Northern Ruin Threshold',
    category: 'video',
    pedestalVariant: 'grand_portal',
    importance: 'core',
    growthStage: 'landmark',
    interactionState: 'dormant',
    people: ['The Wanderers'],
    groupName: 'Northern Passage',
    description:
      'Walking through the mossy stone archway as fireflies and golden motes began to rise from the wildflowers around the northern Grand Memory Portal.',
    position: [-7.6, 0, -9.8],
    tags: ['Grand Portal', 'Fireflies', 'Trail'],
    echo: {
      floatingPhotoTitle: 'Northern Gate at Twilight',
      floatingPhotoPalette: ['#7d6d8a', '#ffcf70', '#615653'],
      voiceTranscript:
        '"Beyond this archway the valley opens into the endless hills. Every step leaves an echo."',
      ambientAudioLabel: 'Footsteps on Flagstone & Night Crickets',
      writtenNote: 'A core landmark portal anchoring the northern trail.',
    },
  },
];

/**
 * Generates deterministic outer-biome discovery pedestals seeded by the active worldSeed.
 */
function buildSeededBiomeMemories(seedStr: string): MemoryItem[] {
  const outerTemplates: Array<{
    ringCoords: [number, number];
    title: string;
    category: MemoryItem['category'];
    variant: NonNullable<MemoryItem['pedestalVariant']>;
    importance: NonNullable<MemoryItem['importance']>;
    quote: string;
    audio: string;
  }> = [
      {
        ringCoords: [0, -1],
        title: 'Echo of the Northern Trail',
        category: 'letter',
        variant: 'minimal',
        importance: 'whisper',
        quote: '"No matter how far we wander, the garden remembers where every stone was placed."',
        audio: 'High Meadow Wind & Rustling Grass',
      },
      {
        ringCoords: [1, 0],
        title: 'Blossoms of the Eastern Ridge',
        category: 'photo',
        variant: 'arched',
        importance: 'milestone',
        quote: '"The petals drift across the hilltops like warm snow at sunset."',
        audio: 'Breeze Through Flowering Branches',
      },
      {
        ringCoords: [-1, 0],
        title: 'Whispers in the Ancient Stones',
        category: 'shrine',
        variant: 'grand_portal',
        importance: 'core',
        quote: '"Carved into the moss-covered pillar was a map of seasons yet to come."',
        audio: 'Distant Chimes & Deep Forest Echo',
      },
      {
        ringCoords: [0, 1],
        title: 'Lantern by the Southern Camp',
        category: 'music',
        variant: 'minimal',
        importance: 'cherished',
        quote: '"We rested beside the wooden cart and listened to the embers crackle."',
        audio: 'Campfire Embers & Acoustic Hum',
      },
    ];

  return outerTemplates.map((tpl, idx) => {
    const [cx, cz] = tpl.ringCoords;
    const offsetX = (hash2D(cx, cz, 701 + idx) - 0.5) * 14;
    const offsetZ = (hash2D(cx, cz, 719 + idx) - 0.5) * 14;
    const wx = Number((cx * CHUNK_SIZE + offsetX).toFixed(2));
    const wz = Number((cz * CHUNK_SIZE + offsetZ).toFixed(2));
    const wy = getGardenTerrainHeight(wx, wz);
    const biomeSample = getBiomeSampleAt(wx, wz);
    const biomeCfg = BIOME_CONFIGS[biomeSample.primary];

    return {
      id: `mem-seeded-${seedStr}-${idx}`,
      title: tpl.title,
      subtitle:
        tpl.variant === 'grand_portal'
          ? 'Grand Memory Portal'
          : tpl.variant === 'arched'
            ? 'Arched Memory Pedestal'
            : 'Minimal Memory Pedestal',
      date: `Seed Epoch • ${seedStr}`,
      location: `${biomeCfg.name} (${cx}, ${cz})`,
      category: tpl.category,
      pedestalVariant: tpl.variant,
      importance: tpl.importance,
      growthStage: tpl.variant === 'grand_portal' ? 'landmark' : 'plant',
      interactionState: 'dormant',
      people: ['Elena', 'Kael'],
      groupName: biomeCfg.name,
      description: `An intentional discovery clearing nestled within ${biomeCfg.name} (${biomeCfg.subtitle}). Deterministic coordinates anchored to world seed ${seedStr}.`,
      position: [wx, wy, wz],
      chunkKey: `${cx}_${cz}`,
      rotationY: hash2D(cx, cz, 733 + idx) * Math.PI * 2,
      tags: [biomeCfg.name, tpl.variant.replace('_', ' '), seedStr],
      echo: {
        floatingPhotoTitle: `${biomeCfg.name} Vista`,
        floatingPhotoPalette: [
          biomeCfg.baseColor,
          biomeCfg.sunlitColor,
          '#ffcf70',
        ],
        voiceTranscript: tpl.quote,
        ambientAudioLabel: tpl.audio,
        writtenNote: `Discovered in ${biomeCfg.name}.`,
      },
    };
  });
}

const INTERACTION_RADIUS = 4.2;

export const MemoryPedestals: React.FC = () => {
  const phase = useGameStore((state) => state.phase);
  const worldSeed = useGameStore((state) => state.worldSeed);
  const activeChunkCoord = useGameStore((state) => state.activeChunkCoord);
  const persistentMemories = useGameStore((state) => state.persistentMemories);
  const registerPersistentMemories = useGameStore(
    (state) => state.registerPersistentMemories
  );
  const nearbyMemory = useGameStore((state) => state.nearbyMemory);
  const setNearbyMemory = useGameStore((state) => state.setNearbyMemory);
  const openMemory = useGameStore((state) => state.openMemory);
  const activeModal = useGameStore((state) => state.activeModal);
  const activeEchoId = useGameStore((state) => state.activeEchoId);
  const landmarkZones = useGameStore((state) => state.landmarkZones);
  const setNearbyZone = useGameStore((state) => state.setNearbyZone);

  const crystalRefs = useRef<Record<string, THREE.Group | null>>({});
  const orbitRingRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const shardsRefs = useRef<Record<string, THREE.Group | null>>({});
  const wellGlowRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const echoWaveRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const lightRefs = useRef<Record<string, THREE.PointLight | null>>({});

  // Re-anchor all sanctuary and seeded outer-biome pedestals whenever worldSeed changes
  useEffect(() => {
    const coreMemories = INITIAL_GARDEN_MEMORIES.map((m) => {
      const y = getGardenTerrainHeight(m.position[0], m.position[2]);
      const cx = Math.round(m.position[0] / CHUNK_SIZE);
      const cz = Math.round(m.position[2] / CHUNK_SIZE);
      return {
        ...m,
        position: [m.position[0], y, m.position[2]] as [
          number,
          number,
          number,
        ],
        chunkKey: `${cx}_${cz}`,
      };
    });
    const outerSeeded = buildSeededBiomeMemories(worldSeed);
    registerPersistentMemories([...coreMemories, ...outerSeeded], true);
  }, [worldSeed, registerPersistentMemories]);

  const activeChunkMemories = useMemo(() => {
    const [acx, acz] = activeChunkCoord;
    return persistentMemories.filter((m) => {
      const mcx = Math.round(m.position[0] / CHUNK_SIZE);
      const mcz = Math.round(m.position[2] / CHUNK_SIZE);
      return (
        Math.abs(mcx - acx) <= ACTIVE_CHUNK_RADIUS &&
        Math.abs(mcz - acz) <= ACTIVE_CHUNK_RADIUS
      );
    });
  }, [persistentMemories, activeChunkCoord]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'KeyE' &&
        phase === 'exploring' &&
        activeModal === 'none'
      ) {
        const currentNearby = useGameStore.getState().nearbyMemory;
        if (currentNearby) {
          openMemory(currentNearby);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, activeModal, openMemory]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const [px, , pz] = playerTelemetry.position;

    let closestMemory: MemoryItem | null = null;
    let closestDist = INTERACTION_RADIUS;
    let absoluteNearestDist = 999;

    for (let i = 0; i < activeChunkMemories.length; i++) {
      const mem = activeChunkMemories[i];
      const dx = px - mem.position[0];
      const dz = pz - mem.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist < absoluteNearestDist) {
        absoluteNearestDist = dist;
      }

      if (phase === 'exploring' && dist < closestDist) {
        closestDist = dist;
        closestMemory = mem;
      }

      const isNear = nearbyMemory?.id === mem.id;
      const isEchoing = activeEchoId === mem.id;

      const crystal = crystalRefs.current[mem.id];
      if (crystal) {
        crystal.position.y =
          Math.sin(t * (isNear ? 2.8 : 1.6) + i) * 0.09;
        crystal.rotation.y +=
          delta * (isEchoing ? 1.6 : isNear ? 1.05 : 0.45);
      }

      const ring = orbitRingRefs.current[mem.id];
      if (ring) {
        ring.rotation.z += delta * (isNear ? 1.2 : 0.5);
        const s = isNear ? 1.08 + Math.sin(t * 3.5) * 0.04 : 1.0;
        ring.scale.set(s, s, s);
      }

      const shards = shardsRefs.current[mem.id];
      if (shards) {
        shards.rotation.y -= delta * (isNear ? 0.85 : 0.35);
        shards.position.y = Math.cos(t * 2.2 + i) * 0.05;
      }

      const echoWave = echoWaveRefs.current[mem.id];
      if (echoWave) {
        const pulse = (t * 0.8 + i * 0.3) % 1;
        const s = 1 + pulse * (isEchoing ? 2.5 : 1.45);
        echoWave.scale.set(s, s, 1);
        const mat = echoWave.material as THREE.MeshBasicMaterial;
        mat.opacity =
          (1 - pulse) * (isEchoing ? 0.72 : isNear ? 0.42 : 0.18);
      }

      const light = lightRefs.current[mem.id];
      if (light) {
        const targetIntensity = isEchoing ? 3.8 : isNear ? 2.95 : 1.5;
        light.intensity = THREE.MathUtils.lerp(
          light.intensity,
          targetIntensity,
          delta * 6
        );
      }
    }

    playerTelemetry.nearestMemoryDistance = absoluteNearestDist;

    if (phase === 'exploring') {
      setNearbyMemory(closestMemory);

      let activeZone = null;
      for (const z of landmarkZones) {
        const d = Math.hypot(px - z.position[0], pz - z.position[2]);
        if (d <= z.radius) {
          activeZone = z;
          break;
        }
      }
      setNearbyZone(activeZone);
    }
  });

  if (phase !== 'exploring') return null;

  return (
    <group>
      {activeChunkMemories.map((p, idx) => {
        const isNear = nearbyMemory?.id === p.id;
        const isEchoing = activeEchoId === p.id;
        const variant =
          p.pedestalVariant ||
          (idx % 3 === 0
            ? 'grand_portal'
            : idx % 3 === 1
              ? 'arched'
              : 'minimal');

        const animRefs = {
          crystalRef: (el: THREE.Group | null) => {
            crystalRefs.current[p.id] = el;
          },
          orbitRingRef: (el: THREE.Mesh | null) => {
            orbitRingRefs.current[p.id] = el;
          },
          shardsRef: (el: THREE.Group | null) => {
            shardsRefs.current[p.id] = el;
          },
          wellGlowRef: (el: THREE.Mesh | null) => {
            wellGlowRefs.current[p.id] = el;
          },
        };

        return (
          <group
            key={p.id}
            position={p.position}
            rotation={[0, p.rotationY || 0, 0]}
          >
            {variant === 'grand_portal' && (
              <GrandMemoryPortal
                isNear={isNear}
                isEchoing={isEchoing}
                animRefs={animRefs}
              />
            )}
            {variant === 'minimal' && (
              <MinimalMemoryPedestal
                isNear={isNear}
                isEchoing={isEchoing}
                animRefs={animRefs}
              />
            )}
            {variant === 'arched' && (
              <ArchedMemoryPedestal
                isNear={isNear}
                isEchoing={isEchoing}
                animRefs={animRefs}
              />
            )}

            <mesh
              ref={(el) => {
                echoWaveRefs.current[p.id] = el;
              }}
              position={[0, 0.06, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.95, 1.08, 32]} />
              <meshBasicMaterial
                color={THEME.colors.memoryGold}
                transparent
                opacity={0.32}
                side={THREE.DoubleSide}
              />
            </mesh>

            <pointLight
              ref={(el) => {
                lightRefs.current[p.id] = el;
              }}
              position={[0, 2.0, 0.2]}
              color={THEME.colors.memoryGold}
              intensity={1.5}
              distance={7.5}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
};