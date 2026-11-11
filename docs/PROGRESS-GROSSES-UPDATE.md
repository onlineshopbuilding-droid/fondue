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
| Test | Warum ersetzt | Neuer Test |
|---|---|---|

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
