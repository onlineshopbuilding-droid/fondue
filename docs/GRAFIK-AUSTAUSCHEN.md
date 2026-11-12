# Grafik austauschen

Dieses Dokument erklärt, wie man eine Grafik im Spiel durch eine Bilddatei ersetzt. Man braucht dafür nur leichte Programmierkenntnisse. Spielregeln und Szenen bleiben dabei unberührt.

## 1. Was das Verzeichnis ist

Jede Grafik im Spiel hat einen festen Namen. Beispiele: `rig:grunt:body` ist der Rumpf des einfachen Räubers, `prop:coin` ist die Münze, `land:meadow:far` ist die hinterste Ebene der Wiese.

Alle Namen stehen in einem zentralen Verzeichnis: `ASSETS` in `src/art/registry.ts`. Zu jedem Namen gehört ein Eintrag mit:

- **Größe** in Weltpixeln (Breite × Höhe). Die Welt ist 1280 × 720 groß.
- **Ankerpunkt** in Pixeln, gemessen von der linken oberen Ecke der Grafik.
- **Schärfe** (`scale`): wie viele Bildpixel auf einen Weltpixel kommen. Figuren und Requisiten haben 2, Landschaften und Wolken 1.
- **Gruppe**: wann die Grafik geladen wird. `Start` heißt vor dem Menü. `Burgstufen` und die Landschaften `canyon`, `marsh`, `snowpine` folgen danach im Hintergrund.
- **Art**: Figurenteil, Requisite, Landschaftsebene oder Wolke.

Hinter jedem Namen steckt heute SVG-Code aus `src/art/`. Man kann einen Namen aber auf eine Bilddatei umlenken. Dann lädt das Spiel die Datei statt des SVG. Alles andere bleibt gleich: Name, Größe, Ankerpunkt, Position im Spiel.

Es gibt vier Namensmuster:

| Muster | Bedeutung | Quelle im Code |
|---|---|---|
| `rig:<figur>:<teil>` | Ein Teil einer Figur | `src/art/characters/` |
| `prop:<name>` | Requisite, Burg, Waffe, Effekt, Icon | `src/art/props/` und `src/art/castle/` |
| `land:<landschaft>:<ebene>` | Eine Ebene einer Landschaft (`far`, `mid`, `near`, `ground`) | `src/art/landscapes.ts` |
| `cloud:<nummer>` | Eine Wolke | `src/art/landscapes.ts` |

## 2. So ersetze ich eine Grafik durch ein Bild

1. **Namen suchen.** Die Liste in Abschnitt 6 zeigt alle Namen mit Größe und Ankerpunkt.
2. **Bild malen.** Die Spalte „Bilddatei in Pixeln“ nennt die passende Größe. Format: PNG oder WebP mit transparentem Hintergrund. Die Regeln stehen in Abschnitt 3.
3. **Datei ablegen.** Die Datei kommt in den Ordner `public/assets/`, zum Beispiel `public/assets/grunt-body.png`. Den Ordner legt man an, falls er fehlt.
4. **Namen eintragen.** In `src/config/assets.ts` kommt eine Zeile in die Tabelle `ASSET_OVERRIDES`:

   ```ts
   export const ASSET_OVERRIDES: Record<string, string> = {
     'rig:grunt:body': assetUrl('grunt-body.png'),
   };
   ```

   `assetUrl` baut die Adresse richtig zusammen. So wird die Datei auch auf der Live-Seite gefunden, die unter `/fondue/` liegt.
5. **Ansehen.** `npm run dev` starten und das Spiel im Browser öffnen. Die neue Grafik ist sofort zu sehen.
6. **Prüfen.** `npx tsc --noEmit`, `npm test` und `npm run test:e2e` müssen grün sein.

**Schnell ausprobieren ohne Eintrag:** An die Adresse im Browser hängt man `?asset=<name>=<adresse>`. Beispiel: `http://localhost:5173/?asset=rig:grunt:body=/assets/grunt-body.png`. Mehrere Grafiken gehen mit `&asset=...` hintereinander. Das gilt nur für diesen einen Aufruf.

**Wenn die Datei fehlt oder kaputt ist:** Das Spiel zeigt dann die eingebaute Grafik. In der Konsole des Browsers (F12) steht eine Warnung mit dem Namen des Assets. Ein Tippfehler im Namen wird dort ebenfalls gemeldet.

**Zurück zum Original:** Die Zeile aus `ASSET_OVERRIDES` löschen.

## 3. Regeln für das Bild

**Maße.** Das Bild wird immer in das Feld des Eintrags gezeichnet (Breite × Höhe aus der Liste). Ein Bild mit anderem Seitenverhältnis wird verzerrt. Am besten malt man genau in der Größe aus der Spalte „Bilddatei in Pixeln“. Größere Dateien bringen keine Schärfe, sie kosten nur Ladezeit.

