import type { GameSettings } from './settings';

export type RetroSoundId =
  | 'menu-select'
  | 'capture-start'
  | 'arm-wrestle-struggle'
  | 'capture-success'
  | 'capture-fail'
  | 'exotic-spawn'
  | 'steroid-use'
  | 'level-up'
  | 'goal-complete';

type OscillatorTypeName = OscillatorType;

export class RetroAudio {
  private context?: AudioContext;
  private unlocked = false;

  constructor(private settings: GameSettings) {}

  updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
  }

  bindUnlockEvents(target: Document = document): void {
    const unlock = (): void => {
      this.unlock();
    };

    target.addEventListener('pointerdown', unlock, { once: true, capture: true });
    target.addEventListener('touchstart', unlock, { once: true, capture: true });
    target.addEventListener('keydown', unlock, { once: true, capture: true });
  }

  play(sound: RetroSoundId, delaySeconds = 0): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0 || !this.unlocked) {
      return;
    }

    const context = this.getContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume();
    }

    const start = context.currentTime + delaySeconds;
    const volume = 0.16 * (this.settings.sfxVolume / 100);

    switch (sound) {
      case 'menu-select':
        this.blip(start, 520, 0.035, 'square', volume * 0.55);
        this.blip(start + 0.045, 780, 0.04, 'square', volume * 0.48);
        break;
      case 'capture-start':
        this.blip(start, 180, 0.07, 'sawtooth', volume * 0.7, 260);
        this.blip(start + 0.07, 330, 0.07, 'square', volume * 0.62);
        this.blip(start + 0.14, 460, 0.09, 'square', volume * 0.58);
        break;
      case 'arm-wrestle-struggle':
        this.blip(start, 92, 0.08, 'sawtooth', volume * 0.5, 138);
        this.blip(start + 0.025, 184, 0.055, 'square', volume * 0.34, 154);
        break;
      case 'capture-success':
        this.blip(start, 420, 0.08, 'square', volume * 0.62);
        this.blip(start + 0.085, 630, 0.09, 'square', volume * 0.68);
        this.blip(start + 0.18, 920, 0.16, 'triangle', volume * 0.74);
        break;
      case 'capture-fail':
        this.blip(start, 360, 0.09, 'sawtooth', volume * 0.58, 220);
        this.blip(start + 0.095, 190, 0.16, 'square', volume * 0.42, 120);
        break;
      case 'exotic-spawn':
        this.blip(start, 740, 0.08, 'triangle', volume * 0.45);
        this.blip(start + 0.07, 1110, 0.08, 'triangle', volume * 0.48);
        this.blip(start + 0.14, 1480, 0.14, 'square', volume * 0.42);
        this.blip(start + 0.22, 980, 0.12, 'triangle', volume * 0.38);
        break;
      case 'steroid-use':
        this.blip(start, 120, 0.055, 'sawtooth', volume * 0.62, 540);
        this.blip(start + 0.055, 540, 0.055, 'square', volume * 0.54, 260);
        this.blip(start + 0.11, 260, 0.08, 'sawtooth', volume * 0.5, 720);
        break;
      case 'level-up':
        this.blip(start, 480, 0.07, 'square', volume * 0.55);
        this.blip(start + 0.075, 640, 0.07, 'square', volume * 0.58);
        this.blip(start + 0.15, 840, 0.14, 'triangle', volume * 0.66);
        break;
      case 'goal-complete':
        this.blip(start, 330, 0.08, 'square', volume * 0.58);
        this.blip(start + 0.08, 495, 0.08, 'square', volume * 0.62);
        this.blip(start + 0.16, 660, 0.08, 'square', volume * 0.66);
        this.blip(start + 0.25, 990, 0.18, 'triangle', volume * 0.72);
        break;
    }
  }

  private unlock(): void {
    if (this.unlocked) {
      return;
    }

    this.unlocked = true;
    const context = this.getContext();

    if (context && context.state === 'suspended') {
      void context.resume();
    }
  }

  private getContext(): AudioContext | undefined {
    if (this.context) {
      return this.context;
    }

    const audioWindow = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextConstructor) {
      return undefined;
    }

    this.context = new AudioContextConstructor();
    return this.context;
  }

  private blip(
    start: number,
    frequency: number,
    duration: number,
    type: OscillatorTypeName,
    gain: number,
    endFrequency = frequency
  ): void {
    const context = this.context;

    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    if (endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    }

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }
}
