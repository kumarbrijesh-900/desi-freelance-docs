/**
 * Which MSA governs an invoice.
 *
 * Acceptance lives on the MASTER. Children are never shared for acceptance, so
 * every child row reads msa_status 'pending' forever - the same reasoning the
 * settlement gate in app/api/invoice/trigger-next-milestone/route.ts spells out
 * before it resolves upward. Asking a child for its own status answers a
 * question nobody was ever asked.
 *
 * Supabase returns a joined relation as either an object or a one-element array
 * depending on inferred cardinality, so both shapes are handled.
 */
export function resolveGoverningMsaStatus(invoice: any): string | null {
  const rel = invoice?.parent;
  const parent = Array.isArray(rel) ? rel[0] : rel;
  return parent?.msa_status ?? invoice?.msa_status ?? null;
}
