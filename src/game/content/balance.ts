import type {
  BuddyArchetype,
  BuddyBodyTraits,
  BuddyDefinition,
  BuddyPassive,
  BuddyRosterEntry,
  BuddyState,
  ProgressGoalId
} from '../types';

function clampBalance(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Capture odds used by both actual arm-wrestling attempts and UI previews.
export const NORMAL_CATCH_CHANCE_TIERS = [
  { maxLevel: 15, chance: 0.9 },
  { maxLevel: 25, chance: 0.85 },
  { maxLevel: 35, chance: 0.8 },
  { maxLevel: Number.POSITIVE_INFINITY, chance: 0.7 }
] as const;

export const EXOTIC_CATCH_CHANCE = 0.4;

export function getArmWrestleCatchChance(
  buddy: Pick<BuddyState, 'level'>,
  definition: Pick<BuddyDefinition, 'rarity' | 'isExotic'>
): number {
  if (definition.rarity === 'exotic' || definition.isExotic) {
    return EXOTIC_CATCH_CHANCE;
  }

  const level = Math.max(1, Math.floor(buddy.level));
  return NORMAL_CATCH_CHANCE_TIERS.find((tier) => level <= tier.maxLevel)?.chance ?? 0.7;
}

// World-size and encounter tuning.
export const WORLD_BALANCE = {
  arenaRadius: 18
} as const;

export const CAPTURE_BALANCE = {
  range: 2.85,
  // Shortened from 1.8s so repeated captures stay snappy without losing the mini-cutscene beat.
  armWrestleDurationSeconds: 1.6,
  // Faster retry pacing keeps failed arm-wrestles funny instead of making players wait.
  missRespawnSeconds: 0.9
} as const;

// Player inventory and stamina economy.
export const STAMINA_BALANCE = {
  max: 100,
  fullThreshold: 99.5,
  sprintMinimum: 5,
  walkDrainPerSecond: 7,
  sprintDrainPerSecond: 24,
  recoveryPerSecond: 18,
  spotAssistCost: 5,
  failedCaptureCost: 8,
  bossWinReward: 14,
  bossFailureCost: 18
} as const;

export const PROTEIN_SHAKER_BALANCE = {
  max: 8,
  starting: 6
} as const;

export const STEROID_BALANCE = {
  max: 12,
  starting: 0,
  levelCap: 60,
  workoutRewardChance: 0.42,
  vendingEnergyDrinkReward: 1
} as const;

// Crew capacity. Storage is intentionally unlimited for playtest v1.
export const ACTIVE_CREW_LIMIT = 4;
export const STORAGE_CREATURE_LIMIT: number | undefined = undefined;

// Wild spawn pacing, rarity odds, and level ranges.
export type WeightedBuddyOption = {
  id: string;
  weight: number;
};

export const WILD_SPAWN_BALANCE = {
  // One extra active wild creature makes early routing quicker while staying mobile-safe.
  activeBuddyCount: 7,
  progress: {
    capturedTotalForMax: 45,
    crewAverageLevelForMax: 40,
    capturedWeight: 0.68,
    crewWeight: 0.32,
    lockedGoalScale: 0.6,
    unlockedGoalScale: 1
  },
  stageThresholds: {
    earlyToMid: 0.33,
    midToLate: 0.67
  },
  exoticChance: {
    // Still rare at the start, but no longer so rare that playtesters may never see one.
    base: 0.002,
    progressScale: 0.012,
    min: 0.002,
    max: 0.055
  },
  levelSkew: {
    base: 1,
    progressPenalty: 0.45,
    min: 0.48
  },
  levelRanges: {
    low: { min: 1, max: 15 },
    mid: { min: 16, max: 25 },
    high: { min: 26, max: 35 },
    late: { min: 36, max: 50 }
  },
  levelTierWeights: {
    lowBase: 14,
    lowProgressPenalty: 12,
    midLocked: 0.15,
    // Mid-tier levels enter a bit sooner after goals unlock, but low levels still dominate early game.
    midBase: 1.1,
    midProgressScale: 5.2,
    highBase: 0.22,
    highProgressScale: 2.8,
    lateBase: 0.05,
    lateProgressScale: 1.2
  },
  exoticWeights: [
    { id: 'minotaur-maximus', weight: 32 },
    { id: 'dragon-deadlift', weight: 30 },
    { id: 'griffin-gains', weight: 24 },
    { id: 'cyclops-curl', weight: 20 },
    { id: 'chrome-rhino', weight: 10 },
    { id: 'hydra-hypertrophy', weight: 8 },
    { id: 'pegasus-pump', weight: 7 },
    { id: 'werewolf-warrior', weight: 8 },
    { id: 'kraken-curl', weight: 6 },
    { id: 'sphinx-strength', weight: 6 },
    { id: 'phoenix-flex', weight: 5 }
  ] satisfies WeightedBuddyOption[],
  normalWeights: {
    early: [
      { id: 'buff-bunny', weight: 26 },
      { id: 'curl-corgi', weight: 16 },
      { id: 'deadlift-deer', weight: 10 },
      { id: 'flex-fox', weight: 20 },
      { id: 'jacked-jaguar', weight: 8 },
      { id: 'bench-bear', weight: 14 },
      { id: 'press-penguin', weight: 10 },
      { id: 'rowing-raccoon', weight: 10 },
      { id: 'pump-panther', weight: 12 },
      { id: 'squat-squirrel', weight: 10 },
      { id: 'tricep-tiger', weight: 8 },
      { id: 'iron-rhino', weight: 3 },
      { id: 'bulk-buffalo', weight: 7 },
      { id: 'swole-gorilla', weight: 6 }
    ],
    mid: [
      { id: 'buff-bunny', weight: 17 },
      { id: 'curl-corgi', weight: 14 },
      { id: 'deadlift-deer', weight: 13 },
      { id: 'flex-fox', weight: 17 },
      { id: 'jacked-jaguar', weight: 11 },
      { id: 'bench-bear', weight: 17 },
      { id: 'press-penguin', weight: 8 },
      { id: 'rowing-raccoon', weight: 9 },
      { id: 'pump-panther', weight: 16 },
      { id: 'squat-squirrel', weight: 10 },
      { id: 'tricep-tiger', weight: 10 },
      { id: 'iron-rhino', weight: 9 },
      { id: 'bulk-buffalo', weight: 12 },
      { id: 'swole-gorilla', weight: 13 }
    ],
    late: [
      { id: 'buff-bunny', weight: 10 },
      { id: 'curl-corgi', weight: 8 },
      { id: 'deadlift-deer', weight: 13 },
      { id: 'flex-fox', weight: 10 },
      { id: 'jacked-jaguar', weight: 12 },
      { id: 'bench-bear', weight: 12 },
      { id: 'press-penguin', weight: 7 },
      { id: 'rowing-raccoon', weight: 7 },
      { id: 'pump-panther', weight: 10 },
      { id: 'squat-squirrel', weight: 7 },
      { id: 'tricep-tiger', weight: 12 },
      { id: 'iron-rhino', weight: 18 },
      { id: 'bulk-buffalo', weight: 16 },
      { id: 'swole-gorilla', weight: 10 }
    ]
  }
} as const;

export function getWildExoticSpawnChance(spawnProgress: number, exoticBoost = 0): number {
  const spawnStage = clampBalance(spawnProgress, 0, 1);
  const chance =
    WILD_SPAWN_BALANCE.exoticChance.base +
    spawnStage * WILD_SPAWN_BALANCE.exoticChance.progressScale +
    exoticBoost;

  return clampBalance(
    chance,
    WILD_SPAWN_BALANCE.exoticChance.min,
    WILD_SPAWN_BALANCE.exoticChance.max
  );
}

export function getWeightedSpawnTableForProgress(spawnProgress: number): readonly WeightedBuddyOption[] {
  const spawnStage = clampBalance(spawnProgress, 0, 1);

  if (spawnStage < WILD_SPAWN_BALANCE.stageThresholds.earlyToMid) {
    return WILD_SPAWN_BALANCE.normalWeights.early;
  }

  if (spawnStage < WILD_SPAWN_BALANCE.stageThresholds.midToLate) {
    return WILD_SPAWN_BALANCE.normalWeights.mid;
  }

  return WILD_SPAWN_BALANCE.normalWeights.late;
}

// XP curve and activity XP rewards.
export const XP_LEVEL_CURVE = {
  base: 70,
  linearPerLevel: 30,
  power: 1.35,
  powerScale: 8
} as const;

export const XP_REWARDS = {
  captureActiveCrew: 24,
  captureNewBuddy: 36,
  workoutBase: 30
} as const;

export function getBuddyXpForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(
    XP_LEVEL_CURVE.base +
      safeLevel * XP_LEVEL_CURVE.linearPerLevel +
      Math.pow(safeLevel, XP_LEVEL_CURVE.power) * XP_LEVEL_CURVE.powerScale
  );
}

