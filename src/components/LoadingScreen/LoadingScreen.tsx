// src/components/LoadingScreen/LoadingScreen.tsx
import React, { useEffect } from 'react';
import { useGameStore, type IntroStage } from '../../store/useGameStore';
import './LoadingScreen.css';

export const LoadingScreen: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const setPhase = useGameStore((state) => state.setPhase);
    const introStage = useGameStore((state) => state.introStage);
    const setIntroStage = useGameStore((state) => state.setIntroStage);

    useEffect(() => {
        if (phase !== 'loading') return;

        setIntroStage(1);

        // Stage 1 -> Stage 2: Brush begins painting "Keepsake" across the sky canvas
        const t1 = setTimeout(() => setIntroStage(2), 650);
        // Stage 2 -> Stage 3: Title complete, reveal subtitle & botanical leaf divider
        const t2 = setTimeout(() => setIntroStage(3), 3100);
        // Stage 3 -> Stage 4: Camera settles & interactive stone "Enter the Garden" button appears
        const t3 = setTimeout(() => setIntroStage(4), 4000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [phase, setIntroStage]);

    const handleEnterGarden = () => {
        if (introStage >= 5) return;
        setIntroStage(5 as IntroStage); // Frame 6: Circular brushstroke ring + "Entering the Garden..."

        const tFade = setTimeout(() => {
            setIntroStage(6 as IntroStage);
        }, 2400);

        const tExplore = setTimeout(() => {
            setPhase('exploring');
        }, 3200);

        return () => {
            clearTimeout(tFade);
            clearTimeout(tExplore);
        };
    };

    if (phase === 'exploring') {
        return null;
    }

    return (
        <div
            className={`keepsake-loading-overlay ${introStage === 6 ? 'keepsake-loading-overlay--fade-out' : ''
                }`}
        >
            {/* Subtle painterly warm radial atmosphere over the live 3D garden */}
            <div
                className={`loading-atmosphere-veil ${introStage <= 2 ? 'loading-atmosphere-veil--misty' : ''
                    }`}
            />

            {/* Main Centered Composition matching LoadingScreen.png */}
            <div className="loading-content-frame">
                {/* Calligraphic Logo, Brush Animation, Subtitle & Botanical Divider */}
                <div
                    className={`brand-header-group ${introStage >= 2 ? 'brand-header-group--visible' : ''
                        }`}
                >
                    <div className="logo-svg-stage">
                        <svg
                            className="keepsake-logo-svg"
                            viewBox="0 0 920 250"
                            preserveAspectRatio="xMidYMid meet"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                {/* Progressive Horizontal Brush Reveal Mask */}
                                <mask id="calligraphyBrushMask">
                                    <path
                                        className={`mask-reveal-stroke ${introStage >= 2 ? 'mask-reveal-stroke--active' : ''
                                            }`}
                                        d="M 60,125 L 860,125"
                                        stroke="#ffffff"
                                        strokeWidth="260"
                                        strokeLinecap="round"
                                        fill="none"
                                    />
                                </mask>

                                {/* Soft Warm Drop Shadow for Cream Calligraphy */}
                                <filter
                                    id="logoSoftShadow"
                                    x="-15%"
                                    y="-15%"
                                    width="130%"
                                    height="130%"
                                >
                                    <feDropShadow
                                        dx="0"
                                        dy="4"
                                        stdDeviation="6"
                                        floodColor="#3b2422"
                                        floodOpacity="0.45"
                                    />
                                </filter>
                            </defs>

                            {/* Masked Calligraphic Wordmark & Leaf Motif */}
                            <g mask="url(#calligraphyBrushMask)" filter="url(#logoSoftShadow)">
                                {/* Hand-lettered "Keepsake" in Cream Ink */}
                                <text
                                    x="452"
                                    y="152"
                                    textAnchor="middle"
                                    className="keepsake-svg-wordmark"
                                >
                                    Keepsake
                                </text>

                                {/* Sweeping Calligraphic Underline Flourish (From K stem under eepsake) */}
                                <path
                                    className={`keepsake-underline-flourish ${introStage >= 2 ? 'keepsake-underline-flourish--active' : ''
                                        }`}
                                    d="M 218,136 C 285,198 375,212 492,188 C 565,173 638,168 690,182"
                                    fill="none"
                                    stroke="#f7ecda"
                                    strokeWidth="5.5"
                                    strokeLinecap="round"
                                />
                                {/* Secondary tapered inner stroke for authentic bristle thickness */}
                                <path
                                    d="M 245,155 C 310,202 385,208 492,186 C 555,174 615,170 665,178"
                                    fill="none"
                                    stroke="#f7ecda"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    opacity="0.85"
                                />

                                {/* Signature Two-Leaf Accent at Top-Right of 'e' (Matches LoadingScreen.png) */}
                                <g transform="translate(715, 58) rotate(-8)">
                                    {/* Stem */}
                                    <path
                                        d="M -6,28 Q 8,14 26,-2"
                                        stroke="#f7ecda"
                                        strokeWidth="2.6"
                                        strokeLinecap="round"
                                        fill="none"
                                    />
                                    {/* Upper main leaf */}
                                    <path
                                        d="M 6,16 C 10,-2 28,-12 46,-14 C 40,6 26,20 6,16 Z"
                                        fill="#f7ecda"
                                    />
                                    {/* Small side leaf */}
                                    <path
                                        d="M -4,20 C -10,8 -4,-4 8,-8 C 8,4 4,14 -4,20 Z"
                                        fill="#f2dfc4"
                                    />
                                </g>
                            </g>
                        </svg>

                        {/* Artist Paintbrush Following the Calligraphic Stroke (Stage 2) */}
                        {introStage === 2 && (
                            <div className="artist-paintbrush-follower" aria-hidden="true">
                                <svg viewBox="0 0 220 70" width="195" height="62">
                                    <defs>
                                        <linearGradient
                                            id="woodHandle"
                                            x1="0%"
                                            y1="0%"
                                            x2="100%"
                                            y2="0%"
                                        >
                                            <stop offset="0%" stopColor="#9e643c" />
                                            <stop offset="50%" stopColor="#b87b4f" />
                                            <stop offset="100%" stopColor="#784726" />
                                        </linearGradient>
                                        <linearGradient
                                            id="brassFerrule"
                                            x1="0%"
                                            y1="0%"
                                            x2="0%"
                                            y2="100%"
                                        >
                                            <stop offset="0%" stopColor="#f5dfa6" />
                                            <stop offset="50%" stopColor="#c9a563" />
                                            <stop offset="100%" stopColor="#8c6c38" />
                                        </linearGradient>
                                    </defs>
                                    {/* Wooden Handle */}
                                    <path
                                        d="M 78,28 L 216,2 L 220,15 L 82,40 Z"
                                        fill="url(#woodHandle)"
                                    />
                                    {/* Brass Ferrule */}
                                    <path
                                        d="M 48,33 L 79,27 L 83,41 L 52,46 Z"
                                        fill="url(#brassFerrule)"
                                    />
                                    {/* Dark Sabre Bristles */}
                                    <path
                                        d="M 4,44 C 18,30 34,31 49,33 L 52,46 C 35,51 18,50 4,44 Z"
                                        fill="#4c3832"
                                    />
                                    {/* Cream Paint Tip on Bristles */}
                                    <path
                                        d="M 4,44 C 11,38 19,38 25,40 C 19,46 11,47 4,44 Z"
                                        fill="#f7ecda"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Subtitle & Botanical Leaf-Sprig Divider (Stage 3+) */}
                    <div
                        className={`subtitle-ornament-group ${introStage >= 3 ? 'subtitle-ornament-group--visible' : ''
                            }`}
                    >
                        <p className="keepsake-spaced-subtitle">
                            A WORLD PAINTED FROM MEMORIES
                        </p>

                        <div className="botanical-divider-row">
                            <span className="ornament-line" />
                            <svg
                                className="ornament-sprig-svg"
                                viewBox="0 0 90 28"
                                width="68"
                                height="22"
                            >
                                <path
                                    d="M 14,16 Q 45,12 76,13"
                                    stroke="#f7ecda"
                                    strokeWidth="1.6"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M 30,14 C 24,7 16,6 12,10 C 17,15 24,16 30,14 Z"
                                    fill="#f7ecda"
                                />
                                <path
                                    d="M 46,13 C 42,5 35,3 29,6 C 33,12 40,14 46,13 Z"
                                    fill="#f7ecda"
                                />
                                <path
                                    d="M 42,15 C 38,22 30,24 24,20 C 29,16 36,14 42,15 Z"
                                    fill="#f7ecda"
                                />
                                <path
                                    d="M 60,13 C 64,6 72,5 78,9 C 72,14 65,15 60,13 Z"
                                    fill="#f7ecda"
                                />
                                <path
                                    d="M 56,14 C 60,20 67,22 73,19 C 68,15 62,14 56,14 Z"
                                    fill="#f7ecda"
                                />
                            </svg>
                            <span className="ornament-line" />
                        </div>
                    </div>
                </div>

                {/* Lower Interactive Slot: Frame 5 Stone Button OR Frame 6 Circular Brush Loader */}
                <div className="loading-lower-slot">
                    {introStage === 4 && (
                        <button
                            type="button"
                            className="sculpted-stone-enter-btn"
                            onClick={handleEnterGarden}
                        >
                            <svg
                                className="stone-btn-svg"
                                viewBox="0 0 340 86"
                                width="310"
                                height="78"
                            >
                                <defs>
                                    <linearGradient
                                        id="stoneRimGrad"
                                        x1="0%"
                                        y1="0%"
                                        x2="0%"
                                        y2="100%"
                                    >
                                        <stop offset="0%" stopColor="#d9c0a6" />
                                        <stop offset="55%" stopColor="#b3967d" />
                                        <stop offset="100%" stopColor="#856d5c" />
                                    </linearGradient>
                                    <linearGradient
                                        id="parchmentFaceGrad"
                                        x1="0%"
                                        y1="0%"
                                        x2="0%"
                                        y2="100%"
                                    >
                                        <stop offset="0%" stopColor="#f3e5d2" />
                                        <stop offset="100%" stopColor="#dfc8ae" />
                                    </linearGradient>
                                </defs>
                                {/* Faceted Low-Poly Carved Stone Outer Tablet */}
                                <polygon
                                    points="28,8 95,4 245,4 312,8 334,26 336,58 310,78 240,82 100,82 26,78 4,58 6,26"
                                    fill="url(#stoneRimGrad)"
                                    stroke="#f7e8d4"
                                    strokeWidth="1"
                                    strokeOpacity="0.6"
                                />
                                {/* Faceted Stone Bevel Chips */}
                                <polygon
                                    points="26,78 100,82 92,72 34,69"
                                    fill="#6e5849"
                                    opacity="0.65"
                                />
                                <polygon
                                    points="240,82 310,78 302,69 248,72"
                                    fill="#6e5849"
                                    opacity="0.65"
                                />
                                {/* Inner Warm Parchment Face */}
                                <polygon
                                    points="34,15 100,12 240,12 306,15 324,29 325,54 304,69 238,72 102,72 34,69 15,54 16,29"
                                    fill="url(#parchmentFaceGrad)"
                                />
                            </svg>
                            <span className="stone-btn-label">Enter the Garden</span>
                        </button>
                    )}

                    {introStage >= 5 && (
                        <div className="circular-brush-loader-group">
                            <div className="circular-brush-ring-box">
                                <svg
                                    className="circular-brush-svg"
                                    viewBox="0 0 160 160"
                                    width="126"
                                    height="126"
                                >
                                    <defs>
                                        <linearGradient
                                            id="ringWarmGlow"
                                            x1="0%"
                                            y1="0%"
                                            x2="100%"
                                            y2="100%"
                                        >
                                            <stop offset="0%" stopColor="#fff9eb" stopOpacity="0.95" />
                                            <stop offset="65%" stopColor="#ffe3b3" stopOpacity="0.9" />
                                            <stop offset="100%" stopColor="#ffbe6b" stopOpacity="0.2" />
                                        </linearGradient>
                                        <filter
                                            id="ringBloom"
                                            x="-25%"
                                            y="-25%"
                                            width="150%"
                                            height="150%"
                                        >
                                            <feGaussianBlur stdDeviation="3.5" result="blur" />
                                            <feMerge>
                                                <feMergeNode in="blur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    {/* Rotating Hand-Painted Enso Brushstroke Ring */}
                                    <g className="rotating-enso-group" filter="url(#ringBloom)">
                                        {/* Main tapered brushstroke arc */}
                                        <path
                                            d="M 126,64 C 118,32 84,18 52,29 C 24,39 14,72 26,102 C 38,130 74,142 104,126 C 118,118 127,104 130,90"
                                            fill="none"
                                            stroke="url(#ringWarmGlow)"
                                            strokeWidth="5.2"
                                            strokeLinecap="round"
                                        />
                                        {/* Secondary fine bristle feathering arc */}
                                        <path
                                            d="M 122,52 C 108,28 76,20 48,34 C 24,46 18,78 32,106 C 46,132 82,138 110,118"
                                            fill="none"
                                            stroke="#fff6e3"
                                            strokeWidth="2.1"
                                            strokeLinecap="round"
                                            strokeDasharray="140 35"
                                            opacity="0.8"
                                        />
                                        {/* Warm Golden Highlight Arc at Bottom-Right (Matches LoadingScreen.png) */}
                                        <path
                                            d="M 66,133 C 88,136 112,124 124,102"
                                            fill="none"
                                            stroke="#ffe4a8"
                                            strokeWidth="6.5"
                                            strokeLinecap="round"
                                        />
                                    </g>

                                    {/* Delicate Botanical Leaf Buds on Right Edge of Ring */}
                                    <g
                                        fill="#fff4de"
                                        filter="url(#ringBloom)"
                                        transform="translate(128, 86) rotate(-18)"
                                    >
                                        <path d="M 0,0 C 4,-8 12,-11 18,-9 C 14,-2 7,2 0,0 Z" />
                                        <path d="M -2,6 C -7,0 -7,-8 -2,-13 C 2,-7 2,0 -2,6 Z" />
                                    </g>
                                </svg>
                            </div>

                            <p className="entering-garden-caption">Entering the Garden...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};