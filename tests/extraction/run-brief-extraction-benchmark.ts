import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { runBriefAutofill, type BriefAutofillResult } from "@/lib/invoice-brief-intake";
import {
  EXTRACTION_BENCHMARK_CASES,
  type ExtractionBenchmarkCase,
  type ExtractionBenchmarkDeliverableExpectation,
  type ExtractionBenchmarkFieldExpectation,
} from "@/tests/extraction/brief-extraction-benchmarks";
import { defaultInvoiceFormData } from "@/types/invoice";

type FieldStatus = "correct" | "partially-correct" | "missing" | "incorrect";

type BenchmarkFieldReport = {
  expected: unknown;
  actual: unknown;
  status: FieldStatus;
  confidence: string;
  source: string;
  origin: string;
};

type BenchmarkCaseReport = {
  id: string;
  title: string;
  correct: number;
  partial: number;
  missing: number;
  incorrect: number;
  score: number;
  extracted: Record<string, BenchmarkFieldReport>;
  inferred: Record<string, BenchmarkFieldReport>;
  clarifications: BenchmarkFieldReport;
};

type BenchmarkSummary = {
  totalCases: number;
  totalFields: number;
  correct: number;
  partial: number;
  missing: number;
  incorrect: number;
  score: number;
};

type BenchmarkOutput = {
  generatedAt: string;
  aiAvailable: boolean;
  summary: BenchmarkSummary;
  cases: BenchmarkCaseReport[];
};

type ActualValueWithMeta<T> = {
  value: T;
  confidence: string;
  source: string;
  origin: string;
};

function normalizeText(value: string | undefined | null) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compareString(expected: string, actual: string | undefined) {
  const normalizedExpected = normalizeText(expected);
  const normalizedActual = normalizeText(actual);

  if (!normalizedActual) {
    return "missing" as const;
  }

  if (normalizedExpected === normalizedActual) {
    return "correct" as const;
  }

  if (
    normalizedActual.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedActual)
  ) {
    return "partially-correct" as const;
  }

  return "incorrect" as const;
}

function compareNumber(expected: number, actual: number | undefined) {
  if (actual === undefined || Number.isNaN(actual)) {
    return "missing" as const;
  }

  if (expected === actual) {
    return "correct" as const;
  }

  const ratio = expected === 0 ? 0 : Math.abs(expected - actual) / expected;
  return ratio <= 0.1 ? "partially-correct" : "incorrect";
}

function describeDeliverableMatch(
  expected: ExtractionBenchmarkDeliverableExpectation,
  actual: ExtractionBenchmarkDeliverableExpectation
) {
  let checks = 0;
  let hits = 0;

  if (expected.type) {
    checks += 1;
    if (expected.type === actual.type) {
      hits += 1;
    }
  }

  if (expected.description) {
    checks += 1;
    if (
      actual.description &&
      compareString(expected.description, actual.description) !== "incorrect"
    ) {
      hits += 1;
    }
  }

  if (expected.qty !== undefined) {
    checks += 1;
    if (expected.qty === actual.qty) {
      hits += 1;
    }
  }

  if (expected.rate !== undefined) {
    checks += 1;
    if (expected.rate === actual.rate) {
      hits += 1;
    }
  }

  if (expected.rateUnit) {
    checks += 1;
    if (expected.rateUnit === actual.rateUnit) {
      hits += 1;
    }
  }

  return checks === 0 ? 0 : hits / checks;
}

function compareDeliverables(
  expected: ExtractionBenchmarkDeliverableExpectation[],
  actual: ExtractionBenchmarkDeliverableExpectation[]
) {
  if (actual.length === 0) {
    return "missing" as const;
  }

  const matches = expected.map((expectedItem) =>
    Math.max(
      0,
      ...actual.map((actualItem) =>
        describeDeliverableMatch(expectedItem, actualItem)
      )
    )
  );

  const fullyMatched = matches.every((score) => score === 1);
  const partlyMatched = matches.every((score) => score >= 0.5);

  if (fullyMatched && actual.length >= expected.length) {
    return "correct" as const;
  }

  if (partlyMatched) {
    return "partially-correct" as const;
  }

  return "incorrect" as const;
}

function compareClarifications(expected: string[], actual: string[]) {
  if (expected.length === 0 && actual.length === 0) {
    return "correct" as const;
  }

  if (expected.length === 0 && actual.length > 0) {
    return "incorrect" as const;
  }

  const allExpectedPresent = expected.every((id) => actual.includes(id));

  if (!allExpectedPresent) {
    return actual.length === 0 ? "missing" : "incorrect";
  }

  return actual.length === expected.length ? "correct" : "partially-correct";
}

