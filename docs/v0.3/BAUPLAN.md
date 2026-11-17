# Fondue v0.3 – Bauplan

Stand: 14.11.2026, 03:00 (Leitung: Claude Opus 5.5, Arbeitsweg B, siehe `PROGRESS.md`). Dieser Plan setzt `docs/v0.3/AUFTRAG.md` um. Wo er Zahlen nennt, sind es Startwerte, die Bots anpassen dürfen (Begründung in `docs/balance.md`). Wo der Plan schweigt, entscheidet der Bauer technisch selbst und schreibt es in seinen Bericht.

## 0. Leitlinien

- Das Gerüst aus dem großen Update bleibt: Profil → Modus → `RunSetup` → Session → Sim → Szene/Bildschirme. v0.3 ändert vor allem drei Dinge: **die Burg lebt im Profil statt im Lauf**, **ein Level ist eine Wellenfolge statt Tage mit Markt**, **Käse/Gold/Wappen statt Sterne/Offerings**.
- Alles Alte wird entfernt, nicht abgeschaltet: Tage (`day`, `lastDay`, `DayFlow`, `DayPlanner`), Markt (`intermission`, `Shop`, `shop.ts`-Fenster im Lauf, `marketOnly`, `hasMarket`, `buy*`-Commands), Sterne (`stars.ts`, `STARS`, Armoury mit Sternen), Offerings (`offerings`, `buyOfferings`, `offeringGold`). Am Ende findet `grep -ri "offering\|stars\?\b\|intermission\|market"` in `src/` nur noch begründete Treffer (zum Beispiel CSS-Wörter).
- Regeln aus `AGENTS.md`/`HANDBUCH.md` Abschnitt 2 gelten: `src/sim|config|modes|profile|bots` ohne Phaser/DOM, kein `Math.random` in `src/sim/`, Zahlen nach `src/config/`.
- Speicher: v0.3 benutzt nur Schlüssel mit Präfix `fondue.v3.` (`STORAGE_PREFIX` in `src/profile/schema.ts`). `fondue.profile`, `fondue.settings.v1`, `fondue.scores.v1` werden nie gelesen oder geschrieben.

## 1. Begriffe im Code

| Spiel | Code | Spieltext |
|---|---|---|
| Käse | `cheese` | „Cheese“, Zeichen 🧀 oder eigenes Icon |
| Gold | `gold` | „Gold“ |
| Räuberwappen | `crests` | **„Raider Crests“** (Entscheidung E-063) |
| Stufe 1–7 | `tier` | „Tier“ |
| Level 1–100 | `level` | „Level“ |
| Welle | `wave` | „Wave“ |
| Slot-Aufgabe | `SlotRole`: `damage`, `slow`, `support`, `passive`, `gate` | „Damage / Slow / Support / Passive / Gate slot“ |

`SlotType` (`foot`, `wall`, `shrine`, `gate`, `tower`) wird zu `SlotRole` umbenannt. Lage bleibt: damage = links unten (alt `foot`), slow = links Mitte (alt `wall`), support = links oben (alt `shrine`), passive = rechts oben (alt `tower`), gate = über dem Tor (alt `gate`).

## 2. Datenstruktur des Profils (zuerst, alles baut darauf)

Datei `src/profile/schema.ts`, Schlüssel `fondue.v3.profile`, `PROFILE_VERSION = 1` (neue Zählung, eigenes Format; es gibt keine Migration aus v0.2, ein Spieler beginnt frisch). Das Format ist reines JSON und so geschnitten, dass es später eins zu eins in einen Cloud-Account wandern kann: Kopfdaten (`version`, `profileId`, `createdAt`, `updatedAt`, `format: 'fondue-profile'`), dann fachliche Blöcke.

