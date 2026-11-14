# Fondue – Änderungshandbuch

Dieses Dokument sagt, wo was liegt und was alles angefasst werden muss, wenn sich etwas ändert. Es richtet sich an Tim, Lenny und jede KI, die weiterbaut. Es nennt Bezeichner (Namen von Dateien, Klassen, Tabellen) statt Zeilennummern, weil sich Zeilen ständig verschieben. Es beschreibt **v0.3** (Branch `v0.3-dev`, Testadresse `/fondue/next/`).

Weitere Dokumente:
- `docs/ARCHITEKTUR.md`: Aufbau im Detail, Klassen und Datenfluss.
- `docs/GDD.md`: die Spielregeln und Zahlen.
- `docs/ENTSCHEIDUNGEN.md`: warum etwas so ist (E-001 bis E-071; E-063 bis E-071 gehören zu v0.3).
- `docs/OFFENE-ENTSCHEIDUNGEN.md`: was Tim und Lenny noch entscheiden oder bewerten sollen.
- `docs/balance.md`: Balance-Ziele, Ergebnisse, geänderte Werte (v0.3).
- `docs/KAMPAGNE-TABELLE.md`: alle 100 Level Welle für Welle (erzeugt).
- `docs/GRAFIK-AUSTAUSCHEN.md`: Grafik durch Bilddateien ersetzen, Liste aller Assets (Liste erzeugt).
- `docs/v0.3/BAUPLAN.md`, `abnahme.json`, `PROGRESS.md`, `UEBERGABE.md`, `MESSUNGEN-KOOP.md`: Bauplan, Abnahmeliste, Verlauf und Messungen der v0.3-Runde.
- `docs/uebergabe/LERNEN.md`: Konzepte (fester Zeitschritt, Wurfphysik, WebRTC).
- Entwickler-Übersicht: https://onlineshopbuilding-droid.github.io/fondue/next/dev/ (alle Level, Waffen mit Stufen, Gegner, Freischaltungen, Käse-Summe, Balance, offene Entscheidungen, Fahrplan; erzeugt aus dem Code). Die Übersicht des Live-Stands liegt unter `/fondue/dev/`.

## 1. Wie das Spiel aufgebaut ist

```
Profil (src/profile/)  <------ Belohnung ------+
   |  Käse, Gold, Wappen, dauerhafte Burg       |
   v                                           |
Modus (src/modes/): Tutorial, Kampagne, Endlos |
   |  baut RunSetup: Regeln + Wellenplaner     |
   v                                           |
Session (src/game/session.ts)                  |
   |-- HostSession: besitzt die Sim (solo und Koop-Host)
   |-- GuestSession: besitzt keine Sim, sagt Griff und Wurf voraus
   v                                           |
Sim (src/sim/sim.ts): alle Regeln, 60 Schritte/s ---> RunResult
   |  ViewState, SimEvent, Meta (auch übers Netz, src/net/)
   v
GameScene (src/render/scene.ts), LobbyScene (src/render/lobby/), HTML-Bildschirme (src/ui/)
   ^
Zahlen und Tabellen aus src/config/
```

Ein Beispiel: Tim tippt in der Lobby auf den Kartentisch und wählt Level 7. `CampaignMode.buildRun` baut aus der dauerhaften Burg im Profil die Regeln (welche Slots offen sind, welche Waffen auf welcher Stufe, Burg- und Hand-Stufe, Stationen) und den Wellenplan aus der Level-Tabelle. Die `Sim` rechnet den Kampf Welle für Welle; im Level wird nichts gekauft. Sind alle Wellen überstanden und alle Räuber besiegt, meldet sie den Sieg (`runWon`). `CampaignMode.reward` schreibt Gold und Wappen gut (auch bei Niederlage das Gold), vergibt die neu verdienten Käse und den Fortschritt ins Profil, der Sieg-Bildschirm zeigt das Neue, die Kamera fährt in die Burg. Dort gibt man Käse und Gold im Shop aus (`src/modes/progress.ts`).

Im Koop rechnet nur der Host. Der Gast schickt Eingaben, der Host schickt 30-mal pro Sekunde einen Snapshot, dazu Ereignisse und bei Änderungen die Metadaten. Gespielt wird mit der Burg des Hosts.

| Art | Typ | Inhalt | Weg zum Gast |
|---|---|---|---|
| Zustand pro Bild | `ViewState` | Gegner, Geschosse, Hände (nach Handnummer), Gold, Tor, Welle | Snapshot, kompakt kodiert in `src/net/snapshot.ts` |
| Einmalige Ereignisse | `SimEvent` | Aufprall, Tod, Schuss, Wappen: alles, was Effekt oder Klang auslöst | Nachricht `ev` |
| Seltene Daten | `Meta` | Regeln, Stand der Burg (`loadout`), Namen, aktuelle Welle (`wave`), Ergebnis | Nachricht `m`, nur wenn `rev` steigt |

## 2. Vier Regeln, die nicht brechen dürfen

1. **`src/sim/`, `src/config/`, `src/modes/`, `src/profile/` und `src/bots/` kennen weder Phaser noch DOM.** Nur so laufen Unit-Tests und Balance-Bots ohne Browser. Einen eigenen Test dafür gibt es nicht; die Unit-Tests scheitern aber, sobald dort Phaser oder `window` landet.
2. **In `src/sim/` kein `Math.random`, nur den Zufallsgenerator der Simulation.** Gleicher Startwert und gleiche Eingaben müssen denselben Verlauf ergeben. In `src/render/` und `src/ui/` ist `Math.random` in Ordnung.
3. **Zahlen gehören nach `src/config/`.** Ausnahmen stehen in Abschnitt 6.
4. **Fondue bleibt ein eigenes Spiel.** Nichts aus anderen Spielen übernehmen (`AGENTS.md`, E-001). Der Name des Spiels steht nur in `src/config/game.ts`.

Dazu für v0.3: **Alle Speicherschlüssel beginnen mit `fondue.v3.`** (`STORAGE_PREFIX` in `src/profile/schema.ts`). Die Adressen `/fondue/`, `/fondue/next/`, `/fondue/v0.2/` und `/fondue/classic/` teilen sich den Browser-Speicher; `fondue.profile`, `fondue.settings.v1` und `fondue.scores.v1` gehören den älteren Ständen und werden von v0.3 nie gelesen oder geschrieben.

## 3. Wo liegt was

### Tabellen (`src/config/`)

