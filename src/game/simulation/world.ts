import { BUDDY_DEFINITIONS, getBuddyDefinition, getRandomBuddyName } from '../content/buddies';
import { BOSS_DEFINITIONS, getBossDefinition } from '../content/bosses';
import { FREE_WEIGHT_PICKUPS, WORKOUT_STATIONS } from '../content/equipment';
import { VENDING_MACHINES } from '../content/vending';
import type {
  ActionState,
  BossState,
  BuddyArchetype,
  ProgressGoalId,
  ProgressGoalState,
  BuddyBodyTraits,
  BuddyDefinition,
  BuddyRosterEntry,
  ProgressGoals,
  BuddyState,
  FreeWeightState,
  RepDexEntry,
  Vec2,
  WorkoutStation,
  WorldEvent,
  WorldSnapshot
} from '../types';
import {
  type SavedProgress,
  type SavedProgressRosterEntry,
  SAVE_DATA_VERSION
} from '../progress';

const ARENA_RADIUS = 18;
const CAPTURE_RANGE = 2.85;
const MAX_STAMINA = 100;
const ARM_WRESTLE_CAPTURE_DURATION = 1.8;
const MAX_PROTEIN_SHAKERS = 8;
const STARTING_PROTEIN_SHAKERS = 6;
const MAX_STEROIDS = 12;
const STARTING_STEROIDS = 0;
const STEROID_LEVEL_CAP = 60;
const ACTIVE_BUDDIES = 6;
const MAX_ROSTER_SIZE = 4;
const WALK_SPEED = 5.2;
const SPRINT_SPEED = 7.8;
const PLAYER_ACCELERATION = 34;
const PLAYER_DECELERATION = 42;
const PLAYER_TURN_SPEED = 10.5;
const PLAYER_TURN_SPEED_TOUCH = 6;
const BUDDY_WANDER_SPEED = 0.95;
const BUDDY_DODGE_SPEED = 4.4;
const TRAINING_DURATION = 12;
const TRAINING_SPOT_WINDOW = 7;
const BOSS_ACTIVE_DURATION = 26;
const ROSTER_SPOT_RANGE = 1.95;
const FREE_WEIGHT_PICKUP_RANGE = 2.15;
const FREE_WEIGHT_THROW_SPEED = 11.8;
const FREE_WEIGHT_THROW_DURATION = 1.12;
const FREE_WEIGHT_HIT_RADIUS = 0.72;
const BOSS_FREE_WEIGHT_HIT_RADIUS = 1.05;
const FREE_WEIGHT_PICKUP_COOLDOWN = 0.65;
const BUDDY_RAGDOLL_DURATION = 1.65;
const BOSS_RAGDOLL_DURATION = 1.35;
const GOAL_TARGETS = {
  capture_3: 3,
  capture_6: 6,
  capture_10: 10,
  capture_first_exotic: 1,
  roster_level_10_any: 1,
  repdex_half: Math.ceil(BUDDY_DEFINITIONS.length / 2)
} as const;
const GOAL_STEROID_REWARDS = {
  capture_3: 1,
  capture_6: 0,
  capture_10: 2,
  capture_first_exotic: 3,
  roster_level_10_any: 0,
  repdex_half: 5
} as const;
const GOAL_MESSAGES = {
  capture_3: 'Goal: +1 Steroid after 3 captures unlocked.',
  capture_6: 'Goal complete: mid-tier gym beasts are now common.',
  capture_10: 'Goal complete: +2 Steroids for reaching 10 captures.',
  capture_first_exotic: 'Goal complete: rare exotic caught! +3 steroids.',
  roster_level_10_any: 'Goal complete: your crew can level up hard and loud.',
  repdex_half: 'Goal complete: your RepDex is half full. +5 steroids!'
} as const;
const BUDDY_BODY_TRAIT_RANGES: Record<keyof BuddyBodyTraits, { min: number; max: number }> = {
  chest: { min: 0.68, max: 1.36 },
  wings: { min: 0.6, max: 1.5 },
  glutes: { min: 0.68, max: 1.36 },
  thighs: { min: 0.8, max: 1.34 },
  calfs: { min: 0.8, max: 1.34 }
};

const BUDDY_TRAIT_BIAS: Record<BuddyArchetype, Partial<Record<keyof BuddyBodyTraits, number>>> = {
  yogi: { wings: 0.12, calfs: -0.04, thighs: -0.06 },
  runner: { calfs: 0.12, thighs: 0.05, chest: -0.06 },
  lifter: { chest: 0.28, glutes: 0.16, thighs: 0.16, calfs: 0.1 },
  spinner: { chest: 0.04, glutes: -0.06 },
  climber: { thighs: 0.14, calfs: 0.12, glutes: 0.08 }
};

let nextBuddyId = 1;
let nextRosterId = 1;
let nextBossId = 1;
let nextFreeWeightId = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function approach(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }

  return current + Math.sign(target - current) * maxDelta;
}

function angleDifference(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function rotateToward(current: number, target: number, maxDelta: number): number {
  const delta = angleDifference(current, target);

  if (Math.abs(delta) <= maxDelta) {
    return target;
  }

  return current + Math.sign(delta) * maxDelta;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function headingVector(heading: number): Vec2 {
  return {
    x: Math.sin(heading),
    z: Math.cos(heading)
  };
}

function copyVec2(value: Vec2): Vec2 {
  return { x: value.x, z: value.z };
}

function toNonNegativeInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function randomPoint(radius = ARENA_RADIUS - 2): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;

  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r
  };
}

function createDefaultGoalState(): ProgressGoals {
  return {
    capture_3: { completed: false, progress: 0 },
    capture_6: { completed: false, progress: 0 },
    capture_10: { completed: false, progress: 0 },
    capture_first_exotic: { completed: false, progress: 0 },
    roster_level_10_any: { completed: false, progress: 0 },
    repdex_half: { completed: false, progress: 0 }
  };
}

function randomHeading(): number {
  return Math.random() * Math.PI * 2;
}

function randomTrait(range: { min: number; max: number }, bias = 0): number {
  return clamp(Math.random() * (range.max - range.min) + range.min + bias, range.min, range.max);
}

export function getArmWrestleCatchChance(
  buddy: BuddyState,
  definition: BuddyDefinition
): number {
  if (definition.rarity === 'exotic' || definition.isExotic) {
    return 0.4;
  }

  const level = Math.max(1, Math.floor(buddy.level));

  if (level <= 15) {
    return 0.9;
  }

  if (level <= 25) {
    return 0.85;
  }

  if (level <= 35) {
    return 0.8;
  }

  return 0.7;
}

function generateBuddyBodyTraits(archetype: BuddyArchetype): BuddyBodyTraits {
  const traitBias = BUDDY_TRAIT_BIAS[archetype];

  return {
    chest: randomTrait(BUDDY_BODY_TRAIT_RANGES.chest, traitBias.chest),
    wings: randomTrait(BUDDY_BODY_TRAIT_RANGES.wings, traitBias.wings),
    glutes: randomTrait(BUDDY_BODY_TRAIT_RANGES.glutes, traitBias.glutes),
    thighs: randomTrait(BUDDY_BODY_TRAIT_RANGES.thighs, traitBias.thighs),
    calfs: randomTrait(BUDDY_BODY_TRAIT_RANGES.calfs, traitBias.calfs)
  };
}

function randomBossDefinitionId(): string {
  return BOSS_DEFINITIONS[Math.floor(Math.random() * BOSS_DEFINITIONS.length)].id;
}

type WeightedBuddyOption = {
  id: string;
  weight: number;
};

function pickWeightedBuddyId(options: WeightedBuddyOption[]): string {
  const total = options.reduce((sum, option) => sum + option.weight, 0);

  if (total <= 0) {
    return options[0]!.id;
  }

  let remaining = Math.random() * total;

  for (const option of options) {
    remaining -= option.weight;

    if (remaining <= 0) {
      return option.id;
    }
  }

  return options[options.length - 1]?.id ?? 'buff-bunny';
}

