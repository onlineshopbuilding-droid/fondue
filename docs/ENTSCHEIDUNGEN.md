# Entscheidungen

## E-001 – Fondue ist ein eigenes Spiel (Vorrang vor dem Auftrag)
Fondue ist das eigene Spiel von Tim und Lenny. Es ist keine Nachbildung eines anderen Spiels.
Eigen sind Welt, Figuren, Regeln, Name, Grafik, Musik, Level, Look, Bildschirmaufbau, Texte und Itemnamen. Greifen und Werfen, Tagesablauf, Markt, zwei Währungen, Waffen mit Abklingzeit und Eskalation sind für Fondue entworfen und über viele Runden weiterentwickelt.
Folgen für die Arbeit:
- Neue Inhalte entstehen aus Fondues eigener Welt, nichts wird aus anderen Spielen übernommen.
- Eigene Gegner- und Itemnamen, eigener HUD-Aufbau und eigene Texte.
- Screenshots werden gegen das GDD geprüft.
- features.json: Punkte 7, 12, 18 und 25 verweisen mit `hinweis` auf diesen Eintrag.

## E-002 – Energieeinstellungen nicht verändert
Claude ändert keine Systemeinstellungen, daher kein powercfg. Stattdessen hält die App-Funktion „keep awake“ den Laptop wach.
Gelesener Stand am 09.11.2026 (Balanced): Standby am Netzteil = nie, Ruhezustand am Netzteil = nie, also bereits passend. Das Verhalten beim Zuklappen ließ sich nicht auslesen. Der Deckel muss offen bleiben. Zurücksetzen entfällt.

## E-003 – Öffentliches Repo
`gh api user` liefert keinen Tarif (Token ohne `user`-Scope), GitHub Pro ist also nicht bestätigt. Darum ein öffentliches Repo; es enthält nichts Geheimes.

## E-004 – GitHub-Konto
Verwendet wird das auf dem Laptop eingeloggte Konto `onlineshopbuilding-droid`, Git-Name und -E-Mail waren dort schon gesetzt.

## E-005 – Eigene Welt
Alpenfestung links, Räuberarmee von rechts, Käsekessel und Adlerhorst als Opferstätten, Filz-Puppen-Stil. Alle Namen sind eigen. Das passt zum Namen Fondue und gibt dem Spiel seinen eigenen Charakter.

## E-006 – Kalibrierung
Schwerkraft bewusst niedrig mit 3400 px/s², damit Würfe lesbar bleiben. Lauftempo eher langsam, damit Figuren greifbar sind. Details in docs/GDD.md.

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

## E-013 – Werte nach dem dritten Test
Wurfgeschwindigkeit auf 1700 px/s begrenzt, damit Würfe im Bild bleiben. Messfenster 110 ms mit flacherer Gewichtung, damit abbremsende Bewegungen nicht verschluckt werden. Rad-Treffer begrenzt, Stomper und Dachgeschütz verstärkt. Gegnerische Bomben treffen nur noch das Tor, zurückgeworfene auch Räuber.

## E-014 – „Gegner werfen andere um“ bleibt aus
Der dritte Tester hat es vorgeschlagen. Der Auftrag sieht es standardmäßig nicht vor. Der Schalter steht im Tuning-Panel; die Arcade-Voreinstellung hat ihn an.

## E-015 – Unzuverlässiger Koop-Test mit Latenz aufgeklärt
In der Abschlussrunde schlug der Koop-Test mit simulierter Latenz fehl, wie schon einmal in der Nacht. Zwei getrennte Ursachen, beide nicht im Netzcode des Spiels:
1. Der Latenz-Simulator `withLatency` setzte pro Nachricht einen eigenen Timer. Browser schneiden Verzögerungen auf ganze Millisekunden ab, so konnte eine spätere Nachricht eine frühere überholen. Kam die erste Meta-Nachricht vor `start` an, blieb der Gast ohne Meta. Echte Kanäle (WebRTC zuverlässig, WebSocket) liefern geordnet, das Spiel selbst war also nicht betroffen. Der Simulator hat jetzt eine Warteschlange; `tests/unit/transport.test.ts` belegt den Fehler und die Behebung.
2. Der Test griff den Gegner ganz rechts, auch wenn ein Nachbar näher am Griffpunkt stand. Das Spiel nimmt dann richtigerweise den Nachbarn. Der Test wählt jetzt einen freistehenden Gegner. Die Prüfung `toEqual([1])` ist unverändert. Beleg über eine Messung mit 120 Griffen; die Zuordnung zum einzelnen Fehlschlag ist wahrscheinlich, nicht bewiesen. Danach 10 von 10 Wiederholungen grün.

## E-016 – Gate Mortar feuert eine echte Granate
Bisher explodierte der Mörser sofort beim Loslassen. Jetzt fliegt eine Granate vom Burgdach in 0,6 s (`WEAPONS.horn.mortar.flightSeconds`) im Bogen zum Ziel, der Schaden fällt erst beim Einschlag. Eine reine Grafik über der sofortigen Explosion hätte nicht zusammengepasst. Bei 0,6 s bleiben normale Räuber im Explosionsradius, schnelle Goat Riders muss man vorhalten; ein neuer Lade-Tipp und die Shop-Beschreibung sagen das. Der bestehende Test wartet nun auf den Einschlag statt auf den sofortigen Tod, die Prüfung selbst ist gleich. Erste Änderung nach dem Stimmigkeits-Check aus `docs/HANDBUCH.md`.