**Ankerpunkt.** Der Ankerpunkt ist der Punkt der Grafik, der im Spiel an einer festen Stelle sitzt. Er bleibt beim Austausch unverändert. Das neue Bild muss also so im Feld liegen wie das alte:

- **Fußpunkt.** Burg, Tore, Kessel und Landschaften stehen mit ihrer Unterkante auf einer festen Linie. Der Boden der Zeichnung gehört an die gleiche Stelle wie im Original.
- **Drehpunkt.** Figurenteile drehen sich um ihren Ankerpunkt. Bei einem Arm ist das die Schulter, bei einem Bein die Hüfte. Liegt die Schulter im neuen Bild woanders, schwingt der Arm falsch.
- **Mitte.** Geschosse, Münzen und Effekte drehen sich um die Mitte des Feldes. Die Zeichnung gehört also in die Mitte.

Der Ankerpunkt in der Liste gilt in Weltpixeln von links oben. In der Bilddatei mit Schärfe 2 liegt er beim doppelten Wert.

**Rand.** Frei schwebende Teile (Figuren, Geschosse, Effekte) dürfen den Rand des Feldes nicht berühren. Sonst sieht man eine harte gerade Kante, sobald sich das Teil dreht. Zwei bis drei Pixel Luft reichen. Streifen wie Landschaften und die Burg dürfen an den Rand stoßen, wo es das Original auch tut.

**Blickrichtung.** Figuren schauen nach links. Sie laufen von rechts auf die Burg zu, und die Burg steht links.

**Licht.** Das Licht kommt von links oben. Helle Kanten liegen links oben, Schatten rechts unten. Schlagschatten fallen nach rechts unten.

**Hintergrund.** Der Hintergrund ist transparent. Kein weißes oder farbiges Rechteck hinter der Zeichnung.

**Stil.** Fondue hat einen eigenen Look: runde, kräftige Formen, eine dicke dunkle Kontur, flächige Farben. Neue Bilder sollen dazu passen. Nichts aus anderen Spielen übernehmen.

**Nacht und Tönung.** Das Spiel färbt manche Grafiken selbst ein, zum Beispiel bei Dämmerung oder bei Frost. Das Bild selbst zeigt deshalb das Aussehen bei Tag.

## 4. Figuren aus mehreren Teilen

Eine Figur ist kein einzelnes Bild. Sie besteht aus Teilen, die das Spiel einzeln bewegt: Rumpf, Kopf, Arme, Beine und manchmal mehr.

- **Jedes Teil ist ein eigenes Asset.** Man kann ein einzelnes Teil ersetzen oder alle. Am besten ersetzt man alle Teile einer Figur zusammen, damit der Stil passt.
- **Die Reihenfolge ist fest.** Die Teile werden in der Reihenfolge der Liste gezeichnet. Das erste liegt ganz hinten. Der hintere Arm liegt deshalb hinter dem Rumpf, der vordere davor.
- **Das Gelenk ist fest.** Die Spalte „Gelenk“ sagt, wo der Ankerpunkt des Teils relativ zu den Füßen der Figur sitzt (x nach rechts, y nach oben ist negativ). Das Spiel setzt den Ankerpunkt des Teils genau dorthin.
- **Die Bewegung ist fest.** Die Spalte „Bewegung“ sagt, wie das Teil animiert wird: `body` wippt beim Gehen, `head` wippt und kippt, `legFront` und `legBack` schwingen gegeneinander, `armFront` und `armBack` schwingen und zappeln im Griff, `spin` dreht sich ständig, `static` folgt nur der Figur.
- **Überlappung einplanen.** An den Gelenken müssen sich die Teile überdecken. Ein Arm braucht oben eine runde Schulter, die auch bei gedrehtem Arm im Rumpf steckt. Sonst entsteht eine Lücke.
- **Greiffläche bleibt gleich.** Wo man eine Figur packen kann, steht in `src/config/enemies.ts` (`radius`, `height`). Ein Bild ändert daran nichts. Die neue Figur soll deshalb ungefähr so groß sein wie die alte.
- **Neue Teile oder andere Gelenke** gehen nicht über ein Bild. Dafür ändert man die Datei der Figur in `src/art/characters/`.

## 5. Was sich nicht über ein Bild ändern lässt

- Größe, Ankerpunkt und Position im Spiel. Dafür ändert man den Eintrag im Code unter `src/art/`.
- Der Himmel, die Sonne, der Mond und die Sterne. Sie werden direkt gezeichnet (`src/render/background.ts`).
- Die Effekte `fx:shadow`, `fx:burst` und `fx:ring`. Sie entstehen in `src/render/textures.ts`.
- Menüs und Schrift. Sie stehen in `src/ui/`.

## 6. Liste aller Assets

Diese Liste erzeugt ein Skript aus dem Verzeichnis. Nach jeder Änderung an Grafiken ruft man es auf:

```
node scripts/list-assets.ts
```

`npx vite-node scripts/list-assets.ts` geht ebenfalls. Der Test `tests/unit/assets.test.ts` schlägt fehl, wenn die Liste veraltet ist.

Die Größe und der Ankerpunkt gelten in Weltpixeln. „Bilddatei in Pixeln“ ist die Größe, in der man eine Ersatzdatei anlegt.

<!-- ASSETS:START (erzeugt von scripts/list-assets.ts, nicht von Hand ändern) -->
Stand: 329 Assets.

### Figurenteile (86)

| Name | Größe in Weltpixeln | Ankerpunkt (x, y) | Bilddatei in Pixeln | Gelenk (x, y) | Bewegung | Gruppe |
|---|---|---|---|---|---|---|
| `rig:grunt:tail` | 42 × 32 | 6, 20 | 84 × 64 | 13, -22 | legBack | Start |
| `rig:grunt:armBack` | 26 × 42 | 13, 11 | 52 × 84 | 10, -41 | armBack | Start |
| `rig:grunt:legBack` | 36 × 35 | 21, 12 | 72 × 70 | 7, -20 | legBack | Start |
| `rig:grunt:legFront` | 36 × 35 | 21, 12 | 72 × 70 | -6, -20 | legFront | Start |
| `rig:grunt:body` | 50 × 50 | 25, 35 | 100 × 100 | 0, -20 | body | Start |
| `rig:grunt:head` | 72 × 58 | 32, 43 | 144 × 116 | 0, -45 | head | Start |
| `rig:grunt:armFront` | 56 × 76 | 42, 38 | 112 × 152 | -7, -41 | armFront | Start |
| `rig:bomber:armBack` | 28 × 42 | 14, 11 | 56 × 84 | 12, -44 | armBack | Start |
| `rig:bomber:keg` | 56 × 84 | 28, 54 | 112 × 168 | 23, -37 | static | Start |
| `rig:bomber:tail` | 48 × 29 | 6, 14 | 96 × 58 | 12, -19 | legBack | Start |
| `rig:bomber:legBack` | 41 × 36 | 24, 13 | 82 × 72 | 8, -20 | legBack | Start |
| `rig:bomber:legFront` | 41 × 36 | 24, 13 | 82 × 72 | -7, -20 | legFront | Start |
| `rig:bomber:body` | 52 × 48 | 26, 35 | 104 × 96 | 0, -22 | body | Start |
| `rig:bomber:head` | 60 × 60 | 36, 42 | 120 × 120 | 0, -47 | head | Start |
| `rig:bomber:armFront` | 54 × 50 | 40, 36 | 108 × 100 | -11, -43 | armFront | Start |
| `rig:goatRider:goatLegFarFront` | 28 × 45 | 14, 12 | 56 × 90 | -19, -32 | legBack | Start |
| `rig:goatRider:goatLegFarRear` | 28 × 45 | 14, 12 | 56 × 90 | 40, -32 | legFront | Start |
| `rig:goatRider:goatLegNearFront` | 28 × 45 | 14, 12 | 56 × 90 | -28, -32 | legFront | Start |
| `rig:goatRider:goatLegNearRear` | 28 × 45 | 14, 12 | 56 × 90 | 31, -32 | legBack | Start |
| `rig:goatRider:goatBody` | 116 × 66 | 52, 34 | 232 × 132 | 4, -44 | static | Start |
| `rig:goatRider:goatHead` | 76 × 84 | 40, 44 | 152 × 168 | -38, -54 | static | Start |
| `rig:goatRider:riderTail` | 34 × 29 | 6, 18 | 68 × 58 | 18, -55 | legBack | Start |
| `rig:goatRider:riderArmBack` | 20 × 34 | 10, 9 | 40 × 68 | 13, -67 | armBack | Start |
| `rig:goatRider:riderBody` | 35 × 52 | 19, 20 | 70 × 104 | 10, -58 | body | Start |
| `rig:goatRider:riderHead` | 50 × 45 | 28, 31 | 100 × 90 | 10, -70 | head | Start |
| `rig:goatRider:riderArmFront` | 54 × 30 | 41, 13 | 108 × 60 | 5, -67 | armFront | Start |
| `rig:pogo:tail` | 44 × 25 | 6, 6 | 88 × 50 | 16, -42 | legBack | Start |
| `rig:pogo:armBack` | 41 × 26 | 31, 10 | 82 × 52 | 11, -56 | armBack | Start |
| `rig:pogo:legBack` | 38 × 29 | 28, 12 | 76 × 58 | 11, -44 | legBack | Start |
| `rig:pogo:stick` | 45 × 67 | 24, 34 | 90 × 134 | -5, -30 | static | Start |
| `rig:pogo:legFront` | 38 × 29 | 28, 12 | 76 × 58 | 3, -44 | legFront | Start |
| `rig:pogo:body` | 36 × 36 | 18, 24 | 72 × 72 | 7, -44 | body | Start |
| `rig:pogo:head` | 67 × 51 | 32, 34 | 134 × 102 | 7, -62 | head | Start |
| `rig:pogo:armFront` | 38 × 26 | 28, 10 | 76 × 52 | 4, -56 | armFront | Start |
| `rig:hexer:tail` | 42 × 29 | 6, 19 | 84 × 58 | 17, -11 | legBack | Start |
| `rig:hexer:armBack` | 31 × 46 | 14, 11 | 62 × 92 | 8, -47 | armBack | Start |
| `rig:hexer:legBack` | 35 × 25 | 22, 10 | 70 × 50 | 8, -12 | legBack | Start |
| `rig:hexer:legFront` | 35 × 25 | 22, 10 | 70 × 50 | -8, -12 | legFront | Start |
| `rig:hexer:body` | 58 × 63 | 29, 32 | 116 × 126 | 0, -30 | body | Start |
| `rig:hexer:head` | 60 × 56 | 31, 37 | 120 × 112 | 0, -53 | head | Start |
| `rig:hexer:armFront` | 66 × 114 | 50, 58 | 132 × 228 | -8, -47 | armFront | Start |
| `rig:slinger:tail` | 41 × 30 | 6, 15 | 82 × 60 | 6, -31 | legBack | Start |
| `rig:slinger:armBack` | 34 × 31 | 10, 15 | 68 × 62 | 4, -46 | armBack | Start |
| `rig:slinger:legBack` | 29 × 45 | 17, 10 | 58 × 90 | 5, -32 | legBack | Start |
| `rig:slinger:legFront` | 29 × 45 | 17, 10 | 58 × 90 | -4, -32 | legFront | Start |
| `rig:slinger:body` | 33 × 37 | 14, 25 | 66 × 74 | 0, -32 | body | Start |
| `rig:slinger:head` | 51 × 51 | 32, 33 | 102 × 102 | 0, -50 | head | Start |
| `rig:slinger:armFront` | 56 × 51 | 46, 34 | 112 × 102 | -3, -44 | armFront | Start |
| `rig:siegeCart:wagon` | 136 × 42 | 68, 18 | 272 × 84 | 0, -40 | static | Start |
| `rig:siegeCart:wheelBack` | 44 × 44 | 22, 22 | 88 × 88 | 40, -19 | spin | Start |
| `rig:siegeCart:wheelFront` | 44 × 44 | 22, 22 | 88 × 88 | -40, -19 | spin | Start |
| `rig:siegeCart:crossbow` | 124 × 60 | 80, 40 | 248 × 120 | 10, -62 | static | Start |
| `rig:siegeCart:operatorTail` | 30 × 24 | 5, 15 | 60 × 48 | 56, -55 | legBack | Start |
| `rig:siegeCart:operatorBody` | 30 × 28 | 14, 18 | 60 × 56 | 50, -58 | body | Start |
| `rig:siegeCart:operatorHead` | 42 × 38 | 24, 26 | 84 × 76 | 50, -69 | head | Start |
| `rig:siegeCart:operatorArm` | 31 × 27 | 21, 12 | 62 × 54 | 46, -65 | armFront | Start |
| `rig:balloonist:balloon` | 80 × 114 | 40, 70 | 160 × 228 | 0, -56 | static | Start |
| `rig:balloonist:armBack` | 30 × 34 | 12, 10 | 60 × 68 | 7, -26 | armBack | Start |
| `rig:balloonist:tail` | 35 × 33 | 6, 27 | 70 × 66 | 15, -19 | armFront | Start |
| `rig:balloonist:body` | 50 × 37 | 17, 21 | 100 × 74 | 0, -16 | body | Start |
| `rig:balloonist:head` | 47 × 44 | 28, 30 | 94 × 88 | 0, -30 | head | Start |
| `rig:balloonist:basket` | 64 × 31 | 28, 18 | 128 × 62 | 0, -9 | static | Start |
| `rig:balloonist:armFront` | 32 × 32 | 22, 10 | 64 × 64 | -7, -27 | armFront | Start |
| `rig:shade:tail` | 49 × 28 | 6, 10 | 98 × 56 | 6, -29 | legBack | Start |
| `rig:shade:armBack` | 34 × 38 | 12, 10 | 68 × 76 | 5, -44 | armBack | Start |
| `rig:shade:legBack` | 34 × 43 | 21, 10 | 68 × 86 | 4, -30 | legBack | Start |
| `rig:shade:legFront` | 34 × 43 | 21, 10 | 68 × 86 | -4, -30 | legFront | Start |
| `rig:shade:body` | 65 × 53 | 15, 34 | 130 × 106 | 0, -30 | body | Start |
| `rig:shade:head` | 49 × 49 | 31, 35 | 98 × 98 | 0, -48 | head | Start |
| `rig:shade:armFront` | 54 × 48 | 44, 26 | 108 × 96 | -5, -44 | armFront | Start |
| `rig:crowcaller:tail` | 47 × 28 | 6, 10 | 94 × 56 | 9, -29 | legBack | Start |
| `rig:crowcaller:armBack` | 37 × 52 | 11, 10 | 74 × 104 | 8, -50 | armBack | Start |
| `rig:crowcaller:legBack` | 31 × 46 | 18, 8 | 62 × 92 | 4, -34 | legBack | Start |
| `rig:crowcaller:legFront` | 31 × 46 | 18, 8 | 62 × 92 | -4, -34 | legFront | Start |
| `rig:crowcaller:body` | 52 × 46 | 26, 30 | 104 × 92 | 0, -34 | body | Start |
| `rig:crowcaller:head` | 63 × 47 | 35, 34 | 126 × 94 | 0, -55 | head | Start |
| `rig:crowcaller:armFront` | 46 × 48 | 36, 24 | 92 × 96 | -6, -49 | armFront | Start |
| `rig:yeti:armBack` | 82 × 158 | 40, 30 | 164 × 316 | 33, -140 | armBack | Start |
| `rig:yeti:legBack` | 76 × 74 | 42, 24 | 152 × 148 | 20, -44 | legBack | Start |
| `rig:yeti:legFront` | 76 × 74 | 42, 24 | 152 × 148 | -16, -44 | legFront | Start |
| `rig:yeti:body` | 138 × 158 | 66, 82 | 276 × 316 | 4, -100 | body | Start |
| `rig:yeti:armFront` | 80 × 158 | 42, 30 | 160 × 316 | -30, -140 | armFront | Start |
| `rig:yeti:head` | 75 × 76 | 38, 50 | 150 × 152 | -14, -146 | head | Start |
| `rig:crow:wingBack` | 37 × 41 | 13, 31 | 74 × 82 | -1, -17 | armBack | Start |
| `rig:crow:body` | 50 × 34 | 25, 16 | 100 × 68 | 0, -12 | static | Start |
| `rig:crow:wingFront` | 37 × 41 | 13, 31 | 74 × 82 | 3, -16 | armFront | Start |

