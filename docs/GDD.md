# Fondue – Game Design Document

Fondue ist das eigene Spiel von Tim und Lenny. Welt, Figuren, Regeln, Namen, Texte, Grafik, Sound und Bildschirmaufbau sind eigen (siehe ENTSCHEIDUNGEN E-001).

Dieses Dokument beschreibt die Regeln, wie sie nach dem großen Update im Code stehen. Die Zahlen kommen aus den Tabellen in `src/config/`; wo eine Tabelle lang ist, steht hier nur der Weg dorthin. Vollständige Tabellen:
- alle 100 Level Tag für Tag: `docs/KAMPAGNE-TABELLE.md` (erzeugt von `node scripts/campaign-table.ts`),
- alle Waffen mit allen fünf Stufen, Gegnerwerte, Endlos-Spannen, Freischaltungen und Balance: Entwickler-Übersicht unter https://onlineshopbuilding-droid.github.io/fondue/dev/ (erzeugt von `npm run dev-page`).

Fondue ist ein Handyspiel im Querformat. Geprüft wird auf iPhone 16, OnePlus 8T und Laptop.

## Welt und Story
- **Welt 1, Fondue:** König Fridolin, ein liebenswert-gieriger Schweizer, hat allen Käse des Landes für das größte Fondue aller Zeiten in seine Alpenburg geschafft. Die Mäuse und Ratten des Landes wollen ihn zurück und kommen als Ritterarmee über die Passstraße von rechts. Die Burg steht links.
- Die elf Gegner sind Mäuse und Ratten in Ritterkostümen (Schwanz, Ohren am Helm, Schnurrhaare). Yeti und Krähen sind Verbündete, die die Mäuse herbeiholen.
- Der Spieler ist weder der König noch dessen Hand: Der König hat ihn gerufen. Das erklärt erst das Storybuch.
- Erzählt wird nur in kurzen Sätzen: der König in der Vorrunde, ein Satz je Level, Einwürfe des Königs in der Lobby, die Popups neuer Gegner, das Storybuch in der Lobby. In Level 100 ist die Armee besiegt. Alle Texte: `src/config/worlds/fondue/story.ts`.

## Begriffe
| Begriff | Bedeutung |
|---|---|
| Welt | Paket aus König, Story, Gegnern, Landschaften und Kampagne (`src/config/worlds/`). Fondue ist Welt 1. |
| Level | Ein Kampagnen-Level, 1 bis 100. |
| Tag | Ein Tag innerhalb eines Levels oder eines Endlos-Laufs. |
| Stufe | Ausbaustand einer Waffe (1 bis 5) oder der Hand (1 bis 3). Nie „Level“. |
| Slot | Ein Waffenplatz an der Burg. |
| Sterne | Dauerhafte Währung zwischen den Leveln (vorläufiger Name). |
| Gold, Offerings | Währungen innerhalb eines Levels oder Laufs. |

## Modi
| Modus | Klasse | Kurz |
|---|---|---|
| Tutorial (Vorrunde) | `TutorialMode` (`src/modes/tutorial.ts`) | Nur beim ersten Start. Danach Level 1. |
| Kampagne | `CampaignMode` (`src/modes/campaign.ts`) | 100 feste Level, dauerhafte Stufen, Sterne beim ersten Sieg. |
| Endlos | `EndlessMode` (`src/modes/endless.ts`) | Ohne Ende, Easy/Medium/Hard, alles wird im Lauf gekauft, Bestenliste. |
| Vorgehalten | `RESERVED_MODES` in `src/modes/index.ts` | `coopCampaign`, `quickPlay`, `madness` (nicht gebaut, siehe `docs/uebergabe/IDEEN.md`). |

