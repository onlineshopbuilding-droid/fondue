# Auftrag: Große Änderungsrunde für Fondue

Dieser Auftrag beschreibt eine große Überarbeitung, die Tim und Lenny gemeinsam beschlossen haben. Das Ziel: Fondue soll sich anfühlen wie ein Spiel, das mit Liebe gemacht wurde, und nicht wie etwas schnell Hingebautes.

Sei ambitioniert. Gesucht ist die gründliche, schöne Version mit allen Randfällen, nicht die kleinste, die die Anforderungen gerade erfüllt.

## 0. Projekt und Parallelbetrieb (zuerst lesen)

Projekt
- Ordner: (Hauptordner des Projekts auf Tims Laptop)
- Repo: onlineshopbuilding-droid/fondue (öffentlich)
- Live: https://onlineshopbuilding-droid.github.io/fondue/
- Regeln: AGENTS.md lesen (CLAUDE.md und GEMINI.md verweisen nur darauf).
- Aufbau, Rezepte, Fallen, Stimmigkeits-Check: docs/HANDBUCH.md lesen.

Parallelbetrieb
- Eine andere Claude-Sitzung arbeitet möglicherweise gleichzeitig im Hauptordner an Pull Request #2 (Branch setup/claude-github: Android-App, neue Regeln, Claude-Anbindung auf GitHub) und wechselt dort den Branch.
- Arbeite deshalb ausschließlich in einem eigenen Git-Worktree, niemals im Hauptordner. Im Worktree zuerst npm ci ausführen.
- Prüfe beim Start den Status von PR #2 (z. B. gh pr view 2):
  - Fall A – PR #2 ist gemergt: Lege deinen Branch auf dem aktuellen origin/main an. Die Sperrliste unten entfällt.
  - Fall B – PR #2 ist noch offen: Lege deinen Branch auf origin/setup/claude-github an (dort sind Android-App und neue Regeln enthalten, in main noch nicht). Ändere dann NICHT: AGENTS.md, .github/workflows/, playwright.config.ts, tests/e2e/mobile.spec.ts. Was du an diesen Dateien ändern müsstest, notierst du als Vorschlag in docs/PROGRESS-GROSSE-RUNDE.md. Prüfe während der Arbeit regelmäßig, ob PR #2 inzwischen gemergt ist; sobald ja, bringst du deinen Branch auf den Stand von main und die Sperrliste entfällt.
- PR #2 selbst mergst oder veränderst du nicht.
- Die End-to-End-Tests nutzen Port 5199. Prüfe vor jedem Lauf, ob der Port belegt ist (andere Sitzung testet gerade); wenn ja, warte, statt parallel zu starten. playwright.config.ts nicht ändern, um den Konflikt zu umgehen.

## 1. Rahmen und Autonomie