```ts
interface ProfileData {
  format: 'fondue-profile';
  version: number;              // PROFILE_VERSION, migrations.ts hat eine Kette 1 -> 2 -> ...
  profileId: string; createdAt: string; updatedAt: string;
  name: string;
  settings: ProfileSettings;    // wie heute (Lautstärken, Tuning, Flags, Schwierigkeit, Relay)

  wallet: { cheese: number; gold: number; crests: number };   // ausgebbar
  earned: { cheese: number; gold: number; crests: number };   // je verdient (Statistik, Prüfungen)

  keep: {
    castleTier: number;                       // 1..7 (Burg = Tor)
    handTier: number;                         // 1..7 (Stufe 7 schaltet die zweite Hand frei, C9)
    stations: Record<StationId, number>;      // 0 = nicht freigeschaltet, sonst Stufe 1..N
    weapons: Record<string, { tier: number }>;// nur freigeschaltete Waffen stehen hier; tier 1..7
    loadout: (string | null)[];               // Länge 5, Index = Slot (SLOTS), angelegte Waffe
  };

  worlds: Record<string, {
    levelsDone: number[];                     // gewonnene Level
    cheese: Record<string, number>;           // Level -> Bitmaske der 5 Käse (Bit 0 Sieg, 1 Tor>50 %, 2 Tor>90 %, 3 Challenge 1, 4 Challenge 2)
    storyRead: string[];
    scores: ScoreEntry[];                     // Bestenliste (Endlos), Feld `wave` statt `day`
    endlessBest: Record<string, number>;      // Schwierigkeit -> beste Welle
  }>;

  seen: { tutorial: boolean; enemies: string[]; tips: string[]; slotIntros: number[]; v3Notice: boolean };
  claimedRuns: string[];                      // letzte 200 runIds
  devRatings: Record<string, DevRating>;
  cheats: { used: boolean; log: string[] };   // F2: dauerhafte Cheats markieren den Stand sichtbar
  pendingRun: unknown | null;                 // unterbrochenes Level (Fortsetzen am Beginn der Welle)
  coopCampaign: Record<string, unknown>;      // vorgehalten
}
```

Regeln dazu:
- **Was abgeleitet wird, wird nicht gespeichert:** offene Slots, kaufbare Waffen, maximal erlaubte Stufen ergeben sich aus `levelsDone` und der Freischalt-Tabelle (`src/modes/unlocks.ts`). So kann eine geänderte Tabelle nie einen kaputten Stand erzeugen.
- **Käse genau einmal:** `cheese[level]` ist eine Bitmaske; ein Käse zählt nur, wenn sein Bit neu gesetzt wird. `earned.cheese` = Summe aller Bits; Test prüft das.
- **Speichern:** Jede Änderung schreibt sofort (asynchron, entprellt höchstens 300 ms) und zusätzlich synchron bei `visibilitychange` (hidden), `pagehide` und `beforeunload` (`Profile.flushSync`). Nach jedem Level und Kauf wird geflusht. Ist `localStorage` voll oder gesperrt, läuft das Spiel mit dem Stand im Speicher weiter und zeigt einmal einen Hinweis („Progress can’t be saved on this device right now.“); Test dafür.
- **Export/Import** als Textcode bleibt (`codec.ts`), mit Formatkennung, damit ein v0.2-Code klar abgelehnt wird.
- **Hinweis:** Beim ersten Start von v0.3 einmal ein freundlicher Satz: „Welcome to v0.3! This version starts with fresh progress. Your old game is still there at the usual address.“ (`seen.v3Notice`).
- **Progression an einer Stelle:** neue Datei `src/modes/progress.ts` (rein, ohne DOM) mit `quoteUpgrade`, `buyUpgrade(target)`, `unlockWeapon`, `equip(slot, id|null)`, `addCheese/applyLevelCheese`, `addGold`, `addCrests`. Shop, Bots, Cheats und Tests benutzen nur diese Funktionen. Ziele: `{kind:'weapon',id}`, `{kind:'castle'}`, `{kind:'hand'}`, `{kind:'station',id}`.

## 3. Konfiguration (alle Zahlen, `src/config/`)

