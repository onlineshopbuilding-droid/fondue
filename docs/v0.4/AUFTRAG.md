# Fondue v0.4 – Auftrag für Claude Code

Stand: 17.11.2026, 16:45 Uhr. Auftraggeber: Tim, zusammen mit Lenny. Repo: onlineshopbuilding-droid/fondue. Ausgangsstand: Branch `v0.3-dev` (letzter Commit 927b8b4 vom 14.11.2026, Pull Request 12 offen). `main` ist veraltet und steht noch auf v0.2.

Ende der Arbeitszeit: **heute, 17.11.2026, 22:30 Uhr**. Bis dahin ist v0.4 live, die alten Versionen sind gesichert, und Bericht und Testanleitung liegen im Repo.

## 0. Worum es geht und warum

Tim und Lenny bauen „Fondue“, ein eigenes Wurfspiel für das Handy im Querformat. Ziel ist eine fertige App im App Store und bei Google Play (v1.0), zunächst nur für sie und Freunde. v0.3 hat das Grundkonzept festgelegt: dauerhafte Burg mit sieben Stufen, Käse, Gold und Raider Crests, Level mit Wellen, fünf Slots mit festen Aufgaben, 25 Waffen, Shop an der Burg. Lies den Bericht `docs/v0.3/BERICHT.md`, bevor du anfängst.

v0.4 ändert zwei Dinge gezielt und macht danach das ganze Spiel glatter:

1. **Die Burg wird zum Fortschrittsmaß.** Wer gefragt wird „Wie weit bist du in Fondue?“, soll antworten können: „Level 34 in der Kampagne“ oder „Burg-Stufe 4“. Deshalb öffnen die Burg-Stufen die Slots, nicht mehr die Kampagnen-Level, und die Lobby sieht auf jeder Burg-Stufe anders aus.
2. **Die Lobby wird neu angeordnet und aufgeräumt.** Weniger Stationen, klare Mitte, Modi, die man sich erst erspielt.
3. **Feinschliff:** Alles, was hakt, nicht flüssig läuft, uneinheitlich ist oder in der Bedienung unklar oder umständlich ist, wird gefunden und vereinfacht.

Grundregel des Projekts: Fondue ist ein eigenes Spiel. Nichts wird aus anderen Spielen übernommen, keine Namen, Figuren, Grafik, Level oder Bildschirmaufbau. Neue Inhalte entstehen aus Fondues Welt: Alpenburg, König Fridolin, eine Räuberarmee aus Mäusen und Ratten in Ritterrüstung, Yeti, Krähen, Käse.

Lies zuerst `AGENTS.md`, `docs/HANDBUCH.md`, `docs/ARCHITEKTUR.md`, `docs/GDD.md`, `docs/ENTSCHEIDUNGEN.md` und alles in `docs/v0.3/` (Auftrag, Bericht, Prüfung, Testanleitung), jeweils auf dem Stand von `v0.3-dev`. Wo dieser Auftrag etwas Bestehendes ändert, gilt dieser Auftrag.

## 1. Neue Versionsregel (gilt ab jetzt dauerhaft)

Tim hat entschieden, wie Fondue ab jetzt veröffentlicht wird. Trag diese Regel in `AGENTS.md` und `docs/HANDBUCH.md` ein, damit jede künftige Sitzung sie kennt (Änderung V1).

- Versionen heißen v0.1, v0.2, v0.3, v0.4 … v1.0, v1.1 und so weiter.
- **Jede ältere Version bleibt dauerhaft spielbar** unter `https://onlineshopbuilding-droid.github.io/fondue/vX.Y/`: Classic unter `/v0.1/`, der heutige Stand von `main` unter `/v0.2/`, v0.3 unter `/v0.3/`, und ab v0.5 auch v0.4 unter `/v0.4/`. Jede Version hat dafür einen Tag `vX.Y` und einen eingefrorenen Branch `vX.Y`.
- **Die neueste Version darf direkt nach `main` und geht damit live** unter `/fondue/`. Dafür ist keine Freigabe von Tim oder Lenny mehr nötig und keine große Prüfung, weil die alten Versionen gesichert sind. Die Pflichtprüfung `test`, die GitHub vor jedem Merge verlangt, bleibt bestehen und muss grün sein.
- Jede Version hat ihren eigenen Speicher-Schlüssel im Browser, weil alle Adressen auf derselben Herkunft liegen und sich den Speicher teilen. Eine neue Version darf den Spielstand der Vorgängerversion einmalig lesen und in ihr eigenes Format übernehmen, ändert oder löscht ihn aber nie. Dann funktioniert die alte Version unter `/vX.Y/` weiter mit ihrem Stand.
- `/fondue/classic/` bleibt erreichbar, damit alte Links nicht brechen, und zeigt dasselbe wie `/v0.1/`.
- `/fondue/next/` bleibt die Testadresse für die Version, die gerade gebaut wird.

## 2. Rahmen: was du darfst und was nicht

Ohne Rückfrage erlaubt, das sind Routineschritte:

