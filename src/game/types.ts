export type Vec2 = {
  x: number;
  z: number;
};

export type BuddyArchetype = 'yogi' | 'runner' | 'lifter' | 'spinner' | 'climber';
export type BuddyRarity = 'common' | 'uncommon' | 'rare' | 'exotic';
export type BuddySpecies =
  | 'bunny'
  | 'bear'
  | 'fox'
  | 'corgi'
  | 'deer'
  | 'rhino'
  | 'panther'
  | 'gorilla'
  | 'jaguar'
  | 'penguin'
  | 'raccoon'
  | 'squirrel'
  | 'tiger'
  | 'buffalo'
  | 'minotaur'
  | 'griffin'
  | 'hydra'
  | 'dragon'
  | 'kraken'
  | 'pegasus'
  | 'phoenix'
  | 'sphinx'
  | 'werewolf'
  | 'cyclops';

export type BuddyVisualHints = {
  silhouette?: 'feline' | 'canine' | 'ungulate' | 'mustelid' | 'avian' | 'reptilian';
  pattern?: 'stripes' | 'spots' | 'banded' | 'solid';
};

export type BuddyMythicMetadata = {
  title: string;
  note: string;
};

export type BuddyPassiveEffect =
  | 'movement-speed'
  | 'strength-training'
  | 'steroid-boost'
  | 'stamina-saver'
  | 'sprint-recovery'
  | 'boss-power';

export type BuddyPassive = {
  id: string;
  name: string;
  effect: BuddyPassiveEffect;
  value: number;
  description: string;
};

export type HairStyle =
  | 'buzz-cut'
  | 'fade'
  | 'short-curls'
  | 'medium-curls'
  | 'bun'
  | 'ponytail'
  | 'high-puff'
  | 'long-straight'
  | 'long-wavy'
  | 'bangs'
  | 'side-part'
  | 'undercut'
  | 'mohawk'
  | 'spiky'
  | 'swept-back'
  | 'sweep'
  | 'afro'
  | 'waves'
  | 'locs'
  | 'braids'
  | 'short-locs'
  | 'twists'
  | 'cornrows'
  | 'box-braids'
  | 'bantu-knots'
  | 'puff'
  | 'high-top'
  | 'tapered-fade'
  | 'coils'
  | 'crop'
  | 'ponytail-tail'
  | 'spiky-hair'
  | 'buzz'
  | 'sweptback';

export type CharacterSex = 'man' | 'woman';

export type SkinTone = 'light' | 'warm' | 'deep';

export type MuscleBuild =
  | 'lean'
  | 'beginner'
  | 'average'
  | 'power'
  | 'toned'
  | 'athletic'
  | 'sculpted'
  | 'muscular'
  | 'bodybuilder'
  | 'elite';

export type BodyFrame =
  | 'balanced'
  | 'tapered'
  | 'curved'
  | 'compact'
  | 'voluptuous'
  | 'pear';

export type BuddyGender = 'man' | 'woman';

export type BodySizeKey =
  | 'height'
  | 'shoulders'
  | 'torso'
  | 'arms'
  | 'legs'
  | 'chest'
  | 'wings'
  | 'glutes'
  | 'thighs'
  | 'calfs';

export type BuddyBodyTraitKey = 'chest' | 'wings' | 'glutes' | 'thighs' | 'calfs';
export type BuddyBodyTraits = Record<BuddyBodyTraitKey, number>;

export type BodySizing = Record<BodySizeKey, number>;

export type PlayerAppearance = {
  sex: CharacterSex;
  hair: HairStyle;
  skinTone: SkinTone;
  muscleBuild: MuscleBuild;
  frame: BodyFrame;
  body: BodySizing;
};

export type WorkoutType =
  | 'bench'
  | 'incline-bench'
  | 'squat-rack'
  | 'leg-press'
  | 'cable'
  | 'free-weights'
  | 'machine-press'
  | 'lat-pulldown'
  | 'hack-squat'
  | 'free-weight-bench';

