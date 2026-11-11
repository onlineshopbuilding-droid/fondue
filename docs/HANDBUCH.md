# Fondue – Änderungshandbuch

Dieses Dokument sagt, wo was liegt und was alles angefasst werden muss, wenn sich etwas ändert. Es richtet sich an Tim, Lenny und künftige Claude-Sessions. Bezeichner statt Zeilennummern, weil sich Zeilen ständig verschieben. Bezeichner werden gegen den Code geprüft.

Die Erklärung der Konzepte (fester Zeitschritt, Wurfphysik, WebRTC) steht in `docs/uebergabe/LERNEN.md`, die Spielregeln und Messwerte in `docs/GDD.md`, die Begründungen in `docs/ENTSCHEIDUNGEN.md`.

## 1. Wie das Spiel aufgebaut ist

```
Maus/Touch  src/input/pointer.ts
    |  Position jedes Frame, Wurfgeschwindigkeit beim Loslassen
    v
GameScene (src/render/scene.ts)  <---- zeichnet ViewState, spielt SimEvents ab
    |  localPress, localRelease, send(Command)            ^
    v                                                     |
Session (src/game/session.ts)                             |
    |-- HostSession: besitzt die Sim, solo und Koop-Host  |
    |-- GuestSession: besitzt keine Sim, sagt voraus      |
    v                                                     |
Sim (src/sim/sim.ts): alle Regeln, 60 Schritte/s  --------+
    |
    v
Zahlen aus src/config/
```

Im Koop rechnet nur der Host. Der Gast schickt Eingaben (`c`, `h`), der Host schickt 30-mal pro Sekunde einen Snapshot (`s`), dazu Ereignisse (`ev`) und bei Änderungen die Metadaten (`m`). Die Menüs sind normales HTML über dem Canvas (`src/ui/app.ts`).

Drei Datenarten, die man unterscheiden muss:

| Art | Typ | Inhalt | Weg zum Gast |
|---|---|---|---|
| Zustand pro Frame | `ViewState` | Gegner, Geschosse, Hände, Gold, Tor | Snapshot, kompakt kodiert in `src/net/snapshot.ts` |
| Einmalige Ereignisse | `SimEvent` | Aufprall, Tod, Kauf: alles, was Effekt oder Klang auslöst | Nachricht `ev` |
| Seltene Daten | `Meta` | Besitz, Namen, Ready, Tuning, Bestenwerte | Nachricht `m`, nur wenn `rev` steigt |

## 2. Vier Regeln, die nicht brechen dürfen

1. **`src/sim/` kennt weder Phaser noch DOM.** Nur so laufen Unit-Tests und Balance-Bots ohne Browser.
2. **In `src/sim/` kein `Math.random`, nur `this.rng`.** Gleicher Startwert und gleiche Eingaben müssen denselben Verlauf ergeben. In `src/render/` ist `Math.random` in Ordnung.
3. **Zahlen gehören nach `src/config/`.** Ausnahmen stehen in Abschnitt 6.
4. **Fondue bleibt ein eigenes Spiel.** Nichts aus anderen Spielen übernehmen: keine Namen, Figuren, Grafik, Musik, Level oder Texte (`AGENTS.md`, E-001). Der Name des Spiels steht nur in `src/config/game.ts`.

## 3. Wo liegt was

