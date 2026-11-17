# Übergabe v0.3 (immer aktuell halten)

- **Stand (10:15):** Etappen 0 bis 6 fertig. `abnahme.json`: 34 von 34 erledigt mit Beleg. Pull Request #12 (v0.3-dev → main, `Fixes #1`) ist offen und wird **nicht** von der KI gemergt; darüber entscheiden Tim oder Lenny. `/fondue/next/` zeigt den finalen Stand.
- **Leitung:** Claude Opus 5.5 (Arbeitsweg B, E-063). Subagents immer mit Modell: bauer = opus, pruefer = sonnet.
- **Was offen ist:** nur auf echten Geräten Prüfbares (Mehrfach-Touch in Safari/Chrome, Speichern in der Home-Bildschirm-App, Koop übers Internet, Bildrate) und Spielgefühl (schnelle Gegner, Leerlauf am Stufen-Deckel, welche zweite Hand). Siehe `BERICHT.md`, „Offen oder ungeprüft“.
- **Nächster Schritt:** Tim und Lenny testen nach `TESTEN.md` und geben über die Entwickler-Übersicht Rückmeldung (`[Entscheidungen]`-Issues). Danach v0.4 (Fahrplan in `BERICHT.md`).
- **Achtung:** `docs/screenshots/*.png` außerhalb von `v0.3/` nie committen. Browser-Tests gegen den Build: `npm run build`, dann `npx playwright test --config tests/playwright.dist.config.ts`.