## E-017 – Anpassung an Handys und alle Bildschirmformate
Das Spiel ist für das Querformat gebaut, hochkant erscheint ein Hinweis zum Drehen. Die Welt bleibt 1280 × 720; nur die Kamera zeigt auf breiteren Bildschirmen links mehr Landschaft und auf Tablets oben mehr Himmel. Der Ausschnitt wächst nach links und oben, weil rechts die Gegner starten und das Spiel sonst ihr Auftauchen zeigen würde. Grenzen: Seitenverhältnis 4:3 bis 2,8:1, darüber hinaus bleiben Balken. Das HUD wächst auf kleinen Bildschirmen auf mindestens 44 Pixel Bedienfläche. Hover-Tooltips und Tastenziffern entfallen auf Touch-Geräten, vor der ersten Berührung wird keine Hand gezeigt, und die Zielhilfe liegt nun über der Hand. Spieltexte sprechen von „tap“ statt „click“. Die Einblend-Animation der Menüs läuft nur noch beim Wechsel des Bildschirms, damit der Markt beim Kaufen nicht flackert. Handy-Tests sind fester Teil von `npm run test:e2e`.

## E-018 – Gemeinsame Regeln für alle KIs, Veröffentlichen nur auf Zuruf
Tim und Lenny wollen mit Claude, ChatGPT und Gemini am selben Projekt arbeiten. Die Regeln stehen deshalb in `AGENTS.md`; `CLAUDE.md` und `GEMINI.md` verweisen nur darauf. Das ersetzt die frühere Regel, dass fertige Änderungen in der Alpha ohne Rückfrage live gehen: Gepusht wird nur, wenn Tim oder Lenny es sagt. Bewusst ohne Pull Requests und Schutz von `main`, weil es noch nichts zu verlieren gibt. Grüne Tests bleiben Bedingung.

## E-019 – Android-Testapp als Hülle um die Live-Seite
Die Testapp nutzt Capacitor und lädt die veröffentlichte Seite (`server.url` in `capacitor.config.ts`). Jede Veröffentlichung erreicht sie dadurch ohne neuen App-Bau. Für den Store ist das nicht geeignet, dort muss das Spiel fest in die App. Der Android-Projektordner wird nicht versioniert, sondern von `npm run android:prepare` erzeugt und von `scripts/android-setup.mjs` angepasst (nur Querformat, Vollbild). Gebaut wird in `.github/workflows/android.yml` auf GitHub, weil es auf Tims Laptop weder Java noch Android-SDK gibt. Die APK liegt im Release `android-latest`. Die Build-ID ist neutral gehalten, weil der Spielname nur in `src/config/game.ts` stehen soll.

## E-020 – Arbeit über Issues und Pull Requests, main geschützt
Tim und Lenny wollen gemeinsam über GitHub-Issues arbeiten und Claude dort mit `@claude` ansprechen. Das ersetzt die direkte Arbeit auf `main` aus E-018. `main` nimmt Änderungen nur noch per Pull Request an, und die Prüfung `test` muss grün sein. Das gilt auch für Admins. Claude darf auf GitHub Pull Requests stellen, aber nie mergen. Die Regeln stehen weiter nur in `AGENTS.md`, `CLAUDE.md` verweist dorthin. Authentifiziert wird über das Abo von Tim statt über einen kostenpflichtigen API-Schlüssel.

## E-021 – Spielfeld wird breiter, die Burg steht immer links
Auftrag 4.3. Die Burg steht auf jedem Bildschirm am linken Rand (`offsetX` ist immer 0), links von ihr gibt es keine Welt mehr. Die zusätzliche Breite vergrößert das Spielfeld nach rechts, von 1280 bis 1760 Welteinheiten (`FIELD` in `src/config/world.ts`).

Beide Bedingungen aus dem Auftrag sind so gelöst:
- **Koop:** Der Bildschirm des Hosts bestimmt beim Spielstart die Feldbreite (`meta.fieldW`), beide haben exakt dasselbe Feld. Ist der Gast schmaler, sieht er das ganze Feld und oben mehr Himmel. Ist er breiter, wird oben etwas Himmel abgeschnitten, höchstens bis zu einer Sichthöhe von 600 Einheiten. Reicht das nicht, zeigt der Rest rechts Kulisse. Solo folgt das Feld dem Bildschirm auch beim Drehen des Handys.
- **Fairness:** Gegner laufen auf breiterem Feld schneller (`fieldSpeedFactor`), sie holen aber nur die Hälfte der zusätzlichen Strecke auf (`FIELD.speedCompensation`). Bei voller Angleichung wäre die Laufzeit überall gleich gewesen, die Bots verloren dann aber auf breitem Feld ein Drittel ihrer Tage, weil schnelle Gegner schwerer zu treffen sind. Die Messung steht in `docs/balance.md`. Damit Gegner nie sichtbar auftauchen, starten sie etwas außerhalb des Felds und laufen zügig herein.

Verworfen: reine Kulisse rechts bei fester Welt. Ein Viertel eines Handybildschirms wäre totes Gebiet gewesen, in dem man nichts greifen kann, mit einer unsichtbaren Wand mitten im Bild.

