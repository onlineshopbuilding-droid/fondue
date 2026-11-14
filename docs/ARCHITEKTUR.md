# Fondue – Architektur

Dieses Dokument beschreibt den Aufbau von v0.3 („dauerhafte Burg“): welche Ordner es gibt, welche Klasse welche Aufgabe hat und wie die Daten fließen. Es richtet sich an Tim, Lenny und jede KI, die weiterbaut. Die Rezepte („ich will ein neues Level, eine neue Waffe …“) stehen in `docs/HANDBUCH.md`.

Stand: 14.11.2026, an den Code des Branches `v0.3-dev` angeglichen. Die Grundzerlegung stammt aus dem großen Update (Profil → Modus → Lauf → Sim → Szene); v0.3 ändert vor allem drei Dinge: **die Burg lebt im Profil statt im Lauf**, **ein Level ist eine Wellenfolge ohne Einkauf**, **Käse, Gold und Räuberwappen** sind die Währungen. Die Begründungen stehen in `docs/ENTSCHEIDUNGEN.md` (E-063 bis E-071), der Bauplan in `docs/v0.3/BAUPLAN.md`.

## 0. Sechs Begriffe vorab

| Begriff | Bedeutung |
|---|---|
| **deterministisch** | Gleicher Startwert und gleiche Eingaben ergeben immer denselben Verlauf. Deshalb gibt es in der Simulation keinen echten Zufall und keine Uhr. |
| **Host und Gast** | Im Koop rechnet nur der Host das Spiel. Der Gast schickt Eingaben und zeigt, was der Host meldet. |
| **Command** | Eine Eingabe an die Simulation, zum Beispiel „Hand drückt hier“, „Waffe in Slot 2 abfeuern“, „schütteln“. Kaufbefehle gibt es nicht mehr: Im Lauf wird nichts gekauft. |
| **SimEvent** | Etwas ist einmalig passiert (Aufprall, Tod, Schuss, Wappen). Löst Effekte und Klänge aus. |
| **ViewState** | Alles, was ein einzelnes Bild braucht: Gegner, Geschosse, Hände, Gold, Tor. Kommt 30-mal pro Sekunde beim Gast an. |
| **Meta** | Selten geänderte Daten eines Laufs: Namen, was in welchem Slot steckt, Regeln, aktuelle Welle, Ergebnis. Wird nur bei Änderung geschickt. |

**Ein Durchlauf als Beispiel:** Tim tippt in der Lobby auf die Kampagne und wählt Level 7. Die App fragt `CampaignMode.buildRun(profil, { world: 'fondue', level: 7 }, umgebung)` und bekommt ein `RunSetup`: die Regeln (welche Slots offen sind, Stärke der Räuber, Höchstzahl lebender Räuber), den Wellenplaner und den Start (`RunStart` mit der **dauerhaften Burg** des Profils als `Loadout`: Burg-Stufe, Waffen je Slot mit Stufe, Stationen, Hand-Stufe). Daraus entsteht eine `HostSession` mit einer `Sim`. Tim packt einen Gegner: Die Szene schickt `press` und `release` an die Session, die `Sim` rechnet den Wurf, meldet `impact` und `death`, die Szene zeigt Staub und Goldzahl. Wenn die letzte Welle erschienen und der letzte Räuber besiegt ist, setzt die `Sim` die Phase `runWon` und legt das Ergebnis in `Meta.result`. Die App gibt es an `CampaignMode.reward(ergebnis, regeln, profil, rolle)`: Der Modus schreibt das Gold und die Wappen des Laufs gut, setzt „Level 7 geschafft“ und vergibt die neu verdienten Käse (nur der Host, nur Bits, die noch nicht gesetzt waren). Der Sieg-Bildschirm zeigt es, dann fährt die Kamera in die Burg, wo Käse und Gold im Shop über `src/modes/progress.ts` ausgegeben werden.

## 1. Leitgedanken

1. **Daten statt Code.** Level, Waffen, Gegner, Freischaltungen, Preise, Story stehen als Tabellen in `src/config/`.
2. **Die Simulation weiß nichts vom Drumherum.** Sie bekommt fertige Regeln für einen Lauf und einen Wellenplaner. Sie kennt weder Kampagne noch Endlos, weder Profil noch Browser.
3. **Ein Modus entscheidet, die Simulation rechnet.** Tutorial, Kampagne und Endlos sind eigene Klassen. Ein Modus baut den Lauf und verteilt am Ende die Belohnung.
4. **Die Burg ist Stand des Profils, nicht des Laufs.** Was gekauft ist, steht in `profile.data.keep`; die Sim liest es nur. Kauf, Freischalten und Anlegen laufen ausschließlich durch `src/modes/progress.ts`.
5. **Abgeleitet wird nicht gespeichert.** Offene Slots, kaufbare Waffen und der Stufen-Deckel ergeben sich aus den gewonnenen Leveln und den Tabellen (`src/modes/unlocks.ts`). Eine geänderte Tabelle kann so nie einen kaputten Spielstand erzeugen.
6. **Die vier alten Regeln gelten weiter:** `src/sim/` kennt weder Phaser noch DOM; dort kein `Math.random`; Zahlen in die Konfiguration; der Spielname nur in `src/config/game.ts`.
7. **Regeln und Stand sind getrennt.** Regeln eines Laufs ändern sich nie (`RunRules`). Die Burg eines Laufs (`Loadout`) ändert sich im Lauf nicht; im Lauf ändern sich nur Gold, Torleben und Statistik.

## 2. Datenfluss

```
Profil (src/profile/)  <---- Belohnung ----+
   |  Käse, Gold, Wappen, dauerhafte Burg  |
   v                                       |
Modus (src/modes/)  -- baut --> RunSetup --+--> wertet RunResult aus
   ^                              |
   | progress.ts: Kaufen,         v
   | Freischalten, Anlegen   Session (src/game/session.ts)
   | (Shop, Bots, Cheats)      HostSession besitzt die Sim, GuestSession sagt voraus
                                  |
                                  v
                     Sim (src/sim/): Regeln, 60 Schritte pro Sekunde
                                  |
            ViewState, SimEvent, Meta (auch übers Netz, src/net/)
                                  v
   Bildschirme (src/ui/)   und   Szenen (src/render/): Kampf, Lobby
```