| Ordner / Datei | Aufgabe |
|---|---|
| `src/config/enemies.ts` | Werte, Namen, Tipps aller 11 Gegner (`ENEMIES`), Sonderwerte (`BEHAVIOUR`) |
| `src/config/shop.ts` | Upgrades und Preise (`SHOP_ITEMS`), Reiter (`SHOP_TABS`), Torstärke (`GATE_HP`), Waffenwerte (`WEAPONS`), `ECONOMY` |
| `src/config/waves.ts` | Tageslänge und Gegneranzahl (`DAY`), Schwierigkeit (`DIFFICULTIES`), Koop-Faktor (`COOP`), Landschaftswechsel |
| `src/config/tuning.ts` | Wurfgefühl: Standardwerte, Voreinstellungen, Regler im Panel |
| `src/config/world.ts` | Geometrie: Bodenlinie, Tor, Kessel, Haken, Waffenplätze (`slots`), Feldbreite (`FIELD`), `CHAR_SCALE` |
| `src/config/flags.ts` | Experiment-Schalter (`FLAG_DEFS`) |
| `src/config/quickstart.ts` | Schnellstart-Tage mit Gold, Offerings und Besitz (`QUICK_STARTS`) |
| `src/sim/sim.ts` | Alle Spielregeln |
| `src/sim/aim.ts` | Schleuder-Zielen an der Burg (`aimShot`), Griffzonen (`slotAt`), Zielpunkt für Bots (`pointerFor`) |
| `src/sim/keep.ts` | Ausbaustufe der Burg (`buildTier`), welche Waffe verbaut ist (`ownsSlot`) |
| `src/sim/spawn.ts` | Tagesplan: wie viele Gegner, welche, wann |
| `src/sim/types.ts` | Datentypen: `Enemy`, `Projectile`, `Meta`, `SimEvent`, `Command` |
| `src/sim/bot.ts` | Spielende Bots für die Balance-Messung |
| `src/game/session.ts` | `HostSession`, `GuestSession`, Vorhersage beim Gast |
| `src/game/storage.ts` | Einstellungen und Bestenliste im `localStorage` |
| `src/input/pointer.ts` | Zeigerverlauf, Wurfgeschwindigkeit |
| `src/net/protocol.ts` | Alle Netznachrichten, `PROTOCOL_VERSION` |
| `src/net/snapshot.ts` | Snapshots kodieren, dekodieren, interpolieren |
| `src/net/peer.ts`, `relay.ts`, `loopback.ts` | Verbindungsarten: PeerJS, Plan B, Test im selben Browser |
| `src/net/transport.ts` | Gemeinsame Schnittstelle, Latenz-Simulator `withLatency` |
| `src/render/scene.ts` | Hauptszene: Tor, Hände, Banner, `handleEvent` |
| `src/render/enemyView.ts` | Eine Figur zeichnen und animieren (`applyPose`) |
| `src/render/effects.ts` | Partikel, Blut, Explosionen, schwebende Texte |
| `src/render/hud.ts` | Gold, Torleiste, Tagesanzeige |
| `src/render/castleView.ts` | Burg je Ausbaustufe, Tor, Schatten, Vordergrund, Waffen an der Burg mit Nachladering, Griffzonen |
| `src/render/stations.ts` | Kessel (beide Varianten), Adlerhaken, Adlerkopf |
| `src/render/aimView.ts` | Zielhilfe: Band, Flugbahn, Einschlagring |
| `src/render/viewport.ts` | Rechnet Bildschirmgröße in den sichtbaren Weltausschnitt um (`computeView`), Schärfe der Zeichenfläche (`renderScale`) |
| `src/render/background.ts` | Himmel mit Sonne, Mond, Sternen und Wolken, Parallax-Ebenen, Dunst über den Tag |
| `src/render/textures.ts` | Macht aus allen SVGs Texturen: beim Start das Nötige, den Rest im Hintergrund |
| `src/render/glFix.ts` | Korrektur an Phasers Shader, damit keine Bildblöcke verschwinden (E-031) |
| `src/art/shade.ts` | Licht und Schatten für alle Grafiken: `lit`, `litTube`, `crescent`, `within`, `tone`, Verläufe, `rng` |
| `src/art/characters/` | Eine Datei pro Gegner, Sammlung in `RIGS` (`index.ts`), Bausteine und Farben in `kit.ts` |
| `src/art/props.ts` | Icons, Hand, Geschosse, Effekt-Bilder (`PROPS`, enthält auch alles aus `castle.ts`) |
| `src/art/castle.ts` | Burg in 5 Stufen mit Nachtlicht, Tore und Risse, Kessel, Boden am Mauerfuß (`keepGround_*`), Vordergrund (`foot_*`), Wetter, Waffen an der Burg, Haken, Adlerkopf |
| `src/art/draw.ts` | Zeichen-Bausteine und Farben für Burg und Requisiten |
| `src/art/landscapes.ts` | Vier Landschaften mit je vier Ebenen, Wolken |
| `src/audio/sfx.ts` | Soundeffekte aus Code (`SFX_RECIPES`) |
| `src/audio/music.ts` | Musik: Akkorde, Abschnitte, Stile `menu` und `battle` |
| `src/audio/audio.ts` | Abspielen, Lautstärke |
| `src/ui/app.ts` | Alle Bildschirme, Lobby, Shop-Ansicht, Buttons (`render`, `onClick`) |
| `src/ui/content.ts` | Hilfe-Seiten, Lade-Tipps, Credits |
| `src/ui/tuningPanel.ts` | Panel auf F1, mit Entwickler-Bereich (Schalter, Schnellstart) |
| `src/ui/style.css` | Aussehen der Menüs |
| `server/relay/index.mjs` | Plan-B-Server |
| `tests/` | Siehe Abschnitt 7 |

## 4. Ich will … ändern

### Zahlen

