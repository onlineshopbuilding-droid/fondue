# Fondue – Architektur

Dieses Dokument beschreibt den Aufbau nach dem großen Update: welche Ordner es gibt, welche Klasse welche Aufgabe hat und wie die Daten fließen. Es richtet sich an Tim, Lenny und jede KI, die weiterbaut. Die Rezepte („ich will ein neues Level, eine neue Waffe …“) stehen in `docs/HANDBUCH.md`.

Stand: Entwurf vom 11.11.2026, wird während des Umbaus fortgeschrieben.

## 1. Leitgedanken

1. **Daten statt Code.** Level, Waffen, Gegner, Freischaltungen, Sterne, Story stehen als Tabellen in `src/config/`. Wer eine Zahl oder einen Text ändern will, öffnet eine Tabelle und nichts anderes.
2. **Die Simulation weiß nichts vom Drumherum.** Sie bekommt fertige Regeln für einen Lauf (`RunSetup`) und Tagespläne. Sie kennt weder Kampagne noch Endlos, weder Profil noch Browser.
3. **Ein Modus entscheidet, die Simulation rechnet.** Tutorial, Kampagne und Endlos sind eigene Klassen. Ein Modus baut den Lauf und verteilt am Ende die Belohnung.
4. **Bewährtes wird bewegt, nicht neu erfunden.** Wurfphysik, Netzcode, Sitzung, Audio und die Grafik-Bausteine bleiben im Kern, wie sie waren.
5. **Die vier alten Regeln gelten weiter:** `src/sim/` kennt weder Phaser noch DOM; dort kein `Math.random`; Zahlen in die Konfiguration; der Spielname nur in `src/config/game.ts`.

## 2. Datenfluss

```
Profil (src/profile/)  <---- Belohnung ----+
   |  Freischaltungen, Stufen, Hand        |
   v                                       |
Modus (src/modes/)  -- baut --> RunSetup --+--> wertet RunResult aus
   |                              |
   |                              v
   |                 Session (src/game/session.ts)
   |                   HostSession besitzt die Sim, GuestSession sagt voraus
   |                              |
   |                              v
   |                 Sim (src/sim/): Regeln, 60 Schritte pro Sekunde
   |                   liest Tabellen aus src/config/
   |                              |
   |        ViewState, SimEvent, Meta (auch übers Netz, src/net/)
   v                              v
Bildschirme (src/ui/)      Szenen (src/render/): Kampf, Lobby
```

- **Beim Start eines Laufs** fragt die App den Modus: `mode.buildRun(profile, wahl)` liefert ein `RunSetup`. Darin steht alles, was die Simulation braucht: Regeln (`RunRules`, reine Daten), Tagesplaner, Startwerte.
- **Während des Laufs** läuft alles wie bisher: Eingaben werden zu `Command`s, die Sim rechnet, die Szene zeichnet `ViewState` und spielt `SimEvent`s ab.
- **Am Ende** steht in `Meta.result` ein `RunResult` (gewonnen oder verloren, erreichter Tag, Statistik). Jedes Gerät gibt es an seinen Modus: `mode.reward(result, profile)` schreibt Sterne und Fortschritt ins **eigene** Profil. Im Koop verwaltet der Host nie das Profil des Gasts.

## 3. Ordner

| Ordner | Inhalt | Darf kennen |
|---|---|---|
| `src/config/` | Tabellen und Zahlen. Keine Logik außer kleinen Rechenhilfen. | nichts |
| `src/config/worlds/` | Welt-Pakete. `fondue/` ist Welt 1: König, Story, Gegnerauswahl, Landschaften, Kampagne, Freischaltungen. | `config` |
| `src/sim/` | Spielregeln, deterministisch. | `config` |
| `src/modes/` | Tutorial, Kampagne, Endlos hinter einer Schnittstelle. Belohnungsregeln. | `config`, `sim` (nur Typen), `profile` |
| `src/profile/` | Dauerhafter Spielstand: Klasse `Profile`, Speicher-Schnittstelle, Migrationen, Export. | `config` |
| `src/game/` | `Session` (Host und Gast). | `sim`, `net` |
| `src/net/` | Netznachrichten, Snapshots, Verbindungsarten. | `sim` (Typen) |
| `src/art/` | Grafik aus Code und das Asset-Verzeichnis. | `config` |
| `src/render/` | Phaser-Szenen und alles, was zeichnet. | alles außer `ui` |
| `src/ui/` | HTML-Bildschirme über dem Canvas, ein Bildschirm pro Datei. | alles |
| `src/audio/` | Klang und Musik. | `config` |
| `src/input/` | Zeiger, Wurfgeschwindigkeit, Schüttel-Erkennung. | `config` |
| `dev/` | Entwickler-Übersicht als zweite Seite (wird aus `src/config/` erzeugt). | `config`, `sim/spawn` |

