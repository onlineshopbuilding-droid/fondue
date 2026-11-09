# Abschlussbericht: Große Runde

## Was gebaut wurde

- **Entwickler-Menü:** Am Laptop F1, unten im Panel. Am Handy den Schriftzug im Hauptmenü lang drücken. Dort stehen die Experiment-Schalter (Kessel vorne oder hinten, Tagesende) und der Schnellstart ab Tag 10, 20 oder 30, solo und im Koop. Im Koop gelten die Einstellungen des Hosts. Schnellstart-Läufe zählen nicht für die Bestenliste.
- **Neues Tagesende:** Nach Sonnenuntergang kommen keine neuen Gegner mehr, die vorhandenen kämpfen bis zum Ende. Die alte Regel lässt sich als Schalter „Retreat“ vergleichen.
- **Burg immer ganz links, breiteres Spielfeld:** siehe Entscheidung unten.
- **Burg in fünf Ausbaustufen**, gekoppelt an die fünf Tore, von der Holzburg bis zur Festung. Dazu Fundament, Bewuchs, Schatten, Vordergrund, Wetter je Landschaft und Licht im Tag-Nacht-Wechsel. Alle Waffen sind an festen Plätzen an der Burg verbaut.
- **Waffen nur noch an der Burg, die Leiste unten ist weg:** Armbrust und Torwaffen zieht man wie eine Schleuder zum Gegner hin und lässt los. Mörser fliegen hoch, die Armbrust flach und schnell. Komet und Stomper: an der Burg antippen, dann die Stelle antippen. Das Rad rollt nach einem Tipp los. Ein Ring an der Waffe zeigt das Nachladen.
- **Great Cauldron:** Verwandlung in Käse als Wartezeit, keine Abklingzeit, umschaltbar vorne auf der Straße oder hinten an der Burg.
- **Eagle Perch:** Der Haken hängt oben rechts an einer Kette, ein Gegner auf einmal, dann schnappt der Adlerkopf von rechts herein.
- **Balancing neu**, Ergebnisse unten.

## Veröffentlicht?

PR #2 wurde während der Arbeit gemergt, der Branch ist danach auf den Stand von `main` gebracht worden. Die Runde geht per Pull Request nach `main`, sobald die Prüfung `test` grün ist. Lokal waren vor dem Pull Request grün: `npx tsc --noEmit`, 156 Unit-Tests und alle Browser-Tests. Die Vorschau unter /next/ wurde weggelassen, weil sie erst am Ende möglich gewesen wäre.

## Entscheidung Spielfeldbreite

Die zusätzliche Breite vergrößert das Spielfeld nach rechts, von 1280 bis 1760. Der Host bestimmt sie beim Start, beide haben exakt dasselbe Feld. Gäste mit anderem Format sehen oben mehr oder weniger Himmel. Damit breite Handys keinen Vorteil haben, laufen die Gegner dort schneller und holen die Hälfte der längeren Strecke auf. Begründung in `docs/ENTSCHEIDUNGEN.md`, E-021.

## Balance (Medium, 30 Läufe je Zeile, Median mit Bereich P10 bis P90)

| Bot | Solo | Koop mit zwei Bots | Ziel |
|---|---|---|---|
| Schlecht | Tag 6,5 (4–10) | Tag 7 (4–10) | meist nicht über Tag 8 |
| Mittel | Tag 22 (14–28) | Tag 25 (17–32) | etwa Tag 24 |
| Sehr gut | Tag 38 (35–40) | Tag 34,5 (28–37) | etwa Tag 40 |

Feldbreite 1560 und 1760 liegen auf Höhe von 1280. Kessel vorne und hinten sind gleichwertig. Der Koop hat vom ersten Tag an mehr Gegner und bekommt je Kill weniger Gold. Alle geänderten Werte stehen in `docs/balance.md`. Bots sind Näherungen.

## Was Tim und Lenny jetzt gezielt testen sollten

- **Zielen:** Ist das Ziehen zum Gegner hin verständlich und genau, besonders am Handy? Eine echte, nach hinten gezogene Schleuder ist wegen der Burg am Rand nicht möglich (E-022). Wenn es sich falsch anfühlt, bitte sagen.
- **Wurfgefühl** auf echten Handys.
- **Kessel vorne gegen hinten** über den Schalter: Was macht mehr Spaß?
- **Tage 1 bis 3:** Die Bots verlieren dort kaum Torleben. Ob es fordernd genug ist, können nur Menschen beurteilen.
- **Schnellstart Tag 20 und 30:** Es beginnt direkt der Kampf ohne Markt. Reicht die Ausstattung?

## Offene Punkte

- Nicht auf echten Handys getestet, nur in simuliertem Chrome. Echtes iPhone und Android fehlen, ebenso Safari.
- Die mittlere Bildrate wurde nur auf dem Laptop gemessen: rund 57 FPS mit 200 Gegnern.
- Statt Videos wurden Bildfolgen während Zielen, Werfen, Adler und Schmelzen Bild für Bild geprüft.
- Die Grafik wurde in drei unabhängigen Runden bewertet: 6, 7 und 7 von 10. Punkte der letzten Runde wurden danach noch behoben, aber nicht erneut bewertet. Offen aus der Bewertung: Die goldenen Ringe an der Burg sind recht dominant, und die Linien hinter der Straße wirken in Schnee etwas wie Kabel.
- In Bildern aus dem Software-Renderer zeigten Figuren manchmal dreieckige Löcher. Auf dem echten Laptop-GPU trat das in einer Stichprobe nicht auf.
- Die Kette des Hakens läuft hinter der Torleiste, die dafür jetzt deckend ist.
- Der Koop-Abstand zwischen den Bot-Stufen ist etwas kleiner als solo; die Obergrenze lebender Gegner begrenzt vermutlich den Druck spät im Spiel.

## Benötigte Zeit

Start 20:24 Uhr, Pull Request gegen 22:50 Uhr am 09.11.2026, also knapp zweieinhalb Stunden.
