# Fortschritt: Großes Update

Nach jeder Kontext-Zusammenfassung zuerst lesen: `docs/AUFTRAG-GROSSES-UPDATE.md`, diese Datei, `docs/abnahme-grosses-update.json`, `docs/ARCHITEKTUR.md`.

## Rahmen
- Start: 11.11.2026, 18:35 Uhr (Systemuhr des Laptops).
- Worktree: `.claude/worktrees/grosses-update`, Branch `feature/grosses-update`, Basis `a9e519c`.
- Sicherung: Tag `v0-alpha` und Branch `classic` auf `a9e519c` (gepusht).
- PR #8 (`ci/pages-multi-build`): Pages baut zusätzlich `/classic/`. Auto-Merge ist im Repo nicht erlaubt, also von Hand mergen, sobald `test` grün ist.
- Die Pages-Umgebung lässt nur Deployments von `main` zu. `/next/` ginge nur über einen Lauf auf `main`.
- Git Bash verfälscht `--base=/pfad/`; lokal `MSYS_NO_PATHCONV=1` davorsetzen.

## Etappen
| Zeit | Etappe | Erledigt (Beleg) | Nächster Schritt |
|---|---|---|---|
| 18:35 | Start | Werkzeuge geprüft, Rückfrage an Tim gestellt | Etappe 0 |
| 18:43 | Etappe 0 | Tag, Branch, PR #8 offen; beide Builds lokal unter `/fondue/` und `/fondue/classic/` mit Live-Test grün | PR #8 mergen, Live prüfen, Tim den Link melden |
| 18:43 | Architektur | `docs/ARCHITEKTUR.md` Entwurf | Prüfung durch Subagent, dann Etappe 1 (Zerlegen) |

## Ersetzte Tests
Browser-Tests (`tests/e2e`), umgestellt auf das neue Spiel. Alle übrigen alten Tests prüfen ihre Regel weiter, nur der Weg dorthin ist neu (Lobby statt Menü-Knöpfe, `?menu=1` überspringt das Tutorial, Tag-Ende über den Spielzustand statt fester Wartezeiten).

| Test | Warum ersetzt | Neuer Test |
|---|---|---|
| keep.spec: „pull a weapon on the keep to aim it, without grabbing the raider at the gate“ (3 Geräte) | Zielgeste entfällt, Waffen feuern per Antippen (Auftrag 10) | keep.spec: „every weapon fires with one tap and never grabs“ (alle 5 Slots, 3 Geräte, Finger und Maus) |
| keep.spec: „mortar pulled from the keep lands where the aim showed“ (3 Geräte) | Zielgeste entfällt (Auftrag 10) | derselbe neue Test: Gate-Arm-Slot mit Mörser feuert per Tipp und trifft |
| keep.spec: „moving back to the weapon cancels the shot“ (3 Geräte) | Ohne Zielen gibt es keinen Schuss, der abgebrochen werden kann (Auftrag 10) | derselbe neue Test: ein Tipp feuert sofort, ein Griff am Tor feuert nichts |
| keep.spec: „comet and wheel work with taps on the keep“ (scharf schalten, dann Ziel antippen) | Kein Scharfschalten mehr, ein Tipp feuert (Auftrag 10) | derselbe neue Test (Rad Slot 0, Komet Slot 3) |
| keep.spec: „cauldron front / back: a raider melts …“ (4 Tests) | Kessel steht nur noch hinter der Burg, Schalter vorne/hinten entfällt (Auftrag 14.1) | keep.spec: „… a raider melts in the pot behind the keep …“ (3 Geräte) |
| keep.spec: „developer menu: switches and quick start by mouse“ (Schalter `cauldron`, `#developer`) | Schalter `cauldron` entfällt; Entwickler-Menü neu (Auftrag 11) | flow.spec: „developer menu: jump to a level and day …“ und „… quick endless start stays off the scores; profile tools …“ |
| keep.spec: „developer menu on a phone: a long press on the logo“ und „a quick tap on the logo“ | Hauptmenü ist die Lobby ohne Logo; das Logo gibt es nur noch im HTML-Menü (`?menu=html`) | mobile.spec: „developer menu on a phone: from Options by finger“ und „plain menu on a phone: a long press on the logo …, a quick tap does not“ |
| keep.spec: „co-op in one browser: different window shapes …, the guest aims from the keep“ | Zielgeste entfällt (Auftrag 10) | coop.spec: „co-op on different window shapes: … the guest fires the host keep's weapon by tapping it“ |
| flow.spec: „day, results, market, next day“ (Markt mit 7 Reitern, `.tab`) | Reiter-Markt entfällt, Markt an der Burg (Auftrag 9) | flow.spec: „endless: a day, its results, the market at the keep …“ und market.spec (Laptop und iPhone) |
| flow.spec: „right click cancels a weapon and never grabs“ | Keine scharf geschaltete Waffe mehr, die abgebrochen werden könnte (Auftrag 10) | flow.spec: „a right click never grabs a raider“ (der Teil „never grabs“ bleibt geprüft) |
| flow.spec: „menu screens all open and return“ | Hauptmenü ist jetzt die Lobby in der Burg (Auftrag 7) | flow.spec: „lobby: every station opens its page …“ und „the plain menu (?menu=html) …“ |
| mobile.spec: „every screen fits and is usable by touch“ (Menü-Knöpfe, Reiter-Markt) | Lobby statt Menü, Markt an der Burg (Auftrag 7, 9) | mobile.spec: „the hall and every menu page fit …“ und „a day by finger: … the market, game over“ (iPhone 16, OnePlus 8T) |
| mobile.spec / keep.spec: Geräteliste (640x360, 960x400 u. a. bei jeder Änderung) | Geprüft werden nur noch Laptop, iPhone 16 und OnePlus 8T (Auftrag 16); andere Größen mit `ALL_SCREENS=1` | `DEVICES` in tests/e2e/helpers.ts |
| coop.spec: Markt-Kauf über Reiter „Offerings“ | Reiter-Markt entfällt (Auftrag 9) | coop.spec: Gast tippt den Kesselplatz an der Burg an und baut ihn |
| look.spec (nur mit `LOOK=1`): Kessel vorne und hinten | Kessel nur hinten (Auftrag 14.1) | look.spec: „the pot behind the keep, melting“ |

