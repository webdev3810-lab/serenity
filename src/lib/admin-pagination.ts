/** Fetch every page, even if the service cap is below the requested page size.
 * Callers provide a stable unique order. Failures never appear as empty lists. */
export async function fetchAllAdminRows<T>(query: () => { range: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> }) {
  const rows: T[] = [];
  for (;;) {
    try {
      const result = await query().range(rows.length, rows.length + 499);
      if (result.error) return { data: null, error: result.error };
      if (!result.data?.length) return { data: rows, error: null };
      rows.push(...result.data);
    } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "Could not load records. Please retry." } }; }
  }
}
