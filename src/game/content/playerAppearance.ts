import type {
  BodyFrame,
  BodySizeKey,
  CharacterSex,
  HairStyle,
  MuscleBuild,
  PlayerAppearance,
  SkinTone
} from '../types';

export const SEX_OPTIONS: Array<{ id: CharacterSex; label: string; description: string }> = [
  { id: 'man', label: 'Man', description: 'Broader base shoulders and straighter hips.' },
  { id: 'woman', label: 'Woman', description: 'Curvier base hips and softer shoulder line.' }
];

const HAIR_CANONICAL_OPTIONS: Array<{
  id: HairStyle;
  label: string;
  color: number;
  swatch: string;
}> = [
  { id: 'buzz-cut', label: 'Buzz Cut', color: 0x1d2530, swatch: '#1d2530' },
  { id: 'fade', label: 'Fade', color: 0x2a1f1b, swatch: '#2a1f1b' },
  { id: 'short-curls', label: 'Short Curls', color: 0x18110f, swatch: '#18110f' },
  { id: 'medium-curls', label: 'Medium Curls', color: 0x1b140f, swatch: '#1b140f' },
  { id: 'waves', label: 'Waves', color: 0x1b1512, swatch: '#1b1512' },
  { id: 'high-puff', label: 'High Puff', color: 0x2f1d14, swatch: '#2f1d14' },
  { id: 'long-straight', label: 'Long Straight', color: 0x201713, swatch: '#201713' },
  { id: 'long-wavy', label: 'Long Wavy', color: 0x2a1b14, swatch: '#2a1b14' },
  { id: 'bangs', label: 'Bangs', color: 0x211814, swatch: '#211814' },
  { id: 'side-part', label: 'Side Part', color: 0x261a13, swatch: '#261a13' },
  { id: 'undercut', label: 'Undercut', color: 0x110f0d, swatch: '#110f0d' },
  { id: 'mohawk', label: 'Mohawk', color: 0x2e1a11, swatch: '#2e1a11' },
  { id: 'spiky', label: 'Spiky Hair', color: 0x231914, swatch: '#231914' },
  { id: 'swept-back', label: 'Swept-Back', color: 0x201713, swatch: '#201713' },
  { id: 'afro', label: 'Afro', color: 0x17120f, swatch: '#17120f' },
  { id: 'locs', label: 'Locs', color: 0x2b1d17, swatch: '#2b1d17' },
  { id: 'twists', label: 'Twists', color: 0x2d2118, swatch: '#2d2118' },
  { id: 'braids', label: 'Braids', color: 0x2a1d16, swatch: '#2a1d16' },
  { id: 'bun', label: 'Bun', color: 0x6b3f28, swatch: '#6b3f28' },
  { id: 'ponytail', label: 'Ponytail', color: 0x2f211a, swatch: '#2f211a' },
  { id: 'high-top', label: 'High Top', color: 0x2f1a10, swatch: '#2f1a10' },
  { id: 'buzz', label: 'Buzz', color: 0x211710, swatch: '#211710' }
];

const HAIR_ALIAS: Partial<Record<HairStyle, HairStyle>> = {
  crop: 'buzz-cut',
  buzz: 'buzz-cut',
  sweep: 'swept-back',
  'short-locs': 'locs',
  'tapered-fade': 'fade',
  coils: 'afro',
  'bantu-knots': 'twists',
  'box-braids': 'braids',
  'high-top': 'high-top',
  'spiky-hair': 'spiky',
  'sweptback': 'swept-back',
  puff: 'high-puff',
  cornrows: 'twists'
};

export const HAIR_OPTIONS: Array<{ id: HairStyle; label: string; color: number; swatch: string }> =
  HAIR_CANONICAL_OPTIONS;

export const SKIN_TONE_OPTIONS: Array<{ id: SkinTone; label: string; color: number; swatch: string }> = [
  { id: 'light', label: 'Light', color: 0xffd6aa, swatch: '#ffd6aa' },
  { id: 'warm', label: 'Warm', color: 0xc9875d, swatch: '#c9875d' },
  { id: 'deep', label: 'Deep', color: 0x7a4b36, swatch: '#7a4b36' }
];

const MUSCLE_BUILD_ALIAS: Partial<Record<MuscleBuild, MuscleBuild>> = {
  lean: 'beginner',
  power: 'athletic',
  sculpted: 'bodybuilder'
};