- Tags `v0.3` und einen eingefrorenen Branch `v0.3` auf den heutigen Stand von `v0.3-dev` (927b8b4) setzen. Den Arbeitsbranch `v0.4-dev` von `v0.3-dev` abzweigen.
- Auf deinen Branches committen und pushen, Pull Requests stellen, den Deploy-Workflow mit `gh workflow run` starten.
- Den Deploy-Workflow (`.github/workflows/deploy.yml`) nach der Versionsregel umbauen und per Pull Request nach `main` mergen, sobald `test` grün ist. Er baut dann `/fondue/` aus `main`, `/v0.1/` (und `/classic/`) aus `classic`, `/v0.2/` aus `v0.2`, `/v0.3/` aus `v0.3`, `/next/` und `/next/dev/` aus `v0.4-dev`, jeweils mit eigenem Basis-Pfad. Dieser Merge ändert das Spiel unter `/fondue/` noch nicht.
- **Am Ende v0.4 nach `main` mergen und damit live stellen** (Etappe 6), sobald `test` grün ist. Pull Request 12 (v0.3 nach main) schließt du mit einem kurzen Kommentar, dass v0.3 unter `/v0.3/` gesichert ist und der Pull Request für v0.4 ihn ersetzt. v0.4 enthält v0.3 vollständig.
- Dateien umstrukturieren, Code löschen, der zu einem entfernten Verhalten gehört, Tests für entfernte Mechaniken durch Tests des neuen Verhaltens ersetzen.
- Pakete aus npm installieren, wenn sie für Tests oder Werkzeuge nötig sind.

Nicht erlaubt, jeweils mit Grund:

- Force-Push, Branches oder Tags löschen oder verschieben. Grund: Die alten Versionen sind das Sicherheitsnetz der neuen Versionsregel.
- Die Spielstände anderer Versionen ändern oder löschen (`fondue.profile` von v0.2, `fondue.v3.*` von v0.3). Lesen zur Übernahme ist erlaubt (Abschnitt 1).
- Zugangsdaten oder persönliche Daten ins Repo (es ist öffentlich), Systemeinstellungen ändern, `git add -A` oder `git add .` (Testläufe ändern `docs/screenshots/`).
- Den Skill „Unlazy“ verwenden.

Abweichungen von `AGENTS.md`: Die Frage „committen oder veröffentlichen“ am Sitzungsende entfällt. Committen, Pushen und das Veröffentlichen von v0.4 sind freigegeben. Alle anderen Regeln aus `AGENTS.md` gelten weiter.

**Keine Rückfragen.** Tim ist nicht erreichbar. Was dieser Auftrag offen lässt, entscheidest du im Sinne der Ziele, hältst es mit Begründung in `docs/ENTSCHEIDUNGEN.md` fest und setzt es auf die Liste der offenen Entscheidungen der Entwickler-Übersicht. Stoppe nur, wenn eine Aktion riskant oder unumkehrbar wäre und dieser Auftrag sie nicht erlaubt. Dann arbeite an allem anderen weiter und nenne den Punkt im Bericht.

## 3. Team, Modelle, Zeit und Gedächtnis

### 3.1 Rollen

- **Leitung: Claude Fable 5.2 (diese Sitzung).** Du liest, planst, verteilst die Arbeit, prüfst Ergebnisse gegen den Plan, triffst die offenen Entscheidungen und führst Merges und Auslieferung durch. Programmiere selbst so wenig wie möglich. Tims Kontingent für diese Woche ist knapp, und Fable ist das teuerste Modell. Halte deine eigenen Schritte kurz und lass die Teammitglieder arbeiten, statt ihre Arbeit selbst zu übernehmen.
- **Bauen: Claude Opus 5.5.** Alles Programmieren, Gestalten und Zeichnen.
- **Prüfen und Einfaches: Claude Sonnet 5.5.** Tests laufen lassen und auswerten, Bot- und Balance-Läufe, Screenshots auf den drei Formaten, Abnahmeliste mit Belegen füllen, Texte gegenlesen, Doku nachziehen, die Durchspiel-Prüfungen (Etappe 4). Sonnet baut keine Spielsysteme.

### 3.2 Aufbau

Auf `v0.3-dev` liegen schon `.claude/agents/bauer.md` (Opus) und `.claude/agents/pruefer.md` (Sonnet). Prüfe, dass dort `model: opus` beziehungsweise `model: sonnet` steht, und korrigiere es sonst.

- **Weg A, bevorzugt: Agent-Team**, wenn `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` gesetzt ist. Starte die Teammitglieder `bauer` („Use Opus 5.5“) und `pruefer` („Use Sonnet 5.5“). Sie dürfen für klar getrennte Pakete Subagents starten, immer mit ausdrücklicher Modellangabe (`opus` beziehungsweise `sonnet`).
- **Weg B, sonst:** Du bleibst Leitung und vergibst alles an Subagents mit den Definitionen `bauer` und `pruefer`. Gib bei jedem Start das Modell zusätzlich ausdrücklich an. Grund: Ohne Angabe laufen Subagents auf dem Modell der Leitung, also auf Fable, und das verbraucht Tims Kontingent in kurzer Zeit.
- Halte im Fortschrittsprotokoll fest, welcher Weg läuft und welches Modell die Leitung tatsächlich hat. In v0.3 musste die Leitung auf Opus wechseln, weil Fable fast aufgebraucht war. Liegt Fable beim Start über 85 % Wochenverbrauch, darfst du das wieder so machen. Halte es dann fest.

