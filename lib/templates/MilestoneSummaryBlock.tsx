import type { TemplateData } from "./template-types";

export function MilestoneSummaryBlock({
  data,
  textColor = "#555",
  borderColor = "#e5e7eb",
  accentColor = "#111118",
}: {
  data: TemplateData;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
}) {
  if (!data.isMilestoneInvoice) return null;

  return (
    <div
      style={{
        marginBottom: "16px",
        padding: "12px 16px",
        border: `1px solid ${borderColor}`,
        borderRadius: "6px",
        backgroundColor: "rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: textColor,
          }}
        >
          Milestone Billing
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: accentColor,
            border: `1px solid ${borderColor}`,
            borderRadius: "20px",
            padding: "2px 8px",
          }}
        >
          {data.currentMilestoneLabel}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
        <span style={{ color: textColor }}>Due now (Milestone 1)</span>
        <span style={{ fontWeight: 600, color: accentColor }}>{data.currentMilestoneFormatted}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "8px" }}>
        <span style={{ color: textColor }}>Remaining milestones</span>
        <span style={{ color: textColor }}>{data.remainingMilestonesFormatted}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          paddingTop: "8px",
          borderTop: `1px solid ${borderColor}`,
        }}
      >
        <span style={{ fontWeight: 700, color: accentColor }}>Total project</span>
        <span style={{ fontWeight: 700, color: accentColor }}>{data.totalProjectFormatted}</span>
      </div>
      <p className="mt-2 pt-2 border-t border-[color:var(--border-subtle)] text-[10px] font-normal italic text-[#A8A08E]">
        Note: Please transfer the relevant Milestone Subtotal as outlined above.
      </p>
    </div>
  );
}
