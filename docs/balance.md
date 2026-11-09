# Balance

Simulation ohne Grafik mit Bots, je 10 Läufe, Abbruch bei Tag 40. Bots nutzen dieselben Befehle wie Menschen. Reproduzieren: `npm run balance`, Ergebnis in `docs/balance-latest.md`.

## Bot-Profile
| Bot | Zeit pro Griff und Wurf | Fehlwürfe | Waffe alle |
|---|---|---|---|
| Beginner | 1,5 s | 30 % | 12 s |
| Average | 0,95 s | 15 % | 6 s |
| Pro | 0,6 s | 5 % | 2,5 s |

## Ergebnis
| Bot | Spieler | Stufe | Tag erreicht (Mittel, min-max) | Kills | Upgrades | Offerings gesamt | Gold Tag 1/3/7 |
|---|---|---|---|---|---|---|---|
| Beginner | 1 | medium | 2.9 (1-4) | 75 | 2.0/22 | 14 | 195/364/0 |
| Average | 1 | medium | 8.9 (4-11) | 612 | 8.8/22 | 108 | 312/722/1290 |
| Pro | 1 | medium | 15.9 (14-18) | 1928 | 16.5/22 | 246 | 339/833/1677 |
| Beginner | 2 | medium | 4.1 (3-6) | 293 | 4.5/22 | 55 | 415/1046/0 |
| Average | 2 | medium | 16.2 (14-21) | 3605 | 19.6/22 | 350 | 627/1363/2911 |
| Pro | 2 | medium | 27.1 (25-29) | 9689 | 22.0/22 | 880 | 650/1550/3097 |
| Average | 1 | easy | 14.1 (13-15) | 1026 | 13.2/22 | 164 | 298/651/1295 |
| Average | 1 | hard | 5.9 (3-7) | 409 | 5.8/22 | 77 | 337/829/667 |

## Bewertung
- Zielbild Medium: Durchschnitts-Bot solo Tag 8–12. Erreicht: etwa Tag 9, mit einer Spanne von Tag 4 bis 11.
- Durchschnitts-Bots zu zweit kommen auf etwa Tag 16, das ist weiter als das Zielbild „etwas weiter“. Bots stimmen sich perfekt ab und verlieren nie Zeit, Menschen eher schon. Der Koop-Faktor steht deshalb bei 1,9 statt 1,6. Wer es härter will, erhöht `COOP.countFactor` in `src/config/waves.ts`.
- Die Wirtschaft erlaubt in langen Läufen die großen Upgrades: Profi-Bots besitzen am Ende rund 16 von 22, zu zweit alle.
- Der Schwierigkeitsgrad wirkt deutlich: Easy Tag 14, Medium Tag 9, Hard Tag 6.
- Der Anfänger-Bot scheitert auf Medium früh (Tag 3). Er braucht 1,5 s pro Wurf, verfehlt 30 % und nutzt kaum Waffen. Für Einsteiger ist Easy gedacht.

## Grenzen
Bots zielen ohne Bewegung und fliegen nicht über das Feld wie eine Hand. Die absoluten Tage sind eine Orientierung, kein Versprechen für echte Spieler. Yetis besiegen Bots nur mit Waffen.