export type ProgressGoalId =
  | 'capture_3'
  | 'capture_6'
  | 'capture_10'
  | 'capture_first_exotic'
  | 'roster_level_10_any'
  | 'repdex_half';

export type ProgressGoalState = {
  completed: boolean;
  progress: number;
};

export type ProgressGoals = Record<ProgressGoalId, ProgressGoalState>;

export type LocalGymEventId =
  | 'chest-day'
  | 'cardio-chaos'
  | 'mythic-monday'
  | 'flex-friday'
  | 'beast-weekend';

export type LocalGymEventEffects = {
  strengthWorkoutXpMultiplier?: number;
  enduranceWorkoutXpMultiplier?: number;
  exoticSpawnBonus?: number;
  steroidRewardBonus?: number;
  bossRewardMultiplier?: number;
  bossSteroidRewardBonus?: number;
};

export type LocalGymEvent = {
  id: LocalGymEventId;
  name: string;
  shortName: string;
  description: string;
  bonusLabel: string;
  effects: LocalGymEventEffects;
};

export type WorkoutStation = {
  id: string;
  name: string;
  type: WorkoutType;
  position: Vec2;
  rotation?: number;
  radius: number;
  staminaReward: number;
  shakerReward: number;
};

export type VendingMachine = {
  id: string;
  name: string;
  position: Vec2;
  radius: number;
  energyDrinkCost: number;
  energyDrinkStamina: number;
  snackStamina: number;
  snackCrewEnergy: number;
  snackCooldown: number;
};

export type FreeWeightStatus = 'ground' | 'carried' | 'thrown';

export type FreeWeightPickup = {
  id: string;
  name: string;
  position: Vec2;
};

export type FreeWeightState = {
  id: number;
  pickupId: string;
  name: string;
  status: FreeWeightStatus;
  position: Vec2;
  spawnPosition: Vec2;
  velocity: Vec2;
  flightTimer: number;
  pickupCooldown: number;
  spin: number;
};

export type BuddyRosterStatus = 'ready' | 'training' | 'needs-spot';

export type BuddyTrainingOutcome = 'success' | 'needs-spot';

export type BuddyDefinition = {
  id: string;
  name: string;
  archetype: BuddyArchetype;
  gender?: BuddyGender;
  personalityTag: string;
  favoriteWorkout: string;
  reactionLines: {
    victory: string;
    cry: string;
  };
  description?: string;
  flavorText?: string;
  species: BuddySpecies;
  isExotic?: boolean;
  color: number;
  accent: number;
  displayNames?: string[];
  rarity: BuddyRarity;
  visualHints?: BuddyVisualHints;
  mythicMetadata?: BuddyMythicMetadata;
  passive: BuddyPassive;
  baseCatchRate: number;
  staminaReward: number;
};

export type BuddyRosterEntry = {
  rosterId: number;
  definitionId: string;
  bodyTraits: BuddyBodyTraits;
  displayName?: string;
  capturedAt?: number;
  level: number;
  xp: number;
  strength: number;
  endurance: number;
  focus: number;
  energy: number;
  status: BuddyRosterStatus;
  taskLabel?: string;
  taskStationId?: string;
  taskOutcome?: BuddyTrainingOutcome;
  taskTimer: number;
  taskDuration: number;
};

export type BossDefinition = {
  id: string;
  name: string;
  color: number;
  accent: number;
  strength: number;
  endurance: number;
  focus: number;
};

export type BossState = {
  id: number;
  definitionId: string;
  name: string;
  position: Vec2;
  strength: number;
  endurance: number;
  focus: number;
  timer: number;
  ragdollTimer: number;
};

export type BossBattleResult = 'success' | 'fail';
export type BossBattlePhase = 'intro' | 'clash' | 'result';

export type BossBattleRound = {
  label: string;
  crewScore: number;
  bossScore: number;
  winner: 'crew' | 'boss';
};

