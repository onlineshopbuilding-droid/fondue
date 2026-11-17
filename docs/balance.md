# Balance

## v0.4: die Burg als Fortschritt

Stand: 17.11.2026, Pakete P-Bots und P-Balance (Etappe 3). Gemessen mit `npm run balance`; alle Zahlen in `docs/balance-latest.md` und `.json`. Ab v0.4 öffnen Slots nur über die Burg (Damage ab Start, Slow mit Stufe 2, Gate 3, Support 4, Passive 5). Jede Burg-Stufe wird mit dem Sieg eines Kampagnen-Levels kaufbar und kostet dann Gold.

### Was die Bots neu können (A8)

- **Burg zuerst** (`src/bots/armoury.ts`, `savingForCastle`): Ist die nächste Burg-Stufe durch die Kampagne freigeschaltet, kauft der Bot sie vor allem anderen. Fehlt nur Gold, **sparen** Mid und Great (kein Gold für Hand- oder Waffenstufen, bis die Burg steht); Poor plant nicht voraus, baut die Burg aber, sobald er sie bezahlen kann. Käse-Freischaltungen kosten kein Gold und kommen weiter zuerst. Bei Stufe 7 wird nur gespart, wenn die Wappen schon da sind.
- **Slots aus der Burg:** Die Bots legen nur in offene Slots an; offen ist, was die Burg-Stufe öffnet.
- **Endlos-Farmen erst ab gewonnenem Level 10** (Endlos-Tisch). Beim Sparen meldet `goldWanted` den Burg-Preis, sodass ein festsitzender Bot gezielt dafür farmt. Käufe zwischen Farm-Läufen werden jetzt mitgezählt (vorher fehlten sie in der Auswertung).
- **Neue Auswertung:** je Zeile das Kampagnen-Level jedes Burg-Kaufs (Stufe 2–7), die Versuche je Level 1–15 mit Torleben, und zwei neue Ziel-Zeilen (Burg-Stufe 2 bei Level 6–8, fünfter Slot bei Level 20–30). Probeläufe, ohne `docs/` zu ändern: `BALANCE_OUT=pfad/name`.

### Burg-Stufen (Ergebnis)

| Burg-Stufe | Name | kaufbar ab Level | Gold (+ Crests) | öffnet | mittlerer Bot kauft bei Level |
|---|---|---|---|---|---|
| 1 | Oak Gate | Start | – | Damage | Start |
| 2 | Iron-Bound Gate | 6 | 8000 | Slow | 6 / 6 / 6 (Mid, Geschmack 1 / 2 / 6) |
| 3 | Stone Keep | 12 | 15000 | Gate | 12 / 12 / 12 (Mid, Geschmack 1 / 2 / 6) |
| 4 | Bannered Keep | 20 | 24000 | Support | 20 / 20 / 20 (Mid, Geschmack 1 / 2 / 6) |
| 5 | Gilded Keep | 28 | 26000 | Passive | 29 / 28 / 29 (Mid, Geschmack 1 / 2 / 6) |
| 6 | Runic Fortress | 50 | 80000 | mehr Torleben | 55 / 51 / 51 (Mid, Geschmack 1 / 2 / 6) |
| 7 | Alpine Citadel | 75 | 150000 + 50 Crests | mehr Torleben | nie / nie / 100 (Mid, Geschmack 1 / 2 / 6) |

Gekauft nach Level, alle Zeilen des Laufs:

| Zeile | Stufe 2 | Stufe 3 | Stufe 4 | Stufe 5 | Stufe 6 | Stufe 7 |
|---|---|---|---|---|---|---|
| Poor solo | 6 | 12 | 20 | 28 | 50 | – |
| Mid solo | 6 | 12 | 20 | 29 | 55 | – |
| Mid solo B | 6 | 12 | 20 | 28 | 51 | – |
| Mid solo C | 6 | 12 | 20 | 29 | 51 | 100 |
| Great solo | 6 | 12 | 20 | 30 | 52 | 99 |
| Mid ohne Ausbau | – | – | – | – | – | – |
| Mid Farmer | 6 | 12 | 20 | 28 | 51 | – |
| Mid zu zweit | 6 | 12 | 20 | 28 | 50 | – |

