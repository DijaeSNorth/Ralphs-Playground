export type CameraDistanceSetting = 'close' | 'normal' | 'far';

export type GameSettings = {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  pixelFilter: boolean;
  cameraDistance: CameraDistanceSetting;
  reducedMotion: boolean;
  showCatchOdds: boolean;
};

export const SETTINGS_STORAGE_KEY = 'gym-buddy-swole-safari-settings';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  musicVolume: 60,
  sfxVolume: 75,
  muted: false,
  pixelFilter: true,
  cameraDistance: 'normal',
  reducedMotion: false,
  showCatchOdds: true
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeCameraDistance(value: unknown): CameraDistanceSetting {
  return value === 'close' || value === 'far' ? value : 'normal';
}

export function sanitizeGameSettings(raw: unknown): GameSettings {
  if (!isObject(raw)) {
    return { ...DEFAULT_GAME_SETTINGS };
  }

  return {
    musicVolume: clampVolume(raw.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
    sfxVolume: clampVolume(raw.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
    muted: typeof raw.muted === 'boolean' ? raw.muted : DEFAULT_GAME_SETTINGS.muted,
    pixelFilter: typeof raw.pixelFilter === 'boolean' ? raw.pixelFilter : DEFAULT_GAME_SETTINGS.pixelFilter,
    cameraDistance: sanitizeCameraDistance(raw.cameraDistance),
    reducedMotion: typeof raw.reducedMotion === 'boolean' ? raw.reducedMotion : DEFAULT_GAME_SETTINGS.reducedMotion,
    showCatchOdds: typeof raw.showCatchOdds === 'boolean' ? raw.showCatchOdds : DEFAULT_GAME_SETTINGS.showCatchOdds
  };
}

export function loadGameSettingsFromStorage(): GameSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_GAME_SETTINGS };
  }

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!raw) {
    return { ...DEFAULT_GAME_SETTINGS };
  }

  try {
    return sanitizeGameSettings(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveGameSettingsToStorage(settings: GameSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeGameSettings(settings)));
}
