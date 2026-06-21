import type {
  BodyFrame,
  BodySizeKey,
  HairStyle,
  MuscleBuild,
  PlayerAppearance,
  SkinTone
} from '../types';

export const HAIR_OPTIONS: Array<{ id: HairStyle; label: string; color: number; swatch: string }> = [
  { id: 'crop', label: 'Crop', color: 0x1d2530, swatch: '#1d2530' },
  { id: 'bun', label: 'Bun', color: 0x6b3f28, swatch: '#6b3f28' },
  { id: 'sweep', label: 'Sweep', color: 0x168e9a, swatch: '#168e9a' },
  { id: 'afro', label: 'Afro', color: 0x17120f, swatch: '#17120f' },
  { id: 'coils', label: 'Coils', color: 0x221610, swatch: '#221610' },
  { id: 'tapered-fade', label: 'Taper Fade', color: 0x11161d, swatch: '#11161d' },
  { id: 'waves', label: 'Waves', color: 0x1b1512, swatch: '#1b1512' },
  { id: 'high-top', label: 'High Top', color: 0x201713, swatch: '#201713' },
  { id: 'locs', label: 'Locs', color: 0x2b1d17, swatch: '#2b1d17' },
  { id: 'short-locs', label: 'Short Locs', color: 0x241813, swatch: '#241813' },
  { id: 'twists', label: 'Twists', color: 0x2f2118, swatch: '#2f2118' },
  { id: 'cornrows', label: 'Cornrows', color: 0x15100d, swatch: '#15100d' },
  { id: 'box-braids', label: 'Box Braids', color: 0x2c1c14, swatch: '#2c1c14' },
  { id: 'bantu-knots', label: 'Bantu Knots', color: 0x1e1511, swatch: '#1e1511' },
  { id: 'puff', label: 'Puff', color: 0x1b120e, swatch: '#1b120e' }
];

export const SKIN_TONE_OPTIONS: Array<{ id: SkinTone; label: string; color: number; swatch: string }> = [
  { id: 'light', label: 'Light', color: 0xffcf9a, swatch: '#ffcf9a' },
  { id: 'warm', label: 'Warm', color: 0xc9875d, swatch: '#c9875d' },
  { id: 'deep', label: 'Deep', color: 0x7a4b36, swatch: '#7a4b36' }
];

export const MUSCLE_BUILD_OPTIONS: Array<{ id: MuscleBuild; label: string }> = [
  { id: 'lean', label: 'Lean' },
  { id: 'power', label: 'Power' },
  { id: 'sculpted', label: 'Sculpted' }
];

export const FRAME_OPTIONS: Array<{ id: BodyFrame; label: string }> = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'tapered', label: 'Tapered' },
  { id: 'curved', label: 'Curved' },
  { id: 'compact', label: 'Compact' }
];

export const BODY_SIZE_CONTROLS: Array<{ id: BodySizeKey; label: string; min: number; max: number; step: number }> = [
  { id: 'height', label: 'Height', min: 0.9, max: 1.14, step: 0.02 },
  { id: 'shoulders', label: 'Shoulders', min: 0.82, max: 1.24, step: 0.02 },
  { id: 'torso', label: 'Torso', min: 0.86, max: 1.18, step: 0.02 },
  { id: 'arms', label: 'Arms', min: 0.82, max: 1.28, step: 0.02 },
  { id: 'legs', label: 'Legs', min: 0.84, max: 1.24, step: 0.02 },
  { id: 'pecks', label: 'Pecks', min: 0.68, max: 1.36, step: 0.02 },
  { id: 'breasts', label: 'Breasts', min: 0.68, max: 1.36, step: 0.02 },
  { id: 'wings', label: 'Wings', min: 0.6, max: 1.5, step: 0.02 },
  { id: 'glutes', label: 'Glutes', min: 0.68, max: 1.36, step: 0.02 },
  { id: 'thighs', label: 'Thighs', min: 0.8, max: 1.34, step: 0.02 },
  { id: 'calfs', label: 'Calfs', min: 0.8, max: 1.34, step: 0.02 }
];

export const DEFAULT_PLAYER_APPEARANCE: PlayerAppearance = {
  hair: 'afro',
  skinTone: 'deep',
  muscleBuild: 'power',
  frame: 'balanced',
  body: {
    height: 1,
    shoulders: 1,
    torso: 1,
    arms: 1,
    legs: 1,
    pecks: 1,
    breasts: 1,
    wings: 1,
    glutes: 1,
    thighs: 1,
    calfs: 1
  }
};

export function getHairOption(id: HairStyle): (typeof HAIR_OPTIONS)[number] {
  return HAIR_OPTIONS.find((option) => option.id === id) ?? HAIR_OPTIONS[0];
}

export function getSkinToneOption(id: SkinTone): (typeof SKIN_TONE_OPTIONS)[number] {
  return SKIN_TONE_OPTIONS.find((option) => option.id === id) ?? SKIN_TONE_OPTIONS[0];
}

export function getFrameOption(id: BodyFrame): (typeof FRAME_OPTIONS)[number] {
  return FRAME_OPTIONS.find((option) => option.id === id) ?? FRAME_OPTIONS[0];
}
