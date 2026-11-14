# Fondue v0.3 – Unabhängige Prüfung (Etappe 5)

Geprüft am 14.11.2026 zwischen 07:40 und 09:15 (WEST) von `pruefer` (Claude Sonnet 5.5), Stand `5a137ce` auf `v0.3-dev`. Alle Browser-Läufe gingen gegen die **gebaute App** (`npm run build`, ausgeliefert mit `vite preview`, Konfiguration `tests/playwright.dist.config.ts`), nicht gegen den Entwicklungsserver. Der Rechner zeichnet mit Software-Grafik; Zeiten in Spielzeit (Ticks zu 1/60 s) sind davon unabhängig, Echtzeiten nicht.

**Kurzfassung:** Einheitstests, Typprüfung, Build und Balance-Lauf laufen. Im Browser scheitert ein einziger Test (`keep.spec.ts`, Adlerhaken, auf allen drei Formaten), weil er nach der Änderung des Adlerhakens veraltet ist, nicht weil das Spiel kaputt wäre. Die Zeit bis zum ersten Räuber liegt überall unter 1,3 Sekunden. Das Durchspielen von der Vorrunde bis zum fünften Slot gelingt auf allen drei Formaten. Von 34 Abnahme-Einträgen sind **30 erledigt und 4 offen** (B5, C7, G1, G3).

## 1. Testläufe

| Lauf | Ergebnis |
|---|---|
| `npx tsc --noEmit` | sauber, Exit 0 |
| `npm test` | **575 von 575 Tests grün**, 38 Dateien, 6,1 s |
| `npm run build` | grün (Hinweis von Vite: ein Teil über 500 kB, nur Warnung) |
| `npm run test:e2e` gegen `dist` | 92 Tests: **85 grün, 3 rot, 4 übersprungen**, 33,6 min |
| `npm run balance` | Exit 0, 1 Test grün, 214 s; die Tabelle „Ziele auf einen Blick“ meldet **B5 „Great spät mehr Versuche“ als nicht erfüllt** |
| eigene Prüfläufe `tests/check/` | Koop-B3 6 von 6 grün; Durchspielen Laptop und OnePlus 8T grün, iPhone 16 beim ersten Lauf rot, beim zweiten grün (siehe Fehler 3) |

Die 4 übersprungenen Tests sind `look.spec.ts` (Laptop und Handy, jeweils zwei Tests); sie laufen nur mit `ALL_SCREENS=1`. Ungeprüft: `playwright.live.config.ts` (Live-Adresse) und `playwright.perf.config.ts` (FPS), beide nicht Teil dieses Auftrags.

### Ausgabe der drei roten Tests

Alle drei: `tests/e2e/keep.spec.ts:98` „… a keg is shaken loose, a raider melts in the pot behind the keep, the eagle takes one“ (Laptop, iPhone 16, OnePlus 8T).

```
Error: waitFor timed out; last value: {"phase":"battle","wave":4,"gold":60,"crests":0,"gateHp":800,"gateMax":800, ... "enemies":[{"id":8,"type":"bomber",...
  at waitFor (tests\e2e\helpers.ts:106:47)
  at tests\e2e\keep.spec.ts:158:5      // waitFor(... enemies[0]?.st === 'hooked', 4000, 30)
```

Ursache siehe Fehler 1.

## 2. B3: Zeit bis zum ersten sichtbaren Räuber (Spielzeit, Grenze 2,0 s)

Gemessen mit `tests/e2e/firstRaider.spec.ts` (allein, nach den Leveln 1 bis 5 und im Endlos-Modus) und `tests/check/coopStartDevices.spec.ts` (Koop, Host und Gast beide im jeweiligen Format; Messung: Spielzeit des Hosts, bis ein Räuber im sichtbaren Feld des Gasts steht).

| Format | L1 | L2 | L3 | L4 | L5 | Endlos | Koop Kampagne | Koop Endlos |
|---|---|---|---|---|---|---|---|---|
| iPhone 16 quer 852 × 393 | 0,80 | 0,45 | 0,50 | 0,55 | 0,42 | 0,42 | 0,92 | 0,98 |
| OnePlus 8T quer 915 × 412 | 0,82 | 0,48 | 0,53 | 0,42 | 0,48 | 0,43 | 1,20 | 1,12 |
| Laptop 1280 × 720 | 0,82 | 0,43 | 0,50 | 0,47 | 0,42 | 0,45 | 1,18 | 1,03 |