## Offene Probleme
- keine

## Stand bei Unterbrechung (18:56, Nutzungslimit erreicht)
- Erledigt: `sim.ts` zerlegt (Commit 6aac847, 158 Unit-Tests gruen, Balance-Zahlen identisch), Architektur zweite Fassung, Abnahmeliste (455 Punkte).
- PR #8 (Classic unter /classic/) offen, Pruefung lief (4 von 7 gruen). Noch von Hand mergen, dann Live-Test mit LIVE_URL fuer / und /classic/, dann Tim den Link melden.
- Subagents in eigenen Worktrees: `gu-ui-split` (app.ts zerlegen, wartete auf Browser-Tests), `gu-art-split` (Grafik zerlegen, Asset-Verzeichnis). Ergebnis pruefen, dann Branches `gu/ui-split` und `gu/art-split` in `feature/grosses-update` mergen.
- Leere Worktrees `gu-profile` und `gu-mice` angelegt, noch kein Auftrag vergeben (Profil-Klasse; Maeuse-Details an den Figuren).
- Naechster Schritt: Etappe 2 und 3 laut ARCHITEKTUR.md Abschnitt 13 (rules.ts, Tagesplaner, Slot-Modell, config/weapons.ts mit 16 Waffen).

## Stand bei Unterbrechung 2 (20:34, Tim braucht die restlichen 10 Prozent des Limits)
- Erledigt und zusammengefuehrt: Etappe 1 komplett (sim, app, Grafik zerlegt, Asset-Verzeichnis), Profil (src/profile), Story-Texte (story.ts), Bots und Balance-Werkzeug (src/bots, tests/balance; voller Bericht 39 s).
- Neuer Kern uebersetzt fehlerfrei: src/sim (Slots, 16 Antipp-Waffen, Gewicht, Schuetteln, runWon, hold, Statistik), src/config (weapons, slots, keep, hand, stars, worlds/fondue), src/modes, src/net, src/game.
- ABGEBROCHEN mitten in der Arbeit (Opus-Subagents, per SendMessage fortsetzbar): Render-Schicht (stand bei der Waffengrafik src/art/weapons), Oberflaeche src/ui (stand beim Entwickler-Panel), Unit-Tests (stand bei tests/unit/helpers.ts). Das Spiel laeuft in diesem Stand NICHT, tsc hat Fehler in src/render, src/ui, tests/unit.
- Branch gu/mice (Maeuse-Details, Commit 459bbd1) ist fertig; Merge wurde nachgeholt, falls unten kein Fehler steht.
- PR #8: Teil 5 der Pruefung neu gestartet (Zeitlimit im Test, kein Fehler der Aenderung); Ergebnis pruefen, dann mergen.
- Erste Balance-Rohzahlen: Endlos solo endet fuer alle Bots um Tag 14 bis 18 am ersten Yeti; Kampagne Mid 55 Level im ersten Versuch, 38 nie. Balancing steht aus.
- Tim will einfache Aufgaben auf Opus-Subagents (model opus) und Stopp bei 90 Prozent des 5-Stunden-Limits.
- Git Bash: Heredocs verlieren Backslashes; Skripte mit dem Write-Werkzeug schreiben. python3 ist nur ein Store-Platzhalter, python geht.

