// src/components/UI/CustomCursor.tsx
import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import './CustomCursor.css';

export const CustomCursor: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const inputMode = useGameStore((state) => state.inputMode);
    const activeModal = useGameStore((state) => state.activeModal);

    const cursorRef = useRef<HTMLDivElement>(null);

    // Custom botanical cursor is only active in Cursor Mode or during UI modals / loading
    const showBotanicalCursor =
        phase !== 'exploring' || inputMode === 'cursor' || activeModal !== 'none';

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
            className={`keepsake-botanical-cursor ${inputMode === 'cursor' ? 'keepsake-botanical-cursor--alt-active' : ''
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
                    <path
                        d="M 3,3 C 12,4 22,9 26,18 C 17,22 10,16 3,3 Z"
                        fill="#f7ecda"
                        stroke="#c69258"
                        strokeWidth="1.4"
                    />
                    <path
                        d="M 4,4 Q 14,11 22,16"
                        stroke="#c69258"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 12,18 C 11,24 14,29 20,30 C 20,24 17,20 12,18 Z"
                        fill="#e8b882"
                        stroke="#b58046"
                        strokeWidth="1"
                    />
                    <circle cx="3.5" cy="3.5" r="2.2" fill="#ffd87d" />
                </g>
            </svg>
            {inputMode === 'cursor' && (
                <span className="cursor-mode-tag">UI Mode [Alt]</span>
            )}
        </div>
    );
};