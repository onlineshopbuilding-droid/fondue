# Fondue – Änderungshandbuch

Dieses Dokument sagt, wo was liegt und was alles angefasst werden muss, wenn sich etwas ändert. Es richtet sich an Tim, Lenny und jede KI, die weiterbaut. Es nennt Bezeichner (Namen von Dateien, Klassen, Tabellen) statt Zeilennummern, weil sich Zeilen ständig verschieben.

Weitere Dokumente:
- `docs/ARCHITEKTUR.md`: Aufbau im Detail, Klassen und Datenfluss.
- `docs/GDD.md`: die Spielregeln und Zahlen.
- `docs/ENTSCHEIDUNGEN.md`: warum etwas so ist (E-001 bis E-061).
- `docs/OFFENE-ENTSCHEIDUNGEN.md`: was Tim und Lenny noch entscheiden oder bewerten sollen.
- `docs/balance.md`: Balance-Ziele, Ergebnisse, geänderte Werte.
- `docs/KAMPAGNE-TABELLE.md`: alle 100 Level Tag für Tag (erzeugt).
- `docs/GRAFIK-AUSTAUSCHEN.md`: Grafik durch Bilddateien ersetzen, Liste aller Assets (Liste erzeugt).
- `docs/uebergabe/LERNEN.md`: Konzepte (fester Zeitschritt, Wurfphysik, WebRTC).
- Entwickler-Übersicht: https://onlineshopbuilding-droid.github.io/fondue/dev/ (alle Level, Waffen, Gegner, Freischaltungen, Balance, Abnahmeliste; erzeugt aus dem Code).

## 1. Wie das Spiel aufgebaut ist

