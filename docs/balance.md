# Balance

Stand: großes Update (Kampagne mit 100 Leveln, 16 Waffen mit 5 Stufen, Gewicht und Hand-Stufen, Schütteln, Endlos mit Zufall). Gemessen mit den Bots, Lauf vom 12.11.2026 (`docs/balance-latest.md`, Commit `a935f43`). Die Zahlen sagen, ob eine Änderung in die richtige Richtung geht; wie sich Menschen schlagen, zeigt nur echtes Spielen.

## Ziele (Auftrag, Abschnitt 15)

**Kampagne**
- Ein mittlerer Spieler schafft die meisten Level beim ersten oder zweiten Versuch; Boss-Level brauchen spürbar mehr.
- Ein schwacher Spieler kommt durch die ersten Level und stößt dann an Grenzen, die sich durch Upgrades lösen lassen.
- Ein sehr guter Spieler wird auch spät noch gefordert.
- Kein Level ist unschaffbar oder belanglos. Die Kurve steigt über 100 Level gleichmäßig, mit spürbaren Höhepunkten.

**Stern-Wirtschaft**
- Freischaltungen und Stufen kommen in gutem Takt: regelmäßig etwas Neues, nie alles früh fertig, keine langen Durststrecken.
- Koop und Wiederholungen erlauben kein Farmen.

**Endlos (Medium)**
| Bot | Ziel (Median) |
|---|---|
| Poor (schwacher Spieler) | meist nicht über Tag 8 |
| Mid (normaler Spieler) | um Tag 24 |
| Great (sehr guter Spieler, kein Roboter) | um Tag 40, mit fünf Stufen darf er weiter kommen; kein eingebautes Ende |
| Zu zweit | ähnlich schwer wie allein, eher etwas schwerer, ab Tag 1 genug zu tun für zwei |

Easy und Hard liegen sinnvoll daneben. Die Ergebnisse sollen streuen: Können, Tempo, Einkauf und Waffeneinsatz entscheiden.

## Methode

Simulation ohne Grafik, 60 Schritte pro Sekunde. Die Bots (`src/bots/`) benutzen nur die Befehle, die auch ein Mensch auslöst: greifen, loslassen, schütteln, Waffe antippen, kaufen, bereit. Sie sehen nichts, was ein Spieler nicht sieht, und brauchen Zeit für alles (Reaktion, Handweg, Festhalten).

`npm run balance` startet `tests/balance/balance.test.ts` (nicht Teil von `npm test`, dauert etwa eine Minute) und schreibt `docs/balance-latest.md` und `docs/balance-latest.json`. Die Ergebnisse erscheinen auch auf der Entwickler-Übersicht unter `/fondue/dev/`.

- **Endlos:** 30 Läufe je Zeile, Abbruch nach Tag 70, Feldbreite 1280.
- **Kampagne:** Level 1 bis 100 in Reihenfolge mit einem Profil je Zeile (`src/bots/campaignRunner.ts`). Der Bot gibt seine Sterne zwischen den Leveln aus (`src/bots/armoury.ts`). Höchstens 6 Versuche je Level; ein Level ohne Sieg gilt danach als geschafft, damit die Messung weiterläuft.

### Die drei Bots (`BOT_SKILLS` in `src/bots/skills.ts`)

| Eigenschaft | Poor | Mid | Great |
|---|---|---|---|
| Reaktion | 0,29 s | 0,27 s | 0,16 s |
| Handtempo (Welt-Pixel/s) | 1500 | 1900 | 2700 |
| Griffgenauigkeit, Streuung | 20 px | 13 px | 7 px |
| Fehlklick | 9 % | 5 % | 2 % |
| Zu schwacher Wurf | 12 % | 8 % | 2,5 % |
| Wen zuerst (`tactics`) | was nah ist | teils taktisch | wer dem Tor am meisten schadet |
| Kessel / Haken | selten / nie | oft / selten | fast immer / oft |
| Waffen | alle 5 s geprüft, auch für Einzelne | alle 1,8 s, ab 3 Räubern in Reichweite | alle 0,9 s, ab 4 Räubern |
| Keg Hauler schütteln | 25 %, 1,5 s | 60 %, 1,1 s | 90 %, 0,7 s |
| Gleicht schwere Räuber beim Wischen aus | wenig (0,3) | meist (0,7) | ganz (1) |
| Yeti zu zweit | nie | manchmal | immer |
| Einkauf | zufällig | feste Reihenfolge | plant voraus |

