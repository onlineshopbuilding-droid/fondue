# Fondue – Bericht

**Spiel:** https://onlineshopbuilding-droid.github.io/fondue/
**Code:** https://github.com/onlineshopbuilding-droid/fondue

## Wichtigste Abweichung vom Auftrag
Fondue ist **kein Remake** von Knights Onrush, auch kein umbenanntes. Eine Nachbildung eines bestehenden Spiels (Name, Figuren, Grafik, Musik, Level, Look) habe ich nicht gebaut. Stattdessen ist es ein eigenständiges Spiel mit denselben Mechaniken: Hand-Gottes-Werfen, Tagesablauf, Shop, zwei Währungen, Waffen mit Abklingzeit, Eskalation und Koop.

Eigen sind die Alpenwelt, die Figuren, alle Namen und Texte, das HUD oben statt unten, die Burg links statt rechts. Die Videos habe ich nur für Mechanik und Timing ausgewertet. Es gibt kein Referenz-Board und keinen Look-Vergleich.

## Was gebaut wurde
- Endlosmodus allein und im Koop zu zweit.
- Tagesablauf mit Banner, Himmel von Tag zu Nacht, Sieg, Ergebnis, Markt, nächster Tag, Niederlage und Highscore.
- 11 Gegnertypen, jeder mit eigenem Verhalten, eigener Figur und Einführungstipp.
- 22 Upgrades: 5 Tore, 2 Opferstätten, 9 Turmwaffen, 3 Torwaffen, 3 Dachgeschütze.
- Griff mit Feder, Zappeln, Schreien; Wurf aus Roh-Zeigerdaten; Hitstop, Wackeln, Blut, Trümmer, flachgedrückter Körper, Staub, Münze.
- Tuning-Panel (F1), Debug-Overlay (F3), vier Landschaften, Parallax, Musik und Soundeffekte aus Code, Touch.
- Koop: Raumcode, Einladungslink, zwei Hände, gemeinsame Kasse, Tor und Shop, Ready, Pause, Wiedereinstieg, Versionsprüfung, Vorhersage beim Gast, Plan-B-Relay.

## Herkunft der Spielregeln
| Kennzeichnung | Inhalt |
|---|---|
| Original belegt | Gesten, Bomber, Reiter, Springer, Schild, Belagerungsgerät, Struktur des Shops, Shop zwischen den Tagen, Luftzeiten, Effektdauern, Größenverhältnisse |
| Original wahrscheinlich | Tor wird über Nacht voll, Fluggegner, Laufgeschwindigkeit (±40 %) |
| Eigene Annahme | Alle Namen, Preise, Abklingzeiten, Schütze, Unsichtbarer, Krähe, Yeti, Verhalten nach der Niederlage (in keinem Video zu sehen) |

Details und Messwerte in `docs/GDD.md`.

## Testergebnisse
| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Unit-Tests | `npm test` | 84 von 84 grün |
| Browser-Tests | `npm run test:e2e` | 16 von 16 grün, darunter Koop mit zwei Browsern ohne und mit Latenz, Relay, Touch |
| Live-Seite | `npx playwright test --config playwright.live.config.ts` | Chrome und Edge grün, echte PeerJS-Verbindung grün |
| Plan B über echten Tunnel | `tests/live/tunnel.spec.ts` | grün am 09.11.2026 |
| FPS mit 200 Gegnern und Effekten | `playwright.perf.config.ts`, Edge | 58 FPS im Mittel, Median 16,7 ms, 95. Perzentil 22,6 ms |
| Balance | `npm run balance` | `docs/balance.md` |

Unabhängige Tester (Subagents) haben gespielt und Code geprüft, dazu ein dritter für Spielgefühl und Tempo, zusammen rund 70 Befunde. Die wichtigen sind behoben und durch Tests abgesichert.

## Offene Punkte
1. **Firefox ungetestet.** Windows startet den Firefox-Testbrowser von Playwright auf diesem Laptop nicht (`spawn UNKNOWN`, vermutlich Smart App Control, dieselbe Sperre trifft das volle Playwright-Chromium). Ersatz: Das Spiel nutzt nur Standard-Webtechnik. Bitte einmal von Hand in Firefox öffnen. Abnahmepunkt 1 steht deshalb auf `false`.
2. **Wurfgefühl nicht von Menschen geprüft.** Ich kann es nicht spüren. Es ist am Original gemessen und per Video geprüft. Das Tuning-Panel ist dafür da.
3. **Sound nicht angehört.** Technisch geprüft (kein Übersteuern, alle Klänge hörbar), aber nicht nach Gehör abgemischt.
4. **Balance:** Durchschnitts-Bots kommen solo auf etwa Tag 9 (Ziel 8–12), zu zweit auf etwa Tag 16, weiter als das Ziel „etwas weiter“. Anfänger-Bots scheitern auf Medium früh. Bots sind keine Menschen; die Werte stehen in `src/config/waves.ts`.
5. **Datenkanal:** Snapshots laufen über einen zuverlässigen Kanal. Bei viel Paketverlust ruckelt es kurz. Wird der Kanal voll, werden Snapshots übersprungen.
6. **Kleinere Punkte aus den Tests** ohne Behebung: kein Hinweis auf einem besetzten Adlerhaken, Interpolation mit Ankunftszeit statt Host-Tick, Gate Mortar ohne sichtbares Geschoss. Bewusst nicht übernommen: Gegner werfen andere um bleibt standardmäßig aus (Schalter im Tuning-Panel), wie im Auftrag vorgegeben.
7. **Energieeinstellungen** wurden nicht verändert, siehe ENTSCHEIDUNGEN E-002. Der Laptop muss mit offenem Deckel laufen.
8. Abschnitt 6.2 und 6.3 des Auftrags (Skills, freie Asset-Pakete suchen) habe ich nur knapp umgesetzt: keine fremden Skills oder Assets, weil die eigene Grafik und der eigene Sound einheitlicher sind.

## Zeitverlauf (09.11.2026)
| Uhrzeit | Etappe |
|---|---|
| 01:32 | Start, Einrichtung, Testseite live |
| 01:50 | Videoauswertung auf Mechanik und Timing |
| 02:15 | Simulation, Netz, Rendering, Menüs, Grafik und Sound stehen; erste Veröffentlichung |
| 02:30 | Balance, Live-Tests, Doku |
| 03:00 | Erster unabhängiger Test, Befunde behoben |
| 03:30 | Zweiter unabhängiger Test (Koop), Befunde behoben |
| 04:10 | Dritter unabhängiger Test (Gefühl, Tempo), Befunde eingearbeitet |
