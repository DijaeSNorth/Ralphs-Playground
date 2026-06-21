import type { FreeWeightPickup, Vec2, WorkoutStation } from '../types';

export const WORKOUT_STATIONS: WorkoutStation[] = [
  {
    id: 'flat-bench-press',
    name: 'Flat Bench Press',
    type: 'bench',
    position: { x: 15.4, z: -12.4 },
    rotation: -0.7,
    radius: 3.2,
    staminaReward: 16,
    shakerReward: 2
  },
  {
    id: 'incline-bench-press',
    name: 'Incline Bench Press',
    type: 'incline-bench',
    position: { x: 10.8, z: -15.9 },
    rotation: 0.75,
    radius: 3.2,
    staminaReward: 18,
    shakerReward: 2
  },
  {
    id: 'decline-bench-press',
    name: 'Decline Bench Press',
    type: 'bench',
    position: { x: 6.8, z: -16.2 },
    rotation: 0.38,
    radius: 3.1,
    staminaReward: 18,
    shakerReward: 2
  },
  {
    id: 'plate-loaded-chest-press',
    name: 'Plate-Loaded Chest Press',
    type: 'machine-press',
    position: { x: 16.0, z: 1.8 },
    rotation: -1.45,
    radius: 3.1,
    staminaReward: 20,
    shakerReward: 1
  },
  {
    id: 'shoulder-press-machine',
    name: 'Shoulder Press Machine',
    type: 'machine-press',
    position: { x: 14.2, z: 10.8 },
    rotation: -0.85,
    radius: 3.1,
    staminaReward: 20,
    shakerReward: 1
  },
  {
    id: 'lat-pulldown-machine',
    name: 'Lat Pulldown',
    type: 'lat-pulldown',
    position: { x: -16.0, z: -15.4 },
    rotation: 0.1,
    radius: 3.2,
    staminaReward: 20,
    shakerReward: 1
  },
  {
    id: 'seated-row-machine',
    name: 'Seated Row Machine',
    type: 'lat-pulldown',
    position: { x: -11.8, z: -16.1 },
    rotation: -0.15,
    radius: 3.2,
    staminaReward: 20,
    shakerReward: 1
  },
  {
    id: 'power-squat-rack',
    name: 'Power Squat Rack',
    type: 'squat-rack',
    position: { x: -13.8, z: -10.8 },
    rotation: 0.25,
    radius: 3.4,
    staminaReward: 24,
    shakerReward: 1
  },
  {
    id: 'hack-squat-machine',
    name: 'Hack Squat Machine',
    type: 'hack-squat',
    position: { x: -16.0, z: 14.6 },
    rotation: 0.75,
    radius: 3.2,
    staminaReward: 24,
    shakerReward: 1
  },
  {
    id: 'angled-leg-press',
    name: 'Angled Leg Press',
    type: 'leg-press',
    position: { x: -10.8, z: 15.8 },
    rotation: -0.45,
    radius: 3.2,
    staminaReward: 22,
    shakerReward: 1
  },
  {
    id: 'cable-tower',
    name: 'Cable Tower',
    type: 'cable',
    position: { x: 16.6, z: 6.8 },
    rotation: 0.6,
    radius: 3.2,
    staminaReward: 20,
    shakerReward: 1
  },
  {
    id: 'free-weights',
    name: 'Free Weights',
    type: 'free-weights',
    position: { x: -16.4, z: 7.4 },
    rotation: 0.45,
    radius: 3.4,
    staminaReward: 14,
    shakerReward: 2
  },
  {
    id: 'dumbbell-bench-left',
    name: 'Dumbbell Bench Row',
    type: 'free-weight-bench',
    position: { x: -9.2, z: 10.8 },
    rotation: 1.05,
    radius: 3.0,
    staminaReward: 16,
    shakerReward: 2
  },
  {
    id: 'dumbbell-bench-center',
    name: 'Adjustable Dumbbell Bench',
    type: 'free-weight-bench',
    position: { x: -5.1, z: 13.6 },
    rotation: 0.65,
    radius: 3.0,
    staminaReward: 16,
    shakerReward: 2
  },
  {
    id: 'dumbbell-bench-right',
    name: 'Heavy Dumbbell Bench',
    type: 'free-weight-bench',
    position: { x: 2.9, z: -16.1 },
    rotation: -0.25,
    radius: 3.0,
    staminaReward: 18,
    shakerReward: 2
  }
];

export const FREE_WEIGHT_PICKUPS: FreeWeightPickup[] = [
  {
    id: 'rack-dumbbell-light',
    name: 'Light Dumbbell',
    position: { x: -15.4, z: 7.0 }
  },
  {
    id: 'rack-dumbbell-heavy',
    name: 'Heavy Dumbbell',
    position: { x: -17.0, z: 7.9 }
  },
  {
    id: 'bench-row-dumbbell',
    name: 'Row Dumbbell',
    position: { x: -8.0, z: 10.0 }
  },
  {
    id: 'adjustable-bench-dumbbell',
    name: 'Bench Dumbbell',
    position: { x: -4.1, z: 12.8 }
  },
  {
    id: 'heavy-bench-dumbbell',
    name: 'Heavy Bench Dumbbell',
    position: { x: 3.9, z: -15.4 }
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