| Datei | Inhalt |
|---|---|
| `game.ts` | Name und Version des Spiels (`GAME_NAME`, `GAME_VERSION` „0.3“); auch der Seitentitel kommt von hier (Platzhalter `%GAME_NAME%` in `index.html`, ersetzt in `vite.config.ts`) |
| `enemies.ts` | Alle 11 Gegner (`ENEMIES`: Werte, Gewicht `mass`, Gold), Tempo-Faktoren von v0.3 (`V3_SPEED`, `V3_GOLD`), Greifzuschlag schneller Gegner (`GRAB_SPEED_BONUS`), Zielgewichte für Gruppen-Waffen (`TARGETING`), Sonderwerte (`BEHAVIOUR`: Fass, Schütteln, Blase, Schatten, Krähe, Yeti, übergroße Boss-Räuber) |
| `weapons.ts` | Alle 25 Waffen (`WEAPONS`) mit Slot-Aufgabe (`slot`), Verhalten (`kind`), Zielwahl (`target`), `enabled`, `unlockLevel`, `cheesePrice`, `goldScale` und genau sieben Stufen (`tiers` mit `cooldown`, `note` und den Zahlen der Art) |
| `slots.ts` | Die fünf Waffenplätze (`SLOTS`) mit Aufgabe (`SlotRole`), Lage, Freischalt-Level und Einführungssatz des Königs |
| `tiers.ts` | Stufen 1 bis 7: `TIER_MAX`, Goldpreise der Waffenstufen (`WEAPON_TIER_GOLD`), Wappen für Stufe 7 (`CREST_COST`), Stufen-Deckel je Kampagnen-Abschnitt (`TIER_CAP_BY_LEVEL`) |
| `currencies.ts` | Namen, Icons und Kurztexte von Käse, Gold und Räuberwappen; Käse-Regeln (`CHEESE`: fünf Bits, Schwellen 50 % und 90 % Torleben, Summe 500) |
| `crests.ts` | Wappen je Gegnertyp, Höchstzahl je Runde, Größe und Zielhilfe des Adlerhakens (`CRESTS`) |
| `keep.ts` | Burg-Stufen (`CASTLE_TIERS`: Name, Torleben, Gold, Wappen), Stationen (`STATIONS`: Kessel, Adlerhaken mit Freischalt-Level, Käse-Preis, Stufen), Schmelzzeiten (`CAULDRON_SECONDS`), Haken-Zeiten (`PERCH`) |
| `hand.ts` | Hand-Stufen (`HANDS`: Stärke, Gold, Wappen), Wurf-, Yeti- und Zweite-Hand-Regeln (`HAND_RULES`) |
| `economy.ts` | Kessel-Goldfaktor (`ECONOMY.cauldronGoldFactor`) |
| `waves.ts` | Rhythmus der Wellen (`WAVES`: Banner, Pausen, Höchstzahl lebender Räuber), Endlos-Wellen (`ENDLESS_WAVES`), Schwierigkeit (`DIFFICULTIES`), Koop (`COOP`), Landschaftsfolge |
| `campaignScaling.ts` | Wie die Stärke eines Levels in Räuberwerte übersetzt wird und wächst (`CAMPAIGN_SCALING`) |
| `tutorial.ts` | Vorrunde, Führung, Kessel-Hinweis, erstes Upgrade (`PRELUDE`, `GUIDE`, `POT_HINT`, `FIRST_UPGRADE`) |
| `lobby.ts` | Zeiten der Lobby und der Kamerafahrt (`LOBBY_MOVE`, `LOBBY_HALL`) |
| `field.ts` | Geometrie: Bodenlinie, Tor, Kessel, Haken (`WORLD`), Feldbreite (`FIELD`) |
| `tuning.ts` | Wurfgefühl (`TUNING_DEFAULT`, Voreinstellungen, Regler) |
| `flags.ts` | Experiment-Schalter (`FLAG_DEFS`), darunter `secondHand` (zweite Hand am Laptop) |
| `quickstart.ts` | Endlos-Schnellstart ab Welle 10, 20, 30 für Entwickler (`QUICK_STARTS`) |
| `decisions.ts`, `devReview.ts` | Entscheidungsliste und Bewertungsliste des Entwickler-Menüs |
| `assets.ts` | Grafik durch Bilddateien ersetzen (`ASSET_OVERRIDES`) |
| `worlds/index.ts` | Verzeichnis aller Welten (`WORLDS`) |
| `worlds/types.ts` | Datentypen von Welt, Level, Welle (`WaveDef`), Boss, Besonderheit, Challenge, Freischaltung, Endlos-Tabelle |
| `worlds/fondue/world.ts` | Welt 1 als Paket |
| `worlds/fondue/campaign.ts` | Die 100 Level: Kurve (`CURVE`), Erstauftritte (`FIRST_LEVEL`), Landschaften, Bosse, Besonderheiten (`TWISTS`), Änderungen einzelner Level (`LEVEL_OVERRIDES`) |
| `worlds/fondue/challenges.ts` | Challenge-Vorlagen (`CHALLENGE_TEMPLATES`) und die zwei Challenges je Level |
| `worlds/fondue/unlocks.ts` | Freischalt-Tabelle (`UNLOCKS`), aus den `unlockLevel`-Feldern von Waffen, Slots und Stationen zusammengesetzt |
| `worlds/fondue/endless.ts` | Endlos-Zufall (Fenster der Erstauftritte, Gewichte), Landschaftswechsel (`ENDLESS`) |
| `worlds/fondue/story.ts` | König, Sätze der Vorrunde, Käse- und Gold-Erklärung, Slot- und Stations-Einführungen, Level-Namen und -Sätze, Bosse, Popups „New enemy“, Sprüche in der Lobby, Storybuch |

### Code

| Ordner / Datei | Aufgabe |
|---|---|
| `src/modes/` | `TutorialMode`, `CampaignMode` (mit `keepLoadout`, `payRun`), `EndlessMode`, `EndlessPlanner`; Schnittstelle `GameMode` (`mode.ts`); Verzeichnis `MODES` und `RESERVED_MODES` (`index.ts`) |
| `src/modes/progress.ts` | **Progression an einer Stelle:** `quote` (was kostet der nächste Schritt, geht er, warum nicht), `buy`, `equip`, Käse einmalig vergeben (`applyLevelCheese`, `cheeseMask`), `addGold`, `addCrests`. Shop, Bots, Cheats und Tests benutzen nur diese Funktionen. Ziele: Waffe, Burg, Hand, Station |
| `src/modes/unlocks.ts` | Was der Fortschritt freigibt, aus `levelsDone` berechnet: offene Slots (`slotOpen`), kaufbare Waffen und Stationen, Stufen-Deckel (`tierCap`), Endlos offen (`endlessOpen`), `syncUnlocks` (das freie Rolling Wheel) |
| `src/modes/challenges.ts` | Beurteilt die zwei Challenges eines Levels an den Zählern des Laufs (`challengesDone`) |
| `src/modes/cheats.ts` | Entwickler-Cheats ohne DOM: Gold, Käse, Wappen geben, Level freischalten, Stufen setzen, alles freischalten, Profil zurücksetzen, zweite Hand am Laptop; markiert das Profil (`cheats.used`) |
| `src/profile/` | Profil (`Profile`), Datenform (`schema.ts`), Migrationen, Bereinigung, Speicher (`ProfileStore`), Export-Code (`codec.ts`) |
| `src/sim/sim.ts` | `Sim`: die eine Tür zur Simulation |
| `src/sim/rules.ts` | Datentypen eines Laufs: `RunRules`, `RunSetup`, `RunStart`, `RunResult`, `Loadout`, `Scaling`, Statistik `RunStatsData` |
| `src/sim/plan.ts`, `spawn.ts`, `spawner.ts` | Wellenplaner (`FixedPlanner` für Kampagne und Vorrunde), Endlos-Wellengröße, Verteilung über die Welle, Auftreten der Gegner (`spawnEnemy`) |
| `src/sim/waveFlow.ts` | Ablauf eines Levels: Banner, Wellen mit Pausen (nächste Welle nach der Pause oder kurz nach dem letzten toten Räuber), Sieg (`runWon`), Niederlage, Halt (`hold`) |
| `src/sim/enemies.ts` | Gegnerverhalten: `updateEnemy`, `updateWalk`, `updateAttack`, `updateHop`, `updateFloat` |
| `src/sim/hands.ts`, `flight.ts`, `physics.ts` | Greifen, Halten, Schütteln, Werfen mit zwei Händen je Spieler (Handnummer siehe unten); Flug und Aufprall; Wurfrechnung mit Gewicht (gilt für Host und Gast) |
| `src/sim/stations.ts` | Kessel (Schmelzzeit je Stufe, doppeltes Gold) und Adlerhaken (gezielter Wurf, Wappen) samt Zielhilfe |
| `src/sim/combat.ts` | Schaden, Tod mit Gold, Explosionen, Schaden am Tor |
| `src/sim/weapons/` | `WeaponSystem` (Antippen, Nachladen, passive Waffen), Zielwahl (`targeting.ts`), eine Verhaltensklasse je Waffenart (`behaviours/`, Verzeichnis `BEHAVIOURS`), Ebene der Entwickler-Eingriffe (`overrides.ts`, Waffen-Editor) |
| `src/sim/projectiles.ts`, `zones.ts` | Geschosse; Feuer, klebriger Käse, Schneewehen am Boden |
| `src/sim/stats.ts` | Statistik je Lauf (`RunStats`) |
| `src/sim/slots.ts` | Griffzonen der Slots (`slotAt`) |
| `src/sim/types.ts` | `Enemy`, `Projectile`, `SimState`, `Meta`, `SimEvent`, `Command` (ohne Kaufbefehle) |
| `src/bots/` | Spielende Bots: Fähigkeiten (`skills.ts`), Spieler (`bot.ts`), Waffenbewertung (`shopper.ts`), Ausgeben zwischen den Läufen über die Progress-API (`armoury.ts`), ein Lauf (`harness.ts`), Kampagne am Stück mit Ausbau und Endlos-Farmen (`campaignRunner.ts`) |
| `src/game/session.ts` | `HostSession`, `GuestSession`, Vorhersage beim Gast, zweite Hand |
| `src/net/` | Netznachrichten (`protocol.ts`, `PROTOCOL_VERSION`), Snapshots, Glättung beim Gast (`interp.ts`), Wahl der Verbindung (`choose.ts`), PeerJS (`peer.ts`), Plan B (`relay.ts`), Test im selben Browser (`loopback.ts`), Latenz-Simulator |
| `src/input/pointer.ts`, `shake.ts` | Zeigerverlauf und Wurfgeschwindigkeit, zweiter Finger oder rechte Maustaste als zweite Hand; Schütteln erkennen |
| `src/render/scene.ts` | `GameScene`: Schlachtfeld, Hände, Banner, Effekte zu Ereignissen (`handleEvent`) |
| `src/render/lobby/` | Lobby als Szene (`lobbyScene.ts`), was wo steht und ab welchem Level (`layout.ts`), Kamerafahrt in die Burg (`dive.ts`) |
| `src/render/marketCamera.ts` | Kamera mit Westflügel der Burg. Der Name stammt vom abgeschafften Markt; Einkaufen läuft heute nur über den Shop-Bildschirm |
| `src/render/tutorialGuide.ts`, `tutorialView.ts` | Ablauf der Vorrunde und des Kessel-Hinweises; deren Zeichnung (König, Geste, Pfeil) |
| `src/render/castleView.ts`, `stations.ts` | Die sieben Burgstufen, Tor, Waffen an der Burg mit Nachladering; Kessel und Haken |
| `src/render/enemyView.ts`, `effects.ts`, `hud.ts`, `background.ts`, `viewport.ts`, `textures.ts`, `glFix.ts` | Figuren und Posen (`applyPose`), Effekte, HUD, Himmel und Landschaft (die Burg sitzt im Vorder- und Hintergrund), Bildausschnitt (`computeView`), Texturen, Shader-Korrektur (E-031) |
| `src/art/registry.ts` | Asset-Verzeichnis: jede Grafik unter festem Namen mit Größe und Anker |
| `src/art/characters/` | Eine Datei je Gegner, Sammlung `RIGS` |
| `src/art/castle/` | Sieben Burgstufen (`tiers.ts`, `keepStages.ts`, `keepStagesGrand.ts`), Tore, Westflügel, Kessel auf dem Hügel, Haken, Vordergrund, Wetter |
| `src/art/weapons/index.ts` | Jede Waffe in sieben Stufen (`weapon:<id>:<stufe>`) |
| `src/art/props/`, `lobby/`, `king.ts`, `landscapes.ts`, `shade.ts`, `draw.ts` | Icons, Geschosse, Effekte; Lobby-Halle, Möbel, Schmuck; König; Landschaften; Licht und Schatten |
| `src/audio/` | Soundeffekte (`SFX_RECIPES`), Musik, Abspielen |
| `src/ui/app.ts` | `App`: Start, Profil laden, Adress-Schalter, Läufe starten, Belohnung auslösen, Fortsetzen am Wellenanfang (`savePending`, `pendingRun`) |
| `src/ui/screens/` | Ein HTML-Bildschirm je Datei, Verzeichnis in `index.ts`, Manager in `screen.ts`. Wichtig: `keep.ts` (Shop, Kennung `armoury`), `prelevel.ts` (Ausrüstung vor dem Level), `won.ts`, `gameover.ts`, `campaign.ts` (Karte und Level-Karte) |
| `src/ui/lobby/` | Steuerung der Lobby, Storybuch, `?menu=html` |
| `src/ui/coop/room.ts` | `CoopRoom`: Raum eröffnen, beitreten, Wiedereinstieg, Versionsmeldung |
| `src/ui/tuningPanel.ts` | Entwickler-Menü mit Waffen-Editor, Cheats, Reglern, Schaltern |
| `src/ui/version.ts` | Versionszeile „v0.3 · build <Hash>“ für Menü, Options und Lobby |
| `src/ui/enemyPopup.ts`, `campaignArt.ts`, `content.ts`, `html.ts`, `style.css` | Popup „New enemy“; Zeichnung der Kampagnen-Karte; Hilfe-Seiten, Tipps, Credits; HTML-Bausteine; Aussehen |
| `scripts/` | `dev-page.ts` (Entwickler-Übersicht), `campaign-table.ts` (Level-Tabelle), `list-assets.ts` (Asset-Liste), `weapon-sheet.ts` (Bild aller Waffen in allen Stufen), `android-setup.mjs` |
| `server/relay/index.mjs` | Plan-B-Server |
| `tests/` | Siehe Abschnitt 7 |

