# Offene Entscheidungen und Bewertungen

Hier steht alles, was Tim und Lenny noch entscheiden oder bewerten sollen (Auftrag, Abschnitt 11.2). Diese Datei ist der Stand im Repo und erscheint auch auf der Entwickler-Übersicht unter `/fondue/dev/`.

Dieselbe Liste steht im Entwickler-Menü des Spiels (`src/ui/tuningPanel.ts`, Einträge in `src/config/devReview.ts`): dort könnt ihr abhaken, bewerten und eine Notiz schreiben. Das Spiel speichert das im Profil auf dem Gerät und gibt es über „Copy as text“ als Text aus (`setRating`, `ratingsAsText` in `src/profile/profile.ts`). Was für beide gelten soll, tragt ihr danach hier in die Tabelle ein, denn nur das Repo ist das gemeinsame Gedächtnis.

So wird ein Eintrag ausgefüllt:

- **Status:** `offen` oder `erledigt` (abgehakt).
- **Bewertung:** `finden wir gut` oder `finden wir nicht gut`, solange nichts entschieden ist ein Strich.
- **Notiz:** ein kurzer Satz, zum Beispiel was anders werden soll.
- **Stand** sagt, was im Spiel gerade gebaut ist. „wird nachgetragen“ heißt: Das steht noch nicht fest oder ist noch nicht fertig.

Die Begründungen der Entscheidungen stehen in `docs/ENTSCHEIDUNGEN.md`.

## Entscheidungen

