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
4. **Fondue bleibt ein eigenes Spiel.** Keine Namen, Figuren, Grafik, Musik, Level oder Texte von Knights Onrush (`CLAUDE.md`, E-001). Der Name des Spiels steht nur in `src/config/game.ts`.

## 3. Wo liegt was

| Ordner / Datei | Aufgabe |
|---|---|
| `src/config/enemies.ts` | Werte, Namen, Tipps aller 11 Gegner (`ENEMIES`), Sonderwerte (`BEHAVIOUR`) |
| `src/config/shop.ts` | Upgrades und Preise (`SHOP_ITEMS`), Reiter (`SHOP_TABS`), Torstärke (`GATE_HP`), Waffenwerte (`WEAPONS`), `ECONOMY` |
| `src/config/waves.ts` | Tageslänge und Gegneranzahl (`DAY`), Schwierigkeit (`DIFFICULTIES`), Koop-Faktor (`COOP`), Landschaftswechsel |
| `src/config/tuning.ts` | Wurfgefühl: Standardwerte, Voreinstellungen, Regler im Panel |
| `src/config/world.ts` | Geometrie: Bodenlinie, Tor, Kessel, Haken, `CHAR_SCALE` |
| `src/sim/sim.ts` | Alle Spielregeln |
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
| `src/render/hud.ts` | Gold, Torleiste, Waffen-Icons |
| `src/render/background.ts` | Himmel und Parallax-Ebenen |
| `src/render/textures.ts` | Macht beim Start aus allen SVGs Texturen |
| `src/art/characters/` | Eine Datei pro Gegner, Sammlung in `RIGS` (`index.ts`), Bausteine und Farben in `kit.ts` |
| `src/art/props.ts` | Alles andere: Burg, Tore, Icons, Geschosse (`PROPS`) |
| `src/art/landscapes.ts` | Vier Landschaften mit je vier Ebenen, Wolken |
| `src/audio/sfx.ts` | Soundeffekte aus Code (`SFX_RECIPES`) |
| `src/audio/music.ts` | Musik: Akkorde, Abschnitte, Stile `menu` und `battle` |
| `src/audio/audio.ts` | Abspielen, Lautstärke |
| `src/ui/app.ts` | Alle Bildschirme, Lobby, Shop-Ansicht, Buttons (`render`, `onClick`) |
| `src/ui/content.ts` | Hilfe-Seiten, Lade-Tipps, Credits |
| `src/ui/tuningPanel.ts` | Panel auf F1 |
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
| Lage von Kessel und Haken | `WORLD.cauldron`, `WORLD.perch` |

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
| Waffen auslösen | `activate`, `fireHorn`, `fireStomper`, `launchComet` |
| Was beim Tod passiert (Gold, Opfergabe, Krähe) | `kill` |
| Tagesbeginn und -ende, Tor auffüllen | `startDay`, `endDay`, Ablauf in `step` |
| Kaufen und Ausrüsten | `canBuy`, `buy`, `equip` |

### Aussehen und Klang

| Ziel | Stelle |
|---|---|
| Figur umzeichnen | Datei in `src/art/characters/`; Figuren schauen in der Grafik **nach links** |
| Lauf-, Halte-, Fluganimation | `applyPose` in `src/render/enemyView.ts` |
| Burg, Tor, Icons, Geschosse | `PROPS` in `src/art/props.ts`, Name gleich Texturname |
| Landschaften | `LANDSCAPE_ART` in `src/art/landscapes.ts`, Reihenfolge `LANDSCAPES`, Wechsel `DAYS_PER_LANDSCAPE` |
| Himmelsfarben | `paintSky` in `src/render/background.ts` |
| Blut, Partikel, Explosion | `src/render/effects.ts` |
| Welcher Effekt und Klang bei welchem Ereignis | `handleEvent`, `onImpact`, `onDeath` in `src/render/scene.ts` |
| Handfarben | `HAND_COLORS` in `src/render/scene.ts` |
| HUD-Anordnung | `src/render/hud.ts` |
| Menüfarben und -layout | `src/ui/style.css` |
| Klang eines Effekts | Funktion in `src/audio/sfx.ts`, Zuordnung in `SFX_RECIPES` |
| Musik | `CHORDS`, `SECTION_A`, `SECTION_B`, `STYLES` in `src/audio/music.ts` |

### Texte und Menüs

