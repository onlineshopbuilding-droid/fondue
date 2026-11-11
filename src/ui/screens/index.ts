// The directory of all HTML screens; the ScreenManager is built from this list.
// A new screen is a new file in this folder, one line here and its id in `ScreenId` (screen.ts).
import { creditsScreen } from './credits';
import { gameoverScreen } from './gameover';
import { helpScreen } from './help';
import { hostScreen } from './host';
import { joinScreen } from './join';
import { lostGuestScreen } from './lostGuest';
import { lostHostScreen } from './lostHost';
import { mainScreen } from './main';
import { optionsScreen } from './options';
import { pauseScreen } from './pause';
import { playScreen } from './play';
import { resultsScreen } from './results';
import { scoresScreen } from './scores';
import type { Screen } from './screen';
import { shopScreen } from './shop';

export const SCREENS: readonly Screen[] = [
  mainScreen, playScreen, hostScreen, joinScreen, optionsScreen, helpScreen, scoresScreen, creditsScreen,
  resultsScreen, shopScreen, gameoverScreen, pauseScreen, lostHostScreen, lostGuestScreen,
];
