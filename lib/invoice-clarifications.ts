import {
  mergeInvoiceFormData,
  type InvoiceFormData,
  type InvoiceLineItemType,
  type InvoiceRateUnit,
} from "@/types/invoice";
import type {
  BriefClarificationAction,
  BriefClarificationSuggestion,
  InvoiceBriefExtractionSchema,
  InvoiceBriefLineItemExtraction,
} from "@/lib/invoice-brief-intake";

type ClarificationContext = {
  normalizedText: string;
  extraction: InvoiceBriefExtractionSchema;
  currentFormData: InvoiceFormData;
  resolvedIds?: string[];
};

type ClarificationLineItemSeed = {
  type: InvoiceLineItemType;
  description: string;
  qty: number;
  rate: number;
  rateUnit: InvoiceRateUnit;
};

function getExtractedLineItems(extraction: InvoiceBriefExtractionSchema) {
  const explicitItems =
    extraction.lineItems && extraction.lineItems.length > 0
      ? extraction.lineItems
      : [
          {
            type: extraction.deliverableType,
            description: extraction.deliverableDescription,
            qty: extraction.qty,
            rate: extraction.rate,
            rateUnit: extraction.rateUnit,
          },
        ].filter(
          (item) =>
            item.type ||
            item.description ||
            item.qty ||
            item.rate ||
            item.rateUnit
        );

  return explicitItems;
}

function toSeed(
  item: InvoiceBriefLineItemExtraction,
  index: number
): ClarificationLineItemSeed {
  return {
    type: item.type?.value ?? "Other",
    description:
      item.description?.value ||
      item.type?.value ||
      `Deliverable ${index + 1}`,
    qty: item.qty?.value ?? 1,
    rate: item.rate?.value ?? 0,
    rateUnit: item.rateUnit?.value ?? "per-deliverable",
  };
}

function capSuggestions(suggestions: BriefClarificationSuggestion[]) {
  return suggestions
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 5);
}

function hasAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function getPaymentScheduleSnippet(text: string) {
  const patterns = [
    /\b(?:50|40|30|25|20)%\s+(?:advance|upfront|booking retainer|retainer)\b[^.\n]*/i,
    /\bbalance\s+(?:on|upon)\s+(?:delivery|completion)\b[^.\n]*/i,
    /\bnet[\s-]?(?:15|30|45|60)\b/i,
    /\bdue on receipt\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[0]) {
      return match[0].trim();
    }
  }

  return "";
}

function getDetectedForeignCurrency(
  extraction: InvoiceBriefExtractionSchema
): InvoiceFormData["client"]["clientCurrency"] {
  return extraction.clientCurrency?.value ?? "";
}

function shouldSuppressSuggestion(
  id: string,
  resolvedIds: string[] | undefined
) {
  return Boolean(resolvedIds?.includes(id));
}

