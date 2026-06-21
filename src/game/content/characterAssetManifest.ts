import { CHARACTER_ASSET_MANIFEST_PATH, resolvePublicAssetPath } from './assetPaths';
import { normalizeHairStyle } from './playerAppearance';
import type { CharacterSex, HairStyle } from '../types';

const FALLBACK_MANIFEST = {
  schemaVersion: '1.1.0',
  project: 'gym-buddy-catcher character visuals',
  assetRoot: 'assets/characters',
  lighting: {
    key: 'top-left',
    ambient: 0.28,
    direction: [-0.25, 1, 0.35]
  },
  paletteProfiles: {
    skin: {
      deep: {
        base: '#7a4b36',
        light: '#c9875d',
        highlight: '#e3b08a',
        shadow: '#6d3f2f',
        deepShadow: '#3b211a'
      },
      warm: {
        base: '#c9875d',
        light: '#d8a17b',
        highlight: '#e8bc9f',
        shadow: '#8a4c34',
        deepShadow: '#5e3828'
      },
      light: {
        base: '#ffd6aa',
        light: '#ffe0be',
        highlight: '#ffe9d0',
        shadow: '#d1a17c',
        deepShadow: '#9d6c4d'
      }
    },
    hair: {
      default: {
        base: '#2b1a12',
        highlight: '#5a3928',
        shadow: '#140c08'
      }
    },
    outline: '#1e2733',
    accent: '#ff705c'
  },
  bodyMeshes: {
    man: {
      base: 'assets/characters/body/male_body_base.svg',
      progression: 'assets/characters/body/male_body_progression.json',
      renderGroup: 'root',
      groups: ['body_base', 'head'],
      anchorPoints: ['scalp_top', 'forehead_center', 'temple_L', 'temple_R'],
      progressiveStages: ['beginner', 'average', 'toned', 'athletic', 'muscular', 'bodybuilder', 'elite']
    },
    woman: {
      base: 'assets/characters/body/female_body_base.svg',
      progression: 'assets/characters/body/female_body_progression.json',
      renderGroup: 'root',
      groups: ['body_base', 'head'],
      anchorPoints: ['scalp_top', 'forehead_center', 'temple_L', 'temple_R'],
      progressiveStages: ['beginner', 'average', 'toned', 'athletic', 'strong', 'elite']
    }
  },
  hairMeshes: [
    { id: 'buzz-cut', file: 'assets/characters/hair/hair_buzz_cut.svg', group: 'root' },
    { id: 'fade', file: 'assets/characters/hair/hair_fade.svg', group: 'root' },
    { id: 'short-curls', file: 'assets/characters/hair/hair_curls_short.svg', group: 'root' },
    { id: 'waves', file: 'assets/characters/hair/hair_waves.svg', group: 'root' },
    { id: 'afro', file: 'assets/characters/hair/hair_afro.svg', group: 'root' },
    { id: 'locs', file: 'assets/characters/hair/hair_locs.svg', group: 'root' },
    { id: 'braids', file: 'assets/characters/hair/hair_braids.svg', group: 'root' },
    { id: 'twists', file: 'assets/characters/hair/hair_twists.svg', group: 'root' },
    { id: 'ponytail', file: 'assets/characters/hair/hair_ponytail.svg', group: 'root' },
    { id: 'bun', file: 'assets/characters/hair/hair_bun.svg', group: 'root' },
    { id: 'high-puff', file: 'assets/characters/hair/hair_high_puff.svg', group: 'root' },
    { id: 'long-straight', file: 'assets/characters/hair/hair_long_straight.svg', group: 'root' },
    { id: 'long-wavy', file: 'assets/characters/hair/hair_long_wavy.svg', group: 'root' },
    { id: 'bangs', file: 'assets/characters/hair/hair_bangs.svg', group: 'root' },
    { id: 'side-part', file: 'assets/characters/hair/hair_side_part.svg', group: 'root' },
    { id: 'undercut', file: 'assets/characters/hair/hair_undercut.svg', group: 'root' },
    { id: 'mohawk', file: 'assets/characters/hair/hair_mohawk.svg', group: 'root' },
    { id: 'spiky', file: 'assets/characters/hair/hair_spiky.svg', group: 'root' },
    { id: 'swept-back', file: 'assets/characters/hair/hair_swept_back.svg', group: 'root' },
    { id: 'high-top', file: 'assets/characters/hair/hair_high_top.svg', group: 'root' }
  ],
  combinedPreviews: {
    man: 'assets/characters/combined/male_preview_combined.svg',
    woman: 'assets/characters/combined/female_preview_combined.svg'
  },
  previewPage: 'assets/characters/preview.html'
} as const;

