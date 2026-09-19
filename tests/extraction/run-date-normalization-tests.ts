import { normalizeDate } from "../../supabase/functions/parse-brief/postprocess";

/**
 * Pins the date policy of the brief parser.
 *
 * Numeric slash/dot/dash dates are read DAY-FIRST, because the users writing
 * these briefs write 05/09/2026 meaning 5 September. Before this suite existed
 * that string was parsed by the JS engine as 9 May and stored with no warning.
 *
 * Three rules are pinned here:
 *   1. an unresolvable value returns null, never the raw string
 *   2. a shape-valid but impossible date (2026-13-45) is rejected
 *   3. an ambiguous day-first date (day <= 12) resolves day-first AND warns
 *
 * Every expected value below is the DATE THE WRITER MEANT, not the value the
 * previous implementation happened to produce.
 */

type DateCase = {
  input: unknown;
  expected: string | null;
  warns: boolean;
  note: string;
};

const cases: DateCase[] = [
  // --- ISO, validated as a real calendar date -----------------------------
  { input: "2026-09-19", expected: "2026-09-19", warns: false, note: "ISO passes through" },
  { input: "2026-9-19", expected: "2026-09-19", warns: false, note: "single-digit ISO parts are padded" },
  { input: "2026-02-28", expected: "2026-02-28", warns: false, note: "28 February is a real date" },
  { input: "2026-13-45", expected: null, warns: true, note: "shape-valid but impossible ISO is rejected" },
  { input: "2026-02-30", expected: null, warns: true, note: "30 February is rejected" },

  // --- numeric forms are day-first ----------------------------------------
  { input: "19/09/2026", expected: "2026-09-19", warns: false, note: "unambiguous day-first, no warning" },
  { input: "05/09/2026", expected: "2026-09-05", warns: true, note: "ambiguous resolves to 5 September and warns" },
  { input: "5/9/2026", expected: "2026-09-05", warns: true, note: "single-digit day-first" },
  { input: "19-09-2026", expected: "2026-09-19", warns: false, note: "dash separator" },
  { input: "19.09.2026", expected: "2026-09-19", warns: false, note: "dot separator" },
  { input: "05/09/26", expected: "2026-09-05", warns: true, note: "two-digit year expands to 20xx" },
  { input: "09/19/2026", expected: "2026-09-19", warns: true, note: "month-first fallback when day-first is impossible" },
  { input: "31/02/2026", expected: null, warns: true, note: "impossible either way is rejected" },

  // --- free text ----------------------------------------------------------
  { input: "19 Sept 2026", expected: "2026-09-19", warns: false, note: "parseable free text" },
  { input: "next Friday", expected: null, warns: true, note: "unparseable text returns null, never the raw string" },
  { input: "Q3", expected: null, warns: true, note: "unparseable token returns null" },

  // --- absent values are not warnings -------------------------------------
  { input: "", expected: null, warns: false, note: "empty string" },
  { input: "   ", expected: null, warns: false, note: "whitespace only" },
  { input: null, expected: null, warns: false, note: "null" },
  { input: undefined, expected: null, warns: false, note: "undefined" },
  { input: 20260919, expected: null, warns: false, note: "non-string input" },
];

let failures = 0;

for (const testCase of cases) {
  const warnings: string[] = [];
  const actual = normalizeDate(testCase.input, warnings);
  const warned = warnings.length > 0;

  const valueOk = actual === testCase.expected;
  const warnOk = warned === testCase.warns;

  if (valueOk && warnOk) {
    console.log(`PASS  ${testCase.note}`);
    continue;
  }

  failures += 1;
  console.error(`FAIL  ${testCase.note}`);
  console.error(`        input    ${JSON.stringify(testCase.input)}`);

  if (!valueOk) {
    console.error(`        expected ${JSON.stringify(testCase.expected)}`);
    console.error(`        actual   ${JSON.stringify(actual)}`);
  }

  if (!warnOk) {
    console.error(`        expected warning: ${testCase.warns}, got: ${warned}`);
    console.error(`        warnings ${JSON.stringify(warnings)}`);
  }
}

// No result may ever be a value the invoices.due_date date column would reject.
for (const testCase of cases) {
  const warnings: string[] = [];
  const actual = normalizeDate(testCase.input, warnings);

  if (actual !== null && !/^\d{4}-\d{2}-\d{2}$/.test(actual)) {
    failures += 1;
    console.error(`FAIL  non-ISO value escaped for ${JSON.stringify(testCase.input)}: ${JSON.stringify(actual)}`);
  }
}

console.log(`${cases.length - failures}/${cases.length} date normalization cases passed`);

if (failures > 0) {
  process.exit(1);
}