// Goal targets and one-time milestone rewards.
export const PROGRESS_GOAL_TARGETS = {
  capture_first: 1,
  workout_first: 1,
  capture_3: 3,
  capture_6: 6,
  capture_10: 10,
  capture_first_exotic: 1,
  roster_level_10_any: 1,
  repdexHalfRatio: 0.5
} as const;

export function getGoalTargets(repdexSize: number): Record<ProgressGoalId, number> {
  return {
    capture_first: PROGRESS_GOAL_TARGETS.capture_first,
    workout_first: PROGRESS_GOAL_TARGETS.workout_first,
    capture_3: PROGRESS_GOAL_TARGETS.capture_3,
    capture_6: PROGRESS_GOAL_TARGETS.capture_6,
    capture_10: PROGRESS_GOAL_TARGETS.capture_10,
    capture_first_exotic: PROGRESS_GOAL_TARGETS.capture_first_exotic,
    roster_level_10_any: PROGRESS_GOAL_TARGETS.roster_level_10_any,
    repdex_half: Math.ceil(repdexSize * PROGRESS_GOAL_TARGETS.repdexHalfRatio)
  };
}

export const GOAL_STEROID_REWARDS: Record<ProgressGoalId, number> = {
  capture_first: 1,
  workout_first: 0,
  capture_3: 1,
  capture_6: 0,
  capture_10: 2,
  capture_first_exotic: 3,
  roster_level_10_any: 0,
  repdex_half: 5
};

