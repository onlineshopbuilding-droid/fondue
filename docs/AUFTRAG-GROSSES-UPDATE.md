# Auftrag: Das große Update – Fondue wird vom Endlos-Test zum richtigen Handyspiel

Dieser Auftrag stammt von Tim und Lenny. Er beschreibt das größte Update, das Fondue bisher bekommen hat: Tutorial, Lobby in der Burg, Kampagne mit 100 Leveln, dauerhafter Fortschritt, neues Waffensystem, neuer Markt an der Burg, dazu eine Reihe gezielter Verbesserungen. Gleichzeitig wird der Code so umgebaut, dass Tim und Lenny ihn auf GitHub nachvollziehen und in den nächsten Monaten einfach weiterbauen können.

Sei ambitioniert. Gesucht ist die gründliche, schöne, vollständig getestete Version, nicht die kleinste, die die Anforderungen gerade erfüllt. Du hast dafür so viel Zeit, wie du brauchst.

---

## 0. Zuerst lesen

**Projekt**
- Repo: `onlineshopbuilding-droid/fondue` (öffentlich), lokal Tims Projektordner „Fondue“ unter Dokumente.
- Live: https://onlineshopbuilding-droid.github.io/fondue/
- Ausgangsstand: `main` bei Commit `3c93705` (Merge von PR #6, Grafik-Überarbeitung, 10.11.2026). Prüfe mit `git pull`, ob inzwischen etwas dazugekommen ist, und prüfe offene Pull Requests und Branches. Arbeitet gerade jemand anderes (Lenny, `@claude` in einem Issue) an etwas, fasst du dessen Branch nicht an und berücksichtigst es.
- Lies vollständig: `AGENTS.md`, `docs/HANDBUCH.md`, `docs/ENTSCHEIDUNGEN.md` (E-001 bis E-031), `docs/GDD.md`, `docs/balance.md`, `docs/uebergabe/IDEEN.md`, `docs/ABSCHLUSS-GROSSE-RUNDE.md`.
- Bekannte veraltete Stellen: `docs/GDD.md` nennt noch 34 Gegner an Tag 1 und Koop-Faktor 1,9; das Handbuch nennt in Abschnitt 9 noch „Tag 8 bis 12“ als Ziel. Gültig sind die Werte in `src/config/` und `docs/balance.md`. Diese Dokumente bringst du in dieser Runde auf den neuen Stand.

**Was heute existiert (Kurzfassung, damit du weißt, worauf du aufbaust)**
- Nur ein Modus: Endlos, solo oder online zu zweit (Host-autoritativ, PeerJS, Plan-B-Relay).
- 11 Gegnertypen, 22 Upgrades in 7 Reitern, 5 Burg-Ausbaustufen gekoppelt an die 5 Tore, 4 Landschaften, Waffen an 5 festen Plätzen der Burg (`WORLD.slots`: comet, bolter, stomper, horn, wheel).
- Menüs sind HTML-Panels über dem Canvas (`src/ui/app.ts`): main, play, host, join, options, help, scores, credits, results, shop, gameover, pause.
- Kein dauerhafter Fortschritt: `meta.owned` lebt nur innerhalb eines Laufs. Gespeichert werden nur Einstellungen und Bestenliste im `localStorage`.
- Kein Level-Begriff, kein Sieg-Zustand (nur „Tor gefallen“), kein Tutorial (nur Help-Seiten und einmalige Tipps über `firstDay`/`tip`).
- Saubere Kerne, die erhalten bleiben sollen: Simulation in `src/sim/` (deterministisch, ohne Phaser/DOM), Netzcode in `src/net/`, Sitzung in `src/game/session.ts`, Grafik aus Code in `src/art/`, rund 156 Unit-Tests, Browser-Tests, Balance-Bots.
- Gute Andockpunkte: `buildDayPlan` (`src/sim/spawn.ts`) für Tagespläne, `QUICK_STARTS`/`applyQuickStart` für Starts mit vorgegebenem Besitz, `buildTier`/`ownsSlot` (`src/sim/keep.ts`), Experiment-Schalter (`src/config/flags.ts`), Tipp-System für neue Gegner.

**Feste Begriffe (bitte überall genau so verwenden, in Code, Texten und Dokumenten)**
- **Welt:** ein Paket aus König, Story, Gegnern, Landschaften und Kampagne. Fondue ist Welt 1. Weitere Welten kommen später.
- **Level:** ein Kampagnen-Level. Die Kampagne hat 100 Level.
- **Tag:** ein Tag innerhalb eines Levels oder eines Endlos-Laufs.
- **Stufe / Upgrade:** Ausbaustand einer Waffe oder der Hand („Armbrust Stufe 3“ oder „Armbrust Upgrade 3“, beides ist in Ordnung). Niemals „Level“ für Waffen.
- **Slot:** ein Waffenplatz an der Burg.
- **Sterne:** vorläufiger Name der dauerhaften Währung zwischen den Leveln.
- **Gold / Offerings:** die Währungen innerhalb eines Levels oder Laufs, wie bisher.

---

## 1. Rahmen und Autonomie

**Laufzeit:** Unbegrenzt. 16 bis 20 Stunden sind ausdrücklich in Ordnung, länger auch. Erfahrungsgemäß bist du schneller, als du schätzt; nutze die Zeit für Qualität, Tests und Feinschliff statt früh aufzuhören. Prüfe die Uhrzeit immer per Befehl, schätze sie nie.

**Eine einzige Rückfrage am Anfang:** Arbeite die ersten 5 bis 10 Minuten: Stand prüfen, Werkzeuge prüfen (Node, npm, Playwright, `gh`-Login, Rechte für Pull Requests, Merges, Workflows und Pages), Plan grob aufstellen. Dann stellst du Tim in EINER gebündelten Nachricht alles, was du von ihm brauchst (Berechtigungen, Logins, Ja/Nein). Danach arbeitest du komplett autonom. Brauchst du später doch zwingend eine Bestätigung, sammelst du diese Punkte, arbeitest an allem anderen weiter und legst sie gebündelt vor, nie einzeln und nie wartend.

**Entscheiden statt fragen:** Alles, was dieser Auftrag offen lässt, entscheidest du selbst im Sinne der Ziele und hältst es mit Begründung in `docs/ENTSCHEIDUNGEN.md` fest (ab E-032). Entscheidungen, die Tim und Lenny später treffen oder bestätigen sollen, kommen zusätzlich auf die Entscheidungsliste (Abschnitt 11.2).

**Subagents und Sub-Sessions:** Du darfst beliebig viele einsetzen, auch sehr viele parallel. Plane das am Anfang bewusst und prüfe zwischendurch, ob eine laufende Aufgabe besser an parallele Agents ginge. Sinnvoll sind sie besonders für: Grafik je Figur oder Szene, Level-Daten und Story-Texte, Balance-Läufe, unabhängige Spieletester mit frischem Blick, Code-Review, Test-Reparatur. Architektur, Simulation, Profil und Netzcode entwirfst du selbst; Subagents bekommen klare, abgegrenzte Aufträge mit Dateigrenzen, damit sie sich nicht in die Quere kommen. Tim bestätigt nur einmal in der Hauptsitzung.

**Gedächtnis über die lange Laufzeit:** Lege diesen Auftrag wortwörtlich als `docs/AUFTRAG-GROSSES-UPDATE.md` ab (lokale Pfade mit Tims Benutzernamen auslassen, das Repo ist öffentlich). Führe `docs/PROGRESS-GROSSES-UPDATE.md` (Zeitstempel per Befehl, Etappe, erledigt mit Beleg, nächster Schritt, offene Probleme) und eine Abnahmeliste (`docs/features.json` erweitern oder eine neue Datei daneben), in der jeder Punkt dieses Auftrags einzeln steht und nur mit echtem Beleg abgehakt wird. Nach jeder Kontext-Zusammenfassung liest du zuerst Auftrag, Fortschritt und Abnahmeliste.

**Regeln, die weiter gelten:** alles aus `AGENTS.md`, insbesondere E-001 (eigenständiges Spiel, nichts von Knights Onrush übernehmen), Skill „Unlazy“ nie verwenden, keine Systemeinstellungen ändern, kein Force-Push, keine Zugangsdaten ins Repo, Dateien einzeln committen (kein `git add -A`), Dokumente Deutsch, Code/Kommentare/Commits Englisch, Spieltexte Englisch, Browser-Tests mit Playwright und nicht mit Tims privatem Browser.

**Für diese Runde ausdrücklich von Tim freigegeben (weicht von AGENTS.md ab):**
- Du darfst ohne Nachfrage auf deinen Branches committen und pushen.
- Du darfst die nötigen Pull Requests selbst stellen und selbst mergen, sobald die Prüfung `test` grün ist: den für die Sicherung (Abschnitt 2) und am Ende den für das Update.
- Du darfst am Ende selbst veröffentlichen.
- Du darfst das Repo umstrukturieren, wenn die heutige Struktur dem Ziel im Weg steht.

---

## 2. Etappe 0: Den heutigen Stand sichern und weiter spielbar halten

Das passiert als Allererstes, vor jedem Umbau.

1. Setze auf den heutigen Stand von `main` den Tag `v0-alpha` und lege den Branch `classic` an, der auf diesem Stand stehen bleibt.
2. Veröffentliche diesen Stand zusätzlich unter **https://onlineshopbuilding-droid.github.io/fondue/classic/**. Dafür muss die Pages-Pipeline (`.github/workflows/deploy.yml`) künftig mehrere Builds in einen gemeinsamen Ordner legen: `main` unter `/`, `classic` unter `/classic/`, später die Entwickler-Übersicht unter `/dev/`. Achte auf den richtigen Basis-Pfad je Build (Vite `base`), sonst laden die Dateien nicht.
3. Diese Workflow-Änderung geht als kleiner eigener Pull Request nach `main`, den du selbst mergst, sobald `test` grün ist. Das Spiel unter der normalen Adresse darf sich dadurch nicht verändern.
4. Prüfe mit Playwright, dass beide Adressen laden und spielbar sind, und dass Koop funktioniert, wenn beide dieselbe Adresse öffnen.
5. **Melde Tim sofort den Link zur Classic-Version** und sag dazu: Host und Gast müssen dieselbe Adresse öffnen; die Android-Testapp zeigt immer die normale Adresse.
6. Bis zum finalen Merge bleibt die normale Adresse unverändert spielbar. Tim und Lenny spielen währenddessen weiter.
7. Schreibe eine kurze Rückroll-Anleitung in den Abschlussbericht: wie man `main` auf `v0-alpha` zurückbringt, falls das Update nicht überzeugt.

Danach arbeitest du auf einem eigenen Branch (zum Beispiel `feature/grosses-update`), in einem eigenen Git-Worktree, und committest nach jedem sinnvollen Schritt. Wenn es mit wenig Aufwand geht, veröffentliche getestete Zwischenstände zusätzlich unter `/fondue/next/`; das ist freiwillig.

---

## 3. Ziel und Leitlinien

**Das Ziel:** Fondue ist nach diesem Update kein Endlos-Test mehr, sondern ein richtiges Spiel: Man öffnet die App, wird ohne Menü ins Spiel geworfen und versteht in Sekunden das Wegschleudern, landet danach in der Lobby in der Burg, spielt eine Kampagne mit 100 Leveln, schaltet Waffen und Slots frei, verbessert sie dauerhaft und kann jederzeit Endlos spielen, allein oder zu zweit.

**Handy zuerst.** Fondue ist ab jetzt ein reines Handyspiel im Querformat. Jede Entscheidung zu Bedienung, Schriftgrößen, Layout und Tempo wird für den Touchscreen getroffen. Der Laptop muss weiter funktionieren (Entwicklung, Tests, gelegentliches Spielen mit Maus), ist aber nicht mehr der Maßstab.

**Geprüft wird ab jetzt auf genau drei Geräten:**
- Tims iPhone 16 (Safari, als Web-App vom Homescreen; im Test rund 852 × 393 CSS-Pixel quer, bitte nachprüfen),
- Lennys OnePlus 8T (Android, Chrome, Seitenverhältnis 20:9, 2400 × 1080 Pixel, rund 915 × 412 CSS-Pixel quer, bitte nachprüfen),
- Laptop.

Ersetze die bisherigen Standard-Bildschirme der Browser-Tests durch diese drei. Alle anderen Größen (kleine Androids, iPads) bleiben im Code hinter `ALL_SCREENS=1` und werden erst später wieder geprüft.

**Spielgefühl vor allem.** Das Packen und Wegschleudern bleibt das Herz. Kein Umbau darf es verschlechtern. Die Wurfphysik und die Vorhersage beim Gast (Handbuch, Falle 4) fasst du nur an, wo dieser Auftrag es verlangt (Gewicht, Hand-Stufen), und sicherst es mit Tests und Bild-für-Bild-Prüfung ab.

**Grafik:** schön, stimmig und liebevoll, mit mehreren echten Prüfrunden durch frische Subagents. Sie muss aber noch nicht die endgültige High-End-Grafik sein, der Schwerpunkt dieser Runde sind die Spielmechaniken und die Struktur. Wichtig: Tim und Lenny wollen die Grafik später grundlegend ersetzen (eigene und KI-erzeugte Bilder für Hintergründe, Burg, Gegner). Siehe 4.3.

**Jede Änderung muss ins ganze Spiel passen** (Stimmigkeits-Check, Handbuch Abschnitt 9): Texte, Hilfe, Tipps, Markt, Balance, Koop, Tests, Dokumente werden mitgeändert.

---

## 4. Architektur: sauber, in Klassen, erweiterbar

Tim und Lenny haben leichte Programmierkenntnisse und wollen den Code auf GitHub lesen, verstehen und mit KI weiterbauen. Die Struktur ist deshalb genauso wichtig wie die Funktionen.

### 4.1 Vorgehen
- Schreibe zuerst `docs/ARCHITEKTUR.md`: Zielstruktur, Ordner, Klassen mit je einem Satz Aufgabe, Datenfluss, was wohin wandert. Lass den Entwurf von einem frischen Subagent kritisch prüfen, bevor du baust.
- **Bewährte Kerne werden hineinbewegt, nicht neu geschrieben:** Simulation, Netzcode, Sitzung, Wurfphysik, Grafik-Bausteine, Audio. Die vier Regeln aus dem Handbuch (Abschnitt 2) gelten weiter: `src/sim/` kennt weder Phaser noch DOM, dort kein `Math.random`, Zahlen in die Konfiguration, Spielname nur in `src/config/game.ts`.
- Neu geschrieben oder zerlegt werden darf alles, was dem Ziel im Weg steht. Ausdrücklich zerlegt werden sollen die großen Sammeldateien: `src/ui/app.ts` (ein Bildschirm pro Datei bzw. Klasse, dazu ein kleiner Bildschirm-Manager), `src/sim/sim.ts` (nach Themen: Tagesablauf, Gegnerverhalten, Waffen, Opferstätten, Wirtschaft), `src/art/castle.ts` und `src/art/props.ts`.
- Baue in Etappen. Nach jeder Etappe läuft das Spiel und die Tests sind grün.

### 4.2 Was die Struktur leisten muss
- **Modi als eigene Klassen** hinter einer gemeinsamen Schnittstelle: Tutorial, Kampagne, Endlos. Vorgehalten (Platz im Modell, noch nicht gebaut): Koop-Kampagne, Schnellspiel, „Wahnsinn“. Ein Modus bestimmt: Tagespläne, Sieg- und Niederlagenbedingung, was im Markt kaufbar ist, welche Belohnung es gibt.
- **Level als Daten:** Ein Level ist ein Datensatz (Nummer, Name, Tage, Landschaft, erlaubte Gegner, Tagespläne oder Regeln dafür, Schwierigkeit, Boss-Kennzeichen, Belohnung, Freischaltungen, Story-Satz, Besonderheit). Die Simulation bekommt einen Tagesplan und weiß nichts von Kampagne oder Endlos.
- **Welt als Paket:** König, Story, Gegnerauswahl, Landschaften, Kampagne. Fondue ist Welt 1. Der Code darf nirgends annehmen, dass es nur eine Welt gibt.
- **Waffen als Daten mit kleinen Verhaltensklassen:** eine Definition je Waffe (Slot-Typ, 5 Stufen mit Werten, Preise, Texte, Grafiknamen) und eine Verhaltensklasse je Waffenart. Eine neue Waffe hinzuzufügen oder eine zu entfernen darf nur wenige, klar benannte Stellen berühren.
- **Profil als eigene Klasse** (Abschnitt 5) hinter einer Speicher-Schnittstelle.
- **Zentrale Tabellen in `src/config/`**, die man ohne Code-Verständnis ändern kann: Level-Liste, Freischalt-Tabelle (welches Level schaltet welche Waffe, welchen Slot frei), Stern-Belohnungen und -Preise, Waffenwerte, Gegnerwerte inklusive Gewicht, Endlos-Zufallsspannen, Story-Texte. Jede Tabelle hat oben einen kurzen Kommentar, was die Spalten bedeuten.
- **Statistik pro Lauf** als eigene Klasse: Die Simulation zählt künftig mehr mit (zum Beispiel Kills nach Ursache und Gegnertyp, per Fass-Explosion getötete Gegner, geopferte Gegner, eingesetzte Waffen, verlorenes Torleben). Spätere Challenges und Bonus-Sterne sind dann nur Regeln auf diesen Zahlen.
- **Lesbarkeit:** sprechende Namen, kurze Klassen mit einer klaren Aufgabe, ein Kommentar am Kopf jeder Datei, der in zwei Sätzen sagt, wofür sie da ist.

### 4.3 Grafik austauschbar machen
Jede Figur, jedes Teil, jede Ebene bekommt einen festen Namen in einem zentralen Verzeichnis (Asset-Registry). Hinter dem Namen steckt heute SVG-Code, morgen kann dort eine Bilddatei (PNG/WebP) liegen, ohne dass Spiellogik oder Szenen geändert werden. Dazu gehören feste Maße und Ankerpunkte je Asset (Größe, Fußpunkt, Griffpunkte), dokumentiert in `docs/GRAFIK-AUSTAUSCHEN.md` mit einer Schritt-für-Schritt-Anleitung und einer Liste aller Assets. Beweise es mit einem Test, der ein Asset probeweise durch eine Bilddatei ersetzt.

---

## 5. Profil und Speichern

Fortschritt muss Läufe, Neuladen und Updates überdauern.

- **Inhalt des Profils:** Spielername, Sterne, geschaffte Level je Welt, freigeschaltete Waffen und Slots, dauerhafte Waffen-Stufen, Hand-Stufe, gesehenes Tutorial, gesehene Gegner-Popups und Tipps, gelesene Story-Seiten, Bestenliste, Einstellungen, Entwickler-Bewertungen (11.2), Platz für eine spätere Koop-Kampagne.
- **Versionsnummer im Datensatz und Migrationen:** Ein späteres Update wandelt alte Profile um, statt sie zu zerstören. Die bisherigen Schlüssel `fondue.settings.v1` und `fondue.scores.v1` werden einmalig übernommen. Tests für Migration und beschädigte Daten.
- **Speicher-Schnittstelle:** heute lokal im Browser (`localStorage`), später austauschbar gegen App-Speicher (Capacitor) und gegen einen eigenen Dienst. Tim will später unbedingt Accounts mit E-Mail und Passwort, Login auf einer eigenen Webseite, Käufe außerhalb der App-Stores und den Spielstand auf jedem Gerät. Das wird jetzt nicht gebaut, aber die Profil-Klasse darf dem nicht im Weg stehen.
- **Export und Import** des Profils als Textcode in den Options, als Sicherung und zum Umzug auf ein anderes Gerät. Hinweis im Spiel: immer über dasselbe Homescreen-Symbol öffnen, weil Homescreen-App und Browser-Tab getrennte Speicher haben.
- **Zurücksetzen** des Profils im Entwickler-Menü, mit Sicherheitsabfrage.
- **Koop:** Jeder schreibt seine eigene Belohnung in sein eigenes Profil; der Host verwaltet nicht das Profil des Gasts.
- Profile liegen nie im Repo.

---

## 6. Spielerweg: erster Start und Tutorial

Das Wichtigste: Wer die App zum ersten Mal öffnet, ist so schnell wie möglich im Spielgefühl. Kein Menü, keine Erklärtexte, keine Namenseingabe davor.

### 6.1 Vorrunde (direkt nach dem Laden)
- Man sieht sofort das Schlachtfeld: Burg links, Straße, Angriff von rechts.
- Der König kommt von links kurz ins Bild und sagt in ein bis zwei kurzen Sätzen sinngemäß: Die Mäuse wollen mein Fondue, verteidige es. (Spieltext Englisch, mit Witz, sehr kurz.) Währenddessen laufen schon die ersten Gegner ins Bild.
- Dann friert das Bild kurz ein. Eine angenehme, klare Animation zeigt an einem Gegner die Geste: mit dem Finger packen und nach oben wegschleudern. Der Spieler macht es einmal selbst nach. Sobald es geklappt hat, läuft das Spiel weiter und er spielt frei.
- Die Vorrunde ist kurz und keine offizielle Runde: wenige Gegner (Richtwert 10 bis 15 Pothelms), genug, um das Gefühl wirklich zu verstehen. Das Tor kann hier nicht fallen (oder praktisch nicht).
- Ton braucht auf Handys eine erste Berührung; löse das unauffällig (die erste Geste schaltet den Ton frei), ohne ein Menü davorzusetzen.

### 6.2 Level 1 ist der Rest des Tutorials (genau zwei Tage)
- Tag 1: ein normaler, leichter Tag.
- Danach der erste Markt (Abschnitt 9): Dort ist nur der Great Cauldron kaufbar, und der König sagt in einem Satz, wofür er gut ist. Das Gold reicht sicher dafür.
- Tag 2: Der Kessel ist im Einsatz; ein kurzer Hinweis zeigt, wie man hineinwirft.
- Danach: Sieg-Bildschirm von Level 1, dann zoomt die Kamera in die Burg und man steht zum ersten Mal in der Lobby.

### 6.3 Regeln dazu
- Das Tutorial läuft nur beim allerersten Start (Merker im Profil). Im Entwickler-Menü lässt es sich erneut starten.
- Wer über einen Koop-Einladungslink kommt und das Tutorial noch nicht kennt: Entscheide eine sinnvolle Lösung (zum Beispiel direkt beitreten, Tutorial beim nächsten Solo-Start) und halte sie fest.
- Die bisherigen Help-Seiten bleiben erreichbar, werden aber an alle neuen Regeln angepasst.

---

## 7. Die Lobby in der Burg

- Die Lobby ist das Hauptmenü und liegt **im Inneren der Burg**. Sie ist eine eigene Spielszene mit eigener Innenraum-Grafik, kein HTML-Panel vor einem Bild.
- **Kamera:** Nach einem Level oder Lauf zoomt die Kamera in die Burg hinein, beim Start eines Levels oder Laufs aus ihr heraus aufs Schlachtfeld. Der Übergang soll sich wie ein Ort anfühlen, nicht wie ein Bildschirmwechsel. Er muss kurz sein und sich überspringen lassen.
- **Was man in der Lobby findet** (als antippbare Stationen im Raum, groß genug für Finger, jede klar erkennbar):
  - Kampagne weiterspielen (führt zur Pfad-Karte, 8.2),
  - Endlos spielen,
  - Koop: Raum eröffnen oder beitreten,
  - Waffenkammer: alle Waffen, freigeschaltet oder noch gesperrt (mit Hinweis, ab welchem Level), ihre Stufe, Upgrades mit Sternen kaufen, dazu die Hand und ihre Stufe,
  - Storybuch (eher unauffällig bis versteckt platziert),
  - Options (dort auch das Entwickler-Menü), Scores, Help, Credits.
  - Sichtbar: Sterne-Stand und Kampagnen-Fortschritt.
- **Der König** ist in der Lobby präsent und wirft gelegentlich einen kurzen Satz ein.
- **Aussehen des Innenraums:** entwirfst du selbst. Offene Frage von Tim: Die Burg wird in jedem Level neu ausgebaut, die „eigene“ Burg soll aber nicht abgewertet wirken. Vorschlag: Der Innenraum zeigt dauerhaft den Kampagnen-Fortschritt (wird über die 100 Level prächtiger, bekommt Trophäen und die freigeschalteten Waffen an der Wand), unabhängig vom Ausbau im einzelnen Level. Setze eine überzeugende Lösung um und setze sie auf die Entscheidungsliste.
- **Koop-Raum:** Wenn man einen Raum eröffnet oder beitritt, zeigt ein kleines, gut eingepasstes Fenster live, wer im Raum ist: der eigene Name, darunter der Mitspieler oder ein leerer Platz. Baue es so, dass später drei oder vier Namen hineinpassen. Im Join-Bildschirm steht **„Join“ rechts und „Back“ links** (heute ist es umgekehrt); prüfe alle Dialoge auf dieselbe Anordnung: weiter rechts, zurück links.

---

## 8. Kampagne

### 8.1 Grundregeln
- 100 Level in Welt 1. **Alle 100 werden in dieser Runde befüllt und getestet.**
- Ein Level dauert 5 bis 15 Tage, im Schnitt 5 bis 10. Level 1 hat als Tutorial zwei Tage. Die Tageslängen sind ein Startwert und stehen in der Level-Tabelle.
- **Die Kampagne ist festgelegt, nicht zufällig:** Für jedes Level und jeden Tag steht fest, welche Gegner kommen, wie viele, und was neu ist. Gleiche Eingaben ergeben denselben Verlauf.
- **Eine feste Schwierigkeit**, keine Auswahl Easy/Medium/Hard in der Kampagne.
- **Jedes Level beginnt frisch:** Gold 0, Offerings 0, Holztor, leere Slots. Innerhalb des Levels verdient man Gold und Offerings wie bisher, baut Tor und Burg aus und kauft Waffen in die Slots. Dauerhaft ist nur, was im Profil steht (8.4).
- **Sieg:** Der letzte Tag des Levels ist überstanden. Neuer Zustand in der Simulation und ein eigener Sieg-Bildschirm: verdiente Sterne, neue Freischaltungen groß und feierlich, ein kurzer Story-Satz, dann Zoom in die Burg.
- **Niederlage:** Fällt das Tor, ist das Level nicht geschafft. Man kann direkt „Try again“ wählen oder zurück zur Kampagnen-Karte. Es beginnt immer wieder bei Tag 1 des Levels.
- Ein unterbrochenes Level (App geschlossen) soll möglichst am Beginn des aktuellen Tages fortgesetzt werden können; wenn das zu riskant ist, mindestens sauber abbrechen und es dokumentieren.

### 8.2 Kampagnen-Karte
- Tippt man auf Kampagne, sieht man einen Pfad durch eine Landschaft mit allen Leveln als Stationen. Man soll spüren: Ich komme voran.
- Sichtbar: geschaffte Level, das aktuelle Level, Boss-Level (deutlich markiert), Stationen mit einer Freischaltung (zum Beispiel ein glänzendes Fragezeichen), Wechsel der Landschaft entlang des Wegs.
- Scrollbar mit dem Finger, startet beim aktuellen Level. Geschaffte Level lassen sich erneut spielen.

### 8.3 Aufbau der 100 Level
- **Erzeugt aus Regeln, einzeln überschreibbar:** eine Schwierigkeitskurve über alle 100 Level (mehr, stärkere, schnellere Gegner), feste Einführungspunkte für Gegner, Boss-Level, Landschaftswechsel, darüber von Hand gesetzte Besonderheiten. Das Ergebnis liegt als lesbare Tabelle vor, in der Tim und Lenny jedes Level einzeln ändern können.
- **Gegner kommen Stück für Stück:** in den ersten Leveln nur Pothelms, dann der Keg Hauler, später Goat Rider, Pogo Bandit, Hexer, Slinger, Siege Cart, Balloonist, Shade, Crowcaller, Yeti. Die Reihenfolge darf sich an den heutigen `firstDay`-Werten orientieren, wird aber über die 100 Level gestreckt.
- **Popup „New enemy“:** Bei jedem ersten Auftreten erscheint kurz ein Fenster mit Bild, Name und ein bis zwei knappen, klaren Sätzen, was der Gegner kann und wie man ihn besiegt. Kurz, gut lesbar am Handy, mit einem Tipp weg. Es ersetzt und verbessert das heutige Tipp-System.
- **Boss-Level:** deutlich härter und besonders, ungefähr jedes zehnte Level. Kopple sie wo sinnvoll mit großen Freischaltungen (neuer Slot, besonders starke Waffe). Was ein Boss-Level ausmacht (zum Beispiel ein übergroßer Gegner mit eigener Mechanik, ein Massenansturm, ein besonderer Verbündeter der Mäuse), entwirfst du; es muss mit den vorhandenen Mechaniken fair spielbar sein, auch solo.
- **Besonderheiten einzelner Level** (Ideen aus der Ideenliste): nur Springer, nur Reiter, Nacht, viele Schwere, Luftangriff. Setze sie gezielt ein, damit die 100 Level nicht gleichförmig wirken.
- **Schauplätze:** Die Kampagne zieht sichtbar durch verschiedene Gegenden, um Fortschritt zu zeigen. Wechsel ungefähr alle 10 bis 15 Level. Es gibt heute vier Landschaften (Meadow, Canyon, Marsh, Snowpine); ergänze Varianten oder weitere, wenn die Zeit reicht und die Qualität stimmt.
- **Story-Fortschritt:** Jedes Level trägt einen kurzen Story-Satz (Abschnitt 12).

### 8.4 Dauerhafter Fortschritt: Sterne, Freischaltungen, Stufen
- **Sterne** gibt es für jedes geschaffte Level (vorerst ein fester Betrag je Level aus der Tabelle, Boss-Level mehr) und für gute Endlos-Läufe. Wiederholtes Spielen eines geschafften Levels darf nicht zum Farmen taugen (zum Beispiel volle Sterne nur beim ersten Schaffen, danach wenig oder nichts); lege eine klare Regel fest.
- **Freischalten über Fortschritt:** Waffen und Slots werden erst durch das Vorankommen in der Kampagne verfügbar. Das steht in einer zentralen Freischalt-Tabelle. Beispielwerte von Tim (nur als Größenordnung, du baust die erste vollständige Fassung): zweite Waffe um Level 6, zweiter Slot um Level 10. Am Ende der Kampagne sind alle fünf Slots und alle Waffen verfügbar.
- **Sterne ausgeben:** Mit Sternen verbessert man zwischen den Leveln dauerhaft die Stufe einer Waffe (1 bis 5) und der Hand (1 bis 3). Ob das erste Freischalten einer verfügbar gewordenen Waffe zusätzlich Sterne kostet, steht als Preis in der Tabelle (darf 0 sein); wähle einen sinnvollen Startwert.
- **Wirkung im Level:** Kauft man in einem Kampagnen-Level eine Waffe in einen Slot, kostet das einmalig Gold, und sie hat sofort ihre dauerhafte Stufe aus dem Profil. Im Level selbst wird die Waffenstufe nicht erhöht.
- **Vorbereiten, aber nicht bauen:** eine Bewertung mit ein bis drei Sternen je Leistung, Sterne für Challenges („lass fünf Keg Haulers explodieren“), Bonus-Sterne, eine Trennung von Sternen (Sammelobjekt) und einer eigenen Währung. Belohnungslogik und Statistik müssen so getrennt sein, dass das später nur neue Regeln sind.

### 8.5 Koop in der Kampagne
- Modell **„Host-Kampagne mit Helfer“:** Der Host spielt sein Level mit seinem Profil (seine Freischaltungen, Stufen, Hand). Der Gast bringt nur seine Hand mit. Beide bekommen Sterne, Level-Fortschritt bekommt nur der Host.
- **Gegen Stern-Farmen:** Der Gast bekommt Sterne für ein bestimmtes Level nur einmal (Vorschlag) oder deutlich reduziert. Prüfe im Balancing, dass sich durch viel Koop kein unverhältnismäßiger Fortschritt ergibt.
- Die Koop-Regeln aus dem Bestand bleiben (gemeinsame Kasse, gemeinsames Tor, Ready im Markt, mehr Gegner, weniger Gold pro Kill) und werden für die Kampagne neu gemessen.
- **Vorhalten, nicht bauen:** eine eigene Koop-Kampagne (eine zweite Kampagne mit etwa 10 bis 50 Leveln, die man nur zu zweit spielen kann und die früh verfügbar ist). Datenmodell, Profil und Modus-Schnittstelle müssen sie später ohne Umbau aufnehmen können.

---

## 9. Der neue Markt an der Burg

Der Markt zwischen den Tagen ist kein Listen-Panel mehr.

- **Kamera:** Sie fährt etwas näher an die Burg und zeigt zugleich mehr von ihr, auch nach links. Links von x = 0 gibt es heute keine Welt; die Burg muss dafür nach links weitergezeichnet werden (weitere Mauern, Türme, Hof), stimmig in allen fünf Ausbaustufen und allen Landschaften. Im Kampf bleibt die Burg am linken Bildrand wie bisher (E-021).
- **Slots antippen:** Man tippt direkt auf einen Slot an der Burg. Es öffnet sich ein Auswahlfenster für diesen Slot: welche Waffen dort möglich sind, kaufen, auswählen/wechseln, im Endlos-Modus verbessern. Leere und noch gesperrte Slots sind klar erkennbar.
- **Mit Bildern:** Jede Waffe wird mit ihrem Bild gezeigt, nicht nur als Text. Höhere Stufen sehen sichtbar mächtiger aus, im Fenster und an der Burg.
- **Burg ausbauen:** ein eigener, gut sichtbarer Knopf an der Burg für Tor und Ausbaustufe.
- **Hand verbessern:** ein eigener Eintrag (im Endlos-Modus kaufbar, in der Kampagne nur Anzeige der dauerhaften Stufe).
- **Opferstätten** (Kessel, Adlerhaken) kauft man ebenfalls an ihrem Ort.
- Gold und Offerings bleiben groß sichtbar. Ergebnis des Tages, Ready-Knopf und im Koop die Kaufmeldungen („Lenny bought …“) bleiben erhalten. Alles muss mit dem Daumen bequem gehen, mindestens 44 Pixel große Flächen.

---

## 10. Waffen, Slots und Hand

### 10.1 Waffen
- **Fünf Slots** an der Burg. In der Kampagne werden sie nach und nach freigeschaltet, in den ersten Leveln gibt es also weniger.
- **15 bis 20 Waffen insgesamt, jede mit 5 Stufen.** Die bisherigen Waffen bleiben als Grundstock (Wheel, Stomper, Comet, Gate Mortar, Frost Horn, Dragon Bellows, Roof Bolter) und bekommen 5 statt 3 Stufen. Die übrigen erfindest du passend zur Käse- und Alpenwelt.
- **Pro Slot wählt man eine Waffe:** Slots haben einen Typ (heute: Mauerfuß, Mauer, Schrein, Tor, Turm). Für jeden Typ gibt es mehrere Waffen, zwischen denen man sich entscheiden muss (zum Beispiel Armbrust oder Mörser im Schuss-Slot). Ordne die Waffen so, dass echte Entscheidungen entstehen und jeder Slot-Typ mehrere reizvolle Möglichkeiten hat. Die bisherige Zuordnung darfst du dafür ändern.
- **Tim und Lenny sortieren später aus.** Baue also lieber einige Waffen mehr, jede klar eigenständig (andere Wirkung, anderes Gefühl, nicht nur andere Zahlen), jede einzeln abschaltbar (Kennzeichen in der Tabelle), und setze jede auf die Bewertungsliste (11.2).
- **Stufen dürfen nicht nur „größer“ bedeuten.** Jede Stufe soll sich spürbar und sichtbar verbessern (Wirkung, Zusatzeffekt, Nachladezeit, Aussehen).
- **Stomper neu gestalten:** Heute wird er pro Stufe nur größer, bis er riesige Teile des Bildschirms füllt. Entwirf ihn neu, in Aussehen und Wirkung über die Stufen.
- **Bedienung: nur noch antippen.** Das Ziehen zum Zielen (Schleuder-Geste, E-022, E-027) entfällt vollständig, weil es neben dem Werfen zu aufwendig war.
  - **Armbrust (Roof Bolter):** Antippen feuert sofort eine breit gefächerte Salve, die über die ganze Höhe wirkt: oben Balloonists, unten Läufer.
  - **Gate Mortar:** Antippen feuert auf den Gegner, der dem Tor am nächsten ist.
  - **Frost Horn, Dragon Bellows und alle neuen Waffen:** ebenfalls nur antippen, mit einem sinnvollen automatischen Ziel (zum Beispiel die dichteste Gruppe); du entscheidest und dokumentierst es.
  - **Stomper und Comet:** Du entscheidest, ob „antippen, dann Stelle antippen“ bleibt oder ob auch sie mit einem Tipp automatisch zielen; maßgeblich ist, was sich am Handy am besten spielt. Auf die Entscheidungsliste setzen.
  - Entferne den nicht mehr gebrauchten Zielcode sauber (Regeln, Zielhilfe, Bots, Hilfe-Texte, Tests) und ersetze die Tests durch Tests der neuen Bedienung. Die Bots müssen die neue Bedienung nutzen.
- Griffzonen an der Burg (E-024) bleiben: Ein Tipp auf eine Waffe greift nie einen Gegner, ein Gegner am Tor bleibt immer greifbar.

### 10.2 Unterschied Kampagne und Endlos
- **Kampagne:** Stufen sind dauerhaft (Sterne, zwischen den Leveln). Im Level kauft man die Waffe einmalig mit Gold in den Slot und hat sie auf ihrer dauerhaften Stufe.
- **Endlos:** Alles wird im Lauf gekauft. Jede Waffe startet auf Stufe 1 und wird zwischen den Tagen mit Gold und Offerings bis Stufe 5 verbessert. Nach dem Lauf ist das weg.
- **Annahme für Endlos (bitte auf die Entscheidungsliste):** Im Endlos-Modus sind vorerst alle Waffen und alle fünf Slots verfügbar, unabhängig vom Kampagnen-Fortschritt, damit Tim und Lenny alles testen können. Lege dafür einen Schalter in der Konfiguration an („Endlos nutzt nur freigeschaltete Waffen“), der später umgelegt werden kann.

### 10.3 Gewicht der Gegner und Stärke der Hand
- **Jeder Gegner bekommt ein eigenes Gewicht** in der Gegnertabelle: Pothelm leicht, Keg Hauler etwas schwerer, Goat Rider deutlich schwerer, Yeti sehr schwer, die übrigen sinnvoll dazwischen.
- **Schwere Gegner lassen sich schwerer werfen:** Bei gleicher Wischbewegung fliegen sie kürzer und flacher. Schön wäre zusätzlich, dass sie der Hand träger folgen. Teste selbst, was sich gut anfühlt und robust funktioniert (auch beim Gast, Falle 4). Gibt es mit dem trägen Ziehen größere Probleme, nimm die einfache Variante (nur kürzerer Flug). Ein tödlicher Wurf muss mit jedem greifbaren Gegner erreichbar bleiben, wenn man kräftig genug wischt.
- **Hand mit Stufen 1 bis 3:** Eine stärkere Hand wirft schwere Gegner leichter und weiter. Kampagne: dauerhaft mit Sternen zwischen den Leveln. Endlos: pro Lauf zwischen den Tagen kaufen.
- Der Yeti bleibt etwas Besonderes (allein kaum zu werfen, zu zweit gemeinsam); prüfe, wie Gewicht und Hand-Stufe dazu passen, und halte die Regel fest.
- Vorhalten: mehr Hände als spätere Freischaltung.

### 10.4 Hand-Anzeige
- Am Touchscreen wird **die eigene Hand nicht mehr gezeichnet**; der Spieler sieht seinen Finger. Es zählt nur die Berührung.
- **Die Hand des Koop-Mitspielers bleibt sichtbar**, sie ist die einzige Information, wo der andere gerade greift.
- Mit der Maus am Laptop bleibt die eigene Hand als Zeiger.

---

## 11. Entwickler-Werkzeuge

### 11.1 Entwickler-Menü am Handy
Das Menü ist heute über F1 erreichbar (am Handy nur über langes Drücken aufs Logo). Es bekommt einen festen, sichtbaren Eintrag in den **Options**, auf dem Handy voll bedienbar. Das ist in Ordnung, solange das Spiel nicht veröffentlicht ist; baue es so, dass man es später mit einem Schalter verstecken kann. Inhalt:
- Tuning-Regler und Experiment-Schalter wie bisher,
- direkt zu einem beliebigen Level und Tag springen, mit passendem Besitz,
- Endlos-Schnellstart ab späteren Tagen wie bisher,
- Profil bearbeiten: Sterne setzen, alles freischalten, Stufen setzen, Tutorial zurücksetzen, Profil löschen,
- Tutorial und einzelne Popups erneut abspielen,
- die Entscheidungs- und Bewertungsliste (11.2),
- Link zur Entwickler-Übersicht (11.3).
Läufe mit Entwickler-Eingriffen zählen nicht für Bestenliste und Sterne.

### 11.2 Entscheidungs- und Bewertungsliste
- Eine Liste im Entwickler-Menü mit allem, was Tim und Lenny noch entscheiden müssen: jede erfundene Waffe (mit Bild und Kurzbeschreibung), dazu alle offenen Entscheidungen aus diesem Auftrag und alle, die du unterwegs getroffen hast.
- Jeder Eintrag lässt sich abhaken und bewerten („finden wir gut“ / „finden wir nicht gut“), mit kurzer Notiz. Der Stand wird im Profil gespeichert und lässt sich als Text exportieren.
- Dieselbe Liste liegt zusätzlich als Datei im Repo: `docs/OFFENE-ENTSCHEIDUNGEN.md`.

### 11.3 Entwickler-Übersicht als teilbare Seite
Eine schön gestaltete Seite in der Optik des Spiels, die **automatisch aus den Konfigurationsdateien erzeugt** wird (damit sie nie veraltet) und unter **https://onlineshopbuilding-droid.github.io/fondue/dev/** veröffentlicht wird, gut lesbar am Handy, damit Tim und Lenny beim Spielen nachschauen können. Inhalt:
- **Kampagne:** für jedes Level und jeden Tag: welche Gegner, wie viele, was neu ist, Boss, Landschaft, Sterne, Freischaltungen. Mit Filter oder Sprung zu einem Level.
- **Endlos:** für jeden Tag und jede Schwierigkeit: Spanne der Gegnerzahl und die Wahrscheinlichkeit jedes Gegnertyps, inklusive der Erstauftritte.
- **Waffen:** alle Waffen mit allen fünf Stufen, Werten und Preisen.
- **Gegner:** Werte, Gewicht, Gold.
- **Freischalt-Tabelle** und Stern-Wirtschaft.
- Neueste Balance-Ergebnisse der Bots.

---

## 12. Story und Welt

- **Die Geschichte:** Ein liebenswert-gieriger König, ein Schweizer, liebt Fondue über alles und hat allen Käse des Landes für das größte Fondue aller Zeiten in seine Burg geschafft. Die Mäuse und Ratten des Landes wollen den Käse zurück und haben sich zu einer Ritterarmee zusammengeschlossen.
- **Die Gegner sind Mäuse und Ratten in Ritterkostümen.** Der Schwerpunkt bleibt auf den Rittern: Die elf Figuren bleiben, was sie sind, und bekommen Details, an denen man die Maus darunter erkennt (Schwanz, Ohren am Helm, Schnurrhaare, Schnauze). Kein Neuzeichnen von Grund auf, eine Überarbeitung. Yeti, Krähen und ähnliche sind Verbündete, die die Mäuse im Lauf der Geschichte herbeiholen. Passe Namen und Tipps nur an, wo es nötig ist.
- **Der Spieler ist nicht der König und nicht dessen Hand.** Der König hat ihn gerufen (beschworen), damit er hilft. Das wird am Anfang nicht erklärt; es steht im Storybuch und klärt sich später.
- **Erzählweise:** Die Story läuft im Hintergrund. Der Spieler bekommt sie nur in kurzen Sätzen angeteasert: der König in der Vorrunde, ein Satz pro Level, Einwürfe in der Lobby, die Popups neuer Gegner. Nie Textwände.
- **Storybuch:** in der Lobby eher versteckt. Es füllt sich mit dem Fortschritt und erzählt die Geschichte ausführlicher nach.
- **Bogen über 100 Level:** Es soll spannend bleiben. Die Mäuse holen neue Verbündete, es wird zwischendurch knapp, es gibt Wendungen. In Level 100 ist die Armee besiegt, und der König genießt sein Fondue. Schreibe den Bogen, alle Level-Sätze und die Storybuch-Seiten selbst, mit Humor und Herz, in gutem, einfachem Englisch. Lass die Texte von einem frischen Subagent gegenlesen.
- **Vorhalten:** Nach Level 100 wird man später von einem neuen König in einer anderen Welt gerufen (Beispiel: ein Amerikaner, der alle Burger des Landes gesammelt hat). Deshalb das Welt-Paket aus Abschnitt 4.2.
- Der Name „Fondue“ bleibt. E-001 gilt weiter.

---

## 13. Endlos-Modus

- **Von Anfang an freigeschaltet** (später vielleicht erst ab Level 5 oder 10; lege dafür einen Wert in der Konfiguration an).
- Easy, Medium und Hard bleiben hier wählbar.
- **Neu: leichter Zufall.** Nicht jeder Lauf ist gleich: Die Gegnerzahl eines Tages liegt in einer Spanne, und Gegnertypen haben eine Wahrscheinlichkeit, schon früher oder erst später aufzutauchen. Beispiel von Tim: Der Yeti erscheint nicht immer am selben Tag, sondern erstmals irgendwo zwischen Tag 13 und 17, und mit etwa 20 % Wahrscheinlichkeit kommen dann gleich zwei. Alle Spannen und Wahrscheinlichkeiten stehen in einer Tabelle. Der Zufall läuft weiter über den festen Zufallsgenerator der Simulation (gleicher Startwert, gleicher Verlauf).
- Upgrades pro Lauf wie in 10.2. Die Kurve so anlegen, dass sehr gute Spieler mit den nun fünf Stufen deutlich weiter kommen als heute; kein eingebautes Ende.
- **Sterne für gute Läufe:** eine einfache, nicht ausnutzbare Regel (zum Beispiel einmalige Sterne für erreichte Meilenstein-Tage je Schwierigkeit).
- Bestenliste und Game-Over bleiben, die Bestenliste zieht ins Profil um und muss Updates überdauern. Nicht der Schwerpunkt dieser Runde, aber sie darf nicht kaputtgehen.

---

## 14. Gezielte Änderungen am Spiel

Diese Punkte haben Tim und Lenny beim Spielen gesammelt. Jeder einzelne kommt auf die Abnahmeliste.

1. **Great Cauldron endgültig hinten.** Der Schalter „vorne/hinten“ und die Variante vorne entfallen. Der Kessel hängt heute unschön an der Burg. Neu: Er steht im Hintergrund direkt hinter bzw. neben der Burg, auf einem kleinen Hügel oder einem Vorbau oder Mini-Turm der Burg. Probiere Varianten aus, bewerte Screenshots, nimm die stimmigste. Gegner landen nur darin, wenn sie geworfen werden. Der Wurf hinein muss sauber aussehen und sich gut anfühlen: Flugbahn in die Tiefe, Eintauchen, Käse-Verwandlung, „belegt“-Zustand. Ausführlich testen, in allen Burgstufen und Landschaften, auf allen drei Geräten.
2. **Keg Hauler: schütteln statt antippen.** Heute lässt ein kurzer Tipp das Fass fallen; das war eine zu starke Taktik. Neu: Man muss ihn hochheben und einige Male hin und her schütteln (links/rechts oder hoch/runter, mehrere Richtungswechsel), dann löst sich das Fass, fällt hinunter und explodiert unten. Dasselbe gilt, wenn er am Adlerhaken hängt: Das Fass fällt herunter und explodiert unten. Balanciere die Bombe insgesamt etwas schwächer bzw. so, dass man sie nicht mehr ständig mühelos auslösen kann. Popup, Tipps und Hilfe anpassen.
3. **Goldzahlen für alle Getroffenen.** Tötet eine Explosion (oder eine andere Flächenwirkung) mehrere Gegner, erscheint für jeden getöteten Gegner seine Goldzahl. Heute sieht man nur etwa drei, obwohl man das Gold für alle bekommt.
4. **Armbrust und Mörser nur noch antippen** (siehe 10.1).
5. **Adlerhaken: Darstellung reparieren.** Krähe und vor allem Balloonist sehen am Haken falsch aus: Die Figur hängt unpassend, und beim Balloonist verschwindet der Ballon, man sieht nur noch den Mann. Prüfe alle elf Gegner am Haken, in jeder Lage, Bild für Bild, und mache es stimmig und logisch.
6. **Adlerhaken kostet 12.000 Gold** statt bisher 1.000. Man soll ihn erst deutlich später nutzen können. Vorhalten: Der Haken gibt später etwas Besonderes (zum Beispiel eine eigene Währung). Balance und Bots anpassen.
7. **Gewicht der Gegner und Hand-Stufen** (siehe 10.3).
8. **Stomper neu gestalten** (siehe 10.1).
9. **Markt mit Bildern, höhere Stufen sehen mächtiger aus** (siehe 9).
10. **Join rechts, Back links; Spielerliste im Koop-Raum** (siehe 7).
11. **Keine eigene Hand am Touchscreen, Mitspieler-Hand bleibt** (siehe 10.4).
12. **Issue #1** („Burg/Turm besser in Hinter- und Vordergrund integrieren“): Prüfe, ob es mit der Burg-Arbeit dieser Runde erledigt ist, und verweise im Pull Request mit `Fixes #1` darauf, wenn ja.

**Vorhalten, in dieser Runde nicht bauen** (in `docs/uebergabe/IDEEN.md` eintragen, im Modell Platz lassen): Schnellspiel („Quick Play“: ein kurzes Level über wenige Tage mit kleiner Belohnung, für Bus oder Pause; weder Kampagne noch Endlos; nicht zu verwechseln mit dem Entwickler-Schnellstart), Koop-Kampagne, Sterne-Bewertung und Challenges, weitere Welten, Accounts und Cloud-Speicher, Käufe, mehr Hände, Kessel-Upgrades, besondere Belohnung am Adlerhaken, drei bis vier Spieler.

---

## 15. Balance

Nach allem Umbau muss das ganze Spiel neu balanciert werden: fordernd, nie unfair, befriedigend.

- **Bots erweitern:** Die drei Stufen Poor, Mid und Great lernen alles Neue: Kampagne spielen, Waffen in Slots wählen, Sterne sinnvoll ausgeben, antippbare Waffen, Schütteln, Gewicht und Hand. Sie nutzen nur dieselben Befehle wie ein Mensch.
- **Kampagne:** Lass die Bots alle 100 Level in Reihenfolge spielen, mit dem Profil, das sie sich bis dahin erspielt haben. Richtwerte (Startpunkt, du darfst sie begründet schärfen): Ein mittlerer Spieler schafft die meisten Level beim ersten oder zweiten Versuch, Boss-Level brauchen spürbar mehr; ein schwacher Spieler kommt durch die ersten Level und stößt dann an Grenzen, die sich durch Upgrades lösen lassen; ein sehr guter Spieler wird auch spät noch gefordert. Kein Level darf unschaffbar oder belanglos sein. Die Kurve steigt über 100 Level gleichmäßig mit spürbaren Höhepunkten.
- **Stern-Wirtschaft:** Prüfe, dass Freischaltungen und Stufen in einem guten Takt kommen (regelmäßig etwas Neues, nie alles früh fertig, nie lange Durststrecken) und dass Koop und Wiederholungen kein Farmen erlauben.
- **Endlos:** Die bisherigen Ziele auf Medium bleiben der Maßstab: schwacher Bot meist nicht über Tag 8, mittlerer um Tag 24, sehr guter um Tag 40; mit fünf Stufen darf der sehr gute weiter kommen. Easy und Hard sinnvoll daneben. Koop ähnlich schwer wie solo, eher etwas schwerer, ab Tag 1 genug zu tun für zwei.
- **Ergebnisse sollen streuen:** Können, Tempo, Einkauf und Waffeneinsatz müssen spürbar entscheiden.
- Halte Ziele, Ergebnisse und alle geänderten Werte in `docs/balance.md` fest; die Ergebnisse erscheinen auch in der Entwickler-Übersicht.

---

## 16. Testen und Qualität

Tim legt großen Wert darauf, dass du alles selbst ausführlich prüfst, auch wenn das lange dauert.

- **Im echten Spiel prüfen:** Springe mit Playwright gezielt in Situationen (bestimmtes Level, bestimmter Tag, bestimmter Besitz), mache Screenshots und Bildfolgen und prüfe sie: Tutorial Schritt für Schritt, Zoom in und aus der Burg, Lobby, Kampagnen-Karte, Markt an der Burg, jede Waffe auf jeder Stufe, Kessel-Wurf, Adlerhaken mit jedem Gegner, Schütteln des Keg Haulers, Boss-Level, Sieg und Niederlage, Popups.
- **Auf allen drei Geräten** (iPhone 16, OnePlus 8T, Laptop), mit Finger und mit Maus. Screenshots ansehen, nicht nur erzeugen.
- **Unabhängige Spieletester:** frische Subagents, die den Code nicht geschrieben haben, spielen und bewerten nach jeder großen Etappe: Verständlichkeit des Tutorials, Spielgefühl, Lesbarkeit am Handy, Grafik („sieht das liebevoll gemacht aus?“), Tempo, Fehler. Die wichtigen Befunde behebst du.
- **Alle 100 Level:** jedes mindestens durch Bots gespielt, eine Stichprobe (mindestens jedes Boss-Level, jedes Level mit einem neuen Gegner oder einer Freischaltung, dazu zufällige) zusätzlich im echten Browser angesehen.
- **Koop:** zwei Browser, Kampagne und Endlos, ungleiche Bildschirme, simulierte Latenz, Wiedereinstieg, Belohnung für beide.
- **Unit-Tests** für alles Neue: Profil und Migration, Modi, Level-Erzeugung, Freischaltungen, Sterne, Waffenstufen, Gewicht und Hand, Schütteln, Endlos-Zufall (Spannen und Verteilung), Sieg-Zustand, Statistik.
- **Leistung:** flüssig auf Handy-Größe mit vielen Gegnern; Start nicht langsamer als heute.

**Umgang mit Tests bei diesem Umbau:** Tests werden nie abgeschwächt oder gelöscht, um sie grün zu bekommen. Wo dieser Auftrag eine Regel bewusst ändert oder entfernt (Zielgeste, Kessel vorne, Fass per Tipp, drei Stufen, Geräteliste), ersetzt du die betroffenen Tests durch Tests der neuen Regel und führst in `docs/PROGRESS-GROSSES-UPDATE.md` eine Liste, welcher Test warum ersetzt wurde.

**Die Prüfung auf GitHub (`test`):** Bei jedem Pull Request lässt GitHub die Tests auf eigenen, langsameren Rechnern ohne Grafikkarte laufen; nur bei Grün ist ein Merge möglich. In den letzten Runden scheiterte der Merge mehrfach daran, meist an Zeitlimits und nicht am Spiel. Deshalb:
- Die Pipeline prüft nur noch die drei Geräte.
- Tests dürfen auf GitHub mehr Zeit bekommen; warte auf Zustände statt auf feste Zeiten.
- Halte die Pflichtprüfung schlank und stabil, lange Läufe (alle 100 Level, Balance) laufen lokal und nicht in der Pflichtprüfung.
- Scheitert die Prüfung auf GitHub trotz lokal grüner Tests, gibst du nicht auf: Ursache finden, Pipeline oder Test stabil machen, erneut prüfen. Erkläre Tim im Abschlussbericht in einfachen Worten, was diese Prüfung ist und was du geändert hast.

---

## 17. Abschluss und Veröffentlichung

1. Alles lokal grün: `npx tsc --noEmit`, `npm test`, `npm run test:e2e`, Balance-Lauf, Leistungstest.
2. Dokumente aktuell: `AGENTS.md` (neue Regeln, drei Geräte, Begriffe), `docs/HANDBUCH.md` (neuer Aufbau, „Wo liegt was“, Rezepte für: neues Level, neue Waffe, neue Stufe, neuer Gegner, neue Welt, neue Freischaltung, Grafik austauschen), `docs/ARCHITEKTUR.md`, `docs/GDD.md`, `docs/ENTSCHEIDUNGEN.md` (ab E-032, jede nicht offensichtliche Entscheidung mit Begründung), `docs/balance.md`, `docs/OFFENE-ENTSCHEIDUNGEN.md`, `docs/GRAFIK-AUSTAUSCHEN.md`, `docs/uebergabe/IDEEN.md`, Abnahmeliste.
3. Pull Request gegen `main`, Prüfung `test` grün, **selbst mergen und veröffentlichen** (in dieser Runde ausdrücklich erlaubt).
4. Danach prüfen: Live-Seite lädt und zeigt das Update, erster Start führt ins Tutorial, `/classic/` ist weiter spielbar, `/dev/` zeigt die Übersicht. Android-Testapp: prüfen, ob ein neuer Bau nötig ist.
5. Worktrees aufräumen.
6. **Abschlussbericht** als `docs/ABSCHLUSS-GROSSES-UPDATE.md` und als letzte Nachricht im Chat, auf Deutsch, kurz und verständlich:
   - was gebaut wurde und was nicht,
   - die drei Links (Spiel, Classic, Entwickler-Übersicht),
   - wie man das Entwickler-Menü am Handy öffnet,
   - die neue Struktur in wenigen Sätzen, für jemanden mit leichten Programmierkenntnissen,
   - Balance-Ergebnisse für Kampagne und Endlos,
   - die Liste der Entscheidungen, die Tim und Lenny jetzt treffen sollen,
   - was nur Menschen beurteilen können und gezielt getestet werden sollte (Tutorial-Verständlichkeit, Wurfgefühl mit Gewicht, Antipp-Waffen, Kessel hinten, Markt an der Burg, echte Handys, Safari),
   - offene Punkte, ehrlich benannt,
   - wie man auf den alten Stand zurückrollt,
   - benötigte Zeit.

Wenn am Ende etwas nicht fertig ist, steht es offen im Bericht. Lieber später und gut als früh und halb.