## E-022 – Zielen: Das Band spannt sich in Schussrichtung
Auftrag 4.5 beschreibt das Zielen „wie bei einer Schleuder“. Eine gespiegelte Schleuder geht hier nicht: Die Burg steht am linken Rand, nach links ist kein Platz zum Zurückziehen, auf dem kleinsten Handy wären es rund 50 Pixel. Deshalb zieht man von der Waffe weg in Richtung der Räuber. Das Band spannt sich zwischen Waffe und Hand, die Richtung bestimmt die Schussrichtung, die Länge bestimmt Reichweite und Tempo. Während des Ziehens zeigt eine gestrichelte Linie die Bahn und ein Ring den Einschlag. Zurück zur Waffe ziehen bricht ab. Die Regeln dazu stehen in `src/sim/aim.ts`, die Zahlen in `AIM` (`src/config/shop.ts`). Spielen Tim und Lenny das anders, lässt sich das an einer Stelle ändern.

Die Armbrust trifft jetzt, wohin man zielt, die automatische Zielsuche ist weg. Frost Horn und Dragon Bellows fliegen ebenfalls als gezielte Geschosse. Die Zifferntasten 1 bis 5 bleiben auf dem Laptop als Zusatz: Bei gezielten Waffen wird die Waffe aktiviert, der nächste Klick feuert mit derselben Rechnung.

## E-023 – Kometen und Stomper: zweimal tippen
„Comets werden nur angetippt“ lässt zwei Lesarten zu. Gewählt: Tippen auf den Schrein, dann Tippen auf die Stelle der Straße. Das ist reines Tippen, nimmt aber die Entscheidung nicht weg, wo die Waffe einschlägt. Stomper funktionieren genauso. Das frühere Schwingen des Kometen entfällt; als Ausgleich sind Radius und Schaden fest um 45 % höher (`WEAPONS.comet.bonus`).

## E-024 – Griffzonen an der Burg
Eine Berührung auf einer Waffe wird auf dem Gerät erkannt und als eigener Befehl `pressSlot` geschickt. Sie greift nie einen Gegner. Die Zonen sind Kreise um die Waffen, wachsen auf kleinen Bildschirmen auf mindestens 54 Pixel Durchmesser und enden vor der Straße (`slotZoneMaxX`), sodass ein Gegner am Tor immer greifbar bleibt. Der Gast braucht dadurch keine doppelte Regel.

## E-025 – Tagesende: Die Regel „Rückzug“ bleibt als Schalter
Nach Auftrag 4.2 kämpfen die Gegner bis zum Tod. Die alte Regel ist für den Vergleich als Experiment-Schalter `dayEnd` erhalten. Noch nicht gespawnte Gegner kommen nach Sonnenuntergang nicht mehr.

## E-026 – Experiment-Schalter und Schnellstart
Schalter stehen in `src/config/flags.ts`. Ein Eintrag genügt, dann erscheinen sie im Entwickler-Menü, das Lesen in den Regeln geht über `sim.flag('id')`. Die Werte sind Teil von `Meta`, im Koop gelten also die des Hosts. Der gewählte Schnellstart-Tag lebt nur bis zum Neuladen der Seite, damit niemand versehentlich dauerhaft mit Schnellstart spielt. Solche Läufe zählen nicht für die Bestenliste.

## E-027 – Bogenwaffen: Die Zuglänge bestimmt den Einschlag
Nach dem Spieletest. Vorher hingen Reichweite und Winkel zusammen: Weiter und steiler gezogen landete der Mörser kürzer, und ein voller Zug schoss über das Feld hinaus. Jetzt bestimmt nur die Länge des Zugs den Einschlagpunkt, von 90 Einheiten vor der Waffe bis zum Feldende. Die Richtung bestimmt, wie hoch und wie lange der Schuss fliegt. Die Vorschau zeigt genau das, was passiert.

## E-028 – Koop bezahlt weniger Gold pro Kill
Zu zweit gibt es 70 % des Goldes pro Gegner (`COOP.goldFactor`), und früh 2,3-mal so viele Gegner wie allein. Ohne diese Kürzung war der mittlere Bot im Koop deutlich zu stark, weil das gemeinsame Gold doppelt so schnell wuchs. Die Details stehen in `docs/balance.md`.

## E-029 – Zielhilfe am Haken nur für wirklich gezielte Würfe
Lange Würfe an den Haken verfehlten fast immer, weil die Schwerkraft den Gegner unter den Haken zieht. Ein Wurf, der klar in Richtung Haken geht, wird deshalb sanft hingelenkt (`WORLD.perch.assistRadius`, `headingCos`). Kurz am Haken vorbei fliegt er weiter, damit normale Würfe nicht abgefangen werden. Das Tragen an den Haken rastet weiter großzügig ein.

## E-030 – Browser-Tests standardmäßig auf drei Bildschirmen
Tim hat am 09.11.2026 entschieden: Laptop, iPhone 16 und Android reichen für die laufende Prüfung, die anderen Größen kommen später. Sie bleiben im Code und laufen mit `ALL_SCREENS=1`. Android ist im Test ein aktuelles breites Gerät mit 960 × 400.

## E-031 – Grafik-Überarbeitung: ein Licht, keine Masken, echte Bildschirmschärfe
Tim hat am 10.11.2026 eine deutlich detailliertere Grafik beauftragt, ohne dass das Wesentliche untergeht. Der Stil bleibt (Filzfiguren mit dunkler Umrisslinie, warme Palette), dazu kommen:

- **Ein Licht für alles:** Licht von links oben, Schatten nach rechts unten, Schatten kühl, Lichter warm. Die Bausteine dafür stehen in `src/art/shade.ts` (`lit`, `litTube`, `crescent`, `within`, `tone`). Figuren haben den höchsten Kontrast, Hintergründe werden mit der Entfernung heller und dunstiger.
- **Keine SVG-Masken und kaum Filter:** Browser malen jede Maske in eine Ebene so groß wie die ganze Textur. Mit Masken dauerte der Start auf dem Laptop mehrere Sekunden länger. Schattierungen laufen deshalb über Clip-Pfade (`crescent`) oder versetzte Linien (`crescentStroke`). Einziger Filter: der weiche Wandschatten der Waffen an der Burg (kleine Texturen).
- **Echte Bildschirmschärfe:** Das Spielbild wurde bisher in Weltgröße gezeichnet und auf dem Handy hochgezogen, alles wirkte weich. Jetzt hat die Zeichenfläche so viele Pixel wie das Gerät, höchstens doppelt so fein wie die Welt und höchstens 2560 × 1440 (`renderScale` in `src/render/viewport.ts`). Am normalen Laptop ändert sich nichts.
- **Laden im Hintergrund:** Beim Start entstehen nur die Texturen für die Wiese und die erste Burgstufe. Die drei anderen Landschaften und die Burgstufen 1 bis 4 folgen im Menü nacheinander (`src/render/textures.ts`). Bis eine fertig ist, bleibt das Bild davor stehen. Geladen wird eine Textur nach der anderen mit 40 ms Pause, weil eine auf einmal gestartete Gruppe auf langsamen Rechnern die Seite sekundenlang blockierte (in CI riss dabei die Koop-Verbindung ab). Dazu zählt die Koop-Verbindung die Zeit nicht mehr als Stille, in der die eigene Seite eingefroren war.
- **Landschaften in Weltgröße:** Die Landschaftsebenen und Wolken liegen wie vor der Überarbeitung in einfacher Auflösung vor (`LAND_SCALE`, `CLOUD_SCALE` = 1). Feinere Ebenen sahen auf dem Handy etwas schärfer aus, aber das Verkleinern in jedem Bild war ohne Grafikkarte (GitHub-Testrechner, schwache Handys) zu langsam, und das Laden dauerte länger. Figuren, Burg und Requisiten bleiben doppelt fein (`TEX_SCALE`).
- **Messwerte (Entwicklungsserver, Laptop, Edge):** Start 5,3 s statt 3,7 s, 60 Bilder pro Sekunde auf Laptop- und iPhone-Größe. Im Testbrowser ohne Grafikkarte etwa 10 s statt 6 s.
- **Gefundener Fehler:** Phaser 4 wählt im Shader die Textur über einen exakten Zahlenvergleich. Manche Grafikchips rechnen dort minimal ungenau, dann verschwinden ganze Bildblöcke einer Figur (beim Yeti sichtbar als weiße Flächen mit geraden Kanten). `src/render/glFix.ts` rundet den Wert vor dem Vergleich.

---

Ab hier: Entscheidungen des großen Updates (Auftrag `docs/AUFTRAG-GROSSES-UPDATE.md`). Was Tim und Lenny noch bestätigen sollen, steht zusätzlich in `docs/OFFENE-ENTSCHEIDUNGEN.md`.

## E-032 – Der alte Stand bleibt unter /classic/ spielbar
Vor dem Umbau wurde der Stand von `main` mit dem Tag `v0-alpha` und dem Branch `classic` gesichert. `.github/workflows/deploy.yml` baut seitdem drei Dinge in einen Ordner: das Spiel von `main` unter `/fondue/`, den Branch `classic` unter `/fondue/classic/` (eigener Basis-Pfad `--base=/fondue/classic/`) und die Entwickler-Übersicht unter `/fondue/dev/`. Warum: Tim und Lenny können während und nach dem Umbau die alte Version spielen, und ein Zurückrollen ist jederzeit möglich. Host und Gast müssen dieselbe Adresse öffnen. Die Classic-Version liest weiter ihre alten Speicher-Schlüssel, das neue Profil fasst sie nie an (E-035).

## E-033 – Fünf Slots, eine Waffe je Slot, nur antippen
Die Burg hat fünf Waffenplätze mit festem Typ: Mauerfuß, Mauer, Torarm, Schrein, Turmdach (`SLOTS` in `src/config/slots.ts`). Zu jedem Typ gibt es drei oder vier Waffen, insgesamt 16, jede mit fünf Stufen (`WEAPONS` in `src/config/weapons.ts`). Pro Slot steckt genau eine Waffe; man muss sich entscheiden. Alle Waffen werden nur noch angetippt, das Ziehen zum Zielen (E-022, E-027) ist entfernt. Jede Waffe wählt ihr Ziel selbst nach der Spalte `target`: `front` (nächster am Tor), `crowd` (dichteste Gruppe), `tough` (meiste Lebenspunkte) oder `none` (wirkt auf die ganze Straße). Warum: Zielen neben dem Werfen war am Handy zu aufwendig. Das Verhalten je Waffenart steckt in einer kleinen Klasse unter `src/sim/weapons/behaviours/`, die Zielwahl in `src/sim/weapons/targeting.ts`. Jede Waffe lässt sich mit `enabled: false` abschalten.