| Ziel | Stelle |
|---|---|
| Gegner schneller, stärker, wertvoller, früher | Eintrag in `ENEMIES`: `speed`, `strike`, `gold`, `firstDay`, `weight`, `maxPerDay` |
| Name oder Tipp eines Gegners | `name`, `tip` in `ENEMIES` |
| Mehr oder weniger Gegner | `DAY.base`, `DAY.perDay`; zu zweit `COOP.countFactor` |
| Tag länger | `DAY.seconds` |
| Eskalation von Tag zu Tag | `DAY.damageGrowth`, `DAY.speedGrowth`, `DAY.hpGrowth` |
| Schwierigkeitsgrade | `DIFFICULTIES` |
| Preise, Voraussetzungen, Beschreibungen | `SHOP_ITEMS` |
| Waffenstärke und Abklingzeit | `WEAPONS` |
| Torleben | `GATE_HP`; Heilung über Nacht `ECONOMY.gateRefill` |
| Gold pro Opfergabe | `ECONOMY.offeringGold` |
| Klicks gegen Siege Cart, Bombenzünder, Schildzeiten | `BEHAVIOUR` |
| Lage von Kessel und Haken | `WORLD.cauldron`, `WORLD.cauldronBack`, `WORLD.perch` |
| Lage der Waffen an der Burg | `WORLD.slots`; die Grafik `keep0` bis `keep4` muss dazu passen |
| Zielgefühl (Zugweite, Winkel, Tempo) | `AIM` in `src/config/shop.ts` |
| Dauer der Kessel-Verwandlung | `cauldronSeconds` im Tuning |
| Wartezeit am Haken | `PERCH` in `src/config/shop.ts` |
| Schnellstart-Ausstattung | `QUICK_STARTS` |
| Grenzen der Feldbreite | `FIELD` |

### Wurfgefühl

Zuerst live probieren: im Spiel F1, Regler bewegen, mit **Export** die Werte kopieren und in `TUNING_DEFAULT` eintragen. Falle 1 in Abschnitt 6 beachten.

| Ziel | Wert in `TUNING_DEFAULT` |
|---|---|
| Würfe weiter oder kürzer | `throwMult`, `maxThrow` |
| Schneller oder träger fallen | `gravity` |
| Wie hart ein Aufprall sein muss, um zu töten | `lethalImpact` |
| Greifen leichter | `grabRadius` |
| Gegner hängt straffer an der Hand | `holdSpring` |
| Mehr oder weniger Wucht beim Treffer | `hitstopMs`, `shake` |
| Geworfene werfen andere um | `knockOthers` |

Die Logik dazu: `velocity()` in `src/input/pointer.ts`, `release`, `clampThrow`, `throwEnemy`, `liftFlatThrow`, `updateHeld`, `updateAir` in `src/sim/sim.ts`. Falle 4 beachten.

### Verhalten

| Ziel | Stelle in `src/sim/sim.ts` |
|---|---|
| Anfangszustand eines Gegners | `spawnEnemy` |
| Laufen, Angreifen, Springen, Schweben | `updateEnemy`, von dort `updateWalk`, `updateAttack`, `updateHop`, `updateFloat` |
| Bomben, Steine, Räder, Kometen, Mörsergranaten | `updateProjectiles`, `updateBomb`, `updateComet`, `updateShell` |
| Waffen auslösen | `pressSlot`, `activate`, `fireAimed`, `fireBolter`, `fireHorn`, `landHorn`, `fireStomper`, `fireComet` |
| Kessel | `enterPot`, `canPot`, `tryRearPotOnRelease`, `steerAtRearPot`, Fall `cooking` in `updateEnemy` |
| Haken | `tryPerch`, `updateHooked` |
| Was beim Tod passiert (Gold, Opfergabe, Krähe) | `kill` |
| Tagesbeginn und -ende, Tor auffüllen | `startDay`, `endDay`, Ablauf in `step`; Sonnenuntergang über `s.nightfall` |
| Kaufen und Ausrüsten | `canBuy`, `buy`, `equip` |

### Aussehen und Klang

| Ziel | Stelle |
|---|---|
| Figur umzeichnen | Datei in `src/art/characters/`; Figuren schauen in der Grafik **nach links** |
| Lauf-, Halte-, Fluganimation | `applyPose` in `src/render/enemyView.ts` |
| Burg, Tore, Kessel und Waffen an der Burg | `CASTLE_ART` und `KEEP_PROPS` in `src/art/castle.ts`, Name gleich Texturname |
| Icons, Hand, Geschosse | `PROPS` in `src/art/props.ts`, Name gleich Texturname |
| Licht und Schatten, Materialien | Bausteine in `src/art/shade.ts`; Licht immer von links oben (E-031) |
| Landschaften | `LANDSCAPE_ART` in `src/art/landscapes.ts`, Reihenfolge `LANDSCAPES`, Wechsel `DAYS_PER_LANDSCAPE` |
| Himmelsfarben | Vier Farben je Tageszeit in `tint` von `LANDSCAPE_ART`, gemalt von `paintSky` in `src/render/background.ts` |
| Sonne, Mond, Sterne, Dunst | `src/render/background.ts` |
| Schärfe der Texturen | `TEX_SCALE`, `LAND_SCALE`, `CLOUD_SCALE` in `src/render/textures.ts` |
| Schärfe des ganzen Bildes | `MAX_RENDER_SCALE`, `MAX_RENDER_PIXELS` in `src/render/viewport.ts` |
| Blut, Partikel, Explosion | `src/render/effects.ts` |
| Welcher Effekt und Klang bei welchem Ereignis | `handleEvent`, `onImpact`, `onDeath` in `src/render/scene.ts` |
| Handfarben | `HAND_COLORS` in `src/render/scene.ts` |
| HUD-Anordnung | `src/render/hud.ts`, Verankerung an den Bildschirmrändern in `layout` |
| Waffen-Ansicht an der Burg | `src/render/castleView.ts` |
| Wie viel auf breiten oder hohen Bildschirmen sichtbar ist | `src/render/viewport.ts` |
| Handy-Layout der Menüs | Blöcke `@media (pointer: coarse)` und `@media (max-height: 520px)` in `src/ui/style.css` |
| Menüfarben und -layout | `src/ui/style.css` |
| Klang eines Effekts | Funktion in `src/audio/sfx.ts`, Zuordnung in `SFX_RECIPES` |
| Musik | `CHORDS`, `SECTION_A`, `SECTION_B`, `STYLES` in `src/audio/music.ts` |

