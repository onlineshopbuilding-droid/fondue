# Balance

Stand: Runde „Große Runde“ mit den neuen Regeln (Tag endet erst, wenn alle Räuber tot sind; Kessel und Greifenhorst sind eine Weile belegt; Waffen sitzen auf der Burg und werden gezielt abgefeuert; Feldbreite 1280 bis 1760).

## Ziele auf Medium

| Bot | Ziel (Median) |
|---|---|
| Poor (schwacher Spieler) | Tag 6–8, nur wenige deutlich weiter |
| Mid (normaler Spieler) | etwa Tag 24 (21–27) |
| Great (sehr guter Mensch, keine Maschine) | etwa Tag 40 (36–44) |
| Zu zweit (gleiche Stufe) | ähnlich wie solo, eher etwas schwerer, ab Tag 1 genug Arbeit für zwei Hände |

Dazu: Ergebnisse müssen spreizen (Tempo, Genauigkeit, Taktik, Einkauf und Waffeneinsatz zählen), die ersten Tage sollen fordern, Feldbreite und Kessel-Variante dürfen das Ergebnis nicht entscheiden, und das Spiel soll für sehr gute Spieler nicht an einer eingebauten Wand enden.

## Methode

Simulation ohne Grafik: `tests/balance/harness.ts` startet Spiele mit Bots, 60 Schritte pro Sekunde. Bots benutzen nur dieselben Befehle wie ein Mensch (`press`, `release`, `pressSlot`, `setHand`, `buy`, `ready`), sehen nichts, was ein Spieler nicht sieht, und brauchen Zeit für alles: Reaktion, Handweg, Festhalten, Loslassen. Neu ist, dass ein Wurf oder Schuss danebengehen kann.

`npm run balance` rechnet je Zeile 30 Läufe und schreibt `docs/balance-latest.md`. Der Lauf dauert etwa zwei Minuten und läuft nicht in `npm test`.

### Die drei Bots (`src/sim/bot.ts`)

| Eigenschaft | Poor | Mid | Great |
|---|---|---|---|
| Reaktion | 0,29 s | 0,27 s | 0,16 s |
| Handtempo (Welt-Pixel/s) | 1500 | 1900 | 2700 |
| Griffe pro Sekunde (Mittel über den Tag) | 0,98 | 1,08 | 1,44 |
| Griffgenauigkeit, Streuung | 20 px | 13 px | 7 px |
| Fehlklick | 9 % | 5 % | 2 % |
| Zu schwacher Wurf | 12 % | 8 % | 2,5 % |
| Wen zuerst | was gerade nah ist | vorne am Tor | wer dem Tor am meisten schadet, Bomber bevorzugt, weicht dem anderen aus |
| Blasen und Schatten | klickt auch ins Leere | wartet ab | wartet ab |
| Kessel nutzen | selten | oft | fast immer, achtet auf „belegt“ |
| Greifenhorst | nie | selten | oft |
| Waffen | spät, verstreut, feuert auch auf einzelne | alle 1,8 s geprüft, grob gezielt | alle 0,9 s, genau, zielt mit Vorhalt in Gruppen |
| Yeti zu zweit | nie | manchmal | immer |
| Einkauf | zufällig, was gerade geht | feste sinnvolle Reihenfolge | Opfer zuerst, spart auf das nächste wichtige Teil |

Great ist bewusst kein Roboter: Zwischen zwei Aktionen vergehen mindestens 150 ms Reaktion, dazu Handweg und Festhalten; im Mittel über den ganzen Tag sind es 1,4 Griffe pro Sekunde.

## Ergebnis (Medium, 30 Läufe je Zeile, Abbruch Tag 70)

