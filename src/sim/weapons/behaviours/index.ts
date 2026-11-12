/**
 * The directory of weapon behaviours: one class per `kind` in src/config/weapons.ts.
 * A new kind of weapon needs a class in this folder and one line here.
 */
import type { WeaponKind } from '../../../config/weapons';
import type { WeaponBehaviour } from '../behaviour';
import { BeaconBehaviour } from './beacon';
import { ChainBehaviour } from './chain';
import { GoldBehaviour } from './gold';
import { PuddleBehaviour } from './puddle';
import { PushBehaviour } from './push';
import { RollBehaviour } from './roll';
import { SentryBehaviour } from './sentry';
import { ShellBehaviour } from './shell';
import { SkyBehaviour } from './sky';
import { SlamBehaviour } from './slam';
import { SpikesBehaviour } from './spikes';
import { StopBehaviour } from './stop';
import { ThornsBehaviour } from './thorns';
import { VolleyBehaviour } from './volley';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each class is typed to its own tier; the table pairs them by kind.
export const BEHAVIOURS: Record<WeaponKind, WeaponBehaviour<any>> = {
  roll: new RollBehaviour(),
  puddle: new PuddleBehaviour(),
  spikes: new SpikesBehaviour(),
  slam: new SlamBehaviour(),
  push: new PushBehaviour(),
  stop: new StopBehaviour(),
  sky: new SkyBehaviour(),
  chain: new ChainBehaviour(),
  gold: new GoldBehaviour(),
  shell: new ShellBehaviour(),
  thorns: new ThornsBehaviour(),
  volley: new VolleyBehaviour(),
  sentry: new SentryBehaviour(),
  beacon: new BeaconBehaviour(),
};
