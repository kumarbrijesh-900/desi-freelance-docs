/**
 * ─── Default MSA Template ────────────────────────────
 *
 * Used when a freelancer/agency has no MSA set up yet
 * and wants to share an invoice with MSA gating.
 */

export const DEFAULT_MSA_TITLE = "Master Service Agreement";

export const DEFAULT_MSA_CONTENT = `MASTER SERVICE AGREEMENT

This Master Service Agreement ("Agreement") is entered into between the service provider ("Agency") and the client ("Client") as referenced in the associated invoice.

1. SCOPE OF WORK
The Agency will provide services as described in each invoice or statement of work ("SOW") issued under this Agreement. Each SOW will detail the specific deliverables, timelines, and associated fees.

2. INTELLECTUAL PROPERTY RIGHTS
All intellectual property created during the engagement, including but not limited to designs, code, copy, and media assets, shall remain the property of the Agency until full payment has been received. Upon complete payment, ownership of the final deliverables transfers to the Client.

Work-in-progress files, source files, and intermediate assets remain the property of the Agency unless explicitly included in the deliverables.

3. PAYMENT TERMS
- Payment is due as specified in each invoice.
- Late payments will incur a fee of 1.5% per month (18% per annum) on the outstanding balance.
- The Agency reserves the right to suspend work if payment is overdue by more than 15 days.

4. REVISIONS & SCOPE CHANGES
- Each SOW includes up to 2 rounds of revisions unless otherwise specified.
- Additional revisions or scope changes will be billed at the Agency's standard hourly rate.
- Major scope changes require a revised SOW and mutual agreement.

5. LIABILITY
- The Agency's total liability under this Agreement shall not exceed the total fees paid by the Client for the specific SOW in question.
- The Agency is not liable for indirect, consequential, or incidental damages arising from the use of deliverables.

6. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information shared during the engagement. This obligation survives termination of this Agreement.

7. TERMINATION
- Either party may terminate this Agreement with 15 days' written notice.
- Upon termination, the Client shall pay for all work completed up to the termination date.
- Cancellation after work has commenced will incur a cancellation fee of 25% of the remaining project value.

8. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the jurisdiction of the courts in the Agency's registered city.

9. ACCEPTANCE
By accepting this Agreement (electronically or otherwise), the Client acknowledges that they have read, understood, and agree to be bound by the terms outlined above.`;

export const MSA_TOOLTIP_CONTENT = {
  title: "Why you need an MSA",
  description: "An invoice bills, but an MSA protects. Relying on email leaves you legally exposed. An MSA is your baseline shield that locks down:",
  points: [
    {
      label: "IP Rights",
      text: "Ownership transfers only after full payment.",
    },
    {
      label: "Scope & Payments",
      text: "Enforces payment schedules, late fees, and revision limits.",
    },
    {
      label: "Liability",
      text: "Caps your financial risk against client losses.",
    },
    {
      label: "Termination",
      text: "Defines clear exit rules and cancellation fees.",
    },
  ],
};
