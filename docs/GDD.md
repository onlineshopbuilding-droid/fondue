# Fondue – Game Design Document

Fondue ist das eigene Spiel von Tim und Lenny. Welt, Figuren, Regeln, Namen, Texte, Grafik, Sound und Bildschirmaufbau sind eigen (siehe ENTSCHEIDUNGEN E-001).

Dieses Dokument beschreibt die Regeln von **v0.3** („dauerhafte Burg“), wie sie im Code stehen (Branch `v0.3-dev`, Testadresse `/fondue/next/`). Die Zahlen kommen aus den Tabellen in `src/config/`; wo eine Tabelle lang ist, steht hier nur der Weg dorthin. Vollständige Tabellen:
- alle 100 Level Welle für Welle: `docs/KAMPAGNE-TABELLE.md` (erzeugt von `node scripts/campaign-table.ts`),
- alle Waffen mit allen sieben Stufen, Gegnerwerte, Freischaltungen, Käse-Summe und Balance: Entwickler-Übersicht unter `/fondue/next/dev/` (erzeugt von `npm run dev-page`),
- Messungen und geänderte Startwerte: `docs/balance.md`.

Fondue ist ein Handyspiel im Querformat. Geprüft wird auf iPhone 16 (852 × 393), OnePlus 8T (915 × 412) und Laptop (1280 × 720).

## Welt und Story
- **Welt 1, Fondue:** König Fridolin, ein liebenswert-gieriger Schweizer, hat allen Käse des Landes für das größte Fondue aller Zeiten in seine Alpenburg geschafft. Die Mäuse und Ratten des Landes wollen ihn zurück und kommen als Ritterarmee über die Passstraße von rechts. Die Burg steht links.
- Die elf Gegner sind Mäuse und Ratten in Ritterkostümen (Schwanz, Ohren am Helm, Schnurrhaare). Yeti und Krähen sind Verbündete, die die Mäuse herbeiholen.
- Der Spieler ist weder der König noch dessen Hand: Der König hat ihn gerufen. Das erklärt erst das Storybuch.
- Erzählt wird nur in kurzen Sätzen: der König in der Vorrunde und im ersten Shop-Besuch, ein Satz je Level, Einführungen neuer Slots und Stationen, Einwürfe des Königs in der Lobby, die Popups neuer Gegner, das Storybuch in der Lobby. In Level 100 ist die Armee besiegt. Alle Texte: `src/config/worlds/fondue/story.ts`.

## Begriffe
| Begriff | Bedeutung |
|---|---|
| Welt | Paket aus König, Story, Gegnern, Landschaften und Kampagne (`src/config/worlds/`). Fondue ist Welt 1. |
| Level | Ein Kampagnen-Level, 1 bis 100. Für Waffen, Burg und Hand nie „Level“. |
| Welle | Ein Angriffsabschnitt eines Levels oder eines Endlos-Laufs (`wave`, Spieltext „Wave“). |
| Stufe | Ausbaustand einer Waffe, der Burg (zugleich das Tor) oder der Hand, 1 bis 7 (`tier`, Spieltext „Tier“). |
| Slot | Ein Waffenplatz an der Burg. Fünf, jeder mit fester Aufgabe: Damage, Slow, Support, Passive, Gate. |
| Käse | Dauerhafte Währung für Freischaltungen. Spieltext „Cheese“. |
| Gold | Dauerhafte Währung für Stufen. Spieltext „Gold“. |
| Räuberwappen | Sonderwährung für Stufe 7, nur vom Adlerhaken. Spieltext „Raider Crests“ (E-064). |

## Das Grundprinzip: die dauerhafte Burg
- Die **Burg** gehört dem Spieler dauerhaft und steht im Profil (`keep` in `fondue.v3.profile`): Burg-Stufe (das Tor), Hand-Stufe, alle freigeschalteten Waffen mit ihren Stufen, die Stationen und was in welchem Slot liegt (`loadout`).
- Sie gilt in Kampagne, Endlos und Koop (im Koop die des Hosts). Waffen lassen sich an- und ablegen und behalten dabei ihre Stufe.
- **Im Level wird nichts gekauft und nichts verbessert.** Ein Level beginnt immer mit der aktuellen dauerhaften Burg. Gold, Käse und Wappen werden am Ende gutgeschrieben, ausgegeben wird zwischen den Leveln im Shop.
- Was sich aus dem Fortschritt ergibt (offene Slots, kaufbare Waffen, höchste erlaubte Stufe), wird aus den gewonnenen Leveln berechnet und nicht gespeichert (`src/modes/unlocks.ts`).

## Währungen
| Währung | Wofür | Woher |
|---|---|---|
| **Käse** | Waffen, Great Cauldron und Eagle Perch freischalten | Nur Kampagne: 1 bis 5 je Level, jeder nur einmal. Insgesamt höchstens 500. |
| **Gold** | Stufe 2 bis 6 von Waffen, Burg und Hand, Stufen des Kessels | Kampagne (auch bei Niederlage und beim Wiederholen), Endlos, Koop |
| **Räuberwappen** | Stufe 7 von Waffe, Burg und Hand (je 50 zusätzlich zum Gold) | Nur am Eagle Perch, höchstens 2 je Runde |

