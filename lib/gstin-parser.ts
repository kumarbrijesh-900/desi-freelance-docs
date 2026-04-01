import type { IndiaStateOption } from "@/lib/india-state-options";
import { getStateFromGstinCode } from "@/lib/gstin-state-map";

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export type ParsedGstin = {
  normalized: string;
  isValid: boolean;
  stateCode: string;
  state: IndiaStateOption | "";
  pan: string;
};

export function normalizeGstin(value?: string | null) {
  return (value ?? "").toUpperCase().replace(/\s+/g, "").trim();
}

export function isValidGstin(value?: string | null) {
  return GSTIN_REGEX.test(normalizeGstin(value));
}

export function getGstinStateCode(value?: string | null) {
  const normalized = normalizeGstin(value);

  if (!GSTIN_REGEX.test(normalized)) {
    return "";
  }

  return normalized.slice(0, 2);
}

export function getStateFromGstin(value?: string | null): IndiaStateOption | "" {
  return getStateFromGstinCode(getGstinStateCode(value));
}

export function derivePanFromGstin(value?: string | null) {
  const normalized = normalizeGstin(value);

  if (!GSTIN_REGEX.test(normalized)) {
    return "";
  }

  const pan = normalized.slice(2, 12);
  return PAN_REGEX.test(pan) ? pan : "";
}

export function parseGstin(value?: string | null): ParsedGstin {
  const normalized = normalizeGstin(value);
  const isValid = GSTIN_REGEX.test(normalized);
  const stateCode = isValid ? normalized.slice(0, 2) : "";
  const state = isValid ? getStateFromGstinCode(stateCode) : "";
  const pan = isValid ? derivePanFromGstin(normalized) : "";

  return {
    normalized,
    isValid,
    stateCode,
    state,
    pan,
  };
}
