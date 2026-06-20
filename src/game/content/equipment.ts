import type { Vec2, WorkoutStation } from '../types';

export const WORKOUT_STATIONS: WorkoutStation[] = [
  {
    id: 'flat-bench-press',
    name: 'Flat Bench Press',
    type: 'bench',
    position: { x: 15.4, z: -12.4 },
    radius: 3.2,
    staminaReward: 16,
    shakerReward: 2
  },
  {
    id: 'incline-bench-press',
    name: 'Incline Bench Press',
    type: 'incline-bench',
    position: { x: 10.8, z: -15.9 },
    radius: 3.2,
    staminaReward: 18,
    shakerReward: 2
  },
  {
    id: 'power-squat-rack',
    name: 'Power Squat Rack',
    type: 'squat-rack',
    position: { x: -13.8, z: -10.8 },
    radius: 3.4,
    staminaReward: 24,
    shakerReward: 1
  },
  {
    id: 'angled-leg-press',
    name: 'Angled Leg Press',
    type: 'leg-press',
    position: { x: -10.8, z: 15.8 },
    radius: 3.2,
    staminaReward: 22,
    shakerReward: 1
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
