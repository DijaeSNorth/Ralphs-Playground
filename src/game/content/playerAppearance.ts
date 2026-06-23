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
  { id: 'bodybuilder', label: 'Bodybuilder', description: 'Big but clean, stylized, and readable.' },
  { id: 'elite', label: 'Elite', description: 'Heroic swole shape without distortion.' }
];

export const FRAME_OPTIONS: Array<{ id: BodyFrame; label: string; description: string }> = [
  { id: 'balanced', label: 'Balanced', description: 'Even proportions from top to bottom.' },
  { id: 'tapered', label: 'Tapered', description: 'Wider shoulders with a narrower waist.' },
  { id: 'compact', label: 'Compact', description: 'Shorter, powerful build.' },
  { id: 'curved', label: 'Curved', description: 'More hip and lower-body shape.' },
  { id: 'power', label: 'Power', description: 'Thicker heroic torso and stronger stance.' },
  { id: 'athletic', label: 'Athletic', description: 'Sporty, agile proportions.' },
  { id: 'heavyweight', label: 'Heavyweight', description: 'Large grounded powerhouse frame.' },
  { id: 'lean', label: 'Lean', description: 'Tall, crisp, runner-like silhouette.' }
];

export const BODY_SIZE_CONTROLS: Array<{
  id: BodySizeKey;
  label: string;
  min: number;
  max: number;
  step: number;
  description: string;
  group: 'upper' | 'core' | 'lower';
}> = [
  { id: 'shoulders', label: 'Shoulders', min: 0.9, max: 1.32, step: 0.01, group: 'upper', description: 'Widens the upper silhouette and heroic stance.' },
  { id: 'traps', label: 'Traps', min: 0.9, max: 1.28, step: 0.01, group: 'upper', description: 'Raises the neck-to-shoulder shape.' },
  { id: 'chest', label: 'Chest', min: 0.9, max: 1.36, step: 0.01, group: 'upper', description: 'Adds front torso mass and confidence.' },
  { id: 'wings', label: 'Lats / Wings', min: 0.88, max: 1.38, step: 0.01, group: 'upper', description: 'Builds a wider back and V-taper.' },
  { id: 'biceps', label: 'Biceps', min: 0.9, max: 1.36, step: 0.01, group: 'upper', description: 'Thickens the front upper arms.' },
  { id: 'triceps', label: 'Triceps', min: 0.9, max: 1.36, step: 0.01, group: 'upper', description: 'Thickens the rear upper arms.' },
  { id: 'forearms', label: 'Forearms', min: 0.9, max: 1.3, step: 0.01, group: 'upper', description: 'Makes the lower arms read stronger.' },
  { id: 'core', label: 'Abs / Core', min: 0.9, max: 1.3, step: 0.01, group: 'core', description: 'Adds cleaner torso definition.' },
  { id: 'obliques', label: 'Obliques', min: 0.9, max: 1.28, step: 0.01, group: 'core', description: 'Shapes the side core and waist line.' },
  { id: 'torso', label: 'Torso Thickness', min: 0.9, max: 1.24, step: 0.01, group: 'core', description: 'Adjusts torso mass without distortion.' },
  { id: 'glutes', label: 'Glutes', min: 0.9, max: 1.36, step: 0.01, group: 'lower', description: 'Adds rear lower-body power.' },
  { id: 'thighs', label: 'Thighs / Quads', min: 0.9, max: 1.38, step: 0.01, group: 'lower', description: 'Builds upper-leg strength and stance.' },
  { id: 'hamstrings', label: 'Hamstrings', min: 0.9, max: 1.32, step: 0.01, group: 'lower', description: 'Shapes the rear legs in back view.' },
  { id: 'calfs', label: 'Calves', min: 0.9, max: 1.34, step: 0.01, group: 'lower', description: 'Strengthens the lower-leg silhouette.' }
];

export const DEFAULT_PLAYER_APPEARANCE: PlayerAppearance = {
  sex: 'man',
  hair: 'swept-back',
  skinTone: 'warm',
  muscleBuild: 'athletic',
  frame: 'balanced',
  body: {
    height: 1.02,
    shoulders: 1.08,
    traps: 1.04,
    torso: 1.02,
    arms: 1.08,
    biceps: 1.08,
    triceps: 1.08,
    forearms: 1.04,
    legs: 1.04,
    chest: 1.08,
    wings: 1.05,
    core: 1.04,
    obliques: 1.02,
    glutes: 1.02,
    thighs: 1.03,
    hamstrings: 1.03,
    calfs: 1.02
  }
};

export function normalizeHairStyle(id: HairStyle): HairStyle {
  return HAIR_ALIAS[id] ?? id;
}

export function normalizeMuscleBuild(build: MuscleBuild): MuscleBuild {
  return MUSCLE_BUILD_ALIAS[build] ?? build;
}

export function normalizeBodyFrame(frame: BodyFrame): BodyFrame {
  if (frame === 'voluptuous' || frame === 'pear') {
    return 'curved';
  }

  return frame;
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
  return getOptionById(FRAME_OPTIONS, normalizeBodyFrame(id)) ?? FRAME_OPTIONS[0];
}

export function getSexOption(id: CharacterSex): (typeof SEX_OPTIONS)[number] {
  return getOptionById(SEX_OPTIONS, id) ?? SEX_OPTIONS[0];
}

export const CHARACTER_ASSET_MANIFEST_PATH = 'assets/characters/character_asset_manifest.json';
