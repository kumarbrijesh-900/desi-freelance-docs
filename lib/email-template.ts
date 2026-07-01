/**
 * Shared branded email shell for every Lance transactional email.
 * Single source of truth for the email visual system (the "E" palette).
 *
 * All senders (share-invoice, nudge-client, cron check-invoices, msa-response,
 * project/close, milestone-fire) render through `renderLanceEmail`, so the look
 * is defined once and changed in one place.
 *
 * Colours are hardcoded hex (email clients cannot read CSS custom properties);
 * the values mirror the app's E `@theme` tokens.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface LanceEmailOptions {
  /** Bold heading at the top of the card. */
  headline: string;
  /**
   * Body copy. Each entry becomes one styled paragraph and may contain inline
   * HTML (e.g. <strong>). Callers MUST escape any user-supplied text they
   * interpolate into a paragraph.
   */
  paragraphs: string[];
  /** Optional call-to-action button. */
  cta?: { label: string; url: string };
  /**
   * Optional ochre callout (used for a client's proposed-MSA note). `text` is
   * treated as plain text and is escaped here.
   */
  noteBlock?: { label: string; text: string };
  /** Optional muted fine-print line after the CTA (e.g. a secure-link notice). */
  finePrint?: string;
}

export function renderLanceEmail(opts: LanceEmailOptions): string {
  const paragraphs = opts.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;color:#5f574a;line-height:1.6;">${p}</p>`,
    )
    .join("");

  const noteBlock = opts.noteBlock
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
             <tr><td style="border-left:4px solid #c8943b;background:#f6ecd6;padding:16px 20px;">
               <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#a5772a;">${escapeHtml(opts.noteBlock.label)}</p>
               <p style="margin:0;font-size:15px;line-height:1.6;color:#5f574a;white-space:pre-wrap;font-style:italic;">&quot;${escapeHtml(opts.noteBlock.text)}&quot;</p>
             </td></tr>
           </table>`
    : "";

  const cta = opts.cta
    ? `<a href="${opts.cta.url}" style="display:inline-block;background-color:#3a6e59;color:#ffffff;font-size:15px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">${opts.cta.label}</a>`
    : "";

  const finePrint = opts.finePrint
    ? `<p style="margin:24px 0 0;font-size:13px;color:#988e7c;line-height:1.5;">${opts.finePrint}</p>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f2ebd8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#fbf6e8;border-radius:12px;border:1px solid #ddd3bd;overflow:hidden;box-shadow:0 4px 6px -1px rgba(33,28,22,0.10);">
            <tr>
              <td style="background:#211c16;padding:24px 32px;">
                <span style="color:#f0e9d6;font-size:16px;font-weight:700;letter-spacing:-0.02em;">Lance</span>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 32px;">
                <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#211c16;letter-spacing:-0.03em;">${opts.headline}</h1>
                ${paragraphs}
                ${noteBlock}
                ${cta}
                ${finePrint}
              </td>
            </tr>
            <tr>
              <td style="background:#f2ebd8;border-top:1px solid #ddd3bd;padding:20px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#988e7c;">Powered by <strong>Lance</strong> — Smart Invoicing for Freelancers</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}
