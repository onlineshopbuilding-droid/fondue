# Fondue v0.4 – Fortschrittsprotokoll

Zeiten per `date` vom Laptop. Verbrauch per `get_usage` der Claude-Desktop-App.

## 17.11.2026, 16:42 Uhr – Start, Etappe 0

- **Arbeitsweg:** Weg B. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` ist gesetzt, die Sitzung hat aber kein Werkzeug, um Teammitglieder zu starten. Die Leitung vergibt deshalb alles an Subagents mit den Definitionen `bauer` (Opus 5.5) und `pruefer` (Sonnet 5.5), jeweils mit ausdrücklicher Modellangabe.
- **Modell der Leitung:** Claude Fable 5.2. Der Wochenverbrauch von Fable lag beim Start bei 91 % (über der Schwelle von 85 %). Ein Wechsel der Leitung auf Opus ist aus der Sitzung heraus nicht möglich (die App lässt eine Sitzung ihr eigenes Modell nicht umstellen). Die Leitung hält ihre Schritte deshalb so kurz wie möglich.
- **Verbrauch beim Start (16:43):** 5-Stunden-Fenster 9 %, Woche alle Modelle 80 %, Woche Fable 91 %. Das Wochenfenster setzt sich um 20:59 Uhr zurück.
- **Werkzeuge:** Node 24.21.0, npm 11.19.0, Playwright 1.65.0, `gh` angemeldet mit `repo` und `workflow`. Pflichtprüfung auf `main`: `test`.
- **Branches und Pull Requests:** Offen ist nur Pull Request 12 (v0.3 nach main). Kein fremder Branch wird angefasst.
- **Gesichert:** Tag `v0.3` und eingefrorener Branch `v0.3` auf 927b8b4, beide gepusht. Arbeitsbranch `v0.4-dev` von `v0.3-dev` abgezweigt und gepusht. Tag `v0.1` und Branch `classic` (a9e519c) sowie Tag und Branch `v0.2` (cbd01c5) bestehen.
- **Auftrag:** wörtlich abgelegt als `docs/v0.4/AUFTRAG.md`.
- **Laufende Pakete (16:45):** Deploy-Umbau nach der Versionsregel (bauer), Speicher-Schlüssel `fondue.v4.` mit Übernahme und Versionsnummer 0.4 (bauer, V2/V3), Entwurf des Bauplans (Opus, nur lesend).

### Entscheidungen der Leitung bis hier

- v0.3-Spielstand mit mehr offenen Slots, als die Burg-Stufe erlaubt: Die Burg-Stufe wird bei der Übernahme kostenlos so weit angehoben, dass alle offenen Slots offen bleiben.
- Startwerte „kaufbar ab gewonnenem Level“: Stufe 2 ab 6 (fest), 3 ab 12, 4 ab 20, 5 ab 28, 6 ab 50, 7 ab 75 (fest).
- Ein Gast darf über einen Einladungslink beitreten, auch wenn er Level 3 noch nicht gewonnen hat.
- Options-Tabs: Settings, Scores, Help, Credits, Versions.

## 17:09 Uhr – Etappe 0 abgeschlossen, Etappe 1 abgeschlossen, Fundament läuft

- **Verbrauch (17:09):** 5-Stunden-Fenster 20 %, Woche alle Modelle 82 %, Woche Fable 91 %.
- **Deploy-Umbau erledigt:** Pull Request 13 (nur `.github/workflows/deploy.yml`), Prüfung `test` grün, Merge-Commit 7aaeec4, Deploy-Lauf 44121215224 erfolgreich. Per curl und Playwright (Laptop-Format) geprüft: `/`, `/v0.1/`, `/classic/`, `/v0.2/`, `/v0.3/`, `/next/`, `/next/dev/`, `/dev/` antworten mit 200, laden ohne Konsolenfehler und mit richtigem Basis-Pfad. `/next/` trägt den App-Namen „Fondue v0.4“, `/v0.3/` „Fondue v0.3“. Dass `/fondue/` weiter v0.2 zeigt, folgt daraus, dass der Merge nur den Workflow geändert hat; der Spielinhalt dort wurde nicht gesondert geprüft.
- **V2/V3 (technischer Teil) erledigt:** Commits 1aeef12, e5d7125, 07d2d9a, f2b774e. Speicher-Präfix `fondue.v4.`, einmalige Übernahme aus `fondue.v3.profile` mit Merker `fondue.v4.importedV3`, `GAME_VERSION` 0.4. Belege: `tests/unit/profile-v3import.test.ts`, `tests/e2e/storage.spec.ts`; `npm test` 604 bestanden.
  - Umgestellte Tests (nicht abgeschwächt): `profile-data.test.ts`, `profile.test.ts`, `profile-save.test.ts` prüfen jetzt das Präfix `fondue.v4.`; `dev-tools.spec.ts` liest Version und Präfix aus der Konfiguration.
  - Entwürfe der Entscheidungen auf der Entwickler-Übersicht (`fondue.v3.dev.decisions`) werden nicht übernommen, weil sie zu den v0.3-Entscheidungen gehören.
- **Bauplan und Abnahmeliste:** Commit 6bc0ec2 (`BAUPLAN.md`, `abnahme.json`).
- **Läuft:** Fundament A1 bis A3 (ein bauer). Die Slot-Konfiguration liegt in `src/config/slotTiers.ts`.
- **Nächster Schritt:** Prüfung des Fundaments, dann die fünf parallelen Pakete (Lobby, Options, Karte, Texte, Bots).