| Datei | Inhalt in v0.3 |
|---|---|
| `tiers.ts` (neu) | `TIER_MAX = 7`; Goldpreise je Stufe als Kurve; `CREST_COST` für Stufe 7; `TIER_CAP_BY_LEVEL` (Deckel je Kampagnen-Abschnitt, siehe A3) |
| `currencies.ts` (neu) | Namen, Icons, Kurztexte der drei Währungen; Käse-Regeln (`CHEESE`: Schwellen 50 %/90 %, 5 Bits) |
| `weapons.ts` | alle Waffen, `slot: SlotRole`, 7 Stufen, `unlockLevel`, `cheesePrice`, `goldScale` (Preisfaktor), Texte; kein `buyGold`/`buyOfferings` mehr |
| `slots.ts` | fünf Slots mit `role`, Name, Lage, `unlockLevel`, Einführungssatz des Königs |
| `keep.ts` | `CASTLE_TIERS` (7 Stufen: Name, Torleben, Gold, Wappen bei 7, Beschreibung), `STATIONS` (Kessel, Adlerhaken: `unlockLevel`, `cheesePrice`, Stufen) |
| `hand.ts` | `HANDS` mit 7 Stufen (Stärke, Gold, Wappen bei 7), `HAND_RULES.yetiLift` |
| `crests.ts` (neu) | Wappen je Gegnertyp (schwach 1, mittel 2, schwer 3, Yeti/Boss 5), Höchstzahl je Runde, Haken-Zielgröße |
| `waves.ts` | Wellen-Bausteine (Pausen, Spitzen), Endlos-Wellen, Schwierigkeiten (Gold-Faktor steigt mit Schwierigkeit), Koop |
| `enemies.ts` | Tempo ×2–3, langsame/Fernkämpfer ×1,3–1,6, Gold je Gegner angepasst |
| `worlds/fondue/campaign.ts` | 100 Level mit Wellen, `targetMinutes`, Challenges je Level |
| `worlds/fondue/challenges.ts` (neu) | Challenge-Vorlagen und je Level zwei Challenges |
| `worlds/fondue/unlocks.ts` | Slots, Waffen (Level, ab dem kaufbar), Kessel, Haken, Stufen-Deckel |
| `stars.ts` | **entfällt** |

**Startwerte (Bots dürfen anpassen):**
- Burg: Torleben 800 / 1250 / 1900 / 2800 / 4000 / 5600 / 7800; Gold 0 / 400 / 1200 / 3000 / 7000 / 15000 / 30000; Stufe 7 zusätzlich 40 Wappen.
- Hand: Stärke 1,0 / 1,25 / 1,55 / 2,0 / 2,4 / 2,8 / 3,3 (Yeti-Hebung bei 2,0, also allein ab Stufe 4); Gold 0 / 500 / 1500 / 3500 / 8000 / 16000 / 30000; Stufe 7 + 40 Wappen.
- Waffenstufen: Grundpreis je Stufe 2–6: 300 / 800 / 2000 / 4800 / 11000, mal `goldScale` der Waffe; Stufe 7: 24000 × `goldScale` + 40 Wappen.
- Stufen-Deckel (A3, gegen Überrollen): höchste kaufbare Stufe für Waffen, Burg und Hand: 3 bis Level 10, 4 bis Level 25, 5 bis Level 45, 6 bis Level 65, 7 erst mit dem Adlerhaken (ab Level 70). Endlos-Gold hilft so beim Feststecken, kann aber nicht über den Abschnitt hinaus ausbauen.
- Wappen: geopferter Räuber 1 (leicht) bis 5 (Yeti/Boss), höchstens 4 je Runde (Kampagne und Endlos). Ziel: Median 20–30 Runden bis 40 Wappen.

## 4. Level, Wellen, Gegner (B1–B4)