Spieltexte sind Englisch. Hilfe, Tipps, Credits: `src/ui/content.ts`. Bildschirme: `render` und die `render…`-Methoden in `src/ui/app.ts`. Ein Button trägt `data-a="name"` und wird in `onClick` behandelt.

### Koop

| Ziel | Stelle |
|---|---|
| Verbindungsaufbau, Lobby, Wiedereinstieg | `openRoom`, `onGuestLink`, `joinRoom`, `onHostMessage`, `enterRejoin` in `src/ui/app.ts` |
| Snapshot-Takt, Abbruchzeit | `SNAPSHOT_EVERY_STEPS`, `SILENCE_LIMIT_MS` in `src/game/session.ts` |
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

**Neues Tor:** `SHOP_ITEMS`, `GATE_HP`, Grafik in `PROPS`, die Stufenlisten in `renderGate` (`src/render/scene.ts`) und `currentGateId` (`src/sim/sim.ts`).

**Neue Torwaffe:** `SHOP_ITEMS` mit Reiter `horns`, Eintrag in `WEAPONS.horn`, neuer `kind`-Fall in `fireHorn`, Icon in `PROPS` und `HORN_ICONS` (`src/render/hud.ts`).

**Ganz neuer Waffentyp:** `WeaponSlot`, `WEAPON_SLOTS`, `SHOP_TABS`, `WEAPONS`, `tierOf`, `activate`, `ICONS` (`src/render/hud.ts`). Braucht er eine Zielgeste: `HandMode`, `MODES` in `src/net/snapshot.ts`, `MODE_TO_SLOT` in `src/render/scene.ts`, Hilfe-Seite ergänzen.

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

5. **Nicht jede Zahl steht in der Konfiguration.** In `src/sim/sim.ts`: Bolzengeschwindigkeit 1250 in `activate`, Hakensperre 2,3 s in `tryPerch`, Fluchttempo 1,9 in `updateEnemy`, Krähe stirbt schon bei 0,4 × `lethalImpact` in `updateAir`. In `src/sim/spawn.ts`: garantierte Anzahl neuer Gegner, Wachstum der Obergrenze um 15 % pro Tag.
6. **Einige Einstellungen wirken derzeit nicht.** `DAY.perDayAfterCap` ist gleich `DAY.perDay`, also bremst `softCapDay` nichts. `CANCEL_COOLDOWN` wird nirgends verwendet.
7. **Größen:** `radius` und `height` in `ENEMIES` sind Weltmaße und enthalten `CHAR_SCALE` bereits. Wer eine Figur größer zeichnet, muss sie dort mit anpassen, sonst passt die Greiffläche nicht mehr.
8. **Balance-Bots sind Näherungen.** Sie zielen ohne Bewegung und besiegen Yetis nur mit Waffen. Die Zahlen sagen, ob eine Änderung in die richtige Richtung geht, nicht wie ihr tatsächlich abschneidet.
9. **Tests dürfen nie abgeschwächt werden.** Ändert sich eine Zahl, ist es in Ordnung, das Szenario eines Tests anzupassen; die Prüfung selbst bleibt. Ausfälle erst erklären, nicht einfach wiederholen.
10. **Testläufe überschreiben `docs/screenshots/`.** Das erzeugt Git-Änderungen ohne inhaltliche Bedeutung.

## 7. Testen und veröffentlichen

| Befehl | Prüft | Dateien |
|---|---|---|
| `npm run dev` | Spiel lokal auf http://localhost:5173 | |
| `npm test` | Regeln, Wurf, Sitzung, Klänge, Latenz-Simulator | `tests/unit/` |
| `npm run test:e2e` | Browser: Ablauf, Koop, Relay, Touch, Landschaften | `tests/e2e/` |
| `npm run balance` | Bots spielen, schreibt `docs/balance-latest.md` | `tests/balance/` |
| `npx playwright test --config playwright.perf.config.ts` | FPS mit 200 Gegnern in Edge | `tests/perf/` |
| `npx playwright test --config playwright.live.config.ts` | Veröffentlichte Seite | `tests/live/` |

Veröffentlichen: alle Tests grün, dann `git push origin main`. Die Pipeline steht in `.github/workflows/deploy.yml`. Danach mit `EXPECT_BUILD=<kurzer Hash>` die Live-Tests laufen lassen.