## Erster Start und Tutorial
- **Vorrunde:** Man sieht sofort das Schlachtfeld, ohne Menü. Das Rolling Wheel steht von Anfang an im Damage-Slot (C4). Der König läuft von links herein und sagt seine Sätze (`PRELUDE_LINES`), während die ersten Pothelms kommen. Dann friert das Bild ein, eine gezeichnete Hand zeigt an einem Gegner das Packen und Hochschleudern. Der eigene Griff lässt die Welt weiterlaufen; der erste echte Wurf beendet die Übung, der König lobt. Danach zeigt er das Rolling Wheel: Ring und Pfeil zeigen auf das Rad, „Tap the wheel!“; nach dem Antippen lobt er und geht (spätestens nach 18 s ohne Tippen).
- Ein Wurf zählt, wenn man mit mindestens 550 Einheiten pro Sekunde loslässt, einen Gegner mindestens 150 über der Straße fallen lässt oder ein eigener Wurf tödlich aufschlägt (`GUIDE` in `src/config/tutorial.ts`).
- 13 Pothelms in 34 Sekunden (`PRELUDE` in `src/config/tutorial.ts`), Tempo 90 %, Torschaden 50 %, das Tor kann nicht fallen. Die Vorrunde zahlt nichts; danach besitzt ein frisches Profil genau das Rolling Wheel (Stufe 1, angelegt). Die erste Berührung schaltet den Ton frei.
- **Level 1** folgt sofort (kurz, Wellen, Pothelms). Es bringt genug Gold für das erste Upgrade (Rolling Wheel Stufe 2, Test in `tests/unit/tutorial.test.ts`). Auf dem Sieg-Bildschirm erklärt der König Käse und Gold in drei Sätzen (`FIRST_WIN_LINES`), der Knopf heißt „To the Keep Shop“. Im Shop ist der Damage-Slot gewählt, Slot und Upgrade-Knopf leuchten, der König sagt, was zu tun ist (`FIRST_UPGRADE_LINES`). Der erste Kauf beendet die Führung (`seen.tips` „firstUpgrade“, `FIRST_UPGRADE` in `src/config/tutorial.ts`).
- **Einführungen später an ihrer Stelle (C2):** Öffnet ein Sieg einen Slot (Slow nach Level 2, Gate 4, Support 7, Passive 11) oder macht er Great Cauldron (16) oder Eagle Perch (70) freischaltbar, stellt der König ihn auf dem Sieg-Bildschirm in einem Satz vor (`SLOT_INTROS`, `STATION_INTROS` in `story.ts`; gemerkt in `seen.slotIntros` bzw. `seen.tips`). Der erste Einsatz einer Station im Kampf zeigt zusätzlich einen kurzen Tipp.
- Das Tutorial läuft nur, solange `seen.tutorial` im Profil fehlt. Erneut starten: Entwickler-Menü „Replay tutorial“ oder `?tutorial=1`. Wer über einen Einladungslink kommt, tritt direkt bei; das Tutorial kommt beim nächsten Solo-Start (E-051).

## Lobby in der Burg
- Die Lobby ist das Hauptmenü: eine Halle im Inneren der Burg als eigene Szene (`src/render/lobby/`). Die Kamera taucht nach einem Lauf in 0,9 s durch das Tor hinein und beim Start wieder heraus; ein Tipp überspringt die Fahrt.
- Stationen zum Antippen: Campaign (Kartentisch), Endless (Topf), Co-op (Festtafel), Armoury (Rüstungsständer), Storybook (unauffällig im Regal), Options, Scores, Help, Credits; „Continue“, wenn ein unterbrochenes Level wartet. Sterne und Kampagnen-Fortschritt sind sichtbar.
- Der König sitzt auf dem Thron und wirft gelegentlich einen Satz ein (`KING_LOBBY_LINES`, je nach Fortschritt).
- Die Halle wird mit dem Kampagnen-Fortschritt prächtiger (Teppich, Banner, Trophäen, Kronleuchter, Käsestapel, goldener Thron, Girlande nach Level 100; `DECOR` in `src/render/lobby/layout.ts`). Freigeschaltete Waffen hängen an der Wand.
- `?menu=html` zeigt stattdessen das einfache HTML-Menü mit denselben Aktionen.