## 3. Ordner

| Ordner | Inhalt | Darf importieren |
|---|---|---|
| `src/config/` | Tabellen und Zahlen. Keine Logik außer kleinen Rechenhilfen. | nichts |
| `src/config/worlds/` | Welt-Pakete. `fondue/` ist Welt 1. | `config` |
| `src/sim/` | Spielregeln, deterministisch. | `config` |
| `src/modes/` | Tutorial, Kampagne, Endlos; Belohnungsregeln; Progression (`progress.ts`), Freischaltungen (`unlocks.ts`), Challenges, Cheats. | `config`, `sim`, `profile` |
| `src/profile/` | Dauerhafter Spielstand. | `config` |
| `src/bots/` | Spielende Bots, Ausbau zwischen den Läufen und der Kampagnen-Durchlauf für die Balance. | `config`, `sim`, `modes`, `profile` |
| `src/game/` | `Session` (Host und Gast). | `sim`, `net` |
| `src/net/` | Netznachrichten, Snapshots, Glättung, Verbindungsarten. | `sim` (Typen) |
| `src/art/` | Grafik aus Code und das Asset-Verzeichnis. | `config` |
| `src/render/` | Phaser-Szenen und alles, was zeichnet. | alles außer `ui` |
| `src/ui/` | HTML-Bildschirme über dem Canvas, ein Bildschirm pro Datei. | alles |
| `src/audio/`, `src/input/` | Klang; Zeiger, Wurfgeschwindigkeit, Schüttel-Erkennung, zweiter Finger. | `config` |
| `scripts/` | Werkzeuge, die mit `node` laufen: Entwickler-Übersicht (`dev-page.ts`, Seite in `dev-page/`), Level-Tabelle (`campaign-table.ts`), Asset-Liste (`list-assets.ts`), Waffen-Bild (`weapon-sheet.ts`), Android-Hülle (`android-setup.mjs`). Lesen `src/config/` und `docs/`. | `config`, `modes`, `sim` |

`src/sim/`, `src/config/`, `src/modes/`, `src/profile/` und `src/bots/` importieren weder Phaser noch DOM. Geplant war ein eigener Test dafür (`tests/unit/architecture.test.ts`); den gibt es nicht. Die Unit-Tests und die Balance-Bots laufen ohne Browser und scheitern, sobald dort Phaser landet.

## 4. Konfiguration (`src/config/`)

Jede Tabelle hat oben einen Kommentar, der die Spalten erklärt.

| Datei | Inhalt |
|---|---|
| `game.ts` | Name und Version des Spiels (`GAME_NAME`, `GAME_VERSION`). Der Schalter, der den Knopf zum Entwickler-Menü zeigt, heißt `DEV_MENU_BUTTON` und steht in `src/ui/screens/options.ts`. |
| `enemies.ts` | `ENEMIES`: das Verzeichnis aller Gegner mit Werten, `mass` (Gewicht) und Popup-Text; `V3_SPEED`, `V3_GOLD`, `GRAB_SPEED_BONUS`; `BEHAVIOUR`. Eine Welt wählt daraus aus. |
| `weapons.ts` | `WEAPONS`: 25 Waffen, eine Definition je Waffe (Slot-Aufgabe, Art des Verhaltens, Zielwahl, Freischalt-Level, Käse-Preis, Preisfaktor `goldScale`, sieben Stufen mit Werten und Text, Texte, `enabled`). |
| `slots.ts` | `SLOTS`: die fünf Waffenplätze der Burg mit Aufgabe (`SlotRole`: `damage`, `slow`, `support`, `passive`, `gate`), Lage, Freischalt-Level und Einführungssatz. |
| `tiers.ts` | Stufen 1 bis 7: Goldpreise der Waffenstufen, Wappen für Stufe 7, Stufen-Deckel je Kampagnen-Abschnitt (`TIER_CAP_BY_LEVEL`). |
| `currencies.ts` | Käse, Gold, Räuberwappen: Namen, Icons, Kurztexte; die fünf Käse eines Levels (`CHEESE`). |
| `crests.ts` | Wappen je Gegnertyp, Höchstzahl je Runde, Größe und Zielhilfe des Adlerhakens. |
| `keep.ts` | `CASTLE_TIERS` (Burg und Tor in sieben Stufen), `STATIONS` (Kessel, Adlerhaken mit Freischalt-Level, Käse-Preis und Stufen), `CAULDRON_SECONDS`, `PERCH`. |
| `hand.ts` | `HANDS`: Stärke der Hand je Stufe (1 bis 7) und Gold, Wurf-, Yeti- und Zweite-Hand-Regeln. |
| `economy.ts` | Kessel-Goldfaktor. |
| `waves.ts` | Rhythmus der Wellen (`WAVES`), Endlos-Wellen (`ENDLESS_WAVES`), Schwierigkeitsgrade (`DIFFICULTIES`), Koop (`COOP`), Landschaftsfolge. |
| `campaignScaling.ts` | Stärke eines Levels und ihr Wachstum innerhalb des Levels. |
| `tutorial.ts`, `lobby.ts` | Zahlen der Vorrunde und der Führung zum ersten Upgrade; Zeiten der Lobby. |
| `field.ts` | Geometrie des Schlachtfelds (Bodenlinie, Tor, Kessel, Haken, Feldbreite). |
| `tuning.ts`, `flags.ts`, `quickstart.ts` | Wurfgefühl, Experiment-Schalter (auch `secondHand`), Entwickler-Schnellstart. |
| `decisions.ts`, `devReview.ts` | Entscheidungs- und Bewertungsliste des Entwickler-Menüs. |
| `assets.ts` | Überschreibungen im Asset-Verzeichnis: Name → Bilddatei (nur Pfad-Texte). |
| `worlds/index.ts` | `WORLDS`: Liste aller Welten. |
| `worlds/types.ts` | `WorldDef`, `LevelDef`, `WaveDef`, `ChallengeDef`, `BossDef`, `TwistDef`, `HintDef`, `UnlockDef`, `EndlessDef`. |
| `worlds/fondue/world.ts` | Welt 1 als Paket: König, Landschaften, Gegnerauswahl, Stationen, Verweise auf Kampagne, Story und Endlos-Tabelle. |
| `worlds/fondue/campaign.ts` | Die 100 Level: Regeln der Kurve plus `LEVEL_OVERRIDES` für einzelne Level. `buildCampaign()` liefert `LevelDef[]`. |
| `worlds/fondue/challenges.ts` | Vorlagen der Challenges und die zwei Challenges jedes Levels. |
| `worlds/fondue/unlocks.ts` | Freischalt-Tabelle `UNLOCKS`, zusammengesetzt aus den Feldern `unlockLevel` von Slots, Waffen und Stationen; Einführungen der Slots. |
| `worlds/fondue/endless.ts` | Endlos-Zufall dieser Welt: Fenster der Erstauftritte (in Wellen), Gewichte, Wahrscheinlichkeiten, Landschaftswechsel. |
| `worlds/fondue/story.ts` | König (`KING`), Sätze der Vorrunde (`PRELUDE_LINES`), Erklärung von Käse und Gold, Einführungen von Slots und Stationen, Namen und Story-Satz je Level, Bosse (`BOSSES`), Popups „New enemy“ (`ENEMY_POPUPS`), Sprüche in der Lobby, Storybuch. |