### Handnummern und die zweite Hand

Hände sind durchnummeriert (`handIndex` in `src/sim/physics.ts`): Die erste Hand von Spieler p hat die Nummer p, die zweite Hand die Nummer p + Spieleranzahl. `heldBy` und `holdingProj` tragen Handnummern; Kills, Gold und Wappen werden dem Spieler der Hand gutgeschrieben (`playerOf`). Die zweite Hand hat ein Spieler dauerhaft ab Hand-Stufe 7 (`HAND_RULES.secondHandTier`), für einige Sekunden durch die Support-Waffe Helping Hand oder am Laptop mit dem Entwickler-Schalter `secondHand` (`secondHandReady` in `src/sim/hands.ts`). Befehle und Nachrichten tragen `hand` (0 oder 1, fehlt = erste Hand). Greifen beide Hände denselben Gegner, zählen die Stärken zusammen (Yeti-Regel, `HAND_RULES.yetiLift`).

## 4. Ich will … ändern

### Zahlen

| Ziel | Stelle |
|---|---|
| Gegner schneller, stärker, wertvoller, schwerer | Eintrag in `ENEMIES`: `speed`, `strike`, `hp`, `gold`, `mass`; alle schnellen Typen gemeinsam über `V3_SPEED`, alles Gold über `V3_GOLD` |
| Text im Popup „New enemy“ | `ENEMY_POPUPS` in `worlds/fondue/story.ts` |
| Ab welchem Level ein Gegner kommt | `FIRST_LEVEL` in `worlds/fondue/campaign.ts` |
| Ab welcher Welle ein Gegner im Endlos kommt, wie oft | `ENDLESS.types` in `worlds/fondue/endless.ts` (`firstWave`, `firstCount`, `extraChance`, `weight`, `maxPerWave`) |
| Mehr oder weniger Gegner in der Kampagne | `CURVE` in `worlds/fondue/campaign.ts` (`countShare`, `baseCount`, …); einzelne Level in `LEVEL_OVERRIDES` |
| Wie stark die Gegner eines Levels sind | `CURVE.powerPerLevel`, `powerLate`, `bossPower`; wie die Stärke wirkt und wächst: `CAMPAIGN_SCALING` in `src/config/campaignScaling.ts` |
| Länge der Level | `CURVE.seconds…` (geplante Sekunden, früh, Mitte, Boss, Sonderlevel) und `secondsPerWave` |
| Rhythmus der Wellen, Pausen, Banner, Höchstzahl lebender Räuber | `WAVES` in `waves.ts` |
| Mehr oder weniger Gegner im Endlos | `ENDLESS_WAVES.base`, `perWave`, `softCapWave`, `perWaveAfterCap`, `spikeEvery`, `spikeFactor` |
| Zu zweit | `COOP` in `waves.ts` (`countFactor`, `goldPerKill`) |
| Schwierigkeitsgrade im Endlos, Gold je Schwierigkeit | `DIFFICULTIES` |
| Waffenstärke und Nachladezeit | Stufe in `WEAPONS` (`tiers`) |
| Ab welchem Level eine Waffe kaufbar ist, Käse-Preis | `unlockLevel`, `cheesePrice` in `WEAPONS`; die Summe aller Käse-Preise samt Kessel und Haken muss genau 500 bleiben (Test) |
| Goldpreis der Waffenstufen | `WEAPON_TIER_GOLD` in `tiers.ts`, je Waffe mal `goldScale` |
| Stufen-Deckel gegen Überrollen, Wappen für Stufe 7 | `TIER_CAP_BY_LEVEL`, `CREST_COST` in `tiers.ts` |
| Wappen je Gegner, Höchstzahl je Runde, Größe und Zielhilfe des Hakens | `CRESTS` in `crests.ts` |
| Käse-Schwellen, Challenge-Texte und -Mengen | `CHEESE` in `currencies.ts`; `CHALLENGE_TEMPLATES` in `worlds/fondue/challenges.ts` |
| Was welches Level freischaltet | `unlockLevel` bei Waffen und Stationen, `unlockLevel` in `SLOTS`; die Tabelle `UNLOCKS` baut sich daraus |
| Hand stärker, Preise der Hand, ab wann die zweite Hand | `HANDS`; Wurfregel und Zweite-Hand-Stufe `HAND_RULES` |
| Torleben, Torpreise | `CASTLE_TIERS` |
| Preis und Zeitpunkt von Kessel und Haken, Schmelzzeit | `STATIONS`, `CAULDRON_SECONDS`; Kessel-Goldfaktor `ECONOMY` |
| Schütteln leichter oder schwerer | `BEHAVIOUR.kegShake` |
| Lage von Kessel und Haken | `WORLD.cauldron`, `WORLD.perch` |
| Lage der Waffen an der Burg | `SLOTS` (x, y); die Burggrafik muss dazu passen |
| Vorrunde, erstes Upgrade | `PRELUDE`, `GUIDE`, `FIRST_UPGRADE` in `tutorial.ts` |
| Schnellstart-Ausstattung (Entwickler) | `QUICK_STARTS` |