### Requisiten, Burg und Effekte (143)

| Name | Größe in Weltpixeln | Ankerpunkt (x, y) | Bilddatei in Pixeln | Gruppe |
|---|---|---|---|---|
| `prop:gate0` | 74 × 150 | 0, 150 | 148 × 300 | Start |
| `prop:gate1` | 74 × 150 | 0, 150 | 148 × 300 | Start |
| `prop:gate2` | 74 × 150 | 0, 150 | 148 × 300 | Start |
| `prop:gate3` | 74 × 150 | 0, 150 | 148 × 300 | Start |
| `prop:gate4` | 74 × 150 | 0, 150 | 148 × 300 | Start |
| `prop:crack1` | 74 × 150 | 0, 150 | 148 × 300 | Start |
| `prop:crack2` | 74 × 150 | 0, 150 | 148 × 300 | Start |
| `prop:crack3` | 74 × 150 | 0, 150 | 148 × 300 | Start |
| `prop:cauldronBack` | 150 × 90 | 75, 90 | 300 × 180 | Start |
| `prop:cauldronFront` | 150 × 90 | 75, 90 | 300 × 180 | Start |
| `prop:wheel` | 100 × 100 | 50, 50 | 200 × 200 | Start |
| `prop:slab` | 160 × 300 | 80, 300 | 320 × 600 | Start |
| `prop:comet` | 92 × 92 | 46, 46 | 184 × 184 | Start |
| `prop:bomb` | 46 × 50 | 23, 25 | 92 × 100 | Start |
| `prop:stone` | 16 × 16 | 8, 8 | 32 × 32 | Start |
| `prop:shell` | 30 × 30 | 15, 15 | 60 × 60 | Start |
| `prop:bolt` | 64 × 18 | 32, 9 | 128 × 36 | Start |
| `prop:roofBolt` | 44 × 14 | 22, 7 | 88 × 28 | Start |
| `prop:reticle` | 90 × 90 | 45, 45 | 180 × 180 | Start |
| `prop:handOpen` | 72 × 72 | 39, 49 | 144 × 144 | Start |
| `prop:handClosed` | 72 × 72 | 39, 43 | 144 × 144 | Start |
| `prop:gibHelmet` | 32 × 32 | 16, 16 | 64 × 64 | Start |
| `prop:gibPlate` | 32 × 32 | 16, 16 | 64 × 64 | Start |
| `prop:gibBoot` | 32 × 32 | 16, 16 | 64 × 64 | Start |
| `prop:gibStick` | 32 × 32 | 16, 16 | 64 × 64 | Start |
| `prop:coin` | 32 × 32 | 16, 16 | 64 × 64 | Start |
| `prop:offering` | 32 × 32 | 16, 16 | 64 × 64 | Start |
| `prop:splat1` | 120 × 34 | 60, 17 | 240 × 68 | Start |
| `prop:splat2` | 120 × 34 | 60, 17 | 240 × 68 | Start |
| `prop:splat3` | 120 × 34 | 60, 17 | 240 × 68 | Start |
| `prop:drop1` | 18 × 18 | 9, 9 | 36 × 36 | Start |
| `prop:dust` | 60 × 60 | 30, 30 | 120 × 120 | Start |
| `prop:spark` | 26 × 26 | 13, 13 | 52 × 52 | Start |
| `prop:star` | 28 × 28 | 14, 14 | 56 × 56 | Start |
| `prop:flame1` | 60 × 90 | 30, 90 | 120 × 180 | Start |
| `prop:flame2` | 60 × 90 | 30, 90 | 120 × 180 | Start |
| `prop:flame3` | 60 × 90 | 30, 90 | 120 × 180 | Start |
| `prop:iceBlock` | 90 × 120 | 45, 120 | 180 × 240 | Start |
| `prop:shieldBubble` | 110 × 130 | 55, 65 | 220 × 260 | Start |
| `prop:banner` | 640 × 130 | 320, 0 | 1280 × 260 | Start |
| `prop:iconWheel` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconStomper` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconComet` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconMortar` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconFrost` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconBellows` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconBolter` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconPause` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconLocked` | 64 × 64 | 32, 32 | 128 × 128 | Start |
| `prop:iconCastle` | 40 × 40 | 20, 20 | 80 × 80 | Start |
| `prop:king` | 124 × 164 | 62, 160 | 248 × 328 | Start |
| `prop:kingTalk` | 124 × 164 | 62, 160 | 248 × 328 | Start |
| `prop:keep0` | 300 × 660 | 0, 660 | 600 × 1320 | Start |
| `prop:keep1` | 300 × 660 | 0, 660 | 600 × 1320 | Burgstufen |
| `prop:keep2` | 300 × 660 | 0, 660 | 600 × 1320 | Burgstufen |
| `prop:keep3` | 300 × 660 | 0, 660 | 600 × 1320 | Burgstufen |
| `prop:keep4` | 300 × 660 | 0, 660 | 600 × 1320 | Burgstufen |
| `prop:keepGlow0` | 300 × 660 | 0, 660 | 600 × 1320 | Start |
| `prop:keepGlow1` | 300 × 660 | 0, 660 | 600 × 1320 | Burgstufen |
| `prop:keepGlow2` | 300 × 660 | 0, 660 | 600 × 1320 | Burgstufen |
| `prop:keepGlow3` | 300 × 660 | 0, 660 | 600 × 1320 | Burgstufen |
| `prop:keepGlow4` | 300 × 660 | 0, 660 | 600 × 1320 | Burgstufen |
| `prop:keepShadow` | 560 × 110 | 0, 110 | 1120 × 220 | Start |
| `prop:keepWeather_snowpine_0` | 300 × 660 | 0, 660 | 600 × 1320 | snowpine |
| `prop:keepWeather_snowpine_1` | 300 × 660 | 0, 660 | 600 × 1320 | snowpine |
| `prop:keepWeather_snowpine_2` | 300 × 660 | 0, 660 | 600 × 1320 | snowpine |
| `prop:keepWeather_snowpine_3` | 300 × 660 | 0, 660 | 600 × 1320 | snowpine |
| `prop:keepWeather_snowpine_4` | 300 × 660 | 0, 660 | 600 × 1320 | snowpine |
| `prop:keepWeather_canyon` | 300 × 660 | 0, 660 | 600 × 1320 | canyon |
| `prop:keepWeather_marsh` | 300 × 660 | 0, 660 | 600 × 1320 | marsh |
| `prop:keepGround_meadow` | 340 × 130 | 0, 130 | 680 × 260 | meadow (Start) |
| `prop:keepGround_canyon` | 340 × 130 | 0, 130 | 680 × 260 | canyon |
| `prop:keepGround_marsh` | 340 × 130 | 0, 130 | 680 × 260 | marsh |
| `prop:keepGround_snowpine` | 340 × 130 | 0, 130 | 680 × 260 | snowpine |
| `prop:keepWest0` | 400 × 660 | 0, 660 | 800 × 1320 | Start |
| `prop:keepWestGlow0` | 400 × 660 | 0, 660 | 800 × 1320 | Start |
| `prop:keepWestSnow_snowpine_0` | 400 × 660 | 0, 660 | 800 × 1320 | snowpine |
| `prop:keepWest1` | 400 × 660 | 0, 660 | 800 × 1320 | Burgstufen |
| `prop:keepWestGlow1` | 400 × 660 | 0, 660 | 800 × 1320 | Burgstufen |
| `prop:keepWestSnow_snowpine_1` | 400 × 660 | 0, 660 | 800 × 1320 | snowpine |
| `prop:keepWest2` | 400 × 660 | 0, 660 | 800 × 1320 | Burgstufen |
| `prop:keepWestGlow2` | 400 × 660 | 0, 660 | 800 × 1320 | Burgstufen |
| `prop:keepWestSnow_snowpine_2` | 400 × 660 | 0, 660 | 800 × 1320 | snowpine |
| `prop:keepWest3` | 400 × 660 | 0, 660 | 800 × 1320 | Burgstufen |
| `prop:keepWestGlow3` | 400 × 660 | 0, 660 | 800 × 1320 | Burgstufen |
| `prop:keepWestSnow_snowpine_3` | 400 × 660 | 0, 660 | 800 × 1320 | snowpine |
| `prop:keepWest4` | 400 × 660 | 0, 660 | 800 × 1320 | Burgstufen |
| `prop:keepWestGlow4` | 400 × 660 | 0, 660 | 800 × 1320 | Burgstufen |
| `prop:keepWestSnow_snowpine_4` | 400 × 660 | 0, 660 | 800 × 1320 | snowpine |
| `prop:keepWestGround_meadow` | 420 × 130 | 0, 130 | 840 × 260 | meadow (Start) |
| `prop:keepWestGround_canyon` | 420 × 130 | 0, 130 | 840 × 260 | canyon |
| `prop:keepWestGround_marsh` | 420 × 130 | 0, 130 | 840 × 260 | marsh |
| `prop:keepWestGround_snowpine` | 420 × 130 | 0, 130 | 840 × 260 | snowpine |
| `prop:foot_meadow` | 460 × 130 | 0, 130 | 920 × 260 | meadow (Start) |
| `prop:foot_canyon` | 460 × 130 | 0, 130 | 920 × 260 | canyon |
| `prop:foot_marsh` | 460 × 130 | 0, 130 | 920 × 260 | marsh |
| `prop:foot_snowpine` | 460 × 130 | 0, 130 | 920 × 260 | snowpine |
| `prop:mountBolterReady` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountBolterEmpty` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountMortarReady` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountMortarEmpty` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountFrostReady` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountFrostEmpty` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountBellowsReady` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountBellowsEmpty` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountStomperReady` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountStomperEmpty` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountCometReady` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountCometEmpty` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountWheelReady` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:mountWheelEmpty` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `prop:potLedge` | 240 × 200 | 0, 200 | 480 × 400 | Start |
| `prop:potMound` | 220 × 90 | 110, 22 | 440 × 180 | Start |
| `prop:potRearBack` | 150 × 100 | 75, 100 | 300 × 200 | Start |
| `prop:potRearFront` | 150 × 100 | 75, 100 | 300 × 200 | Start |
| `prop:cheese` | 70 × 60 | 35, 30 | 140 × 120 | Start |
| `prop:steam` | 60 × 60 | 30, 30 | 120 × 120 | Start |
| `prop:hookChain` | 34 × 120 | 17, 0 | 68 × 240 | Start |
| `prop:perchHook` | 110 × 130 | 55, 0 | 220 × 260 | Start |
| `prop:eagleHeadOpen` | 520 × 240 | 20, 120 | 1040 × 480 | Start |
| `prop:eagleHeadShut` | 520 × 240 | 20, 120 | 1040 × 480 | Start |
| `lobby:room` | 1600 × 720 | 0, 0 | 1600 × 720 | Start |
| `lobby:flame` | 40 × 64 | 20, 60 | 80 × 128 | Start |
| `lobby:cogPlaque` | 140 × 140 | 70, 70 | 280 × 280 | Start |
| `lobby:storybook` | 200 × 150 | 100, 75 | 400 × 300 | Start |
| `lobby:helpScroll` | 110 × 160 | 55, 80 | 220 × 320 | Start |
| `lobby:mapTable` | 280 × 170 | 140, 85 | 560 × 340 | Start |
| `lobby:pot` | 240 × 160 | 120, 80 | 480 × 320 | Start |
| `lobby:painting` | 160 × 130 | 80, 65 | 320 × 260 | Start |
| `lobby:slate` | 140 × 120 | 70, 60 | 280 × 240 | Start |
| `lobby:feastTable` | 280 × 150 | 140, 75 | 560 × 300 | Start |
| `lobby:armourStand` | 160 × 270 | 80, 135 | 320 × 540 | Start |
| `lobby:king` | 180 × 220 | 90, 110 | 360 × 440 | Start |
| `lobby:throne` | 280 × 340 | 140, 170 | 560 × 680 | Start |
| `lobby:throneGold` | 280 × 340 | 140, 170 | 560 × 680 | Start |
| `lobby:rug` | 460 × 80 | 230, 40 | 920 × 160 | Start |
| `lobby:banner` | 96 × 200 | 48, 100 | 192 × 400 | Start |
| `lobby:trophyShield` | 120 × 130 | 60, 65 | 240 × 260 | Start |
| `lobby:chandelier` | 240 × 130 | 120, 0 | 480 × 260 | Start |
| `lobby:cheeseStack` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `lobby:goldenForks` | 220 × 120 | 110, 60 | 440 × 240 | Start |
| `lobby:garland` | 1600 × 140 | 800, 0 | 3200 × 280 | Start |
| `lobby:nameBanner` | 420 × 110 | 210, 55 | 840 × 220 | Start |

### Waffen (je Stufe ein Bild) (80)

| Name | Größe in Weltpixeln | Ankerpunkt (x, y) | Bilddatei in Pixeln | Gruppe |
|---|---|---|---|---|
| `weapon:wheel:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:wheel:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:wheel:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:wheel:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:wheel:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:cheese:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:cheese:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:cheese:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:cheese:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:cheese:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:forks:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:forks:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:forks:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:forks:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:forks:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:stomper:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:stomper:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:stomper:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:stomper:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:stomper:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:alphorn:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:alphorn:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:alphorn:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:alphorn:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:alphorn:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:cuckoo:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:cuckoo:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:cuckoo:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:cuckoo:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:cuckoo:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:comet:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:comet:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:comet:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:comet:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:comet:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bell:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:bell:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bell:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bell:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bell:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:midas:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:midas:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:midas:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:midas:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:midas:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:mortar:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:mortar:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:mortar:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:mortar:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:mortar:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:frost:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:frost:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:frost:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:frost:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:frost:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bellows:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:bellows:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bellows:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bellows:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bellows:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:thorns:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:thorns:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:thorns:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:thorns:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:thorns:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bolter:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:bolter:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bolter:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bolter:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:bolter:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:sentry:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:sentry:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:sentry:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:sentry:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:sentry:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:beacon:1` | 120 × 120 | 60, 60 | 240 × 240 | Start |
| `weapon:beacon:2` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:beacon:3` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:beacon:4` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |
| `weapon:beacon:5` | 120 × 120 | 60, 60 | 240 × 240 | Waffenstufen 2 bis 5 |

### Landschaftsebenen (16)

| Name | Größe in Weltpixeln | Ankerpunkt (x, y) | Bilddatei in Pixeln | Gruppe |
|---|---|---|---|---|
| `land:meadow:far` | 1600 × 320 | 0, 320 | 1600 × 320 | meadow (Start) |
| `land:meadow:mid` | 1600 × 320 | 0, 320 | 1600 × 320 | meadow (Start) |
| `land:meadow:near` | 1600 × 320 | 0, 320 | 1600 × 320 | meadow (Start) |
| `land:meadow:ground` | 1280 × 130 | 0, 0 | 1280 × 130 | meadow (Start) |
| `land:canyon:far` | 1600 × 320 | 0, 320 | 1600 × 320 | canyon |
| `land:canyon:mid` | 1600 × 320 | 0, 320 | 1600 × 320 | canyon |
| `land:canyon:near` | 1600 × 320 | 0, 320 | 1600 × 320 | canyon |
| `land:canyon:ground` | 1280 × 130 | 0, 0 | 1280 × 130 | canyon |
| `land:marsh:far` | 1600 × 320 | 0, 320 | 1600 × 320 | marsh |
| `land:marsh:mid` | 1600 × 320 | 0, 320 | 1600 × 320 | marsh |
| `land:marsh:near` | 1600 × 320 | 0, 320 | 1600 × 320 | marsh |
| `land:marsh:ground` | 1280 × 130 | 0, 0 | 1280 × 130 | marsh |
| `land:snowpine:far` | 1600 × 320 | 0, 320 | 1600 × 320 | snowpine |
| `land:snowpine:mid` | 1600 × 320 | 0, 320 | 1600 × 320 | snowpine |
| `land:snowpine:near` | 1600 × 320 | 0, 320 | 1600 × 320 | snowpine |
| `land:snowpine:ground` | 1280 × 130 | 0, 0 | 1280 × 130 | snowpine |

### Wolken (4)

| Name | Größe in Weltpixeln | Ankerpunkt (x, y) | Bilddatei in Pixeln | Gruppe |
|---|---|---|---|---|
| `cloud:0` | 220 × 100 | 110, 50 | 220 × 100 | Start |
| `cloud:1` | 250 × 110 | 125, 55 | 250 × 110 | Start |
| `cloud:2` | 200 × 90 | 100, 45 | 200 × 90 | Start |
| `cloud:3` | 150 × 64 | 75, 32 | 150 × 64 | Start |
<!-- ASSETS:END -->
