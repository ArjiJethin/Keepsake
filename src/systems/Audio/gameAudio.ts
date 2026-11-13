// src/systems/Audio/gameAudio.ts
import themeUrl from '../../assets/Audio/KeepSake Main Theme.mp3';
import walkStepV1Url from '../../assets/Audio/WalkSFXV1.mp3';
import walkStepV2Url from '../../assets/Audio/WalkSFXV2.mp3';

const MUSIC_TARGET_VOLUME = 0.35;
const MUSIC_FADE_IN_MS = 2800;

/** Length of the tail-into-head blend that makes the score loop seamlessly. */
const MUSIC_LOOP_CROSSFADE_SECONDS = 4.5;
const MUSIC_LOOP_TICK_MS = 80;

const STEP_MIN_WEIGHT = 0.12;
const STEP_MIN_SPEED = 0.35;
const STEP_MIN_INTERVAL_MS = 90;
const STEPS_PER_CYCLE = 2;

export type StepAnimationSource = 'walk' | 'sprint' | 'fallback';

export interface LocomotionSample {
    /** Which animation clip currently drives the character's stride. */
    source: StepAnimationSource;
    /** Normalized playback position of that clip (0..1 wraps every cycle). */
    phase: number;
    /** Blend weight of that clip (0..1). */
    weight: number;
    /** Horizontal movement speed in m/s. */
    speed: number;
    /** Feet must be on the ground for a step to sound. */
    grounded: boolean;
}

type StepSampleName = 'left' | 'right';

interface MusicCrossfade {
    startedAt: number;
    outVolume: number;
    durationSeconds: number;
}

/**
 * Central game audio: a looping background score that crossfades its final
 * seconds into its opening, plus footstep SFX whose timing is driven by the
 * character's actual walk/sprint animation phase.
 */
class GameAudioManager {
    private music: HTMLAudioElement | null = null;
    private musicIncoming: HTMLAudioElement | null = null;
    private musicRequested = false;
    private musicMuted = false;
    private musicFadeTimer: number | null = null;
    private musicLoopTimer: number | null = null;
    private musicCrossfade: MusicCrossfade | null = null;

    private installed = false;
    private context: AudioContext | null = null;
    private stepGain: GainNode | null = null;
    private stepBuffers: Partial<Record<StepSampleName, AudioBuffer>> = {};
    private stepBuffersLoading = false;
    private nextFoot: StepSampleName = 'left';

    private stepIndexBySource = new Map<StepAnimationSource, number>();
    private lastStepAt = 0;

    /** Registers one-time unlock gestures and starts the score once requested. */
    install(): () => void {
        if (typeof window === 'undefined') return () => { };
        if (this.installed) return () => { };
        this.installed = true;

        // Kick the score off the moment the intro page mounts. Browsers that
        // block audible autoplay fall back to muted playback (startMutedFallback)
        // which is unmuted on the player's first interaction.
        this.playMusic();

        window.addEventListener('pointerdown', this.onGesture, { passive: true });
        window.addEventListener('keydown', this.onGesture);
        window.addEventListener('touchstart', this.onGesture, { passive: true });

        return () => {
            this.installed = false;
            this.detachGestureListeners();
        };
    }

    /** Starts (or resumes) the looping background score with a gentle fade-in. */
    playMusic(): void {
        this.musicRequested = true;
        const music = this.preloadMusic();
        if (!music) return;

        this.startLoopTicker();

        if (!music.paused) {
            if (!music.muted && music.volume < MUSIC_TARGET_VOLUME) {
                this.fadeInMusic();
            }
            return;
        }

        music.volume = 0;
        const played = music.play();
        if (played && typeof played.then === 'function') {
            played.then(() => this.fadeInMusic()).catch(() => {
                // Audible autoplay was blocked, so the theme still starts now
                // (silently) and becomes audible on the first user gesture.
                this.startMutedFallback(music);
            });
        } else {
            this.fadeInMusic();
        }
    }

