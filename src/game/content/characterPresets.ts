import type { BodyFrame, MuscleBuild } from '../types';

export type CanonicalBodyFrame = Exclude<BodyFrame, 'voluptuous' | 'pear'>;
export type CanonicalBuildPreset = Exclude<MuscleBuild, 'lean' | 'power' | 'sculpted'>;

export type CharacterFramePreset = {
  id: CanonicalBodyFrame;
  label: string;
  shoulder: number;
  waist: number;
  hips: number;
  height: number;
  lowerBody: number;
  upperBody: number;
  description: string;
};

export type CharacterBuildPreset = {
  id: CanonicalBuildPreset;
  label: string;
  size: number;
  definition: number;
  lineIntensity: number;
  confidence: number;
  shoulderBias: number;
  armBias: number;
  chestBias: number;
  backBias: number;
  legBias: number;
  coreBias: number;
  description: string;
};

export const BODY_FRAME_ALIASES: Partial<Record<BodyFrame, CanonicalBodyFrame>> = {
  voluptuous: 'curved',
  pear: 'curved'
};

export const BUILD_PRESET_ALIASES: Partial<Record<MuscleBuild, CanonicalBuildPreset>> = {
  lean: 'beginner',
  power: 'athletic',
  sculpted: 'bodybuilder'
};

export const BODY_FRAME_PRESETS: Record<CanonicalBodyFrame, CharacterFramePreset> = {
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    shoulder: 1,
    waist: 1,
    hips: 1,
    height: 1,
    lowerBody: 1,
    upperBody: 1,
    description: 'Even proportions with a friendly all-around trainer silhouette.'
  },
  tapered: {
    id: 'tapered',
    label: 'Tapered',
    shoulder: 1.13,
    waist: 0.9,
    hips: 0.95,
    height: 1.02,
    lowerBody: 0.98,
    upperBody: 1.08,
    description: 'Wide shoulders, smaller waist, and a strong V-taper.'
  },
  compact: {
    id: 'compact',
    label: 'Compact',
    shoulder: 1.06,
    waist: 1.03,
    hips: 1.06,
    height: 0.94,
    lowerBody: 1.09,
    upperBody: 1.05,
    description: 'Shorter, grounded, powerful proportions.'
  },
  curved: {
    id: 'curved',
    label: 'Curved',
    shoulder: 0.96,
    waist: 0.96,
    hips: 1.14,
    height: 1,
    lowerBody: 1.12,
    upperBody: 0.98,
    description: 'Tasteful lower-body emphasis with athletic curves.'
  },
  power: {
    id: 'power',
    label: 'Power',
    shoulder: 1.14,
    waist: 1.09,
    hips: 1.08,
    height: 1,
    lowerBody: 1.1,
    upperBody: 1.14,
    description: 'Thick heroic torso and stable powerhouse stance.'
  },
  athletic: {
    id: 'athletic',
    label: 'Athletic',
    shoulder: 1.06,
    waist: 0.96,
    hips: 0.99,
    height: 1.04,
    lowerBody: 1.03,
    upperBody: 1.04,
    description: 'Sporty, capable, and ready for motion.'
  },
  heavyweight: {
    id: 'heavyweight',
    label: 'Heavyweight',
    shoulder: 1.18,
    waist: 1.16,
    hips: 1.15,
    height: 1.03,
    lowerBody: 1.17,
    upperBody: 1.18,
    description: 'Large grounded shape that stays clean and pleasant.'
  },
  lean: {
    id: 'lean',
    label: 'Lean',
    shoulder: 0.96,
    waist: 0.88,
    hips: 0.92,
    height: 1.08,
    lowerBody: 0.95,
    upperBody: 0.96,
    description: 'Tall, crisp, agile silhouette.'
  }
};

export const CHARACTER_BUILD_PRESETS: Record<CanonicalBuildPreset, CharacterBuildPreset> = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    size: 0.9,
    definition: 0.18,
    lineIntensity: 0.25,
    confidence: 0.22,
    shoulderBias: 0.9,
    armBias: 0.88,
    chestBias: 0.88,
    backBias: 0.88,
    legBias: 0.92,
    coreBias: 0.9,
    description: 'Smaller casual build with light athletic shape.'
  },
  average: {
    id: 'average',
    label: 'Average',
    size: 0.97,
    definition: 0.28,
    lineIntensity: 0.35,
    confidence: 0.35,
    shoulderBias: 0.98,
    armBias: 0.96,
    chestBias: 0.96,
    backBias: 0.96,
    legBias: 0.98,
    coreBias: 0.96,
    description: 'Balanced everyday trainer body.'
  },
  toned: {
    id: 'toned',
    label: 'Toned',
    size: 1,
    definition: 0.48,
    lineIntensity: 0.55,
    confidence: 0.48,
    shoulderBias: 1.02,
    armBias: 1.02,
    chestBias: 0.99,
    backBias: 1,
    legBias: 1.02,
    coreBias: 1.08,
    description: 'Lean definition and sharper core/arm lines.'
  },
  athletic: {
    id: 'athletic',
    label: 'Athletic',
    size: 1.04,
    definition: 0.52,
    lineIntensity: 0.58,
    confidence: 0.6,
    shoulderBias: 1.08,
    armBias: 1.06,
    chestBias: 1.04,
    backBias: 1.05,
    legBias: 1.08,
    coreBias: 1.04,
    description: 'Sporty and capable with balanced strength.'
  },
  muscular: {
    id: 'muscular',
    label: 'Muscular',
    size: 1.1,
    definition: 0.64,
    lineIntensity: 0.68,
    confidence: 0.72,
    shoulderBias: 1.16,
    armBias: 1.16,
    chestBias: 1.13,
    backBias: 1.12,
    legBias: 1.12,
    coreBias: 1.08,
    description: 'Visibly strong without becoming extreme.'
  },
  bodybuilder: {
    id: 'bodybuilder',
    label: 'Bodybuilder',
    size: 1.18,
    definition: 0.76,
    lineIntensity: 0.78,
    confidence: 0.86,
    shoulderBias: 1.24,
    armBias: 1.24,
    chestBias: 1.24,
    backBias: 1.22,
    legBias: 1.18,
    coreBias: 1.12,
    description: 'Big, clean, showy, and still stylized.'
  },
  elite: {
    id: 'elite',
    label: 'Elite',
    size: 1.24,
    definition: 0.86,
    lineIntensity: 0.86,
    confidence: 1,
    shoulderBias: 1.3,
    armBias: 1.3,
    chestBias: 1.28,
    backBias: 1.3,
    legBias: 1.24,
    coreBias: 1.16,
    description: 'Heroic swole main-character silhouette.'
  }
};

export function resolveCharacterFrame(frame: BodyFrame): CharacterFramePreset {
  return BODY_FRAME_PRESETS[BODY_FRAME_ALIASES[frame] ?? (frame as CanonicalBodyFrame)] ?? BODY_FRAME_PRESETS.balanced;
}

export function resolveCharacterBuild(build: MuscleBuild): CharacterBuildPreset {
  return CHARACTER_BUILD_PRESETS[BUILD_PRESET_ALIASES[build] ?? (build as CanonicalBuildPreset)] ?? CHARACTER_BUILD_PRESETS.athletic;
}