### Versuche je Level 1–15

Versuche bis zum Sieg, in Klammern das Torleben am Ende in Prozent (✗n = in n Versuchen nicht geschafft).

| Zeile | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Poor solo | 1 (100) | 1 (75) | 1 (88) | 1 (73) | 1 (51) | 2 (23) | 1 (89) | 1 (82) | 1 (90) | 1 (90) | 2 (23) | 1 (39) | 1 (29) | 1 (79) | 4 (22) |
| Mid solo | 1 (100) | 1 (100) | 1 (100) | 1 (71) | 1 (96) | 1 (100) | 1 (99) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (95) | 1 (96) | 1 (100) | 1 (82) |
| Mid solo B | 1 (100) | 1 (100) | 1 (100) | 1 (71) | 1 (96) | 1 (100) | 1 (99) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (95) | 1 (96) | 1 (100) | 1 (95) |
| Mid solo C | 1 (100) | 1 (100) | 1 (100) | 1 (71) | 1 (96) | 1 (100) | 1 (99) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (95) | 1 (96) | 1 (100) | 1 (95) |
| Great solo | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (97) | 1 (100) | 1 (100) | 1 (100) | 1 (99) |
| Mid ohne Ausbau | 1 (100) | 1 (100) | 1 (100) | 1 (62) | 1 (84) | 1 (96) | 1 (98) | 1 (99) | 1 (100) | 1 (100) | 1 (93) | 1 (100) | 2 (39) | 1 (100) | ✗6 (0) |
| Mid Farmer | 1 (100) | 1 (100) | 1 (100) | 1 (71) | 1 (96) | 1 (100) | 1 (99) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (95) | 1 (97) | 1 (100) | 1 (82) |
| Mid zu zweit | 1 (100) | 1 (100) | 1 (100) | 1 (72) | 1 (72) | 1 (98) | 1 (100) | 1 (100) | 1 (100) | 1 (100) | 1 (97) | 1 (100) | 1 (100) | 1 (100) | 1 (76) |

### Wie die frühen Level spannend bleiben

Level 1 bis 6 spielt man nur mit dem Damage-Slot. Level 1–3 bleiben ruhig (Tutorial, erste Keg Hauler). Level 4 bis 6 (`CURVE.earlyFrom`/`earlyTo`) sind anders gebaut: mehr Räuber, doppelt so viele Keg Hauler (wer sie nicht schüttelt, bekommt Bomben ans Tor), die Spitzenwellen kommen als Ansturm (schnellere Ankunft, mehr Räuber gleichzeitig), und die Räuber halten etwas mehr aus. Dazu lässt der Shop Waffen und Hand bis Level 6 nur bis Stufe 2 ausbauen: Man hält die Räuber mit der Hand, nicht mit dem ausgebauten Rad. Nach Level 6 kommen Burg-Stufe 2, der Slow-Slot, Sticky Fondue und Stufe 3 auf einmal, und ab Level 7 sind die Level wieder normal gebaut: Der Ausbau fühlt sich als Erleichterung an.

### Geänderte Zahlen und Gründe

