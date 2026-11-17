# Befunde Laptop (1280 x 720), Durchspiel C1 und Bildrate C4

Prüfer: pruefer (Laptop). Stand: Build bd7e2a7 auf https://onlineshopbuilding-droid.github.io/fondue/next/ (Auslieferung 44156332840 war grün). Chromium mit den Startschaltern aus playwright.config.ts (SwiftShader, also Software-Rendering). Nur Maus, kein window.__fondue. Zeit: Der Durchgang ist wegen der Zeitgrenze **unvollständig** (siehe "Nicht geprüft").

## Kurzer Ablauf
1. Frisches Profil, Adresse geöffnet: Das Spiel startet ohne Klick sofort im Tutorial (Wave 1/1, König spricht, Hand zeigt, was zu tun ist). 0 Klicks bis ins erste Spiel, aber es ist das Tutorial.
2. Tutorial mit Ziehen geschafft (Räuber greifen, nach oben schleudern), danach ging es ohne Pause oder Hinweis in "Level 1 - Wave 2/5" über.
3. Level 1 mit einem einfachen Wurf-Bot nicht gewonnen: "Level 1 failed" (Welle 4 von 5). Knöpfe: Back links, Try again rechts.
4. Back führt auf die Kampagnen-Karte (nicht in die Lobby). Dort Back oben links -> Lobby (Halle Burg-Stufe 1, "Oak Gate").
5. Lobby: Campaign (Tisch), Shop (Schild), Options (Zahnrad), Endless und Co-op mit Schloss. Shop geöffnet: Burg-Stufe 1, nächste Stufe "Win level 6 to build this".
6. Entwickler-Menü (F1) geöffnet, Cheat für Burg-Stufe nicht gefunden (Zeit).

## Befunde
| Nr. | Bildschirm | Was stört | Wichtigkeit | Screenshot |
|---|---|---|---|---|
| L-01 | Lobby | Erster Klick auf den Text "Shop" (unten, Mitte) öffnete nichts sichtbar; erst ein Klick auf das Schild/den Schild-Ständer darüber öffnete den Shop. Ob die Fläche am Text zu klein ist oder die Antwort nur >5 s dauerte, ist unklar (Bildrate dort 10). Der Name der Aktion steht unten am Rand, die Fläche ist nicht eindeutig. | stört | lobby-tier1.png |
| L-02 | Lobby | "Options" (Zahnrad plus Text) liegt halb auf dem Banner "Oak Gate / Castle tier 1" und überschneidet dessen rechte Kante. | Kleinigkeit | lobby-tier1.png |
| L-03 | Lobby | Die Beschriftungen "Campaign" und "Shop" sind am unteren Rand abgeschnitten bzw. berühren die Bildkante (Laptop 720 hoch); "Co-op" ebenso. | Kleinigkeit | lobby-tier1.png |
| L-04 | Level-Ende | Nach einer Niederlage führt "Back" auf die Karte, nicht in die Lobby; "Back" bedeutet in der Lobby-Kette also mal Karte, mal Lobby. Der Text "Spend it in the shop" verweist auf den Shop, den man erst über Karte -> Lobby erreicht (zwei Schritte). | stört | level1-failed.png, campaign-after-fail.png |
| L-05 | Level 1 | Der Übergang Tutorial -> Level 1 zeigt keinen Hinweis ("Level 1 - Wave 2/5" erscheint einfach, Gold springt auf 19). Ein neuer Spieler merkt nicht, dass das Tutorial vorbei ist. | stört | level1-wave2.png |
| L-06 | Tutorial | Im Tutorial bleibt das Tor bei 1/800 stehen (Räuberhaufen am Tor), Fortschritt kommt nur, wenn man die Räuber am Tor greift. Die Hand zeigt aber auf die Wiese. Man sucht eine ganze Weile, was zu tun ist. | stört | tutorial.png |
| L-07 | Alle Bildschirme | Bildrate im Testbrowser nur 7 bis 12 Bilder pro Sekunde (siehe unten), weit unter dem Ziel 55. Ursache ist vermutlich das Software-Rendering (SwiftShader) und parallele Prüfungen; auf echter Grafikkarte nicht gemessen. | stört stark (bis eine Messung mit Grafikkarte das ausräumt) | siehe Tabelle |
| L-08 | Lobby -> Karte, Shop | Wartezeiten ohne sichtbare Rückmeldung: Back (Karte -> Lobby) und Back-nach-Niederlage dauerten zusammen 4,7 s bzw. 7,6 s bis der Bildschirm stand (inkl. 1,5 bis 2,5 s eigene Wartezeit), ohne Ladehinweis. | stört | campaign-after-fail.png |
| L-09 | Shop | Das Burg-Bild links wirkt gegenüber der Liste rechts klein; ein Slot-Name "Damage" liegt im Schloss-Bild am Rand ("Rolling Wheel" Slot unten links). Liste "Unlocks after winning level 14/29/44" ohne Vorschau, wie weit das ist. | Kleinigkeit | shop-tier1.png |
| L-10 | Level-Karte (Handy-Format, nur nebenbei) | Level-Karte zeigt "Damage slot opens with castle tier 1" mit allen fünf Slots als Schloss, obwohl man auf Stufe 1 steht; unklar, ob Damage jetzt offen ist. | Kleinigkeit | iphone-level-card.png |

