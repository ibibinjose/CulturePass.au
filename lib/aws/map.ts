/**
 * Helpers for AppSync → legacy snake_case row shapes (used by mappers).
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

/**
 * AWSJSON write encoding (CLAUDE.md gotcha #5): AppSync's `a.json()` scalar
 * takes a JSON **string** on the wire — sending a raw object fails the mutation
 * with "Variable '<field>' has an invalid value". Every mapper that writes a
 * JSON column must go through this.
 */
export function toAwsJson(value: unknown): string | null {
  return value == null ? null : JSON.stringify(value);
}

/**
 * AWSJSON read decoding: tolerate both a JSON string (raw scalar) and an
 * already-parsed value (client versions differ), falling back when absent or
 * malformed. Every mapper that reads a JSON column must go through this.
 */
export function fromAwsJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}