## E-034 – Modi als Klassen, Level als Daten, Welt als Paket
Tutorial, Kampagne und Endlos sind Klassen hinter der Schnittstelle `GameMode` (`src/modes/mode.ts`): Sie bauen einen Lauf (`buildRun` → `RunSetup`) und zahlen am Ende die Belohnung aus (`reward`). Die Simulation bekommt nur Regeln (`RunRules`) und einen Tagesplaner (`DayPlanner`) und weiß nichts von Kampagne oder Endlos. Ein Level ist ein Datensatz (`LevelDef` in `src/config/worlds/types.ts`), erzeugt in `src/config/worlds/fondue/campaign.ts`. Fondue ist Welt 1 (`src/config/worlds/fondue/world.ts`), das Verzeichnis `WORLDS` kann weitere aufnehmen. Warum: Neue Modi und Welten sollen ohne Umbau dazukommen. Reserviert sind die Namen `coopCampaign`, `quickPlay` und `madness` (`RESERVED_MODES` in `src/modes/index.ts`).

## E-035 – Profil mit Versionsnummer, Migrationen und Export-Code
Der dauerhafte Spielstand ist die Klasse `Profile` (`src/profile/profile.ts`) unter dem Schlüssel `fondue.profile`. Er trägt eine Versionsnummer (`PROFILE_VERSION`); ein späteres Update hängt in `MIGRATION_STEPS` (`src/profile/migrations.ts`) einen Schritt an, statt alte Profile zu verwerfen. Die alten Schlüssel `fondue.settings.v1` und `fondue.scores.v1` werden einmalig gelesen und nie verändert. Beschädigte Daten werden bereinigt (`src/profile/sanitize.ts`), nie führen sie zum Absturz. Gespeichert wird über die Schnittstelle `ProfileStore` (`src/profile/store.ts`, heute `LocalProfileStore` im Browser), damit später App-Speicher oder ein eigener Dienst passen. Export und Import gehen als Textcode `FONDUE1.…` mit Prüfsumme (`src/profile/codec.ts`), in den Options. Warum: Fortschritt muss Neuladen und Updates überdauern und auf ein anderes Gerät umziehen können.

## E-036 – Jedes Level beginnt frisch und steigt sanft ein
Jedes Kampagnen-Level beginnt mit Gold 0, Offerings 0, Holztor und leeren Slots (`freshStart` in `src/sim/rules.ts`). Ausnahme: Level 1 startet mit 60 Gold (`LEVEL_OVERRIDES[1].startGold`), damit der Kessel nach Tag 1 sicher bezahlbar ist. Weil man jedes Level mit leeren Händen beginnt, bekommen die Räuber an den ersten drei Tagen nur einen Teil der zusätzlichen Stärke des Levels: 20 %, 55 %, 85 %, danach alles (`CAMPAIGN_SCALING.easeIn` in `src/modes/campaign.ts`, als `Scaling.easeIn` an die Simulation). Ebenso wächst die Zahl der Räuber eines Levels über die Tage (`levelShareDay1`, `levelSharePerDay`, `levelShareMax` in `CURVE`). Warum: Ohne diesen Einstieg verloren die Bots späte Level schon an Tag 1, bevor sie eine Waffe kaufen konnten.

## E-037 – Kampagnen-Kurve flacht ab, jedes zehnte Level ist ein Boss
Die Zahl der Räuber wächst mit der Potenz 0,75 über die Level (`CURVE.countPower` in `src/config/worlds/fondue/campaign.ts`): früh schnell, spät langsamer, so wie die Waffen des Spielers. Die Stärke wächst um 5 % je Level (`powerPerLevel`). Level 10, 20, … 100 sind Boss-Level: ein Tag mehr, am letzten Tag 1,8-mal so viele Räuber (`bossDayCount`), alle 12 % stärker (`bossPower`), dazu übergroße Räuber (`BOSS_BIG`, Werte in `BEHAVIOUR.big`) und je nach Level ein Massenansturm (`BOSS_EXTRA`). Namen und Sätze der Bosse stehen in `BOSSES` (`story.ts`). Warum: Höhepunkte, die mit den vorhandenen Mechaniken auch allein fair bleiben.

## E-038 – Sterne: volle Sterne nur beim ersten Sieg, Gast bekommt die Hälfte
Ein Level bringt beim ersten Sieg 3 Sterne, ein besonderes Level (neuer Gegner, Freischaltung oder Besonderheit) 4, ein Boss-Level 8 (`STARS.level` in `src/config/stars.ts`). Wiederholen bringt nichts (`replayShare: 0`). Ein Koop-Gast bekommt einmal je Level die Hälfte, aufgerundet (`guestShare: 0.5`, gemerkt in `guestStarLevels` im Profil), aber keinen Level-Fortschritt. Jede Belohnung wird über die Lauf-Nummer `runId` nur einmal eingelöst (`Profile.claimRun`). Warum: Farmen durch Wiederholen oder viel Koop soll sich nicht lohnen. Code: `CampaignMode.reward` in `src/modes/campaign.ts`.

