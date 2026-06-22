import './style.css';
import { getCharacterAssetManifest } from './game/content/characterAssetManifest';
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
  appRoot.innerHTML = '<div class="boot-screen boot-screen--error">Ralph\'s Swole Safari failed to load.</div>';
  throw error;
});
