import type { BuddyDefinition } from '../types';

export const BUDDY_DEFINITIONS: BuddyDefinition[] = [
  {
    id: 'mat-maven',
    name: 'Mat Maven',
    archetype: 'yogi',
    color: 0x3bb6a3,
    accent: 0xffc55c,
    rarity: 'common',
    baseCatchRate: 0.72,
    staminaReward: 12
  },
  {
    id: 'tempo-trotter',
    name: 'Tempo Trotter',
    archetype: 'runner',
    color: 0xff715b,
    accent: 0x1f9dd2,
    rarity: 'common',
    baseCatchRate: 0.68,
    staminaReward: 10
  },
  {
    id: 'kettle-pal',
    name: 'Kettle Pal',
    archetype: 'lifter',
    color: 0x6f7bd9,
    accent: 0xd9ec5c,
    rarity: 'uncommon',
    baseCatchRate: 0.58,
    staminaReward: 16
  },
  {
    id: 'cadence-captain',
    name: 'Cadence Captain',
    archetype: 'spinner',
    color: 0xf08ac6,
    accent: 0x54d98e,
    rarity: 'uncommon',
    baseCatchRate: 0.52,
    staminaReward: 18
  },
  {
    id: 'chalk-champ',
    name: 'Chalk Champ',
    archetype: 'climber',
    color: 0xf0a23b,
    accent: 0x384d63,
    rarity: 'rare',
    baseCatchRate: 0.44,
    staminaReward: 24
  }
];

export const BUDDY_BY_ID = new Map(BUDDY_DEFINITIONS.map((buddy) => [buddy.id, buddy]));

export function getBuddyDefinition(id: string): BuddyDefinition {
  const definition = BUDDY_BY_ID.get(id);

  if (!definition) {
    throw new Error(`Unknown buddy definition: ${id}`);
  }

  return definition;
}