### Wurfgefühl

Zuerst live probieren: im Spiel das Entwickler-Menü öffnen (Abschnitt 8), Regler bewegen, mit **Export** die Werte kopieren und in `TUNING_DEFAULT` eintragen. Läufe mit veränderten Reglern zählen nicht (E-059), und außerhalb solcher Läufe gilt immer `TUNING_DEFAULT`. Dasselbe gilt für Werte aus dem Waffen-Editor.

| Ziel | Wert in `TUNING_DEFAULT` |
|---|---|
| Würfe weiter oder kürzer | `throwMult`, `maxThrow` |
| Schneller oder träger fallen | `gravity` |
| Wie hart ein Aufprall sein muss, um zu töten | `lethalImpact` |
| Greifen leichter | `grabRadius` |
| Gegner hängt straffer an der Hand | `holdSpring` |
| Mehr oder weniger Wucht beim Treffer | `hitstopMs`, `shake` |

Die Logik dazu: `velocity()` in `src/input/pointer.ts`; `release`, `throwEnemy`, `updateHeld` in `src/sim/hands.ts`; `updateAir` in `src/sim/flight.ts`; Gewicht in `throwFactor`, `followFactor`, `launchVelocity` in `src/sim/physics.ts`. Falle 4 beachten.

### Aussehen und Klang

| Ziel | Stelle |
|---|---|
| Figur umzeichnen | Datei in `src/art/characters/`; Figuren schauen in der Grafik **nach links** |
| Lauf-, Halte-, Fluganimation | `applyPose` in `src/render/enemyView.ts` |
| Burg, Tore, Westflügel, Kessel, Haken (alle sieben Burgstufen) | `src/art/castle/`; Zuordnung Stufe zu Grafik in `tiers.ts` |
| Waffe an der Burg, je Stufe | `src/art/weapons/index.ts`; alle Waffen in allen Stufen als Bild: `node scripts/weapon-sheet.ts` |
| Lobby-Halle, Möbel, Schmuck, König auf dem Thron | `src/art/lobby/`; wo was steht und ab welchem Level: `STATIONS`, `DECOR` in `src/render/lobby/layout.ts` |
| König auf dem Schlachtfeld | `src/art/king.ts`; Auftritt in `src/render/tutorialView.ts` |
| Kampagnen-Karte | `src/ui/campaignArt.ts`, Bildschirm `src/ui/screens/campaign.ts` |
| Shop | `src/ui/screens/keep.ts` (Bilder aus denselben Grafiken wie das Schlachtfeld) |
| Grafik durch eine Bilddatei ersetzen | `docs/GRAFIK-AUSTAUSCHEN.md`, `ASSET_OVERRIDES` |
| Licht und Schatten | Bausteine in `src/art/shade.ts`; Licht immer von links oben (E-031) |
| Landschaften | `src/art/landscapes.ts`; Wechsel in der Kampagne `LANDSCAPE_FROM` (campaign.ts), im Endlos `ENDLESS.landscapes`, `wavesPerLandscape` |
| Welcher Effekt und Klang bei welchem Ereignis | `handleEvent` in `src/render/scene.ts` |
| Handfarben | `HAND_COLORS` in `src/render/scene.ts` |
| HUD | `src/render/hud.ts` |
| Menüs, Handy-Layout | `src/ui/style.css`, `src/ui/lobby/lobby.css` |
| Klang eines Effekts | `src/audio/sfx.ts`, `SFX_RECIPES` |
| Musik | `src/audio/music.ts` |

### Texte und Menüs

Spieltexte sind Englisch. Story, König, Level-Sätze, Popups, Storybuch, Käse- und Slot-Einführungen: `src/config/worlds/fondue/story.ts`. Hilfe, Lade-Tipps, kurze Tipps, Credits: `src/ui/content.ts`. Waffentexte: `desc` und `note` in `WEAPONS`. Währungstexte: `CURRENCIES`. Ein Bildschirm ist eine Datei in `src/ui/screens/`; ein Button trägt `data-a="name"` und wird in `onClick` des Bildschirms behandelt. Weiter steht rechts, zurück links.

### Koop

| Ziel | Stelle |
|---|---|
| Raum eröffnen, beitreten, Wiedereinstieg, Versionsmeldung | `CoopRoom` in `src/ui/coop/room.ts` (`mismatchText`) |
| Spielerliste im Raum | `src/ui/screens/roomParts.ts` |
| Snapshot-Takt, Abbruchzeit | `SNAPSHOT_EVERY_STEPS`, `SILENCE_LIMIT_MS`, `OWN_STALL_MS` in `src/game/session.ts` |
| Glättung beim Gast | `PlayoutBuffer` (`PLAYOUT_MIN_MS`, `PLAYOUT_MAX_MS`, `EXTRAPOLATE_MAX_MS`) in `src/net/interp.ts` |
| Verbindung wählen (Relay oder eigener Server später) | `pickTransport` in `src/net/choose.ts` |
| STUN-Server, PeerJS | `src/net/peer.ts` |
| Goldteilung, Gegnerzahl zu zweit | `COOP` in `waves.ts`; Gold schreibt `payRun` in `src/modes/campaign.ts`, Käse nur der Host (`CampaignMode.reward`) |

## 5. Rezepte

TypeScript hilft bei allen Rezepten: `ENEMIES`, `RIGS`, `BEHAVIOURS` und `ENDLESS.types` sind vollständige Tabellen, `npx tsc --noEmit` meldet fehlende Einträge.

**Ein Level ändern**
1. In `LEVEL_OVERRIDES` (`src/config/worlds/fondue/campaign.ts`) einen Eintrag für das Level anlegen, zum Beispiel `37: { name: '…' }` oder ganze `waves` (`WaveDef`: Räuber je Typ, Dauer des Eintreffens, Pause danach). Jedes Feld von `LevelDef` lässt sich ersetzen, auch `challenges`.
2. Für Änderungen an vielen Leveln stattdessen die Regeln ändern: `CURVE`, `FIRST_LEVEL`, `TWISTS`, `BOSS_BIG`, `BOSS_EXTRA`, `LANDSCAPE_FROM`.
3. `node scripts/campaign-table.ts` ausführen, damit `docs/KAMPAGNE-TABELLE.md` stimmt (sonst schlägt `tests/unit/campaignTable.test.ts` fehl).
4. `npm run balance` und die Kampagnen-Zeilen in `docs/balance-latest.md` ansehen.

**Ein neues Level** (die Kampagne verlängern): `LEVEL_COUNT` erhöhen, Name und Satz in `LEVEL_NAMES` und `LEVEL_STORY` (`story.ts`), dann wie oben. Achtung: Es gibt höchstens 5 Käse je Level und genau 500 Käse-Preise; mehr Level heißt, die Preise neu zu verteilen. Neue Level verändern den Startwert der anderen nicht; alte Profile bleiben gültig.

**Eine neue Freischaltung:** Waffen und Stationen sagen selbst, ab welchem Level sie kaufbar sind (`unlockLevel` und `cheesePrice` in `WEAPONS` und `STATIONS`), Slots in `SLOTS`. `UNLOCKS` (`worlds/fondue/unlocks.ts`) baut sich daraus. Karte, Shop, Sieg-Bildschirm und Regeln lesen die Tabelle. Danach `node scripts/campaign-table.ts`; der Test zur Käse-Summe sagt, ob die 500 noch stimmen.