export const GOAL_CREW_XP_REWARDS: Record<ProgressGoalId, number> = {
  capture_first: 35,
  workout_first: 45,
  capture_3: 50,
  capture_6: 60,
  capture_10: 80,
  capture_first_exotic: 120,
  roster_level_10_any: 90,
  repdex_half: 140
};

export const GOAL_MESSAGES: Record<ProgressGoalId, string> = {
  capture_first: 'Goal complete: first creature captured. Train your new crew member.',
  workout_first: 'Goal complete: first workout done. Crew XP gained.',
  capture_3: 'Goal complete: 3 captures reward unlocked.',
  capture_6: 'Goal complete: mid-tier gym beasts are now common.',
  capture_10: 'Goal complete: 10 captures reward unlocked.',
  capture_first_exotic: 'Goal complete: rare exotic caught reward unlocked.',
  roster_level_10_any: 'Goal complete: your crew can level up hard and loud.',
  repdex_half: 'Goal complete: your RepDex is half full.'
};

export const GOAL_LABELS: Record<ProgressGoalId, string> = {
  capture_first: 'Capture your first creature',
  workout_first: 'Complete your first workout',
  capture_3: 'Capture 3 creatures',
  capture_6: 'Capture 6 creatures',
  capture_10: 'Capture 10 creatures',
  capture_first_exotic: 'Find your first exotic',
  roster_level_10_any: 'Level a crew member to 10',
  repdex_half: 'Fill half the RepDex'
};