Alle Werte in Sekunden, alle höchstens 2,0 (größter Wert 1,20 s im Koop). Das Ziel von 1,5 s Startwert wird überall unterschritten. Der bestehende Test `coopStart.spec.ts` (nur Laptop) gab 1,12 s (Kampagne) und 1,22 s (Endlos).

## 3. Durchspielen mit frischem Profil

Skript `tests/check/playthrough.spec.ts`, ein Lauf je Format, je 7 bis 8 Minuten. Ablauf: Vorrunde mit echtem Wisch und Antippen des Rolling Wheel, dann Level 1 bis 11 nacheinander; zwischen den Leveln nur über die Oberfläche des Shops: alles freischalten, was der Käse hergibt, alles verbessern, was das Gold hergibt, leere Slots belegen. Gewonnen werden die Level mit derselben Abkürzung wie in `tutorial.spec.ts` (letzte Welle springen, Gold wie bei vollständigem Sieg). Keine Freischaltung per Cheat. Screenshots: `docs/screenshots/v0.3/check-<format>-*.png` (57 Bilder).

Ergebnis auf allen drei Formaten gleich (die Zahlen sind durch die Abkürzung optimistisch, jedes Level „gewinnt“ alles Gold):

- Nach der Vorrunde: Käse 0, Gold 0, genau das Rolling Wheel, angelegt im Schaden-Slot (C4 erfüllt).
- Level 1: +3 Käse (Sieg, Tor über 50 % und 90 %), 420 Gold, „To the Keep Shop“ führt direkt in den Shop; Rolling Wheel Stufe 2 kostet 240 Gold und ist bezahlbar.
- Level 2 bis 11: je +3 Käse. Slots öffnen nach Level 2 (Slow, mit Sticky Fondue), 4 (Gate, mit Gate Mortar), 7 (Support, mit Golden Fondue) und 11 (Passive, mit Marmot Sentry); jedes Mal zeigt der Sieg-Bildschirm die Einführung des Königs und die neue Waffe. Der erste Sieg-Bildschirm nach einer Freischaltung ist auf dem iPhone ohne Scrollen lesbar (`check-iphone-16-won-l11.png`).
- „Continue“ führt nach Level 1 in den Shop, nach allen späteren Leveln in die Lobby.
- Nach Level 11: alle fünf Slots belegt (Rolling Wheel, Sticky Fondue, Gate Mortar, Golden Fondue, Marmot Sentry), Waffen Stufe 4, Burg Stufe 4, Hand Stufe 3, 15 Käse und 1 840 Gold übrig, Endlos in der Lobby offen, Level 12 startet mit den fünf Slots (`check-*-battle-l12-five-slots.png`). Die Versionszeile „v0.3 · build 5a137ce“ steht klein in der Lobby (`check-*-lobby-end.png`).

Auffälligkeiten beim Durchspielen (keine Abbruchfehler):

- **Warten am Deckel.** In den Leveln 6, 8 und 9 war im Shop nichts zu kaufen: Der Stufen-Deckel (Stufe 3 bis Level 10) hält den Ausbau an, Gold häuft sich auf 10 660 an und Käse auf 15, weil bis Level 11 keine neue Waffe kommt. Der Shop begründet es („Win level 25 to build tier 5“ in `shop.spec`), aber für einen Menschen fühlt sich das nach Leerlauf an. Mit echtem Spiel (nicht jeder Räuber getroffen) wäre es weniger Gold; ungeprüft.
- **Meldungen über der Siegertafel.** Wird ein Level in Sekunden beendet, liegen noch zwei violette Meldungen über dem König und seinen Sätzen (`check-laptop-won-l1.png`). Bei echter Spielzeit sind sie längst verschwunden (der Tutorial-Test wartet darauf); ungeprüft auf dem Handy.
- Die Endansicht des Shops in meinen Bildern zeigt jeweils den zuletzt angetippten Ort (Adlerhaken); das ist ein Kunstgriff des Skripts, nicht das, was ein Spieler zuerst sieht. Für den ersten Eindruck taugen `tutorial-shop-*.png` und `shop-overview-*.png`.

## 4. D1: findet ein neuer Spieler ohne Erklärung ein Upgrade?