export type BossBattleState = {
  boss: BossState;
  phase: BossBattlePhase;
  result: BossBattleResult;
  crewPower: number;
  bossPower: number;
  winChance: number;
  rewardXp: number;
  rewardSteroids: number;
  exoticBoostReward: number;
  staminaCost: number;
  rounds: BossBattleRound[];
  activeRound: number;
  timer: number;
  duration: number;
  message: string;
};

export type BuddyState = {
  id: number;
  definitionId: string;
  bodyTraits: BuddyBodyTraits;
  displayName?: string;
  position: Vec2;
  heading: number;
  wanderHeading: number;
  wanderTimer: number;
  captured: boolean;
  respawnTimer: number;
  dodgeTimer: number;
  holdTimer: number;
  ragdollTimer: number;
  level: number;
};

export type PlayerState = {
  position: Vec2;
  heading: number;
  stamina: number;
  proteinShakers: number;
  steroids: number;
  capturedTotal: number;
};

export type CaptureResult = 'success' | 'miss' | 'empty' | 'too-far';
export type CaptureStyle = 'arm-wrestle';
export type ArmWrestleBeatType = 'grapple' | 'lockout';

export type ArmWrestleCapturePose = {
  player: {
    position: Vec2;
    heading: number;
  };
  creature: {
    position: Vec2;
    heading: number;
  };
};

export type ArmWrestleDramaticBeat = {
  beat: ArmWrestleBeatType;
  winner: 'player' | 'creature';
  caption: string;
};

export type ArmWrestleBeat = {
  at: number;
  text: string;
};

export type WorldEvent =
  | {
      type: 'capture';
      result: CaptureResult;
      captureStyle: CaptureStyle;
      buddy?: BuddyState;
      chance?: number;
      start: Vec2;
      target?: Vec2;
      capturePose?: ArmWrestleCapturePose;
      dramaticBeat?: ArmWrestleDramaticBeat;
      captureBeatSequence?: ArmWrestleBeat[];
      captureDuration?: number;
      captureDestination?: 'active' | 'storage';
      captureDisplayName?: string;
      captureLevel?: number;
      captureRarity?: BuddyRarity;
      flavorReactionLine?: string;
      message: string;
    }
  | {
      type: 'spawn';
      buddy: BuddyState;
      message: string;
    }
  | {
      type: 'workout';
      message: string;
    }
  | {
      type: 'roster';
      message: string;
      steroidUsed?: boolean;
      levelUp?: boolean;
      rosterId?: number;
    }
  | {
      type: 'vending';
      message: string;
    }
  | {
      type: 'boss';
      boss?: BossState;
      message: string;
    }
  | {
      type: 'free-weight';
      freeWeight?: FreeWeightState;
      message: string;
    };

export type ActionState = {
  moveX: number;
  moveZ: number;
  catchPressed: boolean;
  interactPressed: boolean;
  sprintHeld: boolean;
  resetPressed: boolean;
  isTouchInput: boolean;
  inputLabel: string;
  gamepadConnected: boolean;
};

export type RepDexEntry = {
  definition: BuddyDefinition;
  count: number;
  highestLevel: number;
};

export type WorldSnapshot = {
  player: PlayerState;
  buddies: BuddyState[];
  roster: BuddyRosterEntry[];
  storage: BuddyRosterEntry[];
  maxRosterSize: number;
  freeWeights: FreeWeightState[];
  carriedFreeWeightId?: number;
  nearestFreeWeight?: {
    freeWeight: FreeWeightState;
    distance: number;
  };
  vending: {
    snackCooldown: number;
  };
  repDex: RepDexEntry[];
  currentEvent: LocalGymEvent;
  activeBoss?: BossState;
  activeBossBattle?: BossBattleState;
  nearestBuddy?: {
    buddy: BuddyState;
    distance: number;
  };
  activeBuddyCount: number;
  captureRange: number;
  arenaRadius: number;
  goals: ProgressGoals;
  captureCutsceneRemaining: number;
  captureCutsceneDuration: number;
};
