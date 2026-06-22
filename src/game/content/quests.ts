import type { QuestDefinition } from '../types';

export const ACTIVE_QUEST_LIMIT = 3;

export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  {
    id: 'capture_common_2',
    title: 'Catch Common Crew',
    description: 'Capture 2 common creatures.',
    kind: 'capture-rarity',
    target: 2,
    reward: { xp: 40, steroids: 1 },
    oneTime: true
  },
  {
    id: 'use_steroid_1',
    title: 'Unreasonable Swole',
    description: 'Use 1 Steroid on a crew creature.',
    kind: 'use-steroid',
    target: 1,
    reward: { xp: 50 },
    oneTime: true
  },
  {
    id: 'capture_level_16',
    title: 'Step Up the Weight',
    description: 'Capture a level 16+ creature.',
    kind: 'capture-level',
    target: 1,
    reward: { xp: 70, steroids: 1 },
    oneTime: true
  },
  {
    id: 'win_boss_1',
    title: 'Boss Set Victory',
    description: 'Win 1 boss battle.',
    kind: 'boss-win',
    target: 1,
    reward: { xp: 90, steroids: 2, exoticSpawnBonus: 0.006 },
    oneTime: true
  },
  {
    id: 'find_exotic_1',
    title: 'Spot the Weird One',
    description: 'Find an exotic creature.',
    kind: 'find-exotic',
    target: 1,
    reward: { steroids: 2, exoticSpawnBonus: 0.008 },
    oneTime: true
  },
  {
    id: 'level_10',
    title: 'Double-Digit Beast',
    description: 'Level any creature to 10.',
    kind: 'level-creature',
    target: 1,
    reward: { xp: 100, steroids: 2, exoticSpawnBonus: 0.006 },
    oneTime: true
  }
];
