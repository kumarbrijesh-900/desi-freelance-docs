import type { InvoiceLineItemType, InvoiceRateUnit } from "@/types/invoice";

const canonicalInvoiceLineItemCatalog = [
  {
    type: "Logo Design",
    aliases: [],
    defaultSacCode: "998391",
    defaultUnit: "per-deliverable",
    allowedUnits: [
      "per-deliverable",
      "per-concept",
      "per-item",
    ],
    placeholder: "Logo design with final brand files",
    suggestions: [
      "Logo Design - 3 concepts + final files (AI, EPS, PNG, SVG)",
      "Minimalist logo design for startup / tech brand",
      "Vintage / Retro logo design with full variations",
      "Abstract / Modern logo design with brand mark",
      "Logo redesign / refresh project including usage guidelines",
      "Wordmark logo design + tagline integration",
      "Icon-based logo design + complete brand mark suite",
      "Luxury / Premium brand logo design with variations",
      "AI-generated logo concepts + human refinement & finalisation",
      "Logo design with full brand application mockups",
    ],
  },
  {
    type: "Branding & Identity",
    aliases: [],
    defaultSacCode: "998391",
    defaultUnit: "per-deliverable",
    allowedUnits: [
      "per-deliverable",
      "per-day",
      "per-hour",
      "per-item",
    ],
    placeholder: "Complete brand identity system",
    suggestions: [
      "Complete Brand Identity System (logo + full guidelines)",
      "Full Brand Style Guide creation (colours, typography, voice)",
      "Brand collateral kit (business cards, letterhead, envelope)",
      "Brand book / Brand bible (20+ pages)",
      "Complete rebranding project including competitor research",
      "Brand voice & tone guidelines + messaging framework",
      "Brand launch kit (social assets + stationery + digital templates)",
      "Corporate brand identity for SME / startup",
      "AI-assisted brand personality analysis + visual identity creation",
      "Premium luxury brand identity system with application assets",
    ],
  },
  {
    type: "Graphic Design",
    aliases: [],
    defaultSacCode: "998391",
    defaultUnit: "per-item",
    allowedUnits: [
      "per-item",
      "per-deliverable",
      "per-day",
      "per-hour",
    ],
    placeholder: "Campaign graphics and marketing assets",
    suggestions: [
      "Social media graphics pack (10 posts + stories + captions)",
      "Banner / Poster design for marketing campaign",
      "Brochure / Flyer design (single or tri-fold)",
      "Digital ad creatives for Google / Meta ads",
      "Infographic design with data visualisation",
      "Event poster / Invitation design",
      "Product catalog / Lookbook design",
      "Presentation slides (10-15 slides with custom graphics)",
      "AI-powered graphic asset generation + custom refinement",
      "Custom illustration-based graphic assets for branding",
    ],
  },
  {
    type: "Illustration",
    aliases: [],
    defaultSacCode: "999632",
    defaultUnit: "per-item",
    allowedUnits: [
      "per-item",
      "per-deliverable",
      "per-concept",
    ],
    placeholder: "Custom illustration package",
    suggestions: [
      "Custom character illustration (set of 5)",
      "Digital illustration for social media / blog / website",
      "Book cover illustration with full layout integration",
      "Editorial / Magazine illustration",
      "Merchandise illustration (T-shirt, packaging, mug)",
      "Children's book illustration (full spread)",
      "Technical / Explainer illustration",
      "Fantasy / Concept art illustration",
      "AI-assisted illustration concepts + detailed hand refinement",
      "Icon set illustration (20 icons with usage guide)",
    ],
  },
  {
    type: "UI/UX Design",
    aliases: ["UI/UX"],
    defaultSacCode: "998391",
    defaultUnit: "per-screen",
    allowedUnits: [
      "per-screen",
      "per-hour",
      "per-day",
      "per-deliverable",
    ],
    placeholder: "Product UI/UX design work",
    suggestions: [
      "Landing page UI design (desktop + mobile responsive)",
      "Mobile app UI/UX design (full screen flows)",
      "Web app dashboard UI design + user flow mapping",
      "E-commerce website UI design with checkout optimisation",
      "User research + competitor analysis + heuristic evaluation",
      "Wireframes + high-fidelity UI kit creation",
      "SaaS product UI/UX redesign with usability testing",
      "User onboarding flow design + micro-interaction prototypes",
      "AI-powered UX research summary + automated wireframe suggestions",
      "Complete website UI redesign with accessibility audit & report",
    ],
  },
  {
    type: "Software Development",
    aliases: ["Development", "Coding"],
    defaultSacCode: "998314",
    defaultUnit: "per-hour",
    allowedUnits: ["per-hour", "per-day", "per-deliverable", "per-item"],
    placeholder: "Full-stack / Frontend / Backend development",
    suggestions: [
      "Custom web application development (Next.js / React)",
      "Mobile app development (React Native / Expo)",
      "API integration and backend development",
      "Database schema design and optimization",
      "Cloud infrastructure setup and deployment",
      "Bug fixing and maintenance support",
      "Legacy code refactoring and modernization",
      "E-commerce platform customization",
    ],
  },
  {
    type: "Animation/Video",
    aliases: ["Video", "Animation"],
    defaultSacCode: "998313",
    defaultUnit: "per-video",
    allowedUnits: ["per-video", "per-hour", "per-day", "per-deliverable"],
    placeholder: "Animation or video production",
    suggestions: [
      "Professional video editing and color grading",
      "2D/3D animation for product explainer",
      "Motion graphics for brand launch",
      "Social media reel / TikTok content production",
      "YouTube video editing with motion assets",
      "Corporate presentation video production",
    ],
  },
  {
    type: "Consulting",
    aliases: ["Strategy", "Advisory"],
    defaultSacCode: "998319",
    defaultUnit: "per-hour",
    allowedUnits: ["per-hour", "per-day", "per-deliverable"],
    placeholder: "Strategic consulting and advisory",
    suggestions: [
      "Digital transformation strategy consulting",
      "Product roadmap and feature planning",
      "UX strategy and user journey mapping",
      "Tech stack advisory and architecture review",
      "Business process optimization consulting",
    ],
  },
  {
    type: "Animation",
    aliases: [],
    defaultSacCode: "999612",
    defaultUnit: "per-video",
    allowedUnits: [
      "per-video",
      "per-hour",
      "per-day",
      "per-deliverable",
    ],
    placeholder: "Animation project with motion deliverables",
    suggestions: [
      "2D Explainer video animation (30-60 sec)",
      "3D product animation with realistic rendering",
      "Animated logo reveal + brand intro",
      "Motion graphics intro / outro for videos",
      "Social media reel animation (vertical format)",
      "Whiteboard animation video",
      "Character animation (short clip)",
      "Infographic animation with data motion",
      "AI-generated animation keyframes + manual polishing",
      "Full explainer video animation with voice-over sync",
    ],
  },
  {
    type: "Motion Graphics",
    aliases: [],
    defaultSacCode: "999612",
    defaultUnit: "per-video",
    allowedUnits: [
      "per-video",
      "per-hour",
      "per-day",
      "per-deliverable",
    ],
    placeholder: "Motion graphics package",
    suggestions: [
      "Kinetic typography motion graphics",
      "Title sequence / lower third animation",
      "Brand reveal motion graphics",
      "Data visualisation motion graphics",
      "Social media story animations",
      "YouTube intro / outro animation",
      "Product explainer motion graphics",
      "Event highlight reel motion graphics",
      "AI-assisted motion graphics generation + custom timing",
      "Abstract background motion graphics pack for video",
    ],
  },
  {
    type: "Photography",
    aliases: [],
    defaultSacCode: "998387",
    defaultUnit: "per-image",
    allowedUnits: ["per-image", "per-hour", "per-day", "per-deliverable"],
    placeholder: "Photography shoot with edited selects",
    suggestions: [
      "Product photography shoot (10-15 high-res images)",
      "Commercial / Studio photography session",
      "Fashion / Lookbook photography",
      "Food photography (menu items + styling)",
      "Corporate headshots / Team photography",
      "Event photography full coverage",
      "Real estate / Interior photography",
      "E-commerce product photography pack",
      "AI-enhanced photo retouching + background removal batch",
      "Lifestyle brand photography with on-location shoot",
    ],
  },
  {
    type: "Videography",
    aliases: [],
    defaultSacCode: "998387",
    defaultUnit: "per-video",
    allowedUnits: ["per-video", "per-day", "per-hour", "per-deliverable"],
    placeholder: "Videography shoot and footage capture",
    suggestions: [
      "Corporate video shoot (1-2 days coverage)",
      "Product demo / Explainer video shoot",
      "Event videography full coverage",
      "Short promotional video (30-60 sec)",
      "Interview / Testimonial video shoot",
      "Drone videography for property / event",
      "Brand story video shoot",
      "Behind-the-scenes videography",
      "Fashion / Lookbook video shoot",
      "AI-powered video shot planning + script-to-shot suggestions",
    ],
  },
  {
    type: "Video Editing",
    aliases: [],
    defaultSacCode: "999613",
    defaultUnit: "per-video",
    allowedUnits: [
      "per-video",
      "per-hour",
      "per-day",
      "per-deliverable",
    ],
    placeholder: "Edited video deliverables",
    suggestions: [
      "YouTube video editing (full long-form video)",
      "Reels / Shorts editing pack (10 videos)",
      "Corporate video editing + motion graphics integration",
      "Podcast video editing with subtitles",
      "Wedding / Event highlight reel editing",
      "Explainer video editing + voice-over sync",
      "Social media video editing (monthly retainer)",
      "Interview video editing + colour grading",
      "Product video editing with animations",
      "AI-assisted video editing (auto-cut + caption generation)",
    ],
  },
  {
    type: "Social Media Content",
    aliases: ["Social Media"],
    defaultSacCode: "998361",
    defaultUnit: "per-post",
    allowedUnits: [
      "per-post",
      "per-item",
      "per-deliverable",
      "per-video",
    ],
    placeholder: "Social content package",
    suggestions: [
      "Instagram / LinkedIn carousel design + copy",
      "Monthly social media content pack (30 posts)",
      "Reels / Shorts content creation (10 videos)",
      "Social media story templates (15 designs)",
      "Brand social media kit (templates + captions)",
      "Influencer collaboration content pack",
      "Product launch social campaign (visuals + copy)",
      "Educational / Tips carousel series",
      "Seasonal / Festive social content",
      "AI-generated social media content ideas + visual mockups",
    ],
  },
  {
    type: "Packaging Design",
    aliases: [],
    defaultSacCode: "998391",
    defaultUnit: "per-item",
    allowedUnits: [
      "per-item",
      "per-deliverable",
      "per-concept",
    ],
    placeholder: "Packaging system and print-ready files",
    suggestions: [
      "Product packaging design (box + label + insert)",
      "Eco-friendly / Sustainable packaging design",
      "Cosmetic / Skincare packaging system",
      "Food & Beverage packaging with nutritional info",
      "E-commerce shipping packaging + unboxing experience",
      "Luxury gift box packaging design",
      "Label & sticker design for product range",
      "Full product range packaging system",
      "Retail shelf packaging design",
      "AI-optimised packaging mockup generation + print-ready files",
    ],
  },
  {
    type: "Print Design",
    aliases: [],
    defaultSacCode: "998391",
    defaultUnit: "per-item",
    allowedUnits: ["per-item", "per-deliverable", "per-day", ],
    placeholder: "Print-ready design assets",
    suggestions: [
      "Brochure / Catalog print design (ready for press)",
      "Business card + stationery set",
      "Poster / Hoarding print design",
      "Magazine / Book interior layout design",
      "Menu card / Restaurant print materials",
      "Annual report print design",
      "Event banner / Backdrop design",
      "Packaging print files (with bleed & crop marks)",
      "Flyer / Leaflet print design",
      "AI-assisted print layout suggestions + pre-press checks",
    ],
  },
  {
    type: "Infographics & Presentation Design",
    aliases: [],
    defaultSacCode: "998391",
    defaultUnit: "per-item",
    allowedUnits: ["per-item", "per-deliverable", "per-day", "per-hour"],
    placeholder: "Infographic or presentation design package",
    suggestions: [
      "Infographic design (single or multi-page)",
      "Pitch deck presentation (10-15 slides)",
      "Data visualisation infographic with charts",
      "Annual report infographic set",
      "Social media infographic series",
      "E-book / Whitepaper infographic design",
      "Investor pitch deck design + narrative flow",
      "Training / Workshop presentation",
      "Product feature infographic",
      "AI-powered data-to-infographic conversion + design",
    ],
  },
  {
    type: "Other",
    aliases: [],
    defaultSacCode: "",
    defaultUnit: "per-deliverable",
    allowedUnits: ["per-deliverable", "per-item", "per-hour", "per-day"],
    placeholder: "Describe the deliverable",
    suggestions: [
      "Retainer / Monthly creative services (X hours)",
      "One-time consultation / Strategy session",
      "Rush / Express delivery project",
      "File conversion / Optimisation service",
      "Asset library creation & organisation",
      "Template customisation & handover",
      "Bulk design batch processing",
      "Creative direction & art direction",
      "AI workflow setup + training session for client",
      "Miscellaneous creative work (please describe)",
    ],
  },
  {
    type: "Architecture & Interior Design" as InvoiceLineItemType,
    aliases: ["Architecture", "Interior Design"],
    defaultSacCode: "998321",
    defaultUnit: "lump-sum" as InvoiceRateUnit,
    allowedUnits: [
      "per-sqft",
      "per-drawing",
      "per-floor",
      "lump-sum",
      "per-hour",
      "per-day",
      "per-room",
      "per-site",
      "per-visit",
    ] as InvoiceRateUnit[],
    placeholder: "Select a sub-type to see suggestions",
    suggestions: [],
    hasSubTypes: true,
    subTypes: [
      {
        key: "residential",
        label: "Architectural Design (Residential)",
        sacCode: "998322",
        units: ["per-sqft", "per-drawing", "per-floor", "lump-sum", "per-hour", "per-day"],
        descriptions: [
          "Residential floor plans and layout design",
          "Elevation and section drawings",
          "3D visualization and walkthrough rendering",
          "Structural coordination drawings",
          "Municipal approval drawings and documentation",
          "Construction supervision and site visits",
          "As-built documentation",
          "Vastu consultation and compliance review"
        ]
      },
      {
        key: "commercial",
        label: "Architectural Design (Commercial)",
        sacCode: "998323",
        units: ["per-sqft", "per-drawing", "per-floor", "lump-sum", "per-hour", "per-day"],
        descriptions: [
          "Commercial building floor plans and layout",
          "Office space planning and design",
          "Retail store layout and facade design",
          "Hospitality interior and exterior design",
          "Building elevation and section drawings",
          "MEP coordination drawings",
          "Fire safety and compliance documentation",
          "Construction supervision"
        ]
      },
      {
        key: "interior",
        label: "Interior Design",
        sacCode: "998312",
        units: ["per-room", "per-sqft", "per-floor", "lump-sum", "per-hour", "per-day"],
        descriptions: [
          "Interior space planning and furniture layout",
          "Material selection and specification schedule",
          "Kitchen and bathroom design",
          "Lighting design and electrical layout",
          "3D visualization and walkthrough rendering",
          "Furniture and fixture procurement coordination",
          "Turnkey interior execution (design to handover)",
          "Color scheme and finish palette selection",
          "Custom furniture and joinery design",
          "Window treatment and soft furnishing design"
        ]
      },
      {
        key: "landscape",
        label: "Landscape Design",
        sacCode: "998328",
        units: ["per-sqft", "per-site", "lump-sum", "per-hour", "per-day"],
        descriptions: [
          "Landscape master plan and planting design",
          "Garden design and hardscape layout",
          "Outdoor lighting and irrigation design",
          "Terrace and rooftop garden design",
          "Pool and water feature design",
          "Site grading and drainage plan"
        ]
      },
      {
        key: "site_planning",
        label: "Site Planning",
        sacCode: "998327",
        units: ["per-sqft", "per-site", "lump-sum", "per-hour", "per-day"],
        descriptions: [
          "Project site master planning",
          "Site analysis and feasibility study",
          "Zoning compliance and setback planning",
          "Access road and parking layout",
          "Infrastructure and utility mapping",
          "Environmental impact documentation"
        ]
      },
      {
        key: "consultation",
        label: "Architectural Consultation",
        sacCode: "998321",
        units: ["per-hour", "per-day", "per-visit", "lump-sum"],
        descriptions: [
          "Architectural advisory and design review",
          "Feasibility study and project assessment",
          "Vastu compliance consultation",
          "Building code and regulation advisory",
          "Project cost estimation and budgeting",
          "Second opinion on existing designs",
          "Heritage and consultation advisory"
        ]
      }
    ]
  },
] as const;