- **Käse (A2, `CHEESE` in `src/config/currencies.ts`):** Die fünf Käse eines Levels sind (1) Level gewonnen, (2) Tor am Ende über 50 % Leben, (3) Tor am Ende über 90 % Leben, (4) Challenge 1, (5) Challenge 2. Jeder Käse hat ein Bit in einer Maske je Level; er zählt nur, wenn sein Bit neu gesetzt wird. Wer 3 von 5 hat, holt beim Wiederholen nur die fehlenden. Alles, was Käse kostet, kostet zusammen genau 500 (Test); wer alle 500 hat, hat alles freigeschaltet. Im Endlos-Modus gibt es keinen Käse.
- **Challenges:** Jedes Level hat zwei (`src/config/worlds/fondue/challenges.ts`, beurteilt in `src/modes/challenges.ts` nur an den Zählern des Laufs), zum Beispiel Keg Haulers explodieren lassen, Räuber werfen, eine Waffe einsetzen. Eine Challenge verlangt nur, was man an dieser Stelle der Kampagne haben kann (kein Kessel-Wurf vor dem Kessel). Ein Test prüft, dass jede in ihrem Level erfüllbar ist.
- **Gold:** Das in der Runde verdiente Gold wird dauerhaft gutgeschrieben, **auch bei einer Niederlage** (E-066) und beim Wiederholen eines Levels (E-071, noch von Tim zu bestätigen). Käse gibt es nur beim Sieg.
- **Wappen (A4):** Ein am Haken geopferter Räuber lässt sein Wappen: leichte Räuber 1, mittlere 2, schwere 3, Yeti und Boss-Räuber 5 (`CRESTS` in `src/config/crests.ts`), aber höchstens 2 Wappen je Runde in Kampagne und Endlos. Gemessen: Median 25 Runden bis 50 Wappen (`docs/balance.md`, Ziel 20 bis 30).

## Modi
| Modus | Klasse | Kurz |
|---|---|---|
| Tutorial (Vorrunde) | `TutorialMode` (`src/modes/tutorial.ts`) | Nur beim ersten Start. Danach Level 1. |
| Kampagne | `CampaignMode` (`src/modes/campaign.ts`) | 100 feste Level aus Wellen, mit der dauerhaften Burg, Käse und Gold. |
| Endlos | `EndlessMode` (`src/modes/endless.ts`) | Wellen ohne Ende mit der eigenen Burg, vor allem zum Gold-Verdienen, Bestenliste. Offen, sobald der fünfte Slot offen ist (Level 11). |
| Koop | Kampagne oder Endlos mit zwei Spielern | Burg des Hosts, Gast bringt seine Hand. |
| Vorgehalten | `RESERVED_MODES` in `src/modes/index.ts` | `coopCampaign`, `quickPlay`, `madness` (nicht gebaut). |

## Erster Start und Tutorial
- **Vorrunde:** Man sieht sofort das Schlachtfeld, ohne Menü. Das Rolling Wheel steht von Anfang an im Damage-Slot (C4). Der König läuft von links herein und sagt seine Sätze (`PRELUDE_LINES`), während die ersten Pothelms kommen. Dann friert das Bild ein, eine gezeichnete Hand zeigt an einem Gegner das Packen und Hochschleudern. Der eigene Griff lässt die Welt weiterlaufen; der erste echte Wurf beendet die Übung, der König lobt. Danach zeigt er das Rolling Wheel: Ring und Pfeil zeigen auf das Rad, „Tap the wheel!“; nach dem Antippen lobt er und geht (spätestens nach 18 s ohne Tippen).
- Ein Wurf zählt, wenn man mit mindestens 550 Einheiten pro Sekunde loslässt, einen Gegner mindestens 150 über der Straße fallen lässt oder ein eigener Wurf tödlich aufschlägt (`GUIDE` in `src/config/tutorial.ts`).
- 13 Pothelms in 34 Sekunden (`PRELUDE`), Tempo 90 %, Torschaden 50 %, das Tor kann nicht fallen. Die Vorrunde zahlt nichts; danach besitzt ein frisches Profil genau das Rolling Wheel (Stufe 1, angelegt). Die erste Berührung schaltet den Ton frei.
- **Level 1** folgt sofort (etwa 70 Sekunden, Wellen, Pothelms). Es bringt genug Gold für das erste Upgrade (Rolling Wheel Stufe 2, Test in `tests/unit/tutorial.test.ts`). Auf dem Sieg-Bildschirm erklärt der König Käse und Gold in drei Sätzen (`FIRST_WIN_LINES`), der Knopf heißt „To the Keep Shop“. Im Shop ist der Damage-Slot gewählt, Slot und Upgrade-Knopf leuchten, der König sagt, was zu tun ist (`FIRST_UPGRADE_LINES`). Der erste Kauf beendet die Führung (`seen.tips` „firstUpgrade“, `FIRST_UPGRADE` in `src/config/tutorial.ts`).
- **Einführungen später an ihrer Stelle (C2):** Öffnet ein Sieg einen Slot (Slow nach Level 2, Gate 4, Support 7, Passive 11) oder macht er Great Cauldron (16) oder Eagle Perch (70) freischaltbar, stellt der König ihn auf dem Sieg-Bildschirm in einem Satz vor (`SLOT_INTROS`, `STATION_INTROS` in `story.ts`; gemerkt in `seen.slotIntros` bzw. `seen.tips`). Der erste Einsatz einer Station im Kampf zeigt zusätzlich einen kurzen Tipp.
- Das Tutorial läuft nur, solange `seen.tutorial` im Profil fehlt. Erneut starten: Entwickler-Menü „Replay tutorial“ oder `?tutorial=1`. Wer über einen Einladungslink kommt, tritt direkt bei; das Tutorial kommt beim nächsten Solo-Start (E-051).
- Beim ersten Start von v0.3 erscheint einmal ein freundlicher Hinweis, dass v0.3 mit frischem Fortschritt beginnt und das alte Spiel unter seiner Adresse bleibt (`seen.v3Notice`).