Die fertige Level-Tabelle wird zusätzlich als lesbares Dokument erzeugt (`docs/KAMPAGNE-TABELLE.md`, Skript `scripts/campaign-table.ts`, Aufruf `node scripts/campaign-table.ts`); der Test `tests/unit/campaignTable.test.ts` prüft, dass es zum Code passt. Wer ein Level ändern will, trägt es in `LEVEL_OVERRIDES` ein.

```ts
interface LevelDef {
  id: number;                  // 1 bis 100
  name: string;
  landscape: Landscape;
  night: boolean;              // alle Wellen im Dunkeln
  waves: WaveDef[];            // die Wellenfolge des Levels
  targetSeconds: number;       // geplante Länge, für Karte, Tabelle und Bot-Prüfung
  challenges: [ChallengeDef, ChallengeDef];  // Käse 4 und 5
  power: number;               // Stärke der Gegner in diesem Level
  boss: BossDef | null;        // Boss-Level: Name und Satz des Bosses
  twist: TwistDef | null;      // Besonderheit, z. B. { kind: 'onlyTypes', types: ['pogo'], label: 'Hoppers only' }
  story: string;               // ein Satz
  hints: HintDef[];            // geführte Hinweise des Königs (Level 1)
  newEnemies: EnemyType[];     // aus den Wellen berechnet
  maxAlive: number;            // höchstens so viele Räuber gleichzeitig (12 früh bis 30 spät)
}
interface WaveDef { counts: Partial<Record<EnemyType, number>>; spawnSeconds: number; packs: number; pauseAfter: number; big?: Partial<Record<EnemyType, number>>; boss?: boolean }
```

Neue Gegner eines Levels werden aus den Wellen berechnet, nicht von Hand gepflegt. `LevelDef` hat keine Tage, keinen Markt, kein Startgold und keine Sterne mehr.

## 5. Simulation (`src/sim/`)

`Sim` ist die eine Tür nach außen. Die Teile halten keinen eigenen Zustand; alles liegt in `SimState`. Sie erreichen einander über den gemeinsamen `SimContext` (`ctx.combat`, `ctx.hands` …).

| Datei | Klasse | Aufgabe |
|---|---|---|
| `sim.ts` | `Sim` | Baut den Zustand, nimmt `Command`s an, macht einen Schritt, gibt `SimEvent`s heraus. |
| `context.ts` | `SimContext` | Zustand, Zufall, Ereignisliste, kleine Helfer und Verweise auf alle Teile. |
| `waveFlow.ts` | `WaveFlow` | Ablauf eines Levels: Banner (1,2 s, Räuber laufen schon), Welle für Welle mit Atempausen, Sieg und Niederlage des Laufs. |
| `spawner.ts` | `Spawner` | Lässt die Räuber der Welle auftreten, am sichtbaren rechten Rand (`viewRight`). |
| `enemies.ts` | `EnemyBehaviour` | Laufen, Angreifen, Springen, Schweben, Betäubt, Gefroren. |
| `hands.ts` | `Hands` | Greifen, Halten, Schütteln, Werfen; bis zu zwei Hände je Spieler (Handnummer p und p + Spieler). |
| `flight.ts` | `Flight` | Geworfene Gegner in der Luft, Aufprall. |
| `stations.ts` | `Stations` | Kessel (Schmelzzeit je Stufe, doppeltes Gold) und Adlerhaken (gezielter Wurf, Wappen) samt Zielhilfe. |
| `projectiles.ts` | `Projectiles` | Bomben, Steine, Geschosse der Waffen. |
| `zones.ts` | `Zones` | Wirkungsflächen am Boden: Feuer, klebriger Käse, Schneewehen. |
| `weapons/system.ts` | `WeaponSystem` | Welche Waffe in welchem Slot sitzt, Nachladen, Antippen; passive Waffen feuern selbst. |
| `weapons/behaviour.ts` | `WeaponBehaviour` | Schnittstelle, die jede Waffenart erfüllt. |
| `weapons/behaviours/*.ts` | je eine Klasse | Verhalten je Waffenart (23 Arten, darunter roll, puddle, spikes, slam, push, stop, sky, chain, gold, shell, thorns, volley, sentry, beacon, drift, toll, helper, grip, mend, lob, swarm, cascade, swing); Verzeichnis `BEHAVIOURS` in `index.ts`. |
| `weapons/targeting.ts` | Funktionen | Automatische Zielwahl: nächster am Tor, dichteste Gruppe, stärkster Gegner. |
| `weapons/overrides.ts` | Funktionen | Ebene der geänderten Waffenwerte des Waffen-Editors; Läufe damit sind Entwickler-Läufe. |
| `combat.ts` | `Combat` | Schaden, Tod mit Gold-Auszahlung, Flächenschaden, Schaden am Tor. |
| `stats.ts` | `RunStats` | Zählt mit (Daten `RunStatsData` in `rules.ts`): Kills nach Ursache und Typ, Würfe, Fass-Explosionen, Waffen-Einsätze, Gold, Wappen, Versuche und Treffer am Haken, verlorenes Torleben. Die Challenges und der Käse für das Tor lesen diese Zahlen. |
| `physics.ts` | Funktionen | Wurf-Begrenzung, Gewicht, Haltefeder, Handnummern, Greifzuschlag. Host und Gast benutzen dieselben Funktionen. |
| `plan.ts` | `WavePlanner`, `FixedPlanner` | Schnittstelle: „Was kommt in Welle n?“ |
| `spawn.ts` | Funktionen | Verteilt Gegner über die Welle (Rudel, Dichte), Endlos-Wellengröße. |
| `rules.ts` | `RunRules`, `RunSetup`, `RunStart`, `RunResult` | Die Datentypen eines Laufs. |

