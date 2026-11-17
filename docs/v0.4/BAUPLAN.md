# Fondue v0.4 – Bauplan

Stand: 17.11.2026, 17:20. Setzt `docs/v0.4/AUFTRAG.md` um. Zahlen sind Startwerte (Abschnitt 6), außer den festen.
Arbeitsweise: Jedes Paket = ein Agent. bauer = Opus 5.5 (baut), pruefer = Sonnet 5.5 (prüft, baut nichts).
Am Ende jedes Pakets: `npx tsc --noEmit`, `npm test`, betroffene Browser-Tests mit eigenem `TEST_PORT`,
Commit nur der eigenen Dateien (einzeln hinzufügen), Push auf `v0.4-dev`. Fremde Dateien nie; Bedarf an die Leitung.

## 0. Leitlinien
- Freischaltung zieht von der Kampagne auf die Burg: offene Slots ergeben sich aus `keep.castleTier`, nicht aus `levelsDone`.
  Nichts davon wird gespeichert (wie v0.3: abgeleitet, nie gespeichert).
- Kampagnen-Level schalten nur noch frei: Burg-Stufen (kaufbar), Waffen (mit Käse), Stationen, Koop-Tisch (3), Endlos-Tisch (10).
- Alle neuen Zahlen in `src/config/`. Reste des alten Verhaltens werden gelöscht, nicht abgeschaltet:
  Am Ende findet `grep -rn "slotUnlockLevel\|unlockLevelOf(.*'slot'\|fifth slot\|kind: 'slot'\|minLevel" src/` nichts mehr
  (bis auf begründete Treffer wie `KING_LOBBY_LINES`).
- `src/profile/**` und das Speicher-Präfix gehören Paket V2. Kein Paket hier fasst sie an.

## 1. Konfiguration (Fundament legt an)
| Datei | Inhalt |
|---|---|
| `src/config/castle.ts` (von V2 angelegt, Name von V2) | `SLOT_CASTLE_TIER = [1,2,3,4,5]` (Index = Slot), `CASTLE_TIER_LEVEL = [0,6,12,20,28,50,75]` (kaufbar ab gewonnenem Level; 6 und 75 fest), `TABLE_UNLOCK_LEVEL = { coop: 3, endless: 10 }` (fest), `CHALLENGE_SLOT_MARGIN = 4` (Level nach Kaufbarkeit, ab denen eine Slot-Challenge erlaubt ist) |
| `src/config/keep.ts` | `CASTLE_TIERS` Goldpreise (Start: 0/400/1200/4000/10000/24000/50000, Stufe 7 + 50 Crests) |
| `src/config/slots.ts` | `unlockLevel` entfällt, dafür `castleTier` |
| `src/config/tiers.ts` | `TIER_CAP_BY_LEVEL` gilt nur noch für Waffen und Hand; die Burg hat ihr eigenes Tor `CASTLE_TIER_LEVEL` |
| `src/config/lobby.ts` | (P-Lobby) `HALL_LOOK[1..7]`: Wände, Boden, Fenster, Kessel, Tische, Deko je Burg-Stufe; Stationen |
| `src/config/versions.ts` (neu, P-Options) | Liste aller spielbaren Versionen mit Pfad |

## 2. Pakete

