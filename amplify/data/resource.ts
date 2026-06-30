import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

import { ticketsCheckout } from "../functions/tickets-checkout/resource";
import { stripeWebhook } from "../functions/stripe-webhook/resource";
import { getTakenSeats } from "../functions/get-taken-seats/resource";
import { postConfirmation } from "../functions/post-confirmation/resource";
import { devSeed } from "../functions/dev-seed/resource";

/**
 * `allow.resource(fn)` (Lambda → data access) resolves under the backend
 * tsconfig but NOT under the app's react-native module-resolution conditions,
 * which also typecheck this file via the imported `Schema`. This shim keeps both
 * typechecks green; `ampx` validates the real authorization wiring at build.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const awsFnAccess = (allow: any): any => allow;

/**
 * Data layer — DynamoDB-native (Amplify Data / AppSync).
 *
 * Faithful port of the Supabase Postgres schema (see docs/SCHEMA.md and
 * lib/supabase/database.types.ts) remodelled for DynamoDB. Amplify supplies
 * `id`, `createdAt` and `updatedAt` on every model, so those are omitted here.
 *
 * Authorization replaces Postgres RLS:
 *   • reference data  → public read (guest + authenticated), admin writes
 *   • profiles/hubs/events → public read of published rows, owner writes
 *   • per-user rows (rsvps, likes, notifications, orders) → owner-scoped
 * Hub-editor/member fine-grained rules (Supabase `is_hub_editor`) are
 * approximated by owner + admin here; tighten with custom resolvers or a
 * per-hub Cognito group during the per-feature port.
 *
 * Deploy:  npx ampx sandbox   (writes amplify_outputs.json for the client)
 */
