// src/components/LoadingScreen/LoadingScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore, type IntroStage } from '../../store/useGameStore';
import './LoadingScreen.css';

interface GuideStrokeSpec {
    id: string;
    d: string;
    strokeWidth: number;
    weight: number; // Relative time weight for natural calligraphy pacing
}

/**
 * Continuous Calligraphic Guide Strokes tracing the exact contours of
 * "Keepsake", the sweeping underline flourish, and the top-right leaf accent
 * inside the 920x250 SVG coordinate space.
 */
const CALLIGRAPHY_GUIDE_STROKES: GuideStrokeSpec[] = [
    // 1. Capital 'K' main descending stem
    {
        id: 'k-stem',
        d: 'M 225,46 C 204,88 180,142 162,196',
        strokeWidth: 46,
        weight: 0.11,
    },
    // 2. Capital 'K' sweeping upper arm loop into center waist
    {
        id: 'k-upper',
        d: 'M 292,54 C 258,74 220,104 188,124',
        strokeWidth: 44,
        weight: 0.09,
    },
    // 3. Capital 'K' lower leg sweeping into first 'e'
    {
        id: 'k-lower',
        d: 'M 192,122 C 218,142 246,162 278,150',
        strokeWidth: 42,
        weight: 0.08,
    },
    // 4. First 'e' & second 'e' continuous cursive loop
    {
        id: 'ee-loop',
        d: 'M 282,138 C 306,110 330,106 318,136 C 304,160 342,154 364,132 C 384,108 398,116 382,144 C 370,162 404,158 422,138',
        strokeWidth: 54,
        weight: 0.16,
    },
    // 5. Letter 'p' descender & bowl
    {
        id: 'p-stroke',
        d: 'M 426,122 C 414,158 400,196 392,222 C 406,178 426,118 456,120 C 480,124 472,158 438,154',
        strokeWidth: 52,
        weight: 0.13,
    },
    // 6. Letters 's' and 'a' cursive wave
    {
        id: 'sa-stroke',
        d: 'M 474,146 C 498,116 526,124 514,152 C 504,166 544,154 568,126 C 594,108 604,132 586,154 C 596,158 614,150 626,136',
        strokeWidth: 56,
        weight: 0.15,
    },
    // 7. Letter 'k' ascender loop & 'e' terminal
    {
        id: 'ke-stroke',
        d: 'M 634,68 C 620,108 606,144 598,162 C 618,134 652,114 662,130 C 646,146 632,148 656,156 C 682,158 712,126 696,116 C 676,114 674,156 718,144',
        strokeWidth: 56,
        weight: 0.14,
    },
    // 8. Sweeping Calligraphic Underline Flourish
    {
        id: 'underline-flourish',
        d: 'M 218,138 C 285,198 375,212 492,188 C 565,173 638,168 692,182',
        strokeWidth: 28,
        weight: 0.09,
    },
    // 9. Top-Right Botanical Two-Leaf Accent
    {
        id: 'leaf-motif',
        d: 'M 708,86 C 722,68 742,50 764,42',
        strokeWidth: 48,
        weight: 0.05,
    },
];