| Wert | Datei | Alt | Neu | Warum |
|---|---|---|---|---|
| Goldpreise der Burg-Stufen 2–7 (`CASTLE_TIERS`) | keep.ts | 400 / 1200 / 4000 / 10000 / 24000 / 50000 | 8000 / 15000 / 24000 / 26000 / 80000 / 150000 (Stufe 7 weiter + 50 Crests) | Mit den alten Preisen war Gold nie der Engpass: Alle Bots, auch Poor, kauften jede Stufe genau am Freischalt-Level, und der Mid-Bot hatte bei Level 9 schon 21 000 Gold übrig. Jetzt ist die Burg das Sparziel: Stufe 2 schluckt das bis Level 6 gesammelte Gold, Stufe 3 braucht Sparen über etwa einen Level, Stufe 5 über ein bis zwei. Erster Versuch mit 30 000 / 40 000 für Stufe 4 / 5: Mid baute Stufe 5 erst bei Level 31; mit 30 000 bei 30, mit 26 000 bei 28–29. Stufe 6 und 7 sind teuer, weil spät Gold im Überfluss da ist; bei Stufe 7 bremsen ohnehin die Wappen. |
| Stufen-Deckel für Waffen und Hand (`TIER_CAP_BY_LEVEL`) | tiers.ts | Stufe 3 ab Start | Stufe 2 ab Start, Stufe 3 ab Level 6 | Mit Rad und Hand auf Stufe 3 ab Level 3 waren Level 1–6 belanglos (Mid: Torleben 100 % in jedem Level). Außerdem gab es danach bis Level 10 nichts zu kaufen (v0.3-Punkt „Leerlauf“). Das erste Upgrade nach Level 1 (Tutorial) bleibt Stufe 2. |
| Frühe Level 4–6 (`CURVE.earlyFrom` 4, `earlyTo` 6, `earlyCount` 0,6, `earlyBombers` 2, `earlyRush` 0,6, `earlyPower` 0,6, `earlyAlive` 6; neue Werte) | worlds/fondue/campaign.ts | gab es nicht | siehe links | Ohne zweiten Slot waren die Level für Mid ohne jede Gefahr. Getestet: Mit `earlyCount` und `earlyPower` 1 (Level 3–8) blieb Poor an Level 3–8 hängen (oft 6 Versuche); mit 0,6 und Level 4–6 nicht mehr. Level 3 (erste Keg Hauler) ist bewusst ausgenommen, Level 7–8 haben schon den Slow-Slot. |
| Mending Horn: Heilung und Nachheilen | weapons.ts | 5–14 %, 0–1 % je s | 4–11,2 %, 0–0,8 % je s (alles × 0,8, Abklingzeit gleich) | C5: Im Waffenvergleich (unten) hielt das Horn das Tor bei 69 % gegenüber 20–34 % der anderen Support-Waffen. Einen Schritt schwächer; die Regel „jeder Stufensprung ändert einen Wert um mindestens 15 %“ bleibt erfüllt (Unit-Test grün). Nach der Änderung: 63 %, weiter vorn. |

Nicht geändert: Kampagnen-Level der Burg-Stufen 3–6 (12, 20, 28, 50 erfüllen die Ziele; die Waffen-Freischalt-Level und die Challenge-Regel hängen daran), Waffen-Freischalt-Level und Käse-Preise (Summe 500, Test grün), Kessel (16) und Adlerhaken (70), Gegnerwerte, Endlos-Wellen und -Belohnung, Hand-Preise.

### Endlos ab Level 10 (Ziel d)

Endlos öffnet jetzt schon nach Level 10 statt mit dem fünften Slot. Gemessen: Der Farmer (spielt vor jedem Level Endlos, solange ihm Gold fehlt) kauft die Burg-Stufen höchstens ein, zwei Level früher als der normale Mid-Bot und schneidet in der Kampagne gleich ab (Farmer: 85 Level im 1. Versuch, nie geschafft 12, Burg-Käufe 6, 12, 20, 28, 51, nie; Mid: 85, 12, 6, 12, 20, 29, 55, nie; 4 Farm-Läufe, 22 Minuten). Grund: Die Burg-Stufen hängen am gewonnenen Level, Waffen und Hand am Stufen-Deckel; mehr Gold hilft über beides nicht hinaus. Deshalb keine Gegenmaßnahme bei Preisen oder Belohnung.

### Ziele auf einen Blick (letzter Lauf)