Abhängigkeiten zeigen nur nach unten. Ein Test (`tests/unit/architecture.test.ts`) prüft, dass `src/sim/`, `src/config/`, `src/modes/` und `src/profile/` weder Phaser noch DOM importieren.

## 4. Konfiguration (`src/config/`)

Jede Tabelle hat oben einen Kommentar, der die Spalten erklärt.

| Datei | Inhalt |
|---|---|
| `game.ts` | Name des Spiels, Schalter für die Entwickler-Werkzeuge (`DEV_TOOLS_VISIBLE`). |
| `enemies.ts` | `ENEMIES`: Werte aller Gegner, neu mit `mass` (Gewicht) und Popup-Text; `BEHAVIOUR`. |
| `weapons.ts` | `WEAPONS`: eine Definition je Waffe (Slot-Typ, Art des Verhaltens, 5 Stufen mit Werten, Preise, Texte, Grafikname, `enabled`). |
| `slots.ts` | `SLOTS`: die fünf Waffenplätze der Burg mit Typ (`foot`, `wall`, `shrine`, `gate`, `tower`) und Lage. |
| `keep.ts` | Tore und Ausbaustufen (`GATES`), Opferstätten (`STATIONS`: Kessel, Adlerhaken) mit Preisen. |
| `hand.ts` | `HAND_LEVELS`: Stärke der Hand je Stufe, Preise in Gold (Endlos) und Sternen (Kampagne). |
| `economy.ts` | Gold je Opfergabe, Tor-Heilung, Koop-Faktoren. |
| `waves.ts` | Tageslänge, Wachstum, Schwierigkeitsgrade (`DIFFICULTIES`), Koop (`COOP`). |
| `endless.ts` | Endlos-Zufall: Spanne der Gegnerzahl, Fenster der Erstauftritte, Wahrscheinlichkeiten, Meilensteine für Sterne, Schalter „nur freigeschaltete Waffen“, „Endlos ab Level“. |
| `stars.ts` | Stern-Belohnungen und -Preise, Regeln gegen Farmen. |
| `world.ts` | Geometrie des Schlachtfelds (wie bisher), Lage des Kessels hinter der Burg. |
| `tuning.ts`, `flags.ts`, `quickstart.ts` | wie bisher (Wurfgefühl, Experiment-Schalter, Entwickler-Schnellstart). |
| `assets.ts` | Überschreibungen im Asset-Verzeichnis: Name → Bilddatei (siehe Abschnitt 9). |
| `worlds/index.ts` | `WORLDS`: Liste aller Welten. |
| `worlds/fondue/world.ts` | Welt 1 als Paket: König, Landschaften, Gegnerauswahl, Verweis auf Kampagne und Story. |
| `worlds/fondue/campaign.ts` | Die 100 Level: Regeln der Kurve plus `LEVEL_OVERRIDES` für einzelne Level. `buildCampaign()` liefert die fertige Tabelle `LevelDef[]`. |
| `worlds/fondue/unlocks.ts` | Freischalt-Tabelle: welches Level schaltet welche Waffe, welchen Slot, was sonst frei. |
| `worlds/fondue/story.ts` | Story-Satz je Level, Seiten des Storybuchs, Sprüche des Königs. |

### Ein Level als Datensatz

```ts
interface LevelDef {
  id: number;            // 1 bis 100
  name: string;
  landscape: Landscape;
  days: DayDef[];        // 2 bis 15 Tage; jeder Tag: Gegner je Typ, Nacht ja/nein
  power: number;         // Stärke der Gegner (Leben, Tempo, Torschaden) in diesem Level
  boss?: BossDef;        // Boss-Level: was ihn ausmacht
  twist?: string;        // Besonderheit: nur Springer, Nacht, Luftangriff ...
  newEnemy?: EnemyType;  // erster Auftritt
  stars: number;         // Belohnung beim ersten Schaffen
  story: string;         // ein Satz
}
```

Die Freischaltungen eines Levels stehen bewusst nicht im Level, sondern in `unlocks.ts`, damit man sie an einer Stelle überblickt.

## 5. Simulation (`src/sim/`)

