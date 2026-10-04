// Canonical Supabase project for CardVault.
//
// The publishable key below is public by design (it ships inside the client
// JS bundle of every Supabase app). The secret service-role key is NEVER
// stored here — server admin code still reads SUPABASE_SERVICE_ROLE_KEY
// from the environment only.
//
// Why resolve() instead of plain env vars? Hosting providers (Lovable Cloud)
// inject SUPABASE_* env values that can go stale when the project is moved.
// resolve() honors explicit env config, except when it points at a
// decommissioned project ref — then it falls back to the canonical project
// so deployments keep working. To move projects, update CANONICAL_* below
// (and rotate keys in the Supabase dashboard).

export const CANONICAL_SUPABASE_URL = "https://bvvwsrwebguwekyupvec.supabase.co";
export const CANONICAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_O3qEj2KzBv3iJIwEy3Z1ng_olPeXGGm";

// Project refs that must no longer be used (kept here so stale injected
// env vars can be detected and ignored).
const DECOMMISSIONED_REFS = ["qskrvvkrxzsdngbakhvf"];

function isDecommissioned(url: string | undefined): boolean {
  if (!url) return false;
  return DECOMMISSIONED_REFS.some((ref) => url.includes(ref));
}

export function resolveSupabaseConfig(
  envUrl: string | undefined,
  envKey: string | undefined,
): { url: string; publishableKey: string } {
  if (envUrl && envKey && !isDecommissioned(envUrl)) {
    return { url: envUrl, publishableKey: envKey };
  }
  return { url: CANONICAL_SUPABASE_URL, publishableKey: CANONICAL_SUPABASE_PUBLISHABLE_KEY };
}