**Eine neue Waffe**
1. Eintrag in `WEAPONS` (`src/config/weapons.ts`) mit `id`, `slot` (die Aufgabe), `kind`, `target`, `unlockLevel`, `cheesePrice`, `goldScale`, `desc` und genau sieben Stufen. Passt eine vorhandene Art (`kind`), ist das alles an Regeln. Die Käse-Preise müssen zusammen mit Kessel und Haken wieder genau 500 ergeben, jede Stufe muss sich um einen Schalter oder um mindestens 15 % einer Zahl ändern (Tests in `tests/unit/weapons.test.ts`).
2. Grafik in `src/art/weapons/index.ts` für alle sieben Stufen (Name `weapon:<id>:<stufe>`).
3. Nur bei neuer Art von Verhalten: Typ der Stufe in `weapons.ts`, eine Klasse in `src/sim/weapons/behaviours/` (`fire`, bei Bedarf `tick`, passive Waffen feuern über `tick`), eine Zeile in `BEHAVIOURS`. Nur bei neuem Geschoss: `ProjectileKind` in `src/sim/types.ts` und `KINDS` in `src/net/snapshot.ts`. Nur bei neuem Effekt: ein Fall in `handleEvent`.
4. Eintrag auf der Bewertungsliste in `docs/OFFENE-ENTSCHEIDUNGEN.md`.
5. Unit-Test in `tests/unit/weapons.test.ts`, dann `npx tsc --noEmit`, `npm test`, `npm run balance`, `node scripts/list-assets.ts`.
Die Bots lesen die Tabelle und bewerten Waffen grob nach den Zahlen der Stufe (`src/bots/shopper.ts`).

**Eine Waffe entfernen:** `enabled: false` in `WEAPONS`. Sie verschwindet aus Shop und Kampagne, bleibt aber im Code. Achtung: Dann stimmt die Käse-Summe 500 nicht mehr; Preise anpassen.

**Eine Stufe ändern:** den Eintrag in `tiers` der Waffe ändern; `note` sagt, was diese Stufe neu bringt. Jede Stufe soll spürbar etwas Neues bringen, nicht nur größere Zahlen (Test: Schalter oder mindestens 15 %). Eine achte Stufe ist ein größerer Umbau: `TIER_MAX` (`tiers.ts`), `WEAPON_TIER_MAX` (profile/schema.ts, mit Migration), `WEAPON_TIER_GOLD`, `CASTLE_TIERS`, `HANDS`, `CASTLE_ART_TIERS` und alle Grafiken.

**Ein neuer Gegner**
1. Typ in `EnemyType` und Eintrag in `ENEMIES` (`src/config/enemies.ts`), mit `mass`, `crests` in `CRESTS.byType`.
2. Figur als neue Datei in `src/art/characters/`, eintragen in `RIGS`.
3. Popup in `ENEMY_POPUPS` (`story.ts`).
4. Wann er kommt: `FIRST_LEVEL` und `SHARE` (campaign.ts), Zeile in `ENDLESS.types` (endless.ts).
5. Sonderverhalten in `src/sim/enemies.ts` (`updateEnemy`) und `spawnEnemy` (`src/sim/spawner.ts`). Reine Läufer brauchen nichts davon.
6. Bei einem neuen Zustand: `EnemyState` ergänzen, ebenso `STATES` in `src/net/snapshot.ts` und einen Fall in `applyPose`.
7. Greifregeln für den Gast prüfen (Falle 4).
8. Unit-Test in `tests/unit/sim.test.ts`, dann `node scripts/campaign-table.ts`, `node scripts/list-assets.ts`, `npm run balance`.

**Eine neue Challenge:** eine Vorlage in `CHALLENGE_TEMPLATES` (`worlds/fondue/challenges.ts`) mit der Zähler-Art, die `challengeProgress` in `src/modes/challenges.ts` kennt; fehlt der Zähler, in `RunStatsData` (`src/sim/rules.ts`) und `RunStats` ergänzen. Ein Test prüft, dass jede Challenge in ihrem Level erfüllbar ist.

**Eine neue Welt**
1. Neuer Ordner `src/config/worlds/<welt>/` nach dem Vorbild von `fondue/`: `world.ts`, `campaign.ts`, `unlocks.ts`, `endless.ts`, `story.ts`.
2. Eine Zeile in `WORLDS` (`src/config/worlds/index.ts`).
3. Das Profil führt Fortschritt je Welt schon (`worlds[weltId]`: gewonnene Level, Käse-Masken, Bestenliste). Der Geldbeutel und die Burg (Waffen- und Hand-Stufen) gelten heute für alle Welten.
4. Noch fest an Welt 1: Die App spielt immer `DEFAULT_WORLD` (`App.world`), und Lobby (`src/ui/lobby/lobby.ts`), Popup (`src/ui/enemyPopup.ts`) und Tutorial (`src/render/tutorialView.ts`) lesen die Story direkt aus `worlds/fondue/story.ts`. Für eine zweite Welt müssen diese Stellen die Story über die Welt bekommen.

**Grafik austauschen:** Anleitung Schritt für Schritt in `docs/GRAFIK-AUSTAUSCHEN.md`. Kurz: Bild nach `public/assets/`, Zeile in `ASSET_OVERRIDES` (`src/config/assets.ts`), zum Ausprobieren ohne Codeänderung `?asset=<name>=<url>`. Nach neuer oder geänderter SVG-Grafik `node scripts/list-assets.ts`. Licht von links oben, keine SVG-Masken und Filter (Falle 14); der Rahmen eines Teils muss die Zeichnung mit Rand umfassen (`tests/e2e/art.spec.ts`).

**Ein neuer Modus:** eine Klasse hinter `GameMode` (`src/modes/mode.ts`) mit `buildRun` und `reward`, eine Zeile in `MODES` (`src/modes/index.ts`), ein Weg dorthin in der Lobby. Gold und Wappen eines Laufs schreibt `payRun`; Käse nur, wer sie ausdrücklich vergibt (nur die Kampagne tut das). Reservierte Namen: `RESERVED_MODES`.

**Ein neuer Experiment-Schalter:** Eintrag in `FLAG_DEFS` (`src/config/flags.ts`), in den Regeln `ctx.flag('id')`. Das Entwickler-Menü baut sich von selbst. Ein veränderter Schalter macht jeden Lauf zum Entwickler-Lauf.

**Ein neuer Schnellstart:** Eintrag in `QUICK_STARTS`; ein Unit-Test prüft, dass jede Waffe echt ist und in ihren Slot passt.

**Eine neue Burg-Ausbaustufe:** Es gibt genau sieben, so wie `TIER_MAX`. Eine Stufe ändern: `CASTLE_TIERS` (Name, Torleben, Gold) und die Grafik der Stufe in `src/art/castle/` (Name `prop:keep<N-1>` …, siehe `tiers.ts`). Die Plätze aus `SLOTS` müssen auf der Grafik frei bleiben.

**Neues am Profil:** Feld in `ProfileData` (`src/profile/schema.ts`), Standardwert in `freshProfile`, Bereinigung in `sanitize.ts`, `PROFILE_VERSION` erhöhen und einen Schritt an die Kette in `migrations.ts` hängen (das Format ist so geschnitten, dass es später eins zu eins in einen Cloud-Account wandern kann). Test in `tests/unit/profile*.test.ts`. Geld und Burg nie an `progress.ts` vorbei ändern.

**Neuer Effekt zu einem Ereignis:** Variante in `SimEvent`, in der Simulation `ctx.emit(...)`, in `handleEvent` den Effekt auslösen. Beim Gast kommt das automatisch an.

**Neue Eigenschaft, die man sehen soll:** Feld in `Enemy`, in `ViewEnemy`, in der Kodierung und Dekodierung von `src/net/snapshot.ts`. Ohne den Snapshot-Teil fehlt sie beim Gast und beim Host gleichermaßen, weil auch der Host über den Snapshot zeichnet.

**Neuer Klang:** Name in `SfxName`, Funktion und Eintrag in `SFX_RECIPES`, abspielen in der Szene.

## 6. Fallen

