/**
 * Caller contract tests.
 *
 * The money suites exercise the engine. Every defect found in the last two
 * sessions was in a CALLER: a writer emitting a status the column refuses, a
 * caller passing a flattened object to a function that reads nested keys, a
 * reader misjudging which line items a function covers. 59,666 test cases were
 * green through all of them, because none of them look at a call site.
 *
 * This file does. Two static checks over the repo's own file list, two runtime
 * checks on the contracts callers actually depend on.
 *
 * Run: npx tsx tests/callers/run-caller-contract-tests.ts
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { calculateInvoiceTotals, resolveInvoicePayable } from "@/lib/invoice-calculations";

let failures = 0;
let checks = 0;

function pass(name: string) {
  checks++;
  console.log("PASS  " + name);
}

function fail(name: string, detail: string) {
  checks++;
  failures++;
  console.log("FAIL  " + name);
  for (const line of detail.split("\n")) console.log("        " + line);
}

function assertEq(name: string, got: number, want: number) {
  if (Math.abs(got - want) < 0.005) pass(name + " = " + want);
  else fail(name, "got " + got + ", expected " + want);
}

/* --- repo enumeration ------------------------------------------------- */

/**
 * git ls-files, never a directory walk. A preflight that counted with a walk
 * and verified with git disagreed by eleven, all of them compiled copies under
 * .next/. Split on newlines only: 41 tracked paths contain spaces.
 */
function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter((p) => p.endsWith(".ts") || p.endsWith(".tsx"))
    .filter((p) => !p.startsWith("_archived/") && !p.startsWith("tests/"));
}

/** Strip comments, preserving offsets well enough for substring matching. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(Math.max(0, m.length - p1.length)));
}

/* --- check 1: every status written to invoices is in the canon -------- */

const CANON = ["draft", "finalized", "partial", "settled", "cancelled"];