Zahl der Befunde: stört stark 1, stört 5, Kleinigkeit 4.

Klicks vom App-Start bis in ein Level: 0 (Tutorial startet von selbst). Von der Lobby bis in ein Level auf der Karte: Campaign, Level 1, Play = 3 Klicks (auf dem Handy-Format gemessen, mit ?menu=1).

Hauptaktion je Bildschirm: Lobby unklar (drei gleichwertige Orte, "Campaign" ist unten und groß, passt). Shop und Karte: Back immer oben links, gut. Level-Ende: Back links, Try again rechts (Hauptaktion rechts, grün), passt zu den anderen Fenstern.

## D-19/D-20
- D-19 (Sieg-Fenster verdeckt Sieg-Banner): **nicht geprüft**, weil kein Level gewonnen wurde. Beim Niederlage-Fenster verdeckt das Fenster nichts Wichtiges (level1-failed.png; die Kopfleiste oben bleibt sichtbar).
- D-20 (Fenster "New enemy" am Handy): **nicht geprüft** (Laptop-Prüfer; "New enemy" erschien nicht).

## Bildrate und Übergänge
Gemessen mit requestAnimationFrame über je 5 s. Chromium mit --use-gl=angle --use-angle=swiftshader (Software-Rendering, wie in der Projektkonfiguration). **Gleichzeitig liefen mindestens zwei weitere Prüfungen (iPhone, OnePlus) auf demselben Rechner**, die Werte sind also ungünstig verzerrt.

| Format | Bildschirm | Bilder/s | Anmerkung |
|---|---|---|---|
| Laptop 1280 x 720 | Lobby Burg-Stufe 1 | 10,0 | Ziel 55: verfehlt |
| Laptop 1280 x 720 | Shop | 12,0 | |
| Laptop 1280 x 720 | laufendes Level 1 | 8,6 | |
| iPhone 16 quer 852 x 393 | Lobby Burg-Stufe 1 | 3,2 | |
| iPhone 16 quer 852 x 393 | Level-Karte mit Level-Fenster | 10,6 | |
| iPhone 16 quer 852 x 393 | laufendes Level 1 | 8,8 | |
| OnePlus 8T quer 915 x 412 | Lobby Burg-Stufe 1 | 4,0 | |
| OnePlus 8T quer 915 x 412 | laufendes Level 1 | 7,1 | |

Lobby Burg-Stufe 7: **nicht gemessen** (kein Cheat für die Burg-Stufe gefunden).

Übergänge (Klick bis Bildschirm sichtbar, grob, inklusive eigener Wartezeit von 1,5 bis 4 s und Screenshot):
- Start der Adresse bis spielbares Tutorial: etwa 4 s.
- Lobby -> Shop (Laptop): 16,6 s inkl. 4 s Wartezeit und langsamem Screenshot; der erste Klick wirkte nicht sofort (siehe L-01).
- Level-Karte (Handy) -> Play -> Level: 7,6 s inkl. 4 s Wartezeit.
- Karte -> Lobby (Laptop): 7,6 s inkl. 2,5 s Wartezeit.
- Sieg -> Lobby: **nicht geprüft**.
Wartezeiten über 1 s ohne erkennbare Rückmeldung: Karte -> Lobby und Lobby -> Shop (kein Ladehinweis).

## Nicht geprüft
Burg-Stufe 2 nach Level 6 kaufen, Satz des Königs, neuer Slot, neue Halle; Options mit allen Tabs und Versions-Links; Storybook; Sieg-Bildschirm; Burg-Stufe 5 und 7 per Cheats; spätes Level; Level 2 und 3 echt gespielt (der Wurf-Bot gewann Level 1 nicht). Grund: Zeitgrenze und sehr niedrige Bildrate im Testbrowser, wegen der das Spielen mit der Maus stark verlangsamt war.