export const MUSCLE_BUILD_OPTIONS: Array<{ id: MuscleBuild; label: string; description: string }> = [
  { id: 'beginner', label: 'Beginner', description: 'Smaller frame with lighter definition.' },
  { id: 'average', label: 'Average', description: 'Balanced everyday build.' },
  { id: 'toned', label: 'Toned', description: 'Lean definition and sharper muscle lines.' },
  { id: 'athletic', label: 'Athletic', description: 'Stronger shoulders, arms, and legs.' },
  { id: 'muscular', label: 'Muscular', description: 'Visibly larger arms, chest, and back.' },
  { id: 'bodybuilder', label: 'Bodybuilder', description: 'Exaggerated upper body and mass.' },
  { id: 'elite', label: 'Elite', description: 'Maximum stylized build.' }
];

export const FRAME_OPTIONS: Array<{ id: BodyFrame; label: string; description: string }> = [
  { id: 'balanced', label: 'Balanced', description: 'Even proportions from top to bottom.' },
  { id: 'tapered', label: 'Tapered', description: 'Wider shoulders with a narrower waist.' },
  { id: 'curved', label: 'Curved', description: 'More hip and lower-body shape.' },
  { id: 'compact', label: 'Compact', description: 'Shorter, powerful build.' },
  { id: 'voluptuous', label: 'Voluptuous', description: 'Fuller chest, hips, and lower body.' },
  { id: 'pear', label: 'Pear Heavy', description: 'Fuller lower-body emphasis.' }
];

export const BODY_SIZE_CONTROLS: Array<{
  id: BodySizeKey;
  label: string;
  min: number;
  max: number;
  step: number;
  description: string;
}> = [
  { id: 'height', label: 'Height', min: 0.88, max: 1.18, step: 0.02, description: 'Overall size.' },
  { id: 'shoulders', label: 'Shoulders', min: 0.82, max: 1.28, step: 0.02, description: 'Upper body width.' },
  { id: 'torso', label: 'Torso', min: 0.86, max: 1.22, step: 0.02, description: 'Core/body thickness.' },
  { id: 'arms', label: 'Arms', min: 0.82, max: 1.3, step: 0.02, description: 'Biceps and forearms.' },
  { id: 'legs', label: 'Legs', min: 0.84, max: 1.32, step: 0.02, description: 'Leg length and mass.' },
  { id: 'chest', label: 'Chest', min: 0.68, max: 1.4, step: 0.02, description: 'Upper torso/chest mass.' },
  { id: 'wings', label: 'Wings', min: 0.6, max: 1.55, step: 0.02, description: 'Back and lat width.' },
  { id: 'glutes', label: 'Glutes', min: 0.68, max: 1.42, step: 0.02, description: 'Lower-body shape.' },
  { id: 'thighs', label: 'Thighs', min: 0.8, max: 1.38, step: 0.02, description: 'Upper-leg size.' },
  { id: 'calfs', label: 'Calfs', min: 0.8, max: 1.38, step: 0.02, description: 'Lower-leg size.' }
];

export const DEFAULT_PLAYER_APPEARANCE: PlayerAppearance = {
  sex: 'man',
  hair: 'afro',
  skinTone: 'deep',
  muscleBuild: 'athletic',
  frame: 'balanced',
  body: {
    height: 1,
    shoulders: 1,
    torso: 1,
    arms: 1,
    legs: 1,
    chest: 1,
    wings: 1,
    glutes: 1,
    thighs: 1,
    calfs: 1
  }
};

export function normalizeHairStyle(id: HairStyle): HairStyle {
  return HAIR_ALIAS[id] ?? id;
}

export function normalizeMuscleBuild(build: MuscleBuild): MuscleBuild {
  return MUSCLE_BUILD_ALIAS[build] ?? build;
}

function getOptionById<T extends { id: string }>(
  options: readonly T[],
  id: string
): T | undefined {
  return options.find((option) => option.id === id);
}

export function getHairOption(id: HairStyle): (typeof HAIR_OPTIONS)[number] {
  const canonicalId = normalizeHairStyle(id);

  return getOptionById(HAIR_OPTIONS, canonicalId) ?? HAIR_OPTIONS[0];
}

export function getSkinToneOption(id: SkinTone): (typeof SKIN_TONE_OPTIONS)[number] {
  return getOptionById(SKIN_TONE_OPTIONS, id) ?? SKIN_TONE_OPTIONS[0];
}

export function getFrameOption(id: BodyFrame): (typeof FRAME_OPTIONS)[number] {
  return getOptionById(FRAME_OPTIONS, id) ?? FRAME_OPTIONS[0];
}

export function getSexOption(id: CharacterSex): (typeof SEX_OPTIONS)[number] {
  return getOptionById(SEX_OPTIONS, id) ?? SEX_OPTIONS[0];
}

export const CHARACTER_ASSET_MANIFEST_PATH = 'assets/characters/character_asset_manifest.json';