1. **Gespeichertes Tuning wirkt nur in Entwickler-Läufen.** Außerhalb davon gilt immer `TUNING_DEFAULT`. Wer im Entwickler-Menü Regler oder Waffenwerte verstellt, bekommt weder Gold noch Käse noch Bestenliste, bis er **Default** drückt. Im Koop zählen die Werte des Hosts.
2. **Ein Merge nach `main` geht sofort live.** Vorher `npm test` und `npm run test:e2e`. Branches `v0.3-dev`, `v0.2` und `classic` gehen nicht über `main` live, sondern erst durch einen Lauf des Deploy-Workflows (Abschnitt 7).
3. **Host und Gast brauchen denselben Build und dieselbe Adresse.** Sonst lehnt der Host mit einer Versionsmeldung ab. `/fondue/next/`, `/fondue/v0.2/` und `/fondue/classic/` sind verschiedene Spiele. Nach jedem Deploy laden beide die Seite neu.
4. **Einige Regeln gibt es doppelt, damit der Gast sofort reagiert.** Wer eine Seite ändert, muss die andere mitziehen:

   | Host (`src/sim/`) | Gast (`GuestSession` in `src/game/session.ts`) |
   |---|---|
   | `tryGrabEnemy`, `grabDistance`, `tryGrabBomb` (`hands.ts`) | `localPress`, `pickEnemy` |
   | `release`, `throwEnemy` (`hands.ts`) | `localRelease` |
   | `updateHeld` (`hands.ts`), `updateAir` (`flight.ts`) | `stepPrediction` |
   | `secondHandReady`, Handnummern (`hands.ts`) | `secondHandReady`, `handSlot` |

   Die Wurfrechnung mit Gewicht und Hand-Stufe (`src/sim/physics.ts`) und der Greifzuschlag schneller Gegner (`grabBonus`) benutzen beide Seiten; sie gibt es nur einmal.

5. **Nicht jede Zahl steht in `src/config/`.** Die Zoom-Stufe der Burg-Kamera steht in `src/render/marketCamera.ts` (`MARKET_ZOOM`), die Fähigkeiten der Balance-Bots in `src/bots/skills.ts`, die Haken-Zeiten der Vorrunde teils in `src/render/tutorialGuide.ts`.
6. **Die Level-Tabelle ist erzeugt.** `docs/KAMPAGNE-TABELLE.md` und die Asset-Liste in `docs/GRAFIK-AUSTAUSCHEN.md` nicht von Hand ändern; die Skripte neu laufen lassen, sonst schlagen Unit-Tests fehl.
7. **Größen:** `radius` und `height` in `ENEMIES` sind Weltmaße. Wer eine Figur größer zeichnet, muss sie dort mit anpassen, sonst passt die Greiffläche nicht.
8. **Balance-Bots sind Näherungen.** Die Zahlen sagen, ob eine Änderung in die richtige Richtung geht, nicht wie Menschen abschneiden. Die Bots haben einen „Geschmack“ je Waffe, bewerten sie aber nur grob. Gemessen wird mit Feldbreite 1280.
9. **Tests dürfen nie abgeschwächt werden.** Ändert sich eine Regel bewusst, wird der Test durch einen Test der neuen Regel ersetzt und das festgehalten (`docs/PROGRESS-GROSSES-UPDATE.md`, „Ersetzte Tests“; für v0.3 `docs/v0.3/PROGRESS.md`).
10. **Testläufe überschreiben `docs/screenshots/`.** Das erzeugt Git-Änderungen ohne Bedeutung; diese Dateien nicht mit committen, wenn sie nicht gemeint sind. Belege für die Abnahme von v0.3 liegen in `docs/screenshots/v0.3/` und werden gezielt hinzugefügt.
11. **Welt- und Bildschirmkoordinaten sind nicht dasselbe.** Die Feldbreite ist 1280 bis 1760 und steht in `meta.fieldW`; was auf breiten Handys sichtbar ist, gibt `RunSetup.viewRight` an (Räuber treten dort ein). Figuren, Geschosse und Hände stehen in Weltkoordinaten, das HUD in Bildschirmkoordinaten.
12. **Links von x = 0 liegt nur der Westflügel der Burg** (Kamera `marketCamera.ts`). Alles Spielrelevante muss im Feld liegen, sonst sehen Host und Gast nicht dasselbe.
13. **`Math.random` und `window` sind in `src/sim/` tabu.** Auch ein Import aus `src/render/` zieht Phaser in die Unit-Tests.
14. **SVG-Masken und Filter machen den Start langsam.** Schattierung über `crescent` und `within` aus `src/art/shade.ts`.
15. **Nicht alle Texturen gibt es sofort.** Landschaften außer der Wiese, höhere Burgstufen und höhere Waffenstufen entstehen nach dem Start im Hintergrund (`landscapeReady`, `keepStagesReady`, `weaponTiersReady` in `src/render/textures.ts`). Vor dem Anzeigen prüfen, ob sie fertig sind. Browser-Tests warten auf `__fondue.artReady`.
16. **Eingefrorene Seite ist keine Funkstille.** Zeit, in der die eigene Seite stand, zählt im Koop nicht als Stille (`excuseOwnStall`).
17. **Homescreen-App und Browser-Tab haben getrennte Speicher.** Ein Profil im Safari-Tab ist nicht das Profil der Homescreen-App. Umzug über Export und Import in den Options.
18. **Belohnungen werden genau einmal gezahlt.** Jeder Lauf hat eine `runId`, das Profil merkt sich die letzten 200 (`claimRun`). Wer `reward` zweimal aufruft, bekommt beim zweiten Mal nichts. Käse wird zusätzlich je Bit nur einmal vergeben.
19. **Geld und Burg nur über `src/modes/progress.ts` ändern.** Ein direkter Schreibzugriff auf `wallet` oder `keep` umgeht die Preise, den Stufen-Deckel und das sofortige Speichern (`flushSync`). Ausnahme: `src/modes/cheats.ts`, und das markiert das Profil.
20. **Der Stufen-Deckel hält den Ausbau auf, nicht das Gold.** Wer die späte Kampagne leichter oder schwerer machen will, dreht an `TIER_CAP_BY_LEVEL` und `CURVE.powerLate`, nicht nur an den Preisen (`docs/balance.md`).
21. **Im Spiel gibt es keine Kaufbefehle.** `Command` hat kein `buy…`; wer im Lauf etwas verändern will, muss das bewusst als Entwickler-Eingriff bauen, der den Lauf zum Entwickler-Lauf macht.

## 7. Befehle, Testen und veröffentlichen

| Befehl | Was er tut |
|---|---|
| `npm ci`, dann `npx playwright install chromium` | Einrichten |
| `npm run dev` | Spiel lokal auf http://localhost:5173 |
| `npm run build` | Typ-Check und Build nach `dist/` |
| `npx tsc --noEmit` | Nur der Typ-Check |
| `npm test` | Unit-Tests (`tests/unit/`): Regeln, Waffen und Stufen, Gewicht, Hände, Schütteln, Profil und Speichern, Progression, Freischaltungen, Käse und Challenges, Wellen und Kampagne, Kampagnen-Tabelle, Lobby, Tutorial, Assets, Sitzung, Glättung beim Gast, Cheats und Waffen-Editor |
| `npm run test:e2e` | Browser-Tests (`tests/e2e/`) mit Playwright auf drei Geräten: Laptop, iPhone 16, OnePlus 8T (darunter Shop, Kampagne, Lobby, Tutorial, Burgstufen, Mehrfach-Touch, Koop, Entwickler-Werkzeuge, erster Räuber) |
| `ALL_SCREENS=1 npm run test:e2e` | Dazu kleine Androids, iPhone SE, iPad |
| `npm run balance` | Bots spielen Endlos, Koop und alle 100 Level mit Ausbau zwischen den Läufen, schreibt `docs/balance-latest.md` und `.json` (mit `BALANCE_PART=grind` nur die Wappen-Messung) |
| `npm run dev-page` | Entwickler-Übersicht nach `dist/dev/index.html`; `node scripts/dev-page.ts <ordner>` schreibt woanders hin |
| `node scripts/campaign-table.ts` (oder `npm run campaign-table`) | Schreibt die Level-Tabelle in `docs/KAMPAGNE-TABELLE.md` |
| `node scripts/list-assets.ts` | Schreibt die Asset-Liste in `docs/GRAFIK-AUSTAUSCHEN.md` |
| `node scripts/weapon-sheet.ts` | Bild aller Waffen in allen sieben Stufen nach `docs/screenshots/v0.3/weapons-tiers.png` |
| `npx playwright test --config playwright.perf.config.ts` | Bilder pro Sekunde mit vielen Gegnern |
| `npx playwright test --config playwright.live.config.ts` | Veröffentlichte Seite; mit `EXPECT_BUILD=<kurzer Hash>` prüft er, dass der neue Build live ist |
| `npm run relay` | Plan-B-Server lokal |