export function buildBriefClarificationSuggestions(
  context: ClarificationContext
) {
  const { extraction, currentFormData, normalizedText, resolvedIds } = context;
  const suggestions: BriefClarificationSuggestion[] = [];
  const extractedItems = getExtractedLineItems(extraction);
  const lineItemSeeds = extractedItems.map(toSeed);
  const firstSeed = lineItemSeeds[0];
  const amountCandidate =
    extraction.invoiceTotalAmount?.value ??
    extraction.rate?.value ??
    firstSeed?.rate ??
    0;
  const hasHighConfidenceLocation =
    extraction.clientLocation?.confidence === "high" ||
    extraction.invoiceIsInternational?.confidence === "high";
  const locationLooksInternational =
    extraction.invoiceIsInternational?.value === true ||
    extraction.clientLocation?.value === "international" ||
    Boolean(extraction.clientCountry?.value) ||
    hasAnyPattern(normalizedText, [
      /\binternational\b/i,
      /\bforeign client\b/i,
      /\boverseas\b/i,
      /\bexport of services\b/i,
      /\bwise\b/i,
      /\bpayoneer\b/i,
      /\bswift\b/i,
    ]);
  const locationLooksDomestic =
    extraction.clientLocation?.value === "domestic" ||
    Boolean(extraction.clientState?.value) ||
    hasAnyPattern(normalizedText, [
      /\bdomestic\b/i,
      /\bindia\b/i,
      /\bgstin\b/i,
      /\bbengaluru\b/i,
      /\bbangalore\b/i,
      /\bmumbai\b/i,
      /\bdelhi\b/i,
    ]);
  const gstHintsPresent =
    Boolean(extraction.agencyGstin?.value) ||
    hasAnyPattern(normalizedText, [
      /\bgst registered\b/i,
      /\bregistered under gst\b/i,
      /\bnot gst registered\b/i,
      /\bunregistered under gst\b/i,
    ]);
  const lutHintsPresent =
    Boolean(extraction.agencyLutNumber?.value) ||
    hasAnyPattern(normalizedText, [
      /\blut\b/i,
      /\bexport of services\b/i,
      /\bwithout payment of igst\b/i,
    ]);
  const hasHighConfidenceGstStatus =
    extraction.agencyGstRegistrationStatus?.confidence === "high";
  const hasHighConfidenceLutStatus =
    extraction.agencyLutAvailability?.confidence === "high";
  const paymentScheduleSnippet = getPaymentScheduleSnippet(normalizedText);
  const detectedForeignCurrency = getDetectedForeignCurrency(extraction);
  const unclearCurrency =
    locationLooksInternational &&
    !currentFormData.client.clientCurrency &&
    !detectedForeignCurrency;
  const ambiguousAmount =
    !shouldSuppressSuggestion("amount-ambiguity", resolvedIds) &&
    firstSeed &&
    amountCandidate > 0 &&
    extractedItems.length <= 1 &&
    (Boolean(extraction.invoiceTotalAmount?.value) ||
      !extraction.rateUnit?.value);

  if (ambiguousAmount) {
    suggestions.push({
      id: "amount-ambiguity",
      title: "Confirm how to use the detected amount",
      message:
        "Is this amount the total project fee or the rate per deliverable?",
      step: "deliverables",
      priority: 1,
      options: [
        {
          id: "use-total-fee",
          label: "Total project fee",
          helper: "Keep one line item and use the amount as the full project total.",
          action: {
            kind: "use-amount-as-total-project-fee",
            amount: amountCandidate,
            description: firstSeed.description,
            type: firstSeed.type,
          },
        },
        {
          id: "use-item-rate",
          label: "Rate per deliverable",
          helper: "Use the amount as the per-item rate for the detected deliverable.",
          action: {
            kind: "use-amount-as-line-item-rate",
            amount: amountCandidate,
            rateUnit: firstSeed.rateUnit,
          },
        },
      ],
    });
  }

  if (
    !shouldSuppressSuggestion("deliverable-ambiguity", resolvedIds) &&
    extractedItems.length > 1
  ) {
    const combinedDescription = lineItemSeeds
      .map((item) => item.description)
      .join(", ");

    suggestions.push({
      id: "deliverable-ambiguity",
      title: "Confirm how to structure the deliverables",
      message:
        "Should I create separate line items for the deliverables I found?",
      step: "deliverables",
      priority: 2,
      options: [
        {
          id: "split-line-items",
          label: "Create separate line items",
          helper: "Keep each detected deliverable as its own invoice item.",
          action: {
            kind: "set-line-items",
            items: lineItemSeeds,
          },
        },
        {
          id: "combine-line-items",
          label: "Keep one combined line item",
          helper: "Group the detected deliverables into one broader project line.",
          action: {
            kind: "collapse-to-single-line-item",
            item: {
              type: firstSeed?.type ?? "Other",
              description: combinedDescription || "Project deliverables",
              qty: 1,
              rate: amountCandidate || firstSeed?.rate || 0,
              rateUnit: "per-deliverable",
            },
          },
        },
      ],
    });
  }

  if (
    !shouldSuppressSuggestion("location-ambiguity", resolvedIds) &&
    !hasHighConfidenceLocation &&
    (locationLooksInternational || locationLooksDomestic)
  ) {
    suggestions.push({
      id: "location-ambiguity",
      title: "Confirm the client location",
      message:
        "Should I treat this client as domestic or international?",
      step: "client",
      priority: 1,
      options: [
        {
          id: "treat-domestic",
          label: "Domestic",
          helper: "Keep Indian billing fields and domestic tax handling.",
          action: {
            kind: "set-client-location",
            value: "domestic",
          },
        },
        {
          id: "treat-international",
          label: "International",
          helper: "Use international client, tax, and payment context.",
          action: {
            kind: "set-client-location",
            value: "international",
          },
        },
      ],
    });
  }

  if (
    !shouldSuppressSuggestion("payment-terms-ambiguity", resolvedIds) &&
    paymentScheduleSnippet &&
    (!extraction.paymentTerms || extraction.paymentTerms.confidence !== "high")
  ) {
    suggestions.push({
      id: "payment-terms-ambiguity",
      title: "Confirm how to use the payment schedule",
      message:
        "This brief includes payment schedule language. Should I use it as payment terms or keep it in payment notes?",
      step: "payment",
      priority: 3,
      options: [
        {
          id: "use-as-payment-terms",
          label: "Use as payment terms",
          helper: paymentScheduleSnippet,
          action: {
            kind: "set-payment-terms",
            value: paymentScheduleSnippet,
          },
        },
        {
          id: "put-in-notes",
          label: "Put in payment notes",
          helper: "Keep the wording, but store it in the payment notes area instead.",
          action: {
            kind: "append-payment-note",
            value: paymentScheduleSnippet,
          },
        },
      ],
    });
  }

  if (
    !shouldSuppressSuggestion("gst-compliance-ambiguity", resolvedIds) &&
    gstHintsPresent &&
    !hasHighConfidenceGstStatus
  ) {
    suggestions.push({
      id: "gst-compliance-ambiguity",
      title: "Confirm agency GST registration",
      message:
        "The brief contains GST-related signals. Should the agency be marked GST registered?",
      step: "agency",
      priority: 2,
      options: [
        {
          id: "gst-registered",
          label: "Mark as GST registered",
          action: {
            kind: "set-agency-gst-registration",
            value: "registered",
          },
        },
        {
          id: "gst-not-registered",
          label: "Mark as not registered",
          action: {
            kind: "set-agency-gst-registration",
            value: "not-registered",
          },
        },
      ],
    });
  }

  if (
    !shouldSuppressSuggestion("lut-ambiguity", resolvedIds) &&
    lutHintsPresent &&
    (currentFormData.agency.gstRegistrationStatus === "registered" ||
      extraction.agencyGstRegistrationStatus?.value === "registered" ||
      Boolean(extraction.agencyGstin?.value)) &&
    !hasHighConfidenceLutStatus
  ) {
    suggestions.push({
      id: "lut-ambiguity",
      title: "Confirm LUT availability",
      message:
        "Export/LUT signals were detected. Should LUT be marked available for this invoice?",
      step: "agency",
      priority: 3,
      options: [
        {
          id: "lut-yes",
          label: "LUT available",
          action: {
            kind: "set-agency-lut-availability",
            value: "yes",
          },
        },
        {
          id: "lut-no",
          label: "No valid LUT",
          action: {
            kind: "set-agency-lut-availability",
            value: "no",
          },
        },
      ],
    });
  }

  if (
    !shouldSuppressSuggestion("currency-ambiguity", resolvedIds) &&
    (detectedForeignCurrency || unclearCurrency)
  ) {
    const switchLabel = detectedForeignCurrency
      ? `Use ${detectedForeignCurrency}`
      : "Leave foreign currency unset";

    suggestions.push({
      id: "currency-ambiguity",
      title: "Confirm the invoice currency",
      message:
        "Foreign billing signals were found. Should I keep INR or switch to a foreign currency?",
      step: "client",
      priority: 4,
      options: [
        {
          id: "keep-inr",
          label: "Keep INR",
          helper: "Use INR as the working invoice currency for now.",
          action: {
            kind: "set-client-currency",
            value: "",
          },
        },
        {
          id: "use-foreign-currency",
          label: switchLabel,
          helper: detectedForeignCurrency
            ? `Set the invoice currency to ${detectedForeignCurrency}.`
            : "Keep the client international, but leave the currency undecided for now.",
          action: {
            kind: "set-client-currency",
            value: detectedForeignCurrency,
          },
        },
      ],
    });
  }

  return capSuggestions(suggestions).filter(
    (suggestion) => !shouldSuppressSuggestion(suggestion.id, resolvedIds)
  );
}