## Lobby in der Burg
- Die Lobby ist das Hauptmenü: eine Halle im Inneren der Burg als eigene Szene (`src/render/lobby/`). Die Kamera taucht nach einem Lauf in 0,9 s durch das Tor hinein und beim Start wieder heraus; ein Tipp überspringt die Fahrt.
- Stationen zum Antippen: Campaign (Kartentisch), Endless (Topf), Co-op (Festtafel), Shop (Rüstungsständer), Storybook (unauffällig im Regal), Options, Scores, Help, Credits; „Continue“, wenn ein unterbrochenes Level wartet. Käse, Gold, Wappen und Kampagnen-Fortschritt sind sichtbar. Der Topf (Endlos) trägt vor dem fünften Slot ein Schild, und der König erklärt, warum er noch gesperrt ist.
- Der König sitzt auf dem Thron und wirft gelegentlich einen Satz ein (`KING_LOBBY_LINES`, je nach Fortschritt).
- Die Halle wird mit dem Kampagnen-Fortschritt prächtiger (Teppich, Banner, Trophäen, Kronleuchter, Käsestapel, goldener Thron, Girlande nach Level 100; `DECOR` in `src/render/lobby/layout.ts`). Freigeschaltete Waffen hängen an der Wand.
- Die Versionsnummer („v0.3 · build …“) steht klein in der Lobby, im Menü und in den Options (`VERSION_LABEL`).
- `?menu=html` zeigt stattdessen das einfache HTML-Menü mit denselben Aktionen.

## Shop an der Burg
Der Shop ersetzt die frühere Waffenkammer (E-065). Er ist die Burg von außen (`src/ui/screens/keep.ts`, Bildschirm-Kennung `armoury`), gebaut aus denselben Bildern wie das Schlachtfeld: die Burgstufe, das Tor und die Waffe in jedem der fünf Slots an ihrem Platz.
- Fünf Slots, die Burg (Tor), die Hand, Kessel und Adlerhaken sind große Flächen zum Antippen. Ein Slot zeigt alle Waffen seiner Aufgabe mit Bild, Stufe und Kurzbeschreibung. Dort schaltet man mit Käse frei, verbessert mit Gold (Stufe 7 mit Wappen) und legt Waffen an oder ab. Beim Upgrade steht vorher und nachher.
- Käse, Gold und Wappen sind immer sichtbar. Gesperrtes zeigt, ab welchem Level es kommt („from level N“) und was fehlt (Käse, Gold, Wappen oder der Deckel des Abschnitts, siehe unten).
- Im Koop benutzt jeder den Shop für sich, außerhalb einer Runde.
- **Bildschirm vor jedem Level (D2):** Vor jedem Level und jeder Endlos-Runde zeigt eine Leiste die fünf Slots mit den angelegten Waffen; ein Tipp auf einen Slot öffnet die passenden Waffen zum Wechseln (`src/ui/screens/prelevel.ts`). „Play“ bleibt einen Tipp entfernt.