export const LoadingScreen: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const setPhase = useGameStore((state) => state.setPhase);
    const introStage = useGameStore((state) => state.introStage);
    const setIntroStage = useGameStore((state) => state.setIntroStage);

    const maskPathRefs = useRef<Array<SVGPathElement | null>>([]);
    const underlineVisRef = useRef<SVGPathElement | null>(null);
    const brushFollowerRef = useRef<HTMLDivElement | null>(null);

    const [paintComplete, setPaintComplete] = useState(false);

    // Orchestrate the 6-frame sequence with true path-synchronized painting
    useEffect(() => {
        if (phase !== 'loading') return;

        setPaintComplete(false);
        setIntroStage(1);

        let rafId = 0;
        let startTime = 0;
        const PAINT_DURATION_MS = 3100;

        // Begin painting at 550ms
        const startTimer = setTimeout(() => {
            setIntroStage(2);

            // Measure all SVG guide stroke lengths
            const pathMetrics = CALLIGRAPHY_GUIDE_STROKES.map((spec, idx) => {
                const el = maskPathRefs.current[idx];
                const len = el ? el.getTotalLength() : 200;
                if (el) {
                    el.style.strokeDasharray = `${len}`;
                    el.style.strokeDashoffset = `${len}`;
                }
                return { el, len, weight: spec.weight };
            });

            const underlineEl = underlineVisRef.current;
            const underlineLen = underlineEl ? underlineEl.getTotalLength() : 480;
            if (underlineEl) {
                underlineEl.style.strokeDasharray = `${underlineLen}`;
                underlineEl.style.strokeDashoffset = `${underlineLen}`;
            }

            let smoothX = 225;
            let smoothY = 46;
            let smoothAngle = -14;

            const animateBrush = (now: number) => {
                if (!startTime) startTime = now;
                const elapsed = now - startTime;
                const rawProgress = Math.min(1, elapsed / PAINT_DURATION_MS);

                // Smooth easeInOutSine overall curve
                const globalT = 0.5 - 0.5 * Math.cos(rawProgress * Math.PI);

                let accumulatedWeight = 0;
                let targetX = smoothX;
                let targetY = smoothY;
                let targetAngle = smoothAngle;

                for (let i = 0; i < pathMetrics.length; i++) {
                    const m = pathMetrics[i];
                    const segStart = accumulatedWeight;
                    const segEnd = accumulatedWeight + m.weight;
                    accumulatedWeight = segEnd;

                    if (!m.el) continue;

                    if (globalT >= segEnd) {
                        m.el.style.strokeDashoffset = '0';
                        if (i === 7 && underlineEl) {
                            underlineEl.style.strokeDashoffset = '0';
                        }
                    } else if (globalT <= segStart) {
                        m.el.style.strokeDashoffset = `${m.len}`;
                    } else {
                        // Currently painting this stroke!
                        const localRaw = (globalT - segStart) / m.weight;
                        // Subtle natural calligraphy ease within each stroke
                        const localEased =
                            localRaw * localRaw * (3 - 2 * localRaw);
                        const drawDist = localEased * m.len;

                        m.el.style.strokeDashoffset = `${m.len - drawDist}`;

                        // Synchronize visible underline flourish with stroke #7
                        if (i === 7 && underlineEl) {
                            underlineEl.style.strokeDashoffset = `${underlineLen * (1 - localEased)
                                }`;
                        }

                        const pt = m.el.getPointAtLength(drawDist);
                        const aheadPt = m.el.getPointAtLength(
                            Math.min(m.len, drawDist + 4)
                        );
                        targetX = pt.x;
                        targetY = pt.y;

                        const dx = aheadPt.x - pt.x;
                        const dy = aheadPt.y - pt.y;
                        if (Math.hypot(dx, dy) > 0.05) {
                            const strokeDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                            targetAngle = THREE_MathUtils_clamp(
                                strokeDeg * 0.22 - 14,
                                -28,
                                8
                            );
                        }
                    }
                }

                // Smooth continuous interpolation so transitions between strokes never snap
                smoothX += (targetX - smoothX) * 0.34;
                smoothY += (targetY - smoothY) * 0.34;
                smoothAngle += (targetAngle - smoothAngle) * 0.25;

                if (brushFollowerRef.current) {
                    const pctX = (smoothX / 920) * 100;
                    const pctY = (smoothY / 250) * 100;
                    const opacity =
                        rawProgress < 0.05
                            ? rawProgress / 0.05
                            : rawProgress > 0.94
                                ? (1 - rawProgress) / 0.06
                                : 1;

                    brushFollowerRef.current.style.left = `${pctX}%`;
                    brushFollowerRef.current.style.top = `${pctY}%`;
                    brushFollowerRef.current.style.transform = `translate(-4%, -64%) rotate(${smoothAngle.toFixed(
                        2
                    )}deg)`;
                    brushFollowerRef.current.style.opacity = `${opacity}`;
                }

                if (rawProgress < 1) {
                    rafId = requestAnimationFrame(animateBrush);
                } else {
                    setPaintComplete(true);
                    setIntroStage(3); // Reveal Subtitle & Botanical Divider
                }
            };

            rafId = requestAnimationFrame(animateBrush);
        }, 550);

        // Stage 4: Interactive "Enter the Garden" Stone Button appears after subtitle
        const stage4Timer = setTimeout(() => {
            setIntroStage(4);
        }, 4350);

        return () => {
            clearTimeout(startTimer);
            clearTimeout(stage4Timer);
            cancelAnimationFrame(rafId);
        };
    }, [phase, setIntroStage]);

    const handleEnterGarden = () => {
        if (introStage >= 5) return;
        setIntroStage(5 as IntroStage);

        setTimeout(() => {
            setIntroStage(6 as IntroStage);
        }, 2100);

        setTimeout(() => {
            setPhase('exploring');
        }, 2850);
    };

    if (phase === 'exploring') return null;

    return (
        <div
            className={`keepsake-loading-overlay ${introStage === 6 ? 'keepsake-loading-overlay--fade-out' : ''
                }`}
        >
            <div
                className={`loading-atmosphere-veil ${introStage <= 2 ? 'loading-atmosphere-veil--misty' : ''
                    }`}
            />

            <div className="loading-content-frame">
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
                                {/* True Multi-Stroke Calligraphic Path Mask */}
                                <mask id="calligraphyContourMask">
                                    {CALLIGRAPHY_GUIDE_STROKES.map((spec, idx) => (
                                        <path
                                            key={spec.id}
                                            ref={(el) => {
                                                maskPathRefs.current[idx] = el;
                                            }}
                                            d={spec.d}
                                            fill="none"
                                            stroke="#ffffff"
                                            strokeWidth={spec.strokeWidth}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    ))}
                                    {paintComplete && (
                                        <rect x="0" y="0" width="920" height="250" fill="#ffffff" />
                                    )}
                                </mask>

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
                                        floodOpacity="0.46"
                                    />
                                </filter>
                            </defs>

                            <g
                                mask="url(#calligraphyContourMask)"
                                filter="url(#logoSoftShadow)"
                            >
                                <text
                                    x="452"
                                    y="152"
                                    textAnchor="middle"
                                    className="keepsake-svg-wordmark"
                                >
                                    Keepsake
                                </text>

                                {/* Progressive Sweeping Calligraphic Underline Flourish */}
                                <path
                                    ref={underlineVisRef}
                                    d="M 218,136 C 285,198 375,212 492,188 C 565,173 638,168 690,182"
                                    fill="none"
                                    stroke="#f7ecda"
                                    strokeWidth="5.5"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M 245,155 C 310,202 385,208 492,186 C 555,174 615,170 665,178"
                                    fill="none"
                                    stroke="#f7ecda"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    opacity="0.82"
                                />

                                {/* Top-Right Two-Leaf Botanical Accent */}
                                <g transform="translate(715, 58) rotate(-8)">
                                    <path
                                        d="M -6,28 Q 8,14 26,-2"
                                        stroke="#f7ecda"
                                        strokeWidth="2.6"
                                        strokeLinecap="round"
                                        fill="none"
                                    />
                                    <path
                                        d="M 6,16 C 10,-2 28,-12 46,-14 C 40,6 26,20 6,16 Z"
                                        fill="#f7ecda"
                                    />
                                    <path
                                        d="M -4,20 C -10,8 -4,-4 8,-8 C 8,4 4,14 -4,20 Z"
                                        fill="#f2dfc4"
                                    />
                                </g>
                            </g>
                        </svg>

                        {/* Real-Time Path-Synchronized Artist Paintbrush */}
                        {introStage === 2 && (
                            <div
                                ref={brushFollowerRef}
                                className="artist-paintbrush-follower"
                                aria-hidden="true"
                            >
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
                                    <path
                                        d="M 78,28 L 216,2 L 220,15 L 82,40 Z"
                                        fill="url(#woodHandle)"
                                    />
                                    <path
                                        d="M 48,33 L 79,27 L 83,41 L 52,46 Z"
                                        fill="url(#brassFerrule)"
                                    />
                                    <path
                                        d="M 4,44 C 18,30 34,31 49,33 L 52,46 C 35,51 18,50 4,44 Z"
                                        fill="#4c3832"
                                    />
                                    {/* Bristle texture lines */}
                                    <path
                                        d="M 10,42 L 46,36 M 12,45 L 48,41"
                                        stroke="#6b5148"
                                        strokeWidth="1"
                                    />
                                    {/* Active Cream Paint on Tip (Anchored at (6, 44)) */}
                                    <path
                                        d="M 3,44 C 11,38 20,38 26,40 C 20,46 11,47 3,44 Z"
                                        fill="#f7ecda"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Subtitle & Botanical Divider */}
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

                {/* Lower Slot: Sculpted Stone Button OR Circular Brushstroke Loader */}
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
                                <polygon
                                    points="28,8 95,4 245,4 312,8 334,26 336,58 310,78 240,82 100,82 26,78 4,58 6,26"
                                    fill="url(#stoneRimGrad)"
                                    stroke="#f7e8d4"
                                    strokeWidth="1"
                                    strokeOpacity="0.6"
                                />
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

                                    <g className="rotating-enso-group" filter="url(#ringBloom)">
                                        <path
                                            d="M 126,64 C 118,32 84,18 52,29 C 24,39 14,72 26,102 C 38,130 74,142 104,126 C 118,118 127,104 130,90"
                                            fill="none"
                                            stroke="url(#ringWarmGlow)"
                                            strokeWidth="5.2"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M 66,133 C 88,136 112,124 124,102"
                                            fill="none"
                                            stroke="#ffe4a8"
                                            strokeWidth="6.5"
                                            strokeLinecap="round"
                                        />
                                    </g>

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

function THREE_MathUtils_clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}