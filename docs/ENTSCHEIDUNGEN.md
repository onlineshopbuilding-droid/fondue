# Entscheidungen

## E-001 – Eigenständiges Spiel statt Nachbildung (Vorrang vor dem Auftrag)
Der Auftrag verlangt ein möglichst originalgetreues Remake von Knights Onrush. Das baut Claude nicht, auch nicht umbenannt oder mit eigener Grafik.
Fondue übernimmt Mechaniken und Regeln: Greifen und Werfen, Tagesablauf, Shop, zwei Währungen, Waffen mit Abklingzeit, Eskalation.
Nicht übernommen werden Name, Figuren, Grafik, Musik, Level, Look, Bildschirmaufbau, Original-Texte und Original-Itemnamen.
Folgen für den Auftrag:
- Abschnitt 6.1: Videos nur für Mechanik und Timing (Flugzeit, Tempo, Gegnerdichte, Ablauf). Keine Farbproben, kein Referenz-Board, kein Look-Vergleich.
- Abschnitt 7 und 11: eigene Welt, eigene Gegner- und Itemnamen, eigener HUD-Aufbau und eigene Texte.
- Abschnitt 14: Screenshots werden gegen das GDD geprüft, nicht gegen Original-Standbilder.
- features.json: Punkte 7, 12, 18 und 25 sind entsprechend formuliert und mit `hinweis` markiert.

## E-002 – Energieeinstellungen nicht verändert
Claude ändert keine Systemeinstellungen, daher kein powercfg. Stattdessen hält die App-Funktion „keep awake“ den Laptop wach.
Gelesener Stand am 09.11.2026 (Balanced): Standby am Netzteil = nie, Ruhezustand am Netzteil = nie, also bereits passend. Das Verhalten beim Zuklappen ließ sich nicht auslesen. Der Deckel muss offen bleiben. Zurücksetzen entfällt.

## E-003 – Öffentliches Repo
`gh api user` liefert keinen Tarif (Token ohne `user`-Scope), GitHub Pro ist also nicht bestätigt. Darum ein öffentliches Repo; es enthält nichts Geheimes.

## E-004 – GitHub-Konto
Verwendet wird das auf dem Laptop eingeloggte Konto `onlineshopbuilding-droid`, Git-Name und -E-Mail waren dort schon gesetzt.

## E-005 – Eigene Welt
Alpenfestung links, Räuberarmee von rechts, Käsekessel und Adlerhorst als Opferstätten, Filz-Puppen-Stil. Alle Namen sind eigen. Das passt zum Arbeitstitel und unterscheidet das Spiel klar vom Vorbild.

## E-006 – Kalibrierung
Schwerkraft 3400 px/s² statt des gemessenen, höheren Werts, damit Würfe lesbar bleiben. Lauftempo am unteren Rand der Messung, damit Figuren greifbar sind. Details in docs/GDD.md.

## E-007 – Sound aus reinem WebAudio statt ZzFX
ZzFX wirft ohne AudioContext Fehler und umgeht den Limiter. Darum eigene Synthese. Das Paket wurde entfernt.

## E-008 – Kein TURN-Dienst
Recherche am 09.11.2026: Alle gefundenen kostenlosen TURN-Dienste (Open Relay/Metered, ExpressTURN, Turnix, Xirsys, Cloudflare) verlangen ein Konto, und Konten dürfen nicht angelegt werden. Stattdessen STUN plus Plan B (eigener Relay und cloudflared). Plan B wurde über einen echten Tunnel getestet.

## E-009 – Ein zuverlässiger Datenkanal
Snapshots laufen wie alle Nachrichten über einen zuverlässigen, geordneten Kanal. Das ist einfacher und reicht auf der kurzen Strecke; bei Paketverlust entstehen kleine Ruckler. Ein zweiter unzuverlässiger Kanal wäre die nächste Stufe.

## E-010 – Koop-Faktor 1,9
Startwert 1,6 aus dem Auftrag, nach Balance-Simulation erhöht. Siehe docs/balance.md.

## E-011 – Tests mit Software-Grafik und Edge
Playwright läuft mit Software-WebGL. Die vollen Browser von Playwright startet Windows auf diesem Laptop nicht (`spawn UNKNOWN`), nur die Headless-Variante und das installierte Edge. Darum FPS-Messung mit Edge. Firefox ist daher nicht automatisch getestet.

## E-012 – Skills und Quellen
Keine zusätzlichen Claude-Code-Skills oder fremden Repos verwendet; die Pakete stammen alle aus npm. Keine fremden Assets.

