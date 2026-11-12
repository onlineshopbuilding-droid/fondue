# Fondue – Architektur

Dieses Dokument beschreibt den Aufbau nach dem großen Update: welche Ordner es gibt, welche Klasse welche Aufgabe hat und wie die Daten fließen. Es richtet sich an Tim, Lenny und jede KI, die weiterbaut. Die Rezepte („ich will ein neues Level, eine neue Waffe …“) stehen in `docs/HANDBUCH.md`.

Stand: 12.11.2026, an den Code angeglichen (erste Fassung 11.11.2026, geprüft von einem unabhängigen Gutachter). Wo der Code vom ursprünglichen Plan abweicht, steht hier, was wirklich gebaut ist.

## 0. Sechs Begriffe vorab

| Begriff | Bedeutung |
|---|---|
| **deterministisch** | Gleicher Startwert und gleiche Eingaben ergeben immer denselben Verlauf. Deshalb gibt es in der Simulation keinen echten Zufall und keine Uhr. |
| **Host und Gast** | Im Koop rechnet nur der Host das Spiel. Der Gast schickt Eingaben und zeigt, was der Host meldet. |
| **Command** | Eine Eingabe an die Simulation, zum Beispiel „Hand drückt hier“, „Waffe in Slot 2 abfeuern“, „kaufen“. |
| **SimEvent** | Etwas ist einmalig passiert (Aufprall, Tod, Kauf). Löst Effekte und Klänge aus. |
| **ViewState** | Alles, was ein einzelnes Bild braucht: Gegner, Geschosse, Hände, Gold, Tor. Kommt 30-mal pro Sekunde beim Gast an. |
| **Meta** | Selten geänderte Daten eines Laufs: Namen, was in welchem Slot steckt, Ready, Regeln. Wird nur bei Änderung geschickt. |

**Ein Durchlauf als Beispiel:** Tim tippt in der Lobby auf die Kampagne und wählt Level 7. Die App fragt `CampaignMode.buildRun(profil, { world: 'fondue', level: 7 }, umgebung)` und bekommt ein `RunSetup`: die Regeln (welche Slots offen sind, welche Waffen auf welcher Stufe, sieben Tage) und den Tagesplaner. Daraus entsteht eine `HostSession` mit einer `Sim`. Tim packt einen Gegner: Die Szene schickt `press` und `release` an die Session, die `Sim` rechnet den Wurf, meldet `impact` und `death`, die Szene zeigt Staub und Goldzahl. Nach Tag 7 setzt die `Sim` die Phase `runWon` und legt das Ergebnis in `Meta.result`. Die App gibt es an `CampaignMode.reward(ergebnis, regeln, profil, rolle)`, der Modus schreibt Sterne und „Level 7 geschafft“ ins Profil und meldet, was neu freigeschaltet ist. Der Sieg-Bildschirm zeigt es, dann fährt die Kamera in die Burg.

## 1. Leitgedanken

1. **Daten statt Code.** Level, Waffen, Gegner, Freischaltungen, Sterne, Story stehen als Tabellen in `src/config/`.
2. **Die Simulation weiß nichts vom Drumherum.** Sie bekommt fertige Regeln für einen Lauf und Tagespläne. Sie kennt weder Kampagne noch Endlos, weder Profil noch Browser.
3. **Ein Modus entscheidet, die Simulation rechnet.** Tutorial, Kampagne und Endlos sind eigene Klassen. Ein Modus baut den Lauf und verteilt am Ende die Belohnung.
4. **Bewährtes wird bewegt, nicht neu erfunden.** Wurfphysik, Netzcode, Sitzung, Audio und Grafik-Bausteine bleiben im Kern.
5. **Die vier alten Regeln gelten weiter:** `src/sim/` kennt weder Phaser noch DOM; dort kein `Math.random`; Zahlen in die Konfiguration; der Spielname nur in `src/config/game.ts`.
6. **Regeln und Stand sind getrennt.** Regeln eines Laufs ändern sich nie (`RunRules`). Was sich im Lauf ändert (welche Waffe in welchem Slot, Stufen, Gold), ist Stand und liegt im Zustand der Simulation.

## 2. Datenfluss

