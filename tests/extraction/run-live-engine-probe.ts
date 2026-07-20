/**
 * Live engine probe — NOT part of CI.
 * Fires six fresh archetype briefs at the DEPLOYED parse-brief function via
 * the exact production call path (invokeBriefParserGateway), hydrates each
 * response, scores it against golden expectations, and writes:
 *   - tests/extraction/live-engine-capture-2026-07-19.json  (raw responses)
 *   - tests/extraction/LIVE_ENGINE_REPORT.md                (scored report)
 * Run manually: npx tsx tests/extraction/run-live-engine-probe.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  invokeBriefParserGateway,
  type BriefParserResponse,
} from "@/lib/brief-parser-gateway";
import { hydrateInvoiceFormFromParsedExtraction } from "@/lib/invoice-parsed-extraction-hydration";
import { mergeInvoiceFormData } from "@/types/invoice";
import { calculateInvoiceTotals } from "@/lib/invoice-calculations";

function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnvLocal();

const BRIEFS: Record<string, string> = {
  D1: "Hi! Ruhnika Creative Studio se likh rahi hoon, Bhubaneswar based, GSTIN 21AAPFR2345K1Z5. LazyPanda Foods ke liye invoice banana hai — woh bhi Bhubaneswar me hi hain, unka GSTIN 21AABCL4567M1Z3. Kaam: brand identity design ka ₹90,000 fixed, aur 12 social media posts @ ₹5,000 each. 50% advance mil gaya hai, baaki payment 15 days me clear karna hai. Paisa UPI pe aayega — ruhnika@okhdfcbank.",
  D2: "Raise an invoice from Ruhnika Creative Studio (Bhubaneswar, Odisha) to Kaveri Tech Labs, Bengaluru, Karnataka. One line item: complete UX audit and redesign of their onboarding flow — ₹2,40,000, SAC 998314. Invoice date 5 July 2026, due 20 July 2026, net 15 days. Payment by bank transfer: HDFC Bank, account 50200045671234, IFSC HDFC0001234.",
  D3: "Need an invoice for LazyPanda from Ruhnika Designs. It's for the rebrand sprint — the pitch deck redesign and the launch reel edit. We haven't fixed the numbers yet. Money should go to Priya Mohanty's account once it's sorted.",
  F1: "Export invoice RCS-EXP-014 from Ruhnika Creative Studio to Brightline Labs, Austin, United States. Landing site build USD 4,500 flat, plus revision support at USD 250 per hour. Export of services under LUT — zero-rated, no GST. Due 5 August 2026. Wire to ICICI Bank, SWIFT ICICINBBXXX.",
  F2: "Invoice for Nordvik Studio, based in Oslo. Motion graphics pack — total 2,800 for everything. They'll pay through Wise as usual. Keep it simple.",
  D4: "Invoice for Meridian Homes, Pune, Maharashtra. Full brand and website project, total ₹3,00,000. Billing split by milestones: 40% on kickoff, 40% on design delivery, and the last 20% on final handoff. Standard payment terms net 15 days.",
  F3: "Invoice from Ruhnika Creative Studio to Hafenblick Media, Berlin, Germany. Monthly design retainer €2,000 for 3 months. Export of services under LUT, zero-rated. Payment by bank transfer, IBAN DE89370400440532013000. Due 10 August 2026.",
  F4: "Bill Thornbury & Co, London, United Kingdom for UX consulting — 40 hours at £85 per hour. They pay by international wire. Due 1 August 2026.",
  F5: "Invoice for Marhaba Retail, Dubai, UAE — brand campaign design, AED 12,000 total. First export client, not sure about the LUT paperwork yet.",
  F6: "Client is Lumen Labs in Singapore but we bill them in rupees — ₹1,20,000 for the app redesign, they pay via SWIFT.",
};

type Hydration = ReturnType<typeof hydrateInvoiceFormFromParsedExtraction>;
type Check = {
  name: string;
  fn: (f: Hydration["nextFormData"], hy: Hydration, r: BriefParserResponse) => boolean;
};

const CHECKS: Record<string, Check[]> = {
  D1: [
    { name: "agencyName", fn: f => f.agency.agencyName === "Ruhnika Creative Studio" },
    { name: "clientName", fn: f => f.client.clientName === "LazyPanda Foods" },
    { name: "clientState", fn: f => f.client.clientState === "Odisha" },
    { name: "two line items", fn: f => f.lineItems.length === 2 },
    { name: "item1 rate 90000", fn: f => f.lineItems[0]?.rate === 90000 },
    { name: "item2 12 x 5000", fn: f => f.lineItems[1]?.qty === 12 && f.lineItems[1]?.rate === 5000 },
    { name: "terms 15 (advance prose)", fn: f => f.meta.paymentTerms === 15 },
    { name: "UPI accountName", fn: f => f.payment.accountName === "ruhnika@okhdfcbank" },
  ],
  D2: [
    { name: "clientState Karnataka", fn: f => f.client.clientState === "Karnataka" },
    { name: "IFSC", fn: f => f.payment.ifscCode === "HDFC0001234" },
    { name: "account number", fn: f => f.payment.accountNumber === "50200045671234" },
    { name: "invoiceDate ISO", fn: f => f.meta.invoiceDate === "2026-07-05" },
    { name: "dueDate ISO", fn: f => f.meta.dueDate === "2026-07-20" },
    { name: "terms 15", fn: f => f.meta.paymentTerms === 15 },
    { name: "rate 240000", fn: f => f.lineItems[0]?.rate === 240000 },
    { name: "SAC 998314", fn: f => f.lineItems[0]?.sacCode === "998314" },
  ],
  D3: [
    { name: "agency role (from/for trap)", fn: f => f.agency.agencyName === "Ruhnika Designs" },
    { name: "client role (from/for trap)", fn: f => f.client.clientName === "LazyPanda" },
    { name: "payee stays payee", fn: f => f.payment.accountName === "Priya Mohanty" },
    { name: "no invented rate", fn: f => !f.lineItems[0]?.rate },
    { name: ">=3 clarifications", fn: (_f, _hy, r) => r.clarificationQuestions.length >= 3 },
  ],
  F1: [
    { name: "international", fn: f => f.client.clientLocation === "international" },
    { name: "country US", fn: f => f.client.clientCountry === "United States" },
    { name: "SWIFT", fn: f => f.payment.swiftBicCode === "ICICINBBXXX" },
    { name: "invoice number kept", fn: f => f.meta.invoiceNumber === "RCS-EXP-014" },
    { name: "dueDate ISO", fn: f => f.meta.dueDate === "2026-08-05" },
    { name: "rates 4500 / 250", fn: f => f.lineItems[0]?.rate === 4500 && f.lineItems[1]?.rate === 250 },
  ],
  F2: [
    { name: "international", fn: f => f.client.clientLocation === "international" },
    { name: "settlement forex", fn: f => f.payment.paymentSettlementType === "forex" },
    { name: "currency must stay missing", fn: (_f, _hy, r) => r.missingFields.includes("meta.currency") },
  ],
  D4: [
    { name: "clientState Maharashtra", fn: f => f.client.clientState === "Maharashtra" },
    { name: "total 300000 as item", fn: f => f.lineItems[0]?.rate === 300000 },
    { name: "terms 15 untouched by milestones", fn: f => f.meta.paymentTerms === 15 },
    { name: "3 milestones", fn: (_f, hy) => hy.parsedMilestones.length === 3 },
    {
      name: "percents 40/40/20",
      fn: (_f, hy) =>
        hy.parsedMilestones.map(m => m.percent).join(",") === "40,40,20",
    },
    {
      name: "milestone amounts populated (120000/120000/60000)",
      fn: (_f, hy) =>
        hy.parsedMilestones.map(m => m.amount).join(",") === "120000,120000,60000",
    },
  ],
  F3: [
    { name: "international", fn: f => f.client.clientLocation === "international" },
    { name: "country Germany", fn: f => f.client.clientCountry === "Germany" },
    { name: "currency EUR", fn: f => f.client.clientCurrency === "EUR" },
    {
      name: "IBAN captured verbatim (raw)",
      fn: (_f, _hy, r) =>
        r.normalizedExtraction.payment.ibanOrRouting === "DE89370400440532013000",
    },
    { name: "dueDate ISO", fn: f => f.meta.dueDate === "2026-08-10" },
  ],
  F4: [
    { name: "international", fn: f => f.client.clientLocation === "international" },
    { name: "currency GBP", fn: f => f.client.clientCurrency === "GBP" },
    { name: "40 hours x 85", fn: f => f.lineItems[0]?.qty === 40 && f.lineItems[0]?.rate === 85 },
    { name: "dueDate ISO", fn: f => f.meta.dueDate === "2026-08-01" },
  ],
  F5: [
    { name: "international", fn: f => f.client.clientLocation === "international" },
    { name: "currency AED", fn: f => f.client.clientCurrency === "AED" },
    { name: "rate 12000", fn: f => f.lineItems[0]?.rate === 12000 },
    {
      name: "LUT status surfaced (missing or clarified)",
      fn: (_f, _hy, r) =>
        r.missingFields.includes("taxHints.lutStatus") ||
        r.clarificationQuestions.some(q => /lut/i.test(q)),
    },
  ],
  F6: [
    { name: "international", fn: f => f.client.clientLocation === "international" },
    { name: "explicit INR survives", fn: f => (f.client.clientCurrency as string) === "INR" },
    {
      name: "no false currency clarification",
      fn: (_f, _hy, r) => !r.missingFields.includes("meta.currency"),
    },
  ],
};

const E2E_CHECKS: Record<string, Check[]> = {
  D1: [
    { name: "E2E subtotal 150000", fn: f => calculateInvoiceTotals(f).subtotal === 150000 },
    {
      name: "E2E intra-state CGST+SGST split",
      fn: f => {
        const t = calculateInvoiceTotals(f);
        return t.cgst > 0 && t.sgst > 0 && t.cgst === t.sgst && t.igst === 0;
      },
    },
    {
      name: "E2E grandTotal = subtotal + tax",
      fn: f => {
        const t = calculateInvoiceTotals(f);
        return t.grandTotal === t.subtotal + t.taxAmount;
      },
    },
  ],
  D2: [
    { name: "E2E subtotal 240000", fn: f => calculateInvoiceTotals(f).subtotal === 240000 },
    {
      name: "E2E inter-state IGST only",
      fn: f => {
        const t = calculateInvoiceTotals(f);
        return t.igst > 0 && t.cgst === 0 && t.sgst === 0;
      },
    },
  ],
  F1: [
    {
      name: "E2E export zero tax",
      fn: f => {
        const t = calculateInvoiceTotals(f);
        return t.taxAmount === 0 && t.igst === 0 && t.cgst === 0;
      },
    },
  ],
  F2: [
    { name: "E2E zero tax", fn: f => calculateInvoiceTotals(f).taxAmount === 0 },
  ],
  F3: [
    { name: "E2E subtotal 6000", fn: f => calculateInvoiceTotals(f).subtotal === 6000 },
    { name: "E2E zero tax", fn: f => calculateInvoiceTotals(f).taxAmount === 0 },
  ],
  F4: [
    { name: "E2E subtotal 3400", fn: f => calculateInvoiceTotals(f).subtotal === 3400 },
    { name: "E2E zero tax", fn: f => calculateInvoiceTotals(f).taxAmount === 0 },
  ],
  D4: [
    { name: "E2E subtotal 300000", fn: f => calculateInvoiceTotals(f).subtotal === 300000 },
    {
      name: "E2E grandTotal consistency",
      fn: f => {
        const t = calculateInvoiceTotals(f);
        return t.grandTotal === t.subtotal + t.taxAmount;
      },
    },
  ],
};

async function main() {
  const captures: Record<string, BriefParserResponse> = {};
  const rows: string[] = [];
  const failuresMd: string[] = [];
  let passTotal = 0;
  let checkTotal = 0;

  for (const key of Object.keys(BRIEFS)) {
    const res = await invokeBriefParserGateway({
      input: {
        briefText: BRIEFS[key],
        ocrText: "",
        voiceTranscript: "",
        isRetry: false,
      },
      authorizationHeader: null,
    });

    if (!res.ok) {
      rows.push(`| ${key} | GATEWAY FAIL ${res.status} | — | — | — |`);
      failuresMd.push(`### ${key}\n- gateway error: ${res.error}`);
      checkTotal += CHECKS[key].length + 1;
      await new Promise(r => setTimeout(r, 1200));
      continue;
    }

    const resp = res.response;
    captures[key] = resp;
    const hy = hydrateInvoiceFormFromParsedExtraction({
      currentFormData: mergeInvoiceFormData(),
      parserResponse: resp,
    });
    const f = hy.nextFormData;

    const results = [
      { name: "provider answered", pass: Boolean(resp.providerUsed) },
      ...[...CHECKS[key], ...(E2E_CHECKS[key] ?? [])].map(c => {
        let pass = false;
        try {
          pass = c.fn(f, hy, resp);
        } catch {
          pass = false;
        }
        return { name: c.name, pass };
      }),
    ];
    const passed = results.filter(x => x.pass).length;
    passTotal += passed;
    checkTotal += results.length;
    const failed = results.filter(x => !x.pass).map(x => x.name);
    rows.push(
      `| ${key} | ${passed}/${results.length} | ${resp.providerUsed ?? "NONE"} | ${resp.parserVersion ?? "?"} | ${resp.documentId ?? "—"} |`,
    );
    if (failed.length) {
      failuresMd.push(`### ${key}\n${failed.map(n => `- FAIL: ${n}`).join("\n")}`);
    }
    console.log(`${key}: ${passed}/${results.length}${failed.length ? "  FAILED: " + failed.join(" · ") : ""}`);
    await new Promise(r => setTimeout(r, 1200));
  }

  writeFileSync(
    join(__dirname, "live-engine-capture-2026-07-19.json"),
    JSON.stringify(captures, null, 2),
  );

  const pct = checkTotal ? Math.round((passTotal / checkTotal) * 100) : 0;
  const report = [
    "# Live Engine Report — 2026-07-19",
    "",
    "Deployed parse-brief probed via invokeBriefParserGateway (production call path).",
    "Six fresh archetype briefs; hydrated output scored against goldens.",
    "Raw responses: `live-engine-capture-2026-07-19.json`.",
    "",
    "| Scenario | Checks | Provider | Version | documentId |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    `## SUMMARY: ${passTotal}/${checkTotal} checks passed (${pct}%)`,
    "",
    ...(failuresMd.length ? ["## Failures", "", ...failuresMd] : ["## Failures", "", "None."]),
    "",
  ].join("\n");
  writeFileSync(join(__dirname, "LIVE_ENGINE_REPORT.md"), report);
  console.log(`\nSUMMARY: ${passTotal}/${checkTotal} (${pct}%) — report + capture written.`);
}

main().catch(err => {
  console.error("PROBE ABORTED:", err?.message || err);
  process.exit(1);
});