### Texte und Menüs

Spieltexte sind Englisch. Hilfe, Tipps, Credits: `src/ui/content.ts`. Bildschirme: `render` und die `render…`-Methoden in `src/ui/app.ts`. Ein Button trägt `data-a="name"` und wird in `onClick` behandelt.

### Koop

| Ziel | Stelle |
|---|---|
| Verbindungsaufbau, Lobby, Wiedereinstieg | `openRoom`, `onGuestLink`, `joinRoom`, `onHostMessage`, `enterRejoin` in `src/ui/app.ts` |
| Snapshot-Takt, Abbruchzeit | `SNAPSHOT_EVERY_STEPS`, `SILENCE_LIMIT_MS`, `OWN_STALL_MS` in `src/game/session.ts` |
| Glättung beim Gast | `INTERP_DELAY_MS`, `EVENT_DELAY_MS` in `src/game/session.ts` |
| STUN-Server, PeerJS | `src/net/peer.ts` |

## 5. Rezepte

Bei allen Rezepten hilft TypeScript: `ENEMIES` und `RIGS` sind vollständige `Record`-Typen, `npx tsc --noEmit` meldet also fehlende Einträge.

**Neuer Gegner**
1. Typ in `EnemyType` und Eintrag in `ENEMIES` (`src/config/enemies.ts`).
2. Figur als neue Datei in `src/art/characters/`, eintragen in `RIGS`.
3. Sonderverhalten in `spawnEnemy` und `updateEnemy`. Reine Läufer brauchen nichts davon.
4. Bei einem neuen Zustand: `EnemyState` ergänzen, ebenso `STATES` in `src/net/snapshot.ts` und einen Fall in `applyPose`.
5. Greifregeln für den Gast prüfen (Falle 4).
6. Unit-Test in `tests/unit/sim.test.ts`, danach `npm run balance`.

Der Tipp beim ersten Auftauchen läuft automatisch über `firstDay` und `tip`.

**Neue Stufe einer Waffe** (zum Beispiel `wheel4`): Eintrag in `SHOP_ITEMS` und `WEAPONS`, Id oben in die Liste von `tierOf`, in `WISHLIST` (`src/sim/bot.ts`). Der Shop-Test zählt 22 Upgrades und muss bewusst angepasst werden.

**Neues Tor:** siehe „Neue Burg-Ausbaustufe“, dazu `currentGateId` (`src/sim/sim.ts`).

**Neue Torwaffe:** `SHOP_ITEMS` mit Reiter `horns`, Eintrag in `WEAPONS.horn` und `AIM`, neuer `kind`-Fall in `fireHorn` und `landHorn`, Grafik `mount…Ready` und `mount…Empty` in `CASTLE_ART`, Zuordnung in `MOUNTS` (`src/render/castleView.ts`), Farbe in `COLORS` (`src/render/aimView.ts`).

**Ganz neuer Waffentyp:** `WeaponSlot`, `WEAPON_SLOTS`, `SHOP_TABS`, `WEAPONS`, `tierOf`, `activate`, Platz in `WORLD.slots`, Grafik und `MOUNTS`, `SLOT_TIERS` (`src/sim/keep.ts`). Braucht er eine Zielgeste: `HandMode`, `MODES` in `src/net/snapshot.ts`, `aimShot`, Hilfe-Seite ergänzen.

**Neuer Experiment-Schalter:** Eintrag in `FLAG_DEFS` (`src/config/flags.ts`), in den Regeln `this.flag('id')` lesen, im Bild `meta.flags.id`. Das Menü baut sich von selbst.

**Neuer Schnellstart-Tag:** Eintrag in `QUICK_STARTS`; alle Voraussetzungen müssen mit in `owned` stehen, ein Unit-Test prüft das.

**Neue Burg-Ausbaustufe:** Grafik `keepN` und `keepGlowN` in `CASTLE_ART`, Tor in `SHOP_ITEMS`, `GATE_HP`, `GATES` (`src/sim/keep.ts`). Die Waffenplätze aus `WORLD.slots` müssen auf der Grafik frei bleiben.

