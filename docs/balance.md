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
| Beginner | 1 | medium | 3.3 (1-7) | 137 | 2.5/22 | 21 | 203/654/131 |
| Average | 1 | medium | 13.7 (13-14) | 1550 | 14.7/22 | 176 | 337/815/1745 |
| Pro | 1 | medium | 17.3 (15-23) | 2584 | 18.2/22 | 292 | 376/947/1908 |
| Beginner | 2 | medium | 4.9 (1-10) | 590 | 6.4/22 | 84 | 424/951/1243 |
| Average | 2 | medium | 18.1 (15-22) | 5176 | 20.7/22 | 381 | 672/1606/3388 |
| Pro | 2 | medium | 27.6 (26-30) | 11147 | 22.0/22 | 892 | 720/1773/3540 |
| Average | 1 | easy | 16.7 (15-18) | 1667 | 16.2/22 | 201 | 324/769/1573 |
| Average | 1 | hard | 10.1 (7-12) | 1169 | 12.0/22 | 138 | 352/1004/1969 |

## Bewertung
- Zielbild Medium: Durchschnitts-Bot solo Tag 8–12. Erreicht: etwa Tag 14, knapp darüber. Dort tauchen die ersten Yetis auf, die allein nur mit Waffen zu schlagen sind, und werden zur Wand.
- Durchschnitts-Bots zu zweit kommen auf etwa Tag 18, das ist weiter als das Zielbild „etwas weiter“. Bots stimmen sich perfekt ab und verlieren nie Zeit, Menschen eher schon. Der Koop-Faktor steht deshalb bei 1,9 statt 1,6. Wer es härter will, erhöht `COOP.countFactor` in `src/config/waves.ts`.
- Die Wirtschaft erlaubt in langen Läufen die großen Upgrades: Ein Durchschnitts-Bot besitzt am Ende rund 15 von 22.
- Der Schwierigkeitsgrad wirkt deutlich: Easy Tag 17, Medium Tag 14, Hard Tag 10.

## Grenzen
Bots zielen ohne Bewegung und fliegen nicht über das Feld wie eine Hand. Die absoluten Tage sind eine Orientierung, kein Versprechen für echte Spieler. Yetis besiegen Bots nur mit Waffen.
