import type { GymZoneDefinition, Vec2 } from '../types';

export const GYM_ZONES: readonly GymZoneDefinition[] = [
  {
    id: 'starter-stretch',
    name: 'Starter Stretch',
    shortName: 'Starter',
    description: 'Low-clutter warmup lanes where friendly early creatures practice tiny reps.',
    position: { x: -9.5, z: 12.2 },
    radius: 7,
    spawnWeight: 1.3,
    spawnWeights: [
      { id: 'buff-bunny', weight: 26 },
      { id: 'curl-corgi', weight: 20 },
      { id: 'rowing-raccoon', weight: 16 },
      { id: 'press-penguin', weight: 14 },
      { id: 'squat-squirrel', weight: 12 },
      { id: 'flex-fox', weight: 8 }
    ]
  },
  {
    id: 'flex-trail',
    name: 'Flex Trail',
    shortName: 'Flex',
    description: 'A colorful agility path for quick beasts, showboats, and endurance weirdos.',
    position: { x: 12.8, z: 10.2 },
    radius: 7.4,
    spawnWeight: 1.05,
    spawnWeights: [
      { id: 'flex-fox', weight: 24 },
      { id: 'buff-bunny', weight: 18 },
      { id: 'pump-panther', weight: 18 },
      { id: 'curl-corgi', weight: 14 },
      { id: 'jacked-jaguar', weight: 10 },
      { id: 'tricep-tiger', weight: 8 }
    ]
  },
  {
    id: 'heavy-lift-hall',
    name: 'Heavy Lift Hall',
    shortName: 'Heavy',
    description: 'Plate-loaded creatures gather around racks, benches, and loud PR energy.',
    position: { x: -12.8, z: -10.8 },
    radius: 7.6,
    spawnWeight: 1.15,
    spawnWeights: [
      { id: 'bench-bear', weight: 22 },
      { id: 'iron-rhino', weight: 18 },
      { id: 'deadlift-deer', weight: 18 },
      { id: 'bulk-buffalo', weight: 16 },
      { id: 'swole-gorilla', weight: 12 }
    ]
  },
  {
    id: 'core-court',
    name: 'Core Court',
    shortName: 'Core',
    description: 'Balanced creatures train focus, posture, and suspiciously intense plank form.',
    position: { x: 8.5, z: -8.5 },
    radius: 7.2,
    spawnWeight: 1.05,
    spawnWeights: [
      { id: 'rowing-raccoon', weight: 18 },
      { id: 'squat-squirrel', weight: 16 },
      { id: 'press-penguin', weight: 14 },
      { id: 'deadlift-deer', weight: 13 },
      { id: 'jacked-jaguar', weight: 12 },
      { id: 'tricep-tiger', weight: 10 }
    ]
  },
  {
    id: 'mythic-platform',
    name: 'Mythic Platform',
    shortName: 'Mythic',
    description: 'The weird platform where exotic gym legends like to make an entrance.',
    position: { x: 0, z: 0 },
    radius: 6.4,
    spawnWeight: 0.78,
    // Mythic Platform should feel special without flooding the gym with exotics.
    exoticSpawnBonus: 0.024,
    spawnWeights: [
      { id: 'iron-rhino', weight: 14 },
      { id: 'swole-gorilla', weight: 12 },
      { id: 'bulk-buffalo', weight: 10 },
      { id: 'tricep-tiger', weight: 9 },
      { id: 'jacked-jaguar', weight: 8 }
    ]
  }
] as const;

export function getGymZoneAt(position: Vec2): GymZoneDefinition {
  let nearest = GYM_ZONES[0]!;
  let nearestScore = Number.POSITIVE_INFINITY;

  for (const zone of GYM_ZONES) {
    const zoneDistance = Math.hypot(position.x - zone.position.x, position.z - zone.position.z);

    if (zoneDistance <= zone.radius) {
      return zone;
    }

    const score = zoneDistance - zone.radius;
    if (score < nearestScore) {
      nearest = zone;
      nearestScore = score;
    }
  }

  return nearest;
}

export function getRandomGymSpawnZone(): GymZoneDefinition {
  const total = GYM_ZONES.reduce((sum, zone) => sum + zone.spawnWeight, 0);
  let remaining = Math.random() * total;

  for (const zone of GYM_ZONES) {
    remaining -= zone.spawnWeight;
    if (remaining <= 0) {
      return zone;
    }
  }

  return GYM_ZONES[GYM_ZONES.length - 1]!;
}

export function randomPointInZone(zone: GymZoneDefinition): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * zone.radius * 0.82;

  return {
    x: zone.position.x + Math.cos(angle) * radius,
    z: zone.position.z + Math.sin(angle) * radius
  };
}
