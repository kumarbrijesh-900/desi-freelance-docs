# PROJECT_VISIONFLOW: Freelancer Invoice & MSA Platform

This document outlines the core user journey, expected behavior, and functional requirements for the Lance Invoice platform (lanceinvoice.xyz), as defined by the product vision. It serves as a source of truth for the desired user experience.

## 1. Landing & Onboarding
- **The Entry Point**: Users arrive at `lanceinvoice.xyz`, see the landing page, and click the "Create First Invoice" button to enter a multi-step wizard.
- **The "Stray User" Experience**: Users can build their entire invoice without logging in first. Authentication (Google Auth) is only required at the final stage (Preview/Save).
- **Post-Auth Recovery**: Upon signing up/in, users should be presented with a clean onboarding experience. If they skip or complete it, they must land back on the **Totals Screen** with all previously entered data fully preserved and populated.

## 2. Step 1: My/Agency Details
- **GST Integration**: When a user enters their GSTIN, the system should automatically fetch the Agency Name and Address based on that ID.
- **Flexibility**: Users without a GSTIN can toggle a "No GSTIN" option and fill in their agency details manually.

## 3. Step 2: Client Details & Legal Framework
- **Tax Logic**: The UI must adapt based on the client's location:
    - **Domestic (Same State)**: Apply CGST + SGST.
    - **Domestic (Different State)**: Apply standard GST (IGST).
    - **International**: Apply IGST with LUT validation.
- **LUT Validation**: If a client toggles GSTIN "Yes" for an international transaction, the system requires a valid LUT (Letter of Undertaking), which is managed in the Agency details.
- **MSA (Master Service Agreement)**:
    - Users can customize a "Boilerplate" MSA for each specific client within this section.
    - This data is saved as the master legal authority for the client relationship.

## 4. Step 3: Items & Deliverables
- **Billing Models**:
    - **One-time Bill**: A single milestone with one or multiple deliverables (one task, one billing cycle).
    - **Multiple Milestones**: A project-based approach where each milestone can contain multiple items (e.g., Milestone 1 has 3 items, Milestone 2 has 1 item).
- **Milestone Mechanics**: Each milestone represents a distinct billing cycle.
- **Line Item Experience**:
    - **Table Layout**: A series of inputs for Item Type, Description, Qty, Rate, and Rate-Unit.
    - **SAC Integration**: When an "Item Type" is selected, its corresponding SAC code is automatically retrieved from the database and displayed, so users don't have to memorize codes.
    - **Smart Inputs**: Includes auto-suggestions for descriptions to speed up entry.

## 5. Step 4: Payment Terms & Addendums
- **Legal Authority Toggle**:
    - **Use Master Agreement (Default)**: Fields (Payment terms, License terms, Notes) are read-only and pull data directly from the MSA boilerplate created in Step 2.
    - **Add Project Addendum**: Unlocks these fields for editing.
- **System Warning**: If terms are modified via an addendum, the system notifies the user: *"These terms are not part of the main MSA. The client will be notified, and these will be added as a project addendum for this invoice."*

## 6. Step 5: Metadata & Totals
- **Auto-Calculations**:
    - **Invoice Number**: Auto-generated and read-only.
    - **Invoice Date**: Defaults to current system date (editable).
    - **Due Date**: Automatically calculated based on the *Invoice Date* + *Payment Terms* (e.g., Net 10).
- **Tax & Currency**: Toggle for RCM (Reverse Charge Mechanism) and currency logic for international clients.
- **Preview**: Once fields are filled, the "Preview" button activates, leading to the template selection and final actions.

## 7. The App Dashboard (Post-Login)
- **Navigation**: Three primary tabs: **Invoices, Clients, Profile**.
- **Invoices Tab**: A table showing all invoices with their current status (e.g., Draft, Milestone-1 Live, Settled).
- **Clients Tab**: Stores the clients created during the wizard, including the customized MSA boilerplate within each client's profile.
- **Profile Tab**: Displays the user's agency details.

## 8. Sharing & Client Interaction
- **The Share Popup**: Displays the client's email, MSA summary, Addendum details, and billing totals.
- **Multi-Milestone Billing**:
    - For projects with multiple milestones, the invoice shows the **Total Project Amount** (e.g., 500) but highlights the **Amount Due for the Current Milestone** (e.g., 250).
- **Client Experience**:
    - Clients receive a secure link via email.
    - Before viewing the invoice, they see a popup with the MSA and any Project Addendums.
    - **Actions**:
        - **Accept**: Client accepts the legal terms; the invoice becomes visible. The Agency is notified ("MSA Accepted").
        - **Propose New MSA**: Client can request changes via a text box. The Agency is notified with the client's comments.

## 9. Payment & Milestone Automation
- **Invoice Lifecycle**:
    - Milestone 1 is marked as "Live".
    - Once payment is received (via UPI QR or Bank Details) and the Agency marks it "Settled", the system **immediately triggers the Milestone 2 invoice** to the client.
    - The MSA popup is bypassed for subsequent milestones (or shown as a "previously accepted" summary).
- **Automated Nudges**:
    - As the due date approaches, the system notifies the Agency to check for payment and marks the invoice as settled.
    - The system politely nudges the Client that the deadline is approaching.
- **Completion**: Marking the final milestone as settled closes the invoice cycle.

---
*Note: This is a reference document for product behavior and vision. It is not part of the implementation code or database schema.*
