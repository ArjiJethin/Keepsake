// src/components/CharacterSelect/CharacterSelectScreen.tsx
import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore, type CharacterArchetype } from '../../store/useGameStore';
import { CharacterPreview } from './CharacterPreview';
import './CharacterSelect.css';

interface CharacterOption {
    archetype: CharacterArchetype;
    label: string;
    subtitle: string;
}

// Male on the LEFT, Female on the RIGHT as specified
const CHARACTER_OPTIONS: CharacterOption[] = [
    {
        archetype: 'male',
        label: 'Rowan',
        subtitle: 'Male Wanderer',
    },
    {
        archetype: 'female',
        label: 'Aria',
        subtitle: 'Female Wanderer',
    },
];

const previewCanvasProps = {
    dpr: [1, 1.5] as [number, number],
    gl: {
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance' as const,
    },
};

export const CharacterSelectScreen: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const setPhase = useGameStore((state) => state.setPhase);
    const characterModel = useGameStore((state) => state.characterModel);
    const setCharacterModel = useGameStore((state) => state.setCharacterModel);

    const [selected, setSelected] = useState<CharacterArchetype>(characterModel || 'male');
    const [isEntering, setIsEntering] = useState(false);

    // Keep local selection synchronized with store when opening screen
    useEffect(() => {
        if (phase === 'characterSelect') {
            setSelected(characterModel);
        }
    }, [phase, characterModel]);

    const handleSelect = (archetype: CharacterArchetype) => {
        if (isEntering) return;
        setSelected(archetype);
        setCharacterModel(archetype);
    };

    const handleBegin = () => {
        if (isEntering) return;
        setCharacterModel(selected);
        setIsEntering(true);
        window.setTimeout(() => {
            setIsEntering(false);
            setPhase('exploring');
        }, 650);
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
            if (event.code === 'ArrowLeft') {
                event.preventDefault();
                handleSelect('male');
            } else if (event.code === 'ArrowRight') {
                event.preventDefault();
                handleSelect('female');
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, isEntering, selected]);

    if (phase !== 'characterSelect') return null;

    return (
        <div className="cs-overlay" data-ui-interactive="true">
            <div className="cs-window" role="dialog" aria-labelledby="cs-heading">
                <header className="cs-header">
                    <span className="cs-kicker">Keepsake Sanctuary</span>
                    <h1 id="cs-heading" className="cs-title">Choose Your Wanderer</h1>
                </header>

                <div className="cs-cards-grid">
                    {CHARACTER_OPTIONS.map((option) => {
                        const isSelected = selected === option.archetype;
                        return (
                            <button
                                key={option.archetype}
                                type="button"
                                className={`cs-card ${isSelected ? 'cs-card--selected' : ''}`}
                                onClick={() => handleSelect(option.archetype)}
                                aria-pressed={isSelected}
                            >
                                <div className="cs-card-viewport">
                                    <Canvas
                                        {...previewCanvasProps}
                                        camera={{ position: [0, 1.04, 3.65], fov: 30 }}
                                    >
                                        <Suspense fallback={null}>
                                            <CharacterPreview
                                                archetype={option.archetype}
                                                isSelected={isSelected}
                                            />
                                        </Suspense>
                                    </Canvas>
                                </div>

                                <div className="cs-card-caption">
                                    <span className="cs-card-name">{option.label}</span>
                                    <span className="cs-card-role">{option.subtitle}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="cs-footer">
                    <button
                        type="button"
                        className="cs-begin-btn"
                        onClick={handleBegin}
                        disabled={isEntering}
                    >
                        {isEntering ? 'Entering the Garden…' : 'Begin Journey'}
                    </button>
                </div>
            </div>
        </div>
    );
};
