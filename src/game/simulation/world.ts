import { BUDDY_DEFINITIONS, getBuddyDefinition } from '../content/buddies';
import { BOSS_DEFINITIONS, getBossDefinition } from '../content/bosses';
import { FREE_WEIGHT_PICKUPS, WORKOUT_STATIONS } from '../content/equipment';
import { VENDING_MACHINES } from '../content/vending';
import type {
  ActionState,
  BossState,
  BuddyArchetype,
  BuddyRosterEntry,
  BuddyState,
  FreeWeightState,
  RepDexEntry,
  Vec2,
  WorkoutStation,
  WorldEvent,
  WorldSnapshot
} from '../types';

const ARENA_RADIUS = 18;
const CAPTURE_RANGE = 2.85;
const MAX_STAMINA = 100;
const MAX_PROTEIN_SHAKERS = 8;
const STARTING_PROTEIN_SHAKERS = 6;
const ACTIVE_BUDDIES = 6;
const MAX_ROSTER_SIZE = 4;
const WALK_SPEED = 5.2;
const SPRINT_SPEED = 7.8;
const PLAYER_ACCELERATION = 34;
const PLAYER_DECELERATION = 42;
const PLAYER_TURN_SPEED = 13;
const BUDDY_WANDER_SPEED = 0.95;
const BUDDY_DODGE_SPEED = 4.4;
const TRAINING_DURATION = 12;
const TRAINING_SPOT_WINDOW = 7;
const BOSS_ACTIVE_DURATION = 26;
const FREE_WEIGHT_PICKUP_RANGE = 2.15;
const FREE_WEIGHT_THROW_SPEED = 11.8;
const FREE_WEIGHT_THROW_DURATION = 1.12;
const FREE_WEIGHT_HIT_RADIUS = 0.72;
const BOSS_FREE_WEIGHT_HIT_RADIUS = 1.05;
const FREE_WEIGHT_PICKUP_COOLDOWN = 0.65;
const BUDDY_RAGDOLL_DURATION = 1.65;
const BOSS_RAGDOLL_DURATION = 1.35;

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

function randomPoint(radius = ARENA_RADIUS - 2): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;

  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r
  };
}

function randomHeading(): number {
  return Math.random() * Math.PI * 2;
}

function randomBossDefinitionId(): string {
  return BOSS_DEFINITIONS[Math.floor(Math.random() * BOSS_DEFINITIONS.length)].id;
}

function weightedBuddyDefinitionId(): string {
  const roll = Math.random();

  if (roll > 0.91) {
    return 'chalk-champ';
  }

  if (roll > 0.68) {
    return Math.random() > 0.5 ? 'kettle-pal' : 'cadence-captain';
  }

  return Math.random() > 0.5 ? 'mat-maven' : 'tempo-trotter';
}

export class GymBuddyWorld {
  private player = {
    position: { x: 0, z: 5 },
    velocity: { x: 0, z: 0 },
    heading: Math.PI,
    stamina: MAX_STAMINA,
    proteinShakers: STARTING_PROTEIN_SHAKERS,
    capturedTotal: 0
  };