Ich bin ein Prüf-Skript und kein Mensch ohne Vorwissen; das Urteil stützt sich auf den Ablauf und die Bilder (`tutorial-won-*.png`, `tutorial-shop-*.png`, `shop-overview-*.png`, `shop-upgrade-*.png`) und gilt für die Spur des ersten Upgrades, nicht für echtes Neulings-Verhalten (ungeprüft). In dieser Spur ja: Nach Level 1 sagt die Siegertafel in einem Satz, was Käse und Gold sind, und der einzige große Knopf heißt „To the Keep Shop“. Im Shop ist der Schaden-Slot schon gewählt, der König sagt „Now tap the glowing button: tier 2 for the wheel!“, der Knopf „Tier 2 · 240“ leuchtet, daneben stehen vorher und nachher als Bilder und als Satz („Iron-shod: hits harder and rolls through more raiders“), Käse, Gold und Wappen stehen oben rechts, ein ausgegrauter Ort sagt, wann er kommt („Unlocks after winning level 14“). Eine kleine Schwäche: Der Knopf „Take off“ am Rolling Wheel ist fast so groß und auffällig wie „Tier 2“; ein versehentliches Ablegen ist möglich, aber folgenlos, die Stufe bleibt. Ab Level 2 führt „Continue“ in die Lobby; der Shop liegt dort hinter dem Rüstungsständer mit dem Schild „Shop“, und im Shop zeigen Zeichen (+ für einen freien Slot, ! für Neues, Schloss) wo etwas zu holen ist. Ein Hinweis in der Lobby, dass im Shop Gold wartet, habe ich nicht gesehen.

## 5. Gefundene Fehler und Unstimmigkeiten

**Fehler 1: veralteter Browser-Test des Adlerhakens** (`tests/e2e/keep.spec.ts`, Zeilen 150 bis 158, Test „a keg is shaken loose, a raider melts in the pot …, the eagle takes one“, alle drei Formate).
Schritte: `npx playwright test tests/e2e/keep.spec.ts -g "eagle"`.
Erwartet: der Räuber hängt am Haken (`st === 'hooked'`). Tatsächlich: `waitFor` läuft nach 4 s ab. Der Test trägt den Räuber zum Haken und lässt ihn mit `p.up(160)` los, also ohne Wurf. Seit `f182e2d` (gezielter Adlerhaken, C6) zählt nur ein geworfener Räuber mit Mindesttempo 450 (`src/sim/stations.ts:50`: `e.thrownBy < 0` liefert `false`; `docs/GDD.md`: „ein hochgetragener und losgelassener Räuber zählt nicht“). Das Spiel verhält sich wie beschrieben, der Test muss einen echten Wurf zum Haken machen. Der Test darf dafür nur angepasst, nicht abgeschwächt werden. Der Teil „Keg schütteln“ und „Kessel“ im selben Test lief vorher durch.

**Fehler 2: falscher Tipp für selbst feuernde Passiv-Waffen** (`src/ui/content.ts:29`, angezeigt in `src/ui/app.ts:411`).
Schritte: Level 11 gewinnen, Marmot Sentry freischalten und anlegen, Level 12 starten.
Erwartet: ein Hinweis, der zur Waffe passt. Tatsächlich: „Marmot Sentry is on the keep. Just tap it to fire.“ (`check-*-battle-l12-five-slots.png`). Für den Sentry (schießt von selbst, Antippen löst einen Schnellschuss aus) halb richtig; für Roof Bolter, Storm Bell, Pinecone Catapult und Hornet Hive falsch, und der König sagt kurz vorher beim Slot „It works all by itself, no tap needed“. Klein.

**Fehler 3: die Seite hängt gelegentlich in einer langen Sitzung (nicht sicher reproduzierbar).** `tests/check/playthrough.spec.ts` auf dem Laptop (erster Lauf, 7,2 min): `page.screenshot` im Shop nach 15 s Zeitüberschreitung; auf dem iPhone 16 (erster Lauf, 7,9 min, im Shop nach Level 11): `locator.tap` auf `#spot-hand` „performing tap action“ nach 15 s Zeitüberschreitung, obwohl das Element sichtbar, aktiv und stabil war. Beide Läufe gingen bei der Wiederholung durch (Laptop 6,7 min, iPhone 8,1 min, OnePlus 8T gleich beim ersten Mal). Bei beiden stand die Hauptschleife der Seite offenbar länger als 15 s still. Ursache unbekannt (Software-Grafik, viele große Bilder im Shop oder wachsender Speicher über mehrere Levels in einer Sitzung). Gegenprobe auf einem echten Handy steht aus; sollte beim Test zu zweit auf Verlangsamung im Shop nach vielen Leveln geachtet werden.

**Unstimmigkeit 4: B5 beim sehr guten Bot** knapp nicht erfüllt: Wiederholung des Balance-Laufs gibt Versuche je Level 1 / 1 / 1 / 1,28 und Boss 1,7 gegen 1,0 (Schwelle im Test: mindestens +0,3), der Lauf von 05:42 gab 1,4 und 2,0. `docs/balance.md` nennt weiter die alten Werte als „erfüllt“. Alle anderen Zeilen sind im Wiederholungslauf identisch. Mein Lauf hat `docs/balance-latest.md` und `docs/balance-latest.json` neu geschrieben; ich habe sie **nicht** committet.

