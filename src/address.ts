// A validating parser and pretty printer for US mailing addresses.
//
// The input shape this handles is the free-text block people actually type:
// a street line, an optional second line for a unit, and a city/state/zip
// line. It does not attempt to parse a recipient name — see README for scope.

export interface Address {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
}

export interface ParseSuccess {
  ok: true;
  address: Address;
}

export interface ParseFailure {
  ok: false;
  errors: string[];
}

export type ParseResult = ParseSuccess | ParseFailure;

// USPS Publication 28 two-letter codes: the 50 states, DC, the territories
// people mail to, and the three military "state" codes (AA/AE/AP).
const STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
  'AA', 'AE', 'AP',
]);

const ZIP_RE = /^\d{5}(-\d{4})?$/;
const CITY_RE = /^[A-Za-z][A-Za-z .'-]*$/;

// USPS Publication 28 standard secondary unit designators. People type the
// spelled-out word or all sorts of casing/punctuation on the abbreviation;
// normalize to the form the label printers and address-matching systems
// expect. Only the designator itself is touched — the identifier after it
// (4B, 200, ...) is left exactly as typed.
const UNIT_ABBREVIATIONS: Record<string, string> = {
  apartment: 'Apt',
  apt: 'Apt',
  suite: 'Ste',
  ste: 'Ste',
  unit: 'Unit',
};

const UNIT_RE = /^(apartment|apt|suite|ste|unit)\.?\s*(\S.*)?$/i;

function normalizeUnit(unit: string): string {
  const match = UNIT_RE.exec(unit);
  if (!match) return unit;

  const [, designatorRaw, identifier] = match;
  const canonical = UNIT_ABBREVIATIONS[designatorRaw.toLowerCase()];
  return identifier ? `${canonical} ${identifier}` : canonical;
}

// Matches "City, ST 12345" or "City ST 12345-6789" — the comma is optional
// because plenty of real input drops it. The non-greedy city group only
// grows as far as it needs to for the anchored state+zip tail to match, so
// multi-word cities like "New York" are captured whole rather than cut at
// the first space.
const CITY_STATE_ZIP_RE = /^(.+?),?\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/;

export function parseAddress(input: string): ParseResult {
  const errors: string[] = [];
  const lines = input
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      errors: ['expected at least a street line and a city/state/zip line'],
    };
  }
  if (lines.length > 3) {
    return {
      ok: false,
      errors: ['expected at most three lines: street, optional unit, city/state/zip'],
    };
  }

  const lastLine = lines[lines.length - 1];
  const streetLines = lines.slice(0, lines.length - 1);

  const match = CITY_STATE_ZIP_RE.exec(lastLine);
  if (!match) {
    return { ok: false, errors: [`could not parse city/state/zip from "${lastLine}"`] };
  }

  const [, cityRaw, stateRaw, zip] = match;
  const city = cityRaw.trim();
  const state = stateRaw.toUpperCase();

  if (!CITY_RE.test(city)) {
    errors.push(`city "${city}" contains characters that aren't letters, spaces, or -.'`);
  }
  if (!STATE_CODES.has(state)) {
    errors.push(`"${stateRaw}" is not a recognized state, territory, or military code`);
  }
  if (!ZIP_RE.test(zip)) {
    errors.push(`"${zip}" is not a valid 5 or 9 digit ZIP code`);
  }

  const street = streetLines[0];
  if (!street) {
    errors.push('street line is empty');
  }
  const unit = streetLines[1] ? normalizeUnit(streetLines[1]) : undefined;

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    address: { street, city, state, zip, ...(unit ? { unit } : {}) },
  };
}

export interface FormatOptions {
  // USPS Publication 28 recommends all caps and no punctuation for
  // addresses that go through their OCR sorting equipment.
  uspsStyle?: boolean;
}

export function formatAddress(address: Address, options: FormatOptions = {}): string {
  const lines = [address.street];
  if (address.unit) lines.push(address.unit);
  lines.push(`${address.city}, ${address.state} ${address.zip}`);

  if (!options.uspsStyle) {
    return lines.join('\n');
  }

  return lines.map((line) => line.toUpperCase().replace(/[.,]/g, '')).join('\n');
}
