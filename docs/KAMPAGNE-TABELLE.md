# Kampagne: alle 100 Level

Diese Tabelle zeigt jedes Level der Kampagne so, wie das Spiel es wirklich spielt. Sie wird aus dem Code erzeugt und darf nicht von Hand geändert werden. Ein Test (`tests/unit/campaignTable.test.ts`) schlägt fehl, sobald sie nicht mehr zum Code passt. Neu erzeugen: `node scripts/campaign-table.ts`. Dieselben Daten, mit allen Räubern je Tag, stehen auch auf der Entwickler-Übersicht unter `/fondue/dev/`.

## Wie die Level entstehen

Die 100 Level werden aus Regeln gebaut, alle in `src/config/worlds/fondue/campaign.ts`:

- **Die Kurve (`CURVE`)** legt fest, wie viele Räuber kommen und wie stark sie sind. Sie wächst über alle 100 Level und innerhalb eines Levels von Tag zu Tag. Wer das ganze Spiel leichter oder schwerer machen will, ändert hier eine Zahl.
- **`FIRST_LEVEL`** sagt, in welchem Level jeder Räuber zum ersten Mal kommt. In diesem Level erscheint auch das Fenster „New enemy“.
- **Boss-Level** sind jedes zehnte Level. Namen und Sätze der Bosse stehen in `story.ts`, die Riesen und Zusatz-Räuber in `BOSS_BIG` und `BOSS_EXTRA`.
- **Besonderheiten (`TWISTS`)** wie Nacht, „nur Reiter“ oder viele Schwere machen einzelne Level anders als ihre Nachbarn.
- **Landschaften (`LANDSCAPE_FROM`)** wechseln ungefähr alle 12 Level.
- **Freischaltungen** stehen in `src/config/worlds/fondue/unlocks.ts`: eine Zeile je Freischaltung, mit dem Level, dessen Sieg sie bringt.
- **Sterne** je Level stehen in `src/config/stars.ts` (normal, besonders, Boss).

## Ein einzelnes Level ändern

Ganz unten in `campaign.ts` steht `LEVEL_OVERRIDES`. Dort trägt man das Level ein und nur die Felder, die anders sein sollen. Alles andere kommt weiter aus den Regeln. Beispiele:

- Level 37 soll 5 Sterne geben: `37: { stars: 5 },`
- Level 12 soll genau festgelegte Tage haben: die Tage von Hand aufschreiben, ein Eintrag je Tag, zum Beispiel `12: { days: [{ counts: { grunt: 30, bomber: 4 }, night: false, seconds: 50, big: {} }, …] },`.
- Level 25 soll anders heißen: `25: { name: 'Cheese Bridge' },` (Spieltexte bleiben Englisch).

Danach `node scripts/campaign-table.ts` ausführen, damit diese Tabelle wieder stimmt, und `npm run balance`, damit man sieht, ob das Level noch fair ist. Level, die von Hand geändert sind, haben in der Tabelle ein ✎.

Wer einer KI sagt „mach Level 37 schwerer“, bekommt genau so einen Eintrag in `LEVEL_OVERRIDES`.

<!-- KAMPAGNE:START (erzeugt von scripts/campaign-table.ts, nicht von Hand ändern) -->
Stand: 100 Level, 1886 Wellen, 10 Boss-Level, geplant zusammen 471 Minuten. Jedes Level bringt bis zu 5 Käse (Sieg, Tor über 50 %, Tor über 90 %, zwei Challenges).

### Die Kurve (`CURVE`)

