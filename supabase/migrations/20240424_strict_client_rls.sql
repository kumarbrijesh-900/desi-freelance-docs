-- Migration: Strict RLS for Clients
-- Enforces strict Row Level Security (RLS) on the clients table to prevent unauthorized access.
-- Each operation (SELECT, INSERT, UPDATE, DELETE) is explicitly gated by auth.uid().

-- 1. Ensure RLS is enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2. Cleanup: Remove the legacy broad "FOR ALL" policy
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;

-- 3. Strict SELECT: Only allow viewing records owned by the authenticated user
CREATE POLICY "clients_select_owner"
    ON public.clients
    FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Strict INSERT: Only allow inserting records where the user_id matches the authenticated user
CREATE POLICY "clients_insert_owner"
    ON public.clients
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 5. Strict UPDATE: Only allow updating records owned by the authenticated user
CREATE POLICY "clients_update_owner"
    ON public.clients
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Strict DELETE: Only allow deleting records owned by the authenticated user
CREATE POLICY "clients_delete_owner"
    ON public.clients
    FOR DELETE
    USING (auth.uid() = user_id);
