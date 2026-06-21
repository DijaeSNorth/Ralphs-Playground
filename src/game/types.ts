export type Vec2 = {
  x: number;
  z: number;
};

export type BuddyArchetype = 'yogi' | 'runner' | 'lifter' | 'spinner' | 'climber';

export type HairStyle = 'crop' | 'bun' | 'sweep';

export type SkinTone = 'light' | 'warm' | 'deep';

export type MuscleBuild = 'lean' | 'power' | 'sculpted';

export type PlayerAppearance = {
  hair: HairStyle;
  skinTone: SkinTone;
  muscleBuild: MuscleBuild;
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
  color: number;
  accent: number;
  rarity: 'common' | 'uncommon' | 'rare';
  baseCatchRate: number;
  staminaReward: number;
};

export type BuddyRosterEntry = {
  rosterId: number;
  definitionId: string;
  level: number;
  xp: number;
  strength: number;
  endurance: number;
  focus: number;
  energy: number;
  status: BuddyRosterStatus;
  taskLabel?: string;
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

export type BuddyState = {
  id: number;
  definitionId: string;
  position: Vec2;
  heading: number;
  wanderHeading: number;
  wanderTimer: number;
  captured: boolean;
  respawnTimer: number;
  dodgeTimer: number;
  holdTimer: number;
  ragdollTimer: number;
};

export type PlayerState = {
  position: Vec2;
  heading: number;
  stamina: number;
  proteinShakers: number;
  capturedTotal: number;
};

export type CaptureResult = 'success' | 'miss' | 'empty' | 'too-far';

export type WorldEvent =
  | {
      type: 'capture';
      result: CaptureResult;
      buddy?: BuddyState;
      chance?: number;
      start: Vec2;
      target?: Vec2;
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
  inputLabel: string;
  gamepadConnected: boolean;
};

export type RepDexEntry = {
  definition: BuddyDefinition;
  count: number;
};

export type WorldSnapshot = {
  player: PlayerState;
  buddies: BuddyState[];
  roster: BuddyRosterEntry[];
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
  activeBoss?: BossState;
  nearestBuddy?: {
    buddy: BuddyState;
    distance: number;
  };
  activeBuddyCount: number;
  captureRange: number;
  arenaRadius: number;
};
