/**
 * ─── Amount in Words (Indian Format) ──────────────────
 *
 * Converts a number to Indian English words for invoices.
 * e.g. 3000 → "Rupees Three Thousand Only"
 *      1545.50 → "Rupees One Thousand Five Hundred Forty Five and Fifty Paise Only"
 *
 * Follows the Indian numbering system (lakhs/crores).
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? " " + ONES[o] : "");
}

function threeDigitWords(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(ONES[h] + " Hundred");
  if (rest) parts.push(twoDigitWords(rest));
  return parts.join(" ");
}

/**
 * Convert an integer to Indian English words.
 * Uses the Indian system: crore, lakh, thousand, hundred.
 */
function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + integerToWords(-n);

  const parts: string[] = [];

  // Crores (1,00,00,000+)
  const crores = Math.floor(n / 10000000);
  if (crores) {
    parts.push(threeDigitWords(crores) + " Crore");
    n %= 10000000;
  }

  // Lakhs (1,00,000 - 99,99,999)
  const lakhs = Math.floor(n / 100000);
  if (lakhs) {
    parts.push(twoDigitWords(lakhs) + " Lakh");
    n %= 100000;
  }

  // Thousands (1,000 - 99,999)
  const thousands = Math.floor(n / 1000);
  if (thousands) {
    parts.push(twoDigitWords(thousands) + " Thousand");
    n %= 1000;
  }

  // Hundreds + remainder
  if (n > 0) {
    parts.push(threeDigitWords(n));
  }

  return parts.join(" ");
}

/**
 * Convert a rupee amount to Indian invoice format.
 * @param amount - The amount in rupees (can include paise)
 * @param currency - Currency code (default "INR")
 * @returns e.g. "Rupees Three Thousand Only" or "Rupees One Thousand Five Hundred and Fifty Paise Only"
 */
export function amountToWords(amount: number, currency = "INR"): string {
  if (amount === 0) return currencyPrefix(currency) + "Zero Only";

  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);

  const parts: string[] = [];
  const prefix = currencyPrefix(currency);

  if (rupees > 0) {
    parts.push(prefix + integerToWords(rupees));
  }

  if (paise > 0) {
    if (rupees > 0) parts.push("and");
    parts.push(twoDigitWords(paise) + " Paise");
  }

  if (parts.length === 0) {
    parts.push(prefix + "Zero");
  }

  return parts.join(" ") + " Only";
}

function currencyPrefix(currency: string): string {
  switch (currency) {
    case "INR":
      return "Rupees ";
    case "USD":
      return "US Dollars ";
    case "GBP":
      return "Pounds Sterling ";
    case "EUR":
      return "Euros ";
    default:
      return currency + " ";
  }
}
