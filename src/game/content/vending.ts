import { VENDING_BALANCE } from './balance';
import type { Vec2, VendingMachine } from '../types';

export const VENDING_MACHINES: VendingMachine[] = [
  {
    id: 'fuel-vending',
    name: 'Fuel Vending',
    position: { x: 16.1, z: -2.8 },
    radius: 3.1,
    energyDrinkCost: VENDING_BALANCE.energyDrinkCost,
    energyDrinkStamina: VENDING_BALANCE.energyDrinkStamina,
    snackStamina: VENDING_BALANCE.snackStamina,
    snackCrewEnergy: VENDING_BALANCE.snackCrewEnergy,
    snackCooldown: VENDING_BALANCE.snackCooldown
  }
];

export function getNearestVendingMachine(
  position: Vec2,
  maxDistance = 3.1
): { machine: VendingMachine; distance: number } | undefined {
  let nearest: { machine: VendingMachine; distance: number } | undefined;

  for (const machine of VENDING_MACHINES) {
    const distance = Math.hypot(position.x - machine.position.x, position.z - machine.position.z);

    if (distance > Math.max(maxDistance, machine.radius)) {
      continue;
    }

    if (!nearest || distance < nearest.distance) {
      nearest = { machine, distance };
    }
  }

  return nearest;
}
