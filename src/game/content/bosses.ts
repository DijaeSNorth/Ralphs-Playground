import type { BossDefinition } from '../types';

export const BOSS_DEFINITIONS: BossDefinition[] = [
  {
    id: 'plate-titan',
    name: 'Plate Titan',
    color: 0x394b5f,
    accent: 0xf6c85f,
    strength: 34,
    endurance: 18,
    focus: 16
  },
  {
    id: 'rep-reaper',
    name: 'Rep Reaper',
    color: 0x7c496d,
    accent: 0x5dd29a,
    strength: 22,
    endurance: 24,
    focus: 28
  },
  {
    id: 'bulk-baron',
    name: 'Bulk Baron',
    color: 0xb65f45,
    accent: 0x21a7a5,
    strength: 28,
    endurance: 28,
    focus: 18
  }
];

export const BOSS_BY_ID = new Map(BOSS_DEFINITIONS.map((boss) => [boss.id, boss]));

export function getBossDefinition(id: string): BossDefinition {
  const definition = BOSS_BY_ID.get(id);

  if (!definition) {
    throw new Error(`Unknown boss definition: ${id}`);
  }

  return definition;
}