// Passive ability definitions and caps for active crew stacking.
export const BUDDY_PASSIVE_DEFINITIONS: Record<string, BuddyPassive> = {
  'buff-bunny': {
    id: 'quick-hop',
    name: 'Quick Hop',
    effect: 'movement-speed',
    value: 0.035,
    description: '+3.5% movement speed while in crew.'
  },
  'bench-bear': {
    id: 'chest-day-aura',
    name: 'Chest Day Aura',
    effect: 'strength-training',
    value: 0.12,
    description: 'Small chance for bonus strength from crew workouts.'
  },
  'flex-fox': {
    id: 'sneaky-stack',
    name: 'Sneaky Stack',
    effect: 'steroid-boost',
    value: 0.1,
    description: 'Steroids have a small chance to add extra stats.'
  },
  'iron-rhino': {
    id: 'iron-hide-cardio',
    name: 'Iron Hide Cardio',
    effect: 'stamina-saver',
    value: 0.07,
    description: 'Reduces stamina loss by 7% while in crew.'
  },
  'curl-corgi': {
    id: 'short-stride-sprint',
    name: 'Short-Stride Sprint',
    effect: 'sprint-recovery',
    value: 0.08,
    description: '+8% stamina recovery after sprinting.'
  },
  'deadlift-deer': {
    id: 'antler-leverage',
    name: 'Antler Leverage',
    effect: 'strength-training',
    value: 0.09,
    description: 'Small chance for bonus strength from crew workouts.'
  },
  'jacked-jaguar': {
    id: 'silent-footwork',
    name: 'Silent Footwork',
    effect: 'movement-speed',
    value: 0.04,
    description: '+4% movement speed while in crew.'
  },
  'pump-panther': {
    id: 'night-tempo',
    name: 'Night Tempo',
    effect: 'sprint-recovery',
    value: 0.1,
    description: '+10% stamina recovery after sprinting.'
  },
  'press-penguin': {
    id: 'cooldown-waddle',
    name: 'Cooldown Waddle',
    effect: 'stamina-saver',
    value: 0.05,
    description: 'Reduces stamina loss by 5% while in crew.'
  },
  'rowing-raccoon': {
    id: 'trash-boat-tempo',
    name: 'Trash-Boat Tempo',
    effect: 'sprint-recovery',
    value: 0.07,
    description: '+7% stamina recovery after sprinting.'
  },
  'squat-squirrel': {
    id: 'micro-plate-hustle',
    name: 'Micro-Plate Hustle',
    effect: 'steroid-boost',
    value: 0.08,
    description: 'Steroids have a small chance to add extra stats.'
  },
  'tricep-tiger': {
    id: 'striped-set-power',
    name: 'Striped Set Power',
    effect: 'boss-power',
    value: 0.08,
    description: '+8% crew power in boss challenges.'
  },
  'bulk-buffalo': {
    id: 'herd-momentum',
    name: 'Herd Momentum',
    effect: 'stamina-saver',
    value: 0.08,
    description: 'Reduces stamina loss by 8% while in crew.'
  },
  'minotaur-maximus': {
    id: 'labyrinth-roar',
    name: 'Labyrinth Roar',
    effect: 'boss-power',
    value: 0.15,
    description: '+15% crew power in boss challenges.'
  },
  'griffin-gains': {
    id: 'sky-spotter',
    name: 'Sky Spotter',
    effect: 'movement-speed',
    value: 0.08,
    description: '+8% movement speed while in crew.'
  },
  'dragon-deadlift': {
    id: 'hoarder-lockout',
    name: 'Hoarder Lockout',
    effect: 'strength-training',
    value: 0.18,
    description: 'Strong chance for bonus strength from crew workouts.'
  },
  'cyclops-curl': {
    id: 'single-eye-focus',
    name: 'Single-Eye Focus',
    effect: 'steroid-boost',
    value: 0.16,
    description: 'Steroids have a better chance to add extra stats.'
  },
  'swole-gorilla': {
    id: 'ape-challenge-roar',
    name: 'Ape Challenge Roar',
    effect: 'boss-power',
    value: 0.1,
    description: '+10% crew power in boss challenges.'
  },
  'chrome-rhino': {
    id: 'alloy-lungs',
    name: 'Alloy Lungs',
    effect: 'stamina-saver',
    value: 0.13,
    description: 'Reduces stamina loss by 13% while in crew.'
  },
  'hydra-hypertrophy': {
    id: 'many-neck-hype',
    name: 'Many-Neck Hype',
    effect: 'strength-training',
    value: 0.16,
    description: 'Strong chance for bonus strength from crew workouts.'
  },
  'pegasus-pump': {
    id: 'cloud-recovery',
    name: 'Cloud Recovery',
    effect: 'sprint-recovery',
    value: 0.16,
    description: '+16% stamina recovery after sprinting.'
  },
  'werewolf-warrior': {
    id: 'moon-howl-power',
    name: 'Moon Howl Power',
    effect: 'boss-power',
    value: 0.14,
    description: '+14% crew power in boss challenges.'
  },
  'kraken-curl': {
    id: 'tentacle-grip',
    name: 'Tentacle Grip',
    effect: 'steroid-boost',
    value: 0.15,
    description: 'Steroids have a better chance to add extra stats.'
  },
  'sphinx-strength': {
    id: 'riddle-guard',
    name: 'Riddle Guard',
    effect: 'stamina-saver',
    value: 0.12,
    description: 'Reduces stamina loss by 12% while in crew.'
  },
  'phoenix-flex': {
    id: 'rebirth-stride',
    name: 'Rebirth Stride',
    effect: 'sprint-recovery',
    value: 0.15,
    description: '+15% stamina recovery after sprinting.'
  }
};

