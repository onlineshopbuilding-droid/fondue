/**
 * The decision list of v0.3 (F3): what the lead decided this round and what Tim and Lenny still
 * have to confirm, plus what became of the 21 decisions D-01 .. D-21 of v0.2.
 * The developer overview (/fondue/next/dev/) shows every entry with its options and a free text
 * field and builds GitHub issues from the answers; the developer menu's rating list uses the same ids.
 * docs/OFFENE-ENTSCHEIDUNGEN.md says the same in German; change both together.
 *
 * Columns of an entry:
 *   id       D3-01 ...; stays fixed, the answers in the issues refer to it
 *   title    short English name (menu and issue)
 *   question what Tim and Lenny decide, in German (the overview is in German)
 *   options  the choices; `choice` is the option the lead built (null = open, still to test)
 *   reason   why the lead chose it, in German
 *   from     the v0.2 decision it replaces, if any
 */

export interface DecisionOption { id: string; label: string }

export interface Decision {
  id: string;
  title: string;
  question: string;
  options: DecisionOption[];
  choice: string | null;
  reason: string;
  from?: string;
}

const keep = (label: string): DecisionOption => ({ id: 'keep', label });
const other: DecisionOption = { id: 'other', label: 'Anders (bitte im Textfeld beschreiben)' };

