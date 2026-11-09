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
| Average | 1 | medium | 9.2 (4-13) | 650 | 9.1/22 | 109 | 312/722/1276 |
| Pro | 1 | medium | 16.2 (14-22) | 2017 | 16.5/22 | 254 | 339/833/1660 |
| Beginner | 2 | medium | 4.2 (3-7) | 305 | 4.6/22 | 59 | 415/1046/234 |
| Average | 2 | medium | 16.1 (14-20) | 3600 | 19.8/22 | 339 | 627/1363/2953 |
| Pro | 2 | medium | 27.4 (25-29) | 9868 | 22.0/22 | 899 | 650/1550/3094 |
| Average | 1 | easy | 13.8 (13-14) | 1007 | 13.0/22 | 155 | 298/651/1338 |
| Average | 1 | hard | 6.1 (3-8) | 428 | 6.2/22 | 85 | 337/829/850 |

## Bewertung
- Zielbild Medium: Durchschnitts-Bot solo Tag 8–12. Erreicht: etwa Tag 9, mit einer Spanne von Tag 4 bis 13.
- Durchschnitts-Bots zu zweit kommen auf etwa Tag 16, das ist weiter als das Zielbild „etwas weiter“. Bots stimmen sich perfekt ab und verlieren nie Zeit, Menschen eher schon. Der Koop-Faktor steht deshalb bei 1,9 statt 1,6. Wer es härter will, erhöht `COOP.countFactor` in `src/config/waves.ts`.
- Die Wirtschaft erlaubt in langen Läufen die großen Upgrades: Profi-Bots besitzen am Ende rund 16 von 22, zu zweit alle.
- Der Schwierigkeitsgrad wirkt deutlich: Easy Tag 14, Medium Tag 9, Hard Tag 6.
- Der Anfänger-Bot scheitert auf Medium früh (Tag 3). Er braucht 1,5 s pro Wurf, verfehlt 30 % und nutzt kaum Waffen. Für Einsteiger ist Easy gedacht.

## Grenzen
Bots zielen ohne Bewegung und fliegen nicht über das Feld wie eine Hand. Die absoluten Tage sind eine Orientierung, kein Versprechen für echte Spieler. Yetis besiegen Bots nur mit Waffen.