function statusLiteralsWrittenToInvoices(src: string): string[] {
  const out: string[] = [];
  const s = stripComments(src);
  const fromRe = /\.from\(\s*["']invoices["']\s*\)/g;
  let fm: RegExpExecArray | null;
  while ((fm = fromRe.exec(s)) !== null) {
    let tail = s.slice(fm.index + fm[0].length, fm.index + fm[0].length + 900);
    // Bound at the next .from(...) or the scan walks into a neighbouring
    // invoice_milestones chain and reports its UPPERCASE canon as a violation.
    const nxt = tail.search(/\.from\(/);
    if (nxt >= 0) tail = tail.slice(0, nxt);
    const mm = /\.(insert|update|upsert)\(/.exec(tail);
    if (!mm) continue;
    let depth = 0;
    let i = mm.index + mm[0].length - 1;
    const start = mm.index + mm[0].length;
    for (; i < tail.length; i++) {
      if (tail[i] === "(") depth++;
      else if (tail[i] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    const payload = tail.slice(start, i);
    const litRe = /\bstatus\s*:\s*["']([^"']*)["']/g;
    let sm: RegExpExecArray | null;
    while ((sm = litRe.exec(payload)) !== null) out.push(sm[1]);
  }
  return out;
}

{
  const offenders: string[] = [];
  for (const p of trackedFiles()) {
    for (const lit of statusLiteralsWrittenToInvoices(readFileSync(p, "utf8"))) {
      if (!CANON.includes(lit)) offenders.push(p + ' writes status "' + lit + '"');
    }
  }
  if (offenders.length === 0) {
    pass("1. every invoices.status literal is in the canon (" + CANON.join("/") + ")");
  } else {
    fail("1. invoices.status canon membership", offenders.join("\n"));
  }
}

/* --- check 2: no saveInvoice call site drops its error ---------------- */

{
  const offenders: string[] = [];
  for (const p of trackedFiles()) {
    const src = readFileSync(p, "utf8");
    if (!src.includes("saveInvoice(")) continue;
    const s = stripComments(src);
    const callRe = /saveInvoice\(/g;
    let m: RegExpExecArray | null;
    while ((m = callRe.exec(s)) !== null) {
      const lineStart = s.lastIndexOf("\n", m.index) + 1;
      const head = s.slice(Math.max(0, lineStart - 200), m.index);
      const lineNo = s.slice(0, m.index).split("\n").length;
      // The declaration is not a call site. Matching it is the namesake trap:
      // `export async function saveInvoice(` reads exactly like an unguarded
      // call to a regex that only looks at the identifier.
      if (/\bfunction\s+$/.test(head) || /\bfunction\s+saveInvoice\s*$/.test(s.slice(Math.max(0, m.index - 40), m.index))) continue;
      // Accepted: destructured `error` / renamed `error: x`, or assigned to an
      // identifier whose `.error` is read within the next 12 lines.
      const destructured = /\{[^}]*\berror\b[^}]*\}\s*=\s*(await\s+)?$/.test(head);
      let assignedAndRead = false;
      const assign = /(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?$/.exec(head);
      if (assign) {
        const after = s.slice(m.index, m.index + 900).split("\n").slice(0, 12).join("\n");
        assignedAndRead = new RegExp("\\b" + assign[1] + "\\.error\\b").test(after);
      }
      if (!destructured && !assignedAndRead) {
        offenders.push(p + ":" + lineNo + " does not read the returned error");
      }
    }
  }
  if (offenders.length === 0) {
    pass("2. every saveInvoice() call site reads the returned error");
  } else {
    fail("2. saveInvoice error discipline", offenders.join("\n"));
  }
}

/* --- check 3: the milestone[0] scope contract ------------------------- */

const ms = (amount: number) => ({
  lineItems: [{ qty: 1, rate: amount, description: "milestone line" }],
});

const masterFormData = {
  agency: {
    gstRegistrationStatus: "registered",
    gstin: "29ABLPB2947K1ZC",
    agencyState: "Karnataka",
  },
  client: { clientState: "Karnataka", clientLocation: "domestic" },
  tax: { taxMode: "gst", taxRate: 18, isRcmEnabled: false },
  // INV-2026-9996's shape: 204,000 of 605,000 sits in milestone[0].
  milestones: [ms(204000), ms(85000), ms(126000), ms(145000), ms(45000)],
};

{
  const totals = calculateInvoiceTotals(masterFormData);
  assertEq("3a. a master bills milestone[0] only, not the milestone sum", totals.taxableValue, 204000);
  assertEq("3b. tax follows that same scope", totals.taxAmount, 36720);
  assertEq("3c. payable follows that same scope", resolveInvoicePayable({ form_data: masterFormData }), 240720);

  // Both halves of the /invoices GST arithmetic must share one scope. This is
  // the assertion that would have stopped a wrong analysis: it fails if anyone
  // widens billableLineItems to sum every milestone without widening the other
  // side with it.
  const taxable = totals.taxableValue;
  const payable = resolveInvoicePayable({ form_data: masterFormData });
  assertEq("3d. payable - taxable is the invoice's own tax, nothing else", payable - taxable, 36720);
}

/* --- check 4: the column is a fallback, not a silent substitute ------- */

{
  // A legitimately zero invoice. The engine models this (money fixture 9), and
  // `if (payable > 0)` sends it to the stored column instead of returning 0 -
  // so a stale grand_total is reported as the payable amount.
  const zeroInvoice = {
    grand_total: 999999,
    form_data: { ...masterFormData, milestones: [ms(0)] },
  };
  const got = resolveInvoicePayable(zeroInvoice);
  if (got === 0) {
    pass("4. a legitimately zero invoice returns 0, not the stored column");
  } else {
    fail(
      "4. zero payable falls through to the stored column",
      "resolveInvoicePayable returned " + got + ", expected 0\n" +
        "lib/invoice-calculations.ts: `if (payable > 0) return payable;` treats a\n" +
        "real zero as an unresolved form_data and reaches for grand_total. The\n" +
        "guard should be on whether the engine RESOLVED, not on whether it\n" +
        "returned a positive number.",
    );
  }
}

/* --- check 5: no resolver sums every milestone row --------------------- */

{
  // An invoice bills ONE milestone. Summing every invoice_milestones row gives
  // the project's value instead - a different quantity, not a rougher estimate
  // of the same one, and it reached three resolvers before anyone noticed. The
  // one legitimate accumulation is billedMilestoneAmount, which sorts by
  // order_index and takes [0].
  const BAD = [
    "milestones.reduce((sum, milestone) => sum + Number(milestone.amount",
    "milestones.reduce((sum, m) => sum + Number(m.amount",
    "grandTotal += milestoneAmount",
  ];
  const offenders: string[] = [];
  for (const p of trackedFiles()) {
    if (!p.startsWith("lib/supabase/")) continue;
    const s = stripComments(readFileSync(p, "utf8"));
    for (const bad of BAD) {
      if (s.includes(bad)) offenders.push(p + " accumulates every milestone: " + bad);
    }
  }
  const proj = readFileSync("lib/supabase/projects.ts", "utf8");
  if (!proj.includes("function billedMilestoneAmount")) {
    offenders.push("lib/supabase/projects.ts has lost billedMilestoneAmount");
  }
  if (offenders.length === 0) {
    pass("5. no invoice-value resolver sums every milestone row");
  } else {
    fail("5. milestone scope in the value resolvers", offenders.join("\n"));
  }
}

/* --- check 6: the parent is marked only after everything that can reject -- */

{
  // fireMilestoneInvoice used to write the parent's status "partial" first and
  // run the CA-3 guard, the child insert and the milestone update after it.
  // Three throw sites sat between them, and each one left the parent claiming
  // part-billed with nothing behind it. The ordering IS the fix, so it is
  // asserted rather than trusted.
  const src = stripComments(readFileSync("lib/supabase/milestones.ts", "utf8"));
  const anchors: Record<string, string> = {
    guard: 'gstRegistrationStatus === "registered"',
    childInsert: 'status: "finalized"',
    milestoneFired: 'trigger_status: "fired"',
    parentMark: 'status: "partial"',
  };

  const problems: string[] = [];
  const at: Record<string, number> = {};
  for (const [key, needle] of Object.entries(anchors)) {
    const n = src.split(needle).length - 1;
    if (n !== 1) problems.push(key + ' anchor appears ' + n + ' times, expected 1: ' + needle);
    at[key] = src.indexOf(needle);
  }
  if (problems.length === 0) {
    if (at.guard > at.parentMark) problems.push("the CA-3 guard runs AFTER the parent is marked partial");
    if (at.childInsert > at.parentMark) problems.push("the child invoice is inserted AFTER the parent is marked partial");
    if (at.milestoneFired > at.parentMark) problems.push("the milestone is fired AFTER the parent is marked partial");
  }

  if (problems.length === 0) {
    pass("6. parent marked partial only after the guard, the child insert and the milestone update");
  } else {
    fail("6. fireMilestoneInvoice mutation ordering", problems.join("\n"));
  }
}

/* --- check 7: the frozen legacy tax function never ships --------------- */

{
  // computeInvoiceTax was a second implementation of the GST rules. It now
  // lives frozen under tests/money/, and trackedFiles() excludes tests/, so any
  // hit here means it has been imported back into shipping code.
  const offenders = trackedFiles().filter((p) => {
    const s = stripComments(readFileSync(p, "utf8"));
    return s.includes("frozen-legacy-tax") || s.includes("lib/invoice-tax");
  });
  if (offenders.length === 0) {
    pass("7. the frozen legacy tax implementation is not reachable from shipping code");
  } else {
    fail("7. a legacy tax implementation is back in production", offenders.join("\n"));
  }
}

/* ---------------------------------------------------------------------- */

console.log("");
console.log(checks - failures + "/" + checks + " caller contract checks passed");
process.exit(failures === 0 ? 0 : 1);
