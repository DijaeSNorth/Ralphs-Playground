import type { BuddyDefinition } from '../types';

const WOMEN_FRIENDLY_BUDDY_NAMES = [
  'Muscle Mommy',
  'Lift Queen',
  'Strength Sister',
  'Iron Lady',
  'Rep Royalty',
  'Gainz Goddess',
  'Power Mama',
  'Plate Queen',
  'She-Lifts',
  'Athlete Anthem'
];

export const BUDDY_DEFINITIONS: BuddyDefinition[] = [
  {
    id: 'mat-maven',
    name: 'Mat Maven',
    archetype: 'yogi',
    gender: 'woman',
    color: 0x3bb6a3,
    accent: 0xffc55c,
    displayNames: ['Mat Maven', 'Flow Maven', 'Calm Lifter', 'Muscle Mommy', 'Yoga Captain'],
    rarity: 'common',
    baseCatchRate: 0.72,
    staminaReward: 12
  },
  {
    id: 'tempo-trotter',
    name: 'Tempo Trotter',
    archetype: 'runner',
    gender: 'man',
    color: 0xff715b,
    accent: 0x1f9dd2,
    displayNames: ['Tempo Trotter', 'Rep Sprinter', 'Lift Runner', 'Rhythm Coach', 'Energy Queen'],
    rarity: 'common',
    baseCatchRate: 0.68,
    staminaReward: 10
  },
  {
    id: 'kettle-pal',
    name: 'Kettle Pal',
    archetype: 'lifter',
    gender: 'woman',
    color: 0x6f7bd9,
    accent: 0xd9ec5c,
    displayNames: ['Kettle Pal', 'Bench Brawler', 'Power Mama', 'Barbell Belle', 'Dumbbell Duchess'],
    rarity: 'uncommon',
    baseCatchRate: 0.58,
    staminaReward: 16
  },
  {
    id: 'cadence-captain',
    name: 'Cadence Captain',
    archetype: 'spinner',
    gender: 'man',
    color: 0xf08ac6,
    accent: 0x54d98e,
    displayNames: ['Cadence Captain', 'Rep Captain', 'Tempo Titan', 'Lift Leader', 'Flow Commander'],
    rarity: 'uncommon',
    baseCatchRate: 0.52,
    staminaReward: 18
  },
  {
    id: 'chalk-champ',
    name: 'Chalk Champ',
    archetype: 'climber',
    gender: 'woman',
    color: 0xf0a23b,
    accent: 0x384d63,
    displayNames: ['Chalk Champ', 'Chalk Queen', 'Heavy Hitter', 'Iron Coach', 'Strength Sage'],
    rarity: 'rare',
    baseCatchRate: 0.44,
    staminaReward: 24
  }
];

export const BUDDY_BY_ID = new Map(BUDDY_DEFINITIONS.map((buddy) => [buddy.id, buddy]));

export function getRandomBuddyName(definitionId: string): string {
  const definition = getBuddyDefinition(definitionId);
  const candidates = Array.from(
    new Set([definition.name, ...(definition.displayNames ?? []), ...WOMEN_FRIENDLY_BUDDY_NAMES])
  );

  return candidates[Math.floor(Math.random() * candidates.length)] ?? definition.name;
}

export function getBuddyDefinition(id: string): BuddyDefinition {
  const definition = BUDDY_BY_ID.get(id);

  if (!definition) {
    throw new Error(`Unknown buddy definition: ${id}`);
  }

  return definition;
}
