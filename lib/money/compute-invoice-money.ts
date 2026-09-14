import type {
  InvoiceMoney,
  MoneyLine,
  MoneyWarning,
  TaxContext,
  TaxSlab,
  TaxTreatment,
} from "./types";

/** Half-up to 2dp, EPSILON-corrected so 1.005 does not fall to 1.00. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * An LUT is filed per financial year and lapses on 31 March. "fy_2026_27"
 * covers supplies dated 2026-04-01 through 2027-03-31 inclusive.
 */
export function lutWindow(
  financialYear: string,
): { from: string; to: string } | null {
  const match = /^fy_(\d{4})_(\d{2})$/.exec(financialYear || "");
  if (!match) return null;
  const startYear = Number(match[1]);
  if (!Number.isFinite(startYear)) return null;
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
}

type TaxMode = "none" | "cgst_sgst" | "igst";

interface Resolution {
  treatment: TaxTreatment;
  mode: TaxMode;
  label: string;
}

/** True only when a LUT is declared held AND its FY window covers the supply date. */
function lutValidOn(ctx: TaxContext): boolean {
  if (ctx.lutDeclared !== "yes") return false;
  const window = lutWindow(ctx.lutFinancialYear);
  if (!window || !ctx.supplyDate) return false;
  return ctx.supplyDate >= window.from && ctx.supplyDate <= window.to;
}

function lapseWarning(ctx: TaxContext, warnings: MoneyWarning[]): void {
  const window = lutWindow(ctx.lutFinancialYear);
  if (!window) {
    warnings.push({
      code: "LUT_VALIDITY_MISSING",
      message: ctx.lutFinancialYear
        ? `LUT validity "${ctx.lutFinancialYear}" is not a recognised financial year.`
        : "A LUT is declared held but no financial year is recorded, so its validity cannot be established.",
    });
  } else if (!ctx.supplyDate) {
    warnings.push({
      code: "LUT_VALIDITY_MISSING",
      message: "No date of supply, so LUT validity cannot be established.",
    });
  } else if (ctx.supplyDate > window.to) {
    warnings.push({
      code: "LUT_LAPSED",
      message: `LUT expired ${window.to}; this supply is dated ${ctx.supplyDate}. IGST is now payable.`,
    });
  } else {
    warnings.push({
      code: "LUT_NOT_YET_EFFECTIVE",
      message: `LUT takes effect ${window.from}; this supply is dated ${ctx.supplyDate}.`,
    });
  }
}

/**
 * Export of services. Precedence is inherited verbatim from the function this
 * replaces, so that behaviour is unchanged for every supply whose LUT is either
 * valid or absent:
 *
 *   1. an explicit add-igst preference wins outright
 *   2. a LUT valid ON THE DATE OF SUPPLY zero-rates       <- the date is the new part
 *   3. an explicit "no LUT" charges IGST
 *   4. a LUT declared held but not valid on the date charges IGST   <- NEW
 *   5. nothing stated zero-rates, and says so
 *
 * Only rule 4 is new. It is the case where a February milestone correctly
 * zero-rated and its April sibling inherited `lutAvailability: "yes"` for a LUT
 * that lapsed on 31 March.
 */
function resolveExport(ctx: TaxContext, warnings: MoneyWarning[]): Resolution {
  const igst: Resolution = {
    treatment: "export_igst",
    mode: "igst",
    label: `IGST ${ctx.defaultRate}%`,
  };
  const zero: Resolution = {
    treatment: "export_zero_rated",
    mode: "none",
    label: "Export of services — zero-rated under LUT",
  };

  if (ctx.noLutHandling === "add-igst") return igst;
  if (lutValidOn(ctx)) return zero;
  if (ctx.lutDeclared === "no") return igst;
  if (ctx.lutDeclared === "yes") {
    lapseWarning(ctx, warnings);
    return igst;
  }
  warnings.push({
    code: "LUT_VALIDITY_MISSING",
    message:
      "No LUT on record for this supply. Zero-rating an export without a valid LUT is the freelancer's own liability.",
  });
  return zero;
}

/**
 * SEZ supply. The old function's SEZ branch consulted ONLY lutAvailability and
 * never noLutTaxHandling, so this one does not either. Rule 2 below is new.
 */
function resolveSez(ctx: TaxContext, warnings: MoneyWarning[]): Resolution {
  if (lutValidOn(ctx)) {
    return {
      treatment: "sez_zero_rated",
      mode: "none",
      label: "SEZ Supply — zero-rated under LUT",
    };
  }
  if (ctx.lutDeclared === "yes") lapseWarning(ctx, warnings);
  return { treatment: "sez_igst", mode: "igst", label: `IGST ${ctx.defaultRate}%` };
}

