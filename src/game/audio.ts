import type { GameSettings } from './settings';

export type RetroSoundId =
  | 'menu-select'
  | 'menu-back'
  | 'start-game'
  | 'customization-change'
  | 'creature-nearby'
  | 'capture-start'
  | 'arm-wrestle-struggle'
  | 'capture-success'
  | 'capture-fail'
  | 'creature-cry'
  | 'workout-start'
  | 'workout-rep'
  | 'workout-complete'
  | 'exotic-spawn'
  | 'steroid-use'
  | 'level-up'
  | 'goal-complete'
  | 'boss-intro'
  | 'boss-win'
  | 'boss-loss';

export type RetroMusicMode = 'title' | 'gameplay' | 'boss-capture';

type OscillatorTypeName = OscillatorType;

const MUSIC_INTERVAL_MS: Record<RetroMusicMode, number> = {
  title: 920,
  gameplay: 760,
  'boss-capture': 430
};

const MUSIC_PATTERNS: Record<RetroMusicMode, number[]> = {
  title: [330, 392, 494, 392, 330, 262, 294, 330],
  gameplay: [262, 330, 392, 330, 294, 349, 440, 349],
  'boss-capture': [110, 147, 196, 147, 123, 165, 220, 165]
};

export class RetroAudio {
  private context?: AudioContext;
  private unlocked = false;
  private musicMode?: RetroMusicMode;
  private musicTimer?: number;
  private musicStep = 0;

  constructor(private settings: GameSettings) {}

  updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.syncMusicLoop();
  }

  bindUnlockEvents(target: Document = document): void {
    const unlock = (): void => {
      this.unlock();
    };

    target.addEventListener('pointerdown', unlock, { once: true, capture: true });
    target.addEventListener('touchstart', unlock, { once: true, capture: true });
    target.addEventListener('keydown', unlock, { once: true, capture: true });
  }

  setMusicMode(mode?: RetroMusicMode): void {
    if (this.musicMode === mode) {
      return;
    }

    this.musicMode = mode;
    this.musicStep = 0;
    this.stopMusicLoop();
    this.syncMusicLoop();
  }

  play(sound: RetroSoundId, delaySeconds = 0): void {
    if (this.settings.muted || this.settings.sfxVolume <= 0 || this.settings.masterVolume <= 0 || !this.unlocked) {
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
    const volume = 0.16 * (this.settings.masterVolume / 100) * (this.settings.sfxVolume / 100);

    switch (sound) {
      case 'menu-select':
        this.blip(start, 520, 0.035, 'square', volume * 0.55);
        this.blip(start + 0.045, 780, 0.04, 'square', volume * 0.48);
        break;
      case 'menu-back':
        this.blip(start, 440, 0.04, 'square', volume * 0.42, 260);
        this.blip(start + 0.045, 220, 0.055, 'triangle', volume * 0.34);
        break;
      case 'start-game':
        this.blip(start, 294, 0.07, 'square', volume * 0.54);
        this.blip(start + 0.07, 392, 0.07, 'square', volume * 0.58);
        this.blip(start + 0.14, 588, 0.14, 'triangle', volume * 0.66);
        this.blip(start + 0.28, 784, 0.16, 'triangle', volume * 0.46);
        break;
      case 'customization-change':
        this.blip(start, 660, 0.035, 'triangle', volume * 0.35);
        this.blip(start + 0.035, 990, 0.045, 'triangle', volume * 0.28);
        break;
      case 'creature-nearby':
        this.blip(start, 520, 0.055, 'triangle', volume * 0.34);
        this.blip(start + 0.06, 620, 0.05, 'square', volume * 0.24);
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
      case 'creature-cry':
        this.blip(start, 620, 0.09, 'triangle', volume * 0.28, 410);
        this.blip(start + 0.09, 540, 0.11, 'triangle', volume * 0.24, 320);
        this.blip(start + 0.2, 470, 0.16, 'sine', volume * 0.2, 260);
        break;
      case 'workout-start':
        this.blip(start, 130, 0.05, 'square', volume * 0.42, 190);
        this.blip(start + 0.055, 260, 0.06, 'square', volume * 0.44);
        break;
      case 'workout-rep':
        this.blip(start, 240, 0.032, 'square', volume * 0.34, 320);
        this.blip(start + 0.035, 480, 0.034, 'triangle', volume * 0.24);
        break;
      case 'workout-complete':
        this.blip(start, 330, 0.06, 'square', volume * 0.5);
        this.blip(start + 0.07, 495, 0.07, 'square', volume * 0.54);
        this.blip(start + 0.15, 660, 0.12, 'triangle', volume * 0.58);
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
      case 'boss-intro':
        this.blip(start, 74, 0.16, 'sawtooth', volume * 0.46, 98);
        this.blip(start + 0.11, 147, 0.18, 'square', volume * 0.32);
        break;
      case 'boss-win':
        this.blip(start, 220, 0.07, 'square', volume * 0.5);
        this.blip(start + 0.07, 330, 0.08, 'square', volume * 0.54);
        this.blip(start + 0.15, 494, 0.11, 'triangle', volume * 0.58);
        this.blip(start + 0.27, 740, 0.16, 'triangle', volume * 0.46);
        break;
      case 'boss-loss':
        this.blip(start, 220, 0.1, 'sawtooth', volume * 0.42, 165);
        this.blip(start + 0.12, 123, 0.18, 'square', volume * 0.32, 82);
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

    this.syncMusicLoop();
  }

  private syncMusicLoop(): void {
    if (!this.unlocked || !this.musicMode || this.settings.muted || this.settings.musicVolume <= 0 || this.settings.masterVolume <= 0) {
      this.stopMusicLoop();
      return;
    }

    if (this.musicTimer !== undefined) {
      return;
    }

    this.tickMusic();
    this.musicTimer = window.setInterval(() => this.tickMusic(), MUSIC_INTERVAL_MS[this.musicMode]);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer === undefined) {
      return;
    }

    window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  private tickMusic(): void {
    if (!this.musicMode || this.settings.muted || this.settings.musicVolume <= 0 || this.settings.masterVolume <= 0) {
      this.stopMusicLoop();
      return;
    }

    const context = this.getContext();
    if (!context) {
      return;
    }

    const notes = MUSIC_PATTERNS[this.musicMode];
    const note = notes[this.musicStep % notes.length];
    const start = context.currentTime;
    const volume = 0.028 * (this.settings.masterVolume / 100) * (this.settings.musicVolume / 100);
    const type: OscillatorTypeName = this.musicMode === 'boss-capture' ? 'sawtooth' : 'triangle';

    this.blip(start, note, this.musicMode === 'boss-capture' ? 0.105 : 0.14, type, volume);

    if (this.musicStep % 2 === 0) {
      this.blip(start, Math.max(55, note / 2), 0.16, 'sine', volume * 0.5);
    }

    this.musicStep += 1;
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
