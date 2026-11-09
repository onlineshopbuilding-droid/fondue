import '@fontsource/lilita-one/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './ui/style.css';
import { GAME_NAME } from './config/game';
import { App } from './ui/app';

document.title = GAME_NAME;
void new App().boot();
