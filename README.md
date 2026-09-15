# us-address-parser

A validating parser and pretty printer for US mailing addresses.

Address text shows up everywhere as loose, human-typed strings: pasted
from a form, copied out of an email signature, exported from a spreadsheet.
Before you can store it, compare it, or hand it to a shipping API, you need
to know whether it's actually a valid US address and you need a consistent
way to print it back out. That's what this does. It takes a free-text
block, parses it into a structured `Address`, tells you exactly what's
wrong if it can't, and can render that structure back into either a normal
mailing-label format or the all-caps, punctuation-free format USPS
recommends for machine sorting (Publication 28).

## Scope

US addresses only, three lines at most: a street line, an optional second
line for a unit/suite, and a city/state/zip line. It does not parse a
recipient name out of the input — pass just the address portion. State
codes are checked against the real USPS list (50 states, DC, territories,
and the three military codes), and ZIP codes must be 5 digits or ZIP+4.

## Usage

```ts
import { parseAddress, formatAddress } from './src/address';

const result = parseAddress('123 Main St\nApt 4B\nSpringfield, IL 62704');

if (result.ok) {
  console.log(result.address);
  // { street: '123 Main St', unit: 'Apt 4B', city: 'Springfield', state: 'IL', zip: '62704' }

  console.log(formatAddress(result.address, { uspsStyle: true }));
  // 123 MAIN ST
  // APT 4B
  // SPRINGFIELD IL 62704
} else {
  console.error(result.errors);
  // e.g. ['"ZZ" is not a recognized state, territory, or military code']
}
```

`parseAddress` is forgiving about formatting noise — collapsed or extra
whitespace, a missing comma before the state, lowercase state codes — but
strict about the things that actually matter: a real state code and a real
ZIP shape. See `test/address.test.ts` for the full table of cases it's
checked against, including PO boxes, rural routes, hyphenated and
apostrophized city names, ZIP+4, and military addresses.

## Building and testing

No third-party dependencies — TypeScript is the only dev dependency, used
just to compile. Everything else is Node's standard library, including the
test runner.

```sh
npm install   # pulls in typescript only
npm run build # compiles src/ and test/ to dist/
npm test      # builds, then runs dist/test with node --test
```

## License

MIT, see LICENSE.