| Nr | Eintrag | Worum es geht | Stand | Status | Bewertung | Notiz |
|---|---|---|---|---|---|---|
| D-01 | Endlos bietet alle Waffen | Im Endlos-Modus sind alle Waffen und alle fünf Slots verfügbar, egal wie weit man in der Kampagne ist, damit man alles testen kann. | Schalter `onlyUnlockedWeapons` in `src/config/worlds/fondue/endless.ts` steht auf `false`: alle Waffen verfügbar. | offen | – | |
| D-02 | Aussehen des Burg-Innenraums | Wie die Lobby in der Burg aussieht, damit die eigene Burg nicht abgewertet wirkt, obwohl die Burg in jedem Level neu ausgebaut wird. | Die Lobby ist eine Halle mit Thron, König und antippbaren Stationen. Sie wird mit dem Kampagnen-Fortschritt prächtiger: Teppich ab Level 3, Banner ab 8, Trophäenschilde ab 15 und 35, Kronleuchter ab 25, Käsestapel ab 45 und 55, goldener Thron ab 70, goldene Gabeln ab 85, Siegesgirlande nach Level 100 (`DECOR` in `src/render/lobby/layout.ts`). Freigeschaltete Waffen hängen an der Wand. Siehe E-054. | offen | – | |
| D-03 | Koop-Einladungslink und Tutorial | Was passiert, wenn jemand über einen Einladungslink kommt und das Tutorial noch nicht kennt. | Laut Code tritt der Gast direkt bei; das Tutorial kommt beim nächsten Solo-Start. | offen | – | |
| D-04 | Sterne beim Wiederholen | Wie viele Sterne ein schon geschafftes Level beim nächsten Sieg bringt, damit man nicht farmen kann. | `replayShare` in `src/config/stars.ts` ist 0: kein Stern für Wiederholungen. | offen | – | |
| D-05 | Sterne für Koop-Gäste | Wie viele Sterne der Gast für ein Level der Host-Kampagne bekommt. | `guestShare` in `src/config/stars.ts` ist 0,5: die Hälfte, aufgerundet, einmal je Level. | offen | – | |
| D-06 | Unterbrochenes Level fortsetzen | Ob ein Level nach dem Schließen der App am Beginn des aktuellen Tages weitergeht oder sauber abgebrochen wird. | Allein in der Kampagne geht es am Beginn des Tages weiter: Die App speichert zu Beginn jedes Tages und beim Markt (`pendingRun`, `src/ui/app.ts`), in der Lobby erscheint „Continue“. Koop, Endlos und Entwickler-Läufe werden nicht fortgesetzt. Siehe E-058. | offen | – | |
| D-07 | Yeti und Hand-Stufen | Wie schwer der Yeti allein und zu zweit zu werfen ist und welche Hand-Stufe dafür reicht. | In `src/config/hand.ts`: Hand-Stufe 3 hebt ihn allein; zwei Hände heben ihn gemeinsam ab einer Stärke von zusammen 2. | offen | – | |
| D-08 | Zielen von Stomper und Comet | Ob man erst die Waffe und dann die Stelle antippt oder ob ein Tipp genügt und die Waffe selbst zielt. | Beide zielen mit einem Tipp selbst auf die dichteste Gruppe (`target: 'crowd'` in `src/config/weapons.ts`). | offen | – | |
| D-09 | Sterne, Stufen und Hand für alle Welten | Ob Sterne, Waffenstufen und Hand-Stufe später in jeder Welt gelten oder je Welt getrennt sind. | Heute gelten sie für alle Welten gemeinsam (`stars`, `weaponTiers`, `handTier` stehen im Profil außerhalb von `worlds`). Geschaffte Level, Bestenliste und Meilensteine sind je Welt getrennt. | offen | – | |
| D-10 | Endlos erst ab einem Level | Ob Endlos später erst nach einigen Kampagnen-Leveln freigeschaltet wird. | `availableFromLevel` in `src/config/worlds/fondue/endless.ts` ist 0: von Anfang an offen. | offen | – | |
| D-11 | Sterne für das erste Freischalten einer Waffe | Ob eine durch die Kampagne verfügbar gewordene Waffe zusätzlich Sterne kostet. | `STARS.weaponUnlock` ist 0 (kostenlos). Der Wert wird gelesen (`weaponUnlockPrice` in `src/modes/unlocks.ts`): Bei einem Preis über 0 verkauft die Waffenkammer das erste Freischalten für Sterne. | offen | – | |
| D-12 | Länge der frühen Level | Der Auftrag nennt 5 bis 15 Tage je Level. | Level 1 hat 2 Tage, Level 2 bis 4 je 3, Level 5 bis 9 je 4, ab Level 10 5 bis 10 Tage, Boss-Level einen mehr (`dayCountOf` in `src/config/worlds/fondue/campaign.ts`). Kürzer, damit der Einstieg schnell geht. | offen | – | |
| D-13 | Startgold in Level 1 | Der Auftrag sagt „Gold 0“ zu Beginn jedes Levels. | Level 1 beginnt mit 60 Gold (`LEVEL_OVERRIDES[1].startGold`), damit der Kessel (250 Gold) nach Tag 1 sicher bezahlbar ist. Alle anderen Level beginnen mit 0. | offen | – | |
| D-14 | Boss-Level | Was ein Boss-Level ausmacht. | Jedes zehnte Level: ein Tag mehr, am letzten Tag 1,8-mal so viele Räuber, alle 12 % stärker, dazu ein oder mehrere übergroße Räuber und je nach Level ein Massenansturm (`BOSS_BIG`, `BOSS_EXTRA`, `CURVE.bossPower`). Freischaltungen liegen jeweils auf dem Level davor (9, 19, 29, 39), nicht auf dem Boss-Level. | offen | – | |
| D-15 | Name „Sterne“ | „Sterne“ ist ein vorläufiger Name für die dauerhafte Währung. | Im Spiel heißen sie „stars“ mit dem Zeichen ★. Eine Bewertung mit 1 bis 3 Sternen je Level ist nicht gebaut. | offen | – | |
| D-16 | Koop-Faktor der Kampagne | Wie viel mehr Räuber zu zweit in einem Kampagnen-Level kommen. | `COOP.campaignFactor` = 1,7 in `src/config/waves.ts` (vorher 1,9; gesenkt, weil die Bots zu zweit Level 9 mit fünf Tagen nie gewannen). Mid zu zweit schafft 92 Level im ersten Versuch, allein 84: zu zweit etwas leichter (`docs/balance.md`). | offen | – | |
| D-17 | Neuer Stomper | Wie der Stomper über die Stufen aussieht und wirkt. | Er wird nicht mehr größer, sondern trifft härter, lässt ab Stufe 2 den Boden beben (betäubt Nachbarn) und schlägt ab Stufe 3 zweimal, ab Stufe 5 dreimal auf die nächste Gruppe (`stomper` in `src/config/weapons.ts`). | offen | – | |
| D-18 | Adlerhaken spät und teuer | Der Haken kostet 12.000 Gold und kommt in der Kampagne mit Level 32. | `STATIONS.perch` in `src/config/keep.ts`, `UNLOCKS` in `src/config/worlds/fondue/unlocks.ts`. Eine besondere Belohnung am Haken ist nur vorgehalten. | offen | – | |
| D-19 | Sieg-Fenster verdeckt das Sieg-Banner | Beim Sieg erscheint das Fenster „Level won!“ im selben Moment wie das Banner „VICTORY! THE KEEP STANDS!“ und verdeckt es zur Hälfte, auf allen drei Geräten. | Möglich: Fenster erst nach dem Banner (3,2 s) zeigen, oder das Banner beim Sieg weglassen. Beides ändert, wie sich der Sieg anfühlt, deshalb nicht selbst entschieden. | offen | – | |
| D-20 | Fenster „New enemy“ am Handy | Am ersten Tag verdeckt das Fenster am Handy kurz das Ende des Tages-Banners und den Tipp. | Möglich: Fenster erst nach dem Banner zeigen. Am Laptop überdeckt nichts. | offen | – | |

