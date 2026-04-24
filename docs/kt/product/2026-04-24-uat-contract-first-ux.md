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

---

## Phase 2: Edge-Case Stress Test Results

### PERSONA 4: "The Napkin Math Uploader" (Image Parsing)
#### The Walkthrough
The user uploads a shaky, low-light photo of a whiteboard. The Gemini-Pro-Vision model correctly identifies "Website" and "Hosting," but because "50k" and "5k" are written in a casual script, the parser isn't sure if it's INR or USD (no symbol was written). It defaults to the user's base currency (INR) but flags a "Confidence: Low" warning. The user is forced to manually confirm the currency in the "Deliverables" step.

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Image Upload** | **High** | OCR handles text well, but hand-written currency intent is ambiguous without symbols. | Add a "Preferred Currency" hint to the system prompt based on user profile. |
| **Data Review** | **Medium** | "Low Confidence" warning is helpful but doesn't explain *which* field is doubtful. | Highlight the specific ambiguous field (e.g., Currency) in red in the preview sidebar. |

### PERSONA 5: "The Milestone Biller" (Partial IP Transfer)
#### The Walkthrough
A freelancer sends a 50% advance invoice. The MSA blueprint says "IP Transfer upon Full Payment." When the client opens the link, the legal section correctly states that IP remains with the freelancer. However, the UI doesn't clearly show the *future* trigger. The client is confused, thinking they'll *never* get the IP.

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Client Review** | **Medium** | MSA text is accurate but "Milestone Status" (Pending Final Pmt) isn't visually obvious. | Add a "Milestone Progress" bar in the legal section showing IP transfer status. |
| **Logic Check** | **Low** | The back-end correctly prevents IP assignment on partial payments. | None; business logic is sound. |

### PERSONA 6: "The Under-Threshold Creator" (GST Logic)
#### The Walkthrough
The creator sets their profile to "Unregistered (Under 20L)." They paste a brief for a 10k job. The editor correctly hides the GSTIN field and sets the tax mode to "None." The final PDF looks professional and doesn't have an awkward "GST: 0.00" line; it simply shows "Total Amount" after the subtotal.

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Profile Setup** | **Low** | Selection of "Unregistered" status is intuitive. | None. |
| **PDF Rendering** | **Low** | Template logic gracefully collapses tax rows, maintaining "Premium" aesthetics. | Ensure "Supply without GST" note is added to satisfy tax auditor curiosity. |

### PERSONA 7: "The Corporate Auditor" (Reverse Charge Mechanism)
#### The Walkthrough
The user selects "RCM: Yes" for a specific B2B service. The auditor receives the invoice. While the totals are correct (Tax = 0), the auditor searches for the mandatory "Tax Payable under Reverse Charge" declaration. It's currently buried in the small-print "Notes" rather than being a prominent header.

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Template Gen** | **Medium** | RCM declaration is legally required to be prominent but is currently a "Note." | Add a mandatory "RCM Flag" badge next to the Invoice Header in the PDF. |

### PERSONA 8: "The Negotiating Client" (Client-Side Friction)
#### The Walkthrough
The client receives a link with "Net 15" terms. They want "Net 30." They look for a "Request Change" button on the public page but find only "Accept" or "Reject." They are forced to take a screenshot and email the freelancer, breaking the "Fast" workflow.

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Public View** | **High** | No communication channel for term negotiations; it's a "Take it or leave it" UI. | Add a "Propose Changes" comment box that sends an instant notification to the freelancer. |

### PERSONA 9: "The Late Payer" (MSA Late Fee Enforcement)
#### The Walkthrough
The client opens a link 45 days after the due date. The MSA specified a 1.5% late fee. The "Grand Total" on the public page still shows the original amount. The freelancer has to manually "Add Late Fee" and re-share the link. The system doesn't auto-append it.

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Public View** | **High** | Late fees are defined in the contract but not dynamically calculated in the UI. | Implement "Auto-Accrual": If Date > DueDate + Grace, show "Current Total (Incl. Late Fee)." |

### PERSONA 10: "The Dual-Office Client" (Entity Resolution)
#### The Walkthrough
The user bills "BKB Agency." BKB has offices in KA and MH. The AI parser finds two BKB records in the user's `clients` table history. It picks the most recent one (KA), but the work was for the Mumbai office (MH). The user doesn't notice until the PDF is generated.

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Extraction** | **Medium** | Entity resolution defaults to "Recency" rather than "Contextual Mapping." | If multiple addresses exist for a name, show a "Select Entity/Branch" picker after extraction. |

### PERSONA 11: "The Typo-Prone Freelancer" (Validation Fallback)
#### The Walkthrough
The user types a 14-character GSTIN. The form highlights the field in red, but doesn't tell them *why* (it just says "Invalid"). They try a 5-digit SAC code, and the system allows it because the validator is only checking for "Number," not "6-digit Length."

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Manual Entry** | **Medium** | Validation messages are generic ("Invalid") rather than helpful ("Must be 15 chars"). | Implement "Contextual Validation": Explain the exact format error (GSTIN/SAC length). |

### PERSONA 12: "The Recurring Retainer" (Hydration Loop)
#### The Walkthrough
The user sends a monthly retainer. They have to open the chat, copy the same text, and use the AI parser every time. They look for a "Clone last invoice" button in the Dashboard but only see "Edit" for the draft.

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Dashboard** | **Medium** | No "One-Tap Recurring" or "Duplicate" action for consistent clients. | Add a "Duplicate & Update Date" button to the Invoice History list. |

### PERSONA 13: "The Multi-Currency Nomad" (FX & Base Currency)
#### The Walkthrough
User bills in EUR. The app shows €500. For Indian accounting (GSTR-1), they need the INR equivalent as of the invoice date. The app doesn't show this anywhere, forcing them to use Google Finance manually and write it in the "Private Notes."

#### UAT Findings Table
| Step | Friction | Issue | Tweak |
| :--- | :--- | :--- | :--- |
| **Totals Step** | **High** | Cross-border compliance requires INR valuation for GST, but the app is currency-blind. | Add a "Compliance Value" row: Show "INR Equivalent" based on the daily exchange rate. |

---

### Summary of Stress Test Findings
The system is **logically robust** but **operationally friction-heavy** for professional/corporate use cases. The biggest opportunities are in **Auto-Accrual (Late Fees)**, **Entity Resolution (Dual-Office)**, and **Statutory Visibility (RCM/FX Values)**.
