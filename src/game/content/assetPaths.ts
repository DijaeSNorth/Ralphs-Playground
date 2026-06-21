export const BASE_PUBLIC_PATH =
  (() => {
    const env = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;

    return typeof env?.BASE_URL === 'string' && env.BASE_URL.length > 0
      ? env.BASE_URL
      : '/';
  })();

const normalizedBase = BASE_PUBLIC_PATH.endsWith('/') ? BASE_PUBLIC_PATH : `${BASE_PUBLIC_PATH}/`;

function isRemoteAssetPath(path: string): boolean {
  return /^[a-z][a-z\d+.-]*:/.test(path) || path.startsWith('data:') || path.startsWith('blob:');
}

export function resolvePublicAssetPath(assetPath: string): string {
  const normalizedPath = assetPath.trim();

  if (!normalizedPath) {
    return normalizedBase;
  }

  if (isRemoteAssetPath(normalizedPath)) {
    return normalizedPath;
  }

  const relativePath = normalizedPath.startsWith('/')
    ? normalizedPath.slice(1)
    : normalizedPath;

  return `${normalizedBase}${relativePath}`;
}

export const CHARACTER_ASSET_MANIFEST_PATH = resolvePublicAssetPath('assets/characters/character_asset_manifest.json');
