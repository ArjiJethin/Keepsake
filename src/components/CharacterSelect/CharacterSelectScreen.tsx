// src/components/CharacterSelect/CharacterSelectScreen.tsx
import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ArrowLeft, Check } from 'lucide-react';
import { useGameStore, type CharacterArchetype } from '../../store/useGameStore';
import { CharacterPreview, CharacterSheet } from './CharacterPreview';
import './CharacterSelect.css';

interface Stat {
    label: string;
    value: string;
}

interface WandererEntry {
    archetype: CharacterArchetype;
    name: string;
    epithet: string;
    blurb: string;
    stats: Stat[];
}

const WANDERERS: WandererEntry[] = [
    {
        archetype: 'female',
        name: 'Aria',
        epithet: 'Keeper of Soft Echoes',
        blurb:
            'Walks the trails barefoot, gathering the small lights left behind by people who once laughed here.',
        stats: [
            { label: 'Stride', value: 'Gentle' },
            { label: 'Pace', value: '3.2 m/s' },
            { label: 'Keepsakes found', value: '12' },
            { label: 'Affinity', value: 'Blossoms' },
            { label: 'Lantern light', value: 'Soft gold' },
            { label: 'Known for', value: 'Reads the evening light' },
        ],
    },
    {
        archetype: 'male',
        name: 'Rowan',
        epithet: 'Warden of the Long Path',
        blurb:
            'Carries the lantern further than most would dare, charting every archway and hollow the garden still remembers.',
        stats: [
            { label: 'Stride', value: 'Steady' },
            { label: 'Pace', value: '3.0 m/s' },
            { label: 'Keepsakes found', value: '9' },
            { label: 'Affinity', value: 'Old stone' },
            { label: 'Lantern light', value: 'Amber' },
            { label: 'Known for', value: 'Finds hidden trails' },
        ],
    },
];

const VIEW_LABELS = ['Front', 'Side', 'Back', '3/4'] as const;

const canvasProps = {
    dpr: [1, 1.6] as [number, number],
    gl: {
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance' as const,
    },
};

