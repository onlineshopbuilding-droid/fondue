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
Stand: 100 Level, 651 Tage, 10 Boss-Level, 388 Sterne für alle ersten Siege zusammen.

### Die Kurve (`CURVE`)

| Wert | Bedeutung | Zahl |
|---|---|---|
| `baseCount` | Räuber an Tag 1 von Level 1 | 24 |
| `countPerLevel` | Zusätzliche Räuber je Level (Faktor vor der Potenz) | 6 |
| `countPower` | Potenz der Level-Zunahme (unter 1: frühe Level wachsen schneller) | 0,75 |
| `countPerDay` | Anteil mehr Räuber je weiterem Tag | 0,14 |
| `levelShareDay1` | Anteil der Level-Zunahme an Tag 1 | 0,3 |
| `levelSharePerDay` | Zunahme dieses Anteils je weiterem Tag | 0,35 |
| `levelShareMax` | Höchster Anteil | 1,7 |
| `powerPerLevel` | Stärke der Räuber: Zunahme je Level (Level 1 = 1) | 0,05 |
| `bossDayCount` | Boss-Level: Faktor für die Räuberzahl am letzten Tag | 1,8 |
| `bossPower` | Boss-Level: Faktor für die Stärke | 1,12 |

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

Von Anfang an da: Station Great Cauldron.

### Alle Level

Räuber je Tag: Gesamtzahl für Tag 1 · Tag 2 · …, allein gespielt. Stärke: Faktor auf Lebenspunkte (schwächer auch auf Torschaden und Tempo). ✎ = von Hand geändert (siehe unten).

