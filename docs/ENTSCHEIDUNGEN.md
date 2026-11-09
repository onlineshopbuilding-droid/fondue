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
