// src/components/UI/GameHUD.tsx
import React, { useEffect, useState } from 'react';
import {
    BookOpen,
    Compass,
    Flower2,
    HelpCircle,
    MapPin,
    MousePointer,
    Plus,
    RefreshCw,
    Sparkles,
    UserCheck,
    X,
} from 'lucide-react';
import {
    playerTelemetry,
    useGameStore,
} from '../../store/useGameStore';
import {
    BIOME_CONFIGS,
    getGardenTerrainHeight,
} from '../../scenes/Environment/lowPolyUtils';
import type {
    MemoryCategory,
    MemoryImportance,
    MemoryItem,
} from '../../systems/MemoryManager/memoryTypes';
import './GameHUD.css';

export const GameHUD: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const setPhase = useGameStore((state) => state.setPhase);
    const inputMode = useGameStore((state) => state.inputMode);
    const toggleInputMode = useGameStore((state) => state.toggleInputMode);
    const characterModel = useGameStore((state) => state.characterModel);
    const worldSeed = useGameStore((state) => state.worldSeed);
    const setWorldSeed = useGameStore((state) => state.setWorldSeed);
    const regenerateWorldSeed = useGameStore(
        (state) => state.regenerateWorldSeed
    );
    const currentBiome = useGameStore((state) => state.currentBiome);

    const nearbyMemory = useGameStore((state) => state.nearbyMemory);
    const nearbyZone = useGameStore((state) => state.nearbyZone);
    const activeMemory = useGameStore((state) => state.activeMemory);
    const openMemory = useGameStore((state) => state.openMemory);
    const closeMemory = useGameStore((state) => state.closeMemory);
    const activeModal = useGameStore((state) => state.activeModal);
    const setActiveModal = useGameStore((state) => state.setActiveModal);

    const persistentMemories = useGameStore(
        (state) => state.persistentMemories
    );
    const discoveredIds = useGameStore((state) => state.discoveredIds);
    const advanceMemoryGrowth = useGameStore(
        (state) => state.advanceMemoryGrowth
    );
    const addNewMemory = useGameStore((state) => state.addNewMemory);

    const quality = useGameStore((state) => state.quality);
    const toggleQuality = useGameStore((state) => state.toggleQuality);

    const [seedInput, setSeedInput] = useState(worldSeed);
    const [showControlsHelp, setShowControlsHelp] = useState(false);

    // Create Memory Form State
    const [newTitle, setNewTitle] = useState('');
    const [newSubtitle, setNewSubtitle] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newCategory, setNewCategory] = useState<MemoryCategory>('photo');
    const [newImportance, setNewImportance] =
        useState<MemoryImportance>('cherished');
    const [newDescription, setNewDescription] = useState('');
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        setSeedInput(worldSeed);
    }, [worldSeed]);

    useEffect(() => {
        if (phase !== 'exploring') return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA'
            ) {
                return;
            }

            if (e.code === 'KeyE' && nearbyMemory && activeModal === 'none') {
                e.preventDefault();
                openMemory(nearbyMemory);
            } else if (e.code === 'KeyJ') {
                e.preventDefault();
                setActiveModal(
                    activeModal === 'journal' ? 'none' : 'journal'
                );
            } else if (e.code === 'Escape' && activeModal !== 'none') {
                e.preventDefault();
                if (activeModal === 'memory') closeMemory();
                else setActiveModal('none');
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        phase,
        nearbyMemory,
        activeModal,
        openMemory,
        closeMemory,
        setActiveModal,
    ]);

    if (phase !== 'exploring') return null;

    const biomeInfo = BIOME_CONFIGS[currentBiome] ?? BIOME_CONFIGS.memory_sanctuary;

    const handlePlantMemory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        const [px, , pz] = playerTelemetry.position;
        const yaw = playerTelemetry.rotationY;
        const placeX = px + Math.sin(yaw) * 2.2;
        const placeZ = pz + Math.cos(yaw) * 2.2;
        const placeY = getGardenTerrainHeight(placeX, placeZ);

        const created: MemoryItem = {
            id: `mem-custom-${Date.now()}`,
            title: newTitle.trim(),
            subtitle: newSubtitle.trim() || 'Personal Keepsake',
            date: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }),
            location: newLocation.trim() || biomeInfo.name,
            category: newCategory,
            pedestalVariant:
                newImportance === 'core'
                    ? 'grand_portal'
                    : newImportance === 'milestone'
                        ? 'arched'
                        : 'minimal',
            description:
                newDescription.trim() ||
                'A quiet moment preserved within the sanctuary garden.',
            position: [placeX, placeY, placeZ],
            rotationY: yaw + Math.PI,
            tags: ['Personal', biomeInfo.name],
            importance: newImportance,
            growthStage: 'seed',
            interactionState: 'awakened',
            isDiscovered: true,
            echo: {
                floatingPhotoTitle: newTitle.trim(),
                writtenNote:
                    newNote.trim() ||
                    newDescription.trim() ||
                    'Planted with care in the garden.',
            },
        };

        addNewMemory(created);
        setNewTitle('');
        setNewSubtitle('');
        setNewLocation('');
        setNewDescription('');
        setNewNote('');
        setActiveModal('none');
    };

    const handleApplySeed = (e: React.FormEvent) => {
        e.preventDefault();
        if (seedInput.trim()) {
            setWorldSeed(seedInput.trim());
        }
    };

    return (
        <div className="hud-overlay">
            {/* ================================================================
                TOP BAR: Compact Parchment Biome Pill & Action Buttons
               ================================================================ */}
            <header className="hud-top-bar" data-ui-interactive="true">
                {/* Left: Biome & Memory Counter Pill */}
                <div className="hud-parchment-pill hud-biome-pill">
                    <Compass size={16} className="hud-icon-warm" />
                    <div className="hud-biome-text">
                        <span className="hud-biome-name">{biomeInfo.name}</span>
                        <span className="hud-biome-sep">·</span>
                        <span className="hud-memory-tally">
                            {discoveredIds.length}/{persistentMemories.length} Keepsakes
                        </span>
                    </div>
                </div>

                {/* Right: Compact Parchment Buttons matching "Enter the Garden" */}
                <div className="hud-action-group">
                    <button
                        type="button"
                        className={`hud-parchment-btn ${
                            activeModal === 'journal' ? 'hud-parchment-btn--active' : ''
                        }`}
                        onClick={() =>
                            setActiveModal(
                                activeModal === 'journal' ? 'none' : 'journal'
                            )
                        }
                        title="Memory Chronicle (J)"
                    >
                        <BookOpen size={15} />
                        <span>Chronicle</span>
                    </button>

                    <button
                        type="button"
                        className={`hud-parchment-btn ${
                            activeModal === 'createMemory'
                                ? 'hud-parchment-btn--active'
                                : ''
                        }`}
                        onClick={() =>
                            setActiveModal(
                                activeModal === 'createMemory'
                                    ? 'none'
                                    : 'createMemory'
                            )
                        }
                        title="Plant a New Keepsake Memory"
                    >
                        <Plus size={15} />
                        <span>Plant Memory</span>
                    </button>

                    <button
                        type="button"
                        className="hud-parchment-btn"
                        onClick={() => setPhase('characterSelect')}
                        title="Switch Wanderer"
                    >
                        <UserCheck size={15} />
                        <span className="hud-btn-label-desktop">
                            {characterModel === 'female' ? 'Aria' : 'Rowan'}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`hud-parchment-btn hud-parchment-btn--icon ${
                            activeModal === 'settings'
                                ? 'hud-parchment-btn--active'
                                : ''
                        }`}
                        onClick={() =>
                            setActiveModal(
                                activeModal === 'settings' ? 'none' : 'settings'
                            )
                        }
                        title="World Seed & Quality Settings"
                        aria-label="World Seed and Quality Settings"
                    >
                        <Sparkles size={15} />
                    </button>

                    <button
                        type="button"
                        className={`hud-parchment-btn hud-parchment-btn--icon ${
                            showControlsHelp ? 'hud-parchment-btn--active' : ''
                        }`}
                        onClick={() => setShowControlsHelp((v) => !v)}
                        title="Controls & Guide"
                        aria-label="Controls and Guide"
                    >
                        <HelpCircle size={15} />
                    </button>
                </div>
            </header>

            {/* ================================================================
                LANDMARK ZONE BANNER (Subtle Top-Center Notification)
               ================================================================ */}
            {nearbyZone && activeModal === 'none' && (
                <div className="hud-zone-banner" data-ui-interactive="true">
                    <span className="hud-zone-kicker">Sanctuary Landmark</span>
                    <strong className="hud-zone-title">{nearbyZone.name}</strong>
                </div>
            )}

            {/* ================================================================
                NEARBY MEMORY INTERACTION PROMPT (Bottom-Center Parchment Button)
               ================================================================ */}
            {nearbyMemory && activeModal === 'none' && (
                <div className="hud-interact-dock" data-ui-interactive="true">
                    <button
                        type="button"
                        className="hud-interact-btn"
                        onClick={() => openMemory(nearbyMemory)}
                    >
                        <span className="hud-interact-key">E</span>
                        <div className="hud-interact-copy">
                            <span className="hud-interact-kicker">
                                Inspect Keepsake
                            </span>
                            <strong className="hud-interact-title">
                                {nearbyMemory.title}
                            </strong>
                        </div>
                    </button>
                </div>
            )}

            {/* ================================================================
                CONTROLS & CURSOR MODE PILL (Bottom-Right)
               ================================================================ */}
            <div className="hud-bottom-right" data-ui-interactive="true">
                {showControlsHelp && (
                    <div className="hud-controls-popover">
                        <div className="hud-popover-header">
                            <span>Wanderer Controls</span>
                            <button
                                type="button"
                                className="hud-close-mini"
                                onClick={() => setShowControlsHelp(false)}
                                aria-label="Close help"
                            >
                                <X size={13} />
                            </button>
                        </div>
                        <ul className="hud-controls-list">
                            <li>
                                <span>Move</span>
                                <strong>WASD / Left Joystick</strong>
                            </li>
                            <li>
                                <span>Sprint</span>
                                <strong>Shift / Full Tilt</strong>
                            </li>
                            <li>
                                <span>Jump</span>
                                <strong>Space</strong>
                            </li>
                            <li>
                                <span>Look Around</span>
                                <strong>Mouse / Right Touch Drag</strong>
                            </li>
                            <li>
                                <span>Cursor Mode</span>
                                <strong>Alt / Esc</strong>
                            </li>
                        </ul>
                    </div>
                )}

                <button
                    type="button"
                    className="hud-parchment-btn hud-mode-pill"
                    onClick={toggleInputMode}
                    title="Toggle Camera Look / Cursor Mode (Alt)"
                >
                    <MousePointer size={13} />
                    <span>
                        {inputMode === 'camera' ? 'Camera Look' : 'Free Cursor'}
                    </span>
                </button>
            </div>

            {/* ================================================================
                MODAL 1: MEMORY INSPECTION CARD
               ================================================================ */}
            {activeModal === 'memory' && activeMemory && (
                <div
                    className="hud-modal-backdrop"
                    data-ui-interactive="true"
                    onClick={closeMemory}
                >
                    <article
                        className="hud-modal-card hud-memory-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="hud-modal-header">
                            <div>
                                <span className="hud-modal-kicker">
                                    {activeMemory.category.toUpperCase()} ·{' '}
                                    {activeMemory.date}
                                </span>
                                <h2 className="hud-modal-title">
                                    {activeMemory.title}
                                </h2>
                                <p className="hud-modal-subtitle">
                                    <MapPin size={13} />
                                    <span>{activeMemory.location}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                className="hud-parchment-btn hud-parchment-btn--icon"
                                onClick={closeMemory}
                                aria-label="Close memory"
                            >
                                <X size={16} />
                            </button>
                        </header>

                        <div className="hud-memory-body">
                            <p className="hud-memory-description">
                                {activeMemory.description}
                            </p>

                            {activeMemory.echo?.writtenNote && (
                                <blockquote className="hud-memory-quote">
                                    “{activeMemory.echo.writtenNote}”
                                </blockquote>
                            )}

                            {activeMemory.tags && activeMemory.tags.length > 0 && (
                                <div className="hud-tag-row">
                                    {activeMemory.tags.map((tag) => (
                                        <span key={tag} className="hud-tag-chip">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <footer className="hud-modal-footer">
                            <span className="hud-growth-badge">
                                <Flower2 size={14} />
                                <span>
                                    Stage: {activeMemory.growthStage || 'seed'}
                                </span>
                            </span>

                            <div className="hud-modal-actions">
                                <button
                                    type="button"
                                    className="hud-parchment-btn"
                                    onClick={() =>
                                        advanceMemoryGrowth(activeMemory.id)
                                    }
                                >
                                    <Flower2 size={14} />
                                    <span>Nurture Memory</span>
                                </button>
                                <button
                                    type="button"
                                    className="hud-parchment-btn hud-parchment-btn--primary"
                                    onClick={closeMemory}
                                >
                                    <span>Return to Garden</span>
                                </button>
                            </div>
                        </footer>
                    </article>
                </div>
            )}

            {/* ================================================================
                MODAL 2: MEMORY CHRONICLE (JOURNAL)
               ================================================================ */}
            {activeModal === 'journal' && (
                <div
                    className="hud-modal-backdrop"
                    data-ui-interactive="true"
                    onClick={() => setActiveModal('none')}
                >
                    <section
                        className="hud-modal-card hud-journal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="hud-modal-header">
                            <div>
                                <span className="hud-modal-kicker">
                                    Sanctuary Archive
                                </span>
                                <h2 className="hud-modal-title">
                                    Keepsake Chronicle
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="hud-parchment-btn hud-parchment-btn--icon"
                                onClick={() => setActiveModal('none')}
                                aria-label="Close chronicle"
                            >
                                <X size={16} />
                            </button>
                        </header>

                        <div className="hud-journal-grid">
                            {persistentMemories.map((mem) => {
                                const isFound = discoveredIds.includes(mem.id);
                                return (
                                    <button
                                        key={mem.id}
                                        type="button"
                                        className={`hud-journal-item ${
                                            isFound
                                                ? 'hud-journal-item--found'
                                                : ''
                                        }`}
                                        onClick={() => openMemory(mem)}
                                    >
                                        <span className="hud-journal-meta">
                                            {mem.date} · {mem.location}
                                        </span>
                                        <strong className="hud-journal-name">
                                            {mem.title}
                                        </strong>
                                        <span className="hud-journal-sub">
                                            {mem.subtitle}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}

            {/* ================================================================
                MODAL 3: PLANT NEW MEMORY
               ================================================================ */}
            {activeModal === 'createMemory' && (
                <div
                    className="hud-modal-backdrop"
                    data-ui-interactive="true"
                    onClick={() => setActiveModal('none')}
                >
                    <section
                        className="hud-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="hud-modal-header">
                            <div>
                                <span className="hud-modal-kicker">
                                    New Sanctuary Shrine
                                </span>
                                <h2 className="hud-modal-title">
                                    Plant a Keepsake Memory
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="hud-parchment-btn hud-parchment-btn--icon"
                                onClick={() => setActiveModal('none')}
                                aria-label="Close form"
                            >
                                <X size={16} />
                            </button>
                        </header>

                        <form
                            className="hud-form"
                            onSubmit={handlePlantMemory}
                        >
                            <label className="hud-field">
                                <span>Memory Title</span>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Golden Hour by the Old Bridge"
                                    value={newTitle}
                                    onChange={(e) =>
                                        setNewTitle(e.target.value)
                                    }
                                />
                            </label>

                            <div className="hud-field-row">
                                <label className="hud-field">
                                    <span>Subtitle</span>
                                    <input
                                        type="text"
                                        placeholder="Shared Moment"
                                        value={newSubtitle}
                                        onChange={(e) =>
                                            setNewSubtitle(e.target.value)
                                        }
                                    />
                                </label>
                                <label className="hud-field">
                                    <span>Location</span>
                                    <input
                                        type="text"
                                        placeholder={biomeInfo.name}
                                        value={newLocation}
                                        onChange={(e) =>
                                            setNewLocation(e.target.value)
                                        }
                                    />
                                </label>
                            </div>

                            <div className="hud-field-row">
                                <label className="hud-field">
                                    <span>Category</span>
                                    <select
                                        value={newCategory}
                                        onChange={(e) =>
                                            setNewCategory(
                                                e.target.value as MemoryCategory
                                            )
                                        }
                                    >
                                        <option value="photo">Photograph</option>
                                        <option value="letter">Written Letter</option>
                                        <option value="music">Melody</option>
                                        <option value="voice">Voice Echo</option>
                                        <option value="shrine">Sacred Shrine</option>
                                    </select>
                                </label>
                                <label className="hud-field">
                                    <span>Pedestal Style</span>
                                    <select
                                        value={newImportance}
                                        onChange={(e) =>
                                            setNewImportance(
                                                e.target
                                                    .value as MemoryImportance
                                            )
                                        }
                                    >
                                        <option value="cherished">
                                            Minimal Stone Altar
                                        </option>
                                        <option value="milestone">
                                            Arched Shrine
                                        </option>
                                        <option value="core">
                                            Grand Monolith Portal
                                        </option>
                                    </select>
                                </label>
                            </div>

                            <label className="hud-field">
                                <span>Story / Reflection</span>
                                <textarea
                                    rows={3}
                                    placeholder="Describe the memory preserved here…"
                                    value={newDescription}
                                    onChange={(e) =>
                                        setNewDescription(e.target.value)
                                    }
                                />
                            </label>

                            <footer className="hud-modal-footer">
                                <button
                                    type="button"
                                    className="hud-parchment-btn"
                                    onClick={() => setActiveModal('none')}
                                >
                                    <span>Cancel</span>
                                </button>
                                <button
                                    type="submit"
                                    className="hud-parchment-btn hud-parchment-btn--primary"
                                >
                                    <Plus size={15} />
                                    <span>Plant in Garden</span>
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            {/* ================================================================
                MODAL 4: WORLD SEED & GRAPHICS QUALITY SETTINGS
               ================================================================ */}
            {activeModal === 'settings' && (
                <div
                    className="hud-modal-backdrop"
                    data-ui-interactive="true"
                    onClick={() => setActiveModal('none')}
                >
                    <section
                        className="hud-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="hud-modal-header">
                            <div>
                                <span className="hud-modal-kicker">
                                    Garden Configuration
                                </span>
                                <h2 className="hud-modal-title">
                                    World Seed & Performance
                                </h2>
                            </div>
                            <button
                                type="button"
                                className="hud-parchment-btn hud-parchment-btn--icon"
                                onClick={() => setActiveModal('none')}
                                aria-label="Close settings"
                            >
                                <X size={16} />
                            </button>
                        </header>

                        <div className="hud-settings-content">
                            <form
                                className="hud-seed-row"
                                onSubmit={handleApplySeed}
                            >
                                <label className="hud-field">
                                    <span>Deterministic World Seed</span>
                                    <input
                                        type="text"
                                        value={seedInput}
                                        onChange={(e) =>
                                            setSeedInput(e.target.value)
                                        }
                                    />
                                </label>
                                <div className="hud-seed-buttons">
                                    <button
                                        type="submit"
                                        className="hud-parchment-btn"
                                    >
                                        <span>Apply</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="hud-parchment-btn"
                                        onClick={() => {
                                            const next = regenerateWorldSeed();
                                            setSeedInput(next);
                                        }}
                                    >
                                        <RefreshCw size={14} />
                                        <span>New Seed</span>
                                    </button>
                                </div>
                            </form>

                            <div className="hud-quality-row">
                                <div>
                                    <strong className="hud-quality-label">
                                        Rendering Quality Preset
                                    </strong>
                                    <p className="hud-quality-desc">
                                        Adjusts shadow resolution and pixel density for smoother framerates.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="hud-parchment-btn hud-parchment-btn--primary"
                                    onClick={toggleQuality}
                                >
                                    <span>
                                        {quality === 'high'
                                            ? 'High Fidelity'
                                            : 'Performance'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};
