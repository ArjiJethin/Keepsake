// src/components/UI/CustomCursor.tsx
import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import './CustomCursor.css';

export const CustomCursor: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const isAltCursorMode = useGameStore((state) => state.isAltCursorMode);
    const isPointerLocked = useGameStore((state) => state.isPointerLocked);
    const activeModal = useGameStore((state) => state.activeModal);

    const cursorRef = useRef<HTMLDivElement>(null);

    // Show custom botanical cursor when Alt is held, a modal is open, or on the loading screen
    const showBotanicalCursor =
        phase !== 'exploring' ||
        isAltCursorMode ||
        activeModal !== 'none' ||
        !isPointerLocked;

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            }
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', onMouseMove);
    }, []);

    useEffect(() => {
        if (showBotanicalCursor) {
            document.body.classList.add('keepsake-custom-cursor-active');
        } else {
            document.body.classList.remove('keepsake-custom-cursor-active');
        }
    }, [showBotanicalCursor]);

    if (!showBotanicalCursor) return null;

    return (
        <div
            ref={cursorRef}
            className={`keepsake-botanical-cursor ${isAltCursorMode ? 'keepsake-botanical-cursor--alt-active' : ''
                }`}
            aria-hidden="true"
        >
            <svg
                width="34"
                height="34"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <filter id="cursorWarmGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="2.5"
                            floodColor="#2b1b16"
                            floodOpacity="0.55"
                        />
                    </filter>
                </defs>
                <g filter="url(#cursorWarmGlow)">
                    {/* Delicate Botanical Leaf Pointer Tip anchored at (3, 3) */}
                    <path
                        d="M 3,3 C 12,4 22,9 26,18 C 17,22 10,16 3,3 Z"
                        fill="#f7ecda"
                        stroke="#c69258"
                        strokeWidth="1.4"
                    />
                    {/* Inner Golden Leaf Vein */}
                    <path
                        d="M 4,4 Q 14,11 22,16"
                        stroke="#c69258"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                    />
                    {/* Small Companion Sprout Leaf */}
                    <path
                        d="M 12,18 C 11,24 14,29 20,30 C 20,24 17,20 12,18 Z"
                        fill="#e8b882"
                        stroke="#b58046"
                        strokeWidth="1"
                    />
                    {/* Glowing Golden Dewdrop at Tip */}
                    <circle cx="3.5" cy="3.5" r="2.2" fill="#ffd87d" />
                </g>
            </svg>
            {isAltCursorMode && (
                <span className="cursor-mode-tag">UI Pointer</span>
            )}
        </div>
    );
};