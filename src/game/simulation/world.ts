import { BUDDY_DEFINITIONS, getBuddyDefinition, getRandomBuddyName } from '../content/buddies';
import { BOSS_DEFINITIONS, getBossDefinition } from '../content/bosses';
import { ACTIVE_QUEST_LIMIT, QUEST_DEFINITIONS } from '../content/quests';
import {
  ACTIVE_CREW_LIMIT,
  BASE_ROSTER_STATS_BY_ARCHETYPE,
  BOSS_BALANCE,
  BUDDY_AI_BALANCE,
  BUDDY_BODY_TRAIT_RANGES,
  BUDDY_TRAIT_BIAS,
  CAPTURE_BALANCE,
  CREATURE_BEHAVIOR_BALANCE,
  DEBUG_BALANCE,
  FREE_WEIGHT_BALANCE,
  GOAL_CREW_XP_REWARDS,
  GOAL_MESSAGES,
  GOAL_STEROID_REWARDS,
  LEVEL_UP_BALANCE,
  PASSIVE_TOTAL_LIMITS,
  PLAYER_MOVEMENT_BALANCE,
  PROTEIN_SHAKER_BALANCE,
  ROSTER_TRAINING_BALANCE,
  STAMINA_BALANCE,
  STEROID_BALANCE,
  WILD_SPAWN_BALANCE,
  WORLD_BALANCE,
  XP_REWARDS,
  getArmWrestleCatchChance,
  getBuddyXpForNextLevel,
  getGoalTargets,
  getWeightedSpawnTableForProgress,
  getWildExoticSpawnChance,
  type WeightedBuddyOption
} from '../content/balance';
import { FREE_WEIGHT_PICKUPS, WORKOUT_STATIONS } from '../content/equipment';
import { getCurrentGymEvent } from '../content/gymEvents';
import { DEFAULT_PLAYER_APPEARANCE } from '../content/playerAppearance';
import { VENDING_MACHINES } from '../content/vending';
import { getGymZoneAt, getRandomGymSpawnZone, randomPointInZone } from '../content/zones';
import type {
  ActionState,
  BossBattleRound,
  BossBattleState,
  BossState,
  BuddyArchetype,
  ProgressGoalId,
  ProgressGoalState,
  QuestId,
  QuestStates,
  BuddyBodyTraits,
  BuddyDefinition,
  GymZoneDefinition,
  BuddyRosterEntry,
  PlayerState,
  ProgressGoals,
  BuddyState,
  FreeWeightState,
  RepDexEntry,
  Vec2,
  WorkoutStation,
  WorkoutType,
  WorldEvent,
  WorldSnapshot
} from '../types';
import {
  type SavedProgress,
  type SavedProgressRosterEntry,
  SAVE_DATA_VERSION
} from '../progress';

export { getArmWrestleCatchChance, getBuddyXpForNextLevel } from '../content/balance';

const ARENA_RADIUS = WORLD_BALANCE.arenaRadius;
const PLAYFIELD_HALF_WIDTH = Math.min(16.2, ARENA_RADIUS * 0.78);
const PLAYFIELD_BACK_Z = -Math.min(17.2, ARENA_RADIUS * 0.82);
const PLAYFIELD_FRONT_Z = Math.min(17.2, ARENA_RADIUS * 0.82);
const CAPTURE_RANGE = CAPTURE_BALANCE.range;
const MAX_STAMINA = STAMINA_BALANCE.max;
const ARM_WRESTLE_CAPTURE_DURATION = CAPTURE_BALANCE.armWrestleDurationSeconds;
const MAX_PROTEIN_SHAKERS = PROTEIN_SHAKER_BALANCE.max;
const STARTING_PROTEIN_SHAKERS = PROTEIN_SHAKER_BALANCE.starting;
const MAX_STEROIDS = STEROID_BALANCE.max;
const STARTING_STEROIDS = STEROID_BALANCE.starting;
const STEROID_LEVEL_CAP = STEROID_BALANCE.levelCap;
const ACTIVE_BUDDIES = WILD_SPAWN_BALANCE.activeBuddyCount;
const MAX_ROSTER_SIZE = ACTIVE_CREW_LIMIT;
const WALK_SPEED = PLAYER_MOVEMENT_BALANCE.walkSpeed;
const SPRINT_SPEED = PLAYER_MOVEMENT_BALANCE.sprintSpeed;
const PLAYER_ACCELERATION = PLAYER_MOVEMENT_BALANCE.acceleration;
const PLAYER_DECELERATION = PLAYER_MOVEMENT_BALANCE.deceleration;
const PLAYER_TURN_SPEED = PLAYER_MOVEMENT_BALANCE.turnSpeed;
const PLAYER_TURN_SPEED_TOUCH = PLAYER_MOVEMENT_BALANCE.touchTurnSpeed;
const BUDDY_WANDER_SPEED = BUDDY_AI_BALANCE.wanderSpeed;
const BUDDY_DODGE_SPEED = BUDDY_AI_BALANCE.dodgeSpeed;
const TRAINING_DURATION = ROSTER_TRAINING_BALANCE.durationSeconds;
const TRAINING_SPOT_WINDOW = ROSTER_TRAINING_BALANCE.spotWindowSeconds;
const BOSS_ACTIVE_DURATION = BOSS_BALANCE.activeDurationSeconds;
const BOSS_BATTLE_DURATION = BOSS_BALANCE.battleDurationSeconds;
const BOSS_EXOTIC_BOOST_MAX = BOSS_BALANCE.exoticBoostMax;
const ROSTER_SPOT_RANGE = ROSTER_TRAINING_BALANCE.spotRange;
const FREE_WEIGHT_PICKUP_RANGE = FREE_WEIGHT_BALANCE.pickupRange;
const FREE_WEIGHT_THROW_SPEED = FREE_WEIGHT_BALANCE.throwSpeed;
const FREE_WEIGHT_THROW_DURATION = FREE_WEIGHT_BALANCE.throwDurationSeconds;
const FREE_WEIGHT_HIT_RADIUS = FREE_WEIGHT_BALANCE.hitRadius;
const BOSS_FREE_WEIGHT_HIT_RADIUS = FREE_WEIGHT_BALANCE.bossHitRadius;
const FREE_WEIGHT_PICKUP_COOLDOWN = FREE_WEIGHT_BALANCE.pickupCooldownSeconds;
const BUDDY_RAGDOLL_DURATION = FREE_WEIGHT_BALANCE.buddyRagdollSeconds;
const BOSS_RAGDOLL_DURATION = FREE_WEIGHT_BALANCE.bossRagdollSeconds;
const GOAL_TARGETS = getGoalTargets(BUDDY_DEFINITIONS.length);
const CAPTURE_CREW_XP = XP_REWARDS.captureActiveCrew;
const CAPTURE_NEW_BUDDY_XP = XP_REWARDS.captureNewBuddy;

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
  const scale = clamp(radius / Math.max(1, ARENA_RADIUS - 2), 0.35, 1);
  const halfDepth = ((PLAYFIELD_FRONT_Z - PLAYFIELD_BACK_Z) / 2) * scale;
  const centerZ = (PLAYFIELD_FRONT_Z + PLAYFIELD_BACK_Z) / 2;

  return {
    x: (Math.random() * 2 - 1) * PLAYFIELD_HALF_WIDTH * scale,
    z: centerZ + (Math.random() * 2 - 1) * halfDepth
  };
}

function isPointInsideArena(position: Vec2, margin = 1.2): boolean {
  return (
    Math.abs(position.x) <= PLAYFIELD_HALF_WIDTH - margin &&
    position.z >= PLAYFIELD_BACK_Z + margin &&
    position.z <= PLAYFIELD_FRONT_Z - margin
  );
}

function randomPointForZone(zone: GymZoneDefinition): Vec2 {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const point = randomPointInZone(zone);

    if (isPointInsideArena(point)) {
      return point;
    }
  }

  return randomPoint();
}

function createDefaultGoalState(): ProgressGoals {
  return {
    capture_first: { completed: false, progress: 0 },
    workout_first: { completed: false, progress: 0 },
    workout_3: { completed: false, progress: 0 },
    capture_3: { completed: false, progress: 0 },
    capture_6: { completed: false, progress: 0 },
    capture_10: { completed: false, progress: 0 },
    encounter_exotic: { completed: false, progress: 0 },
    capture_first_exotic: { completed: false, progress: 0 },
    roster_level_5_any: { completed: false, progress: 0 },
    roster_level_10_any: { completed: false, progress: 0 },
    boss_first_win: { completed: false, progress: 0 },
    repdex_quarter: { completed: false, progress: 0 },
    repdex_half: { completed: false, progress: 0 }
  };
}

