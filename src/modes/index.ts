/**
 * The directory of game modes. The app asks it for a mode by the name in a run's rules.
 * Reserved names that are not built yet: 'coopCampaign', 'quickPlay', 'madness'.
 */
import { CampaignMode } from './campaign';
import { EndlessMode } from './endless';
import type { GameMode } from './mode';
import { TutorialMode } from './tutorial';

export const TUTORIAL = new TutorialMode();
export const CAMPAIGN = new CampaignMode();
export const ENDLESS = new EndlessMode();

export const MODES: Record<string, GameMode> = {
  [TUTORIAL.id]: TUTORIAL,
  [CAMPAIGN.id]: CAMPAIGN,
  [ENDLESS.id]: ENDLESS,
};

export const RESERVED_MODES = ['coopCampaign', 'quickPlay', 'madness'] as const;

export const modeOf = (id: string): GameMode => MODES[id] ?? ENDLESS;

export * from './mode';
export * from './unlocks';
