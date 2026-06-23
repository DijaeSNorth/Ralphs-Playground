import { BUDDY_DEFINITIONS } from './content/buddies';
import { QUEST_DEFINITIONS } from './content/quests';
import {
  DEFAULT_PLAYER_APPEARANCE,
  normalizeBodyFrame,
  normalizeHairStyle,
  normalizeMuscleBuild
} from './content/playerAppearance';
import { recordRuntimeError } from './runtimeErrors';
import type {
  BodySizeKey,
  BuddyBodyTraits,
  CharacterSex,
  PlayerAppearance,
  ProgressGoals,
  QuestStates,
  SkinTone
} from './types';

export const SAVE_DATA_VERSION = 1;
export const SAVE_STORAGE_KEY = 'gym-buddy-swole-safari-save';
export const SAVE_BACKUP_STORAGE_PREFIX = `${SAVE_STORAGE_KEY}-bad-backup`;

export type SavedRosterStatus = 'ready' | 'training' | 'needs-spot';
export type SavedTaskOutcome = 'success' | 'needs-spot';

export type SavedProgressRosterEntry = {
  rosterId: number;
  definitionId: string;
  bodyTraits: BuddyBodyTraits;
  displayName?: string;
  capturedAt?: number;
  level: number;
  xp: number;
  strength: number;
  endurance: number;
  focus: number;
  energy: number;
  status: SavedRosterStatus;
  taskLabel?: string;
  taskStationId?: string;
  taskOutcome?: SavedTaskOutcome;
  taskTimer: number;
  taskDuration: number;
};

export type SavedRepDexEntry = {
  definitionId: string;
  count: number;
  highestLevel: number;
};

export type SavedProgress = {
  version: number;
  timestamp: number;
  tutorialCompleted: boolean;
  appearance: PlayerAppearance;
  goals: ProgressGoals;
  quests: QuestStates;
  player: {
    position: { x: number; z: number };
    heading: number;
    stamina: number;
    proteinShakers: number;
    steroids: number;
    capturedTotal: number;
  };
  roster: SavedProgressRosterEntry[];
  storage: SavedProgressRosterEntry[];
  repDex: SavedRepDexEntry[];
  capturedTotal: number;
  progressionTier: number;
  bossExoticBoost: number;
  nextIds: {
    nextBuddyId: number;
    nextRosterId: number;
    nextBossId: number;
    nextFreeWeightId: number;
  };
};

const LEGACY_ROSTER_STATUS: SavedRosterStatus[] = ['ready', 'training', 'needs-spot'];
const LEGACY_TASK_OUTCOMES: SavedTaskOutcome[] = ['success', 'needs-spot'];
const DEFINITION_IDS = new Set(BUDDY_DEFINITIONS.map((definition) => definition.id));
const DEFAULT_GOALS: ProgressGoals = {
  capture_first: { completed: false, progress: 0 },
  workout_first: { completed: false, progress: 0 },
  workout_3: { completed: false, progress: 0 },
  capture_3: { completed: false, progress: 0 },
  capture_6: { completed: false, progress: 0 },
  capture_10: { completed: false, progress: 0 },
  encounter_exotic: { completed: false, progress: 0 },
  capture_first_exotic: { completed: false, progress: 0 },
  roster_level_5_any: { completed: false, progress: 0 },
  roster_level_10_any: { completed: false, progress: 0 },
  boss_first_win: { completed: false, progress: 0 },
  repdex_quarter: { completed: false, progress: 0 },
  repdex_half: { completed: false, progress: 0 }
};

function createDefaultQuests(): QuestStates {
  return Object.fromEntries(
    QUEST_DEFINITIONS.map((quest) => [quest.id, { completed: false, progress: 0 }])
  ) as QuestStates;
}

const DEFAULT_QUESTS = createDefaultQuests();

const DEFAULT_BODY_TRAITS: BuddyBodyTraits = {
  chest: 1,
  wings: 1,
  glutes: 1,
  thighs: 1,
  calfs: 1
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, value));
}

function toInteger(value: unknown, fallback = 0): number {
  return Number.isFinite(value as number) ? Math.trunc(value as number) : fallback;
}

