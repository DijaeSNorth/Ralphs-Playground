import type { HairStyle, MuscleBuild, PlayerAppearance, SkinTone } from '../types';

export const HAIR_OPTIONS: Array<{ id: HairStyle; label: string; color: number; swatch: string }> = [
  { id: 'crop', label: 'Crop', color: 0x1d2530, swatch: '#1d2530' },
  { id: 'bun', label: 'Bun', color: 0x6b3f28, swatch: '#6b3f28' },
  { id: 'sweep', label: 'Sweep', color: 0x168e9a, swatch: '#168e9a' }
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

export const DEFAULT_PLAYER_APPEARANCE: PlayerAppearance = {
  hair: 'crop',
  skinTone: 'light',
  muscleBuild: 'power'
};

export function getHairOption(id: HairStyle): (typeof HAIR_OPTIONS)[number] {
  return HAIR_OPTIONS.find((option) => option.id === id) ?? HAIR_OPTIONS[0];
}

export function getSkinToneOption(id: SkinTone): (typeof SKIN_TONE_OPTIONS)[number] {
  return SKIN_TONE_OPTIONS.find((option) => option.id === id) ?? SKIN_TONE_OPTIONS[0];
}