### 3.3 Wie du Arbeit vergibst

Teammitglieder und Subagents kennen diesen Chat nicht. Jeder Auftrag an sie enthält das Ziel und die IDs der Änderungen aus Abschnitt 5, welche Dateien ihnen gehören und welche sie nicht anfassen, was am Ende vorliegen soll und woran es geprüft wird, den Hinweis, zuerst `docs/v0.4/BAUPLAN.md` und die betroffenen Abschnitte dieses Auftrags zu lesen, und die aktuelle Uhrzeit (per `date`) mit der Zeit, bis wann das Paket fertig sein soll. Zwei Agents bearbeiten nie gleichzeitig dieselbe Datei. Pakete von etwa 45 bis 90 Minuten, damit du dazwischen prüfen und umsteuern kannst.

### 3.4 Zeit und Verbrauch

- Hol die Uhrzeit immer mit `date`, schätze sie nie. Notiere die Startzeit in `docs/v0.4/PROGRESS.md`.
- **Prüfe Tims Verbrauch regelmäßig**: beim Start, nach jedem abgeschlossenen Paket und mindestens alle 30 Minuten, mit dem Werkzeug, das dir die Umgebung dafür gibt (in der Claude-Desktop-App `get_usage`). Notiere den Wert im Fortschrittsprotokoll. Das Kontingent darf vollständig aufgebraucht werden. Plane aber so, dass das Wichtigste zuerst fertig wird: Wenn der Verbrauch knapp wird, haben die Änderungen A und B (Burg und Lobby) Vorrang vor dem allgemeinen Feinschliff C.
- Arbeite so, dass ein Abbruch jederzeit sauber ist: kleine Commits, regelmäßig pushen, `/next/` nach jedem großen Paket neu ausliefern, die Übergabedatei nach jedem Paket aktualisieren.
- Wenn ein Nutzungslimit greift: Hast du ein Werkzeug, mit dem du dich zu einer bestimmten Zeit selbst wieder starten kannst, stell es auf kurz nach dem Zurücksetzen. Sonst sorgt die Übergabedatei dafür, dass ein einfaches „weiter“ von Tim reicht.
- **Zeitplan mit festen Punkten:** um 21:15 Uhr keine neuen Bauaufträge mehr, nur Fertigstellen und Prüfen. Um 21:45 Uhr beginnt der Abschluss (Etappe 6). Um 22:30 Uhr ist alles live, gesichert und berichtet. Hör vorher nicht auf, nur weil der Plan scheinbar erledigt ist. Restzeit geht in den Feinschliff (C).

### 3.5 Gedächtnis im Repo

Lege diesen Auftrag wörtlich als `docs/v0.4/AUFTRAG.md` ab. Führe dazu:

- `docs/v0.4/BAUPLAN.md`: Pakete mit Dateigrenzen, Reihenfolge.
- `docs/v0.4/abnahme.json`: je Änderungs-ID aus Abschnitt 5 ein Eintrag mit `id`, `titel`, `pruefung`, `status` (offen, erledigt, abgeschaltet) und `beleg`. Ein Eintrag wird nur mit echtem Beleg auf erledigt gesetzt: Testname, Messwert, Screenshot-Pfad oder Bot-Lauf. Einträge werden nie gelöscht oder umformuliert.
- `docs/v0.4/PROGRESS.md`: Zeitstempel per `date`, Etappe, Erledigtes mit Beleg, Verbrauchswerte, nächster Schritt, Probleme, ersetzte Tests mit Grund.
- `docs/v0.4/UEBERGABE.md`: immer aktuell und kurz. Wo stehe ich, was läuft, was kommt als Nächstes, welcher Weg (A oder B).

Nach jeder Kontext-Zusammenfassung, nach einem Neustart und nach einer Limit-Pause liest du zuerst `UEBERGABE.md`, dann `abnahme.json`, dann die betroffenen Teile von `AUFTRAG.md`.

## 4. Arbeitsweise und Etappen

Du bist für v0.4 verantwortlich. Das Repo wurde vollständig von KI gebaut, und für diese Runde bist du sein Maintainer. Ändere, was der Auftrag verlangt, und räume Reste des alten Verhaltens vollständig weg: Nach v0.4 gibt es keine Slot-Freischaltung über Kampagnen-Level mehr, keine Lobby-Deko, die am Kampagnen-Level hängt, und keine Storybook-, Help-, Credits- oder Scores-Station in der Lobby, weder im Spiel noch in Texten, Tests oder Doku.

**Alles muss ins ganze Spiel passen.** Jede Änderung zieht Texte, Königs-Sätze, Hilfe, Tipps, Tutorial, Shop, Level-Karte, Challenges, Balance, Bots, Koop, Entwickler-Übersicht und Tests mit. Nutze den Stimmigkeits-Check in `docs/HANDBUCH.md`, Abschnitt 9.

**Tests:** Tests für Verhalten, das bleibt (Werfen, Gewicht, Koop-Synchronität, Speichern, Bildschirmformate, Mehrfach-Touch), werden nie abgeschwächt oder gelöscht. Tests für Verhalten, das v0.4 bewusst ändert (Slots über Kampagnen-Level, Lobby-Stationen), ersetzt du durch Tests des neuen Verhaltens und hältst jede ersetzte Datei mit Grund in `PROGRESS.md` fest.