export const CharacterSelectScreen: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const setPhase = useGameStore((state) => state.setPhase);
    const setCharacterModel = useGameStore((state) => state.setCharacterModel);

    const [selected, setSelected] = useState<CharacterArchetype>('male');
    const [isEntering, setIsEntering] = useState(false);

    const active = WANDERERS.find((w) => w.archetype === selected) ?? WANDERERS[1];
    const activeIndex = WANDERERS.indexOf(active) + 1;

    const handleBegin = () => {
        if (isEntering) return;
        setCharacterModel(selected);
        setIsEntering(true);
        window.setTimeout(() => {
            setIsEntering(false);
            setPhase('exploring');
        }, 1150);
    };

    useEffect(() => {
        if (phase !== 'characterSelect') return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (isEntering) return;
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                handleBegin();
                return;
            }
            if (event.code === 'Escape') {
                setPhase('loading');
                return;
            }
            if (event.code === 'ArrowDown' || event.code === 'ArrowRight') {
                event.preventDefault();
                setSelected((current) => (current === 'female' ? 'male' : 'female'));
            }
            if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') {
                event.preventDefault();
                setSelected((current) => (current === 'female' ? 'male' : 'female'));
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, isEntering, selected]);

    if (phase !== 'characterSelect') return null;

    return (
        <div className="cs-root">
            <div className="cs-art" aria-hidden="true">
                <span className="cs-art-sky" />
                <span className="cs-art-glow" />
                <span className="cs-art-ridge cs-art-ridge--far" />
                <span className="cs-art-ridge cs-art-ridge--near" />
                <span className="cs-art-tree" />
                <span className="cs-art-grain" />
            </div>

            <header className="cs-bar">
                <button
                    type="button"
                    className="cs-bar-back"
                    onClick={() => setPhase('loading')}
                >
                    <ArrowLeft size={14} />
                    <span>Title</span>
                </button>

                <div className="cs-bar-title">
                    <span className="cs-bar-kicker">New Journey</span>
                    <h1>Choose your wanderer</h1>
                </div>

                <div className="cs-bar-count">
                    <span className="cs-bar-count-current">0{activeIndex}</span>
                    <span className="cs-bar-count-sep">/</span>
                    <span>0{WANDERERS.length}</span>
                </div>
            </header>

            <div className="cs-body">
                <section className="cs-stage" aria-label={`${active.name} preview`}>
                    <div className="cs-stage-half cs-stage-half--walk">
                        <span className="cs-half-tag">Walk cycle</span>
                        <Canvas {...canvasProps} camera={{ position: [0, 1.52, 1.85], fov: 36 }}>
                            <Suspense fallback={null}>
                                <CharacterPreview archetype={selected} mode="upper" />
                            </Suspense>
                        </Canvas>
                    </div>

                    <div className="cs-stage-half cs-stage-half--views">
                        <Canvas
                            {...canvasProps}
                            camera={{ position: [0, 2.05, 8.6], fov: 30 }}
                        >
                            <Suspense fallback={null}>
                                <CharacterSheet archetype={selected} />
                            </Suspense>
                        </Canvas>

                        <div className="cs-view-labels" aria-hidden="true">
                            {VIEW_LABELS.map((label) => (
                                <span className="cs-view-label" key={label}>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <span className="cs-stage-floor" aria-hidden="true" />
                    <span className="cs-stage-ring" aria-hidden="true" />
                    <span className="cs-stage-corner cs-stage-corner--tl" aria-hidden="true" />
                    <span className="cs-stage-corner cs-stage-corner--tr" aria-hidden="true" />
                    <span className="cs-stage-corner cs-stage-corner--bl" aria-hidden="true" />
                    <span className="cs-stage-corner cs-stage-corner--br" aria-hidden="true" />

                    <div className="cs-stage-foot">
                        <div className="cs-plate">
                            <span className="cs-plate-index">0{activeIndex}</span>
                            <div className="cs-plate-text">
                                <h2 className="cs-plate-name">{active.name}</h2>
                                <span className="cs-plate-epithet">{active.epithet}</span>
                            </div>
                        </div>

                        <div className="cs-stage-hint">
                            <kbd className="cs-key">↵</kbd>
                            <span>Begin</span>
                            <span className="cs-hint-sep">·</span>
                            <kbd className="cs-key">↑↓</kbd>
                            <span>Switch</span>
                        </div>
                    </div>
                </section>

                <aside className="cs-rail">
                    <div className="cs-rail-label">Wanderers</div>

                    <div className="cs-slots">
                        {WANDERERS.map((wanderer, index) => {
                            const isSelected = wanderer.archetype === selected;
                            return (
                                <button
                                    key={wanderer.archetype}
                                    type="button"
                                    className={`cs-slot${isSelected ? ' cs-slot--selected' : ''}`}
                                    onClick={() => setSelected(wanderer.archetype)}
                                    aria-pressed={isSelected}
                                >
                                    <span className="cs-slot-number">0{index + 1}</span>
                                    <span className="cs-slot-body">
                                        <span className="cs-slot-name">{wanderer.name}</span>
                                        <span className="cs-slot-epithet">
                                            {wanderer.epithet}
                                        </span>
                                    </span>
                                    {isSelected && (
                                        <span className="cs-slot-check">
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="cs-detail">
                        <p className="cs-detail-blurb">{active.blurb}</p>
                        <div className="cs-detail-rows">
                            {active.stats.map((stat) => (
                                <div className="cs-detail-row" key={stat.label}>
                                    <span>{stat.label}</span>
                                    <strong>{stat.value}</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="cs-begin"
                        onClick={handleBegin}
                        disabled={isEntering}
                    >
                        <span>{isEntering ? 'Entering the garden…' : 'Begin journey'}</span>
                        <kbd className="cs-key cs-key--dark">↵</kbd>
                    </button>
                </aside>
            </div>

            {isEntering && (
                <div className="cs-entering-overlay">
                    <div className="cs-entering-ring" aria-hidden="true" />
                    <p className="cs-entering-title">
                        {active.name} steps into the garden
                    </p>
                    <span className="cs-entering-caption">Waking the keepsakes…</span>
                </div>
            )}
        </div>
    );
};
