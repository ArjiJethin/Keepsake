// src/components/UI/GameHUD.tsx
import React from 'react';
import { BookOpen, Users, Settings, Sparkles, X, MapPin, Calendar } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { GARDEN_MEMORIES } from '../Memory/MemoryPedestals';
import './GameHUD.css';

export const GameHUD: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const nearbyMemory = useGameStore((state) => state.nearbyMemory);
    const activeMemory = useGameStore((state) => state.activeMemory);
    const openMemory = useGameStore((state) => state.openMemory);
    const closeMemory = useGameStore((state) => state.closeMemory);
    const discoveredIds = useGameStore((state) => state.discoveredIds);
    const quality = useGameStore((state) => state.quality);
    const toggleQuality = useGameStore((state) => state.toggleQuality);
    const setPhase = useGameStore((state) => state.setPhase);
    const setIntroStage = useGameStore((state) => state.setIntroStage);

    if (phase !== 'exploring') return null;

    const handleReplayIntro = () => {
        closeMemory();
        setIntroStage(1);
        setPhase('loading');
    };

    return (
        <div className="keepsake-hud-layer">
            {/* Top-Left Keepsake Brand Logo (Matches Home Screen.jpg) */}
            <div className="hud-top-left">
                <div className="hud-brand-logo" onClick={handleReplayIntro} title="Click to replay intro sequence">
                    <span className="hud-brand-text">Keepsake</span>
                    <svg className="hud-brand-leaf" viewBox="0 0 32 32" width="22" height="22">
                        <path
                            d="M6,26 C10,12 20,6 30,4 C26,16 18,24 6,26 Z"
                            fill="#f7ecda"
                        />
                    </svg>
                </div>
                <div className="hud-discovery-pill">
                    <span>Memories Awoken: {discoveredIds.length} / {GARDEN_MEMORIES.length}</span>
                </div>
            </div>

            {/* Top-Right Circular Parchment Action Buttons */}
            <div className="hud-top-right">
                <button
                    className="hud-circle-btn"
                    onClick={() => openMemory(GARDEN_MEMORIES[0])}
                    title="Memory Journal"
                >
                    <BookOpen size={18} />
                </button>
                <button
                    className="hud-circle-btn"
                    onClick={toggleQuality}
                    title={`Graphics Quality: ${quality.toUpperCase()}`}
                >
                    <Users size={18} />
                </button>
                <button
                    className="hud-circle-btn"
                    onClick={handleReplayIntro}
                    title="Replay Brushstroke Loading Sequence"
                >
                    <Settings size={18} />
                </button>
            </div>

            {/* Contextual Proximity Prompt ("Remember? [E]") matching Home Screen.jpg */}
            {nearbyMemory && !activeMemory && (
                <div className="hud-proximity-prompt">
                    <button
                        className="remember-prompt-pill"
                        onClick={() => openMemory(nearbyMemory)}
                    >
                        <span className="remember-prompt-text">Remember?</span>
                        <kbd className="remember-prompt-key">E</kbd>
                    </button>
                    <span className="remember-prompt-subtitle">{nearbyMemory.title}</span>
                </div>
            )}

            {/* Bottom-Left Movement Control Guide (Matches Home Screen.jpg) */}
            <div className="hud-bottom-left-controls">
                <div className="control-row">
                    <div className="wasd-cluster">
                        <div className="wasd-top">
                            <kbd className="key-cap key-small">W</kbd>
                        </div>
                        <div className="wasd-bottom">
                            <kbd className="key-cap key-small">A</kbd>
                            <kbd className="key-cap key-small">S</kbd>
                            <kbd className="key-cap key-small">D</kbd>
                        </div>
                    </div>
                    <span className="control-label">Move</span>
                </div>

                <div className="control-row">
                    <span className="mouse-icon-badge" />
                    <span className="control-label">Drag to Look / Scroll Zoom</span>
                </div>

                <div className="control-row">
                    <kbd className="key-cap">E</kbd>
                    <span className="control-label">Interact</span>
                </div>

                <div className="control-row">
                    <kbd className="key-cap key-wide">Shift</kbd>
                    <span className="control-label">Run</span>
                </div>

                <div className="control-row">
                    <kbd className="key-cap key-wide">Space</kbd>
                    <span className="control-label">Jump</span>
                </div>
            </div>

            {/* Bottom-Right Main "Remember" Parchment Button */}
            <div className="hud-bottom-right">
                <button
                    className="hud-remember-main-btn"
                    onClick={() =>
                        openMemory(nearbyMemory || GARDEN_MEMORIES[0])
                    }
                >
                    <Sparkles size={18} className="remember-flower-icon" />
                    <span>Remember</span>
                </button>
            </div>

            {/* Memory Viewing Parchment Modal (Triggered when pressing E near a pedestal) */}
            {activeMemory && (
                <div className="memory-modal-backdrop" onClick={closeMemory}>
                    <div
                        className="memory-parchment-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="memory-close-btn"
                            onClick={closeMemory}
                            aria-label="Close Memory"
                        >
                            <X size={20} />
                        </button>

                        <div className="memory-card-header">
                            <span className="memory-category-tag">
                                {activeMemory.category.toUpperCase()} KEEPSAKE
                            </span>
                            <h2 className="memory-card-title">{activeMemory.title}</h2>
                            <p className="memory-card-subtitle">{activeMemory.subtitle}</p>
                        </div>

                        {/* Artistic Low-Poly Sunset Illustration Canvas Preview inside the Memory Card */}
                        <div className="memory-visual-frame">
                            <div className="memory-visual-art">
                                <div className="memory-art-sun" />
                                <div className="memory-art-mountains" />
                                <div className="memory-art-meadow" />
                            </div>
                        </div>

                        <div className="memory-meta-row">
                            <span className="memory-meta-item">
                                <Calendar size={14} /> {activeMemory.date}
                            </span>
                            <span className="memory-meta-item">
                                <MapPin size={14} /> {activeMemory.location}
                            </span>
                        </div>

                        <p className="memory-card-description">{activeMemory.description}</p>

                        <div className="memory-tag-list">
                            {activeMemory.tags.map((tag) => (
                                <span key={tag} className="memory-tag-chip">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        <div className="memory-card-footer">
                            <button className="memory-return-btn" onClick={closeMemory}>
                                Return to the Garden
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};