type InvoiceLineItemCatalogEntry =
  (typeof canonicalInvoiceLineItemCatalog)[number];
type CanonicalInvoiceLineItemType = InvoiceLineItemCatalogEntry["type"];
type LegacyInvoiceLineItemType = InvoiceLineItemCatalogEntry["aliases"][number];

const invoiceLineItemCatalogByCanonicalType = new Map<
  CanonicalInvoiceLineItemType,
  InvoiceLineItemCatalogEntry
>(canonicalInvoiceLineItemCatalog.map((entry) => [entry.type, entry]));

const invoiceLineItemAliasMap = new Map<string, CanonicalInvoiceLineItemType>();

for (const entry of canonicalInvoiceLineItemCatalog) {
  invoiceLineItemAliasMap.set(entry.type, entry.type);
  for (const alias of entry.aliases) {
    invoiceLineItemAliasMap.set(alias, entry.type);
  }
}

export type KnownInvoiceLineItemType =
  | CanonicalInvoiceLineItemType
  | LegacyInvoiceLineItemType;

export function normalizeInvoiceLineItemType(
  value: string | null | undefined,
): CanonicalInvoiceLineItemType | undefined {
  if (!value) return undefined;
  return invoiceLineItemAliasMap.get(value);
}

export function getInvoiceLineItemCatalogEntry(
  value: string | null | undefined,
) {
  const normalized = normalizeInvoiceLineItemType(value);

  if (!normalized) {
    return undefined;
  }

  return invoiceLineItemCatalogByCanonicalType.get(normalized);
}

export const invoiceCanonicalLineItemTypeOptions =
  canonicalInvoiceLineItemCatalog.map((entry) => entry.type);