function sanitizeStatus(value: unknown): SavedRosterStatus {
  if (typeof value === 'string' && LEGACY_ROSTER_STATUS.includes(value as SavedRosterStatus)) {
    return value as SavedRosterStatus;
  }

  return 'ready';
}

function sanitizeTaskOutcome(value: unknown): SavedTaskOutcome | undefined {
  if (typeof value === 'string' && LEGACY_TASK_OUTCOMES.includes(value as SavedTaskOutcome)) {
    return value as SavedTaskOutcome;
  }

  return undefined;
}

function sanitizeTutorialCompleted(value: unknown): boolean {
  return value === true;
}

function sanitizeAppearance(raw: unknown): PlayerAppearance {
  const source = isObject(raw) ? raw : {};
  const bodySource = isObject(source.body) ? source.body : {};
  const body = { ...DEFAULT_PLAYER_APPEARANCE.body };

  (Object.keys(body) as BodySizeKey[]).forEach((key) => {
    body[key] = clampNumber(bodySource[key], 0.75, 1.55, DEFAULT_PLAYER_APPEARANCE.body[key]);
  });

  const sex: CharacterSex = source.sex === 'woman' ? 'woman' : 'man';
  const skinTone: SkinTone =
    source.skinTone === 'light' || source.skinTone === 'deep' || source.skinTone === 'warm'
      ? source.skinTone
      : DEFAULT_PLAYER_APPEARANCE.skinTone;

  return {
    ...DEFAULT_PLAYER_APPEARANCE,
    sex,
    hair: normalizeHairStyle(
      typeof source.hair === 'string' ? (source.hair as PlayerAppearance['hair']) : DEFAULT_PLAYER_APPEARANCE.hair
    ),
    skinTone,
    muscleBuild: normalizeMuscleBuild(
      typeof source.muscleBuild === 'string'
        ? (source.muscleBuild as PlayerAppearance['muscleBuild'])
        : DEFAULT_PLAYER_APPEARANCE.muscleBuild
    ),
    frame: normalizeBodyFrame(
      typeof source.frame === 'string' ? (source.frame as PlayerAppearance['frame']) : DEFAULT_PLAYER_APPEARANCE.frame
    ),
    body
  };
}

function sanitizeBodyTraits(input: unknown): BuddyBodyTraits {
  if (!isObject(input)) {
    return { ...DEFAULT_BODY_TRAITS };
  }

  return {
    chest: clampNumber(input.chest, 0.1, 2.2, DEFAULT_BODY_TRAITS.chest),
    wings: clampNumber(input.wings, 0.1, 2.2, DEFAULT_BODY_TRAITS.wings),
    glutes: clampNumber(input.glutes, 0.1, 2.2, DEFAULT_BODY_TRAITS.glutes),
    thighs: clampNumber(input.thighs, 0.1, 2.2, DEFAULT_BODY_TRAITS.thighs),
    calfs: clampNumber(input.calfs, 0.1, 2.2, DEFAULT_BODY_TRAITS.calfs)
  };
}

function parseRepDex(raw: unknown): SavedRepDexEntry[] {
  const fromPayload = isObject(raw) && Array.isArray(raw)
    ? raw.filter((entry) => isObject(entry))
    : [];

  const repDexMap = new Map<string, { count: number; highestLevel: number }>();

  for (const entry of fromPayload) {
    const definitionId = isObject(entry) && typeof entry.definitionId === 'string' ? entry.definitionId : '';

    if (!DEFINITION_IDS.has(definitionId)) {
      continue;
    }

    const count = Math.max(0, toInteger(entry.count, 0));
    const highestLevel = Math.max(0, toInteger(entry.highestLevel, 0));
    repDexMap.set(definitionId, { count, highestLevel });
  }

  return BUDDY_DEFINITIONS.map((definition) => {
    const values = repDexMap.get(definition.id) ?? { count: 0, highestLevel: 0 };

    return {
      definitionId: definition.id,
      count: clampNumber(values.count, 0, Number.MAX_SAFE_INTEGER, 0),
      highestLevel: clampNumber(values.highestLevel, 0, 999, 0)
    };
  });
}