## Kampagne
- **100 Level** in Welt 1, erzeugt aus Regeln und einzeln überschreibbar (`src/config/worlds/fondue/campaign.ts`, `LEVEL_OVERRIDES`). Festgelegt, nicht zufällig: Jedes Level hat einen festen Startwert, jeder Versuch läuft gleich an.
- **Länge:** Level 1 zwei Tage, Level 2 bis 9 fünf, ab Level 10 fünf bis zehn Tage, Boss-Level einen Tag mehr (höchstens zehn). Ein Tag dauert 50 Sekunden Kampf.
- **Feste Schwierigkeit**, keine Auswahl. Räuber je Tag: 24 an Tag 1 von Level 1, je weiterem Tag 14 % mehr, dazu ein Anteil, der mit (Level − 1) hoch 0,75 wächst. Die Stärke (Lebenspunkte, Torschaden, etwas Tempo, Gold) wächst um 5 % je Level. Weil jedes Level frisch beginnt, haben die Räuber an Tag 1 bis 3 nur 20 %, 55 % und 85 % der zusätzlichen Levelstärke (`CAMPAIGN_SCALING` in `src/modes/campaign.ts`).
- **Jedes Level beginnt frisch:** Gold 0 (Level 1: 60), Offerings 0, Holztor, leere Slots. Im Level verdient man Gold und Offerings, baut Tor und Burg aus und kauft Waffen in die Slots.
- **Gegner kommen Stück für Stück** (`FIRST_LEVEL`): Pothelm 1, Keg Hauler 3, Goat Rider 7, Pogo Bandit 12, Hexer 17, Slinger 23, Siege Cart 29, Balloonist 36, Shade 44, Crowcaller 52, Yeti 61. Ein neuer Gegner kommt in seinem ersten Level ab Tag 2 sicher und mit wachsendem Anteil in den folgenden Leveln. Beim ersten Auftreten erscheint das Popup „New enemy“ mit Bild, Name und ein bis zwei Sätzen (`ENEMY_POPUPS`).
- **Boss-Level:** 10, 20, … 100. Am letzten Tag 1,8-mal so viele Räuber, alle 12 % stärker, dazu übergroße Räuber (14-fache Lebenspunkte, 2,4-faches Gewicht, 1,75-fach gezeichnet) und teils ein Massenansturm (zum Beispiel Level 30: 14 Goat Rider, Level 70: zwei Yetis). Jeder Boss hat Namen und Satz (`BOSSES`).
- **Besonderheiten:** nur Reiter (9), nur Springer (14), Nachtangriffe (18, 27, 38, 47, 66, 80, 85), Keg-Parade (22), schwerer Tag mit Siege Carts (34), Luftangriff (43), Tag der Krähen (56), Hüpfen und Galopp (73), alle auf einmal (95).
- **Landschaften:** Meadow (ab Level 1), Canyon (13), Marsh (26), Snowpine (39), Canyon (51), Marsh (63), Meadow (76), Snowpine (89).
- **Sieg:** Der letzte Tag ist überstanden (Phase `runWon`). Sieg-Bildschirm: Sterne, neue Freischaltungen, ein Story-Satz, dann Kamerafahrt in die Burg.
- **Niederlage:** Das Tor fällt. „Try again“ oder zurück zur Karte; es beginnt wieder bei Tag 1.
- **Fortsetzen:** Allein geht ein unterbrochenes Level am Beginn des Tages weiter, an dem die App geschlossen wurde (Station „Continue“). Koop und Entwickler-Läufe werden nicht fortgesetzt.
- **Kampagnen-Karte:** ein Pfad durch die Landschaften mit allen 100 Leveln als Stationen, seitlich scrollbar, startet beim aktuellen Level. Geschaffte, aktuelle, Boss- und Freischalt-Stationen sind markiert. Ein Tipp öffnet eine Level-Karte mit Tagen, Landschaft, Besonderheit, Sternen und „Play“. Geschaffte Level lassen sich erneut spielen.

