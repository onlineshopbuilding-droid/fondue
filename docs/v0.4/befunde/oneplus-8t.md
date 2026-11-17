# Befunde OnePlus 8T quer (915 x 412, Touch, Skalierung 2,625) - Durchgang C1

Adresse: `https://onlineshopbuilding-droid.github.io/fondue/next/` (Build bd7e2a7, Auslieferung 44156332840 erfolgreich). Playwright/Chromium, nur Tippen und Wischen, keine Test-Hooks. Screenshots liegen in `docs/v0.4/befunde/oneplus-8t/`.

## Ablauf (ehrlich)
Zeitlich knapp (Wischen im Software-Rendering sehr langsam), daher nur ein kurzer Durchgang.
- **Echt gespielt:** frisches Profil, Start direkt in die Vorrunde (Tutorial: Räuber werfen, Rollenden Rad antippen), Level 1 gespielt und gewonnen (blindes Werfen/Tippen im Raster), Ergebnis-Bildschirm, Keep Shop (Rad auf Tier 2 gekauft), Lobby, Antippen des gesperrten Endlos- und Koop-Tischs, Kampagnen-Karte, Options mit allen fünf Tabs (nur Settings und Help gelesen, Scores/Credits/Versions-Screenshots gemacht, aber nicht angesehen), Developer menu.
- **Per Cheat:** Burg-Stufe 5 und Level 1 bis 100 gewonnen plus 10000 Gold. Danach Lobby und Karte angesehen.
- **Nicht geprüft (ungeprüft):** Level 2 bis 8 echt gespielt, Burg-Stufe 2 nach Level 6 kaufen, Stufe 3, Koop-Raum eröffnen, Endlos starten, Storybook öffnen, Pause, Niederlage, Burg-Stufe 7, später Shop, ein spätes Level starten, freigeschalteter Koop-/Endlos-Tisch antippen.
- **Tipps vom App-Start bis ins Level:** 0 Tipps außerhalb des Spielens (die Vorrunde läuft ohne Menü direkt in Level 1). Bis in den Shop 1 Tipp ("To the Keep Shop").

## Befunde
| Nr. | Bildschirm | Was passiert ist / was stört | Wichtigkeit | Screenshot |
|---|---|---|---|---|
| O-01 | Keep Shop, nach Kauf | Der Hinweis "Rolling Wheel: tier 2!" liegt über dem Satz des Königs und verdeckt dessen letzte Zeile (Fenster verdeckt Fenster, wie D-20). | stört | 011-shop2.png |
| O-02 | Lobby, Endlos-Tisch gesperrt | Erstes Antippen von "Endless" brachte einen Zufallsspruch des Königs ("Stir clockwise ...") statt der Freischalt-Auskunft; erst ein zweites Antippen weiter unten am Tisch sagte "Win level 10 ...". Co-op sagt es gleich. Uneinheitlich. | stört | 013-endless-locked.png |
| O-03 | Vorrunde (Tutorial) | Ich spielte bewusst langsam: das Tor fiel auf 1/800, bevor die Vorrunde endete (Räuber am Tor). Für einen neuen Spieler streng; nur eine Beobachtung eines langsamen Wischers. | Kleinigkeit | 005-tut5.png |
| O-04 | Start von Level 1 | Direkt nach der Vorrunde stehen drei Banner gleichzeitig mitten im Bild (Titel plus zwei violette Hinweise); gleiche Dinge wirken gestapelt, das Feld ist verdeckt, während der erste Räuber kommt. | Kleinigkeit | 008-tut8.png |
| O-05 | Level-Ergebnis | Die vier Aufgaben sind alle unmarkiert, obwohl Rad mehrfach benutzt und viele Räuber geworfen wurden (blindes Spielen, kann echt nicht erfüllt sein; nicht sicher ob Fehler). Ungeprüft, bitte mit echtem Spiel gegenprüfen. Die Hauptaktion "To the Keep Shop" ist klar. | Kleinigkeit | 009-l1a.png |
| O-06 | Zurück-Knopf uneinheitlich | Shop, Karte: "Back" oben links. Options: "Back" unten links (und "Developer menu" gegenüber). Ergebnis: "To the Keep Shop" unten rechts. Zurück sitzt nicht immer an derselben Stelle. | stört | 010-after-result.png, 017-options.png |
| O-07 | Lobby, Beschriftungen | "Campaign", "Shop", "Co-op" stehen am unteren Rand dicht an der Bildkante (Unterkante der Buchstaben bei y ~ 408 von 412); wirken abgeschnitten/knapp. Tippfläche des Rads/Handschuhs "Shop" ist klein. | Kleinigkeit | 012-lobby1.png, 027-late-lobby.png |
| O-08 | Lobby, Orientierung | Ohne Erklärung erkennbar: Kampagne = Tisch mit Karte (Beschriftung "Campaign"), Shop = Wappenschild/Hand ("Shop"), Options = Zahnrad oben rechts. Gut. Aber der Shop-Zugang ist ein kleines Bild, die Hauptaktion (Kampagne) hebt sich vom Rest nicht hervor. | Kleinigkeit | 012-lobby1.png |
| O-09 | Options | Fenster füllt fast den ganzen Bildschirm; das Developer menu legt sich als Seitenfenster halb über das Options-Fenster (Fenster verdeckt Fenster, nur Entwicklerwerkzeug). Options-Tabs und Hilfe sonst lesbar. | Kleinigkeit | 022-devmenu.png |
| O-10 | Karte Level 100 | Das Namensband "Duchess Crumbtail" überdeckt die Käse-Anzeige ("0") unter dem Level-100-Knoten. | Kleinigkeit | 028-late-map.png |
| O-11 | Developer menu, Cheat | "Win levels 1 to" mit 60 getippt ergab Level 100/100 gewonnen (Tipp hängte vermutlich an die vorhandene 10 an: 1060). Kein Spielfehler, aber die Eingabe wird beim Antippen nicht markiert. | Kleinigkeit | 028-late-map.png |
| O-12 | Später Stand (Burg 5) | Lobby "Gilded Keep, Castle tier 5" mit neuem Saal, Endlos- und Koop-Tisch heil, Karte stimmig. Keine Auffälligkeit außer O-07 und O-10. | (ok) | 027-late-lobby.png |

## Zahl der Befunde
stört stark: 0, stört: 3 (O-01, O-02, O-06), Kleinigkeit: 8 (O-03 bis O-05, O-07 bis O-11), in Ordnung: 1 (O-12).
Keine Fehlermeldungen im Seitenfehler-Sammler beobachtet (nicht ausgelesen, ungeprüft). Ruckeln im Testbrowser: Wischen/Software-Rendering sehr langsam, kein Maß fürs Handy.
