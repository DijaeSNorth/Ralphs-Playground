import type { GymZoneDefinition, Vec2 } from '../types';

export const GYM_ZONES: readonly GymZoneDefinition[] = [
  {
    id: 'cardio-corner',
    name: 'Cardio Corner',
    shortName: 'Cardio',
    description: 'Fast-footed beasts prefer the machines and open lanes.',
    position: { x: 13.5, z: 10.5 },
    radius: 7.1,
    spawnWeight: 1,
    spawnWeights: [
      { id: 'flex-fox', weight: 20 },
      { id: 'pump-panther', weight: 16 },
      { id: 'rowing-raccoon', weight: 16 },
      { id: 'curl-corgi', weight: 12 },
      { id: 'press-penguin', weight: 10 }
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
    id: 'flex-mirror-lane',
    name: 'Flex Mirror Lane',
    shortName: 'Flex',
    description: 'Showboats and stylish beasts drift toward the mirror line.',
    position: { x: 8.5, z: -8.5 },
    radius: 7.2,
    spawnWeight: 1.05,
    spawnWeights: [
      { id: 'buff-bunny', weight: 20 },
      { id: 'flex-fox', weight: 18 },
      { id: 'jacked-jaguar', weight: 16 },
      { id: 'tricep-tiger', weight: 15 },
      { id: 'pump-panther', weight: 12 }
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
    exoticSpawnBonus: 0.018,
    spawnWeights: [
      { id: 'iron-rhino', weight: 14 },
      { id: 'swole-gorilla', weight: 12 },
      { id: 'bulk-buffalo', weight: 10 },
      { id: 'tricep-tiger', weight: 9 },
      { id: 'jacked-jaguar', weight: 8 }
    ]
  },
  {
    id: 'recovery-lounge',
    name: 'Recovery Lounge',
    shortName: 'Recover',
    description: 'Lower-pressure creatures hang near snacks, benches, and cooldown space.',
    position: { x: -9.5, z: 12.2 },
    radius: 7,
    spawnWeight: 0.95,
    spawnWeights: [
      { id: 'buff-bunny', weight: 18 },
      { id: 'press-penguin', weight: 16 },
      { id: 'squat-squirrel', weight: 15 },
      { id: 'curl-corgi', weight: 14 },
      { id: 'rowing-raccoon', weight: 12 }
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
