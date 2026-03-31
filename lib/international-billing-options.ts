export const INTERNATIONAL_COUNTRY_OPTIONS = [
  "Argentina",
  "Australia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Canada",
  "China",
  "Colombia",
  "Czech Republic",
  "Denmark",
  "Egypt",
  "Finland",
  "France",
  "Germany",
  "Hong Kong",
  "Hungary",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Kenya",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
] as const;

export const INTERNATIONAL_CURRENCY_OPTIONS = [
  { code: "USD", label: "US Dollar (USD)", symbol: "$" },
  { code: "EUR", label: "Euro (EUR)", symbol: "EUR" },
  { code: "GBP", label: "British Pound (GBP)", symbol: "GBP" },
  { code: "AED", label: "UAE Dirham (AED)", symbol: "AED" },
  { code: "AUD", label: "Australian Dollar (AUD)", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar (CAD)", symbol: "C$" },
  { code: "SGD", label: "Singapore Dollar (SGD)", symbol: "S$" },
] as const;

export type InternationalCountryOption =
  (typeof INTERNATIONAL_COUNTRY_OPTIONS)[number];

export type InternationalCurrencyCode =
  (typeof INTERNATIONAL_CURRENCY_OPTIONS)[number]["code"];

export type InvoiceDisplayCurrency = InternationalCurrencyCode | "INR";

const INR_TO_USD_REFERENCE_RATE = 83;

export function getInvoiceDisplayCurrency(params: {
  clientLocation: "domestic" | "international";
  clientCurrency: InternationalCurrencyCode | "";
}): InvoiceDisplayCurrency {
  if (params.clientLocation === "international" && params.clientCurrency) {
    return params.clientCurrency;
  }

  return "INR";
}

export function getCurrencySymbol(
  currency: InvoiceDisplayCurrency | ""
): string {
  if (!currency || currency === "INR") {
    return "₹";
  }

  return (
    INTERNATIONAL_CURRENCY_OPTIONS.find((option) => option.code === currency)
      ?.symbol ?? currency
  );
}

export function convertInrToApproximateUsd(amount: number): number {
  return amount / INR_TO_USD_REFERENCE_RATE;
}
