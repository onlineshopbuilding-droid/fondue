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
| Beginner | 1 | medium | 3.8 (1-7) | 165 | 3.2/22 | 28 | 197/600/211 |
| Average | 1 | medium | 12.2 (7-14) | 1258 | 13.2/22 | 128 | 336/815/1729 |
| Pro | 1 | medium | 17.9 (15-20) | 2715 | 18.6/22 | 297 | 372/943/1892 |
| Beginner | 2 | medium | 5.6 (1-10) | 738 | 8.0/22 | 79 | 411/855/1803 |
| Average | 2 | medium | 19.5 (14-23) | 5865 | 21.1/22 | 424 | 667/1575/3401 |
| Pro | 2 | medium | 27.8 (27-29) | 11296 | 22.0/22 | 900 | 719/1736/3516 |
| Average | 1 | easy | 15.7 (14-19) | 1483 | 15.2/22 | 147 | 318/771/1573 |
| Average | 1 | hard | 9.4 (7-11) | 1040 | 11.2/22 | 109 | 347/980/1982 |

## Bewertung
- Zielbild Medium: Durchschnitts-Bot solo Tag 8–12. Erreicht: etwa Tag 12.
- Durchschnitts-Bots zu zweit kommen auf etwa Tag 19, das ist weiter als das Zielbild „etwas weiter“. Bots stimmen sich perfekt ab und verlieren nie Zeit, Menschen eher schon. Der Koop-Faktor steht deshalb bei 1,9 statt 1,6. Wer es härter will, erhöht `COOP.countFactor` in `src/config/waves.ts`.
- Die Wirtschaft erlaubt in langen Läufen die großen Upgrades: Ab etwa Tag 12 besitzt ein Durchschnitts-Bot rund 13 von 22.
- Der Schwierigkeitsgrad wirkt deutlich: Easy Tag 16, Medium Tag 12, Hard Tag 9.

## Grenzen
Bots zielen ohne Bewegung und fliegen nicht über das Feld wie eine Hand. Die absoluten Tage sind eine Orientierung, kein Versprechen für echte Spieler. Yetis besiegen Bots nur mit Waffen.
