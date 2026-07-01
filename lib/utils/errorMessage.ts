/**
 * Maps a fetch/query error to a user-safe display string.
 *
 * Never returns a raw JavaScript Error.message — callers receive one of the
 * two approved user-facing messages defined in Requirements 12.2 and 12.3.
 */
export function mapFetchError(err: unknown): string {
  if (err instanceof Error) {
    if (/network|failed to fetch|no internet/i.test(err.message)) {
      return "Couldn't load content — check your connection.";
    }
    return "Something went wrong. Tap to retry.";
  }
  return "Something went wrong. Tap to retry.";
}