### Etappe 2a – Fundament (ein bauer, nacheinander), 17:30–18:15
**F-Burg: A1, A2, A3** – bauer
Voraussetzung: V2 hat seine Konfigurationsdatei committet (sonst legt F sie an und V2 übernimmt sie; Abstimmung über die Leitung).
Gehört (Phase 1 ausschließlich): `src/config/castle.ts` (gemeinsam mit V2, nach dessen Commit), `src/config/slots.ts`, `keep.ts`, `tiers.ts`,
`weapons.ts` (nur `unlockLevel`; Käse-Preise unverändert, Summe 500), `src/config/worlds/types.ts` (UnlockDef: `'slot'` raus, `'castle'` mit `tier` statt `'gate'`),
`src/config/worlds/fondue/{unlocks,challenges}.ts`, `src/modes/{unlocks,progress,endless,campaign,cheats,tutorial,index}.ts`,
Kompilier-Fixes (nur das, was die neue Schnittstelle bricht) in `src/ui/app.ts` (`unlockEverything`), `src/ui/screens/{won,keep,prelevel,campaign}.ts`, `src/ui/lobby/lobby.ts`, `src/bots/{armoury,campaignRunner}.ts`, `scripts/campaign-table.ts`.
**Platzhalter (Stubs), damit Phase 2 nur noch nutzt:** in `src/config/worlds/fondue/story.ts` die exportierten Konstanten
`CASTLE_READY_LINES: string[]` (König kündigt kaufbare Stufe an) und `CASTLE_BUILT_LINES: string[]` (Satz beim Ausbau), je ein schlichter Satz;
in `src/modes/unlocks.ts` die Funktionen `castleTierBuyableAt(tier)`, `castleTierUnlocked(p, world, tier)`, `coopTableOpen(p, world)`, `endlessOpen` (ab Level 10), `slotCastleTier(slot)`;
in `src/modes/cheats.ts` `cheatCastleTier(p, tier)` (setzt das Cheat-Kennzeichen).
Tests: `tests/unit/{unlocks,progress,economy,cheats,weapons}.test.ts` (Slot-Teile), `tests/unit/campaignWaves.test.ts` (Endlos- und Challenge-Teil), `tests/unit/tutorial.test.ts` (nur `pendingIntros`), `tests/e2e/helpers.ts` (`unlockEndless` auf Level 10; neu `setCastleTier(page, n)`).
Fasst nicht an: `src/profile/**`, Grafik, Lobby-Aufbau, Texte außer den Stubs, Balance-Zahlen der Wellen.
Ergebnis: `slotOpen` = `castleTier >= SLOT_CASTLE_TIER[slot]`. Burg-Quote sperrt mit neuem Grund `'level'` (gewonnenes Level fehlt), sonst `'gold'`/`'crests'`. Endlos ab Level 10. `weaponAvailable` verlangt offenen Slot. Jede Waffe hat `unlockLevel >= CASTLE_TIER_LEVEL[Stufe ihres Slots - 1]`: Roof Bolter 26 → 30; Sticky Fondue 2 → 6, Gate Mortar 4 → 12, Golden Fondue 7 → 20, Marmot Sentry 11 → 28. `weaponUsableIn(level)` verlangt `wonBefore >= CASTLE_TIER_LEVEL + CHALLENGE_SLOT_MARGIN`. `UNLOCKS` meldet `{kind:'castle', tier}` am Freischalt-Level.
Prüfung: pruefer 18:15–18:35 (parallel zu Phase 2, nur lesend): Unit-Test je Burg-Stufe 1–7 → offene Slots; Sperre und Kauf; Challenge-Test grün; Käse 500 grün; `npm test` grün.

### Etappe 2b – parallel, strikt getrennte Dateien, 18:15–19:30 (höchstens 5 bauer)

**P-Lobby: B1–B5, A4 (Lobby), V3 (Lobby-Teil)** – bauer, 18:15–19:45 (größtes Paket; zuerst Aufbau und Stationen bis 18:50, dann die 7 Hallen)
Gehört: `src/render/lobby/**`, `src/art/lobby/**`, `src/ui/lobby/{lobby.ts,lobby.css,mode.ts}`, `src/config/lobby.ts`, `src/ui/screens/main.ts` (HTML-Menü, `ENDLESS_LOCKED`), **`src/ui/app.ts` und `src/ui/screens/context.ts`** (siehe Abschnitt 3), `src/art/registry.ts` (nur Lobby-Einträge), `tests/unit/lobby.test.ts`, `tests/e2e/lobby.spec.ts`, Lobby-Teile von `tests/e2e/flow.spec.ts` (Tests Z. 31, 71, 99) und `tests/e2e/mobile.spec.ts` (Test Z. 49, nur die Stationsliste).
Fasst nicht an: `src/ui/lobby/storybook.ts` (P-Karte), Options/Scores/Help/Credits (P-Options), Texte in `story.ts` (P-Texte).
Ergebnis: Stationen `continueLevel`, `campaign` (Mitte, größte), `armoury` (Shop, neben Kampagne), `coop` (Tisch, kaputt bis Level 3), `play` (Endlos-Tisch, kaputt bis Level 10), `options` (Zahnrad oben in der Ecke); König mit zwei Rittern am dampfenden Kessel rechts; Banner über dem König mit Burg-Name und Stufe; `decorFor(castleTier)` statt Kampagnen-Level; 7 erkennbar verschiedene Hallen; Version klein in der Lobby. Storybook, Help, Credits, Scores und der Endlos-Topf in der Mitte sind entfernt (auch aus `OVER_LOBBY` und dem HTML-Menü). Tippflächen mindestens 44 CSS-px. 2–3 Anordnungen per Screenshot verglichen, die gewählte in `ENTSCHEIDUNGEN.md`.
Prüfung: pruefer mit frischem Blick (Screenshots auf 3 Formaten, alle 7 Stufen nach `docs/screenshots/v0.4/`), Unit-Test der Stationsliste und der Tisch-Sperren.

