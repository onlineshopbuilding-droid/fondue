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