| Ziel | Messwert | Soll | Ergebnis |
|---|---|---|---|
| A8 Burg-Stufe 2 | Mid baut sie nach Level 6 | Level 6–8 | erfüllt |
| A8 fünfter Slot (Burg-Stufe 5) | Mid baut sie nach Level 29 | Level 20–30 | erfüllt |
| B5 ohne Ausbau | Mid ohne Ausbau scheitert zuerst an Level 15 | vor Level 30 | erfüllt |
| B5 mit Ausbau | Mid scheitert zuerst an Level 70, nie geschafft: 12 | weiter als ohne Ausbau | erfüllt |
| B5/G1 Great spät mehr Versuche | Versuche je Level 1–25 / 26–50 / 51–75 / 76–100: 1 / 1 / 1 / 1.4; Boss 2, sonst 1 | spät und Boss spürbar mehr als früh | erfüllt |
| A3 Farmer | Farmer 76–100: 3.48 Versuche je Level, Tor im Median 5 %, nie geschafft 12 | späte Kampagne nicht mühelos (mehr als 1,2 Versuche oder Tor unter 80 %) | erfüllt |
| E2 zu zweit | Mid zu zweit: 1.83 Versuche je Level, 82 im 1. Versuch; Mid allein: 1.72, 85 | zu zweit nicht leichter | erfüllt |
| B1 Länge früh (1–10) | Median 93 s, 7 von 8 im Bereich | 60–120 s | erfüllt |
| B1 Länge Mitte | Median 205 s, 52 von 61 im Bereich | 180–300 s | erfüllt |
| B1 Länge Boss und Sonder | Median 364 s, 10 von 19 im Bereich | 360–600 s | erfüllt |
| B2 Pausen | längste Strecke ohne lebenden Räuber über alle Zeilen und Versuche: 3.1 s | höchstens 5 s | erfüllt |
| C3 Waffen je Slot | damage 4, slow 4, gate 3, support 4, passive 4 | je Slot mindestens 3 | erfüllt |
| E1 Gold je Minute | Mid easy, Burg L20: 5605; Mid medium, Burg L20: 7250; Mid hard, Burg L20: 8825; Mid easy, Burg L60: 6565; Mid medium, Burg L60: 10153; Mid hard, Burg L60: 16379 | steigt mit der Schwierigkeit | erfüllt |
| A4 Wappen-Grind | Runden bis 50 Wappen, Median: Mid, Kampagne (Level 76 wiederholt) 25; Great, Kampagne (Level 76 wiederholt) 25; Mid, Endlos medium bis Welle 20 25; Great, Endlos medium bis Welle 20 25 | Median 20–30 Runden (Mid, Kampagne) | erfüllt |

### C5: die offenen Punkte aus v0.3

- **Leerlauf im Shop in Level 6–9:** behoben. Bis Level 6 ist der Deckel Stufe 2; mit Level 6 kommen Stufe 3, Burg-Stufe 2 (8000 Gold, schluckt das Ersparte), der Slow-Slot und Sticky Fondue. Ab Level 12 spart man auf Burg-Stufe 3. Spät (ab Level 65) häuft sich Gold weiter an, weil nur noch Stufe 7 mit Wappen offen ist; unverändert, ein Punkt für echtes Spielen.
- **Ungleiche Waffenstärken:** gemessen mit einem eigenen Vergleich (Burg des Mid-Bots nach Level 60, alle Waffen auf Stufe 6, je Slot jede Waffe einzeln angelegt, Level 76–79 und 81–84, je 3 Läufe; Siege von 24 und Torleben im Mittel; Skript nicht im Repo). Deutlich stärker als der Rest ihres Slots: Mending Horn (Support: 24/24, Tor 69 % gegen 19–22/24 und 20–34 %), Sticky Fondue und Snowdrift Cannon (Slow: 68 % und 56 % gegen 27–34 %), Rolling Wheel auf Stufe 6 (Damage: 48 % gegen 20–34 %), Roof Bolter (Passive: 22/24 gegen 7–14/24). Schwach: Storm Bell (7/24, Tor 4 %). Geändert nur das Mending Horn (oben). Ein Versuch, Roof Bolter um 15 % zu schwächen und die Storm Bell um 25 % zu stärken, änderte im Vergleich nichts Messbares und wurde zurückgenommen: Der Unterschied im Passive-Slot liegt vermutlich an der Abwehr von Ballonfahrern und Krähen, nicht am Schaden. Offen für echtes Spielen.
- **Boss-Level-Länge:** unverändert knapp. Boss- und Sonderlevel des Mid-Bots im Median 364 s, 10 von 19 im Bereich (Ziel 360–600 s). Nicht geändert.

### Unsicher und offen (v0.4)

