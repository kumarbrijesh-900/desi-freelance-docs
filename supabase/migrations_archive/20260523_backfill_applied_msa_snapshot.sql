UPDATE public.invoices SET
  applied_payment_terms = COALESCE(applied_payment_terms,
    CASE 
      WHEN form_data->'meta'->>'hasAddendum' = 'true' 
        AND COALESCE((form_data->'client'->>'msaPaymentTermsDays')::int, 0) > 0
        THEN 'Net ' || (form_data->'client'->>'msaPaymentTermsDays') || ' days'
      WHEN COALESCE((form_data->'agency'->>'msaPaymentTermsDays')::int, 0) > 0
        THEN 'Net ' || (form_data->'agency'->>'msaPaymentTermsDays') || ' days'
      ELSE 'Net 20 days'
    END),
  applied_late_fee_rate = COALESCE(applied_late_fee_rate,
    CASE
      WHEN form_data->'meta'->>'hasAddendum' = 'true' 
        AND COALESCE((form_data->'client'->>'msaLateFeeRate')::numeric, 0) > 0
        THEN (form_data->'client'->>'msaLateFeeRate')::numeric
      WHEN COALESCE((form_data->'agency'->>'msaLateFeeRate')::numeric, 0) > 0
        THEN (form_data->'agency'->>'msaLateFeeRate')::numeric
      ELSE 1.5
    END),
  applied_late_fee_unit = COALESCE(applied_late_fee_unit,
    CASE
      WHEN form_data->'meta'->>'hasAddendum' = 'true' AND form_data->'client'->>'msaLateFeeUnit' IS NOT NULL
        THEN CASE form_data->'client'->>'msaLateFeeUnit'
          WHEN 'daily' THEN 'day' WHEN 'weekly' THEN 'week' WHEN 'monthly' THEN 'month'
          ELSE form_data->'client'->>'msaLateFeeUnit' END
      WHEN form_data->'agency'->>'msaLateFeeUnit' IS NOT NULL
        THEN CASE form_data->'agency'->>'msaLateFeeUnit'
          WHEN 'daily' THEN 'day' WHEN 'weekly' THEN 'week' WHEN 'monthly' THEN 'month'
          ELSE form_data->'agency'->>'msaLateFeeUnit' END
      ELSE 'month'
    END)
WHERE applied_payment_terms IS NULL 
   OR applied_late_fee_rate IS NULL 
   OR applied_late_fee_unit IS NULL;