function parseGoals(raw: unknown): ProgressGoals {
  const source = isObject(raw) ? raw : {};
  const parsed: Partial<ProgressGoals> = {};

  (Object.keys(DEFAULT_GOALS) as Array<keyof ProgressGoals>).forEach((goalId) => {
    const entry = source[goalId];
    if (!isObject(entry)) {
      return;
    }

    parsed[goalId] = {
      completed: entry.completed === true,
      progress: Math.max(0, toInteger(entry.progress, 0))
    };
  });

  return {
    capture_first: parsed.capture_first ?? DEFAULT_GOALS.capture_first,
    workout_first: parsed.workout_first ?? DEFAULT_GOALS.workout_first,
    workout_3: parsed.workout_3 ?? DEFAULT_GOALS.workout_3,
    capture_3: parsed.capture_3 ?? DEFAULT_GOALS.capture_3,
    capture_6: parsed.capture_6 ?? DEFAULT_GOALS.capture_6,
    capture_10: parsed.capture_10 ?? DEFAULT_GOALS.capture_10,
    encounter_exotic: parsed.encounter_exotic ?? DEFAULT_GOALS.encounter_exotic,
    capture_first_exotic: parsed.capture_first_exotic ?? DEFAULT_GOALS.capture_first_exotic,
    roster_level_5_any: parsed.roster_level_5_any ?? DEFAULT_GOALS.roster_level_5_any,
    roster_level_10_any: parsed.roster_level_10_any ?? DEFAULT_GOALS.roster_level_10_any,
    boss_first_win: parsed.boss_first_win ?? DEFAULT_GOALS.boss_first_win,
    repdex_quarter: parsed.repdex_quarter ?? DEFAULT_GOALS.repdex_quarter,
    repdex_half: parsed.repdex_half ?? DEFAULT_GOALS.repdex_half
  };
}

function parseQuests(raw: unknown): QuestStates {
  const source = isObject(raw) ? raw : {};
  const parsed: Partial<QuestStates> = {};

  for (const quest of QUEST_DEFINITIONS) {
    const entry = source[quest.id];
    if (!isObject(entry)) {
      continue;
    }

    parsed[quest.id] = {
      completed: entry.completed === true,
      progress: Math.max(0, toInteger(entry.progress, 0))
    };
  }

  return QUEST_DEFINITIONS.reduce((out, quest) => {
    const parsedState = parsed[quest.id];
    out[quest.id] = parsedState
      ? {
          completed: parsedState.completed === true,
          progress: Math.max(0, toInteger(parsedState.progress, 0))
        }
      : { ...DEFAULT_QUESTS[quest.id] };
    return out;
  }, {} as QuestStates);
}

function parseRoster(raw: unknown): SavedProgressRosterEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const out: SavedProgressRosterEntry[] = [];

  for (const entry of raw) {
    if (!isObject(entry)) {
      continue;
    }

    const definitionId = typeof entry.definitionId === 'string' ? entry.definitionId : '';

    if (!DEFINITION_IDS.has(definitionId)) {
      continue;
    }

    const bodyTraits = sanitizeBodyTraits(entry.bodyTraits);
    const status = sanitizeStatus(entry.status);
    const hasTask = status === 'training' || status === 'needs-spot';
    const taskLabel = hasTask && typeof entry.taskLabel === 'string' ? entry.taskLabel : undefined;
    const taskStationId = hasTask && typeof entry.taskStationId === 'string' ? entry.taskStationId : undefined;
    const taskOutcome = hasTask ? sanitizeTaskOutcome(entry.taskOutcome) : undefined;
    const taskTimer = hasTask ? clampNumber(entry.taskTimer, 0, 999, 0) : 0;
    const taskDuration = hasTask ? clampNumber(entry.taskDuration, 0, 999, 0) : 0;

    out.push({
      rosterId: toInteger(entry.rosterId, 0),
      definitionId,
      bodyTraits,
      displayName: typeof entry.displayName === 'string' ? entry.displayName : undefined,
      capturedAt: Math.max(0, toInteger(entry.capturedAt, 0)),
      level: Math.max(1, toInteger(entry.level, 1)),
      xp: Math.max(0, toInteger(entry.xp, 0)),
      strength: Math.max(1, toInteger(entry.strength, 1)),
      endurance: Math.max(1, toInteger(entry.endurance, 1)),
      focus: Math.max(1, toInteger(entry.focus, 1)),
      energy: clampNumber(entry.energy, 0, 100, 100),
      status,
      taskLabel,
      taskStationId,
      taskOutcome,
      taskTimer,
      taskDuration
    });
  }

  return out;
}