- `LevelDef` verliert `days`, `marketOnly`, `startGold`, `stars`; bekommt `waves: WaveDef[]`, `targetSeconds`, `challenges: [ChallengeDef, ChallengeDef]`, `night`, `landscape`, `boss`, `twist`.
- `WaveDef = { counts: Partial<Record<EnemyType, number>>; spawnSeconds: number; pauseAfter: number; packs: number; big?: ... }`. Spannung: Wellengrößen folgen einem Muster klein–groß–mittel–Spitze; `pauseAfter` 2–4 s. Die Sim startet die nächste Welle, wenn die Pause um ist **oder** keine Gegner mehr leben (dann nach höchstens 1,5 s). So gibt es nie mehr als 5 s ohne lebenden Gegner (B2-Test über alle 100 Level mit einem Bot).
- Phasen der Sim: `banner` (nur Levelstart, 1,2 s, Gegner laufen schon los) → `battle` (Wellen) → `runWon` | `defeat` → `gameover`; `hold` bleibt für das Tutorial. `intermission`, `victory` je Tag und Markt entfallen. `DayFlow` → `WaveFlow` (`src/sim/waveFlow.ts`), `DayPlanner` → `WavePlanner` (Plan der ganzen Wellenfolge, rein aus Startwert).
- **Schneller Start (B3):** Gegner erscheinen am sichtbaren rechten Rand. Ursache prüfen und messen: Spawn-x ist heute `fieldW + Rand`, der Bildausschnitt zeigt aber auf breiten Handys nicht das ganze Feld oder umgekehrt. Lösung: Spawn bei `min(fieldW, sichtbarer rechter Rand) + kleiner Rand`, sichtbarer Rand kommt als `RunSetup.viewRight` (Host) mit; erste Welle startet 0,3 s nach Levelstart. Ziel ≤ 2,0 s bis zum ersten sichtbaren Gegner auf allen drei Formaten, Solo, Endlos und Koop.
- **Tempo (B4):** `speed` aller Gegner ×2,5; Slinger, Keg Hauler, Siege Cart, Balloonist ×1,4. Anzahl je Level ~40 % der alten Tageszahlen zusammengerechnet; höchstens 12 (früh) bis 30 (spät) gleichzeitig. Gold je Gegner ×2. Greiffläche schneller Gegner: `grabDistance` bekommt einen Zuschlag nach Tempo, damit man sie im Lauf trifft (Browser-Test).
- **Fortsetzen (B1):** Allein in Kampagne zu Beginn jeder Welle `pendingRun` speichern (Welle, Torleben, Gold dieses Laufs, Statistik). „Continue“ setzt am Beginn dieser Welle fort.

## 5. Modi und Belohnung

- `CampaignMode.buildRun` liest die dauerhafte Burg: `slotWeapon` = `keep.loadout` (nur offene Slots), Stufen aus `keep.weapons`, Torstufe = `castleTier`, Stationen = `keep.stations`, Hand = `handTier`. Keine Käufe im Lauf: `RunRules` verliert `tierUpgrades`, `handBuyable`, `hasMarket`, `marketOnly`; `Command` verliert alle `buy*`/`upgrade*`.
- `CampaignMode.reward`: Gold dieses Laufs dauerhaft gutschreiben (auch bei Niederlage? **ja, das verdiente Gold bleibt**, sonst frustriert Feststecken; Entscheidung E-066), Käse-Bits bei Sieg prüfen und neu gesetzte gutschreiben, Wappen gutschreiben, Fortschritt, Freischaltungen melden. Wiederholte Level bringen normales Gold (A3).
- `EndlessMode`: eigene Burg, Wellen ohne Ende, kein Käse, Gold-Faktor je Schwierigkeit (Easy 0,8 / Medium 1 / Hard 1,3 Gold je Gegner, dazu höhere Stärke), gesperrt bis Slot 5 offen ist.
- Koop: Host-Burg in `RunRules`, Gast schickt Hand-Stufe (und ob er eine zweite Hand hat). Gold: **jeder bekommt das ganze in der Runde verdiente Gold**, dafür zahlt ein Kill im Koop 60 % (`COOP.goldPerKill`); Käse und Fortschritt nur Host. Koop-Faktor Gegnerzahl Start 1,8, mit Bots so, dass Mid zu zweit nicht öfter gewinnt als allein.

## 6. Pakete, Dateigrenzen, Reihenfolge

Jedes Paket: eigener Opus-Agent („bauer“), liest zuerst `.claude/agents/bauer.md`, diesen Plan und die genannten Abschnitte des Auftrags. Am Ende `npx tsc --noEmit`, `npm test` grün (und betroffene Browser-Tests mit eigenem `TEST_PORT`), Commit der eigenen Dateien einzeln, Push auf `v0.3-dev`. Fremde Dateien nur, wenn dieser Plan sie ausdrücklich zuweist; braucht ein Paket eine fremde Datei, ändert es sie nur nach Absprache mit der Leitung.