## E-013 – Werte nach dem dritten Test
Wurfgeschwindigkeit auf 1700 px/s begrenzt, damit Würfe im Bild bleiben. Messfenster 110 ms mit flacherer Gewichtung, damit abbremsende Bewegungen nicht verschluckt werden. Rad-Treffer begrenzt, Stomper und Dachgeschütz verstärkt. Gegnerische Bomben treffen nur noch das Tor, zurückgeworfene auch Räuber.

## E-014 – „Gegner werfen andere um“ bleibt aus
Der dritte Tester hat es vorgeschlagen. Der Auftrag sieht als Standard das Verhalten des Originals vor (eher nein), und die Videos geben nichts anderes her. Der Schalter steht im Tuning-Panel; die Arcade-Voreinstellung hat ihn an.

## E-015 – Unzuverlässiger Koop-Test mit Latenz aufgeklärt
In der Abschlussrunde schlug der Koop-Test mit simulierter Latenz fehl, wie schon einmal in der Nacht. Zwei getrennte Ursachen, beide nicht im Netzcode des Spiels:
1. Der Latenz-Simulator `withLatency` setzte pro Nachricht einen eigenen Timer. Browser schneiden Verzögerungen auf ganze Millisekunden ab, so konnte eine spätere Nachricht eine frühere überholen. Kam die erste Meta-Nachricht vor `start` an, blieb der Gast ohne Meta. Echte Kanäle (WebRTC zuverlässig, WebSocket) liefern geordnet, das Spiel selbst war also nicht betroffen. Der Simulator hat jetzt eine Warteschlange; `tests/unit/transport.test.ts` belegt den Fehler und die Behebung.
2. Der Test griff den Gegner ganz rechts, auch wenn ein Nachbar näher am Griffpunkt stand. Das Spiel nimmt dann richtigerweise den Nachbarn. Der Test wählt jetzt einen freistehenden Gegner. Die Prüfung `toEqual([1])` ist unverändert. Beleg über eine Messung mit 120 Griffen; die Zuordnung zum einzelnen Fehlschlag ist wahrscheinlich, nicht bewiesen. Danach 10 von 10 Wiederholungen grün.

## E-016 – Gate Mortar feuert eine echte Granate
Bisher explodierte der Mörser sofort beim Loslassen. Jetzt fliegt eine Granate vom Burgdach in 0,6 s (`WEAPONS.horn.mortar.flightSeconds`) im Bogen zum Ziel, der Schaden fällt erst beim Einschlag. Eine reine Grafik über der sofortigen Explosion hätte nicht zusammengepasst. Bei 0,6 s bleiben normale Räuber im Explosionsradius, schnelle Goat Riders muss man vorhalten; ein neuer Lade-Tipp und die Shop-Beschreibung sagen das. Der bestehende Test wartet nun auf den Einschlag statt auf den sofortigen Tod, die Prüfung selbst ist gleich. Erste Änderung nach dem Stimmigkeits-Check aus `docs/HANDBUCH.md`.

## E-017 – Anpassung an Handys und alle Bildschirmformate
Das Spiel ist für das Querformat gebaut, hochkant erscheint ein Hinweis zum Drehen. Die Welt bleibt 1280 × 720; nur die Kamera zeigt auf breiteren Bildschirmen links mehr Landschaft und auf Tablets oben mehr Himmel. Der Ausschnitt wächst nach links und oben, weil rechts die Gegner starten und das Spiel sonst ihr Auftauchen zeigen würde. Grenzen: Seitenverhältnis 4:3 bis 2,8:1, darüber hinaus bleiben Balken. Das HUD wächst auf kleinen Bildschirmen auf mindestens 44 Pixel Bedienfläche. Hover-Tooltips und Tastenziffern entfallen auf Touch-Geräten, vor der ersten Berührung wird keine Hand gezeigt, und die Zielhilfe liegt nun über der Hand. Spieltexte sprechen von „tap“ statt „click“. Die Einblend-Animation der Menüs läuft nur noch beim Wechsel des Bildschirms, damit der Markt beim Kaufen nicht flackert. Handy-Tests sind fester Teil von `npm run test:e2e`.

