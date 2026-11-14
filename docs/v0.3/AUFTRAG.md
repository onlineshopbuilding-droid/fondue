# Fondue v0.3 – Auftrag für Claude Code

Stand: 14.11.2026, Nacht. Auftraggeber: Tim, zusammen mit Lenny. Repo: onlineshopbuilding-droid/fondue. Ausgangsstand: main bei Commit cbd01c5 (Merge von PR #10 am 12.11.2026). Das ist die Version, die heute live ist und ab jetzt v0.2 heißt.

## 0. Worum es geht und warum

Tim und Lenny bauen „Fondue“, ein eigenes Wurfspiel für das Handy im Querformat. Ihr Ziel ist eine fertige App im App Store und bei Google Play (v1.0), zunächst nur für sie und Freunde. Bis dahin wollen sie höchstens ein bis zwei weitere große Updates machen. Dieses Update, v0.3, legt das endgültige Spielkonzept fest.

Das Problem von heute: Jedes Level beginnt bei null. Man kauft im Level Waffen, und am Ende ist fast alles wieder weg. Es fühlt sich nicht nach Fortschritt an. Ab v0.3 ist die Burg dauerhaft. Burg, Tor, Hand, freigeschaltete Waffen und alle Stufen bleiben über alle Level und Modi gespeichert. Wer seinen Stomper auf Stufe 3 bringt, hat ihn ab dann immer auf Stufe 3. Dazu kommen neue dauerhafte Währungen, Levels mit Wellen statt Tagen, Slots mit festen Aufgaben, viele neue Waffen, weniger aber schnellere Gegner, ein Shop an der Burg und eine zweite Hand.

Tim und Lenny schlafen, während du arbeitest. Morgen oder übermorgen testen sie v0.3 zu zweit auf ihren Handys (Tims iPhone 16, Lennys OnePlus 8T) über eine eigene Testadresse. Dein Ergebnis ist ein spielbarer, getesteter Stand unter /fondue/next/, ein ehrlicher Bericht und eine kurze Testanleitung. Die Live-Version bleibt in dieser Runde unverändert.

Grundregel des Projekts: Fondue ist ein eigenes Spiel. Nichts wird aus anderen Spielen übernommen, keine Namen, Figuren, Grafik, Level oder Bildschirmaufbau. Neue Inhalte entstehen aus Fondues Welt: Alpenburg, König Fridolin, eine Räuberarmee aus Mäusen und Ratten in Ritterrüstung, Yeti, Krähen, Käse.

Lies zuerst AGENTS.md, docs/HANDBUCH.md, docs/ARCHITEKTUR.md, docs/GDD.md, docs/ENTSCHEIDUNGEN.md, docs/OFFENE-ENTSCHEIDUNGEN.md, docs/balance.md und den Abschlussbericht docs/ABSCHLUSS-GROSSES-UPDATE.md. Wo dieser Auftrag etwas Bestehendes ändert, gilt dieser Auftrag.

## 1. Rahmen: was du darfst und was nicht

Ohne Rückfrage erlaubt (das sind Routineschritte, frag dafür nicht nach):

- Branches anlegen, auf deinen Branches committen und pushen, Pull Requests stellen.
- Tags v0.1 und v0.2 setzen und einen eingefrorenen Branch v0.2 anlegen (Abschnitt 4, Etappe 0).
- Den Deploy-Workflow per gh workflow run starten, damit /next/ aktualisiert wird.
- Kommentare in GitHub-Issues schreiben, Issue 1 dir zuweisen.
- Dateien im Repo umstrukturieren, Code löschen, der zum alten System gehört, Tests für entfernte Mechaniken durch Tests des neuen Verhaltens ersetzen (siehe Abschnitt 3).
- Pakete aus npm installieren, wenn sie für Tests oder Werkzeuge nötig sind.

Genau ein Merge nach main ist erlaubt: ein Pull Request, der nur die Auslieferung ändert (.github/workflows/deploy.yml und die zugehörige Doku), damit /fondue/next/ und /fondue/v0.2/ gebaut werden. Grund: Die GitHub-Pages-Umgebung nimmt nur Auslieferungen an, die von main aus laufen. Dieser Merge ändert das Spiel unter /fondue/ nicht. Du darfst ihn selbst mergen, sobald die Prüfung test grün ist.

Nicht erlaubt in dieser Runde (jeweils mit Grund):

- Spielcode nach main mergen oder die Hauptadresse /fondue/ verändern. Grund: Jeder Merge nach main geht sofort live, und darüber entscheiden Tim oder Lenny.
- Den Spielstand unter dem bisherigen Speicher-Schlüssel fondue.profile lesen, ändern oder löschen. Grund: /fondue/, /fondue/next/ und /fondue/classic/ liegen auf derselben Herkunft und teilen sich den Browser-Speicher. v0.3 bekommt einen eigenen Schlüssel (Änderung A6).
- Force-Push, Zugangsdaten oder persönliche Daten ins Repo (es ist öffentlich), Systemeinstellungen ändern, git add -A oder git add ..
- Den Skill „Unlazy“ verwenden.

Abweichungen von AGENTS.md für diese Runde: Die Frage „committen oder veröffentlichen“ am Sitzungsende entfällt, denn Tim hat Committen und Pushen auf deinen Branches freigegeben. Die Begriffe in AGENTS.md (Tag, Sterne, Offerings, Stufe 1 bis 5) passt du an v0.3 an (Änderung G4). Alle anderen Regeln aus AGENTS.md gelten weiter.

Keine Rückfragen. Niemand antwortet dir vor morgen Mittag. Was dieser Auftrag offen lässt, entscheidest du im Sinne der Ziele, hältst es mit Begründung in docs/ENTSCHEIDUNGEN.md fest und setzt es zusätzlich auf die Liste der offenen Entscheidungen (Änderung F3). Stoppe nur, wenn eine Aktion riskant oder unumkehrbar wäre und dieser Auftrag sie nicht ausdrücklich erlaubt. Dann arbeite an allem anderen weiter und nenne den Punkt im Bericht.

## 2. Team, Modelle, Zeit und Gedächtnis

### 2.1 Rollen

- Leitung: Claude Fable 5.2 (diese Sitzung). Du liest, planst, schreibst den Bauplan, verteilst die Arbeit, prüfst Ergebnisse gegen den Plan und triffst die offenen Entscheidungen. Du programmierst selbst so wenig wie möglich, weil Tims Fable-Kontingent für diese Woche knapp ist (etwa 40 % übrig). Halte deine eigenen Schritte kurz und warte auf deine Teammitglieder, statt ihre Arbeit selbst zu übernehmen.
- Bauen: Claude Opus 5.5. Alles tatsächliche Programmieren, Gestalten und Umsetzen läuft auf Opus.
- Prüfen und Einfaches: Claude Sonnet 5.5. Tests laufen lassen und auswerten, Bot- und Balance-Läufe, Messungen auf den Geräteformaten, Abnahmeliste mit Belegen füllen, Texte gegenlesen, Doku nachziehen, die unabhängige Prüfung am Ende. Sonnet baut keine Spielsysteme.

### 2.2 Aufbau

Lege zuerst zwei Agent-Definitionen in .claude/agents/ an und committe sie, damit Modell und Aufwand feststehen:

- bauer.md mit model: opus und effort: high, Beschreibung: setzt Bauaufträge aus dem Bauplan um.
- pruefer.md mit model: sonnet und effort: medium, Beschreibung: prüft, misst, testet und dokumentiert, baut keine Spielsysteme.

Weg A, bevorzugt: Agent-Team. Prüfe, ob Agent-Teams in dieser Sitzung aktiv sind (Umgebungsvariable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1). Wenn ja, starte zwei Teammitglieder: bauer mit der Definition bauer und dem ausdrücklichen Hinweis „Use Opus 5.5“, und pruefer mit der Definition pruefer und „Use Sonnet 5.5“. Teammitglieder können selbst keine weiteren Teammitglieder starten, aber Subagents. bauer darf für klar getrennte Pakete Subagents starten und gibt dabei immer model: opus an. pruefer gibt immer model: sonnet an.

Weg B, falls Teams nicht verfügbar sind: Du bleibst Leitung und delegierst alles an Subagents mit den Definitionen bauer und pruefer. Gib bei jedem Start zusätzlich das Modell ausdrücklich an. Grund: Ohne Angabe laufen Subagents auf dem Modell der Leitung, also auf Fable, und das würde Tims Kontingent in kurzer Zeit aufbrauchen.

Prüfe beim ersten Start, welches Modell tatsächlich läuft, und halte im Fortschrittsprotokoll fest, welchen Weg du nutzt.

### 2.3 Wie du Arbeit vergibst

Teammitglieder und Subagents kennen diesen Chat nicht. Jeder Auftrag an sie enthält:

- das Ziel und warum es wichtig ist, mit den IDs der Änderungen aus Abschnitt 5,
- welche Dateien und Ordner ihnen gehören und welche sie nicht anfassen,
- was am Ende vorliegen soll und woran es geprüft wird,
- den Hinweis, zuerst docs/v0.3/BAUPLAN.md und die betroffenen Abschnitte dieses Auftrags zu lesen,
- die aktuelle Uhrzeit (per date) und bis wann das Paket fertig sein soll.

Zwei Agents bearbeiten nie gleichzeitig dieselbe Datei. Das Fundament (Etappe 2) berührt fast alles und wird deshalb nacheinander gebaut, nicht parallel. Erst wenn es steht und die Tests grün sind, laufen die Inhaltspakete parallel. Gib Teamaufträge in Paketen von etwa einer bis zwei Stunden Arbeit, damit du dazwischen prüfen und umsteuern kannst.

### 2.4 Zeit und Verbrauch

- Hole die Uhrzeit immer mit date, schätze sie nie. Notiere die Startzeit in PROGRESS.md. Tim startet dich gegen 3 Uhr nachts.
- Bis etwa 11:00 Uhr darfst du Tims Kontingent voll nutzen.
- Ab 11:00 Uhr prüfst du den Verbrauch mit den Mitteln, die dir die Umgebung gibt. Bei 90 % hörst du auf, weil Tim den Rest selbst braucht. Kannst du den Verbrauch nicht ablesen, arbeitest du weiter, bis das Limit greift.
- Arbeite so, dass ein Abbruch jederzeit sauber ist: kleine Commits, regelmäßig pushen, die Übergabedatei (2.5) nach jedem abgeschlossenen Paket aktualisieren.
- Wenn das Limit greift und die Arbeit stoppt: Hast du ein Werkzeug, mit dem du dich zu einer bestimmten Zeit selbst wieder starten kannst, stelle es auf kurz nach dem Zurücksetzen des Limits. Sonst sorgt die Übergabedatei dafür, dass ein einfaches „weiter“ von Tim reicht.
- Hör nicht früh auf, nur weil der Plan scheinbar erledigt ist. Restzeit geht in die Liste in Etappe 7.

### 2.5 Gedächtnis im Repo

Lege diesen Auftrag wörtlich als docs/v0.3/AUFTRAG.md ab. Führe dazu:

- docs/v0.3/BAUPLAN.md: Architektur, Pakete mit Dateigrenzen, Reihenfolge.
- docs/v0.3/abnahme.json: je Änderungs-ID aus Abschnitt 5 ein Eintrag mit id, titel, pruefung, status (offen, erledigt, abgeschaltet) und beleg. Ein Eintrag wird nur mit echtem Beleg auf erledigt gesetzt: Testname, Messwert, Screenshot-Pfad oder Bot-Lauf. Einträge werden nie gelöscht oder umformuliert, nur ihr Status und Beleg ändern sich.
- docs/v0.3/PROGRESS.md: Zeitstempel per date, Etappe, was erledigt ist mit Beleg, nächster Schritt, Probleme.
- docs/v0.3/UEBERGABE.md: immer aktuell und kurz. Wo stehe ich, was läuft gerade, was ist der nächste Schritt, welcher Weg (A oder B), welche Teammitglieder existieren.

Nach jeder Kontext-Zusammenfassung, nach einem Neustart und nach einer Limit-Pause liest du zuerst UEBERGABE.md, dann abnahme.json, dann die betroffenen Teile von AUFTRAG.md. Wenn Teammitglieder nach einem Neustart nicht mehr erreichbar sind, startest du sie neu, wie in 2.2 beschrieben.

## 3. Arbeitsweise

Du bist für diesen Umbau verantwortlich. Das Repo wurde vollständig von KI gebaut, und für v0.3 bist du sein Maintainer. Baue um, wo das neue System es braucht, und räume dabei Reste des alten Systems vollständig weg. Ändere nichts, was nicht zu diesem Auftrag gehört.

Alles muss ins ganze Spiel passen. Jede Änderung zieht Texte, Hilfe, Tipps, Tutorial, Shop, Lobby, Storybook, Balance, Koop, Bots, Entwickler-Übersicht und Tests mit. Nach v0.3 gibt es keine verwaisten Reste von Tagen, Markt zwischen Tagen, Sternen oder Offerings, weder im Spiel noch in Texten, Code oder Doku. Nutze den Stimmigkeits-Check in docs/HANDBUCH.md, Abschnitt 9.

Tests. Tests für Verhalten, das bleibt (Werfen, Gewicht, Koop-Synchronität, robustes Speichern, Bildschirmformate), werden nie abgeschwächt oder gelöscht. Tests für Mechaniken, die v0.3 entfernt (Tage, Markt, Sterne, Offerings), ersetzt du durch Tests des neuen Verhaltens. Jede ersetzte Testdatei steht mit Grund in PROGRESS.md.

Konfiguration statt fester Zahlen. Alle neuen Werte liegen in src/config/: Preise, Stufenwerte, Gegnerwerte, Wellen, Belohnungen, Freischaltungen.

Gründlich statt schnell. Lieber ein Feature weniger, das sauber funktioniert, als halbe Systeme. Was nicht fertig wird, schaltest du sauber ab, setzt es in abnahme.json auf abgeschaltet und nennst es im Bericht.

Selbst prüfen, aber nicht allein. Prüfe deine Arbeit während des Baus regelmäßig gegen den Auftrag, nach jedem großen Paket. Für Prüfungen nutzt du einen Agent mit frischem Kontext, der die Arbeit nicht gebaut hat (pruefer). Grund: Wer seine eigene Arbeit bewertet, übersieht mehr.

Ehrliche Fortschrittsangaben. Bevor du Fortschritt meldest oder einen Punkt abhakst, prüfe jede Aussage gegen ein Werkzeug-Ergebnis aus dieser Sitzung. Melde nur, wofür du einen Beleg hast. Was nicht geprüft ist, nennst du ausdrücklich ungeprüft. Wenn Tests scheitern, sag es mit der Ausgabe. Wenn ein Schritt übersprungen wurde, sag es. Wenn etwas erledigt und geprüft ist, sag es klar.

Die Arbeit zu Ende bringen. Hör nicht auf, solange du Arbeit aus diesem Auftrag schuldest. Statusnotizen sind willkommen, aber setze die Arbeit im selben Schritt fort. Wenn du dich dabei ertappst, anzubieten zu warten oder Tim um eine Richtung zu bitten, mach stattdessen mit dem nächsten Teil weiter. Gewöhnliche Hindernisse wie Fehler, Timeouts, gesperrte Dateien, leere Ergebnisse oder scheiternde Werkzeuge untersuchst du zuerst und arbeitest dich durch (warten und neu versuchen, Anfrage korrigieren, anderes Werkzeug). Echte Blocker sind nur Dinge, die bewusst geschützt sind, oder Aktionen, die riskant und nicht freigegeben sind. Das hebt die Vorsicht bei riskanten oder zerstörerischen Aktionen nicht auf.

## 4. Etappen

Jede Etappe endet mit einer Prüfung. Die nächste beginnt erst, wenn sie bestanden ist.

**Etappe 0: Sichern und Testadresse einrichten (Leitung plant, bauer setzt um)**

1. Stand prüfen: git pull, offene Pull Requests und Branches ansehen. Arbeitet jemand anderes an etwas (Lenny, @claude in einem Issue), fasst du dessen Branch nicht an.
2. Werkzeuge prüfen: Node, npm, Playwright, gh-Login mit Rechten für Pull Requests, Merges und Workflows.
3. Versionen sichern: Tag v0.1 auf denselben Commit wie v0-alpha setzen (v0-alpha bleibt bestehen). Tag v0.2 und einen eingefrorenen Branch v0.2 auf cbd01c5 anlegen.
4. Arbeitsbranch v0.3-dev von main anlegen.
5. Deploy-Pull-Request nach main (der einzige erlaubte Merge, siehe Abschnitt 1): Der Workflow baut zusätzlich /fondue/v0.2/ aus dem Branch v0.2 und /fondue/next/ samt /fondue/next/dev/ aus v0.3-dev, jeweils mit eigenem base-Pfad, so wie heute /classic/ gebaut wird. /fondue/, /fondue/classic/ und /fondue/dev/ bleiben unverändert. Erst nach grünem test mergen.
6. Den eigenen Speicher-Schlüssel für v0.3 (Änderung A6) einbauen, bevor /next/ zum ersten Mal ausgeliefert wird.

Prüfung: /fondue/ zeigt weiter v0.2 mit unverändertem Spielstand, /fondue/v0.2/ und /fondue/next/ laden, und /next/ zeigt seine Versionsnummer.

**Etappe 1: Bauplan (Leitung)** Schreibe BAUPLAN.md und abnahme.json aus Abschnitt 5. Lege fest, welche Dateien zu welchem Paket gehören. Plane die Datenstruktur des neuen Profils zuerst, weil fast alles darauf aufbaut.

**Etappe 2: Fundament (bauer, nacheinander, nicht parallel)** Profil und Speichern (A6), dauerhafte Burg (A1), Währungen (A2 bis A4), Stufen 1 bis 7 (A5), Level ohne Tage mit Wellen (B1, B2), schneller Start (B3), Gegnertempo (B4). Prüfung: Unit-Tests grün, ein Level ist mit dauerhafter Burg von Anfang bis Ende spielbar, Gold und Stufen bleiben nach Neuladen erhalten.

**Etappe 3: Inhalte (bauer mit Opus-Subagents, parallel mit getrennten Dateien)** Slots und Waffen (C1 bis C4), Kessel und Adlerhaken (C5, C6), Burg-Stufen und Issue 1 (C7), Hand und zweite Hand (C8, C9), Shop und Vor-Level-Bildschirm (D1, D2), Kampagne und Tutorial (B5, C2, D4), Endlos (E1), Koop (E2), Entwickler-Werkzeuge (F1 bis F3). Prüfung je Paket durch pruefer.

**Etappe 4: Balance und Messungen (pruefer misst, bauer passt an)** Bot-Läufe und Messungen nach Abschnitt 5, Änderungen B5 und G1. Bots bekommen dafür eine Fortschrittslogik: zwischen Leveln ausbauen, freischalten und bei Bedarf im Endlos-Modus Gold verdienen.

**Etappe 5: Unabhängige Prüfung (pruefer mit frischem Kontext)** Geht die gesamte abnahme.json gegen Code, Tests und Belege durch und spielt v0.3 auf den drei Geräteformaten von der Vorrunde bis über die Freischaltung aller fünf Slots. Gefundene Fehler gehen an bauer zurück.

**Etappe 6: Abschluss (Leitung)** Pull Request v0.3-dev → main öffnen, aber nicht mergen. Text mit Fixes #1. /next/ mit dem finalen Stand ausliefern. Bericht und Testanleitung schreiben (Abschnitt 10).

**Etappe 7: Restzeit nutzen**, in dieser Reihenfolge: offene Punkte aus abnahme.json, Spielgefühl auf dem Handy-Format (Greifen schneller Gegner, Antippen von Waffen), Lesbarkeit und Klarheit des Shops, Grafik der Burg-Stufen und neuen Waffen, weitere Tests. Nach jedem Paket /next/ neu ausliefern und den Bericht ergänzen.

## 5. Die Änderungen

Jede Änderung hat eine ID. Diese IDs stehen genau so in abnahme.json. „Prüfung“ sagt, woran der Punkt als erledigt gilt.

Begriffe ab v0.3, überall gleich in Code, Spieltexten und Dokumenten:

- Käse (im Spiel „Cheese“): dauerhafte Währung für Freischaltungen. Ersetzt die Sterne vollständig.
- Gold: dauerhafte Währung für Upgrades.
- Räuberwappen (englischer Spielname von dir festzulegen, Vorschlag „Raider Crests“): Sonderwährung für Stufe 7.
- Stufe: Ausbaustand von Waffe, Burg oder Hand, 1 bis 7. Nie „Level“ für Waffen.
- Level: Kampagnen-Level 1 bis 100. Welle: ersetzt den Tag in Leveln und im Endlos-Modus.
- Welt, Slot und die übrigen Begriffe aus AGENTS.md bleiben.

### A. Fundament

**A1 Dauerhafte Burg.** Burg (zugleich Tor), Hand, alle freigeschalteten Waffen und alle Stufen sind dauerhaft gespeichert und gelten in Kampagne, Endlos und Koop. Waffen werden an- und abgelegt und behalten dabei ihre Stufe. Im Level wird nichts gekauft oder verbessert. Ein Level beginnt mit der aktuellen dauerhaften Burg. Prüfung: Test, dass eine Waffe nach Ablegen, Anlegen, Levelwechsel und Neuladen ihre Stufe behält; im Spiel gibt es keinen Kauf mehr während eines Levels.

**A2 Käse.** Pro Level gibt es 1 bis 5 Käse:

1. Level gewonnen.
2. Tor am Ende über 50 % Leben.
3. Tor am Ende über 90 % Leben (Startwert, mit Bots prüfen).
4. Challenge 1 des Levels.
5. Challenge 2 des Levels.

Jedes Level hat zwei eigene Challenges, zum Beispiel „Let 5 Keg Haulers explode“ oder „Throw 3 raiders into the cauldron“. Eine Challenge verlangt nur, was man an dieser Stelle der Kampagne haben kann, also keinen Kessel-Wurf vor dem Kessel. Jeder Käse wird nur einmal vergeben: Wer 3 von 5 hat, kann beim Wiederholen nur noch die fehlenden 2 holen. Bei 100 Leveln gibt es also höchstens 500 Käse. Alles, was Käse kostet, kostet zusammen genau 500. Wer alle 500 hat, hat alles freigeschaltet, vorher nicht. Im Endlos-Modus gibt es keinen Käse. Prüfung: automatischer Test, dass die Summe aller Käse-Preise 500 ist und dass ein Käse nicht doppelt vergeben wird; Test, dass jede Challenge im jeweiligen Level erfüllbar ist (benötigte Waffen und Gegner sind dort verfügbar).

**A3 Gold.** Gold verdient man in Kampagne und Endlos und behält es dauerhaft. Damit kauft man Waffenstufen 2 bis 6, Burg-Stufen und Hand-Stufen. Wiederholte Level bringen Gold, damit man stärker werden kann, wenn man feststeckt. Die Preise steigen je Stufe deutlich. Die Kampagne muss trotz Gold aus dem Endlos-Modus fordernd bleiben: Wie du verhinderst, dass man sie zu leicht überrollt, legst du mit Bots fest. Prüfung: Gold bleibt nach Levelende und Neuladen erhalten; Bot-Lauf zeigt, dass ein Spieler, der nur farmt, die späte Kampagne nicht mühelos schafft.

**A4 Räuberwappen.** Die Sonderwährung gibt es nur am Adlerhaken (C6): Ein dort geopferter Räuber lässt sein Wappen zurück. Schwere und starke Gegner sowie Bosse bringen mehr, schwache weniger. Jedes Upgrade auf Stufe 7 (Waffe, Burg und Hand) braucht Wappen zusätzlich zu Gold. Bewusster Grind: Im Schnitt soll man 20 bis 30 Runden mit dem Haken spielen, bis es für ein Stufe-7-Upgrade reicht. Pro Runde lassen sich nur begrenzt viele holen. Prüfung: Bot-Lauf zeigt den Median der Runden bis zum ersten Stufe-7-Upgrade im Bereich 20 bis 30.

**A5 Stufen 1 bis 7, jede spürbar.** Waffen, Burg und Hand gehen von Stufe 1 bis 7. Jede Stufe muss sich deutlich anders anfühlen, nicht nur in Zahlen. Wo möglich ändert eine Stufe auch Aussehen oder Verhalten: mehr Ziele, größere Fläche, ein zusätzlicher Effekt. Stufe 7 ist ein echter Höhepunkt. Prüfung: Tabelle in der Entwickler-Übersicht zeigt für jede Waffe, was sich je Stufe ändert; kein Stufensprung ändert nur eine Zahl um weniger als 15 % (Startwert).

**A6 Spielstand.** Neues, sauber versioniertes Profil: Käse je Level, Gold, Wappen, Freischaltungen, Stufen, angelegte Ausrüstung, Kampagnen-Fortschritt, Bestenliste, Einstellungen.

- Eigener Speicher-Schlüssel für v0.3, zum Beispiel fondue.v3.profile. Der alte Schlüssel fondue.profile wird weder gelesen noch verändert (Grund: Abschnitt 1). Ein Spieler beginnt in v0.3 frisch. Ein kurzer, freundlicher Hinweis erklärt, dass v0.3 mit neuem Fortschritt startet.
- Speichern muss zuverlässig sein: nach jedem Level, nach jedem Kauf, beim Schließen und beim Wegwechseln der App.
- Die Datenstruktur ist so gebaut, dass sie später eins zu eins in Accounts mit Cloud-Speicher wandern kann: klares Format, Versionsnummer, Migrationsweg.
- Export und Import als Textcode bleiben als Sicherung.
- Tim spielt auf dem iPhone über einen Home-Bildschirm-Button. Eine so gestartete Web-App hat einen eigenen Speicher, getrennt vom Safari-Tab. Speichern und Laden müssen dort zuverlässig funktionieren.

Prüfung: Tests für Speichern, Laden, Migration und den Fall „Speicher voll oder gesperrt“; Test, dass fondue.profile unberührt bleibt; Prüfung im Browser-Test mit Neuladen.

### B. Level, Wellen und Gegner

**B1 Level ohne Tage.** Tage innerhalb eines Levels und der Markt zwischen den Tagen fallen weg. Ein Level ist ein durchgehender Kampf mit Wellen. Länge: Die ersten Level dauern 1 bis 2 Minuten, in der Mitte meist 3 bis 5 Minuten, Boss- und Sonderlevel 6 bis 10 Minuten. Die Länge schwankt bewusst, damit sich nicht jedes Level gleich anfühlt. Sieg: alle Wellen überstanden und alle Gegner besiegt. Niederlage: Das Tor fällt. Boss-Level, Sonderlevel, Landschaftswechsel und das Popup „New enemy“ bleiben erhalten und werden auf Wellen umgestellt. Fortsetzen nach dem Schließen der App legst du sinnvoll fest, zum Beispiel am Beginn der aktuellen Welle. Prüfung: Level-Tabelle zeigt für alle 100 Level die geplante Dauer; Messung der tatsächlichen Dauer mit dem mittleren Bot liegt je Abschnitt im Zielbereich.

**B2 Wellen.** Kleine Wellen mit kurzen Atempausen von wenigen Sekunden. Die Spannung geht spürbar hoch und runter: plötzlich kommt viel, dann kurz entspannter, dann mehr. Es gibt nie lange nichts zu tun. Prüfung: In keinem Level gibt es eine Pause ohne lebenden Gegner von mehr als 5 Sekunden (Startwert), gemessen über alle 100 Level.

**B3 Schneller Start.** Nach dem Start eines Levels ist der erste Gegner nach etwa 1,5 bis 2 Sekunden sichtbar. Heute dauert es in den ersten Leveln 3 bis 6 Sekunden. Vermutliche Ursache: Auf breiten Handys ist das Spielfeld rechts länger, und Gegner laufen erst durch einen unsichtbaren Bereich. Gegner erscheinen deshalb immer am sichtbaren rechten Rand, egal wie breit der Bildschirm ist. Prüfung: Messung der Zeit bis zum ersten sichtbaren Gegner in den Leveln 1 bis 5, im Endlos-Modus und im Koop, jeweils auf iPhone 16 quer, OnePlus 8T quer und Laptop; alle Werte höchstens 2,0 Sekunden, Werte stehen im Bericht.

**B4 Weniger, aber schnellere Gegner.** Gegner sind etwa zwei- bis dreimal so schnell. Dafür kommen insgesamt etwa ein Drittel bis die Hälfte so viele, und deutlich weniger leben gleichzeitig. Grund: Am Handy packt man einzelne Gegner sehr schnell, ständiges Wegwischen ganzer Massen ist anstrengend und weniger spannend. Die elf Gegnertypen bleiben, ihre Werte werden angepasst. Fernkämpfer und langsame Typen (Slinger, Keg Hauler, Siege Cart, Balloonist) bekommen weniger Tempo dazu, damit sie sich nicht falsch anfühlen. Gold pro Gegner passt du an die geringere Anzahl an. Prüfung: Konfigurationswerte dokumentiert; Browser-Test auf dem Handy-Format zeigt, dass schnelle Gegner im Lauf greifbar sind (Trefferbereich groß genug).

**B5 Schwierigkeit über die Kampagne.** Die Kampagne wird über die Zeit deutlich schwerer. Man muss Fortschritt machen (ausbauen, freischalten, Endlos spielen), um weiterzukommen. Wer nichts ausbaut, bleibt stecken. Das ist gewollt, darf aber nicht früh frustrieren. Prüfung: Bot-Läufe zeigen: ohne Ausbau bleibt der mittlere Bot vor Level 30 stecken (Startwert); mit Ausbau kommt er weiter; der sehr gute Bot braucht in späten Leveln und Boss-Leveln spürbar mehr Versuche als in frühen.

### C. Burg, Slots, Waffen und Hand

**C1 Die fünf Slots.** Jeder Slot hat eine feste Aufgabe und einen festen Ort an der Burg. In jeden Slot passt genau eine Waffe seiner Aufgabe.

- Links unten, Schaden: Waffen, die die Straße hinunter Schaden machen und auf hohen Stufen die Map regelrecht leerräumen. Dazu gehören Rolling Wheel und Fondue Forks.
- Links Mitte, Verlangsamen: Alles, was Gegner bremst oder anhält, zum Beispiel Frost (Eis), Sticky Fondue (auf hohen Stufen über die ganze Straße verteilt) und Cuckoo Clock (hält alles für etwa 2 bis 4 Sekunden an).
- Links oben, Support: Unterstützung statt direkter Schaden, zum Beispiel Golden Fondue (mehr Gold beim Aktivieren), eine kurz stärkere Hand oder die vorübergehende zweite Hand (C9).
- Rechts oben, Passiv: Waffen, die von selbst regelmäßig etwas tun, ohne Antippen, zum Beispiel Marmot Sentry (Murmeltier mit Armbrust).
- Direkt über dem Tor, Tor: Waffen, die mit dem Tor zu tun haben. Sie räumen den Bereich davor, drücken Gegner weg, lassen Stacheln wachsen (Hedgehog Gate) oder machen dort Schaden.

Verteile die bestehenden 16 Waffen auf diese Aufgaben. Waffen, die nirgends passen, baust du um oder entfernst sie. Dokumentiere die Zuordnung. Prüfung: Konfiguration ordnet jede Waffe genau einem Slot zu; Screenshot der Burg mit allen fünf belegten Slots auf allen drei Formaten.

**C2 Slots über die Kampagne freischalten.** Die fünf Slots werden innerhalb der ersten 10 bis 15 Level freigeschaltet, nicht gekauft. Beim Freischalten erscheint eine kurze Einführung, zum Beispiel „This is your Support slot“, mit einem Satz, wofür er da ist, gern als Spruch von König Fridolin. Prüfung: Level-Tabelle zeigt die Slot-Freischaltungen bis spätestens Level 15; Browser-Test sieht die Einführung.

**C3 Große Waffen-Palette.** Denk dir für jeden Slot eine große Auswahl eigener Waffen aus Fondues Welt aus (Alpen, Käse, Burg, Tiere der Berge, Uhren, Glocken, Hörner, Fondue-Geräte). Ziel: etwa 5 bis 7 Waffen pro Slot, also 25 bis 35 insgesamt. Lieber weniger, die dafür gut unterscheidbar und spielbar sind. Jede Waffe hat 7 spürbare Stufen (A5). Aktive Waffen werden angetippt und zielen selbst, Passiv-Waffen arbeiten allein, ein Ring zeigt das Nachladen. Das Antippen einer Waffe darf nicht versehentlich einen Räuber greifen und umgekehrt. Die Freischaltungen verteilst du so über die Kampagne, dass man regelmäßig etwas Neues bekommt: Eine Waffe wird an einem bestimmten Level kaufbar und dann mit Käse freigeschaltet. Mehrere Waffen pro Slot sollen konkurrenzfähig sein. Heute kaufen die Bots fast nur 5 von 16 Waffen. Prüfung: Liste aller Waffen mit Slot, Freischalt-Level und Käse-Preis in der Entwickler-Übersicht; Bot-Auswertung zeigt, dass in jedem Slot mindestens 3 Waffen von Bots genutzt werden; Browser-Test für Antippen ohne Fehlgriff.

**C4 Rolling Wheel zuerst.** Das Rolling Wheel ist die erste Waffe. Man hat es schon im Tutorial, kostenlos. Prüfung: frisches Profil hat nach der Vorrunde genau das Rolling Wheel.

**C5 Great Cauldron.** Der Kessel bringt keine eigene Währung mehr, sondern doppeltes Gold für den hineingeworfenen Räuber. Er ist nicht mehr die erste Freischaltung, sondern kommt etwas später in der Kampagne. Preis und Zeitpunkt legst du neu fest. Stufen bekommt er, wenn das sinnvoll ist, zum Beispiel kürzere Schmelzzeit. Prüfung: Test für doppeltes Gold; Level-Tabelle zeigt den Freischaltzeitpunkt.

**C6 Eagle Perch.** Der Adlerhaken kommt erst spät, wenn Stufe 7 überhaupt relevant wird. Er bringt Räuberwappen (A4). Das Opfern wird deutlich schwerer als heute, zum Beispiel durch ein kleineres Ziel oder einen genaueren Wurf. Wie oft es gelingt, misst du mit Bots. Offerings gibt es nicht mehr, auch nicht in Texten. Prüfung: Suche im Code und in den Texten findet kein „Offering“ mehr; Bot-Messung der Trefferquote steht im Bericht.

**C7 Burg-Stufen 1 bis 7 und Issue 1.** Die Burg wird mit Gold ausgebaut, Stufe 7 zusätzlich mit Wappen. Jede Stufe gibt dem Tor mehr Leben und sieht deutlich prächtiger und detaillierter aus: vom einfachen Holztor bis zur prächtigen Alpenfestung. Entwirf ein Bild für jede der sieben Stufen im bestehenden Filzpuppen-Stil (dunkle Umrisslinie, warme Farben, Licht von links oben), mit Holz, Stein, Eisen, Gold, Käse, Fahnen und Alpen. Die Grafik bleibt austauschbar, weil sie später ersetzt wird (docs/GRAFIK-AUSTAUSCHEN.md). GitHub-Issue 1 setzt du jetzt um: Burg und Turm fügen sich sauber in Hinter- und Vordergrund ein und wirken nicht wie ein aufgesetztes Bild. Links von der Burg führt auf breiten Bildschirmen kein Weg weiter. Weise dir Issue 1 zu, belege das Ergebnis dort mit Screenshots als Kommentar. Geschlossen wird es über Fixes #1 im Pull Request, wenn Tim oder Lenny ihn mergen. Prüfung: Screenshots aller sieben Burg-Stufen auf allen drei Formaten; Kommentar in Issue 1.

**C8 Hand bis Stufe 7.** Hand-Stufen 1 bis 7, ausgebaut mit Gold, Stufe 7 zusätzlich mit Wappen. Die Stärke steigt in kleinen Schritten. Neue Yeti-Regel: Allein hebt man einen Yeti ungefähr ab Hand-Stufe 4. Mehrere Hände an einem Gegner zählen ihre Stärke zusammen, wie bisher im Koop. Prüfung: Test der Yeti-Regel für eine Hand der Stufe 3 und 4 und für zwei Hände.

**C9 Zweite Hand.** Am Handy kann man mit beiden Daumen gleichzeitig greifen. Baue beides und vergleiche im Bericht:

1. Hand-Stufe 7 schaltet dauerhaft eine zweite Hand frei. Zwei Finger greifen gleichzeitig je einen Räuber.
2. Eine Support-Waffe gibt für einige Sekunden eine zweite Hand.

Greifen beide eigenen Hände denselben Gegner, zählen ihre Stärken zusammen. Mehrfach-Touch muss auf iPhone-Safari und Android-Chrome sauber funktionieren: kein Zoom und kein Scrollen durch zwei Finger. Für den Laptop gibt es einen Entwickler-Schalter, der die zweite Hand simuliert. Prüfung: Browser-Test mit zwei gleichzeitigen Berührungen auf beiden Handy-Formaten.

### D. Shop, Menüs und Tutorial

**D1 Dauerhafter Shop an der Burg.** Der Shop ist eine Ansicht der Burg von außen, erreichbar aus der Lobby. Ob er die bisherige Armoury ersetzt oder in ihr aufgeht, entscheidest du. Man tippt auf einen Slot und sieht alle Waffen dieser Aufgabe mit Bild, Stufe und Kurzbeschreibung. Dort schaltet man mit Käse frei, verbessert mit Gold (Stufe 7 mit Wappen) und legt Waffen an oder ab. Burg, Hand, Kessel und Adlerhaken baut man an ihrem jeweiligen Ort aus. Käse, Gold und Wappen sind immer sichtbar. Beim Upgrade sieht man klar, was sich ändert, vorher und nachher. Ziel ist eine angenehme, übersichtliche, intuitive Oberfläche: Man ist nie verwirrt, was etwas kostet, was es bringt oder wie man es bekommt. Große Touch-Flächen, gut lesbar am Handy im Querformat. Im Koop nutzt jeder den Shop für sich, außerhalb einer Runde. Prüfung: Screenshots auf allen drei Formaten; pruefer prüft mit frischem Blick, ob ein neuer Spieler ohne Erklärung ein Upgrade findet und kauft, und hält das Ergebnis fest.

**D2 Bildschirm vor jedem Level.** Vor jedem Level in Kampagne und Endlos erscheint kurz ein Bildschirm, auf dem man die Ausrüstung tauschen kann. Er lässt sich schnell überspringen, „Play“ ist sofort erreichbar. Prüfung: Browser-Test: vom Tippen auf ein Level bis zum Spielstart sind höchstens zwei Tipps nötig.

**D3 Lobby, Texte und Hilfe.** Lobby, Storybook, Hilfe, Tipps, Königs-Sätze, Level-Karte und Kampagnen-Karte passen zu v0.3. Die Level-Karte zeigt geplante Dauer, Landschaft, Besonderheit, beide Challenges und die schon geholten Käse (0 bis 5). Freigeschaltete Waffen hängen weiter an der Wand der Lobby. Prüfung: Suche in allen Spieltexten nach „star“, „day“ im Sinne von Spieltag, „market“ und „offering“ findet keine veralteten Stellen.

**D4 Tutorial.** Die Vorrunde bleibt im Kern: sofort Schlachtfeld, der König redet, die gezeichnete Hand zeigt Packen und Hochschleudern. Das Rolling Wheel ist von Anfang an da und wird erklärt. Level 1 ist kurz (1 bis 2 Minuten, Wellen), erklärt Käse und Gold in wenigen Sätzen und führt danach in den Shop, wo man das erste Upgrade macht. Kessel, Slots und Adlerhaken werden später an ihrer Stelle in der Kampagne erklärt, nicht im Tutorial. Prüfung: Browser-Test spielt mit frischem Profil Vorrunde, Level 1 und das erste Upgrade durch.

### E. Modi

**E1 Endlos-Modus.** Er läuft mit der eigenen dauerhaften Burg, ohne Kauf von null und ohne Markt zwischen Wellen. Er ist vor allem zum Gold-Verdienen da, besonders wenn man in der Kampagne feststeckt. Gold aus dem Endlos-Modus bleibt dauerhaft, Käse gibt es dort nicht. Er wird erst freigeschaltet, wenn man alle fünf Slots hat. Easy, Medium und Hard bleiben, höhere Schwierigkeit bringt mehr Gold pro Gegner. Wellen statt Tage, die Bestenliste bleibt, der leichte Zufall beim ersten Auftreten der Gegnertypen bleibt. Am Adlerhaken kann man auch im Endlos-Modus Wappen holen, begrenzt so, dass der Grind aus A4 eingehalten wird. Prüfung: Test, dass Endlos vor dem fünften Slot gesperrt ist; Bot-Lauf zeigt Gold pro Minute je Schwierigkeit.

**E2 Koop.** Gespielt wird mit der Burg des Hosts: Tor, Slots, Waffen und Stufen des Hosts. Der Gast bringt seine Hand und Hand-Stufe mit. Beide bekommen das in der Runde verdiente Gold dauerhaft gutgeschrieben. Ob jeder das ganze Gold bekommt oder es geteilt wird, entscheidest du nach Balance. Käse und Kampagnen-Fortschritt bekommt nur der Host. Den Koop-Faktor für die Gegnerzahl legst du neu fest, weil es jetzt weniger und schnellere Gegner gibt. Ziel: Zu zweit ist es nicht leichter als allein (heute ist es leichter).

- Ruckeln beim Gast beheben. Beim letzten Test zu zweit hat es beim Gast, der dem Raum beitritt, gelaggt und geruckelt. Miss die Ursache (Update-Rate, Paketgröße, fehlende Glättung oder Vorhersage) und behebe sie, zum Beispiel mit Interpolation der Gegnerpositionen und sofortiger lokaler Anzeige der eigenen Hand. Belege vorher und nachher mit Messwerten.
- Baue den Koop so, dass später ein eigener, gemieteter Server einspringen kann (als Relay oder für Matchmaking), ohne das Spiel umzubauen. Heute wird kein Server eingerichtet.
- Beide öffnen dieselbe Adresse und Version. Passen die Versionen nicht, zeigt das Spiel eine klare Meldung.

Prüfung: Koop-Test mit zwei Browsern; Messwerte zum Ruckeln vorher und nachher; Bot-Lauf zu zweit gegen allein.

### F. Entwickler-Werkzeuge und Versionen

**F1 Waffen-Editor im Entwickler-Menü.** Ausklappbar, für jede Waffe und Stufe live änderbar: Cooldown, Reichweite, Schaden, Trefferzahl, Dauer und Größe der Wirkung. Zurücksetzen auf Standard. Änderungen lassen sich als Text exportieren, damit Tim und Lenny Werte an Claude zurückgeben können. Prüfung: Browser-Test ändert einen Wert und sieht die Wirkung im Spiel.

**F2 Cheats im Entwickler-Menü.** Sich selbst Gold, Käse und Räuberwappen geben. Außerdem: Level freischalten, Stufen direkt setzen, Spielstand zurücksetzen, zweite Hand am Laptop simulieren. Diese Cheats wirken bewusst dauerhaft, damit man testen kann. Ein so veränderter Spielstand wird sichtbar gekennzeichnet. Andere Entwickler-Eingriffe während eines Laufs bringen wie bisher keinen dauerhaften Fortschritt. Prüfung: Test für jeden Cheat und für die Kennzeichnung.

**F3 Entwickler-Übersicht und offene Entscheidungen.** Die Entwickler-Übersicht für v0.3 liegt unter /fondue/next/dev/ und zeigt alle Tabellen: Waffen, Stufen, Preise, Gegner, Wellen, Level, Freischaltungen, Käse-Summe. Die offenen Entscheidungen stehen dort interaktiv: Zu jeder Entscheidung gibt es Optionen zum Auswählen und ein freies Textfeld. Weil die Seite statisch ist, erzeugt ein Knopf daraus ein vorausgefülltes GitHub-Issue mit den Antworten (Titel mit Präfix [Entscheidungen]). Bei langen Antworten verteilt sich das auf mehrere Issues, damit die Adresse nicht zu lang wird. Künftige Aufträge lesen diese Issues als Input. Zwischenspeichern im Browser ist erlaubt. Die bisherigen 21 Entscheidungen D-01 bis D-21: Markiere, welche durch v0.3 entschieden oder hinfällig sind, und übernimm nur die noch gültigen. Deine neuen Entscheidungen aus dieser Runde kommen dazu, jeweils mit deiner Wahl und Begründung. Prüfung: Browser-Test füllt eine Entscheidung aus und erhält eine gültige Issue-Adresse.

**F4 Versionen und Fahrplan.** v0.1 ist Classic (/fondue/classic/), v0.2 der heutige Live-Stand (/fondue/v0.2/, und bis zur Veröffentlichung von v0.3 weiter /fondue/), v0.3 dieses Update (/fondue/next/). Die Versionsnummer steht sichtbar im Spiel, in den Options und klein in der Lobby. v1.0 ist das Ziel für den Store-Launch. Lege in der Entwickler-Übersicht einen kurzen Fahrplan an: was bis v1.0 noch fehlt, verteilt auf ein bis zwei weitere Updates. Prüfung: Versionsnummer in Screenshots sichtbar; Fahrplan auf der Entwickler-Übersicht.

### G. Qualität und Store-Bereitschaft

**G1 Tests und Balance.** Automatische Tests erweitern und alle grün halten: Unit-Tests, Browser-Tests auf den drei Geräteformaten (inklusive Mehrfach-Touch), Balance-Läufe mit den drei Bots (schwach, mittel, sehr gut) über die Kampagne, im Endlos-Modus und im Koop. Ziele: Die Kampagne wird spürbar schwerer und verlangt Ausbau. Gute Spieler werden spät gefordert. Bosse brauchen spürbar mehr Versuche. Zu zweit ist es nicht leichter als allein. Viele Waffen sind konkurrenzfähig. Der Stufe-7-Grind liegt bei 20 bis 30 Runden. Alle Werte stehen in docs/balance.md. Prüfung: npm test, npm run test:e2e und npm run balance grün, Ergebnisse im Bericht.

**G2 Handy zuerst.** Alles wird zuerst für das Handy im Querformat gebaut und auf iPhone 16 quer, OnePlus 8T quer und Laptop geprüft: Touch-Flächen, Lesbarkeit, sichere Bildschirmränder (Notch), Vollbild. Prüfung: Screenshots jedes neuen Bildschirms auf allen drei Formaten in docs/screenshots/v0.3/.

**G3 Bereit für App Store und Google Play.** In dieser Runde wird keine App gebaut, auch kein iOS-Gerüst. Nichts darf aber den späteren Bau mit Capacitor für iOS und Android verbauen: Touch-Bedienung zuerst, Querformat, Vollbild, sichere Ränder, keine reinen Browser-Tricks, Spielstand wie in A6. Prüfung: Liste im Bericht, was für den Store-Bau später noch nötig ist.

**G4 Dokumente.** AGENTS.md (Begriffe, Stufen 1 bis 7), docs/GDD.md, docs/HANDBUCH.md, docs/ARCHITEKTUR.md, docs/ENTSCHEIDUNGEN.md und docs/OFFENE-ENTSCHEIDUNGEN.md beschreiben v0.3 korrekt. Diese Änderungen liegen auf v0.3-dev, nicht auf main. Prüfung: pruefer gleicht die Dokumente stichprobenartig mit Code und Konfiguration ab.

## 6. Feste Vorgaben und Startwerte

Feste Vorgaben von Tim und Lenny änderst du nicht. Startwerte darfst du mit Bots anpassen, wenn du die Änderung begründest.

| Thema | Fest | Startwert, anpassbar |
|---|---|---|
| Stufen | 1 bis 7 für Waffen, Burg, Hand | – |
| Käse | 1 bis 5 je Level, höchstens 500, Summe aller Käse-Preise genau 500 | Schwelle für Käse 3: Tor über 90 % |
| Wappen | nur am Adlerhaken, nötig für Stufe 7 | 20 bis 30 Runden bis zum ersten Stufe-7-Upgrade |
| Levellänge | 1 bis 10 Minuten | frühe 1 bis 2, Mitte 3 bis 5, Boss 6 bis 10 Minuten |
| Start | erster Gegner sichtbar nach höchstens 2 Sekunden | 1,5 Sekunden |
| Gegner | schneller und weniger | zwei- bis dreifaches Tempo, ein Drittel bis die Hälfte der Anzahl |
| Slots | fünf, mit festen Aufgaben und Orten, alle bis Level 15 | genaue Freischalt-Level |
| Waffen | eigene Waffen je Slot | 5 bis 7 je Slot |
| Yeti | mehrere Hände zählen zusammen | allein ab Hand-Stufe 4 |
| Endlos | eigene Burg, kein Käse, offen ab fünftem Slot, Easy/Medium/Hard | Gold je Schwierigkeit |
| Koop | Burg des Hosts, beide bekommen Gold, Käse nur Host | Goldteilung, Koop-Faktor |

## 7. Vorgehalten, aber nicht gebaut

Diese Ideen sind gesammelt. Baue sie nicht, verbaue sie aber auch nicht: Quick Play, eine eigene Koop-Kampagne, der Modus „Madness“, weitere Welten mit eigenem König (zum Beispiel ein Amerikaner mit allen Burgern), Accounts mit Cloud-Speicher und später Käufe, drei bis vier Spieler, Versus und Rollenteilung, Tauziehen um denselben Gegner, Ping-Markierung, Kombos, Bosse im Endlos-Modus, Wetter, ein eigener Koop-Server, eine Store-App.

## 8. Offen: du entscheidest und dokumentierst

Diese Punkte entscheidest du selbst, hältst sie in docs/ENTSCHEIDUNGEN.md fest und setzt sie auf die Liste der offenen Entscheidungen (F3):

- Englischer Spielname der Räuberwappen.
- Ob der Shop die Armoury ersetzt oder in ihr aufgeht.
- Freischalt-Level und Käse-Preis jeder Waffe, Zeitpunkt und Preis von Kessel und Adlerhaken.
- Wie das Überrollen der Kampagne mit Endlos-Gold verhindert wird.
- Goldteilung und Koop-Faktor im Koop.
- Fortsetzen eines unterbrochenen Levels.
- Dass wiederholte Level Gold bringen (A3), wurde im Vorgespräch gesetzt, aber von Tim nicht ausdrücklich bestätigt. Baue es so und setze es auf die Liste.
- Ob Boss-Level etwas freischalten (bisher D-21).
- Welche Variante der zweiten Hand sich besser anfühlt (C9).
- Was aus Waffen wird, die zu keinem Slot passen.

## 9. Fertig heißt

v0.3 ist fertig, wenn:

- /fondue/next/ den finalen Stand zeigt und auf allen drei Geräteformaten von der Vorrunde bis zur Freischaltung des fünften Slots spielbar ist,
- /fondue/, /fondue/classic/ und /fondue/dev/ unverändert sind und der Spielstand unter fondue.profile unberührt ist,
- jeder Eintrag in abnahme.json erledigt mit Beleg oder abgeschaltet mit Begründung ist,
- alle Tests grün sind und die unabhängige Prüfung (Etappe 5) durchlaufen ist,
- der Pull Request v0.3-dev → main offen und nicht gemergt ist,
- Bericht und Testanleitung im Repo liegen.

## 10. Bericht, Testanleitung und letzte Nachricht

Bericht docs/v0.3/BERICHT.md, auf Deutsch: was gebaut wurde, welcher Arbeitsweg (A oder B) genutzt wurde, alle selbst getroffenen Entscheidungen mit Begründung, was offen oder abgeschaltet ist, Messwerte (Zeit bis zum ersten Gegner, Koop-Ruckeln vorher und nachher, Balance, Levellängen, Wappen-Grind), der Vergleich der beiden zweiten Hände, die Liste für den späteren Store-Bau und der Fahrplan bis v1.0.

Testanleitung docs/v0.3/TESTEN.md, kurz und auf Deutsch, für Tim und Lenny:

- Testadresse https://onlineshopbuilding-droid.github.io/fondue/next/ und wie man sie auf dem iPhone über „Zum Home-Bildschirm“ neu anlegt (eigener Spielstand, getrennt vom bisherigen Button).
- Was sie gezielt ausprobieren sollen: Fühlt sich der Fortschritt gut an? Wie fühlen sich schnelle Gegner an? Ist der Shop klar? Welche zweite Hand ist besser? Ruckelt der Koop noch?
- Wie sie Cheats und Waffen-Editor nutzen und wie sie Feedback über die Entwickler-Übersicht zurückgeben.

Schreibstil für Bericht, Testanleitung und letzte Nachricht. Schreib für einen klugen Leser, der deine Werkzeug-Aufrufe, deine Überlegungen und die Dateien nicht gesehen hat und vielleicht gerade aus anderer Arbeit kommt. Die wichtigsten Punkte stehen in den ersten Sätzen. Verwende klare Wörter und ganze Sätze, keine Begriffe oder Abkürzungen, die du während der Arbeit erfunden hast, und keine Pfeilketten. Nutze Fließtext, wo Gedanken zusammenhängen, und Aufzählungen nur für getrennte Punkte.

Letzte Nachricht in der Sitzung: zuerst in einem Satz, ob v0.3 unter /next/ bereit zum Testen ist. Dann die zwei oder drei Dinge, die Tim und Lenny wissen oder entscheiden müssen, dann die Links zu Bericht, Testanleitung und Pull Request.