Eine Datei `shop.ts` oder `dayFlow.ts` gibt es nicht mehr: Im Lauf wird nichts gekauft, und es gibt keine Tage.

### Was die Sim bekommt

```ts
interface RunSetup {
  seed: number;
  names: string[];
  tuning: Tuning;
  flags?: Flags;
  fieldW?: number;
  viewRight?: number;   // rechter sichtbarer Rand des Hosts: dort treten die Räuber ein (B3)
  rules: RunRules;      // unveränderliche Regeln; gehen einmal zum Gast
  planner: WavePlanner; // nur beim Host; rechnet rein aus (Welle, Zufall) einen Plan
  start: RunStart;      // Startwerte: Welle, Gold dieses Laufs, Torleben, die dauerhafte Burg (Loadout), Statistik
  devRun?: boolean;
}

interface RunRules {
  runId: string;               // damit eine Belohnung genau einmal eingelöst wird
  mode: string;                // 'tutorial' | 'campaign' | 'endless'
  world: string;               // 'fondue'
  level: number | null;
  difficulty: Difficulty | null;       // nur Anzeige, Gold und Bestenliste
  lastWave: number | null;     // letzte Welle; null = ohne Ende
  players: number;
  scaling: Scaling;            // Zahl, Tempo, Torschaden, Leben, Gold, Wachstum je Welle, easeIn (Kampagne)
  maxAlive: number;            // höchstens so viele Räuber gleichzeitig
  slotsOpen: boolean[];        // welche der fünf Slots es gibt
  gateCannotFall: boolean;     // Vorrunde: ja
}

interface Loadout {            // die dauerhafte Burg des Profils (des Hosts) als Stand des Laufs
  gateTier: number;            // Burg-Stufe - 1
  slotWeapon: (string | null)[];   // 5 Slots
  weaponTier: Record<string, number>;
  stations: Record<StationId, boolean>; stationTier?: ...;
  handTier: number[];          // je Spieler
}
```

Es gibt keine Regeln wie `hasMarket`, `marketOnly`, `handBuyable` oder `tierUpgrades` mehr. Die Landschaft einer Welle kommt aus dem Wellenplan, nicht aus den Regeln.

Der **Stand der Burg** liegt in `Meta.loadout` und ändert sich im Lauf nicht; er kommt aus `keepLoadout` in `src/modes/campaign.ts` (aus dem Profil, nur offene Slots, nur besessene Waffen) und geht mit `Meta` zum Gast. `Meta.wave` trägt, was Szene und Gast über die laufende Welle wissen müssen: Landschaft, Nacht, Boss, neue Gegnertypen. `Meta.devRun` wird wahr, sobald jemand mit Entwickler-Werkzeugen eingreift (andere Tuning-Werte, Schalter, Waffenwerte, Sprung auf eine spätere Welle); solche Läufe zählen nicht.

### Determinismus

- Der Wellenplaner ist eine reine Rechnung. Die Sim gibt ihm für jede Welle einen eigenen Zufallsstrom, abgeleitet aus Startwert und Wellennummer. Der Plan einer Welle hängt damit nicht vom Kampf davor ab, und ein fortgesetzter Lauf bekommt denselben Plan.
- Die Kampagne hat einen festen Startwert je Welt und Level (`levelSeed`). Jeder Versuch eines Levels läuft gleich an.
- Außerhalb von Entwickler-Läufen gelten immer die Standardwerte des Wurfgefühls (`TUNING_DEFAULT`) und der Waffen.

### Phasen

`banner` (nur beim Levelstart, 1,2 s, die Räuber laufen schon los) → `battle` (die Wellen) → `runWon` (letzte Welle erschienen und alle Räuber besiegt) oder `defeat` → `gameover`. Dazu `hold`: Die Simulation steht still, bis ein `resume` kommt. Das Tutorial benutzt es für die Geste; es ist keine Pause und zeigt kein Pausenfenster. Die nächste Welle beginnt, wenn die Pause nach der letzten Ankunft vorbei ist oder kurz nachdem kein Räuber mehr lebt (`WAVES.clearDelay`); so ist das Feld nie lange leer.

### Waffen

Eine Waffe besteht aus zwei Teilen:
- **Definition** in `src/config/weapons.ts` (Daten).
- **Verhalten** in `src/sim/weapons/behaviours/<kind>.ts`: eine kleine Klasse mit `fire(ctx, tier, player)` und bei Bedarf `tick(ctx, tier)` für Waffen, die von allein wirken (alle Passiv-Waffen).

Damage-, Slow-, Support- und Gate-Waffen werden nur angetippt (`fireSlot`), Passiv-Waffen feuern selbst. Die Zielwahl steht je Waffe in der Tabelle.

Ehrliche Liste, was eine neue Waffe berührt: der Tabelleneintrag; die Grafik im Asset-Verzeichnis (`weapon:<id>:<stufe>`, sieben Stufen); nur bei neuer Art von Verhalten eine Klasse und eine Zeile im Verzeichnis der Verhalten; nur bei neuem Geschoss ein Eintrag in `ProjectileKind` und der Snapshot-Liste; nur bei neuem Effekt ein Fall in der Szene. Die Bots lesen die Tabelle.

Befehle (`Command`): `press`, `release`, `move` (zweite Hand), `fireSlot(slot)`, `shake` (Fass abschütteln), `pause`. `press`, `release`, `move` und `shake` tragen optional `hand` (1 = zweite Hand des Spielers).

