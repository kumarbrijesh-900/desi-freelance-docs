-- The enum value 'proposed' exists in the production database but appeared in
-- no migration: it was added directly, out of band. A fresh environment built
-- from this directory therefore did NOT have it, and proposeMsaChanges() -
-- which writes msa_status = 'proposed' when a client asks for a revision -
-- would fail there with "invalid input value for enum msa_acceptance_status".
--
-- This records what production already has. Idempotent: safe on both.
alter type msa_acceptance_status add value if not exists 'proposed';
