// =============================================================================
// dev-seed handler — create a buyer Profile + a published paid Event to test
// the Stripe purchase flow end-to-end. DEV ONLY. Invoke:
//   aws lambda invoke --function-name <name> --payload '{"buyerSub":"<sub>"}' out.json
//
// Excluded from amplify tsconfig typecheck (imports $amplify/env/*); typed/bundled by ampx.
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/dev-seed";

import type { Schema } from "../../data/resource";
import { findFirst } from "../shared/list";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: "iam" });

function unwrap<T>(res: { data: T | null; errors?: { message: string }[] | null }, what: string): T {
  if (res.errors && res.errors.length > 0) throw new Error(`${what}: ${res.errors.map((e) => e.message).join("; ")}`);
  if (!res.data) throw new Error(`${what}: no data returned`);
  return res.data;
}

export const handler = async (event: { buyerSub?: string; email?: string }) => {
  const buyerSub = event.buyerSub;
  if (!buyerSub) throw new Error("buyerSub is required");

  // 1. Profile for the buyer (reuse if it already exists).
  const existing = await findFirst((nextToken) =>
    client.models.Profile.list({ filter: { userId: { eq: buyerSub } }, nextToken }),
  );
  const profile =
    existing ??
    unwrap(
      await client.models.Profile.create({
        userId: buyerSub,
        fullName: "Test Buyer",
        isPublicProfessional: false,
        owner: buyerSub,
      }),
      "Profile.create",
    );

  const rand = Math.random().toString(36).slice(2, 8);

  // 2. Hub owned by the buyer (so they can host + buy a ticket to their event).
  const hub = unwrap(
    await client.models.Hub.create({
      ownerId: profile.id,
      name: "Test Venue",
      slug: `test-venue-${rand}`,
      type: "venue_space",
      shortDescription: "Seeded venue for Stripe checkout testing.",
      locationState: "VIC",
      locationCity: "Melbourne",
      status: "published",
      verificationStatus: "verified",
      indigenousLed: false,
    }),
    "Hub.create",
  );

  // 3. Published paid event next week.
  const startTime = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const event_ = unwrap(
    await client.models.Event.create({
      hubId: hub.id,
      type: "event",
      title: "Test Paid Event",
      description: "Seeded event to validate the Stripe checkout + webhook flow.",
      startTime,
      isFree: false,
      price: 10,
      locationState: "VIC",
      locationCity: "Melbourne",
      capacity: 100,
      rsvpCount: 0,
      status: "published",
    }),
    "Event.create",
  );

  // 4. A ticket type ($10.00).
  const ticketType = unwrap(
    await client.models.EventTicketType.create({
      eventId: event_.id,
      name: "General Admission",
      priceCents: 1000,
      capacity: 100,
      soldCount: 0,
    }),
    "EventTicketType.create",
  );

  return {
    ok: true,
    profileId: profile.id,
    hubId: hub.id,
    hubSlug: hub.slug,
    eventId: event_.id,
    ticketTypeId: ticketType.id,
    openInApp: `/event/${event_.id}`,
  };
};