export const DECISIONS_V3: Decision[] = [
  {
    id: 'D3-01', title: 'Name of the crest currency',
    question: 'Wie heißt die Sonderwährung für Stufe 7 im Spiel?',
    options: [keep('„Raider Crests“'), { id: 'crests', label: '„Crests“ (kurz)' }, other],
    choice: 'keep',
    reason: 'Sagt, woher sie kommt (vom geopferten Räuber), passt zur Räuberarmee und ist kurz genug für den Shop (E-063).',
  },
  {
    id: 'D3-02', title: 'Shop replaces the Armoury',
    question: 'Ersetzt der Shop die Armoury, oder geht er in ihr auf?',
    options: [keep('Shop ersetzt die Armoury'), { id: 'merge', label: 'Armoury bleibt und bekommt den Shop als Teil' }, other],
    choice: 'keep',
    reason: 'Es gibt nur noch einen Ort, an dem man freischaltet, ausbaut und anlegt. Zwei Orte für dasselbe würden verwirren.',
  },
  {
    id: 'D3-03', title: 'Weapon unlock levels and cheese prices',
    question: 'Passen Freischalt-Level und Käse-Preise der 25 Waffen (Tabelle „Waffen“)?',
    options: [keep('So lassen'), { id: 'earlier', label: 'Neue Waffen früher' }, { id: 'later', label: 'Neue Waffen später' }, { id: 'cheaper', label: 'Billiger (Summe bleibt 500)' }, other],
    choice: 'keep',
    reason: 'Etwa alle 3 bis 4 Level kommt etwas Neues; die erste Waffe eines neuen Slots ist billig, damit der Slot nicht leer bleibt; alles zusammen kostet genau 500 Käse.',
  },
  {
    id: 'D3-04', title: 'Great Cauldron and Eagle Perch',
    question: 'Kessel ab Level 16 für 12 Käse, Adlerhaken ab Level 70 für 28 Käse: passt das?',
    options: [keep('So lassen'), { id: 'cauldron-earlier', label: 'Kessel früher' }, { id: 'perch-earlier', label: 'Adlerhaken früher' }, other],
    choice: 'keep',
    reason: 'Der Kessel bringt doppeltes Gold, wenn das Gold für Stufen wichtig wird; der Haken kommt erst, wenn Stufe 7 relevant ist, denn nur er bringt Wappen.',
    from: 'D-18',
  },
  {
    id: 'D3-05', title: 'Endless gold must not roll over the campaign',
    question: 'Wie wird verhindert, dass man die Kampagne mit Endlos-Gold überrollt?',
    options: [keep('Stufen-Deckel je Kampagnen-Abschnitt'), { id: 'less-gold', label: 'Weniger Gold im Endlos-Modus' }, { id: 'scaling', label: 'Gegner wachsen mit der Burg mit' }, other],
    choice: 'keep',
    reason: 'Höchste kaufbare Stufe 3 bis Level 10, 4 bis 25, 5 bis 45, 6 bis 65, 7 erst mit dem Adlerhaken. Farmen hilft beim Feststecken, aber nicht über den Abschnitt hinaus.',
  },
  {
    id: 'D3-06', title: 'Co-op gold',
    question: 'Wie wird Gold im Koop verteilt?',
    options: [keep('Jeder bekommt das ganze Rundengold, ein Kill zahlt 60 %'), { id: 'split', label: 'Gold wird halbiert' }, { id: 'own', label: 'Jeder behält, was er selbst verdient' }, other],
    choice: 'keep',
    reason: 'Niemand fühlt sich benachteiligt, wer weniger trifft, verliert nichts; die 60 % gleichen aus, dass zu zweit mehr Räuber fallen. Käse und Fortschritt bekommt nur der Host.',
    from: 'D-05',
  },
  {
    id: 'D3-07', title: 'Co-op factor',
    question: 'Wie viel mehr Räuber kommen zu zweit (Start 1,8)?',
    options: [keep('1,8, mit Bots so eingestellt, dass zu zweit nicht leichter ist als allein'), { id: 'more', label: 'Mehr (zu zweit soll es härter sein)' }, { id: 'less', label: 'Weniger (zu zweit soll es leichter sein)' }, other],
    choice: 'keep',
    reason: 'Startwert aus dem Auftrag; die Bots prüfen, dass Mid zu zweit nicht öfter gewinnt als allein (docs/balance.md).',
    from: 'D-16',
  },
  {
    id: 'D3-08', title: 'Resuming an interrupted level',
    question: 'Wo geht ein unterbrochenes Level weiter?',
    options: [keep('Am Beginn der aktuellen Welle'), { id: 'restart', label: 'Level beginnt von vorn' }, { id: 'exact', label: 'Genau an der Stelle' }, other],
    choice: 'keep',
    reason: 'Allein in der Kampagne wird zu Beginn jeder Welle gespeichert. Das ist zuverlässig und fair; ein genauer Zwischenstand wäre aufwendig und fehleranfällig.',
    from: 'D-06',
  },
  {
    id: 'D3-09', title: 'Replayed levels give gold',
    question: 'Bringen wiederholte Level normales Gold? (im Vorgespräch gesetzt, von Tim noch nicht bestätigt)',
    options: [keep('Ja, normales Gold'), { id: 'less', label: 'Ja, aber weniger' }, { id: 'none', label: 'Nein' }, other],
    choice: 'keep',
    reason: 'Wer feststeckt, kann sich so stärker machen. Käse gibt es dabei nur für noch fehlende Käse; die Stufen-Deckel verhindern das Überrollen.',
  },
  {
    id: 'D3-10', title: 'Boss levels unlock something',
    question: 'Soll ein gewonnenes Boss-Level etwas freischalten?',
    options: [keep('Nein, Bosse sind das Tor zum nächsten Abschnitt'), { id: 'unlock', label: 'Ja, eine eigene Freischaltung je Boss' }, other],
    choice: 'keep',
    reason: 'Der Boss ist die Prüfung am Ende eines Abschnitts; dahinter steigt der Stufen-Deckel und neue Waffen werden kaufbar. Eine Extra-Belohnung würde den Takt der Freischaltungen stören.',
    from: 'D-21',
  },
  {
    id: 'D3-11', title: 'Which second hand feels better',
    question: 'Welche zweite Hand fühlt sich besser an?',
    options: [{ id: 'tier7', label: 'Hand-Stufe 7: dauerhaft zwei Hände' }, { id: 'support', label: 'Support-Waffe Helping Hand: zweite Hand für einige Sekunden' }, { id: 'both', label: 'Beides behalten' }, other],
    choice: null,
    reason: 'Offen: beides ist gebaut und muss am Handy getestet werden. Am Laptop simuliert der Entwickler-Schalter „Second hand on the laptop“ die zweite Hand.',
  },
  {
    id: 'D3-12', title: 'Weapons that fit no slot',
    question: 'Was wird aus Waffen, die zu keinem Slot passten?',
    options: [keep('Keine entfernt, umgebaut und neu zugeordnet'), { id: 'remove', label: 'Einzelne doch entfernen (im Textfeld nennen)' }, other],
    choice: 'keep',
    reason: 'Dragon Bellows kam zu Damage, Alphorn zu Gate, Ember Beacon zu Support; Roof Bolter und Storm Bell wurden passiv und feuern von selbst.',
  },
  {
    id: 'D3-13', title: 'Gold kept on defeat',
    question: 'Behält man das verdiente Gold, wenn man ein Level verliert?',
    options: [keep('Ja'), { id: 'half', label: 'Nur die Hälfte' }, { id: 'none', label: 'Nein' }, other],
    choice: 'keep',
    reason: 'Sonst frustriert das Feststecken: jeder Versuch macht ein wenig stärker (E-066).',
  },
  // Still valid from v0.2:
  {
    id: 'D3-14', title: 'Co-op invite link and the tutorial',
    question: 'Was passiert, wenn jemand über einen Einladungslink kommt und das Tutorial nicht kennt?',
    options: [keep('Der Gast tritt direkt bei, das Tutorial kommt beim nächsten Solo-Start'), { id: 'tutorial-first', label: 'Erst das Tutorial, dann beitreten' }, other],
    choice: 'keep', reason: 'Der Freund soll sofort mitspielen können (E-051).', from: 'D-03',
  },
  {
    id: 'D3-15', title: 'How tap weapons aim',
    question: 'Zielen Waffen wie Stomper und Comet mit einem Tipp selbst, oder tippt man erst die Waffe und dann die Stelle?',
    options: [keep('Ein Tipp, die Waffe zielt selbst'), { id: 'aim', label: 'Waffe, dann Stelle antippen' }, other],
    choice: 'keep', reason: 'Am Handy schneller und kein Fehlgriff nach einem Räuber.', from: 'D-08',
  },
  {
    id: 'D3-16', title: 'Currencies and keep across worlds',
    question: 'Gelten Käse, Gold, Wappen und die Burg später in jeder Welt, oder je Welt getrennt?',
    options: [keep('Für alle Welten gemeinsam'), { id: 'per-world', label: 'Je Welt getrennt' }, other],
    choice: 'keep', reason: 'Im Profil stehen `wallet` und `keep` außerhalb von `worlds`; Käse je Level, Level und Bestenliste sind je Welt getrennt.', from: 'D-09',
  },
  {
    id: 'D3-17', title: 'What makes a boss level',
    question: 'Was macht ein Boss-Level aus?',
    options: [keep('Jedes zehnte Level, letzte Welle mit übergroßen Räubern und mehr Gegnern'), other],
    choice: 'keep', reason: 'Bewährt aus v0.2, jetzt als Wellenfolge statt als letzter Tag.', from: 'D-14',
  },
  {
    id: 'D3-18', title: 'Win window covers the victory banner',
    question: 'Das Fenster „Level won!“ kann das Sieg-Banner verdecken. Was soll passieren?',
    options: [{ id: 'after', label: 'Fenster erst nach dem Banner zeigen' }, { id: 'no-banner', label: 'Banner beim Sieg weglassen' }, other],
    choice: null, reason: 'Offen: ändert, wie sich der Sieg anfühlt; im neuen Ergebnisbildschirm von v0.3 prüfen.', from: 'D-19',
  },
  {
    id: 'D3-19', title: '"New enemy" window on phones',
    question: 'Das Fenster „New enemy“ verdeckt am Handy kurz das Level-Banner. Später zeigen?',
    options: [{ id: 'after', label: 'Erst nach dem Banner zeigen' }, { id: 'keep', label: 'So lassen' }, other],
    choice: null, reason: 'Offen: am Laptop überdeckt nichts; am Handy mit den schnelleren Gegnern von v0.3 testen.', from: 'D-20',
  },
];