## Kampagne
- **100 Level** in Welt 1, erzeugt aus Regeln und einzeln überschreibbar (`src/config/worlds/fondue/campaign.ts`, `LEVEL_OVERRIDES`). Festgelegt, nicht zufällig: Jedes Level hat einen festen Startwert, jeder Versuch läuft gleich an.
- **Ein Level ist ein durchgehender Kampf aus Wellen.** Es gibt keine Tage und keinen Markt dazwischen. Geplante Länge: Level 1 etwa 70 Sekunden, die ersten fünf Level 1 bis 2 Minuten, die Mitte meist 3 bis 5 Minuten, Boss- und Sonderlevel 7 bis 10 Minuten (`CURVE` in `campaign.ts`; zusammen gut 8 Stunden für alle 100 Level, genaue Werte in `docs/KAMPAGNE-TABELLE.md`).
- **Wellen (`WAVES` in `src/config/waves.ts`):** Ein kurzes Banner (1,2 s), in dem die Räuber schon loslaufen; die erste Welle kommt 0,3 s nach dem Start (Ziel: erster sichtbarer Räuber nach höchstens 2 Sekunden auf allen drei Formaten). Wellen sind klein, groß, mittel, Spitze in Folge. Nach einer Welle folgt eine Atempause von 2 bis 4 Sekunden; sind alle Räuber tot, kommt die nächste Welle nach höchstens 1,5 Sekunden. So gibt es nie mehr als 5 Sekunden ohne lebenden Räuber (gemessen höchstens 2,6 s). Höchstens 12 (frühe Level) bis 30 (späte Level) Räuber leben gleichzeitig.
- **Weniger, aber schnellere Räuber (B4):** Das Tempo ist 2,5-mal so hoch wie in v0.2 (Slinger, Keg Hauler, Siege Cart und Balloonist 1,4-mal), dafür kommen etwa 40 % der Räuber, und jeder zahlt doppelt Gold (`V3_SPEED`, `V3_GOLD`, `CURVE.countShare`). Schnelle Räuber haben eine größere Greiffläche (`GRAB_SPEED_BONUS`).
- **Stärke:** wächst um 5 % je Level, ab Level 40 zusätzlich mit dem Quadrat (`CURVE.powerPerLevel`, `powerLate`); Boss-Level 1,45-mal. Innerhalb eines Levels steigen Torschaden, Tempo und Lebenspunkte von Welle zu Welle, und in den ersten drei Wellen gilt nur ein Teil der Levelstärke (`CAMPAIGN_SCALING` in `src/config/campaignScaling.ts`).
- **Gegner kommen Stück für Stück** (`FIRST_LEVEL`): Pothelm 1, Keg Hauler 3, Goat Rider 7, Pogo Bandit 12, Hexer 17, Slinger 23, Siege Cart 29, Balloonist 36, Shade 44, Crowcaller 52, Yeti 61. Beim ersten Auftreten erscheint das Popup „New enemy“ mit Bild, Name und ein bis zwei Sätzen (`ENEMY_POPUPS`).
- **Boss-Level:** 10, 20, … 100. In der letzten Welle kommen übergroße Räuber (14-fache Lebenspunkte, 2,4-faches Gewicht, 1,75-fach gezeichnet) und teils ein Massenansturm (zum Beispiel Level 30: sechs Goat Rider mehr, Level 70: ein Yeti mehr). Jeder Boss hat Namen und Satz (`BOSSES`). Ein Boss-Level schaltet nichts Eigenes frei; es ist das Tor zum nächsten Abschnitt mit höherem Stufen-Deckel (E-071).
- **Besonderheiten:** nur Reiter (9), nur Springer (14), Nachtangriffe (18, 27, 38, 47, 66, 80, 85), Keg-Parade (22), schwerer Angriff mit Siege Carts (34), Luftangriff (43), Krähensturm (56), Hüpfen und Galopp (73), alle auf einmal (95).
- **Landschaften:** Meadow (ab Level 1), Canyon (13), Marsh (26), Snowpine (39), Canyon (51), Marsh (63), Meadow (76), Snowpine (89).
- **Sieg:** Die letzte Welle ist vollständig erschienen und alle Räuber sind besiegt (Phase `runWon`). Sieg-Bildschirm: die fünf Käse (die neuen hervorgehoben), Gold, Wappen, neue Freischaltungen, ein Story-Satz, dann Kamerafahrt in die Burg.
- **Niederlage:** Das Tor fällt. Das verdiente Gold bleibt (E-066), Käse gibt es nicht. „Try again“ oder zurück zur Karte; es beginnt wieder bei Welle 1.
- **Fortsetzen (E-070):** Allein geht ein unterbrochenes Level am Beginn der Welle weiter, in der die App geschlossen wurde (Torleben, Gold und Statistik von damals; Station „Continue“). Koop, Endlos und Entwickler-Läufe werden nicht fortgesetzt.
- **Schwierigkeit über die Kampagne (B5):** Wer nichts ausbaut, bleibt stecken (der mittlere Bot ohne Ausbau scheitert zuerst an Level 15); mit Ausbau kommt man weit, späte Level und Boss-Level verlangen Stufe 6 und 7. Messungen: `docs/balance.md`.
- **Kampagnen-Karte:** ein Pfad durch die Landschaften mit allen 100 Leveln als Stationen, seitlich scrollbar, startet beim aktuellen Level. Ein Tipp öffnet die Level-Karte mit geplanter Dauer, Landschaft, Besonderheit, beiden Challenges, den schon geholten Käsen (0 bis 5), der Ausrüstungsleiste und „Play“. Geschaffte Level lassen sich erneut spielen.

