import type { BuddyDefinition, BuddyPassive } from '../types';

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

type BuddyDefinitionDraft = Omit<BuddyDefinition, 'passive'>;

const BUDDY_PASSIVES: Record<string, BuddyPassive> = {
  'buff-bunny': {
    id: 'quick-hop',
    name: 'Quick Hop',
    effect: 'movement-speed',
    value: 0.035,
    description: '+3.5% movement speed while in crew.'
  },
  'bench-bear': {
    id: 'chest-day-aura',
    name: 'Chest Day Aura',
    effect: 'strength-training',
    value: 0.12,
    description: 'Small chance for bonus strength from crew workouts.'
  },
  'flex-fox': {
    id: 'sneaky-stack',
    name: 'Sneaky Stack',
    effect: 'steroid-boost',
    value: 0.1,
    description: 'Steroids have a small chance to add extra stats.'
  },
  'iron-rhino': {
    id: 'iron-hide-cardio',
    name: 'Iron Hide Cardio',
    effect: 'stamina-saver',
    value: 0.07,
    description: 'Reduces stamina loss by 7% while in crew.'
  },
  'curl-corgi': {
    id: 'short-stride-sprint',
    name: 'Short-Stride Sprint',
    effect: 'sprint-recovery',
    value: 0.08,
    description: '+8% stamina recovery after sprinting.'
  },
  'deadlift-deer': {
    id: 'antler-leverage',
    name: 'Antler Leverage',
    effect: 'strength-training',
    value: 0.09,
    description: 'Small chance for bonus strength from crew workouts.'
  },
  'jacked-jaguar': {
    id: 'silent-footwork',
    name: 'Silent Footwork',
    effect: 'movement-speed',
    value: 0.04,
    description: '+4% movement speed while in crew.'
  },
  'pump-panther': {
    id: 'night-tempo',
    name: 'Night Tempo',
    effect: 'sprint-recovery',
    value: 0.1,
    description: '+10% stamina recovery after sprinting.'
  },
  'press-penguin': {
    id: 'cooldown-waddle',
    name: 'Cooldown Waddle',
    effect: 'stamina-saver',
    value: 0.05,
    description: 'Reduces stamina loss by 5% while in crew.'
  },
  'rowing-raccoon': {
    id: 'trash-boat-tempo',
    name: 'Trash-Boat Tempo',
    effect: 'sprint-recovery',
    value: 0.07,
    description: '+7% stamina recovery after sprinting.'
  },
  'squat-squirrel': {
    id: 'micro-plate-hustle',
    name: 'Micro-Plate Hustle',
    effect: 'steroid-boost',
    value: 0.08,
    description: 'Steroids have a small chance to add extra stats.'
  },
  'tricep-tiger': {
    id: 'striped-set-power',
    name: 'Striped Set Power',
    effect: 'boss-power',
    value: 0.08,
    description: '+8% crew power in boss challenges.'
  },
  'bulk-buffalo': {
    id: 'herd-momentum',
    name: 'Herd Momentum',
    effect: 'stamina-saver',
    value: 0.08,
    description: 'Reduces stamina loss by 8% while in crew.'
  },
  'minotaur-maximus': {
    id: 'labyrinth-roar',
    name: 'Labyrinth Roar',
    effect: 'boss-power',
    value: 0.15,
    description: '+15% crew power in boss challenges.'
  },
  'griffin-gains': {
    id: 'sky-spotter',
    name: 'Sky Spotter',
    effect: 'movement-speed',
    value: 0.08,
    description: '+8% movement speed while in crew.'
  },
  'dragon-deadlift': {
    id: 'hoarder-lockout',
    name: 'Hoarder Lockout',
    effect: 'strength-training',
    value: 0.18,
    description: 'Strong chance for bonus strength from crew workouts.'
  },
  'cyclops-curl': {
    id: 'single-eye-focus',
    name: 'Single-Eye Focus',
    effect: 'steroid-boost',
    value: 0.16,
    description: 'Steroids have a better chance to add extra stats.'
  },
  'swole-gorilla': {
    id: 'ape-challenge-roar',
    name: 'Ape Challenge Roar',
    effect: 'boss-power',
    value: 0.1,
    description: '+10% crew power in boss challenges.'
  },
  'chrome-rhino': {
    id: 'alloy-lungs',
    name: 'Alloy Lungs',
    effect: 'stamina-saver',
    value: 0.13,
    description: 'Reduces stamina loss by 13% while in crew.'
  },
  'hydra-hypertrophy': {
    id: 'many-neck-hype',
    name: 'Many-Neck Hype',
    effect: 'strength-training',
    value: 0.16,
    description: 'Strong chance for bonus strength from crew workouts.'
  },
  'pegasus-pump': {
    id: 'cloud-recovery',
    name: 'Cloud Recovery',
    effect: 'sprint-recovery',
    value: 0.16,
    description: '+16% stamina recovery after sprinting.'
  },
  'werewolf-warrior': {
    id: 'moon-howl-power',
    name: 'Moon Howl Power',
    effect: 'boss-power',
    value: 0.14,
    description: '+14% crew power in boss challenges.'
  },
  'kraken-curl': {
    id: 'tentacle-grip',
    name: 'Tentacle Grip',
    effect: 'steroid-boost',
    value: 0.15,
    description: 'Steroids have a better chance to add extra stats.'
  },
  'sphinx-strength': {
    id: 'riddle-guard',
    name: 'Riddle Guard',
    effect: 'stamina-saver',
    value: 0.12,
    description: 'Reduces stamina loss by 12% while in crew.'
  },
  'phoenix-flex': {
    id: 'rebirth-stride',
    name: 'Rebirth Stride',
    effect: 'sprint-recovery',
    value: 0.15,
    description: '+15% stamina recovery after sprinting.'
  }
};