**P-Options: B6, V1 (Versionsliste in Options und Entwickler-Übersicht), V3 (Options-Teil), Entwickler-Übersicht** – bauer, 18:15–19:15
Gehört: `src/ui/screens/{options,scores,help,credits,settingsFields,index}.ts`, neu `src/ui/screens/options.css` (in `options.ts` importiert), `src/ui/version.ts`, neu `src/config/versions.ts`, `src/ui/tuningPanel.ts` (Cheat „Burg-Stufe“ über `cheatCastleTier`), `scripts/dev-page.ts`, `scripts/dev-page/**`, `src/config/decisions.ts` (neue Liste `DECISIONS_V4` mit den Punkten aus Auftrag Abschnitt 8, Text von der Leitung), `tests/e2e/dev-tools.spec.ts`, neu `tests/e2e/options.spec.ts`.
Fasst nicht an: `app.ts` (Tab-Wechsel nur innerhalb von `options.ts` über `onAction`; Scores/Help/Credits rendern als Tab-Inhalt), `content.ts` (Texte: P-Texte, nur lesen).
Ergebnis: Tabs Settings · Scores · Help · Credits · Versions (diese Reihenfolge), dazu Entwickler-Menü wie bisher; „v0.4“ sichtbar. Entwickler-Übersicht: Versionsliste, Tabelle „Burg-Stufe – kaufbar ab Level – Preis – öffnet“, Level-Tabelle mit Spalte „Burg-Stufe kaufbar“, offene Entscheidungen v0.4.
Prüfung: Browser-Test öffnet jeden Tab auf 3 Formaten; Screenshot der Versionsliste.

**P-Karte: B7, A4 (Kampagnen-Karte, Sieg-Bildschirm, Koop-Raum), A7, Gast-Beitritt** – bauer, 18:15–19:15
Gehört: `src/ui/screens/{campaign,prelevel,won,coop,host,join,roomParts}.ts`, `src/ui/campaignArt.ts`, `src/ui/lobby/storybook.ts` (bleibt an seinem Ort; `pagesFor` zieht hierher), `src/ui/coop/room.ts`, `src/net/protocol.ts` (nur Lobby-Nachricht: Burg-Stufe zusätzlich zur Hand-Stufe), **`src/ui/style.css`**, `tests/e2e/{campaign,won}.spec.ts`, neu `tests/e2e/storybook.spec.ts`, neu `tests/e2e/coopCastle.spec.ts`.
Fasst nicht an: `src/net/{snapshot,interp,transport,peer,relay}.ts`, `src/game/session.ts`, bestehende Koop-Specs (nur lesen).
Ergebnis: kleines Buch oben in einer Ecke der Karte öffnet das Storybook; Burg-Stufe neben dem Kampagnen-Fortschritt; Level-Karte zeigt „Castle tier N“ an den Leveln 6, 12, 20, 28, 50, 75; Sieg-Bildschirm zeigt bei neu kaufbarer Stufe `CASTLE_READY_LINES[tier]` und einen Knopf in den Shop; Slot-Hinweis in `prelevel.ts` „opens with castle tier N“; Koop-Raum zeigt die Burg-Stufe neben jedem Namen. Gast tritt per Einladungslink auch ohne gewonnenes Level 3 bei.
Prüfung: Browser-Test Storybook von der Karte; Koop-Browser-Test sieht beide Burg-Stufen; Screenshots Karte, Sieg und Koop-Raum auf 3 Formaten.