**Neue oder geänderte Grafik:** Licht von links oben, Formen mit `lit` oder `litTube` aus `src/art/shade.ts` schattieren, keine SVG-Masken und keine Filter (Falle 14). Der Rahmen eines Teils (`box` bei Figuren, Größe bei Requisiten) muss die Zeichnung mit Rand umfassen, auch wenn sich Arme und Beine drehen; `tests/e2e/art.spec.ts` prüft das. Gehört eine Requisite zu einer Landschaft, endet ihr Name auf `_<landschaft>` (z. B. `foot_marsh`); dann wird sie mit der Landschaft im Hintergrund geladen.

**Neuer Effekt zu einem Ereignis:** Variante in `SimEvent`, in der Sim `this.emit(...)`, in `handleEvent` den Effekt auslösen. Beim Gast kommt das automatisch an.

**Neue Eigenschaft, die man sehen soll:** Feld in `Enemy`, in `ViewEnemy`, in der Kodierung und Dekodierung von `src/net/snapshot.ts`. Ohne den Snapshot-Teil fehlt sie beim Gast und beim Host gleichermaßen, weil auch der Host über `decodeSnapshot(encodeSnapshot(...))` zeichnet.

**Neuer Klang:** Name in `SfxName`, Funktion und Eintrag in `SFX_RECIPES`, abspielen über `this.sfx('name')` in der Szene.

## 6. Fallen

1. **Tuning-Standardwerte erreichen benutzte Browser nicht.** `saveSettings` speichert immer das ganze Tuning, schon wenn jemand Namen oder Lautstärke ändert (`fondue.settings.v1`). Nach einer Änderung an `TUNING_DEFAULT` gelten beim Betroffenen weiter die alten Werte. Abhilfe von Hand: F1, dann **Default** drücken. Im Koop zählen nur die Werte des Hosts.
2. **Ein Push auf `main` geht sofort live.** Die Pipeline führt nur die Unit-Tests aus. Die Browser-Tests laufen nur lokal, also vorher `npm run test:e2e`.
3. **Host und Gast brauchen denselben Build.** Sonst lehnt der Host mit einer Versionsmeldung ab. Nach jedem Deploy laden beide die Seite neu (Strg+F5).
4. **Einige Regeln gibt es doppelt, damit der Gast sofort reagiert.** Wer eine Seite ändert, muss die andere mitziehen:

   | Host (`src/sim/sim.ts`) | Gast (`GuestSession`) |
   |---|---|
   | `tryGrabEnemy`, `grabDistance`, `tryGrabBomb` | `localPress`, `pickEnemy` |
   | `clampThrow`, `throwEnemy`, `liftFlatThrow` | `localRelease` |
   | `updateHeld`, `updateAir` | `stepPrediction` |

   Das Zielen an der Burg braucht keine Doppelung: `aimShot` läuft auf beiden Seiten, der Host feuert.

5. **Nicht jede Zahl steht in der Konfiguration.** In `src/sim/sim.ts`: Fluchttempo 1,9 in `updateEnemy` (nur mit dem Schalter „Retreat“), Krähe stirbt schon bei 0,4 × `lethalImpact` in `updateAir`. In `src/sim/spawn.ts`: garantierte Anzahl neuer Gegner, Wachstum der Obergrenze um 15 % pro Tag.
6. **Einige Einstellungen wirken derzeit nicht.** `DAY.perDayAfterCap` ist gleich `DAY.perDay`, also bremst `softCapDay` nichts, außer die Werte wurden beim Balancing getrennt.
7. **Größen:** `radius` und `height` in `ENEMIES` sind Weltmaße und enthalten `CHAR_SCALE` bereits. Wer eine Figur größer zeichnet, muss sie dort mit anpassen, sonst passt die Greiffläche nicht mehr.
8. **Balance-Bots sind Näherungen.** Sie zielen ohne Bewegung und besiegen Yetis nur mit Waffen. Die Zahlen sagen, ob eine Änderung in die richtige Richtung geht, nicht wie ihr tatsächlich abschneidet.
9. **Tests dürfen nie abgeschwächt werden.** Ändert sich eine Zahl, ist es in Ordnung, das Szenario eines Tests anzupassen; die Prüfung selbst bleibt. Ausfälle erst erklären, nicht einfach wiederholen.
10. **Testläufe überschreiben `docs/screenshots/`.** Das erzeugt Git-Änderungen ohne inhaltliche Bedeutung.
11. **Welt- und Bildschirmkoordinaten sind nicht dasselbe.** Die Feldbreite ist 1280 bis 1760 und steht in `meta.fieldW`, nie fest in `WORLD.width` rechnen. Der Bildschirm beginnt immer bei x = 0, oben zeigt er je nach Format mehr oder weniger Himmel. Figuren, Geschosse und die Hand stehen in Weltkoordinaten. HUD-Elemente stehen in Bildschirmkoordinaten und werden in `layout` an einen Rand verankert. Umrechnung: Bildschirm = Welt minus `offsetX`/`offsetY` aus `GameView`.
12. **Neue Dinge links von x = 0 sieht niemand, oberhalb von y = 120 kann der Himmel abgeschnitten sein.** Alles Spielrelevante muss darunter liegen und im Feld (`meta.fieldW`), sonst sehen Host und Gast nicht dasselbe.
13. **`Math.random` und `window` sind in `src/sim/` tabu.** Auch ein Import aus `src/render/` zieht Phaser in die Unit-Tests. Gemeinsame reine Helfer gehören nach `src/sim/`, zum Beispiel `keep.ts`.
14. **SVG-Masken und Filter machen den Start langsam.** Jede Maske kostet beim Umwandeln eine Ebene so groß wie die ganze Textur; bei Burg und Landschaften waren das Sekunden. Schattierung über `crescent` und `within` (Clip-Pfade) aus `src/art/shade.ts`. Den Aufwand misst `textureMs` in `window.__fondue`.
15. **Nicht alle Texturen gibt es sofort.** Die Landschaften Canyon, Sumpf, Schnee und die Burgstufen 1 bis 4 entstehen erst nach dem Start im Hintergrund (`landscapeReady`, `keepStagesReady` in `src/render/textures.ts`). Wer solche Texturen anzeigt, prüft vorher, ob sie fertig sind, sonst zeigt Phaser ein Ersatzbild für fehlende Texturen. Die Burg zeigt bis dahin Stufe 0, der Hintergrund die vorige Landschaft. Geladen wird eine Textur nach der anderen mit kurzer Pause, damit Eingaben, Bilder und Koop-Nachrichten durchkommen; nie wieder eine ganze Gruppe auf einmal starten. Browser-Tests warten in `waitForGame` (`tests/e2e/helpers.ts`), bis `__fondue.artReady` wahr ist, und prüfen so das fertig geladene Spiel.
16. **Eingefrorene Seite ist keine Funkstille.** Ein Koop-Spiel gilt nach `SILENCE_LIMIT_MS` ohne Nachricht als getrennt. Zeit, in der die eigene Seite selbst stand (Frame mehr als `OWN_STALL_MS` zu spät), zählt nicht mit, weil die Nachrichten des anderen dann noch in der Warteschlange hängen (`excuseOwnStall` in `src/game/session.ts`). Zeitkritische Eingaben wie das lange Drücken aufs Logo messen mit den Zeitstempeln der Ereignisse, nicht nur mit einem Timer.

