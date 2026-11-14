# Balance (v0.3)

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