**Veröffentlichen**, sobald Tim oder Lenny es sagt: alle Tests grün, Pull Request nach `main`, Merge. `.github/workflows/ci.yml` führt für jeden Pull Request die Prüfung `test` aus (Typ-Check, Unit-Tests, Browser-Tests in sechs Teilen), ohne Grün kein Merge. `.github/workflows/deploy.yml` baut nach jedem Merge mehrere Stände in einen Ordner und stellt sie live:

| Adresse | Was |
|---|---|
| https://onlineshopbuilding-droid.github.io/fondue/ | das Spiel von `main` (bis zur Veröffentlichung von v0.3 noch v0.2) |
| https://onlineshopbuilding-droid.github.io/fondue/next/ | v0.3, gebaut aus dem Branch `v0.3-dev`, zum Testen |
| https://onlineshopbuilding-droid.github.io/fondue/next/dev/ | die Entwickler-Übersicht von v0.3, aus dem Code erzeugt |
| https://onlineshopbuilding-droid.github.io/fondue/v0.2/ | der eingefrorene Stand v0.2 aus dem Branch `v0.2` (Tag `v0.2`) |
| https://onlineshopbuilding-droid.github.io/fondue/classic/ | der alte Stand v0.1 vom Branch `classic` (Tag `v0-alpha`), E-032 |
| https://onlineshopbuilding-droid.github.io/fondue/dev/ | die Entwickler-Übersicht des Stands auf `main` |

Die Pages-Umgebung nimmt nur Läufe von `main` an. Nach einer Änderung an `v0.3-dev`, `v0.2` oder `classic` den Deploy deshalb von Hand starten: `gh workflow run deploy.yml --ref main` (Actions, „Run workflow“, Branch `main`). Zurückrollen auf einen alten Stand: `main` per Pull Request auf den Stand des Tags bringen (kein Force-Push). Alle Adressen teilen sich den Browser-Speicher, v0.3 benutzt aber nur Schlüssel `fondue.v3.…`. Auf dem iPhone legt man `/fondue/next/` über „Zum Home-Bildschirm“ als eigene App an; sie hat einen eigenen Speicher, getrennt vom bisherigen Symbol.

Alle Adressen teilen sich den Browser-Speicher. Deshalb speichert v0.3 unter eigenen Schlüsseln (`fondue.v3.*`) und lässt den Spielstand der Live-Version in Ruhe.

Ist der Stand auf `v0.3-dev` kaputt, läuft die Auslieferung trotzdem durch: `/next/` (oder `/next/dev/`) zeigt dann eine kurze Seite „v0.3 build failed, see Actions“, und der Lauf hat eine Warnung. Das Spiel unter `/fondue/` ist davon nie betroffen.

## 8. Hilfen beim Ausprobieren

**Entwickler-Menü:** Options → „Developer menu“ (auch am Handy), am Laptop F1, im einfachen HTML-Menü auch langes Drücken aufs Logo. Dort:
- **Waffen-Editor** (ausklappbar): für jede Waffe und Stufe Zahlen live ändern (Abklingzeit, Reichweite, Schaden, Trefferzahl, Dauer, Größe), auf Standard zurücksetzen, als Text exportieren, um Werte an die KI zurückzugeben (`src/sim/weapons/overrides.ts`). Läufe mit Änderungen sind Entwickler-Läufe.
- **Cheats** (`src/modes/cheats.ts`): sich Gold, Käse und Räuberwappen geben, Level freischalten, Stufen von Waffen, Burg, Hand und Stationen setzen, alles freischalten, Profil zurücksetzen (mit Sicherheitsabfrage). Sie wirken bewusst dauerhaft; das Profil trägt danach die Markierung „Cheats used“ im Entwickler-Menü und in den Options.
- **Zweite Hand am Laptop:** Der Schalter „Second hand on the laptop“ (`secondHand`) lässt die **rechte Maustaste** die zweite Hand sein: allein, oder gedrückt, während die linke Taste hält, um zwei Räuber zu greifen. Wie jeder Schalter macht er Läufe zu Entwickler-Läufen.
- Zu einem Level und einer Welle der Kampagne springen (das Feld heißt im Menü noch „Day“), Endlos ab Welle 10, 20, 30, Tutorial wiederholen, Experiment-Schalter, Tuning-Regler, die Entscheidungs- und Bewertungsliste zum Abhaken, Bewerten und Kopieren als Text (`src/config/devReview.ts`, `decisions.ts`).
Der Knopf in den Options lässt sich vor einer Veröffentlichung mit `DEV_MENU_BUTTON` (`src/ui/screens/options.ts`) verstecken.

**F3:** Debug-Anzeige mit Bildern pro Sekunde, Rolle, Ping, Build.

**Schalter in der Adresse** (an `http://localhost:5173/` oder die Live-Adresse anhängen, mehrere mit `&` verbinden):

| Schalter | Wirkung |
|---|---|
| `?menu=1` | Tutorial überspringen, direkt in die Lobby |
| `?menu=html` | Einfaches HTML-Menü statt der Lobby (und kein Tutorial) |
| `?fresh=1` | Leeres Profil nur im Speicher; das echte Profil bleibt unberührt |
| `?profile=CODE` | Profil aus einem Export-Code laden, nur im Speicher |
| `?tutorial=1` | Tutorial starten, auch wenn es schon gesehen ist |
| `?asset=<name>=<url>` | Eine Grafik probeweise durch eine Bilddatei ersetzen (mehrfach möglich) |
| `?seed=123` | Fester Zufall |
| `?join=CODE` | Direkt einem Koop-Raum beitreten |
| `?net=loopback` | Koop allein testen: zwei Tabs, im zweiten zusätzlich `&join=CODE` |
| `&lat=45&jit=20&loss=0.02` | Simulierte Latenz, Schwankung, Verlust |
| `?relay=...` | Adresse des Plan-B-Servers |

**Parallele Sitzungen:** Laufen auf einem Rechner zwei Sitzungen, braucht jede einen eigenen Testserver, zum Beispiel `TEST_PORT=5317`.

**Browser-Konsole:** `window.__fondue` ist die App. Auf dem Host zum Beispiel `__fondue.session.sim.s.gold = 5000` (Gold dieses Laufs). Die Lobby hat Test-Hilfen: `__fondue.lobby.spots()`, `__fondue.lobby.tap('campaign')`. Für Dauerhaftes (Käse, Gold, Stufen) die Cheats benutzen.

## 9. Bei jeder Änderung: Stimmigkeits-Check

Eine Änderung ist erst fertig, wenn das ganze Spiel danach noch zusammenpasst. Nicht jeder Punkt betrifft jede Änderung, aber jeder wird durchgedacht. Was nicht mehr passt, wird im selben Zug mitgeändert.

| Bereich | Frage | Wo nachsehen |
|---|---|---|
| Texte | Stimmen Popups, Hilfe-Seiten, Tipps, Waffentexte, Sätze des Königs noch? Gleicher Ton, Englisch, „tap“ statt „click“? Kein Wort aus der Zeit vor v0.3 (Markt, Sterne, Tage, Offerings)? | `ENEMY_POPUPS`, `story.ts`, `HELP_SLIDES`, `LOADING_TIPS`, `STATION_TIPS` in `content.ts`, `desc`/`note` in `WEAPONS` |
| Regeln | Widerspricht etwas Neues einer alten Regel? Sonderfälle wie Blase, gefrorene, gehaltene, hängende Gegner, Boss-Räuber, zweite Hand? | `src/sim/`, `docs/GDD.md` |
| Kampagne | Passt die Level-Tabelle, ist jedes Level schaffbar, sind die Challenges erfüllbar? Neue Gegner und Freischaltungen an sinnvoller Stelle? | `node scripts/campaign-table.ts`, `npm run balance` |
| Käse, Gold und Freischaltungen | Kommt regelmäßig etwas Neues, ist nichts zu früh fertig? Käse-Summe genau 500? Kein Farmen über Wiederholen, Endlos oder Koop? Hält der Stufen-Deckel? | `CHEESE`, `unlockLevel`/`cheesePrice`, `TIER_CAP_BY_LEVEL`, `docs/balance.md` |
| Wirtschaft | Sind höhere Stufen teurer und besser? Ist alles erreichbar? Wappen-Grind bei 20 bis 30 Runden? | `WEAPON_TIER_GOLD`, `CASTLE_TIERS`, `HANDS`, `CRESTS` |
| Schwierigkeit | Liegt der Verlauf im Ziel? Ohne Ausbau bleibt der mittlere Bot früh stecken, mit Ausbau kommt er weiter, der sehr gute Bot braucht in Boss-Leveln mehr Versuche, zu zweit ist es nicht leichter als allein | `docs/balance.md`, `npm run balance` |
| Koop | Sieht der Gast dasselbe, reagiert er genauso? Belohnung für beide richtig (Gold beide, Käse nur Host)? | Falle 4, `src/net/snapshot.ts`, `CampaignMode.reward` |
| Profil | Braucht es ein neues Feld, dann mit Migration? Überlebt ein altes Profil? Bleibt `fondue.profile` unberührt? | `src/profile/`, `tests/unit/profile*.test.ts` |
| Bedienung | Geht es mit Finger und Maus, Flächen mindestens 44 Pixel, weiter rechts und zurück links, zweite Hand ohne Zoom und Scrollen? | Abschnitt 10; Screenshots ansehen |
| Aussehen | Passt es zum Stil? Überlappt etwas, wird etwas abgeschnitten? In allen sieben Burgstufen und Landschaften? | `PAL` in `src/art/characters/kit.ts`, `style.css`; Screenshots |
| Rückmeldung | Hat etwas Neues Klang, Effekt und einen Hinweis für Spielende? | `handleEvent`, `SFX_RECIPES` |
| Leistung | Bleibt es flüssig mit vielen Gegnern auf Handy-Größe? | FPS-Test |
| Tests | Ist das Neue durch einen Test abgesichert und alles grün? | Abschnitt 7 |
| Erzeugtes | Level-Tabelle und Asset-Liste neu erzeugt? | `scripts/` |
| Dokumente | Stimmen Handbuch, GDD, Architektur, Entscheidungen, offene Entscheidungen, Ideen? | `docs/` |

