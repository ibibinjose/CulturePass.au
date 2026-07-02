/**
 * Helpers for consuming Amplify Data (AppSync) results during the per-feature
 * port. Pagination and error handling patterns carried over from the original client.
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

/**
 * Drain a paginated Amplify `.list()` into a single array.
 *
 * Errors accompanied by a non-empty `data` page are field-level serialization
 * problems (e.g. a stored value AppSync can't render as `AWSURL`) — AppSync
 * nulls the offending field and still returns the rows. Dropping the whole
 * list for one bad field on one row would blank entire screens, so those are
 * logged and tolerated; errors with no data (auth failures, bad queries)
 * still throw.
 */
export async function collectAll<T>(
  page: (nextToken?: string) => Promise<AwsListPage<T>>,
): Promise<T[]> {
  const out: T[] = [];
  let token: string | undefined;
  do {
    const res = await page(token);
    if (res.errors && res.errors.length > 0) {
      if (res.data && res.data.length > 0) {
        console.warn("[collectAll] partial page:", res.errors.map((e) => e.message).join("; "));
      } else {
        throwIfErrors(res.errors);
      }
    }
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

/**
 * First row matching a filtered `.list()`.
 *
 * DynamoDB applies `limit` BEFORE the filter — it caps rows *scanned*, not rows
 * matched — so `.list({ filter, limit: 1 })` returns an empty page whenever the
 * first scanned row isn't the match, even though matching rows exist. Never
 * pass `limit` with a filter; use this to page until a match (or the end).
 * Same partial-page error tolerance as {@link collectAll}.
 */
export async function findFirst<T>(
  page: (nextToken?: string) => Promise<AwsListPage<T>>,
): Promise<T | undefined> {
  let token: string | undefined;
  do {
    const res = await page(token);
    if (res.errors && res.errors.length > 0) {
      if (res.data && res.data.length > 0) {
        console.warn("[findFirst] partial page:", res.errors.map((e) => e.message).join("; "));
      } else {
        throwIfErrors(res.errors);
      }
    }
    if (res.data.length > 0) return res.data[0];
    token = res.nextToken ?? undefined;
  } while (token);
  return undefined;
}