export type LegacyVerdict = 'decided' | 'obsolete' | 'kept';

/** What became of the decisions of v0.2. `to` is the v0.3 entry that carries it on. */
export const LEGACY_DECISIONS: { id: string; title: string; verdict: LegacyVerdict; why: string; to?: string }[] = [
  { id: 'D-01', title: 'Endless offers every weapon', verdict: 'obsolete', why: 'Endlos spielt mit der eigenen dauerhaften Burg und öffnet mit Slot 5 (A1, E1).' },
  { id: 'D-02', title: 'Look of the hall inside the keep', verdict: 'obsolete', why: 'Die Burg ist jetzt dauerhaft, die Sorge der Abwertung fällt weg; die Lobby baut P-Shop neu.' },
  { id: 'D-03', title: 'Co-op invite link and the tutorial', verdict: 'kept', why: 'Durch v0.3 nicht berührt.', to: 'D3-14' },
  { id: 'D-04', title: 'Stars for replaying a level', verdict: 'obsolete', why: 'Sterne entfallen; jeder Käse zählt nur einmal (A2).' },
  { id: 'D-05', title: 'Stars for a co-op guest', verdict: 'decided', why: 'Sterne entfallen; Käse nur für den Host, Gold für beide.', to: 'D3-06' },
  { id: 'D-06', title: 'Continuing an interrupted level', verdict: 'decided', why: 'Tage entfallen; weiter am Beginn der Welle.', to: 'D3-08' },
  { id: 'D-07', title: 'Yeti and hand tiers', verdict: 'decided', why: 'Auftrag C8: allein ab Hand-Stufe 4, mehrere Hände zählen zusammen.' },
  { id: 'D-08', title: 'How Stomper and Comet aim', verdict: 'kept', why: 'Gilt für alle angetippten Waffen weiter.', to: 'D3-15' },
  { id: 'D-09', title: 'Stars, tiers and hand across worlds', verdict: 'kept', why: 'Gilt neu für Käse, Gold, Wappen und Burg.', to: 'D3-16' },
  { id: 'D-10', title: 'Endless only after some levels', verdict: 'decided', why: 'Endlos öffnet mit Slot 5 (Level 11).' },
  { id: 'D-11', title: 'Stars for the first unlock of a weapon', verdict: 'decided', why: 'Jede Waffe wird mit Käse freigeschaltet (A2, C3).' },
  { id: 'D-12', title: 'Length of the early levels', verdict: 'obsolete', why: 'Tage entfallen; ein Level ist eine Wellenfolge mit geplanter Dauer (B1).' },
  { id: 'D-13', title: 'Start gold in level 1', verdict: 'obsolete', why: 'Im Level wird nichts mehr gekauft (A1).' },
  { id: 'D-14', title: 'Boss levels', verdict: 'kept', why: 'Gilt weiter, jetzt als Wellenfolge.', to: 'D3-17' },
  { id: 'D-15', title: 'The name "stars"', verdict: 'obsolete', why: 'Sterne sind durch Käse ersetzt.' },
  { id: 'D-16', title: 'Co-op factor of the campaign', verdict: 'decided', why: 'Neuer Startwert 1,8.', to: 'D3-07' },
  { id: 'D-17', title: 'The new Stomper', verdict: 'obsolete', why: 'Alle Waffen haben jetzt 7 Stufen; bewertet wird jede Waffe in der Waffen-Liste.' },
  { id: 'D-18', title: 'Eagle hook late and costly', verdict: 'decided', why: 'Adlerhaken ab Level 70 für 28 Käse.', to: 'D3-04' },
  { id: 'D-19', title: 'Win window covers the victory banner', verdict: 'kept', why: 'Weiter offen.', to: 'D3-18' },
  { id: 'D-20', title: '"New enemy" window on phones', verdict: 'kept', why: 'Weiter offen.', to: 'D3-19' },
  { id: 'D-21', title: 'Unlock for a boss win', verdict: 'decided', why: 'Kein Extra; Bosse sind das Tor zum nächsten Abschnitt.', to: 'D3-10' },
];

/** The road to v1.0 (F4), shown on the developer overview. */
export const ROADMAP: { version: string; title: string; items: string[] }[] = [
  {
    version: 'v0.4', title: 'Feinschliff aus den Tests',
    items: [
      'Balance nach den Testrunden von Tim und Lenny (Preise, Stufen, Wellen, Koop)',
      'Leistung auf echten Geräten messen und verbessern (iPhone 16, Android)',
      'Töne für die neuen Waffen, Burg- und Hand-Stufen',
      'Entscheidungen aus dieser Liste umsetzen, offene Punkte schließen',
      'Grafik der neuen Waffen und Burg-Stufen verfeinern',
    ],
  },
  {
    version: 'v1.0', title: 'Store-Start',
    items: [
      'App-Paket mit Capacitor für iOS und Android, Symbole und Startbild',
      'Store-Texte, Screenshots und Altersangaben',
      'Datenschutzerklärung und Impressum',
      'Entwickler-Menü und Cheats im Store-Build ausgeblendet',
      'Später optional: Konten und Cloud-Speicher (das Profil ist dafür vorbereitet)',
    ],
  },
];