**Unstimmigkeit 5: Issue 1 hat keinen Kommentar** (`gh issue view 1`: zugewiesen, 0 Kommentare). C7 verlangt Screenshots als Kommentar.

**Unstimmigkeit 6:** `docs/GDD.md` nennt Boss-Level „7 bis 10 Minuten“, Auftrag, Test und Bot-Ziel 6 bis 10 Minuten. Der gemessene Median der Boss- und Sonderlevel ist 364 s, nur 10 von 19 liegen im Zielbereich (Untergrenze 360 s).

## 6. Abnahme-Zusammenfassung

**30 erledigt, 4 offen, 0 abgeschaltet** (Belege je Eintrag in `docs/v0.3/abnahme.json`).

Offen:

- **B5:** Great-Bot spät und bei Bossen nicht deutlich genug gefordert im Wiederholungslauf (1,28 statt ≥ 1,3; Boss 1,7). Die beiden anderen Teile sind belegt.
- **C7:** Burg-Stufen auf allen drei Formaten belegt; es fehlt der Kommentar in Issue 1.
- **G1:** wegen der drei roten Tests (Fehler 1) und B5.
- **G3:** Liste „Was für den Store-Bau noch nötig ist“ fehlt, `BERICHT.md` gibt es noch nicht.

Nur teilweise automatisch prüfbar, deshalb mit Vermerk auf „erledigt“ gesetzt, wo der automatische Teil erfüllt ist: B4 und C9 (Gefühl, Vergleich der zweiten Hände), A6 (Home-Bildschirm-Speicher auf dem iPhone), E2 (echte Geräte über das Internet), D1 (echtes Neulings-Verhalten).

## 7. Neue Dateien dieser Prüfung

- `tests/playwright.dist.config.ts`: alle Browser-Tests gegen `dist` (`npm run build`, dann `npx playwright test --config tests/playwright.dist.config.ts`, Port über `TEST_PORT`).
- `tests/playwright.check.config.ts`, `tests/check/playthrough.spec.ts`, `tests/check/coopStartDevices.spec.ts`: Durchspielen und B3 im Koop auf drei Formaten.
- `docs/screenshots/v0.3/check-*.png`: Bilder des Durchspielens.

## 8. Nachprüfung (14.11.2026, Stand 5727958)

Saubere Läufe nach den Korrekturen (Adlerhaken-Test mit echtem Wurf, Waffen-Tipp, Shop-Hänger, späte Boss-Stärke):

- `npx tsc --noEmit`: sauber.
- `npm test`: 577 von 577 grün (39 Dateien).
- `npm run build`: grün.
- Browser-Tests gegen die gebaute App (`npx playwright test --config tests/playwright.dist.config.ts`): 92 Tests, **88 bestanden, 0 fehlgeschlagen, 4 übersprungen** (look.spec, nur mit `ALL_SCREENS=1`), 30,9 min. Die drei früheren roten keep.spec-Tests laufen grün.
- `npm run balance`: Exit 0, alle Zeilen „Ziele auf einen Blick“ erfüllt; Great-Bot 1 / 1 / 1 / 1,4, Boss 2 gegen 1 sonst. `docs/balance-latest.*` haben sich nur durch Zeitstempel und Laufzeit geändert und sind nicht committet.
- Live: `/fondue/`, `/classic/`, `/dev/`, `/v0.2/`, `/next/`, `/next/dev/` antworten alle mit 200; der Deploy-Lauf (workflow_dispatch) ist „success“. Das Paket unter `/next/` enthält `fondue.v3.` und nicht `fondue.profile`, das unter `/fondue/` weiter `fondue.profile`. Bild der Lobby mit „v0.3“: `docs/screenshots/v0.3/check-live-next.png`.
- Issue 1 hat jetzt einen Kommentar mit den Burg-Bildern.

Abnahme: B5, C7, G1 und G3 sind belegt und auf „erledigt“ gesetzt: **34 erledigt, 0 offen, 0 abgeschaltet**. Weiterhin nicht automatisch prüfbar (Vermerke in `abnahme.json`): Gefühl B4/C9, Home-Bildschirm-Speicher auf dem iPhone A6, echte Geräte über das Internet E2, Neulings-Verhalten D1, die Wiederholung des Hängers (Fehler 3) auf einem echten Handy.