| Wert | Bedeutung | Zahl |
|---|---|---|
| `baseCount` | v0.2-Kurve: Räuber an Tag 1 von Level 1 | 24 |
| `countPerLevel` | v0.2-Kurve: zusätzliche Räuber je Level (Faktor vor der Potenz) | 6 |
| `countPower` | v0.2-Kurve: Potenz der Level-Zunahme | 0,75 |
| `countPerDay` | v0.2-Kurve: Anteil mehr Räuber je weiterem Tag | 0,14 |
| `levelShareDay1` | v0.2-Kurve: Anteil der Level-Zunahme an Tag 1 | 0,3 |
| `levelSharePerDay` | v0.2-Kurve: Zunahme dieses Anteils je Tag | 0,35 |
| `levelShareMax` | v0.2-Kurve: höchster Anteil | 1,7 |
| `countShare` | v0.3: Anteil der v0.2-Räuberzahl je Level (B4) | 0,4 |
| `powerPerLevel` | Stärke der Räuber: Zunahme je Level (Level 1 = 1) | 0,05 |
| `bossPower` | Boss-Level: Faktor für die Stärke | 1,12 |
| `secondsFirst` | Geplante Länge von Level 1 (s) | 70 |
| `secondsPerEarlyLevel` | Level 2 bis 5: Sekunden mehr je Level | 11 |
| `secondsAt20` | Geplante Länge um Level 20 (s) | 200 |
| `secondsMiddleMin` | Mitte: kürzeste geplante Länge (s) | 180 |
| `secondsMiddleMax` | Mitte: längste geplante Länge (s) | 300 |
| `secondsBossMin` | Boss-Level: kürzeste Länge (s) | 360 |
| `secondsBossMax` | Boss-Level: längste Länge (s) | 600 |
| `secondsSpecialMin` | Sonderlevel: kürzeste Länge (s) | 360 |
| `secondsSpecialMax` | Sonderlevel: längste Länge (s) | 470 |
| `secondsPerWave` | Sekunden je Welle im Mittel (bestimmt die Wellenzahl) | 15 |
| `plannedShare` | Anteil der Länge, der aus Ankunft und Pausen besteht | 0,9 |
| `lastWave` | Größe der letzten Welle (relativ) | 1,9 |

### Erster Auftritt der Räuber (`FIRST_LEVEL`)

| Räuber | Level |
|---|---|
| Pothelm | 1 |
| Keg Hauler | 3 |
| Goat Rider | 7 |
| Pogo Bandit | 12 |
| Hexer | 17 |
| Slinger | 23 |
| Siege Cart | 29 |
| Balloonist | 36 |
| Shade | 44 |
| Crowcaller | 52 |
| Yeti | 61 |

Von Anfang an da: Slot 1 (Damage), Waffe Rolling Wheel.

### Alle Level

Dauer: geplante Länge (m:ss). Räuber: alle Wellen zusammen, allein gespielt; dahinter die größte Welle. Stärke: Faktor auf Lebenspunkte (schwächer auch auf Torschaden und Tempo). ✎ = von Hand geändert (siehe unten).