## E-018 – Gemeinsame Regeln für alle KIs, Veröffentlichen nur auf Zuruf
Tim und Lenny wollen mit Claude, ChatGPT und Gemini am selben Projekt arbeiten. Die Regeln stehen deshalb in `AGENTS.md`; `CLAUDE.md` und `GEMINI.md` verweisen nur darauf. Das ersetzt die frühere Regel, dass fertige Änderungen in der Alpha ohne Rückfrage live gehen: Gepusht wird nur, wenn Tim oder Lenny es sagt. Bewusst ohne Pull Requests und Schutz von `main`, weil es noch nichts zu verlieren gibt. Grüne Tests bleiben Bedingung.

## E-019 – Android-Testapp als Hülle um die Live-Seite
Die Testapp nutzt Capacitor und lädt die veröffentlichte Seite (`server.url` in `capacitor.config.ts`). Jede Veröffentlichung erreicht sie dadurch ohne neuen App-Bau. Für den Store ist das nicht geeignet, dort muss das Spiel fest in die App. Der Android-Projektordner wird nicht versioniert, sondern von `npm run android:prepare` erzeugt und von `scripts/android-setup.mjs` angepasst (nur Querformat, Vollbild). Gebaut wird in `.github/workflows/android.yml` auf GitHub, weil es auf Tims Laptop weder Java noch Android-SDK gibt. Die APK liegt im Release `android-latest`. Die Build-ID ist neutral gehalten, weil der Spielname nur in `src/config/game.ts` stehen soll.

## E-020 – Arbeit über Issues und Pull Requests, main geschützt
Tim und Lenny wollen gemeinsam über GitHub-Issues arbeiten und Claude dort mit `@claude` ansprechen. Das ersetzt die direkte Arbeit auf `main` aus E-018. `main` nimmt Änderungen nur noch per Pull Request an, und die Prüfung `test` muss grün sein. Das gilt auch für Admins. Claude darf auf GitHub Pull Requests stellen, aber nie mergen. Die Regeln stehen weiter nur in `AGENTS.md`, `CLAUDE.md` verweist dorthin. Authentifiziert wird über das Abo von Tim statt über einen kostenpflichtigen API-Schlüssel.

## E-021 – Spielfeld wird breiter, die Burg steht immer links
Auftrag 4.3. Die Burg steht auf jedem Bildschirm am linken Rand (`offsetX` ist immer 0), links von ihr gibt es keine Welt mehr. Die zusätzliche Breite vergrößert das Spielfeld nach rechts, von 1280 bis 1760 Welteinheiten (`FIELD` in `src/config/world.ts`).

Beide Bedingungen aus dem Auftrag sind so gelöst:
- **Koop:** Der Bildschirm des Hosts bestimmt beim Spielstart die Feldbreite (`meta.fieldW`), beide haben exakt dasselbe Feld. Ist der Gast schmaler, sieht er das ganze Feld und oben mehr Himmel. Ist er breiter, wird oben etwas Himmel abgeschnitten, höchstens bis zu einer Sichthöhe von 600 Einheiten. Reicht das nicht, zeigt der Rest rechts Kulisse. Solo folgt das Feld dem Bildschirm auch beim Drehen des Handys.
- **Fairness:** Gegner laufen auf breiterem Feld schneller (`fieldSpeedFactor`), sie holen aber nur die Hälfte der zusätzlichen Strecke auf (`FIELD.speedCompensation`). Bei voller Angleichung wäre die Laufzeit überall gleich gewesen, die Bots verloren dann aber auf breitem Feld ein Drittel ihrer Tage, weil schnelle Gegner schwerer zu treffen sind. Die Messung steht in `docs/balance.md`. Damit Gegner nie sichtbar auftauchen, starten sie etwas außerhalb des Felds und laufen zügig herein.

Verworfen: reine Kulisse rechts bei fester Welt. Ein Viertel eines Handybildschirms wäre totes Gebiet gewesen, in dem man nichts greifen kann, mit einer unsichtbaren Wand mitten im Bild.

## E-022 – Zielen: Das Band spannt sich in Schussrichtung
Auftrag 4.5 beschreibt das Zielen „wie bei einer Schleuder“. Eine gespiegelte Schleuder geht hier nicht: Die Burg steht am linken Rand, nach links ist kein Platz zum Zurückziehen, auf dem kleinsten Handy wären es rund 50 Pixel. Deshalb zieht man von der Waffe weg in Richtung der Räuber. Das Band spannt sich zwischen Waffe und Hand, die Richtung bestimmt die Schussrichtung, die Länge bestimmt Reichweite und Tempo. Während des Ziehens zeigt eine gestrichelte Linie die Bahn und ein Ring den Einschlag. Zurück zur Waffe ziehen bricht ab. Die Regeln dazu stehen in `src/sim/aim.ts`, die Zahlen in `AIM` (`src/config/shop.ts`). Spielen Tim und Lenny das anders, lässt sich das an einer Stelle ändern.