- Lege diesen Auftrag wortwörtlich als docs/AUFTRAG-GROSSE-RUNDE.md ab und führe eine Fortschrittsdatei docs/PROGRESS-GROSSE-RUNDE.md (Zeitstempel per Befehl, erledigte Schritte mit Beleg, nächster Schritt, offene Probleme). Lies beide nach jeder Kontext-Zusammenfassung zuerst.
- Startcheck (nur am Anfang): Prüfe, ob alles da ist, was du brauchst (Worktree, npm ci, Werkzeuge, GitHub-Login, Rechte für Pull Requests und Veröffentlichung, Status PR #2). Frag Tim in EINER gebündelten Nachricht nach allem, was du von ihm brauchst. Danach arbeitest du komplett autonom, ohne weitere Rückfragen. Nicht offensichtliche Entscheidungen hältst du kurz in den Entscheidungen des Projekts fest.
- Werkzeuge: Du darfst an jeder Stelle, an der es hilft, Subagents bzw. parallele Sub-Sessions einsetzen sowie Tims Browser und Computer nutzen. Browser-Tests laufen mit Playwright, nicht mit Tims privatem Chrome. Arbeite nur im Projekt bzw. deinem Worktree und lösche oder verändere keine anderen Dateien von Tim.
- Zeitziel: Prüfe die Uhrzeit immer per Befehl (PowerShell Get-Date), schätze sie nie. Optimal wärst du in etwa einer Stunde fertig, idealerweise bis heute (09.11.2026) um 21:30 Uhr. Maximal stehen dir etwa 3 Stunden zur Verfügung. Setz deshalb auf Effektivität und Effizienz: Arbeit sinnvoll parallelisieren (Grafik-Prüfrunden, Balance-Simulationen und Reviews per Subagent, während du weiterbaust), während der Entwicklung gezielt einzelne Tests laufen lassen und den vollständigen, rund 9-minütigen E2E-Lauf nur vor Vorschau-Deploys und vor dem finalen Pull Request.
- Priorität bleibt aber: Am wichtigsten ist, dass das Spiel am Ende gut balanciert, fehlerfrei spielbar ist und alle Funktionen dieses Auftrags enthält. Lieber etwas später fertig als unfertig oder schlecht balanciert veröffentlicht.
- Verwende den Skill „Unlazy“ nicht.

Commits (für diese Runde von Tim ausdrücklich freigegeben)
- Du darfst in dieser Runde ohne Nachfrage auf deinem eigenen Branch committen und pushen.
- Dateien einzeln mit Namen hinzufügen, kein git add -A und kein git add .
- Von Tests erzeugte Screenshots (docs/screenshots/, mobile-screenshots/) nicht mitcommitten.
- Commit-Texte auf Englisch, Dokumente auf Deutsch, Spieltexte auf Englisch.
- Kein Force-Push, nichts direkt nach main pushen.

## 2. Arbeitsweise: Spiel bleibt währenddessen spielbar

Tim und Lenny spielen und testen die aktuelle Version weiter, während du arbeitest.

- Arbeite die ganze Zeit auf deinem eigenen Branch (z. B. feature/grosse-runde). main und die Live-Seite bleiben unberührt, bis du fertig bist.
- Vorschau unter /next/ (optional): Wenn PR #2 gemergt ist und es mit geringem Aufwand geht, veröffentliche fertige und getestete Zwischenstände deines Branches zusätzlich unter https://onlineshopbuilding-droid.github.io/fondue/next/. Die stabile Version unter der normalen Adresse darf dadurch nicht verändert werden; prüfe nach jedem Vorschau-Deploy beide Adressen. Ist PR #2 noch offen (Workflows gesperrt) oder würde die Vorschau viel Zeit kosten, lässt du sie weg und schreibst es in den Abschlussbericht.
- main ist geschützt: Änderungen kommen nur per Pull Request hinein, und die Prüfung „test“ muss grün sein.
- Veröffentlichen am Ende (Tim erlaubt das in dieser Runde ausdrücklich): Sobald alles fertig ist, alle lokalen Prüfungen grün sind und PR #2 gemergt ist, stellst du einen Pull Request gegen main (mit „Fixes #NUMMER“ für passende Issues, z. B. das Issue zur Burg-Integration, falls vorhanden), wartest, bis „test“ grün ist, mergst ihn selbst und prüfst danach die Live-URL. Ist PR #2 bis zum Ende noch nicht gemergt, bereitest du alles fertig vor, mergst nichts und sagst Tim im Abschlussbericht genau, was noch zu tun ist.

## 3. Spielregeln für alle Änderungen

- Fondue ist ein eigenes Spiel: keine Namen, Figuren, Grafik, Musik, Level oder Texte aus anderen Spielen.
- Die Welt ist bisher 1280 x 720, Regeln liegen in src/sim/, Zahlen in src/config/.
- Jede Änderung muss auf Laptop und Handy funktionieren, per Maus und per Finger.
- Bestehendes prüfen und mitändern, wenn es durch Neues nicht mehr passt (HANDBUCH, Abschnitt 9): Texte, Hilfe, Tipps, Markt, Balance, Tests.
- Tests nie abschwächen oder löschen.

## 4. Die Änderungen

Baue in dieser Reihenfolge, damit nach jedem Schritt etwas Funktionierendes steht.

### 4.1 Entwickler-Menü mit Experiment-Schaltern und Schnellstart
- Ein Entwickler-Menü, erreichbar am Laptop (z. B. im Tuning-Panel auf F1 als eigener Bereich) und auf dem Handy über einen versteckten Zugang (z. B. langes Tippen aufs Logo im Hauptmenü).
- Experiment-Schalter (Feature Flags) für jede neue Mechanik, bei der alt und neu verglichen werden sollen, mindestens: Kessel-Variante (vorne / hinten an der Burg). Lege das System so an, dass neue Schalter leicht hinzukommen. Im Koop gelten die Schalter des Hosts für beide.
- Schnellstart: Spiel direkt ab Tag 10, 20 oder 30 starten, allein und im Koop. Dazu passendes Gold, Offerings und ein sinnvoller Burgausbau, so wie ein Spieler ihn bis dahin ungefähr hätte. Ziel: spätere Runden testen, ohne bei null anzufangen. Schnellstart-Läufe zählen nicht für die Highscores.

### 4.2 Neues Tagesende
- Wenn die Tageszeit abläuft, kommen keine neuen Gegner mehr. Die Gegner auf dem Feld laufen NICHT mehr zurück.
- Der Tag endet erst, wenn alle verbliebenen Gegner tot sind oder das Tor fällt. Dann folgen wie gewohnt Ergebnis und Markt.
- Dadurch kommt mehr Gold herein – im Balancing (4.8) berücksichtigen.

### 4.3 Burg immer ganz links, möglichst großes Spielfeld
- Problem heute: Auf breiten Bildschirmen (vor allem Handys) geht links von der Burg einfach der Weg weiter.
- Ziel: Die Burg steht auf jedem Seitenverhältnis immer ganz am linken Bildrand; links von ihr ist nie Weg oder offene Landschaft zu sehen.
- Bevorzugt: Die zusätzliche Breite vergrößert das Spielfeld nach rechts. Achtung, zwei Bedingungen: Die Welt ist bisher fest 1280 x 720, und im Koop müssen beide Spieler exakt dasselbe Spielfeld haben (die Simulation läuft beim Host, Tim und Lenny können unterschiedliche Bildschirmformate haben). Eine Verbreiterung ist nur zulässig, wenn sie im Koop sauber funktioniert (z. B. gleiche Feldbreite für beide, vom Host bestimmt) und das Balancing fair bleibt (längere Laufwege dürfen das Spiel auf breiten Geräten nicht spürbar leichter machen).
- Ist das zu aufwendig oder riskant: Die Welt bleibt 1280 x 720, die Burg wird trotzdem fest am linken Bildrand verankert, und zusätzliche Breite rechts dient als Kulisse, aus der die Gegner sichtbar herankommen. Letzte Ausweichlösung: Die Burg geht nach links weiter (Burghof, Mauern).
- Entscheidung mit Begründung dokumentieren und das HANDBUCH entsprechend anpassen.

### 4.4 Burg besser integrieren und Burgausbau in Stufen
- Problem heute: Die Burg wirkt wie ein Bild, das auf den Weg und den Hintergrund gesetzt wurde. Der Übergang ist zu hart, es fehlen gemeinsame Details.
- Ziel: Die Burg steht sichtbar in der Landschaft – Fundament, das in den Boden übergeht, Gras, Erde und Steine am Mauerfuß, passender Schatten, Vordergrund-Elemente, die die Basis teilweise verdecken, Farben und Licht passend zum Hintergrund und zum Tag-Nacht-Wechsel, in allen vier Landschaften.
- Burgausbau: Die Burg wächst über das Spiel sichtbar mit. Gekoppelt an die 5 Tor-Upgrades bekommt die ganze Burg jeweils eine neue Ausbaustufe – von einer einfachen Holzburg bis zur prächtigen Festung (z. B. höhere Mauern, bessere Steine, zusätzlicher Turm, Fahnen, Verzierungen). Der Spieler soll spüren: Ich baue meine Burg größer, stärker und schöner.
- Waffen-Slots: Alle gekauften Waffen sind sichtbar an festen Plätzen der Burg verbaut (z. B. Roof Bolters als Armbrust im Turm, Gate Mortar auf der Mauer, Frost Horn und Dragon Bellows am Tor). Die Slots müssen in jeder Ausbaustufe stimmig sitzen.
- Grafik hat hohe Priorität: Mache mehrere echte Prüfrunden. Screenshots aller Ausbaustufen in allen Landschaften, bei Tag und Nacht, auf Laptop- und Handy-Formaten (Handy-Screenshots in mobile-screenshots/ ansehen). Lass jede Runde von einem frischen Subagent bewerten, der den Code nicht geschrieben hat (Stimmigkeit, Qualität, Lesbarkeit, Gesamtwirkung, „sieht das liebevoll gemacht aus?“), und verbessere, bis das Design wirklich gut aussieht. Kein schneller, schäbiger Stand.

### 4.5 Waffen nur noch an der Burg bedienen
- Die Leiste unten am Bildschirm entfällt komplett (das Antippen unten hat am Handy Probleme gemacht, auch beim Greifen von Gegnern dort).
- Alle Waffen werden direkt an ihrem Platz an der Burg bedient.
- Zielwaffen (Roof Bolters bzw. Armbrust, Gate Mortar und alle, bei denen Zielen sinnvoll ist): Man zieht von der Waffe weg wie bei einer Schleuder. Die Richtung bestimmt, wohin geschossen wird (nah am Tor bis ganz ans Ende des Feldes), die Zugstärke bestimmt Tempo bzw. Reichweite und gegebenenfalls die Stärke. Beim Loslassen wird gefeuert. Eine klare Zielhilfe zeigt während des Ziehens die Flugbahn bzw. den Einschlagpunkt. Der Mörser hat eine eigene, hohe Bogen-Flugbahn, die Armbrust eine flache, schnelle.
- Magische Fähigkeiten wie Comets (fallen von oben) werden nur angetippt.
- Jede Waffe zeigt an der Burg selbst sichtbar, ob sie bereit ist oder nachlädt (z. B. gespannte Armbrust, glühender Mörser, Ladeanzeige direkt an der Waffe).
- Wichtig: Beim Zielen darf man nicht versehentlich einen Gegner vor dem Tor packen, und umgekehrt. Klare Griffzonen, sauber getestet mit Maus und Touch.
- Help, Tipps und Tutorial-Texte an die neue Bedienung anpassen.

### 4.6 Great Cauldron (Kessel) – zwei Varianten zum Vergleichen
- Gemeinsam für beide Varianten: Der Kessel ist schön in die Szene eingebettet und hat eine leichte Daueranimation (z. B. Blubbern, Dampf). Ein hineingeworfener Gegner verwandelt sich mit einer kurzen Animation in Käse; dann gibt es die Belohnung. Die Verwandlung selbst ist die Wartezeit: Während sie läuft, ist der Kessel belegt. Danach ist er sofort wieder frei – KEIN zusätzlicher Cooldown. Dauer kurz (Richtwert 1–2 Sekunden, im Tuning-Panel einstellbar). Man sieht klar, dass er gerade belegt ist.
- Variante „vorne“: Kessel an seinem bisherigen Platz, mit den neuen Regeln.
- Variante „hinten“: Kessel im Hintergrund, an der Burg festgemacht und etwas höher als der Weg, also in der Welt hinter dem Spielfeld. Er fängt nur Gegner, die man wirft oder hochhebt und in seine Richtung bringt (gefühlt „in die Tiefe“ werfen), mit großzügiger Einrast-Hilfe, damit es nicht frustriert. Optisch stimmig mit leichter Tiefe (2,5D), spielerisch weiterhin 2D.
- Umschaltbar über den Experiment-Schalter (4.1).

### 4.7 Eagle Perch (Adlerhaken) oben rechts
- Der Haken steht nicht mehr vor der Burg, sondern ragt oben rechts von oben aus dem Bildrand ins Bild (z. B. an einer Kette oder einem Ast), sodass er sinnvoll aussieht und nicht in der Luft schwebt.
- Wirft oder zieht man einen Gegner an den Haken, bleibt er zappelnd hängen. Dann schnappt von rechts nur der Kopf des Adlers ins Bild und frisst ihn. Belohnung wie bisher.
- Immer nur ein Gegner auf einmal. Die Fress-Animation ist die Wartezeit, danach ist der Haken frei. Besetzt-Zustand klar sichtbar (der zappelnde Gegner hängt noch). Damit ist auch die bekannte Kleinigkeit „kein Hinweis auf besetzten Adlerhaken“ erledigt.
- Muss auf allen Bildschirmformaten gut erreichbar sein und darf nicht mit HUD oder Bedienelementen kollidieren. Da die Gegner von rechts kommen: Haken und Adler dürfen das Spawnen und die Sicht auf ankommende Gegner nicht stören.

### 4.8 Balancing über alles
Nach allen Änderungen muss das ganze Spiel neu balanciert werden: fordernd, nicht zu leicht, befriedigend, leicht herausfordernd.
- Teste mit drei Bot-Stufen auf Medium, jeweils viele Läufe:
  - schlechter Bot: kommt meist nicht über Tag 8 hinaus,
  - mittlerer Bot: ungefähr Tag 24,
  - sehr guter Bot: ungefähr Tag 40.
- Die Ergebnisse sollen streuen: Es muss spürbar darauf ankommen, wie gut, schnell und taktisch man spielt, wie man sein Gold und seine Offerings einsetzt und wie man mit den Waffen haushaltet. Die Bots sollen sich darin unterscheiden (Reaktionszeit, Treffsicherheit, Tempo, Einkaufs- und Waffenstrategie, Zielen mit den neuen Burgwaffen).
- Koop: ähnlich schwer wie allein, eher etwas schwerer – nicht einfach das Solospiel mit zwei Händen. Besonders die ersten Tage dürfen im Koop nicht langweilig sein: von Anfang an genug Gegner und Druck für zwei Hände. Mit zwei Bots testen.
- Berücksichtige das neue Tagesende, die Kessel-Wartezeit, die neue Waffenbedienung, den Burgausbau und die Spielfeldbreite.
- Halte Ziele, Ergebnisse und alle geänderten Werte in einer Balance-Datei im Projekt fest. Alle Werte bleiben zentral in src/config/.
- Die Endlos-Kurve so anlegen, dass sehr gute Spieler lange weiterkommen (langfristiges Ziel: fast unendlich spielbar – jetzt noch nicht umsetzen, aber nicht verbauen).

## 5. Qualität und Tests
- Prüfbefehle: npx tsc --noEmit, npm test, npm run test:e2e (Port 5199, dauert rund 9 Minuten).
- Unit-Tests für alle neuen Regeln (Tagesende, Kessel, Haken, Zielen, Burgstufen, Schnellstart, Schalter).
- Playwright-Tests mit Maus und Touch-Emulation, in mehreren Bildschirmgrößen (Laptop, breites Handy, Tablet): Zielen an der Burg, Greifen ohne Fehlgriffe, Kessel beide Varianten, Haken, Schnellstart, Koop mit zwei Browsern inklusive Schaltern des Hosts und unterschiedlichen Bildschirmformaten bei Host und Gast. Neue Tests in eigenen Dateien anlegen, solange tests/e2e/mobile.spec.ts gesperrt ist.
- Fühlt sich das Zielen und Werfen gut an? Nimm Videos auf und prüfe sie Bild für Bild.
- Unabhängiger Review durch einen frischen Subagent als „Spieletester“ nach den großen Schritten; die wichtigsten Punkte beheben.
- Ehrlichkeit: Tests nie abschwächen oder löschen, um sie grün zu bekommen. Was nicht fertig ist, steht offen im Abschlussbericht.

## 6. Nicht in dieser Runde (nur in die Ideenliste des Projekts eintragen)
- Mehr Hände freischaltbar, vor allem auf dem Handy.
- Käse-Story: Name Fondue bleibt, der König der Burg hat allen Käse des Landes gesammelt und wird deshalb angegriffen.
- Kessel-Upgrades (kürzere Verwandlung, mehrere Gegner gleichzeitig).
- Hintergrund stärker nutzen: Burg geht nach hinten weiter, Gegner in die Tiefe werfen (je nach Ergebnis der Kessel-Variante „hinten“).
- Endlosmodus, der bei sehr guter Spielweise fast unendlich geht.

## 7. Abschluss
- Veröffentlichung wie in Abschnitt 2 beschrieben (Pull Request, „test“ grün, selbst mergen, Live-URL prüfen) – nur wenn PR #2 gemergt ist.
- HANDBUCH, Entscheidungen und Ideenliste aktualisieren. AGENTS.md nur ändern, wenn PR #2 gemergt ist; CLAUDE.md und GEMINI.md verweisen weiter nur auf AGENTS.md.
- Worktree am Ende aufräumen, falls er nicht mehr gebraucht wird.
- Kurzer Abschlussbericht auf Deutsch im Projekt und als letzte Nachricht im Chat: was gebaut wurde, ob veröffentlicht wurde (Link) oder was Tim noch tun muss, wie man das Entwickler-Menü und die Schalter benutzt, Entscheidung zur Spielfeldbreite, Balance-Ergebnisse der drei Bot-Stufen solo und Koop, was Tim und Lenny jetzt gezielt testen sollen (vor allem Zielen, Wurfgefühl, Kessel vorne gegen hinten), offene Punkte, benötigte Zeit.
