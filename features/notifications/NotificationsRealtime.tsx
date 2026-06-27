import { useNotificationsRealtime } from "./api";

/** Mounts the notifications realtime subscription near the app root. */
export function NotificationsRealtime() {
  useNotificationsRealtime();
  return null;
}