Am Ende steht ein kurzer Bericht für Tim und Lenny: was geändert wurde, was dadurch mitgeändert wurde, wo es liegt, was geprüft wurde und was nur Menschen beurteilen können, etwa Spielgefühl und Klang.

## 10. Handy und Endziel App Store / Google Play

Fondue ist ein Handyspiel im Querformat. Jede Entscheidung zu Bedienung, Schriftgrößen und Tempo wird für den Touchscreen getroffen; der Laptop muss weiter funktionieren.

**Anpassung an jeden Bildschirm**
- Die Feldbreite (1280 bis 1760) legt der Host beim Start fest (`meta.fieldW`, E-021). Gegner laufen auf breiterem Feld etwas schneller (`FIELD.speedCompensation`). Neue Räuber erscheinen am sichtbaren rechten Rand des Hosts (`RunSetup.viewRight`), damit der erste Räuber nach höchstens 2 Sekunden zu sehen ist.
- `computeView` bestimmt, was sichtbar ist. Im Kampf steht die Burg am linken Rand.
- Das HUD ist an die Bildschirmränder verankert und wächst auf kleinen Bildschirmen. Notch und Home-Leiste werden freigehalten (`readSafeArea`).
- Hochkant erscheint ein Hinweis zum Drehen, ein laufendes Solo-Spiel pausiert.
- Am Touchscreen wird die eigene Hand nicht gezeichnet; die des Mitspielers bleibt sichtbar. Zwei Finger sind zwei Hände; die Seite zoomt und scrollt dabei nicht (`tests/e2e/multitouch.spec.ts`).

**Geprüft wird auf drei Geräten:** Tims iPhone 16 (im Test 852 × 393), Lennys OnePlus 8T (915 × 412) und Laptop (1280 × 720), festgelegt in `tests/e2e/helpers.ts` (`DEVICES`). Weitere Größen nur mit `ALL_SCREENS=1`. Safari, echte Leistung und echtes Spielgefühl sieht man so nicht; dafür testen Tim und Lenny auf ihren Geräten.

**Für jede neue Funktion**
- Alles muss per Finger gehen. Tastatur, Hover und Rechtsklick sind nur Zusatz (die rechte Maustaste als zweite Hand ist ein Entwickler-Schalter).
- Neue Bildschirme bekommen einen Browser-Test auf den drei Geräten und Screenshots unter `docs/screenshots/v0.3/`.
- Spieltexte sagen „tap“, nicht „click“.
- Keine neue Abhängigkeit, die nur im Desktop-Browser läuft.

**Geräte:** Tim: ASUS Zenbook (Windows), iPhone 16. Lenny: Windows-Laptop, Linux-Laptop, OnePlus 8T. Es gibt keinen Mac, iOS-Builds brauchen später einen Cloud-Dienst mit macOS.

**Android-Testapp:** `capacitor.config.ts` beschreibt die Hülle, `npm run android:prepare` erzeugt den Ordner `android/` (nicht im Repo), `scripts/android-setup.mjs` stellt Querformat und Vollbild ein. Gebaut wird auf GitHub in `.github/workflows/android.yml`; die APK liegt im Release `android-latest`. Die App zeigt die normale Live-Adresse, Spieländerungen brauchen keinen neuen App-Bau.

**Noch offen bis zur Store-Version**

| Thema | Heute | Nötig |
|---|---|---|
| Verpackung als App | Android-Testapp als Hülle um die Live-Seite, iPhone noch nicht; keine App und kein iOS-Gerüst in v0.3 | Spiel fest in die App packen (Capacitor), iPhone über TestFlight |
| Spielstand | Profil im Browser (`fondue.v3.profile`) mit Version und Migrationskette, Export-Code, sofortiges Speichern, Fortsetzen unterbrochener Level | App-Speicher (Capacitor) hinter `ProfileStore`; später Accounts und Cloud |
| Leistung | Auf dem Laptop und im simulierten Handy gemessen | Auf echten Handys messen, bei Bedarf weniger Effekte |
| Koop über Mobilfunk | STUN, öffentlicher PeerJS-Dienst, kein TURN, Verbindung wählbar über `pickTransport` | Eigener Vermittlungs- und Relay-Dienst (als weiterer Eintrag in `choose.ts`) |
| Versionsprüfung | Host und Gast brauchen exakt denselben Build; klare Meldung bei Abweichung | Lockerer, weil in Stores nicht alle gleichzeitig aktualisieren |
| Entwickler-Menü | sichtbar in den Options | vor der Veröffentlichung verstecken (`DEV_MENU_BUTTON`) |
| Zugang nur per Code | fehlt | Store-Testkanäle oder eigene Code-Abfrage |
| Store-Unterlagen | fehlen | App-Icon, Name, Datenschutzerklärung, Altersfreigabe |

## 11. Mit mehreren Menschen und KIs arbeiten

Die Regeln stehen in `AGENTS.md`. `CLAUDE.md` und `GEMINI.md` verweisen nur darauf. Neue Regeln kommen immer nach `AGENTS.md`.

**Ablauf**
1. `git pull`, damit alle vom selben Stand ausgehen.
2. Ein Thema bekommt ein Issue, das einer Person zugewiesen wird, und einen eigenen Branch.
3. Fertige Arbeit kommt als Pull Request mit `Fixes #NUMMER`.
4. `main` ist geschützt: Ist die Prüfung `test` grün, mergen Tim oder Lenny. Der Merge geht sofort live.

**Claude auf GitHub:** `.github/workflows/claude.yml` startet Claude, wenn jemand mit Schreibrechten `@claude` in einem Issue oder Pull Request schreibt. Es läuft über das Abo von Tim (Geheimnis `CLAUDE_CODE_OAUTH_TOKEN`, ein Jahr gültig, danach mit `claude setup-token` erneuern).

**Damit nichts verloren geht**
- Kurz absprechen, wer woran sitzt. Nicht zwei Personen oder KI-Sitzungen gleichzeitig an denselben Dateien. Läuft ein Team von KI-Sitzungen, ist die Staging-Area geteilt: Dateien einzeln mit Namen hinzufügen und mit `git commit -m … -- <pfade>` committen.
- Ein Chat ist nur für diese Sitzung sichtbar. Beschlüsse gehören nach `docs/ENTSCHEIDUNGEN.md`, offene Fragen nach `docs/OFFENE-ENTSCHEIDUNGEN.md`.
- Am Ende einer Sitzung ist alles Wichtige committet, damit die nächste KI es vorfindet.

**Werkzeuge:** Am Projekt arbeiten können nur Programmier-Werkzeuge, die im Ordner laufen (Claude Code, Codex, Gemini CLI). Normale Web-Chats sehen das Projekt nicht.