## Freischaltungen und Stufen
- **Slots** öffnen mit einem gewonnenen Level (`SLOTS` in `src/config/slots.ts`): Damage nach der Vorrunde (Rolling Wheel), Slow nach Level 2, Gate nach 4, Support nach 7, Passive nach 11. Endlos öffnet mit dem fünften Slot.
- **Waffen** werden an einem bestimmten Level kaufbar und mit Käse freigeschaltet (`unlockLevel`, `cheesePrice` in `src/config/weapons.ts`, Tabelle unten). Alle 25 Waffen plus Kessel und Adlerhaken kosten zusammen genau 500 Käse. Zu jedem Slot gehört eine erste, billige Waffe, damit er nach dem Öffnen nicht leer bleibt.
- **Stationen** (`STATIONS` in `src/config/keep.ts`): Great Cauldron ab Level 16 für 12 Käse, Eagle Perch ab Level 70 für 28 Käse.
- **Stufen 2 bis 6** kosten Gold (`WEAPON_TIER_GOLD` in `src/config/tiers.ts`: 300 / 900 / 3000 / 9000 / 24000 / 50000 für Stufe 2 bis 7, jeweils mal dem `goldScale` der Waffe zwischen 0,8 und 1,4). Burg und Hand haben eigene Preise (siehe unten). **Stufe 7** kostet zusätzlich 50 Räuberwappen (`CREST_COST`).
- **Stufen-Deckel (E-067, `TIER_CAP_BY_LEVEL`):** Die höchste kaufbare Stufe hängt vom Kampagnen-Fortschritt ab: Stufe 3 von Anfang an, 4 nach Level 10, 5 nach Level 25, 6 nach Level 45. **Stufe 7 gibt es erst, wenn der Eagle Perch freigeschaltet ist.** Gold aus dem Endlos-Modus hilft so beim Feststecken, kann aber nicht über den Abschnitt hinaus ausbauen.
- **Jede Stufe zählt (A5):** Von einer Stufe zur nächsten ändert sich ein Schalter (zum Beispiel ein zusätzlicher Effekt) oder mindestens eine Zahl um 15 % oder mehr (Test). Stufe 7 ist immer ein Höhepunkt. Alle Werte je Stufe: `WEAPONS` und Entwickler-Übersicht.
- Läufe mit Entwickler-Eingriffen (verändertes Tuning, Schalter oder Waffenwerte, Schnellstart, Sprung auf eine spätere Welle) bringen weder Gold noch Käse noch Fortschritt noch Bestenliste. Die Cheats im Entwickler-Menü ändern das Profil dagegen bewusst dauerhaft und kennzeichnen es („Cheats used“).

## Endlos
- Offen, sobald der fünfte Slot offen ist (Level 11). Easy, Medium, Hard wählbar (`DIFFICULTIES` in `src/config/waves.ts`): Anzahl 0,8 / 1 / 1,3, Tempo 0,92 / 1 / 1,12, Torschaden 0,8 / 1 / 1,35, **Gold je Räuber 0,8 / 1 / 1,3** (höhere Schwierigkeit zahlt mehr).
- Endlos läuft mit der **eigenen dauerhaften Burg**. Man kauft nichts im Lauf und beginnt nicht bei null. Er ist vor allem zum Gold-Verdienen da, besonders wenn man in der Kampagne feststeckt. Gold bleibt dauerhaft, Käse gibt es nicht. Am Adlerhaken holt man auch hier Wappen, mit derselben Grenze von 2 je Runde.
- **Räuber je Welle (`ENDLESS_WAVES`):** 6 in Welle 1, je Welle 1,1 mehr, ab Welle 30 2,2 mehr. Jede vierte Welle ist eine Spitze (1,7-fach). Eine Welle braucht 9 Sekunden zum Eintreffen, dazu 3 Sekunden Pause. Torschaden +3,5 %, Tempo +0,4 %, Lebenspunkte +1,6 % je Welle. Die Höchstzahl lebender Räuber wächst von 12 auf 30.
- **Leichter Zufall** (`ENDLESS` in `src/config/worlds/fondue/endless.ts`): Die Wellengröße schwankt um ±15 %. Jeder Gegner kommt zuerst in einer gewürfelten Welle seines Fensters (zum Beispiel Keg Hauler Welle 3 bis 5, Shade 19 bis 25, Yeti 25 bis 33) und in dieser Welle mit einer Chance einer mehr (Yeti 20 %). Danach hat jeder Typ ein Gewicht und eine Höchstzahl je Welle, die um 8 % je Welle wächst. Gleicher Startwert, gleicher Lauf.
- Die Landschaft wechselt alle 8 Wellen (Meadow, Canyon, Marsh, Snowpine).
- Kein eingebautes Ende. Niederlage: Game Over mit Punkten, Eintrag in die Bestenliste im Profil (Feld `wave`). Die beste Welle je Schwierigkeit steht in `endlessBest`.