    /**
     * Feeds the current locomotion animation phase. A footstep fires each time
     * the clip crosses a foot-contact boundary, keeping SFX locked to the stride.
     */
    syncLocomotion(sample: LocomotionSample): void {
        const { source, phase, weight, speed, grounded } = sample;

        if (!grounded || weight < STEP_MIN_WEIGHT || speed < STEP_MIN_SPEED) {
            this.stepIndexBySource.clear();
            return;
        }

        const wrapped = ((phase % 1) + 1) % 1;
        let stepIndex = Math.floor(wrapped * STEPS_PER_CYCLE);
        if (stepIndex >= STEPS_PER_CYCLE) stepIndex = 0;

        const previous = this.stepIndexBySource.get(source);
        this.stepIndexBySource.set(source, stepIndex);
        if (previous === undefined || previous === stepIndex) return;

        const now = performance.now();
        if (now - this.lastStepAt < STEP_MIN_INTERVAL_MS) return;
        this.lastStepAt = now;

        this.playFootstep(Math.min(1, 0.55 + speed * 0.055));
    }

    private onGesture = () => {
        this.detachGestureListeners();
        const context = this.ensureContext();
        if (context && context.state === 'suspended') {
            void context.resume().catch(() => { });
        }
        if (this.musicRequested) {
            this.musicMuted = false;
            this.applyMusicMute();
            this.playMusic();
        }
    };

    private detachGestureListeners(): void {
        if (typeof window === 'undefined') return;
        window.removeEventListener('pointerdown', this.onGesture);
        window.removeEventListener('keydown', this.onGesture);
        window.removeEventListener('touchstart', this.onGesture);
    }

    private createMusicElement(): HTMLAudioElement | null {
        if (typeof window === 'undefined' || typeof Audio === 'undefined') {
            return null;
        }
        const element = new Audio(themeUrl);
        // Looping is handled by the crossfade scheduler so the tail can blend
        // into the opening instead of butting up against it.
        element.loop = false;
        element.preload = 'auto';
        element.volume = 0;
        element.muted = this.musicMuted;
        element.addEventListener('ended', () => {
            // Fallback for heavily throttled timers, where no crossfade ran.
            if (element === this.music) this.restartMusicFromStart();
        });
        return element;
    }

    private preloadMusic(): HTMLAudioElement | null {
        if (!this.music) {
            this.music = this.createMusicElement();
            this.musicIncoming = this.createMusicElement();
        }
        return this.music;
    }

    private startMutedFallback(music: HTMLAudioElement): void {
        music.muted = true;
        music.volume = 0;
        this.startLoopTicker();
        const played = music.play();
        if (played && typeof played.then === 'function') {
            played.catch(() => {
                // Playback is entirely blocked; the gesture handler retries.
            });
        }
    }

    private restartMusicFromStart(): void {
        const music = this.music;
        if (!music) return;
        music.currentTime = 0;
        const played = music.play();
        if (played && typeof played.then === 'function') {
            played.catch(() => { });
        }
    }

    private applyMusicMute(): void {
        if (this.music) this.music.muted = this.musicMuted;
        if (this.musicIncoming) this.musicIncoming.muted = this.musicMuted;
    }

    private fadeInMusic(): void {
        const music = this.music;
        if (!music) return;

        // A running loop crossfade already owns both players' volumes.
        if (this.musicCrossfade) return;

        if (this.musicFadeTimer !== null) {
            window.clearInterval(this.musicFadeTimer);
            this.musicFadeTimer = null;
        }

        const startVolume = music.volume;
        const startedAt = performance.now();
        this.musicFadeTimer = window.setInterval(() => {
            if (this.musicCrossfade && this.musicFadeTimer !== null) {
                window.clearInterval(this.musicFadeTimer);
                this.musicFadeTimer = null;
                return;
            }
            const progress = Math.min(
                1,
                (performance.now() - startedAt) / MUSIC_FADE_IN_MS
            );
            music.volume =
                startVolume + (MUSIC_TARGET_VOLUME - startVolume) * progress;
            if (progress >= 1 && this.musicFadeTimer !== null) {
                window.clearInterval(this.musicFadeTimer);
                this.musicFadeTimer = null;
            }
        }, 60);
    }