function weightedBuddyDefinitionId(spawnProgress: number): string {
  const spawnStage = clamp(spawnProgress, 0, 1);
  const exoticChance = clamp(0.001 + spawnStage * 0.01, 0.001, 0.011);
  const isExotic = Math.random() < exoticChance;

  if (isExotic) {
    const exoticOptions: WeightedBuddyOption[] = [
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
    ];

    return pickWeightedBuddyId(exoticOptions);
  }

  const normalEarly: WeightedBuddyOption[] = [
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
  ];

  const normalMid: WeightedBuddyOption[] = [
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
  ];

  const normalLate: WeightedBuddyOption[] = [
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
  ];

  if (spawnStage < 0.33) {
    return pickWeightedBuddyId(normalEarly);
  }

  if (spawnStage < 0.67) {
    return pickWeightedBuddyId(normalMid);
  }

  return pickWeightedBuddyId(normalLate);
}

function pickWildLevelInRange(minLevel: number, maxLevel: number, spawnProgress: number): number {
  const span = Math.max(0, maxLevel - minLevel);
  const skew = clamp(1 - spawnProgress * 0.45, 0.48, 1);
  const weighted = Math.pow(Math.random(), skew);

  return minLevel + Math.floor(weighted * (span + 1));
}

function getWorkoutStationById(stationId?: string): WorkoutStation | undefined {
  if (!stationId) {
    return undefined;
  }

  return WORKOUT_STATIONS.find((station) => station.id === stationId);
}

export class GymBuddyWorld {
  private player = {
    position: { x: 0, z: 5 },
    velocity: { x: 0, z: 0 },
    heading: Math.PI,
    stamina: MAX_STAMINA,
    proteinShakers: STARTING_PROTEIN_SHAKERS,
    steroids: STARTING_STEROIDS,
    capturedTotal: 0
  };

  private readonly buddies: BuddyState[] = [];
  private readonly roster: BuddyRosterEntry[] = [];
  private readonly freeWeights: FreeWeightState[] = [];
  private readonly captured = new Map<string, number>();
  private readonly capturedHighLevel = new Map<string, number>();
  private readonly events: WorldEvent[] = [];
  private goalState: ProgressGoals = createDefaultGoalState();
  private activeBoss?: BossState;
  private carriedFreeWeightId?: number;
  private catchCooldown = 0;
  private captureCutsceneTimer = 0;
  private shakerRechargeTimer = 0;
  private vendingSnackCooldown = 0;
  private bossSpawnTimer = 18;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.player = {
      position: { x: 0, z: 5 },
      velocity: { x: 0, z: 0 },
      heading: Math.PI,
      stamina: MAX_STAMINA,
      proteinShakers: STARTING_PROTEIN_SHAKERS,
      steroids: STARTING_STEROIDS,
      capturedTotal: 0
    };
    this.buddies.length = 0;
    this.roster.length = 0;
    this.freeWeights.length = 0;
    this.captured.clear();
    this.capturedHighLevel.clear();
    this.goalState = createDefaultGoalState();
    this.events.length = 0;
    this.activeBoss = undefined;
    this.carriedFreeWeightId = undefined;
    this.catchCooldown = 0;
    this.captureCutsceneTimer = 0;
    this.shakerRechargeTimer = 0;
    this.vendingSnackCooldown = 0;
    this.bossSpawnTimer = 18;

    for (let index = 0; index < ACTIVE_BUDDIES; index += 1) {
      const buddy = this.createBuddy();

      if (index === 0) {
        buddy.definitionId = 'flex-fox';
        buddy.position = { x: 0, z: 2.45 };
        buddy.wanderHeading = Math.PI;
        buddy.holdTimer = 4.5;
      }

      this.buddies.push(buddy);
    }

