# Fondue v0.4 – Bericht

STAND-DER-VEROEFFENTLICHUNG-FOLGT

## Das Wichtigste in Kürze

In v0.4 ist die Burg das Maß für den Fortschritt: Die fünf Waffen-Slots öffnen nicht mehr mit Kampagnen-Leveln, sondern mit den Burg-Stufen 1 bis 5, und jede Burg-Stufe kostet Gold und wird erst nach einem bestimmten gewonnenen Level kaufbar. Dazu gibt es eine neu aufgebaute Lobby mit eigenem Aussehen je Burg-Stufe, Options mit Reitern, das Storybook auf der Kampagnen-Karte und eine neue Versionsregel, nach der jede ältere Version unter eigener Adresse spielbar bleibt.

Drei Dinge solltet ihr wissen:
- **Schwächere Spieler bleiben früher hängen.** Der schwache Bot scheitert zuerst an Level 16 (in v0.3 erst an Level 44) und schafft 49 statt 52 der 100 Level. Ein Korrekturversuch erreichte die Ziele nicht und wurde zurückgenommen. Das ist der wichtigste offene Punkt der Balance, und nur euer Spielen kann zeigen, ob er Menschen wirklich trifft.
- **Die Durchspiel-Prüfungen sind unvollständig.** Der Testbrowser lief auf diesem Rechner ohne Grafikkarte und unter Last so langsam, dass jede der drei Prüfungen von Hand nur bis Level 1 kam und danach Cheats nutzte. Ein Durchgang bis Level 8 liegt für kein Format vor. Die Bildrate ließ sich deshalb auch nicht aussagekräftig messen.
- **Zwei Stunden fehlten.** Zwischen 17:10 und 19:10 Uhr fiel das Netz aus. Danach lief alles gleichzeitig, und die Prüfzeit war stark verkürzt. Die unabhängige Schlussprüfung fand nicht als eigenes Durchspielen statt, sondern nur über die Tests auf GitHub.

## Was gebaut wurde

**Versionen.** Ab v0.4 darf die neueste Version direkt nach `main` und ist damit unter `/fondue/` live; jede ältere Version bleibt unter `/fondue/vX.Y/` spielbar, mit Tag und eingefrorenem Branch (Entscheidung E-072, festgehalten in `AGENTS.md` und im Handbuch). Die Auslieferung baut dafür alle Versionen nebeneinander. v0.4 speichert unter eigenem Schlüssel (`fondue.v4.`) und übernimmt beim ersten Start einmalig einen v0.3-Spielstand, ohne ihn zu verändern. „v0.4“ steht in den Options und klein in der Lobby; die Options und die Entwickler-Übersicht zeigen die Liste aller spielbaren Versionen mit Link.

**Die Burg als Fortschritt.** Burg-Stufe 1 öffnet den Damage-Slot, Stufe 2 Slow, 3 Gate, 4 Support, 5 Passive; die Stufen 6 und 7 geben mehr Torleben und eine prächtigere Halle. Der Shop nennt bei einer gesperrten Stufe in einem Satz, was fehlt („Win level 6 to build this“ oder „You need … more gold“). Ein Burg-Ausbau ist ein Ereignis: kurze Animation, ein Satz des Königs, danach die Einführung des neuen Slots. Die Burg-Stufe steht in der Lobby, im Shop, auf der Kampagnen-Karte, im Koop-Raum neben jedem Spieler und auf dem Sieg-Bildschirm, wenn eine neue Stufe kaufbar geworden ist. Tutorial, Hilfe, Tipps und Sätze des Königs erklären den neuen Weg (Gold verdienen, Burg ausbauen, neuer Slot). Kampagne, Stufen-Deckel und Challenges wurden an die neue Reihenfolge angepasst, die Bots sparen zuerst auf die Burg.