### Etappe 2 – Fundament (nacheinander)

**F1 Profil, Währungen, Stufen, Progression** (A6, A2–A5 Daten, Teile A1)
Dateien: `src/profile/**`, `src/config/tiers.ts`, `currencies.ts`, `crests.ts`, `keep.ts`, `hand.ts`, `stars.ts` (löschen), `src/modes/progress.ts`, `src/modes/unlocks.ts`, `tests/unit/profile*.test.ts`, `tests/unit/progress.test.ts`, minimale Anpassungen an Aufrufern, damit es kompiliert (`src/ui/screens/armoury.ts` darf vorläufig auf die neue API umgestellt oder abgeschaltet werden).
Fertig: Profil v3 wie Abschnitt 2, Progression-API mit Tests (Kauf, Ablegen/Anlegen behält Stufe, Neuladen, Käse einmalig, Speicher voll/gesperrt, `fondue.profile` unberührt).

**F2 Level, Wellen, Lauf ohne Markt** (B1–B4, A1 im Lauf, Belohnung A2/A3)
Dateien: `src/sim/**` (außer `weapons/behaviours/*`), `src/config/waves.ts`, `enemies.ts`, `field.ts`, `worlds/**` (Struktur und Kurve; Inhalte der Challenges macht F2 als einfache Vorlage, P-Kampagne verfeinert), `src/modes/**`, `src/bots/**` (lauffähig halten), `src/game/session.ts`, `src/net/protocol.ts`, `snapshot.ts`, `src/ui/app.ts`, `src/ui/screens/{shop,results,won,gameover,readyControls}.ts`, `src/render/{scene,hud,marketView,marketCamera}.ts`, `scripts/campaign-table.ts`, `tests/**`.
Fertig: Ein Level ist mit der dauerhaften Burg von Anfang bis Ende spielbar, ohne Markt, Gold und Stufen bleiben nach Neuladen, Unit-Tests und Browser-Grundtests grün, Zeit bis zum ersten Gegner gemessen.

### Etappe 3 – Inhalte (parallel, Welle A, dann Welle B)

Welle A (gleichzeitig):
- **P-Waffen (C1, C3, C4, A5):** `src/config/weapons.ts`, `slots.ts`, `src/sim/weapons/**`, `src/sim/projectiles.ts`, `zones.ts`, `src/render/effects.ts`, `tests/unit/weapons*.test.ts`. 25 Waffen, 5 je Slot, 7 Stufen (Zuordnung Abschnitt 7).
- **P-Waffengrafik:** `src/art/weapons/**`, `src/art/props/projectiles.ts`, `src/art/props/icons*`. Jede Waffe in 7 Stufen, sichtbarer Sprung je Stufe, Stufe 7 prächtig.
- **P-Burg (C7, Issue 1):** `src/art/castle/**` (ohne `perch.ts`, `cauldron.ts`), `src/render/castleView.ts`, `src/render/background.ts`, `src/art/landscapes.ts`. Sieben Burgstufen, Einbettung in Vorder- und Hintergrund, kein Weg links.
- **P-Kampagne (B1-Daten, B5, C2, D4, A2-Challenges):** `src/config/worlds/fondue/**`, `src/modes/tutorial.ts`, `src/render/tutorialGuide.ts`, `tutorialView.ts`, `docs/KAMPAGNE-TABELLE.md`, `tests/unit/{campaign*,challenges,tutorial*}.test.ts`.
- **P-Entwickler (F1–F4):** `src/ui/tuningPanel.ts`, `src/config/devReview.ts`, `scripts/dev-page*.ts`, `scripts/dev-page/**`, `tests/e2e/dev*.spec.ts`.