type RawManifest = typeof FALLBACK_MANIFEST;

type RecordValue = Record<string, unknown>;

export type CharacterAssetManifest = RawManifest;

type ManifestDirection = [number, number, number];

type ResolvedBodyMesh = {
  base: string;
  progression: string;
  renderGroup: string;
  groups: string[];
  anchorPoints: string[];
  progressiveStages: string[];
};

type ResolvedHairMesh = {
  id: string;
  file: string;
  group: string;
  aliasFor: string[];
  anchorHints: string[];
};

type ResolvedPaletteProfile = {
  skin: {
    [key: string]: {
      base: string;
      light?: string;
      highlight?: string;
      shadow?: string;
      deepShadow?: string;
    };
  };
  hair: {
    [key: string]: {
      base: string;
      highlight?: string;
      shadow?: string;
    };
  };
  outline: string;
  accent: string;
};

export type CharacterAssetManifestRuntime = {
  schemaVersion: string;
  project: string;
  assetRoot: string;
  lighting: {
    key: string;
    ambient: number;
    direction: ManifestDirection;
  };
  paletteProfiles: ResolvedPaletteProfile;
  bodyMeshes: {
    man: ResolvedBodyMesh;
    woman: ResolvedBodyMesh;
  };
  hairMeshes: ResolvedHairMesh[];
  combinedPreviews: {
    man: string;
    woman: string;
  };
  previewPage: string;
  manifestUrl: string;
};

const FALLBACK_RUNTIME = normalizeRawManifest(FALLBACK_MANIFEST, CHARACTER_ASSET_MANIFEST_PATH);
const DEFAULT_HAIR_ASSET = FALLBACK_RUNTIME.hairMeshes[0];
const LEGACY_SEX_ALIASES: Record<string, CharacterSex> = {
  male: 'man',
  man: 'man',
  m: 'man',
  female: 'woman',
  woman: 'woman',
  f: 'woman'
};
const LEGACY_HAIR_ALIASES: Record<string, HairStyle> = {
  buzz: 'buzz-cut',
  crop: 'buzz-cut',
  'short-locs': 'locs',
  'bantu-knots': 'twists',
  'box-braids': 'braids',
  'tapered-fade': 'fade',
  'high-top': 'high-top',
  spiky: 'spiky',
  'spiky-hair': 'spiky',
  'sweptback': 'swept-back',
  puff: 'high-puff',
  cornrows: 'twists'
} as const;

const FALLBACK_CACHE_MS = 5 * 60 * 1000;
const DIRECTION = FALLBACK_MANIFEST.lighting.direction as ManifestDirection;

let manifestCache: CharacterAssetManifestRuntime | null = null;
let manifestPromise: Promise<CharacterAssetManifestRuntime> | null = null;
let manifestCacheTime = 0;

function isObject(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null;
}

function toString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function toRecord(value: unknown): RecordValue | null {
  return isObject(value) ? (value as RecordValue) : null;
}

function resolveManifestPath(assetRoot: string, relativePath: string): string {
  const trimmed = toString(relativePath);

  if (!trimmed) {
    return '';
  }

  if (/^(?:https?:|data:|blob:)/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return resolvePublicAssetPath(trimmed);
  }

  const prefix = assetRoot.replace(/\/+$/, '');
  return resolvePublicAssetPath(prefix.length > 0 ? `${prefix}/${trimmed}` : trimmed);
}

function normalizePalette(profile: unknown): ResolvedPaletteProfile['skin'] {
  const source = toRecord(profile);
  const result: ResolvedPaletteProfile['skin'] = {};

  if (!source) {
    return result;
  }

  for (const [key, value] of Object.entries(source)) {
    const record = toRecord(value);
    const base = toString(record?.base);
    if (base) {
      result[key] = {
        base,
        light: toString(record?.light),
        highlight: toString(record?.highlight),
        shadow: toString(record?.shadow),
        deepShadow: toString(record?.deepShadow)
      };
    }
  }

  return result;
}