- **Poor bleibt früher hängen:** Poor scheitert zuerst an Level 16 (v0.3: 44) und schafft 49 von 100 Leveln (v0.3: 52). Grund ist vor allem, dass Gate-, Support- und Passive-Slot erst mit Burg-Stufe 3–5 (Level 12–28) kommen statt wie in v0.3 ab Level 4–11. Mid und Great trifft das kaum. Ob echte Spieler im Abschnitt 12–30 zu oft hängen bleiben, zeigt nur echtes Spielen; Stellschraube wären die Kampagnen-Level der Burg-Stufen 3–5 (dann ziehen die Waffen-Freischalt-Level und die Challenge-Regel mit).
- **Burg-Stufe 7** kaufen nur Great (Level 99) und Mid mit Geschmack 6 (Level 100); die anderen nie, weil die Bots ohne gezieltes Grinden kaum Wappen sammeln (wie in v0.3).
- Die frühen Level sind für den Mid-Bot nur leicht gefährlich (niedrigstes Torleben 71 % in Level 4, kein zweiter Versuch). Der Mid-Bot greift schneller als viele Menschen; stärker wollte ich nicht drehen, weil Poor sonst früh hängen bleibt.

## v0.3

Stand: 14.11.2026, Paket P-Balance (Etappe 4), Nachbesserung B5 nach der Prüfung (Etappe 5). Gemessen mit den Bots, `npm run balance`; die vollständigen Zahlen stehen in `docs/balance-latest.md` (maschinenlesbar `docs/balance-latest.json`), dort oben auch die Tabelle „Ziele auf einen Blick“. Die Bots sagen, ob eine Änderung in die richtige Richtung geht; wie sich Menschen schlagen, zeigt nur echtes Spielen.

## Ziele (Auftrag v0.3, Abschnitte 5 und 6)

- **B5:** Die Kampagne wird deutlich schwerer. Ohne Ausbau bleibt der mittlere Bot vor Level 30 stecken, mit Ausbau kommt er weiter; der sehr gute Bot braucht in späten Leveln und Boss-Leveln spürbar mehr Versuche als in frühen.
- **A3:** Wer nur im Endlos-Modus Gold farmt, schafft die späte Kampagne nicht mühelos.
- **B1:** Levellängen mit dem mittleren Bot: frühe Level 1–2 Minuten, Mitte 3–5, Boss- und Sonderlevel 6–10.
- **B2:** Nie mehr als 5 Sekunden ohne lebenden Räuber, über alle 100 Level.
- **C3:** In jedem Slot nutzen die Bots mindestens 3 Waffen.
- **E1:** Gold je Minute je Endlos-Schwierigkeit, höhere Schwierigkeit zahlt mehr.
- **E2:** Zu zweit (Mid + Mid) ist es nicht leichter als allein.
- **A4:** Im Median 20–30 Runden mit dem Adlerhaken bis zum ersten Stufe-7-Upgrade.

## Methode

Simulation ohne Grafik, 60 Schritte je Sekunde. Die Bots (`src/bots/`) benutzen nur Befehle, die auch ein Mensch auslöst (greifen, loslassen, schütteln, Waffe antippen) und sehen nichts, was ein Spieler nicht sieht. `npm run balance` startet `tests/balance/balance.test.ts` (nicht Teil von `npm test`, etwa 5 Minuten). Teilläufe: `BALANCE_PART=campaign|endless|grind`, `BALANCE_ROWS=Mid,Great`, `BALANCE_LEVELS=1-50`, `BALANCE_RUNS=20`.

**Fortschritt der Bots (neu, `src/bots/armoury.ts`, `src/bots/campaignRunner.ts`).** Zwischen den Versuchen gibt der Bot wie ein Spieler aus, nur über `src/modes/progress.ts` (`quote`, `buy`, `equip`): zuerst alles, was er mit Käse freischalten kann (billigstes zuerst), dann mit Gold die billigste Stufe von Hand, Burg und den Waffen, die er spielt oder spielen will, bis nichts mehr passt. Jeder Bot hat einen **Geschmack** (Zahl `personality`): eine feste Vorliebe je Waffe zwischen 0,55 und 1,6. Er wählt je Slot die Waffe mit dem besten Wert aus Geschmack und Stärke auf der erlaubten Höchststufe (Stärke aus der Waffentabelle, weich gewichtet, weil sie zwischen Waffenarten nur grob vergleichbar ist; Mid achtet weniger darauf als Great, Poor gar nicht; Mid wechselt nur für eine um 25 % bessere Waffe). Eine neue Waffe legt er erst an, wenn sie höchstens eine Stufe unter der alten liegt; bis dahin baut er sie aus. Nach 2 verlorenen Versuchen eines Levels spielt er Endlos-Läufe für Gold (sobald Endlos offen ist und ihm Gold fehlt), dann versucht er es wieder.

