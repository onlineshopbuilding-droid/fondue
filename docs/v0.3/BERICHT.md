# Fondue v0.3 – Bericht

Stand: 14.11.2026, vormittags. v0.3 ist unter https://onlineshopbuilding-droid.github.io/fondue/next/ spielbar und auf allen drei Geräteformaten von der Vorrunde bis zur Freischaltung des fünften Slots durchgespielt (unabhängige Prüfung, `docs/v0.3/PRUEFUNG.md`). Die Live-Version unter `/fondue/` ist unverändert v0.2, ihr Spielstand (`fondue.profile`) wird von v0.3 nie gelesen oder geschrieben. Der Pull Request v0.3-dev → main ist offen und wird nicht von mir gemergt.

## Arbeitsweg

Arbeitsweg B (E-063). Der Auftrag sah Claude Fable als Leitung vor. Weil Tims Fable-Kontingent beim Start schon bei 85 % lag, hat Claude Opus 5.5 die Leitung übernommen. Gebaut haben Opus-Subagents in getrennten Paketen (Profil, Wellen, Waffen, Waffengrafik, Burg, Shop, Entwickler-Werkzeuge, Hände und Stationen, Tutorial, Koop, Balance, Nacharbeiten). Geprüft und Dokumente nachgezogen haben Sonnet-Subagents, die nichts davon gebaut hatten. Gegen 05:50 griff das Fünf-Stunden-Limit; nach dem Zurücksetzen um 06:20 liefen die abgebrochenen Pakete mit ihrem Stand weiter.

## Was gebaut wurde

**Dauerhafte Burg.** Burg (zugleich Tor), Hand, freigeschaltete Waffen und alle Stufen liegen im Profil und gelten in Kampagne, Endlos und Koop. Im Level wird nichts gekauft. Waffen werden im Shop an- und abgelegt und behalten ihre Stufe.

**Drei Währungen.** Käse („Cheese“, 1 bis 5 je Level, jeder genau einmal: Sieg, Tor über 50 %, Tor über 90 %, zwei Challenges) schaltet frei; alle Käse-Preise ergeben zusammen genau 500. Gold baut Stufen 2 bis 6, Burg und Hand aus und bleibt auch nach einer Niederlage. Raider Crests gibt es nur am Adlerhaken; jedes Stufe-7-Upgrade braucht 50 davon zusätzlich. Sterne und Offerings sind vollständig entfernt.

**Level mit Wellen.** Keine Tage, kein Markt. Ein Level ist ein durchgehender Kampf mit kleinen Wellen und Pausen von 2 bis 4 Sekunden; nie länger als 5 Sekunden ohne lebenden Räuber (gemessen höchstens 2,6 s). Räuber sind 2,5-mal so schnell (langsame und Fernkämpfer 1,4-mal), es kommen etwa 40 % so viele. Ein unterbrochenes Level geht am Beginn der aktuellen Welle weiter.

**Slots und Waffen.** Fünf Slots mit festen Aufgaben und Orten: Damage (links unten), Slow (links Mitte), Support (links oben), Passive (rechts oben), Gate (über dem Tor). 25 Waffen, fünf je Slot, jede mit sieben Stufen, eigener Grafik je Stufe und einem Satz, was die Stufe bringt. Neun Waffen sind neu (Snowdrift Cannon, Cowbell Toll, Helping Hand, Iron Grip, Mending Horn, Pinecone Catapult, Hornet Hive, Cheese Cascade, Battering Log). Das Rolling Wheel hat man von der Vorrunde an kostenlos. Slots öffnen nach Vorrunde, Level 2, 4, 7 und 11, jeweils mit einem Satz von König Fridolin.

**Burg-Stufen 1 bis 7 und Issue 1.** Sieben Burgbilder vom Holztor bis zur Alpenfestung; die Burg sitzt jetzt in der Landschaft (Sockel ohne gerade Kante, Gras und Steine, Schatten, Licht passend zu Landschaft und Tageszeit, kein Weg links). Kommentar mit Bildern in Issue 1.

**Shop an der Burg.** Ersetzt die Armoury (E-065). Die Burg von außen, große Tippflächen je Slot, für Burg, Hand, Kessel und Adlerhaken; Käse, Gold und Wappen immer sichtbar; vorher und nachher bei jedem Upgrade; ein klarer Satz, warum etwas noch nicht geht. Vor jedem Level zeigt die Level-Karte Dauer, Landschaft, Besonderheit, beide Challenges, die geholten Käse und die Ausrüstung; „Play“ ist der zweite Tipp.

**Hände.** Hand-Stufen 1 bis 7, ein Yeti hebt allein ab Stufe 4, mehrere Hände zählen zusammen. Zwei Varianten der zweiten Hand (siehe unten). Mehrfach-Touch ohne Zoom und Scrollen.