function isDevMode(): boolean {
  const env = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;

  return env?.DEV === true;
}

function normalizeRawManifest(raw: unknown, manifestUrl: string): CharacterAssetManifestRuntime {
  const source = toRecord(raw) ?? {};
  const sourceLighting = toRecord(source.lighting);
  const sourceBodyMeshes = toRecord(source.bodyMeshes);
  const sourcePalettes = toRecord(source.paletteProfiles);
  const sourceCombined = toRecord(source.combinedPreviews);
  const sourceHair = Array.isArray(source.hairMeshes) ? source.hairMeshes : [];

  const assetRoot = toString(source.assetRoot, FALLBACK_MANIFEST.assetRoot);
  const fallbackBySex = FALLBACK_MANIFEST.bodyMeshes;

  const resolveBodyMesh = (sex: 'man' | 'woman'): ResolvedBodyMesh => {
    const entry = toRecord(sourceBodyMeshes?.[sex]) ?? {};
    const base = resolveManifestPath(assetRoot, toString(entry.base, fallbackBySex[sex].base));
    const progression = resolveManifestPath(assetRoot, toString(entry.progression, fallbackBySex[sex].progression));

    return {
      base,
      progression,
      renderGroup: toString(entry.renderGroup, fallbackBySex[sex].renderGroup),
      groups: toStringArray(entry.groups),
      anchorPoints: toStringArray(entry.anchorPoints),
      progressiveStages: toStringArray(entry.progressiveStages).length
        ? toStringArray(entry.progressiveStages)
        : [...fallbackBySex[sex].progressiveStages]
    };
  };

  const hairMeshes: ResolvedHairMesh[] = sourceHair
    .filter(isObject)
    .map((entryRaw, index) => {
      const entry = entryRaw as RecordValue;
      return {
        id: toString(entry.id, `hair-${index}`),
        file: resolveManifestPath(assetRoot, toString(entry.file, FALLBACK_MANIFEST.hairMeshes[0].file)),
        group: toString(entry.group, 'root'),
        aliasFor: toStringArray(entry.aliasFor),
        anchorHints: toStringArray(entry.anchorHints)
      };
    })
    .filter((entry) => entry.file);

  const resolved: CharacterAssetManifestRuntime = {
    schemaVersion: toString(source.schemaVersion, FALLBACK_MANIFEST.schemaVersion),
    project: toString(source.project, FALLBACK_MANIFEST.project),
    assetRoot: resolvePublicAssetPath(assetRoot),
    lighting: {
      key: toString(sourceLighting?.key, FALLBACK_MANIFEST.lighting.key),
      ambient: toNumber(sourceLighting?.ambient, FALLBACK_MANIFEST.lighting.ambient),
      direction: Array.isArray(sourceLighting?.direction) && sourceLighting.direction.length === 3
        ? (sourceLighting.direction as ManifestDirection)
        : DIRECTION
    },
    paletteProfiles: {
      skin: {
        ...normalizePalette(sourcePalettes?.skin),
        ...Object.fromEntries(
          Object.entries(FALLBACK_MANIFEST.paletteProfiles.skin).map(([key, value]) => [
            key,
            {
              base: value.base,
              light: value.light,
              highlight: value.highlight,
              shadow: value.shadow,
              deepShadow: value.deepShadow
            }
          ])
        )
      },
      hair: {
        ...normalizePalette(sourcePalettes?.hair),
        ...Object.fromEntries(
          Object.entries(FALLBACK_MANIFEST.paletteProfiles.hair).map(([key, value]) => [
            key,
            {
              base: value.base,
              highlight: value.highlight,
              shadow: value.shadow
            }
          ])
        )
      },
      outline: toString(sourcePalettes?.outline, FALLBACK_MANIFEST.paletteProfiles.outline),
      accent: toString(sourcePalettes?.accent, FALLBACK_MANIFEST.paletteProfiles.accent)
    },
    bodyMeshes: {
      man: resolveBodyMesh('man'),
      woman: resolveBodyMesh('woman')
    },
    hairMeshes: hairMeshes.length > 0 ? hairMeshes : [{ ...FALLBACK_MANIFEST.hairMeshes[0], aliasFor: [], anchorHints: [], file: resolveManifestPath(assetRoot, FALLBACK_MANIFEST.hairMeshes[0].file), group: FALLBACK_MANIFEST.hairMeshes[0].group }],
    combinedPreviews: {
      man: resolveManifestPath(assetRoot, toString(sourceCombined?.man, FALLBACK_MANIFEST.combinedPreviews.man)),
      woman: resolveManifestPath(assetRoot, toString(sourceCombined?.woman, FALLBACK_MANIFEST.combinedPreviews.woman))
    },
    previewPage: resolveManifestPath(assetRoot, toString(source.previewPage, FALLBACK_MANIFEST.previewPage)),
    manifestUrl
  };

  return {
    ...resolved,
    lighting: {
      ...resolved.lighting,
      direction: resolved.lighting.direction
    }
  };
}