## 7. Testen und veröffentlichen

| Befehl | Prüft | Dateien |
|---|---|---|
| `npm run dev` | Spiel lokal auf http://localhost:5173 | |
| `npm test` | Regeln, Wurf, Sitzung, Klänge, Latenz-Simulator | `tests/unit/` |
| `npm run test:e2e` | Browser: Ablauf, Koop, Relay, Touch, Landschaften, Handy-Größen, abgeschnittene Grafik (`art.spec.ts`) | `tests/e2e/` |
| `npm run balance` | Bots spielen, schreibt `docs/balance-latest.md` | `tests/balance/` |
| `npx playwright test --config playwright.perf.config.ts` | FPS mit 200 Gegnern in Edge | `tests/perf/` |
| `npx playwright test --config playwright.live.config.ts` | Veröffentlichte Seite | `tests/live/` |

Veröffentlichen, sobald Tim oder Lenny es sagt: alle Tests grün, Pull Request nach `main` stellen und mergen. `.github/workflows/ci.yml` führt die Tests für jeden Pull Request aus (Prüfung `test`), ohne Grün geht kein Merge. Die Pipeline steht in `.github/workflows/deploy.yml`. Danach mit `EXPECT_BUILD=<kurzer Hash>` die Live-Tests laufen lassen.

Die Testregeln gelten weiter: Browser-Tests laufen mit Playwright. Firefox und das volle Playwright-Chromium startet Windows auf diesem Laptop nicht (E-011), Edge läuft über `channel: 'msedge'`.

## 8. Hilfen beim Ausprobieren

- **F1:** Tuning-Panel. **F3:** Debug-Anzeige mit FPS, Rolle, Ping, Build.
- **Entwickler-Menü:** Am Laptop F1, unten im Panel. Auf dem Handy den Schriftzug im Hauptmenü lang drücken. Dort: Experiment-Schalter (im Koop gelten die des Hosts) und Schnellstart ab Tag 10, 20 oder 30.
- **Koop allein testen:** zwei Tabs mit `http://localhost:5173/?net=loopback`, im zweiten `&join=CODE` anhängen. Mit `&lat=45&jit=20&loss=0.02` kommt simulierte Latenz dazu.
- **Fester Zufall:** `?seed=123`.
- **Parallele Sitzungen:** Laufen auf einem Rechner zwei Sitzungen, braucht jede einen eigenen Testserver, zum Beispiel mit der Umgebungsvariable `TEST_PORT=5317`. Sonst prüfen die Browser-Tests den Code der anderen Sitzung.
- **Plan B:** `npm run relay`, Adresse in den Options oder per `?relay=...`. Anleitung in `docs/uebergabe/START-HIER.md`.
- **Browser-Konsole:** `window.__fondue` ist die App. Auf dem Host geht zum Beispiel `__fondue.session.sim.s.gold = 5000` oder `__fondue.session.sim.s.dayT = 49.9`, um einen Tag zu überspringen.