**Konfiguration statt fester Zahlen:** Alle neuen Werte (Burg-Stufe je Slot, Kampagnen-Level je Burg-Stufe, Preise, Lobby-Aufbau je Burg-Stufe, Freischalt-Level der Tische) liegen in `src/config/`.

**Ehrliche Fortschrittsangaben:** Prüfe jede Aussage gegen ein Werkzeug-Ergebnis aus dieser Sitzung, bevor du sie meldest oder einen Punkt abhakst. Was nicht geprüft ist, nennst du ungeprüft. Wenn Tests scheitern, sag es mit der Ausgabe.

**Selbst prüfen, aber nicht allein:** Nach jedem großen Paket prüft ein `pruefer` mit frischem Kontext, der die Arbeit nicht gebaut hat. Wer seine eigene Arbeit bewertet, übersieht mehr.

**Die Arbeit zu Ende bringen:** Hör nicht auf, solange du Arbeit aus diesem Auftrag schuldest. Wenn du dich dabei ertappst, anzubieten zu warten oder um eine Richtung zu bitten, mach stattdessen mit dem nächsten Teil weiter. Gewöhnliche Hindernisse (Fehler, Timeouts, scheiternde Tests auf GitHub, leere Ergebnisse) untersuchst du und arbeitest dich durch. Das hebt die Vorsicht bei riskanten Aktionen nicht auf.

**Gründlich statt halb:** Was nicht sauber fertig wird, schaltest du sauber ab, setzt es in `abnahme.json` auf abgeschaltet und nennst es im Bericht.

### Etappen

**Etappe 0, etwa 17:00 bis 17:30: Sichern und Versionen einrichten.**
1. `git fetch`, offene Pull Requests und Branches ansehen. Arbeitet jemand anderes an einem Branch, fasst du ihn nicht an.
2. Werkzeuge prüfen: Node, npm, Playwright, `gh` mit Rechten für Pull Requests, Merges und Workflows. Verbrauch prüfen und notieren.
3. Tag `v0.3` und eingefrorenen Branch `v0.3` auf 927b8b4 setzen, `v0.4-dev` von `v0.3-dev` abzweigen. Tag `v0.1` und Branch `classic` sowie Tag und Branch `v0.2` existieren schon, prüfe es.
4. Eigener Speicher-Schlüssel für v0.4 (Änderung V2), bevor `/next/` zum ersten Mal v0.4 zeigt.
5. Deploy-Umbau nach Abschnitt 1 und 2 als Pull Request nach `main`, mergen bei grünem `test`, Auslieferung starten.
Prüfung: `/fondue/` zeigt weiter v0.2. `/v0.1/`, `/classic/`, `/v0.2/`, `/v0.3/` und `/next/` laden (per `curl` und kurzem Playwright-Aufruf), `/next/` zeigt „v0.4“.

**Etappe 1, bis etwa 17:45: Bauplan.** `BAUPLAN.md` und `abnahme.json` aus Abschnitt 5. Plane zuerst, wie die Freischaltung von der Kampagne auf die Burg umzieht, weil Shop, Challenges, Tutorial, Endlos und Bots darauf aufbauen.

**Etappe 2, bis etwa 19:15: Burg als Fortschritt (A), dann Lobby (B).** Erst das Fundament A1 bis A3 (ein bauer, nacheinander). Danach parallel mit getrennten Dateien: Lobby-Aufbau und Lobby-Grafik (B1 bis B5), Options-Tabs (B6), Storybook auf der Kampagnen-Karte (B7), Texte und Tutorial (A6, A7), Balance-Vorbereitung der Bots (A8). Prüfung je Paket durch einen pruefer.

**Etappe 3, bis etwa 20:00: Balance.** Bot-Läufe nach A8, Werte anpassen, `docs/balance.md` nachziehen.

**Etappe 4, bis etwa 21:15: Feinschliff (C).** Zuerst die Durchspiel-Prüfungen (C1), dann die Befunde nach Wichtigkeit abarbeiten (C2 bis C5).

**Etappe 5, bis etwa 21:45: Unabhängige Schlussprüfung.** Ein pruefer mit frischem Kontext geht `abnahme.json` gegen Code, Tests und Belege durch und spielt v0.4 auf den drei Formaten mit frischem Profil von der Vorrunde bis Burg-Stufe 3 durch, dazu mit Cheats in Burg-Stufe 5 und 7. Gefundene Fehler gehen an bauer zurück.

**Etappe 6, ab 21:45: Abschluss.** Alle Tests grün (`npm test`, `npm run test:e2e`, `npm run balance`). Pull Request `v0.4-dev` nach `main`, Pull Request 12 schließen (Abschnitt 2), bei grünem `test` mergen. Danach Tag `v0.4` auf den gemergten Stand setzen. Auslieferung prüfen: `/fondue/` zeigt v0.4, alle alten Adressen laden weiter. Bericht und Testanleitung schreiben (Abschnitt 10). Schlägt `test` auf GitHub fehl und lässt es sich bis 22:20 Uhr nicht beheben, wird nicht gemergt. v0.4 bleibt dann unter `/next/` spielbar, und der Bericht sagt das klar.

## 5. Die Änderungen