Die große Datei `sim.ts` wird nach Themen in Klassen zerlegt. `Sim` bleibt die eine Tür nach außen (Befehle hinein, Zustand und Ereignisse heraus) und hält die Teile zusammen.

| Datei | Klasse | Aufgabe |
|---|---|---|
| `sim.ts` | `Sim` | Besitzt den Zustand, nimmt `Command`s an, macht einen Schritt, sammelt `SimEvent`s. |
| `world.ts` | `SimWorld` | Der gemeinsame Zustand plus kleine Helfer, die alle Teile brauchen (Zufall, Ereignis melden, Boden, Feldrand). |
| `dayFlow.ts` | `DayFlow` | Tagesablauf: Banner, Kampf, Sonnenuntergang, Sieg des Tages, Markt, Sieg und Niederlage des Laufs. |
| `spawner.ts` | `Spawner` | Lässt die Gegner des Tagesplans auftreten. |
| `enemies.ts` | `EnemyBehaviour` | Laufen, Angreifen, Springen, Schweben, Betäubt, Gefroren. |
| `hands.ts` | `Hands` | Greifen, Halten, Schütteln, Werfen; Gewicht und Hand-Stärke. |
| `flight.ts` | `Flight` | Geworfene Gegner in der Luft, Aufprall, Zielhilfen an Kessel und Haken. |
| `stations.ts` | `Stations` | Kessel und Adlerhaken. |
| `projectiles.ts` | `Projectiles` | Bomben, Steine, Geschosse der Waffen, Wirkungsflächen am Boden (Feuer, Käse). |
| `weapons/index.ts` | `WeaponSystem` | Welche Waffe in welchem Slot sitzt, Nachladen, Antippen. |
| `weapons/behaviours/*.ts` | je eine Klasse | Verhalten je Waffenart (Rollen, Stampfen, Einschlag, Salve …). |
| `weapons/targeting.ts` | Funktionen | Automatische Zielwahl: nächster am Tor, dichteste Gruppe, stärkster Gegner. |
| `economy.ts` | `Economy` | Kaufen, Preise, Gold und Offerings, was laut `RunRules` kaufbar ist. |
| `combat.ts` | `Combat` | Schaden, Tod, Flächenschaden, Schaden am Tor. |
| `stats.ts` | `RunStats` | Zählt mit: Kills nach Ursache und Typ, Opfer, Fass-Explosionen, Waffen-Einsätze, verlorenes Torleben. |
| `physics.ts` | Funktionen | Wurf-Begrenzung, Gewicht, Feder beim Halten. Host und Gast benutzen dieselben Funktionen (Handbuch, Falle 4). |
| `plan.ts` | `DayPlanner`-Schnittstelle, `FixedPlanner`, `EndlessPlanner` | Liefert den Plan eines Tages. Die Sim fragt nur „was kommt an Tag n?“. |
| `spawn.ts` | Funktionen | Verteilt Gegner über den Tag (Rudel, Dichte), wie bisher. |
| `keep.ts`, `rng.ts`, `types.ts` | | wie bisher, erweitert. |
| `bots/` | `Bot`, `BotShopper`, `CampaignRunner` | Spielende Bots für die Balance. |

### Was die Sim bekommt

```ts
interface RunSetup {
  seed: number;
  names: string[];
  tuning: Tuning;
  flags: Flags;
  fieldW: number;
  rules: RunRules;       // reine Daten, gehen in Meta und damit zum Gast
  planner: DayPlanner;   // nur beim Host
  resume?: DayStartSave; // Fortsetzen am Beginn eines Tages
}

interface RunRules {
  mode: string;              // 'tutorial' | 'campaign' | 'endless' (nur zur Anzeige und für die Belohnung)
  world: string;             // 'fondue'
  level: number | null;      // Kampagnen-Level oder null
  lastDay: number | null;    // letzter Tag; null = ohne Ende
  scaling: { count; speed; damage; gold };  // Schwierigkeit als Zahlen
  slotsOpen: boolean[];      // welche der fünf Slots es gibt
  weapons: Record<WeaponId, { offered: boolean; fixedLevel: number | null }>;
  stations: { cauldron: boolean; perch: boolean };
  maxGateTier: number;
  handLevels: number[];      // je Spieler
  handBuyable: boolean;      // Endlos: ja, Kampagne: nein
  gateCannotFall: boolean;   // nur Vorrunde des Tutorials
  devRun: boolean;           // Entwickler-Eingriff: zählt nicht
}
```

