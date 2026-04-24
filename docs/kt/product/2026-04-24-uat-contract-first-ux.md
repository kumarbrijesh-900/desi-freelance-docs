# UAT Report: Contract-First User Experience Audit

**Date**: 2026-04-24
**Lead Researcher**: Antigravity AI
**Scope**: Contract-First Flow & Multimodal UX

---

## PERSONA 1: "Laxypanda" (The Rushed Creative Freelancer)

### The Walkthrough
Laxypanda opens Lance on his phone while stuck in Bengaluru traffic. He’s got a WhatsApp message from a new client in Mumbai and just wants to get paid. He taps the "Fast Extraction" button, pastes the chaotic chat log ("Logo, 25k, pay me in 10 days pls"), and waits. The AI does a 90% job, but because the client is new, the app nudges him to "Initialize Client Profile." He finds this annoying—he just wants to send the link. However, when the editor pre-fills the "Interstate GST (18%)" automatically because it detected "Mumbai" vs his "Bangalore" profile, he feels a brief moment of relief that he didn't have to calculate the split. He hits "Finalize" without an MSA, ignoring the warning, and fires off the link.

### UAT Findings Table
| Step in Flow | Friction Level | Identified UX/Logic Issue | Proposed Product Tweak |
| :--- | :--- | :--- | :--- |
| **Initial Extraction** | **Medium** | AI extracts data but "New Client" forces a full modal context-switch to fill address fields. | Implement "Skeleton Clients": Allow sending with just Name/Email, auto-completing address later via GSTIN lookup. |
| **Tax Calculation** | **Low** | Correctly defaulted to IGST 18%, but no visual "Why?" explanation for the freelancer. | Add a subtle "Why 18%?" tooltip explaining the interstate (KA -> MH) tax logic. |
| **MSA Workflow** | **High** | "Contract-First" feels like a hurdle for a one-off 25k job; the warning is too alarming. | Add a "Quick-Ship (No MSA)" toggle for low-value transactions that simplifies the UI. |
| **Draft Management** | **Low** | Auto-save caught a crash when he switched to WhatsApp to check the email address. | None; state persistence via RLS/localStorage is solid. |

---

## PERSONA 2: "Bkb Kumar" (The Corporate Client Receiver)

### The Walkthrough
Bkb opens the shared link in his corporate email. He’s impressed by the "Liquid Studio" design, but his procurement brain immediately goes to the legal fine print. He sees the "Full IP Assignment" clause and nods—Laxypanda usually forgets that. He checks the GSTIN; it’s there, but the 2-digit state codes are missing from the header, which might annoy his CA. The "Amount in Words" is in Lakhs, which is perfect for an Indian firm. He accepts the MSA (the "Contract-First" greeting was clear and professional) and downloads the PDF for his accounting software. The payment terms "Net 10" are highlighted in a high-contrast box, making it impossible for his team to claim they didn't see the deadline.

### UAT Findings Table
| Step in Flow | Friction Level | Identified UX/Logic Issue | Proposed Product Tweak |
| :--- | :--- | :--- | :--- |
| **MSA Acceptance** | **Low** | The legal language is clear, but the "Accept" button is below the fold on mobile. | Move "Sign/Accept" to a floating action bar for higher conversion on shared links. |
| **GST Display** | **Medium** | GSTIN is present, but lacks the specific State Code prefix (e.g., 29-...) required for some B2B audits. | Enforce "Code-Prefix" display on all B2B templates (e.g., "29 - Karnataka"). |
| **IP Terms** | **Low** | "Full IP Assignment" is clear, but doesn't specify *when* (upon payment vs. upon delivery). | Add a dynamic "Transfer Timing" sub-label based on the `msaIpTriggerType`. |
| **PDF Legibility** | **Medium** | Table font size in the 'Classic' template is a bit small for dense corporate invoices. | Increase base line-item font size by 1pt in the standard PDF generator. |

---

## PERSONA 3: "The Edge-Case Exporter" (Freelancer doing International Work)

### The Walkthrough
The Exporter creates an invoice for a US client. He selects "USD" as the currency. He hasn't filed an LUT this year, so he chooses "Add IGST" in the settings. The system correctly warns him: "Export without LUT requires 18% IGST." He’s grateful for the warning because he almost forgot. However, when he sees the total, the app doesn't show the INR equivalent for his GST filing, which he knows he'll need later. The jurisdiction in the MSA defaults to "Bangalore," which his US client might push back on, but the "Override" feature allows him to change it to "Mutual Discussion" on the fly without breaking the global template.

### UAT Findings Table
| Step in Flow | Friction Level | Identified UX/Logic Issue | Proposed Product Tweak |
| :--- | :--- | :--- | :--- |
| **Currency Toggle** | **Medium** | App handles USD well, but the exchange rate is static/manual. | Integrate a real-time (daily) FX rate API to suggest the INR value for GST compliance. |
| **Tax Warning** | **Low** | The "No LUT" alert is clear and prevents a massive tax liability mistake. | None; this is a high-value compliance win. |
| **MSA Cross-Border** | **High** | Defaulting to Indian Jurisdiction for a US client is a friction point during negotiation. | Detect international client and suggest "International Arbitration" or "Delaware/NY" as jurisdiction presets. |
| **Grand Totals** | **Medium** | The "Amount in Words" logic sometimes defaults to INR format even when the currency is USD. | Ensure currency-specific "Amount in Words" (e.g., "Five Hundred Dollars" vs "Five Hundred Rupees"). |

---

## Final Researcher Recommendations
The platform is technically robust, but the **"Contract-First"** philosophy needs a **"Lightweight Mode"** for Laxypandas of the world to ensure it doesn't become a barrier to entry. For the **Corporate/Export** users, we need to lean harder into **Statutory Accuracy** (State Codes and FX Rate logs).