Jede Änderung hat eine ID. Diese IDs stehen genau so in `abnahme.json`. „Prüfung“ sagt, woran der Punkt als erledigt gilt. Spieltexte sind auf Englisch.

### V. Versionen

**V1 Versionsregel festhalten.** Die Regel aus Abschnitt 1 steht in `AGENTS.md` (Abschnitt „Veröffentlichen“ ersetzen) und in `docs/HANDBUCH.md`. Die Entwickler-Übersicht und die Options zeigen eine kleine Liste aller spielbaren Versionen mit Link. Prüfung: Text in beiden Dateien; Screenshot der Versionsliste.

**V2 Speicher für v0.4.** Eigener Schlüssel, zum Beispiel `fondue.v4.profile`. Beim ersten Start übernimmt v0.4 einmalig einen vorhandenen v0.3-Spielstand (`fondue.v3.*`) und rechnet ihn auf die neuen Regeln um, ohne den v0.3-Stand zu verändern. Wie ein v0.3-Spielstand mit offenen Slots, aber niedriger Burg-Stufe umgerechnet wird, entscheidest du (Abschnitt 8). Prüfung: Unit-Test der Übernahme; Test, dass `fondue.v3.*` und `fondue.profile` danach unverändert sind.

**V3 Versionsnummer.** „v0.4“ steht sichtbar in den Options und klein in der Lobby. Prüfung: Screenshot.

### A. Die Burg als Fortschrittsmaß

**A1 Slots über Burg-Stufen.** Die Slots öffnen nicht mehr über Kampagnen-Level, sondern über die Burg-Stufe:

| Burg-Stufe | öffnet Slot |
|---|---|
| 1 (Start) | Damage (das Rolling Wheel aus der Vorrunde) |
| 2 | Slow |
| 3 | Gate |
| 4 | Support |
| 5 | Passive |
| 6 und 7 | keinen Slot, aber mehr Torleben, prächtigere Burg und neue Lobby |

Beim Öffnen eines Slots erscheint wie bisher die kurze Einführung mit einem Satz von König Fridolin, jetzt ausgelöst durch den Burg-Ausbau. Prüfung: Unit-Test für jede Burg-Stufe und ihre offenen Slots; Browser-Test, der nach dem Kauf von Burg-Stufe 2 die Einführung des Slow-Slots sieht.

**A2 Burg-Stufen brauchen Gold und ein Kampagnen-Level.** Jede Burg-Stufe ab 2 kostet Gold (Stufe 7 zusätzlich Raider Crests wie in v0.3) und wird erst kaufbar, wenn ein bestimmtes Kampagnen-Level gewonnen ist:

| Burg-Stufe | kaufbar ab gewonnenem Level |
|---|---|
| 2 | 6 (fest) |
| 3, 4, 5, 6 | dazwischen, von dir mit Bots festgelegt, Stufe 6 vor Level 75 |
| 7 | 75 (fest) |

Der Shop zeigt bei einer gesperrten Stufe in einem klaren Satz, was fehlt, zum Beispiel „Win level 6 to build this“ oder „You need 400 more gold“. Prüfung: Unit-Test für Sperre und Kauf; Level-Tabelle der Entwickler-Übersicht zeigt, ab welchem Level jede Burg-Stufe kaufbar ist.

**A3 Kampagne und Endlos passen dazu.** Weil Slow erst ab Burg-Stufe 2 (frühestens nach Level 6) offen ist, müssen die frühen Level mit nur dem Damage-Slot gut spielbar und spannend sein. Prüfe und passe an: Gegner und Wellen der Level 1 bis 15, Freischalt-Level und Käse-Preise der Waffen (eine Waffe für einen noch geschlossenen Slot ergibt keinen Sinn), den Stufen-Deckel je Kampagnen-Abschnitt aus `src/config/tiers.ts`, Kessel (Level 16) und Adlerhaken (Level 70). **Challenges** dürfen nur verlangen, was man an dieser Stelle sicher haben kann: Eine Challenge mit einer Waffe eines Slots ist erst erlaubt, wenn die nötige Burg-Stufe dort sicher kaufbar ist. Die Summe aller Käse-Preise bleibt genau 500. Prüfung: bestehender Test „jede Challenge ist erfüllbar“ auf die neue Regel umgestellt und grün; Test Käse-Summe 500 grün.

**A4 Das Burg-Level ist überall sichtbar.** Die Burg-Stufe steht mit Namen und Zahl gut sichtbar in der Lobby (zum Beispiel am Banner über dem König), im Shop, auf der Kampagnen-Karte neben dem Kampagnen-Fortschritt, im Koop-Raum neben jedem Spielernamen und auf dem Sieg-Bildschirm, wenn eine neue Burg-Stufe kaufbar geworden ist. Prüfung: Screenshots dieser Stellen auf allen drei Formaten.

**A5 Burg-Ausbau ist ein Ereignis.** Ein Burg-Upgrade ist der große Moment des Spiels: kurze Animation an der Burg, ein Satz des Königs, sichtbar neuer Slot, und beim nächsten Betreten zeigt die Lobby ihr neues Aussehen (B5). Prüfung: Browser-Test kauft eine Burg-Stufe und sieht Animation und Satz; Screenshot.

