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

## Verlauf zwischen 17:10 und 19:15 Uhr

- **Netzausfall 17:10 bis 19:10 Uhr:** Die Arbeit stand. Das Fundament (A1 bis A3) war bis dahin committet und der Plan für die fünf Pakete geschrieben.
- **Ab 19:15 Uhr:** fünf parallele Bau-Pakete (Lobby, Options, Karte und Koop, Texte und Shop, Balance), dazu Dokumente und Prüfung, alle auf `v0.4-dev` mit getrennten Dateien.

## Ersetzte Tests mit Grund

Stand 17.11.2026, 20:35 Uhr, aus `git log --stat a77caee..HEAD -- tests/` und den Commit-Texten. Kein Test wurde abgeschwächt oder gelöscht, ohne dass ein Test der neuen Regel an seine Stelle trat. Tests für Werfen, Gewicht, Koop-Synchronität, Speichern, Bildschirmformate und Mehrfach-Touch blieben unverändert (die Koop-Spezifikationen und `relay.spec.ts` bekamen nur eine neue Vorbereitung, siehe unten).

**Slots über Burg-Stufe statt Kampagnen-Level (Commit 3afd4ba, Fundament):**
- `tests/unit/unlocks.test.ts`: Der Test „Slot-Level aufsteigend, `openSlots` über Level, Endlos mit dem fünften Slot“ prüft jetzt offene Slots je Burg-Stufe 1 bis 7, Endlos ab Level 10 und Koop-Tisch ab Level 3.
- `tests/unit/weapons.test.ts`: „erste Waffe eines Slots = Slot-Level“ heißt jetzt „keine Waffe vor dem Kauf-Level der Burg-Stufe ihres Slots“.
- `tests/unit/progress.test.ts`: Die Burg-Quote hat den neuen Grund `level` (gewonnenes Level fehlt); der Stufen-Deckel gilt nur noch für Waffen und Hand, ein neuer Test verlangt, dass kein Kauf-Level einer Burg-Stufe unter dem Level des Deckels für dieselbe Stufe liegt.
- `tests/unit/cheats.test.ts`: „alles freischalten“ öffnet den fünften Slot über die Burg-Stufe 5 statt über Level.
- `tests/unit/campaignWaves.test.ts`: Endlos-Grenze von Level 11 auf Level 10; der Challenge-Test „jede Challenge ist erfüllbar“ bleibt und benutzt die neue Regel `weaponUsableIn` (Slot erst `CHALLENGE_SLOT_MARGIN` Level nach dem Kauf-Level der Burg-Stufe).
- `tests/unit/tutorial.test.ts`: `pendingIntros` folgt der Burg-Stufe statt gewonnenen Leveln (später in Commit edd3f8d um Tests der Königs-Sätze und Hilfetexte erweitert).
- `tests/unit/modes.test.ts`: Vorbereitung auf die neue Freischaltung.

**Speicher `fondue.v4.` (Commit 07d2d9a):** `tests/unit/profile-data.test.ts`, `profile.test.ts`, `profile-save.test.ts` und `tests/e2e/dev-tools.spec.ts` prüfen jetzt das Präfix `fondue.v4.` statt `fondue.v3.`, weil v0.4 unter eigenem Schlüssel speichert (Versionsregel). Neu: `profile-v3import.test.ts`, `tests/e2e/storage.spec.ts`, später `castleImport.test.ts` (Commit 19745a3).

**Lobby-Stationen (Commit 4ce3a88, 14c40b0):**
- `tests/unit/lobby.test.ts`: Stationsliste, Deko nach Kampagnen-Level und Storybook-Seiten sind ersetzt durch Stationen von v0.4 (Kampagne, Shop, Koop, Endlos, Options, Continue), Halle je Burg-Stufe 1 bis 7 und Sperre der zwei Tische (Level 3 und 10). Storybook, Help, Credits und Scores sind keine Stationen mehr.
- `tests/e2e/lobby.spec.ts`: „Endlos bis zum fünften Slot gesperrt“ wird zu „Endlos-Tisch kaputt bis Level 10, danach offen“; dazu kaputte und gedeckte Tische.
- `tests/e2e/flow.spec.ts` und `mobile.spec.ts`: die Lobby-Tests (jede Station, HTML-Menü je Station, Version in der Lobby, Stationsliste der Halle) und der Weg zu Scores (Options-Reiter, Commit 9356257) sind auf die neuen Stationen umgestellt; dazu ein Test, dass vom Start bis in ein Level höchstens drei Tipps nötig sind. Wurf- und Pausen-Tests blieben unverändert.
- `tests/unit/assets.test.ts`: Asset-Liste um die neuen Lobby-Bilder (Tische, Wachen, Hallen je Stufe).

**Koop-Tisch ab Level 3 (Commit f8cc806):** `tests/e2e/coop.spec.ts`, `coopStart.spec.ts`, `relay.spec.ts` und `helpers.ts` öffnen vor dem Eröffnen eines Raums den Koop-Tisch (Profil mit gewonnenem Level 3, `setCastleTier`/`unlockEndless` in `helpers.ts`). Geprüft wird weiter dasselbe. Neu: `coopCastle.spec.ts` (Burg-Stufe im Raum).

**Tutorial (Commit 2d8a29e):** `tests/e2e/tutorial.spec.ts`: „Level 2 öffnet den Slow-Slot“ wird zu „Level 2 öffnet keinen Slot; der Slow-Slot kommt mit Burg-Stufe 2“.

**Shop und Sieg (Commits 2286ea8, 1fd34e1, 7a519cf, 28f37bd):** `tests/e2e/shop.spec.ts` öffnet den Slow-Slot über die Burg-Stufe und prüft die Sperre der Burg über das Level; Gold für den Kauf kommt aus den Preisen der Konfiguration statt aus einer festen Zahl (Preise der Balance, 8000 für Stufe 2). `tests/e2e/won.spec.ts` prüft den Sieg-Bildschirm mit „Castle tier N can be built“ statt der Slot-Einführung. Neu: `castleUpgrade.spec.ts`, `storybook.spec.ts`, `options.spec.ts`.

**Preise und Deckel aus der Konfiguration (Commits 3493018, 1edf1b9):** `tests/unit/progress.test.ts`: Der Stufen-Deckel-Test heißt jetzt „2 von Anfang an, 3 nach Level 6, 4 nach Level 10, 5 nach 25, 6 nach 45, 7 nur mit Eagle Perch“ (Balance, E-080).

**Balance (Commits 5137729, e4c4759):** `tests/balance/balance.test.ts` meldet das Kampagnen-Level jedes Burg-Kaufs und die Versuche je Level 1 bis 15; Käufe zwischen Farm-Läufen werden mitgezählt. `tests/unit/campaignTable.test.ts` prüft die neue Spalte „Burg-Stufe kaufbar“ der Level-Tabelle.

Neu hinzugekommen ohne Ersatz: `tests/unit/versionsAndDecisionsV4.test.ts`, `campaignCastle.test.ts`, Erweiterungen in `tests/e2e/dev-tools.spec.ts` (Entwickler-Übersicht, Cheat Burg-Stufe).