**Zeilen der Kampagne** (Level 1–100 nacheinander, ein Profil je Zeile, höchstens 6 Versuche je Level; danach gilt ein Level als geschafft, damit die Messung weiterläuft):

| Zeile | Bot | Besonderheit |
|---|---|---|
| Poor solo | schwach | Geschmack 3, farmt Easy, wenn er feststeckt |
| Mid solo, Mid solo B, Mid solo C | mittel | Geschmack 1, 2 und 6 |
| Great solo | sehr gut | Geschmack 4, farmt Hard |
| Mid ohne Ausbau | mittel | schaltet frei und legt an, gibt aber nie Gold aus |
| Mid Farmer | mittel | spielt vor jedem Level Endlos, solange ihm Gold fehlt |
| Mid zu zweit | zwei mittlere | Burg des Hosts, Koop-Faktor |

**Endlos:** 20 Läufe je Zeile mit der Burg, die „Mid solo“ nach Level 20 und nach Level 60 hatte, Abbruch nach Welle 60. Gold je Minute = Gold eines Laufs durch seine Dauer.

**A4 Wappen-Grind:** Burg von „Mid solo“ nach Level 75 (Adlerhaken gekauft). 20 Spieler je Zeile spielen Runden (Level 76 wiederholt, oder Endlos Medium bis Welle 20), bis 50 Wappen (`CREST_COST`) zusammen sind. Gemessen werden Median der Runden, Wappen je Runde und die Trefferquote am Haken (`perchHits / perchTries`, aus `src/sim/stations.ts`).

## Ergebnisse (Lauf vom 14.11.2026, 09:04)

| Ziel | Messwert | Ergebnis |
|---|---|---|
| B5 ohne Ausbau | Mid ohne Ausbau scheitert zuerst an Level 15, gewinnt 27 von 100 | erfüllt |
| B5 mit Ausbau | Mid (Geschmack 1) scheitert zuerst an Level 70, B an 80, C erst an 100; nie geschafft 12 / 9 / 1 Level | erfüllt (weiter als ohne Ausbau) |
| B5 Great | Versuche je Level 1–25 / 26–50 / 51–75 / 76–100: 1 / 1 / 1 / 1,4; Boss-Level 2,0, sonst 1,0 (Level 90 und 100 in 6 Versuchen nicht geschafft, Level 80 im ersten mit Tor 53 %) | erfüllt (Schwelle im Test: spät mindestens 1,3, Boss mindestens 0,3 über sonst) |
| A3 Farmer | Level 76–100: 3,5 Versuche je Level, Tor im Median 5 %, 12 Level nie geschafft | erfüllt |
| B1 Längen (Mid) | früh Median 89 s (7 von 8 im Bereich), Mitte 203 s (52 von 61), Boss und Sonder 364 s (10 von 19) | erfüllt, Boss knapp |
| B2 Pausen | längste Strecke ohne lebenden Räuber über alle Zeilen und Versuche 2,6 s | erfüllt |
| C3 Waffen je Slot | Schaden 4, Bremsen 4, Tor 3 (Alphorn nur bei Poor mit Geschmack 3), Support 4, Passiv 4 | erfüllt, Tor knapp |
| E1 Gold je Minute (Mid) | Burg L20: Easy 6230, Medium 7944, Hard 10260; Burg L60: 6565 / 10153 / 16379 | erfüllt |
| E2 zu zweit | Mid zu zweit 1,86 Versuche je Level, 82 im ersten Versuch; Mid allein 1,72 und 85 | erfüllt |
| A4 Wappen-Grind | Median 25 Runden bis 50 Wappen, Mid und Great, Kampagne und Endlos gleich | erfüllt |