## Stand 12.11., 01:40 (Fortsetzung ab 01:00)
- Live geprueft: `/fondue/` und `/fondue/classic/` laden, Koop-Verbindung klappt auf beiden (playwright.live.config.ts, auch mit LIVE_URL fuer Classic). Classic-Link: https://onlineshopbuilding-droid.github.io/fondue/classic/
- Branch baut wieder: tsc fuer src sauber, 312 Unit-Tests gruen (Commit b0998a0). Render-Schicht und Oberflaeche laufen auf dem neuen Modell, aber noch ohne Sichtpruefung der ganzen Ablaeufe; die e2e-Tests nutzen noch den alten Ablauf und sind rot.
- Balance (Commit a935f43), Zahlen in docs/balance-latest.md: Endlos Medium Poor Tag 6, Mid 28.5, Great 48.5; Mid zu zweit 41, Easy 34, Hard 23. Kampagne: Mid 84 Level im 1. und 11 im 2. Versuch, Great alle im ersten, Poor bis etwa Level 12. Offen: Great wird spaet kaum gefordert, Poor kommt nicht weit, Mid-Koop im Endlos zu leicht.
- Geaendert dabei: Level starten sanft (Scaling.easeIn), Gegnerkurve der Kampagne (CURVE.countPower), Boss-Level staerker (bossPower), Sternpreise der Stufen [0,5,12,21,32], Opfergaben fuer Waffen und Stufen halbiert, Yeti 600 Leben und 30 Schaden, "Air raid" von Level 38 auf 43 (erst nach Turm-Slot).
- Fertig, noch nicht committet (liegt im Arbeitsverzeichnis): Kampagnen-Karte als Pfad (src/ui/screens/campaign.ts, src/ui/campaignArt.ts; Level startet jetzt ueber #playLevel in der Karte).
- Laufende Opus-Subagents: Markt an der Burg (src/render, src/art/castle, Markt-Bildschirm), Entwickler-Seite /dev/ mit Level-Tabelle und Entscheidungsliste (scripts/, docs/).
- Danach offen: Tutorial-Vorrunde und gefuehrtes Level 1 mit Koenig, Lobby als Szene in der Burg mit Kamerafahrt, e2e-Tests auf drei Geraeten neu, CI verschlanken, Leistungstest, alle Dokumente (AGENTS, HANDBUCH, GDD, ENTSCHEIDUNGEN ab E-032, balance.md, IDEEN), Abnahmeliste mit Belegen, Abschlussbericht, PR und Veroeffentlichung.
- Verbrauch: 5-Stunden-Fenster endet 05:50 Uhr; bei 90 Prozent anhalten.

## Ersetzte Tests (Nachtrag)
| Test | Warum ersetzt | Neuer Test |
|---|---|---|
| profile.test.ts / profile-data.test.ts: Beispielschalter `cauldron: 'back'` | Der Schalter vorne/hinten entfaellt (Auftrag 14.1) | dieselben Tests mit `dayEnd: 'retreat'`; `cauldron` dient jetzt als Beispiel fuer einen nicht mehr vorhandenen Schalter |

## Stand 12.11., 04:45 (Pause bis zum neuen 5-Stunden-Fenster um 05:50)
- Fertig und committet: Markt an der Burg, Kampagnen-Karte, Tutorial-Vorrunde mit Koenig, Lobby in der Burg, Entwickler-Menue mit Bewertungsliste, Entwickler-Seite /dev/, Level-Tabelle, Dokumente (Handbuch, GDD, Entscheidungen E-032 bis E-061, Balance, Ideen), Abnahmeliste 271 von 455 mit Beleg, Browser-Tests neu (lokal zweimal gruen: 47 bestanden, 4 uebersprungen, je 15,6 min), CI mit 4 Teilen, 390 Unit-Tests gruen.
- PR 9 offen (feature/grosses-update nach main), main ist eingemischt. Erster Lauf auf GitHub: unit gruen, browser 2 gruen, browser 1, 3, 4 rot. Alle sechs Fehler sind Wartezeiten auf den langsamen GitHub-Maschinen (waitFor timed out bzw. Klick-Timeout), lokal bestehen die Tests:
  - flow.spec.ts:193 Entwickler-Menue Sprung zu Level und Tag (wartet, letzter Wert "results")
  - flow.spec.ts:221 Fenster "New enemy" (Klick 45 s Timeout, Zeile 241)
  - keep.spec.ts:25 oneplus-8t Waffen feuern (Zeile 81)
  - coop.spec.ts:65 Koop endlos, beide Varianten (Zeile 96)
  - smoke.spec.ts:4 Wurf toetet (Zeile 15)
- Naechster Schritt: diese sechs Tests auf Spielzustand statt Zeit umstellen (Wuerfe ueber die Simulationszeit, nicht ueber die Uhr), Lauf wiederholen, bis `test` gruen ist. Tests nicht abschwaechen.
- Danach offen: Sichtpruefung auf den drei Geraeten (Screenshots ansehen), Leistungstest, Issue 1 pruefen, Android-App pruefen, OFFENE-ENTSCHEIDUNGEN nachziehen (Bewertungsliste ist jetzt im Spiel, weaponUnlock wird gelesen), Freischaltungen auf Boss-Level pruefen, Abschlussbericht docs/ABSCHLUSS-GROSSES-UPDATE.md, Merge und Veroeffentlichung, Live-Pruefung, Worktrees aufraeumen (gu-profile, gu-mice, pages-multi-build), tests/balance/diag.test.ts loeschen.
- Balance zuletzt: Endlos Medium Poor 6, Mid 28.5, Great 48.5; Kampagne Mid 84/11/1/4, Great 100, Mid zu zweit 92/4/2/2 (Koop-Faktor Kampagne 1.7), Level 2 bis 9 haben fuenf Tage.
- Tim spielt lokal ueber einen Entwicklungsserver auf Port 5180 (laeuft nur, solange die Sitzung offen ist).

## Stand 12.11., 07:10
- Die sechs auf GitHub roten Browser-Tests sind umgestellt: Wartezeiten zaehlen jetzt Spielzeit statt Uhrzeit (`waitGame`, `gameClock` in tests/e2e/helpers.ts), Wuerfe laufen ueber `fling`/`pointer` mit eigenen Zeitstempeln. Ursache: Die Spieluhr laeuft auf langsamen Maschinen langsamer als die Uhr (hoechstens 6 Ticks je Bild). Lokal gedrosselt und normal gruen (26 bestanden).
- Das Fenster "New enemy" hat einen Test-Schalter `showMs` (Standard 9 s, Spiel unveraendert), damit es im Test auf den Tipp wartet.

| Test | Warum ersetzt | Neuer Test |
|---|---|---|
| flow.spec.ts Entwickler-Menue: Sprung zu Level 3, Tag 3, gewinnt das Level | Level 2 bis 9 haben jetzt fuenf Tage (E-062), Tag 3 ist nicht mehr der letzte | derselbe Test springt zum letzten Tag von Level 3 (aus `levelOf` gelesen) und prueft denselben Sieg |

## Ersetzte Unit-Tests (sim.test.ts, round.test.ts)
Alle `it(…)`-Titel, die seit dem Stand auf `main` (`a9e519c`) aus `tests/unit/sim.test.ts` und `tests/unit/round.test.ts` verschwunden sind (`git diff a9e519c -- tests/unit`). Für die Regeln des Markts gab es danach keinen Unit-Test mehr, obwohl Kommentare in beiden Dateien auf eine `shop.test.ts` verwiesen; sie ist jetzt geschrieben (`tests/unit/shop.test.ts`, 11 Tests).

| Test | Warum ersetzt | Neuer Test |
|---|---|---|
| sim.test.ts: „has 22 upgrades“ | Die Liste aus 22 Shop-Artikeln gibt es nicht mehr; Waffen haben fünf Stufen (Auftrag 10.1) | weapons.test.ts: „has 16 weapons, each with exactly five tiers“ |
| sim.test.ts: „every item can be bought in tier order“ | Artikel heißen jetzt `gate`, `weapon:…`, `upgrade:…` (`quote` in `src/sim/shop.ts`) | **neu** shop.test.ts: „a better gate raises the maximum and stands at full strength“, „upgrades go one tier at a time, at the price of the next tier“ |
| sim.test.ts: „charges gold and offerings and refuses repeat or locked or unaffordable items“ | dto. | **neu** shop.test.ts: „charges gold and offerings and puts the weapon into its slot“, „refuses what is owned, locked or too dear, and then takes nothing“, „refuses when the offerings are short, even with gold enough“ |
| sim.test.ts: „a better gate raises the maximum“ | dto. | **neu** shop.test.ts: „a better gate raises the maximum and stands at full strength“, „gates come one tier after the other, up to what the run allows“ |
| sim.test.ts: „buying a gate arm equips it, equip swaps between owned“ | Kein Ausrüsten mehr: eine Waffe je Slot, Tausch im Markt (E-033) | **neu** shop.test.ts: „swapping weapons in a slot: a weapon bought before goes back in for free and keeps its tier“ |
| sim.test.ts: „introduces each type on its day and guarantees it appears“ | Gegner kommen je Level (Kampagne) oder je Endlos-Fenster | levels.test.ts: „every raider has one first level: it is announced there, shows up there, and never earlier“; endlessRandom.test.ts: „a raider never comes before its first day and always comes on it“ |
| sim.test.ts: „announces a tip once for a new type“ | Umbenannt | sim.test.ts: „announces a new type once, on the day it first comes“ |
| sim.test.ts: „keg hauler: tap drops the keg, which explodes“ | Schütteln statt Antippen (Auftrag 14.2, E-044) | shake.test.ts: „a quick tap on a Keg Hauler no longer drops the keg“, „a held, armed Keg Hauler loses its keg: it falls straight down“, „the keg bursts where it lands, kills raiders below, and the hand cannot catch it“ |
| sim.test.ts: „snap assist steers a near miss into the cauldron“ | Kessel nur noch hinter der Burg (Auftrag 14.1) | sim.test.ts: „letting go of a raider close beside the rim puts it into the pot“; round.test.ts: „rear: pulls in a throw headed near it, even a sloppy one“ |
| sim.test.ts: „stomper: activate, then release slams at the hand“ | Nur noch antippen, Ziel automatisch (Auftrag 10.1, E-033) | weapons.test.ts: „tier 1: one block on the thickest group, no tremor“ (Stomper) |
| sim.test.ts: „activating a mode weapon twice cancels it without cooldown“ | Kein Scharfschalten mehr, also nichts abzubrechen (Auftrag 10.1) | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1; verwandt: weapons.test.ts „without a target costs nothing: denied, and no reload starts“ |
| sim.test.ts: „comet: a tap on the shrine, a tap on the road, and it falls right there with flames“ | Ein Tipp, Ziel ist die dichteste Gruppe (Auftrag 10.1, D-08) | weapons.test.ts: „tier 1: one comet on the thickest group, a blast and a patch of fire“ (Comet) |
| sim.test.ts: „gate arm aims with the press and fires on release; shared cooldown“ | Kein Zielen mehr (Auftrag 10.1) | weapons.test.ts: „the reload is shared: the second player cannot fire it again“, „tier 1: one shell at the raider closest to the gate, not at the crowd“ (Gate Mortar) |
| sim.test.ts: „leaves the mortar on release and does no damage on the way“ | Feuert beim Tipp statt beim Loslassen | sim.test.ts: „leaves the mortar on the tap and does no damage on the way“ |
| sim.test.ts: „flies in a high arc and explodes where the aim said it would“ | Kein Zielpunkt mehr (Auftrag 10.1) | weapons.test.ts: „aims where a walking raider will be when the shell comes down“ (Gate Mortar); sim.test.ts: „still lands on target with other gravity from the tuning panel“ |
| sim.test.ts: „every shop weapon can be fired without crashing“ | Alle 16 Waffen auf allen Stufen | sim.test.ts: „every weapon can be fired on every tier without crashing“ |
| sim.test.ts: „picking a weapon mid-press does not fire on release“ | Kein Zielen beim Loslassen mehr | sim.test.ts: „tapping a weapon while holding a raider keeps the raider, and letting go only throws“ |
| round.test.ts: „${variant}: melts one raider at a time, pays after the melt, frees up at once“ (vorne und hinten) | Nur noch der Kessel hinten (Auftrag 14.1) | round.test.ts: „melts one raider at a time, pays after the melt, frees up at once“ |
| round.test.ts: „${variant}: a raider in the pot cannot be grabbed or blown up“ | dto. | round.test.ts: „a raider in the pot cannot be grabbed or blown up“ |
| round.test.ts: „${variant}: the melt time comes from the tuning panel“ | dto. | round.test.ts: „the melt time comes from the tuning panel“ |
| round.test.ts: „rear pot is not there in the front variant, and the other way round“ | Schalter vorne/hinten entfällt (Auftrag 14.1) | round.test.ts: „there is no pot on the road any more: a raider set down where the front pot stood just lands“, „the cauldron switch is gone from the experiment switches“ |
| round.test.ts: „a pull inside the dead zone is not a shot and costs nothing“ | Zielgeste entfällt (Auftrag 10.1) | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1; verwandt: weapons.test.ts „without a target costs nothing: denied, and no reload starts“ |
| round.test.ts: „pulling further reaches further, from near the gate to the end of the field“ | dto. | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1; das Ziel wählt die Waffe selbst (targeting.test.ts) |
| round.test.ts: „a full pull ends at the field, never beyond it, and the preview says the same“ | dto. | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1; verwandt: targeting.test.ts „ignores raiders still beyond the right edge of the field“ |
| round.test.ts: „pulling steeper flies higher and longer but lands in the same place“ | dto. | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1 |
| round.test.ts: „can land on any spot of the road“ | dto. | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1 |
| round.test.ts: „the mortar always goes high, the crossbow stays flat and quick“ | dto. | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1 |
| round.test.ts: „crossbow bolts fly where the pull points and hit harder at full pull“ | dto. | weapons.test.ts: „tier 1: the fan hits a balloonist above and a runner below with one tap“, „tier 1 bolts stop at the first raider, tier 3 and up fly through“ (Roof Bolter) |
| round.test.ts: „a weak pull falls short and is weaker“ | dto. | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1 |
| round.test.ts: „the snapshot tells the other player what is being aimed“ | Es wird nichts mehr gezielt (Auftrag 10.1) | kein Ersatz, Regel entfällt laut Auftrag Abschnitt 10.1 |
| round.test.ts: „the build stage follows the best gate owned“ | Torstufe steht jetzt im Loadout (`gateTier`) | **neu** shop.test.ts: „a better gate raises the maximum and stands at full strength“ |
| round.test.ts: „a weapon stands on the keep once owned“ | Waffe steht jetzt im Slot des Loadouts (`slotWeapon`) | **neu** shop.test.ts: „charges gold and offerings and puts the weapon into its slot“ |
| round.test.ts: „day ${q.day}: every item is real, and its requirements are owned too“ | Schnellstart besteht aus Waffen in Slots statt aus Artikeln | round.test.ts: „day ${q.day}: every weapon is real, fits its slot and has a tier“ |

## Stand 12.11., 09:00
- Pruefung `test` auf PR 9 gruen (Lauf 43164479076). Leistungstest: 57,7 Bilder pro Sekunde mit 200 Raeubern. Sichtpruefung auf den drei Geraeten erledigt, Tipp verdeckt das Banner am Handy nicht mehr.
- Abnahmeliste: 368 von 455 belegt, jeder offene Punkt hat einen Grund ("Offen: ...").
- Kleine Luecken geschlossen: Seitentitel kommt aus game.ts, Begriffe in AGENTS.md, D-19 bis D-21, ungenutztes Zielkreuz-Bild entfernt (dazu aus der Liste FREE_PROPS in tests/e2e/art.spec.ts gestrichen), neue Unit-Tests fuer den Markt (tests/unit/shop.test.ts), 401 Unit-Tests.
- Abschlussbericht: docs/ABSCHLUSS-GROSSES-UPDATE.md.