**P-Texte: A6, A5, A4 (Shop)** – bauer, 18:15–19:15
Gehört: `src/config/worlds/fondue/story.ts` (alle Texte, ersetzt die Stubs), `src/ui/content.ts` (`HELP_SLIDES`, `LOADING_TIPS`, Endlos-Hilfe), `src/config/tutorial.ts`, `src/config/currencies.ts` (nur Texte), `src/modes/tutorial.ts` (nach F-Burg), `src/render/{tutorialGuide,tutorialView,castleView}.ts`, **`src/ui/screens/keep.ts`** (Shop), neu `src/ui/screens/keep.css`, `tests/unit/{tutorial,tutorialGuide,weaponTip}.test.ts`, `tests/e2e/{tutorial,shop}.spec.ts`, neu `tests/e2e/castleUpgrade.spec.ts`.
Fasst nicht an: `won.ts`, `prelevel.ts`, `campaign.ts` (P-Karte; Texte kommen aus `story.ts`), Lobby-Texte des Kessels/Tischs in `lobby.ts` (P-Lobby).
Ergebnis: Shop zeigt Burg-Stufe mit Name und Zahl. Bei gesperrter Stufe ein klarer Satz („Win level 6 to build this“ / „You need 400 more gold“). Kauf einer Burg-Stufe = Ereignis: kurze Animation an der Burg, Satz des Königs, neuer Slot sichtbar, danach die Slot-Einführung (`SLOT_INTROS`). Der König kündigt kaufbare Burg-Stufen statt Slots an. Tutorial, Hilfe und Tipps erklären „Gold verdienen → Burg ausbauen → neuer Slot“.
Prüfung: Browser-Test kauft Burg-Stufe 2 (Profil mit Level 6 und Gold) und sieht Animation, Satz und Slow-Einführung (deckt die Browser-Prüfung von A1 und A5); Textsuche ohne Treffer zu Slots an Kampagnen-Leveln; pruefer liest alle Texte gegen.

**P-Bots: A8 (Vorbereitung)** – bauer, 18:15–19:15
Gehört: `src/bots/**`, `tests/balance/balance.test.ts`, `scripts/campaign-table.ts`, `docs/KAMPAGNE-TABELLE.md`, `tests/unit/campaignTable.test.ts`.
Fasst nicht an: Konfigurationszahlen (erst in Etappe 3).
Ergebnis: Bots sparen Gold für die Burg, sobald die nächste Stufe freigeschaltet ist, und kaufen sie vor Hand- und Waffenstufen. Endlos-Farmen ab Level 10. Der Balance-Lauf meldet je Bot das Kampagnen-Level jedes Burg-Kaufs und Versuche je Level für 1–15.
Prüfung: `npm run balance` läuft durch und gibt die neue Tabelle aus.

### Etappe 3 – Balance, 19:15–20:00
**P-Balance: A8, A3-Werte** – bauer (Fortsetzung P-Bots) + pruefer misst.
Gehört jetzt: `src/config/{castle,keep,tiers,weapons,waves,enemies}.ts`, `src/config/worlds/fondue/campaign.ts` (Wellen 1–15), `docs/balance.md`.
Ziele: Der mittlere Bot kauft Stufe 2 bald nach Level 6 und Stufe 5 um Level 20–30. Level 1–6 nur mit Damage schaffbar, aber nicht belanglos. v0.3-Ziele halten. Stufen 3–6 und die Preise sind festgelegt, Begründung in `docs/balance.md` und `ENTSCHEIDUNGEN.md`.
Prüfung: `npm run balance` grün mit Burg-Kauf-Level je Stufe; Käse 500 und Challenge-Test weiter grün.

### Etappe 4 – Feinschliff, 20:00–21:15
- **C1** 20:00–20:35: 3 pruefer, je ein Format, frisches Profil bis mindestens Level 8, dann Cheats in einen späten Stand → `docs/v0.4/BEFUNDE.md`.
- **C2/C3** 20:35–21:15: bis zu 4 bauer. Die Befunde werden nach der Dateizuordnung aus Abschnitt 3 verteilt (wer die Datei in Etappe 2 besaß, bekommt den Befund); jedes Paket höchstens 40 Minuten. C3: Browser-Test zählt die Tipps bis zum Spielstart (≤ 3, Teil von P-Lobby/flow).
- **C4**: pruefer misst FPS in Lobby und Spiel (`playwright.perf.config.ts`) auf 3 Formaten. Liegt die Lobby unter 55, geht der Befund an den Besitzer von `src/render/lobby/**`.
- **C5**: pruefer prüft die v0.3-Punkte (Leerlauf im Shop in Level 6–9, Waffenstärken, Boss-Längen) gegen die Balance-Ergebnisse und schreibt einen Absatz für den Bericht.
- **D1** 20:00–21:15 parallel: pruefer zieht `AGENTS.md` (V1-Text, Veröffentlichen), `docs/{HANDBUCH,GDD,ARCHITEKTUR,ENTSCHEIDUNGEN}.md` nach. Nur Dokumente.