function createDefaultQuestState(): QuestStates {
  return Object.fromEntries(
    QUEST_DEFINITIONS.map((quest) => [quest.id, { completed: false, progress: 0 }])
  ) as QuestStates;
}

function randomHeading(): number {
  return Math.random() * Math.PI * 2;
}

function randomTrait(range: { min: number; max: number }, bias = 0): number {
  return clamp(Math.random() * (range.max - range.min) + range.min + bias, range.min, range.max);
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

function randomBossDefinitionId(candidates = BOSS_DEFINITIONS.map((definition) => definition.id)): string {
  return candidates[Math.floor(Math.random() * candidates.length)] ?? BOSS_DEFINITIONS[0]!.id;
}

type WorkoutProgressProfile = {
  strength: number;
  endurance: number;
  focus: number;
  xpMultiplier: number;
  tokenBonus: number;
};

function getWorkoutProgressProfile(type: WorkoutType, zoneId: GymZoneDefinition['id']): WorkoutProgressProfile {
  const profile: WorkoutProgressProfile = {
    strength: 1,
    endurance: 1,
    focus: 1,
    xpMultiplier: 1,
    tokenBonus: 0
  };

  if (type === 'bench' || type === 'incline-bench' || type === 'machine-press' || type === 'free-weight-bench') {
    profile.strength += 2;
  } else if (type === 'squat-rack' || type === 'leg-press' || type === 'hack-squat') {
    profile.strength += 2;
    profile.endurance += 1;
  } else if (type === 'cable' || type === 'lat-pulldown') {
    profile.focus += 2;
    profile.strength += 1;
  } else if (type === 'free-weights') {
    profile.strength += 1;
    profile.focus += 1;
  }

  if (zoneId === 'flex-trail') {
    profile.endurance += 1;
    profile.xpMultiplier += 0.08;
  } else if (zoneId === 'heavy-lift-hall') {
    profile.strength += 1;
    profile.tokenBonus += 1;
  } else if (zoneId === 'core-court') {
    profile.focus += 1;
    profile.xpMultiplier += 0.1;
  } else if (zoneId === 'mythic-platform') {
    profile.focus += 1;
    profile.xpMultiplier += 0.16;
    profile.tokenBonus += 1;
  }

  return profile;
}

type ActivePassiveTotals = {
  movementSpeedBonus: number;
  strengthTrainingChance: number;
  steroidBoostChance: number;
  staminaLossReduction: number;
  sprintRecoveryBonus: number;
  bossPowerBonus: number;
};

type SimulatedPlayerState = PlayerState & {
  velocity: Vec2;
};

function pickWeightedBuddyId(options: readonly WeightedBuddyOption[]): string {
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

function weightedBuddyDefinitionId(
  spawnProgress: number,
  exoticBoost = 0,
  zone?: GymZoneDefinition
): string {
  const spawnStage = clamp(spawnProgress, 0, 1);
  const zoneExoticBoost = zone?.exoticSpawnBonus ?? 0;
  const exoticChance = getWildExoticSpawnChance(spawnStage, exoticBoost + zoneExoticBoost);
  const isExotic = Math.random() < exoticChance;

  if (isExotic) {
    return pickWeightedBuddyId(WILD_SPAWN_BALANCE.exoticWeights);
  }

  const progressWeights = getWeightedSpawnTableForProgress(spawnStage);
  const zoneWeights = zone?.spawnWeights ?? [];

  return pickWeightedBuddyId(
    zoneWeights.length > 0 ? [...progressWeights, ...zoneWeights] : progressWeights
  );
}

function pickWildLevelInRange(minLevel: number, maxLevel: number, spawnProgress: number): number {
  const span = Math.max(0, maxLevel - minLevel);
  const skew = clamp(
    WILD_SPAWN_BALANCE.levelSkew.base -
      spawnProgress * WILD_SPAWN_BALANCE.levelSkew.progressPenalty,
    WILD_SPAWN_BALANCE.levelSkew.min,
    WILD_SPAWN_BALANCE.levelSkew.base
  );
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
  private player: SimulatedPlayerState = {
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
  private readonly storage: BuddyRosterEntry[] = [];
  private readonly freeWeights: FreeWeightState[] = [];
  private readonly captured = new Map<string, number>();
  private readonly capturedHighLevel = new Map<string, number>();
  private readonly events: WorldEvent[] = [];
  private goalState: ProgressGoals = createDefaultGoalState();
  private questState: QuestStates = createDefaultQuestState();
  private activeBoss?: BossState;
  private activeBossBattle?: BossBattleState;
  private carriedFreeWeightId?: number;
  private catchCooldown: number = 0;
  private captureCutsceneTimer: number = 0;
  private shakerRechargeTimer: number = 0;
  private vendingSnackCooldown: number = 0;
  private bossSpawnTimer: number = BOSS_BALANCE.initialSpawnDelaySeconds;
  private bossExoticBoost: number = 0;

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
    this.storage.length = 0;
    this.freeWeights.length = 0;
    this.captured.clear();
    this.capturedHighLevel.clear();
    this.goalState = createDefaultGoalState();
    this.questState = createDefaultQuestState();
    this.events.length = 0;
    this.activeBoss = undefined;
    this.activeBossBattle = undefined;
    this.carriedFreeWeightId = undefined;
    this.catchCooldown = 0;
    this.captureCutsceneTimer = 0;
    this.shakerRechargeTimer = 0;
    this.vendingSnackCooldown = 0;
    this.bossSpawnTimer = BOSS_BALANCE.initialSpawnDelaySeconds;
    this.bossExoticBoost = 0;

    for (let index = 0; index < ACTIVE_BUDDIES; index += 1) {
      const buddy = this.createBuddy();

      if (index === 0) {
        buddy.definitionId = 'flex-fox';
        buddy.level = Math.min(buddy.level, 8);
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
    const attemptingCapture = actions.catchPressed && this.captureCutsceneTimer <= 0 && !this.activeBossBattle;

    if (actions.resetPressed) {
      this.reset();
      return;
    }

    this.captureCutsceneTimer = Math.max(0, this.captureCutsceneTimer - dt);
    this.catchCooldown = Math.max(0, this.catchCooldown - dt);
    this.updateBossBattle(dt);
    this.updatePlayer(
      dt,
      this.captureCutsceneTimer > 0 || Boolean(this.activeBossBattle) || attemptingCapture
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
    const zone = getGymZoneAt(this.player.position);
    const profile = getWorkoutProgressProfile(station.type, zone.id);
    const steroidGain = this.grantSteroids(
      Math.random() < STEROID_BALANCE.workoutRewardChance ? 1 : 0
    );
    const xpGain = Math.round(XP_REWARDS.workoutBase * profile.xpMultiplier);
    let xpRecipients = 0;
    for (const buddy of this.roster) {
      buddy.strength += profile.strength;
      buddy.endurance += profile.endurance;
      buddy.focus += profile.focus;
      buddy.energy = clamp(buddy.energy + 4, 0, ROSTER_TRAINING_BALANCE.maxEnergy);
      const levelsGained = this.addRosterXp(buddy, xpGain);
      xpRecipients += 1;
      if (levelsGained > 0) {
        this.events.push({
          type: 'roster',
          rosterId: buddy.rosterId,
          levelUp: true,
          message: `${this.getRosterDisplayName(buddy)} turned workout XP into Lv ${buddy.level}!`
        });
      }
    }
    const tokenReward = station.shakerReward + profile.tokenBonus + (Math.random() < 0.35 ? 1 : 0);
    this.player.stamina = clamp(this.player.stamina + station.staminaReward, 0, MAX_STAMINA);
    this.player.proteinShakers = clamp(
      this.player.proteinShakers + tokenReward,
      0,
      MAX_PROTEIN_SHAKERS
    );
    const steroidText = steroidGain > 0 ? ` +${steroidGain} steroid` : '';
    const xpText = xpRecipients > 0
      ? ` Crew +${xpGain} XP.`
      : ' Catch a creature to turn workouts into crew XP.';
    this.events.push({
      type: 'workout',
      message: `${station.name} complete in ${zone.name}.${xpText} +${station.staminaReward} stamina, +${tokenReward} gym token.${steroidText}`
    });
    this.updateGoalProgress('workout_first', 1);
    this.updateGoalProgress('workout_3', this.goalState.workout_3.progress + 1);
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
        message: `Need ${machine.energyDrinkCost} gym token to buy an energy drink.`
      });
      return;
    }

    const previousStamina = this.player.stamina;
    this.player.proteinShakers -= machine.energyDrinkCost;
    this.player.stamina = clamp(this.player.stamina + machine.energyDrinkStamina, 0, MAX_STAMINA);
    const steroidGain = this.grantSteroids(STEROID_BALANCE.vendingEnergyDrinkReward);
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
      buddy.energy = clamp(buddy.energy + machine.snackCrewEnergy, 0, ROSTER_TRAINING_BALANCE.maxEnergy);
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

    if (buddy.energy < ROSTER_TRAINING_BALANCE.energyCost) {
      this.events.push({
        type: 'roster',
        message: `${buddyName} needs a breather first.`
      });
      return;
    }

    buddy.energy = clamp(
      buddy.energy - ROSTER_TRAINING_BALANCE.energyCost,
      0,
      ROSTER_TRAINING_BALANCE.maxEnergy
    );
    buddy.status = 'training';
    const station = this.getRandomWorkoutStation();
    buddy.taskLabel = station.name;
    buddy.taskStationId = station.id;
    buddy.taskOutcome = Math.random() < ROSTER_TRAINING_BALANCE.successChance ? 'success' : 'needs-spot';
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
    this.player.stamina = clamp(
      this.player.stamina - STAMINA_BALANCE.spotAssistCost,
      0,
      MAX_STAMINA
    );
    const levelsGained = this.applyTrainingResult(buddy, definition.archetype, 0.5);
    this.finishRosterTask(buddy);
    this.events.push({
      type: 'roster',
      rosterId: buddy.rosterId,
      levelUp: levelsGained > 0,
      message: levelsGained > 0
        ? `You spotted ${buddyName}. Half-credit XP pushed them to Lv ${buddy.level}!`
        : `You spotted ${buddyName}. Successful rep: half credit XP gained.`
    });
  }

  removeBuddy(rosterId: number): void {
    const index = this.roster.findIndex((entry) => entry.rosterId === rosterId);

    if (index !== -1) {
      const [removedBuddy] = this.roster.splice(index, 1);
      this.events.push({
        type: 'roster',
        message: `${this.getRosterDisplayName(removedBuddy)} left your active crew.`
      });
      return;
    }

    const storageIndex = this.storage.findIndex((entry) => entry.rosterId === rosterId);

    if (storageIndex === -1) {
      return;
    }

    const [removedBuddy] = this.storage.splice(storageIndex, 1);
    this.events.push({
      type: 'roster',
      message: `${this.getRosterDisplayName(removedBuddy)} left storage.`
    });
  }

  renameBuddy(rosterId: number, displayName?: string): void {
    const buddy = this.findOwnedBuddy(rosterId);

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

  storeBuddy(rosterId: number): void {
    const index = this.roster.findIndex((entry) => entry.rosterId === rosterId);

    if (index === -1) {
      return;
    }

    const buddy = this.roster[index];
    const buddyName = this.getRosterDisplayName(buddy);

    if (buddy.status !== 'ready') {
      this.events.push({
        type: 'roster',
        message: `${buddyName} is busy and cannot move to storage yet.`
      });
      return;
    }

    const [storedBuddy] = this.roster.splice(index, 1);
    this.storage.push(storedBuddy);
    this.events.push({
      type: 'roster',
      rosterId: storedBuddy.rosterId,
      message: `${this.getRosterDisplayName(storedBuddy)} moved to storage. Active passives updated.`
    });
  }

  activateStoredBuddy(rosterId: number): void {
    const index = this.storage.findIndex((entry) => entry.rosterId === rosterId);

    if (index === -1) {
      return;
    }

    if (this.roster.length >= MAX_ROSTER_SIZE) {
      this.events.push({
        type: 'roster',
        rosterId,
        message: `Active crew is full (${MAX_ROSTER_SIZE}/${MAX_ROSTER_SIZE}). Store a buddy first.`
      });
      return;
    }

    const [activatedBuddy] = this.storage.splice(index, 1);
    activatedBuddy.status = 'ready';
    activatedBuddy.taskLabel = undefined;
    activatedBuddy.taskStationId = undefined;
    activatedBuddy.taskOutcome = undefined;
    activatedBuddy.taskTimer = 0;
    activatedBuddy.taskDuration = 0;
    this.roster.push(activatedBuddy);
    this.events.push({
      type: 'roster',
      rosterId: activatedBuddy.rosterId,
      message: `${this.getRosterDisplayName(activatedBuddy)} joined the active crew (${this.roster.length}/${MAX_ROSTER_SIZE}).`
    });
  }

  useSteroid(rosterId: number): void {
    const buddy = this.findOwnedBuddy(rosterId);

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

    const steroidBonus = this.rollPassiveBonus(this.getActivePassiveTotals().steroidBoostChance);
    this.player.steroids = Math.max(0, this.player.steroids - 1);
    this.increaseRosterLevel(buddy, 1 + steroidBonus);
    this.evaluateCrewLevelGoal();
    this.updateQuestProgress('use_steroid_1', 1);
    this.events.push({
      type: 'roster',
      rosterId: buddy.rosterId,
      steroidUsed: true,
      levelUp: true,
      message: steroidBonus > 0
        ? `${name} got unreasonably swole! Passive bonus popped.`
        : `${name} got unreasonably swole!`
    });
  }

  challengeBoss(): void {
    if (!this.activeBoss) {
      return;
    }

    if (this.activeBossBattle) {
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
    this.activeBossBattle = this.createBossBattle(boss);
    boss.ragdollTimer = BOSS_RAGDOLL_DURATION;
    this.events.push({
      type: 'boss',
      boss: this.copyBoss(boss),
      message: `${boss.name} accepted the crew challenge. Battle panel is live.`
    });
  }

  debugAddSteroids(amount = DEBUG_BALANCE.steroidGrantAmount): void {
    const granted = this.grantSteroids(amount);
    this.events.push({
      type: 'roster',
      message:
        granted > 0
          ? `Debug: +${granted} Steroids added.`
          : 'Debug: Steroid inventory is already capped.'
    });
  }

  debugSpawnNormalCreature(): void {
    this.spawnDebugCreature(false);
  }

  debugSpawnExoticCreature(): void {
    this.spawnDebugCreature(true);
  }

  debugGiveActiveCrewXp(amount = DEBUG_BALANCE.activeCrewXpGrant): void {
    const recipients = this.awardActiveCrewXp(amount, 'debug');
    this.events.push({
      type: 'roster',
      message:
        recipients > 0
          ? `Debug: active crew gained ${amount} XP.`
          : 'Debug: catch or activate a creature before granting crew XP.'
    });
  }

  debugForceBossSpawn(): void {
    this.activeBossBattle = undefined;
    this.spawnBoss();
  }

  private isGoalCompleted(goalId: ProgressGoalId): boolean {
    return this.goalState[goalId]?.completed ?? false;
  }

  private getGoalStateSnapshot(): ProgressGoals {
    return {
      capture_first: { ...this.goalState.capture_first },
      workout_first: { ...this.goalState.workout_first },
      workout_3: { ...this.goalState.workout_3 },
      capture_3: { ...this.goalState.capture_3 },
      capture_6: { ...this.goalState.capture_6 },
      capture_10: { ...this.goalState.capture_10 },
      encounter_exotic: { ...this.goalState.encounter_exotic },
      capture_first_exotic: { ...this.goalState.capture_first_exotic },
      roster_level_5_any: { ...this.goalState.roster_level_5_any },
      roster_level_10_any: { ...this.goalState.roster_level_10_any },
      boss_first_win: { ...this.goalState.boss_first_win },
      repdex_quarter: { ...this.goalState.repdex_quarter },
      repdex_half: { ...this.goalState.repdex_half }
    };
  }

  private getQuestStateSnapshot(): QuestStates {
    return QUEST_DEFINITIONS.reduce((out, quest) => {
      const state = this.questState[quest.id] ?? { completed: false, progress: 0 };
      out[quest.id] = { ...state };
      return out;
    }, {} as QuestStates);
  }

  private getActiveQuestSnapshot(): WorldSnapshot['activeQuests'] {
    return QUEST_DEFINITIONS.filter((quest) => !this.questState[quest.id]?.completed)
      .slice(0, ACTIVE_QUEST_LIMIT)
      .map((definition) => ({
        definition,
        state: { ...(this.questState[definition.id] ?? { completed: false, progress: 0 }) }
      }));
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
    const xpReward = GOAL_CREW_XP_REWARDS[goalId] ?? 0;
    const xpRecipients = this.awardActiveCrewXp(xpReward, 'goal');
    const suffix = reward > 0 ? ` +${reward} steroids` : '';
    const xpSuffix = xpRecipients > 0 ? ` Crew +${xpReward} XP.` : '';
    this.events.push({
      type: 'capture',
      result: 'success',
      captureStyle: 'arm-wrestle',
      start: copyVec2(this.player.position),
      message: `${GOAL_MESSAGES[goalId]}${suffix}${xpSuffix}`
    });
  }

  private evaluateCaptureGoals(definition: BuddyDefinition): void {
    this.updateGoalProgress('capture_first', this.player.capturedTotal);
    this.updateGoalProgress('capture_3', this.player.capturedTotal);
    this.updateGoalProgress('capture_6', this.player.capturedTotal);
    this.updateGoalProgress('capture_10', this.player.capturedTotal);
    this.updateGoalProgress('encounter_exotic', definition.rarity === 'exotic' || definition.isExotic ? 1 : 0);
    this.updateGoalProgress('capture_first_exotic', definition.rarity === 'exotic' || definition.isExotic ? 1 : 0);
    this.evaluateRepDexGoal();
  }

  private updateQuestProgress(
    questId: QuestId,
    progress: number,
    grantReward = true
  ): void {
    const definition = QUEST_DEFINITIONS.find((quest) => quest.id === questId);
    if (!definition) {
      return;
    }

    const state = this.questState[questId] ?? { completed: false, progress: 0 };
    if (state.completed) {
      return;
    }

    const nextProgress = Math.max(
      state.progress,
      Math.min(definition.target, Math.floor(progress))
    );
    const completed = nextProgress >= definition.target;
    this.questState[questId] = {
      completed,
      progress: nextProgress
    };

    if (!completed || !grantReward) {
      return;
    }

    const rewardParts: string[] = [];
    if (definition.reward.steroids && definition.reward.steroids > 0) {
      const granted = this.grantSteroids(definition.reward.steroids);
      if (granted > 0) {
        rewardParts.push(`+${granted} Steroids`);
      }
    }

    if (definition.reward.xp && definition.reward.xp > 0) {
      const recipients = this.awardActiveCrewXp(definition.reward.xp, 'quest');
      if (recipients > 0) {
        rewardParts.push(`+${definition.reward.xp} crew XP`);
      }
    }

    if (definition.reward.exoticSpawnBonus && definition.reward.exoticSpawnBonus > 0) {
      this.bossExoticBoost = clamp(
        this.bossExoticBoost + definition.reward.exoticSpawnBonus,
        0,
        BOSS_EXOTIC_BOOST_MAX
      );
      rewardParts.push('exotic spawns boosted');
    }

    this.events.push({
      type: 'roster',
      message: `Quest complete: ${definition.title}.${rewardParts.length > 0 ? ` ${rewardParts.join(', ')}.` : ''}`
    });
  }

  private countCapturedByRarity(rarity: BuddyDefinition['rarity']): number {
    return BUDDY_DEFINITIONS.reduce((total, definition) => {
      if (definition.rarity !== rarity) {
        return total;
      }

      return total + (this.captured.get(definition.id) ?? 0);
    }, 0);
  }

  private evaluateCaptureQuests(definition: BuddyDefinition, level: number): void {
    if (definition.rarity === 'common') {
      this.updateQuestProgress('capture_common_2', this.countCapturedByRarity('common'));
    }

    if (level >= 16) {
      this.updateQuestProgress('capture_level_16', 1);
    }

    if (definition.rarity === 'exotic' || definition.isExotic) {
      this.updateQuestProgress('find_exotic_1', 1);
    }
  }

  private evaluateRepDexGoal(): void {
    const caughtCount = this.captured.size;
    this.updateGoalProgress('repdex_quarter', caughtCount);
    this.updateGoalProgress('repdex_half', caughtCount);
  }

  private evaluateCrewLevelGoal(grantReward = true): void {
    const hasLevelFiveCrew = [...this.roster, ...this.storage].some((buddy) => buddy.level >= 5);
    const hasEliteCrew = [...this.roster, ...this.storage].some((buddy) => buddy.level >= 10);
    this.updateGoalProgress('roster_level_5_any', hasLevelFiveCrew ? 1 : 0, grantReward);
    this.updateGoalProgress('roster_level_10_any', hasEliteCrew ? 1 : 0, grantReward);
    this.updateQuestProgress('level_10', hasEliteCrew ? 1 : 0, grantReward);
  }

  private syncGoalStateFromLoadedProgress(): void {
    this.updateGoalProgress('capture_first', this.player.capturedTotal, false);
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

  private syncQuestStateFromLoadedProgress(): void {
    this.updateQuestProgress('capture_common_2', this.countCapturedByRarity('common'), false);

    const ownedBuddies = [...this.roster, ...this.storage];
    this.updateQuestProgress(
      'capture_level_16',
      ownedBuddies.some((buddy) => buddy.level >= 16) ? 1 : 0,
      false
    );
    this.updateQuestProgress(
      'level_10',
      ownedBuddies.some((buddy) => buddy.level >= 10) ? 1 : 0,
      false
    );

    let exoticCaptured = false;
    for (const [definitionId, count] of this.captured) {
      const definition = getBuddyDefinition(definitionId);
      if (count > 0 && (definition.rarity === 'exotic' || definition.isExotic)) {
        exoticCaptured = true;
        break;
      }
    }
    this.updateQuestProgress('find_exotic_1', exoticCaptured ? 1 : 0, false);
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
      storage: this.storage.map((entry) => ({ ...entry, bodyTraits: { ...entry.bodyTraits } })),
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
      currentEvent: getCurrentGymEvent(),
      currentZone: getGymZoneAt(this.player.position),
      goals: this.getGoalStateSnapshot(),
      activeQuests: this.getActiveQuestSnapshot(),
      activeBoss: this.activeBoss ? this.copyBoss(this.activeBoss) : undefined,
      activeBossBattle: this.activeBossBattle ? this.copyBossBattle(this.activeBossBattle) : undefined,
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
      appearance: DEFAULT_PLAYER_APPEARANCE,
      player: {
        position: copyVec2(this.player.position),
        heading: this.player.heading,
        stamina: this.player.stamina,
        proteinShakers: this.player.proteinShakers,
        steroids: this.player.steroids,
        capturedTotal: this.player.capturedTotal
      },
      goals: this.getGoalStateSnapshot(),
      quests: this.getQuestStateSnapshot(),
      roster: this.roster.map((entry) => ({
        ...entry,
        bodyTraits: { ...entry.bodyTraits },
        taskLabel: entry.taskLabel,
        taskStationId: entry.taskStationId,
        taskOutcome: entry.taskOutcome
      })),
      storage: this.storage.map((entry) => ({
        ...entry,
        status: 'ready',
        bodyTraits: { ...entry.bodyTraits },
        taskLabel: undefined,
        taskStationId: undefined,
        taskOutcome: undefined,
        taskTimer: 0,
        taskDuration: 0
      })),
      repDex: BUDDY_DEFINITIONS.map((definition) => ({
        definitionId: definition.id,
        count: this.captured.get(definition.id) ?? 0,
        highestLevel: this.capturedHighLevel.get(definition.id) ?? 0
      })),
      capturedTotal: this.player.capturedTotal,
      progressionTier: this.getProgressionTier(),
      bossExoticBoost: this.bossExoticBoost,
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
    this.storage.length = 0;
    this.freeWeights.length = 0;
    this.captured.clear();
    this.capturedHighLevel.clear();

    this.activeBoss = undefined;
    this.activeBossBattle = undefined;
    this.carriedFreeWeightId = undefined;
    this.catchCooldown = 0;
    this.captureCutsceneTimer = 0;
    this.shakerRechargeTimer = 0;
    this.vendingSnackCooldown = 0;
    this.bossSpawnTimer = BOSS_BALANCE.initialSpawnDelaySeconds;
    this.bossExoticBoost = clamp(save.bossExoticBoost, 0, BOSS_EXOTIC_BOOST_MAX);

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
    const storageEntries: SavedProgressRosterEntry[] = [
      ...save.roster.slice(MAX_ROSTER_SIZE),
      ...save.storage
    ];
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

    for (const entry of storageEntries) {
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

      this.storage.push({
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
        capturedAt: toNonNegativeInteger(entry.capturedAt ?? Date.now(), Date.now()),
        level: Math.max(1, toNonNegativeInteger(entry.level, 1)),
        xp: toNonNegativeInteger(entry.xp, 0),
        strength: Math.max(1, toNonNegativeInteger(entry.strength, 1)),
        endurance: Math.max(1, toNonNegativeInteger(entry.endurance, 1)),
        focus: Math.max(1, toNonNegativeInteger(entry.focus, 1)),
        energy: clamp(entry.energy, 0, 100),
        status: 'ready',
        taskTimer: 0,
        taskDuration: 0
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
    const highestRosterId = [...this.roster, ...this.storage].reduce((max, entry) => Math.max(max, entry.rosterId), 0);
    nextRosterId = Math.max(nextRosterId, highestRosterId + 1);

    for (const pickup of FREE_WEIGHT_PICKUPS) {
      this.freeWeights.push(this.createFreeWeight(pickup));
    }

    this.goalState = {
      ...createDefaultGoalState(),
      ...save.goals
    };
    this.questState = {
      ...createDefaultQuestState(),
      ...save.quests
    };

    for (let index = 0; index < ACTIVE_BUDDIES; index += 1) {
      const buddy = this.createBuddy();

      if (index === 0) {
        buddy.definitionId = 'flex-fox';
        buddy.level = Math.min(buddy.level, 8);
        buddy.position = { x: 0, z: 2.45 };
        buddy.wanderHeading = Math.PI;
        buddy.holdTimer = 4.5;
      }

      this.buddies.push(buddy);
    }

    const savedProgressTotal = clamp(save.capturedTotal, 0, 9999);
    this.player.capturedTotal = Math.max(this.player.capturedTotal, savedProgressTotal);
    this.syncGoalStateFromLoadedProgress();
    this.syncQuestStateFromLoadedProgress();
  }

  private getProgressionTier(): number {
    return Math.floor(this.player.capturedTotal / 12);
  }

  private findOwnedBuddy(rosterId: number): BuddyRosterEntry | undefined {
    return (
      this.roster.find((entry) => entry.rosterId === rosterId) ??
      this.storage.find((entry) => entry.rosterId === rosterId)
    );
  }

  private getRosterDisplayName(rosterEntry: BuddyRosterEntry): string {
    return rosterEntry.displayName ?? getBuddyDefinition(rosterEntry.definitionId).name;
  }

  private updatePlayer(dt: number, actions: ActionState): void {
    const passives = this.getActivePassiveTotals();
    const inputMagnitude = Math.min(1, Math.hypot(actions.moveX, actions.moveZ));
    const moving = inputMagnitude > 0.01;
    const canSprint = actions.sprintHeld && this.player.stamina > STAMINA_BALANCE.sprintMinimum && moving;
    const speed = (canSprint ? SPRINT_SPEED : WALK_SPEED) * (1 + passives.movementSpeedBonus);
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
        this.player.stamina -
          (canSprint ? STAMINA_BALANCE.sprintDrainPerSecond : STAMINA_BALANCE.walkDrainPerSecond) *
            inputMagnitude *
            dt *
            (1 - passives.staminaLossReduction),
        0,
        MAX_STAMINA
      );
    } else {
      this.player.stamina = clamp(
        this.player.stamina + STAMINA_BALANCE.recoveryPerSecond * (1 + passives.sprintRecoveryBonus) * dt,
        0,
        MAX_STAMINA
      );
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
          this.announceBuddySpawn(this.buddies[index]);
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

      const definition = getBuddyDefinition(buddy.definitionId);
      const isExotic = definition.rarity === 'exotic' || definition.isExotic === true;
      buddy.wanderTimer -= dt;
      buddy.dodgeTimer = Math.max(0, buddy.dodgeTimer - dt);
      buddy.behaviorTimer = Math.max(0, buddy.behaviorTimer - dt);
      buddy.behaviorCooldown = Math.max(0, buddy.behaviorCooldown - dt);

      if (buddy.wanderTimer <= 0) {
        buddy.wanderHeading += (Math.random() - 0.5) * 1.7;
        buddy.wanderTimer = 1 + Math.random() * 2.3;
      }

      const fromPlayer = {
        x: buddy.position.x - this.player.position.x,
        z: buddy.position.z - this.player.position.z
      };
      const playerDistance = Math.max(0.001, Math.hypot(fromPlayer.x, fromPlayer.z));

      if (isExotic && playerDistance < 6) {
        this.updateQuestProgress('find_exotic_1', 1);
      }

      if (
        playerDistance < CREATURE_BEHAVIOR_BALANCE.reactRange &&
        buddy.behavior !== 'react' &&
        buddy.behaviorCooldown <= 0
      ) {
        buddy.behavior = 'react';
        buddy.behaviorTimer = CREATURE_BEHAVIOR_BALANCE.reactDurationSeconds;
        buddy.behaviorCooldown = CREATURE_BEHAVIOR_BALANCE.reactCooldownSeconds;
      } else if (buddy.behaviorTimer <= 0) {
        if (buddy.behavior !== 'wander') {
          buddy.behavior = 'wander';
        }

        const behaviorChance = isExotic
          ? CREATURE_BEHAVIOR_BALANCE.exoticActionChancePerSecond
          : CREATURE_BEHAVIOR_BALANCE.normalActionChancePerSecond;

        if (buddy.behaviorCooldown <= 0 && Math.random() < behaviorChance * dt) {
          buddy.behavior = Math.random() < 0.55 ? 'flex' : 'stretch';
          buddy.behaviorTimer = isExotic
            ? buddy.behavior === 'flex'
              ? CREATURE_BEHAVIOR_BALANCE.exoticFlexDurationSeconds
              : CREATURE_BEHAVIOR_BALANCE.exoticStretchDurationSeconds
            : buddy.behavior === 'flex'
              ? CREATURE_BEHAVIOR_BALANCE.normalFlexDurationSeconds
              : CREATURE_BEHAVIOR_BALANCE.normalStretchDurationSeconds;
          buddy.behaviorCooldown =
            CREATURE_BEHAVIOR_BALANCE.behaviorCooldownMinSeconds +
            Math.random() * CREATURE_BEHAVIOR_BALANCE.behaviorCooldownRandomSeconds;
        }
      }

      if (playerDistance < 2.1 && buddy.dodgeTimer <= 0) {
        buddy.wanderHeading = Math.atan2(fromPlayer.x, fromPlayer.z);
        buddy.dodgeTimer = 0.55;
      }

      const direction = headingVector(buddy.wanderHeading);
      let speed = buddy.dodgeTimer > 0 ? BUDDY_DODGE_SPEED : BUDDY_WANDER_SPEED;

      if (isExotic) {
        speed *= CREATURE_BEHAVIOR_BALANCE.exoticConfidenceMoveMultiplier;
      }

      if (buddy.behavior === 'flex') {
        speed *= isExotic
          ? CREATURE_BEHAVIOR_BALANCE.exoticBehaviorMoveMultiplier
          : CREATURE_BEHAVIOR_BALANCE.normalFlexMoveMultiplier;
      } else if (buddy.behavior === 'stretch') {
        speed *= isExotic
          ? CREATURE_BEHAVIOR_BALANCE.exoticBehaviorMoveMultiplier
          : CREATURE_BEHAVIOR_BALANCE.normalStretchMoveMultiplier;
      } else if (buddy.behavior === 'react') {
        speed *= CREATURE_BEHAVIOR_BALANCE.reactMoveMultiplier;
      }

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

  private updateBossBattle(dt: number): void {
    if (!this.activeBossBattle) {
      return;
    }

    const battle = this.activeBossBattle;
    battle.timer = Math.max(0, battle.timer - dt);
    this.refreshBossBattlePhase(battle);

    if (battle.timer > 0) {
      return;
    }

    if (battle.result === 'success') {
      const grantedSteroids = this.grantSteroids(battle.rewardSteroids);
      this.player.stamina = clamp(this.player.stamina + STAMINA_BALANCE.bossWinReward, 0, MAX_STAMINA);
      this.bossExoticBoost = clamp(
        this.bossExoticBoost + battle.exoticBoostReward,
        0,
        BOSS_EXOTIC_BOOST_MAX
      );

      for (const buddy of this.roster) {
        const levelsGained = this.addRosterXp(buddy, battle.rewardXp);
        if (levelsGained > 0) {
          this.events.push({
            type: 'roster',
            rosterId: buddy.rosterId,
            levelUp: true,
            message: `${this.getRosterDisplayName(buddy)} leveled up to ${buddy.level}!`
          });
        }
        buddy.energy = clamp(buddy.energy - 8, 0, 100);
      }

      this.events.push({
        type: 'boss',
        boss: this.copyBoss(battle.boss),
        message: `${battle.boss.name} got outlifted. +${grantedSteroids} Steroid, +${battle.rewardXp} crew XP, exotic spawns boosted.`
      });
      this.updateGoalProgress('boss_first_win', 1);
      this.updateQuestProgress('win_boss_1', 1);
      this.bossSpawnTimer =
        BOSS_BALANCE.respawnAfterWinBaseSeconds +
        Math.random() * BOSS_BALANCE.respawnAfterWinRandomSeconds;
    } else {
      this.player.stamina = clamp(
        this.player.stamina - this.getPassiveStaminaLoss(battle.staminaCost),
        0,
        MAX_STAMINA
      );

      const lessonXp = Math.max(8, Math.round(battle.rewardXp * 0.35));
      for (const buddy of this.roster) {
        const levelsGained = this.addRosterXp(buddy, lessonXp);
        if (levelsGained > 0) {
          this.events.push({
            type: 'roster',
            rosterId: buddy.rosterId,
            levelUp: true,
            message: `${this.getRosterDisplayName(buddy)} learned from the loss and hit Lv ${buddy.level}!`
          });
        }
        buddy.energy = clamp(buddy.energy - 12, 0, 100);
      }

      this.events.push({
        type: 'boss',
        boss: this.copyBoss(battle.boss),
        message: `${battle.boss.name} won the set. Crew learned anyway: +${lessonXp} XP, stamina took a hit.`
      });
      this.bossSpawnTimer =
        BOSS_BALANCE.respawnAfterLossBaseSeconds +
        Math.random() * BOSS_BALANCE.respawnAfterLossRandomSeconds;
    }

    this.activeBoss = undefined;
    this.activeBossBattle = undefined;
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
        const levelsGained = this.applyTrainingResult(buddy, definition.archetype);
        this.events.push({
          type: 'roster',
          rosterId: buddy.rosterId,
          levelUp: levelsGained > 0,
          message: levelsGained > 0
            ? `${this.getRosterDisplayName(buddy)} finished ${buddy.taskLabel} and leveled up to ${buddy.level}!`
            : `${this.getRosterDisplayName(buddy)} finished ${buddy.taskLabel}. Stats improved and XP rose.`
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
    if (this.activeBossBattle) {
      return;
    }

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
        this.bossSpawnTimer =
          BOSS_BALANCE.respawnAfterTimeoutBaseSeconds +
          Math.random() * BOSS_BALANCE.respawnAfterTimeoutRandomSeconds;
      }

      return;
    }

    if (this.getUnlockedBossDefinitionIds().length === 0) {
      this.bossSpawnTimer = BOSS_BALANCE.initialSpawnDelaySeconds;
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
    const rarityBadge = `[${definition.rarity.toUpperCase()}]`;
    const chance = getArmWrestleCatchChance(buddy, definition);
    const success = Math.random() < chance;
    const usePersonalityCue = Math.random() < 0.4;
    const victoryReaction = usePersonalityCue
      ? ` ${definition.reactionLines.victory}`
      : '';
    const missReaction = usePersonalityCue
      ? ` ${definition.reactionLines.cry}`
      : '';
    const flavorReactionLine = success
      ? (usePersonalityCue ? definition.reactionLines.victory : `${buddyDisplayName} hits the mat first.`)
      : 'It powered out!';
    const creatureFacing = Math.atan2(this.player.position.x - buddy.position.x, this.player.position.z - buddy.position.z);
    const captureBeatSequence = [
      { at: 0.06, text: 'Arm Wrestle!' },
      { at: 0.56, text: "It's close!" },
      { at: 1.14, text: success ? 'Pinned!' : 'It powered out!' }
    ];
    let captureDestination: 'active' | 'storage' = 'active';
    let captureCrewXp = 0;

    if (success) {
      buddy.captured = true;
      buddy.respawnTimer = CAPTURE_BALANCE.missRespawnSeconds;
      this.player.capturedTotal += 1;
      const capturedEntry = this.createRosterEntry(definition.id, bodyTraits, buddyDisplayName, buddy.level);
      const newBuddyXp = Math.round(CAPTURE_NEW_BUDDY_XP + buddy.level * 1.5);
      captureCrewXp = Math.round(CAPTURE_CREW_XP + Math.min(36, buddy.level * 1.2));
      const newBuddyLevelsGained = this.addRosterXp(capturedEntry, newBuddyXp);
      if (this.roster.length < MAX_ROSTER_SIZE) {
        this.roster.push(capturedEntry);
      } else {
        this.storage.push(capturedEntry);
        captureDestination = 'storage';
      }
      this.awardActiveCrewXp(captureCrewXp, 'capture', capturedEntry.rosterId);
      if (newBuddyLevelsGained > 0) {
        this.events.push({
          type: 'roster',
          rosterId: capturedEntry.rosterId,
          levelUp: true,
          message: `${this.getRosterDisplayName(capturedEntry)} joined with bonus XP and hit Lv ${capturedEntry.level}!`
        });
      }
      this.player.stamina = clamp(this.player.stamina + definition.staminaReward, 0, MAX_STAMINA);
      this.captured.set(definition.id, (this.captured.get(definition.id) ?? 0) + 1);
      const previousHigh = this.capturedHighLevel.get(definition.id) ?? 0;
      if (buddy.level > previousHigh) {
        this.capturedHighLevel.set(definition.id, buddy.level);
      }
      this.evaluateCaptureGoals(definition);
      this.evaluateCaptureQuests(definition, buddy.level);
      this.captureCutsceneTimer = ARM_WRESTLE_CAPTURE_DURATION;
    } else {
      const away = {
        x: buddy.position.x - this.player.position.x,
        z: buddy.position.z - this.player.position.z
      };
      buddy.wanderHeading = Math.atan2(away.x, away.z);
      buddy.dodgeTimer = 1.15;
      this.player.stamina = clamp(
        this.player.stamina - this.getPassiveStaminaLoss(STAMINA_BALANCE.failedCaptureCost),
        0,
        MAX_STAMINA
      );
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
      captureDestination: success ? captureDestination : undefined,
      captureDisplayName: buddyDisplayName,
      captureLevel: buddy.level,
      captureRarity: definition.rarity,
      flavorReactionLine,
      message: success
        ? captureDestination === 'active'
          ? `${rarityBadge} ${buddyDisplayName} lost the arm-wrestle hold and joined your active crew (${this.roster.length}/${MAX_ROSTER_SIZE}). Active crew +${captureCrewXp} XP.${victoryReaction}`
          : `${rarityBadge} ${buddyDisplayName} lost the arm-wrestle hold and went to storage. Active crew is full (${MAX_ROSTER_SIZE}/${MAX_ROSTER_SIZE}). Active crew +${captureCrewXp} XP.${victoryReaction}`
        : `${rarityBadge} ${buddyDisplayName} powered out and escaped.${missReaction}`
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

    const eventBonus = Math.max(0, Math.floor(getCurrentGymEvent().effects.steroidRewardBonus ?? 0));
    const previous = this.player.steroids;
    this.player.steroids = clamp(previous + requested + eventBonus, 0, MAX_STEROIDS);
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
      energy: ROSTER_TRAINING_BALANCE.maxEnergy,
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
    return BASE_ROSTER_STATS_BY_ARCHETYPE[archetype];
  }

  private applyTrainingResult(
    buddy: BuddyRosterEntry,
    archetype: BuddyArchetype,
    rewardMultiplier = 1
  ): number {
    const strengthBonus = this.rollPassiveBonus(this.getActivePassiveTotals().strengthTrainingChance);

    if (archetype === 'runner' || archetype === 'spinner') {
      buddy.strength += strengthBonus;
      buddy.endurance += 2;
      buddy.focus += 1;
    } else if (archetype === 'lifter' || archetype === 'climber') {
      buddy.strength += 2 + strengthBonus;
      buddy.endurance += 1;
    } else {
      buddy.strength += strengthBonus;
      buddy.focus += 2;
      buddy.endurance += 1;
    }

    const eventEffects = getCurrentGymEvent().effects;
    let eventXpMultiplier = 1;

    if (archetype === 'lifter' || archetype === 'climber') {
      eventXpMultiplier *= eventEffects.strengthWorkoutXpMultiplier ?? 1;
    }

    if (archetype === 'runner' || archetype === 'spinner') {
      eventXpMultiplier *= eventEffects.enduranceWorkoutXpMultiplier ?? 1;
    }

    const baseXp = XP_REWARDS.workoutBase * rewardMultiplier * eventXpMultiplier;
    return this.addRosterXp(buddy, Math.round(baseXp));
  }

  private addRosterXp(buddy: BuddyRosterEntry, amount: number): number {
    const xpGain = Math.max(0, Math.floor(amount));
    if (xpGain <= 0 || buddy.level >= STEROID_LEVEL_CAP) {
      return 0;
    }

    buddy.xp += xpGain;
    let levelsGained = 0;

    while (buddy.level < STEROID_LEVEL_CAP) {
      const required = getBuddyXpForNextLevel(buddy.level);
      if (buddy.xp < required) {
        break;
      }

      buddy.xp -= required;
      this.increaseRosterLevel(buddy);
      levelsGained += 1;
    }

    if (buddy.level >= STEROID_LEVEL_CAP) {
      buddy.xp = 0;
    }

    if (levelsGained > 0) {
      this.evaluateCrewLevelGoal();
    }

    return levelsGained;
  }

  private increaseRosterLevel(buddy: BuddyRosterEntry, statBonus = 0): void {
    buddy.level += 1;
    buddy.strength += LEVEL_UP_BALANCE.statIncrease + statBonus;
    buddy.endurance += LEVEL_UP_BALANCE.statIncrease + statBonus;
    buddy.focus += LEVEL_UP_BALANCE.statIncrease + statBonus;
    buddy.energy = clamp(
      buddy.energy +
        LEVEL_UP_BALANCE.energyReward +
        statBonus * LEVEL_UP_BALANCE.bonusEnergyPerExtraStat,
      0,
      ROSTER_TRAINING_BALANCE.maxEnergy
    );
  }

  private awardActiveCrewXp(amount: number, sourceLabel: string, excludeRosterId?: number): number {
    let recipients = 0;

    for (const buddy of this.roster) {
      if (buddy.rosterId === excludeRosterId) {
        continue;
      }

      recipients += 1;
      const levelsGained = this.addRosterXp(buddy, amount);
      if (levelsGained > 0) {
        this.events.push({
          type: 'roster',
          rosterId: buddy.rosterId,
          levelUp: true,
          message: `${this.getRosterDisplayName(buddy)} gained ${amount} ${sourceLabel} XP and hit Lv ${buddy.level}!`
        });
      }
    }

    return recipients;
  }

  private createBossBattle(boss: BossState): BossBattleState {
    const crew = this.getBossBattleCrewBreakdown();
    const eventEffects = getCurrentGymEvent().effects;
    const bossRewardMultiplier = eventEffects.bossRewardMultiplier ?? 1;
    const bossPower = boss.strength + boss.endurance + boss.focus + BOSS_BALANCE.powerBonus;
    const winChance = clamp(
      BOSS_BALANCE.winChanceBase + (crew.total - bossPower) / BOSS_BALANCE.winChancePowerDivisor,
      BOSS_BALANCE.winChanceMin,
      BOSS_BALANCE.winChanceMax
    );
    const success = Math.random() < winChance;
    const baseRewardSteroids =
      Math.random() < BOSS_BALANCE.rewardSteroidUpgradeChance || crew.hasExotic
        ? BOSS_BALANCE.rewardSteroidsLuckyOrExotic
        : BOSS_BALANCE.rewardSteroidsBase;
    const rounds: BossBattleRound[] = [
      {
        label: 'Level check',
        crewScore: crew.levelPower,
        bossScore: bossPower * BOSS_BALANCE.roundWeights.level,
        winner: crew.levelPower >= bossPower * BOSS_BALANCE.roundWeights.level ? 'crew' : 'boss'
      },
      {
        label: 'Stat clash',
        crewScore: crew.statPower,
        bossScore: bossPower * BOSS_BALANCE.roundWeights.stats,
        winner: crew.statPower >= bossPower * BOSS_BALANCE.roundWeights.stats ? 'crew' : 'boss'
      },
      {
        label: 'Rarity + passives',
        crewScore: crew.rarityPower + crew.passivePower,
        bossScore: bossPower * BOSS_BALANCE.roundWeights.rarityPassive,
        winner:
          crew.rarityPower + crew.passivePower >= bossPower * BOSS_BALANCE.roundWeights.rarityPassive
            ? 'crew'
            : 'boss'
      }
    ];

    const battle: BossBattleState = {
      boss: this.copyBoss(boss),
      phase: 'intro',
      result: success ? 'success' : 'fail',
      crewPower: crew.total,
      bossPower,
      winChance,
      rewardXp: Math.round(
        (BOSS_BALANCE.rewardXpBase + bossPower * BOSS_BALANCE.rewardXpPowerScale) *
          bossRewardMultiplier
      ),
      rewardSteroids: baseRewardSteroids + Math.max(0, Math.floor(eventEffects.bossSteroidRewardBonus ?? 0)),
      exoticBoostReward: BOSS_BALANCE.exoticBoostReward * bossRewardMultiplier,
      staminaCost: STAMINA_BALANCE.bossFailureCost,
      rounds,
      activeRound: 0,
      timer: BOSS_BATTLE_DURATION,
      duration: BOSS_BATTLE_DURATION,
      message: success
        ? 'The crew lines up a ridiculous combo finisher.'
        : 'The boss reads the crew tempo and loads a counter set.'
    };

    this.refreshBossBattlePhase(battle);
    return battle;
  }

  private refreshBossBattlePhase(battle: BossBattleState): void {
    const elapsed = battle.duration - battle.timer;
    const roundDuration = battle.duration / Math.max(1, battle.rounds.length);
    battle.activeRound = clamp(Math.floor(elapsed / roundDuration), 0, battle.rounds.length - 1);

    if (elapsed < 0.45) {
      battle.phase = 'intro';
    } else if (battle.timer <= 0.5) {
      battle.phase = 'result';
    } else {
      battle.phase = 'clash';
    }
  }

  private getBossBattleCrewBreakdown(): {
    levelPower: number;
    statPower: number;
    rarityPower: number;
    passivePower: number;
    total: number;
    hasExotic: boolean;
  } {
    let levelPower = 0;
    let statPower = 0;
    let rarityPower = 0;
    let passiveNudge = 0;
    let hasExotic = false;

    for (const buddy of this.roster) {
      const definition = getBuddyDefinition(buddy.definitionId);
      const energyScale =
        BOSS_BALANCE.crewPower.energyBase + buddy.energy / BOSS_BALANCE.crewPower.energyDivisor;
      levelPower += buddy.level * BOSS_BALANCE.crewPower.levelMultiplier;
      statPower += (buddy.strength + buddy.endurance + buddy.focus) * energyScale;
      rarityPower += this.getRarityBattleBonus(definition);
      passiveNudge +=
        definition.rarity === 'exotic' || definition.isExotic
          ? BOSS_BALANCE.crewPower.exoticPassiveNudge
          : BOSS_BALANCE.crewPower.normalPassiveNudge;
      hasExotic ||= definition.rarity === 'exotic' || definition.isExotic === true;
    }

    const subtotal = levelPower + statPower + rarityPower;
    const bossPassivePower = subtotal * this.getActivePassiveTotals().bossPowerBonus;
    const passivePower = passiveNudge + bossPassivePower;

    return {
      levelPower,
      statPower,
      rarityPower,
      passivePower,
      total: subtotal + passivePower + this.player.stamina / BOSS_BALANCE.crewPower.staminaDivisor,
      hasExotic
    };
  }

  private getRarityBattleBonus(definition: BuddyDefinition): number {
    if (definition.rarity === 'exotic' || definition.isExotic) {
      return BOSS_BALANCE.rarityBattleBonus.exotic;
    }

    if (definition.rarity === 'rare') {
      return BOSS_BALANCE.rarityBattleBonus.rare;
    }

    if (definition.rarity === 'uncommon') {
      return BOSS_BALANCE.rarityBattleBonus.uncommon;
    }

    return BOSS_BALANCE.rarityBattleBonus.common;
  }

  private getCrewPower(): number {
    return this.getBossBattleCrewBreakdown().total;
  }

  private getPassiveStaminaLoss(amount: number): number {
    return amount * (1 - this.getActivePassiveTotals().staminaLossReduction);
  }

  private rollPassiveBonus(chance: number): number {
    return Math.random() < clamp(chance, 0, PASSIVE_TOTAL_LIMITS.rollMaxChance) ? 1 : 0;
  }

  private getActivePassiveTotals(): ActivePassiveTotals {
    const totals: ActivePassiveTotals = {
      movementSpeedBonus: 0,
      strengthTrainingChance: 0,
      steroidBoostChance: 0,
      staminaLossReduction: 0,
      sprintRecoveryBonus: 0,
      bossPowerBonus: 0
    };

    for (const buddy of this.roster) {
      const passive = getBuddyDefinition(buddy.definitionId).passive;

      if (passive.effect === 'movement-speed') {
        totals.movementSpeedBonus += passive.value;
      } else if (passive.effect === 'strength-training') {
        totals.strengthTrainingChance += passive.value;
      } else if (passive.effect === 'steroid-boost') {
        totals.steroidBoostChance += passive.value;
      } else if (passive.effect === 'stamina-saver') {
        totals.staminaLossReduction += passive.value;
      } else if (passive.effect === 'sprint-recovery') {
        totals.sprintRecoveryBonus += passive.value;
      } else if (passive.effect === 'boss-power') {
        totals.bossPowerBonus += passive.value;
      }
    }

    return {
      movementSpeedBonus: clamp(totals.movementSpeedBonus, 0, PASSIVE_TOTAL_LIMITS.movementSpeedBonus),
      strengthTrainingChance: clamp(
        totals.strengthTrainingChance,
        0,
        PASSIVE_TOTAL_LIMITS.strengthTrainingChance
      ),
      steroidBoostChance: clamp(totals.steroidBoostChance, 0, PASSIVE_TOTAL_LIMITS.steroidBoostChance),
      staminaLossReduction: clamp(totals.staminaLossReduction, 0, PASSIVE_TOTAL_LIMITS.staminaLossReduction),
      sprintRecoveryBonus: clamp(totals.sprintRecoveryBonus, 0, PASSIVE_TOTAL_LIMITS.sprintRecoveryBonus),
      bossPowerBonus: clamp(totals.bossPowerBonus, 0, PASSIVE_TOTAL_LIMITS.bossPowerBonus)
    };
  }

  private spawnBoss(): void {
    const unlockedBossIds = this.getUnlockedBossDefinitionIds();
    if (unlockedBossIds.length === 0) {
      return;
    }
    const definition = getBossDefinition(randomBossDefinitionId(unlockedBossIds));
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

  private getUnlockedBossDefinitionIds(): string[] {
    const caughtSpeciesCount = this.captured.size;
    const hasLevelFive = [...this.roster, ...this.storage].some((buddy) => buddy.level >= 5);
    const hasLevelFifteen = [...this.roster, ...this.storage].some((buddy) => buddy.level >= 15);
    const exoticKnown =
      this.goalState.encounter_exotic.completed ||
      this.goalState.capture_first_exotic.completed ||
      Array.from(this.captured).some(([definitionId, count]) => {
        const definition = getBuddyDefinition(definitionId);
        return count > 0 && (definition.rarity === 'exotic' || definition.isExotic);
      });
    const ids: string[] = [];

    if (this.player.capturedTotal >= 3 || hasLevelFive) {
      ids.push('plate-titan');
    }

    if (this.player.capturedTotal >= 8 || caughtSpeciesCount >= GOAL_TARGETS.repdex_quarter) {
      ids.push('rep-reaper');
    }

    if (exoticKnown || hasLevelFifteen) {
      ids.push('bulk-baron');
    }

    return ids;
  }

  private copyBoss(boss: BossState): BossState {
    return {
      ...boss,
      position: copyVec2(boss.position)
    };
  }

  private copyBossBattle(battle: BossBattleState): BossBattleState {
    return {
      ...battle,
      boss: this.copyBoss(battle.boss),
      rounds: battle.rounds.map((round) => ({ ...round }))
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

  private announceBuddySpawn(buddy: BuddyState): void {
    const definition = getBuddyDefinition(buddy.definitionId);
    const exotic = definition.rarity === 'exotic' || definition.isExotic === true;

    if (exotic) {
      this.updateGoalProgress('encounter_exotic', 1);
      this.updateQuestProgress('find_exotic_1', 1);
    }

    this.events.push({
      type: 'spawn',
      buddy: { ...buddy, position: copyVec2(buddy.position), bodyTraits: { ...buddy.bodyTraits } },
      message: exotic
        ? `Exotic alert: ${definition.name} is flexing on the Mythic Platform.`
        : `${definition.name} entered ${getGymZoneAt(buddy.position).name}.`
    });
  }

  private createBuddy(definitionIdOverride?: string): BuddyState {
    const spawnZone = getRandomGymSpawnZone();
    let position = randomPointForZone(spawnZone);
    const spawnProgress = this.getWildSpawnProgress();
    const eventExoticBoost = getCurrentGymEvent().effects.exoticSpawnBonus ?? 0;
    const positionZone = getGymZoneAt(position);
    const definitionId =
      definitionIdOverride ??
      weightedBuddyDefinitionId(spawnProgress, this.bossExoticBoost + eventExoticBoost, positionZone);
    const definition = getBuddyDefinition(definitionId);

    for (let attempts = 0; attempts < 8; attempts += 1) {
      if (distance(position, this.player.position) > 5) {
        break;
      }

      position = randomPointForZone(spawnZone);
    }

    return {
      id: nextBuddyId++,
      definitionId,
      bodyTraits: generateBuddyBodyTraits(definition.archetype),
      displayName: getRandomBuddyName(definitionId),
      level: this.getWildBuddyLevel(spawnProgress, positionZone),
      position,
      heading: randomHeading(),
      wanderHeading: randomHeading(),
      wanderTimer: Math.random() * 2,
      captured: false,
      respawnTimer: 0,
      dodgeTimer: 0,
      holdTimer: 0,
      ragdollTimer: 0,
      behavior: 'wander',
      behaviorTimer: 0,
      behaviorCooldown: Math.random() * CREATURE_BEHAVIOR_BALANCE.behaviorCooldownRandomSeconds
    };
  }

  private spawnDebugCreature(exotic: boolean): void {
    const candidates = BUDDY_DEFINITIONS.filter((definition) =>
      exotic
        ? definition.rarity === 'exotic' || definition.isExotic
        : definition.rarity !== 'exotic' && !definition.isExotic
    );
    const definition = candidates[Math.floor(Math.random() * candidates.length)];

    if (!definition) {
      this.events.push({
        type: 'roster',
        message: exotic
          ? 'Debug: no exotic creature definitions found.'
          : 'Debug: no normal creature definitions found.'
      });
      return;
    }

    const buddy = this.createBuddy(definition.id);
    this.buddies.push(buddy);
    this.announceBuddySpawn(buddy);
  }

  private getWildSpawnProgress(): number {
    const capturedProgress = clamp(
      this.player.capturedTotal / WILD_SPAWN_BALANCE.progress.capturedTotalForMax,
      0,
      1
    );
    const crewAverage = this.getCrewAverageLevel();
    const crewProgress = clamp(
      crewAverage / WILD_SPAWN_BALANCE.progress.crewAverageLevelForMax,
      0,
      1
    );
    const goalAdjustedProgress = this.isGoalCompleted('capture_6')
      ? WILD_SPAWN_BALANCE.progress.unlockedGoalScale
      : WILD_SPAWN_BALANCE.progress.lockedGoalScale;

    return clamp(
      capturedProgress * WILD_SPAWN_BALANCE.progress.capturedWeight * goalAdjustedProgress +
        crewProgress * WILD_SPAWN_BALANCE.progress.crewWeight * goalAdjustedProgress,
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

  private getWildBuddyLevel(spawnProgress: number, zone: GymZoneDefinition): number {
    const earlyUnlocked = this.isGoalCompleted('capture_6');
    const midUnlocked = this.isGoalCompleted('capture_10');
    const progression = clamp(spawnProgress, 0, 1);
    const weights = WILD_SPAWN_BALANCE.levelTierWeights;
    const ranges = WILD_SPAWN_BALANCE.levelRanges;
    const normalLowWeight = weights.lowBase - progression * weights.lowProgressPenalty;
    const level16to25Weight = earlyUnlocked
      ? weights.midBase + progression * weights.midProgressScale
      : weights.midLocked;
    const level26to35Weight = midUnlocked
      ? weights.highBase + progression * weights.highProgressScale
      : 0;
    const level36PlusWeight = midUnlocked
      ? weights.lateBase + progression * weights.lateProgressScale
      : 0;
    const total = normalLowWeight + level16to25Weight + level26to35Weight + level36PlusWeight;
    const roll = Math.random() * total;
    const normalizedLow = normalLowWeight;
    const normalizedMid = normalizedLow + level16to25Weight;
    const normalizedHigh = normalizedMid + level26to35Weight;

    if (roll < normalizedLow) {
      return this.adjustWildLevelForZone(pickWildLevelInRange(ranges.low.min, ranges.low.max, progression), zone);
    }

    if (roll < normalizedMid) {
      return this.adjustWildLevelForZone(pickWildLevelInRange(ranges.mid.min, ranges.mid.max, progression), zone);
    }

    if (roll < normalizedHigh) {
      return this.adjustWildLevelForZone(pickWildLevelInRange(ranges.high.min, ranges.high.max, progression), zone);
    }

    return this.adjustWildLevelForZone(pickWildLevelInRange(ranges.late.min, ranges.late.max, progression), zone);
  }

  private adjustWildLevelForZone(level: number, zone: GymZoneDefinition): number {
    if (zone.id === 'starter-stretch') {
      return clamp(level, 1, 8);
    }

    if (zone.id === 'flex-trail') {
      return clamp(Math.max(3, level), 1, 18);
    }

    if (zone.id === 'heavy-lift-hall') {
      return clamp(level + 3, 6, 32);
    }

    if (zone.id === 'core-court') {
      return clamp(level + 2, 5, 28);
    }

    if (zone.id === 'mythic-platform') {
      return clamp(level + 5, 10, 50);
    }

    return level;
  }
}
