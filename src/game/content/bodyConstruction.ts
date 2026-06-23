import type { BodyFrame, BodySizeKey, HairStyle, MuscleBuild, PlayerAppearance, SkinTone } from '../types';
import {
  DEFAULT_PLAYER_APPEARANCE,
  getHairOption,
  getSkinToneOption,
  normalizeBodyFrame,
  normalizeHairStyle,
  normalizeMuscleBuild
} from './playerAppearance';
import { resolveCharacterBuild, resolveCharacterFrame, type CharacterBuildPreset, type CharacterFramePreset } from './characterPresets';

export type MuscleGroupKey =
  | 'shoulders'
  | 'traps'
  | 'chest'
  | 'lats'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export type BodyMuscleValues = Record<MuscleGroupKey, number>;

export type CharacterIdentity = {
  skinTone: SkinTone;
  skinColor: number;
  skinShadow: number;
  hair: HairStyle;
  hairColor: number;
  outfitBase: number;
  outfitShadow: number;
  outfitAccent: number;
  shoeColor: number;
};

export type CharacterBodyMetrics = {
  height: number;
  headScale: number;
  shoulderWidth: number;
  chestWidth: number;
  waistWidth: number;
  hipWidth: number;
  torsoHeight: number;
  armLength: number;
  upperArmWidth: number;
  forearmWidth: number;
  thighWidth: number;
  calfWidth: number;
  legLength: number;
  gluteWidth: number;
  trapHeight: number;
  latWidth: number;
  lineIntensity: number;
  definition: number;
  confidence: number;
};

export type BodyConstructionState = {
  source: PlayerAppearance;
  identity: CharacterIdentity;
  frame: CharacterFramePreset;
  build: CharacterBuildPreset;
  muscles: BodyMuscleValues;
  metrics: CharacterBodyMetrics;
};

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function mix(a: number, b: number, amount: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * amount);
  const g = Math.round(ag + (bg - ag) * amount);
  const b2 = Math.round(ab + (bb - ab) * amount);
  return (r << 16) | (g << 8) | b2;
}

function readBody(body: Partial<Record<BodySizeKey, number>> | undefined, key: BodySizeKey): number {
  const value = body?.[key] ?? DEFAULT_PLAYER_APPEARANCE.body[key] ?? 1;
  return Number.isFinite(value) ? value : 1;
}

function normalizeAppearance(appearance?: PlayerAppearance): PlayerAppearance {
  return {
    ...DEFAULT_PLAYER_APPEARANCE,
    ...appearance,
    hair: normalizeHairStyle(appearance?.hair ?? DEFAULT_PLAYER_APPEARANCE.hair),
    muscleBuild: normalizeMuscleBuild(appearance?.muscleBuild ?? DEFAULT_PLAYER_APPEARANCE.muscleBuild),
    frame: normalizeBodyFrame(appearance?.frame ?? DEFAULT_PLAYER_APPEARANCE.frame),
    body: {
      ...DEFAULT_PLAYER_APPEARANCE.body,
      ...(appearance?.body ?? {})
    }
  };
}

function sculpt(value: number, min = 0.72, max = 1.32): number {
  return clamp(value, min, max);
}

function resolveMuscles(appearance: PlayerAppearance, build: CharacterBuildPreset, frame: CharacterFramePreset): BodyMuscleValues {
  const shoulders = sculpt(readBody(appearance.body, 'shoulders') * build.shoulderBias * frame.upperBody, 0.78, 1.38);
  const arms = sculpt(readBody(appearance.body, 'arms') * build.armBias, 0.78, 1.36);
  const torso = sculpt(readBody(appearance.body, 'torso') * build.coreBias, 0.82, 1.24);
  const chest = sculpt(readBody(appearance.body, 'chest') * build.chestBias * frame.upperBody, 0.72, 1.36);
  const lats = sculpt(readBody(appearance.body, 'wings') * build.backBias * frame.upperBody, 0.7, 1.38);
  const glutes = sculpt(readBody(appearance.body, 'glutes') * frame.lowerBody, 0.72, 1.34);
  const thighs = sculpt(readBody(appearance.body, 'thighs') * build.legBias * frame.lowerBody, 0.78, 1.38);
  const calves = sculpt(readBody(appearance.body, 'calfs') * build.legBias, 0.78, 1.34);
  const biceps = sculpt((readBody(appearance.body, 'biceps') * 0.78 + arms * 0.22) * (0.96 + build.definition * 0.08), 0.78, 1.34);
  const triceps = sculpt((readBody(appearance.body, 'triceps') * 0.78 + arms * 0.16 + shoulders * 0.06) * (0.98 + build.definition * 0.1), 0.78, 1.36);
  const forearms = sculpt((readBody(appearance.body, 'forearms') * 0.78 + arms * 0.14 + calves * 0.08) * (0.96 + build.definition * 0.08), 0.76, 1.28);
  const core = sculpt((readBody(appearance.body, 'core') * 0.76 + torso * 0.24) * (0.96 + build.definition * 0.12), 0.8, 1.28);
  const obliques = sculpt((readBody(appearance.body, 'obliques') * 0.76 + torso * 0.16 + lats * 0.08) * (0.96 + build.definition * 0.08), 0.8, 1.24);

  return {
    shoulders,
    traps: sculpt((readBody(appearance.body, 'traps') * 0.7 + shoulders * 0.18 + lats * 0.12) * (0.94 + build.definition * 0.16), 0.78, 1.28),
    chest,
    lats,
    biceps,
    triceps,
    forearms,
    core,
    obliques,
    glutes,
    quads: thighs,
    hamstrings: sculpt(readBody(appearance.body, 'hamstrings') * 0.74 + thighs * 0.14 + glutes * 0.12, 0.78, 1.32),
    calves
  };
}

