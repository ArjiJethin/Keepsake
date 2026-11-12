// src/components/UI/GameHUD.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    BookOpen,
    Settings,
    X,
    MapPin,
    Calendar,
    Volume2,
    Sprout,
    Layers,
    Navigation,
    RefreshCw,
    Hash,
    Check,
    Feather,
    MousePointer2,
} from 'lucide-react';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import {
    BIOME_CONFIGS,
    getGardenTerrainHeight,
} from '../../scenes/Environment/lowPolyUtils';
import {
    KEEPSAKE_ASSET_MANIFEST,
    type AssetManifestEntry,
} from '../../systems/AssetManager/glbExporter';
import './GameHUD.css';

const WANDERER_NAMES = {
    female: 'Aria',
    male: 'Rowan',
} as const;

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
    const worldSeed = useGameStore((state) => state.worldSeed);
    const setWorldSeed = useGameStore((state) => state.setWorldSeed);
    const regenerateWorldSeed = useGameStore(
        (state) => state.regenerateWorldSeed
    );
    const currentBiome = useGameStore((state) => state.currentBiome);
    const setPhase = useGameStore((state) => state.setPhase);
    const setIntroStage = useGameStore((state) => state.setIntroStage);

    const [showAssetCatalog, setShowAssetCatalog] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isEditingSeed, setIsEditingSeed] = useState(false);
    const [seedDraft, setSeedDraft] = useState(worldSeed);

    const settingsAnchorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSeedDraft(worldSeed);
    }, [worldSeed]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (isEditingSeed) return;
            const state = useGameStore.getState();
            if (e.code === 'KeyC' && phase === 'exploring' && !state.activeMemory) {
                toggleCharacterModel();
            }
            if (e.code === 'Escape') {
                setShowSettings(false);
                setShowAssetCatalog(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [phase, toggleCharacterModel, isEditingSeed]);

    // Clicking anywhere outside the settings popover dismisses it
    useEffect(() => {
        if (!showSettings) return;
        const onPointerDown = (event: PointerEvent) => {
            const anchor = settingsAnchorRef.current;
            if (anchor && !anchor.contains(event.target as Node)) {
                setShowSettings(false);
            }
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [showSettings]);

    if (phase !== 'exploring') return null;

    const currentMemoryData = activeMemory
        ? persistentMemories.find((m) => m.id === activeMemory.id) || activeMemory
        : null;

    const activeBiomeMeta = BIOME_CONFIGS[currentBiome];

    const handleReplayIntro = () => {
        closeMemory();
        setShowAssetCatalog(false);
        setShowSettings(false);
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

    const handleApplyCustomSeed = (e: React.FormEvent) => {
        e.preventDefault();
        if (seedDraft.trim().length > 0) {
            setWorldSeed(seedDraft.trim());
        }
        setIsEditingSeed(false);
        setInputMode('camera');
    };

    const handleRegenerateWorld = () => {
        const nextSeed = regenerateWorldSeed();
        setSeedDraft(nextSeed);
        setIsEditingSeed(false);
    };

    const handleOpenJournal = () => {
        const target = nearbyMemory || persistentMemories[0];
        if (target) openMemory(target);
    };

    const regionLabel = nearbyZone ? nearbyZone.name : activeBiomeMeta.name;

    return (
        <div className="kh-hud">
            {/* Top-left: wordmark only, like a title watermark */}
            <div className="kh-brand">
                <span className="kh-brand-text">Keepsake</span>
                <svg
                    className="kh-brand-leaf"
                    viewBox="0 0 32 32"
                    width="17"
                    height="17"
                    aria-hidden="true"
                >
                    <path d="M6,26 C10,12 20,6 30,4 C26,16 18,24 6,26 Z" fill="currentColor" />
                </svg>
            </div>

            {/* Top-center: region name, nothing else */}
            {!currentMemoryData && !showAssetCatalog && !showSettings && (
                <div className="kh-region-pill">
                    <MapPin size={12} strokeWidth={2.2} />
                    <span>{regionLabel}</span>
                </div>
            )}

            {/* Top-right: icon rail */}
            <div className="kh-icon-rail">
                <button
                    type="button"
                    className="kh-icon-btn"
                    onClick={handleOpenJournal}
                    title="Memory journal"
                >
                    <BookOpen size={16} />
                    <span className="kh-icon-badge">
                        {discoveredIds.length}/{persistentMemories.length}
                    </span>
                </button>

                <button
                    type="button"
                    className={`kh-icon-btn${showAssetCatalog ? ' kh-icon-btn--on' : ''}`}
                    onClick={() => {
                        setShowAssetCatalog((prev) => !prev);
                        setShowSettings(false);
                        setInputMode('cursor');
                    }}
                    title={`World library — ${KEEPSAKE_ASSET_MANIFEST.length} models`}
                >
                    <Layers size={16} />
                    <span className="kh-icon-badge kh-icon-badge--count">
                        {KEEPSAKE_ASSET_MANIFEST.length}
                    </span>
                </button>

                <div className="kh-settings-anchor" ref={settingsAnchorRef}>
                    <button
                        type="button"
                        className={`kh-icon-btn${showSettings ? ' kh-icon-btn--on' : ''}`}
                        onClick={() => {
                            setShowSettings((prev) => !prev);
                            setShowAssetCatalog(false);
                        }}
                        title="Settings"
                        aria-expanded={showSettings}
                    >
                        <Settings size={16} />
                    </button>

                    {showSettings && (
                        <div className="kh-settings" role="dialog" aria-label="Settings">
                            <div className="kh-settings-head">
                                <span className="kh-settings-title">Settings</span>
                                <button
                                    type="button"
                                    className="kh-settings-close"
                                    onClick={() => setShowSettings(false)}
                                    aria-label="Close settings"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="kh-settings-body">
                                <div className="kh-setting-line">
                                    <span className="kh-setting-label">Wanderer</span>
                                    <span className="kh-setting-value">
                                        {WANDERER_NAMES[characterModel]}
                                        <kbd className="kh-key">C</kbd>
                                    </span>
                                </div>

                                <div className="kh-setting-block">
                                    <span className="kh-setting-label">World seed</span>
                                    {!isEditingSeed ? (
                                        <div className="kh-seed-row">
                                            <span className="kh-seed-value">
                                                <Hash size={11} />
                                                {worldSeed}
                                            </span>
                                            <button
                                                type="button"
                                                className="kh-icon-mini"
                                                onClick={() => {
                                                    setIsEditingSeed(true);
                                                    setInputMode('cursor');
                                                }}
                                                title="Enter a custom seed"
                                            >
                                                <Feather size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                className="kh-icon-mini"
                                                onClick={handleRegenerateWorld}
                                                title="Generate a new world"
                                            >
                                                <RefreshCw size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <form
                                            className="kh-seed-form"
                                            onSubmit={handleApplyCustomSeed}
                                        >
                                            <input
                                                className="kh-seed-input"
                                                value={seedDraft}
                                                onChange={(e) => setSeedDraft(e.target.value)}
                                                placeholder="Seed…"
                                                maxLength={24}
                                                autoFocus
                                            />
                                            <button
                                                type="submit"
                                                className="kh-icon-mini kh-icon-mini--apply"
                                                title="Load this seed"
                                            >
                                                <Check size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                className="kh-icon-mini"
                                                onClick={() => setIsEditingSeed(false)}
                                                title="Cancel"
                                            >
                                                <X size={13} />
                                            </button>
                                        </form>
                                    )}
                                </div>

                                <div className="kh-settings-actions">
                                    <button
                                        type="button"
                                        className="kh-settings-btn"
                                        onClick={handleReplayIntro}
                                    >
                                        Return to title
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* World library modal */}
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
                            type="button"
                            className="memory-close-btn"
                            onClick={() => setShowAssetCatalog(false)}
                            aria-label="Close world library"
                        >
                            <X size={18} />
                        </button>

                        <div className="memory-card-header">
                            <span className="memory-category-tag">World Asset Library</span>
                            <h2 className="memory-card-title">Keepsake 3D World Library</h2>
                            <p className="memory-card-subtitle">
                                Pick any model to travel straight to where it rests in
                                the garden.
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
                                        type="button"
                                        className="asset-teleport-btn"
                                        onClick={() => handleTeleportToAsset(item)}
                                    >
                                        <Navigation size={14} />
                                        <span>Visit</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Contextual proximity prompt */}
            {nearbyMemory && !currentMemoryData && !showAssetCatalog && (
                <div className="hud-proximity-prompt">
                    <button
                        type="button"
                        className="remember-prompt-pill"
                        onClick={() => openMemory(nearbyMemory)}
                    >
                        <span className="remember-prompt-text">Remember?</span>
                        <kbd className="hud-mini-key hud-mini-key--ink">E</kbd>
                    </button>
                    <span className="remember-prompt-subtitle">
                        {nearbyMemory.title}
                    </span>
                </div>
            )}

            {/* Bottom-left: compact control legend */}
            <div className="kh-controls">
                <div className="kh-controls-row">
                    <span className="kh-controls-label">Move</span>
                    <span className="kh-key-cluster">
                        <kbd className="kh-key">W</kbd>
                        <kbd className="kh-key">A</kbd>
                        <kbd className="kh-key">S</kbd>
                        <kbd className="kh-key">D</kbd>
                    </span>
                    <span className="kh-control-inline">
                        <kbd className="kh-key kh-key--wide">Shift</kbd>
                        <span>Sprint</span>
                    </span>
                    <span className="kh-control-inline">
                        <kbd className="kh-key kh-key--wide">Space</kbd>
                        <span>Jump</span>
                    </span>
                </div>

                <div className="kh-controls-row">
                    <span className="kh-controls-label">Act</span>
                    <button
                        type="button"
                        className="kh-control-inline kh-control-inline--btn"
                        onClick={() => openMemory(nearbyMemory || persistentMemories[0])}
                        title="Remember a memory"
                    >
                        <kbd className="kh-key">E</kbd>
                        <span>Remember</span>
                    </button>
                    <button
                        type="button"
                        className="kh-control-inline kh-control-inline--btn"
                        onClick={toggleCharacterModel}
                        title="Change character"
                    >
                        <kbd className="kh-key">C</kbd>
                        <span>Character</span>
                    </button>
                    <button
                        type="button"
                        className={`kh-control-inline kh-control-inline--btn${inputMode === 'cursor' ? ' kh-control-inline--on' : ''
                            }`}
                        onClick={toggleInputMode}
                        title="Toggle camera and cursor mode"
                    >
                        <MousePointer2 size={11} strokeWidth={2.3} />
                        <kbd className="kh-key kh-key--wide">Alt</kbd>
                        <span>{inputMode === 'cursor' ? 'Cursor' : 'Look'}</span>
                    </button>
                </div>
            </div>

            {/* Memory echo modal */}
            {currentMemoryData && (
                <div className="memory-modal-backdrop" onClick={closeMemory}>
                    <div
                        className="memory-parchment-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="memory-close-btn"
                            onClick={closeMemory}
                            aria-label="Close memory echo"
                        >
                            <X size={18} />
                        </button>

                        <div className="memory-card-header">
                            <div className="memory-badges-row">
                                <span className="memory-category-tag">
                                    {currentMemoryData.category} echo
                                </span>
                                <span className="memory-stage-badge">
                                    <Sprout size={12} />
                                    {currentMemoryData.subtitle}
                                </span>
                                {currentMemoryData.importance && (
                                    <span className="memory-importance-badge">
                                        {currentMemoryData.importance}
                                    </span>
                                )}
                            </div>
                            <h2 className="memory-card-title">
                                {currentMemoryData.title}
                            </h2>
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
                                        <Volume2 size={13} />
                                        <span>
                                            {currentMemoryData.echo.ambientAudioLabel}
                                        </span>
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
                                <Calendar size={13} /> {currentMemoryData.date}
                            </span>
                            <span className="memory-meta-item">
                                <MapPin size={13} /> {currentMemoryData.location}
                            </span>
                            {currentMemoryData.people && (
                                <span className="memory-meta-item">
                                    With {currentMemoryData.people.join(', ')}
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
                                    type="button"
                                    className="memory-nourish-btn"
                                    onClick={() =>
                                        advanceMemoryGrowth(currentMemoryData.id)
                                    }
                                >
                                    <Sprout size={15} />
                                    <span>Nourish</span>
                                </button>
                            )}
                            <button
                                type="button"
                                className="memory-return-btn"
                                onClick={closeMemory}
                            >
                                Return to the Garden
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