Die Testregeln gelten weiter: Browser-Tests laufen mit Playwright. Firefox und das volle Playwright-Chromium startet Windows auf diesem Laptop nicht (E-011), Edge läuft über `channel: 'msedge'`.

## 8. Hilfen beim Ausprobieren

- **F1:** Tuning-Panel. **F3:** Debug-Anzeige mit FPS, Rolle, Ping, Build.
- **Koop allein testen:** zwei Tabs mit `http://localhost:5173/?net=loopback`, im zweiten `&join=CODE` anhängen. Mit `&lat=45&jit=20&loss=0.02` kommt simulierte Latenz dazu.
- **Fester Zufall:** `?seed=123`.
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
| Bedienung | Geht es gut mit der Maus? Bleibt ein Weg für Touch offen? | Abschnitt 10 |
| Aussehen | Passt es zum Stil: gleiche Farben, Umrisse, Schriften? Überlappt etwas, wird etwas abgeschnitten? | `PAL` in `src/art/characters/kit.ts`, `src/ui/style.css`; Screenshot ansehen |
| Rückmeldung | Hat etwas Neues Klang, Effekt und einen Hinweis für Spielende? | `handleEvent`, `SFX_RECIPES` |
| Leistung | Bleibt es flüssig mit 200 Gegnern? | FPS-Test |
| Tests | Ist das Neue durch einen Test abgesichert und alles grün? | Abschnitt 7 |
| Dokumente | Stimmen Handbuch, `docs/GDD.md`, `docs/features.json` noch? Entscheidung festgehalten? | `docs/ENTSCHEIDUNGEN.md` |

Am Ende steht ein kurzer Bericht für Tim und Lenny: was geändert wurde, was dadurch mitgeändert wurde, wo es liegt, was geprüft wurde und was nur Menschen beurteilen können, etwa Spielgefühl und Klang.

## 10. Endziel: App Store und Google Play

Das Spiel soll in beide Stores, zuerst privat. Noch ist nichts davon gebaut.

**Aktuelle Phase: Alpha am Laptop.** Tim und Lenny testen zu zweit am Laptop, Freunde kommen erst mit späteren Versionen dazu. Das Handy wird schrittweise wichtiger, sobald das Spiel größer und besser steht.

**Geräte:** Tim: ASUS Zenbook (Windows), iPhone 16. Lenny: Windows-Laptop, Linux-Laptop, Android-Handy. Es gibt keinen Mac, iOS-Builds brauchen deshalb später einen Cloud-Dienst mit macOS. Getestet wird dann per TestFlight auf dem iPhone, Android direkt auf Lennys Handy.

**Für neue Funktionen schon jetzt**
- Nichts darf so gebaut werden, dass es nur mit Hover, Rechtsklick oder Tastatur überhaupt möglich ist. Eine Touch-Variante muss sich ergänzen lassen.
- Keine neue Abhängigkeit, die nur im Desktop-Browser läuft.

**Beim Übergang zum Handy dazu:** Bedienelemente groß genug für Finger, Layout im Querformat auch mit Notch, Prüfung auf echten Geräten.

**Bekannte Lücken bis zur Store-Version**

| Thema | Heute | Nötig |
|---|---|---|
| Verpackung als App | Nur Webseite | Hülle um das Web-Spiel, voraussichtlich Capacitor |
| Bedienung ohne Maus | Touch-Grundtest vorhanden; Waffennamen nur bei Hover, Pause und Waffen auch per Taste, Abbrechen per Rechtsklick, Esc oder erneutem Tippen aufs Icon; Hilfe-Texte sind mausbezogen | Auf echten Geräten prüfen und anpassen |
| Leistung | Nur auf dem Laptop gemessen | Auf echten Handys messen |
| Koop über Mobilfunk | Direktverbindung über STUN, öffentlicher PeerJS-Dienst, kein TURN | Eigener Vermittlungs- und Relay-Dienst, weil Mobilnetze Direktverbindungen oft blockieren |
| Spielstand | Nur Bestenliste und Einstellungen im `localStorage`; ein Lauf wird nicht gespeichert | Dauerhafter Speicher, Fortsetzen unterbrochener Läufe |
| Zugang nur per Code | Fehlt | Über Store-Testkanäle oder eigene Code-Abfrage |
| Store-Unterlagen | Fehlen | App-Icon, Name, Datenschutzerklärung, Altersfreigabe |
