# Ideen für später

## Vorgehalten im großen Update (Platz im Modell, nicht gebaut)

Diese Punkte hat der Auftrag des großen Updates ausdrücklich „vorhalten, nicht bauen“ genannt (Abschnitte 8.4, 8.5, 10.3, 12, 14). Zu jedem steht, wo der Code schon Platz dafür lässt.

| Idee | Worum es geht | Wo im Modell Platz ist |
|---|---|---|
| **Schnellspiel („Quick Play“)** | Ein kurzes Level über wenige Tage mit kleiner Belohnung, für Bus oder Pause. Weder Kampagne noch Endlos, nicht zu verwechseln mit dem Entwickler-Schnellstart. | Name `quickPlay` in `RESERVED_MODES` (`src/modes/index.ts`). Ein neuer Modus ist eine Klasse hinter `GameMode` (`src/modes/mode.ts`); feste Tage gehen schon mit `FixedPlanner` (`src/sim/plan.ts`). |
| **Koop-Kampagne** | Eine zweite Kampagne mit etwa 10 bis 50 Leveln, nur zu zweit spielbar, früh verfügbar. | Name `coopCampaign` in `RESERVED_MODES`; Feld `coopCampaign` im Profil (`src/profile/schema.ts`); Level sind Daten (`LevelDef`), eine zweite Level-Liste passt neben `buildCampaign()`. |
| **Wahnsinn** | Dauerfeuer, Waffen laden doppelt so schnell, Gegner ohne Ende. | Name `madness` in `RESERVED_MODES`. |
| **Sterne-Bewertung und Challenges** | Ein bis drei Sterne je Leistung, Sterne für Aufgaben wie „lass fünf Keg Haulers explodieren“, Bonus-Sterne. | Die Simulation zählt schon mit (`RunStats` in `src/sim/stats.ts`, Felder in `RunStatsData` in `src/sim/rules.ts`: Kills nach Ursache und Typ, Fass-Explosionen, Opfer, Waffenschüsse, Torschaden). Eine Challenge ist dann nur eine Regel auf diesen Zahlen in `reward` des Modus. |
| **Sterne und eigene Währung trennen** | Sterne als Sammelobjekt, daneben eine Währung zum Ausgeben. | Das Profil trennt schon `stars` (ausgebbar) und `starsEarned` (je verdient). Eine neue Währung ist ein neues Feld mit einem Migrationsschritt (`MIGRATION_STEPS` in `src/profile/migrations.ts`). |
| **Weitere Welten** | Nach Level 100 ruft ein neuer König aus einer anderen Welt, zum Beispiel ein Amerikaner, der alle Burger gesammelt hat. | `WORLDS` in `src/config/worlds/index.ts`; eine Welt ist ein Ordner wie `src/config/worlds/fondue/`. Das Profil führt Fortschritt je Welt (`worlds[weltId]`). Noch fest an Welt 1 hängen: Lobby, Popup und Tutorial lesen die Story direkt aus `worlds/fondue/story.ts`, und `WorldDef` hat noch kein Story-Feld. |
| **Accounts und Cloud-Speicher** | Konto mit E-Mail und Passwort, Login auf einer eigenen Webseite, Spielstand auf jedem Gerät. | Speicher-Schnittstelle `ProfileStore` (`src/profile/store.ts`), heute `LocalProfileStore`; das Profil hat `profileId`, `createdAt`, `updatedAt` und lässt sich als Textcode packen (`src/profile/codec.ts`). |
| **Käufe** | Käufe außerhalb der App-Stores. | Noch nichts gebaut; hängt an Accounts. |
| **Mehr Hände** | Weitere Hände als spätere Freischaltung. | `HANDS` in `src/config/hand.ts` ist eine Liste; heute ist es eine Hand mit drei Stufen. Freischaltungen kennen schon die Art `hand` (`UNLOCKS`). |
| **Kessel-Upgrades** | Kürzere Verwandlung, mehrere Gegner gleichzeitig. | Feld `tier` je Opferstätte in `STATIONS` (`src/config/keep.ts`), heute überall 1. |
| **Besondere Belohnung am Adlerhaken** | Der Haken gibt später etwas Eigenes, zum Beispiel eine eigene Währung. | Ebenfalls `STATIONS.perch.tier`; die Statistik zählt Opfer (`offerings`). |
| **Drei bis vier Spieler** | Mehr als zwei Hände im Koop. | Namen, Hand-Stufen (`handStart`) und Hände sind Listen; das Raum-Fenster hat eine Zeile je Platz (`src/ui/screens/roomParts.ts`). Der Netzcode kennt heute genau einen Gast. |

## Modi
- **Versus** und **Rollenteilung** (siehe unten). Kampagne und Wahnsinn: siehe oben.
- **Versus**: Einer verteidigt, der andere schickt die Gegner. Oder Spiegel-Duell mit zwei Toren.
- **Rollenteilung im Koop**: Einer wirft, der andere bedient die Waffen.

## Spielgefühl
- Tauziehen, wenn beide denselben Gegner packen.
- Kleine Ping-Markierung für den Mitspieler.
- Kombos: Mehrere Kills in kurzer Zeit geben Bonusgold.
- Würfe, die andere treffen, als kaufbares Upgrade.

## Inhalte
- Spiegelung der Seiten als Option.
- Bosse auch im Endlos-Modus (in der Kampagne gibt es seit dem großen Update jedes zehnte Level ein Boss-Level).
- Mehr Landschaften (heute vier, die Kampagne wechselt sie alle 12 bis 13 Level), Wetter (Schnee verlangsamt, Wind lenkt Würfe ab).
- Eigene Hände und Burgen zum Freischalten.

## Technik
- Store-Version für iPhone und Android (seit dem großen Update ist Fondue ein Handyspiel im Querformat; was bis zum Store fehlt, steht im Handbuch, Abschnitt 10).
- Eigener TURN-Server, falls Plan B oft gebraucht wird.
- Mitschnitte der besten Läufe.
- Finaler Name: Der Arbeitstitel steht nur in `src/config/game.ts`.

## Aus der großen Änderungsrunde
- Mehr Hände freischaltbar: siehe Tabelle oben.
- Käse-Story: umgesetzt im großen Update (König Fridolin, Mäuse und Ratten in Ritterkostümen, Storybuch, ein Satz je Level; `src/config/worlds/fondue/story.ts`).
- Kessel-Upgrades: siehe Tabelle oben.
- Hintergrund stärker nutzen: Der Kessel steht seit dem großen Update hinter der Burg (E-048). Weitere Ideen: mehr Ziele in der Tiefe, Gegner hinter die Burg werfen.
- Endlosmodus, der bei sehr guter Spielweise fast unendlich geht: Mit fünf Stufen kommt der beste Bot im Median auf Tag 48,5 (höchstens 52); ein eingebautes Ende gibt es nicht.