  private readonly buddies: BuddyState[] = [];
  private readonly roster: BuddyRosterEntry[] = [];
  private readonly freeWeights: FreeWeightState[] = [];
  private readonly captured = new Map<string, number>();
  private readonly events: WorldEvent[] = [];
  private activeBoss?: BossState;
  private carriedFreeWeightId?: number;
  private catchCooldown = 0;
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
      capturedTotal: 0
    };
    this.buddies.length = 0;
    this.roster.length = 0;
    this.freeWeights.length = 0;
    this.captured.clear();
    this.events.length = 0;
    this.activeBoss = undefined;
    this.carriedFreeWeightId = undefined;
    this.catchCooldown = 0;
    this.shakerRechargeTimer = 0;
    this.vendingSnackCooldown = 0;
    this.bossSpawnTimer = 18;

    for (let index = 0; index < ACTIVE_BUDDIES; index += 1) {
      const buddy = this.createBuddy();

      if (index === 0) {
        buddy.definitionId = 'tempo-trotter';
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

    if (actions.resetPressed) {
      this.reset();
      return;
    }

    this.catchCooldown = Math.max(0, this.catchCooldown - dt);
    this.updatePlayer(dt, actions);
    this.updateFreeWeights(dt);
    this.updateBuddies(dt);
    this.updateRoster(dt);
    this.updateBoss(dt);
    this.rechargeProteinShakers(dt);
    this.updateVending(dt);

    if (actions.catchPressed) {
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
    this.player.stamina = clamp(this.player.stamina + station.staminaReward, 0, MAX_STAMINA);
    this.player.proteinShakers = clamp(
      this.player.proteinShakers + station.shakerReward,
      0,
      MAX_PROTEIN_SHAKERS
    );
    this.events.push({
      type: 'workout',
      message: `${station.name} complete. +${station.staminaReward} stamina, +${station.shakerReward} shaker.`
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
    this.events.push({
      type: 'vending',
      message: `Energy drink purchased. +${Math.round(this.player.stamina - previousStamina)} stamina.`
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

    if (buddy.status !== 'ready') {
      this.events.push({
        type: 'roster',
        message: `${getBuddyDefinition(buddy.definitionId).name} is already busy.`
      });
      return;
    }

    if (buddy.energy < 15) {
      this.events.push({
        type: 'roster',
        message: `${getBuddyDefinition(buddy.definitionId).name} needs a breather first.`
      });
      return;
    }

    buddy.energy = clamp(buddy.energy - 15, 0, 100);
    buddy.status = 'training';
    buddy.taskLabel = this.getRandomWorkoutStation().name;
    buddy.taskOutcome = Math.random() < 0.5 ? 'success' : 'needs-spot';
    buddy.taskTimer = TRAINING_DURATION;
    buddy.taskDuration = TRAINING_DURATION;
    this.events.push({
      type: 'roster',
      message: `${getBuddyDefinition(buddy.definitionId).name} started ${buddy.taskLabel}. Be ready to spot.`
    });
  }

  spotBuddy(rosterId: number): void {
    const buddy = this.roster.find((entry) => entry.rosterId === rosterId);

    if (!buddy) {
      return;
    }

    if (buddy.status !== 'needs-spot') {
      this.events.push({
        type: 'roster',
        message: `${getBuddyDefinition(buddy.definitionId).name} does not need a spot right now.`
      });
      return;
    }

    if (buddy.energy < 10) {
      this.events.push({
        type: 'roster',
        message: `${getBuddyDefinition(buddy.definitionId).name} is too tired to spot.`
      });
      return;
    }

    const definition = getBuddyDefinition(buddy.definitionId);
    buddy.energy = clamp(buddy.energy - 8, 0, 100);
    this.player.stamina = clamp(this.player.stamina - 5, 0, MAX_STAMINA);
    this.applyTrainingResult(buddy, definition.archetype);
    this.finishRosterTask(buddy);
    this.events.push({
      type: 'roster',
      message: `You spotted ${definition.name}. Their set passed and stats improved.`
    });
  }

  removeBuddy(rosterId: number): void {
    const index = this.roster.findIndex((entry) => entry.rosterId === rosterId);

    if (index === -1) {
      return;
    }

    const [buddy] = this.roster.splice(index, 1);
    this.events.push({
      type: 'roster',
      message: `${getBuddyDefinition(buddy.definitionId).name} left your crew.`
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

    if (success) {
      this.player.stamina = clamp(this.player.stamina + 20, 0, MAX_STAMINA);
      this.player.proteinShakers = clamp(this.player.proteinShakers + 2, 0, MAX_PROTEIN_SHAKERS);
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
        ? `${boss.name} got outlifted. Crew gained XP.`
        : `${boss.name} won the set. Train your crew and try again.`
    });
    this.activeBoss = undefined;
    this.bossSpawnTimer = 40 + Math.random() * 28;
  }

  getSnapshot(): WorldSnapshot {
    const nearest = this.getNearestBuddy();
    const nearestFreeWeight = this.getNearestFreeWeight();
    const repDex: RepDexEntry[] = BUDDY_DEFINITIONS.map((definition) => ({
      definition,
      count: this.captured.get(definition.id) ?? 0
    }));

    return {
      player: {
        position: copyVec2(this.player.position),
        heading: this.player.heading,
        stamina: this.player.stamina,
        proteinShakers: this.player.proteinShakers,
        capturedTotal: this.player.capturedTotal
      },
      buddies: this.buddies.map((buddy) => ({
        ...buddy,
        position: copyVec2(buddy.position)
      })),
      roster: this.roster.map((entry) => ({ ...entry })),
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
      activeBoss: this.activeBoss ? this.copyBoss(this.activeBoss) : undefined,
      nearestBuddy: nearest
        ? {
            buddy: { ...nearest.buddy, position: copyVec2(nearest.buddy.position) },
            distance: nearest.distance
          }
        : undefined,
      activeBuddyCount: this.buddies.filter((buddy) => !buddy.captured).length,
      captureRange: CAPTURE_RANGE,
      arenaRadius: ARENA_RADIUS
    };
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
      this.player.heading = rotateToward(this.player.heading, targetHeading, PLAYER_TURN_SPEED * dt);
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
            message: `${getBuddyDefinition(buddy.definitionId).name} needs a spot on ${buddy.taskLabel}.`
          });
        }

        continue;
      }

      const definition = getBuddyDefinition(buddy.definitionId);

      if (buddy.status === 'training' && buddy.taskOutcome === 'success') {
        this.applyTrainingResult(buddy, definition.archetype);
        this.events.push({
          type: 'roster',
          message: `${definition.name} finished ${buddy.taskLabel}. Stats improved.`
        });
      } else if (buddy.status === 'needs-spot') {
        buddy.energy = clamp(buddy.energy - 10, 0, 100);
        this.events.push({
          type: 'roster',
          message: `${definition.name} missed ${buddy.taskLabel}. Spot them sooner next time.`
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

    this.catchCooldown = 0.6;

    if (this.player.proteinShakers <= 0) {
      this.events.push({
        type: 'capture',
        result: 'empty',
        start,
        message: 'Out of protein shakers. Jog a lap to restock.'
      });
      return;
    }

    if (this.roster.length >= MAX_ROSTER_SIZE) {
      this.events.push({
        type: 'capture',
        result: 'empty',
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
        start,
        target: {
          x: start.x + direction.x * CAPTURE_RANGE,
          z: start.z + direction.z * CAPTURE_RANGE
        },
        message: 'No gym buddy in range.'
      });
      return;
    }

    this.player.proteinShakers -= 1;

    const buddy = nearest.buddy;
    const definition = getBuddyDefinition(buddy.definitionId);
    const staminaBonus = this.player.stamina / MAX_STAMINA * 0.12;
    const closenessBonus = (CAPTURE_RANGE - nearest.distance) / CAPTURE_RANGE * 0.16;
    const chance = clamp(definition.baseCatchRate + staminaBonus + closenessBonus, 0.24, 0.92);
    const success = Math.random() < chance;

    if (success) {
      buddy.captured = true;
      buddy.respawnTimer = 1.45;
      this.player.capturedTotal += 1;
      this.roster.push(this.createRosterEntry(definition.id));
      this.player.stamina = clamp(this.player.stamina + definition.staminaReward, 0, MAX_STAMINA);
      this.player.proteinShakers = clamp(
        this.player.proteinShakers + 1,
        0,
        MAX_PROTEIN_SHAKERS
      );
      this.captured.set(definition.id, (this.captured.get(definition.id) ?? 0) + 1);
    } else {
      const away = {
        x: buddy.position.x - this.player.position.x,
        z: buddy.position.z - this.player.position.z
      };
      buddy.wanderHeading = Math.atan2(away.x, away.z);
      buddy.dodgeTimer = 1.15;
      this.player.stamina = clamp(this.player.stamina - 8, 0, MAX_STAMINA);
    }

    this.events.push({
      type: 'capture',
      result: success ? 'success' : 'miss',
      buddy: { ...buddy, position: copyVec2(buddy.position) },
      chance,
      start,
      target: copyVec2(buddy.position),
      message: success
        ? `${definition.name} joined your crew (${this.roster.length}/${MAX_ROSTER_SIZE}).`
        : `${definition.name} broke form and dodged.`
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

  private createRosterEntry(definitionId: string): BuddyRosterEntry {
    const definition = getBuddyDefinition(definitionId);
    const base = this.getBaseStats(definition.archetype);

    return {
      rosterId: nextRosterId++,
      definitionId,
      level: 1,
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

  private applyTrainingResult(buddy: BuddyRosterEntry, archetype: BuddyArchetype): void {
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

    this.addRosterXp(buddy, 30);
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

    for (let attempts = 0; attempts < 8; attempts += 1) {
      if (distance(position, this.player.position) > 5) {
        break;
      }

      position = randomPoint();
    }

    return {
      id: nextBuddyId++,
      definitionId: weightedBuddyDefinitionId(),
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
}
