// Never imports credentials or connects to Supabase.
export function createSupabaseBrowserClient() {
  return { from(table: string) {
    let single = false;
    let start = 0; let end = Infinity;
    const query = {
      select() { return query; }, order() { return query; }, eq() { return query; },
      range(a: number, b: number) { start = a; end = b; return query; },
      maybeSingle() { single = true; return query; },
      then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
        return fetch(`/fixtures/${table}`).then(response => response.json()).then(rows => resolve({ data: single ? rows[0] ?? null : rows.slice(start, end + 1), error: null }), reject);
      },
    };
    return query;
  }, auth: { signOut: () => Promise.resolve() } };
}
