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

export type WorkoutType = 'treadmill' | 'rower' | 'bench' | 'cable' | 'free-weights';

export type WorkoutStation = {
  id: string;
  name: string;
  type: WorkoutType;
  position: Vec2;
  radius: number;
  staminaReward: number;
  shakerReward: number;
};

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
    };

export type ActionState = {
  moveX: number;
  moveZ: number;
  catchPressed: boolean;
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
  repDex: RepDexEntry[];
  nearestBuddy?: {
    buddy: BuddyState;
    distance: number;
  };
  activeBuddyCount: number;
  captureRange: number;
  arenaRadius: number;
};
