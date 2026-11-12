// src/components/UI/MobileJoystick.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { playerTelemetry, useGameStore } from '../../store/useGameStore';
import './MobileJoystick.css';

const MAX_RADIUS = 44; // Maximum thumb deflection in pixels

function detectTouchCapability(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia?.('(pointer: coarse)').matches
    );
}

export const MobileJoystick: React.FC = () => {
    const phase = useGameStore((state) => state.phase);
    const activeModal = useGameStore((state) => state.activeModal);

    const [isTouchDevice, setIsTouchDevice] = useState<boolean>(detectTouchCapability);
    const [isActive, setIsActive] = useState<boolean>(false);
    const [thumbOffset, setThumbOffset] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });

    const baseRef = useRef<HTMLDivElement>(null);
    const activePointerIdRef = useRef<number | null>(null);
    const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
        const updateTouchCapability = () => {
            setIsTouchDevice(detectTouchCapability());
        };
        window.addEventListener('resize', updateTouchCapability);
        window.addEventListener('touchstart', updateTouchCapability, {
            once: true,
            passive: true,
        });
        return () => {
            window.removeEventListener('resize', updateTouchCapability);
            window.removeEventListener('touchstart', updateTouchCapability);
        };
    }, []);

    const resetJoystick = useCallback(() => {
        activePointerIdRef.current = null;
        setIsActive(false);
        setThumbOffset({ x: 0, y: 0 });
        playerTelemetry.joystick.x = 0;
        playerTelemetry.joystick.y = 0;
        playerTelemetry.joystick.active = false;
    }, []);

    // Immediately stop movement if phase changes or a modal opens
    useEffect(() => {
        if (phase !== 'exploring' || activeModal !== 'none') {
            resetJoystick();
        }
    }, [phase, activeModal, resetJoystick]);

    const updateFromClientXY = useCallback((clientX: number, clientY: number) => {
        const dx = clientX - centerRef.current.x;
        const dy = clientY - centerRef.current.y;
        const dist = Math.hypot(dx, dy);

        const clampedDist = Math.min(dist, MAX_RADIUS);
        const angle = Math.atan2(dy, dx);

        const offsetX = dist > 0.001 ? Math.cos(angle) * clampedDist : 0;
        const offsetY = dist > 0.001 ? Math.sin(angle) * clampedDist : 0;

        setThumbOffset({ x: offsetX, y: offsetY });

        // Normalized -1..1 coordinates; screen -Y is forward (+1 in world movement)
        const normX = offsetX / MAX_RADIUS;
        const normY = -offsetY / MAX_RADIUS;
        const deadzone = 0.07;

        if (Math.hypot(normX, normY) < deadzone) {
            playerTelemetry.joystick.x = 0;
            playerTelemetry.joystick.y = 0;
            playerTelemetry.joystick.active = false;
        } else {
            playerTelemetry.joystick.x = normX;
            playerTelemetry.joystick.y = normY;
            playerTelemetry.joystick.active = true;
        }
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Only respond on touch or primary pointer on touch-capable devices
        if (activePointerIdRef.current !== null) return;
        e.stopPropagation();

        const rect = baseRef.current?.getBoundingClientRect();
        if (!rect) return;

        activePointerIdRef.current = e.pointerId;
        centerRef.current = {
            x: rect.left + rect.width * 0.5,
            y: rect.top + rect.height * 0.5,
        };

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // Ignore if browser does not support pointer capture for this source
        }

        setIsActive(true);
        updateFromClientXY(e.clientX, e.clientY);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (activePointerIdRef.current !== e.pointerId) return;
        e.stopPropagation();
        updateFromClientXY(e.clientX, e.clientY);
    };

    const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
        if (activePointerIdRef.current !== e.pointerId) return;
        e.stopPropagation();
        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch {
            // Ignore
        }
        resetJoystick();
    };

    if (!isTouchDevice || phase !== 'exploring' || activeModal !== 'none') {
        return null;
    }

    return (
        <div
            className={`ks-joystick-zone ${
                isActive ? 'ks-joystick-zone--active' : 'ks-joystick-zone--idle'
            }`}
            data-joystick-zone="true"
            data-ui-interactive="true"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Movement joystick"
        >
            <div ref={baseRef} className="ks-joystick-base">
                <div className="ks-joystick-ring" />
                <div
                    className={`ks-joystick-thumb ${
                        isActive ? 'ks-joystick-thumb--dragging' : ''
                    }`}
                    style={{
                        transform: `translate3d(${thumbOffset.x.toFixed(1)}px, ${thumbOffset.y.toFixed(1)}px, 0)`,
                    }}
                >
                    <span className="ks-joystick-thumb-core" />
                </div>
            </div>
        </div>
    );
};
