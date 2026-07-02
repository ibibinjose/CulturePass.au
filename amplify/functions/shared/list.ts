// Pagination helpers for Amplify Data `.list()` calls inside Lambda handlers.
// DynamoDB applies `limit` BEFORE the filter — it caps rows *scanned*, not rows
// matched — so `.list({ filter, limit: 1 })` returns an empty page whenever the
// first scanned row isn't the match. Never pass `limit` with a filter; page
// through with these instead. (Mirror of `lib/aws/list.ts` in the app layer,
// kept separate so function bundles don't reach into app code.)

export interface ListPage<T> {
  data: T[];
  nextToken?: string | null;
}

/** First row matching a filtered `.list()`, paging until a match (or the end). */
export async function findFirst<T>(
  page: (nextToken?: string) => Promise<ListPage<T>>,
): Promise<T | undefined> {
  let token: string | undefined;
  do {
    const res = await page(token);
    if (res.data.length > 0) return res.data[0];
    token = res.nextToken ?? undefined;
  } while (token);
  return undefined;
}

/** Drain a filtered `.list()` to completion. */
export async function collectAll<T>(
  page: (nextToken?: string) => Promise<ListPage<T>>,
): Promise<T[]> {
  const out: T[] = [];
  let token: string | undefined;
  do {
    const res = await page(token);
    out.push(...res.data);
    token = res.nextToken ?? undefined;
  } while (token);
  return out;
}
