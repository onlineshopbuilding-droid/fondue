# Fondue v0.4 – Übergabe (immer aktuell)

Stand: 17.11.2026, 22:35 Uhr.

**v0.4 ist live** unter `/fondue/` (Pull Request 14, Merge-Commit 82cee21, Tag `v0.4`). Alle älteren Adressen laden. Bericht: `BERICHT.md`, Testanleitung: `TESTEN.md`, Befunde: `BEFUNDE.md`.

**Offen für die nächste Sitzung (nach Wichtigkeit):**
1. Balance für schwächere Spieler: Der schwache Bot scheitert zuerst an Level 16 (v0.3: 44). Ansätze stehen in `docs/balance.md`, Abschnitt v0.4.
2. Die Nacharbeiten der letzten halben Stunde von Hand ansehen (Lobby-Beschriftungen und Shop-Größe, Kaufzeile im Shop auf dem iPhone, Sieg-Bildschirme mit „Next level“, Options mit Back oben links). Sie sind nur durch die Tests auf GitHub geprüft.
3. In `abnahme.json` offen: A6 (Texte gegenlesen), C1 (vollständige Durchspiel-Prüfungen), C3 (D-19 und D-20 prüfen), C4 (Bildrate auf echter Grafikkarte messen, `playwright.perf.config.ts`).
4. Lobby-Screenshots für den Laptop neu erzeugen (sie zeigen die Anordnung vor der letzten Nacharbeit).
5. Aufräumen: Worktree `.claude/worktrees/deploy-versions`; ein Test-Worktree im Scratch-Ordner mit Verknüpfungen in `node_modules` (nicht rekursiv löschen, erst die Verknüpfungen entfernen).

**Arbeitsweise dieser Runde:** Leitung Claude Fable 5.2, Bau durch Subagents auf Opus 5.5, Prüfung auf Sonnet 5.5. `/next/` baut der Deploy-Workflow weiter aus `v0.4-dev`, bis eine neue Version das dort umstellt.