function toDeliverableActualValue(result: BriefAutofillResult) {
  const sourceItems =
    result.extraction.lineItems && result.extraction.lineItems.length > 0
      ? result.extraction.lineItems
      : [
          {
            type: result.extraction.deliverableType,
            description: result.extraction.deliverableDescription,
            qty: result.extraction.qty,
            rate: result.extraction.rate,
            rateUnit: result.extraction.rateUnit,
          },
        ].filter(
          (item) =>
            item.type ||
            item.description ||
            item.qty ||
            item.rate ||
            item.rateUnit
        );

  const values = sourceItems.map((item) => ({
    type: item.type?.value,
    description: item.description?.value,
    qty: item.qty?.value,
    rate: item.rate?.value,
    rateUnit: item.rateUnit?.value,
  }));
  const source = sourceItems
    .flatMap((item) =>
      [item.type, item.description, item.qty, item.rate, item.rateUnit]
        .filter(Boolean)
        .map((field) => field!.source)
    )
    .join(", ");
  const confidence = sourceItems
    .flatMap((item) =>
      [item.type, item.description, item.qty, item.rate, item.rateUnit]
        .filter(Boolean)
        .map((field) => field!.confidence)
    )
    .join(", ");

  return {
    value: values,
    confidence: confidence || "-",
    source: source || "-",
    origin: source.includes("ai") ? "ai" : "parser",
  } satisfies ActualValueWithMeta<ExtractionBenchmarkDeliverableExpectation[]>;
}

function toScalarReport<T>(
  expected: T,
  actual: ActualValueWithMeta<T | undefined>,
  compare: (expectedValue: T, actualValue: T | undefined) => FieldStatus
) {
  return {
    expected,
    actual: actual.value ?? null,
    status: compare(expected, actual.value),
    confidence: actual.confidence,
    source: actual.source,
    origin: actual.origin,
  } satisfies BenchmarkFieldReport;
}

function buildActualFieldMap(result: BriefAutofillResult) {
  const extraction = result.extraction;

  const scalar = <T,>(
    field:
      | { value: T; confidence: string; source: string }
      | undefined
  ): ActualValueWithMeta<T | undefined> => ({
    value: field?.value,
    confidence: field?.confidence ?? "-",
    source: field?.source ?? "-",
    origin: field?.source === "ai" ? "ai" : field?.source ? "parser" : "-",
  });

  return {
    agencyName: scalar(extraction.agencyName),
    clientName: scalar(extraction.clientName),
    agencyState: scalar(extraction.agencyState),
    clientState: scalar(extraction.clientState),
    clientCountry: scalar(extraction.clientCountry),
    clientLocationType: scalar(extraction.clientLocation),
    currency: scalar(extraction.clientCurrency ?? extraction.invoiceCurrencyCode),
    totalAmount: scalar(extraction.invoiceTotalAmount),
    rate: scalar(
      extraction.rate ??
        (extraction.lineItems && extraction.lineItems[0]?.rate
          ? extraction.lineItems[0].rate
          : undefined)
    ),
    rateUnit: scalar(
      extraction.rateUnit ??
        (extraction.lineItems && extraction.lineItems[0]?.rateUnit
          ? extraction.lineItems[0].rateUnit
          : undefined)
    ),
    deliverables: toDeliverableActualValue(result),
    gstRegistrationStatus: scalar(extraction.agencyGstRegistrationStatus),
    gstin: scalar(extraction.agencyGstin),
    lutAvailability: scalar(extraction.agencyLutAvailability),
    taxType: scalar(extraction.invoiceTaxType),
    paymentTerms: scalar(extraction.paymentTerms),
    dueDate: scalar(extraction.dueDate),
    timeline: scalar(extraction.timeline),
    clarifications: {
      value: result.clarificationSuggestions.map((item) => item.id),
      confidence: "-",
      source: "-",
      origin: "-",
    } satisfies ActualValueWithMeta<string[]>,
  };
}

function scoreExpectationGroup(
  expected: ExtractionBenchmarkFieldExpectation,
  actual: ReturnType<typeof buildActualFieldMap>
) {
  const report: Record<string, BenchmarkFieldReport> = {};

  for (const [fieldName, expectedValue] of Object.entries(expected)) {
    if (expectedValue === undefined) {
      continue;
    }

    switch (fieldName) {
      case "deliverables":
        report[fieldName] = {
          expected: expectedValue,
          actual: actual.deliverables.value,
          status: compareDeliverables(
            expectedValue as ExtractionBenchmarkDeliverableExpectation[],
            actual.deliverables.value
          ),
          confidence: actual.deliverables.confidence,
          source: actual.deliverables.source,
          origin: actual.deliverables.origin,
        };
        break;
      case "totalAmount":
      case "rate":
        report[fieldName] = toScalarReport(
          expectedValue as number,
          actual[fieldName],
          compareNumber
        );
        break;
      default:
        report[fieldName] = toScalarReport(
          expectedValue as string,
          actual[fieldName as keyof typeof actual] as ActualValueWithMeta<
            string | undefined
          >,
          compareString
        );
        break;
    }
  }

  return report;
}

function tallyStatuses(reportGroups: Array<Record<string, BenchmarkFieldReport>>) {
  const summary = {
    correct: 0,
    partial: 0,
    missing: 0,
    incorrect: 0,
  };

  for (const group of reportGroups) {
    for (const field of Object.values(group)) {
      switch (field.status) {
        case "correct":
          summary.correct += 1;
          break;
        case "partially-correct":
          summary.partial += 1;
          break;
        case "missing":
          summary.missing += 1;
          break;
        case "incorrect":
          summary.incorrect += 1;
          break;
      }
    }
  }

  return summary;
}

