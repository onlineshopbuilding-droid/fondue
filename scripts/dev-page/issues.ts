/**
 * Turns the answers of the decision form on the developer overview into prefilled GitHub "new issue"
 * addresses. The page is static, so the answers leave it only through these links. Long answers are
 * split over several issues so that no address grows past `maxLength` characters.
 *
 * The function is self-contained (no imports, no outer names): the page embeds its source text
 * as the browser script, and the unit test calls the very same function.
 */
export interface IssueAnswer { id: string; title: string; choice: string; note: string }

export interface IssueOptions {
  /** For example https://github.com/onlineshopbuilding-droid/fondue/issues/new */
  base: string;
  version: string;
  /** Upper bound of one address; GitHub and browsers cope well below 8000. */
  maxLength: number;
}

export function buildIssueUrls(answers: IssueAnswer[], opts: IssueOptions): string[] {
  const PREFIX = '[Entscheidungen]';
  const head = (n: number, of: number) => `${PREFIX} Antworten ${opts.version}${of > 1 ? ` (${n}/${of})` : ''}`;
  const intro = `Antworten aus der Entwickler-Übersicht (${opts.version}). Künftige Aufträge lesen dieses Issue als Input.\n\n`;
  const block = (a: IssueAnswer, note: string) =>
    `### ${a.id} ${a.title}\n**Wahl:** ${a.choice || '–'}\n${note ? `**Notiz:** ${note}\n` : ''}\n`;
  const url = (title: string, body: string) =>
    `${opts.base}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  // Room for the longest title ("(99/99)") so the split never has to be redone.
  const fits = (body: string) => url(head(99, 99), body).length <= opts.maxLength;

  const bodies: string[] = [];
  let body = intro;
  for (const a of answers) {
    let note = a.note.trim();
    let piece = block(a, note);
    if (!fits(intro + piece)) {
      // One answer alone is too long: shorten its note until it fits on its own.
      let lo = 0;
      let hi = note.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(intro + block(a, `${note.slice(0, mid)} […]`))) lo = mid; else hi = mid - 1;
      }
      note = `${note.slice(0, lo)} […]`;
      piece = block(a, note);
    }
    if (!fits(body + piece) && body !== intro) {
      bodies.push(body);
      body = intro;
    }
    body += piece;
  }
  if (body !== intro || bodies.length === 0) bodies.push(body);
  return bodies.map((b, i) => url(head(i + 1, bodies.length), b));
}