## 9. Bei jeder Änderung: Stimmigkeits-Check

Eine Änderung ist erst fertig, wenn das ganze Spiel danach noch zusammenpasst. Nicht jeder Punkt betrifft jede Änderung, aber jeder wird durchgedacht. Was nicht mehr passt, wird im selben Zug mitgeändert.

| Bereich | Frage | Wo nachsehen |
|---|---|---|
| Texte | Stimmen Tipps, Shop-Beschreibungen, Hilfe-Seiten und Lade-Tipps noch? Gleicher Ton, Englisch? | `tip` in `ENEMIES`, `desc` in `SHOP_ITEMS`, `HELP_SLIDES`, `LOADING_TIPS` |
| Regeln | Widerspricht etwas Neues einer alten Regel? Sind Sonderfälle bedacht, zum Beispiel Schild, gefrorene oder gehaltene Gegner? | `src/sim/sim.ts`, `docs/GDD.md` |
| Wirtschaft | Bleibt die Preisleiter sinnvoll, sind höhere Stufen teurer und besser? Ist alles erreichbar? | `SHOP_ITEMS`, `WEAPONS`, `npm run balance` |
| Schwierigkeit | Liegt der Verlauf noch im Ziel? | `docs/balance.md`; Durchschnitts-Bot solo auf Medium Tag 8 bis 12 |
| Koop | Sieht der Gast dasselbe? Reagiert er genauso? | Abschnitt 6, Falle 4; `src/net/snapshot.ts` |
| Bedienung | Geht es mit Maus und Finger? Sieht es auf dem Handy gut aus? | Abschnitt 10; Screenshots in `mobile-screenshots/` ansehen |
| Aussehen | Passt es zum Stil: gleiche Farben, Umrisse, Schriften? Überlappt etwas, wird etwas abgeschnitten? | `PAL` in `src/art/characters/kit.ts`, `src/ui/style.css`; Screenshot ansehen |
| Rückmeldung | Hat etwas Neues Klang, Effekt und einen Hinweis für Spielende? | `handleEvent`, `SFX_RECIPES` |
| Leistung | Bleibt es flüssig mit 200 Gegnern? | FPS-Test |
| Tests | Ist das Neue durch einen Test abgesichert und alles grün? | Abschnitt 7 |
| Dokumente | Stimmen Handbuch, `docs/GDD.md`, `docs/features.json` noch? Entscheidung festgehalten? | `docs/ENTSCHEIDUNGEN.md` |

Am Ende steht ein kurzer Bericht für Tim und Lenny: was geändert wurde, was dadurch mitgeändert wurde, wo es liegt, was geprüft wurde und was nur Menschen beurteilen können, etwa Spielgefühl und Klang.

## 10. Handy und Endziel App Store / Google Play

Jede Version muss auf Laptop und Handy funktionieren. Das Spiel soll später in beide Stores, zuerst privat.

**So funktioniert die Anpassung an jeden Bildschirm**
- Die Feldbreite (1280 bis 1760) legt der Host beim Spielstart fest (`meta.fieldW`, siehe E-021). Regeln und Koop sind dadurch für beide gleich, auch wenn einer am Handy und einer am Laptop spielt. Gegner laufen auf breiterem Feld schneller und holen die Hälfte der längeren Strecke auf (`FIELD.speedCompensation`), gemessen mit den Balance-Bots.
- `computeView` bestimmt, was sichtbar ist. Die Burg steht immer am linken Rand, die Straße unten. Tablets und Gäste mit schmalerem Bildschirm sehen oben mehr Himmel, Gäste mit breiterem etwas weniger, und ganz rechts höchstens etwas Kulisse.
- Das HUD ist in Gruppen an die Bildschirmränder verankert und wächst auf kleinen Bildschirmen, bis Finger es treffen. Waffen liegen an der Burg, ihre Griffzonen wachsen ebenso.
- Menüs nutzen auf niedrigen Bildschirmen ein kompaktes Layout, der Markt scrollt nur die Liste. Hochkant erscheint ein Hinweis zum Drehen, ein laufendes Solo-Spiel pausiert.
- Notch und Home-Leiste kommen über `readSafeArea` und werden im HUD freigehalten.

**So wird geprüft:** `tests/e2e/mobile.spec.ts` und `tests/e2e/keep.spec.ts` laufen mit `npm run test:e2e` standardmäßig auf Laptop, iPhone 16 und Android, in simuliertem Chrome mit Touch. Alle weiteren Größen vom kleinen Android bis zum iPad kommen mit `ALL_SCREENS=1` dazu, gelegentlich und vor Store-Versionen. Geprüft wird: nichts ragt aus dem Bild, alle Bedienflächen sind mindestens 44 Pixel groß, das Bild füllt den Bildschirm, Hinweise verdecken nicht das Spielfeld, Waffen, Pause und Greifen gehen per Finger. `tests/e2e/keep.spec.ts` prüft Zielen, Griffzonen, Kessel, Haken, Schnellstart und Koop mit ungleichen Bildschirmen, mit Maus und Finger. Die Screenshots liegen danach in `mobile-screenshots/` und werden bei Änderungen an Aussehen oder Bedienung angesehen.