## 6. Modi (`src/modes/`)

```ts
interface GameMode {
  readonly id: string;
  isAvailable(profile: Profile, world: string): boolean;          // Endlos: erst mit dem fünften Slot
  buildRun(profile: Profile, choice: RunChoice, env: RunEnv): RunSetup;
  reward(result: RunResult, rules: RunRules, profile: Profile, role: 'solo' | 'host' | 'guest'): Reward;
  next(result: RunResult, rules: RunRules, profile: Profile): NextStep;  // Vorrunde → Level 1, sonst Lobby
}
```

- `RunChoice`: was der Spieler gewählt hat (Welt, Level, Schwierigkeit, Endlos-Schnellstart, Entwickler-Sprung auf eine Welle, fortgesetzte Welle `resume`).
- `RunEnv`: was die App weiß (Namen, Feldbreite, sichtbarer rechter Rand `viewRight`, Hand-Stufen der Mitspieler, Entwickler-Tuning und -Schalter, `devRun`, fester Startwert).
- `RunResult`: gewonnen oder verloren, erreichte Welle, Punkte, Torleben am Ende (`gateShare`), Statistik, `runId`, `devRun`.
- `Reward`: neu verdienter Käse (und welche Bits), erfüllte Challenges, Gold und Wappen des Laufs, erster Sieg, neue Freischaltungen, Story-Satz, Bestenlisten-Eintrag, nächstes Level.

**Wer was bekommt:** `payRun` (`campaign.ts`) schreibt Gold und Wappen eines Laufs jedem Gerät in sein eigenes Profil gut, auch bei Niederlage (E-066). Käse und Fortschritt gibt es nur für Solo und Host bei einem Sieg (E-069); der Gast behält nur Gold und Wappen. Endlos zahlt Gold und Wappen, nie Käse. Dev-Läufe und doppelt eingelöste Läufe zahlen nichts.

Die Hinweise des Königs in Level 1 kommen nicht aus dem Modus, sondern aus den Daten des Levels (`LevelDef.hints`); gezeigt werden sie von `src/render/tutorialView.ts`.

| Datei | Klasse | Aufgabe |
|---|---|---|
| `tutorial.ts` | `TutorialMode` | Nur die Vorrunde: kein Menü, Tor kann nicht fallen, Geste zum Nachmachen, das Rolling Wheel kostenlos. Danach geht es in Level 1 und zum ersten Upgrade (`firstUpgradeDue`, `finishFirstUpgrade`). |
| `campaign.ts` | `CampaignMode` | Level aus der Tabelle, die dauerhafte Burg aus dem Profil (`keepLoadout`), Gold, Käse und Fortschritt beim Ende. |
| `endless.ts` | `EndlessMode` | Schwierigkeit wählbar, Zufall aus der Welt-Tabelle, eigene Burg, Gold je Schwierigkeit, Bestenliste. |
| `endlessPlanner.ts` | `EndlessPlanner`, `endlessRolls` | Wellenpläne des Endlos-Modus aus der Welt-Tabelle; würfelt einmal je Lauf die Erstauftritte. |
| `progress.ts` | Funktionen | **Die eine Stelle für Progression:** `quote` (Preis des nächsten Schritts, erlaubt oder warum nicht), `buy`, `equip`, Käse einmalig vergeben, Gold und Wappen gutschreiben. Ziele: Waffe, Burg, Hand, Station. Jede Änderung speichert sofort. |
| `unlocks.ts` | Funktionen | Liest die Freischalt-Tabelle und leitet aus `levelsDone` ab: `slotOpen`, `weaponAvailable`, `stationAvailable`, `tierCap`, `endlessOpen`; `syncUnlocks` legt das freie Rolling Wheel an. |
| `challenges.ts` | Funktionen | `challengesDone`: beurteilt die zwei Challenges an den Zählern des Laufs. |
| `cheats.ts` | Funktionen | Entwickler-Cheats (Gold, Käse, Wappen, Level, Stufen, Zurücksetzen, zweite Hand am Laptop); sie ändern das Profil dauerhaft und markieren es. |
| `mode.ts` | `GameMode` und Typen | Die gemeinsame Schnittstelle. |
| `index.ts` | `MODES` | Verzeichnis. Reserviert, nicht gebaut: `RESERVED_MODES` = `coopCampaign`, `quickPlay`, `madness`. |

Eine eigene Datei `rewards.ts` gibt es nicht: Die Belohnungsregeln stehen in `reward` des jeweiligen Modus und rechnen auf `RunResult` und seiner Statistik.

## 7. Profil (`src/profile/`)

Schlüssel `fondue.v3.profile` (`PROFILE_KEY`, Präfix `STORAGE_PREFIX` = `fondue.v3.`), `PROFILE_VERSION` 1 (neue Zählung, eigenes Format, keine Übernahme aus v0.2). Reines JSON mit Kopfdaten (`format` „fondue-profile“, `version`, `profileId`, `createdAt`, `updatedAt`), damit es später eins zu eins in einen Cloud-Account wandern kann.

| Datei | Inhalt |
|---|---|
| `schema.ts` | `ProfileData` und Standardwerte (`freshProfile`), Konstanten der Stufen und der Schlüssel. |
| `migrations.ts` | Die Kette der Versionssprünge (`MIGRATION_STEPS`; heute nur ein Schritt 0 → 1, der nichts ändert, denn Version 1 ist der Anfang). Ein v0.2-Profil wird weder gelesen noch geändert. |
| `store.ts` | `ProfileStore` (Schnittstelle mit `read` und `write`, beide asynchron), `LocalProfileStore` (Browser), `MemoryProfileStore` (Tests). Später: App-Speicher, eigener Dienst. |
| `profile.ts` | Klasse `Profile`: hält die Daten im Speicher, alle Lese- und Schreibwege, schreibt nach jeder Änderung entprellt (höchstens 250 ms, `SAVE_DELAY_MS`) im Hintergrund und synchron mit `flushSync` bei `visibilitychange` (hidden), `pagehide`, `beforeunload` und nach jedem Level und Kauf. Ist der Speicher voll oder gesperrt, läuft das Spiel im Speicher weiter und zeigt einmal einen Hinweis. |
| `sanitize.ts` | Bereinigt gelesene Daten Feld für Feld; Unbrauchbares wird durch Standardwerte ersetzt. |
| `index.ts` | Sammelt die Ausfuhren des Ordners. |
| `codec.ts` | Export und Import als Textcode mit Formatkennung (ein v0.2-Code wird klar abgelehnt). |