## Ergebnisse

### Endlos (Medium, wenn nicht anders angegeben)

| Zeile | Median | P10–P90 | Min–Max | Ziel | Bewertung |
|---|---|---|---|---|---|
| Poor solo | 6 | 4–9 | 4–10 | meist nicht über 8 | erreicht |
| Mid solo | 28,5 | 24–44 | 15–46 | um 24 | etwas zu leicht, streut stark |
| Great solo | 48,5 | 27–51 | 25–52 | um 40, darf weiter | erreicht |
| Poor zu zweit | 7 | 5–9 | 2–11 | wie solo | erreicht |
| Mid zu zweit | 41 | 15–44 | 13–46 | wie solo oder schwerer | **zu leicht** (solo 28,5) |
| Great zu zweit | 42,5 | 24–49 | 24–51 | wie solo oder schwerer | erreicht (solo 48,5) |
| Mid solo Easy | 34 | 29–54 | 27–58 | leichter als Medium | erreicht |
| Mid solo Hard | 23 | 14–28 | 11–33 | schwerer als Medium | erreicht |

Gold pro Tag (Mid solo): etwa 400 an Tag 1, 900 an Tag 5, 1650 an Tag 10, 3400 an Tag 20, 6100 an Tag 30. Mid und Great nutzen im Endlos meist dieselben fünf Waffen (Wheel, Stomper, Comet, Mortar, Bolter; Great statt Mortar und Bolter Bellows und Beacon). Ob die anderen elf Waffen genauso gut sind, sagen die Bots nicht; sie kaufen nach fester Reihenfolge.

### Kampagne

| Zeile | 1. Versuch | 2. Versuch | später | nie |
|---|---|---|---|---|
| Poor solo | 12 | 1 | 3 | 84 |
| Mid solo | 84 | 11 | 1 | 4 |
| Great solo | 100 | 0 | 0 | 0 |
| Mid zu zweit | 89 | 5 | 1 | 5 |

- **Mid solo:** schafft 95 von 100 Level im ersten oder zweiten Versuch. Nie geschafft: Level 92, 96, 97 und 99; Level 100 erst im sechsten Versuch. Boss-Level enden oft knapp (Tor am Ende: Level 50 bei 25 %, 60 bei 37 %, 80 bei 4 %), brauchen aber selten einen zweiten Versuch.
- **Great solo:** gewinnt alle 100 im ersten Versuch; nur in einzelnen späten Leveln sinkt das Tor spürbar (Level 73: 87 %, 80: 71 %, 98: 86 %, 100: 69 %).
- **Poor solo:** gewinnt bis Level 13 (Level 9 im fünften Versuch), ab Level 14 fast nichts mehr; Ausreißer Level 15, 22 und 25.
- **Mid zu zweit:** etwas leichter als allein (89 statt 84 im ersten Versuch). Nie geschafft: 43, 92, 96, 97, 100.
- Am Ende hat jeder Bot Hand-Stufe 3; Mid und Great haben ihre fünf Hauptwaffen auf Stufe 4 bis 5 und 28 Sterne übrig.

Die Tabelle je Level steht in `docs/balance-latest.md`.

## Was noch nicht stimmt