function resolveIdentity(appearance: PlayerAppearance): CharacterIdentity {
  const skinColor = getSkinToneOption(appearance.skinTone).color;
  const hairColor = getHairOption(appearance.hair).color;
  const accent = appearance.muscleBuild === 'elite' ? 0xf6c85f : 0xff705c;

  return {
    skinTone: appearance.skinTone,
    skinColor,
    skinShadow: mix(skinColor, 0x5a2f24, 0.22),
    hair: appearance.hair,
    hairColor,
    outfitBase: 0x1b2f43,
    outfitShadow: 0x111d2f,
    outfitAccent: accent,
    shoeColor: 0xf9f7ef
  };
}

function resolveMetrics(appearance: PlayerAppearance, frame: CharacterFramePreset, build: CharacterBuildPreset, muscles: BodyMuscleValues): CharacterBodyMetrics {
  const bodyHeight = clamp(readBody(appearance.body, 'height') * frame.height, 0.84, 1.2);
  const legInput = clamp(readBody(appearance.body, 'legs'), 0.84, 1.3);
  const shoulderWidth = clamp(0.78 * frame.shoulder * muscles.shoulders, 0.68, 1.18);
  const chestWidth = clamp(0.54 * frame.upperBody * muscles.chest + shoulderWidth * 0.22, 0.5, 0.98);
  const waistWidth = clamp(0.38 * frame.waist * (1 + (muscles.obliques - 1) * 0.16), 0.3, 0.58);
  const hipWidth = clamp(0.48 * frame.hips * (1 + (muscles.glutes - 1) * 0.18), 0.38, 0.78);

  return {
    height: bodyHeight,
    headScale: clamp(1.04 - (build.size - 1) * 0.08, 0.96, 1.08),
    shoulderWidth,
    chestWidth,
    waistWidth,
    hipWidth,
    torsoHeight: clamp(0.78 * bodyHeight * (1 + (readBody(appearance.body, 'torso') - 1) * 0.12), 0.68, 0.92),
    armLength: clamp(0.88 * bodyHeight * (0.98 + (legInput - 1) * 0.05), 0.76, 1.02),
    upperArmWidth: clamp(0.18 * muscles.biceps * build.size, 0.13, 0.28),
    forearmWidth: clamp(0.14 * muscles.forearms * build.size, 0.1, 0.22),
    thighWidth: clamp(0.24 * muscles.quads * build.size * frame.lowerBody, 0.18, 0.36),
    calfWidth: clamp(0.16 * muscles.calves * build.size, 0.11, 0.26),
    legLength: clamp(0.82 * bodyHeight * (0.94 + (legInput - 1) * 0.14), 0.68, 1.02),
    gluteWidth: clamp(hipWidth * (1.02 + (muscles.glutes - 1) * 0.18), 0.38, 0.86),
    trapHeight: clamp(0.08 + (muscles.traps - 0.78) * 0.1, 0.06, 0.14),
    latWidth: clamp(0.18 + (muscles.lats - 1) * 0.28 + (frame.shoulder - 1) * 0.12, 0.1, 0.36),
    lineIntensity: clamp(build.lineIntensity + (build.definition - 0.5) * 0.2, 0.2, 0.9),
    definition: clamp(build.definition + (readBody(appearance.body, 'torso') - 1) * 0.24, 0.16, 0.9),
    confidence: build.confidence
  };
}

export function resolveBodyConstruction(appearance?: PlayerAppearance): BodyConstructionState {
  const source = normalizeAppearance(appearance);
  const frame = resolveCharacterFrame(source.frame);
  const build = resolveCharacterBuild(source.muscleBuild);
  const muscles = resolveMuscles(source, build, frame);
  const identity = resolveIdentity(source);
  const metrics = resolveMetrics(source, frame, build, muscles);

  return {
    source,
    identity,
    frame,
    build,
    muscles,
    metrics
  };
}