function parseNextIds(raw: unknown): SavedProgress['nextIds'] {
  const fallback = {
    nextBuddyId: 1,
    nextRosterId: 1,
    nextBossId: 1,
    nextFreeWeightId: 1
  };

  if (!isObject(raw)) {
    return fallback;
  }

  return {
    nextBuddyId: Math.max(1, toInteger(raw.nextBuddyId, 1)),
    nextRosterId: Math.max(1, toInteger(raw.nextRosterId, 1)),
    nextBossId: Math.max(1, toInteger(raw.nextBossId, 1)),
    nextFreeWeightId: Math.max(1, toInteger(raw.nextFreeWeightId, 1))
  };
}

export function sanitizeSavedProgress(raw: unknown): SavedProgress | undefined {
  if (!isObject(raw)) {
    return undefined;
  }

  const version = toInteger((raw as SavedProgress).version, 0);

  if (version !== SAVE_DATA_VERSION) {
    return undefined;
  }

  const player = isObject(raw.player) ? raw.player : undefined;
  const savedPosition = isObject(player?.position) ? player.position : undefined;
  const progress: SavedProgress = {
    version,
    timestamp: Math.max(0, toInteger((raw as SavedProgress).timestamp, Date.now())),
    tutorialCompleted: sanitizeTutorialCompleted((raw as SavedProgress).tutorialCompleted),
    appearance: sanitizeAppearance((raw as SavedProgress).appearance),
    player: {
      position: {
        x: clampNumber(savedPosition?.x, -9999, 9999, 0),
        z: clampNumber(savedPosition?.z, -9999, 9999, 0)
      },
      heading: clampNumber(player?.heading, -Math.PI * 10, Math.PI * 10, Math.PI),
      stamina: clampNumber(player?.stamina, 0, 100, 100),
      proteinShakers: clampNumber(player?.proteinShakers, 0, 99, 6),
      steroids: clampNumber(player?.steroids, 0, 99, 0),
      capturedTotal: clampNumber(player?.capturedTotal, 0, 9999, 0)
    },
    goals: parseGoals(raw.goals),
    quests: parseQuests(raw.quests),
    roster: parseRoster(raw.roster),
    storage: parseRoster(raw.storage),
    repDex: parseRepDex(raw.repDex),
    capturedTotal: clampNumber(raw.capturedTotal, 0, 9999, 0),
    progressionTier: clampNumber(raw.progressionTier, 0, 999, 0),
    bossExoticBoost: clampNumber(raw.bossExoticBoost, 0, 0.05, 0),
    nextIds: parseNextIds(raw.nextIds)
  };

  progress.capturedTotal = Math.max(
    progress.player.capturedTotal,
    progress.capturedTotal
  );
  return progress;
}

export function loadProgressFromStorage(): SavedProgress | undefined {
  if (typeof window === 'undefined' || !window.localStorage) {
    return undefined;
  }

  const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeSavedProgress(parsed);

    if (!sanitized) {
      backupBadProgressStorage(raw, 'invalid-schema');
    }

    return sanitized;
  } catch (error) {
    recordRuntimeError(error);
    backupBadProgressStorage(raw, 'parse-failed');
    return undefined;
  }
}

export function saveProgressToStorage(progress: SavedProgress): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const payload = {
    ...progress,
    timestamp: Date.now()
  };

  window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
}

export function clearProgressStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(SAVE_STORAGE_KEY);
}

function backupBadProgressStorage(raw: string, reason: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(
      `${SAVE_BACKUP_STORAGE_PREFIX}-${Date.now()}`,
      JSON.stringify({
        reason,
        backedUpAt: new Date().toISOString(),
        raw
      })
    );
  } catch (error) {
    recordRuntimeError(error);
  } finally {
    clearProgressStorage();
  }
}
