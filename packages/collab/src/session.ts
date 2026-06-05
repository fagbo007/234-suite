/**
 * Session codes (root CLAUDE.md §17 collaboration decision). A user generates a
 * short, human-shareable code, shares it out-of-band, and a peer enters it to
 * join the same sync room on the chosen transport. The code is just a room
 * identifier — it carries no secret and no server address.
 */

// Crockford-ish alphabet: no ambiguous 0/O/1/I/L.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const BODY_LEN = 8;
const PREFIX = '234';

/** Generate a formatted session code, e.g. `234-K7Q2-9FMR`. */
export function generateSessionCode(): string {
  const bytes = new Uint8Array(BODY_LEN);
  crypto.getRandomValues(bytes);
  let body = '';
  for (const b of bytes) body += ALPHABET[b % ALPHABET.length];
  return `${PREFIX}-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

/**
 * Normalise a user-entered code to its room id (the 8-char body), or `null` if
 * it is not a valid code. Accepts the formatted form (`234-XXXX-XXXX`), any
 * casing, and stray spaces/dashes; also accepts a bare 8-char body.
 */
export function parseSessionCode(code: string): string | null {
  let body = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (body.length === PREFIX.length + BODY_LEN && body.startsWith(PREFIX)) {
    body = body.slice(PREFIX.length);
  }
  if (body.length !== BODY_LEN) return null;
  for (const ch of body) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return body;
}

/** Whether a user-entered code is a valid session code. */
export function isSessionCode(code: string): boolean {
  return parseSessionCode(code) !== null;
}