**21:15 Baustopp.** Danach nur Fertigstellen und Fehler aus der Prüfung.

### Etappe 5 – Schlussprüfung, 21:15–21:45
pruefer mit frischem Blick: `abnahme.json` gegen Code, Tests und Belege. Durchspiel auf 3 Formaten von der Vorrunde bis Burg-Stufe 3, mit Cheats Burg-Stufe 5 und 7. Fehler → bauer der Datei (nur Fehlerbehebung).

### Etappe 6 – Abschluss, 21:45–22:30
**D2**: `npm test`, `npm run test:e2e`, `npm run balance` grün; Pull Request nach `main`, Pull Request 12 schließen, bei grünem `test` mergen (letzter Zeitpunkt 22:20), Tag `v0.4`, alle Adressen prüfen; `BERICHT.md`, `TESTEN.md`.

## 3. Geteilte Dateien: wer besitzt, wer wartet
| Datei | Besitzer Phase 1 | Besitzer ab 18:15 | Regel für andere |
|---|---|---|---|
| `src/ui/app.ts`, `src/ui/screens/context.ts` | F-Burg | P-Lobby | Wünsche (neuer Hook, neue Aktion) an die Leitung; P-Lobby baut sie ein und meldet den Commit. P-Options und P-Karte planen so, dass sie keinen brauchen (Tabs innerhalb von `options.ts`; Storybook-Fenster aus `campaign.ts`; Tests über DOM-Selektoren statt `__fondue`). |
| `src/config/worlds/fondue/story.ts` | F-Burg (nur Stubs) | P-Texte | P-Karte und P-Lobby lesen nur; neue Sätze bestellen sie bei P-Texte. |
| `src/ui/content.ts` | – | P-Texte | P-Options rendert nur `HELP_SLIDES`/`CREDITS_HTML`. |
| `src/ui/style.css` | – | P-Karte | Alle anderen eigene CSS-Datei, importiert aus ihrem TS-Modul (`options.css`, `keep.css`, `lobby.css`). |
| `src/ui/screens/keep.ts` (Shop) | F-Burg (Kompilier-Fix) | P-Texte | – |
| `src/ui/screens/won.ts` | F-Burg (Kompilier-Fix) | P-Karte | Slot-Einführung kommt nicht mehr am Sieg, sondern im Shop (P-Texte). |
| `src/ui/lobby/storybook.ts` | – | P-Karte | P-Lobby entfernt nur Import und Nutzung in `lobby.ts`; `pagesFor` zieht nach P-Karte, P-Lobby löscht die Kopie in `layout.ts` danach. |
| `src/modes/tutorial.ts` | F-Burg | P-Texte | – |
| `tests/e2e/helpers.ts` | F-Burg | Leitung (gesperrt) | Änderungen nur über die Leitung. |
| `tests/e2e/flow.spec.ts`, `mobile.spec.ts` | – | P-Lobby | Nur die genannten Tests; Wurf- und Pausen-Tests darin bleiben unverändert. |
| `src/config/{castle,keep,tiers,weapons,campaign}.ts` | F-Burg | gesperrt bis 19:15, dann P-Balance | – |
| `src/net/protocol.ts` | – | P-Karte (nur Lobby-Nachricht) | – |

## 4. Burg-Stufen (Startwerte, Balance legt fest)
| Burg-Stufe | Name | kaufbar ab Level | Gold | öffnet |
|---|---|---|---|---|
| 1 | Oak Gate | Start | – | Damage |
| 2 | Iron-Bound Gate | 6 (fest) | 400 | Slow |
| 3 | Stone Keep | 12 | 1200 | Gate |
| 4 | Bannered Keep | 20 | 4000 | Support |
| 5 | Gilded Keep | 28 | 10000 | Passive |
| 6 | Runic Fortress | 50 | 24000 | Torleben, Halle |
| 7 | Alpine Citadel | 75 (fest) | 50000 + 50 Crests | Torleben, Halle |

## 5. Umzugsplan: Freischaltung von Kampagne auf Burg

**Was heute die Slots an Kampagnen-Level knüpft, und was es ersetzt:**