## Sterne, Freischaltungen, Stufen
- **Sterne** (`src/config/stars.ts`): erster Sieg eines Levels 3, eines besonderen Levels (neuer Gegner, Freischaltung oder Besonderheit) 4, eines Boss-Levels 8. Wiederholen bringt nichts (`replayShare` 0). Endlos: einmalige Sterne je Meilenstein-Tag und Schwierigkeit (siehe Endlos).
- **Freischaltungen** (`UNLOCKS` in `src/config/worlds/fondue/unlocks.ts`): Kessel von Anfang an; mit dem Sieg in Level 1 Slot Mauerfuß und Rolling Wheel; Slot Mauer mit 9, Torarm mit 19, Schrein mit 29, Turmdach mit 39; Adlerhaken mit 32; Hand-Stufe 2 mit 14, Stufe 3 mit 47; Torstufen 1 bis 4 mit 2, 8, 21, 42; Waffen siehe Tabelle unten. Ab Level 69 ist alles freigeschaltet.
- **Sterne ausgeben** in der Waffenkammer (Armoury): Waffenstufe 2/3/4/5 kostet 5/12/21/32 Sterne (`STARS.weaponTier`), Hand-Stufe 2/3 kostet 12/30 Sterne (`HANDS`), sobald die Kampagne sie freigibt. Das erste Freischalten einer Waffe kostet nichts.
- **Im Level:** Eine Waffe in einen Slot zu setzen kostet einmal Gold (Kaufpreis der Waffe), sie hat sofort ihre dauerhafte Stufe aus dem Profil. Im Level wird nichts verbessert, die Hand ist nur Anzeige.
- Läufe mit Entwickler-Eingriffen (verändertes Tuning oder Schalter, Schnellstart, Sprung auf einen späteren Tag) bringen weder Sterne noch Fortschritt noch Bestenliste.

## Endlos
- Von Anfang an offen (`availableFromLevel` 0). Easy, Medium, Hard wählbar (`DIFFICULTIES` in `src/config/waves.ts`: Anzahl 0,8 / 1 / 1,3, Tempo 0,92 / 1 / 1,12, Torschaden 0,8 / 1 / 1,35, Gold 1 / 1 / 0,9).
- Alle 16 Waffen, alle fünf Slots, Kessel und Haken sind verfügbar, egal wie weit die Kampagne ist (Schalter `onlyUnlockedWeapons`, steht auf `false`).
- Jede Waffe startet auf Stufe 1 und wird zwischen den Tagen mit Gold und Offerings bis Stufe 5 verbessert (Preis: Kaufpreis mal 1,4 / 2,8 / 5,5 / 10, dazu 4 / 10 / 18 / 30 Offerings). Die Hand kostet 2500 Gold und 10 Offerings (Stufe 2) und 9000 Gold und 20 Offerings (Stufe 3). Nach dem Lauf ist alles weg.
- **Räuber je Tag (Medium, allein):** 40 an Tag 1, je Tag 7 mehr bis Tag 18, danach 18 mehr je Tag. Torschaden +20 %, Tempo +3 %, Lebenspunkte +9 % je Tag (`DAY` in `src/config/waves.ts`). Höchstens 200 lebende Räuber. Etwas mehr als die Hälfte kommt in Rudeln.
- **Leichter Zufall** (`ENDLESS` in `src/config/worlds/fondue/endless.ts`): Die Tageszahl schwankt um ±10 %. Jeder Gegner kommt zuerst an einem gewürfelten Tag in seinem Fenster (zum Beispiel Keg Hauler Tag 2 bis 3, Shade 10 bis 13, Yeti 13 bis 17) und an diesem Tag mit einer Chance einer mehr (Yeti 20 %: einmal in fünf Läufen zwei Yetis). Danach hat jeder Typ ein Gewicht und eine Höchstzahl je Tag, die um 15 % je Tag wächst. Gleicher Startwert, gleicher Lauf.
- **Meilensteine:** einmalige Sterne für geschaffte Tage je Schwierigkeit. Easy: Tag 10, 20, 30 (1, 2, 2 Sterne). Medium: Tag 5, 10, 15, 20, 25, 30, 40, 50 (1, 2, 2, 3, 3, 4, 5, 6). Hard: Tag 5, 10, 15, 20, 30, 40 (2, 3, 4, 5, 6, 8).
- Kein eingebautes Ende. Niederlage: Game Over mit Punkten, Eintrag in die Bestenliste im Profil.

## Tagesablauf
| Punkt | Wert |
|---|---|
| Banner vor dem Tag | 2,6 s |
| Kampf | 50 s (Level 1: 40 s); in Endlos-Tagen 7 bis 18 neue Räuber je Tag mehr |
| Ende des Tages | Nach Sonnenuntergang kommen keine neuen Räuber mehr. Der Tag endet, wenn alle tot sind oder das Tor fällt. |
| Tor zwischen den Tagen | voll aufgefüllt (`ECONOMY.gateRefill` 1) |
| Markt zwischen den Tagen | ja (außer in der Vorrunde) |
| Landschaft im Endlos | wechselt alle 3 Tage (Meadow, Canyon, Marsh, Snowpine) |

