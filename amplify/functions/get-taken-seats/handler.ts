// =============================================================================
// get-taken-seats handler — seat occupancy for an event (+ show date).
// =============================================================================
// AppSync custom-query Lambda. Reads all pending/paid orders for the event with
// the function's IAM role and returns only seat labels — no buyer data — so any
// signed-in buyer can render occupancy. Analogue of the `get_taken_seats` RPC.
//
// Excluded from `amplify/tsconfig.json` typecheck (imports `$amplify/env/*`);
// type-checked/bundled by `ampx`.
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/get-taken-seats";

import type { Schema } from "../../data/resource";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: "iam" });

export const handler: Schema["getTakenSeats"]["functionHandler"] = async (event) => {
  const { eventId, selectedDate } = event.arguments;

  const seats = new Set<string>();
  let nextToken: string | null | undefined;
  do {
    // Paginate — DynamoDB caps pages at 100, and a single .list() call would
    // silently drop taken seats on busy events.
    const { data: orders, nextToken: token } = await client.models.TicketOrder.list({
      filter: {
        eventId: { eq: eventId },
        or: [{ status: { eq: "pending" } }, { status: { eq: "paid" } }],
        ...(selectedDate ? { selectedDate: { eq: selectedDate } } : {}),
      },
      nextToken,
    });
    for (const order of orders) {
      for (const seat of order.seatNumbers ?? []) {
        if (seat) seats.add(seat);
      }
    }
    nextToken = token;
  } while (nextToken);
  return [...seats];
};
