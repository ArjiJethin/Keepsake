// src/components/LoadingScreen/LoadingScreen.tsx
import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import './LoadingScreen.css';

/**
 * Stages matching LoadingAnimation.jpg frames:
 * 1: Opening Canvas (Background & garden silhouettes fade in)
 * 2: Brush Begins to Paint / Title Takes Form (Calligraphic stroke + brush animation)
 * 3: Title Complete (Subtitle + botanical divider appear)
 * 4: Interactive Intro Screen ("Enter the Garden" parchment stone button)
 * 5: Entering the Garden (Circular brushstroke loader + "Entering the Garden...")
 * 6: Fade out into interactive 3D Garden
 */
type IntroStage = 1 | 2 | 3 | 4 | 5 | 6;

export const LoadingScreen: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const setPhase = useGameStore((state) => state.setPhase);
    const [stage, setStage] = useState<IntroStage>(1);

    useEffect(() => {
        if (phase !== 'loading') return;

        setStage(1);

        // Frame 1 -> Frame 2/3: Start painting "Keepsake" title
        const t1 = setTimeout(() => setStage(2), 700);
        // Frame 3 -> Frame 4: Reveal subtitle & botanical divider
        const t2 = setTimeout(() => setStage(3), 2700);
        // Frame 4 -> Frame 5: Reveal interactive "Enter the Garden" button
        const t3 = setTimeout(() => setStage(4), 3600);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [phase]);

    // Triggered when user clicks "Enter the Garden" (Frame 5 -> Frame 6 -> Exploring)
    const handleEnterGarden = () => {
        if (stage >= 5) return;
        setStage(5); // Show circular brushstroke loader + "Entering the Garden..."

        setTimeout(() => {
            setStage(6); // Smooth fade-out curtain
        }, 2200);

        setTimeout(() => {
            setPhase('exploring');
        }, 3100);
    };

    if (phase === 'exploring') {
        return null;
    }

    return (
        <div
            className={`loading-screen-overlay ${stage === 6 ? 'loading-screen-overlay--fade-out' : ''
                }`}
        >
            {/* LAYER 1: Atmospheric Low-Poly Illustrated Garden Backdrop (Matches LoadingScreen.jpg) */}
            <div className={`loading-backdrop ${stage >= 1 ? 'visible' : ''}`}>
                {/* Warm Sunset Glow & Distant Sun */}
                <div className="loading-sun" />

                {/* SVG Low-Poly Scenic Composition: Archway, Floating Island Waterfall, Hills, Sakura Tree */}
                <svg
                    className="loading-scenery-svg"
                    viewBox="0 0 1920 1080"
                    preserveAspectRatio="xMidYMid slice"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#897896" />
                            <stop offset="45%" stopColor="#c79797" />
                            <stop offset="80%" stopColor="#e8b89b" />
                            <stop offset="100%" stopColor="#f2cfa9" />
                        </linearGradient>

                        <linearGradient id="distantHill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#9e8596" />
                            <stop offset="100%" stopColor="#c29c94" />
                        </linearGradient>

                        <linearGradient id="midMeadow" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#8c966e" />
                            <stop offset="100%" stopColor="#5e6b4c" />
                        </linearGradient>

                        <linearGradient id="foreMeadow" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#77855c" />
                            <stop offset="100%" stopColor="#465239" />
                        </linearGradient>

                        <linearGradient id="waterfallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#fff7eb" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#e8b89b" stopOpacity="0.1" />
                        </linearGradient>

                        {/* Animated clip-path for calligraphic title reveal */}
                        <clipPath id="titleBrushClip">
                            <rect
                                className={`brush-clip-rect ${stage >= 2 ? 'animate-reveal' : ''}`}
                                x="0"
                                y="0"
                                width="0"
                                height="300"
                            />
                        </clipPath>
                    </defs>

                    {/* Sky Base */}
                    <rect width="1920" height="1080" fill="url(#skyGrad)" />

                    {/* Soft Low-Poly Clouds */}
                    <g fill="#f5d5be" opacity="0.45">
                        <polygon points="180,250 290,220 420,245 360,275 210,270" />
                        <polygon points="480,290 610,265 730,290 640,310 510,308" />
                        <polygon points="1180,230 1340,195 1480,225 1390,255 1220,250" />
                    </g>

                    {/* Setting Sun Disc */}
                    <circle cx="525" cy="590" r="52" fill="#ffebc2" opacity="0.85" />

                    {/* Distant Floating Island & Waterfall (Center-Left Background) */}
                    <g className="floating-island-group">
                        <polygon
                            points="530,565 640,555 745,568 705,625 635,665 575,615"
                            fill="#9c868e"
                        />
                        <polygon
                            points="525,560 640,545 750,562 690,575 570,572"
                            fill="#889173"
                        />
                        {/* Waterfall stream */}
                        <rect
                            x="655"
                            y="568"
                            width="20"
                            height="195"
                            fill="url(#waterfallGrad)"
                        />
                    </g>

                    {/* Distant Mountain Range */}
                    <polygon
                        points="0,680 180,590 390,650 580,620 820,690 1080,610 1350,560 1620,620 1920,580 1920,850 0,850"
                        fill="url(#distantHill)"
                        opacity="0.75"
                    />

                    {/* Distant Ruin Silhouette on Right Hill */}
                    <g fill="#8f7c84" opacity="0.7">
                        <rect x="1305" y="595" width="14" height="55" />
                        <rect x="1335" y="585" width="14" height="65" />
                        <polygon points="1298,595 1325,578 1355,588 1348,600" />
                    </g>

                    {/* Midground Rolling Hills */}
                    <polygon
                        points="0,710 340,685 740,745 1190,715 1620,635 1920,660 1920,1080 0,1080"
                        fill="url(#midMeadow)"
                    />

                    {/* Foreground Sloping Garden Meadow */}
                    <polygon
                        points="0,740 480,785 950,825 1460,770 1920,720 1920,1080 0,1080"
                        fill="url(#foreMeadow)"
                    />

                    {/* Winding Low-Poly Stone Pathway */}
                    <g fill="#9e9087" opacity="0.92">
                        <polygon points="410,775 495,770 515,786 430,792" />
                        <polygon points="525,802 620,795 645,814 545,822" />
                        <polygon points="650,835 760,828 790,852 670,860" />
                        <polygon points="780,875 910,865 945,895 805,908" />
                        <polygon points="885,925 1045,912 1085,952 915,968" />
                        <polygon points="940,990 1135,975 1185,1025 975,1045" />
                        <polygon points="830,1045 1020,1030 1065,1078 855,1080" />
                    </g>

                    {/* Left Stone Archway Ruin */}
                    <g className="stone-archway-group">
                        {/* Left Pillar */}
                        <polygon points="85,360 175,345 185,730 75,735" fill="#7c706b" />
                        <polygon points="175,345 215,360 215,725 185,730" fill="#9a8b82" />
                        {/* Right Pillar */}
                        <polygon points="315,380 375,370 385,735 310,740" fill="#7c706b" />
                        <polygon points="375,370 408,385 408,730 385,735" fill="#9a8b82" />
                        {/* Arch Top */}
                        <polygon
                            points="65,360 190,285 335,305 420,385 365,415 295,355 215,350 155,410"
                            fill="#877a73"
                        />
                        {/* Hanging Ivy Accents */}
                        <polygon points="150,340 195,350 175,445 140,410" fill="#5e6e49" />
                        <polygon points="320,350 370,365 355,460 330,420" fill="#687a52" />
                    </g>

                    {/* Right Giant Low-Poly Sakura Tree & Hanging Banners */}
                    <g className="sakura-tree-group">
                        {/* Hanging Prayer Banners */}
                        <g>
                            <polygon points="1540,260 1605,272 1598,425 1532,410" fill="#d9b693" opacity="0.88" />
                            <circle cx="1568" cy="345" r="14" fill="#b88467" opacity="0.6" />
                            <polygon points="1655,295 1712,305 1705,435 1648,422" fill="#cfa986" opacity="0.82" />
                            <circle cx="1680" cy="368" r="11" fill="#b88467" opacity="0.6" />
                        </g>

                        {/* Tree Trunk & Branches */}
                        <polygon
                            points="1575,920 1785,220 1920,240 1920,960 1540,950"
                            fill="#634637"
                        />
                        <polygon
                            points="1685,890 1795,340 1875,360 1790,920"
                            fill="#7d5846"
                        />
                        <polygon
                            points="1760,310 1230,55 1295,35 1790,260"
                            fill="#593e30"
                        />
                        <polygon
                            points="1740,240 1460,180 1490,155 1765,210"
                            fill="#6e4d3d"
                        />

                        {/* Low-Poly Sakura Blossom Canopy Clusters */}
                        <polygon
                            points="995,0 1350,0 1480,95 1310,165 1060,110"
                            fill="#d9928c"
                        />
                        <polygon
                            points="1260,40 1680,0 1820,120 1610,215 1350,150"
                            fill="#e6a69e"
                        />
                        <polygon
                            points="1520,0 1920,0 1920,265 1710,240 1540,130"
                            fill="#c77d78"
                        />
                        <polygon
                            points="1350,145 1590,135 1665,225 1475,265 1345,215"
                            fill="#edb8b0"
                        />
                    </g>

                    {/* Top-Left Olive Foliage Framing */}
                    <g fill="#5b6944">
                        <polygon points="0,0 580,0 490,95 280,145 95,185 0,220" />
                        <polygon points="120,0 640,0 570,115 390,140 190,85" fill="#748256" />
                    </g>

                    {/* Foreground Low-Poly Boulders (Bottom Left & Right) */}
                    <polygon
                        points="0,680 145,670 235,775 215,910 0,920"
                        fill="#7d7068"
                    />
                    <polygon
                        points="145,670 235,775 165,840 55,765"
                        fill="#9e8e84"
                    />
                    <polygon
                        points="180,825 385,785 480,895 450,1080 120,1080"
                        fill="#695e58"
                    />
                    <polygon
                        points="235,795 385,785 455,875 310,895"
                        fill="#8f8177"
                    />
                    <polygon
                        points="1330,835 1460,785 1540,855 1495,915 1315,905"
                        fill="#857770"
                    />
                    <polygon
                        points="1420,910 1660,855 1860,975 1820,1080 1360,1080"
                        fill="#736660"
                    />
                    <polygon
                        points="1490,865 1660,855 1785,945 1580,965"
                        fill="#998980"
                    />
                </svg>

                {/* Floating Blossom Petals */}
                <div className="petal-container">
                    {Array.from({ length: 14 }).map((_, idx) => (
                        <span
                            key={idx}
                            className={`floating-petal petal-${(idx % 5) + 1}`}
                            style={{
                                left: `${(idx * 7.5) % 100}%`,
                                animationDelay: `${idx * 0.6}s`,
                                animationDuration: `${7 + (idx % 4) * 2}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* LAYER 2: Center Brand & Interactive Sequence */}
            <div className="loading-center-content">
                {/* Frames 2, 3, 4: Calligraphic Brushstroke Title Reveal */}
                <div className={`logo-reveal-container ${stage >= 2 ? 'active' : ''}`}>
                    <div className="logo-brush-wrapper">
                        <h1 className="keepsake-main-logo">
                            Keepsake
                            {/* Subtle leaf motif on top right of logo matching reference */}
                            <svg
                                className="logo-leaf-accent"
                                viewBox="0 0 48 48"
                                width="38"
                                height="38"
                            >
                                <path
                                    d="M8,38 C16,20 28,12 42,8 C38,22 30,34 12,40 Z"
                                    fill="#f5ead8"
                                />
                                <path
                                    d="M26,28 C32,22 38,18 44,18 C40,26 34,30 26,28 Z"
                                    fill="#ebd8be"
                                />
                            </svg>
                        </h1>

                        {/* Decorative Paint Underline Flourish */}
                        <svg
                            className="logo-underline-svg"
                            viewBox="0 0 400 32"
                            fill="none"
                        >
                            <path
                                className="logo-underline-path"
                                d="M35,18 Q195,30 355,10"
                                stroke="#f5ead8"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                            />
                        </svg>

                        {/* Animated Paintbrush Tip (Visible during Stage 2 painting) */}
                        {stage === 2 && (
                            <div className="animated-paintbrush" aria-hidden="true">
                                <svg viewBox="0 0 120 40" width="110" height="36">
                                    {/* Brush handle */}
                                    <path
                                        d="M35,16 L115,4 L118,12 L38,24 Z"
                                        fill="#8c583a"
                                    />
                                    {/* Metal ferrule */}
                                    <path
                                        d="M22,18 L36,15 L39,24 L25,27 Z"
                                        fill="#d4b483"
                                    />
                                    {/* Bristles */}
                                    <path
                                        d="M2,26 C8,18 16,17 23,18 L25,27 C17,29 9,29 2,26 Z"
                                        fill="#4a3730"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Frame 4: Subtitle & Botanical Divider */}
                    <div className={`subtitle-block ${stage >= 3 ? 'visible' : ''}`}>
                        <p className="keepsake-subtitle">
                            A WORLD PAINTED FROM MEMORIES.
                        </p>
                        <div className="botanical-divider">
                            <span className="divider-line" />
                            <svg
                                className="divider-sprig"
                                viewBox="0 0 80 24"
                                width="64"
                                height="20"
                            >
                                <path
                                    d="M10,14 Q40,10 70,12"
                                    stroke="#f3e5d0"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                                <ellipse
                                    cx="30"
                                    cy="9"
                                    rx="6"
                                    ry="3"
                                    transform="rotate(-20 30 9)"
                                    fill="#f3e5d0"
                                />
                                <ellipse
                                    cx="45"
                                    cy="8"
                                    rx="6"
                                    ry="3"
                                    transform="rotate(-15 45 8)"
                                    fill="#f3e5d0"
                                />
                                <ellipse
                                    cx="36"
                                    cy="16"
                                    rx="6"
                                    ry="3"
                                    transform="rotate(20 36 16)"
                                    fill="#f3e5d0"
                                />
                                <ellipse
                                    cx="52"
                                    cy="15"
                                    rx="5"
                                    ry="2.5"
                                    transform="rotate(15 52 15)"
                                    fill="#f3e5d0"
                                />
                            </svg>
                            <span className="divider-line" />
                        </div>
                    </div>
                </div>

                {/* Frame 5 & 6: Interactive Action / Circular Loading Indicator */}
                <div className="loading-action-area">
                    {stage === 4 && (
                        <button
                            className="enter-garden-btn"
                            onClick={handleEnterGarden}
                            aria-label="Enter the Garden"
                        >
                            <span className="enter-garden-btn__inner">Enter the Garden</span>
                        </button>
                    )}

                    {stage >= 5 && (
                        <div className="entering-loader-wrapper">
                            {/* Painted Circular Brushstroke Ring with Leaf Accent */}
                            <div className="brush-circle-spinner">
                                <svg viewBox="0 0 120 120" width="96" height="96">
                                    <defs>
                                        <filter id="warmGlow">
                                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                                            <feMerge>
                                                <feMergeNode in="blur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <circle
                                        className="brush-ring-path"
                                        cx="60"
                                        cy="60"
                                        r="44"
                                        fill="none"
                                        stroke="#fff3db"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeDasharray="235 60"
                                        filter="url(#warmGlow)"
                                    />
                                    {/* Small leaf buds on the right side of the ring matching LoadingScreen.jpg */}
                                    <g fill="#fff3db" transform="translate(96, 62) rotate(-25)">
                                        <ellipse cx="0" cy="0" rx="6" ry="2.8" />
                                        <ellipse cx="6" cy="5" rx="5" ry="2.4" transform="rotate(35)" />
                                    </g>
                                </svg>
                            </div>
                            <p className="entering-garden-text">Entering the Garden...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};