**A6 Tutorial und Texte.** Tutorial, Level-1-Führung, Hilfe, Tipps, Königs-Sätze und Level-Karte erklären den neuen Weg in wenigen Sätzen: Gold verdienen, Burg ausbauen, neuer Slot. Wo der König heute bei Level 2, 4, 7 und 11 einen neuen Slot ankündigt, kündigt er stattdessen an, wenn eine neue Burg-Stufe kaufbar wird. Prüfung: Suche in allen Spieltexten findet keine Stelle mehr, die Slots an Kampagnen-Level knüpft; pruefer liest alle geänderten Texte gegen.

**A7 Koop.** Gespielt wird weiter mit der Burg des Hosts. Im Koop-Raum sieht jeder die Burg-Stufe des anderen. Prüfung: Koop-Browser-Test sieht beide Burg-Stufen.

**A8 Balance mit Bots.** Die Bots lernen die neue Reihenfolge: Gold sparen, Burg ausbauen, sobald es geht. Ziele: Der mittlere Bot kauft Burg-Stufe 2 bald nach Level 6 und hat den fünften Slot etwa bis Level 20 bis 30 (Startwert). Die frühen Level ohne zweiten Slot sind für den mittleren Bot schaffbar, aber nicht belanglos. Die übrigen Balance-Ziele aus v0.3 (`docs/balance.md`) gelten weiter: Ohne Ausbau bleibt man stecken, gute Spieler werden spät gefordert, Bosse brauchen mehr Versuche, zu zweit ist es nicht leichter als allein. Prüfung: `npm run balance` mit Ergebnissen in `docs/balance.md`, darunter das Kampagnen-Level, bei dem der mittlere Bot jede Burg-Stufe kauft.

### B. Die neue Lobby

**B1 Aufbau der Halle.** Die Lobby bleibt die Halle im Inneren der Burg, wird aber neu angeordnet:
- **Rechts:** König Fridolin sitzt mit zwei Rittern an einem großen, dampfenden Fondue-Kessel. Die Ritter sind Wachen des Königs, nicht die Räuber. Ein Tipp auf den König bringt wie bisher einen Satz.
- **In der Mitte:** der Kampagnen-Tisch mit der Karte. Er ist die größte und auffälligste Station, denn die Kampagne ist das Hauptspiel.
- **Direkt neben dem Kampagnen-Tisch:** der Shop.
- **Koop-Tisch und Endlos-Tisch** an eigenen Plätzen in der Halle (B3, B4).
- **Oben in einer Ecke:** ein kleines Zahnrad für die Options (B6).
- „Continue“, wenn ein unterbrochenes Level wartet, bleibt gut sichtbar.
- Freigeschaltete Waffen hängen weiter an der Wand, solange es die Halle nicht überlädt.

Gestalte die Halle im bestehenden Filzpuppen-Stil (dunkle Umrisslinie, warme Farben, Licht von links oben). Probiere zwei bis drei Anordnungen, bewerte Screenshots auf allen drei Formaten und nimm die klarste. Alle Tippflächen mindestens 44 CSS-Pixel. Die Grafik bleibt austauschbar (`docs/GRAFIK-AUSTAUSCHEN.md`). Prüfung: Screenshots auf allen drei Formaten; pruefer bestätigt mit frischem Blick, dass man ohne Erklärung erkennt, wo es zur Kampagne, zum Shop und zu den Options geht.

**B2 Was aus der Lobby verschwindet.** Storybook, Help, Credits und Scores sind keine Stationen in der Halle mehr. Ebenso der bisherige Endlos-Topf in der Mitte. Prüfung: Unit-Test der Stationsliste; Screenshot.

**B3 Koop-Tisch.** Bis Kampagnen-Level 3 gewonnen ist, steht dort ein kaputter Tisch (umgekippt, gebrochenes Bein, Staub). Ein Tipp darauf zeigt einen kurzen Satz, zum Beispiel „Win level 3 and the carpenters will fix this table for a feast with a friend“. Danach ist der Tisch aufgebaut, gedeckt und öffnet den Koop. Prüfung: Unit-Test der Sperre; Screenshots kaputt und aufgebaut.

**B4 Endlos-Tisch.** Wie B3, aber aufgebaut ab gewonnenem Kampagnen-Level 10. Endlos öffnet damit ab Level 10 und nicht mehr mit dem fünften Slot. Im Endlos spielt man mit seiner eigenen Burg, auch wenn noch nicht alle Slots offen sind. Prüfung: Unit-Test, dass Endlos vor Level 10 gesperrt und danach offen ist; Screenshots kaputt und aufgebaut.

**B5 Die Halle wächst mit der Burg-Stufe.** Die Lobby-Deko hängt nicht mehr am Kampagnen-Level, sondern an der Burg-Stufe. Jede der sieben Burg-Stufen hat ein erkennbar eigenes Aussehen, passend zu ihrem Namen (Oak Gate bis Alpine Citadel): von einer schlichten Holzhalle mit Stroh und einfachem Kessel bis zur prächtigen Festungshalle mit Gold, Bannern, Kronleuchtern und Käse-Schätzen. Wände, Boden, Fenster, Kessel und Tische ändern sich mit. Der Unterschied ist auf den ersten Blick sichtbar, nicht nur in kleinen Details. Prüfung: Screenshots aller sieben Burg-Stufen auf allen drei Formaten in `docs/screenshots/v0.4/`.

