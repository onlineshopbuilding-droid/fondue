# Messungen Koop: Ruckeln beim Gast (E2)

Stand 14.11.2026, Paket P-Coop.

## Ursache

Der Gast hat jeden Snapshot mit dem Zeitpunkt seiner **Ankunft** abgelegt und zwischen diesen Zeitpunkten 100 ms hinter der Gegenwart gezeichnet. Snapshots kommen aber nicht gleichmäßig an:

- Jitter im Netz (25 ms auf 33 ms Abstand) macht aus gleich großen Schritten des Hosts ungleich lange Strecken beim Gast: ein Räuber läuft mal mit halber, mal mit doppelter Geschwindigkeit.
- Der Kanal ist zuverlässig und geordnet: Muss ein Paket nachgesendet werden, warten die nächsten mit und kommen dann auf einmal. Ein langsamer Frame beim Host schickte außerdem 2 bis 3 Snapshots auf einmal.
- Mit den 2,5-mal schnelleren Räubern (B4) werden diese Sprünge groß genug, dass man sie deutlich sieht.

Paketgröße und Rate waren nicht das Problem: etwa 400 bis 440 Byte pro Snapshot (höchstens 560), 30 pro Sekunde, also rund 13 KB/s. Die eigene Hand zeichnet der Gast schon vorher sofort an der Fingerstelle (Browser-Test prüft das jetzt).

## Behebung

- `PlayoutBuffer` (`src/net/interp.ts`): Snapshots liegen auf der Uhr des Hosts (`tick`). Gezeichnet wird ein selbst eingestellter Abstand dahinter (Snapshot-Abstand + 90-%-Jitter + 10 ms, 50 bis 250 ms). Fehlt ein Snapshot, laufen Figuren höchstens 100 ms weiter. Pause wird erkannt, das Bild läuft nie rückwärts.
- Der Host schickt höchstens einen Snapshot pro Frame (`src/game/session.ts`).
- Ereignisse kommen um denselben Abstand verzögert, damit Treffer und Bild zusammenpassen.

## Messung 1: Rechenmodell (genau, unabhängig vom Rechner)

Ein Räuber läuft mit 250 px/s, der Host rechnet 60 Ticks pro Sekunde, der Gast zeichnet mit 60 Bildern pro Sekunde, Netz wie `withLatency` (Grundlatenz + gleichverteilter Jitter, Nachsendung = +2 × Latenz, geordnet). Gemessen: Abweichung der Geschwindigkeit auf dem Bildschirm von der wahren, je Bild.

| Netz | Host-Frame | vorher: Mittel / 95 % | nachher: Mittel / 95 % | Abstand nachher |
|---|---|---|---|---|
| kein Netz | 16,7 ms | 0 % / 0 % | 0 % / 0 % | 50 ms |
| 60 ms, Jitter 25, 2 % Verlust | 16,7 ms | 30,2 % / 86,1 % | 3,2 % / 9,5 % | 75 ms |
| 60 ms, Jitter 25, 2 % Verlust | 50 ms (langsamer Host) | 55,7 % / 168,4 % | 2,2 % / 11,3 % | 81 ms |
| 120 ms, Jitter 40, 2 % Verlust | 16,7 ms | 47,9 % / 117,5 % | 9,5 % / 46,0 % | 215 ms |

Standbilder (Räuber bewegt sich in einem Bild gar nicht): bei 60/25/2 % vorher 1,6 %, nachher 0,2 %.

## Messung 2: zwei Browserfenster (`tests/e2e/coopLag.spec.ts`)

Host und Gast im selben Chromium über Loopback, `&lat=60&jit=25&loss=0.02`, Software-Grafik. Der Laptop war während der Messung stark ausgelastet (CPU um 80 %, andere Testläufe parallel): Bildzeiten beim Gast 140 bis 200 ms. Die Werte schwanken deshalb stark; sie zeigen die Richtung. Je zwei Durchläufe, gleiche Ausgangsversion, einmal ohne und einmal mit Änderung (ohne die Host-Änderung „ein Snapshot pro Frame“).

| Messwert | vorher (Lauf 1 / 2) | nachher (Lauf 1 / 2) |
|---|---|---|
| Geschwindigkeitsfehler je Bild, Mittel | 161 % / 227 % | 72 % / 61 % |
| Geschwindigkeitsfehler je Bild, 95 % | 593 % / 922 % | 142 % / 175 % |
| ohne Netzverzögerung, Mittel / 95 % | 78 % / 308 %, 204 % / 910 % | 40 % / 99 %, 28 % / 80 % |
| Snapshot-Größe Mittel / höchstens | 386–415 / 561 Byte | 405–438 / 562 Byte |
| Snapshot-Abstand beim Gast, 95 % | 368–482 ms | 346–484 ms |
| Bildzeit Gast, Mittel | 167–235 ms | 146–206 ms |

Ein dritter Lauf mit dem fertigen Stand (auch „ein Snapshot pro Host-Frame“) bei Bildzeiten um 185 ms: Fehler Mittel / 95 % ohne Netz 69 % / 219 %, mit 60/25/2 % 83 % / 199 %. Der Host schickte dabei nur 4,5 bis 5,5 Snapshots pro Sekunde, weil jeder seiner Frames so lange dauerte; auf einem normalen Gerät (60 Bilder pro Sekunde) sind es 30.

Die großen Snapshot-Abstände kommen vom ausgelasteten Rechner (der Host-Tab steht zeitweise), nicht vom Netz. Ein Rest an Fehlern bleibt deshalb auch nachher: Wo der Host nichts schickt, kann der Gast nichts Richtiges zeigen.

## Ungeprüft

- Echte Geräte über das Internet (iPhone 16, OnePlus 8T) sind nicht gemessen. Das sollte der nächste Test zu zweit zeigen.
- Ein ruhiger Rechner für Messung 2 stand nicht zur Verfügung.