**Die neue Lobby.** Rechts sitzt König Fridolin mit zwei Wachen am dampfenden Kessel, in der Mitte vorn steht der große Kampagnen-Tisch, direkt rechts daneben der Shop, links der Koop-Tisch (ab Level 3 aufgebaut, vorher kaputt mit einem erklärenden Satz) und dahinter der Endlos-Tisch (ab Level 10). Oben rechts sitzt ein Zahnrad für die Options. Storybook, Help, Credits und Scores sind keine Stationen mehr: Das Storybook öffnet ein kleines Buch auf der Kampagnen-Karte, der Rest sind Reiter der Options (Settings, Scores, Help, Credits, Versions). Jede der sieben Burg-Stufen hat eine eigene Halle, von der Holzhalle mit Stroh bis zur Festungshalle mit Gold, Kronleuchtern und Käsetruhen.

**Feinschliff.** Drei Prüfer haben v0.4 auf je einem Format gespielt und 38 Befunde notiert (`docs/v0.4/BEFUNDE.md`). Die wichtigsten Korrekturen stehen unten im Abschnitt „Befunde“. Die drei offenen Punkte aus v0.3 wurden geprüft (Abschnitt „Die offenen Punkte aus v0.3“).

## Burg-Stufen

Aus `src/config/slotTiers.ts` (Kauf-Level) und `src/config/keep.ts` (Namen und Preise).

| Burg-Stufe | Name | kaufbar ab gewonnenem Level | Preis | öffnet |
|---|---|---|---|---|
| 1 | Oak Gate | Start | – | Damage |
| 2 | Iron-Bound Gate | 6 (fest) | 8.000 Gold | Slow |
| 3 | Stone Keep | 12 | 15.000 Gold | Gate |
| 4 | Bannered Keep | 20 | 24.000 Gold | Support |
| 5 | Gilded Keep | 28 | 26.000 Gold | Passive |
| 6 | Runic Fortress | 50 | 80.000 Gold | keinen Slot, mehr Torleben |
| 7 | Alpine Citadel | 75 (fest) | 150.000 Gold und 50 Raider Crests | keinen Slot, mehr Torleben |

Der Koop-Tisch ist ab gewonnenem Level 3 offen, der Endlos-Tisch ab Level 10 (beides fest).

## Balance

Gemessen mit `npm run balance`; alle Zahlen in `docs/balance.md`, Abschnitt v0.4.

Der mittlere Bot kauft Burg-Stufe 2 bei Level 6, Stufe 3 bei 12, Stufe 4 bei 20, Stufe 5 (den fünften Slot) bei Level 28 bis 29 und Stufe 6 bei 51 bis 55. Damit sind beide Ziele des Auftrags erfüllt: Stufe 2 bald nach Level 6, fünfter Slot etwa bei Level 20 bis 30. Die Burg ist jetzt das Sparziel; mit den ersten Startpreisen (400 bis 50.000 Gold) hatte der mittlere Bot bei Level 9 schon 21.000 Gold übrig. Die frühen Level schafft der mittlere Bot jeweils im ersten Versuch, aber nicht gefahrlos (niedrigstes Torleben 71 % in Level 4). Die übrigen Ziele aus v0.3 gelten weiter und sind erfüllt: Ohne Ausbau scheitert der mittlere Bot zuerst an Level 15, der sehr gute Bot braucht spät und in Boss-Leveln mehr Versuche, zu zweit ist es nicht leichter als allein (1,83 gegen 1,72 Versuche je Level), und wer nur Endlos-Gold farmt, kommt in der späten Kampagne nicht mühelos durch. Endlos schon ab Level 10 verschafft dem Farmer keinen Vorsprung, weil die Burg-Stufen am gewonnenen Level hängen.

**Der wichtigste offene Punkt:** Der schwache Bot scheitert zuerst an Level 16 statt wie in v0.3 an Level 44 und schafft 49 statt 52 von 100 Leveln. Der Grund ist, dass Gate, Support und Passive erst mit den Burg-Stufen 3 bis 5 (Level 12 bis 28) kommen statt wie in v0.3 ab Level 4 bis 11. Ein Versuch, den mittleren Teil der Kampagne leichter zu machen, erreichte die Ziele nicht und wurde zurückgenommen (Commit f3307f6). Stellschraube wären die Kauf-Level der Burg-Stufen 3 bis 5; ob echte Spieler im Abschnitt 12 bis 30 zu oft hängen bleiben, zeigt nur echtes Spielen.

