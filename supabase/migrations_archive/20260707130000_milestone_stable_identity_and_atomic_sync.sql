-- Phase 2.2: stable milestone identity + atomic fail-loud sync RPC.
-- Replaces the client-side positional delete/upsert loop (non-atomic, error-swallowing,
-- index-matched) with one transactional function. Lifecycle fields (status, trigger_*,
-- and tds_amount once SETTLED/CANCELLED) are never overwritten by structural saves.

alter table public.invoice_milestones add column if not exists form_ref text;

comment on column public.invoice_milestones.form_ref is
  'Stable client-side Milestone.id from form_data. Sync matches on this (not order_index) so reordering can never reattach lifecycle state to the wrong milestone.';

-- Backfill: data verified index-aligned and drift-free on 2026-07-07 (12/12 clean).
update public.invoice_milestones m
set form_ref = t.fm->>'id'
from public.invoices i
cross join lateral jsonb_array_elements(i.form_data->'milestones') with ordinality as t(fm, ord)
where i.id = m.invoice_id
  and (t.ord - 1) = m.order_index
  and coalesce(t.fm->>'id','') <> ''
  and m.form_ref is null;

create unique index if not exists invoice_milestones_invoice_form_ref_key
  on public.invoice_milestones (invoice_id, form_ref)
  where form_ref is not null;

create or replace function public.sync_invoice_milestones(p_invoice_id uuid, p_milestones jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  m jsonb;
  v_idx int;
  v_ref text;
  v_id uuid;
  v_amount numeric;
  v_keep_refs text[] := '{}';
begin
  if not exists (select 1 from public.invoices i where i.id = p_invoice_id and i.user_id = auth.uid()) then
    raise exception 'sync_invoice_milestones: invoice % not found or not owned by caller', p_invoice_id;
  end if;

  if p_milestones is null or jsonb_typeof(p_milestones) <> 'array' then
    raise exception 'sync_invoice_milestones: p_milestones must be a jsonb array, got %', coalesce(jsonb_typeof(p_milestones), 'null');
  end if;

  if jsonb_array_length(p_milestones) = 0 then
    delete from public.invoice_milestones where invoice_id = p_invoice_id;
    return;
  end if;

  for v_idx in 0 .. jsonb_array_length(p_milestones) - 1 loop
    m := p_milestones -> v_idx;
    v_ref := coalesce(nullif(m->>'id', ''), 'idx-' || v_idx);
    v_keep_refs := array_append(v_keep_refs, v_ref);

    select coalesce(sum(coalesce((li->>'qty')::numeric, 0) * coalesce((li->>'rate')::numeric, 0)), 0)
      into v_amount
      from jsonb_array_elements(coalesce(m->'lineItems', '[]'::jsonb)) li;

    v_id := null;
    select id into v_id from public.invoice_milestones
      where invoice_id = p_invoice_id and form_ref = v_ref;
    if v_id is null then
      select id into v_id from public.invoice_milestones
        where invoice_id = p_invoice_id and form_ref is null and order_index = v_idx;
    end if;

    if v_id is not null then
      update public.invoice_milestones set
        title = coalesce(nullif(m->>'title', ''), 'Milestone ' || (v_idx + 1)),
        order_index = v_idx,
        amount = v_amount,
        form_ref = v_ref,
        tds_amount = case
          when status in ('SETTLED', 'CANCELLED') then tds_amount
          else coalesce((m->>'tdsAmount')::numeric, 0)
        end
      where id = v_id;
    else
      insert into public.invoice_milestones
        (invoice_id, form_ref, title, status, tds_amount, amount, order_index)
      values (
        p_invoice_id,
        v_ref,
        coalesce(nullif(m->>'title', ''), 'Milestone ' || (v_idx + 1)),
        upper(coalesce(nullif(m->>'status', ''), 'PENDING')),
        coalesce((m->>'tdsAmount')::numeric, 0),
        v_amount,
        v_idx
      )
      returning id into v_id;
    end if;

    delete from public.invoice_line_items where milestone_id = v_id;
    insert into public.invoice_line_items
      (milestone_id, item_type, sub_type, description, quantity, rate, unit, total, order_index)
    select
      v_id,
      t.li->>'type',
      coalesce(t.li->>'subType', ''),
      t.li->>'description',
      coalesce((t.li->>'qty')::numeric, 0),
      coalesce((t.li->>'rate')::numeric, 0),
      t.li->>'rateUnit',
      coalesce((t.li->>'qty')::numeric, 0) * coalesce((t.li->>'rate')::numeric, 0),
      (t.ord - 1)::int
    from jsonb_array_elements(coalesce(m->'lineItems', '[]'::jsonb)) with ordinality as t(li, ord);
  end loop;

  delete from public.invoice_milestones
   where invoice_id = p_invoice_id
     and coalesce(form_ref, 'idx-' || order_index) <> all (v_keep_refs);
end;
$$;

grant execute on function public.sync_invoice_milestones(uuid, jsonb) to authenticated;
revoke execute on function public.sync_invoice_milestones(uuid, jsonb) from anon;
