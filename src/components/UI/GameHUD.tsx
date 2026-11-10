// src/components/UI/GameHUD.tsx
import React, { useEffect, useState } from 'react';
import {
    BookOpen,
    UserCheck,
    Settings,
    Sparkles,
    X,
    MapPin,
    Calendar,
    Volume2,
    Sprout,
    Compass,
    Layers,
    Navigation,
} from 'lucide-react';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import { getGardenTerrainHeight } from '../../scenes/Environment/lowPolyUtils';
import {
    KEEPSAKE_ASSET_MANIFEST,
    type AssetManifestEntry,
} from '../../systems/AssetManager/glbExporter';
import './GameHUD.css';

export const GameHUD: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const inputMode = useGameStore((state) => state.inputMode);
    const setInputMode = useGameStore((state) => state.setInputMode);
    const toggleInputMode = useGameStore((state) => state.toggleInputMode);
    const nearbyMemory = useGameStore((state) => state.nearbyMemory);
    const activeMemory = useGameStore((state) => state.activeMemory);
    const persistentMemories = useGameStore((state) => state.persistentMemories);
    const openMemory = useGameStore((state) => state.openMemory);
    const closeMemory = useGameStore((state) => state.closeMemory);
    const advanceMemoryGrowth = useGameStore((state) => state.advanceMemoryGrowth);
    const discoveredIds = useGameStore((state) => state.discoveredIds);
    const characterModel = useGameStore((state) => state.characterModel);
    const toggleCharacterModel = useGameStore(
        (state) => state.toggleCharacterModel
    );
    const nearbyZone = useGameStore((state) => state.nearbyZone);
    const activeChunkCoord = useGameStore((state) => state.activeChunkCoord);
    const setPhase = useGameStore((state) => state.setPhase);
    const setIntroStage = useGameStore((state) => state.setIntroStage);

    const [showAssetCatalog, setShowAssetCatalog] = useState(false);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (
                e.code === 'KeyC' &&
                phase === 'exploring' &&
                !useGameStore.getState().activeMemory
            ) {
                toggleCharacterModel();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [phase, toggleCharacterModel]);

    if (phase !== 'exploring') return null;

    const currentMemoryData = activeMemory
        ? persistentMemories.find((m) => m.id === activeMemory.id) || activeMemory
        : null;

    const handleReplayIntro = () => {
        closeMemory();
        setShowAssetCatalog(false);
        setIntroStage(1);
        setPhase('loading');
    };

    const handleTeleportToAsset = (entry: AssetManifestEntry) => {
        const [tx, tz] = entry.worldCoords;
        const ty = getGardenTerrainHeight(tx, tz);
        playerTelemetry.position = [tx, ty, tz];
        playerTelemetry.velocity = [0, 0, 0];
        setShowAssetCatalog(false);
        setInputMode('camera');
    };

    return (
        <div className="keepsake-hud-layer">
            {/* Top-Left Keepsake Brand Logo & World Status */}
            <div className="hud-top-left">
                <div
                    className="hud-brand-logo"
                    onClick={handleReplayIntro}
                    title="Click to replay brushstroke intro sequence"
                >
                    <span className="hud-brand-text">Keepsake</span>
                    <svg
                        className="hud-brand-leaf"
                        viewBox="0 0 32 32"
                        width="22"
                        height="22"
                    >
                        <path
                            d="M6,26 C10,12 20,6 30,4 C26,16 18,24 6,26 Z"
                            fill="#f7ecda"
                        />
                    </svg>
                </div>

                <div className="hud-pills-row">
                    <div className="hud-discovery-pill">
                        <span>
                            Memories Awoken: {discoveredIds.length} /{' '}
                            {persistentMemories.length}
                        </span>
                    </div>
                    <div className="hud-discovery-pill hud-chunk-pill">
                        <Compass size={13} />
                        <span>
                            Chunk ({activeChunkCoord[0]}, {activeChunkCoord[1]})
                        </span>
                    </div>
                </div>
            </div>

            {/* Top-Center Landmark Zone Banner */}
            {nearbyZone && !currentMemoryData && !showAssetCatalog && (
                <div className="hud-zone-banner">
                    <span className="hud-zone-type">
                        {nearbyZone.zoneType.replace('_', ' ').toUpperCase()}
                    </span>
                    <h3 className="hud-zone-title">{nearbyZone.name}</h3>
                    <p className="hud-zone-desc">{nearbyZone.description}</p>
                </div>
            )}

            {/* Top-Right Action Bar */}
            <div className="hud-top-right">
                <button
                    className="hud-explorer-switch-pill"
                    onClick={toggleCharacterModel}
                    title="Switch Playable Explorer (Shortcut: C)"
                >
                    <UserCheck size={16} />
                    <span>
                        {characterModel === 'female'
                            ? 'Wanderer: Female (F)'
                            : 'Wanderer: Male (M)'}
                    </span>
                    <kbd className="hud-mini-key">C</kbd>
                </button>

                <button
                    className="hud-explorer-switch-pill"
                    onClick={() => {
                        setShowAssetCatalog((prev) => !prev);
                        setInputMode('cursor');
                    }}
                    title="Inspect 3D Asset Library in World"
                >
                    <Layers size={16} />
                    <span>3D Assets ({KEEPSAKE_ASSET_MANIFEST.length})</span>
                </button>

                <button
                    className="hud-circle-btn"
                    onClick={() =>
                        openMemory(nearbyMemory || persistentMemories[0])
                    }
                    title="Open Memory Journal"
                >
                    <BookOpen size={18} />
                </button>

                <button
                    className="hud-circle-btn"
                    onClick={handleReplayIntro}
                    title="Replay Brushstroke Loading Sequence"
                >
                    <Settings size={18} />
                </button>
            </div>

            {/* 3D Asset Library Quick-Inspector Modal */}
            {showAssetCatalog && (
                <div
                    className="memory-modal-backdrop"
                    onClick={() => setShowAssetCatalog(false)}
                >
                    <div
                        className="memory-parchment-card asset-catalog-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="memory-close-btn"
                            onClick={() => setShowAssetCatalog(false)}
                            aria-label="Close Asset Catalog"
                        >
                            <X size={20} />
                        </button>

                        <div className="memory-card-header">
                            <span className="memory-category-tag">
                                REAL-TIME 3D ASSET MANIFEST
                            </span>
                            <h2 className="memory-card-title">
                                Keepsake 3D World Library
                            </h2>
                            <p className="memory-card-subtitle">
                                Click any asset below to teleport your Explorer directly
                                to its location in the garden.
                            </p>
                        </div>

                        <div className="asset-manifest-list">
                            {KEEPSAKE_ASSET_MANIFEST.map((item) => (
                                <div key={item.id} className="asset-manifest-row">
                                    <div className="asset-manifest-info">
                                        <div className="asset-manifest-title-row">
                                            <strong>{item.name}</strong>
                                            <span className="asset-manifest-dim">
                                                {item.dimensions}
                                            </span>
                                        </div>
                                        <span className="asset-manifest-path">
                                            {item.filename}
                                        </span>
                                        <p className="asset-manifest-desc">
                                            {item.intendedUse}
                                        </p>
                                    </div>
                                    <button
                                        className="asset-teleport-btn"
                                        onClick={() => handleTeleportToAsset(item)}
                                    >
                                        <Navigation size={14} />
                                        <span>Visit in 3D</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Contextual Proximity Prompt */}
            {nearbyMemory && !currentMemoryData && !showAssetCatalog && (
                <div className="hud-proximity-prompt">
                    <button
                        className="remember-prompt-pill"
                        onClick={() => openMemory(nearbyMemory)}
                    >
                        <span className="remember-prompt-text">Remember?</span>
                        <kbd className="remember-prompt-key">E</kbd>
                    </button>
                    <span className="remember-prompt-subtitle">
                        {nearbyMemory.title} ({nearbyMemory.subtitle})
                    </span>
                </div>
            )}

            {/* Bottom-Left Controls */}
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
                    <span className="control-label">
                        {inputMode === 'camera'
                            ? 'Mode A: Camera Look Active'
                            : 'Mode B: UI Cursor Active (Click World or Alt to Look)'}
                    </span>
                </div>

                <div className="control-row">
                    <kbd
                        className={`key-cap key-wide ${inputMode === 'cursor' ? 'key-cap--active' : ''
                            }`}
                        onClick={toggleInputMode}
                        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                        Alt
                    </kbd>
                    <span className="control-label">Toggle Camera / UI Cursor</span>
                </div>

                <div className="control-row">
                    <kbd className="key-cap">E</kbd>
                    <span className="control-label">Awaken Memory Pedestal</span>
                </div>

                <div className="control-row">
                    <kbd className="key-cap key-wide">Shift</kbd>
                    <span className="control-label">Sprint</span>
                    <kbd className="key-cap key-wide" style={{ marginLeft: 4 }}>
                        Space
                    </kbd>
                    <span className="control-label">Jump</span>
                </div>
            </div>

            {/* Bottom-Right "Remember" Button */}
            <div className="hud-bottom-right">
                <button
                    className="hud-remember-main-btn"
                    onClick={() =>
                        openMemory(nearbyMemory || persistentMemories[0])
                    }
                >
                    <Sparkles size={18} className="remember-flower-icon" />
                    <span>Remember</span>
                </button>
            </div>

            {/* Memory Modal */}
            {currentMemoryData && (
                <div className="memory-modal-backdrop" onClick={closeMemory}>
                    <div
                        className="memory-parchment-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="memory-close-btn"
                            onClick={closeMemory}
                            aria-label="Close Memory Echo"
                        >
                            <X size={20} />
                        </button>

                        <div className="memory-card-header">
                            <div className="memory-badges-row">
                                <span className="memory-category-tag">
                                    {currentMemoryData.category.toUpperCase()} ECHO
                                </span>
                                <span className="memory-stage-badge">
                                    <Sprout size={13} />
                                    {currentMemoryData.subtitle}
                                </span>
                                {currentMemoryData.importance && (
                                    <span className="memory-importance-badge">
                                        {currentMemoryData.importance.toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <h2 className="memory-card-title">{currentMemoryData.title}</h2>
                            <p className="memory-card-subtitle">
                                {currentMemoryData.location}
                            </p>
                        </div>

                        <div className="memory-visual-frame">
                            <div className="memory-visual-art">
                                <div className="memory-art-sun" />
                                <div className="memory-art-mountains" />
                                <div className="memory-art-meadow" />
                                {currentMemoryData.echo?.ambientAudioLabel && (
                                    <div className="memory-echo-audio-pill">
                                        <Volume2 size={14} />
                                        <span>{currentMemoryData.echo.ambientAudioLabel}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {currentMemoryData.echo?.voiceTranscript && (
                            <blockquote className="memory-voice-echo">
                                {currentMemoryData.echo.voiceTranscript}
                            </blockquote>
                        )}

                        <div className="memory-meta-row">
                            <span className="memory-meta-item">
                                <Calendar size={14} /> {currentMemoryData.date}
                            </span>
                            <span className="memory-meta-item">
                                <MapPin size={14} /> {currentMemoryData.location}
                            </span>
                            {currentMemoryData.people && (
                                <span className="memory-meta-item">
                                    With: {currentMemoryData.people.join(', ')}
                                </span>
                            )}
                        </div>

                        <p className="memory-card-description">
                            {currentMemoryData.description}
                        </p>

                        <div className="memory-tag-list">
                            {currentMemoryData.tags.map((tag) => (
                                <span key={tag} className="memory-tag-chip">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        <div className="memory-card-footer">
                            {currentMemoryData.growthStage !== 'landmark' && (
                                <button
                                    className="memory-nourish-btn"
                                    onClick={() => advanceMemoryGrowth(currentMemoryData.id)}
                                >
                                    <Sprout size={16} />
                                    <span>Nourish Memory Growth</span>
                                </button>
                            )}
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