# Wie Fondue funktioniert

Für alle mit Informatik-LK-Grundlagen. Am besten liest du parallel den genannten Code.

## 1. Aufbau
| Ordner | Aufgabe |
|---|---|
| `src/config/` | Alle Zahlen: Gegner, Preise, Wellen, Wurfgefühl. Hier drehst du am meisten. |
| `src/sim/` | Die Spielregeln als reine Logik, ohne Grafik. |
| `src/net/` | Verbindung zwischen zwei Browsern. |
| `src/game/` | Sitzung: verbindet Simulation, Netz und Darstellung. |
| `src/render/` | Darstellung mit Phaser: Figuren, Effekte, HUD. |
| `src/input/` | Mauszeiger aufzeichnen. |
| `src/ui/` | Menüs, Shop, Lobby, Tuning-Panel (normales HTML). |
| `src/art/`, `src/audio/` | Grafiken als SVG-Text und Klänge aus Code. |
| `server/relay/` | Plan-B-Server. |
| `tests/` | Unit-Tests, Browser-Tests, Balance-Bots. |

Die wichtigste Idee: **Logik und Darstellung sind getrennt.** `Sim` weiß nichts von Bildern. Dadurch können wir sie ohne Browser testen und in Sekunden hunderte Tage simulieren.

## 2. Game Loop und fester Zeitschritt
Ein Spiel berechnet immer wieder den nächsten Zustand und zeichnet ihn. Bildschirme laufen aber unterschiedlich schnell. Würden wir pro Bild einen Schritt rechnen, liefe das Spiel auf einem 144-Hz-Monitor schneller.

Darum sammelt `HostSession.update` die vergangene Zeit und rechnet in festen Schritten von 1/60 Sekunde (`src/game/session.ts`):

```ts
this.acc += dtMs / 1000;
while (this.acc >= DT) {
  this.sim.step();
  this.acc -= DT;
}
```

Zufall kommt aus einem Generator mit Startwert (`src/sim/rng.ts`). Gleicher Startwert und gleiche Eingaben ergeben also exakt denselben Spielverlauf. Das nennt man deterministisch, und ein Unit-Test prüft es.

## 3. Wie das Werfen berechnet wird
1. `src/input/pointer.ts` speichert jede Zeigerposition mit Zeitstempel, auch die Zwischenwerte (`getCoalescedEvents`).
2. Beim Loslassen rechnet `velocity()` die Geschwindigkeit der letzten 110 ms aus. Neuere Abschnitte zählen stärker. Hält man am Ende still, gibt es kaum noch Samples und der Wurf fällt schwach aus.
3. `Sim.throwEnemy` multipliziert mit dem Wurffaktor und begrenzt auf die Höchstgeschwindigkeit.
4. In der Luft gilt einfache Physik pro Schritt: `v += g * dt`, dann `pos += v * dt`.
5. Beim Bodenkontakt entscheidet die Aufprallgeschwindigkeit: ab 900 px/s tot, sonst abprallen und benommen sein.

Während des Haltens zieht eine **gedämpfte Feder** die Figur zur Hand: `a = k * (ziel - pos) - c * v`. Daher hängt sie leicht nach und schwingt.

Das gute Gefühl entsteht zum großen Teil außerhalb der Physik: Beim Aufprall friert das Bild kurz ein (Hitstop), der Bildschirm wackelt, Teile fliegen, der Körper wird flach, es klatscht. Der Hitstop ist reine Darstellung (`src/render/scene.ts`), die Simulation läuft weiter.

## 4. Online-Koop
### Host-autoritativ
Nur der Host rechnet. Der Gast schickt Eingaben und bekommt Zustände zurück. So können die beiden nie auseinanderlaufen und betrügen geht auch nicht.

### WebRTC
Zwei Browser können direkt miteinander sprechen, müssen sich aber erst finden. Dafür gibt es:
- den **Vermittlungsserver** von PeerJS, über den der Verbindungsaufbau läuft,
- **STUN**-Server, die dem Browser seine öffentliche Adresse nennen.

Danach fließen die Daten direkt zwischen den Laptops. Blockiert das Netz das (typisch in Wohnheimen), bräuchte man ein **TURN**-Relay. Einen kostenlosen ohne Konto gibt es nicht zuverlässig, darum bauen wir für Plan B einen eigenen kleinen Weiterleitungsserver und machen ihn mit cloudflared erreichbar.

### Snapshots und Interpolation
Der Host schickt 30-mal pro Sekunde den Zustand (`src/net/snapshot.ts`), als kurze Zahlenlisten statt Objekten. Der Gast zeichnet nicht den neuesten Stand, sondern den von vor 100 ms, und interpoliert zwischen zwei Snapshots. Dadurch ruckelt nichts, auch wenn Pakete unregelmäßig ankommen.

### Vorhersage
Eine Runde Deutschland–Schweiz dauert vielleicht 30 ms, aber ohne Tricks spürt man jede Verzögerung. Deshalb macht der Gast manches sofort selbst (`GuestSession`):
- Die eigene Hand wird ohne Umweg gezeichnet.
- Packt er zu, sucht er selbst den Gegner und zeigt ihn sofort an der Hand. Sagt der Host nein, wird das zurückgenommen.
- Die Wurfgeschwindigkeit misst der Gast lokal und schickt sie mit, damit Netzwerkschwankungen sie nicht verfälschen.
- Bis der Host nachzieht, fliegt der Gegner beim Gast mit derselben Physik.

## 5. Werte ändern
Alles Wichtige steht in `src/config/`. Beispiele:
- Gegner langsamer: `speed` in `enemies.ts`.
- Mehr Gold: `gold` in `enemies.ts`.
- Teurere Upgrades: `shop.ts`.
- Längere Tage: `DAY.seconds` in `waves.ts`.

Mit `npm run dev` siehst du die Änderung sofort unter http://localhost:5173. Live-Werte probierst du im Tuning-Panel aus (F1) und übernimmst sie per Export in `config/tuning.ts`.

## 6. Neue Features mit Claude Code
Claude Code liest beim Start `CLAUDE.md`. Gute Aufträge nennen Ziel und Prüfung, etwa: „Füge einen Gegner hinzu, der ... Schreibe dafür einen Unit-Test.“

Hilfreiche Befehle:
```
npm run dev
npm test
npm run test:e2e
npm run balance
```

Neuer Gegner in vier Schritten: Typ und Werte in `config/enemies.ts`, Verhalten in `Sim.updateEnemy`, Figur in `src/art/characters/`, Test in `tests/unit/sim.test.ts`.