Weitere Beobachtungen:
- **Poor solo** kommt ohne Mühe bis in die Mitte, scheitert zuerst an Level 44, gewinnt 52 von 100 und schafft ab Level 51 kaum noch etwas. Gewollt: Der schwache Bot ist schwächer als die meisten Menschen.
- **Mid solo** gewinnt die ersten 69 Level fast immer im ersten Versuch; ab Level 70 brauchen Boss-Level mehrere Versuche, von Level 92 an schafft „Mid solo“ (Geschmack 1) die meisten Level nicht mehr. Wie weit Mid kommt, hängt stark von der Waffenwahl ab: Geschmack 6 (Rolling Wheel, Sticky Fondue, Hedgehog Gate, Mending Horn, Pinecone Catapult) schafft 99 Level.
- **Great solo** wird erst ab etwa Level 80 gefordert (Tor im Median 79 % in Level 76–100) und scheitert nur an Level 90 und 100. Level 90 lag ohne `bossPowerLate` auf der Kippe: Ein Wiederholungslauf der Prüfung gab dort 3 Versuche statt „nie“ und damit spät nur 1,28 Versuche je Level (B5 knapp verfehlt). Mit `bossPowerLate` 0,1, 0,2 und 0,3 gaben alle Läufe 1,4 und Boss 2,0; gewählt ist 0,2 als Abstand zur Kippe.
- **Gold:** Ab der Mitte hält der Stufen-Deckel (`TIER_CAP_BY_LEVEL`), nicht das Gold, den Ausbau auf. Nach jeder Anhebung des Deckels (Level 10, 25, 45) ist das Gold kurz knapp, danach sammelt es sich an. Darum farmt der Farmer kaum: Gold fehlt ihm fast nie, und mehr Gold hilft über den Deckel hinaus nicht.
- **Wappen** kommen nur aus Runden mit dem Adlerhaken; jede Runde bringt höchstens 2, und die Bots erreichen sie in fast jeder Runde. Die Trefferquote am Haken liegt bei 22 % (Mid) und 23 % (Great).

## Geänderte Werte

| Wert | Datei | Alt | Neu | Warum |
|---|---|---|---|---|
| Stärke ab Level 40 zusätzlich, wächst mit dem Quadrat (`CURVE.powerLate`, `powerLateFrom`, neue Funktion `powerOf`) | worlds/fondue/campaign.ts | gab es nicht (Level 100: Stärke 5,95) | +3 bei Level 100 (Level 100: 8,95; Level 70: 5,2) | Mid und Great gewannen alle 100 Level im ersten Versuch; späte Level verlangen jetzt Stufe 6 und 7 |
| Boss-Level stärker (`CURVE.bossPower`) | worlds/fondue/campaign.ts | 1,12 | 1,45 | Boss-Level brauchten nicht mehr Versuche |
| Späte Boss-Level stärker (`CURVE.bossPowerLate`, neue Funktion `bossFactorOf`; Etappe 5) | worlds/fondue/campaign.ts | gab es nicht (Boss-Faktor überall 1,45) | +0,2 bei Level 100, wächst ab Level 40 mit dem Quadrat (Level 80: 1,54; 90: 1,59; 100: 1,65; Level 50: +0,01, 60: +0,02, 70: +0,05) | B5: Great brauchte spät nur 1,28 Versuche je Level, weil Level 90 auf der Kippe lag; frühe Bosse bleiben gleich |
| Geplante Dauer Boss-Level (`secondsBossMin`) | worlds/fondue/campaign.ts | 360 s | 450 s (höchstens weiter 600 s) | Gemessen dauerten Boss-Level nur 4–5 Minuten, Ziel 6–10 |
| Geplante Dauer Sonderlevel (`secondsSpecialMin/Max`) | worlds/fondue/campaign.ts | 360–470 s | 430–560 s | dto. |
| Gold je Kill wächst mit der Levelstärke (`CAMPAIGN_SCALING.goldPerPower`) | campaignScaling.ts | 0,7 | 0 | Mid hatte am Ende 6,4 Millionen Gold übrig; späte Level bringen ohnehin mehr Räuber |
| Goldpreise der Waffenstufen 2–7 (`WEAPON_TIER_GOLD`) | tiers.ts | 300 / 800 / 2000 / 4800 / 11000 / 24000 | 300 / 900 / 3000 / 9000 / 24000 / 50000 | Hohe Stufen sollen etwas kosten; frühe Stufen bleiben gleich (erstes Upgrade nach Level 1) |
| Goldpreise der Burg-Stufen 4–7 (`CASTLE_TIERS`) | keep.ts | 3000 / 7000 / 15000 / 30000 | 4000 / 10000 / 24000 / 50000 | dto. |
| Wappen für Stufe 7 (`CREST_COST`; Burg und Hand nutzen jetzt denselben Wert) | tiers.ts, keep.ts, hand.ts | 40 | 50 | A4: mit 2 je Runde genau 25 Runden |
| Wappen je Runde höchstens (`CRESTS.perRun`) | crests.ts | 4 | 2 | Mit 4 reichten 10 Runden (die Bots erreichen die Grenze fast immer) |
| Koop-Faktor der Räuberzahl (`COOP.countFactor`) | waves.ts | 1,8 | 2,4 | Mid zu zweit gewann alle 100 Level im ersten Versuch, allein nur 85 |
| Mending Horn: Heilung und Nachheilen je Stufe, Abklingzeit | weapons.ts | heilt 8–22 % sofort, 0–2,2 % je s, Abklingzeit 28–22 s | 5–14 %, 0–1 % je s, 32–26 s | Auf Stufe 6 heilte es etwa 1,4 % des Tors je Sekunde und machte lange Level belanglos; jeder Stufensprung ändert weiter einen Wert um mindestens 15 % (A5) |