const BUDDY_DEFINITION_DRAFTS: BuddyDefinitionDraft[] = [
  {
    id: 'buff-bunny',
    name: 'Buff Bunny',
    species: 'bunny',
    archetype: 'yogi',
    gender: 'woman',
    description: 'Looks cute until it starts curling dumbbells with its ears.',
    flavorText: 'Cute chaos with a serious bench for tiny paws.',
    personalityTag: 'Cuteness tax champ',
    favoriteWorkout: 'Cable curls',
    reactionLines: {
      victory: 'Buff Bunny nods and flexes one smug ear-raise.',
      cry: 'Buff Bunny whines dramatically and flops onto a nearby crate.'
    },
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
    description: 'Sleeps through cardio. Wakes up for chest day.',
    flavorText: 'A cuddly tank who benches everyone into respect.',
    personalityTag: 'Chest-day alarm clock',
    favoriteWorkout: 'Bench press',
    reactionLines: {
      victory: 'Bench Bear hits one loud reset and calls it clean form.',
      cry: 'Bench Bear drops one paw on the floor and asks for a better set.'
    },
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
    description: 'Moves fast, talks fast, and calls every rep a tactical gain.',
    flavorText: 'Sly energy with an impossible grin and perfect footwork.',
    personalityTag: 'Lane-switch strategist',
    favoriteWorkout: 'Sprint intervals',
    reactionLines: {
      victory: 'Flex Fox winks and claims it was all warmup energy.',
      cry: 'Flex Fox shrugs, then pretends that was just a speed drill.'
    },
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
    description: 'Charges hard, then remembers to count reps before the second set.',
    flavorText: 'A freight-train gym beast with a polite, thunderous approach.',
    personalityTag: 'Rampage interval',
    favoriteWorkout: 'Front squats',
    reactionLines: {
      victory: 'Iron Rhino points its horn at the sky and claims dominance.',
      cry: 'Iron Rhino snorts hard and asks for longer warmups next time.'
    },
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
    description: 'Short legs, long ambitions, and a bark made for PR moments.',
    flavorText: 'Tiny frame, giant spirit, and a relentless curl tempo.',
    personalityTag: 'Short-run big dreams',
    favoriteWorkout: 'Dumbbell curls',
    reactionLines: {
      victory: 'Curl Corgi barks once and performs a victory pup shuffle.',
      cry: 'Curl Corgi whimpers, then steals the next dumbbell.'
    },
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
    description: 'Elegant before the pull, ruthless during the lockout.',
    flavorText: 'Graceful movement, fierce lockout, zero drama until needed.',
    personalityTag: 'Hallway hype manager',
    favoriteWorkout: 'Conventional deadlift',
    reactionLines: {
      victory: 'Deadlift Deer drops to one knee and drags the floor line home.',
      cry: 'Deadlift Deer stumbles once and blames the ground friction.'
    },
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
    description: 'Silent, explosive, and proud of every perfectly timed rep.',
    flavorText: 'A feline power source that judges form before compliments.',
    personalityTag: 'Predator of PRs',
    favoriteWorkout: 'Pull-ups',
    reactionLines: {
      victory: 'Jacked Jaguar prowls a small circle and taps its chest in approval.',
      cry: 'Jacked Jaguar growls in mock offense and ghosts the area.'
    },
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
    description: 'Paces every set like a metronome and refuses sloppy tempo.',
    flavorText: 'A nightly prowler with strict interval discipline.',
    personalityTag: 'Tempo perfectionist',
    favoriteWorkout: 'Shoulder press',
    reactionLines: {
      victory: 'Pump Panther gives a clean nod and resets posture instantly.',
      cry: 'Pump Panther collapses for one breath and files a form complaint.'
    },
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
    description: 'Marches in with a tuxedo and surprisingly strict bench etiquette.',
    flavorText: 'A formal athlete with a soft clap and serious motivation.',
    personalityTag: 'Pacing perfectionist',
    favoriteWorkout: 'Bench press',
    reactionLines: {
      victory: 'Press Penguin taps its feet and bows after the final rep.',
      cry: 'Press Penguin slips on a flipper step and retreats with dignity.'
    },
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
    description: 'Counts imaginary strokes and expects everyone to match pace.',
    flavorText: 'A chatterbox with oars in spirit and ambition in bulk.',
    personalityTag: 'Stroke-cue commentator',
    favoriteWorkout: 'Rowing machine',
    reactionLines: {
      victory: 'Rowing Raccoon shrugs, then leads one extra victory sprint.',
      cry: 'Rowing Raccoon drops its paddle and blames momentum.'
    },
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
    description: 'Tiny body, terrifying plank count, and zero mercy on form.',
    flavorText: 'Tiny paws, huge confidence, and a very loud rep count.',
    personalityTag: 'Micro-plate zealot',
    favoriteWorkout: 'Back squats',
    reactionLines: {
      victory: 'Squat Squirrel throws up a tiny flag and grins.',
      cry: 'Squat Squirrel bites back a chipper squeak and retreats fast.'
    },
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
    description: 'Orange fury with strict rest intervals and loud confidence.',
    flavorText: 'Keeps an iron lung and an even louder one-liner.',
    personalityTag: 'Two-step rep strictist',
    favoriteWorkout: 'Triceps extensions',
    reactionLines: {
      victory: 'Tricep Tiger flexes hard and starts counting imaginary points.',
      cry: 'Tricep Tiger blinks, resets its timer, and calls it a close set.'
    },
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
    description: 'Built for long sets and ridiculously loud motivation.',
    flavorText: 'A deep-voice motivator that wants every plate on deck.',
    personalityTag: 'Bulked-up coach',
    favoriteWorkout: 'Leg press',
    reactionLines: {
      victory: 'Bulk Buffalo bellows a winner\'s roar and drops a set count.',
      cry: 'Bulk Buffalo snorts through a pout and storms the corner.'
    },
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
    description: 'A mythic lifter who treats every rep like a maze challenge.',
    flavorText: 'A labyrinth champion with overconfident, theatrical form.',
    personalityTag: 'Labyrinth gym bro',
    favoriteWorkout: 'Power cleans',
    reactionLines: {
      victory: 'Minotaur Maximus puffs out its chest and bows to the crowd.',
      cry: 'Minotaur Maximus shrugs one horn and charges for one extra warmup.'
    },
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
    description: 'Eagle-lion hybrid that hoards both trophies and compliments.',
    flavorText: 'Aerial drama with excellent shoulder carryover.',
    personalityTag: 'Sky-bound show-off',
    favoriteWorkout: 'Pull-up holds',
    reactionLines: {
      victory: 'Griffin Gains flares its wings and lands like a stage entrance.',
      cry: 'Griffin Gains lets out one sharp cry and glides to regroup.'
    },
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
    description: 'Guards treasure, protein, and poor lifting form.',
    flavorText: 'A scaled titan who charges into deadlifts like a boss music moment.',
    personalityTag: 'Treasure-guard lifter',
    favoriteWorkout: 'Deadlift',
    reactionLines: {
      victory: 'Dragon Deadlift exhales a hot breath and claims ownership of the bar.',
      cry: 'Dragon Deadlift shrugs its wings and promises a rematch.'
    },
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
    description: 'One eye, one mindset, and a clean, brutal curl style.',
    flavorText: 'Focus narrowed to the rep, with almost no room for excuses.',
    personalityTag: 'One-eye focus',
    favoriteWorkout: 'EZ-bar curls',
    reactionLines: {
      victory: 'Cyclops Curl gives a small nod and keeps the tempo strict.',
      cry: 'Cyclops Curl blinks once and blames its own timing.'
    },
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
    description: 'Massive shoulders, tiny sarcasm, and surprisingly crisp technique.',
    flavorText: 'A towering trainer who thinks every encounter is a group session.',
    personalityTag: 'Bench bro boss',
    favoriteWorkout: 'Incline press',
    reactionLines: {
      victory: 'Swole Gorilla whoops once and pounds the ground like a drum.',
      cry: 'Swole Gorilla drops into a mock slump and asks for more warmup.'
    },
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
    description: 'Machine-grade myth with glowing confidence and polished ego.',
    flavorText: 'A biomech build built to impress and annoy in equal doses.',
    personalityTag: 'Neon-core bruiser',
    favoriteWorkout: 'Machine presses',
    reactionLines: {
      victory: 'Chrome Rhino beeps once, then pumps twice.',
      cry: 'Chrome Rhino glitches loud and powers down the drama.'
    },
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
    description: 'Every head has a playlist, so every set gets extra tempo.',
    flavorText: 'A multi-headed pump specialist with synchronized chaos.',
    personalityTag: 'Multi-tasking menace',
    favoriteWorkout: 'Biceps curls',
    reactionLines: {
      victory: 'Hydra Hypertrophy raises every head for a synchronized nod.',
      cry: 'Hydra Hypertrophy shouts in seven directions and vanishes.'
    },
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
    description: 'Turns every set into a dramatic dive-bomb and landing.',
    flavorText: 'Sky-level confidence with a flair for impossible angles.',
    personalityTag: 'Cloud-top coach',
    favoriteWorkout: 'Overhead press',
    reactionLines: {
      victory: 'Pegasus Pump lands in a stylish pose and points at the ceiling.',
      cry: 'Pegasus Pump spirals once and calls it a tactical retreat.'
    },
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
    description: 'Moon calls, then remembers to finish the rep sequence.',
    flavorText: 'Feral power with a stubborn, funny sense of timing.',
    personalityTag: 'Full-moon competitor',
    favoriteWorkout: 'Sled pushes',
    reactionLines: {
      victory: 'Werewolf Warrior growls once and stands taller for a final clap.',
      cry: 'Werewolf Warrior mumbles about bad moon phase and slips away.'
    },
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
    description: 'Comes up from depth with a grip that steals your confidence.',
    flavorText: 'Tentacle strength with a very dramatic sense of timing.',
    personalityTag: 'Depth-first motivator',
    favoriteWorkout: 'Cable curls',
    reactionLines: {
      victory: 'Kraken Curl lifts two triumphant limbs into the air.',
      cry: 'Kraken Curl waves a final arm and drifts into the dark.'
    },
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
    description: 'Ancient, theatrical, and somehow very aware of skipped warmups.',
    flavorText: 'A regal giant that judges your setup before your effort.',
    personalityTag: 'Desert sage',
    favoriteWorkout: 'Sandbag carries',
    reactionLines: {
      victory: 'Sphinx Strength raises both paws and seals the rep with a riddle.',
      cry: 'Sphinx Strength narrows one eye and fades into the shadows.'
    },
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
    description: 'Burns bright, burns out, then revives for one extra round.',
    flavorText: 'A flame-flagged showpiece with endless pep talk potential.',
    personalityTag: 'Flame-forged hype',
    favoriteWorkout: 'Push-ups',
    reactionLines: {
      victory: 'Phoenix Flex flares bright and adds one extra victory rep.',
      cry: 'Phoenix Flex smolders, then pretends it was stretching.'
    },
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

function attachPassive(draft: BuddyDefinitionDraft): BuddyDefinition {
  const passive = BUDDY_PASSIVES[draft.id];

  if (!passive) {
    throw new Error(`Missing buddy passive: ${draft.id}`);
  }

  return {
    ...draft,
    passive
  };
}

export const BUDDY_DEFINITIONS: BuddyDefinition[] = BUDDY_DEFINITION_DRAFTS.map(attachPassive);

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