| Bot | Spieler | Median | P10–P90 | Min–Max | Upgrades | Ziel erreicht |
|---|---|---|---|---|---|---|
| Poor | solo | 6,5 | 4–9 | 3–12 | 6,0/22 | ja, knapp innerhalb |
| Mid | solo | 22 | 15–26 | 15–29 | 18,7/22 | ja |
| Great | solo | 38 | 35–41 | 35–42 | 22/22 | ja |
| Poor | zu zweit | 8 | 5–11 | 3–12 | 9,9/22 | etwa gleich wie solo |
| Mid | zu zweit | 24 | 14–30 | 12–32 | 20,4/22 | etwa gleich, etwas leichter |
| Great | zu zweit | 33,5 | 29–37 | 27–40 | 22/22 | etwas schwerer als solo |

Vollständige Zeilen stehen in `docs/balance-latest.md`.

| Nebenprüfung | Median | Bewertung |
|---|---|---|
| Mid solo Easy | 36,5 (31–39) | deutlich leichter, sinnvoll |
| Mid solo Hard | 14 (13–14) | deutlich schwerer, sinnvoll; viele Läufe enden am ersten Yeti-Tag |
| Mid solo Feld 1560 | 23 (15–28) | wie 1280 (22) |
| Great solo Feld 1560 | 40 (36–41) | wie 1280 (38) |
| Mid solo Feld 1760 | 23 (15–28) | wie 1280 (22) |
| Great solo Feld 1760 | 39,5 (36–41) | wie 1280 (38) |
| Mid solo Kessel hinten | 21,5 (14–27) | Kessel hinten ist genauso spielbar |
| Great solo Kessel hinten | 38 (34–40) | Kessel hinten ist genauso spielbar |

### Erste Tage

Raider pro Sekunde, Medium (Tagesdauer 50 s):

| Tag | solo | zu zweit | je Hand zu zweit |
|---|---|---|---|
| 1 | 0,80 | 1,68 | 0,84 |
| 2 | 0,94 | 2,04 | 1,02 |
| 3 | 1,08 | 2,42 | 1,21 |
| 5 | 1,36 | 3,12 | 1,56 |
| 7 | 1,64 | 3,78 | 1,89 |

Zu zweit bekommt jede Hand von Tag 1 an so viel zu tun wie allein, ab Tag 3 mehr. Dazu kommen Rudel: Etwas mehr als die Hälfte der Räuber erscheint in Gruppen statt gleichmäßig, damit der Tag Wellen hat. Mid und Great verlieren an den Tagen 1–3 trotzdem keine Torpunkte; sie sind schneller als der Nachschub. Fordernd ist das nur für Spieler unterhalb von Mid (Poor: Tor Tag 3 bei 83 %, Tag 5 bei 45 %). Wie sich Menschen tatsächlich schlagen, lässt sich so nicht messen, siehe „Unsicher“.

### Wirtschaft

Gold pro Tag: Tag 1 etwa 400, Tag 5 etwa 1000, Tag 10 etwa 1700, Tag 20 etwa 3700 (solo, Mid und Great fast gleich, weil alle Räuber sterben müssen). Mid besitzt zu Beginn von Tag 5 vier Upgrades, von Tag 10 neun, von Tag 20 siebzehn. Great hat um Tag 25 alles außer dem Adamant-Tor und kauft dieses zwischen Tag 30 und 35. Die Preise blieben unverändert; nichts ist an Tag 5 geschenkt, jedes Teil ist erreichbar. Opfergaben gibt es für Great reichlich (am Ende über 400 übrig); das knappe Gut ist für ihn Gold. Zu zweit gibt es weniger Gold pro Abschuss (`COOP.goldFactor`), sonst wäre dort alles sehr schnell gekauft.

### Lange Läufe

Die Schwierigkeit wächst auch nach Tag 40 gleichmäßig weiter (Anzahl, Torschaden, Lebenspunkte, Tempo), ohne plötzliche Wand. Great kommt mit allen Upgrades auf Tag 35 bis 42. Sehr viel weiter kommt man erst mit neuen Upgrades für einen späteren Endlos-Modus.

## Geänderte Werte