`fixedLevel` ist der Kern des Unterschieds: In der Kampagne steht dort die dauerhafte Stufe aus dem Profil, und im Level wird nichts verbessert. Im Endlos-Modus steht dort `null`, die Waffe startet auf Stufe 1 und wird im Lauf verbessert.

### Sieg

Neu ist die Phase `won`: Ist der letzte Tag laut `rules.lastDay` überstanden, endet der Lauf mit einem Sieg. `Meta.result` trägt dann das `RunResult`. `gameover` bleibt die Niederlage.

### Waffen

Eine Waffe besteht aus zwei Teilen:
- **Definition** in `src/config/weapons.ts` (Daten): Id, Name, Slot-Typ, `kind` (Art des Verhaltens), fünf Stufen mit Werten, Preise, Texte, Grafikname, `enabled`.
- **Verhalten** in `src/sim/weapons/behaviours/<kind>.ts` (kleine Klasse): `fire(world, level, player)` und bei Bedarf `tick(world, level)` für Waffen, die von allein wirken.

Eine neue Waffe mit vorhandenem Verhalten ist ein Tabelleneintrag plus Grafik. Eine neue Art von Verhalten ist zusätzlich eine Klasse und eine Zeile in `weapons/behaviours/index.ts`.

Alle Waffen werden nur angetippt. Der Befehl heißt `fireSlot` (Slot-Nummer). Die Zielwahl steht je Waffe in der Tabelle (`target`).

## 6. Modi (`src/modes/`)

```ts
interface GameMode {
  id: string;
  /** Baut den Lauf: Regeln, Tagesplaner, Startwerte. */
  buildRun(profile: Profile, choice: RunChoice): RunSetup;
  /** Was der Markt nach einem Tag zeigt (Texte, Hinweise des Königs). */
  marketNotes(rules: RunRules, day: number): MarketNote[];
  /** Belohnung am Ende; schreibt ins eigene Profil und sagt, was neu ist. */
  reward(result: RunResult, profile: Profile, role: 'solo' | 'host' | 'guest'): Reward;
}
```

| Datei | Klasse | Aufgabe |
|---|---|---|
| `mode.ts` | `GameMode`, `RunChoice`, `Reward` | Die Schnittstelle. |
| `tutorial.ts` | `TutorialMode` | Vorrunde ohne Menü, danach Level 1 als geführte Fassung. |
| `campaign.ts` | `CampaignMode` | Level aus der Tabelle, Freischaltungen und Stufen aus dem Profil, Sterne beim Sieg. |
| `endless.ts` | `EndlessMode` | Schwierigkeit wählbar, Zufall aus `endless.ts`, Sterne für Meilensteine, Bestenliste. |
| `rewards.ts` | Funktionen | Stern-Regeln als Rechnungen auf `RunStats`. Spätere Challenges und Bonus-Sterne sind hier nur neue Regeln. |
| `index.ts` | `MODES` | Verzeichnis der Modi. Vorgehalten: `coopCampaign`, `quickPlay`, `madness` (nur Namen und Platz, nicht gebaut). |

## 7. Profil (`src/profile/`)

| Datei | Inhalt |
|---|---|
| `schema.ts` | `ProfileData` mit `version`, Standardwerte. |
| `migrations.ts` | Eine Funktion je Versionssprung; übernimmt einmalig `fondue.settings.v1` und `fondue.scores.v1`. |
| `store.ts` | `ProfileStore` (Schnittstelle: `read`, `write`), `LocalProfileStore` (Browser), `MemoryProfileStore` (Tests). Später: App-Speicher, eigener Dienst. |
| `profile.ts` | Klasse `Profile`: alle Lese- und Schreibwege (Sterne, Level geschafft, Waffenstufe kaufen, Einstellungen …). Speichert nach jeder Änderung. |
| `codec.ts` | Export und Import als Textcode. |

Das Profil kennt mehrere Welten (`worlds[weltId]`) und hat Platz für eine Koop-Kampagne. Beschädigte Daten führen nie zum Absturz: Was sich nicht lesen lässt, wird zur Seite gelegt und durch Standardwerte ersetzt.

## 8. Bildschirme und Szenen

**HTML-Bildschirme** (`src/ui/`): Die große `app.ts` wird zerlegt.

