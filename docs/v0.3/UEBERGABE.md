# Übergabe v0.3 (immer aktuell halten)

- **Stand (06:25):** Etappen 0–2 fertig, Etappe 3 großteils fertig (Waffen, Grafik, Burg, Shop, Entwickler-Werkzeuge, Hände/Stationen committet). Unterbrochen durch das Nutzungslimit (05:50): Tutorial (P-Tutorial), Koop-Ruckeln (P-Coop), Balance (P-Balance); ihre Änderungen liegen uncommittet im Hauptordner.
- **Leitung:** Claude Opus 5.5 (Arbeitsweg B, E-063). Subagents immer mit Modell: bauer = opus, pruefer = sonnet.
- **Nächster Schritt:** abgebrochene Pakete fortsetzen und committen, dann Etappe 4 (Balance, Wappen-Grind), Etappe 5 (unabhängige Prüfung durch pruefer), Etappe 6 (PR v0.3-dev → main mit `Fixes #1`, nicht mergen; BERICHT.md, TESTEN.md), `/next/` mit `gh workflow run deploy.yml --ref main` neu ausliefern.
- **Achtung:** `docs/screenshots/*.png` außerhalb von `v0.3/` nie committen. Committen nur mit `git commit -m … -- <pfade>` (geteilte Staging-Area).
