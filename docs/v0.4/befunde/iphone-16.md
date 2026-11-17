# Befunde Durchspiel-Prüfung C1: iPhone 16 quer

Stand: Auslieferung des Builds `bd7e2a7` unter `https://onlineshopbuilding-droid.github.io/fondue/next/` (Lauf 44156332840, erfolgreich). Gerät: Playwright, Chromium, 852 x 393, Touch, mobil, deviceScaleFactor 2 (das iPhone 16 hat 3; wegen Software-Rendering kleiner gewählt). Gespielt nur mit Tippen und Wischen (Touch-Ereignisse), Screenshots nach den Schritten angesehen.

## Ablauf und Umfang (ehrlich)

- **Echt gespielt:** App-Start, Vorrunde (Räuber schleudern, Rollrad antippen), Übergang in Level 1, Level 1 (verloren: Tor fiel in Welle 4 von 5, weil mein Skript blind an feste Stellen wischte), Fehlerdialog, Kampagnen-Karte, Lobby, Tippen auf die gesperrten Tische Endlos und Koop, Shop, Options mit allen Tabs (Settings, Scores, Help Seite 1, Credits, Versions).
- **Per Cheat (Options, Entwickler-Menü):** +1000 Gold, Level 1 bis 10 als gewonnen. Danach Lobby (Endlos- und Koop-Tisch repariert) und Shop mit Burg-Stufe 2 im Blick.
- **Nicht geprüft (Zeitgrenze 20:50), für das iPhone-Format offen:** echtes Spielen von Level 2 bis 8, Kauf der Burg-Stufe 2 (kostet 8.000 Gold, nicht gekauft), Storybook auf der Karte, Endlos- und Koop-Tisch betreten, später Stand mit Burg-Stufe 5 und 7, spätes Level, Zählung der Tipps von der Lobby in ein Level.
- **Tipps vom App-Start bis in ein Level:** 0 Tipps bis zum Spielstart (die Vorrunde startet von selbst und geht ohne Pause in Level 1 über).

## Befunde

