/**
 * Tiny helpers shared by the per-domain AppSync → Supabase-row mappers.
 *
 * Amplify types `a.string().array()` as `(string | null)[] | null`, whereas the
 * Supabase rows the app consumes use `string[]` (or `string[] | null`). `compact`
 * bridges that; `nullableList` preserves the `| null` distinction where a column
 * was nullable in Postgres.
 */

/** Drop nulls from an Amplify nullable array → `T[]` (empty when absent). */
export function compact<T>(arr: readonly (T | null)[] | null | undefined): T[] {
  return arr ? arr.filter((x): x is T => x != null) : [];
}

/** Like {@link compact} but keeps `null` (vs `[]`) when the source is absent. */
export function nullableList<T>(arr: readonly (T | null)[] | null | undefined): T[] | null {
  return arr ? arr.filter((x): x is T => x != null) : null;
}

/**
 * Generate a URL slug from a name. Postgres did this in a `BEFORE INSERT` trigger
 * (with a uniqueness suffix); DynamoDB has no triggers, so create-paths slugify
 * client-side when no slug is supplied. A short random suffix keeps collisions
 * unlikely; a deploy-time uniqueness check belongs in a Lambda later.
 */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}