- **Der sehr gute Spieler wird spät kaum gefordert.** Great gewinnt jedes Level im ersten Versuch. Ziel war, dass er auch spät noch gefordert wird. Ansatz: spätere Level und Boss-Level stärker (`CURVE.powerPerLevel`, `bossPower`), ohne Mid zu überfordern.
- **Der schwache Spieler bleibt um Level 12 bis 14 stecken.** Ziel war, dass Upgrades ihm über solche Grenzen helfen. Er hat am Ende 4 Sterne übrig und verteilt seine Stufen auf viele Waffen. Ansatz: Der schwache Bot kauft schlechter ein als ein Mensch, der nach mehreren Niederlagen gezielt eine Waffe verbessert; zu prüfen ist, ob die Kurve um Level 14 bis 20 flacher werden muss (Level 14 „Hoppers only“ ist das erste unüberwindbare Level).
- **Mid zu zweit im Endlos ist zu leicht** (Median 41 statt etwa 28,5 wie allein). In der Kampagne ist zu zweit ebenfalls etwas leichter. Ansatz: `COOP.lateFactor` (nur Endlos), `COOP.goldFactor` (beide Modi) oder `COOP.campaignFactor` (nur Kampagne) nachschärfen.
- **Mid solo im Endlos liegt mit 28,5 etwas über dem Ziel 24** und streut sehr breit (24 bis 44).
- **Boss-Level brauchen kaum mehr Versuche** als normale Level, sie enden nur knapper.
- **Wenig Waffenvielfalt bei den Bots:** Mid und Great kaufen fast nur fünf von 16 Waffen. Das liegt an ihren festen Einkaufslisten (`src/bots/shopper.ts`); ob echte Entscheidungen entstehen, müssen Tim und Lenny beim Spielen beurteilen.
- Koop wurde nur mit „Mid zu zweit“ in der Kampagne gemessen. Dass ein Gast durch viel Koop nicht unverhältnismäßig viele Sterne bekommt, folgt aus den Regeln (E-038: einmal je Level die Hälfte), ist aber nicht eigens gemessen.

## Geänderte Werte

Geändert im Balance-Schritt (Commit `a935f43`). „Alt“ ist der Stand davor, also der erste Entwurf des Updates.

