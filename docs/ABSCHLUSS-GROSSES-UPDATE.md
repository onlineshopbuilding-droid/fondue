# Abschlussbericht: Das große Update

Stand: 12.11.2026. Auftrag: `docs/AUFTRAG-GROSSES-UPDATE.md`. Abnahmeliste mit Belegen: `docs/abnahme-grosses-update.json`. Verlauf: `docs/PROGRESS-GROSSES-UPDATE.md`.

## Die drei Links

| Was | Adresse |
|---|---|
| Spiel (neu) | https://onlineshopbuilding-droid.github.io/fondue/ |
| Classic (alter Stand) | https://onlineshopbuilding-droid.github.io/fondue/classic/ |
| Entwickler-Übersicht | https://onlineshopbuilding-droid.github.io/fondue/dev/ |

Zu zweit müssen beide dieselbe Adresse öffnen. Das neue Spiel und Classic haben getrennte Spielstände.

## Stand

Das Update ist veröffentlicht: Pull Request 9 ist gemergt, die Prüfung `test` war grün. Danach live geprüft (12.11.2026, mit dem Testbrowser, `tests/live/live.spec.ts`):

- Das Spiel lädt, ein erster Start führt ins Tutorial mit dem König.
- Über die Halle startet ein Endlos-Tag, zu zweit verbindet sich das Spiel über das Internet.
- `/dev/` zeigt die Entwickler-Übersicht.
- `/classic/` ist weiter spielbar (Tag startet, Koop verbindet).
- Die Android-Testapp braucht keinen neuen Bau: Sie lädt die Live-Adresse und zeigt das Update von selbst.
- Die Worktrees dieser Runde sind aufgeräumt.

Wer das Spiel schon im Browser offen hatte, lädt die Seite einmal neu.

## Was gebaut wurde

- **Erste Minuten:** Vorrunde mit dem König, der Greifen und Werfen zeigt, danach ein geführtes Level 1 mit dem ersten Marktbesuch (Kessel).
- **Lobby in der Burg:** Der Startbildschirm ist die Halle der Burg mit antippbaren Stationen und einer Kamerafahrt nach draußen. Ein einfaches Menü gibt es weiter über `?menu=html`.
- **Kampagne:** 100 feste Level auf einer Karte, Sterne, Freischaltungen, Boss-Level auf jedem zehnten Level, Fortsetzen eines unterbrochenen Levels am Beginn des Tages.
- **Markt an der Burg:** Zwischen den Tagen fährt die Kamera an die Burg, man tippt Tor, Slots, Kessel und Haken direkt an.
- **Waffen:** 5 Slots, 16 Waffen in je 5 Stufen, alle lösen durch Antippen aus. Dazu Gewicht der Räuber und Hand-Stufen, das Fass-Schütteln und der Kessel hinter der Burg.
- **Profil:** ein Spielstand mit Migrationen und Export-Code; Classic bleibt unberührt.
- **Endlos:** mit leichtem Zufall, drei Schwierigkeiten, Bestenliste.
- **Für euch:** Entwickler-Menü mit Sprung zu Level und Tag, Reglern, Schaltern und der Bewertungsliste; Entwickler-Übersicht unter `/dev/` mit Level-Tabelle und offenen Entscheidungen; Grafik per Adresse austauschen (`?asset=`).
- **Balance:** Endlos und Kampagne mit Bots neu eingestellt (siehe unten).
- **Tests:** 401 Unit-Tests; Browser-Tests neu für genau drei Geräte (Laptop 1280 × 720, iPhone 16, OnePlus 8T); die Prüfung auf GitHub baut einmal und testet in vier Teilen.

## Was nicht oder nur teilweise fertig ist

Von 455 Abnahmepunkten sind 391 mit Beleg erfüllt, 64 sind offen. Jeder offene Punkt steht mit Grund in `docs/abnahme-grosses-update.json` (Einträge mit „Offen:“). Die wichtigsten:

- **Balance-Ziele nicht alle erreicht** (Abschnitt „Balance“ unten).
- **Boss-Level schalten nichts frei.** Die Freischaltungen liegen auf Level 9, 19, 29, 39, also ein Level vor dem Boss.
- **Nicht jede Waffenstufe sieht anders aus oder wirkt anders;** einige Stufen sind nur stärkere Zahlen (Golden Fondue, Hedgehog Gate, Bellows, Beacon).
- **Sprung im Entwickler-Menü** startet mit leerem Besitz, nicht mit einem zum Tag passenden.
- **Sieg-Bildschirm** zeigt Freischaltungen als Textliste; das Sieg-Fenster verdeckt das Sieg-Banner zur Hälfte (D-19).
- **Nicht von Hand geprüft:** alle elf Räuber am Adlerhaken Bild für Bild, der Kessel in allen Burgstufen und Landschaften, der Westflügel in allen Landschaften, ein Boss-Level im echten Spiel. Getestet ist das nur stichprobenartig oder über die Simulation.
- **Keine Runden mit Testspielern und keine Prüf-Runden durch frische Agenten**, wie der Auftrag sie vorsah.
- **Architektur:** `src/render/scene.ts` (rund 820 Zeilen) und `src/ui/app.ts` (rund 700 Zeilen) sind noch groß; einige Oberflächen-Dateien lesen die Story-Texte direkt aus der Welt „fondue“ statt über die Welt-Beschreibung; in der Simulation stehen noch einzelne feste Zahlen.
- **Leistung:** 57,7 Bilder pro Sekunde mit 200 Räubern am Laptop (Ziel 60), gemessen nur in Laptop-Größe. Die Startzeit wurde nicht neu gemessen.
- **Issue 1** (Burg besser in die Landschaft einbinden) ist nicht Teil dieses Updates; dort steht, dass ihr es erst besprechen wollt.
- **In-App-Käufe** sind nur als Idee notiert (`docs/uebergabe/IDEEN.md`), das Modell hat dafür noch keinen Platz.

## Entwickler-Menü am Handy

Im Spiel **Options** öffnen und **Developer menu** antippen. Am Laptop geht auch F1. Läufe, die über das Menü gestartet oder mit veränderten Reglern gespielt werden, zählen nicht: keine Sterne, keine Bestenliste.

## Die neue Struktur in wenigen Sätzen

Das Spiel besteht aus Schichten, die nur nach unten greifen:

- `src/config/` enthält alle Zahlen und Tabellen: Räuber, Waffen, Slots, Sterne, und unter `worlds/fondue/` die Welt mit Leveln, Freischaltungen und Texten. Wer etwas am Spiel verstellen will, ändert fast immer nur hier.
- `src/sim/` ist die Simulation: Sie rechnet einen Lauf Schritt für Schritt aus, ohne Bild und ohne Zufall von außen. Deshalb können Bots und Tests sie ohne Browser spielen.
- `src/modes/` beschreibt die drei Spielarten (Tutorial, Kampagne, Endlos) als Klassen, die einen Lauf zusammenstellen und am Ende belohnen.
- `src/profile/` ist der Spielstand, `src/net/` das Spiel zu zweit (der Host rechnet, der Gast schickt Eingaben).
- `src/render/` und `src/art/` zeichnen, `src/ui/` sind Menüs und Fenster, `src/input/` die Hand.
- `src/bots/` sind die Testspieler für die Balance.

Rezepte für „neues Level“, „neue Waffe“, „neuer Gegner“ und so weiter stehen in `docs/HANDBUCH.md`, der Aufbau im Detail in `docs/ARCHITEKTUR.md`.

## Balance

Gemessen mit Bots in drei Stärken (`npm run balance`, Zahlen in `docs/balance.md` und `docs/balance-latest.md`).

**Endlos, Medium** (erreichter Tag, Median): schwacher Spieler Tag 6, mittlerer 28,5, sehr guter 48,5. Mittlerer Spieler auf Easy 34, auf Hard 23, zu zweit 41.

**Kampagne** (von 100 Leveln: im 1. Versuch / im 2. / später / nie gewonnen):

| Spieler | 1. Versuch | 2. Versuch | später | nie |
|---|---|---|---|---|
| mittel, allein | 84 | 11 | 1 | 4 |
| sehr gut, allein | 100 | 0 | 0 | 0 |
| mittel, zu zweit | 92 | 4 | 2 | 2 |
| schwach, allein | kommt bis etwa Level 12 | | | |

**Was noch nicht stimmt:**
- Der sehr gute Spieler wird spät kaum gefordert.
- Der schwache Spieler bleibt um Level 12 bis 14 stecken.
- Zu zweit ist es leichter als allein, im Endlos deutlich.
- Der mittlere Spieler kommt im Endlos etwas weiter als geplant (Ziel war etwa Tag 24).
- Boss-Level brauchen kaum mehr Versuche als normale Level.
- Die Bots kaufen fast nur fünf der 16 Waffen; ob die anderen sich lohnen, zeigt erst euer Spielen.

## Entscheidungen, die ihr jetzt treffen solltet

Die vollständige Liste mit Erklärung steht in `docs/OFFENE-ENTSCHEIDUNGEN.md`, auf der Entwickler-Übersicht und im Entwickler-Menü (dort mit Abhaken, Bewertung und Notiz). Kurz:

- D-01 Endlos bietet alle Waffen
- D-02 Aussehen des Burg-Innenraums
- D-03 Koop-Einladungslink und Tutorial
- D-04 Sterne beim Wiederholen
- D-05 Sterne für Koop-Gäste
- D-06 Unterbrochenes Level fortsetzen
- D-07 Yeti und Hand-Stufen
- D-08 Zielen von Stomper und Comet
- D-09 Sterne, Stufen und Hand für alle Welten
- D-10 Endlos erst ab einem Level
- D-11 Sterne für das erste Freischalten einer Waffe
- D-12 Länge der frühen Level
- D-13 Startgold in Level 1
- D-14 Boss-Level
- D-15 Name „Sterne“
- D-16 Koop-Faktor der Kampagne
- D-17 Neuer Stomper
- D-18 Adlerhaken spät und teuer
- D-19 Sieg-Fenster verdeckt das Sieg-Banner
- D-20 Fenster „New enemy“ am Handy
- D-21 Sollen Boss-Level etwas freischalten

## Was nur ihr beurteilen könnt

Bitte gezielt testen, am besten auf echten Handys und einmal in Safari:

- **Tutorial:** Versteht jemand ohne Erklärung, was zu tun ist?
- **Wurfgefühl mit Gewicht:** Fühlen sich schwere Räuber schwer, aber nicht zäh an? Lohnen sich die Hand-Stufen?
- **Antipp-Waffen:** Trifft man die Slots sicher mit dem Finger, ohne versehentlich einen Räuber zu greifen?
- **Kessel hinten:** Ist der Wurf über die Burg verständlich und machbar?
- **Markt an der Burg:** Findet man, was man kaufen will? Ist das Fenster am Handy gut lesbar?
- **Echte Handys:** Ränder, Kerbe, Schärfe, Flüssigkeit, Akku. Getestet wurde nur im Testbrowser in den drei Bildschirmgrößen.
- **Texte und Story:** Ton und Witz der Königs-Sätze und Level-Texte.
- **Zu zweit:** Kampagne und Endlos gemeinsam, auch mit schlechter Verbindung.

## Die Prüfung auf GitHub, einfach erklärt

Bevor etwas nach `main` darf und damit live geht, startet GitHub auf eigenen Rechnern automatisch die Prüfung `test`: Sie baut das Spiel, lässt die 401 Unit-Tests laufen und spielt die Browser-Tests auf den drei Bildschirmgrößen durch. Nur wenn alles besteht, lässt sich der Pull Request mergen.

Was ich daran geändert habe:

- Die Prüfung baut das Spiel nur noch einmal und verteilt die Browser-Tests auf vier Teile, die gleichzeitig laufen. Sie dauert so rund 16 Minuten.
- Bei einem Fehlschlag lädt die Prüfung jetzt hoch, was der Test gesehen hat. So lässt sich die Ursache nachlesen.
- Beim ersten Lauf dieses Updates fielen sechs Browser-Tests durch, obwohl sie auf dem Laptop bestanden. Ursache: Auf den langsamen GitHub-Rechnern läuft die Spieluhr langsamer als die echte Uhr, die Tests warteten aber in echter Zeit. Jetzt warten sie in Spielzeit, und Würfe im Test hängen nicht mehr von der Bildrate ab. Der Koop-Test brauchte dafür mehrere Anläufe. Dabei kam ein echter Fehler im Spiel ans Licht: Zeichnete sich der Markt genau zwischen Drücken und Loslassen eines Knopfes neu (etwa weil der Mitspieler gerade kaufte), ging der Tipp verloren. Das ist behoben und hat einen eigenen Test. Kein Test wurde abgeschwächt oder gelöscht; ersetzte Tests stehen in der Tabelle „Ersetzte Tests“ in `docs/PROGRESS-GROSSES-UPDATE.md`.

## Zurückrollen auf den alten Stand

Der alte Stand ist als Tag `v0-alpha` und als Branch `classic` gesichert und unter `/fondue/classic/` weiter spielbar. Soll `main` wieder der alte Stand werden, ohne Force-Push:

1. Neuen Branch von `main` anlegen: `git switch -c zurueck-auf-alpha origin/main`
2. Alle Dateien auf den alten Stand setzen: `git restore --source=v0-alpha --staged --worktree .`
3. Die Datei `.github/workflows/deploy.yml` vom aktuellen `main` behalten, damit Classic und die Entwickler-Übersicht weiter gebaut werden: `git restore --source=origin/main --staged --worktree .github/workflows/deploy.yml`
4. Committen, pushen, Pull Request nach `main`, bei grüner Prüfung mergen.

Einfacher geht es über eine KI-Sitzung mit dem Satz: „Bring `main` per Pull Request auf den Stand von `v0-alpha` zurück, wie im Abschlussbericht beschrieben.“ Die Spielstände des neuen Spiels bleiben dabei in den Browsern liegen und stören den alten Stand nicht.

## Benötigte Zeit

Begonnen am 11.11.2026 um 18:35 Uhr, veröffentlicht am 12.11.2026 um 10:15 Uhr, abgeschlossen gegen 11 Uhr. Dazwischen lagen zwei Pausen wegen des Nutzungslimits (20:34 bis 01:00 Uhr und 04:45 bis 05:53 Uhr). Reine Arbeitszeit: rund elf Stunden.