**Kessel und Adlerhaken.** Der Great Cauldron (ab Level 16) gibt doppeltes Gold, Stufen verkürzen das Schmelzen. Der Eagle Perch (ab Level 70) bringt Wappen und verlangt einen echten, genauen Wurf.

**Modi.** Endlos mit eigener Burg, ohne Käse, offen ab dem fünften Slot; Easy, Medium, Hard zahlen steigend Gold. Koop mit der Burg des Hosts; der Gast bringt seine Hand mit; beide behalten das ganze Rundengold, ein Kill zahlt im Koop 60 %; Käse und Fortschritt nur für den Host. Versionsprüfung mit klarer Meldung auf beiden Seiten.

**Entwickler-Werkzeuge.** Waffen-Editor (jede Zahl je Waffe und Stufe live änderbar, zurücksetzen, als Text exportieren), Cheats (Gold, Käse, Wappen, Level, Stufen, Zurücksetzen, zweite Hand am Laptop), ein so veränderter Stand ist sichtbar als „Cheats used“ markiert. Entwickler-Übersicht unter `/fondue/next/dev/` mit allen Tabellen, Käse-Summe 500, Fahrplan und den offenen Entscheidungen zum Ausfüllen, die als vorausgefülltes GitHub-Issue zurückkommen.

## Messwerte

- **Zeit bis zum ersten sichtbaren Räuber** (Grenze 2,0 s): vorher 4,3 bis 14,4 s. Jetzt allein 0,42 bis 0,82 s in Level 1 bis 5 und Endlos auf iPhone 16, OnePlus 8T und Laptop; im Koop 0,92 bis 1,20 s. Die Ursache war nicht die Bildschirmbreite, sondern das 2,6-Sekunden-Banner ohne Räuber und weit verstreute Ankunftszeiten.
- **Koop-Ruckeln beim Gast:** Der Gast hat Snapshots nach ihrer Ankunft statt nach der Uhr des Hosts einsortiert; Netz-Schwankungen ließen Räuber abwechselnd rasen und stocken. Jetzt gibt es einen Puffer auf der Uhr des Hosts. Fehler der Geschwindigkeit je Bild (Mittel / 95 %) bei 60 ms Latenz, 25 ms Schwankung, 2 % Verlust: vorher 30 % / 86 %, nachher 3,2 % / 9,5 %. Zwei Browser auf dem ausgelasteten Laptop: vorher 161–227 % / 593–922 %, nachher 61–72 % / 142–175 %. Details: `docs/v0.3/MESSUNGEN-KOOP.md`.
- **Balance** (`docs/balance.md`): Ohne Ausbau bleibt der mittlere Bot an Level 15 hängen; mit Ausbau kommt er bis Level 70 bis 100 je nach Waffenwahl. Der sehr gute Bot braucht früh 1 Versuch je Level, in Level 76 bis 100 1,4 und in Boss-Leveln 2,0. Ein Spieler, der nur Endlos-Gold farmt, braucht spät 3,5 Versuche je Level. Zu zweit 1,86 Versuche je Level, allein 1,72: zu zweit nicht leichter. In jedem Slot nutzen die Bots mindestens 3 Waffen. Gold je Minute im Endlos (mittlerer Bot, Burg nach Level 20): Easy 6230, Medium 7944, Hard 10260.
- **Levellängen** (mittlerer Bot, Median): frühe Level 89 s, Mitte 203 s, Boss- und Sonderlevel 364 s. Die Boss- und Sonderlevel liegen damit knapp an der Untergrenze von 6 Minuten; nur 10 von 19 im Zielbereich.
- **Wappen-Grind:** Median 25 Runden mit dem Adlerhaken bis zum ersten Stufe-7-Upgrade (Ziel 20 bis 30). Trefferquote der Bots am Haken 22 bis 23 % (v0.2-Werte: 97 %).

## Die zwei zweiten Hände

Beide sind gebaut. Variante 1: Hand-Stufe 7 schaltet dauerhaft eine zweite Hand frei; zwei Finger greifen gleichzeitig je einen Räuber. Variante 2: die Support-Waffe Helping Hand gibt für einige Sekunden eine zweite Hand. Greifen beide eigenen Hände denselben Räuber, zählen ihre Stärken zusammen. Technisch laufen beide über denselben Weg und sind im Browser-Test mit zwei gleichzeitigen Berührungen auf beiden Handy-Formaten geprüft. Wie sie sich anfühlen, kann nur ihr beurteilen. Meine Einschätzung aus dem Aufbau: Variante 1 ist das stärkere Spielgefühl, weil man sich auf die zweite Hand verlassen kann und beide Daumen immer etwas zu tun haben; sie kommt aber sehr spät (Stufe 7 braucht den Adlerhaken ab Level 70). Variante 2 ist als kurzer Höhepunkt gut, belegt aber einen Support-Slot. Mit den Cheats lassen sich beide sofort ausprobieren.