| Stelle | Heute | Ersatz |
|---|---|---|
| `src/config/slots.ts:16-22` | `unlockLevel: 0/2/4/7/11` je Slot | Feld `castleTier: 1..5` (oder `SLOT_CASTLE_TIER` aus V2-Konfiguration) |
| `src/config/worlds/fondue/unlocks.ts:23` | `slotUnlockLevel(slot)` | löschen; `slotCastleTier(slot)` |
| `…/fondue/unlocks.ts:37` | `UNLOCKS` enthält `kind:'slot'` je Slot-Level | `kind:'castle', tier` an `CASTLE_TIER_LEVEL[tier-1]` |
| `src/config/worlds/types.ts:87-91` | `UnlockDef` `'slot'`, `'gate'` | `'slot'` raus, `'gate'` → `'castle'` |
| `src/modes/unlocks.ts:64-69` | `slotOpen` = `levelsReached >= slotUnlockLevel` | `castleTier >= slotCastleTier(slot)`; Slot 0 weiter erst nach dem Tutorial |
| `src/modes/unlocks.ts:79-82` | `weaponAvailable` nur Level | zusätzlich offener Slot der Waffe |
| `src/modes/unlocks.ts:89-95` | `tierCap` deckelt auch die Burg | bleibt für Waffen und Hand; die Burg nutzt `CASTLE_TIER_LEVEL` |
| `src/modes/unlocks.ts:98-100` | `endlessOpen` = Slot 5 offen | `levelsReached >= TABLE_UNLOCK_LEVEL.endless` (10); neu `coopTableOpen` (3) |
| `src/modes/unlocks.ts:111-121` | `unlockLevelOf(...,'slot',…)` | Slot-Zweig raus, Zweig `'castle'` rein |
| `src/modes/progress.ts:96-102` | Burg-Quote: `now+1 > cap → 'cap'` | neuer Grund `'level'`, wenn `levelsReached < CASTLE_TIER_LEVEL[now]` |
| `src/modes/progress.ts:143, 168` | `slotOpen` beim Anlegen | bleibt (wirkt automatisch über die Burg) |
| `src/modes/tutorial.ts:97-104` | `pendingIntros` über `slotOpen` | bleibt; wird jetzt nach dem Burg-Kauf im Shop ausgelöst statt auf dem Sieg-Bildschirm |
| `src/ui/screens/won.ts:24, 63-75` | „New slot“ und Slot-Einführung am Sieg | „Castle tier N can be built“ + `CASTLE_READY_LINES`; keine Slot-Einführung mehr dort |
| `src/modes/campaign.ts:137` | `unlocks` des Siegs | enthält jetzt `castle` statt `slot` |
| `src/modes/endless.ts:25, 35` | offen ab Slot 5; Slots aus Level | offen ab Level 10; `openSlots` (Burg) wie gehabt |
| `src/ui/app.ts:197-199` | Entwickler-„alles freischalten“ markiert Level bis Slot-Level | Burg-Stufe auf 5 setzen (`cheatCastleTier`) |
| `src/modes/cheats.ts:74, 121-124` | `unlockEverything` über Slot-Level | Burg-Stufe 5 + Level bis 28; Cheat-Kennzeichen |
| `src/config/worlds/fondue/challenges.ts:33-39` | `weaponUsableIn`: `wonBefore >= slotUnlockLevel` | `wonBefore >= CASTLE_TIER_LEVEL[slotTier-1] + CHALLENGE_SLOT_MARGIN` |
| `src/ui/screens/keep.ts:79-83, 94, 193, 222-226, 264` | „opens after winning level N“, Deckel-Satz | „Opens with castle tier N (Iron-Bound Gate)“; Burg: „Win level 6 to build this“ |
| `src/ui/screens/prelevel.ts:22-27` | „slot, opens after level N“ | „opens with castle tier N“ |
| `src/ui/lobby/lobby.ts:122-127`, `src/ui/screens/main.ts:15` | „Endless opens with your fifth slot. Win level 11!“ | kaputter Endlos-Tisch, Satz mit Level 10 |
| `src/ui/content.ts:20` | Hilfe „Once all five slots are yours, endless opens“ | neuer Text |
| `src/render/lobby/layout.ts:55-75` | `DECOR.minLevel`, `decorFor(levelDone)` | `HALL_LOOK` je Burg-Stufe, `decorFor(castleTier)` |
| `src/render/lobby/lobbyScene.ts:18, 199-202` | `LobbyState.levelDone` | `castleTier`, `coopOpen`, `endlessOpen` |
| `src/bots/armoury.ts:39, 49, 95-124` | günstigster Schritt zuerst, Slots aus Level | Burg zuerst sparen; Slots aus der Burg |
| `src/bots/campaignRunner.ts:118, 190` | farmt, sobald Endlos offen (11) | ab 10; Slots aus der Burg |
| `scripts/campaign-table.ts:86-89`, `scripts/dev-page/page.ts:234-246` | „Slot N“ je Level, Deckel-Tabelle | „Burg-Stufe N kaufbar“ und die Burg-Tabelle |