    for (const pickup of FREE_WEIGHT_PICKUPS) {
      this.freeWeights.push(this.createFreeWeight(pickup));
    }
  }

  update(deltaSeconds: number, actions: ActionState): void {
    const dt = Math.min(deltaSeconds, 0.05);
    const attemptingCapture = actions.catchPressed && this.captureCutsceneTimer <= 0;

    if (actions.resetPressed) {
      this.reset();
      return;
    }

    this.captureCutsceneTimer = Math.max(0, this.captureCutsceneTimer - dt);
    this.catchCooldown = Math.max(0, this.catchCooldown - dt);
    this.updatePlayer(
      dt,
      this.captureCutsceneTimer > 0 || attemptingCapture
        ? {
            ...actions,
            moveX: 0,
            moveZ: 0,
            sprintHeld: false,
            catchPressed: false,
            interactPressed: false
          }
        : actions
    );
    this.updateFreeWeights(dt);
    this.updateBuddies(dt);
    this.updateRoster(dt);
    this.updateBoss(dt);
    this.rechargeProteinShakers(dt);
    this.updateVending(dt);

    if (attemptingCapture) {
      if (!this.throwHeldFreeWeight()) {
        this.tryCapture();
      }
    }
  }

  drainEvents(): WorldEvent[] {
    return this.events.splice(0, this.events.length);
  }

  interactWithFreeWeight(): boolean {
    const carried = this.getCarriedFreeWeight();

    if (carried) {
      const direction = headingVector(this.player.heading);
      carried.status = 'ground';
      carried.position = {
        x: this.player.position.x + direction.x * 0.95,
        z: this.player.position.z + direction.z * 0.95
      };
      carried.velocity = { x: 0, z: 0 };
      carried.flightTimer = 0;
      carried.pickupCooldown = FREE_WEIGHT_PICKUP_COOLDOWN;
      this.carriedFreeWeightId = undefined;
      this.events.push({
        type: 'free-weight',
        freeWeight: this.copyFreeWeight(carried),
        message: `${carried.name} set down.`
      });
      return true;
    }

    const nearest = this.getNearestFreeWeight();

    if (!nearest || nearest.distance > FREE_WEIGHT_PICKUP_RANGE) {
      return false;
    }

    const freeWeight = nearest.freeWeight;
    freeWeight.status = 'carried';
    freeWeight.velocity = { x: 0, z: 0 };
    freeWeight.flightTimer = 0;
    freeWeight.pickupCooldown = 0;
    this.carriedFreeWeightId = freeWeight.id;
    this.events.push({
      type: 'free-weight',
      freeWeight: this.copyFreeWeight(freeWeight),
      message: `${freeWeight.name} picked up. Left click to throw.`
    });
    return true;
  }

  completeWorkout(station: WorkoutStation): void {
    const steroidGain = this.grantSteroids(Math.random() < 0.42 ? 1 : 0);
    this.player.stamina = clamp(this.player.stamina + station.staminaReward, 0, MAX_STAMINA);
    this.player.proteinShakers = clamp(
      this.player.proteinShakers + station.shakerReward,
      0,
      MAX_PROTEIN_SHAKERS
    );
    const steroidText = steroidGain > 0 ? ` +${steroidGain} steroid` : '';
    this.events.push({
      type: 'workout',
      message: `${station.name} complete. +${station.staminaReward} stamina, +${station.shakerReward} shaker.${steroidText}`
    });
  }

  buyEnergyDrink(): void {
    const machine = VENDING_MACHINES[0];

    if (this.player.stamina >= MAX_STAMINA) {
      this.events.push({
        type: 'vending',
        message: 'Stamina is already topped off.'
      });
      return;
    }

    if (this.player.proteinShakers < machine.energyDrinkCost) {
      this.events.push({
        type: 'vending',
        message: `Need ${machine.energyDrinkCost} shaker to buy an energy drink.`
      });
      return;
    }

    const previousStamina = this.player.stamina;
    this.player.proteinShakers -= machine.energyDrinkCost;
    this.player.stamina = clamp(this.player.stamina + machine.energyDrinkStamina, 0, MAX_STAMINA);
    const steroidGain = this.grantSteroids(1);
    const steroidText = steroidGain > 0 ? ` +${steroidGain} steroid` : '';
    this.events.push({
      type: 'vending',
      message: `Energy drink purchased. +${Math.round(this.player.stamina - previousStamina)} stamina.${steroidText}`
    });
  }

  grabProteinSnack(): void {
    const machine = VENDING_MACHINES[0];

    if (this.vendingSnackCooldown > 0) {
      this.events.push({
        type: 'vending',
        message: `Protein snacks restock in ${Math.ceil(this.vendingSnackCooldown)}s.`
      });
      return;
    }

    const previousStamina = this.player.stamina;
    let crewEnergyRestored = 0;
    this.player.stamina = clamp(this.player.stamina + machine.snackStamina, 0, MAX_STAMINA);

    for (const buddy of this.roster) {
      const previousEnergy = buddy.energy;
      buddy.energy = clamp(buddy.energy + machine.snackCrewEnergy, 0, 100);
      crewEnergyRestored += buddy.energy - previousEnergy;
    }

    if (this.player.stamina === previousStamina && crewEnergyRestored === 0) {
      this.events.push({
        type: 'vending',
        message: 'Everyone is stocked. Save the snacks for later.'
      });
      return;
    }

    this.vendingSnackCooldown = machine.snackCooldown;
    this.events.push({
      type: 'vending',
      message:
        this.roster.length > 0
          ? 'Protein snacks grabbed. Crew energy restored.'
          : `Protein snack grabbed. +${Math.round(this.player.stamina - previousStamina)} stamina.`
    });
  }

  sendBuddyToWorkout(rosterId: number): void {
    const buddy = this.roster.find((entry) => entry.rosterId === rosterId);

    if (!buddy) {
      return;
    }

    const buddyName = this.getRosterDisplayName(buddy);

    if (buddy.status !== 'ready') {
      this.events.push({
        type: 'roster',
        message: `${buddyName} is already busy.`
      });
      return;
    }

    if (buddy.energy < 15) {
      this.events.push({
        type: 'roster',
        message: `${buddyName} needs a breather first.`
      });
      return;
    }

    buddy.energy = clamp(buddy.energy - 15, 0, 100);
    buddy.status = 'training';
    const station = this.getRandomWorkoutStation();
    buddy.taskLabel = station.name;
    buddy.taskStationId = station.id;
    buddy.taskOutcome = Math.random() < 0.5 ? 'success' : 'needs-spot';
    buddy.taskTimer = TRAINING_DURATION;
    buddy.taskDuration = TRAINING_DURATION;
    this.events.push({
      type: 'roster',
      message: `${buddyName} is training at ${buddy.taskLabel}. Be ready to spot them.`
    });
  }

  spotBuddy(rosterId: number): void {
    const buddy = this.roster.find((entry) => entry.rosterId === rosterId);

    if (!buddy) {
      return;
    }

    const buddyName = this.getRosterDisplayName(buddy);

    if (buddy.status !== 'needs-spot') {
      this.events.push({
        type: 'roster',
        message: `${buddyName} does not need a spot right now.`
      });
      return;
    }

    const station = getWorkoutStationById(buddy.taskStationId);

    if (!station) {
      this.events.push({
        type: 'roster',
        message: `${buddyName} has no workout station and cannot be spotted right now.`
      });
      return;
    }

    const stationDistance = distance(this.player.position, station.position);

    if (stationDistance > ROSTER_SPOT_RANGE) {
      this.events.push({
        type: 'roster',
        message: `${buddyName} needs a spot at ${buddy.taskLabel}. Move closer (${stationDistance.toFixed(1)}m).`
      });
      return;
    }

    if (buddy.energy < 10) {
      this.events.push({
        type: 'roster',
        message: `${buddyName} is too tired to spot.`
      });
      return;
    }

    const definition = getBuddyDefinition(buddy.definitionId);
    buddy.energy = clamp(buddy.energy - 8, 0, 100);
    this.player.stamina = clamp(this.player.stamina - 5, 0, MAX_STAMINA);
    this.applyTrainingResult(buddy, definition.archetype, 0.5);
    this.finishRosterTask(buddy);
    this.events.push({
      type: 'roster',
      message: `You spotted ${buddyName}. Successful rep: half credit XP gained.`
    });
  }

  removeBuddy(rosterId: number): void {
    const index = this.roster.findIndex((entry) => entry.rosterId === rosterId);

    if (index === -1) {
      return;
    }

    const [, removedBuddy] = this.roster.splice(index, 1);
    this.events.push({
      type: 'roster',
      message: `${this.getRosterDisplayName(removedBuddy)} left your crew.`
    });
  }

  renameBuddy(rosterId: number, displayName?: string): void {
    const buddy = this.roster.find((entry) => entry.rosterId === rosterId);

    if (!buddy) {
      this.events.push({
        type: 'roster',
        message: 'That crew member is no longer available.'
      });
      return;
    }

    const trimmedName = typeof displayName === 'string' ? displayName.trim() : '';
    const previousName = this.getRosterDisplayName(buddy);
    buddy.displayName = trimmedName.length > 0 ? trimmedName : undefined;

    this.events.push({
      type: 'roster',
      rosterId: buddy.rosterId,
      message: `${previousName} is now called ${this.getRosterDisplayName(buddy)}.`
    });
  }

  useSteroid(rosterId: number): void {
    const buddy = this.roster.find((entry) => entry.rosterId === rosterId);

    if (!buddy) {
      this.events.push({
        type: 'roster',
        message: 'That buddy is not available right now.'
      });
      return;
    }

    if (this.player.steroids <= 0) {
      this.events.push({
        type: 'roster',
        message: 'No steroids left. Hit workouts or vending machines for more.'
      });
      return;
    }

    const name = this.getRosterDisplayName(buddy);

    if (buddy.level >= STEROID_LEVEL_CAP) {
      this.events.push({
        type: 'roster',
        message: `${name} is already as buff as it gets.`
      });
      return;
    }

    this.player.steroids = Math.max(0, this.player.steroids - 1);
    buddy.level += 1;
    buddy.xp += 55;
    buddy.strength += 2;
    buddy.endurance += 2;
    buddy.focus += 2;
    this.evaluateCrewLevelGoal();
    this.events.push({
      type: 'roster',
      rosterId: buddy.rosterId,
      steroidUsed: true,
      message: `${name} got unreasonably swole!`
    });
  }

  challengeBoss(): void {
    if (!this.activeBoss) {
      return;
    }

    if (this.roster.length === 0) {
      this.events.push({
        type: 'boss',
        boss: this.copyBoss(this.activeBoss),
        message: 'Catch a buddy before taking boss challenges.'
      });
      return;
    }

    const boss = this.activeBoss;
    const crewPower = this.getCrewPower();
    const bossPower = boss.strength + boss.endurance + boss.focus;
    const chance = clamp(0.38 + (crewPower - bossPower) / 110, 0.16, 0.92);
    const success = Math.random() < chance;
    let bonusSteroids = 0;

    if (success) {
      this.player.stamina = clamp(this.player.stamina + 20, 0, MAX_STAMINA);
      this.player.proteinShakers = clamp(this.player.proteinShakers + 2, 0, MAX_PROTEIN_SHAKERS);
      bonusSteroids = this.grantSteroids(1);
      for (const buddy of this.roster) {
        this.addRosterXp(buddy, 18);
        buddy.energy = clamp(buddy.energy - 6, 0, 100);
      }
    } else {
      this.player.stamina = clamp(this.player.stamina - 18, 0, MAX_STAMINA);
      for (const buddy of this.roster) {
        buddy.energy = clamp(buddy.energy - 10, 0, 100);
      }
    }

    this.events.push({
      type: 'boss',
      boss: this.copyBoss(boss),
      message: success
        ? `${boss.name} got outlifted. Crew gained XP.${bonusSteroids > 0 ? ` +${bonusSteroids} steroid.` : ''}`
        : `${boss.name} won the set. Train your crew and try again.`
    });
    this.activeBoss = undefined;
    this.bossSpawnTimer = 40 + Math.random() * 28;
  }

  private isGoalCompleted(goalId: ProgressGoalId): boolean {
    return this.goalState[goalId]?.completed ?? false;
  }

  private getGoalStateSnapshot(): ProgressGoals {
    return {
      capture_3: { ...this.goalState.capture_3 },
      capture_6: { ...this.goalState.capture_6 },
      capture_10: { ...this.goalState.capture_10 },
      capture_first_exotic: { ...this.goalState.capture_first_exotic },
      roster_level_10_any: { ...this.goalState.roster_level_10_any },
      repdex_half: { ...this.goalState.repdex_half }
    };
  }

  private updateGoalProgress(
    goalId: ProgressGoalId,
    progress: number,
    grantReward = true
  ): void {
    const state = this.goalState[goalId];
    if (!state || state.completed) {
      return;
    }

    const target = GOAL_TARGETS[goalId];
    state.progress = Math.min(Math.max(progress, state.progress), target);

    if (state.progress < target) {
      return;
    }

    state.completed = true;
    state.progress = target;

    if (!grantReward) {
      return;
    }

    const reward = this.grantSteroids(GOAL_STEROID_REWARDS[goalId] ?? 0);
    const suffix = reward > 0 ? ` +${reward} steroids` : '';
    this.events.push({
      type: 'capture',
      result: 'success',
      captureStyle: 'arm-wrestle',
      start: copyVec2(this.player.position),
      message: `${GOAL_MESSAGES[goalId]}${suffix}`
    });
  }

  private evaluateCaptureGoals(definition: BuddyDefinition): void {
    this.updateGoalProgress('capture_3', this.player.capturedTotal);
    this.updateGoalProgress('capture_6', this.player.capturedTotal);
    this.updateGoalProgress('capture_10', this.player.capturedTotal);
    this.updateGoalProgress('capture_first_exotic', definition.rarity === 'exotic' || definition.isExotic ? 1 : 0);
    this.evaluateRepDexGoal();
  }

  private evaluateRepDexGoal(): void {
    const caughtCount = this.captured.size;
    this.updateGoalProgress('repdex_half', caughtCount);
  }

  private evaluateCrewLevelGoal(grantReward = true): void {
    const hasEliteCrew = this.roster.some((buddy) => buddy.level >= 10);
    this.updateGoalProgress('roster_level_10_any', hasEliteCrew ? 1 : 0, grantReward);
  }

  private syncGoalStateFromLoadedProgress(): void {
    this.updateGoalProgress('capture_3', this.player.capturedTotal, false);
    this.updateGoalProgress('capture_6', this.player.capturedTotal, false);
    this.updateGoalProgress('capture_10', this.player.capturedTotal, false);
    this.evaluateRepDexGoal();
    this.evaluateCrewLevelGoal(false);
    let exoticCaptured = false;
    for (const [definitionId, count] of this.captured) {
      const definition = getBuddyDefinition(definitionId);
      if (count > 0 && (definition.rarity === 'exotic' || definition.isExotic)) {
        exoticCaptured = true;
        break;
      }
    }
    this.updateGoalProgress(
      'capture_first_exotic',
      exoticCaptured ? 1 : 0,
      false
    );
  }

  getSnapshot(): WorldSnapshot {
    const nearest = this.getNearestBuddy();
    const nearestFreeWeight = this.getNearestFreeWeight();
    const repDex: RepDexEntry[] = BUDDY_DEFINITIONS.map((definition) => ({
      definition,
      count: this.captured.get(definition.id) ?? 0,
      highestLevel: this.capturedHighLevel.get(definition.id) ?? 0
    }));

    return {
      player: {
        position: copyVec2(this.player.position),
        heading: this.player.heading,
        stamina: this.player.stamina,
        proteinShakers: this.player.proteinShakers,
        steroids: this.player.steroids,
        capturedTotal: this.player.capturedTotal
      },
      buddies: this.buddies.map((buddy) => ({
        ...buddy,
        position: copyVec2(buddy.position),
        bodyTraits: { ...buddy.bodyTraits }
      })),
      roster: this.roster.map((entry) => ({ ...entry, bodyTraits: { ...entry.bodyTraits } })),
      maxRosterSize: MAX_ROSTER_SIZE,
      freeWeights: this.freeWeights.map((freeWeight) => this.copyFreeWeight(freeWeight)),
      carriedFreeWeightId: this.carriedFreeWeightId,
      nearestFreeWeight: nearestFreeWeight
        ? {
            freeWeight: this.copyFreeWeight(nearestFreeWeight.freeWeight),
            distance: nearestFreeWeight.distance
          }
        : undefined,
      vending: {
        snackCooldown: this.vendingSnackCooldown
      },
      repDex,
      goals: this.getGoalStateSnapshot(),
      activeBoss: this.activeBoss ? this.copyBoss(this.activeBoss) : undefined,
      nearestBuddy: nearest
        ? {
            buddy: { ...nearest.buddy, position: copyVec2(nearest.buddy.position) },
            distance: nearest.distance
          }
        : undefined,
      activeBuddyCount: this.buddies.filter((buddy) => !buddy.captured).length,
      captureRange: CAPTURE_RANGE,
      arenaRadius: ARENA_RADIUS,
      captureCutsceneRemaining: this.captureCutsceneTimer,
      captureCutsceneDuration: ARM_WRESTLE_CAPTURE_DURATION
    };
  }

  getSaveData(): SavedProgress {
    return {
      version: SAVE_DATA_VERSION,
      timestamp: Date.now(),
      tutorialCompleted: false,
      player: {
        position: copyVec2(this.player.position),
        heading: this.player.heading,
        stamina: this.player.stamina,
        proteinShakers: this.player.proteinShakers,
        steroids: this.player.steroids,
        capturedTotal: this.player.capturedTotal
      },
      goals: this.getGoalStateSnapshot(),
      roster: this.roster.map((entry) => ({
        ...entry,
        bodyTraits: { ...entry.bodyTraits },
        taskLabel: entry.taskLabel,
        taskStationId: entry.taskStationId,
        taskOutcome: entry.taskOutcome
      })),
      repDex: BUDDY_DEFINITIONS.map((definition) => ({
        definitionId: definition.id,
        count: this.captured.get(definition.id) ?? 0,
        highestLevel: this.capturedHighLevel.get(definition.id) ?? 0
      })),
      capturedTotal: this.player.capturedTotal,
      progressionTier: this.getProgressionTier(),
      nextIds: {
        nextBuddyId,
        nextRosterId,
        nextBossId,
        nextFreeWeightId
      }
    };
  }

  loadSaveData(save: SavedProgress): void {
    this.player = {
      position: { x: 0, z: 5 },
      velocity: { x: 0, z: 0 },
      heading: Math.PI,
      stamina: MAX_STAMINA,
      proteinShakers: STARTING_PROTEIN_SHAKERS,
      steroids: STARTING_STEROIDS,
      capturedTotal: 0
    };
    this.events.length = 0;

    this.buddies.length = 0;
    this.roster.length = 0;
    this.freeWeights.length = 0;
    this.captured.clear();
    this.capturedHighLevel.clear();

    this.activeBoss = undefined;
    this.carriedFreeWeightId = undefined;
    this.catchCooldown = 0;
    this.captureCutsceneTimer = 0;
    this.shakerRechargeTimer = 0;
    this.vendingSnackCooldown = 0;
    this.bossSpawnTimer = 18;

    for (const definition of BUDDY_DEFINITIONS) {
      const savedRep = save.repDex.find((entry) => entry.definitionId === definition.id);

      if (savedRep) {
        const count = toNonNegativeInteger(savedRep.count, 0);
        const highestLevel = toNonNegativeInteger(savedRep.highestLevel, 0);

        if (count > 0) {
          this.captured.set(definition.id, count);
        }

        if (highestLevel > 0) {
          this.capturedHighLevel.set(definition.id, highestLevel);
        }
      }
    }

    this.player = {
      ...this.player,
      position: save.player.position,
      heading: save.player.heading,
      stamina: clamp(save.player.stamina, 0, MAX_STAMINA),
      proteinShakers: clamp(save.player.proteinShakers, 0, MAX_PROTEIN_SHAKERS),
      steroids: clamp(save.player.steroids, 0, MAX_STEROIDS),
      capturedTotal: clamp(save.player.capturedTotal, 0, 9999)
    };

    const rosterEntries: SavedProgressRosterEntry[] = save.roster.slice(0, MAX_ROSTER_SIZE);
    let nextRosterIdFromSave = Math.max(1, toNonNegativeInteger(save.nextIds.nextRosterId, 1));
    const rosterById = new Set<number>();

    for (const entry of rosterEntries) {
      if (!BUDDY_DEFINITIONS.some((candidate) => candidate.id === entry.definitionId)) {
        continue;
      }

      let rosterId = toNonNegativeInteger(entry.rosterId, 0);

      if (rosterId <= 0 || rosterById.has(rosterId)) {
        rosterId = nextRosterIdFromSave;
        nextRosterIdFromSave += 1;
      }

      if (rosterById.has(rosterId)) {
        continue;
      }

      const level = Math.max(1, toNonNegativeInteger(entry.level, 1));
      const xp = toNonNegativeInteger(entry.xp, 0);
      const strength = Math.max(1, toNonNegativeInteger(entry.strength, 1));
      const endurance = Math.max(1, toNonNegativeInteger(entry.endurance, 1));
      const focus = Math.max(1, toNonNegativeInteger(entry.focus, 1));
      const energy = clamp(entry.energy, 0, 100);
      const status = entry.status;
      const capturedAt = toNonNegativeInteger(entry.capturedAt ?? Date.now(), Date.now());
      const hasTask = status === 'training' || status === 'needs-spot';

      this.roster.push({
        rosterId,
        definitionId: entry.definitionId,
        bodyTraits: {
          chest: clamp(entry.bodyTraits.chest, 0.1, 2.6),
          wings: clamp(entry.bodyTraits.wings, 0.1, 2.6),
          glutes: clamp(entry.bodyTraits.glutes, 0.1, 2.6),
          thighs: clamp(entry.bodyTraits.thighs, 0.1, 2.6),
          calfs: clamp(entry.bodyTraits.calfs, 0.1, 2.6)
        },
        displayName: entry.displayName,
        capturedAt,
        level,
        xp,
        strength,
        endurance,
        focus,
        energy,
        status,
        taskLabel: hasTask ? entry.taskLabel : undefined,
        taskStationId: hasTask ? entry.taskStationId : undefined,
        taskOutcome: hasTask ? entry.taskOutcome : undefined,
        taskTimer: hasTask ? clamp(entry.taskTimer, 0, TRAINING_DURATION) : 0,
        taskDuration: hasTask ? clamp(entry.taskDuration, 0, TRAINING_DURATION) : 0
      });

      rosterById.add(rosterId);
      if (rosterId >= nextRosterIdFromSave) {
        nextRosterIdFromSave = rosterId + 1;
      }
    }

    nextBuddyId = Math.max(1, toNonNegativeInteger(save.nextIds.nextBuddyId, 1));
    nextBossId = Math.max(1, toNonNegativeInteger(save.nextIds.nextBossId, 1));
    nextFreeWeightId = Math.max(1, toNonNegativeInteger(save.nextIds.nextFreeWeightId, 1));
    nextRosterId = Math.max(1, nextRosterIdFromSave, Math.max(1, ...Array.from(rosterById)));
    if (rosterById.size === 0) {
      nextRosterId = 1;
    }
    const highestRosterId = this.roster.reduce((max, entry) => Math.max(max, entry.rosterId), 0);
    nextRosterId = Math.max(nextRosterId, highestRosterId + 1);

    for (const pickup of FREE_WEIGHT_PICKUPS) {
      this.freeWeights.push(this.createFreeWeight(pickup));
    }

    this.goalState = {
      ...createDefaultGoalState(),
      ...save.goals
    };

    for (let index = 0; index < ACTIVE_BUDDIES; index += 1) {
      const buddy = this.createBuddy();

      if (index === 0) {
        buddy.definitionId = 'flex-fox';
        buddy.position = { x: 0, z: 2.45 };
        buddy.wanderHeading = Math.PI;
        buddy.holdTimer = 4.5;
      }

      this.buddies.push(buddy);
    }

    const savedProgressTotal = clamp(save.capturedTotal, 0, 9999);
    this.player.capturedTotal = Math.max(this.player.capturedTotal, savedProgressTotal);
    this.syncGoalStateFromLoadedProgress();
  }

  private getProgressionTier(): number {
    return Math.floor(this.player.capturedTotal / 12);
  }

  private getRosterDisplayName(rosterEntry: BuddyRosterEntry): string {
    return rosterEntry.displayName ?? getBuddyDefinition(rosterEntry.definitionId).name;
  }

  private updatePlayer(dt: number, actions: ActionState): void {
    const inputMagnitude = Math.min(1, Math.hypot(actions.moveX, actions.moveZ));
    const moving = inputMagnitude > 0.01;
    const canSprint = actions.sprintHeld && this.player.stamina > 5 && moving;
    const speed = canSprint ? SPRINT_SPEED : WALK_SPEED;
    const targetVelocity = {
      x: moving ? actions.moveX * speed : 0,
      z: moving ? actions.moveZ * speed : 0
    };
    const acceleration = moving ? PLAYER_ACCELERATION : PLAYER_DECELERATION;

    this.player.velocity.x = approach(
      this.player.velocity.x,
      targetVelocity.x,
      acceleration * dt
    );
    this.player.velocity.z = approach(
      this.player.velocity.z,
      targetVelocity.z,
      acceleration * dt
    );

    const currentSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);

    if (currentSpeed > 0.02) {
      const targetHeading = Math.atan2(this.player.velocity.x, this.player.velocity.z);
      const turnSpeed = actions.isTouchInput ? PLAYER_TURN_SPEED_TOUCH : PLAYER_TURN_SPEED;
      this.player.heading = rotateToward(this.player.heading, targetHeading, turnSpeed * dt);
      this.player.position.x += this.player.velocity.x * dt;
      this.player.position.z += this.player.velocity.z * dt;
    } else {
      this.player.velocity.x = 0;
      this.player.velocity.z = 0;
    }

    if (moving) {
      this.player.stamina = clamp(
        this.player.stamina - (canSprint ? 24 : 7) * inputMagnitude * dt,
        0,
        MAX_STAMINA
      );
    } else {
      this.player.stamina = clamp(this.player.stamina + 18 * dt, 0, MAX_STAMINA);
    }

    const radius = Math.hypot(this.player.position.x, this.player.position.z);

    if (radius > ARENA_RADIUS - 1.25) {
      const scale = (ARENA_RADIUS - 1.25) / radius;
      this.player.position.x *= scale;
      this.player.position.z *= scale;
      const normal = {
        x: this.player.position.x / (ARENA_RADIUS - 1.25),
        z: this.player.position.z / (ARENA_RADIUS - 1.25)
      };
      const outwardVelocity =
        this.player.velocity.x * normal.x + this.player.velocity.z * normal.z;

      if (outwardVelocity > 0) {
        this.player.velocity.x -= normal.x * outwardVelocity;
        this.player.velocity.z -= normal.z * outwardVelocity;
      }
    }
  }

  private updateFreeWeights(dt: number): void {
    const carried = this.getCarriedFreeWeight();

    for (const freeWeight of this.freeWeights) {
      freeWeight.pickupCooldown = Math.max(0, freeWeight.pickupCooldown - dt);

      if (freeWeight.status === 'carried') {
        if (freeWeight !== carried) {
          this.landFreeWeight(freeWeight);
          continue;
        }

        const direction = headingVector(this.player.heading);
        freeWeight.position = {
          x: this.player.position.x + direction.x * 0.82,
          z: this.player.position.z + direction.z * 0.82
        };
        freeWeight.velocity = { x: 0, z: 0 };
        freeWeight.spin = this.player.heading;
        continue;
      }

      if (freeWeight.status !== 'thrown') {
        continue;
      }

      freeWeight.flightTimer = Math.max(0, freeWeight.flightTimer - dt);
      freeWeight.position.x += freeWeight.velocity.x * dt;
      freeWeight.position.z += freeWeight.velocity.z * dt;
      freeWeight.spin += dt * 12;

      if (this.tryResolveFreeWeightHit(freeWeight)) {
        continue;
      }

      const radius = Math.hypot(freeWeight.position.x, freeWeight.position.z);

      if (freeWeight.flightTimer <= 0 || radius > ARENA_RADIUS - 1.2) {
        if (radius > ARENA_RADIUS - 1.2) {
          const scale = (ARENA_RADIUS - 1.2) / radius;
          freeWeight.position.x *= scale;
          freeWeight.position.z *= scale;
        }

        this.landFreeWeight(freeWeight);
      }
    }
  }

  private updateBuddies(dt: number): void {
    for (let index = 0; index < this.buddies.length; index += 1) {
      const buddy = this.buddies[index];

      buddy.ragdollTimer = Math.max(0, buddy.ragdollTimer - dt);

      if (buddy.captured) {
        buddy.respawnTimer -= dt;

        if (buddy.respawnTimer <= 0) {
          this.buddies[index] = this.createBuddy();
          this.events.push({
            type: 'spawn',
            buddy: { ...this.buddies[index], position: copyVec2(this.buddies[index].position) },
            message: `${getBuddyDefinition(this.buddies[index].definitionId).name} entered Mega Gym.`
          });
        }

        continue;
      }

      if (buddy.ragdollTimer > 0) {
        continue;
      }

      if (buddy.holdTimer > 0) {
        buddy.holdTimer -= dt;
        continue;
      }

      buddy.wanderTimer -= dt;
      buddy.dodgeTimer = Math.max(0, buddy.dodgeTimer - dt);

      if (buddy.wanderTimer <= 0) {
        buddy.wanderHeading += (Math.random() - 0.5) * 1.7;
        buddy.wanderTimer = 1 + Math.random() * 2.3;
      }

      const fromPlayer = {
        x: buddy.position.x - this.player.position.x,
        z: buddy.position.z - this.player.position.z
      };
      const playerDistance = Math.max(0.001, Math.hypot(fromPlayer.x, fromPlayer.z));

      if (playerDistance < 2.1 && buddy.dodgeTimer <= 0) {
        buddy.wanderHeading = Math.atan2(fromPlayer.x, fromPlayer.z);
        buddy.dodgeTimer = 0.55;
      }

      const direction = headingVector(buddy.wanderHeading);
      const speed = buddy.dodgeTimer > 0 ? BUDDY_DODGE_SPEED : BUDDY_WANDER_SPEED;
      buddy.position.x += direction.x * speed * dt;
      buddy.position.z += direction.z * speed * dt;
      buddy.heading = buddy.wanderHeading;

      const radius = Math.hypot(buddy.position.x, buddy.position.z);

      if (radius > ARENA_RADIUS - 2.2) {
        const scale = (ARENA_RADIUS - 2.2) / radius;
        buddy.position.x *= scale;
        buddy.position.z *= scale;
        buddy.wanderHeading += Math.PI + (Math.random() - 0.5) * 0.7;
      }
    }
  }

  private rechargeProteinShakers(dt: number): void {
    if (this.player.proteinShakers >= MAX_PROTEIN_SHAKERS) {
      this.shakerRechargeTimer = 0;
      return;
    }

    this.shakerRechargeTimer += dt;

    if (this.shakerRechargeTimer > 5.5) {
      this.player.proteinShakers += 1;
      this.shakerRechargeTimer = 0;
    }
  }

  private updateVending(dt: number): void {
    this.vendingSnackCooldown = Math.max(0, this.vendingSnackCooldown - dt);
  }

  private updateRoster(dt: number): void {
    for (const buddy of this.roster) {
      if (buddy.status === 'ready') {
        buddy.energy = clamp(buddy.energy + 4 * dt, 0, 100);
        continue;
      }

      buddy.taskTimer = Math.max(0, buddy.taskTimer - dt);

      if (buddy.taskTimer > 0) {
      if (
        buddy.status === 'training' &&
        buddy.taskOutcome === 'needs-spot' &&
        buddy.taskTimer <= TRAINING_SPOT_WINDOW
      ) {
        buddy.status = 'needs-spot';
        this.events.push({
          type: 'roster',
          message: `${this.getRosterDisplayName(buddy)} needs a spot on ${buddy.taskLabel}.`
        });
      }

        continue;
      }

      const definition = getBuddyDefinition(buddy.definitionId);

      if (buddy.status === 'training' && buddy.taskOutcome === 'success') {
        this.applyTrainingResult(buddy, definition.archetype);
        this.events.push({
          type: 'roster',
          message: `${this.getRosterDisplayName(buddy)} finished ${buddy.taskLabel}. Stats improved.`
        });
      } else if (buddy.status === 'needs-spot') {
        buddy.energy = clamp(buddy.energy - 10, 0, 100);
        this.events.push({
          type: 'roster',
          message: `${this.getRosterDisplayName(buddy)} missed ${buddy.taskLabel}. Spot them sooner next time.`
        });
      }

      this.finishRosterTask(buddy);
    }
  }

  private updateBoss(dt: number): void {
    if (this.activeBoss) {
      this.activeBoss.timer -= dt;
      this.activeBoss.ragdollTimer = Math.max(0, this.activeBoss.ragdollTimer - dt);

      if (this.activeBoss.timer <= 0) {
        this.events.push({
          type: 'boss',
          boss: this.copyBoss(this.activeBoss),
          message: `${this.activeBoss.name} left the gym.`
        });
        this.activeBoss = undefined;
        this.bossSpawnTimer = 38 + Math.random() * 26;
      }

      return;
    }

    this.bossSpawnTimer -= dt;

    if (this.bossSpawnTimer <= 0) {
      this.spawnBoss();
    }
  }

  private tryCapture(): void {
    const start = copyVec2(this.player.position);

    if (this.catchCooldown > 0) {
      return;
    }
    if (this.captureCutsceneTimer > 0) {
      return;
    }

    this.catchCooldown = 0.6;

    if (this.roster.length >= MAX_ROSTER_SIZE) {
      this.events.push({
        type: 'capture',
        result: 'empty',
        captureStyle: 'arm-wrestle',
        start,
        message: `Crew is full (${MAX_ROSTER_SIZE}/${MAX_ROSTER_SIZE}). Remove a buddy to make room.`
      });
      return;
    }

    const nearest = this.getNearestBuddy();

    if (!nearest || nearest.distance > CAPTURE_RANGE) {
      const direction = headingVector(this.player.heading);

      this.events.push({
        type: 'capture',
        result: 'too-far',
        captureStyle: 'arm-wrestle',
        start,
        target: {
          x: start.x + direction.x * CAPTURE_RANGE,
          z: start.z + direction.z * CAPTURE_RANGE
        },
        message: 'No gym buddy in range.'
      });
      return;
    }

    const buddy = nearest.buddy;
    const definition = getBuddyDefinition(buddy.definitionId);
    const bodyTraits = { ...buddy.bodyTraits };
    const buddyDisplayName = buddy.displayName ?? definition.name;
    const chance = getArmWrestleCatchChance(buddy, definition);
    const success = Math.random() < chance;
    const usePersonalityCue = Math.random() < 0.4;
    const victoryReaction = usePersonalityCue
      ? ` ${definition.reactionLines.victory}`
      : '';
    const missReaction = usePersonalityCue
      ? ` ${definition.reactionLines.cry}`
      : '';
    const creatureFacing = Math.atan2(this.player.position.x - buddy.position.x, this.player.position.z - buddy.position.z);
    const captureBeatSequence = [
      { at: 0.06, text: 'Arm wrestle!' },
      { at: 0.56, text: "It's close..." },
      { at: 1.14, text: success ? 'You pinned it!' : 'It powered out!' }
    ];

    if (success) {
      buddy.captured = true;
      buddy.respawnTimer = 1.45;
      this.player.capturedTotal += 1;
      this.roster.push(this.createRosterEntry(definition.id, bodyTraits, buddyDisplayName, buddy.level));
      this.player.stamina = clamp(this.player.stamina + definition.staminaReward, 0, MAX_STAMINA);
      this.captured.set(definition.id, (this.captured.get(definition.id) ?? 0) + 1);
      const previousHigh = this.capturedHighLevel.get(definition.id) ?? 0;
      if (buddy.level > previousHigh) {
        this.capturedHighLevel.set(definition.id, buddy.level);
      }
      this.evaluateCaptureGoals(definition);
      this.captureCutsceneTimer = ARM_WRESTLE_CAPTURE_DURATION;
    } else {
      const away = {
        x: buddy.position.x - this.player.position.x,
        z: buddy.position.z - this.player.position.z
      };
      buddy.wanderHeading = Math.atan2(away.x, away.z);
      buddy.dodgeTimer = 1.15;
      this.player.stamina = clamp(this.player.stamina - 8, 0, MAX_STAMINA);
      this.captureCutsceneTimer = ARM_WRESTLE_CAPTURE_DURATION;
    }

    this.events.push({
      type: 'capture',
      result: success ? 'success' : 'miss',
      captureStyle: 'arm-wrestle',
      buddy: { ...buddy, position: copyVec2(buddy.position) },
      chance,
      start,
      target: copyVec2(buddy.position),
      capturePose: {
        player: {
          position: start,
          heading: this.player.heading
        },
        creature: {
          position: copyVec2(buddy.position),
          heading: creatureFacing
        }
      },
      dramaticBeat: {
        beat: success ? 'lockout' : 'grapple',
        winner: success ? 'player' : 'creature',
        caption: success
          ? (usePersonalityCue
            ? definition.reactionLines.victory
            : `${buddyDisplayName} hits the mat first.`)
          : (usePersonalityCue
            ? definition.reactionLines.cry
            : `${buddyDisplayName} powered out and escaped.`)
      },
      captureBeatSequence,
      captureDuration: ARM_WRESTLE_CAPTURE_DURATION,
      message: success
        ? `${buddyDisplayName} lost the arm-wrestle hold and joined your crew (${this.roster.length}/${MAX_ROSTER_SIZE}).${victoryReaction}`
        : `${buddyDisplayName} powered out and escaped.${missReaction}`
    });
  }

  private throwHeldFreeWeight(): boolean {
    const freeWeight = this.getCarriedFreeWeight();

    if (!freeWeight) {
      return false;
    }

    const direction = headingVector(this.player.heading);
    freeWeight.status = 'thrown';
    freeWeight.position = {
      x: this.player.position.x + direction.x * 1.05,
      z: this.player.position.z + direction.z * 1.05
    };
    freeWeight.velocity = {
      x: direction.x * FREE_WEIGHT_THROW_SPEED,
      z: direction.z * FREE_WEIGHT_THROW_SPEED
    };
    freeWeight.flightTimer = FREE_WEIGHT_THROW_DURATION;
    freeWeight.pickupCooldown = FREE_WEIGHT_PICKUP_COOLDOWN;
    freeWeight.spin = this.player.heading;
    this.carriedFreeWeightId = undefined;
    this.events.push({
      type: 'free-weight',
      freeWeight: this.copyFreeWeight(freeWeight),
      message: `${freeWeight.name} thrown.`
    });
    return true;
  }

  private tryResolveFreeWeightHit(freeWeight: FreeWeightState): boolean {
    for (const buddy of this.buddies) {
      if (buddy.captured || buddy.ragdollTimer > 0) {
        continue;
      }

      if (distance(freeWeight.position, buddy.position) > FREE_WEIGHT_HIT_RADIUS) {
        continue;
      }

      const definition = getBuddyDefinition(buddy.definitionId);
      buddy.ragdollTimer = BUDDY_RAGDOLL_DURATION;
      buddy.holdTimer = 0;
      buddy.dodgeTimer = 0;
      buddy.wanderHeading = Math.atan2(
        buddy.position.x - this.player.position.x,
        buddy.position.z - this.player.position.z
      );
      this.landFreeWeight(freeWeight);
      this.events.push({
        type: 'free-weight',
        freeWeight: this.copyFreeWeight(freeWeight),
        message: `${definition.name} got clipped by a dumbbell and shook it off.`
      });
      return true;
    }

    if (
      this.activeBoss &&
      this.activeBoss.ragdollTimer <= 0 &&
      distance(freeWeight.position, this.activeBoss.position) <= BOSS_FREE_WEIGHT_HIT_RADIUS
    ) {
      this.activeBoss.ragdollTimer = BOSS_RAGDOLL_DURATION;
      this.landFreeWeight(freeWeight);
      this.events.push({
        type: 'free-weight',
        freeWeight: this.copyFreeWeight(freeWeight),
        message: `${this.activeBoss.name} got knocked off balance by a free weight.`
      });
      return true;
    }

    return false;
  }

  private landFreeWeight(freeWeight: FreeWeightState): void {
    freeWeight.status = 'ground';
    freeWeight.velocity = { x: 0, z: 0 };
    freeWeight.flightTimer = 0;
    freeWeight.pickupCooldown = FREE_WEIGHT_PICKUP_COOLDOWN;

    if (this.carriedFreeWeightId === freeWeight.id) {
      this.carriedFreeWeightId = undefined;
    }
  }

  private grantSteroids(amount: number): number {
    const requested = Math.max(0, Math.floor(amount));
    if (requested <= 0) {
      return 0;
    }

    const previous = this.player.steroids;
    this.player.steroids = clamp(previous + requested, 0, MAX_STEROIDS);
    return this.player.steroids - previous;
  }

  private createRosterEntry(
    definitionId: string,
    bodyTraits: BuddyBodyTraits,
    displayName?: string,
    level = 1
  ): BuddyRosterEntry {
    const definition = getBuddyDefinition(definitionId);
    const base = this.getBaseStats(definition.archetype);

    return {
      rosterId: nextRosterId++,
      definitionId,
      bodyTraits: { ...bodyTraits },
      displayName: displayName ?? getRandomBuddyName(definitionId),
      capturedAt: Date.now(),
      level,
      xp: 0,
      strength: base.strength,
      endurance: base.endurance,
      focus: base.focus,
      energy: 100,
      status: 'ready',
      taskTimer: 0,
      taskDuration: 0
    };
  }

  private finishRosterTask(buddy: BuddyRosterEntry): void {
    buddy.status = 'ready';
    buddy.taskLabel = undefined;
    buddy.taskStationId = undefined;
    buddy.taskOutcome = undefined;
    buddy.taskTimer = 0;
    buddy.taskDuration = 0;
  }

  private getRandomWorkoutStation(): WorkoutStation {
    return WORKOUT_STATIONS[Math.floor(Math.random() * WORKOUT_STATIONS.length)];
  }

  private getCarriedFreeWeight(): FreeWeightState | undefined {
    if (this.carriedFreeWeightId === undefined) {
      return undefined;
    }

    return this.freeWeights.find((freeWeight) => freeWeight.id === this.carriedFreeWeightId);
  }

  private getNearestFreeWeight(): { freeWeight: FreeWeightState; distance: number } | undefined {
    let nearest: { freeWeight: FreeWeightState; distance: number } | undefined;

    for (const freeWeight of this.freeWeights) {
      if (freeWeight.status !== 'ground' || freeWeight.pickupCooldown > 0) {
        continue;
      }

      const freeWeightDistance = distance(this.player.position, freeWeight.position);

      if (freeWeightDistance > FREE_WEIGHT_PICKUP_RANGE) {
        continue;
      }

      if (!nearest || freeWeightDistance < nearest.distance) {
        nearest = { freeWeight, distance: freeWeightDistance };
      }
    }

    return nearest;
  }

  private createFreeWeight(pickup: { id: string; name: string; position: Vec2 }): FreeWeightState {
    return {
      id: nextFreeWeightId++,
      pickupId: pickup.id,
      name: pickup.name,
      status: 'ground',
      position: copyVec2(pickup.position),
      spawnPosition: copyVec2(pickup.position),
      velocity: { x: 0, z: 0 },
      flightTimer: 0,
      pickupCooldown: 0,
      spin: Math.random() * Math.PI * 2
    };
  }

  private copyFreeWeight(freeWeight: FreeWeightState): FreeWeightState {
    return {
      ...freeWeight,
      position: copyVec2(freeWeight.position),
      spawnPosition: copyVec2(freeWeight.spawnPosition),
      velocity: copyVec2(freeWeight.velocity)
    };
  }

  private getBaseStats(archetype: BuddyArchetype): Pick<BuddyRosterEntry, 'strength' | 'endurance' | 'focus'> {
    if (archetype === 'runner') {
      return { strength: 4, endurance: 8, focus: 4 };
    }

    if (archetype === 'lifter') {
      return { strength: 9, endurance: 5, focus: 4 };
    }

    if (archetype === 'spinner') {
      return { strength: 5, endurance: 7, focus: 5 };
    }

    if (archetype === 'climber') {
      return { strength: 7, endurance: 5, focus: 7 };
    }

    return { strength: 3, endurance: 5, focus: 8 };
  }

  private applyTrainingResult(
    buddy: BuddyRosterEntry,
    archetype: BuddyArchetype,
    rewardMultiplier = 1
  ): void {
    if (archetype === 'runner' || archetype === 'spinner') {
      buddy.endurance += 2;
      buddy.focus += 1;
    } else if (archetype === 'lifter' || archetype === 'climber') {
      buddy.strength += 2;
      buddy.endurance += 1;
    } else {
      buddy.focus += 2;
      buddy.endurance += 1;
    }

    const baseXp = 30 * rewardMultiplier;
    this.addRosterXp(buddy, Math.round(baseXp));
  }

  private addRosterXp(buddy: BuddyRosterEntry, amount: number): void {
    buddy.xp += amount;
    const required = buddy.level * 55;

    if (buddy.xp >= required) {
      buddy.xp -= required;
      buddy.level += 1;
      buddy.strength += 1;
      buddy.endurance += 1;
      buddy.focus += 1;
      buddy.energy = clamp(buddy.energy + 18, 0, 100);
      this.evaluateCrewLevelGoal();
    }
  }

  private getCrewPower(): number {
    return this.roster.reduce((total, buddy) => {
      const energyScale = 0.65 + buddy.energy / 285;
      return total + (buddy.strength + buddy.endurance + buddy.focus + buddy.level * 2) * energyScale;
    }, this.player.stamina / 8);
  }

  private spawnBoss(): void {
    const definition = getBossDefinition(randomBossDefinitionId());
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.75;
    this.activeBoss = {
      id: nextBossId++,
      definitionId: definition.id,
      name: definition.name,
      position: {
        x: Math.cos(angle) * (ARENA_RADIUS - 3),
        z: Math.sin(angle) * (ARENA_RADIUS - 3)
      },
      strength: definition.strength,
      endurance: definition.endurance,
      focus: definition.focus,
      timer: BOSS_ACTIVE_DURATION,
      ragdollTimer: 0
    };
    this.events.push({
      type: 'boss',
      boss: this.copyBoss(this.activeBoss),
      message: `${definition.name} entered Mega Gym and wants a challenge.`
    });
  }

  private copyBoss(boss: BossState): BossState {
    return {
      ...boss,
      position: copyVec2(boss.position)
    };
  }

  private getNearestBuddy(): { buddy: BuddyState; distance: number } | undefined {
    let nearest: { buddy: BuddyState; distance: number } | undefined;

    for (const buddy of this.buddies) {
      if (buddy.captured) {
        continue;
      }

      const buddyDistance = distance(this.player.position, buddy.position);

      if (!nearest || buddyDistance < nearest.distance) {
        nearest = { buddy, distance: buddyDistance };
      }
    }

    return nearest;
  }

  private createBuddy(): BuddyState {
    let position = randomPoint();
    const spawnProgress = this.getWildSpawnProgress();
    const definitionId = weightedBuddyDefinitionId(spawnProgress);
    const definition = getBuddyDefinition(definitionId);

    for (let attempts = 0; attempts < 8; attempts += 1) {
      if (distance(position, this.player.position) > 5) {
        break;
      }

      position = randomPoint();
    }

    return {
      id: nextBuddyId++,
      definitionId,
      bodyTraits: generateBuddyBodyTraits(definition.archetype),
      displayName: getRandomBuddyName(definitionId),
      level: this.getWildBuddyLevel(spawnProgress),
      position,
      heading: randomHeading(),
      wanderHeading: randomHeading(),
      wanderTimer: Math.random() * 2,
      captured: false,
      respawnTimer: 0,
      dodgeTimer: 0,
      holdTimer: 0,
      ragdollTimer: 0
    };
  }

  private getWildSpawnProgress(): number {
    const capturedProgress = clamp(this.player.capturedTotal / 45, 0, 1);
    const crewAverage = this.getCrewAverageLevel();
    const crewProgress = clamp(crewAverage / 40, 0, 1);
    const goalAdjustedProgress = this.isGoalCompleted('capture_6')
      ? 1
      : 0.6;

    return clamp(
      capturedProgress * 0.68 * goalAdjustedProgress + crewProgress * 0.32 * goalAdjustedProgress,
      0,
      1
    );
  }

  private getCrewAverageLevel(): number {
    if (this.roster.length === 0) {
      return 0;
    }

    return (
      this.roster.reduce((total, entry) => total + entry.level, 0) / this.roster.length
    );
  }

  private getWildBuddyLevel(spawnProgress: number): number {
    const earlyUnlocked = this.isGoalCompleted('capture_6');
    const midUnlocked = this.isGoalCompleted('capture_10');
    const progression = clamp(spawnProgress, 0, 1);
    const normalLowWeight = 14 - progression * 12;
    const level16to25Weight = earlyUnlocked ? 0.7 + progression * 4.9 : 0.15;
    const level26to35Weight = midUnlocked ? 0.15 + progression * 2.65 : 0;
    const level36PlusWeight = midUnlocked ? 0.03 + progression * 1.15 : 0;
    const total = normalLowWeight + level16to25Weight + level26to35Weight + level36PlusWeight;
    const roll = Math.random() * total;
    const normalizedLow = normalLowWeight;
    const normalizedMid = normalizedLow + level16to25Weight;
    const normalizedHigh = normalizedMid + level26to35Weight;

    if (roll < normalizedLow) {
      return pickWildLevelInRange(1, 15, progression);
    }

    if (roll < normalizedMid) {
      return pickWildLevelInRange(16, 25, progression);
    }

    if (roll < normalizedHigh) {
      return pickWildLevelInRange(26, 35, progression);
    }

    return pickWildLevelInRange(36, 50, progression);
  }
}