function appendUniqueNote(currentNotes: string, note: string) {
  const trimmedNote = note.trim();

  if (!trimmedNote) {
    return currentNotes;
  }

  if (currentNotes.includes(trimmedNote)) {
    return currentNotes;
  }

  return currentNotes.trim()
    ? `${currentNotes.trim()}\n${trimmedNote}`
    : trimmedNote;
}

export function applyBriefClarificationAction(params: {
  formData: InvoiceFormData;
  action: BriefClarificationAction;
}) {
  const nextFormData = mergeInvoiceFormData(params.formData);
  const ensureLineItem = () => {
    if (!nextFormData.lineItems.length) {
      nextFormData.lineItems = mergeInvoiceFormData().lineItems;
    }

    return nextFormData.lineItems[0];
  };

  switch (params.action.kind) {
    case "set-client-location":
      nextFormData.client.clientLocation = params.action.value;
      if (params.action.value === "domestic") {
        nextFormData.client.clientCountry = "";
        nextFormData.client.clientCurrency = "";
      }
      return nextFormData;

    case "set-client-currency":
      nextFormData.client.clientCurrency = params.action.value;
      if (params.action.value) {
        nextFormData.client.clientLocation = "international";
      }
      return nextFormData;

    case "set-agency-gst-registration":
      nextFormData.agency.gstRegistrationStatus = params.action.value;
      return nextFormData;

    case "set-agency-lut-availability":
      nextFormData.agency.lutAvailability = params.action.value;
      return nextFormData;

    case "set-payment-terms":
      nextFormData.meta.paymentTerms = params.action.value;
      return nextFormData;

    case "append-payment-note":
      nextFormData.payment.notes = appendUniqueNote(
        nextFormData.payment.notes,
        params.action.value
      );
      return nextFormData;

    case "use-amount-as-total-project-fee": {
      nextFormData.lineItems = [
        {
          id: nextFormData.lineItems[0]?.id ?? "line-1",
          type: params.action.type,
          description: params.action.description,
          qty: 1,
          rate: params.action.amount,
          rateUnit: "per-deliverable",
        },
      ];
      return nextFormData;
    }

    case "use-amount-as-line-item-rate": {
      const lineItem = ensureLineItem();
      lineItem.rate = params.action.amount;
      lineItem.rateUnit = params.action.rateUnit;
      return nextFormData;
    }

    case "set-line-items":
      nextFormData.lineItems = params.action.items.map((item, index) => ({
        id: nextFormData.lineItems[index]?.id ?? `brief-line-${index + 1}`,
        ...item,
      }));
      return nextFormData;

    case "collapse-to-single-line-item":
      nextFormData.lineItems = [
        {
          id: nextFormData.lineItems[0]?.id ?? "line-1",
          ...params.action.item,
        },
      ];
      return nextFormData;
  }
}
