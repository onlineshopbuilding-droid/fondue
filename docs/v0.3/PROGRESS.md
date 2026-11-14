# Fondue v0.3 – Fortschritt

Zeiten per `date` (Ortszeit des Laptops, WEST).

## 14.11.2026

- **02:36** Start der Sitzung. Leitung: Claude Fable 5.2.
- **02:36** Etappe 0, Stand geprüft: `main` auf `cbd01c5`, keine offenen Pull Requests, Issue #1 zugewiesen. Werkzeuge: Node 24.21.0, npm 11.19.0, `gh` mit `repo` und `workflow`.
- **02:45** Tags `v0.1` (= `v0-alpha`), `v0.2` und Branch `v0.2` auf `cbd01c5`, Arbeitsbranch `v0.3-dev` gepusht.
- **02:49** **Arbeitsweg B, Leitung an Opus übergeben wegen Fable-Kontingent** (85 % verbraucht, E-063). Claude Opus 5.5 leitet, Subagents mit ausdrücklichem Modell (bauer: opus, pruefer: sonnet).
- **03:00** Etappe 1: `BAUPLAN.md` und `abnahme.json` (34 Einträge, Prüfung wörtlich aus dem Auftrag) committet (`808f5c8`).
- **03:22** Etappe 0 fertig: eigener Speicher-Schlüssel `fondue.v3.profile` (`b8b18f0`), Version v0.3 sichtbar (`0fc4828`). Deploy-PR #11 (nur `deploy.yml`, `AGENTS.md`, `docs/HANDBUCH.md`, geprüft mit `gh pr diff --name-only`), `test` grün, gemergt 03:22. Deploy-Lauf erfolgreich; alle sechs Adressen liefern 200 (`curl`). `/fondue/` nutzt weiter `fondue.profile` (v0.2-Bundle), `/fondue/next/` nur `fondue.v3.` (Bundle geprüft).
- **03:25** Grafik: 25 Waffen × 7 Stufen (`a71dec2`), sieben Burgstufen und Issue #1 (`b9ab40d`). Bewusste Abweichung: Grafik-Pakete liefen vor dem Fundament, weil sie nur Grafikdateien berühren.
- **03:50** Etappe 2, F1: Profil v3, Währungen, Stufen 1–7, Progression (`src/modes/progress.ts`), Käse-Summe 500. F1 und P-Waffen (25 Waffen, Slot-Rollen, 7 Stufen) liefen parallel mit getrennten Dateien. `npm test` 481/481.
- **05:10** Etappe 2, F2: Wellen statt Tage, kein Markt, dauerhafte Burg im Lauf, Belohnungen, Fortsetzen an der Welle, Gegner ×2,5 schneller, ~40 % Anzahl. Erster sichtbarer Gegner 0,42–0,90 s (Koop 1,2 s), vorher 4,3–14,4 s. Parallel: Shop an der Burg und Level-Karte (P-Shop), Entwickler-Werkzeuge F1–F4 (P-Dev). `npx tsc --noEmit` sauber, `npm test` 536/536. `/next/` neu ausgeliefert (05:12).
- **05:15** Etappe 3/4 gestartet: Hände und Stationen (P-Hände), Tutorial und Texte (P-Tutorial), Koop-Ruckeln (P-Coop), Balance (P-Balance).
- **05:50** Nutzungslimit erreicht, alle Agents abgebrochen. **06:22** weiter nach Zurücksetzen.

## Ersetzte Tests

- `tests/unit/shop.test.ts`, `tests/e2e/market.spec.ts`: gelöscht, der Markt im Level entfällt (A1, B1); ersetzt durch Tests der dauerhaften Burg und des Shops (`progress.test.ts`, `tests/e2e/shop.spec.ts`).
- `levels.test.ts`: Sterne-Freischaltungen nach `unlocks.test.ts` (Sterne entfallen).
- `profile.test.ts`, `profile-data.test.ts`, `modes.test.ts`: Sterne-, Gast-Sterne- und Meilenstein-Prüfungen werden zu Prüfungen von Profil v3 und Käse.
- `weight.test.ts`: Yeti allein ab Hand-Stufe 4 statt 3 (C8).
- `round.test.ts`: sieben Burgstufen statt fünf Tore.
- Tag-, Sonnenuntergangs-, Offering-, Ready- und Markt-Tests in `sim`, `round`, `runEnd`, `modes`, `levels`, `flow`, `mobile`, `coop`: werden zu Wellen-, Burg- und Gold-Tests (F2).
- `tests/e2e/coop.spec.ts`, `flow.spec.ts`: prüfen Käse statt Sterne.

## Nach dem Limit (14.11.2026)

- **06:25–07:00** Abgebrochene Pakete fortgesetzt und committet: Hände und Stationen (zweite Hand, gezielter Adlerhaken, Kessel-Stufen), Tutorial und Slot-Einführungen, Koop-Ruckeln (Puffer auf der Host-Uhr, Messwerte in `MESSUNGEN-KOOP.md`), Balance mit Fortschrittslogik der Bots (`docs/balance.md`).
- **07:00–07:40** Nacharbeiten (Sieg-Bildschirm ohne Scrollen auf Handys, Slot-Text an einer Stelle, Snapshot mit bis zu vier Haltern, Reste von Tagen/Markt/Sternen/Offerings entfernt) und Dokumente G4 (AGENTS.md, GDD, HANDBUCH, ARCHITEKTUR).
- **07:40–09:15** Etappe 5, unabhängige Prüfung (Sonnet): 575/575 Unit-Tests, E2E gegen den Build 85 grün / 3 rot (veralteter Adlerhaken-Test), 30 von 34 Abnahme-Einträgen erledigt (`PRUEFUNG.md`).
- **09:15–09:35** Befunde behoben: Adlerhaken-Test durch Test des echten Wurfs ersetzt, Waffen-Tipp je Feuerart, Shop-Hänger (ständig neu gezeichnete Bilder) behoben, späte Boss-Level stärker.
- **09:38** Kommentar mit Bildern in Issue #1, `BERICHT.md` und `TESTEN.md`, Pull Request #12 v0.3-dev → main geöffnet (`Fixes #1`, nicht gemergt).
- **10:10** Nachprüfung (Sonnet): `npm test` 577/577, E2E gegen den Build 88 grün / 0 rot / 4 übersprungen (`look.spec`, nur mit `ALL_SCREENS`), Balance alle Ziele erfüllt, alle sechs Adressen 200, `/next/` ohne `fondue.profile`. `abnahme.json`: 34 erledigt.
- **10:15** `main` in `v0.3-dev` gemergt (Konflikt nur in Doku), PR #12 wieder mergebar; `/next/` neu ausgeliefert.

### Weitere ersetzte Tests
- `tests/e2e/keep.spec.ts` (Adlerhaken): „hinauftragen und loslassen“ wird zu „nur loslassen zählt nicht, ein echter Wurf schon“ (C6, gezielter Haken).
- `marketCamera.test.ts` wird zu `camera.test.ts` (Markt-Kamera entfällt); `dayEnd`-Tests werden zu Tests des Schalters für die zweite Hand.
- **10:50–13:05** CI des Pull Requests #12 war rot (zwei Koop-Tests, danach Wurf-Tests): Wartezeiten in Echtzeit liefen auf dem langsamen CI-Rechner (2 bis 4 Bilder je Sekunde) ab, bevor genug Spielzeit vergangen war. Kein Spielfehler. Die Tests warten jetzt in Spielzeit mit denselben Sekunden (`fc86259`, `1dded8f`, `7ea1b7d`). CI-Lauf 43588558991: alle Prüfungen grün, auch `test`.
