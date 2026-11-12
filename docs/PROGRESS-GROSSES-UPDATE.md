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
