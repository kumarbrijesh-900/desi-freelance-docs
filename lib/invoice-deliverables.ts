import type {
  InvoiceLineItemType,
  InvoiceRateUnit,
} from "@/types/invoice";

export const invoiceLineItemTypeOptions: InvoiceLineItemType[] = [
  "Logo Design",
  "UI/UX",
  "Illustration",
  "Photography",
  "Video Editing",
  "Social Media",
  "Other",
];

export const invoiceRateUnitLabels: Record<InvoiceRateUnit, string> = {
  "per-deliverable": "Per deliverable",
  "per-item": "Per item",
  "per-screen": "Per screen",
  "per-hour": "Per hour",
  "per-day": "Per day",
  "per-revision": "Per revision",
  "per-concept": "Per concept",
  "per-post": "Per post",
  "per-video": "Per video",
  "per-image": "Per image",
};

export const invoiceAllowedUnitsByType: Record<
  InvoiceLineItemType,
  InvoiceRateUnit[]
> = {
  "Logo Design": [
    "per-deliverable",
    "per-concept",
    "per-revision",
    "per-item",
  ],
  "UI/UX": [
    "per-screen",
    "per-hour",
    "per-day",
    "per-deliverable",
    "per-revision",
  ],
  Illustration: [
    "per-item",
    "per-deliverable",
    "per-revision",
    "per-concept",
  ],
  Photography: [
    "per-image",
    "per-hour",
    "per-day",
    "per-deliverable",
  ],
  "Video Editing": [
    "per-video",
    "per-hour",
    "per-day",
    "per-deliverable",
    "per-revision",
  ],
  "Social Media": [
    "per-post",
    "per-item",
    "per-deliverable",
    "per-revision",
  ],
  Other: ["per-deliverable", "per-item", "per-hour", "per-day"],
};

export const invoiceDefaultUnitByType: Record<
  InvoiceLineItemType,
  InvoiceRateUnit
> = {
  "Logo Design": "per-deliverable",
  "UI/UX": "per-screen",
  Illustration: "per-item",
  Photography: "per-image",
  "Video Editing": "per-video",
  "Social Media": "per-post",
  Other: "per-deliverable",
};

export const invoiceDescriptionPlaceholderByType: Record<
  InvoiceLineItemType,
  string
> = {
  "Logo Design": "Primary logo design",
  "UI/UX": "Landing page UI design",
  Illustration: "Editorial illustration set",
  Photography: "Product photography set",
  "Video Editing": "Short-form video edit pack",
  "Social Media": "Social media creative set",
  Other: "Describe the deliverable",
};

export const invoiceDescriptionSuggestionsByType: Record<
  InvoiceLineItemType,
  string[]
> = {
  "Logo Design": [
    "Logo design - 3 concepts + final files",
    "Wordmark and icon lockup design",
    "Logo refresh with usage guidelines",
    "Brand mark suite for website and socials",
    "Premium logo system with monochrome variations",
  ],
  "UI/UX": [
    "Landing page UI design (desktop + mobile)",
    "Responsive website wireframes and high-fidelity screens",
    "Product dashboard UX redesign",
    "User flow mapping and clickable prototype",
    "SaaS onboarding experience redesign",
  ],
  Illustration: [
    "Editorial illustration set",
    "Custom icon and illustration pack",
    "Character illustration set",
    "Book cover illustration with layout support",
    "Marketing illustration assets for campaign launch",
  ],
  Photography: [
    "Product photography set with retouched selects",
    "E-commerce product photo batch",
    "Lifestyle brand shoot with edited deliverables",
    "Event photography coverage",
    "Brand photography with web-ready exports",
  ],
  "Video Editing": [
    "Short-form video edit pack",
    "YouTube long-form video edit",
    "Podcast video edit with captions",
    "Launch reel with motion titles",
    "Event highlight reel edit",
  ],
  "Social Media": [
    "Monthly social media creative pack",
    "Carousel design + caption support",
    "Short-form reels package",
    "Campaign social asset set",
    "Story template pack",
  ],
  Other: [
    "Creative retainer / monthly services",
    "Consulting or strategy session",
    "Asset handover and packaging",
    "Production support and coordination",
    "Custom creative service - describe scope",
  ],
};

export function getInvoiceDescriptionSuggestions(
  type: InvoiceLineItemType,
  query = "",
  limit = 4
) {
  const suggestions = invoiceDescriptionSuggestionsByType[type] ?? [];
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return suggestions.slice(0, limit);
  }

  return suggestions
    .filter((suggestion) =>
      suggestion.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, limit);
}
