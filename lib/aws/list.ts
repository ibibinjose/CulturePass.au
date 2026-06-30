/**
 * Helpers for consuming Amplify Data (AppSync) results during the per-feature
 * port. Two recurring needs the Supabase client handled for us:
 *
 *  - `collectAll` paginates a `.list()` to completion. DynamoDB lists are capped
 *    per page (and `australian_councils` alone is >100 rows), so anything that
 *    relied on a single unpaginated Supabase `select()` must drain `nextToken`.
 *  - `unwrapAws` mirrors the `if (error) throw error` we did on every Supabase
 *    call: Amplify returns `{ data, errors }` instead of throwing.
 */

export interface AwsListPage<T> {
  data: T[];
  nextToken?: string | null;
  errors?: readonly { readonly message: string }[] | null;
}

export interface AwsResult<T> {
  data: T;
  errors?: readonly { readonly message: string }[] | null;
}

function throwIfErrors(errors?: readonly { readonly message: string }[] | null): void {
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

/** Drain a paginated Amplify `.list()` into a single array, throwing on errors. */
export async function collectAll<T>(
  page: (nextToken?: string) => Promise<AwsListPage<T>>,
): Promise<T[]> {
  const out: T[] = [];
  let token: string | undefined;
  do {
    const res = await page(token);
    throwIfErrors(res.errors);
    out.push(...res.data);
    token = res.nextToken ?? undefined;
  } while (token);
  return out;
}

/** Unwrap a single-record Amplify result (`.get()`/`.create()`/…), throwing on errors. */
export function unwrapAws<T>(res: AwsResult<T>): T {
  throwIfErrors(res.errors);
  return res.data;
}
