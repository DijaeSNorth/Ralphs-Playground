import { BUDDY_DEFINITIONS, getBuddyDefinition } from '../content/buddies';
import type { ActionState, BuddyState, RepDexEntry, Vec2, WorldEvent, WorldSnapshot } from '../types';

const ARENA_RADIUS = 18;
const CAPTURE_RANGE = 2.85;
const MAX_STAMINA = 100;
const MAX_BUDDY_BALLS = 8;
const STARTING_BUDDY_BALLS = 6;
const ACTIVE_BUDDIES = 6;
const WALK_SPEED = 5.2;
const SPRINT_SPEED = 7.8;
const BUDDY_WANDER_SPEED = 0.95;
const BUDDY_DODGE_SPEED = 4.4;

let nextBuddyId = 1;

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
    buddyBalls: STARTING_BUDDY_BALLS,
    capturedTotal: 0
  };

  private readonly buddies: BuddyState[] = [];
  private readonly captured = new Map<string, number>();
  private readonly events: WorldEvent[] = [];
  private catchCooldown = 0;
  private ballRechargeTimer = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.player = {
      position: { x: 0, z: 5 },
      heading: Math.PI,
      stamina: MAX_STAMINA,
      buddyBalls: STARTING_BUDDY_BALLS,
      capturedTotal: 0
    };
    this.buddies.length = 0;
    this.captured.clear();
    this.events.length = 0;
    this.catchCooldown = 0;
    this.ballRechargeTimer = 0;

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
    this.rechargeBuddyBalls(dt);

    if (actions.catchPressed) {
      this.tryCapture();
    }
  }

  drainEvents(): WorldEvent[] {
    return this.events.splice(0, this.events.length);
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
        buddyBalls: this.player.buddyBalls,
        capturedTotal: this.player.capturedTotal
      },
      buddies: this.buddies.map((buddy) => ({
        ...buddy,
        position: copyVec2(buddy.position)
      })),
      repDex,
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

  private rechargeBuddyBalls(dt: number): void {
    if (this.player.buddyBalls >= MAX_BUDDY_BALLS) {
      this.ballRechargeTimer = 0;
      return;
    }

    this.ballRechargeTimer += dt;

    if (this.ballRechargeTimer > 5.5) {
      this.player.buddyBalls += 1;
      this.ballRechargeTimer = 0;
    }
  }

  private tryCapture(): void {
    const start = copyVec2(this.player.position);

    if (this.catchCooldown > 0) {
      return;
    }

    this.catchCooldown = 0.6;

    if (this.player.buddyBalls <= 0) {
      this.events.push({
        type: 'capture',
        result: 'empty',
        start,
        message: 'Out of Buddy Balls. Jog a lap to restock.'
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

    this.player.buddyBalls -= 1;

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
      this.player.stamina = clamp(this.player.stamina + definition.staminaReward, 0, MAX_STAMINA);
      this.player.buddyBalls = clamp(this.player.buddyBalls + 1, 0, MAX_BUDDY_BALLS);
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
        ? `${definition.name} joined your RepDex.`
        : `${definition.name} broke form and dodged.`
    });
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