    private startLoopTicker(): void {
        if (typeof window === 'undefined' || this.musicLoopTimer !== null) {
            return;
        }
        this.musicLoopTimer = window.setInterval(
            () => this.tickMusicLoop(),
            MUSIC_LOOP_TICK_MS
        );
    }

    /**
     * Blends the final seconds of the theme into its own opening: shortly
     * before the active player ends, a second player starts from 0 and the two
     * are crossfaded with equal-power curves so the loop has no seam.
     */
    private tickMusicLoop(): void {
        const active = this.music;
        if (!active || active.paused) return;

        if (this.musicCrossfade) {
            const { startedAt, outVolume, durationSeconds } = this.musicCrossfade;
            const progress = Math.min(
                1,
                (performance.now() - startedAt) / (durationSeconds * 1000)
            );
            const targetVolume = this.musicMuted ? 0 : MUSIC_TARGET_VOLUME;
            const incoming = this.musicIncoming;

            active.volume = outVolume * Math.cos(progress * Math.PI * 0.5);
            if (incoming) {
                incoming.volume = targetVolume * Math.sin(progress * Math.PI * 0.5);
            }

            if (progress >= 1) {
                active.pause();
                active.currentTime = 0;
                active.volume = 0;

                this.music = incoming;
                this.musicIncoming = active;
                this.musicCrossfade = null;
            }
            return;
        }

        const duration = active.duration;
        if (!Number.isFinite(duration) || duration <= 0) return;

        const remaining = duration - active.currentTime;
        if (remaining <= MUSIC_LOOP_CROSSFADE_SECONDS) {
            this.beginMusicCrossfade();
        }
    }

    private beginMusicCrossfade(): void {
        const outgoing = this.music;
        const incoming = this.musicIncoming;
        if (!outgoing || !incoming || incoming === outgoing) return;

        incoming.pause();
        incoming.currentTime = 0;
        incoming.muted = this.musicMuted;
        incoming.volume = 0;

        const played = incoming.play();
        if (played && typeof played.then === 'function') {
            played.catch(() => { });
        }

        this.musicCrossfade = {
            startedAt: performance.now(),
            outVolume: outgoing.volume,
            durationSeconds: MUSIC_LOOP_CROSSFADE_SECONDS,
        };
    }

    private ensureContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.context) {
            const Ctor =
                window.AudioContext ??
                (
                    window as unknown as {
                        webkitAudioContext?: typeof AudioContext;
                    }
                ).webkitAudioContext;
            if (!Ctor) return null;

            this.context = new Ctor();
            this.stepGain = this.context.createGain();
            this.stepGain.gain.value = 0.7;
            this.stepGain.connect(this.context.destination);

            void this.loadStepSamples();
        }
        return this.context;
    }

    private async loadStepSamples(): Promise<void> {
        const context = this.context;
        if (!context || this.stepBuffersLoading) return;
        this.stepBuffersLoading = true;

        const load = async (url: string) => {
            const response = await fetch(url);
            const data = await response.arrayBuffer();
            return context.decodeAudioData(data);
        };

        try {
            const [left, right] = await Promise.all([
                load(walkStepV1Url),
                load(walkStepV2Url),
            ]);
            this.stepBuffers = { left, right };
        } catch (error) {
            console.warn(
                '[Keepsake] Unable to load walking footstep audio.',
                error
            );
        } finally {
            this.stepBuffersLoading = false;
        }
    }

    private playFootstep(intensity: number): void {
        const context = this.context;
        if (!context || context.state !== 'running' || !this.stepGain) return;

        const foot: StepSampleName = this.nextFoot;
        this.nextFoot = foot === 'left' ? 'right' : 'left';

        const buffer = this.stepBuffers[foot];
        if (!buffer) return;

        const now = context.currentTime;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = 0.94 + Math.random() * 0.12;

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(
            0.55 + intensity * 0.45,
            now + 0.008
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + Math.min(buffer.duration, 0.6)
        );

        source.connect(gain);
        gain.connect(this.stepGain);
        source.start(now);
    }
}

export const gameAudio = new GameAudioManager();