## Befunde aus den Durchspiel-Prüfungen

Die drei Prüfer kannten den Code nicht und spielten auf `/fondue/next/` nur mit Tippen, Wischen und Maus. Von Hand kamen alle nur durch die Vorrunde und Level 1 (auf dem iPhone und am Laptop verloren, auf dem OnePlus gewonnen), danach stellten sie mit Cheats einen späteren Stand her. Von 38 Befunden sind 7 behoben und durch einen Browser-Test abgesichert, 7 behoben, aber ungeprüft, und 24 bewusst offen. Der einzige Befund „stört stark“ ist die Bildrate im Testbrowser (siehe unten).

Behoben wurde vor allem, was die Bedienung uneinheitlich machte. „Back“ sitzt jetzt auch in den Options oben links wie in Shop und Karte, und die Sieg-Bildschirme haben „Back“ links und die Hauptaktion rechts. Im Shop überdeckt kein Hinweis mehr den Satz des Königs. Ein gesperrter Endlos-Tisch erklärt sich schon beim ersten Tipp, ein Tipp auf die Beschriftung einer Station zählt wie ein Tipp auf das Bild, und die Lobby antwortet sofort. Ohne Test und ohne erneuten Blick sind diese Korrekturen: Beschriftungen der Lobby weg von der unteren Bildkante, ein größerer Shop in der Lobby, die Kaufzeile im Shop auf kurzen Handys in eigener Zeile mit dem Ausbauen zuerst, das Namensband auf der Karte unter der Käse-Anzeige.

Bewusst offen sind vor allem Dinge, die schon in v0.3 so waren und nicht Teil dieser Runde sind: Die Vorrunde geht ohne Meldung in Level 1 über, das Tor verliert in der Vorrunde schnell Leben, die Hand zeigt in der Vorrunde auf die Wiese statt aufs Tor, und „Back“ nach einer Niederlage führt auf die Karte statt in die Lobby. Diese Punkte sind für v0.5 vorgemerkt. Ebenfalls offen: „Quit to menu“ auf dem Niederlage-Bildschirm im Endlos-Modus ist weiter uneinheitlich, und der Preis von 8.000 Gold für Burg-Stufe 2 ist gewollt, aber von Menschen noch nicht erprobt.

## Bildrate

Nicht aussagekräftig gemessen. Der Testbrowser rendert auf diesem Rechner ohne Grafikkarte und lief zugleich mit zwei weiteren Prüfungen. Er schaffte 3 bis 12 Bilder pro Sekunde (Laptop-Format: Lobby 10, Shop 12, Level 8,6; Handy-Formate: Lobby 3,2 bis 4, Level 7,1 bis 8,8). Das Ziel von 55 Bildern pro Sekunde in der Lobby ist damit weder bestätigt noch widerlegt. Die Lobby mit Burg-Stufe 7 wurde nicht gemessen. Auf euren Geräten wird es anders aussehen; bitte achtet beim Testen darauf, ob etwas ruckelt.

## Die offenen Punkte aus v0.3

- **Leerlauf im Shop in Level 6 bis 9:** behoben. Waffen und Hand lassen sich bis Level 6 nur bis Stufe 2 ausbauen; mit Level 6 kommen Stufe 3, Burg-Stufe 2, der Slow-Slot und Sticky Fondue, und ab Level 12 spart man auf Burg-Stufe 3. Spät (ab Level 65) häuft sich Gold weiter an, weil nur noch Stufe 7 mit Raider Crests offen ist; unverändert.
- **Ungleiche Waffenstärken:** gemessen. Deutlich stärker als der Rest ihres Slots sind Mending Horn, Sticky Fondue, Snowdrift Cannon, das Rolling Wheel auf Stufe 6 und Roof Bolter; schwach ist die Storm Bell. Geändert wurde nur das Mending Horn (Heilung um 20 % schwächer, E-084). Ein Versuch, Roof Bolter schwächer und Storm Bell stärker zu machen, änderte messbar nichts und wurde zurückgenommen.
- **Länge der Boss-Level:** unverändert knapp. Im Median 364 Sekunden, 10 von 19 im Zielbereich von 6 bis 10 Minuten.

