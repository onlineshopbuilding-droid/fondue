// The directory of all HTML screens; the ScreenManager is built from this list.
// A new screen is a new file in this folder, one line here and its id in `ScreenId` (screen.ts).
import { keepScreen } from './keep';
import { campaignScreen } from './campaign';
import { coopScreen } from './coop';
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
import { wonScreen } from './won';

export const SCREENS: readonly Screen[] = [
  mainScreen, playScreen, coopScreen, campaignScreen, keepScreen, hostScreen, joinScreen, optionsScreen, helpScreen,
  scoresScreen, creditsScreen, resultsScreen, shopScreen, gameoverScreen, wonScreen, pauseScreen, lostHostScreen, lostGuestScreen,
];
