import { defineFunction } from "@aws-amplify/backend";

/**
 * get-taken-seats — AppSync custom-query handler (Lambda).
 *
 * TicketOrders are owner-scoped, so a buyer can't read others' rows to compute
 * seat occupancy. This Lambda reads all orders for an event (+ show date) with
 * its IAM role and returns only seat labels (no buyer data) — the AWS analogue
 * of the `get_taken_seats` Postgres function.
 */
export const getTakenSeats = defineFunction({
  name: "get-taken-seats",
  entry: "./handler.ts",
  timeoutSeconds: 20,
});