Inhalt der Blöcke:
- `wallet` (ausgebbar) und `earned` (je verdient): `cheese`, `gold`, `crests`.
- `keep`: `castleTier` und `handTier` (1 bis 7), `stations` (0 = nicht freigeschaltet, sonst Stufe), `weapons` (nur freigeschaltete, mit `tier`), `loadout` (fünf Einträge, die angelegte Waffe je Slot oder `null`).
- `worlds[weltId]`: `levelsDone`, `cheese` (Bitmaske der fünf Käse je Level: Sieg, Tor über 50 %, Tor über 90 %, Challenge 1, Challenge 2), `storyRead`, `scores` (Bestenliste, Feld `wave`), `endlessBest` (beste Welle je Schwierigkeit).
- `seen`: Tutorial, Gegner, Tipps, Slot-Einführungen, Willkommenshinweis `v3Notice`.
- `claimedRuns` (letzte 200 `runId`s), `devRatings`, `cheats` (`used`, Protokoll), `pendingRun`, `coopCampaign` (vorgehalten), `settings` und `name`.

**Käse genau einmal:** `applyLevelCheese` setzt nur Bits, die noch nicht gesetzt waren, und zählt nur diese; `earned.cheese` ist die Summe aller Bits.

Beschädigte Daten führen nie zum Absturz: Was sich nicht lesen lässt, wird unter einem eigenen Schlüssel (`…broken.<Zeit>`) zur Seite gelegt und durch Standardwerte ersetzt.

**Fortsetzen (E-070):** Zu Beginn jeder Welle legt die App allein in der Kampagne einen Speicherstand ab (`pendingRun`, `App.savePending` in `src/ui/app.ts`): Version, Regeln, Startwert und `RunStart` für diese Welle (`Sim.waveStartSave`: Torleben, Gold dieses Laufs, Statistik). Eine Prüfsumme der Level-Tabelle gibt es nicht; stattdessen prüft `App.pendingRun`, ob Modus, Level und Wellenzahl noch zur Tabelle passen, sonst wird der Stand nicht angeboten. Bei Niederlage und Sieg löscht `CampaignMode.reward` ihn. In der Lobby erscheint die Station „Continue“.

## 8. Bildschirme und Szenen

**HTML-Bildschirme** (`src/ui/`): `app.ts` ist die Klasse `App` (Start, Profil laden, Phaser, Sitzung, Adress-Schalter wie `?menu=`, `?fresh=`, `?profile=`, `?tutorial=`, `?join=`). `screens/screen.ts` enthält `Screen` und `ScreenManager`, je ein Bildschirm liegt in einer Datei unter `screens/`, verzeichnet in `screens/index.ts`. `coop/room.ts` ist `CoopRoom` (Raum eröffnen, beitreten, Wiedereinstieg).

| Datei | Bildschirm |
|---|---|
| `screens/main.ts` | Hauptmenü: über der Lobby nur Käse, Gold, Wappen und Fortschritt, mit `?menu=html` das einfache Menü |
| `screens/campaign.ts` | Kampagnen-Karte mit Level-Karte (Dauer, Landschaft, Besonderheit, Challenges, Käse 0 bis 5, Ausrüstungsleiste); Zeichnung in `ui/campaignArt.ts` |
| `screens/keep.ts` | **Shop an der Burg** (ersetzt die Waffenkammer, E-065; Bildschirm-Kennung `armoury`): Slots, Burg, Hand, Kessel, Haken; Freischalten, Verbessern, Anlegen |
| `screens/prelevel.ts` | Ausrüstung wechseln vor jedem Level und jeder Endlos-Runde (D2) |
| `screens/won.ts`, `gameover.ts` | Sieg (fünf Käse, Gold, Wappen, Freischaltungen, Einführungen des Königs) und Niederlage |
| `screens/play.ts`, `coop.ts`, `host.ts`, `join.ts`, `roomParts.ts` | Endlos, Koop, Räume mit Spielerliste |
| `screens/lostHost.ts`, `lostGuest.ts`, `pause.ts` | Verbindung weg, Pause |
| `screens/options.ts`, `scores.ts`, `help.ts`, `credits.ts`, `settingsFields.ts` | Options mit Profil-Export, Versionszeile und Entwickler-Knopf, Bestenliste, Hilfe, Credits |
| `enemyPopup.ts` | Popup „New enemy“ |
| `tuningPanel.ts` | Entwickler-Menü mit Waffen-Editor, Cheats, Reglern, Schaltern (Options, F1, langes Drücken aufs Logo) |
| `lobby/lobby.ts` | Steuert die Lobby: wann sie zu sehen ist, Kamerafahrt, Sprüche des Königs |
| `lobby/storybook.ts` | Storybuch-Fenster |
| `lobby/mode.ts` | `?menu=html` erkennen; welche Bildschirme über der Lobby liegen |
| `version.ts` | Versionszeile „v0.3 · build …“ |
| `content.ts`, `html.ts`, `style.css`, `lobby/lobby.css` | Hilfe-Texte, Lade-Tipps, Credits; HTML-Bausteine; Aussehen |

**Szenen und Zeichnen** (`src/render/`):