| Level | Name | Landschaft | Dauer | Wellen | Räuber (größte Welle) | Neue Räuber | Besonderheit | Boss | Stärke | Challenges | Sieg schaltet frei |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pot Helmets | Wiese | 1:17 | 5 | 21 (6) | Pothelm |  |  | 1 | Use the Rolling Wheel 3 times; Throw 10 raiders |  |
| 2 | Downhill Wheel | Wiese | 1:26 | 6 | 73 (20) |  |  |  | 1,05 | Use the Rolling Wheel 3 times; Throw 36 raiders | Slot 2 (Slow), Waffe Sticky Fondue |
| 3 | Kegs on the Road | Wiese | 1:38 | 7 | 82 (19) | Keg Hauler |  |  | 1,1 | Let 3 kegs explode among the raiders; Shake the keg off 2 Keg Haulers |  |
| 4 | Crumbs at the Gate | Wiese | 1:44 | 7 | 89 (21) |  |  |  | 1,15 | Defeat 4 Keg Haulers by throwing; Use the Sticky Fondue 3 times | Slot 3 (Gate), Waffe Gate Mortar |
| 5 | Summer Siege | Wiese | 1:56 | 8 | 95 (20) |  |  |  | 1,2 | Let 6 kegs explode among the raiders; Shake the keg off 5 Keg Haulers |  |
| 6 | Sticky Situation | Wiese | 2:02 | 8 | 102 (21) |  |  |  | 1,25 | Use the Rolling Wheel 3 times; Let 8 kegs explode among the raiders |  |
| 7 | Hoofbeats | Wiese | 1:57 | 8 | 107 (23) | Goat Rider |  |  | 1,3 | Defeat 3 Goat Riders by throwing; Use the Gate Mortar 3 times | Slot 4 (Support), Waffe Golden Fondue |
| 8 | Meadow Muddle | Wiese | 2:14 | 9 | 113 (20) |  |  |  | 1,35 | Defeat 8 Keg Haulers by throwing; Use the Rolling Wheel 3 times |  |
| 9 | The Stampede | Wiese | 6:08 | 25 | 119 (8) |  | Riders only (nur Goat Rider) |  | 1,4 | Use the Golden Fondue 3 times; Defeat 41 raiders by throwing them |  |
| 10 | Bigpot's Charge | Wiese | 6:22 | 25 | 240 (17) |  |  | Sir Hubert Bigpot (Riesen: 1× Pothelm) | 1,62 | Let 10 kegs explode among the raiders; Use the Golden Fondue 3 times |  |
| 11 | Thinking Caps | Wiese | 2:35 | 10 | 168 (29) |  |  |  | 1,5 | Let 10 kegs explode among the raiders; Use the Golden Fondue 3 times | Slot 5 (Passive), Waffe Marmot Sentry |
| 12 | Boing | Wiese | 2:37 | 10 | 175 (30) | Pogo Bandit |  |  | 1,55 | Let 10 kegs explode among the raiders; Use the Golden Fondue 4 times |  |
| 13 | Up the Pass | Schlucht | 2:33 | 10 | 225 (34) |  |  |  | 1,6 | Let 10 kegs explode among the raiders; Shake the keg off 10 Keg Haulers |  |
| 14 | Pogo Party | Schlucht | 7:18 | 29 | 144 (9) |  | Hoppers only (nur Pogo Bandit) |  | 1,65 | Defeat 12 Pogo Bandits by throwing; Use the Gate Mortar 4 times | Waffe Fondue Forks |
| 15 | Canyon Echoes | Schlucht | 2:43 | 11 | 241 (36) |  |  |  | 1,7 | Shake the keg off 10 Keg Haulers; Defeat 12 Keg Haulers by throwing |  |
| 16 | Forks Out | Schlucht | 2:47 | 11 | 249 (36) |  |  |  | 1,75 | Shake the keg off 10 Keg Haulers; Use the Gate Mortar 4 times | Station Great Cauldron |
| 17 | Amber Bubbles | Schlucht | 3:02 | 12 | 257 (35) | Hexer |  |  | 1,8 | Throw 2 raiders into the cauldron; Let 10 kegs explode among the raiders | Waffe Frost Horn |
| 18 | Moonless Pass | Schlucht | 7:04 | 28 | 212 (14) |  | Night raid (Nacht) |  | 1,85 | Throw 2 raiders into the cauldron; Defeat 11 Goat Riders by throwing |  |
| 19 | Falling Leaves | Schlucht | 3:08 | 13 | 218 (25) |  |  |  | 1,9 | Throw 2 raiders into the cauldron; Shake the keg off 8 Keg Haulers |  |
| 20 | The Big Keg | Schlucht | 7:08 | 29 | 224 (14) |  |  | Old Barrelbelly (Riesen: 1× Keg Hauler) | 2,18 | Shake the keg off 8 Keg Haulers; Use the Fondue Forks 4 times | Waffe Hedgehog Gate |
| 21 | Banners Up | Schlucht | 3:28 | 14 | 286 (32) |  |  |  | 2 | Let 10 kegs explode among the raiders; Defeat 12 Goat Riders by throwing |  |
| 22 | Keg Rain | Schlucht | 7:12 | 29 | 179 (12) |  | Keg parade (viele Keg Hauler) |  | 2,05 | Defeat 12 Keg Haulers by throwing; Throw 2 raiders into the cauldron |  |
| 23 | Pebble Storm | Schlucht | 4:20 | 17 | 241 (24) | Slinger |  |  | 2,1 | Defeat 12 Pogo Bandits by throwing; Let 10 kegs explode among the raiders | Waffe Ember Beacon |
| 24 | Chilly Toes | Schlucht | 3:47 | 15 | 187 (20) |  |  |  | 2,15 | Defeat 6 Hexers by throwing; Let 8 kegs explode among the raiders |  |
| 25 | Last of the Canyon | Schlucht | 4:17 | 17 | 192 (18) |  |  |  | 2,2 | Defeat 9 Goat Riders by throwing; Let 9 kegs explode among the raiders |  |
| 26 | Into the Marsh | Sumpf | 3:55 | 16 | 321 (35) |  |  |  | 2,25 | Shake the keg off 10 Keg Haulers; Let 10 kegs explode among the raiders | Waffe Roof Bolter |
| 27 | Night Croak | Sumpf | 7:01 | 28 | 200 (11) |  | Night raid (Nacht) |  | 2,3 | Use the Hedgehog Gate 5 times; Defeat 6 Hexers by throwing |  |
| 28 | Cuckoo! | Sumpf | 3:54 | 16 | 334 (36) |  |  |  | 2,35 | Use the Frost Horn 5 times; Shake the keg off 10 Keg Haulers |  |
| 29 | Wheels in the Mud | Sumpf | 3:31 | 14 | 341 (42) | Siege Cart |  |  | 2,4 | Defeat 12 Slingers by throwing; Let 10 kegs explode among the raiders | Waffe Stomper |
| 30 | Horns at Dawn | Sumpf | 7:33 | 30 | 423 (31) |  |  | Countess Hornhoof (Riesen: 1× Goat Rider) | 2,74 | Shake the keg off 10 Keg Haulers; Defeat 12 Pogo Bandits by throwing |  |
| 31 | A Scout Squeaks | Sumpf | 4:32 | 18 | 215 (20) |  |  |  | 2,5 | Use the Rolling Wheel 5 times; Throw 3 raiders into the cauldron |  |
| 32 | Soggy Boots | Sumpf | 3:57 | 16 | 219 (25) |  |  |  | 2,55 | Defeat 8 Slingers by throwing; Shake the keg off 7 Keg Haulers | Waffe Cuckoo Clock |
| 33 | Eagle Eyes | Sumpf | 4:24 | 18 | 367 (37) |  |  |  | 2,6 | Let 10 kegs explode among the raiders; Throw 3 raiders into the cauldron |  |
| 34 | The Heavy Day | Sumpf | 6:26 | 26 | 299 (21) |  | Heavy siege (viele Siege Cart) |  | 2,65 | Shake the keg off 9 Keg Haulers; Use the Rolling Wheel 5 times |  |
| 35 | Dragon Breath | Sumpf | 4:34 | 18 | 304 (28) |  |  |  | 2,7 | Use the Stomper 5 times; Shake the keg off 10 Keg Haulers | Waffe Alphorn |
| 36 | Marsh Gas Balloons | Sumpf | 4:01 | 16 | 234 (26) | Balloonist |  |  | 2,75 | Let 10 kegs explode among the raiders; Throw 3 raiders into the cauldron |  |
| 37 | Close Call | Sumpf | 4:04 | 16 | 314 (35) |  |  |  | 2,8 | Let 10 kegs explode among the raiders; Defeat 4 Balloonists by throwing |  |
| 38 | Air Raid | Sumpf | 7:49 | 31 | 241 (13) |  | Night raid (Nacht) |  | 2,85 | Use the Ember Beacon 6 times; Defeat 10 Keg Haulers by throwing | Waffe Mending Horn |
| 39 | First Snow | Schneewald | 3:41 | 15 | 245 (27) |  |  |  | 2,9 | Let 10 kegs explode among the raiders; Defeat 7 Hexers by throwing |  |
| 40 | The Great Bubble | Schneewald | 8:10 | 33 | 493 (26) |  |  | Granny Bubblewick (Riesen: 1× Hexer) | 3,3 | Defeat 12 Hexers by throwing; Shake the keg off 10 Keg Haulers |  |
| 41 | Counting Slowly | Schneewald | 4:03 | 16 | 252 (29) |  |  |  | 3 | Defeat 10 Keg Haulers by throwing; Use the Cuckoo Clock 6 times | Waffe Storm Bell |
| 42 | A White Flag | Schneewald | 4:35 | 18 | 422 (39) |  |  |  | 3,05 | Throw 4 raiders into the cauldron; Shake the keg off 10 Keg Haulers |  |
| 43 | Sledge Charge | Schneewald | 6:43 | 27 | 259 (16) |  | Air raid (nur Balloonist, Pothelm) |  | 3,1 | Throw 4 raiders into the cauldron; Use the Frost Horn 6 times |  |
| 44 | Shadows in the Pines | Schneewald | 3:50 | 15 | 434 (50) | Shade |  |  | 3,15 | Use the Cuckoo Clock 6 times; Throw 4 raiders into the cauldron | Waffe Comet |
| 45 | Thunder Peal | Schneewald | 3:58 | 16 | 440 (49) |  |  |  | 3,2 | Defeat 9 Balloonists by throwing; Throw 4 raiders into the cauldron |  |
| 46 | Midnight Nibbles | Schneewald | 3:55 | 16 | 446 (46) |  |  |  | 3,25 | Use the Rolling Wheel 6 times; Let 10 kegs explode among the raiders |  |
| 47 | Darkest Night | Schneewald | 7:39 | 31 | 362 (20) |  | Night of shades (Nacht) |  | 3,3 | Shake the keg off 10 Keg Haulers; Throw 4 raiders into the cauldron |  |
| 48 | Snowed In | Schneewald | 4:03 | 16 | 366 (38) |  |  |  | 3,35 | Defeat 12 Goat Riders by throwing; Use the Rolling Wheel 7 times | Waffe Snowdrift Cannon |
| 49 | Rumbling Ground | Schneewald | 4:41 | 19 | 463 (40) |  |  |  | 3,4 | Use the Rolling Wheel 7 times; Shake the keg off 10 Keg Haulers |  |
| 50 | Caravan of Carts | Schneewald | 7:56 | 32 | 661 (38) |  |  | The Rumble Caravan | 3,86 | Let 10 kegs explode among the raiders; Use the Hedgehog Gate 7 times |  |
| 51 | Thaw | Schlucht | 3:39 | 15 | 380 (42) |  |  |  | 3,5 | Let 10 kegs explode among the raiders; Shake the keg off 10 Keg Haulers |  |
| 52 | Black Feathers | Schlucht | 4:35 | 18 | 577 (54) | Crowcaller |  |  | 3,55 | Throw 5 raiders into the cauldron; Defeat 12 Hexers by throwing | Waffe Cheese Cascade |
| 53 | The Letter, Opened | Schlucht | 3:37 | 14 | 389 (46) |  |  |  | 3,6 | Shake the keg off 10 Keg Haulers; Let 10 kegs explode among the raiders |  |
| 54 | Spoon Thieves | Schlucht | 4:01 | 16 | 394 (41) |  |  |  | 3,65 | Throw 5 raiders into the cauldron; Use the Stomper 7 times |  |
| 55 | Spiky Welcome | Schlucht | 4:37 | 18 | 398 (40) |  |  |  | 3,7 | Shake the keg off 10 Keg Haulers; Throw 5 raiders into the cauldron |  |
| 56 | Day of Crows | Schlucht | 7:41 | 31 | 503 (27) |  | Crow storm (viele Crowcaller) |  | 3,75 | Use the Stomper 7 times; Throw 5 raiders into the cauldron | Waffe Iron Grip |
| 57 | Lost Catapult | Schlucht | 4:16 | 17 | 508 (49) |  |  |  | 3,8 | Let 10 kegs explode among the raiders; Defeat 12 Hexers by throwing |  |
| 58 | Royal Sock | Schlucht | 3:52 | 15 | 617 (70) |  |  |  | 3,85 | Shake the keg off 10 Keg Haulers; Defeat 12 Keg Haulers by throwing |  |
| 59 | Calling the Mountains | Schlucht | 3:42 | 15 | 416 (48) |  |  |  | 3,9 | Use the Sticky Fondue 7 times; Throw 5 raiders into the cauldron |  |
| 60 | Sky Admiral | Schlucht | 8:26 | 34 | 635 (37) |  |  | Admiral Puffington (Riesen: 1× Balloonist) | 4,42 | Throw 5 raiders into the cauldron; Defeat 12 Shades by throwing | Waffe Pinecone Catapult |
| 61 | Giant Footprints | Schlucht | 4:31 | 18 | 637 (61) | Yeti |  |  | 4 | Shake the keg off 10 Keg Haulers; Let 10 kegs explode among the raiders |  |
| 62 | Heavy Lifting | Schlucht | 4:43 | 19 | 644 (60) |  |  |  | 4,05 | Defeat 12 Slingers by throwing; Let 10 kegs explode among the raiders |  |
| 63 | Green Marsh | Sumpf | 4:33 | 18 | 433 (42) |  |  |  | 4,1 | Shake the keg off 10 Keg Haulers; Use the Fondue Forks 8 times |  |
| 64 | Crossed-Out Reply | Sumpf | 4:04 | 16 | 546 (60) |  |  |  | 4,15 | Defeat 12 Slingers by throwing; Throw 6 raiders into the cauldron | Waffe Dragon Bellows |
| 65 | The Sniffing Yeti | Sumpf | 4:05 | 16 | 442 (48) |  |  |  | 4,2 | Use the Stomper 8 times; Let 10 kegs explode among the raiders |  |
| 66 | Swamp Lanterns | Sumpf | 7:36 | 30 | 669 (41) |  | Night raid (Nacht) |  | 4,25 | Use the Snowdrift Cannon 8 times; Throw 6 raiders into the cauldron |  |
| 67 | A Spoonful Offered | Sumpf | 4:03 | 16 | 562 (60) |  |  |  | 4,3 | Let 10 kegs explode among the raiders; Defeat 11 Shades by throwing |  |
| 68 | Promises | Sumpf | 3:47 | 15 | 454 (52) |  |  |  | 4,35 | Throw 6 raiders into the cauldron; Use the Dragon Bellows 8 times | Waffe Cowbell Toll |
| 69 | Big Sister | Sumpf | 4:21 | 17 | 459 (44) |  |  |  | 4,4 | Defeat 12 Keg Haulers by throwing; Shake the keg off 10 Keg Haulers |  |
| 70 | Twice the Fur | Sumpf | 8:12 | 33 | 814 (44) |  |  | Flurry and Flake | 4,98 | Shake the keg off 10 Keg Haulers; Let 10 kegs explode among the raiders | Station Eagle Perch |
| 71 | Campfire Songs | Sumpf | 3:51 | 15 | 701 (77) |  |  |  | 4,5 | Use the Snowdrift Cannon 8 times; Give 1 raider to the eagle |  |
| 72 | The Spyglass | Sumpf | 4:03 | 16 | 707 (74) |  |  |  | 4,55 | Give 1 raider to the eagle; Shake the keg off 10 Keg Haulers | Waffe Battering Log |
| 73 | Hop and Gallop | Sumpf | 6:04 | 24 | 714 (50) |  | Hop and gallop (nur Pogo Bandit, Goat Rider) |  | 4,6 | Throw 6 raiders into the cauldron; Use the Cheese Cascade 9 times |  |
| 74 | Reed Rafts | Sumpf | 4:41 | 19 | 479 (44) |  |  |  | 4,65 | Defeat 9 Shades by throwing; Give 1 raider to the eagle |  |
| 75 | Leaving the Marsh | Sumpf | 3:54 | 16 | 726 (74) |  |  |  | 4,7 | Use the Fondue Forks 9 times; Defeat 12 Shades by throwing |  |
| 76 | Home Meadow | Wiese | 4:44 | 19 | 609 (55) |  |  |  | 4,75 | Defeat 9 Crowcallers by throwing; Give 1 raider to the eagle | Waffe Helping Hand |
| 77 | Hay Bales | Wiese | 4:29 | 18 | 614 (59) |  |  |  | 4,8 | Use the Snowdrift Cannon 9 times; Defeat 12 Goat Riders by throwing |  |
| 78 | A Crumb Dropped | Wiese | 4:51 | 19 | 496 (46) |  |  |  | 4,85 | Throw 7 raiders into the cauldron; Shake the keg off 10 Keg Haulers |  |
| 79 | Whisker Whispers | Wiese | 4:45 | 19 | 751 (73) |  |  |  | 4,9 | Let 10 kegs explode among the raiders; Throw 7 raiders into the cauldron |  |
| 80 | Night of Whispers | Wiese | 8:38 | 35 | 630 (33) |  | Midnight (Nacht) | Whisper Whitewhisker (Riesen: 1× Shade) | 5,54 | Shake the keg off 10 Keg Haulers; Defeat 12 Shades by throwing | Waffe Hornet Hive |
| 81 | A Year of War | Wiese | 4:44 | 19 | 635 (56) |  |  |  | 5 | Use the Hedgehog Gate 9 times; Defeat 9 Crowcallers by throwing |  |
| 82 | Strange Silence | Wiese | 4:16 | 17 | 640 (62) |  |  |  | 5,05 | Give 2 raiders to the eagle; Shake the keg off 10 Keg Haulers |  |
| 83 | The Tunnel | Wiese | 4:09 | 17 | 645 (63) |  |  |  | 5,1 | Give 2 raiders to the eagle; Let 10 kegs explode among the raiders |  |
| 84 | Cellar Squeaks | Wiese | 4:28 | 18 | 781 (75) |  |  |  | 5,15 | Throw 7 raiders into the cauldron; Shake the keg off 10 Keg Haulers |  |
| 85 | Lanterns Out | Wiese | 6:18 | 25 | 524 (35) |  | Night raid (Nacht) |  | 5,2 | Shake the keg off 10 Keg Haulers; Use the Iron Grip 10 times |  |
| 86 | Sticky Diggers | Wiese | 4:53 | 20 | 528 (44) |  |  |  | 5,25 | Use the Fondue Forks 10 times; Throw 7 raiders into the cauldron |  |
| 87 | Counting Wheels | Wiese | 4:20 | 17 | 532 (53) |  |  |  | 5,3 | Shake the keg off 10 Keg Haulers; Let 10 kegs explode among the raiders |  |
| 88 | Crows Gathering | Wiese | 4:09 | 17 | 536 (55) |  |  |  | 5,35 | Shake the keg off 10 Keg Haulers; Use the Battering Log 10 times |  |
| 89 | Second Winter | Schneewald | 4:48 | 19 | 811 (73) |  |  |  | 5,4 | Shake the keg off 10 Keg Haulers; Use the Gate Mortar 10 times |  |
| 90 | Wings Over Snowpine | Schneewald | 8:54 | 36 | 959 (52) |  |  | Lord Rookfeather (Riesen: 1× Crowcaller) | 6,1 | Let 10 kegs explode among the raiders; Give 3 raiders to the eagle |  |
| 91 | Everyone Comes | Schneewald | 3:53 | 16 | 685 (74) |  |  |  | 5,5 | Use the Helping Hand 10 times; Throw 8 raiders into the cauldron |  |
| 92 | The Old Letter | Schneewald | 4:30 | 18 | 689 (64) |  |  |  | 5,55 | Shake the keg off 10 Keg Haulers; Let 10 kegs explode among the raiders |  |
| 93 | Little Banners | Schneewald | 4:39 | 19 | 976 (83) |  |  |  | 5,6 | Shake the keg off 10 Keg Haulers; Use the Cheese Cascade 10 times |  |
| 94 | Hungry Yetis | Schneewald | 4:18 | 17 | 983 (102) |  |  |  | 5,65 | Throw 8 raiders into the cauldron; Shake the keg off 10 Keg Haulers |  |
| 95 | Everything at Once | Schneewald | 7:32 | 30 | 990 (55) |  | All at once (alle bekannten Räuber, mehr von jeder Art) |  | 5,7 | Throw 8 raiders into the cauldron; Let 10 kegs explode among the raiders |  |
| 96 | Quiet Snow | Schneewald | 4:46 | 19 | 709 (62) |  |  |  | 5,75 | Give 3 raiders to the eagle; Let 10 kegs explode among the raiders |  |
| 97 | Crumbtail's Horn | Schneewald | 4:31 | 18 | 714 (69) |  |  |  | 5,8 | Give 3 raiders to the eagle; Defeat 12 Slingers by throwing |  |
| 98 | Last Firewood | Schneewald | 3:56 | 16 | 1010 (106) |  |  |  | 5,85 | Shake the keg off 10 Keg Haulers; Use the Snowdrift Cannon 11 times |  |
| 99 | The Extra Slice | Schneewald | 4:42 | 19 | 1017 (93) |  |  |  | 5,9 | Give 3 raiders to the eagle; Shake the keg off 10 Keg Haulers |  |
| 100 | The Greatest Fondue | Schneewald | 9:37 | 38 | 877 (43) |  |  | Duchess Crumbtail (Riesen: 1× Pothelm, 1× Goat Rider, 1× Hexer) | 6,66 | Let 10 kegs explode among the raiders; Use the Hedgehog Gate 11 times |  |

### Von Hand geändert (`LEVEL_OVERRIDES`)

Keine Level sind von Hand geändert.
<!-- KAMPAGNE:END -->