## E-039 – Freischalt-Tabelle über die ganze Kampagne
`UNLOCKS` in `src/config/worlds/fondue/unlocks.ts` legt fest, welches gewonnene Level was freischaltet: Kessel von Anfang an, erster Slot und Rolling Wheel mit Level 1, zweite Waffe (Sticky Fondue) mit Level 5, zweiter Slot mit Level 9, alle fünf Slots mit Level 39, Adlerhaken mit Level 32, Hand-Stufe 2 mit Level 14 und 3 mit Level 47, die letzte Waffe (Golden Fondue) mit Level 69; dazu die höchste baubare Torstufe. `syncUnlocks` (`src/modes/unlocks.ts`) gleicht das Profil bei jedem Start ab, damit eine geänderte Tabelle auch alte Profile erreicht. Warum: regelmäßig etwas Neues, ab Level 69 ist alles da, danach zählen Stufen. Der Preis für das erste Freischalten einer Waffe (`STARS.weaponUnlock`) ist 0; dieser Wert wird im Code derzeit nirgends gelesen.

## E-040 – Endlos bietet alles und ist von Anfang an offen
Im Endlos-Modus sind alle Waffen, alle fünf Slots und beide Opferstätten verfügbar, egal wie weit die Kampagne ist (`onlyUnlockedWeapons: false` in `src/config/worlds/fondue/endless.ts`). Endlos ist ab Level 0 spielbar (`availableFromLevel: 0`). Jede Waffe startet im Lauf auf Stufe 1 und wird mit Gold und Offerings bis Stufe 5 verbessert, die Hand ebenso (`tierUpgrades`, `handBuyable` in `EndlessMode.buildRun`). Warum: Tim und Lenny sollen alles testen können. Beide Schalter lassen sich später umlegen; steht auf der Entscheidungsliste.

## E-041 – Endlos mit leichtem Zufall und Meilenstein-Sternen
Jeder Endlos-Lauf würfelt einmal aus seinem Startwert, an welchem Tag jeder Gegner zuerst kommt (Fenster `firstDay`, zum Beispiel Yeti Tag 13 bis 17) und ob an diesem Tag einer mehr kommt (`extraChance`, Yeti 0,2). Die Tageszahl schwankt um ±10 % (`countSpread`). Gewürfelt wird mit dem festen Zufallsgenerator der Simulation (`endlessRolls` in `src/modes/endlessPlanner.ts`), gleicher Startwert ergibt denselben Lauf. Sterne gibt es einmalig je Schwierigkeit und Meilenstein-Tag (`milestones`, `Profile.claimEndlessMilestone`). Warum: Abwechslung ohne Glücksspiel, und Sterne für gute Läufe, die sich nicht wiederholt abholen lassen.

## E-042 – Gewicht und Hand-Stufe
Jeder Gegner hat ein Gewicht `mass` (Pothelm 1, Keg Hauler 1,3, Goat Rider 2, Yeti 5, Siege Cart 9 und nicht greifbar). Die Wurfgeschwindigkeit wird mit (Handstärke / Gewicht) hoch 0,5 multipliziert, nie über 1 und nie unter 0,45 (`HAND_RULES` in `src/config/hand.ts`, `throwFactor` in `src/sim/physics.ts`). Schwere Gegner folgen der Hand auch träger (Feder mal Stärke / Gewicht, mindestens 0,3, `followFactor`). Die Hand hat drei Stufen mit Stärke 1, 1,5 und 2,2 (`HANDS`). Host und Gast rechnen mit denselben Funktionen aus `physics.ts` (Falle 4). Warum: Schwere Gegner sollen sich schwer anfühlen, ein kräftiger Wisch muss aber jeden greifbaren Gegner tödlich werfen können.

## E-043 – Yeti-Regel: Hand-Stufe 3 hebt ihn allein, zwei Hände gemeinsam
Ein Yeti verlässt den Boden nur, wenn die Hände an ihm zusammen mindestens Stärke 2 haben (`HAND_RULES.yetiLift`, `Hands` in `src/sim/hands.ts`; ein übergroßer Boss-Yeti braucht das 2,4-Fache). Allein schafft das nur Hand-Stufe 3 (Stärke 2,2), zu zweit genügen zwei Hände der Stufe 1. Zu schwache Hände ziehen ihn nur ein Stück zurück. Warum: Der Yeti bleibt etwas Besonderes, wird aber mit viel Fortschritt auch allein werfbar. Das Popup „New enemy“ sagt es richtig (`ENEMY_POPUPS.yeti` in `story.ts`). Hinweis: Das ältere Feld `ENEMIES.yeti.tip` (nur noch auf der Entwickler-Übersicht zu sehen) sagt noch „One hand cannot lift a Yeti“.

## E-044 – Keg Hauler schütteln statt antippen
Das Fass löst sich nur noch, wenn man den Keg Hauler hochhebt und hin und her schüttelt: mindestens 4 Richtungswechsel, je mindestens 36 Einheiten Handweg, innerhalb von 1,6 s (`BEHAVIOUR.kegShake` in `src/config/enemies.ts`). Erkannt wird das auf dem Gerät (`src/input/shake.ts`) und als Befehl `shake` an den Host geschickt, der nur prüft, ob die Hand einen Keg Hauler mit Fass hält. Das Fass fällt senkrecht herunter und explodiert unten; dasselbe am Adlerhaken. Ein geworfener Keg Hauler platzt schwächer als ein Fass (`carrierBlast`: 75 % Radius, 60 % Schaden). Warum: Der kurze Tipp war zu stark.

## E-045 – Gruppen-Waffen zählen zähe Gegner mehrfach
Waffen mit dem Ziel „dichteste Gruppe“ zählen einen Yeti wie 5 Räuber, einen Siege Cart wie 3, einen Goat Rider wie 1,5 und einen übergroßen Boss-Räuber wie 6 (`TARGETING` in `src/config/enemies.ts`, `crowdX` in `src/sim/weapons/targeting.ts`). Warum: Sonst schlug der Stomper auf drei Pothelms, während ein Yeti das Tor einriss.

