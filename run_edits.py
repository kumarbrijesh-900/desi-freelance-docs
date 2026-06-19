import os

edits = [
    # A1
    (
        "app/api/invoice/trigger-next-milestone/route.ts",
        """const NewSchema = z.object({
  invoice_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  trigger_mode: TriggerModeSchema,
  trigger_date: z.string().nullable().optional(),
});""",
        """const NewSchema = z.object({
  invoice_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  trigger_mode: TriggerModeSchema,
  trigger_date: z.string().nullable().optional(),
  tds_amount: z.number().nonnegative().nullable().optional(),
});"""
    ),
    # A2
    (
        "app/api/invoice/trigger-next-milestone/route.ts",
        """    const requestedTriggerDate = isLegacy ? null : input.trigger_date ?? null;""",
        """    const requestedTriggerDate = isLegacy ? null : input.trigger_date ?? null;
    const tdsAmount = isLegacy ? 0 : Number(input.tds_amount ?? 0);"""
    ),
    # A3
    (
        "app/api/invoice/trigger-next-milestone/route.ts",
        """      const { error: settleError } = await supabaseAdmin
        .from("invoice_milestones")
        .update({ status: "SETTLED" })
        .eq("invoice_id", invoiceId)
        .eq("order_index", currentOrderIndex);""",
        """      const { error: settleError } = await supabaseAdmin
        .from("invoice_milestones")
        .update({ status: "SETTLED", tds_amount: tdsAmount })
        .eq("invoice_id", invoiceId)
        .eq("order_index", currentOrderIndex);"""
    ),
    # B1
    (
        "app/dashboard/page.tsx",
        """type SettlementChoice = {
  invoiceId: string;
  projectId: string;
  milestoneNumber: number;
  milestoneTitle: string;
  triggerMode: TriggerMode;
  triggerDate: string;
};""",
        """type SettlementChoice = {
  invoiceId: string;
  projectId: string;
  milestoneNumber: number;
  milestoneTitle: string;
  triggerMode: TriggerMode;
  triggerDate: string;
  tdsPercent: number;
};"""
    ),
    # B2
    (
        "app/dashboard/page.tsx",
        """      triggerMode: "scheduled",
      triggerDate: formatDateInputValue(7),
    });""",
        """      triggerMode: "scheduled",
      triggerDate: formatDateInputValue(7),
      tdsPercent: 0,
    });"""
    ),
    # B3
    (
        "app/dashboard/page.tsx",
        """    const isProjectClosing = settlementChoice.triggerMode === "cancelled" || !nextMilestone;

    if (settlementChoice.triggerMode === "scheduled") {""",
        """    const isProjectClosing = settlementChoice.triggerMode === "cancelled" || !nextMilestone;

    const currentSettlingMilestone = settlementMilestones.find(
      milestone => (milestone.order_index ?? 0) + 1 === settlementChoice.milestoneNumber,
    ) ?? null;
    body.tds_amount = Math.round((Number(currentSettlingMilestone?.amount || 0) * (settlementChoice.tdsPercent || 0)) / 100);

    if (settlementChoice.triggerMode === "scheduled") {"""
    ),
    # B4
    (
        "app/dashboard/page.tsx",
        """        const settlementAmount = taxBreakdown ? taxBreakdown.totalPayable : milestoneAmount;
        const taxLabel = taxBreakdown ? taxBreakdown.label : "Tax";""",
        """        const settlementAmount = taxBreakdown ? taxBreakdown.totalPayable : milestoneAmount;
        const tdsPercent = settlementChoice.tdsPercent || 0;
        const tdsAmount = Math.round((milestoneAmount * tdsPercent) / 100);
        const netReceived = settlementAmount - tdsAmount;
        const taxLabel = taxBreakdown ? taxBreakdown.label : "Tax";"""
    ),
    # B5
    (
        "app/dashboard/page.tsx",
        """                  <div className="flex items-center gap-2 border-t border-soft px-4 py-3 text-sm font-bold text-[color:var(--color-ink)]">
                    <span className="h-2 w-2 flex-none rounded-full bg-[color:var(--color-ochre)]" />
                    Confirm only after the payment is visible in your bank account.
                  </div>""",
        """                  <div className="border-t border-soft px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="tds-percent-input" className="text-[11px] font-extrabold uppercase tracking-widest text-[color:var(--color-ink-3)]">
                        TDS deducted by client
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id="tds-percent-input"
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={tdsPercent === 0 ? "" : tdsPercent}
                          placeholder="0"
                          onChange={event => {
                            const next = Math.max(0, Math.min(100, Number(event.target.value) || 0));
                            setSettlementChoice(choice => (choice ? { ...choice, tdsPercent: next } : choice));
                          }}
                          className="h-9 w-16 rounded-[10px] border border-soft bg-white px-2 text-right text-sm font-semibold tabular-nums outline-none app-focus-ring"
                        />
                        <span className="text-sm font-bold text-[color:var(--color-ink-2)]">%</span>
                      </div>
                    </div>
                    {tdsPercent > 0 && (
                      <div className="mt-3 space-y-1 border-t border-dashed border-[#cfc4ab] pt-2">
                        <div className="flex items-center justify-between text-xs text-[color:var(--color-ink-2)]">
                          <span>TDS on {formatInr(milestoneAmount)} base (−{tdsPercent}%)</span>
                          <span className="tabular-nums">−{formatInr(tdsAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[color:var(--color-ink)]">Net you&apos;ll receive</span>
                          <span className="font-syne text-lg font-bold tabular-nums text-[color:var(--color-ink)]">{formatInr(netReceived)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 border-t border-soft px-4 py-3 text-sm font-bold text-[color:var(--color-ink)]">
                    <span className="h-2 w-2 flex-none rounded-full bg-[color:var(--color-ochre)]" />
                    Confirm only after the payment is visible in your bank account.
                  </div>"""
    )
]

for i, (file_path, old_str, new_str) in enumerate(edits):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Replaced block {i+1} in {file_path}")
    else:
        print(f"Warning: Block {i+1} not found in {file_path}")

