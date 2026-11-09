# Fondue – Game Design Document

Fondue ist ein eigenständiges Spiel. Mechaniken und Regeln orientieren sich an Knights Onrush, Welt, Figuren, Namen, Texte, Grafik, Sound und Bildschirmaufbau sind eigen (siehe ENTSCHEIDUNGEN E-001).

Kennzeichnung: **[M]** am Original gemessen, **[W]** am Original wahrscheinlich, **[A]** eigene Annahme. Belege in `reference/notes/mechanik.md` (lokal, nicht im Repo).

## Welt
Eine Alpenfestung auf der linken Seite, eine Räuberarmee kommt von rechts über die Passstraße. Du bist eine riesige Hand. Die Festung hat einen großen Käsekessel und einen Adlerhorst als Opferstätten. **[A]**

## Tagesablauf
| Punkt | Wert | Quelle |
|---|---|---|
| Banner vor dem Tag | 2,6 s | [A] |
| Kampfdauer | 50 s (Auftrag), gemessen 41–103 s je Tag | [M] Spanne |
| Himmel | Tag, ab 50 % Dämmerung, ab 75 % Nacht mit Sternen | [W] |
| Tor zwischen den Tagen | voll aufgefüllt | [W] V9 |
| Shop zwischen den Tagen | ja | [M] |
| Ende des Tages | Nach Sonnenuntergang kommen keine neuen Gegner mehr. Der Tag endet, wenn alle tot sind oder das Tor fällt. | Auftrag 4.2 |
| Niederlage | Lauf endet, Punkte in die Highscore-Liste | [A], im Video nicht zu sehen |

## Wurfphysik (Kalibrierung)
Messungen am Original in Anteilen der Bildhöhe H und Bildbreite W, umgerechnet auf 1280×720.

| Größe | Original | Fondue |
|---|---|---|
| Schwerkraft | ca. 10 H/s² aus Fallzeit, 7 H/s² aus Wurfbogen [M] | 3400 px/s² (4,7 H/s²); Wert liegt bewusst darunter, damit die Bahn lesbar bleibt |
| Starker Wurf, Luftzeit | 0,75 s bis 1,4 s [M] | 2000 px/s nach oben: etwa 1,2 s; per Unit-Test auf 0,75–1,6 s geprüft |
| Starker Wurf, Höhe | 0,7 H, sehr starke Würfe verlassen das Bild [M] | maximal 1700 px/s, Scheitel etwa 425 px über dem Loslasspunkt |
| Laufgeschwindigkeit | 0,10–0,15 W/s, ±40 % [W] | 96 px/s (0,075 W/s), am unteren Rand gewählt |
| Reiter | 0,3 W/s [W] | 230 px/s (0,18 W/s) |
| Figurengröße | 0,12–0,19 H [M] | 87 px (0,12 H) |
| Aufprall-Effekte | Blut 0,5–0,6 s, Explosion 0,33 s [M] | Partikel 0,45–0,75 s, Explosion 0,33 s |

Tödlich ist ein Aufprall ab 900 px/s. Das entspricht einem Fall aus etwa 120 px Höhe, ein kurzes Hochschnippen reicht also. Ein flacher Wurf von der Straße bekommt einen kleinen Bogen, damit er sichtbar fliegt.

## Gegner
Die Verhaltensarten stammen aus dem Original oder sind vom Auftrag vorgegeben, Namen und Aussehen sind eigen.

| Typ | Ab Tag | Verhalten | Quelle |
|---|---|---|---|
| Pothelm | 1 | läuft, schlägt aufs Tor | [M] |
| Keg Hauler | 2 | wirft Bomben aus der Distanz; kurzer Klick lässt das Fass fallen; geworfen explodiert er | [M] |
| Goat Rider | 3 | sehr schnell, samt Reittier greifbar | [M] |
| Pogo Bandit | 4 | springt in Bögen, in der Luft greifbar | [M] |
| Hexer | 5 | Schutzblase verhindert Greifen | [M] |
| Slinger | 6 | schießt aus der Distanz | [A] |
| Siege Cart | 7 | nicht greifbar, durch mehrfaches Klicken zerstörbar | [M] |
| Balloonist | 8 | schwebt, wirft Bomben | [W] |
| Shade | 10 | zeitweise unsichtbar und dann nicht greifbar | [A] |
| Crowcaller | 12 | kommt nach dem ersten Tod als Krähe zurück | [A] |
| Yeti | 14 | eine Hand zieht nur, zwei Hände können ihn werfen | [A] |

## Wirtschaft
- Gold pro Gegner 10–120, gemessen am Original etwa 15 pro Kill **[M]**.
- Opfergabe (Offering, goldener Käse): +1 pro Opfer in Kessel oder am Haken **[M]**. Der Kessel braucht für die Verwandlung in Käse 1,4 s (`cauldronSeconds`, im Tuning-Panel) und ist währenddessen belegt, kein zusätzlicher Cooldown. Der Haken nimmt einen Gegner auf einmal, die Fress-Animation ist die Wartezeit.
- 22 Upgrades: 5 Tore, 2 Opferstätten, 9 Turmwaffen, 3 Torwaffen, 3 Dachgeschütze **[M]** bei der Struktur, Namen und Preise **[A]**.
- Tagesgold laut Bots: etwa 340 an Tag 1, 800 an Tag 3, 1700 an Tag 7.

## Waffen
| Waffe | Bedienung | Quelle |
|---|---|---|
Alle Waffen sind an festen Plätzen der Burg verbaut und werden dort bedient (`WORLD.slots`). Ein Ring um die Waffe zeigt das Nachladen.

| Waffe | Bedienung | Quelle |
|---|---|---|
| Wheels | an der Mauer antippen, rollt sofort über die Straße | Auftrag 4.5 |
| Stompers | an der Mauer antippen, dann die Stelle antippen | Auftrag 4.5 |
| Comets | Schrein antippen, dann die Stelle antippen; fällt von oben | Auftrag 4.5 |
| Gate Arms (Mortar, Frost Horn, Dragon Bellows) | von der Waffe wegziehen und loslassen; Mörser mit hohem Bogen, Flugzeit je nach Weite | Auftrag 4.5 |
| Roof Bolters | von der Armbrust wegziehen und loslassen; flache, schnelle Salve. Längerer Zug: weiter, schneller, stärker | Auftrag 4.5 |

Abklingzeiten sind in den Videos nicht zu erkennen und daher **[A]**.

## Koop
Host-autoritativ mit 30 Snapshots pro Sekunde, Interpolation 100 ms, Vorhersage von Griff und Wurf beim Gast. Gemeinsame Kasse, gemeinsames Tor, Shop mit Ready. Gegneranzahl ×1,9 (Startwert im Auftrag 1,6, nach Balance-Simulation erhöht).

## Eskalation
Tag 1: 34 Gegner, je Tag +12, ab Tag 12 +12. Tag 7: 106. Torschaden +20 %, Tempo +3 %, Waffen-Trefferpunkte +12 % pro Tag.