export const PASSIVE_TOTAL_LIMITS = {
  movementSpeedBonus: 0.12,
  strengthTrainingChance: 0.35,
  steroidBoostChance: 0.35,
  staminaLossReduction: 0.18,
  sprintRecoveryBonus: 0.24,
  bossPowerBonus: 0.25,
  rollMaxChance: 0.45
} as const;

// Creature generation and base roster stats.
export const BUDDY_BODY_TRAIT_RANGES: Record<keyof BuddyBodyTraits, { min: number; max: number }> = {
  chest: { min: 0.68, max: 1.36 },
  wings: { min: 0.6, max: 1.5 },
  glutes: { min: 0.68, max: 1.36 },
  thighs: { min: 0.8, max: 1.34 },
  calfs: { min: 0.8, max: 1.34 }
};

export const BUDDY_TRAIT_BIAS: Record<BuddyArchetype, Partial<Record<keyof BuddyBodyTraits, number>>> = {
  yogi: { wings: 0.12, calfs: -0.04, thighs: -0.06 },
  runner: { calfs: 0.12, thighs: 0.05, chest: -0.06 },
  lifter: { chest: 0.28, glutes: 0.16, thighs: 0.16, calfs: 0.1 },
  spinner: { chest: 0.04, glutes: -0.06 },
  climber: { thighs: 0.14, calfs: 0.12, glutes: 0.08 }
};

export const BASE_ROSTER_STATS_BY_ARCHETYPE: Record<
  BuddyArchetype,
  Pick<BuddyRosterEntry, 'strength' | 'endurance' | 'focus'>
> = {
  runner: { strength: 4, endurance: 8, focus: 4 },
  lifter: { strength: 9, endurance: 5, focus: 4 },
  spinner: { strength: 5, endurance: 7, focus: 5 },
  climber: { strength: 7, endurance: 5, focus: 7 },
  yogi: { strength: 3, endurance: 5, focus: 8 }
};

export const LEVEL_UP_BALANCE = {
  statIncrease: 1,
  energyReward: 18,
  bonusEnergyPerExtraStat: 4
} as const;

// Roster workout timing and crew energy costs.
export const ROSTER_TRAINING_BALANCE = {
  durationSeconds: 12,
  spotWindowSeconds: 7,
  spotRange: 1.95,
  energyCost: 15,
  successChance: 0.5,
  maxEnergy: 100
} as const;

export const WORKOUT_BALANCE = {
  goalScore: 5
} as const;

// Vending rewards used by content and HUD display.
export const VENDING_BALANCE = {
  energyDrinkCost: 1,
  energyDrinkStamina: 38,
  snackStamina: 10,
  snackCrewEnergy: 14,
  snackCooldown: 14
} as const;

