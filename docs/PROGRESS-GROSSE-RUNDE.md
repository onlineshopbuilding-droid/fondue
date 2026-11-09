# Fortschritt: Große Runde

Arbeitsort: Worktree `.claude/worktrees/grosse-runde`, Branch `feature/grosse-runde`, abgezweigt von `origin/setup/claude-github` (Fall B: PR #2 ist offen).

## Stand

| Zeit (09.11.2026) | Schritt | Beleg |
|---|---|---|
| 20:24 | Start, PR #2 offen, GitHub-Login ok, Worktree + `npm ci` | `gh pr view 2`, `git worktree list` |
| 20:45 | Regeln: Schalter, Schnellstart, Tagesende, Feldbreite, Waffen an der Burg, Kessel, Haken | `npx tsc --noEmit` sauber, 152 Unit-Tests grün |
| 21:00 | Burg-Grafik (5 Stufen, 4 Landschaften) im Spiel | Screenshots in `mobile-screenshots/` |

## Nächste Schritte
Balancing (Agent läuft), Browser-Tests grün bekommen, Grafik-Prüfrunden im echten Spiel, Spieletester-Review, Doku, PR.

## Offene Probleme

## Vorschläge für gesperrte Dateien (solange PR #2 offen ist)

**`tests/e2e/mobile.spec.ts`, Zeile 140:** Der Test setzt `s.dayT = 49.9` und erwartet die Tagesergebnisse. Nach der neuen Regel (4.2) endet der Tag erst, wenn alle Gegner tot sind. Das Szenario muss das Feld leeren, die Prüfung bleibt gleich:

```js
await page.evaluate(() => { const s = (window as any).__fondue.session.sim.s; s.gold = 60000; s.offerings = 300; s.enemies = []; s.spawnQueue = []; s.dayT = 49.9; });
```

Sonst ist in dieser Datei nichts zu ändern: `slotPosition`, `slotDiameterCss` und das Antippen des Rads gibt es weiter, jetzt an der Burg.

## Hinweis zum Auftrag
`docs/AUFTRAG-GROSSE-RUNDE.md` ist wortgleich zum Auftrag bis auf eine Stelle: Der lokale Ordnerpfad mit Tims Benutzernamen ist ausgelassen, weil das Repo öffentlich ist (Regel in AGENTS.md).