## Werfen, Gewicht und Hand
- Packen und Wegschleudern ist das Herz des Spiels. Schwerkraft 3400, stärkster Wurf 1700 Einheiten pro Sekunde, tödlich ab einem Aufprall von 900 (`TUNING_DEFAULT` in `src/config/tuning.ts`). Ein kurzes Hochschnippen reicht für einen Pothelm.
- **Gewicht** (`mass` in `src/config/enemies.ts`): Pothelm 1, Shade 0,9, Slinger 1, Crowcaller 1,1, Pogo Bandit 1,15, Hexer 1,2, Balloonist 1,25, Keg Hauler 1,3, Goat Rider 2, Yeti 5, Siege Cart 9 (nicht greifbar), Krähe 0,4.
- Ein schwerer Gegner fliegt bei gleichem Wisch kürzer und flacher: Tempo mal (Handstärke / Gewicht) hoch 0,5, höchstens 1, mindestens 0,45. Er folgt der Hand auch träger. Ein kräftiger Wisch tötet jeden greifbaren Gegner.
- **Hand-Stufen 1 bis 7** (`HANDS` in `src/config/hand.ts`): Stärke 1 / 1,25 / 1,55 / 2 / 2,4 / 2,8 / 3,3. Gold für Stufe 2 bis 7: 500 / 1500 / 3500 / 8000 / 16000 / 30000, Stufe 7 zusätzlich 50 Wappen. Gekauft im Shop.
- **Yeti-Regel:** Ein Yeti hebt nur ab, wenn die Hände an ihm zusammen Stärke 2 haben. Allein schafft das ab Hand-Stufe 4; zu zweit zählen die Stärken beider Hände zusammen. Schwächere Hände ziehen ihn nur ein Stück zurück. Ein übergroßer Boss-Yeti braucht das 2,4-Fache.
- **Zweite Hand (C9):** Am Handy greift man mit beiden Daumen gleichzeitig je einen Räuber; der zweite Finger ist die zweite Hand, ein dritter tut nichts, und das Spiel zoomt und scrollt nicht. Greifen beide eigenen Hände denselben Gegner, zählen ihre Stärken zusammen. Zwei Wege: **Hand-Stufe 7** schaltet die zweite Hand dauerhaft frei (Variante 1); die Support-Waffe **Helping Hand** leiht sie für 5 bis 14 Sekunden, je Stufe stärker (Variante 2). Am Laptop simuliert der Entwickler-Schalter „Second hand on the laptop“ die zweite Hand mit der rechten Maustaste.
- **Hand-Anzeige:** Am Touchscreen wird die eigene Hand nicht gezeichnet, man sieht seinen Finger. Die Hand des Mitspielers bleibt sichtbar. Mit der Maus bleibt die eigene Hand als Zeiger.

## Gegner
| Gegner | Kampagne ab Level | Endlos erstmals Welle | Verhalten |
|---|---|---|---|
| Pothelm | 1 | 1 | läuft, schlägt aufs Tor |
| Keg Hauler | 3 | 3–5 | wirft Bomben aus der Distanz. Hochheben und schütteln (4 Richtungswechsel in 1,6 s), dann fällt das Fass und explodiert unten; ebenso am Adlerhaken. Ein geworfener Träger platzt schwächer. Eine geworfene Bombe kann man zurückwerfen. |
| Goat Rider | 7 | 5–8 | sehr schnell, samt Reittier greifbar, schwer |
| Pogo Bandit | 12 | 7–11 | springt in Bögen, in der Luft greifbar |
| Hexer | 17 | 9–13 | Schutzblase (3,2 s an, 3,4 s aus) verhindert Greifen |
| Slinger | 23 | 11–15 | schießt aus der Distanz |
| Siege Cart | 29 | 13–19 | nicht greifbar, mit 7 Tipps zerstörbar |
| Balloonist | 36 | 15–21 | schwebt, wirft Bomben |
| Shade | 44 | 19–25 | zeitweise unsichtbar (2,2 s) und dann nicht greifbar |
| Crowcaller | 52 | 21–29 | kommt nach dem ersten Tod als Krähe zurück |
| Yeti | 61 | 25–33 | sehr schwer, siehe Yeti-Regel |

Lebenspunkte, Tempo, Torschaden, Gold und Punkte stehen in `ENEMIES` (`src/config/enemies.ts`) und auf der Entwickler-Übersicht.

## Burg, Slots und Waffen
- **Fünf Slots** mit fester Aufgabe und festem Ort (`SLOTS` in `src/config/slots.ts`): **Damage** (links unten) räumt die Straße, **Slow** (links Mitte) bremst oder hält an, **Gate** (über dem Tor) schützt die letzten Schritte, **Support** (links oben) hilft Hand und Tor, **Passive** (rechts oben) wirkt von selbst. In jeden Slot passt genau eine Waffe seiner Aufgabe.
- **Bedienung: nur antippen.** Damage-, Slow-, Support- und Gate-Waffen werden angetippt und wählen ihr Ziel selbst (`target`): nächster am Tor, dichteste Gruppe (zähe Gegner zählen mehrfach: Yeti 5, Siege Cart 3, Goat Rider 1,5, Boss 6), zähester Gegner oder die ganze Straße. **Passive Waffen feuern allein**, sobald sie nachgeladen sind und ein Ziel haben; ein Ring zeigt das Nachladen. Findet eine angreifende Waffe kein Ziel, feuert sie nicht und lädt nicht nach. Ein Tipp auf eine Waffe greift nie einen Gegner, ein Gegner am Tor bleibt greifbar.
- **25 Waffen, fünf je Slot, mit je sieben Stufen** (`WEAPONS` in `src/config/weapons.ts`, E-068). Freischalt-Level und Käse-Preis:

| Slot | Waffe | Ab Level | Käse | Was sie tut |
|---|---|---|---|---|
| Damage | Rolling Wheel | frei | 0 | Steinrad rollt die ganze Straße hinunter (erste Waffe, schon in der Vorrunde) |
| Damage | Fondue Forks | 14 | 8 | Gabeln aus der Straße halten die dickste Gruppe fest |
| Damage | Stomper | 29 | 16 | Block fällt auf die dickste Gruppe |
| Damage | Comet | 44 | 23 | Komet fällt auf die Gruppe und hinterlässt Feuer |
| Damage | Dragon Bellows | 64 | 30 | setzt die Straße unter der Gruppe in Brand |
| Slow | Sticky Fondue | 2 | 3 | Käsepfütze bremst die Räuber |
| Slow | Frost Horn | 17 | 10 | friert die Gruppe ein, antippen zerschlägt Gefrorene |
| Slow | Cuckoo Clock | 32 | 18 | alle Räuber auf der Straße stehen kurz still |
| Slow | Snowdrift Cannon | 48 | 24 | Schneebälle türmen Schneewehen auf der Straße |
| Slow | Cowbell Toll | 68 | 32 | Glockenschlag betäubt alle im Kreis |
| Gate | Gate Mortar | 4 | 4 | Granate auf den Räuber, der dem Tor am nächsten ist |
| Gate | Hedgehog Gate | 20 | 10 | Stacheln am Tor verletzen Angreifer, antippen schießt sie nach außen |
| Gate | Alphorn | 35 | 18 | ein Ton wirft alle nahen Räuber zurück |
| Gate | Cheese Cascade | 52 | 25 | heißer Käse vom Torbogen verbrüht, wer vor dem Tor steht |
| Gate | Battering Log | 72 | 34 | ein Baumstamm schwingt aus dem Tor und schleudert Räuber zurück |
| Support | Golden Fondue | 7 | 5 | kurze Zeit mehr Gold je Kill |
| Support | Ember Beacon | 23 | 12 | solange es brennt, explodiert jeder geworfene Räuber beim Aufprall |
| Support | Mending Horn | 38 | 20 | heilt das Tor (nur wenn es beschädigt ist) |
| Support | Iron Grip | 56 | 27 | Hände greifen kurz fester, Würfe töten leichter |
| Support | Helping Hand | 76 | 35 | zweite Hand für einige Sekunden |
| Passive | Marmot Sentry | 11 | 6 | schießt von selbst, antippen gibt eine Salve |
| Passive | Roof Bolter | 26 | 14 | Bolzenfächer über die ganze Höhe: Ballons oben, Läufer unten |
| Passive | Storm Bell | 41 | 22 | Blitz auf den zähesten Räuber springt auf Nachbarn über |
| Passive | Pinecone Catapult | 60 | 28 | wirft Tannenzapfen auf die dickste Gruppe |
| Passive | Hornet Hive | 80 | 36 | ein Schwarm sticht die Räuber nahe am Tor |

Summe der Käse-Preise der Waffen 460, dazu Great Cauldron 12 und Eagle Perch 28: genau 500. Jede Stufe jeder Waffe: `note` in `src/config/weapons.ts` und Entwickler-Übersicht.

## Burg-Stufen
Die Burg ist zugleich das Tor. Sieben Stufen (`CASTLE_TIERS` in `src/config/keep.ts`), jede mit eigener Grafik (`src/art/castle/`, vom Holztor bis zur Alpenfestung):

| Stufe | Name | Torleben | Gold | Wappen |
|---|---|---|---|---|
| 1 | Oak Gate | 800 | – | – |
| 2 | Iron-Bound Gate | 1250 | 400 | – |
| 3 | Stone Keep | 1900 | 1200 | – |
| 4 | Bannered Keep | 2800 | 4000 | – |
| 5 | Gilded Keep | 4000 | 10000 | – |
| 6 | Runic Fortress | 5600 | 24000 | – |
| 7 | Alpine Citadel | 7800 | 50000 | 50 |