## Werfen, Gewicht und Hand
- Packen und Wegschleudern ist das Herz des Spiels. Schwerkraft 3400, stärkster Wurf 1700 Einheiten pro Sekunde, tödlich ab einem Aufprall von 900 (`TUNING_DEFAULT` in `src/config/tuning.ts`). Ein kurzes Hochschnippen reicht für einen Pothelm.
- **Gewicht** (`mass` in `src/config/enemies.ts`): Pothelm 1, Shade 0,9, Slinger 1, Crowcaller 1,1, Pogo Bandit 1,15, Hexer 1,2, Balloonist 1,25, Keg Hauler 1,3, Goat Rider 2, Yeti 5, Siege Cart 9 (nicht greifbar), Krähe 0,4.
- Ein schwerer Gegner fliegt bei gleichem Wisch kürzer und flacher: Tempo mal (Handstärke / Gewicht) hoch 0,5, höchstens 1, mindestens 0,45. Er folgt der Hand auch träger. Ein kräftiger Wisch tötet jeden greifbaren Gegner.
- **Hand-Stufen** (`HANDS` in `src/config/hand.ts`): Stärke 1, 1,5, 2,2. Kampagne: mit Sternen zwischen den Leveln; Endlos: im Lauf mit Gold.
- **Yeti-Regel:** Ein Yeti hebt nur ab, wenn die Hände an ihm zusammen Stärke 2 haben. Allein schafft das nur Hand-Stufe 3; zu zweit genügen zwei Hände der Stufe 1. Schwächere Hände ziehen ihn nur ein Stück zurück. Ein übergroßer Boss-Yeti braucht das 2,4-Fache.
- **Hand-Anzeige:** Am Touchscreen wird die eigene Hand nicht gezeichnet, man sieht seinen Finger. Die Hand des Mitspielers bleibt sichtbar. Mit der Maus bleibt die eigene Hand als Zeiger.

## Gegner
| Gegner | Kampagne ab Level | Endlos erstmals Tag | Verhalten |
|---|---|---|---|
| Pothelm | 1 | 1 | läuft, schlägt aufs Tor |
| Keg Hauler | 3 | 2–3 | wirft Bomben aus der Distanz. Hochheben und schütteln (4 Richtungswechsel in 1,6 s), dann fällt das Fass und explodiert unten; ebenso am Adlerhaken. Ein geworfener Träger platzt schwächer. Eine geworfene Bombe kann man zurückwerfen. |
| Goat Rider | 7 | 3–4 | sehr schnell, samt Reittier greifbar, schwer |
| Pogo Bandit | 12 | 4–6 | springt in Bögen, in der Luft greifbar |
| Hexer | 17 | 5–7 | Schutzblase (3,2 s an, 3,4 s aus) verhindert Greifen |
| Slinger | 23 | 6–8 | schießt aus der Distanz |
| Siege Cart | 29 | 7–10 | nicht greifbar, mit 7 Tipps zerstörbar |
| Balloonist | 36 | 8–11 | schwebt, wirft Bomben |
| Shade | 44 | 10–13 | zeitweise unsichtbar (2,2 s) und dann nicht greifbar |
| Crowcaller | 52 | 11–15 | kommt nach dem ersten Tod als Krähe zurück |
| Yeti | 61 | 13–17 | sehr schwer, siehe Yeti-Regel |

Lebenspunkte, Tempo, Torschaden, Gold und Punkte stehen in `ENEMIES` (`src/config/enemies.ts`) und auf der Entwickler-Übersicht.