| Datei | Aufgabe |
|---|---|
| `scene.ts` | `GameScene`: das Schlachtfeld. Hände (auch die zweite), Banner, Effekte zu Ereignissen. |
| `lobby/lobbyScene.ts` | `LobbyScene`: die Halle in der Burg mit Stationen, König, Schmuck und Waffen an der Wand, als eigene Szene über dem Schlachtfeld. |
| `lobby/layout.ts` | Wo in der Halle was steht (`STATIONS`, `DECOR`, `WEAPON_PEGS`), welche Sprüche und Storybuch-Seiten zum Fortschritt passen. Reine Daten. |
| `lobby/dive.ts` | Kamerafahrt durch das Tor in die Halle und zurück (0,9 s), reine Rechnung. |
| `marketCamera.ts` | Kamera mit dem Westflügel der Burg, weiche Fahrt, reine Rechnung. Der Name stammt vom abgeschafften Markt. |
| `tutorialGuide.ts` | Ablauf der ersten Minuten ohne Zeichnen: `PreludeGuide` (König, Einfrieren, Geste, Rolling Wheel) und `PotHint` (Kessel-Hinweis). |
| `tutorialView.ts` | Zeichnet König, Sprechblase, Geste und Pfeil zum Kessel nach `tutorialGuide.ts`. |
| `castleView.ts`, `stations.ts` | Die sieben Burgstufen, Tor, Waffen an der Burg mit Nachladering (auch passive), Kessel und Haken (Haken-Zielring). |
| `enemyView.ts`, `effects.ts`, `hud.ts`, `background.ts`, `viewport.ts`, `textures.ts`, `glFix.ts` | Figuren, Effekte, HUD, Himmel und Landschaft (die Burg ist in Vorder- und Hintergrund eingebettet), Bildausschnitt, Texturen, Shader-Korrektur. |

**Grafik** (`src/art/`): `registry.ts` (Asset-Verzeichnis), `characters/` (eine Datei je Gegner), `castle/` (sieben Burgstufen `tiers.ts`, `keepStages.ts`, `keepStagesGrand.ts`, Tore, Westflügel `westWing.ts`, Kessel `cauldron.ts` auf dem Hügel `mound.ts`, Haken `perch.ts`, Waffen-Halter `mounts.ts`), `weapons/` (25 Waffen in sieben Stufen), `props/` (Icons, Geschosse, Effekte), `lobby/` (Halle `room.ts`, Möbel `furniture.ts`, Schmuck `decor.ts`, König auf dem Thron `king.ts`), `king.ts` (König auf dem Schlachtfeld), `landscapes.ts`, `shade.ts`, `draw.ts`.

Die Lobby ist eine echte Szene. Die Kampagnen-Karte und der Shop sind HTML-Bildschirme, weil sich HTML mit dem Finger am besten scrollen und antippen lässt; der Shop zeichnet die Burg aus denselben Bildern wie das Schlachtfeld. Eine eigene Klasse `CameraDirector` gibt es nicht: Die Burg-Kamera rechnet `marketCamera.ts`, die Fahrt in die Lobby `lobby/dive.ts`.

## 9. Grafik austauschbar

`src/art/registry.ts` ist das Verzeichnis aller Grafiken: fester Name → Größe, Ankerpunkt, heute SVG-Text. `src/config/assets.ts` kann einen Namen auf eine Bilddatei umlenken; `textures.ts` lädt dann die Datei statt des SVG, in derselben Lade-Reihenfolge. Figuren bestehen aus Teilen; ersetzt wird je Teil. Anleitung und Liste: `docs/GRAFIK-AUSTAUSCHEN.md`.

## 10. Netz

Der Aufbau bleibt: Der Host rechnet, der Gast sagt Griff und Wurf voraus.
- `lobby` und `welcome` tragen Modus, Welt, Level und Schwierigkeit.
- Der Gast schickt seine Hand-Stufe bei jedem Start eines Laufs.
- `rules` gehen einmal beim Start zum Gast, der Stand (`loadout`) mit `Meta`.
- Snapshots kodieren Slots statt fester Waffennamen und die Wirkungsflächen.
- `PROTOCOL_VERSION` steigt.

Was Host und Gast beide rechnen, steht in `src/sim/physics.ts` und wird von `Hands`/`Flight` und von `GuestSession` benutzt: die Wurf-Begrenzung mit Gewicht und Hand-Stufe, der kleine Bogen für flache Würfe, die Haltefeder mit Gewicht. Der Gast liest seine Hand-Stufe aus `Meta.loadout`, das Gewicht aus `ENEMIES`.

Schütteln wird auf dem Gerät erkannt (`src/input/shake.ts`, reine Funktion über den Zeigerverlauf) und als Befehl `shake` geschickt. Der Host prüft nur, ob diese Hand einen Keg Hauler mit Fass hält.

Ehrlich: Das Datenmodell (Namen, Hände, Raum-Fenster) ist für mehr als zwei Spieler als Liste angelegt. Der Netzcode kennt heute genau einen Gast.

### Glättung beim Gast

Der Host schickt höchstens einen Snapshot pro eigenem Frame (alle 2 Ticks, also 30 pro Sekunde; ein langsamer Frame schickt nur den neuesten Stand). Der Gast legt jeden Snapshot auf die Uhr des Hosts (`tick`), nicht auf den Zeitpunkt der Ankunft: `PlayoutBuffer` in `src/net/interp.ts`. Er zeichnet einen kleinen Abstand hinter dem Host, der sich selbst einstellt (Snapshot-Abstand + 90-%-Jitter + 10 ms, zwischen 50 und 250 ms). Kommt ein Snapshot zu spät, laufen die Figuren höchstens 100 ms geradeaus weiter und bleiben dann stehen. Pause und eingefrorene Seite erkennt der Puffer am stehenden Tick und misst danach neu; das Bild läuft nie rückwärts. Ereignisse (Treffer, Klang) hört der Gast um denselben Abstand später, damit sie zum Bild passen. Die eigene Hand zeichnet der Gast sofort an der Fingerstelle. Messwerte: `docs/v0.3/MESSUNGEN-KOOP.md`.

### Version und Adresse

`hello` trägt die Version (`BUILD` = Protokoll, Spielversion, Build-Hash) und die Adresse (`ADDRESS` = Origin + Pfad). Passt die Version nicht, schickt der Host `reject` mit seiner Version und Adresse, und beide sehen eine Meldung mit beiden Versionen und was zu tun ist (`mismatchText` in `src/ui/coop/room.ts`): bei gleicher Adresse neu laden, sonst die Adresse des Hosts öffnen.

### Verbindung austauschbar (Relay und Matchmaking später)