**Was daran hängt:**
- **Shop:** Quote-Grund `'level'`, Sätze, Ausbau-Ereignis, Slot-Einführung nach dem Kauf.
- **Challenges:** Abstand zur Kaufbarkeit, damit „sicher kaufbar“ gilt. Der Challenge-Generator erzeugt dann andere Challenges.
- **Tutorial:** Der Weg zum Slow-Slot führt jetzt über Level 6 und einen Burg-Kauf. Das Tutorial bis Level 2 bleibt, ohne Slow-Ankündigung.
- **Endlos:** öffnet ab Level 10 mit eigener Burg, auch mit wenigen Slots.
- **Bots:** brauchen eine neue Kaufreihenfolge.
- **Waffen-Freischalt-Level:** Erste Waffe je Slot = Kauflevel der Stufe; Roof Bolter von 26 auf 30. Die Käse-Preise ändern sich nicht, die Summe bleibt 500.
- **Stufen-Deckel:** gilt weiter für Waffen und Hand, die Burg hat ihr eigenes Tor. Ein Test prüft, dass die Kauflevel der Burg nicht unter den Deckel-Leveln liegen. Die heutigen Werte passen: Stufe 3 ab 12 bei Deckel 3 ab 0, 4 ab 20 bei 10, 5 ab 28 bei 25, 6 ab 50 bei 45, 7 ab 75 mit Adlerhaken ab 70.

**Risiken:**
1. **V2-Abhängigkeit:** F-Burg kann erst sicher starten, wenn V2 die Konfiguration committet hat. Zwei Pakete in `src/config/castle.ts` gleichzeitig wären ein Konflikt.
2. **Übernommene v0.3-Stände:** Nach dem Anheben der Burg-Stufe müssen die Slots in `seen.slotIntros` als gesehen gelten. Sonst kommen nach der Übernahme vier Einführungen auf einmal. Das ist Aufgabe von V2; F-Burg sichert es mit einem Test ab.
3. **Frühe Level 1–6 nur mit Damage:** Die Wellen sind für einen Slow-Slot ab Level 2 gebaut. Sie werden wahrscheinlich zu schwer, ohne Gegenmaßnahme in Etappe 3 droht frühes Steckenbleiben.
4. **Bots kaufen falsch:** Mit der heutigen Logik (günstigster Schritt zuerst) kaufen sie Hand- und Waffenstufen statt der Burg. Dann kommt der fünfte Slot zu spät und die Balance-Zahlen täuschen.
5. **Endlos ab Level 10:** bringt früheres Farm-Gold und kann das Ziel „ohne Ausbau bleibt man stecken“ unterlaufen. Der Deckel für Waffen und Hand fängt das teilweise ab.
6. **Challenges ändern sich:** Neue Challenges für schon gespielte Level. Die Käse-Bits übernommener Stände bleiben an den Leveln hängen. Akzeptabel, aber im Bericht nennen.
7. **Browser-Tests:** Viele Tests öffnen Slots heute über `markLevelDone` (keep, shop, coop, check/playthrough). Ohne `setCastleTier` in `helpers.ts` werden sie massenhaft rot. Das gehört deshalb in Phase 1.
8. **Viele Konsumenten in Phase 2:** `UnlockDef`-Umbenennung (`'slot'` → `'castle'`) bricht Kampagnen-Karte, Sieg-Bildschirm und Level-Tabelle zugleich. Deshalb erledigt F-Burg alle Kompilier-Fixes, bevor Phase 2 startet.
9. **Koop:** Die Lobby-Nachricht ändert sich. Synchronität und Snapshot bleiben unberührt, die Versionsprüfung fängt alte Gegenstellen ab.

---

## 6. Tests: ersetzen und nicht anfassen

**Bewusst ersetzen (Slots über Level, Lobby-Stationen); jede Datei mit Grund in `PROGRESS.md`:**