## E-046 – Eine Waffe auf leerer Straße kostet nichts
Findet eine angreifende Waffe beim Antippen kein Ziel, feuert sie nicht und lädt nicht nach; der Tipp wird nur mit einem kurzen „geht nicht“ beantwortet (Ereignis `denied` in `WeaponSystem`, `src/sim/weapons/system.ts`; zum Beispiel `RollBehaviour.fire`). Warum: Ein versehentlicher Tipp soll nicht die ganze Abklingzeit kosten.

## E-047 – Die Kuckucksuhr holt Schatten hervor
Ab Stufe 4 (`breaksGuards`) lässt die Cuckoo Clock Blasen der Hexer platzen und holt unsichtbare Shades sichtbar und greifbar hervor, solange die Pause dauert (`src/sim/weapons/behaviours/stop.ts`). Warum: So hat die Uhr eine eigene Rolle neben dem reinen Anhalten.

## E-048 – Der Great Cauldron steht nur noch hinter der Burg
Der Schalter „vorne/hinten“ und der Kessel auf der Straße sind entfernt. Der Kessel steht auf einem kleinen Hügel hinter der Burg (`WORLD.cauldron` in `src/config/field.ts`, Grafik `src/art/castle/cauldron.ts` und `mound.ts`). Hinein kommt ein Gegner nur durch einen Wurf; ein Wurf in seine Richtung wird sanft hingelenkt. Die ersetzten Tests stehen in `docs/PROGRESS-GROSSES-UPDATE.md`; `tests/unit/round.test.ts` prüft, dass der Schalter weg ist. Warum: Der Kessel an der Burg sah unschön aus, hinten wirkt der Wurf in die Tiefe besser.

## E-049 – Adlerhaken kostet 12.000 Gold
Der Haken kostet im Lauf 12.000 statt 1.000 Gold (`STATIONS.perch` in `src/config/keep.ts`); in der Kampagne wird er mit Level 32 freigeschaltet. Das Feld `tier` je Opferstätte ist für spätere Ausbauten und eine besondere Belohnung am Haken reserviert. Warum: Der Haken soll erst spät eine Rolle spielen.

## E-050 – Koop in der Kampagne: Host-Kampagne mit Helfer
Der Host spielt sein Level mit seinem Profil (Freischaltungen, Stufen); der Gast bringt nur seine Hand-Stufe mit und schickt sie beim Start. Zu zweit kommen 1,9-mal so viele Räuber (`COOP.campaignFactor` in `src/config/waves.ts`). Jeder schreibt seine Belohnung in sein eigenes Profil; der Host verwaltet das Profil des Gasts nicht. Zu zweit gibt es in beiden Modi 50 % Gold je Kill (`COOP.goldFactor`, vorher 0,7; angewendet in `Combat`, `src/sim/combat.ts`), weil die gemeinsame Kasse sonst doppelt so schnell wächst. Warum: Gemeinsames Spielen soll helfen, aber den Fortschritt nicht verdoppeln.

## E-051 – Wer über einen Einladungslink kommt, tritt direkt bei
Öffnet jemand die Seite mit `?join=CODE`, öffnet sich der Beitritt sofort, auch wenn das Tutorial noch nicht gesehen ist; es kommt beim nächsten Solo-Start (`App.boot` und `startSoloRun` in `src/ui/app.ts`). Warum: Ein Freund, der eingeladen wird, soll nicht erst allein üben müssen. Steht auf der Entscheidungsliste (D-03).

## E-052 – Vorrunde: wann der erste Wurf zählt
Die Vorrunde (`TutorialMode`, `src/modes/tutorial.ts`) bringt 13 Pothelms in 34 Sekunden, das Tor kann nicht fallen, es gibt keinen Markt. Der König kommt herein, dann friert das Bild ein (Phase `hold`) und eine gezeichnete Hand zeigt die Geste. Der eigene Griff lässt die Welt weiterlaufen. Als geschafft gilt die Geste, wenn man einen Räuber mit mindestens 550 Einheiten pro Sekunde loslässt oder ihn mindestens 150 über der Straße fallen lässt oder ein eigener Wurf tödlich aufschlägt (`GUIDE` und `threwThisFrame` in `src/render/tutorialGuide.ts`). Warum: Auch ein Anfänger, der nur hochhebt und loslässt, soll Erfolg haben. Danach folgt sofort Level 1.

## E-053 – Am zweiten Tag von Level 1 spricht der König statt eines Tipps
Level 1 hat zwei Tage. Im ersten Markt ist nur der Kessel kaufbar (`marketOnly`), am zweiten Tag erklärt der König in einem Satz den Kesselwurf und ein Pfeil zeigt den Weg (`PotHint` in `src/render/tutorialGuide.ts`, Text in `TUTORIAL_HINTS`). An diesem Tag entfällt der sonst übliche Kessel-Tipp (`kingSpeaks` in `App.onBanner`). Warum: zwei Hinweise zur selben Sache auf einmal waren zu viel.

