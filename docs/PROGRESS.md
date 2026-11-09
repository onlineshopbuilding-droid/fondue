# Fortschritt

## 2026-11-09 01:32 (Europe/Berlin) – Start, Phase 0
- Startzeit per Get-Date: 2026-11-09 01:32:15 +01:00.
- Werkzeuge: node 24.21, git, gh (eingeloggt), ffmpeg, python vorhanden; yt-dlp und cloudflared per winget.
- Repo initialisiert, Pflichtdokumente angelegt.
- Projektgrenze festgelegt, siehe ENTSCHEIDUNGEN E-001.
- Nächster Schritt: Mini-Seite auf GitHub Pages, yt-dlp-Test, Sammelnachricht an Tim.

## 2026-11-09 01:40 – Phase 0 abgeschlossen bis auf cloudflared
- Live-Kette: Repo onlineshopbuilding-droid/fondue (öffentlich), Actions-Lauf 42541385482 = success. Beleg: `curl` auf https://onlineshopbuilding-droid.github.io/fondue/ liefert HTTP 200 und im Bundle „deployment check - build ab7a7cd“.
- yt-dlp 2026.10.26: V6 in 720p ohne Cookies geladen (reference/videos/V6.mp4, 66,8 MB). Browser-Cookies werden nicht gebraucht.
- Connectors vorhanden: TubeAlfred (YouTube-Transkripte), Google Drive.
- Offen: cloudflared-Installation wartet vermutlich auf die Windows-Bestätigung (msiexec läuft, Programm noch nicht vorhanden). Wird nur für Plan B gebraucht.
- docs/AUFTRAG.md bleibt lokal (.gitignore), weil das Repo öffentlich ist und die Datei persönliche Angaben enthält. Commits laufen über die GitHub-Noreply-Adresse.
- Nächster Schritt nach Tims Antwort: E1 (Mechanik- und Timing-Analyse), dann E2.

## 2026-11-09 04:12 – E1 bis E8, Zwischenstand
- Videoauswertung (nur Mechanik und Timing), GDD, Simulation, Netz, Rendering, Menüs, eigene Grafik und Sound fertig.
- Drei unabhängige Tests, Berichte in reference/review/playtest-1.md bis -3.md, wichtige Befunde behoben.
- Belege: `npx vitest run` 84/84 grün; `npx playwright test` 16/16 grün; `playwright.perf.config.ts` 57,6 FPS Mittel bei 200 Gegnern (docs/perf-latest.json); Live-Tests Chrome und Edge grün; Tunnel-Test grün.
- Offen: Firefox nicht automatisch testbar (ENTSCHEIDUNGEN E-011), Sound nicht angehört, Wurfgefühl nicht von Menschen geprüft.
- Nächster Schritt: Abschlussrunden ab 12:00 Uhr.