Nicht geändert: Gegnerwerte (`enemies.ts`), Endlos-Wellen und -Schwierigkeiten (`waves.ts`), Hand-Goldpreise (`hand.ts`), Stufen-Deckel (`TIER_CAP_BY_LEVEL`), Gold je Gegner im ersten Level (Tutorial: das erste Upgrade nach Level 1 bleibt bezahlbar).

## A4 Wappen-Grind

Messmethode wie oben unter „Methode“ (`BALANCE_PART=grind npm run balance`). Ergebnis: Median 25 Runden bis 50 Wappen, bei Mid und Great, in der Kampagne und im Endlos gleich, weil die Bots die Grenze von 2 Wappen je Runde fast immer erreichen. Die Runde mit dem Haken dauert etwa 4 Minuten (Level 76) oder 3,5 Minuten (Endlos bis Welle 20), also etwa 100 Minuten Spielzeit je Stufe-7-Upgrade. Gemessen mit dem gezielten Wurf von P-Hände (Commit `f182e2d`: Haken-Radius 34, Mindesttempo 450). Die Trefferquote je Wurf in Hakennähe liegt bei etwa 22 %.

## Unsicher und offen

- **Mid scheitert spät, je nach Waffenwahl.** Mid mit Geschmack 1 schafft 12 der letzten 31 Level nie, mit Geschmack 6 fast alles. Ob die letzten zehn Level für normale Menschen zu schwer sind, müssen Tim und Lenny spielen. Stellschraube: `CURVE.powerLate` (3), `bossPower` (1,45) und `bossPowerLate` (0,2).
- **Mending Horn und Pinecone Catapult wirken stark.** Der Geschmack mit beiden kommt fast ohne Niederlage durch. Die Waffen sind untereinander noch nicht gleich stark; die Bots messen das nur grob.
- **Gold verliert spät an Bedeutung.** Ab Level 65 sammelt sich Gold an, weil nur noch Stufe 7 (mit Wappen) offen ist. Der Farmer unterscheidet sich darum kaum von Mid. Wenn Gold spät mehr zählen soll, müsste Stufe 7 mehr Gold kosten oder der Deckel feiner werden.
- **Wappen-Grind ist für alle gleich lang,** weil die Bots fast jede Runde 2 Wappen holen. Menschen, die schlechter zielen, brauchen länger. Ob 2 je Runde sich zu knapp anfühlt, ist offen.
- **Tor-Slot knapp bei C3:** Gate Mortar dominiert; Hedgehog Gate und Alphorn werden nur von einzelnen Geschmäckern genutzt, Cheese Cascade und Battering Log kaum.
- Die Bots sind Annäherungen; gemessen wurde nur mit Feldbreite 1280.