## Burg, Slots und Waffen
- **Fünf Slots** (`SLOTS` in `src/config/slots.ts`): Mauerfuß, Mauer, Torarm, Schrein, Turmdach. In jeden Slot passt genau eine Waffe seines Typs.
- **Bedienung: nur antippen.** Jede Waffe wählt ihr Ziel selbst (`target`): nächster am Tor, dichteste Gruppe (zähe Gegner zählen mehrfach: Yeti 5, Siege Cart 3, Goat Rider 1,5, Boss 6), zähester Gegner oder die ganze Straße. Findet eine angreifende Waffe kein Ziel, feuert sie nicht und lädt nicht nach. Ein Ring zeigt das Nachladen. Ein Tipp auf eine Waffe greift nie einen Gegner, ein Gegner am Tor bleibt greifbar.
- **16 Waffen mit je fünf Stufen** (`WEAPONS` in `src/config/weapons.ts`). Jede Stufe bringt etwas Spürbares (Wirkung, Zusatzeffekt, Nachladezeit) und sieht mächtiger aus. Jede Waffe lässt sich mit `enabled: false` abschalten.

| Slot | Waffe | Ziel | Was sie tut | Kaufpreis (Gold / Offerings) | Kampagne ab Level |
|---|---|---|---|---|---|
| Mauerfuß | Rolling Wheel | Straße | Steinrad rollt die Straße hinunter; ab Stufe 4 Feuerspur, Stufe 5 zwei Räder | 600 / 0 | 1 |
| Mauerfuß | Sticky Fondue | vorne | Käsepfütze bremst, ab Stufe 3 brennt sie | 500 / 1 | 5 |
| Mauerfuß | Fondue Forks | Gruppe | Gabeln aus der Straße, halten fest, mehrfach | 800 / 2 | 15 |
| Mauer | Stomper | Gruppe | Block fällt auf die Gruppe; ab Stufe 2 Beben, ab 3 zwei, auf 5 drei Schläge | 900 / 3 | 9 |
| Mauer | Alphorn | Straße | Ton wirft Räuber nahe der Burg zurück, ab Stufe 3 auch Flieger | 700 / 2 | 12 |
| Mauer | Cuckoo Clock | Straße | alle Räuber stehen kurz still; ab Stufe 4 platzen Blasen und Shades werden sichtbar | 1200 / 4 | 27 |
| Schrein | Comet | Gruppe | Komet mit Feuer, ab Stufe 3 Splitter | 700 / 4 | 29 |
| Schrein | Storm Bell | zähester | Blitz springt auf Nachbarn über | 1100 / 5 | 44 |
| Schrein | Golden Fondue | – | kurze Zeit mehr Gold je Kill | 900 / 3 | 69 |
| Torarm | Gate Mortar | vorne | Granate auf den Räuber, der dem Tor am nächsten ist; mehr Granaten je Stufe | 1000 / 0 | 19 |
| Torarm | Frost Horn | Gruppe | friert ein, antippen zerschlägt gefrorene Räuber | 1500 / 3 | 23 |
| Torarm | Dragon Bellows | Gruppe | setzt die Straße in Brand | 1800 / 6 | 34 |
| Torarm | Hedgehog Gate | – | Stacheln verletzen Angreifer am Tor, antippen schießt sie nach außen | 1100 / 2 | 54 |
| Turmdach | Roof Bolter | Straße | breiter Bolzenfächer über die ganze Höhe: Ballons oben, Läufer unten | 1400 / 0 | 39 |
| Turmdach | Marmot Sentry | vorne | schießt von selbst, antippen gibt eine Salve | 1300 / 3 | 49 |
| Turmdach | Ember Beacon | – | solange es brennt, explodiert jeder geworfene Räuber beim Aufprall | 1200 / 3 | 59 |

Werte und Nachladezeiten aller Stufen: `src/config/weapons.ts` und Entwickler-Übersicht.

## Markt an der Burg
- Zwischen den Tagen fährt die Kamera in 0,7 s näher an die Burg und zeigt auch ihren Westflügel links von x = 0.
- Man tippt direkt auf einen Slot: Ein Fenster zeigt mit Bildern die Waffen, die dort passen, zum Kaufen, Wechseln und (nur Endlos) Verbessern. Leere und gesperrte Slots sind markiert („ab Level N“).
- Eigener Knopf am Tor für Tor und Ausbaustufe; Kessel und Adlerhaken kauft man an ihrem Ort; die Hand hat einen eigenen Eintrag (Endlos kaufbar, Kampagne nur Anzeige).
- Gold und Offerings bleiben groß sichtbar, dazu Ergebnis des Tages und „Ready“. Im Koop erscheinen Kaufmeldungen des anderen. Alle Flächen mindestens 44 Pixel.
- In Level 1 ist im ersten Markt nur der Kessel kaufbar (`marketOnly`).

