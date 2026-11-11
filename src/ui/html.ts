// Small HTML building blocks shared by the screens: escaping, art as image addresses and the
// standard back button. Screens build their markup as strings, so everything dynamic goes through `esc`.
import { PROPS } from '../art/props';

/** Makes any text safe to place inside HTML or an attribute. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A prop drawing as an address an <img> can show. */
export const artUri = (name: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PROPS[name].svg)}`;

/** Leads back to the main menu from any menu page. */
export const BACK_BUTTON = '<button class="secondary" data-a="main">Back</button>';