function computeScore(summary: {
  correct: number;
  partial: number;
  missing: number;
  incorrect: number;
}) {
  const total =
    summary.correct + summary.partial + summary.missing + summary.incorrect;

  if (total === 0) {
    return 1;
  }

  return Number(((summary.correct + summary.partial * 0.5) / total).toFixed(3));
}

function runCase(benchmarkCase: ExtractionBenchmarkCase): BenchmarkCaseReport {
  const result = runBriefAutofill({
    currentFormData: defaultInvoiceFormData,
    input: { text: benchmarkCase.text },
  });
  const actual = buildActualFieldMap(result);
  const extracted = scoreExpectationGroup(benchmarkCase.expectedExtracted, actual);
  const inferred = scoreExpectationGroup(benchmarkCase.expectedInferred, actual);
  const clarifications: BenchmarkFieldReport = {
    expected: benchmarkCase.expectedClarifications,
    actual: actual.clarifications.value,
    status: compareClarifications(
      benchmarkCase.expectedClarifications,
      actual.clarifications.value
    ),
    confidence: actual.clarifications.confidence,
    source: actual.clarifications.source,
    origin: actual.clarifications.origin,
  };
  const tallies = tallyStatuses([extracted, inferred, { clarifications }]);

  return {
    id: benchmarkCase.id,
    title: benchmarkCase.title,
    correct: tallies.correct,
    partial: tallies.partial,
    missing: tallies.missing,
    incorrect: tallies.incorrect,
    score: computeScore(tallies),
    extracted,
    inferred,
    clarifications,
  };
}

function summarize(cases: BenchmarkCaseReport[]): BenchmarkSummary {
  const summary = cases.reduce(
    (accumulator, benchmarkCase) => {
      accumulator.correct += benchmarkCase.correct;
      accumulator.partial += benchmarkCase.partial;
      accumulator.missing += benchmarkCase.missing;
      accumulator.incorrect += benchmarkCase.incorrect;
      return accumulator;
    },
    {
      correct: 0,
      partial: 0,
      missing: 0,
      incorrect: 0,
    }
  );

  return {
    totalCases: cases.length,
    totalFields:
      summary.correct +
      summary.partial +
      summary.missing +
      summary.incorrect,
    correct: summary.correct,
    partial: summary.partial,
    missing: summary.missing,
    incorrect: summary.incorrect,
    score: computeScore(summary),
  };
}

function printHumanReport(output: BenchmarkOutput) {
  console.log("");
  console.log("Extraction benchmark summary");
  console.log("===========================");
  console.log(
    `Cases: ${output.summary.totalCases} | Fields: ${output.summary.totalFields} | ` +
      `Correct: ${output.summary.correct} | Partial: ${output.summary.partial} | ` +
      `Missing: ${output.summary.missing} | Incorrect: ${output.summary.incorrect} | ` +
      `Score: ${(output.summary.score * 100).toFixed(1)}%`
  );
  console.log(`AI available: ${output.aiAvailable ? "yes" : "no"}`);

  for (const benchmarkCase of output.cases) {
    console.log("");
    console.log(
      `${benchmarkCase.title} (${benchmarkCase.id}) -> ${(benchmarkCase.score * 100).toFixed(1)}%`
    );

    for (const [groupName, groupReport] of [
      ["Extracted", benchmarkCase.extracted],
      ["Inferred", benchmarkCase.inferred],
    ] as const) {
      const entries = Object.entries(groupReport);

      if (entries.length === 0) {
        continue;
      }

      console.log(`  ${groupName}:`);

      for (const [fieldName, fieldReport] of entries) {
        console.log(
          `    - ${fieldName}: ${fieldReport.status} | actual=${JSON.stringify(
            fieldReport.actual
          )} | confidence=${fieldReport.confidence} | source=${fieldReport.source}`
        );
      }
    }

    console.log(
      `  Clarifications: ${benchmarkCase.clarifications.status} | actual=${JSON.stringify(
        benchmarkCase.clarifications.actual
      )}`
    );
  }
}

async function maybeWriteJsonOutput(output: BenchmarkOutput) {
  const outputPathFlagIndex = process.argv.findIndex(
    (argument) => argument === "--json-output"
  );

  if (outputPathFlagIndex === -1) {
    return;
  }

  const outputPath = process.argv[outputPathFlagIndex + 1];

  if (!outputPath) {
    throw new Error("Missing path after --json-output");
  }

  const resolvedPath = path.resolve(outputPath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

async function main() {
  const caseReports = EXTRACTION_BENCHMARK_CASES.map(runCase);
  const output: BenchmarkOutput = {
    generatedAt: new Date().toISOString(),
    aiAvailable: Boolean(process.env.OPENAI_API_KEY),
    summary: summarize(caseReports),
    cases: caseReports,
  };

  await maybeWriteJsonOutput(output);
  printHumanReport(output);

  const hasFailures = caseReports.some(
    (benchmarkCase) =>
      benchmarkCase.missing > 0 || benchmarkCase.incorrect > 0
  );

  if (hasFailures) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