## Selbst getroffene Entscheidungen

Alle mit Begründung in `docs/ENTSCHEIDUNGEN.md` (E-063 bis E-071) und auf der Entwickler-Übersicht zum Bestätigen oder Ändern:
- Name der Wappen: „Raider Crests“.
- Der Shop ersetzt die Armoury.
- Freischalt-Level und Käse-Preise je Waffe stehen in `src/config/weapons.ts`; Kessel ab Level 16 für 12 Käse, Adlerhaken ab Level 70 für 28 Käse.
- Gegen das Überrollen mit Endlos-Gold: Stufen-Deckel je Kampagnen-Abschnitt (Stufe 3 bis Level 10, 4 bis 25, 5 bis 45, 6 bis 65, 7 mit dem Adlerhaken).
- Koop: jeder behält das ganze Rundengold, ein Kill zahlt 60 %; Koop-Faktor der Gegnerzahl 2,4 (Start 1,8, nach Bots angehoben).
- Fortsetzen am Beginn der aktuellen Welle.
- Wiederholte Level bringen Gold (von Tim noch zu bestätigen); Gold bleibt auch bei Niederlage.
- Boss-Level schalten nichts Eigenes frei; sie sind das Tor zum nächsten Abschnitt.
- Keine alte Waffe wurde entfernt; Dragon Bellows wechselt zu Damage, Alphorn zu Gate, Ember Beacon zu Support, Storm Bell und Roof Bolter werden passiv.

## Offen oder ungeprüft

- **Auf echten Geräten ungeprüft:** Mehrfach-Touch in iPhone-Safari und Android-Chrome (nur mit simulierten Berührungen in Chromium geprüft), Speichern in der Home-Bildschirm-App des iPhones, Koop über das Internet, Bildrate auf den Handys.
- **Leerlauf am Stufen-Deckel:** In Level 6 bis 9 gibt es im Shop oft nichts zu kaufen, Gold häuft sich an. Nach Level 65 ebenso, weil nur noch Stufe 7 übrig ist. Spielgefühl, das ihr beurteilen müsst.
- **Waffen sind unterschiedlich stark:** Manche Kombinationen (mit Mending Horn und Pinecone Catapult) sind deutlich stärker. Die Bots schätzen Stärke nur grob.
- **Boss-Level** sind knapp an der Untergrenze von 6 Minuten.
- Im Durchspiel-Skript hing der Shop zweimal kurz; die Ursache (ständig neu gezeichnete Bilder bei Software-Grafik) ist behoben, der lange Durchlauf danach nicht wiederholt.
- Die genauen Testergebnisse des letzten vollen Laufs stehen in `docs/v0.3/PRUEFUNG.md` und in diesem Bericht unten.

## Was für den Store-Bau später noch nötig ist (G3)

Nichts in v0.3 verbaut den späteren Bau mit Capacitor: Touch zuerst, Querformat, Vollbild, sichere Ränder, keine reinen Browser-Abhängigkeiten, Spielstand mit Version und Migrationsweg hinter `ProfileStore`. Noch nötig:
- Spiel fest in eine Capacitor-App packen (Android gibt es schon als Hülle um die Live-Seite), iPhone über einen Cloud-Dienst mit macOS und TestFlight.
- `ProfileStore` für den App-Speicher (Capacitor Preferences oder Dateien); später Accounts mit Cloud-Speicher, das Profilformat ist dafür vorbereitet.
- Eigener Vermittlungs- und Relay-Server für Koop über Mobilfunk; die Schnittstelle `pickTransport` in `src/net/choose.ts` ist dafür vorbereitet.
- Lockerere Versionsprüfung, weil im Store nicht alle gleichzeitig aktualisieren.
- Entwickler-Menü vor der Veröffentlichung verstecken (`DEV_MENU_BUTTON`).
- Leistung auf echten Handys messen, bei Bedarf weniger Effekte.
- Klang für die neun neuen Waffen.
- App-Icon, Name, Datenschutzerklärung, Altersfreigabe, Store-Texte und Bilder; Zugang nur über Store-Testkanäle.

## Fahrplan bis v1.0

Steht auch auf der Entwickler-Übersicht. **v0.4:** Feinschliff nach eurem Test, Balance aus echtem Spielen (Deckel, Waffenstärken, Boss-Längen), Klang der neuen Waffen, Leistung auf echten Handys, gewählte Variante der zweiten Hand. **v1.0:** App-Bau für iOS und Android, App-Speicher, Store-Unterlagen, Entwickler-Menü versteckt, Koop-Server, wenn nötig.