```
Profil (src/profile/)  <---- Belohnung ----+
   |  Freischaltungen, Stufen, Hand        |
   v                                       |
Modus (src/modes/)  -- baut --> RunSetup --+--> wertet RunResult aus
                                  |
                                  v
                     Session (src/game/session.ts)
                       HostSession besitzt die Sim, GuestSession sagt voraus
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
| `src/modes/` | Tutorial, Kampagne, Endlos; Belohnungsregeln. | `config`, `sim`, `profile` |
| `src/profile/` | Dauerhafter Spielstand. | `config` |
| `src/bots/` | Spielende Bots und der Kampagnen-Durchlauf für die Balance. | `config`, `sim`, `modes`, `profile` |
| `src/game/` | `Session` (Host und Gast). | `sim`, `net` |
| `src/net/` | Netznachrichten, Snapshots, Verbindungsarten. | `sim` (Typen) |
| `src/art/` | Grafik aus Code und das Asset-Verzeichnis. | `config` |
| `src/render/` | Phaser-Szenen und alles, was zeichnet. | alles außer `ui` |
| `src/ui/` | HTML-Bildschirme über dem Canvas, ein Bildschirm pro Datei. | alles |
| `src/audio/`, `src/input/` | Klang; Zeiger, Wurfgeschwindigkeit, Schüttel-Erkennung. | `config` |
| `scripts/` | Werkzeuge, die mit `node` laufen: Entwickler-Übersicht (`dev-page.ts`, Seite in `dev-page/page.ts`), Level-Tabelle (`campaign-table.ts`), Asset-Liste (`list-assets.ts`), Android-Hülle (`android-setup.mjs`). Lesen `src/config/` und `docs/`. | `config`, `modes`, `sim` |

`src/sim/`, `src/config/`, `src/modes/`, `src/profile/` und `src/bots/` importieren weder Phaser noch DOM. Geplant war ein eigener Test dafür (`tests/unit/architecture.test.ts`); den gibt es nicht. Die Unit-Tests und die Balance-Bots laufen ohne Browser und scheitern, sobald dort Phaser landet.

## 4. Konfiguration (`src/config/`)

Jede Tabelle hat oben einen Kommentar, der die Spalten erklärt.

| Datei | Inhalt |
|---|---|
| `game.ts` | Name des Spiels (`GAME_NAME`). Der Schalter, der den Knopf zum Entwickler-Menü zeigt, heißt `DEV_MENU_BUTTON` und steht in `src/ui/screens/options.ts`. |
| `enemies.ts` | `ENEMIES`: das Verzeichnis aller Gegner mit Werten, `mass` (Gewicht) und Popup-Text; `BEHAVIOUR`. Eine Welt wählt daraus aus. |
| `weapons.ts` | `WEAPONS`: eine Definition je Waffe (Slot-Typ, Art des Verhaltens, Zielwahl, 5 Stufen mit Werten, Preise, Texte, Grafikname, `enabled`). |
| `slots.ts` | `SLOTS`: die fünf Waffenplätze der Burg mit Typ (`foot`, `wall`, `shrine`, `gate`, `tower`) und Lage. |
| `keep.ts` | Tore und Ausbaustufen (`GATES`), Offering-Stationen (`STATIONS`: Kessel, Adlerhaken) mit Preisen. |
| `hand.ts` | `HANDS`: Stärke der Hand je Stufe, Preise in Gold (Endlos) und Sternen (Kampagne). |
| `economy.ts` | Gold extra je Offering, Tor-Heilung. |
| `waves.ts` | Tageslänge, Wachstum pro Tag, Schwierigkeitsgrade (`DIFFICULTIES`), Koop (`COOP`). |
| `stars.ts` | Stern-Belohnungen und -Preise, Regeln gegen Farmen, Meilensteine im Endlos-Modus. |
| `field.ts` | Geometrie des Schlachtfelds (bisher `world.ts`; umbenannt, weil „Welt“ jetzt etwas anderes heißt). |
| `tuning.ts`, `flags.ts`, `quickstart.ts` | Wurfgefühl, Experiment-Schalter, Entwickler-Schnellstart. |
| `assets.ts` | Überschreibungen im Asset-Verzeichnis: Name → Bilddatei (nur Pfad-Texte). |
| `worlds/index.ts` | `WORLDS`: Liste aller Welten. |
| `worlds/types.ts` | `WorldDef`, `LevelDef`, `DayDef`, `BossDef`, `TwistDef`, `HintDef`, `UnlockDef`, `EndlessDef`. |
| `worlds/fondue/world.ts` | Welt 1 als Paket: König, Landschaften, Gegnerauswahl, Offering-Stationen, Verweise auf Kampagne, Story und Endlos-Tabelle. |
| `worlds/fondue/campaign.ts` | Die 100 Level: Regeln der Kurve plus `LEVEL_OVERRIDES` für einzelne Level. `buildCampaign()` liefert `LevelDef[]`. |
| `worlds/fondue/unlocks.ts` | Freischalt-Tabelle: welches Level schaltet welche Waffe, welchen Slot, was sonst frei. |
| `worlds/fondue/endless.ts` | Endlos-Zufall dieser Welt: Spanne der Gegnerzahl, Fenster der Erstauftritte, Wahrscheinlichkeiten; Schalter „nur freigeschaltete Waffen“ und „Endlos ab Level“. |
| `worlds/fondue/story.ts` | König (`KING`), Sätze der Vorrunde (`PRELUDE_LINES`), Hinweise in Level 1 (`TUTORIAL_HINTS`), Namen und Story-Satz je Level (`LEVEL_NAMES`, `LEVEL_STORY`), Bosse (`BOSSES`), Popups „New enemy“ (`ENEMY_POPUPS`), Sprüche des Königs in der Lobby (`KING_LOBBY_LINES`), Storybuch (`STORYBOOK`). |

Die fertige Level-Tabelle wird zusätzlich als lesbares Dokument erzeugt (`docs/KAMPAGNE-TABELLE.md`, Skript `scripts/campaign-table.ts`, Aufruf `node scripts/campaign-table.ts`); der Test `tests/unit/campaignTable.test.ts` prüft, dass es zum Code passt. Wer ein Level ändern will, trägt es in `LEVEL_OVERRIDES` ein.

```ts
interface LevelDef {
  id: number;                 // 1 bis 100
  name: string;
  landscape: Landscape;
  days: DayDef[];             // 2 bis 10 Tage
  power: number;              // Stärke der Gegner in diesem Level (Leben, Tempo, Torschaden, Gold)
  boss: BossDef | null;       // Boss-Level: Name und Satz des Bosses
  twist: TwistDef | null;     // Besonderheit, z. B. { kind: 'onlyTypes', types: ['pogo'], label: 'Hoppers only' }
  stars: number;              // Belohnung beim ersten Schaffen
  story: string;              // ein Satz
  marketOnly: string[] | null; // Einschränkung im Markt (Level 1: nur 'station:cauldron')
  startGold: number;
  hints: HintDef[];           // geführte Hinweise des Königs (Level 1)
  newEnemies: EnemyType[];    // aus FIRST_LEVEL berechnet
}
interface DayDef { counts: Partial<Record<EnemyType, number>>; night: boolean; seconds: number; big: Partial<Record<EnemyType, number>>; }
```

Neue Gegner eines Levels werden aus den Tagen berechnet, nicht von Hand gepflegt.

## 5. Simulation (`src/sim/`)

`sim.ts` war eine Datei mit 1430 Zeilen. Sie ist nach Themen in Klassen zerlegt (erledigt, Commit `6aac847`). `Sim` ist die eine Tür nach außen. Die Teile halten keinen eigenen Zustand; alles liegt in `SimState`. Sie erreichen einander über den gemeinsamen `SimContext` (`ctx.combat`, `ctx.hands` …).

| Datei | Klasse | Aufgabe |
|---|---|---|
| `sim.ts` | `Sim` | Baut den Zustand, nimmt `Command`s an, macht einen Schritt, gibt `SimEvent`s heraus. |
| `context.ts` | `SimContext` | Zustand, Zufall, Ereignisliste, kleine Helfer und Verweise auf alle Teile. |
| `dayFlow.ts` | `DayFlow` | Tagesablauf: Banner, Kampf, Sonnenuntergang, Markt, Sieg und Niederlage des Laufs. |
| `spawner.ts` | `Spawner` | Lässt die Gegner des Tagesplans auftreten. |
| `enemies.ts` | `EnemyBehaviour` | Laufen, Angreifen, Springen, Schweben, Betäubt, Gefroren. |
| `hands.ts` | `Hands` | Greifen, Halten, Schütteln, Werfen. |
| `flight.ts` | `Flight` | Geworfene Gegner in der Luft, Aufprall. |
| `stations.ts` | `Stations` | Kessel und Adlerhaken samt Zielhilfe. |
| `projectiles.ts` | `Projectiles` | Bomben, Steine, Geschosse der Waffen. |
| `zones.ts` | `Zones` | Wirkungsflächen am Boden: Feuer, klebriger Käse. |
| `weapons/system.ts` | `WeaponSystem` | Welche Waffe in welchem Slot sitzt, Nachladen, Antippen. |
| `weapons/behaviour.ts` | `WeaponBehaviour` | Schnittstelle, die jede Waffenart erfüllt. |
| `weapons/behaviours/*.ts` | je eine Klasse | Verhalten je Waffenart (14 Arten: roll, puddle, spikes, slam, push, stop, sky, chain, gold, shell, thorns, volley, sentry, beacon); Verzeichnis `BEHAVIOURS` in `index.ts`. |
| `weapons/targeting.ts` | Funktionen | Automatische Zielwahl: nächster am Tor, dichteste Gruppe, stärkster Gegner. |
| `shop.ts` | `Shop` | Kaufen, Preise, was laut Regeln kaufbar ist. |
| `combat.ts` | `Combat` | Schaden, Tod mit Gold-Auszahlung, Flächenschaden, Schaden am Tor. |
| `stats.ts` | `RunStats` | Zählt mit (Daten `RunStatsData` in `rules.ts`, im `SimState`): Kills nach Ursache und Typ, Offerings, Fass-Explosionen, Waffen-Einsätze, verlorenes Torleben. |
| `physics.ts` | Funktionen | Wurf-Begrenzung, Gewicht, Haltefeder. Host und Gast benutzen dieselben Funktionen. |
| `plan.ts` | `DayPlanner`, `DayPlan` | Schnittstelle: „Was kommt an Tag n?“ |
| `spawn.ts` | Funktionen | Verteilt Gegner über den Tag (Rudel, Dichte). |
| `rules.ts` | `RunRules`, `RunSetup`, `RunStart`, `RunResult` | Die Datentypen eines Laufs. |

### Was die Sim bekommt

```ts
interface RunSetup {
  seed: number;
  names: string[];
  tuning: Tuning;
  flags: Flags;
  fieldW: number;
  rules: RunRules;      // unveränderliche Regeln; gehen einmal zum Gast
  planner: DayPlanner;  // nur beim Host; rechnet rein aus (Tag, Zufall) einen Plan
  start: RunStart;      // Startwerte: Tag, Gold, Offerings, Tor, Slots, Stufen, Statistik
}

interface RunRules {
  runId: string;               // damit eine Belohnung genau einmal eingelöst wird
  mode: string;                // 'tutorial' | 'campaign' | 'endless'
  world: string;               // 'fondue'
  level: number | null;
  difficulty: Difficulty | null;       // nur Anzeige und Bestenliste
  lastDay: number | null;      // letzter Tag; null = ohne Ende
  players: number;
  scaling: Scaling;            // Zahl, Tempo, Torschaden, Leben, Gold, Wachstum pro Tag, easeIn (Kampagne)
  slotsOpen: boolean[];        // welche der fünf Slots es gibt
  weapons: Record<string, { offered: boolean; fixedTier: number | null }>;
  stationsOffered: StationId[]; // 'cauldron', 'perch'
  maxGateTier: number;
  handStart: number[];         // Hand-Stufe je Spieler beim Start
  handBuyable: boolean;        // Endlos: ja, Kampagne: nein
  tierUpgrades: boolean;       // Endlos: ja, Kampagne: nein
  hasMarket: boolean;          // Vorrunde: nein
  gateCannotFall: boolean;     // Vorrunde: ja
  marketOnly: string[] | null; // Level 1: nur der Kessel
}
```

Die Landschaft eines Tages kommt aus dem Tagesplan (`DayPlan.landscape`), nicht aus den Regeln.

`fixedTier` ist der Kern des Unterschieds: In der Kampagne steht dort die dauerhafte Stufe aus dem Profil, und im Level wird nichts verbessert. Im Endlos-Modus steht dort `null`, die Waffe startet auf Stufe 1 und wird im Lauf verbessert.

Der **Stand** liegt in `Meta.loadout` und ändert sich durch Käufe: `gateTier`, `slotWeapon[5]`, `weaponTier{}`, `stations{}`, `handTier[]`. `Meta.today` trägt, was Szene und Gast über den laufenden Tag wissen müssen: Landschaft, Nacht, Boss, Gegnertypen, Länge. `Meta.devRun` wird wahr, sobald jemand mit Entwickler-Werkzeugen eingreift; solche Läufe zählen nicht.

### Determinismus

- Der Tagesplaner ist eine reine Rechnung. Die Sim gibt ihm für jeden Tag einen eigenen Zufallsstrom, abgeleitet aus Startwert und Tagesnummer. Der Plan eines Tages hängt damit nicht vom Kampf davor ab, und ein fortgesetzter Lauf bekommt denselben Plan.
- Die Kampagne hat einen festen Startwert je Welt und Level. Jeder Versuch eines Levels läuft gleich an.
- Außerhalb von Entwickler-Läufen gelten immer die Standardwerte des Wurfgefühls (`TUNING_DEFAULT`). Das behebt nebenbei die alte Falle 1 (gespeichertes Tuning).

### Phasen

`banner` → `battle` → `victory` (Tag geschafft) → `intermission` (Markt) → … Neu: `runWon` (letzter Tag geschafft, Lauf gewonnen) neben `defeat` → `gameover`. Neu ist außerdem `hold`: Die Simulation steht still, bis ein `resume` kommt. Das Tutorial benutzt es für die Geste; es ist keine Pause und zeigt kein Pausenfenster.

### Waffen

Eine Waffe besteht aus zwei Teilen:
- **Definition** in `src/config/weapons.ts` (Daten).
- **Verhalten** in `src/sim/weapons/behaviours/<kind>.ts`: eine kleine Klasse mit `fire(ctx, tier, player)` und bei Bedarf `tick(ctx, tier)` für Waffen, die von allein wirken.

Alle Waffen werden nur angetippt (`fireSlot`). Die Zielwahl steht je Waffe in der Tabelle.

Ehrliche Liste, was eine neue Waffe berührt: der Tabelleneintrag; die Grafik im Asset-Verzeichnis (`weapon:<id>:<stufe>`); nur bei neuer Art von Verhalten eine Klasse und eine Zeile im Verzeichnis der Verhalten; nur bei neuem Geschoss ein Eintrag in `ProjectileKind` und der Snapshot-Liste; nur bei neuem Effekt ein Fall in der Szene. Die Bots lesen die Tabelle.

Befehle rund um Waffen und Markt: `fireSlot(slot)`, `buyWeapon(slot, id)`, `swapWeapon(slot, id)`, `upgradeWeapon(id)`, `buyGate`, `buyStation(id)`, `buyHand`, `shake` (Fass abschütteln).

## 6. Modi (`src/modes/`)

```ts
interface GameMode {
  readonly id: string;
  isAvailable(profile: Profile, world: string): boolean;          // z. B. Endlos ab Level n
  buildRun(profile: Profile, choice: RunChoice, env: RunEnv): RunSetup;
  reward(result: RunResult, rules: RunRules, profile: Profile, role: 'solo' | 'host' | 'guest'): Reward;
  next(result: RunResult, rules: RunRules, profile: Profile): NextStep;  // Vorrunde → Level 1, sonst Lobby
}
```

- `RunChoice`: was der Spieler gewählt hat (Welt, Level, Schwierigkeit, Endlos-Schnellstart, Entwickler-Sprung auf einen Tag, fortgesetzter Tag `resume`).
- `RunEnv`: was die App weiß (Namen, Feldbreite, Hand-Stufen der Mitspieler, Entwickler-Tuning und -Schalter, `devRun`, fester Startwert).
- `RunResult`: gewonnen oder verloren, erreichter Tag, Punkte, Statistik, `runId`, `devRun`.
- `Reward`: verdiente Sterne, erster Sieg, neue Freischaltungen, Story-Satz, Bestenlisten-Eintrag, nächstes Level.

Die Hinweise des Königs im Markt kommen nicht aus dem Modus, sondern aus den Daten des Levels (`LevelDef.hints`); gezeigt werden sie von `src/render/tutorialView.ts` und dem Markt-Bildschirm.

| Datei | Klasse | Aufgabe |
|---|---|---|
| `tutorial.ts` | `TutorialMode` | Nur die Vorrunde: kein Menü, kein Markt, Tor kann nicht fallen, Geste zum Nachmachen. Danach geht es in Level 1. |
| `campaign.ts` | `CampaignMode` | Level aus der Tabelle (auch Level 1 mit seinen geführten Hinweisen), Freischaltungen und Stufen aus dem Profil, Sterne beim Sieg. |
| `endless.ts` | `EndlessMode` | Schwierigkeit wählbar, Zufall aus der Welt-Tabelle, Sterne für Meilensteine, Bestenliste. |
| `endlessPlanner.ts` | `EndlessPlanner`, `endlessRolls` | Tagespläne des Endlos-Modus aus der Welt-Tabelle; würfelt einmal je Lauf die Erstauftritte. |
| `unlocks.ts` | Funktionen | Liest die Freischalt-Tabelle: `unlocksOfLevel`, `syncUnlocks`, `maxGateTier`, `maxHandTier`, `unlockLevelOf`. |
| `mode.ts` | `GameMode` und Typen | Die gemeinsame Schnittstelle. |
| `index.ts` | `MODES` | Verzeichnis. Reserviert, nicht gebaut: `RESERVED_MODES` = `coopCampaign`, `quickPlay`, `madness`. |

Eine eigene Datei `rewards.ts` gibt es nicht: Die Belohnungsregeln stehen in `reward` des jeweiligen Modus und rechnen auf `RunResult` und seiner Statistik. Spätere Challenges und Bonus-Sterne sind dort neue Regeln.

## 7. Profil (`src/profile/`)

| Datei | Inhalt |
|---|---|
| `schema.ts` | `ProfileData` mit `version`, `profileId`, `updatedAt`; Standardwerte. |
| `migrations.ts` | Eine Funktion je Versionssprung; übernimmt einmalig `fondue.settings.v1` und `fondue.scores.v1` (die alten Schlüssel bleiben liegen, die Classic-Version benutzt sie weiter). |
| `store.ts` | `ProfileStore` (Schnittstelle mit `read` und `write`, beide asynchron), `LocalProfileStore` (Browser), `MemoryProfileStore` (Tests). Später: App-Speicher, eigener Dienst. |
| `profile.ts` | Klasse `Profile`: hält die Daten im Speicher, alle Lese- und Schreibwege, schreibt nach jeder Änderung im Hintergrund. |
| `sanitize.ts` | Bereinigt gelesene Daten Feld für Feld; Unbrauchbares wird durch Standardwerte ersetzt. |
| `index.ts` | Sammelt die Ausfuhren des Ordners. |
| `codec.ts` | Export und Import als Textcode. |

Inhalt: Spielername, Einstellungen, Sterne, je Welt (`worlds[weltId]`): geschaffte Level, eingelöste Gast-Sterne, gelesene Story-Seiten, Endlos-Meilensteine, Bestenliste; freigeschaltete Waffen und Slots, Waffenstufen, Hand-Stufe; gesehenes Tutorial, gesehene Popups; eingelöste `runId`s; Entwickler-Bewertungen; `pendingRun` (unterbrochenes Level); Platz für `coopCampaign`. Sterne, Waffenstufen und Hand gelten vorerst über alle Welten (Entscheidungsliste).

Beschädigte Daten führen nie zum Absturz: Was sich nicht lesen lässt, wird unter einem eigenen Schlüssel zur Seite gelegt und durch Standardwerte ersetzt.

**Fortsetzen:** Zu Beginn jedes Tages und beim Eintritt in den Markt legt die App allein in der Kampagne einen Speicherstand ab (`pendingRun`, `App.savePending` in `src/ui/app.ts`): Version, Regeln, Startwert und `RunStart` für diesen Tag (`Sim.dayStartSave`). Eine Prüfsumme der Level-Tabelle gibt es nicht; stattdessen prüft `App.pendingRun`, ob Modus, Level und Tag noch zur Tabelle passen, sonst wird der Stand nicht angeboten. Bei Niederlage und Sieg löscht `CampaignMode.reward` ihn. In der Lobby erscheint die Station „Continue“.

## 8. Bildschirme und Szenen

**HTML-Bildschirme** (`src/ui/`): `app.ts` ist die Klasse `App` (Start, Profil laden, Phaser, Sitzung, Adress-Schalter wie `?menu=`, `?fresh=`, `?profile=`, `?tutorial=`, `?join=`). `screens/screen.ts` enthält `Screen` und `ScreenManager`, je ein Bildschirm liegt in einer Datei unter `screens/`, verzeichnet in `screens/index.ts`. `coop/room.ts` ist `CoopRoom` (Raum eröffnen, beitreten, Wiedereinstieg).

| Datei | Bildschirm |
|---|---|
| `screens/main.ts` | Hauptmenü: über der Lobby nur Sterne und Fortschritt, mit `?menu=html` das einfache Menü |
| `screens/campaign.ts` | Kampagnen-Karte mit Level-Karte; Zeichnung in `ui/campaignArt.ts` |
| `screens/armoury.ts` | Waffenkammer: Stufen und Hand mit Sternen |
| `screens/shop.ts` | Fenster des Markts an der Burg |
| `screens/results.ts`, `readyControls.ts` | Ergebnis des Tages, Ready |
| `screens/won.ts`, `gameover.ts` | Sieg und Niederlage |
| `screens/play.ts`, `coop.ts`, `host.ts`, `join.ts`, `roomParts.ts` | Endlos, Koop, Räume mit Spielerliste |
| `screens/lostHost.ts`, `lostGuest.ts`, `pause.ts` | Verbindung weg, Pause |
| `screens/options.ts`, `scores.ts`, `help.ts`, `credits.ts`, `settingsFields.ts` | Options mit Profil-Export und Entwickler-Knopf, Bestenliste, Hilfe, Credits |
| `enemyPopup.ts` | Popup „New enemy“ |
| `tuningPanel.ts` | Entwickler-Menü (Options, F1, langes Drücken aufs Logo) |
| `lobby/lobby.ts` | Steuert die Lobby: wann sie zu sehen ist, Kamerafahrt, Sprüche des Königs |
| `lobby/storybook.ts` | Storybuch-Fenster |
| `lobby/mode.ts` | `?menu=html` erkennen; welche Bildschirme über der Lobby liegen |
| `content.ts`, `html.ts`, `style.css`, `lobby/lobby.css` | Hilfe-Texte, Lade-Tipps, Credits; HTML-Bausteine; Aussehen |

**Szenen und Zeichnen** (`src/render/`):

| Datei | Aufgabe |
|---|---|
| `scene.ts` | `GameScene`: das Schlachtfeld. |
| `lobby/lobbyScene.ts` | `LobbyScene`: die Halle in der Burg mit Stationen, König, Schmuck und Waffen an der Wand, als eigene Szene über dem Schlachtfeld. |
| `lobby/layout.ts` | Wo in der Halle was steht (`STATIONS`, `DECOR`, `WEAPON_PEGS`), welche Sprüche und Storybuch-Seiten zum Fortschritt passen. Reine Daten. |
| `lobby/dive.ts` | Kamerafahrt durch das Tor in die Halle und zurück (0,9 s), reine Rechnung. |
| `marketCamera.ts` | Kampf- und Marktausschnitt der Kamera, weiche Fahrt in 0,7 s, reine Rechnung. |
| `marketView.ts` | `MarketView`: die antippbaren Stellen des Markts an der Burg (fünf Slots, Tor-Knopf, Kessel, Haken) mit Abzeichen für leer, gesperrt (ab Level N) und kaufbar. Ein Tipp meldet `onKeepTap(spot)`; das Fenster dazu zeichnet `ui/screens/shop.ts`. |
| `tutorialGuide.ts` | Ablauf der ersten Minuten ohne Zeichnen: `PreludeGuide` (König, Einfrieren, Geste, wann der Wurf zählt) und `PotHint` (Kessel-Hinweis an Tag 2 von Level 1). |
| `tutorialView.ts` | Zeichnet König, Sprechblase, Geste und Pfeil zum Kessel nach `tutorialGuide.ts`. |
| `castleView.ts`, `stations.ts` | Burg, Tor, Waffen an der Burg, Kessel und Haken. |
| `enemyView.ts`, `effects.ts`, `hud.ts`, `background.ts`, `viewport.ts`, `textures.ts`, `glFix.ts` | Figuren, Effekte, HUD, Himmel und Landschaft, Bildausschnitt, Texturen, Shader-Korrektur. |

**Grafik** (`src/art/`): `registry.ts` (Asset-Verzeichnis), `characters/` (eine Datei je Gegner), `castle/` (Burgstufen, Tore, Westflügel `westWing.ts`, Kessel `cauldron.ts` auf dem Hügel `mound.ts`, Haken `perch.ts`, Waffen-Halter `mounts.ts`), `weapons/` (Waffen je Stufe), `props/` (Icons, Geschosse, Effekte), `lobby/` (Halle `room.ts`, Möbel `furniture.ts`, Schmuck `decor.ts`, König auf dem Thron `king.ts`), `king.ts` (König auf dem Schlachtfeld), `landscapes.ts`, `shade.ts`, `draw.ts`.

Die Lobby ist eine echte Szene. Die Kampagnen-Karte ist ein HTML-Bildschirm mit gezeichnetem Pfad, weil sich HTML mit dem Finger am besten scrollen lässt. Eine eigene Klasse `CameraDirector` gibt es nicht: Die Markt-Kamera rechnet `marketCamera.ts`, die Fahrt in die Lobby `lobby/dive.ts`.

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

## 11. Was wohin wandert

| Heute | Danach |
|---|---|
| `config/shop.ts` (`SHOP_ITEMS`, `WEAPONS`, `GATE_HP`, `AIM`, `PERCH`, `ECONOMY`) | `config/weapons.ts`, `config/keep.ts`, `config/economy.ts`; `AIM` entfällt |
| `config/world.ts` | `config/field.ts` |
| `meta.owned`, `meta.hornEquipped` | `meta.loadout` |
| `sim/aim.ts` (Schleuder-Zielen) | entfällt; `slotAt` (Griffzonen) zieht nach `sim/slots.ts`, Zielwahl nach `sim/weapons/targeting.ts` |
| `render/aimView.ts` (Zielhilfe) | entfällt |
| `sim/economy.ts` | `sim/shop.ts` |
| `sim/weapons.ts` | `sim/weapons/` |
| `sim/bot.ts`, `tests/balance/harness.ts` | `src/bots/` |
| `game/storage.ts` (Einstellungen, Bestenliste) | `src/profile/` |
| `ENEMIES.firstDay`, `tip`, `meta.newTipTypes`, `seenTypes` | Erstauftritte je Welt (`endless.ts`, Level-Tabelle); Popup-Text in `ENEMY_POPUPS` (`worlds/fondue/story.ts`, das alte Feld `tip` in `ENEMIES` zeigt nur noch die Entwickler-Übersicht); „gesehen“ im Profil; `meta.today.newTypes` |
| Landschaft aus dem Tag berechnet (`background.ts`) | `meta.today.landscape` |
| `ui/tuningPanel.ts` (F1) | bleibt `ui/tuningPanel.ts`, jetzt das Entwickler-Menü: in den Options erreichbar, F1 und langes Drücken aufs Logo bleiben als Abkürzung |
| `ui/app.ts` | `ui/app.ts`, `ui/screens/*`, `ui/coop/room.ts` |
| `art/castle.ts`, `art/props.ts` | `art/castle/*`, `art/props/*`, `art/weapons/*`, `art/lobby/*` |

## 12. Vorgehalten, aber nicht gebaut

Koop-Kampagne (Feld `coopCampaign` im Profil, Name in `RESERVED_MODES`), Schnellspiel, „Wahnsinn“, Sterne-Bewertung und Challenges (`RunStats` zählt schon mit, die Regeln kämen in `reward` der Modi), weitere Welten (`WORLDS`), Accounts und Cloud (`ProfileStore`, `profileId`, `updatedAt`), mehr Hände (`HANDS` ist eine Liste), Kessel-Upgrades und Haken-Belohnung (`STATIONS` hat ein Stufen-Feld), drei bis vier Spieler (Listen im Datenmodell).

## 13. Etappen des Umbaus

1. **Zerlegen ohne Verhaltensänderung:** `sim.ts` (erledigt), `app.ts`, `castle.ts`, `props.ts`; Asset-Verzeichnis. Tests bleiben grün.
2. **Lauf-Gerüst ohne Spieländerung:** `RunRules`, `RunSetup`, Tagesplaner, `runWon`, `hold`, Statistik, Profil, Modi; Endlos läuft darüber wie bisher.
3. **Slot-Modell:** fünf Slots, `loadout`, Antippen statt Zielen, mit den alten Waffen auf fünf Stufen; Protokoll und Bots ziehen mit; Übergangs-Markt.
4. **Wurf:** Gewicht, Hand-Stufen, Schütteln, Kessel hinten, Haken 12.000.
5. **Neue Waffen** und Stomper neu.
6. **Kampagne:** Level-Tabelle, Freischaltungen, Sterne, Kampagnen-Durchlauf der Bots, Karte, Sieg und Niederlage.
7. **Lobby in der Burg, Kamera, Markt an der Burg.**
8. **Tutorial, Popups, Story, Mäuse-Details.**
9. **Entwickler-Menü, Entwickler-Übersicht.**
10. **Balance, Tests auf drei Geräten, Pipeline, Dokumente.**

Die Bots ziehen in jeder Etappe mit, damit die Balance-Messung nie lange kaputt ist.

**Stand am 12.11.2026:** Etappen 1 bis 9 stehen im Code. Etappe 10 läuft: Balance ist gemessen, aber nicht überall im Ziel (`docs/balance.md`); die Browser-Tests auf drei Geräten und die Pipeline werden gerade umgestellt. Im Entwickler-Menü fehlen noch die Entscheidungs- und Bewertungsliste, der Link zur Entwickler-Übersicht, das Setzen einzelner Stufen und das erneute Abspielen einzelner Popups. Der genaue Stand steht in `docs/PROGRESS-GROSSES-UPDATE.md` und in der Abnahmeliste `docs/abnahme-grosses-update.json`.