**B6 Options mit Tabs.** Ein Tipp auf das Zahnrad öffnet die Options mit Tabs, zum Beispiel Settings, Scores, Help, Credits, dazu die Versionsliste (V1) und das Entwickler-Menü wie bisher. Bestenliste, Hilfe und Credits sind nur noch dort erreichbar. Prüfung: Browser-Test öffnet jeden Tab auf allen drei Formaten.

**B7 Storybook auf der Kampagnen-Karte.** Das Storybook öffnet man über ein kleines Buch oben in einer Ecke der Kampagnen-Karte. Es bleibt eher unauffällig, aber gut tippbar. Prüfung: Browser-Test öffnet das Storybook von der Kampagnen-Karte aus.

### C. Feinschliff: glatter, einfacher, stimmiger

**C1 Durchspiel-Prüfungen mit frischem Blick.** Drei pruefer, die den Code nicht kennen, spielen v0.4 wie neue Spieler, jeder auf einem der drei Formate (iPhone 16 quer, OnePlus 8T quer, Laptop), mit frischem Profil von der Vorrunde bis mindestens Level 8 und mit Cheats in einen späten Stand. Sie nutzen nur Tippen, Wischen und Maus wie ein Mensch, machen Screenshots und notieren jede Stelle, an der sie zögern, suchen, sich vertippen, warten müssen oder etwas nicht verstehen, dazu jeden Fehler, jedes Ruckeln, jeden abgeschnittenen oder überdeckten Text und jede Uneinheitlichkeit (Begriffe, Knöpfe, Farben, Reihenfolge von „Back“ und „Weiter“). Ergebnis: `docs/v0.4/BEFUNDE.md` mit jedem Befund, Gerät, Screenshot und Wichtigkeit (stört stark, stört, Kleinigkeit). Prüfung: die Datei mit mindestens einem vollständigen Durchgang je Format.

**C2 Befunde abarbeiten.** Die Befunde werden nach Wichtigkeit behoben, zuerst alles, was stark stört. Jeder Befund bekommt in `BEFUNDE.md` den Status behoben (mit Commit) oder bewusst offen (mit Grund). Prüfung: Alle Befunde der Stufe „stört stark“ sind behoben oder begründet offen.

**C3 Einfache, einheitliche Bedienung.** Dabei gelten diese Ziele: Jeder Bildschirm hat eine klare Hauptaktion. Zurück ist immer an derselben Stelle. Gleiche Dinge heißen und sehen überall gleich aus. Kein Fenster verdeckt ein anderes oder ein Banner (die alten Punkte D-19 und D-20 prüfen, ob sie in v0.3 noch auftreten). Vom Start der App bis in ein Level sind höchstens drei Tipps nötig. Prüfung: pruefer bestätigt die Ziele mit Screenshots; Browser-Test zählt die Tipps bis zum Spielstart.

**C4 Flüssig.** Übergänge (Kamerafahrt in die Halle, Shop, Level-Start, Sieg) laufen ohne Hänger, Wartezeiten ohne Rückmeldung gibt es nicht. Miss die Bildrate in der neuen Lobby und im Spiel auf den drei Formaten. Prüfung: Messwerte im Bericht, Lobby mindestens 55 Bilder pro Sekunde im Testbrowser am Laptop (Startwert).

**C5 Bekannte offene Punkte aus v0.3.** Prüfe die offenen Punkte aus `docs/v0.3/BERICHT.md` (Leerlauf im Shop in Level 6 bis 9, ungleiche Waffenstärken, Boss-Level-Länge) daraufhin, ob v0.4 sie verändert hat, und behebe, was mit wenig Aufwand geht. Prüfung: Abschnitt im Bericht.

### D. Abschluss

**D1 Dokumente.** `AGENTS.md`, `docs/GDD.md`, `docs/HANDBUCH.md`, `docs/ARCHITEKTUR.md`, `docs/ENTSCHEIDUNGEN.md` und die Entwickler-Übersicht beschreiben v0.4 richtig. Prüfung: pruefer gleicht stichprobenartig mit Code und Konfiguration ab.

**D2 Tests und Auslieferung.** `npm test`, `npm run test:e2e` und `npm run balance` grün, `test` auf GitHub grün, v0.4 nach Etappe 6 live. Prüfung: Ausgaben im Bericht; alle Adressen laden.

## 6. Fest und Startwert

Feste Vorgaben von Tim änderst du nicht. Startwerte darfst du mit Bots anpassen, wenn du die Änderung begründest.

| Thema | Fest | Startwert, anpassbar |
|---|---|---|
| Slots je Burg-Stufe | Stufe 1 Damage, 2 Slow, 3 Gate, 4 Support, 5 Passive | – |
| Burg-Stufe 2 | kaufbar ab gewonnenem Level 6, kostet Gold | Goldpreis |
| Burg-Stufe 7 | kaufbar ab gewonnenem Level 75, Gold und Crests | Preise |
| Burg-Stufen 3 bis 6 | brauchen Gold und ein Kampagnen-Level | genaue Level und Preise |
| Koop-Tisch | aufgebaut ab gewonnenem Level 3 | – |
| Endlos-Tisch | aufgebaut ab gewonnenem Level 10 | – |
| Lobby | König mit zwei Rittern am Fondue-Kessel rechts, Kampagnen-Tisch Mitte, Shop daneben, Options oben in einer Ecke | genaue Anordnung |
| Nicht mehr in der Lobby | Storybook (auf die Kampagnen-Karte), Help, Credits, Scores (Tabs in Options) | – |
| Lobby-Aussehen | eigenes Aussehen je Burg-Stufe 1 bis 7 | – |
| Fünfter Slot | – | etwa Level 20 bis 30 beim mittleren Bot |
| Kessel, Adlerhaken | – | Level 16 und 70 wie in v0.3 |

