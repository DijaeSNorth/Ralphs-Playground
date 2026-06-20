import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root');
}

const appRoot = app;

appRoot.innerHTML = `
  <div class="boot-screen" aria-live="polite" aria-busy="true">
    <div class="boot-mark"></div>
    <span>Loading Mega Gym</span>
  </div>
`;

async function boot(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const { createGymBuddyGame } = await import('./render/app/createGymBuddyGame');
  createGymBuddyGame(appRoot);
}

boot().catch((error) => {
  appRoot.innerHTML = '<div class="boot-screen boot-screen--error">Mega Gym failed to load.</div>';
  throw error;
});