Die Armbrust trifft jetzt, wohin man zielt, die automatische Zielsuche ist weg. Frost Horn und Dragon Bellows fliegen ebenfalls als gezielte Geschosse. Die Zifferntasten 1 bis 5 bleiben auf dem Laptop als Zusatz: Bei gezielten Waffen wird die Waffe aktiviert, der nächste Klick feuert mit derselben Rechnung.

## E-023 – Kometen und Stomper: zweimal tippen
„Comets werden nur angetippt“ lässt zwei Lesarten zu. Gewählt: Tippen auf den Schrein, dann Tippen auf die Stelle der Straße. Das ist reines Tippen, nimmt aber die Entscheidung nicht weg, wo die Waffe einschlägt. Stomper funktionieren genauso. Das frühere Schwingen des Kometen entfällt; als Ausgleich sind Radius und Schaden fest um 45 % höher (`WEAPONS.comet.bonus`).

## E-024 – Griffzonen an der Burg
Eine Berührung auf einer Waffe wird auf dem Gerät erkannt und als eigener Befehl `pressSlot` geschickt. Sie greift nie einen Gegner. Die Zonen sind Kreise um die Waffen, wachsen auf kleinen Bildschirmen auf mindestens 54 Pixel Durchmesser und enden vor der Straße (`slotZoneMaxX`), sodass ein Gegner am Tor immer greifbar bleibt. Der Gast braucht dadurch keine doppelte Regel.

## E-025 – Tagesende: Die Regel „Rückzug“ bleibt als Schalter
Nach Auftrag 4.2 kämpfen die Gegner bis zum Tod. Die alte Regel ist für den Vergleich als Experiment-Schalter `dayEnd` erhalten. Noch nicht gespawnte Gegner kommen nach Sonnenuntergang nicht mehr.

## E-026 – Experiment-Schalter und Schnellstart
Schalter stehen in `src/config/flags.ts`. Ein Eintrag genügt, dann erscheinen sie im Entwickler-Menü, das Lesen in den Regeln geht über `sim.flag('id')`. Die Werte sind Teil von `Meta`, im Koop gelten also die des Hosts. Der gewählte Schnellstart-Tag lebt nur bis zum Neuladen der Seite, damit niemand versehentlich dauerhaft mit Schnellstart spielt. Solche Läufe zählen nicht für die Bestenliste.

## E-027 – Bogenwaffen: Die Zuglänge bestimmt den Einschlag
Nach dem Spieletest. Vorher hingen Reichweite und Winkel zusammen: Weiter und steiler gezogen landete der Mörser kürzer, und ein voller Zug schoss über das Feld hinaus. Jetzt bestimmt nur die Länge des Zugs den Einschlagpunkt, von 90 Einheiten vor der Waffe bis zum Feldende. Die Richtung bestimmt, wie hoch und wie lange der Schuss fliegt. Die Vorschau zeigt genau das, was passiert.

## E-028 – Koop bezahlt weniger Gold pro Kill
Zu zweit gibt es 70 % des Goldes pro Gegner (`COOP.goldFactor`), und früh 2,3-mal so viele Gegner wie allein. Ohne diese Kürzung war der mittlere Bot im Koop deutlich zu stark, weil das gemeinsame Gold doppelt so schnell wuchs. Die Details stehen in `docs/balance.md`.

## E-029 – Zielhilfe am Haken nur für wirklich gezielte Würfe
Lange Würfe an den Haken verfehlten fast immer, weil die Schwerkraft den Gegner unter den Haken zieht. Ein Wurf, der klar in Richtung Haken geht, wird deshalb sanft hingelenkt (`WORLD.perch.assistRadius`, `headingCos`). Kurz am Haken vorbei fliegt er weiter, damit normale Würfe nicht abgefangen werden. Das Tragen an den Haken rastet weiter großzügig ein.

## E-030 – Browser-Tests standardmäßig auf drei Bildschirmen
Tim hat am 09.11.2026 entschieden: Laptop, iPhone 16 und Android reichen für die laufende Prüfung, die anderen Größen kommen später. Sie bleiben im Code und laufen mit `ALL_SCREENS=1`. Android ist im Test ein aktuelles breites Gerät mit 960 × 400.
