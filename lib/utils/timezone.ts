/**
 * Helper to resolve the correct IANA timezone name for a given Australian State code.
 * Defaults to Australia/Sydney if state is omitted or unrecognized.
 */
export function getEventTimezone(stateCode?: string | null): string {
  if (!stateCode) return "Australia/Sydney";
  const code = stateCode.toUpperCase().trim();
  switch (code) {
    case "WA":
      return "Australia/Perth";
    case "NT":
      return "Australia/Darwin";
    case "SA":
      return "Australia/Adelaide";
    case "QLD":
      return "Australia/Brisbane";
    case "NSW":
    case "VIC":
    case "TAS":
    case "ACT":
    default:
      return "Australia/Sydney";
  }
}
