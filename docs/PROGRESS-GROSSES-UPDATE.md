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
