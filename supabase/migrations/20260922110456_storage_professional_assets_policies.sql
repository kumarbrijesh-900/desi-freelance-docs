-- The baseline dump covers the public schema only -- it contains no reference
-- to storage at all -- so the bucket and its policies have never been in
-- version control. A rebuild from migrations produced no bucket and no
-- policies, and uploads failed from a clean slate with nothing to explain it.
--
-- This captures the deployed configuration exactly as it stands, transcribed
-- from storage.buckets and pg_policies on 2026-09-22.
--
-- The SELECT policy is the one that was absent in production until today, and
-- its absence is worth recording. storage-api persists object metadata with
-- INSERT ... RETURNING *, and PostgreSQL evaluates a table's SELECT policies
-- on the row an INSERT returns. With no SELECT policy the row was accepted and
-- then refused on the way back out, surfacing as
--   new row violates row-level security policy
-- which reads like a WITH CHECK failure and sends you looking at the INSERT
-- policy. Adding INSERT policies for wider and wider roles cannot fix it.
-- Logo, signature and payment QR upload were dead from 2026-04-23 until it was
-- added.
--
-- Idempotent by construction: safe to re-run against a database that already
-- has the bucket and all four policies.

insert into storage.buckets (id, name, public)
values ('professional-assets', 'professional-assets', true)
on conflict (id) do nothing;

drop policy if exists "Allow authenticated read professional-assets" on storage.objects;
create policy "Allow authenticated read professional-assets"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'professional-assets');

drop policy if exists "Allow authenticated uploads" on storage.objects;
create policy "Allow authenticated uploads"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'professional-assets');

drop policy if exists "Allow authenticated updates" on storage.objects;
create policy "Allow authenticated updates"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'professional-assets');

drop policy if exists "Allow authenticated deletes" on storage.objects;
create policy "Allow authenticated deletes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'professional-assets');
