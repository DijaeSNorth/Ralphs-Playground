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
    id: 'buff-bunny',
    name: 'Buff Bunny',
    species: 'bunny',
    archetype: 'yogi',
    gender: 'woman',
    color: 0xf3af7b,
    accent: 0x7cc8ff,
    displayNames: ['Bouncy Repster', 'Beanbag Bouncer', 'Lift Bunny', 'Rope Bunny', 'Pump Bunny'],
    rarity: 'common',
    visualHints: {
      silhouette: 'mustelid',
      pattern: 'spots'
    },
    baseCatchRate: 0.9,
    staminaReward: 14
  },
  {
    id: 'bench-bear',
    name: 'Bench Bear',
    species: 'bear',
    archetype: 'lifter',
    gender: 'man',
    color: 0x9c6d45,
    accent: 0x2f4e6a,
    displayNames: ['Bench Bear', 'Iron Bench', 'Grizzly Press', 'Power Cub', 'Rally Bear'],
    rarity: 'uncommon',
    visualHints: {
      silhouette: 'ungulate',
      pattern: 'banded'
    },
    baseCatchRate: 0.86,
    staminaReward: 16
  },
  {
    id: 'flex-fox',
    name: 'Flex Fox',
    species: 'fox',
    archetype: 'runner',
    gender: 'man',
    color: 0xff9d66,
    accent: 0x4f3b2a,
    displayNames: ['Flex Fox', 'Dash Fox', 'Trail Blazer', 'Sprint Fox', 'Tactical Fox'],
    rarity: 'uncommon',
    visualHints: {
      silhouette: 'canine',
      pattern: 'stripes'
    },
    baseCatchRate: 0.85,
    staminaReward: 10
  },
  {
    id: 'iron-rhino',
    name: 'Iron Rhino',
    species: 'rhino',
    archetype: 'lifter',
    gender: 'man',
    color: 0x8b7d65,
    accent: 0xffcc4d,
    displayNames: ['Iron Rhino', 'Rhino Press', 'Steel Horn', 'Power Plow', 'Bulk Horn'],
    rarity: 'rare',
    visualHints: {
      silhouette: 'ungulate',
      pattern: 'banded'
    },
    baseCatchRate: 0.8,
    staminaReward: 16
  },
  {
    id: 'curl-corgi',
    name: 'Curl Corgi',
    species: 'corgi',
    archetype: 'spinner',
    gender: 'woman',
    color: 0xe7b68f,
    accent: 0xffcf73,
    displayNames: [
      'Curl Corgi',
      'Coil Corgi',
      'Corgi Curl',
      'Spoke Pup',
      'Bunny Butt Corgi'
    ],
    rarity: 'common',
    visualHints: {
      silhouette: 'canine',
      pattern: 'spots'
    },
    baseCatchRate: 0.89,
    staminaReward: 12
  },
  {
    id: 'deadlift-deer',
    name: 'Deadlift Deer',
    species: 'deer',
    archetype: 'lifter',
    gender: 'man',
    color: 0x9e7e58,
    accent: 0xdd9552,
    displayNames: [
      'Deadlift Deer',
      'Antler Split',
      'Pine Ridge Lifter',
      'Hornstack',
      'Backcountry Pull'
    ],
    rarity: 'uncommon',
    visualHints: {
      silhouette: 'ungulate',
      pattern: 'banded'
    },
    baseCatchRate: 0.85,
    staminaReward: 20
  },
  {
    id: 'jacked-jaguar',
    name: 'Jacked Jaguar',
    species: 'jaguar',
    archetype: 'climber',
    gender: 'man',
    color: 0xc35f3b,
    accent: 0x3d3328,
    displayNames: ['Jacked Jaguar', 'Jungle Charger', 'Predator Press', 'Spotted Stack', 'Jungle Jugger'],
    rarity: 'rare',
    visualHints: {
      silhouette: 'feline',
      pattern: 'spots'
    },
    baseCatchRate: 0.8,
    staminaReward: 18
  },
  {
    id: 'pump-panther',
    name: 'Pump Panther',
    species: 'panther',
    archetype: 'spinner',
    gender: 'man',
    color: 0x2f3b5e,
    accent: 0x54d98e,
    displayNames: ['Pump Panther', 'Steady Panther', 'Circuit Cat', 'Night Prowler', 'Rep Predator'],
    rarity: 'uncommon',
    visualHints: {
      silhouette: 'feline',
      pattern: 'spots'
    },
    baseCatchRate: 0.83,
    staminaReward: 18
  },
  {
    id: 'press-penguin',
    name: 'Press Penguin',
    species: 'penguin',
    archetype: 'yogi',
    gender: 'woman',
    color: 0xf4d8bf,
    accent: 0xff8a59,
    displayNames: ['Press Penguin', 'Tuxedo Press', 'Glide Press', 'Waddle Press', 'Beak Breaker'],
    rarity: 'uncommon',
    visualHints: {
      silhouette: 'avian',
      pattern: 'solid'
    },
    baseCatchRate: 0.84,
    staminaReward: 14
  },
  {
    id: 'rowing-raccoon',
    name: 'Rowing Raccoon',
    species: 'raccoon',
    archetype: 'runner',
    gender: 'man',
    color: 0x8c6548,
    accent: 0x3f5a7c,
    displayNames: ['Rowing Raccoon', 'Rib Cage Raccoon', 'Paddle Raccoon', 'Cyno Crusher', 'Rake Row'],
    rarity: 'common',
    visualHints: {
      silhouette: 'mustelid',
      pattern: 'banded'
    },
    baseCatchRate: 0.88,
    staminaReward: 13
  },
  {
    id: 'squat-squirrel',
    name: 'Squat Squirrel',
    species: 'squirrel',
    archetype: 'lifter',
    gender: 'woman',
    color: 0xaa875c,
    accent: 0xb45f2f,
    displayNames: ['Squat Squirrel', 'Nut Press', 'Cavity Crawler', 'Twig Squisher', 'Rusty Rack Squirrel'],
    rarity: 'uncommon',
    visualHints: {
      silhouette: 'mustelid',
      pattern: 'stripes'
    },
    baseCatchRate: 0.86,
    staminaReward: 15
  },
  {
    id: 'tricep-tiger',
    name: 'Tricep Tiger',
    species: 'tiger',
    archetype: 'spinner',
    gender: 'man',
    color: 0xffa24e,
    accent: 0xd84e35,
    displayNames: ['Tricep Tiger', 'Banded Curl', 'Tiger Pump', 'Orange Stack', 'Siberian Pump'],
    rarity: 'rare',
    visualHints: {
      silhouette: 'feline',
      pattern: 'stripes'
    },
    baseCatchRate: 0.78,
    staminaReward: 19
  },
  {
    id: 'bulk-buffalo',
    name: 'Bulk Buffalo',
    species: 'buffalo',
    archetype: 'lifter',
    gender: 'man',
    color: 0x87705a,
    accent: 0xe6b34f,
    displayNames: ['Bulk Buffalo', 'Hump Rack', 'Calf Drive', 'Bison Bench', 'Horned Hero'],
    rarity: 'rare',
    visualHints: {
      silhouette: 'ungulate',
      pattern: 'banded'
    },
    baseCatchRate: 0.8,
    staminaReward: 22
  },
  {
    id: 'minotaur-maximus',
    name: 'Minotaur Maximus',
    species: 'minotaur',
    archetype: 'lifter',
    gender: 'man',
    color: 0xa66a42,
    accent: 0xffc55f,
    displayNames: [
      'Minotaur Maximus',
      'Bulldozer Minotaur',
      'Labyrinth Lifter',
      'Bull Bench',
      'Horns of Gains'
    ],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'ungulate',
      pattern: 'banded'
    },
    mythicMetadata: {
      title: 'Labyrinth Grinder',
      note: 'A bull-horned titan with massive shoulders, playful horns, and arena-ready confidence.'
    },
    baseCatchRate: 0.4,
    staminaReward: 28
  },
  {
    id: 'griffin-gains',
    name: 'Griffin Gains',
    species: 'griffin',
    archetype: 'climber',
    gender: 'woman',
    color: 0x7a6a50,
    accent: 0xdc6a7c,
    displayNames: ['Griffin Gains', 'Aerial Gainz', 'Peak Flyer', 'Sky Presser', 'Clipper Curl'],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'avian',
      pattern: 'stripes'
    },
    mythicMetadata: {
      title: 'Vault Keeper',
      note: 'An eagle-bodied gym beast with winged momentum and a dramatic, comedic trophy posture.'
    },
    baseCatchRate: 0.4,
    staminaReward: 26
  },
  {
    id: 'dragon-deadlift',
    name: 'Dragon Deadlift',
    species: 'dragon',
    archetype: 'lifter',
    gender: 'man',
    color: 0x426b5e,
    accent: 0xff7e60,
    displayNames: [
      'Dragon Deadlift',
      'Backplate Drake',
      'Scale-Press',
      'Ember Grinder',
      'Deadlift wyrm'
    ],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'reptilian',
      pattern: 'solid'
    },
    mythicMetadata: {
      title: 'Iron Wyrm',
      note: 'A heavy-tailed, crest-backed draconic lifter with a dramatic glow and stacked pecs.'
    },
    baseCatchRate: 0.4,
    staminaReward: 30
  },
  {
    id: 'cyclops-curl',
    name: 'Cyclops Curl',
    species: 'cyclops',
    archetype: 'spinner',
    gender: 'woman',
    color: 0x6c5b8f,
    accent: 0x66d7f1,
    displayNames: ['Cyclops Curl', 'One-Eye Press', 'Titan Curl', 'Focus Cyclops', 'Prime Peep'],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'canine',
      pattern: 'solid'
    },
    mythicMetadata: {
      title: 'Cycloid Liftmaster',
      note: 'A one-eyed muscle comic of mythic origin with a giant anchor brow and absurd raw power.'
    },
    baseCatchRate: 0.4,
    staminaReward: 25
  },
  {
    id: 'swole-gorilla',
    name: 'Swole Gorilla',
    species: 'gorilla',
    archetype: 'climber',
    gender: 'woman',
    color: 0x6f6f6c,
    accent: 0xd8a64f,
    displayNames: ['Swole Gorilla', 'Gorilla Grind', 'Concrete Ape', 'Bench Bruiser', 'Shoulder Stack'],
    rarity: 'rare',
    visualHints: {
      silhouette: 'canine',
      pattern: 'solid'
    },
    baseCatchRate: 0.82,
    staminaReward: 24
  },
  {
    id: 'chrome-rhino',
    name: 'Chrome Rhino',
    species: 'rhino',
    archetype: 'spinner',
    gender: 'woman',
    color: 0x7a8ca3,
    accent: 0xffcf62,
    displayNames: ['Chrome Rhino', 'Alloy Rhino', 'Titan Hide', 'Prime Rhino', 'Chrome Tusk'],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'ungulate',
      pattern: 'solid'
    },
    mythicMetadata: {
      title: 'Titan Alloy',
      note: 'An original biomechanical rhino concept with reinforced horns and ironhide musculature.'
    },
    baseCatchRate: 0.4,
    staminaReward: 24
  },
  {
    id: 'hydra-hypertrophy',
    name: 'Hydra Hypertrophy',
    species: 'hydra',
    archetype: 'climber',
    gender: 'man',
    color: 0x6e6a5c,
    accent: 0x9f5f44,
    displayNames: [
      'Hydra Hypertrophy',
      'Neck Stack Hydra',
      'Multi-Head Hype',
      'Serpent Rep',
      'Hydra Rack'
    ],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'reptilian',
      pattern: 'stripes'
    },
    mythicMetadata: {
      title: 'Seven-Neck Beast',
      note: 'A many-necked scale-beast with a dramatic, overcaffeinated pump and a lot of personality.'
    },
    baseCatchRate: 0.4,
    staminaReward: 29
  },
  {
    id: 'pegasus-pump',
    name: 'Pegasus Pump',
    species: 'pegasus',
    archetype: 'spinner',
    gender: 'woman',
    color: 0x6f89b6,
    accent: 0xffcc66,
    displayNames: ['Pegasus Pump', 'Cloud Charger', 'Heavenly Press', 'Winged Lifter', 'Winged Pump'],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'avian',
      pattern: 'solid'
    },
    mythicMetadata: {
      title: 'Skyline Finisher',
      note: 'A winged cloud-hued charger who turns every rep into a dramatic dive-bomb.'
    },
    baseCatchRate: 0.4,
    staminaReward: 27
  },
  {
    id: 'werewolf-warrior',
    name: 'Werewolf Warrior',
    species: 'werewolf',
    archetype: 'lifter',
    gender: 'man',
    color: 0x8f6149,
    accent: 0x1f2126,
    displayNames: ['Werewolf Warrior', 'Lupine Lifter', 'Moonlift Mutant', 'Claw Press', 'Feral Finisher'],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'canine',
      pattern: 'banded'
    },
    mythicMetadata: {
      title: 'Full Moon Gym Hero',
      note: 'A wolf-bodied grappler with furry ears, beastly shoulders, and a stubborn gym rhythm.'
    },
    baseCatchRate: 0.4,
    staminaReward: 30
  },
  {
    id: 'kraken-curl',
    name: 'Kraken Curl',
    species: 'kraken',
    archetype: 'spinner',
    gender: 'woman',
    color: 0x4d5a75,
    accent: 0x71a3ff,
    displayNames: ['Kraken Curl', 'Tentacle Tension', 'Deep Curl Kraken', 'Abyssal Pump', 'Sea Stack'],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'reptilian',
      pattern: 'banded'
    },
    mythicMetadata: {
      title: 'Submarine Splitter',
      note: 'A tidal tentacle specialist built to anchor the floor and still swing a grin through water and dust.'
    },
    baseCatchRate: 0.4,
    staminaReward: 28
  },
  {
    id: 'sphinx-strength',
    name: 'Sphinx Strength',
    species: 'sphinx',
    archetype: 'climber',
    gender: 'woman',
    color: 0xc28f52,
    accent: 0x2f3f3b,
    displayNames: ['Sphinx Strength', 'Royal Squeeze', 'Monumental Lift', 'Sphinx Set', 'Desert Deck'],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'feline',
      pattern: 'banded'
    },
    mythicMetadata: {
      title: 'Sand Temple Sentry',
      note: 'A regal feline titan with a lion chest and ceremonial crest, forever guarding the gym gate.'
    },
    baseCatchRate: 0.4,
    staminaReward: 31
  },
  {
    id: 'phoenix-flex',
    name: 'Phoenix Flex',
    species: 'phoenix',
    archetype: 'yogi',
    gender: 'woman',
    color: 0xff9f52,
    accent: 0xffe08a,
    displayNames: ['Phoenix Flex', 'Ashline Flexer', 'Flare Foe', 'Heat Rep Flex', 'Blaze Flex'],
    rarity: 'exotic',
    isExotic: true,
    visualHints: {
      silhouette: 'avian',
      pattern: 'spots'
    },
    mythicMetadata: {
      title: 'Rebirth Reps',
      note: 'A flame-wreathed avian who arrives with hot air, theatrical tail feathers, and endless energy.'
    },
    baseCatchRate: 0.4,
    staminaReward: 29
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