const schema = a.schema({
  // ---- Reference data (seeded; public read) ---------------------------------
  AustralianState: a
    .model({
      code: a.string().required(),
      name: a.string().required(),
      capitalCity: a.string(),
      timezone: a.string(),
      sortOrder: a.integer(),
    })
    .identifier(["code"])
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  AustralianCouncil: a
    .model({
      absCode: a.string(),
      name: a.string().required(),
      slug: a.string().required(),
      stateCode: a.string().required(),
      traditionalCustodians: a.string().array(),
      region: a.string(),
      population: a.integer(),
      areaSqkm: a.float(),
      website: a.url(),
      isMetro: a.boolean(),
      coordinates: a.string(),
      logoUrl: a.url(),
      metadata: a.json(),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  // ---- Profiles -------------------------------------------------------------
  Profile: a
    .model({
      userId: a.string().required(),
      fullName: a.string(),
      avatarUrl: a.url(),
      bio: a.string(),
      location: a.string(),
      coordinates: a.string(),
      interests: a.string().array(),
      culturalBackground: a.string(),
      indigenousConnection: a.string(),
      preferredLanguages: a.string().array(),
      isPublicProfessional: a.boolean(),
      isAdmin: a.boolean(),
      professionalCategory: a.enum([
        "artist",
        "politician",
        "founder",
        "creative",
        "community_leader",
        "cultural_leader",
        "wellness_practitioner",
        "educator",
        "other",
      ]),
      professionalTitle: a.string(),
      publicBio: a.string(),
      publicLinks: a.json(),
      preferences: a.json(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(["read"]),
      allow.guest().to(["read"]),
      allow.group("admin"),    ]),

  // ---- Hubs -----------------------------------------------------------------
  Hub: a
    .model({
      ownerId: a.string().required(),
      type: a.enum([
        "community_cultural_group",
        "council_government",
        "organisation_association_ngo_charity",
        "club_society",
        "venue_space",
        "business_shop_workshop",
        "wellness",
      ]),
      name: a.string().required(),
      slug: a.string().required(),
      shortDescription: a.string(),
      fullDescription: a.string(),
      welcomeToCountry: a.string(),
      traditionalCustodians: a.string().array(),
      indigenousLed: a.boolean(),
      indigenousPartners: a.string().array(),
      locationState: a.string(),
      locationCouncilId: a.id(),
      locationPostcode: a.string(),
      locationCity: a.string(),
      coordinates: a.string(),
      address: a.string(),
      website: a.url(),
      contactEmail: a.email(),
      phone: a.phone(),
      images: a.json(),
      categories: a.string().array(),
      tags: a.string().array(),
      verificationStatus: a.enum(["pending", "verified", "rejected"]),
      status: a.enum(["draft", "published", "archived"]),
      metadata: a.json(),
      members: a.hasMany("HubMember", "hubId"),
      events: a.hasMany("Event", "hubId"),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(["read"]),
      allow.guest().to(["read"]),
      allow.group("admin"),
    ]),

  HubMember: a
    .model({
      hubId: a.id().required(),
      hub: a.belongsTo("Hub", "hubId"),
      profileId: a.id().required(),
      role: a.enum(["owner", "admin", "editor", "member"]),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(["read"]),
      allow.group("admin"),
    ]),

  // ---- Events ---------------------------------------------------------------
  Event: a
    .model({
      hubId: a.id().required(),
      hub: a.belongsTo("Hub", "hubId"),
      type: a.enum([
        "event",
        "activity",
        "workshop",
        "art",
        "movie",
        "dining",
        "shopping",
        "offer",
        "classes_gym",
        "travel",
        "other",
      ]),
      title: a.string(),
      description: a.string(),
      startTime: a.datetime(),
      endTime: a.datetime(),
      isFree: a.boolean(),
      price: a.float(),
      ticketUrl: a.url(),
      locationCity: a.string(),
      locationState: a.string(),
      locationCouncilId: a.id(),
      coordinates: a.string(),
      capacity: a.integer(),
      rsvpCount: a.integer(),
      images: a.json(),
      tags: a.string().array(),
      culturalFocus: a.string().array(),
      status: a.enum(["draft", "published", "cancelled"]),
      eventDates: a.string().array(),
      hasAssignedSeating: a.boolean(),
      seatingLayout: a.json(),
      venueMapUrl: a.url(),
      rsvps: a.hasMany("EventRsvp", "eventId"),
      cohosts: a.hasMany("EventCohost", "eventId"),
      ticketTypes: a.hasMany("EventTicketType", "eventId"),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.authenticated().to(["read"]),
      allow.guest().to(["read"]),
      allow.group("admin"),    ]),

  EventRsvp: a
    .model({
      eventId: a.id().required(),
      event: a.belongsTo("Event", "eventId"),
      profileId: a.id().required(),
      status: a.enum(["going", "interested", "waitlist", "cancelled"]),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  EventCohost: a
    .model({
      eventId: a.id().required(),
      event: a.belongsTo("Event", "eventId"),
      hubId: a.id(),
      profileId: a.id(),
      role: a.enum(["cohost", "venue", "partner", "sponsor"]),
      status: a.enum(["pending", "accepted", "declined"]),
      invitedBy: a.string().required(),
      message: a.string(),
      respondedAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  // ---- Ticketing (Stripe is the source of truth; orders are written by the
  //      checkout/webhook Lambda, read by the buyer) --------------------------
  EventTicketType: a
    .model({
      eventId: a.id().required(),
      event: a.belongsTo("Event", "eventId"),
      name: a.string().required(),
      priceCents: a.integer().required(),
      capacity: a.integer(),
      soldCount: a.integer(),
      description: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.owner(),
      allow.group("admin"),    ]),

  TicketOrder: a
    .model({
      eventId: a.id(),
      hubId: a.id(),
      buyerId: a.string(),
      eventTitle: a.string(),
      quantity: a.integer(),
      unitAmount: a.integer(),
      amountTotal: a.integer(),
      currency: a.string(),
      status: a.enum(["pending", "paid", "failed", "refunded", "cancelled"]),
      customerEmail: a.email(),
      stripeCheckoutSessionId: a.string(),
      stripePaymentIntentId: a.string(),
      paidAt: a.datetime(),
      ticketTypeId: a.id(),
      selectedDate: a.string(),
      seatNumbers: a.string().array(),
      lineItems: a.json(),
    })
    .authorization((allow) => [allow.owner(), allow.group("admin")]),

  // ---- Social / messaging ---------------------------------------------------
  Notification: a
    .model({
      userId: a.string().required(),
      type: a.string(),
      title: a.string().required(),
      body: a.string(),
      data: a.json(),
      readAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  Conversation: a
    .model({
      hubId: a.id().required(),
      memberId: a.id().required(),
      lastMessageAt: a.datetime(),
      messages: a.hasMany("Message", "conversationId"),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  Message: a
    .model({
      conversationId: a.id().required(),
      conversation: a.belongsTo("Conversation", "conversationId"),
      senderId: a.string().required(),
      body: a.string().required(),
    })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  EventLike: a
    .model({ eventId: a.id().required(), profileId: a.id().required() })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  EventSave: a
    .model({ eventId: a.id().required(), profileId: a.id().required() })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  HubLike: a
    .model({ hubId: a.id().required(), profileId: a.id().required() })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  HubFollow: a
    .model({ hubId: a.id().required(), profileId: a.id().required() })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  ProfileFollow: a
    .model({ followerId: a.id().required(), followingId: a.id().required() })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  ProfileSubscription: a
    .model({ profileId: a.id().required(), subscriberId: a.id().required() })
    .authorization((allow) => [allow.owner(), allow.authenticated().to(["read"])]),

  // ---- Custom operations (Stripe ticketing; Lambda-backed) ------------------
  // The checkout/webhook logic that lived in Supabase edge functions. Prices are
  // resolved server-side; the webhook (Function URL, see backend.ts) is the
  // fulfilment source of truth.
  ticketsCheckout: a
    .mutation()
    .arguments({
      eventId: a.string().required(),
      quantity: a.integer(),
      items: a.string(), // JSON-encoded { ticketTypeId, quantity }[]
      selectedDate: a.string(),
      seatNumbers: a.string().array(),
    })
    .returns(a.customType({ url: a.string(), sessionId: a.string(), error: a.string() }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(ticketsCheckout)),

  getTakenSeats: a
    .query()
    .arguments({ eventId: a.string().required(), selectedDate: a.string() })
    .returns(a.string().array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getTakenSeats)),
})
  // Lambda → data access is granted at the SCHEMA level in data-schema 1.26.0
  // (`allow.resource` is not yet available per-model — see Authorization.js TODO).
  // This lets the Stripe/seat handlers call client.models.* with IAM auth.
  .authorization((allow) => [
    awsFnAccess(allow).resource(ticketsCheckout),
    awsFnAccess(allow).resource(stripeWebhook),
    awsFnAccess(allow).resource(getTakenSeats),
    awsFnAccess(allow).resource(postConfirmation),
    awsFnAccess(allow).resource(devSeed),
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