## Waffen

Jede Waffe lässt sich einzeln abschalten (`enabled` in `src/config/weapons.ts`). Die Bilder und alle fünf Stufen stehen auf der Entwickler-Übersicht.

| Nr | Waffe | Slot | Was sie tut | Frei ab Level | Status | Bewertung | Notiz |
|---|---|---|---|---|---|---|---|
| W-01 | Rolling Wheel | Mauerfuß | Ein Steinrad rollt die ganze Straße hinunter und überrollt alles. | 1 | offen | – | |
| W-02 | Sticky Fondue | Mauerfuß | Heißer Käse auf der Straße, Räuber waten langsam hindurch. | 5 | offen | – | |
| W-03 | Fondue Forks | Mauerfuß | Riesige Gabeln schießen unter der dichtesten Gruppe aus der Straße und halten sie fest. | 15 | offen | – | |
| W-04 | Stomper | Mauer | Ein schwerer Block fällt auf die dichteste Gruppe. | 9 | offen | – | |
| W-05 | Alphorn | Mauer | Ein mächtiger Ton wirft alle Räuber nahe der Burg die Straße hinunter. | 12 | offen | – | |
| W-06 | Cuckoo Clock | Mauer | Der Kuckuck ruft, und alle Räuber auf der Straße bleiben kurz stehen. | 27 | offen | – | |
| W-07 | Comet | Schrein | Ein Komet fällt auf die dichteste Gruppe und hinterlässt Feuer. | 29 | offen | – | |
| W-08 | Storm Bell | Schrein | Ein Blitz trifft den zähsten Räuber und springt auf seine Nachbarn über. | 44 | offen | – | |
| W-09 | Golden Fondue | Schrein | Für kurze Zeit bringt jeder besiegte Räuber mehr Gold. | 69 | offen | – | |
| W-10 | Gate Mortar | Torarm | Schießt eine Granate auf den Räuber, der dem Tor am nächsten ist. | 19 | offen | – | |
| W-11 | Frost Horn | Torarm | Friert die dichteste Gruppe ein; antippen zerschlägt gefrorene Räuber. | 23 | offen | – | |
| W-12 | Dragon Bellows | Torarm | Setzt die Straße unter der dichtesten Gruppe in Brand. | 34 | offen | – | |
| W-13 | Hedgehog Gate | Torarm | Stacheln am Tor verletzen jeden, der zuschlägt; antippen lässt sie nach außen schießen. | 54 | offen | – | |
| W-14 | Roof Bolter | Turmdach | Ein Fächer aus Bolzen über die ganze Höhe: Ballons oben, Läufer unten. | 39 | offen | – | |
| W-15 | Marmot Sentry | Turmdach | Ein Murmeltier mit Armbrust schießt von selbst; antippen gibt eine schnelle Salve. | 49 | offen | – | |
| W-16 | Ember Beacon | Turmdach | Solange das Leuchtfeuer brennt, explodiert jeder geworfene Räuber dort, wo er landet. | 59 | offen | – | |
