import { BUDDY_DEFINITIONS, getBuddyDefinition } from '../content/buddies';
import { BOSS_DEFINITIONS, getBossDefinition } from '../content/bosses';
import { VENDING_MACHINES } from '../content/vending';
import type {
  ActionState,
  BossState,
  BuddyArchetype,
  BuddyRosterEntry,
  BuddyState,
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
const BUDDY_WANDER_SPEED = 0.95;
const BUDDY_DODGE_SPEED = 4.4;
const TRAINING_DURATION = 10;
const SPOTTING_DURATION = 6;
const BOSS_ACTIVE_DURATION = 26;

let nextBuddyId = 1;
let nextRosterId = 1;
let nextBossId = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
    heading: Math.PI,
    stamina: MAX_STAMINA,
    proteinShakers: STARTING_PROTEIN_SHAKERS,
    capturedTotal: 0
  };

  private readonly buddies: BuddyState[] = [];
  private readonly roster: BuddyRosterEntry[] = [];
  private readonly captured = new Map<string, number>();
  private readonly events: WorldEvent[] = [];
  private activeBoss?: BossState;
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
      heading: Math.PI,
      stamina: MAX_STAMINA,
      proteinShakers: STARTING_PROTEIN_SHAKERS,
      capturedTotal: 0
    };
    this.buddies.length = 0;
    this.roster.length = 0;
    this.captured.clear();
    this.events.length = 0;
    this.activeBoss = undefined;
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
  }

  update(deltaSeconds: number, actions: ActionState): void {
    const dt = Math.min(deltaSeconds, 0.05);

    if (actions.resetPressed) {
      this.reset();
      return;
    }

    this.catchCooldown = Math.max(0, this.catchCooldown - dt);
    this.updatePlayer(dt, actions);
    this.updateBuddies(dt);
    this.updateRoster(dt);
    this.updateBoss(dt);
    this.rechargeProteinShakers(dt);
    this.updateVending(dt);

    if (actions.catchPressed) {
      this.tryCapture();
    }
  }

  drainEvents(): WorldEvent[] {
    return this.events.splice(0, this.events.length);
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
    buddy.taskLabel = 'Workout';
    buddy.taskTimer = TRAINING_DURATION;
    buddy.taskDuration = TRAINING_DURATION;
    this.events.push({
      type: 'roster',
      message: `${getBuddyDefinition(buddy.definitionId).name} headed to a workout station.`
    });
  }

  spotBuddy(rosterId: number): void {
    const buddy = this.roster.find((entry) => entry.rosterId === rosterId);

    if (!buddy) {
      return;
    }

    if (buddy.status !== 'ready') {
      this.events.push({
        type: 'roster',
        message: `${getBuddyDefinition(buddy.definitionId).name} cannot spot while busy.`
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

    buddy.energy = clamp(buddy.energy - 10, 0, 100);
    buddy.status = 'spotting';
    buddy.taskLabel = 'Spotting';
    buddy.taskTimer = SPOTTING_DURATION;
    buddy.taskDuration = SPOTTING_DURATION;
    this.events.push({
      type: 'roster',
      message: `${getBuddyDefinition(buddy.definitionId).name} is spotting your next set.`
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
    const moving = Math.hypot(actions.moveX, actions.moveZ) > 0.01;
    const canSprint = actions.sprintHeld && this.player.stamina > 5 && moving;
    const speed = canSprint ? SPRINT_SPEED : WALK_SPEED;

    if (moving) {
      this.player.heading = Math.atan2(actions.moveX, actions.moveZ);
      this.player.position.x += actions.moveX * speed * dt;
      this.player.position.z += actions.moveZ * speed * dt;

      this.player.stamina = clamp(
        this.player.stamina - (canSprint ? 24 : 7) * dt,
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
    }
  }

  private updateBuddies(dt: number): void {
    for (let index = 0; index < this.buddies.length; index += 1) {
      const buddy = this.buddies[index];

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
        continue;
      }

      const definition = getBuddyDefinition(buddy.definitionId);

      if (buddy.status === 'training') {
        this.applyTrainingResult(buddy, definition.archetype);
        this.events.push({
          type: 'roster',
          message: `${definition.name} finished training. Stats improved.`
        });
      } else {
        buddy.focus += 2;
        this.addRosterXp(buddy, 18);
        this.player.stamina = clamp(this.player.stamina + 6, 0, MAX_STAMINA);
        this.events.push({
          type: 'roster',
          message: `${definition.name} spotted clean reps. +2 focus.`
        });
      }

      buddy.status = 'ready';
      buddy.taskLabel = undefined;
      buddy.taskTimer = 0;
      buddy.taskDuration = 0;
    }
  }

  private updateBoss(dt: number): void {
    if (this.activeBoss) {
      this.activeBoss.timer -= dt;

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
        message: `Crew is full (${MAX_ROSTER_SIZE}/${MAX_ROSTER_SIZE}). Train or spot your buddies.`
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
      timer: BOSS_ACTIVE_DURATION
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
      holdTimer: 0
    };
  }
}