| Wert | Datei | Alt | Neu | Warum |
|---|---|---|---|---|
| Kampagne: Einstieg der Levelstärke an Tag 1/2/3 (`CAMPAIGN_SCALING.easeIn`) | src/modes/campaign.ts | gab es nicht | 0,2 / 0,55 / 0,85 | Jedes Level beginnt mit leeren Händen (E-036) |
| Kampagne: Torschaden-Wachstum je Tag im Level (`damageGrowth`) | src/modes/campaign.ts | 0,10 | 0,14 | Die letzten Tage eines Levels sollen fordern |
| Räuber je Level (`CURVE.countPerLevel`) | campaign.ts (Welt) | 0,8 (linear, mal Tagesfaktor) | 6 × (Level − 1) hoch 0,75 | Früh schneller, spät langsamer (E-037) |
| Kurvenform (`CURVE.countPower`) | campaign.ts (Welt) | gab es nicht | 0,75 | dto. |
| Anteil der Level-Räuber an Tag 1, je Tag mehr, höchstens (`levelShareDay1`, `levelSharePerDay`, `levelShareMax`) | campaign.ts (Welt) | gab es nicht | 0,3 / 0,35 / 1,7 | Erste Tage klein in jedem Level |
| Stärke je Level (`CURVE.powerPerLevel`) | campaign.ts (Welt) | 0,035 | 0,05 | Spätere Level fordern mehr |
| Boss-Tag: Räuber-Faktor (`bossDayCount`) | campaign.ts (Welt) | 1,25 | 1,8 | Boss-Level als Höhepunkt |
| Boss-Level stärker (`bossPower`) | campaign.ts (Welt) | gab es nicht | 1,12 | dto. |
| „Air raid“ | campaign.ts (Welt) | Level 38 | Level 43 (38 ist jetzt „Night raid“) | Erst nach Turm-Slot und Roof Bolter (Level 39) |
| Sternpreise der Waffenstufen 2–5 (`STARS.weaponTier`) | stars.ts | 3 / 6 / 10 / 15 | 5 / 12 / 21 / 32 | Stufen nicht zu früh fertig |
| Offerings für Waffen im Lauf (`buyOfferings`) | weapons.ts | z. B. Comet 8, Bellows 12, Bell 10 | halbiert, z. B. 4, 6, 5 | Offerings waren der Engpass im Endlos |
| Preis der Stufen 2–5 im Endlos (`UPGRADE_COST.goldFactor`) | weapons.ts | 1,6 / 3,4 / 7 / 13 × Kaufpreis | 1,4 / 2,8 / 5,5 / 10 × | Gleichmäßigere Preisleiter |
| Offerings der Stufen 2–5 im Endlos (`UPGRADE_COST.offerings`) | weapons.ts | 8 / 20 / 38 / 60 | 4 / 10 / 18 / 30 | dto. |
| Runic Gate | keep.ts | 9000 Gold, 18 Offerings | 6000, 14 | Torstufen erreichbar |
| Adamant Gate | keep.ts | 32000 Gold, 35 Offerings | 24000, 30 | dto. |
| Hand-Stufe 3 im Endlos | hand.ts | 35 Offerings | 20 | dto. |
| Yeti Lebenspunkte / Torschaden / Schlagpause | enemies.ts | 800 / 40 / 2,2 s | 600 / 30 / 2,4 s | Endlos endete für alle Bots am ersten Yeti (Tag 14 bis 18) |
| Gruppen-Waffen zählen zähe Räuber mehrfach (`TARGETING`) | enemies.ts | gab es nicht | Yeti 5, Siege Cart 3, Goat Rider 1,5, Boss 6 | E-045 |
| Endlos: Wachstum der Räuberzahl ab Tag (`DAY.softCapDay`, `perDayAfterCap`) | waves.ts | ab Tag 12 je +12 | ab Tag 18 je +18 | Späte Tage fordern Great |
| Endlos: Lebenspunkte-Wachstum je Tag (`DAY.hpGrowth`) | waves.ts | 0,08 | 0,09 | dto. |
| Easy (`DIFFICULTIES.easy`) | waves.ts | Anzahl 0,75, Tempo 0,9, Schaden 0,7, Gold 1,15 | 0,8 / 0,92 / 0,8 / 1 | Easy war zu leicht |
| Koop spät (`COOP.lateFactor`) | waves.ts | 1,4 | 2,1 | Koop war spät zu leicht |
| Koop Gold je Kill, Endlos und Kampagne (`COOP.goldFactor`) | waves.ts | 0,7 | 0,5 | dto. |

Gegenüber der Classic-Version (vor dem Update) kamen außerdem dazu: Adlerhaken 12.000 statt 1.000 Gold (Auftrag 14.6), Gewicht je Gegner (`mass`), Hand-Stufen (`HANDS`), Schütteln statt Antippen beim Keg Hauler mit schwächerer Explosion des geworfenen Trägers (`carrierBlast`), Endlos-Zufall (`ENDLESS` in `src/config/worlds/fondue/endless.ts`). Unverändert geblieben sind Tagesdauer (50 s), Räuber an Tag 1 (`DAY.base` 40) und je Tag (`DAY.perDay` 7) sowie Torschaden- und Tempowachstum im Endlos.

## Unsicher

- Bots sind Annäherungen. Menschen zielen anders, lernen dazu und lassen sich ablenken. Mit Tim und Lenny sollten vor allem das Wurfgefühl mit Gewicht, die ersten Kampagnen-Level, die Boss-Level und der Koop geprüft werden.
- Die Kampagne wurde nur mit Feldbreite 1280 gemessen.
