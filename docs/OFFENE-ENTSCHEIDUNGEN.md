# Offene Entscheidungen v0.3

Hier steht, was die Leitung in v0.3 entschieden hat und was Tim und Lenny noch bestätigen oder entscheiden sollen. Dieselbe Liste kommt aus `src/config/decisions.ts` und steht interaktiv auf der Entwickler-Übersicht unter `/fondue/next/dev/`: Dort wählt ihr je Eintrag eine Möglichkeit, schreibt eine Notiz und erzeugt daraus ein GitHub-Issue mit dem Titel-Präfix `[Entscheidungen]`. Künftige Aufträge lesen diese Issues. Im Spiel steht die Liste im Entwickler-Menü unter „Decisions and ratings“ (abhaken, bewerten, Notiz; die Bewertungen liegen im Profil).

Ändert sich eine Entscheidung, werden `src/config/decisions.ts` und diese Datei gemeinsam geändert. Begründungen stehen auch in `docs/ENTSCHEIDUNGEN.md`.

## Entscheidungen v0.3

| Nr | Eintrag | Frage | Möglichkeiten | Wahl der Leitung | Begründung | früher |
|---|---|---|---|---|---|---|
| D3-01 | Name of the crest currency | Wie heißt die Sonderwährung für Stufe 7 im Spiel? | „Raider Crests“ / „Crests“ (kurz) / Anders (bitte im Textfeld beschreiben) | „Raider Crests“ | Sagt, woher sie kommt (vom geopferten Räuber), passt zur Räuberarmee und ist kurz genug für den Shop (E-063). | – |
| D3-02 | Shop replaces the Armoury | Ersetzt der Shop die Armoury, oder geht er in ihr auf? | Shop ersetzt die Armoury / Armoury bleibt und bekommt den Shop als Teil / Anders (bitte im Textfeld beschreiben) | Shop ersetzt die Armoury | Es gibt nur noch einen Ort, an dem man freischaltet, ausbaut und anlegt. Zwei Orte für dasselbe würden verwirren. | – |
| D3-03 | Weapon unlock levels and cheese prices | Passen Freischalt-Level und Käse-Preise der 25 Waffen (Tabelle „Waffen“)? | So lassen / Neue Waffen früher / Neue Waffen später / Billiger (Summe bleibt 500) / Anders (bitte im Textfeld beschreiben) | So lassen | Etwa alle 3 bis 4 Level kommt etwas Neues; die erste Waffe eines neuen Slots ist billig, damit der Slot nicht leer bleibt; alles zusammen kostet genau 500 Käse. | – |
| D3-04 | Great Cauldron and Eagle Perch | Kessel ab Level 16 für 12 Käse, Adlerhaken ab Level 70 für 28 Käse: passt das? | So lassen / Kessel früher / Adlerhaken früher / Anders (bitte im Textfeld beschreiben) | So lassen | Der Kessel bringt doppeltes Gold, wenn das Gold für Stufen wichtig wird; der Haken kommt erst, wenn Stufe 7 relevant ist, denn nur er bringt Wappen. | D-18 |
| D3-05 | Endless gold must not roll over the campaign | Wie wird verhindert, dass man die Kampagne mit Endlos-Gold überrollt? | Stufen-Deckel je Kampagnen-Abschnitt / Weniger Gold im Endlos-Modus / Gegner wachsen mit der Burg mit / Anders (bitte im Textfeld beschreiben) | Stufen-Deckel je Kampagnen-Abschnitt | Höchste kaufbare Stufe 3 bis Level 10, 4 bis 25, 5 bis 45, 6 bis 65, 7 erst mit dem Adlerhaken. Farmen hilft beim Feststecken, aber nicht über den Abschnitt hinaus. | – |
| D3-06 | Co-op gold | Wie wird Gold im Koop verteilt? | Jeder bekommt das ganze Rundengold, ein Kill zahlt 60 % / Gold wird halbiert / Jeder behält, was er selbst verdient / Anders (bitte im Textfeld beschreiben) | Jeder bekommt das ganze Rundengold, ein Kill zahlt 60 % | Niemand fühlt sich benachteiligt, wer weniger trifft, verliert nichts; die 60 % gleichen aus, dass zu zweit mehr Räuber fallen. Käse und Fortschritt bekommt nur der Host. | D-05 |
| D3-07 | Co-op factor | Wie viel mehr Räuber kommen zu zweit (Start 1,8)? | 1,8, mit Bots so eingestellt, dass zu zweit nicht leichter ist als allein / Mehr (zu zweit soll es härter sein) / Weniger (zu zweit soll es leichter sein) / Anders (bitte im Textfeld beschreiben) | 1,8, mit Bots so eingestellt, dass zu zweit nicht leichter ist als allein | Startwert aus dem Auftrag; die Bots prüfen, dass Mid zu zweit nicht öfter gewinnt als allein (docs/balance.md). | D-16 |
| D3-08 | Resuming an interrupted level | Wo geht ein unterbrochenes Level weiter? | Am Beginn der aktuellen Welle / Level beginnt von vorn / Genau an der Stelle / Anders (bitte im Textfeld beschreiben) | Am Beginn der aktuellen Welle | Allein in der Kampagne wird zu Beginn jeder Welle gespeichert. Das ist zuverlässig und fair; ein genauer Zwischenstand wäre aufwendig und fehleranfällig. | D-06 |
| D3-09 | Replayed levels give gold | Bringen wiederholte Level normales Gold? (im Vorgespräch gesetzt, von Tim noch nicht bestätigt) | Ja, normales Gold / Ja, aber weniger / Nein / Anders (bitte im Textfeld beschreiben) | Ja, normales Gold | Wer feststeckt, kann sich so stärker machen. Käse gibt es dabei nur für noch fehlende Käse; die Stufen-Deckel verhindern das Überrollen. | – |
| D3-10 | Boss levels unlock something | Soll ein gewonnenes Boss-Level etwas freischalten? | Nein, Bosse sind das Tor zum nächsten Abschnitt / Ja, eine eigene Freischaltung je Boss / Anders (bitte im Textfeld beschreiben) | Nein, Bosse sind das Tor zum nächsten Abschnitt | Der Boss ist die Prüfung am Ende eines Abschnitts; dahinter steigt der Stufen-Deckel und neue Waffen werden kaufbar. Eine Extra-Belohnung würde den Takt der Freischaltungen stören. | D-21 |
| D3-11 | Which second hand feels better | Welche zweite Hand fühlt sich besser an? | Hand-Stufe 7: dauerhaft zwei Hände / Support-Waffe Helping Hand: zweite Hand für einige Sekunden / Beides behalten / Anders (bitte im Textfeld beschreiben) | **offen** | Offen: beides ist gebaut und muss am Handy getestet werden. Am Laptop simuliert der Entwickler-Schalter „Second hand on the laptop“ die zweite Hand. | – |
| D3-12 | Weapons that fit no slot | Was wird aus Waffen, die zu keinem Slot passten? | Keine entfernt, umgebaut und neu zugeordnet / Einzelne doch entfernen (im Textfeld nennen) / Anders (bitte im Textfeld beschreiben) | Keine entfernt, umgebaut und neu zugeordnet | Dragon Bellows kam zu Damage, Alphorn zu Gate, Ember Beacon zu Support; Roof Bolter und Storm Bell wurden passiv und feuern von selbst. | – |
| D3-13 | Gold kept on defeat | Behält man das verdiente Gold, wenn man ein Level verliert? | Ja / Nur die Hälfte / Nein / Anders (bitte im Textfeld beschreiben) | Ja | Sonst frustriert das Feststecken: jeder Versuch macht ein wenig stärker (E-066). | – |
| D3-14 | Co-op invite link and the tutorial | Was passiert, wenn jemand über einen Einladungslink kommt und das Tutorial nicht kennt? | Der Gast tritt direkt bei, das Tutorial kommt beim nächsten Solo-Start / Erst das Tutorial, dann beitreten / Anders (bitte im Textfeld beschreiben) | Der Gast tritt direkt bei, das Tutorial kommt beim nächsten Solo-Start | Der Freund soll sofort mitspielen können (E-051). | D-03 |
| D3-15 | How tap weapons aim | Zielen Waffen wie Stomper und Comet mit einem Tipp selbst, oder tippt man erst die Waffe und dann die Stelle? | Ein Tipp, die Waffe zielt selbst / Waffe, dann Stelle antippen / Anders (bitte im Textfeld beschreiben) | Ein Tipp, die Waffe zielt selbst | Am Handy schneller und kein Fehlgriff nach einem Räuber. | D-08 |
| D3-16 | Currencies and keep across worlds | Gelten Käse, Gold, Wappen und die Burg später in jeder Welt, oder je Welt getrennt? | Für alle Welten gemeinsam / Je Welt getrennt / Anders (bitte im Textfeld beschreiben) | Für alle Welten gemeinsam | Im Profil stehen `wallet` und `keep` außerhalb von `worlds`; Käse je Level, Level und Bestenliste sind je Welt getrennt. | D-09 |
| D3-17 | What makes a boss level | Was macht ein Boss-Level aus? | Jedes zehnte Level, letzte Welle mit übergroßen Räubern und mehr Gegnern / Anders (bitte im Textfeld beschreiben) | Jedes zehnte Level, letzte Welle mit übergroßen Räubern und mehr Gegnern | Bewährt aus v0.2, jetzt als Wellenfolge statt als letzter Tag. | D-14 |
| D3-18 | Win window covers the victory banner | Das Fenster „Level won!“ kann das Sieg-Banner verdecken. Was soll passieren? | Fenster erst nach dem Banner zeigen / Banner beim Sieg weglassen / Anders (bitte im Textfeld beschreiben) | **offen** | Offen: ändert, wie sich der Sieg anfühlt; im neuen Ergebnisbildschirm von v0.3 prüfen. | D-19 |
| D3-19 | "New enemy" window on phones | Das Fenster „New enemy“ verdeckt am Handy kurz das Level-Banner. Später zeigen? | Erst nach dem Banner zeigen / So lassen / Anders (bitte im Textfeld beschreiben) | **offen** | Offen: am Laptop überdeckt nichts; am Handy mit den schnelleren Gegnern von v0.3 testen. | D-20 |