## Stationen
- **Great Cauldron** (ab Level 16, 12 Käse): steht auf einem kleinen Hügel hinter der Burg. Hinein kommt ein Gegner nur durch einen Wurf (ein Wurf in seine Richtung wird sanft hingelenkt). Er schmilzt zu Käse, währenddessen ist der Kessel belegt. Der Kessel zahlt **doppeltes Gold** für den Räuber (`ECONOMY.cauldronGoldFactor`). Stufen mit Gold (2500, 8000) kürzen die Schmelzzeit: 2,4 s, 1,6 s, 1 s (`CAULDRON_SECONDS`).
- **Eagle Perch** (ab Level 70, 28 Käse): Haken oben rechts. Er ist klein: Nur ein gezielter Wurf mit Tempo (mindestens 450) trifft; ein hochgetragener und losgelassener Räuber zählt nicht. Ein dorthin geworfener Gegner hängt 1,1 s, der Adler frisst ihn und lässt sein **Räuberwappen** zurück (`CRESTS`). Die Zielhilfe ist schwach (Haken-Radius 34, Hilfe 40); gemessen trifft etwa jeder fünfte Wurf in Hakennähe. Ein Keg Hauler am Haken verliert sein Fass, das unten explodiert. Der Haken ist die einzige Quelle für Wappen und schaltet damit Stufe 7 frei.

## Koop
- Host-autoritativ mit 30 Snapshots pro Sekunde. Der Gast zeichnet leicht hinter dem Host (selbst einstellender Puffer, `src/net/interp.ts`) und sagt Griff und Wurf voraus; seine eigene Hand zeichnet er sofort an der Fingerstelle. Messwerte vorher und nachher: `docs/v0.3/MESSUNGEN-KOOP.md`.
- **Gespielt wird mit der Burg des Hosts** (Tor, Slots, Waffen, Stufen). Der Gast bringt seine Hand und seine Hand-Stufe mit (und ob er eine zweite Hand hat).
- **Gold (E-069):** Jeder Spieler bekommt das ganze in der Runde verdiente Gold in sein eigenes Profil; dafür zahlt ein Kill im Koop nur 60 % (`COOP.goldPerKill`). **Käse und Kampagnen-Fortschritt bekommt nur der Host.** Wappen schreibt jeder für sich gut.
- **Koop-Faktor:** 2,4-mal so viele Räuber wie allein (`COOP.countFactor`, Startwert 1,8, mit Bots angehoben: zu zweit soll es nicht leichter sein als allein). Die Höchstzahl gleichzeitig lebender Räuber wächst mit der Wurzel dieses Faktors.
- **Endlos zu zweit** gibt es ebenfalls; er ist erst nach dem fünften Slot des Hosts wählbar.
- **Koop-Raum:** Ein kleines Fenster zeigt live, wer im Raum ist (eigener Name, darunter der Mitspieler oder ein freier Platz). In Dialogen steht „weiter“ rechts und „zurück“ links, im Join-Bildschirm „Join“ rechts und „Back“ links.
- **Version und Adresse:** Host und Gast brauchen denselben Build und dieselbe Adresse (zum Beispiel beide `/fondue/next/`). Passt es nicht, sehen beide eine klare Meldung mit beiden Versionen.
- Die Verbindung ist austauschbar (`src/net/choose.ts`): ein gemieteter Relay- oder Matchmaking-Server könnte später einspringen. Heute ist keiner eingerichtet.

## Profil
- Dauerhafter Spielstand im Browser unter dem Schlüssel **`fondue.v3.profile`** (Format `fondue-profile`, `PROFILE_VERSION` 1, eigenes Format ohne Übernahme aus v0.2). Der alte Schlüssel `fondue.profile` und die alten Einstellungen werden von v0.3 weder gelesen noch geändert; ein Spieler beginnt frisch.
- Inhalt: Name, Einstellungen, Geldbeutel (`wallet`: Käse, Gold, Wappen) und das je Verdiente (`earned`), die Burg (`keep`: Burg-Stufe, Hand-Stufe, Stationen, Waffen mit Stufe, angelegte Waffen je Slot), je Welt gewonnene Level, Käse-Masken je Level, gelesene Story-Seiten, Bestenliste und beste Welle je Schwierigkeit; gesehenes Tutorial, gesehene Gegner, Tipps und Slot-Einführungen; die letzten 200 eingelösten Läufe; Entwickler-Bewertungen; Cheat-Markierung; unterbrochenes Level; Platz für eine Koop-Kampagne.
- **Speichern:** nach jeder Änderung (entprellt höchstens 250 ms (`SAVE_DELAY_MS`)), sofort nach jedem Kauf und Level, und synchron beim Wegwechseln oder Schließen der Seite. Ist der Speicher voll oder gesperrt, läuft das Spiel weiter und zeigt einmal einen Hinweis.
- Export und Import als Textcode in den Options (ein v0.2-Code wird abgelehnt). Homescreen-App und Browser-Tab haben getrennte Speicher: immer über dasselbe Symbol öffnen.
- Zurücksetzen im Entwickler-Menü mit Sicherheitsabfrage.

## Entwickler-Werkzeuge
Im Entwickler-Menü (Options, F1 am Laptop): Waffen-Editor (jede Waffe und Stufe live änderbar, Zurücksetzen, Export als Text; solche Läufe zählen nicht), Cheats für Gold, Käse und Wappen, Level freischalten, Stufen direkt setzen, Profil zurücksetzen und der Schalter für die zweite Hand am Laptop (die Cheats wirken dauerhaft und kennzeichnen das Profil), außerdem Tuning-Regler, Entscheidungsliste und Tutorial erneut abspielen.