| Datei | Teil | Paket |
|---|---|---|
| `tests/unit/unlocks.test.ts` | Z. 20–50: Slot-Level ≤ 15 aufsteigend, `openSlots` über Level, Endlos mit fünftem Slot | F-Burg |
| `tests/unit/weapons.test.ts` | Z. 55–70: `s.unlockLevel` je Slot, „erste Waffe = Slot-Level“ → „Waffe ≥ Kauflevel der Burg-Stufe ihres Slots“ | F-Burg |
| `tests/unit/tutorial.test.ts` | Z. 100–115: `pendingIntros` nach gewonnenen Leveln → nach Burg-Stufe | F-Burg (danach P-Texte) |
| `tests/unit/cheats.test.ts` | Z. 45–52, 98: Slot 5 über Level → über Burg | F-Burg |
| `tests/unit/campaignWaves.test.ts` | Z. 4 (Kopf), 336–341 (Endlos 10/11 → 9/10), 363 ff. (Challenge-Regel: Test bleibt, nutzt neue `weaponUsableIn`) | F-Burg |
| `tests/unit/progress.test.ts` | Z. 110–123: `tierCap` bleibt für Waffen und Hand; neu Burg-Sperre über Level | F-Burg |
| `tests/unit/economy.test.ts` | Z. 40–46 erweitern um Burg-Kauflevel; **Käse-500-Test Z. 15 unverändert** | F-Burg |
| `tests/unit/lobby.test.ts` | Z. 47–80, 105: Stationsliste, Deko nach Level, Storybook-Seiten → Stationen v0.4, Halle je Burg-Stufe, Tisch-Sperren; Storybook-Test nach `tests/e2e/storybook.spec.ts` | P-Lobby / P-Karte |
| `tests/unit/campaignTable.test.ts` | Slot-Spalte → Burg-Spalte | P-Bots |
| `tests/e2e/lobby.spec.ts` | Z. 18: Endlos bis zum fünften Slot gesperrt → Endlos-Tisch bis Level 10 | P-Lobby |
| `tests/e2e/flow.spec.ts` | Z. 31–45 (jede Station, `ENDLESS_LOCKED`), Z. 71 (Version in Lobby), Z. 99 (HTML-Menü je Station), Z. 202 nur der Weg zu Scores | P-Lobby |
| `tests/e2e/mobile.spec.ts` | Z. 49: nur die Stationsliste der Halle | P-Lobby |
| `tests/e2e/tutorial.spec.ts` | Z. 10, 38, 106–117: „Level 2 öffnet Slow“ → Tutorial bis Level 2 ohne Slow; Slow-Einführung nach Burg-Kauf in `castleUpgrade.spec.ts` | P-Texte |
| `tests/e2e/helpers.ts` | Z. 156–165 `unlockEndless` (Level 10) + `setCastleTier` | F-Burg |
| Nur Vorbereitung anpassen, Prüfungen unverändert | `shop`, `keep`, `campaign`, `won`, `dev-tools`, `castle-tiers` (alle unter `tests/e2e/`), `tests/check/playthrough.spec.ts` | jeweiliger Besitzer |

**Keinesfalls anfassen (nur grün halten; beim Profil höchstens Tests hinzufügen, durch V2):**
- **Werfen und Gewicht:** `tests/unit/{weight,handInput,hand,shake,shakeDetector,pointer,targeting,sim,round,runEnd,waves,levels,endlessRandom}.test.ts`, `tests/e2e/firstRaider.spec.ts`; die Wurf-Tests in `flow.spec.ts` (Z. 264, 281).
- **Koop-Synchronität:** `tests/unit/{snapshot,interp,transport,session}.test.ts`, `tests/e2e/{coop,coopLag,coopStart,relay}.spec.ts`, `tests/check/coopStartDevices.spec.ts`. Bei `coop*.spec` darf sich höchstens die Vorbereitung über `helpers.ts` ändern.
- **Speichern:** `tests/unit/{profile,profile-save,profile-data}.test.ts`. V2 ergänzt hier nur für `fondue.v4`; nichts wird abgeschwächt.
- **Bildschirmformate:** `tests/unit/{viewport,camera}.test.ts`, `tests/e2e/{look,smoke,art,landscapes,assetSwap}.spec.ts`, `mobile.spec.ts` Z. 95, 168, 181, 195.
- **Mehrfach-Touch:** `tests/e2e/{multitouch,touch}.spec.ts`.
- **Weitere:** `tests/perf/*.spec.ts`, `tests/live/*.spec.ts`.