```
Profil (src/profile/)  <------ Belohnung ------+
   |  Sterne, Freischaltungen, Stufen, Hand    |
   v                                           |
Modus (src/modes/): Tutorial, Kampagne, Endlos |
   |  baut RunSetup: Regeln + Tagesplaner      |
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

Ein Beispiel: Tim tippt in der Lobby auf den Kartentisch und wählt Level 7. `CampaignMode.buildRun` baut aus dem Profil die Regeln (welche Slots offen sind, welche Waffen auf welcher Stufe) und den Tagesplan aus der Level-Tabelle. Die `Sim` rechnet den Kampf. Nach dem letzten Tag meldet sie den Sieg (`runWon`), `CampaignMode.reward` schreibt Sterne und Fortschritt ins Profil, der Sieg-Bildschirm zeigt das Neue, die Kamera fährt in die Burg.

Im Koop rechnet nur der Host. Der Gast schickt Eingaben, der Host schickt 30-mal pro Sekunde einen Snapshot, dazu Ereignisse und bei Änderungen die Metadaten.

| Art | Typ | Inhalt | Weg zum Gast |
|---|---|---|---|
| Zustand pro Bild | `ViewState` | Gegner, Geschosse, Hände, Gold, Tor | Snapshot, kompakt kodiert in `src/net/snapshot.ts` |
| Einmalige Ereignisse | `SimEvent` | Aufprall, Tod, Kauf, Schuss: alles, was Effekt oder Klang auslöst | Nachricht `ev` |
| Seltene Daten | `Meta` | Regeln, Stand der Burg (`loadout`), Namen, Ready, heutiger Tag (`today`), Ergebnis | Nachricht `m`, nur wenn `rev` steigt |

## 2. Vier Regeln, die nicht brechen dürfen

1. **`src/sim/`, `src/config/`, `src/modes/`, `src/profile/` und `src/bots/` kennen weder Phaser noch DOM.** Nur so laufen Unit-Tests und Balance-Bots ohne Browser. Einen eigenen Test dafür gibt es nicht; die Unit-Tests scheitern aber, sobald dort Phaser oder `window` landet.
2. **In `src/sim/` kein `Math.random`, nur den Zufallsgenerator der Simulation.** Gleicher Startwert und gleiche Eingaben müssen denselben Verlauf ergeben. In `src/render/` und `src/ui/` ist `Math.random` in Ordnung.
3. **Zahlen gehören nach `src/config/`.** Ausnahmen stehen in Abschnitt 6.
4. **Fondue bleibt ein eigenes Spiel.** Nichts aus anderen Spielen übernehmen (`AGENTS.md`, E-001). Der Name des Spiels steht nur in `src/config/game.ts`.

## 3. Wo liegt was

### Tabellen (`src/config/`)

| Datei | Inhalt |
|---|---|
| `game.ts` | Name des Spiels (`GAME_NAME`) |
| `enemies.ts` | Alle 11 Gegner (`ENEMIES`: Werte, Gewicht `mass`, Gold), Zielgewichte für Gruppen-Waffen (`TARGETING`), Sonderwerte (`BEHAVIOUR`: Fass, Schütteln, Blase, Schatten, Krähe, Yeti, übergroße Boss-Räuber) |
| `weapons.ts` | Alle 16 Waffen (`WEAPONS`) mit Slot-Typ, Verhalten (`kind`), Zielwahl (`target`), `enabled`, Kaufpreis, fünf Stufen; Preise der Stufen im Endlos (`UPGRADE_COST`) |
| `slots.ts` | Die fünf Waffenplätze (`SLOTS`) mit Typ und Lage |
| `keep.ts` | Tore und Ausbaustufen (`GATES`), Opferstätten (`STATIONS`: Kessel, Adlerhaken), Haken-Zeiten (`PERCH`) |
| `hand.ts` | Hand-Stufen (`HANDS`), Wurf- und Yeti-Regeln (`HAND_RULES`) |
| `stars.ts` | Sterne je Level, Wiederholung, Gast-Anteil, Sternpreise der Stufen (`STARS`) |
| `economy.ts` | Gold je Opfergabe, Tor-Heilung (`ECONOMY`) |
| `waves.ts` | Endlos-Tage (`DAY`), Schwierigkeit (`DIFFICULTIES`), Koop (`COOP`), Landschaften (`LANDSCAPES`) |
| `field.ts` | Geometrie: Bodenlinie, Tor, Kessel, Haken (`WORLD`), Feldbreite (`FIELD`) |
| `tuning.ts` | Wurfgefühl (`TUNING_DEFAULT`, Voreinstellungen, Regler) |
| `flags.ts` | Experiment-Schalter (`FLAG_DEFS`) |
| `quickstart.ts` | Endlos-Schnellstart ab Tag 10, 20, 30 (`QUICK_STARTS`) |
| `assets.ts` | Grafik durch Bilddateien ersetzen (`ASSET_OVERRIDES`) |
| `worlds/index.ts` | Verzeichnis aller Welten (`WORLDS`) |
| `worlds/types.ts` | Datentypen von Welt, Level, Tag, Boss, Besonderheit, Freischaltung, Endlos-Tabelle |
| `worlds/fondue/world.ts` | Welt 1 als Paket |
| `worlds/fondue/campaign.ts` | Die 100 Level: Kurve (`CURVE`), Erstauftritte (`FIRST_LEVEL`), Landschaften, Bosse, Besonderheiten (`TWISTS`), Änderungen einzelner Level (`LEVEL_OVERRIDES`) |
| `worlds/fondue/unlocks.ts` | Freischalt-Tabelle (`UNLOCKS`) |
| `worlds/fondue/endless.ts` | Endlos-Zufall, Meilensteine, Schalter `onlyUnlockedWeapons` und `availableFromLevel` (`ENDLESS`) |
| `worlds/fondue/story.ts` | König, Sätze der Vorrunde, Hinweise in Level 1, Level-Namen und -Sätze, Bosse, Popups „New enemy“, Sprüche in der Lobby, Storybuch |

### Code

| Ordner / Datei | Aufgabe |
|---|---|
| `src/modes/` | `TutorialMode`, `CampaignMode` (mit `CAMPAIGN_SCALING`), `EndlessMode`, `EndlessPlanner`; Freischaltungen lesen (`unlocks.ts`); Schnittstelle `GameMode` (`mode.ts`); Verzeichnis `MODES` und `RESERVED_MODES` (`index.ts`) |
| `src/profile/` | Profil (`Profile`), Datenform (`schema.ts`), Migrationen, Bereinigung, Speicher (`ProfileStore`), Export-Code (`codec.ts`) |
| `src/sim/sim.ts` | `Sim`: die eine Tür zur Simulation |
| `src/sim/rules.ts` | Datentypen eines Laufs: `RunRules`, `RunSetup`, `RunStart`, `RunResult`, `Loadout`, `Scaling` |
| `src/sim/plan.ts`, `spawn.ts`, `spawner.ts` | Tagesplaner (`FixedPlanner` für Kampagne und Vorrunde), Endlos-Tageszahl, Verteilung über den Tag, Auftreten der Gegner (`spawnEnemy`) |
| `src/sim/dayFlow.ts` | Tagesablauf: Banner, Kampf, Sonnenuntergang, Markt, Sieg (`runWon`), Niederlage, Halt (`hold`) |
| `src/sim/enemies.ts` | Gegnerverhalten: `updateEnemy`, `updateWalk`, `updateAttack`, `updateHop`, `updateFloat` |
| `src/sim/hands.ts`, `flight.ts`, `physics.ts` | Greifen, Halten, Schütteln, Werfen; Flug und Aufprall; Wurfrechnung mit Gewicht (gilt für Host und Gast) |
| `src/sim/stations.ts` | Kessel und Adlerhaken samt Zielhilfe |
| `src/sim/combat.ts` | Schaden, Tod mit Gold, Explosionen, Schaden am Tor |
| `src/sim/weapons/` | `WeaponSystem` (Antippen, Nachladen), Zielwahl (`targeting.ts`), eine Verhaltensklasse je Waffenart (`behaviours/`, Verzeichnis `BEHAVIOURS`) |
| `src/sim/projectiles.ts`, `zones.ts` | Geschosse; Feuer und klebriger Käse am Boden |
| `src/sim/shop.ts` | Markt: `quote` (was geht, was es kostet), `buy` |
| `src/sim/stats.ts` | Statistik je Lauf (`RunStats`) |
| `src/sim/slots.ts` | Griffzonen der Slots (`slotAt`) |
| `src/sim/types.ts` | `Enemy`, `Projectile`, `SimState`, `Meta`, `SimEvent`, `Command` |
| `src/bots/` | Spielende Bots: Fähigkeiten (`skills.ts`), Spieler (`bot.ts`), Einkauf (`shopper.ts`), Sterne ausgeben (`armoury.ts`), ein Lauf (`harness.ts`), Kampagne am Stück (`campaignRunner.ts`) |
| `src/game/session.ts` | `HostSession`, `GuestSession`, Vorhersage beim Gast |
| `src/net/` | Netznachrichten (`protocol.ts`, `PROTOCOL_VERSION`), Snapshots, PeerJS, Plan B (`relay.ts`), Test im selben Browser (`loopback.ts`), Latenz-Simulator |
| `src/input/pointer.ts`, `shake.ts` | Zeigerverlauf und Wurfgeschwindigkeit; Schütteln erkennen |
| `src/render/scene.ts` | `GameScene`: Schlachtfeld, Hände, Banner, Effekte zu Ereignissen (`handleEvent`) |
| `src/render/lobby/` | Lobby als Szene (`lobbyScene.ts`), was wo steht und ab welchem Level (`layout.ts`), Kamerafahrt in die Burg (`dive.ts`) |
| `src/render/marketCamera.ts`, `marketView.ts` | Kamera im Markt; antippbare Stellen an der Burg |
| `src/render/tutorialGuide.ts`, `tutorialView.ts` | Ablauf der Vorrunde und des Kessel-Hinweises; deren Zeichnung (König, Geste, Pfeil) |
| `src/render/castleView.ts`, `stations.ts` | Burg je Ausbaustufe, Tor, Waffen an der Burg mit Nachladering; Kessel und Haken |
| `src/render/enemyView.ts`, `effects.ts`, `hud.ts`, `background.ts`, `viewport.ts`, `textures.ts`, `glFix.ts` | Figuren und Posen (`applyPose`), Effekte, HUD, Himmel und Landschaft, Bildausschnitt (`computeView`), Texturen, Shader-Korrektur (E-031) |
| `src/art/registry.ts` | Asset-Verzeichnis: jede Grafik unter festem Namen mit Größe und Anker |
| `src/art/characters/` | Eine Datei je Gegner, Sammlung `RIGS` |
| `src/art/castle/` | Burgstufen, Tore, Westflügel, Kessel auf dem Hügel, Haken, Vordergrund, Wetter |
| `src/art/weapons/index.ts` | Jede Waffe in fünf Stufen (`weapon:<id>:<stufe>`) |
| `src/art/props/`, `lobby/`, `king.ts`, `landscapes.ts`, `shade.ts`, `draw.ts` | Icons, Geschosse, Effekte; Lobby-Halle, Möbel, Schmuck; König; Landschaften; Licht und Schatten |
| `src/audio/` | Soundeffekte (`SFX_RECIPES`), Musik, Abspielen |
| `src/ui/app.ts` | `App`: Start, Profil laden, Adress-Schalter, Läufe starten, Belohnung auslösen, Fortsetzen |
| `src/ui/screens/` | Ein HTML-Bildschirm je Datei, Verzeichnis in `index.ts`, Manager in `screen.ts` |
| `src/ui/lobby/` | Steuerung der Lobby, Storybuch, `?menu=html` |
| `src/ui/coop/room.ts` | `CoopRoom`: Raum eröffnen, beitreten, Wiedereinstieg |
| `src/ui/tuningPanel.ts` | Entwickler-Menü |
| `src/ui/enemyPopup.ts`, `campaignArt.ts`, `content.ts`, `html.ts`, `style.css` | Popup „New enemy“; Zeichnung der Kampagnen-Karte; Hilfe-Seiten, Tipps, Credits; HTML-Bausteine; Aussehen |
| `scripts/` | `dev-page.ts` (Entwickler-Übersicht), `campaign-table.ts` (Level-Tabelle), `list-assets.ts` (Asset-Liste), `android-setup.mjs` |
| `server/relay/index.mjs` | Plan-B-Server |
| `tests/` | Siehe Abschnitt 7 |

## 4. Ich will … ändern

### Zahlen

| Ziel | Stelle |
|---|---|
| Gegner schneller, stärker, wertvoller, schwerer | Eintrag in `ENEMIES`: `speed`, `strike`, `hp`, `gold`, `mass` |
| Text im Popup „New enemy“ | `ENEMY_POPUPS` in `worlds/fondue/story.ts` |
| Ab welchem Level ein Gegner kommt | `FIRST_LEVEL` in `worlds/fondue/campaign.ts` |
| Ab welchem Tag ein Gegner im Endlos kommt, wie oft | `ENDLESS.types` in `worlds/fondue/endless.ts` (`firstDay`, `firstCount`, `extraChance`, `weight`, `maxPerDay`) |
| Mehr oder weniger Gegner in der Kampagne | `CURVE` in `worlds/fondue/campaign.ts`; einzelne Level in `LEVEL_OVERRIDES` |
| Wie hart späte Tage eines Levels werden | `CAMPAIGN_SCALING` in `src/modes/campaign.ts` (`easeIn`, `damageGrowth` …) |
| Mehr oder weniger Gegner im Endlos | `DAY.base`, `DAY.perDay`, `softCapDay`, `perDayAfterCap` |
| Zu zweit | `COOP` in `waves.ts` (`countFactor`, `lateFactor`, `goldFactor`, `campaignFactor`) |
| Tag länger | `DAY.seconds` (Endlos und Kampagne), Level 1 in `buildLevel` |
| Schwierigkeitsgrade im Endlos | `DIFFICULTIES` |
| Waffenstärke und Nachladezeit | Stufe in `WEAPONS` |
| Kaufpreis einer Waffe im Lauf | `buyGold`, `buyOfferings` in `WEAPONS` |
| Preis der Stufen im Endlos | `UPGRADE_COST` |
| Sternpreis der Stufen in der Waffenkammer | `STARS.weaponTier` |
| Sterne je Level | `STARS.level`; einzelne Level über `LEVEL_OVERRIDES` (`stars`) |
| Sterne im Endlos | `ENDLESS.milestones` |
| Was welches Level freischaltet | `UNLOCKS` |
| Hand stärker, Preise der Hand | `HANDS`; Wurfregel `HAND_RULES` |
| Torleben, Torpreise | `GATES` |
| Preis von Kessel und Haken | `STATIONS` |
| Dauer der Kessel-Verwandlung | `cauldronSeconds` im Tuning |
| Schütteln leichter oder schwerer | `BEHAVIOUR.kegShake` |
| Lage von Kessel und Haken | `WORLD.cauldron`, `WORLD.perch` |
| Lage der Waffen an der Burg | `SLOTS`; die Burggrafik muss dazu passen |
| Schnellstart-Ausstattung | `QUICK_STARTS` |
| Endlos nur mit freigeschalteten Waffen, Endlos erst ab Level | `onlyUnlockedWeapons`, `availableFromLevel` in `ENDLESS` |

### Wurfgefühl

Zuerst live probieren: im Spiel das Entwickler-Menü öffnen (Abschnitt 8), Regler bewegen, mit **Export** die Werte kopieren und in `TUNING_DEFAULT` eintragen. Läufe mit veränderten Reglern zählen nicht (E-059), und außerhalb solcher Läufe gilt immer `TUNING_DEFAULT`.

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
| Burg, Tore, Westflügel, Kessel, Haken | `src/art/castle/` |
| Waffe an der Burg, je Stufe | `src/art/weapons/index.ts` |
| Lobby-Halle, Möbel, Schmuck, König auf dem Thron | `src/art/lobby/`; wo was steht und ab welchem Level: `STATIONS`, `DECOR` in `src/render/lobby/layout.ts` |
| König auf dem Schlachtfeld | `src/art/king.ts`; Auftritt in `src/render/tutorialView.ts` |
| Kampagnen-Karte | `src/ui/campaignArt.ts`, Bildschirm `src/ui/screens/campaign.ts` |
| Grafik durch eine Bilddatei ersetzen | `docs/GRAFIK-AUSTAUSCHEN.md`, `ASSET_OVERRIDES` |
| Licht und Schatten | Bausteine in `src/art/shade.ts`; Licht immer von links oben (E-031) |
| Landschaften | `src/art/landscapes.ts`; Wechsel in der Kampagne `LANDSCAPE_FROM` (campaign.ts), im Endlos `ENDLESS.landscapes`, `daysPerLandscape` |
| Welcher Effekt und Klang bei welchem Ereignis | `handleEvent` in `src/render/scene.ts` |
| Handfarben | `HAND_COLORS` in `src/render/scene.ts` |
| HUD | `src/render/hud.ts` |
| Menüs, Handy-Layout | `src/ui/style.css`, `src/ui/lobby/lobby.css` |
| Klang eines Effekts | `src/audio/sfx.ts`, `SFX_RECIPES` |
| Musik | `src/audio/music.ts` |

### Texte und Menüs

Spieltexte sind Englisch. Story, König, Level-Sätze, Popups, Storybuch: `src/config/worlds/fondue/story.ts`. Hilfe, Lade-Tipps, kurze Tipps, Credits: `src/ui/content.ts`. Waffentexte: `desc` und `note` in `WEAPONS`. Ein Bildschirm ist eine Datei in `src/ui/screens/`; ein Button trägt `data-a="name"` und wird in `onClick` des Bildschirms behandelt. Weiter steht rechts, zurück links.

### Koop

| Ziel | Stelle |
|---|---|
| Raum eröffnen, beitreten, Wiedereinstieg | `CoopRoom` in `src/ui/coop/room.ts` |
| Spielerliste im Raum | `src/ui/screens/roomParts.ts` |
| Snapshot-Takt, Abbruchzeit | `SNAPSHOT_EVERY_STEPS`, `SILENCE_LIMIT_MS`, `OWN_STALL_MS` in `src/game/session.ts` |
| Glättung beim Gast | `INTERP_DELAY_MS`, `EVENT_DELAY_MS` in `src/game/session.ts` |
| STUN-Server, PeerJS | `src/net/peer.ts` |

## 5. Rezepte

TypeScript hilft bei allen Rezepten: `ENEMIES`, `RIGS`, `BEHAVIOURS` und `ENDLESS.types` sind vollständige Tabellen, `npx tsc --noEmit` meldet fehlende Einträge.

**Ein Level ändern**
1. In `LEVEL_OVERRIDES` (`src/config/worlds/fondue/campaign.ts`) einen Eintrag für das Level anlegen, zum Beispiel `37: { stars: 5 }` oder ganze `days`. Jedes Feld von `LevelDef` lässt sich ersetzen.
2. Für Änderungen an vielen Leveln stattdessen die Regeln ändern: `CURVE`, `FIRST_LEVEL`, `TWISTS`, `BOSS_BIG`, `BOSS_EXTRA`, `LANDSCAPE_FROM`.
3. `node scripts/campaign-table.ts` ausführen, damit `docs/KAMPAGNE-TABELLE.md` stimmt (sonst schlägt `tests/unit/campaignTable.test.ts` fehl).
4. `npm run balance` und die Kampagnen-Zeilen in `docs/balance-latest.md` ansehen.

**Ein neues Level** (die Kampagne verlängern): `LEVEL_COUNT` erhöhen, Name und Satz in `LEVEL_NAMES` und `LEVEL_STORY` (`story.ts`), dann wie oben. Achtung: Neue Level verändern den Startwert nicht; alte Profile bleiben gültig.

**Eine neue Freischaltung:** eine Zeile in `UNLOCKS` (`src/config/worlds/fondue/unlocks.ts`). Arten: `slot`, `weapon`, `station`, `gate`, `hand`. Karte, Waffenkammer, Sieg-Bildschirm und Regeln lesen die Tabelle; `syncUnlocks` gibt alten Profilen beim nächsten Start, was ihnen nach der neuen Tabelle zusteht. Danach `node scripts/campaign-table.ts`.

**Eine neue Waffe**
1. Eintrag in `WEAPONS` (`src/config/weapons.ts`) mit `id`, `slotType`, `kind`, `target`, Preisen, `desc` und genau fünf Stufen. Passt eine vorhandene Art (`kind`), ist das alles an Regeln.
2. Grafik in `src/art/weapons/index.ts` für alle fünf Stufen (Name `weapon:<id>:<stufe>`).
3. Nur bei neuer Art von Verhalten: Typ der Stufe in `weapons.ts`, eine Klasse in `src/sim/weapons/behaviours/` (`fire`, bei Bedarf `tick`), eine Zeile in `BEHAVIOURS`. Nur bei neuem Geschoss: `ProjectileKind` in `src/sim/types.ts` und `KINDS` in `src/net/snapshot.ts`. Nur bei neuem Effekt: ein Fall in `handleEvent`.
4. In der Kampagne freischalten: Zeile in `UNLOCKS`.
5. Eintrag auf der Bewertungsliste in `docs/OFFENE-ENTSCHEIDUNGEN.md`.
6. Unit-Test in `tests/unit/weapons.test.ts`, dann `npx tsc --noEmit`, `npm test`, `npm run balance`, `node scripts/list-assets.ts`.
Die Bots lesen die Tabelle; für den Einkauf in fester Reihenfolge ggf. `src/bots/shopper.ts` ergänzen.

**Eine Waffe entfernen:** `enabled: false` in `WEAPONS`. Sie verschwindet aus Markt, Waffenkammer und Kampagne, bleibt aber im Code.

**Eine Stufe ändern:** den Eintrag in `tiers` der Waffe ändern; `note` sagt, was diese Stufe neu bringt. Jede Stufe soll spürbar etwas Neues bringen, nicht nur größere Zahlen. Eine sechste Stufe ist ein größerer Umbau: `MAX_TIER` (weapons.ts), `WEAPON_TIER_MAX` (profile/schema.ts, mit Migration), `UPGRADE_COST`, `STARS.weaponTier`, `WEAPON_TIERS` und die Grafik in `src/art/weapons/index.ts`, alle Waffen bekommen eine weitere Stufe.

**Ein neuer Gegner**
1. Typ in `EnemyType` und Eintrag in `ENEMIES` (`src/config/enemies.ts`), mit `mass`.
2. Figur als neue Datei in `src/art/characters/`, eintragen in `RIGS`.
3. Popup in `ENEMY_POPUPS` (`story.ts`).
4. Wann er kommt: `FIRST_LEVEL` und `SHARE` (campaign.ts), Zeile in `ENDLESS.types` (endless.ts).
5. Sonderverhalten in `src/sim/enemies.ts` (`updateEnemy`) und `spawnEnemy` (`src/sim/spawner.ts`). Reine Läufer brauchen nichts davon.
6. Bei einem neuen Zustand: `EnemyState` ergänzen, ebenso `STATES` in `src/net/snapshot.ts` und einen Fall in `applyPose`.
7. Greifregeln für den Gast prüfen (Falle 4).
8. Unit-Test in `tests/unit/sim.test.ts`, dann `node scripts/campaign-table.ts`, `node scripts/list-assets.ts`, `npm run balance`.

**Eine neue Welt**
1. Neuer Ordner `src/config/worlds/<welt>/` nach dem Vorbild von `fondue/`: `world.ts`, `campaign.ts`, `unlocks.ts`, `endless.ts`, `story.ts`.
2. Eine Zeile in `WORLDS` (`src/config/worlds/index.ts`).
3. Das Profil führt Fortschritt je Welt schon (`worlds[weltId]`). Sterne, Waffen- und Hand-Stufen gelten heute für alle Welten (D-09).
4. Noch fest an Welt 1: Die App spielt immer `DEFAULT_WORLD` (`App.world`), und Lobby (`src/ui/lobby/lobby.ts`), Popup (`src/ui/enemyPopup.ts`) und Tutorial (`src/render/tutorialView.ts`) lesen die Story direkt aus `worlds/fondue/story.ts`. Für eine zweite Welt müssen diese Stellen die Story über die Welt bekommen.

**Grafik austauschen:** Anleitung Schritt für Schritt in `docs/GRAFIK-AUSTAUSCHEN.md`. Kurz: Bild nach `public/assets/`, Zeile in `ASSET_OVERRIDES` (`src/config/assets.ts`), zum Ausprobieren ohne Codeänderung `?asset=<name>=<url>`. Nach neuer oder geänderter SVG-Grafik `node scripts/list-assets.ts`. Licht von links oben, keine SVG-Masken und Filter (Falle 14); der Rahmen eines Teils muss die Zeichnung mit Rand umfassen (`tests/e2e/art.spec.ts`).

**Ein neuer Modus:** eine Klasse hinter `GameMode` (`src/modes/mode.ts`) mit `buildRun` und `reward`, eine Zeile in `MODES` (`src/modes/index.ts`), ein Weg dorthin in der Lobby. Reservierte Namen: `RESERVED_MODES`.

**Ein neuer Experiment-Schalter:** Eintrag in `FLAG_DEFS` (`src/config/flags.ts`), in den Regeln `ctx.flag('id')`. Das Entwickler-Menü baut sich von selbst. Ein veränderter Schalter macht jeden Lauf zum Entwickler-Lauf.

**Ein neuer Schnellstart-Tag:** Eintrag in `QUICK_STARTS`; ein Unit-Test prüft, dass jede Waffe echt ist und in ihren Slot passt.

**Eine neue Burg-Ausbaustufe:** Tor in `GATES`, Grafik der Stufe in `src/art/castle/` (auch Westflügel), Freischaltung `gate` in `UNLOCKS`. Die Plätze aus `SLOTS` müssen auf der Grafik frei bleiben.

**Neues am Profil:** Feld in `ProfileData` (`src/profile/schema.ts`), Standardwert in `freshProfile`, Bereinigung in `sanitize.ts`, `PROFILE_VERSION` erhöhen und einen Schritt an `MIGRATION_STEPS` hängen. Test in `tests/unit/profile.test.ts`.

**Neuer Effekt zu einem Ereignis:** Variante in `SimEvent`, in der Simulation `ctx.emit(...)`, in `handleEvent` den Effekt auslösen. Beim Gast kommt das automatisch an.

**Neue Eigenschaft, die man sehen soll:** Feld in `Enemy`, in `ViewEnemy`, in der Kodierung und Dekodierung von `src/net/snapshot.ts`. Ohne den Snapshot-Teil fehlt sie beim Gast und beim Host gleichermaßen, weil auch der Host über den Snapshot zeichnet.

**Neuer Klang:** Name in `SfxName`, Funktion und Eintrag in `SFX_RECIPES`, abspielen in der Szene.

## 6. Fallen

1. **Gespeichertes Tuning wirkt nur in Entwickler-Läufen.** Außerhalb davon gilt immer `TUNING_DEFAULT`. Wer im Entwickler-Menü Regler verstellt, bekommt keine Sterne und keine Bestenliste, bis er **Default** drückt. Im Koop zählen die Werte des Hosts.
2. **Ein Merge nach `main` geht sofort live.** Vorher `npm test` und `npm run test:e2e`.
3. **Host und Gast brauchen denselben Build und dieselbe Adresse.** Sonst lehnt der Host mit einer Versionsmeldung ab. `/fondue/` und `/fondue/classic/` sind verschiedene Spiele. Nach jedem Deploy laden beide die Seite neu.
4. **Einige Regeln gibt es doppelt, damit der Gast sofort reagiert.** Wer eine Seite ändert, muss die andere mitziehen:

   | Host (`src/sim/`) | Gast (`GuestSession` in `src/game/session.ts`) |
   |---|---|
   | `tryGrabEnemy`, `grabDistance`, `tryGrabBomb` (`hands.ts`) | `localPress`, `pickEnemy` |
   | `release`, `throwEnemy` (`hands.ts`) | `localRelease` |
   | `updateHeld` (`hands.ts`), `updateAir` (`flight.ts`) | `stepPrediction` |

   Die Wurfrechnung mit Gewicht und Hand-Stufe (`src/sim/physics.ts`) benutzen beide Seiten; sie gibt es nur einmal.

5. **Nicht jede Zahl steht in `src/config/`.** `CAMPAIGN_SCALING` steht in `src/modes/campaign.ts`, `PRELUDE` in `src/modes/tutorial.ts`, die Zeiten der Vorrunde (`GUIDE`, `POT_HINT`) in `src/render/tutorialGuide.ts`, die Lobby-Zeiten in `src/render/lobby/dive.ts`. In `src/modes/endlessPlanner.ts` wächst die Höchstzahl je Typ fest um 15 % pro Tag.
6. **Die Level-Tabelle ist erzeugt.** `docs/KAMPAGNE-TABELLE.md` und die Asset-Liste in `docs/GRAFIK-AUSTAUSCHEN.md` nicht von Hand ändern; die Skripte neu laufen lassen, sonst schlagen Unit-Tests fehl.
7. **Größen:** `radius` und `height` in `ENEMIES` sind Weltmaße. Wer eine Figur größer zeichnet, muss sie dort mit anpassen, sonst passt die Greiffläche nicht.
8. **Balance-Bots sind Näherungen.** Die Zahlen sagen, ob eine Änderung in die richtige Richtung geht, nicht wie Menschen abschneiden. Die Bots kaufen nach festen Listen und nutzen deshalb nur wenige Waffen.
9. **Tests dürfen nie abgeschwächt werden.** Ändert sich eine Regel bewusst, wird der Test durch einen Test der neuen Regel ersetzt und das festgehalten (`docs/PROGRESS-GROSSES-UPDATE.md`, „Ersetzte Tests“).
10. **Testläufe überschreiben `docs/screenshots/`.** Das erzeugt Git-Änderungen ohne Bedeutung; diese Dateien nicht mit committen, wenn sie nicht gemeint sind.
11. **Welt- und Bildschirmkoordinaten sind nicht dasselbe.** Die Feldbreite ist 1280 bis 1760 und steht in `meta.fieldW`. Figuren, Geschosse und Hände stehen in Weltkoordinaten, das HUD in Bildschirmkoordinaten.
12. **Links von x = 0 liegt nur im Markt etwas Sichtbares** (Westflügel). Alles Spielrelevante muss im Feld liegen, sonst sehen Host und Gast nicht dasselbe.
13. **`Math.random` und `window` sind in `src/sim/` tabu.** Auch ein Import aus `src/render/` zieht Phaser in die Unit-Tests.
14. **SVG-Masken und Filter machen den Start langsam.** Schattierung über `crescent` und `within` aus `src/art/shade.ts`.
15. **Nicht alle Texturen gibt es sofort.** Landschaften außer der Wiese, höhere Burgstufen und höhere Waffenstufen entstehen nach dem Start im Hintergrund (`landscapeReady`, `keepStagesReady`, `weaponTiersReady` in `src/render/textures.ts`). Vor dem Anzeigen prüfen, ob sie fertig sind. Browser-Tests warten auf `__fondue.artReady`.
16. **Eingefrorene Seite ist keine Funkstille.** Zeit, in der die eigene Seite stand, zählt im Koop nicht als Stille (`excuseOwnStall`).
17. **Homescreen-App und Browser-Tab haben getrennte Speicher.** Ein Profil im Safari-Tab ist nicht das Profil der Homescreen-App. Umzug über Export und Import in den Options.
18. **Belohnungen werden genau einmal gezahlt.** Jeder Lauf hat eine `runId`, das Profil merkt sich die letzten 200. Wer `reward` zweimal aufruft, bekommt beim zweiten Mal nichts.

## 7. Befehle, Testen und veröffentlichen

| Befehl | Was er tut |
|---|---|
| `npm ci`, dann `npx playwright install chromium` | Einrichten |
| `npm run dev` | Spiel lokal auf http://localhost:5173 |
| `npm run build` | Typ-Check und Build nach `dist/` |
| `npx tsc --noEmit` | Nur der Typ-Check |
| `npm test` | Unit-Tests (`tests/unit/`): Regeln, Waffen, Gewicht, Schütteln, Profil, Lobby, Tutorial, Kampagnen-Tabelle, Assets, Sitzung |
| `npm run test:e2e` | Browser-Tests (`tests/e2e/`) mit Playwright auf drei Geräten: Laptop, iPhone 16, OnePlus 8T |
| `ALL_SCREENS=1 npm run test:e2e` | Dazu kleine Androids, iPhone SE, iPad |
| `npm run balance` | Bots spielen Endlos und alle 100 Level, schreibt `docs/balance-latest.md` und `.json` (etwa eine Minute) |
| `npm run dev-page` | Entwickler-Übersicht nach `dist/dev/index.html`; `node scripts/dev-page.ts <ordner>` schreibt woanders hin |
| `node scripts/campaign-table.ts` (oder `npm run campaign-table`) | Schreibt die Level-Tabelle in `docs/KAMPAGNE-TABELLE.md` |
| `node scripts/list-assets.ts` | Schreibt die Asset-Liste in `docs/GRAFIK-AUSTAUSCHEN.md` |
| `npx playwright test --config playwright.perf.config.ts` | Bilder pro Sekunde mit vielen Gegnern |
| `npx playwright test --config playwright.live.config.ts` | Veröffentlichte Seite; mit `EXPECT_BUILD=<kurzer Hash>` prüft er, dass der neue Build live ist |
| `npm run relay` | Plan-B-Server lokal |

**Veröffentlichen**, sobald Tim oder Lenny es sagt: alle Tests grün, Pull Request nach `main`, Merge. `.github/workflows/ci.yml` führt für jeden Pull Request die Prüfung `test` aus (Typ-Check, Unit-Tests, Browser-Tests in sechs Teilen), ohne Grün kein Merge. `.github/workflows/deploy.yml` baut nach jedem Merge drei Dinge in einen Ordner und stellt sie live:

| Adresse | Was |
|---|---|
| https://onlineshopbuilding-droid.github.io/fondue/ | das Spiel von `main` |
| https://onlineshopbuilding-droid.github.io/fondue/classic/ | der alte Stand vom Branch `classic` (Tag `v0-alpha`), E-032 |
| https://onlineshopbuilding-droid.github.io/fondue/dev/ | die Entwickler-Übersicht, aus dem Code erzeugt |

Nach einer Änderung am Branch `classic` den Deploy von Hand starten (Actions, „Run workflow“, Branch `main`). Zurückrollen auf den alten Stand: `main` per Pull Request auf den Stand von `v0-alpha` bringen (kein Force-Push).

## 8. Hilfen beim Ausprobieren

**Entwickler-Menü:** Options → „Developer menu“ (auch am Handy), am Laptop F1, im einfachen HTML-Menü auch langes Drücken aufs Logo. Dort: zu einem Level und Tag springen, Endlos ab Tag 10, 20, 30, Sterne dazu, alles freischalten, Tutorial wiederholen, Profil löschen (mit Sicherheitsabfrage), Experiment-Schalter, Tuning-Regler. Der Knopf in den Options lässt sich vor einer Veröffentlichung mit `DEV_MENU_BUTTON` (`src/ui/screens/options.ts`) verstecken. Noch nicht im Menü: die Entscheidungs- und Bewertungsliste, ein Link zur Entwickler-Übersicht, einzelne Stufen setzen, einzelne Popups wiederholen.

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

**Browser-Konsole:** `window.__fondue` ist die App. Auf dem Host zum Beispiel `__fondue.session.sim.s.gold = 5000`. Die Lobby hat Test-Hilfen: `__fondue.lobby.spots()`, `__fondue.lobby.tap('campaign')`.

## 9. Bei jeder Änderung: Stimmigkeits-Check

Eine Änderung ist erst fertig, wenn das ganze Spiel danach noch zusammenpasst. Nicht jeder Punkt betrifft jede Änderung, aber jeder wird durchgedacht. Was nicht mehr passt, wird im selben Zug mitgeändert.

| Bereich | Frage | Wo nachsehen |
|---|---|---|
| Texte | Stimmen Popups, Hilfe-Seiten, Tipps, Waffentexte, Sätze des Königs noch? Gleicher Ton, Englisch, „tap“ statt „click“? | `ENEMY_POPUPS`, `story.ts`, `HELP_SLIDES`, `LOADING_TIPS`, `STATION_TIPS` in `content.ts`, `desc`/`note` in `WEAPONS` |
| Regeln | Widerspricht etwas Neues einer alten Regel? Sonderfälle wie Blase, gefrorene, gehaltene, hängende Gegner, Boss-Räuber? | `src/sim/`, `docs/GDD.md` |
| Kampagne | Passt die Level-Tabelle, ist jedes Level schaffbar? Neue Gegner und Freischaltungen an sinnvoller Stelle? | `node scripts/campaign-table.ts`, `npm run balance` |
| Sterne und Freischaltungen | Kommt regelmäßig etwas Neues, ist nichts zu früh fertig? Kein Farmen über Wiederholen oder Koop? | `STARS`, `UNLOCKS`, `docs/balance.md` |
| Wirtschaft im Lauf | Sind höhere Stufen teurer und besser? Ist alles erreichbar? | `WEAPONS`, `UPGRADE_COST`, `GATES` |
| Schwierigkeit | Liegt der Verlauf im Ziel? Endlos Medium: Poor meist nicht über Tag 8, Mid um Tag 24, Great um Tag 40 oder weiter; Kampagne: Mid schafft die meisten Level im ersten oder zweiten Versuch | `docs/balance.md`, `npm run balance` |
| Koop | Sieht der Gast dasselbe, reagiert er genauso? Belohnung für beide richtig? | Falle 4, `src/net/snapshot.ts`, `CampaignMode.reward` |
| Profil | Braucht es ein neues Feld, dann mit Migration? Überlebt ein altes Profil? | `src/profile/`, `tests/unit/profile.test.ts` |
| Bedienung | Geht es mit Finger und Maus, Flächen mindestens 44 Pixel, weiter rechts und zurück links? | Abschnitt 10; Screenshots ansehen |
| Aussehen | Passt es zum Stil? Überlappt etwas, wird etwas abgeschnitten? In allen Burgstufen und Landschaften? | `PAL` in `src/art/characters/kit.ts`, `style.css`; Screenshots |
| Rückmeldung | Hat etwas Neues Klang, Effekt und einen Hinweis für Spielende? | `handleEvent`, `SFX_RECIPES` |
| Leistung | Bleibt es flüssig mit vielen Gegnern auf Handy-Größe? | FPS-Test |
| Tests | Ist das Neue durch einen Test abgesichert und alles grün? | Abschnitt 7 |
| Erzeugtes | Level-Tabelle und Asset-Liste neu erzeugt? | `scripts/` |
| Dokumente | Stimmen Handbuch, GDD, Architektur, Entscheidungen, offene Entscheidungen, Ideen? | `docs/` |

Am Ende steht ein kurzer Bericht für Tim und Lenny: was geändert wurde, was dadurch mitgeändert wurde, wo es liegt, was geprüft wurde und was nur Menschen beurteilen können, etwa Spielgefühl und Klang.

## 10. Handy und Endziel App Store / Google Play

Fondue ist ein Handyspiel im Querformat. Jede Entscheidung zu Bedienung, Schriftgrößen und Tempo wird für den Touchscreen getroffen; der Laptop muss weiter funktionieren.

**Anpassung an jeden Bildschirm**
- Die Feldbreite (1280 bis 1760) legt der Host beim Start fest (`meta.fieldW`, E-021). Gegner laufen auf breiterem Feld etwas schneller (`FIELD.speedCompensation`).
- `computeView` bestimmt, was sichtbar ist. Im Kampf steht die Burg am linken Rand, im Markt fährt die Kamera näher heran und zeigt den Westflügel.
- Das HUD ist an die Bildschirmränder verankert und wächst auf kleinen Bildschirmen. Notch und Home-Leiste werden freigehalten (`readSafeArea`).
- Hochkant erscheint ein Hinweis zum Drehen, ein laufendes Solo-Spiel pausiert.
- Am Touchscreen wird die eigene Hand nicht gezeichnet; die des Mitspielers bleibt sichtbar.

**Geprüft wird auf drei Geräten:** Tims iPhone 16 (im Test 852 × 393), Lennys OnePlus 8T (915 × 412) und Laptop (1280 × 720), festgelegt in `tests/e2e/helpers.ts` (`DEVICES`). Weitere Größen nur mit `ALL_SCREENS=1`. Safari, echte Leistung und echtes Spielgefühl sieht man so nicht; dafür testen Tim und Lenny auf ihren Geräten.

**Für jede neue Funktion**
- Alles muss per Finger gehen. Tastatur, Hover und Rechtsklick sind nur Zusatz.
- Neue Bildschirme bekommen einen Browser-Test auf den drei Geräten.
- Spieltexte sagen „tap“, nicht „click“.
- Keine neue Abhängigkeit, die nur im Desktop-Browser läuft.

**Geräte:** Tim: ASUS Zenbook (Windows), iPhone 16. Lenny: Windows-Laptop, Linux-Laptop, OnePlus 8T. Es gibt keinen Mac, iOS-Builds brauchen später einen Cloud-Dienst mit macOS.

**Android-Testapp:** `capacitor.config.ts` beschreibt die Hülle, `npm run android:prepare` erzeugt den Ordner `android/` (nicht im Repo), `scripts/android-setup.mjs` stellt Querformat und Vollbild ein. Gebaut wird auf GitHub in `.github/workflows/android.yml`; die APK liegt im Release `android-latest`. Die App zeigt immer die normale Live-Adresse, Spieländerungen brauchen keinen neuen App-Bau.

**Noch offen bis zur Store-Version**

| Thema | Heute | Nötig |
|---|---|---|
| Verpackung als App | Android-Testapp als Hülle um die Live-Seite, iPhone noch nicht | Spiel fest in die App packen, iPhone über TestFlight |
| Spielstand | Profil im Browser mit Migrationen, Export-Code, Fortsetzen unterbrochener Level | App-Speicher (Capacitor) hinter `ProfileStore`; später Accounts und Cloud |
| Leistung | Auf dem Laptop und im simulierten Handy gemessen | Auf echten Handys messen, bei Bedarf weniger Effekte |
| Koop über Mobilfunk | STUN, öffentlicher PeerJS-Dienst, kein TURN | Eigener Vermittlungs- und Relay-Dienst |
| Versionsprüfung | Host und Gast brauchen exakt denselben Build | Lockerer, weil in Stores nicht alle gleichzeitig aktualisieren |
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
- Kurz absprechen, wer woran sitzt. Nicht zwei Personen oder KI-Sitzungen gleichzeitig an denselben Dateien.
- Ein Chat ist nur für diese Sitzung sichtbar. Beschlüsse gehören nach `docs/ENTSCHEIDUNGEN.md`, offene Fragen nach `docs/OFFENE-ENTSCHEIDUNGEN.md`.
- Am Ende einer Sitzung ist alles Wichtige committet, damit die nächste KI es vorfindet.

**Werkzeuge:** Am Projekt arbeiten können nur Programmier-Werkzeuge, die im Ordner laufen (Claude Code, Codex, Gemini CLI). Normale Web-Chats sehen das Projekt nicht.