Das Spiel kennt nur die Schnittstellen aus `src/net/transport.ts`. Welche Verbindung gilt, entscheidet allein `pickTransport` in `src/net/choose.ts`. Ein gemieteter Server kommt später als weiterer Eintrag dort dazu; Raum, Sitzungen und Spiel bleiben, wie sie sind. Heute ist kein Server eingerichtet.

| Teil | Aufgabe |
|---|---|
| `Transport` | Eine Verbindung Host ↔ Gast: `send(msg)`, `onMessage`, `onClose`, `close()`, optional `congested()` (dann lässt der Host Snapshots aus). Nachrichten kommen vollständig und in Reihenfolge an. |
| `TransportKind.host(code, onGuest, onError)` | Öffnet einen Raum unter einem Code und meldet jeden Gast als eigenen `Transport`. |
| `TransportKind.join(code)` | Tritt einem Raum bei; lehnt mit lesbarer Meldung ab. |
| `withLatency` | Legt für Tests Verzögerung, Jitter und Nachsendungen über jede Verbindung (`?lat=&jit=&loss=`). |

Heutige Umsetzungen: PeerJS direkt (`peer.ts`, Standard), Relay über WebSocket (`relay.ts` mit `server/relay`, wenn in den Einstellungen eine Relay-Adresse steht), Loopback zwischen zwei Tabs (`loopback.ts`, `?net=loopback`). Ein eigener Relay-Server muss nur das Verhalten von `server/relay` liefern: WebSocket mit `?room=CODE&role=host|guest`, Nachrichten als JSON-Text unverändert weiterreichen, Systemnachrichten `{sys: 'guest' | 'guest-left'}` an den Host und `{sys: 'ready' | 'no-host' | 'host-left'}` an den Gast. Matchmaking (Raum ohne Code finden) wäre eine Funktion, die einen Code liefert und dann `host` oder `join` aufruft; die Versionsprüfung bleibt im `hello` und braucht den Server nicht.


## 11. Was wohin gewandert ist

Frühere Stände (v0.2 und davor) und ihr Gegenstück in v0.3:

| Früher | Heute |
|---|---|
| Tage (`day`, `lastDay`, `DayFlow`, `DayPlanner`, `DayDef`) | Wellen (`wave`, `lastWave`, `WaveFlow`, `WavePlanner`, `WaveDef`) |
| Markt zwischen den Tagen (`Shop`, `shop.ts`, Phase `intermission`, `buy*`-Befehle, `marketOnly`, `hasMarket`) | Gibt es nicht mehr. Gekauft wird im Shop an der Burg zwischen den Leveln (`src/ui/screens/keep.ts`, `src/modes/progress.ts`) |
| Sterne (`stars.ts`) und Waffenkammer (`armoury.ts`) | Käse für Freischaltungen, Gold für Stufen; der Shop ersetzt die Waffenkammer (E-065) |
| Offerings (`offeringGold`, `buyOfferings`) | Entfallen. Der Kessel zahlt doppeltes Gold (`ECONOMY.cauldronGoldFactor`), der Haken bringt Räuberwappen (`CRESTS`) |
| Slot-Typen `foot`, `wall`, `shrine`, `gate`, `tower` | Slot-Aufgaben `damage`, `slow`, `support`, `passive`, `gate` (`SlotRole`) |
| Tore (`GATES`, 5 Stufen) | Burg-Stufen (`CASTLE_TIERS`, 7 Stufen; die Burg ist das Tor) |
| Waffen mit 5 Stufen, im Lauf verbessert oder aus Sternen | 25 Waffen mit 7 Stufen, dauerhaft im Profil (`keep.weapons`) |
| Hand mit 3 Stufen | Hand mit 7 Stufen, Stufe 7 mit zweiter Hand |
| Profil `fondue.profile` | `fondue.v3.profile`, eigenes Format, Version 1 |
| `meta.today` (Landschaft, Nacht, Boss des Tages) | `meta.wave` |
| `config/world.ts` | `config/field.ts` |
| `RunRules.tierUpgrades`, `handBuyable`, `fixedTier` | Entfallen: Die Burg im Lauf kommt fest aus dem Profil (`Loadout`) |

## 12. Vorgehalten, aber nicht gebaut

Koop-Kampagne (Feld `coopCampaign` im Profil, Name in `RESERVED_MODES`), Schnellspiel, „Wahnsinn“, weitere Welten (`WORLDS`), Accounts und Cloud (`ProfileStore`, `profileId`, `updatedAt`, Format mit Versionskette), drei bis vier Spieler (Listen im Datenmodell, Handnummern), ein eigener Relay- oder Matchmaking-Server (`pickTransport`), Bosse im Endlos-Modus, Wetter, Versus, Ping-Markierung. Auch die Store-Apps (Capacitor für iOS und Android) sind nicht gebaut; nichts in v0.3 verbaut sie.

## 13. Etappen von v0.3

1. **Gerüst und Version:** eigener Speicherschlüssel `fondue.v3.`, Versionsnummer sichtbar, Deploy für `/fondue/next/` und `/fondue/v0.2/`.
2. **Fundament:** Profil v3 mit Käse, Gold, Wappen und dauerhafter Burg, `progress.ts` und `unlocks.ts`; Level aus Wellen ohne Markt, Lauf mit der dauerhaften Burg.
3. **Inhalte:** 25 Waffen mit sieben Stufen und ihre Grafik, sieben Burgstufen, Kampagne mit Challenges, Tutorial, Entwickler-Werkzeuge (Waffen-Editor, Cheats, Übersicht).
4. **Shop, Lobby und Bildschirm vor dem Level;** Hände, Stationen, zweite Hand.
5. **Modi:** Endlos mit eigener Burg, Koop mit Burg des Hosts, Glättung beim Gast, Versionsmeldung, austauschbare Verbindung.
6. **Balance mit Bots:** Ausbau zwischen den Läufen, Wappen-Grind, Koop-Faktor, Messungen in `docs/balance.md`.
7. **Prüfung und Abschluss:** unabhängige Prüfung, Dokumente, Pull Request von `v0.3-dev` nach `main` (noch nicht gemergt).

Der genaue Stand steht in `docs/v0.3/PROGRESS.md`, `docs/v0.3/UEBERGABE.md` und in der Abnahmeliste `docs/v0.3/abnahme.json`.