| Nr. | Bildschirm | Was passiert ist / was stört | Wichtigkeit | Screenshot |
|---|---|---|---|---|
| I-01 | Vorrunde | Das Tor fällt in der Vorrunde schnell: nach etwa 20 Sekunden mit langsamen Würfen 98 von 800 Leben. Die Vorrunde geht ohne Pause oder Meldung in Level 1 über, das Gold springt von 240 auf 0. Ein neuer Spieler versteht den Wechsel nicht. | stört | i01-tutorial-castle-low.png |
| I-02 | Level-Ende (verloren) | „Raiders defeated 0, Gold kept 0, Score 0“ und „Your gold stays yours“ ohne Zahl wirken leer. „Back“ führt auf die Kampagnen-Karte, nicht in die Lobby. | Kleinigkeit | i02-level1-failed.png |
| I-03 | Mehrere Bildschirme | **Zurück nicht an derselben Stelle:** Karte und Shop oben links, Options und Level-Ende unten links. Hauptknopf: Level-Ende „Try again“ unten rechts, Options „Developer menu“ unten rechts, Help „Next“ in der Mitte. | stört | i02-level1-failed.png, i07-options-settings.png, i06-shop-start.png |
| I-04 | Lobby | Die Tisch-Beschriftungen „Campaign“, „Shop“, „Co-op“ sitzen am unteren Bildrand, „Campaign“ ist unten angeschnitten. Der Options-Knopf rechts oben samt Beschriftung ist klein und liegt in der Ecke. | stört | i04-lobby-locked.png |
| I-05 | Lobby, obere Zeile | „0 · 0 · Level 1/100“ mit Punkten als Trenner; die Bedeutung der zwei Zahlen erkennt man nur an kleinen Symbolen. Daneben „v0.4 · build bd7e2a7“ als freier Text. | Kleinigkeit | i04-lobby-locked.png |
| I-06 | Lobby, gesperrte Tische | Tipp auf Endlos oder Koop: der König sagt klar „Win level 10 …“ bzw. „Win level 3 …“ (gut). Ein Tipp auf leeren Boden löst ebenfalls einen König-Spruch aus, sodass man nicht erkennt, ob man den Tisch getroffen hat. Die Sprechblase verdeckt das rechte Fenster. | Kleinigkeit | i05-endless-locked-hint.png |
| I-07 | Lobby | Ohne Erklärung erkennbar: Karte = Campaign, Schild mit Hand = Shop (Beschriftung), Zahnrad = Options. Campaign ist durch den großen Tisch in der Mitte die Hauptaktion. Positiv. | Kleinigkeit (positiv) | i04-lobby-locked.png, i10-lobby-unlocked.png |
| I-08 | Kampagnen-Karte | Der Knopf „Meadow“ links oben unter der Kopfzeile hat keinen erkennbaren Sinn. Die Kopfzeile ist dicht, das Buchsymbol (Storybook) rechts ohne Beschriftung. Das gelbe Fragezeichen mit „Burg 2“ bei Level 6 ist gut als Burg-Stufe erkennbar. | Kleinigkeit | i03-campaign-map.png |
| I-09 | Shop | Burg-Stufe 2 ist ab Level 6 baubar, kostet aber 8.000 Gold; mit 1.000 Gold steht „You need 7,000 more gold“. Verhältnis zum Gold pro Level ungeprüft (Balance ist Sache von bauer-balance). | stört (zu prüfen) | i11-shop-castle2.png |
| I-10 | Shop | Die Kaufzeile „Tier 2 240“ und die Waffenkarte sind am unteren Rand angeschnitten, man muss scrollen. „Take off“ ist als großer Knopf direkt über dem Kaufknopf (Fehltipp-Gefahr); „Worn“ und „Take off“ sagen dasselbe. „Castle 1“ (Turm) und „Castle tier 1“ (Kopf) stehen für dasselbe mit zwei Namen. | stört | i06-shop-start.png, i11-shop-castle2.png |
| I-11 | Shop | Der König-Hinweis „Now tap the glowing button: tier 2 for the wheel!“ ist klar, das Leuchten gut sichtbar, aber der Hinweis schiebt die Kaufzeile nach unten aus dem Bild. | Kleinigkeit | i11-shop-castle2.png |
| I-12 | Options, Settings | Der Bereich „Profile“ ist nur durch Scrollen lesbar; der Profil-Code-Kasten ist unten abgeschnitten. „Endless difficulty“ steht da, obwohl Endlos noch gesperrt ist. | Kleinigkeit | i07-options-settings.png |
| I-13 | Options, Help | Seite 1 von 12: „Previous“ ist auf Seite 1 aktiv und sieht aus wie „Next“. Wenig Text, viel Leerraum. | Kleinigkeit | i08-options-help.png |
| I-14 | Options, Developer menu | Ein Wisch auf dem Entwickler-Menü scrollte es nicht (nur per Skript); das Menü deckt die Options-Tabs „Credits“ und „Versions“ ab. Nur für Entwickler; eventuell lag es an der künstlichen Wisch-Eingabe (nicht geklärt). | stört (Entwickler) | i09-dev-menu.png |
| I-15 | Level, Tor | Am Tor liegen Räuber, König und Rollrad-Knopf übereinander. Der Rollrad-Knopf sitzt am linken Rand und ist klein (etwa 25 Pixel breit). | stört | i01-tutorial-castle-low.png |
| I-16 | Konsole | Beim Wechsel in Shop und Options erscheint wiederholt `GL_INVALID_OPERATION: glBlitFramebufferANGLE: Blit feedback loop` (Software-Renderer, auf echtem Gerät eventuell anders). Nichts Sichtbares. | Kleinigkeit | – |

## Zusammenfassung

- Stört stark: 0. Stört: 7 (I-01, I-03, I-04, I-09, I-10, I-14, I-15). Kleinigkeit: 9 (I-02, I-05, I-06, I-07 positiv, I-08, I-11, I-12, I-13, I-16).
- Hauptaktion der Lobby (Campaign) ist ohne Erklärung erkennbar; Zurück ist nicht einheitlich platziert (I-03).
- Die Prüfung ist unvollständig (siehe „Nicht geprüft“).
