import type { Vec2, WorkoutStation } from '../types';

export const WORKOUT_STATIONS: WorkoutStation[] = [
  {
    id: 'pace-treadmill',
    name: 'Pace Treadmill',
    type: 'treadmill',
    position: { x: -16.5, z: -15.2 },
    radius: 3.2,
    staminaReward: 18,
    shakerReward: 1
  },
  {
    id: 'rowerg',
    name: 'RowErg',
    type: 'rower',
    position: { x: -10.8, z: 15.8 },
    radius: 3.0,
    staminaReward: 22,
    shakerReward: 1
  },
  {
    id: 'bench-press',
    name: 'Bench Press',
    type: 'bench',
    position: { x: 15.4, z: -12.4 },
    radius: 3.2,
    staminaReward: 16,
    shakerReward: 2
  },
  {
    id: 'cable-tower',
    name: 'Cable Tower',
    type: 'cable',
    position: { x: 16.6, z: 6.8 },
    radius: 3.2,
    staminaReward: 20,
    shakerReward: 1
  },
  {
    id: 'free-weights',
    name: 'Free Weights',
    type: 'free-weights',
    position: { x: -16.4, z: 7.4 },
    radius: 3.4,
    staminaReward: 14,
    shakerReward: 2
  }
];

export function getNearestWorkoutStation(
  position: Vec2,
  maxDistance = 3.4
): { station: WorkoutStation; distance: number } | undefined {
  let nearest: { station: WorkoutStation; distance: number } | undefined;

  for (const station of WORKOUT_STATIONS) {
    const distance = Math.hypot(position.x - station.position.x, position.z - station.position.z);

    if (distance > Math.max(maxDistance, station.radius)) {
      continue;
    }

    if (!nearest || distance < nearest.distance) {
      nearest = { station, distance };
    }
  }

  return nearest;
}
