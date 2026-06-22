import './style.css';
import { getCharacterAssetManifest } from './game/content/characterAssetManifest';
import { clearProgressStorage } from './game/progress';
import { formatRuntimeError, recordRuntimeError } from './game/runtimeErrors';
import { preloadCharacterAssetTextures } from './render/objects/lowPolyFactory';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root');
}

const appRoot = app;

appRoot.innerHTML = `
  <div class="boot-screen" aria-live="polite" aria-busy="true">
    <div class="boot-mark"></div>
    <span>Loading Ralph's Swole Safari</span>
  </div>
`;

async function boot(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await getCharacterAssetManifest();
  await preloadCharacterAssetTextures();
  const { createGymBuddyGame } = await import('./render/app/createGymBuddyGame');
  createGymBuddyGame(appRoot);
}

boot().catch((error) => {
  recordRuntimeError(error);
  showBootError(error);
});

function showBootError(error: unknown): void {
  appRoot.innerHTML = `
    <div class="boot-screen boot-screen--error" role="alert">
      <div class="boot-error-card">
        <div class="boot-error-title">Safari jammed!</div>
        <p>Ralph's Swole Safari hit a loading snag. A corrupted save can cause this, so you can reset local progress and reload.</p>
        <pre>${escapeHtml(formatRuntimeError(error))}</pre>
        <div class="boot-error-actions">
          <button type="button" data-retry-load>Retry Load</button>
          <button type="button" data-reset-save-reload>Reset Save and Reload</button>
        </div>
      </div>
    </div>
  `;

  appRoot.querySelector<HTMLButtonElement>('[data-retry-load]')?.addEventListener('click', () => {
    window.location.reload();
  });
  appRoot.querySelector<HTMLButtonElement>('[data-reset-save-reload]')?.addEventListener('click', () => {
    clearProgressStorage();
    window.location.reload();
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
