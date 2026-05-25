# Session Log Addendum

**Type model watch:** Phase 1B surfaced frontend/backend drift around milestone date fields. Milestone rows expose `trigger_date`, `order_index`, and `status`, but not every UI-assumed field like `due_date`. Future dashboard lifecycle work should either extend `MilestoneRow` deliberately or derive due/timing from invoice/form_data with explicit fallback rules.