**Grenzen der Simulation:** Safari verhält sich manchmal anders als Chrome, und Leistung oder Spielgefühl auf echten Geräten sieht man so nicht. Dafür testen Tim (iPhone 16) und Lenny (Android) von Zeit zu Zeit auf dem echten Gerät.

**Für jede neue Funktion**
- Alles muss per Finger gehen. Tastatur, Hover und Rechtsklick sind nur Zusatz.
- Neue Bildschirme und Menüs bekommen einen Eintrag in `tests/e2e/mobile.spec.ts`.
- Neue HUD-Elemente kommen in eine der Gruppen in `src/render/hud.ts`, neue Waffen an einen Platz der Burg.
- Spieltexte sprechen von „tap“, nicht von „click“, und nennen keine Tasten als einzigen Weg.
- Keine neue Abhängigkeit, die nur im Desktop-Browser läuft.

**Geräte:** Tim: ASUS Zenbook (Windows), iPhone 16. Lenny: Windows-Laptop, Linux-Laptop, Android-Handy. Es gibt keinen Mac, iOS-Builds brauchen später einen Cloud-Dienst mit macOS.

**Android-Testapp:** `capacitor.config.ts` beschreibt die Hülle, `npm run android:prepare` erzeugt daraus den Ordner `android/` (nicht im Repo), `scripts/android-setup.mjs` stellt Querformat und Vollbild ein. Gebaut wird auf GitHub in `.github/workflows/android.yml`, sobald sich eine dieser Dateien ändert oder von Hand. Die APK liegt im Release `android-latest`. Spieländerungen brauchen keinen neuen App-Bau, sie kommen mit jeder Veröffentlichung über die Live-Seite. Jeder neue Bau hat eine andere Test-Signatur, die App muss dann vorher deinstalliert werden.

**Noch offen bis zur Store-Version**

| Thema | Heute | Nötig |
|---|---|---|
| Verpackung als App | Android-Testapp als Hülle um die Live-Seite, iPhone noch nicht | Für den Store das Spiel fest in die App packen, iPhone über TestFlight |
| Leistung | Nur auf dem Laptop gemessen | Auf echten Handys messen, bei Bedarf Einstellung mit weniger Effekten |
| Koop über Mobilfunk | Direktverbindung über STUN, öffentlicher PeerJS-Dienst, kein TURN | Eigener Vermittlungs- und Relay-Dienst, weil Mobilnetze Direktverbindungen oft blockieren |
| Versionsprüfung | Host und Gast brauchen exakt denselben Build | Lockerer, weil in Stores nicht alle gleichzeitig aktualisieren |
| Spielstand | Nur Bestenliste und Einstellungen im `localStorage`; ein Lauf wird nicht gespeichert | Dauerhafter Speicher, Fortsetzen unterbrochener Läufe |
| Zugang nur per Code | Fehlt | Über Store-Testkanäle oder eigene Code-Abfrage |
| Store-Unterlagen | Fehlen | App-Icon, Name, Datenschutzerklärung, Altersfreigabe |

## 11. Mit mehreren Menschen und KIs arbeiten

Die Regeln stehen in `AGENTS.md`. `CLAUDE.md` und `GEMINI.md` verweisen nur darauf, damit jede KI dasselbe liest. Neue Regeln kommen immer nach `AGENTS.md`.

**Ablauf**
1. `git pull`, damit alle vom selben Stand ausgehen.
2. Ein Thema bekommt ein Issue, das einer Person zugewiesen wird, und einen eigenen Branch.
3. Fertige Arbeit kommt als Pull Request mit `Fixes #NUMMER`.
4. `main` ist geschützt: Ist die Prüfung `test` grün, mergen Tim oder Lenny. Der Merge geht sofort live.

**Claude auf GitHub:** `.github/workflows/claude.yml` startet Claude, wenn jemand mit Schreibrechten `@claude` in einem Issue oder Pull Request schreibt. Es läuft über das Abo von Tim (Geheimnis `CLAUDE_CODE_OAUTH_TOKEN`, ein Jahr gültig, danach mit `claude setup-token` erneuern).

**Damit nichts verloren geht**
- Kurz absprechen, wer woran sitzt. Nicht zwei Personen oder KI-Sitzungen gleichzeitig an denselben Dateien.
- Ein Chat ist nur für diese Sitzung sichtbar. Beschlüsse gehören nach `docs/ENTSCHEIDUNGEN.md`.
- Am Ende einer Sitzung ist alles Wichtige committet, damit die nächste KI es vorfindet.

**Werkzeuge:** Arbeiten am Projekt können nur Programmier-Werkzeuge, die im Ordner laufen (Claude Code, Codex, Gemini CLI). Normale Web-Chats sehen das Projekt nicht.