export async function getCharacterAssetManifest(): Promise<CharacterAssetManifestRuntime> {
  if (manifestCache !== null && Date.now() - manifestCacheTime < FALLBACK_CACHE_MS) {
    return manifestCache;
  }

  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const response = await fetch(CHARACTER_ASSET_MANIFEST_PATH, { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`Manifest fetch failed with status ${response.status}`);
        }

        const payload = await response.json();
        const normalized = normalizeRawManifest(payload, CHARACTER_ASSET_MANIFEST_PATH);
        if (isDevMode()) {
          console.info('[character-asset] manifest loaded', {
            source: CHARACTER_ASSET_MANIFEST_PATH,
            sexStages: {
              man: normalized.bodyMeshes.man.progressiveStages.length,
              woman: normalized.bodyMeshes.woman.progressiveStages.length
            },
            hairCount: normalized.hairMeshes.length
          });
        }

        manifestCache = normalized;
        manifestCacheTime = Date.now();
        return normalized;
      } catch (error) {
        if (isDevMode()) {
          console.warn('[character-asset] manifest load failed, using embedded fallback', error);
        }

        const normalized = normalizeRawManifest(FALLBACK_MANIFEST, CHARACTER_ASSET_MANIFEST_PATH);
        manifestCache = normalized;
        manifestCacheTime = Date.now();
        return normalized;
      } finally {
        manifestPromise = null;
      }
    })();
  }

  return manifestPromise;
}

export function getCachedCharacterAssetManifest(): CharacterAssetManifestRuntime | null {
  return manifestCache;
}

export function normalizeManifestSex(raw: unknown): CharacterSex {
  const normalized = toString(raw, 'man').toLowerCase();
  return LEGACY_SEX_ALIASES[normalized] ?? 'man';
}

export function normalizeManifestHairId(rawHairStyle: unknown): HairStyle {
  const normalized = toString(rawHairStyle, DEFAULT_HAIR_ASSET.id).toLowerCase();
  return (LEGACY_HAIR_ALIASES[normalized] ?? normalizeHairStyle(normalized as HairStyle)) as HairStyle;
}

export function resolveBodyMeshPath(rawSex: unknown, manifest?: CharacterAssetManifestRuntime | null): string {
  const source = manifest ?? FALLBACK_RUNTIME;
  return source.bodyMeshes[normalizeManifestSex(rawSex)].base;
}

export function resolveHairMeshPath(rawHairStyle: unknown, manifest?: CharacterAssetManifestRuntime | null): string | undefined {
  const source = manifest ?? FALLBACK_RUNTIME;
  const normalized = normalizeManifestHairId(rawHairStyle);
  const exact = source.hairMeshes.find(
    (mesh) => mesh.id === normalized
  );

  if (exact) {
    return exact.file;
  }

  const aliasMatch = source.hairMeshes.find(
    (mesh) => mesh.aliasFor.includes(normalized)
  );

  return aliasMatch?.file;
}

export function resetCharacterAssetManifestCache(): void {
  manifestCache = null;
  manifestPromise = null;
  manifestCacheTime = 0;
}