| Datei | Aufgabe |
|---|---|
| `app.ts` | `App`: Start, Phaser, hält Profil, Sitzung und Bildschirm-Manager zusammen. |
| `screens/screen.ts` | `Screen` (Schnittstelle: `render`, `onAction`), `ScreenManager` (zeigt genau einen Bildschirm, Ein- und Ausblenden, Zurück). |
| `screens/*.ts` | Ein Bildschirm pro Datei: Kampagnen-Karte, Waffenkammer, Storybuch, Options, Entwickler-Menü, Scores, Help, Credits, Koop-Raum, Join, Markt, Slot-Fenster, Tagesergebnis, Sieg, Niederlage, Pause, Popup „New enemy“. |
| `coop/room.ts` | `CoopRoom`: Raum öffnen, beitreten, Wiedereinstieg (aus `app.ts` herausgelöst). |
| `content.ts`, `style.css` | Texte der Hilfe, Aussehen. |

**Szenen** (`src/render/`):

| Datei | Aufgabe |
|---|---|
| `scene.ts` | `BattleScene`: das Schlachtfeld (wie bisher `GameScene`). |
| `lobbyScene.ts` | `LobbyScene`: der Innenraum der Burg mit den Stationen. |
| `camera.ts` | `CameraDirector`: Kampfansicht, Marktansicht (näher an der Burg, mehr nach links), Flug in die Burg hinein und heraus. |
| `tutorialView.ts` | König, Sprechblase, Geste zum Nachmachen. |
| übrige | wie bisher (`castleView`, `stations`, `enemyView`, `effects`, `hud`, `background`, `textures`, `viewport`). |

Die Lobby ist eine echte Szene. Ihre Stationen sind Phaser-Objekte; für Tests liefert `__fondue` deren Lage. Die Kampagnen-Karte ist ein HTML-Bildschirm mit gezeichnetem Pfad, weil sich HTML mit dem Finger am besten scrollen lässt.

## 9. Grafik austauschbar

`src/art/registry.ts` ist das Verzeichnis aller Grafiken: fester Name → `Art` (Größe, Ankerpunkt, heute SVG-Text). `src/config/assets.ts` kann einen Namen auf eine Bilddatei umlenken; `textures.ts` lädt dann die Datei statt des SVG. Spiellogik und Szenen kennen nur Namen. Maße, Ankerpunkte und die Schritt-für-Schritt-Anleitung stehen in `docs/GRAFIK-AUSTAUSCHEN.md`, die Liste aller Namen wird aus dem Verzeichnis erzeugt.

`src/art/castle.ts` und `src/art/props.ts` werden nach Themen in Ordner zerlegt (`art/castle/…`, `art/props/…`, `art/weapons/…`, `art/lobby/…`).

## 10. Netz

Der Aufbau bleibt: Der Host rechnet, der Gast sagt Griff und Wurf voraus. Änderungen:
- `Meta` trägt `rules` (`RunRules`), den Stand der Slots und Stufen und am Ende `result`.
- `hello` trägt die Hand-Stufe des Gasts, damit der Host sie in `rules.handLevels` eintragen kann.
- Snapshots kodieren Slots statt fester Waffennamen und die neuen Wirkungsflächen.
- `PROTOCOL_VERSION` steigt.

## 11. Was vorgehalten, aber nicht gebaut wird

Koop-Kampagne (Platz im Profil unter `coopCampaign`, Modus-Name reserviert), Schnellspiel, „Wahnsinn“, Sterne-Bewertung und Challenges (`rewards.ts` rechnet schon auf `RunStats`), weitere Welten (`WORLDS`), Accounts und Cloud (`ProfileStore`), mehr Hände (`HAND_LEVELS` ist eine Liste von Händen wert), Kessel-Upgrades und Haken-Belohnung (`STATIONS` hat Stufen-Feld), drei bis vier Spieler (Listen statt Paare bei Namen, Händen, Raum-Fenster).

## 12. Etappen des Umbaus

1. Zerlegen ohne Verhaltensänderung: `sim.ts`, `app.ts`, `castle.ts`, `props.ts`; Asset-Verzeichnis. Tests bleiben grün.
2. Profil und Modi als Gerüst; Endlos läuft darüber wie bisher.
3. Neues Waffensystem (Slots, 5 Stufen, Antippen), Gewicht und Hand, Schütteln, Kessel hinten, Statistik, Sieg.
4. Kampagne: Level-Tabelle, Freischaltungen, Sterne, Karte, Sieg- und Niederlage-Bildschirm.
5. Lobby in der Burg, Kamera, Markt an der Burg.
6. Tutorial, Popups, Story.
7. Entwickler-Menü, Entwickler-Übersicht.
8. Balance, Tests auf drei Geräten, Dokumente.