## Was aus D-01 bis D-21 wurde

| Nr | Eintrag | Stand | Warum | jetzt |
|---|---|---|---|---|
| D-01 | Endless offers every weapon | hinfällig | Endlos spielt mit der eigenen dauerhaften Burg und öffnet mit Slot 5 (A1, E1). | – |
| D-02 | Look of the hall inside the keep | hinfällig | Die Burg ist jetzt dauerhaft, die Sorge der Abwertung fällt weg; die Lobby baut P-Shop neu. | – |
| D-03 | Co-op invite link and the tutorial | gilt weiter | Durch v0.3 nicht berührt. | D3-14 |
| D-04 | Stars for replaying a level | hinfällig | Sterne entfallen; jeder Käse zählt nur einmal (A2). | – |
| D-05 | Stars for a co-op guest | entschieden | Sterne entfallen; Käse nur für den Host, Gold für beide. | D3-06 |
| D-06 | Continuing an interrupted level | entschieden | Tage entfallen; weiter am Beginn der Welle. | D3-08 |
| D-07 | Yeti and hand tiers | entschieden | Auftrag C8: allein ab Hand-Stufe 4, mehrere Hände zählen zusammen. | – |
| D-08 | How Stomper and Comet aim | gilt weiter | Gilt für alle angetippten Waffen weiter. | D3-15 |
| D-09 | Stars, tiers and hand across worlds | gilt weiter | Gilt neu für Käse, Gold, Wappen und Burg. | D3-16 |
| D-10 | Endless only after some levels | entschieden | Endlos öffnet mit Slot 5 (Level 11). | – |
| D-11 | Stars for the first unlock of a weapon | entschieden | Jede Waffe wird mit Käse freigeschaltet (A2, C3). | – |
| D-12 | Length of the early levels | hinfällig | Tage entfallen; ein Level ist eine Wellenfolge mit geplanter Dauer (B1). | – |
| D-13 | Start gold in level 1 | hinfällig | Im Level wird nichts mehr gekauft (A1). | – |
| D-14 | Boss levels | gilt weiter | Gilt weiter, jetzt als Wellenfolge. | D3-17 |
| D-15 | The name "stars" | hinfällig | Sterne sind durch Käse ersetzt. | – |
| D-16 | Co-op factor of the campaign | entschieden | Neuer Startwert 1,8. | D3-07 |
| D-17 | The new Stomper | hinfällig | Alle Waffen haben jetzt 7 Stufen; bewertet wird jede Waffe in der Waffen-Liste. | – |
| D-18 | Eagle hook late and costly | entschieden | Adlerhaken ab Level 70 für 28 Käse. | D3-04 |
| D-19 | Win window covers the victory banner | gilt weiter | Weiter offen. | D3-18 |
| D-20 | "New enemy" window on phones | gilt weiter | Weiter offen. | D3-19 |
| D-21 | Unlock for a boss win | entschieden | Kein Extra; Bosse sind das Tor zum nächsten Abschnitt. | D3-10 |

## Waffen

Jede Waffe hat im Entwickler-Menü einen Bewertungs-Eintrag (W-01 … in der Reihenfolge von `src/config/weapons.ts`). Die Tabellen mit Slot, Freischalt-Level, Käse-Preis und allen sieben Stufen stehen auf der Entwickler-Übersicht.

## Fahrplan bis v1.0

**v0.4 – Feinschliff aus den Tests**

- Balance nach den Testrunden von Tim und Lenny (Preise, Stufen, Wellen, Koop)
- Leistung auf echten Geräten messen und verbessern (iPhone 16, Android)
- Töne für die neuen Waffen, Burg- und Hand-Stufen
- Entscheidungen aus dieser Liste umsetzen, offene Punkte schließen
- Grafik der neuen Waffen und Burg-Stufen verfeinern

**v1.0 – Store-Start**

- App-Paket mit Capacitor für iOS und Android, Symbole und Startbild
- Store-Texte, Screenshots und Altersangaben
- Datenschutzerklärung und Impressum
- Entwickler-Menü und Cheats im Store-Build ausgeblendet
- Später optional: Konten und Cloud-Speicher (das Profil ist dafür vorbereitet)