## E-054 – Die Lobby wächst mit dem Kampagnen-Fortschritt
Die Lobby ist eine eigene Phaser-Szene im Inneren der Burg (`src/render/lobby/lobbyScene.ts`, Grafik `src/art/lobby/`). Sie zeigt dauerhaft den Kampagnen-Fortschritt, unabhängig vom Ausbau im einzelnen Level: Ab bestimmten geschafften Leveln kommen Teppich, Banner, Trophäenschilde, Kronleuchter, Käsestapel, ein goldener Thron, goldene Gabeln und am Ende eine Siegesgirlande dazu (`DECOR` mit `minLevel` in `src/render/lobby/layout.ts`). Freigeschaltete Waffen hängen an der Wand (`WEAPON_PEGS`). Die Kamera taucht in 0,9 s durch das Tor hinein und wieder heraus (`src/render/lobby/dive.ts`), ein Tipp überspringt die Fahrt. Warum: Die eigene Burg soll mit dem Fortschritt prächtiger werden und nicht abgewertet wirken. Steht auf der Entscheidungsliste (D-02).

## E-055 – `?menu=html` als Rückfallebene
Mit `?menu=html` zeigt die Seite statt der Lobby das einfache HTML-Menü mit denselben Aktionen (`htmlMenuWanted` in `src/ui/lobby/mode.ts`). Mit `?menu=1` bleibt die Lobby, aber das Tutorial wird übersprungen. Warum: Browser-Tests brauchen einen schnellen, stabilen Weg ins Menü, und falls die Lobby einmal nicht lädt, bleibt das Spiel bedienbar.

## E-056 – Der Markt fährt an die Burg, die Burg hat einen Westflügel
Zwischen den Tagen fährt die Kamera in 0,7 s näher an die Burg und zeigt auch, was links von x = 0 liegt (`src/render/marketCamera.ts`). Dafür ist die Burg nach links weitergezeichnet (`src/art/castle/westWing.ts`). Slots, Tor-Knopf, Kessel und Haken werden dort angetippt, wo sie stehen (`MarketView` in `src/render/marketView.ts`), das Fenster dazu ist HTML (`src/ui/screens/shop.ts`). Im Kampf bleibt die Burg am linken Rand (E-021).

## E-057 – Vor dem Start eines Levels erscheint eine Level-Karte
Auf der Kampagnen-Karte öffnet ein Tipp auf eine Station eine kleine Karte mit Name, Zahl der Tage, Landschaft, Besonderheit und Sternen; ob das Level etwas freischaltet, zeigt sie vor dem Sieg nur als Fragezeichen, danach mit Namen. Rechts steht „Play“, links „Close“; gesperrte Stationen sagen, was man vorher gewinnen muss (`src/ui/screens/campaign.ts`). Warum: Man soll wissen, was kommt, und nicht versehentlich ein Level starten.

## E-058 – Ein unterbrochenes Level geht am Beginn des Tages weiter
Allein in der Kampagne legt die App zu Beginn jedes Tages und beim Eintritt in den Markt einen Speicherstand ins Profil (`pendingRun`, `App.savePending` in `src/ui/app.ts`, `Sim.dayStartSave`). In der Lobby erscheint dann die Station „Continue“. Der Stand wird verworfen, wenn er nicht mehr zur Level-Tabelle passt (`App.pendingRun` prüft Modus, Level und Tag), und gelöscht, sobald das Level gewonnen oder verloren ist (`CampaignMode.reward`). Koop, Endlos und Entwickler-Läufe werden nicht fortgesetzt. „Try again“ startet ein fortgesetztes Level wieder bei Tag 1. Warum: Am Handy wird die App oft einfach geschlossen.

## E-059 – Entwickler-Läufe zählen nicht
Ein Lauf ist ein Entwickler-Lauf (`devRun`), wenn Tuning oder Experiment-Schalter vom Standard abweichen, ein Endlos-Schnellstart benutzt wird oder ein Level über das Entwickler-Menü an einem späteren Tag beginnt (`App.runEnv` in `src/ui/app.ts`, `CampaignMode.buildRun`). Solche Läufe bringen weder Sterne noch Level-Fortschritt noch einen Bestenlisten-Eintrag (`reward` der Modi). Außerhalb von Entwickler-Läufen gilt immer `TUNING_DEFAULT`; das behebt die alte Falle mit gespeichertem Tuning.

## E-060 – Grafik per Adresse austauschen: `?asset=`
Jede Grafik hat einen festen Namen im Asset-Verzeichnis (`src/art/registry.ts`). In `ASSET_OVERRIDES` (`src/config/assets.ts`) kann ein Name auf eine Bilddatei in `public/assets/` zeigen; zum schnellen Ausprobieren geht das auch über die Adresse, zum Beispiel `?asset=rig:grunt:body=/assets/grunt-body.png` (mehrfach möglich). Lädt die Datei nicht, erscheint die eingebaute Grafik. Warum: Tim und Lenny wollen die Grafik später durch eigene Bilder ersetzen, ohne Spiellogik anzufassen. Anleitung: `docs/GRAFIK-AUSTAUSCHEN.md`.

## E-061 – Test-Profile über die Adresse: `?fresh=1` und `?profile=`
Mit `?fresh=1` startet die Seite mit einem leeren Profil, das nur im Speicher lebt; mit `?profile=CODE` mit einem importierten Profil, ebenfalls nur im Speicher (`loadProfile` in `src/ui/app.ts`). Das echte Profil im Browser bleibt dabei unberührt. `?tutorial=1` startet das Tutorial erneut. Warum: Browser-Tests und schnelles Ausprobieren eines bestimmten Fortschritts, ohne den eigenen Spielstand zu gefährden.
