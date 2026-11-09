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