## Selbst getroffene Entscheidungen

Alle mit Begründung in `docs/ENTSCHEIDUNGEN.md` und zum Bestätigen oder Ändern auf der Entwickler-Übersicht.

- **v0.3-Spielstand (E-074):** Wer in v0.3 mehr Slots offen hatte, als seine Burg-Stufe jetzt erlaubt, bekommt bei der Übernahme kostenlos die Burg-Stufe, die alle diese Slots öffnet. So verliert niemand etwas, und die Regel „Slots folgen der Burg“ gilt im Code ohne Ausnahme.
- **Entwürfe auf der Entwickler-Übersicht (E-075):** werden nicht aus v0.3 übernommen, weil sie zu Fragen von v0.3 gehören, die es so nicht mehr gibt.
- **Einladung in den Koop (E-076):** Ein Gast darf per Einladungslink beitreten, auch wenn er Level 3 noch nicht gewonnen hat. Die Sperre gilt nur für das Eröffnen eines Raums; Freunde sollen nicht ausgesperrt werden, gespielt wird ohnehin mit der Burg des Hosts.
- **Reiter der Options (E-077):** Settings, Scores, Help, Credits, Versions. Settings braucht man am häufigsten, die Versionsliste am seltensten.
- **Kauf-Level und Preise der Burg-Stufen (E-079):** wie in der Tabelle oben. Gold soll der Engpass sein, nicht das Level; mit den niedrigen Startpreisen kauften alle Bots jede Stufe sofort.
- **Frühe Level mit nur einem Slot (E-080):** Level 1 bis 3 bleiben ruhig, Level 4 bis 6 haben mehr Räuber, doppelt so viele Keg Hauler und Spitzenwellen als Ansturm. Bis Level 6 lassen sich Waffen und Hand nur bis Stufe 2 ausbauen. Ohne diese Änderungen waren die Level 1 bis 6 für den mittleren Bot ohne jede Gefahr; ein stärkerer Versuch für Level 3 bis 8 ließ den schwachen Bot hängen.
- **Anordnung der Halle und die sieben Hallen (E-081):** wie oben beschrieben. Die Kampagne ist das Hauptspiel, der Shop liegt wegen des Weges „Sieg, Gold ausgeben, nächstes Level“ daneben, und die Tische mit Bedingung stehen links abseits des Hauptweges.
- **Einführung eines Slots (E-082):** kommt im Shop direkt nach dem Ausbau der Burg-Stufe, nicht mehr am Sieg-Bildschirm, weil der Slot erst mit dem Kauf öffnet.
- **Bestenliste nach einem Game Over (E-083):** öffnet den Reiter Scores der Options, den einzigen Ort für die Bestenliste.
- **Mending Horn (E-084):** Heilung um 20 % schwächer, weil es das Tor deutlich besser hielt als die anderen Support-Waffen; es bleibt vorn.

## Arbeitsweg und Verbrauch

Der Auftrag sah ein Team aus gleichzeitig arbeitenden Agenten vor. Die Sitzung hatte aber kein Werkzeug, um Teammitglieder zu starten. Deshalb lief Arbeitsweg B: Eine Leitung vergab alle Arbeit an einzelne Hilfs-Agenten, Bauaufträge an `bauer` (Claude Opus 5.5) und Prüfungen an `pruefer` (Claude Sonnet 5.5), jeweils mit ausdrücklicher Modellangabe. Geleitet hat Claude Fable 5.2. Der Wochenverbrauch von Fable lag beim Start schon bei 91 %, über der Schwelle von 85 %, ab der der Auftrag einen Wechsel der Leitung auf Opus erlaubt. Dieser Wechsel war aus der Sitzung heraus nicht möglich, weil eine Sitzung ihr eigenes Modell nicht umstellen kann; die Leitung hielt ihre eigenen Schritte deshalb so kurz wie möglich (E-078).

**Verbrauch am Anfang (16:43 Uhr):** 5-Stunden-Fenster 9 %, Woche alle Modelle 80 %, Woche Fable 91 %.

