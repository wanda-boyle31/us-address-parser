import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAddress, formatAddress, Address } from '../src/address';

interface ParseCase {
  name: string;
  input: string;
  want: Address | 'error';
}

// The cases below are the ones that actually break naive address parsers:
// missing commas, multi-word cities, PO boxes instead of streets, ZIP+4,
// military "states", and whitespace that real users paste in.
const PARSE_CASES: ParseCase[] = [
  {
    name: 'plain two-line address',
    input: '123 Main St\nSpringfield, IL 62704',
    want: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62704' },
  },
  {
    name: 'three-line address with apartment unit',
    input: '123 Main St\nApt 4B\nSpringfield, IL 62704',
    want: { street: '123 Main St', unit: 'Apt 4B', city: 'Springfield', state: 'IL', zip: '62704' },
  },
  {
    name: 'unit folded into the street line',
    input: '123 Main St Apt 4B\nSpringfield, IL 62704',
    want: { street: '123 Main St Apt 4B', city: 'Springfield', state: 'IL', zip: '62704' },
  },
  {
    name: 'PO box instead of a street',
    input: 'PO Box 4501\nSpringfield, IL 62704',
    want: { street: 'PO Box 4501', city: 'Springfield', state: 'IL', zip: '62704' },
  },
  {
    name: 'rural route',
    input: 'RR 2 Box 45\nDecatur, IL 62521',
    want: { street: 'RR 2 Box 45', city: 'Decatur', state: 'IL', zip: '62521' },
  },
  {
    name: 'ZIP+4',
    input: '1600 Pennsylvania Ave NW\nWashington, DC 20500-0001',
    want: {
      street: '1600 Pennsylvania Ave NW',
      city: 'Washington',
      state: 'DC',
      zip: '20500-0001',
    },
  },
  {
    name: 'hyphenated city name',
    input: '400 N Main St\nWinston-Salem, NC 27101',
    want: { street: '400 N Main St', city: 'Winston-Salem', state: 'NC', zip: '27101' },
  },
  {
    name: 'apostrophe in city name',
    input: "210 Sherman Ave\nCoeur d'Alene, ID 83814",
    want: { street: '210 Sherman Ave', city: "Coeur d'Alene", state: 'ID', zip: '83814' },
  },
  {
    name: 'multi-word city with no comma before the state',
    input: '55 W 42nd St\nNew York NY 10036',
    want: { street: '55 W 42nd St', city: 'New York', state: 'NY', zip: '10036' },
  },
  {
    name: 'lowercase state code is normalized',
    input: '1 Infinite Loop\nCupertino, ca 95014',
    want: { street: '1 Infinite Loop', city: 'Cupertino', state: 'CA', zip: '95014' },
  },
  {
    name: 'military APO address',
    input: 'Unit 2050 Box 4190\nAPO, AE 09709',
    want: { street: 'Unit 2050 Box 4190', city: 'APO', state: 'AE', zip: '09709' },
  },
  {
    name: 'messy whitespace is collapsed',
    input: '  123   Main   St  \n  Springfield ,  IL   62704  ',
    want: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62704' },
  },
  {
    name: 'unrecognized state code',
    input: '1 Main St\nSomewhere, ZZ 00000',
    want: 'error',
  },
  {
    name: 'malformed zip',
    input: '1 Main St\nSpringfield, IL 6270',
    want: 'error',
  },
  {
    name: 'missing city/state/zip line',
    input: '123 Main St',
    want: 'error',
  },
  {
    name: 'too many lines',
    input: '123 Main St\nBldg 2\nApt 4B\nSpringfield, IL 62704',
    want: 'error',
  },
  {
    name: 'empty input',
    input: '',
    want: 'error',
  },
];

test('parseAddress table', async (t) => {
  for (const c of PARSE_CASES) {
    await t.test(c.name, () => {
      const result = parseAddress(c.input);
      if (c.want === 'error') {
        assert.equal(result.ok, false);
      } else {
        assert.deepEqual(result, { ok: true, address: c.want });
      }
    });
  }
});

test('formatAddress produces USPS-friendly output', () => {
  const address: Address = {
    street: '123 Main St.',
    unit: 'Apt 4B',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
  };
  assert.equal(
    formatAddress(address, { uspsStyle: true }),
    '123 MAIN ST\nAPT 4B\nSPRINGFIELD IL 62704',
  );
});

test('parse then format round-trips for a simple address', () => {
  const input = '123 Main St\nSpringfield, IL 62704';
  const parsed = parseAddress(input);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(formatAddress(parsed.address), input);
  }
});