function resolveTreatment(
  ctx: TaxContext,
  warnings: MoneyWarning[],
): Resolution {
  if (!ctx.supplierRegistered) {
    return {
      treatment: "unregistered",
      mode: "none",
      label: "GST not applicable",
    };
  }

  if (ctx.reverseCharge) {
    return {
      treatment: "reverse_charge",
      mode: "none",
      label: "Reverse charge — GST payable by recipient",
    };
  }

  if (ctx.recipientLocation === "international") {
    return resolveExport(ctx, warnings);
  }

  if (ctx.recipientIsSez) {
    return resolveSez(ctx, warnings);
  }

  if (!ctx.supplierState || !ctx.recipientState) {
    warnings.push({
      code: "STATE_UNRESOLVED",
      message:
        "Supplier or recipient state is unknown, so CGST+SGST vs IGST cannot be decided. No tax has been charged.",
    });
    return {
      treatment: "indeterminate",
      mode: "none",
      label: "GST not applicable",
    };
  }

  if (ctx.supplierState === ctx.recipientState) {
    const half = ctx.defaultRate / 2;
    return {
      treatment: "intrastate",
      mode: "cgst_sgst",
      label: `CGST ${half}% + SGST ${half}%`,
    };
  }

  return {
    treatment: "interstate",
    mode: "igst",
    label: `IGST ${ctx.defaultRate}%`,
  };
}

/**
 * The only path to an invoice number.
 *
 * Tax is computed per rate SLAB, not per line and not on the invoice total:
 * GSTR-1 reconciles rate-wise, and per-line-then-sum drifts by paise.
 */
export function computeInvoiceMoney(
  lines: MoneyLine[],
  ctx: TaxContext,
): InvoiceMoney {
  const warnings: MoneyWarning[] = [];
  const byRate = new Map<number, number>();
  let taxableValue = 0;
  let sawNegative = false;

  for (const line of Array.isArray(lines) ? lines : []) {
    const qty = Number(line?.qty) || 0;
    const rate = Number(line?.rate) || 0;
    const amount = round2(qty * rate);
    if (amount < 0) sawNegative = true;
    taxableValue = round2(taxableValue + amount);

    const lineRate = Number(line?.taxRate);
    const slabRate = Number.isFinite(lineRate) ? lineRate : ctx.defaultRate;
    byRate.set(slabRate, round2((byRate.get(slabRate) ?? 0) + amount));
  }

  if (sawNegative) {
    warnings.push({
      code: "NEGATIVE_LINE",
      message:
        "At least one line has a negative amount. A credit belongs on a credit note, not a tax invoice.",
    });
  }

  const { treatment, mode, label } = resolveTreatment(ctx, warnings);

  if (mode !== "none" && ctx.defaultRate <= 0) {
    warnings.push({
      code: "REGISTERED_BUT_ZERO_RATE",
      message:
        "Supplier is registered and this supply is taxable, but the rate is 0%.",
    });
  }

  const slabs: TaxSlab[] = [];
  for (const [rate, slabTaxable] of Array.from(byRate.entries()).sort(
    (a, b) => a[0] - b[0],
  )) {
    if (mode === "none" || rate <= 0) {
      slabs.push({
        rate: mode === "none" ? 0 : rate,
        taxableValue: slabTaxable,
        cgst: 0,
        sgst: 0,
        igst: 0,
        taxAmount: 0,
      });
      continue;
    }

    const taxAmount = round2(slabTaxable * (rate / 100));
    if (mode === "cgst_sgst") {
      const cgst = round2(taxAmount / 2);
      // The remainder absorbs the odd paisa so cgst + sgst === taxAmount exactly.
      const sgst = round2(taxAmount - cgst);
      slabs.push({ rate, taxableValue: slabTaxable, cgst, sgst, igst: 0, taxAmount });
    } else {
      slabs.push({
        rate,
        taxableValue: slabTaxable,
        cgst: 0,
        sgst: 0,
        igst: taxAmount,
        taxAmount,
      });
    }
  }

  const cgstTotal = round2(slabs.reduce((sum, s) => sum + s.cgst, 0));
  const sgstTotal = round2(slabs.reduce((sum, s) => sum + s.sgst, 0));
  const igstTotal = round2(slabs.reduce((sum, s) => sum + s.igst, 0));
  const taxTotal = round2(cgstTotal + sgstTotal + igstTotal);

  const grossBeforeRounding = round2(taxableValue + taxTotal);
  const amountPayable = Math.round(grossBeforeRounding);
  const roundOff = round2(amountPayable - grossBeforeRounding);

  return {
    taxableValue,
    slabs,
    cgstTotal,
    sgstTotal,
    igstTotal,
    taxTotal,
    grossBeforeRounding,
    roundOff,
    amountPayable,
    treatment,
    label,
    warnings,
  };
}