| Level | Name | Landschaft | Tage | Räuber je Tag | Neue Räuber | Besonderheit | Boss | Stärke | Sterne | Sieg schaltet frei |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 ✎ | Pot Helmets | Wiese | 2 | 24 · 27 | Pothelm |  |  | 1 | 4 | Slot 1 (Wall Foot), Waffe Rolling Wheel |
| 2 | Downhill Wheel | Wiese | 3 | 26 · 31 · 37 |  |  |  | 1,05 | 4 | Tor bis Iron-Bound Gate |
| 3 | Kegs on the Road | Wiese | 3 | 27 · 34 · 41 | Keg Hauler |  |  | 1,1 | 4 |  |
| 4 | Crumbs at the Gate | Wiese | 3 | 28 · 36 · 44 |  |  |  | 1,15 | 3 |  |
| 5 | Summer Siege | Wiese | 4 | 29 · 38 · 48 · 57 |  |  |  | 1,2 | 4 | Waffe Sticky Fondue |
| 6 | Sticky Situation | Wiese | 4 | 30 · 40 · 51 · 61 |  |  |  | 1,25 | 3 |  |
| 7 | Hoofbeats | Wiese | 4 | 31 · 42 · 54 · 65 | Goat Rider |  |  | 1,3 | 4 |  |
| 8 | Meadow Muddle | Wiese | 4 | 32 · 44 · 57 · 69 |  |  |  | 1,35 | 4 | Tor bis Gilded Gate |
| 9 | The Stampede | Wiese | 4 | 33 · 46 · 59 · 73 |  | Riders only (nur Goat Rider) |  | 1,4 | 4 | Slot 2 (Wall), Waffe Stomper |
| 10 | Bigpot's Charge | Wiese | 8 | 33 · 48 · 62 · 76 · 90 · 94 · 97 · 181 |  |  | Sir Hubert Bigpot (Riesen: 1× Pothelm) | 1,62 | 8 |  |
| 11 | Thinking Caps | Wiese | 6 | 34 · 49 · 64 · 80 · 95 · 98 |  |  |  | 1,5 | 3 |  |
| 12 | Boing | Wiese | 6 | 35 · 51 · 67 · 83 · 99 · 102 | Pogo Bandit |  |  | 1,55 | 4 | Waffe Alphorn |
| 13 | Up the Pass | Schlucht | 7 | 36 · 53 · 69 · 86 · 103 · 107 · 110 |  |  |  | 1,6 | 3 |  |
| 14 | Pogo Party | Schlucht | 5 | 36 · 54 · 72 · 90 · 107 |  | Hoppers only (nur Pogo Bandit) |  | 1,65 | 4 | Hand-Stufe 2 |
| 15 | Canyon Echoes | Schlucht | 7 | 37 · 56 · 74 · 93 · 111 · 115 · 118 |  |  |  | 1,7 | 4 | Waffe Fondue Forks |
| 16 | Forks Out | Schlucht | 7 | 38 · 57 · 76 · 96 · 115 · 119 · 122 |  |  |  | 1,75 | 3 |  |
| 17 | Amber Bubbles | Schlucht | 7 | 38 · 59 · 79 · 99 · 119 · 122 · 126 | Hexer |  |  | 1,8 | 4 |  |
| 18 | Moonless Pass | Schlucht | 6 | 39 · 60 · 81 · 102 · 123 · 126 |  | Night raid (Nacht) |  | 1,85 | 4 |  |
| 19 | Falling Leaves | Schlucht | 6 | 40 · 61 · 83 · 105 · 127 · 130 |  |  |  | 1,9 | 4 | Slot 3 (Gate Arm), Waffe Gate Mortar |
| 20 | The Big Keg | Schlucht | 6 | 40 · 63 · 85 · 108 · 130 · 241 |  |  | Old Barrelbelly (Riesen: 1× Keg Hauler) | 2,18 | 8 |  |
| 21 | Banners Up | Schlucht | 7 | 41 · 64 · 87 · 111 · 134 · 137 · 141 |  |  |  | 2 | 4 | Tor bis Runic Gate |
| 22 | Keg Rain | Schlucht | 5 | 42 · 66 · 90 · 114 · 138 |  | Keg parade (viele Keg Hauler) |  | 2,05 | 4 |  |
| 23 | Pebble Storm | Schlucht | 6 | 42 · 67 · 92 · 116 · 141 · 144 | Slinger |  |  | 2,1 | 4 | Waffe Frost Horn |
| 24 | Chilly Toes | Schlucht | 5 | 43 · 68 · 94 · 119 · 145 |  |  |  | 2,15 | 3 |  |
| 25 | Last of the Canyon | Schlucht | 5 | 44 · 70 · 96 · 122 · 148 |  |  |  | 2,2 | 3 |  |
| 26 | Into the Marsh | Sumpf | 7 | 44 · 71 · 98 · 125 · 151 · 155 · 158 |  |  |  | 2,25 | 3 |  |
| 27 | Night Croak | Sumpf | 5 | 45 · 72 · 100 · 127 · 155 |  | Night raid (Nacht) |  | 2,3 | 4 | Waffe Cuckoo Clock |
| 28 | Cuckoo! | Sumpf | 7 | 45 · 74 · 102 · 130 · 158 · 162 · 165 |  |  |  | 2,35 | 3 |  |
| 29 | Wheels in the Mud | Sumpf | 7 | 46 · 75 · 104 · 133 · 162 · 165 · 168 | Siege Cart |  |  | 2,4 | 4 | Slot 4 (Shrine), Waffe Comet |
| 30 | Horns at Dawn | Sumpf | 8 | 46 · 76 · 106 · 135 · 165 · 168 · 172 · 329 |  |  | Countess Hornhoof (Riesen: 1× Goat Rider) | 2,74 | 8 |  |
| 31 | A Scout Squeaks | Sumpf | 5 | 47 · 77 · 108 · 138 · 168 |  |  |  | 2,5 | 3 |  |
| 32 | Soggy Boots | Sumpf | 5 | 48 · 79 · 110 · 140 · 171 |  |  |  | 2,55 | 4 | Station Eagle Perch |
| 33 | Eagle Eyes | Sumpf | 7 | 48 · 80 · 111 · 143 · 175 · 178 · 181 |  |  |  | 2,6 | 3 |  |
| 34 | The Heavy Day | Sumpf | 6 | 49 · 81 · 113 · 146 · 178 · 181 |  | Heavy day (viele Siege Cart) |  | 2,65 | 4 | Waffe Dragon Bellows |
| 35 | Dragon Breath | Sumpf | 6 | 49 · 82 · 115 · 148 · 181 · 184 |  |  |  | 2,7 | 3 |  |
| 36 | Marsh Gas Balloons | Sumpf | 5 | 50 · 83 · 117 · 151 · 184 | Balloonist |  |  | 2,75 | 4 |  |
| 37 | Close Call | Sumpf | 6 | 50 · 85 · 119 · 153 · 187 · 191 |  |  |  | 2,8 | 3 |  |
| 38 | Air Raid | Sumpf | 5 | 51 · 86 · 121 · 156 · 190 |  | Night raid (Nacht) |  | 2,85 | 4 |  |
| 39 | First Snow | Schneewald | 5 | 52 · 87 · 123 · 158 · 194 |  |  |  | 2,9 | 4 | Slot 5 (Tower Roof), Waffe Roof Bolter |
| 40 | The Great Bubble | Schneewald | 8 | 52 · 88 · 124 · 160 · 197 · 200 · 203 · 372 |  |  | Granny Bubblewick (Riesen: 1× Hexer) | 3,3 | 8 |  |
| 41 | Counting Slowly | Schneewald | 5 | 53 · 89 · 126 · 163 · 200 |  |  |  | 3 | 3 |  |
| 42 | A White Flag | Schneewald | 7 | 53 · 91 · 128 · 165 · 203 · 206 · 209 |  |  |  | 3,05 | 4 | Tor bis Adamant Gate |
| 43 | Sledge Charge | Schneewald | 5 | 54 · 92 · 130 · 168 · 206 |  | Air raid (nur Balloonist, Pothelm) |  | 3,1 | 4 |  |
| 44 | Shadows in the Pines | Schneewald | 7 | 54 · 93 · 131 · 170 · 209 · 212 · 215 | Shade |  |  | 3,15 | 4 | Waffe Storm Bell |
| 45 | Thunder Peal | Schneewald | 7 | 55 · 94 · 133 · 172 · 212 · 215 · 218 |  |  |  | 3,2 | 3 |  |
| 46 | Midnight Nibbles | Schneewald | 7 | 55 · 95 · 135 · 175 · 215 · 218 · 221 |  |  |  | 3,25 | 3 |  |
| 47 | Darkest Night | Schneewald | 6 | 56 · 96 · 137 · 177 · 218 · 221 |  | Night of shades (Nacht) |  | 3,3 | 4 | Hand-Stufe 3 |
| 48 | Snowed In | Schneewald | 6 | 56 · 97 · 138 · 179 · 221 · 224 |  |  |  | 3,35 | 3 |  |
| 49 | Rumbling Ground | Schneewald | 7 | 57 · 98 · 140 · 182 · 223 · 227 · 230 |  |  |  | 3,4 | 4 | Waffe Marmot Sentry |
| 50 | Caravan of Carts | Schneewald | 9 | 57 · 100 · 142 · 184 · 226 · 230 · 233 · 236 · 437 |  |  | The Rumble Caravan | 3,86 | 8 |  |
| 51 | Thaw | Schlucht | 6 | 58 · 101 · 144 · 186 · 229 · 233 |  |  |  | 3,5 | 3 |  |
| 52 | Black Feathers | Schlucht | 8 | 58 · 102 · 145 · 189 · 232 · 235 · 239 · 242 | Crowcaller |  |  | 3,55 | 4 |  |
| 53 | The Letter, Opened | Schlucht | 6 | 59 · 103 · 147 · 191 · 235 · 238 |  |  |  | 3,6 | 3 |  |
| 54 | Spoon Thieves | Schlucht | 6 | 59 · 104 · 149 · 193 · 238 · 241 |  |  |  | 3,65 | 4 | Waffe Hedgehog Gate |
| 55 | Spiky Welcome | Schlucht | 6 | 60 · 105 · 150 · 195 · 241 · 244 |  |  |  | 3,7 | 3 |  |
| 56 | Day of Crows | Schlucht | 7 | 60 · 106 · 152 · 198 · 243 · 247 · 250 |  | Day of crows (viele Crowcaller) |  | 3,75 | 4 |  |
| 57 | Lost Catapult | Schlucht | 7 | 61 · 107 · 154 · 200 · 246 · 250 · 253 |  |  |  | 3,8 | 3 |  |
| 58 | Royal Sock | Schlucht | 8 | 61 · 108 · 155 · 202 · 249 · 252 · 256 · 259 |  |  |  | 3,85 | 3 |  |
| 59 | Calling the Mountains | Schlucht | 6 | 62 · 109 · 157 · 204 · 252 · 255 |  |  |  | 3,9 | 4 | Waffe Ember Beacon |
| 60 | Sky Admiral | Schlucht | 8 | 62 · 110 · 158 · 207 · 255 · 258 · 261 · 488 |  |  | Admiral Puffington (Riesen: 1× Balloonist) | 4,42 | 8 |  |
| 61 | Giant Footprints | Schlucht | 8 | 63 · 111 · 160 · 209 · 257 · 261 · 264 · 267 | Yeti |  |  | 4 | 4 |  |
| 62 | Heavy Lifting | Schlucht | 8 | 63 · 112 · 162 · 211 · 260 · 263 · 267 · 270 |  |  |  | 4,05 | 3 |  |
| 63 | Green Marsh | Sumpf | 6 | 64 · 114 · 163 · 213 · 263 · 266 |  |  |  | 4,1 | 3 |  |
| 64 | Crossed-Out Reply | Sumpf | 7 | 64 · 115 · 165 · 215 · 266 · 269 · 272 |  |  |  | 4,15 | 3 |  |
| 65 | The Sniffing Yeti | Sumpf | 6 | 65 · 116 · 166 · 217 · 268 · 272 |  |  |  | 4,2 | 3 |  |
| 66 | Swamp Lanterns | Sumpf | 8 | 65 · 117 · 168 · 220 · 271 · 274 · 278 · 281 |  | Night raid (Nacht) |  | 4,25 | 4 |  |
| 67 | A Spoonful Offered | Sumpf | 7 | 66 · 118 · 170 · 222 · 274 · 277 · 280 |  |  |  | 4,3 | 3 |  |
| 68 | Promises | Sumpf | 6 | 66 · 119 · 171 · 224 · 276 · 280 |  |  |  | 4,35 | 3 |  |
| 69 | Big Sister | Sumpf | 6 | 67 · 120 · 173 · 226 · 279 · 282 |  |  |  | 4,4 | 4 | Waffe Golden Fondue |
| 70 | Twice the Fur | Sumpf | 9 | 67 · 121 · 174 · 228 · 282 · 285 · 288 · 292 · 533 |  |  | Flurry and Flake | 4,98 | 8 |  |
| 71 | Campfire Songs | Sumpf | 8 | 68 · 122 · 176 · 230 · 284 · 288 · 291 · 294 |  |  |  | 4,5 | 3 |  |
| 72 | The Spyglass | Sumpf | 8 | 68 · 123 · 177 · 232 · 287 · 290 · 294 · 297 |  |  |  | 4,55 | 3 |  |
| 73 | Hop and Gallop | Sumpf | 8 | 68 · 124 · 179 · 234 · 290 · 293 · 296 · 300 |  | Hop and gallop (nur Pogo Bandit, Goat Rider) |  | 4,6 | 4 |  |
| 74 | Reed Rafts | Sumpf | 6 | 69 · 125 · 181 · 236 · 292 · 296 |  |  |  | 4,65 | 3 |  |
| 75 | Leaving the Marsh | Sumpf | 8 | 69 · 126 · 182 · 238 · 295 · 298 · 302 · 305 |  |  |  | 4,7 | 3 |  |
| 76 | Home Meadow | Wiese | 7 | 70 · 127 · 184 · 241 · 297 · 301 · 304 |  |  |  | 4,75 | 3 |  |
| 77 | Hay Bales | Wiese | 7 | 70 · 128 · 185 · 243 · 300 · 303 · 307 |  |  |  | 4,8 | 3 |  |
| 78 | A Crumb Dropped | Wiese | 6 | 71 · 129 · 187 · 245 · 303 · 306 |  |  |  | 4,85 | 3 |  |
| 79 | Whisker Whispers | Wiese | 8 | 71 · 130 · 188 · 247 · 305 · 309 · 312 · 315 |  |  |  | 4,9 | 3 |  |
| 80 | Night of Whispers | Wiese | 7 | 72 · 131 · 190 · 249 · 308 · 311 · 566 |  | Midnight (Nacht) | Whisper Whitewhisker (Riesen: 1× Shade) | 5,54 | 8 |  |
| 81 | A Year of War | Wiese | 7 | 72 · 132 · 191 · 251 · 310 · 314 · 317 |  |  |  | 5 | 3 |  |
| 82 | Strange Silence | Wiese | 7 | 73 · 133 · 193 · 253 · 313 · 316 · 320 |  |  |  | 5,05 | 3 |  |
| 83 | The Tunnel | Wiese | 7 | 73 · 134 · 194 · 255 · 315 · 319 · 322 |  |  |  | 5,1 | 3 |  |
| 84 | Cellar Squeaks | Wiese | 8 | 73 · 135 · 196 · 257 · 318 · 321 · 325 · 328 |  |  |  | 5,15 | 3 |  |
| 85 | Lanterns Out | Wiese | 6 | 74 · 136 · 197 · 259 · 320 · 324 |  | Night raid (Nacht) |  | 5,2 | 4 |  |
| 86 | Sticky Diggers | Wiese | 6 | 74 · 137 · 199 · 261 · 323 · 326 |  |  |  | 5,25 | 3 |  |
| 87 | Counting Wheels | Wiese | 6 | 75 · 137 · 200 · 263 · 325 · 329 |  |  |  | 5,3 | 3 |  |
| 88 | Crows Gathering | Wiese | 6 | 75 · 138 · 202 · 265 · 328 · 331 |  |  |  | 5,35 | 3 |  |
| 89 | Second Winter | Schneewald | 8 | 76 · 139 · 203 · 267 · 331 · 334 · 337 · 341 |  |  |  | 5,4 | 3 |  |
| 90 | Wings Over Snowpine | Schneewald | 9 | 76 · 140 · 205 · 269 · 333 · 336 · 340 · 343 · 634 |  |  | Lord Rookfeather (Riesen: 1× Crowcaller) | 6,1 | 8 |  |
| 91 | Everyone Comes | Schneewald | 7 | 77 · 141 · 206 · 271 · 335 · 339 · 342 |  |  |  | 5,5 | 3 |  |
| 92 | The Old Letter | Schneewald | 7 | 77 · 142 · 207 · 273 · 338 · 341 · 345 |  |  |  | 5,55 | 3 |  |
| 93 | Little Banners | Schneewald | 9 | 77 · 143 · 209 · 275 · 340 · 344 · 347 · 351 · 354 |  |  |  | 5,6 | 3 |  |
| 94 | Hungry Yetis | Schneewald | 9 | 78 · 144 · 210 · 277 · 343 · 346 · 350 · 353 · 356 |  |  |  | 5,65 | 3 |  |
| 95 | Everything at Once | Schneewald | 9 | 78 · 145 · 212 · 279 · 345 · 349 · 352 · 355 · 359 |  | All at once (alle bekannten Räuber, mehr von jeder Art) |  | 5,7 | 4 |  |
| 96 | Quiet Snow | Schneewald | 7 | 79 · 146 · 213 · 281 · 348 · 351 · 355 |  |  |  | 5,75 | 3 |  |
| 97 | Crumbtail's Horn | Schneewald | 7 | 79 · 147 · 215 · 283 · 350 · 354 · 357 |  |  |  | 5,8 | 3 |  |
| 98 | Last Firewood | Schneewald | 9 | 80 · 148 · 216 · 284 · 353 · 356 · 359 · 363 · 366 |  |  |  | 5,85 | 3 |  |
| 99 | The Extra Slice | Schneewald | 9 | 80 · 149 · 218 · 286 · 355 · 359 · 362 · 365 · 369 |  |  |  | 5,9 | 3 |  |
| 100 | The Greatest Fondue | Schneewald | 8 | 80 · 150 · 219 · 288 · 358 · 361 · 364 · 666 |  |  | Duchess Crumbtail (Riesen: 1× Pothelm, 1× Goat Rider, 1× Hexer) | 6,66 | 8 |  |

### Von Hand geändert (`LEVEL_OVERRIDES`)

- Level 1: `marketOnly`, `startGold`, `hints`
<!-- KAMPAGNE:END -->
