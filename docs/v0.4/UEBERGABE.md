# Fondue v0.4 – Übergabe (immer aktuell)

Stand: 17.11.2026, 19:50 Uhr.

**Weg:** B (Leitung Fable 5.2, Subagents `bauer` = Opus, `pruefer` = Sonnet, Modell immer ausdrücklich angeben).

**Wo stehe ich:** Etappe 2/3. Zwischen 17:10 und 19:10 Uhr stand die Arbeit wegen eines Netzausfalls. Erledigt und gepusht auf `v0.4-dev`: Deploy-Umbau (Pull Request 13 auf `main`), Speicher `fondue.v4.` mit Übernahme (V2), Fundament A1 bis A3 (Slots über Burg-Stufe, Konfiguration in `src/config/slotTiers.ts`), Options mit Tabs und Versionsliste (B6, V1 im Spiel), erster Doku-Durchgang (Versionsregel in `AGENTS.md` und `HANDBUCH.md`, E-072 bis E-078).

**Was läuft (seit 19:15, alle im selben Checkout, getrennte Dateien laut `BAUPLAN.md`):**
- Lobby (B1 bis B5): `src/render/lobby/**`, `src/ui/lobby/**`, `src/ui/app.ts`.
- Karte, Sieg, Koop-Raum, Storybook (B7, A4, A7) und die Vorbereitung der Koop-Tests (Host gewinnt Level 1 bis 3).
- Texte, Shop, Ausbau-Ereignis, Tutorial (A5, A6).
- Bots und Balance (A8, A3-Werte, C5).

**Als Nächstes:** Ergebnisse prüfen, alle Tests in ruhigem Stand laufen lassen, `/next/` neu ausliefern, drei Durchspiel-Prüfungen (C1) nach `docs/v0.4/BEFUNDE.md`, Befunde beheben, Doku nachziehen (Lobby, Options, Karte, Balance, `OFFENE-ENTSCHEIDUNGEN.md`), `abnahme.json` mit Belegen füllen, Schlussprüfung.

**Feste Zeiten:** 21:15 Baustopp, 21:45 Abschluss (Pull Request `v0.4-dev` nach `main`, Pull Request 12 schließen, Tag `v0.4`), 22:30 Ende. Bis 22:20 kein grünes `test` auf GitHub: nicht mergen, v0.4 bleibt unter `/next/`.

**Nach einer Pause lesen:** diese Datei, dann `abnahme.json`, dann die betroffenen Teile von `AUFTRAG.md`. Verlauf und Entscheidungen stehen in `PROGRESS.md`.