Welle B (nach Welle A):
- **P-Shop (D1–D3):** `src/ui/screens/**`, `src/ui/lobby/**`, `src/render/lobby/**`, `src/render/marketView.ts` (wird zur Shop-Ansicht), `src/ui/content.ts`, `style.css`, `src/ui/app.ts`, `tests/e2e/{shop,lobby,campaign}*.spec.ts`.
- **P-Hände und Stationen (C5, C6, C8, C9, A4):** `src/sim/hands.ts`, `physics.ts`, `stations.ts`, `flight.ts`, `src/config/hand.ts`, `keep.ts` (Stationsteil), `crests.ts`, `src/input/**`, `src/render/scene.ts` (Eingabe), `src/render/stations.ts`, `src/art/castle/{perch,cauldron}.ts`, `src/game/session.ts`, `tests/unit/{hand,yeti,stations}*.test.ts`, `tests/e2e/multitouch.spec.ts`.

Welle C:
- **P-Modi (E1, E2):** `src/modes/endless.ts`, `endlessPlanner.ts`, `src/net/**`, `src/game/session.ts`, `src/ui/coop/**`, `src/ui/screens/{play,coop,host,join}.ts`, `tests/e2e/coop*.spec.ts`. Ruckel-Messung vorher/nachher.

### Etappe 4 – Balance (pruefer misst, bauer passt Konfiguration an)
`src/bots/**` bekommt Fortschrittslogik (zwischen Leveln ausbauen, freischalten, bei Bedarf Endlos farmen). Messungen: Levellängen, Pausen, Käse, Farm-Spieler, Wappen-Median, Waffen je Slot, Koop gegen allein, Gold je Minute je Schwierigkeit. Ergebnisse in `docs/balance.md`.

### Etappe 5–7
Unabhängige Prüfung durch einen frischen Sonnet-Prüfer; Abschluss (PR `v0.3-dev` → `main`, nicht mergen, `Fixes #1`, `BERICHT.md`, `TESTEN.md`); Restzeit nach Auftrag.

## 7. Waffen je Slot (C1, C3)

| Slot | Waffen (neu kursiv) |
|---|---|
| Damage (links unten) | Rolling Wheel (frei, Tutorial), Fondue Forks, Stomper, Comet, Dragon Bellows |
| Slow (links Mitte) | Sticky Fondue, Frost Horn, Cuckoo Clock, *Snowdrift Cannon* (Schneewehe über ein Straßenstück, Stufe 7 ganze Straße), *Cowbell Toll* (Glockenschlag betäubt in einem Kreis, mehr Schläge je Stufe) |
| Support (links oben) | Golden Fondue, Ember Beacon, *Helping Hand* (zweite Hand für einige Sekunden, C9 Variante 2), *Iron Grip* (Hand kurz stärker und Würfe tödlicher), *Mending Horn* (heilt das Tor) |
| Passive (rechts oben) | Marmot Sentry, Roof Bolter (wird passiv: feuert von selbst), Storm Bell (wird passiv: Blitz in festem Takt), *Pinecone Catapult* (wirft von selbst auf Gruppen), *Hornet Hive* (Schwarm sticht die vordersten) |
| Gate (über dem Tor) | Gate Mortar, Hedgehog Gate, Alphorn (drückt weg), *Cheese Cascade* (heißer Käse vom Torbogen, Schaden direkt vor dem Tor), *Battering Log* (schwingender Baumstamm schleudert Gegner vor dem Tor zurück) |

25 Waffen, 5 je Slot. Aktive Waffen werden angetippt (Support und Gate auch), Passive feuern selbst mit Nachladering. Freischaltung: an einem Level kaufbar, mit Käse freigeschaltet; Käse-Preise aller Waffen plus Kessel plus Adlerhaken ergeben genau 500 (Test). Die Freischalt-Level verteilen sich so, dass etwa alle 3 bis 4 Level etwas Neues kommt.

## 8. Freischaltungen (Startwerte)

- Slots: Damage mit der Vorrunde (Rolling Wheel), Slow mit Sieg in Level 2, Gate mit Level 4, Support mit Level 7, Passive mit Level 11. Endlos öffnet mit Slot 5 (Level 11).
- Great Cauldron ab Level 16 (Käse), doppeltes Gold je hineingeworfenem Räuber, Stufen kürzen die Schmelzzeit.
- Eagle Perch ab Level 70 (Käse), bringt Wappen, kleineres Ziel, genauer Wurf nötig.
- Die erste Waffe je neuem Slot ist beim Freischalten des Slots für wenig Käse zu haben, damit der Slot nicht leer bleibt.
