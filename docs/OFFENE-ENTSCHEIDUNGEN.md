# Offene Entscheidungen und Bewertungen

Hier steht alles, was Tim und Lenny noch entscheiden oder bewerten sollen (Auftrag, Abschnitt 11.2). Dieselbe Liste gibt es im Entwickler-Menü des Spiels; dort lässt sich jeder Eintrag abhaken, bewerten und mit einer Notiz versehen. Diese Datei ist der Stand im Repo und erscheint auch auf der Entwickler-Übersicht unter `/fondue/dev/`.

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
| D-02 | Aussehen des Burg-Innenraums | Wie die Lobby in der Burg aussieht, damit die eigene Burg nicht abgewertet wirkt, obwohl die Burg in jedem Level neu ausgebaut wird. | wird nachgetragen | offen | – | |
| D-03 | Koop-Einladungslink und Tutorial | Was passiert, wenn jemand über einen Einladungslink kommt und das Tutorial noch nicht kennt. | Laut Code tritt der Gast direkt bei; das Tutorial kommt beim nächsten Solo-Start. | offen | – | |
| D-04 | Sterne beim Wiederholen | Wie viele Sterne ein schon geschafftes Level beim nächsten Sieg bringt, damit man nicht farmen kann. | `replayShare` in `src/config/stars.ts` ist 0: kein Stern für Wiederholungen. | offen | – | |
| D-05 | Sterne für Koop-Gäste | Wie viele Sterne der Gast für ein Level der Host-Kampagne bekommt. | `guestShare` in `src/config/stars.ts` ist 0,5: die Hälfte, aufgerundet, einmal je Level. | offen | – | |
| D-06 | Unterbrochenes Level fortsetzen | Ob ein Level nach dem Schließen der App am Beginn des aktuellen Tages weitergeht oder sauber abgebrochen wird. | wird nachgetragen | offen | – | |
| D-07 | Yeti und Hand-Stufen | Wie schwer der Yeti allein und zu zweit zu werfen ist und welche Hand-Stufe dafür reicht. | In `src/config/hand.ts`: Hand-Stufe 3 hebt ihn allein; zwei Hände heben ihn gemeinsam ab einer Stärke von zusammen 2. | offen | – | |
| D-08 | Zielen von Stomper und Comet | Ob man erst die Waffe und dann die Stelle antippt oder ob ein Tipp genügt und die Waffe selbst zielt. | Beide zielen mit einem Tipp selbst auf die dichteste Gruppe (`target: 'crowd'` in `src/config/weapons.ts`). | offen | – | |

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
