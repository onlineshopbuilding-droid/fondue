// Packs a profile into one line of text and back, as a backup and for moving to another device.
// Format: FONDUE1.<base64url of the JSON in UTF-8>.<FNV-1a checksum of those bytes, 8 hex digits>
import { migrate } from './migrations';
import { isRecord } from './sanitize';
import type { ProfileData } from './schema';

const PREFIX = 'FONDUE1';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const triple = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ALPHABET[triple >> 18] + ALPHABET[(triple >> 12) & 63];
    if (i + 1 < bytes.length) out += ALPHABET[(triple >> 6) & 63];
    if (i + 2 < bytes.length) out += ALPHABET[triple & 63];
  }
  return out;
}

function fromBase64Url(text: string): Uint8Array {
  if (text.length % 4 === 1) throw new Error('Profile code is incomplete.');
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let at = 0;
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error('Profile code contains characters that do not belong there.');
    buffer = ((buffer << 6) | value) & 0xffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[at++] = (buffer >> bits) & 255;
    }
  }
  return bytes;
}

/** FNV-1a over the bytes, as 8 hex digits. Catches typos and cut-off codes, it is no protection. */
function checksum(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

export function exportCode(data: ProfileData): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return `${PREFIX}.${toBase64Url(bytes)}.${checksum(bytes)}`;
}

function decodeJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('Profile code could not be read.');
  }
}

/** The profile inside a code, brought to the current version. Throws an Error if the code is broken. */
export function importCode(code: string): ProfileData {
  const parts = String(code).replace(/\s+/g, '').split('.');
  if (parts[0] !== PREFIX) throw new Error('This is not a Fondue profile code.');
  if (parts.length !== 3 || !parts[1] || !parts[2]) throw new Error('Profile code is incomplete.');
  const bytes = fromBase64Url(parts[1]);
  if (checksum(bytes) !== parts[2].toLowerCase()) {
    throw new Error('Profile code is damaged or incomplete (checksum does not match).');
  }
  const parsed = decodeJson(bytes);
  if (!isRecord(parsed)) throw new Error('Profile code does not contain a profile.');
  return migrate(parsed);
}