**Verbrauch am Ende:** VERBRAUCH-ENDE-FOLGT

**Netzausfall:** Von 17:10 bis 19:10 Uhr stand die Arbeit, weil das Netz ausgefallen war. Bis dahin waren die Versionsregel mit der neuen Auslieferung, der eigene Speicher mit der Übernahme aus v0.3 und das Fundament (Slots über die Burg-Stufe) fertig. Ab 19:15 Uhr liefen deshalb fünf Bau-Pakete gleichzeitig (Lobby, Options, Karte und Koop, Texte und Shop, Balance), dazu Dokumente und Prüfungen. Die Zeit für Prüfungen war dadurch stark verkürzt: Die Durchspiel-Prüfungen blieben unvollständig, und die unabhängige Schlussprüfung fand nicht als eigenes Durchspielen statt, sondern über die Tests auf GitHub.

## Tests

Bekannt aus der Sitzung: `npm test` lokal um 20:05 Uhr 630 von 630 grün; `npm run balance` um etwa 20:20 Uhr grün mit allen Zielen (siehe `docs/balance.md`). Alle Tests, die einen alten Ablauf prüften, sind mit Grund ersetzt, keiner abgeschwächt oder ohne Ersatz gelöscht (Liste in `docs/v0.4/PROGRESS.md`).

TESTAUSGABEN-FOLGEN

## Offen oder abgeschaltet

- **Nur eine Anordnung der Halle gebaut.** Der Auftrag wollte zwei bis drei Varianten im Vergleich; gebaut und auf drei Formaten geprüft wurde eine.
- **Durchspiel-Prüfungen unvollständig.** Kein Format von der Vorrunde bis Level 8 von Hand gespielt (siehe `docs/v0.4/BEFUNDE.md`). Nicht von Hand geprüft sind unter anderem Level 2 bis 8, der echte Kauf von Burg-Stufe 2, Storybook, Endlos, Koop und eine Lobby mit Burg-Stufe 7.
- **Schlussprüfung.** Die unabhängige Schlussprüfung fand wegen der verlorenen zwei Stunden nicht als eigenes Durchspielen statt; stattdessen liefen die Tests auf GitHub.
- **Nacharbeiten der letzten halben Stunde vor dem Baustopp** (Lobby-Beschriftungen und Tische, Shop-Zeilen, Back-Knöpfe, Sieg-Bildschirme, Namensband auf der Karte, Feld im Entwickler-Menü) sind nur durch die Tests auf GitHub geprüft, nicht von Hand angesehen.
- **Screenshots.** Die Laptop-Screenshots der Lobby in `docs/screenshots/v0.4/` zeigen noch die Anordnung der Tische vor der letzten Nacharbeit.
- **Bildrate** auf echten Geräten nicht gemessen, im Testbrowser nicht aussagekräftig.
- **Balance:** schwächere Spieler um Level 16 (siehe oben); Gold häuft sich spät an; Boss-Level knapp an der Untergrenze; einige Waffen deutlich stärker als andere.
- **24 Befunde bewusst offen,** davon mehrere aus v0.3 für v0.5 vorgemerkt (`docs/v0.4/BEFUNDE.md`).

## Alle spielbaren Versionen

| Version | Adresse |
|---|---|
| v0.4 (neueste) | https://onlineshopbuilding-droid.github.io/fondue/ |
| v0.3 | https://onlineshopbuilding-droid.github.io/fondue/v0.3/ |
| v0.2 | https://onlineshopbuilding-droid.github.io/fondue/v0.2/ |
| v0.1 | https://onlineshopbuilding-droid.github.io/fondue/v0.1/ (auch unter https://onlineshopbuilding-droid.github.io/fondue/classic/) |
| Version im Bau | https://onlineshopbuilding-droid.github.io/fondue/next/ |
| Entwickler-Übersicht | https://onlineshopbuilding-droid.github.io/fondue/dev/ (die Übersicht des Stands im Bau unter https://onlineshopbuilding-droid.github.io/fondue/next/dev/) |

Jede Version hat ihren eigenen Spielstand; eine ältere Version zu spielen ändert nichts am Fortschritt der neueren.
