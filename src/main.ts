import './style.css';
import { createGymBuddyGame } from './render/app/createGymBuddyGame';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root');
}

createGymBuddyGame(app);