## 7. Vorgehalten, nicht gebaut

Baue diese Ideen nicht, verbaue sie aber auch nicht: Quick Play, eine eigene Koop-Kampagne, „Madness“, weitere Welten mit eigenem König, Accounts mit Cloud-Speicher und Käufe, drei bis vier Spieler, Versus und Rollenteilung, Tauziehen, Ping-Markierung, Kombos, Bosse im Endlos-Modus, Wetter, eigener Koop-Server, eine Store-App. Neue Klänge sind kein Teil dieser Runde.

## 8. Offen: du entscheidest und dokumentierst

Halte jede Entscheidung in `docs/ENTSCHEIDUNGEN.md` fest und setze sie auf die Liste der offenen Entscheidungen der Entwickler-Übersicht:

- Kampagnen-Level und Goldpreise der Burg-Stufen 3 bis 6, Goldpreise von Stufe 2 und 7.
- Wie ein v0.3-Spielstand umgerechnet wird, bei dem mehr Slots offen sind, als die Burg-Stufe nach v0.4 erlaubt (zum Beispiel Slots behalten oder Burg-Stufe passend anheben).
- Ob ein Gast über einen Einladungslink auch dann beitreten darf, wenn er selbst Level 3 noch nicht gewonnen hat. Vorschlag aus dem Gespräch: ja, die Sperre gilt nur für das Eröffnen eines Raums am Koop-Tisch.
- Die genaue Anordnung der Halle und die Gestaltung der sieben Hallen-Stufen.
- Welche Tabs die Options haben und in welcher Reihenfolge.
- Wie die frühen Level ohne zweiten Slot spannend bleiben.
- Welche Befunde aus C1 bewusst offen bleiben.

## 9. Fertig heißt

v0.4 ist fertig, wenn:
- v0.4 unter `/fondue/` live ist, Tag `v0.4` gesetzt ist und `/v0.1/`, `/classic/`, `/v0.2/` und `/v0.3/` weiter laden. Gelingt der Merge bis 22:20 Uhr nicht, ist v0.4 unter `/next/` spielbar und der Bericht nennt den Grund.
- die Spielstände von v0.2 und v0.3 unberührt sind,
- jeder Eintrag in `abnahme.json` erledigt mit Beleg oder abgeschaltet mit Begründung ist,
- alle Tests grün sind und die Schlussprüfung (Etappe 5) durchgelaufen ist,
- die Versionsregel in `AGENTS.md` und `docs/HANDBUCH.md` steht,
- Bericht, Befunde und Testanleitung im Repo liegen.

## 10. Bericht, Testanleitung und letzte Nachricht

**Bericht `docs/v0.4/BERICHT.md`**, auf Deutsch: was gebaut wurde, welcher Arbeitsweg lief und welches Modell geleitet hat, Verbrauch am Anfang und am Ende, alle selbst getroffenen Entscheidungen mit Begründung, die Tabelle „Burg-Stufe, kaufbar ab Level, Preis, öffnet“, Balance-Ergebnisse, die wichtigsten Befunde aus C1 und was damit passiert ist, was offen oder abgeschaltet ist, die Liste aller spielbaren Versionen mit Link.

**Testanleitung `docs/v0.4/TESTEN.md`**, kurz und auf Deutsch, für Tim und Lenny: Adresse (jetzt wieder die normale Adresse `/fondue/`), wie man den Home-Bildschirm-Button auf dem iPhone neu anlegt, dass ein v0.3-Spielstand übernommen wird, was sie gezielt ausprobieren sollen (Fühlt sich die Burg als Fortschritt gut an? Ist die neue Lobby klar? Sind die frühen Level mit nur einem Slot spannend? Wo hakt es noch?), wie sie Cheats nutzen, um schnell eine hohe Burg-Stufe zu sehen, und wie sie Feedback über die Entwickler-Übersicht zurückgeben.

**Schreibstil** für Bericht, Testanleitung und letzte Nachricht: für einen klugen Leser, der deine Werkzeug-Aufrufe und Dateien nicht gesehen hat. Die wichtigsten Punkte zuerst. Klare Wörter und ganze Sätze, keine Begriffe oder Abkürzungen, die du während der Arbeit erfunden hast. Fließtext, wo Gedanken zusammenhängen, Aufzählungen nur für getrennte Punkte.

**Letzte Nachricht der Sitzung:** zuerst in einem Satz, ob v0.4 live ist und unter welcher Adresse. Dann die zwei oder drei Dinge, die Tim und Lenny wissen oder entscheiden müssen. Dann die Links zu Bericht, Testanleitung und der Liste der Versionen.
