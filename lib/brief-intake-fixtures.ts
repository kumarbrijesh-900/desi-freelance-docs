export type BriefIntakeFixture = {
  id: string;
  title: string;
  text: string;
};

export const BRIEF_INTAKE_FIXTURES: BriefIntakeFixture[] = [
  {
    id: "domestic-gst-case",
    title: "Domestic GST Case",
    text: `Agency name: DesiFreelanceDocs Studio
Agency address: Residency Road, Bengaluru, Karnataka
GST registered
Agency GSTIN: 29ABCDE1234F1Z5
Client name: Metro Shoes Pvt. Ltd.
Client address: Whitefield, Bengaluru, Karnataka 560048
Deliverable: Landing page UI design
3 screens at 15k per screen
Payment terms: Net 15
Bank transfer only`,
  },
  {
    id: "international-usd-case",
    title: "International USD Case",
    text: `Please create invoice for Nike USA.
We are DesiFreelanceDocs Studio, Bengaluru.
GST registered, export of services, LUT available.
Did editorial illustration set, 5 items at $500 each.
Pay via Wise in USD.
Due on receipt.`,
  },
  {
    id: "mixed-deliverables-case",
    title: "Mixed Deliverables Case",
    text: `Invoice for Acme Labs.
40 images + 5 reels for campaign launch.
Use USD.
Payment via Payoneer.`,
  },
  {
    id: "structured-brief",
    title: "Clean Structured Brief",
    text: `Agency name: DesiFreelanceDocs Studio
Agency address: 14 Residency Road, Bengaluru, Karnataka 560025
GST registration: registered
Agency GSTIN: 29ABCDE1234F1Z5
PAN: ABCDE1234F
Client location: Domestic
Client name: Metro Shoes Pvt. Ltd.
Client address: Phoenix Marketcity, Whitefield Main Road, Bengaluru 560048
Client state: Karnataka
Client GSTIN: 29AAACM8899L1Z2
Deliverable type: UI/UX
Deliverable description: Landing page UI design
Qty: 3
Rate: INR 12000 per screen
License type: exclusive license
License duration: 3 years
Payment terms: Net 15
Account name: DesiFreelanceDocs Studio
Bank name: HDFC Bank
Account number: 50200044321098
IFSC: HDFC0001122`,
  },
  {
    id: "messy-chat-brief",
    title: "Messy Chat Brief",
    text: `hey need invoice for metro shoes. we're desi freelance docs studio, residency road bangalore karnataka.
client acme was old one ignore that, this one is for metro shoes in bangalore.
did 3 landing page screens, charge 12k per screen, net 15.
gst registered. account name desi freelance docs studio. hdfc bank acc 50200044321098 ifsc hdfc0001122`,
  },
  {
    id: "ocr-noisy-brief",
    title: "OCR Noisy Brief",
    text: `AGENCY N4ME DesiFreelanceDocs Studi0
Addre55: 14 Re5idency R0ad, BengalurU, Karnataka 560025
GST reg15tered under GST
GSTIN 29ABCDE1234F1Z5 PAN ABCDE1234F
CLIENT N4ME: Metr0 Sh0es Pvt Ltd
Bill t0 addre55: Phoenix Marketcity Whitefield Main Road Bengaluru 560048
3 screen5 landing page ui design @ 12k per screen
term5 net15
Bank Name HDFC Bank
Acc0unt number 50200044321098
IFSC HDFC0001122`,
  },
  {
    id: "international-brief",
    title: "International Brief",
    text: `Agency name: DesiFreelanceDocs Studio
Agency address: 14 Residency Road, Bengaluru, Karnataka 560025
Registered under GST
Agency GSTIN: 29ABCDE1234F1Z5
LUT yes
LUT number / ARN: LUT-2025-7788
Client location: International
Bill to Acme Labs LLC
Country: United States
Currency: USD
Client tax id: US-TAX-7781
Deliverable: Editorial illustration set
Qty: 5 items
Rate: $500 per item
Payment terms: Due on receipt
Beneficiary: DesiFreelanceDocs Studio
Bank name: HDFC Bank
Bank full address: Residency Road Branch, Bengaluru, Karnataka, India
Account number: 50200044321098
SWIFT / BIC code: HDFCINBB`,
  },
  {
    id: "incomplete-brief",
    title: "Incomplete Brief",
    text: `Need an invoice for Nike USA. We made some homepage ui ux work, maybe 2 screens. charge 15k.
please autofill whatever you can.`,
  },
];