| Wert | Datei | Alt | Neu | Warum |
|---|---|---|---|---|
| Räuber Tag 1 (`DAY.base`) | waves.ts | 34 | 40 | Mehr Druck ab dem ersten Tag |
| Räuber pro Tag bis Tag 12 (`DAY.perDay`) | waves.ts | 12 | 7 | Poor und Mid überleben die erste Woche, spätere Tage unverändert steil |
| Rudel (`DAY.packShare`, `packs`, `packsPerDays`, `packSpread`) | waves.ts | gab es nicht | 0,55 / 3 / 6 / 3 s | Wellen statt gleichmäßigem Tropfen, `spawn.ts` |
| Lebenspunkte pro Tag (`DAY.hpGrowth`) | waves.ts | +12 % | +8 % | Waffen bleiben spät wirksam |
| Yeti Lebenspunkte | enemies.ts | 1400 | 800 | Solo ohne Zuheben überhaupt schaffbar |
| Yeti Torschaden pro Schlag | enemies.ts | 60 | 40 | Sonst Wand am ersten Yeti-Tag |
| Koop-Faktor Anzahl (`COOP.countFactor`) | waves.ts | 1,9 | 2,3 | Zwei Hände haben mehr zu tun |
| Koop spät: Faktor sinkt auf `lateFactor` zwischen `easeFrom` und `easeTo` | waves.ts | gab es nicht | 1,4 zwischen Tag 22 und 36 | Waffen teilen sich die Abklingzeit, die zweite Hand hilft spät weniger |
| Koop früh: Zuschlag je Tag 1–4 (`COOP.earlyAdjust`) | waves.ts | gab es nicht | −8, −6, −3, 0 | Poor-Paar überlebt Tag 1 |
| Koop Gold pro Abschuss (`COOP.goldFactor`, Einzeiler in `sim.ts`) | waves.ts, sim.ts | 1,0 | 0,7 | Doppelt so viele Räuber brachten doppelt so viel Geld |
| Schnellstart Tag 10 / 20 / 30 | quickstart.ts | geschätzt | gemessen (Mid auf Medium, Tag 30 von Mid auf Easy) | Passt jetzt zu echten Läufen |
| Bot-Profile | bot.ts | Beginner/Average/Pro, alte Befehle | Poor/Mid/Great, neue Befehle | Neue Regeln, drei Stufen statt alter Schätzungen |

Unverändert: Waffenwerte, Preise, Tagesdauer, Schaden- und Tempowachstum.

## Unsicher und offen

- Bots sind Annäherungen. Menschen zielen anders, lernen dazu und lassen sich ablenken. Die Tage sind Orientierung, kein Versprechen. Mit Tim und Lenny sollte vor allem der Eindruck der Tage 1–3 und das Gefühl am Kessel geprüft werden.
- **Breites Feld:** Mit voller Tempo-Anpassung (gleiche Laufzeit bis zum Tor) fiel Mid auf Feld 1760 auf Median 15. Räuber liefen 43 % mehr Pixel pro Sekunde, Griffe und Waffenradien sind aber in Welt-Pixeln fest. Mit halber Anpassung (`FIELD.speedCompensation` = 0,5) liegen 1560 und 1760 auf Höhe von 1280, siehe Tabelle. Ein breites Handy bringt also keinen spürbaren Vorteil und keinen Nachteil.
- Mid zu zweit kommt auf Tag 24 (solo 22), Great zu zweit auf 35 (solo 38). Das Ziel „ähnlich“ ist erreicht, ein Unterschied zwischen den Stufen bleibt. Spät begrenzt vermutlich die Obergrenze von 200 lebenden Räubern (`DAY.maxAlive`) den Druck, das ist nicht eigens gemessen.
- Solo Mid hat um Tag 14–16 einen Knick (erster Yeti-Tag, bei Hard besonders). Das ist gewollt spürbar, aber Spieler ohne starke Waffen können dort scheitern.
- Der Abstand zwischen Great und sehr guten Menschen bleibt offen. Echte Spiele bleiben die Wahrheit.
