import { GAME_NAME } from './config';

declare const __GAME_VERSION__: string;

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.textContent = `${GAME_NAME} - deployment check - build ${__GAME_VERSION__}`;
}
document.title = GAME_NAME;