// Player movement and stamina drain/recovery.
export const PLAYER_MOVEMENT_BALANCE = {
  walkSpeed: 5.2,
  sprintSpeed: 7.8,
  acceleration: 34,
  deceleration: 42,
  turnSpeed: 10.5,
  touchTurnSpeed: 6
} as const;

export const BUDDY_AI_BALANCE = {
  wanderSpeed: 0.95,
  dodgeSpeed: 4.4
} as const;

// Free-weight interaction values.
export const FREE_WEIGHT_BALANCE = {
  pickupRange: 2.15,
  throwSpeed: 11.8,
  throwDurationSeconds: 1.12,
  hitRadius: 0.72,
  bossHitRadius: 1.05,
  pickupCooldownSeconds: 0.65,
  buddyRagdollSeconds: 1.65,
  bossRagdollSeconds: 1.35
} as const;

// Boss battle power, rewards, and respawn pacing.
export const BOSS_BALANCE = {
  initialSpawnDelaySeconds: 18,
  activeDurationSeconds: 26,
  battleDurationSeconds: 2.45,
  exoticBoostReward: 0.006,
  exoticBoostMax: 0.035,
  powerBonus: 18,
  winChanceBase: 0.42,
  winChancePowerDivisor: 120,
  winChanceMin: 0.18,
  winChanceMax: 0.94,
  rewardXpBase: 28,
  rewardXpPowerScale: 0.25,
  rewardSteroidUpgradeChance: 0.35,
  rewardSteroidsBase: 1,
  rewardSteroidsLuckyOrExotic: 2,
  respawnAfterWinBaseSeconds: 42,
  respawnAfterWinRandomSeconds: 24,
  respawnAfterLossBaseSeconds: 62,
  respawnAfterLossRandomSeconds: 30,
  respawnAfterTimeoutBaseSeconds: 38,
  respawnAfterTimeoutRandomSeconds: 26,
  roundWeights: {
    level: 0.3,
    stats: 0.46,
    rarityPassive: 0.18
  },
  crewPower: {
    levelMultiplier: 2.7,
    energyBase: 0.72,
    energyDivisor: 360,
    normalPassiveNudge: 1.35,
    exoticPassiveNudge: 3,
    staminaDivisor: 10
  },
  rarityBattleBonus: {
    common: 1,
    uncommon: 2.5,
    rare: 4.5,
    exotic: 8
  }
} as const;

// Local date-driven event bonuses.
export const LOCAL_GYM_EVENT_BALANCE = {
  strengthWorkoutXpMultiplier: 1.1,
  enduranceWorkoutXpMultiplier: 1.1,
  mythicMondayExoticSpawnBonus: 0.008,
  flexFridaySteroidRewardBonus: 1,
  beastWeekendBossRewardMultiplier: 1.15,
  beastWeekendBossSteroidRewardBonus: 1
} as const;

// Developer-only shortcuts for faster manual testing.
export const DEBUG_BALANCE = {
  steroidGrantAmount: 5,
  activeCrewXpGrant: 120
} as const;

// Wild creature life signs. These are visual/AI pacing values, not capture odds.
export const CREATURE_BEHAVIOR_BALANCE = {
  reactRange: 2.8,
  reactDurationSeconds: 0.65,
  reactCooldownSeconds: 1.4,
  normalActionChancePerSecond: 0.22,
  exoticActionChancePerSecond: 0.32,
  normalFlexDurationSeconds: 1.15,
  normalStretchDurationSeconds: 1.35,
  exoticFlexDurationSeconds: 1.55,
  exoticStretchDurationSeconds: 1.75,
  behaviorCooldownMinSeconds: 2.1,
  behaviorCooldownRandomSeconds: 3.4,
  normalFlexMoveMultiplier: 0.32,
  normalStretchMoveMultiplier: 0.22,
  reactMoveMultiplier: 0.55,
  exoticConfidenceMoveMultiplier: 0.76,
  exoticBehaviorMoveMultiplier: 0.62
} as const;