## Tor und Ausbaustufen
Jedes Tor ist zugleich eine Ausbaustufe der ganzen Burg (`GATES` in `src/config/keep.ts`):

| Tor | Gold | Offerings | Torleben | Kampagne ab |
|---|---|---|---|---|
| Oak Gate | – | – | 800 | Start |
| Iron-Bound Gate | 900 | 0 | 1400 | Level 2 |
| Gilded Gate | 2200 | 6 | 2200 | Level 8 |
| Runic Gate | 6000 | 14 | 3400 | Level 21 |
| Adamant Gate | 24000 | 30 | 5200 | Level 42 |

## Offering-Stationen
- **Great Cauldron** (250 Gold): steht auf einem kleinen Hügel hinter der Burg. Hinein kommt ein Gegner nur durch einen Wurf (ein Wurf in seine Richtung wird sanft hingelenkt). Er schmilzt in 1,4 s zu Käse (`cauldronSeconds`), währenddessen ist der Kessel belegt. +1 Offering und 10 Gold extra.
- **Eagle Perch** (12.000 Gold, Kampagne ab Level 32): Haken oben rechts. Ein dorthin geworfener Gegner hängt 1,1 s, der Adler frisst ihn. +1 Offering und 10 Gold extra. Ein Keg Hauler am Haken verliert sein Fass, das unten explodiert.

## Wirtschaft
- Gold je Gegner 10 (Pothelm) bis 120 (Yeti), in der Kampagne mit der Levelstärke etwas mehr. Ein Gegner im Kessel oder am Haken: +1 Offering und +10 Gold (`ECONOMY.offeringGold`).
- Gold pro Tag laut Bots (Endlos Medium, Mid allein): etwa 400 an Tag 1, 900 an Tag 5, 1650 an Tag 10, 3400 an Tag 20.

## Koop
- Host-autoritativ mit 30 Snapshots pro Sekunde, Interpolation, Vorhersage von Griff und Wurf beim Gast. Gemeinsame Kasse, gemeinsames Tor, Markt mit „Ready“ für beide.
- **Endlos zu zweit:** 2,3-mal so viele Räuber, zwischen Tag 22 und 36 sinkend auf 2,1-mal, an Tag 1 bis 3 etwas weniger (−8, −6, −3). 50 % Gold je Kill (`COOP` in `src/config/waves.ts`).
- **Kampagne zu zweit: Host-Kampagne mit Helfer.** Der Host spielt sein Level mit seinem Profil (Freischaltungen, Stufen, Hand), der Gast bringt nur seine Hand-Stufe mit. 1,7-mal so viele Räuber, 50 % Gold je Kill. Level-Fortschritt bekommt nur der Host. Der Gast bekommt einmal je Level die Hälfte der Sterne, aufgerundet. Jeder schreibt die eigene Belohnung ins eigene Profil.
- **Koop-Raum:** Ein kleines Fenster zeigt live, wer im Raum ist (eigener Name, darunter der Mitspieler oder ein freier Platz). In Dialogen steht „weiter“ rechts und „zurück“ links, im Join-Bildschirm „Join“ rechts und „Back“ links.
- Host und Gast brauchen denselben Build und dieselbe Adresse (zum Beispiel beide `/fondue/` oder beide `/fondue/classic/`).

## Profil
- Dauerhafter Spielstand im Browser unter `fondue.profile`: Name, Sterne, geschaffte Level je Welt, freigeschaltete Waffen, Slots und Offering-Stationen, Waffen- und Hand-Stufen, Tutorial gesehen, gesehene Gegner und Tipps, gelesene Story-Seiten, Endlos-Meilensteine, Bestenliste, Einstellungen, Entwickler-Bewertungen, unterbrochenes Level, Platz für eine Koop-Kampagne.
- Export und Import als Textcode in den Options. Homescreen-App und Browser-Tab haben getrennte Speicher: immer über dasselbe Symbol öffnen.
- Zurücksetzen im Entwickler-Menü mit Sicherheitsabfrage.
