import type { BadgeColor } from "@/lib/badge"
import type { JsonObject } from "@/lib/json-definition"
import { uniqueId } from "@/lib/slug"
import {
  definePipeline,
  defineSchema,
  defineWorkflow,
  type JsonSchemaPropertySpec,
} from "@/data/define-records"

export type Organization = {
  id: string
  name: string
  type: string
  location: string
  members: number
  description: string
  status: string
  color: BadgeColor
  networkId?: string
}

export type Schema = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  definition: JsonObject
  color: BadgeColor
  networkId?: string
  organizationId?: string
}

export type WorkflowDefinition = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  schemaId: string
  definition: JsonObject
  networkId?: string
}

export type PipelineDefinition = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  definition: JsonObject
  networkId?: string
}

export type NodeDefinition = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  type: string
  definition: JsonObject
  networkId?: string
}

export type Network = {
  id: string
  name: string
  summary: string
  description: string
  industry: string
  headquarters: string
  coverage: string
  status: string
  color: BadgeColor
  organizations: Organization[]
  schemas: Schema[]
  workflowDefinitions: WorkflowDefinition[]
  pipelineDefinitions: PipelineDefinition[]
  nodeDefinitions?: NodeDefinition[]
}

export const networks: Record<string, Network> = {
  logistics: {
    id: "logistics",
    name: "Logistics",
    summary: "Multi-node supply chain",
    description:
      "Supply chain network connecting origin warehouses, regional hubs, last-mile carriers, and customs around shipments and dispatch notices.",
    industry: "Logistics & Supply Chain",
    headquarters: "Memphis, United States",
    coverage: "4 nodes",
    status: "Active",
    color: "yellow",
    organizations: [
      {
        id: "logistics-origin",
        name: "Origin DC",
        type: "Warehouse",
        location: "Chicago, United States",
        members: 11,
        description:
          "Origin distribution center that releases outbound shipments and inbound ASNs.",
        status: "Active",
        color: "yellow",
      },
      {
        id: "logistics-hub",
        name: "Regional Hub",
        type: "Sortation",
        location: "Memphis, United States",
        members: 9,
        description:
          "Regional sort hub that scans inbound freight and dispatches the next hop.",
        status: "Active",
        color: "orange",
      },
      {
        id: "logistics-last-mile",
        name: "Last Mile",
        type: "Delivery",
        location: "Austin, United States",
        members: 7,
        description:
          "Last-mile operator that receives hub dispatches and captures proof of delivery.",
        status: "Active",
        color: "teal",
      },
      {
        id: "logistics-customs",
        name: "Customs Broker",
        type: "Brokerage",
        location: "Laredo, United States",
        members: 4,
        description:
          "Cross-border brokerage that clears declarations before hub release.",
        status: "Active",
        color: "blue",
      },
    ],
    schemas: [
      defineSchema({
        id: "logistics-purchase-order",
        name: "Purchase Order",
        slug: "purchase-order",
        color: "orange",
        description:
          "Supplier purchase orders that become inbound shipments at the origin DC.",
        properties: {
          poNumber: { type: "string", description: "Purchase order number" },
          supplier: { type: "string", description: "Supplier name" },
          sku: { type: "string", description: "Ordered SKU" },
          quantity: { type: "integer", description: "Units ordered" },
          status: {
            type: "string",
            enum: ["open", "confirmed", "received"],
            description: "PO status",
          },
        },
      }),
      defineSchema({
        id: "logistics-shipment",
        name: "Shipment",
        slug: "shipment",
        color: "yellow",
        description:
          "Canonical shipment moving from origin DC through the hub to last mile. A hub scan triggers a dispatch notice.",
        properties: {
          origin: {
            type: "string",
            description: "Origin node",
          },
          destination: {
            type: "string",
            description: "Destination node",
          },
          status: {
            type: "string",
            enum: [
              "ready",
              "in_transit",
              "at_hub",
              "out_for_delivery",
              "delivered",
            ],
            description: "Shipment status",
          },
          pieces: {
            type: "integer",
            description: "Number of pieces",
          },
          weightKg: {
            type: "number",
            description: "Chargeable weight in kilograms",
          },
          consignee: {
            type: "string",
            description: "Consignee name",
          },
          shipmentId: {
            type: "string",
            description: "Network shipment identifier",
          },
          readyAt: {
            type: "string",
            format: "date-time",
            description: "When the shipment was released",
          },
        },
      }),
      defineSchema({
        id: "logistics-tracking-event",
        name: "Tracking Event",
        slug: "tracking-event",
        color: "blue",
        internal: true,
        description:
          "Scan events published as freight moves through origin, hub, and last mile.",
        properties: {
          eventId: { type: "string", description: "Scan event identifier" },
          shipmentId: {
            type: "string",
            description: "Related shipment",
          },
          facilityId: {
            type: "string",
            description: "Node that produced the scan",
          },
          milestone: {
            type: "string",
            enum: [
              "picked_up",
              "in_transit",
              "at_hub",
              "out_for_delivery",
              "delivered",
            ],
            description: "Normalized milestone",
          },
          scannedAt: {
            type: "string",
            format: "date-time",
            description: "When the scan occurred",
          },
        },
      }),
      defineSchema({
        id: "logistics-dispatch-notice",
        name: "Dispatch Notice",
        slug: "dispatch-notice",
        color: "teal",
        description:
          "Notice created when a shipment is scanned at the hub, then sent to the last-mile carrier.",
        properties: {
          noticeId: { type: "string", description: "Dispatch notice id" },
          shipmentId: { type: "string", description: "Related shipment" },
          carrierId: {
            type: "string",
            description: "Last-mile operator to notify",
          },
          consigneeEmail: {
            type: "string",
            description: "Consignee notification email",
          },
          status: {
            type: "string",
            enum: ["draft", "sent"],
            description: "Notice status",
          },
          sentAt: {
            type: "string",
            format: "date-time",
            description: "When the notice was sent",
          },
        },
      }),
    ],
    workflowDefinitions: [
      defineWorkflow({
        id: "logistics-hub-dispatch",
        name: "Hub Dispatch",
        slug: "hub-dispatch",
        schemaId: "logistics-shipment",
        trigger: { type: "event", event: "shipment.at_hub" },
        steps: [
          {
            id: "identify",
            type: "transform",
            name: "Identify last-mile partner",
          },
          { id: "notice", type: "task", name: "Create dispatch notice" },
          { id: "email", type: "notify", name: "Email last-mile carrier" },
          { id: "track", type: "notify", name: "Publish tracking event" },
        ],
      }),
      defineWorkflow({
        id: "logistics-customs-clearance",
        name: "Customs Clearance",
        slug: "customs-clearance",
        schemaId: "logistics-shipment",
        trigger: { type: "event", event: "shipment.cross_border" },
        steps: [
          { id: "validate", type: "validate", name: "Validate declaration" },
          { id: "broker", type: "task", name: "Brokerage review" },
          { id: "release", type: "http", name: "Release to hub" },
        ],
      }),
      defineWorkflow({
        id: "logistics-last-mile",
        name: "Last-mile Delivery",
        slug: "last-mile-delivery",
        schemaId: "logistics-dispatch-notice",
        trigger: { type: "event", event: "dispatch.sent" },
        steps: [
          { id: "assign", type: "task", name: "Assign courier" },
          { id: "route", type: "transform", name: "Build stop list" },
          { id: "capture", type: "http", name: "Capture proof of delivery" },
        ],
      }),
      defineWorkflow({
        id: "logistics-exception",
        name: "Exception Recovery",
        slug: "exception-recovery",
        schemaId: "logistics-tracking-event",
        active: false,
        trigger: { type: "event", event: "delivery.exception.raised" },
        steps: [
          { id: "classify", type: "transform", name: "Classify exception" },
          { id: "correct", type: "task", name: "Correct address" },
          { id: "reattempt", type: "http", name: "Schedule reattempt" },
        ],
      }),
    ],
    pipelineDefinitions: [
      definePipeline({
        id: "logistics-manifest-ingest",
        name: "Manifest Ingest",
        slug: "manifest-ingest",
        source: { type: "api", name: "Warehouse WMS" },
        stages: [
          { id: "extract", type: "extract", name: "Pull outbound manifests" },
          {
            id: "validate",
            type: "validate",
            name: "Validate shipment schema",
          },
          { id: "publish", type: "publish", name: "Publish to hub workflows" },
        ],
      }),
      definePipeline({
        id: "logistics-scan-stream",
        name: "Scan Event Stream",
        slug: "scan-event-stream",
        source: { type: "stream", name: "Hub scans" },
        stages: [
          { id: "ingest", type: "extract", name: "Ingest scans" },
          { id: "normalize", type: "transform", name: "Normalize milestones" },
          { id: "publish", type: "publish", name: "Publish tracking stream" },
        ],
      }),
      definePipeline({
        id: "logistics-asn-ingest",
        name: "ASN Ingest",
        slug: "asn-ingest",
        active: false,
        source: { type: "file", name: "Supplier ASN" },
        stages: [
          { id: "parse", type: "extract", name: "Parse ASN files" },
          { id: "map", type: "transform", name: "Map to purchase orders" },
          { id: "publish", type: "publish", name: "Stage inbound receiving" },
        ],
      }),
    ],
  },
  cafe: {
    id: "cafe",
    name: "Cafe",
    summary: "Neighborhood cafe network",
    description:
      "Neighborhood cafe network connecting shops, the roastery, and loyalty partners around shared menus and inventory.",
    industry: "Food & Beverage",
    headquarters: "Portland, United States",
    coverage: "12 neighborhoods",
    status: "Active",
    color: "orange",
    organizations: [
      {
        id: "cafe-downtown",
        name: "Downtown Cafe",
        type: "Flagship shop",
        location: "Portland, United States",
        members: 14,
        description:
          "Flagship cafe serving espresso, pastry, and weekday lunch from the downtown storefront.",
        status: "Active",
        color: "orange",
      },
      {
        id: "cafe-university",
        name: "University Cafe",
        type: "Campus shop",
        location: "Eugene, United States",
        members: 8,
        description:
          "Campus cafe covering morning rush, study-hour volume, and student loyalty redemptions.",
        status: "Active",
        color: "teal",
      },
      {
        id: "cafe-airport",
        name: "Airport Cafe",
        type: "Travel retail",
        location: "Portland, United States",
        members: 6,
        description:
          "Airport kiosk focused on grab-and-go drinks and packaged pastry for departing travelers.",
        status: "Active",
        color: "blue",
      },
      {
        id: "cafe-roastery",
        name: "Roastery",
        type: "Production",
        location: "Portland, United States",
        members: 5,
        description:
          "Central roastery supplying beans, pastry prep, and wholesale packs to cafe locations.",
        status: "Active",
        color: "yellow",
      },
    ],
    schemas: [
      defineSchema({
        id: "cafe-menu-item",
        name: "Menu Item",
        slug: "menu-item",
        color: "orange",
        description:
          "Shared drink, pastry, and lunch items published to POS terminals across cafe locations.",
        properties: {
          sku: { type: "string", description: "Menu SKU" },
          name: { type: "string", description: "Display name" },
          category: {
            type: "string",
            enum: ["drink", "pastry", "lunch"],
            description: "Menu category",
          },
          priceCents: {
            type: "integer",
            description: "Base price in cents",
          },
          available: {
            type: "boolean",
            description: "Whether the item is currently sellable",
          },
        },
      }),
      defineSchema({
        id: "cafe-order-ticket",
        name: "Order Ticket",
        slug: "order-ticket",
        color: "purple",
        description:
          "Barista tickets for in-shop, mobile, and kiosk orders including modifiers and pickup status.",
        properties: {
          ticketId: { type: "string", description: "Order ticket id" },
          locationId: {
            type: "string",
            description: "Cafe location that owns the ticket",
          },
          channel: {
            type: "string",
            enum: ["in_shop", "mobile", "kiosk"],
            description: "Order channel",
          },
          itemSkus: {
            type: "array",
            items: { type: "string" },
            description: "Ordered menu SKUs",
          },
          status: {
            type: "string",
            enum: ["queued", "in_progress", "ready", "picked_up"],
            description: "Fulfillment status",
          },
        },
      }),
      defineSchema({
        id: "cafe-loyalty-transaction",
        name: "Loyalty Transaction",
        slug: "loyalty-transaction",
        color: "pink",
        description:
          "Points earned, redeemed, and adjusted across cafe locations and partner apps.",
        properties: {
          transactionId: {
            type: "string",
            description: "Loyalty transaction id",
          },
          memberId: { type: "string", description: "Loyalty member id" },
          type: {
            type: "string",
            enum: ["earn", "redeem", "adjust"],
            description: "Transaction type",
          },
          points: { type: "integer", description: "Points delta" },
          locationId: {
            type: "string",
            description: "Location where the transaction occurred",
          },
        },
      }),
      defineSchema({
        id: "cafe-inventory-count",
        name: "Inventory Count",
        slug: "inventory-count",
        color: "gray",
        active: false,
        internal: true,
        description:
          "Daily bean, milk, and pastry counts used to trigger restock from the roastery.",
        properties: {
          countId: { type: "string", description: "Daily count id" },
          locationId: { type: "string", description: "Cafe location" },
          sku: { type: "string", description: "Inventory SKU" },
          onHand: { type: "number", description: "Units on hand" },
          parLevel: { type: "number", description: "Restock par level" },
          countedAt: {
            type: "string",
            format: "date-time",
            description: "When the count was recorded",
          },
          countSheetFileId: {
            type: "string",
            format: "file",
            description: "Uploaded count sheet",
          },
        },
      }),
    ],
    workflowDefinitions: [
      defineWorkflow({
        id: "cafe-opening-checklist",
        name: "Opening Checklist",
        slug: "opening-checklist",
        schemaId: "cafe-menu-item",
        trigger: { type: "schedule", event: "shop.opens" },
        steps: [
          { id: "equipment", type: "task", name: "Check equipment" },
          { id: "drawer", type: "task", name: "Set cash drawer" },
          { id: "pastry", type: "http", name: "Pull first pastry batch" },
        ],
      }),
      defineWorkflow({
        id: "cafe-order-fulfillment",
        name: "Order Fulfillment",
        slug: "order-fulfillment",
        schemaId: "cafe-order-ticket",
        trigger: { type: "event", event: "order_ticket.created" },
        steps: [
          { id: "route", type: "transform", name: "Route to bar or pastry" },
          { id: "prepare", type: "task", name: "Mark in progress" },
          { id: "ready", type: "notify", name: "Notify pickup" },
        ],
      }),
      defineWorkflow({
        id: "cafe-inventory-reorder",
        name: "Inventory Reorder",
        slug: "inventory-reorder",
        schemaId: "cafe-inventory-count",
        trigger: { type: "event", event: "inventory.below_par" },
        steps: [
          { id: "detect", type: "validate", name: "Confirm low stock" },
          { id: "request", type: "http", name: "Create roastery request" },
        ],
      }),
      defineWorkflow({
        id: "cafe-loyalty-enroll",
        name: "Loyalty Enrollment",
        slug: "loyalty-enrollment",
        schemaId: "cafe-loyalty-transaction",
        active: false,
        trigger: { type: "event", event: "guest.opted_in" },
        steps: [
          { id: "profile", type: "transform", name: "Create loyalty profile" },
          { id: "reward", type: "http", name: "Issue welcome reward" },
          { id: "sync", type: "notify", name: "Sync partner apps" },
        ],
      }),
    ],
    pipelineDefinitions: [
      definePipeline({
        id: "cafe-pos-ingest",
        name: "POS Ingest",
        slug: "pos-ingest",
        source: { type: "api", name: "POS API" },
        stages: [
          { id: "extract", type: "extract", name: "Pull POS tickets" },
          { id: "validate", type: "validate", name: "Validate menu items" },
          { id: "publish", type: "publish", name: "Publish for fulfillment" },
        ],
      }),
      definePipeline({
        id: "cafe-loyalty-sync",
        name: "Loyalty Sync",
        slug: "loyalty-sync",
        source: { type: "api", name: "Loyalty app" },
        stages: [
          { id: "extract", type: "extract", name: "Pull loyalty events" },
          { id: "normalize", type: "transform", name: "Normalize points" },
          { id: "publish", type: "publish", name: "Sync locations" },
        ],
      }),
      definePipeline({
        id: "cafe-inventory-snapshot",
        name: "Inventory Snapshot",
        slug: "inventory-snapshot",
        active: false,
        source: { type: "file", name: "Shop counts" },
        stages: [
          { id: "collect", type: "extract", name: "Collect daily counts" },
          { id: "compare", type: "transform", name: "Compare to par" },
          { id: "publish", type: "publish", name: "Feed reorder workflow" },
        ],
      }),
    ],
  },
  gym: {
    id: "gym",
    name: "Gym",
    summary: "Multi-location fitness network",
    description:
      "Multi-location fitness network connecting clubs, studios, and trainers around memberships, classes, and access control.",
    industry: "Fitness & Wellness",
    headquarters: "Austin, United States",
    coverage: "8 locations",
    status: "Active",
    color: "green",
    organizations: [
      {
        id: "gym-flagship",
        name: "Flagship Gym",
        type: "Full-service club",
        location: "Austin, United States",
        members: 11,
        description:
          "Full-service flagship with weights, cardio, and group fitness for the downtown membership.",
        status: "Active",
        color: "green",
      },
      {
        id: "gym-strength",
        name: "Strength Studio",
        type: "Specialty studio",
        location: "Austin, United States",
        members: 6,
        description:
          "Strength-focused studio offering small-group coaching and personal training blocks.",
        status: "Active",
        color: "red",
      },
      {
        id: "gym-aqua",
        name: "Pool & Aqua",
        type: "Aquatic center",
        location: "Round Rock, United States",
        members: 5,
        description:
          "Aquatic center for lap swim, aqua fitness, and youth lessons tied to the gym membership.",
        status: "Active",
        color: "cyan",
      },
      {
        id: "gym-pt",
        name: "Personal Training",
        type: "Coaching",
        location: "Austin, United States",
        members: 9,
        description:
          "Personal training desk that books sessions across flagship, strength, and aqua locations.",
        status: "Active",
        color: "purple",
      },
    ],
    schemas: [
      defineSchema({
        id: "gym-membership",
        name: "Membership",
        slug: "membership",
        color: "green",
        description:
          "Member profile, plan tier, and access entitlements used by clubs and the front desk.",
        properties: {
          memberId: { type: "string", description: "Member identifier" },
          planTier: {
            type: "string",
            enum: ["basic", "plus", "unlimited"],
            description: "Membership plan",
          },
          status: {
            type: "string",
            enum: ["active", "frozen", "lapsed"],
            description: "Membership status",
          },
          homeClubId: { type: "string", description: "Home club location" },
          startsOn: {
            type: "string",
            format: "date",
            description: "Plan start date",
          },
          endsOn: {
            type: "string",
            format: "date",
            description: "Plan end date",
          },
          waiverFileId: {
            type: "string",
            format: "file",
            description: "Signed membership waiver",
          },
        },
      }),
      defineSchema({
        id: "gym-class-booking",
        name: "Class Booking",
        slug: "class-booking",
        color: "blue",
        description:
          "Group class and personal training reservations with waitlist and cancellation windows.",
        properties: {
          bookingId: { type: "string", description: "Reservation id" },
          memberId: { type: "string", description: "Member identifier" },
          classId: { type: "string", description: "Class or session id" },
          waitlisted: {
            type: "boolean",
            description: "Whether the member is on the waitlist",
          },
          startsAt: {
            type: "string",
            format: "date-time",
            description: "Class start time",
          },
        },
      }),
      defineSchema({
        id: "gym-check-in",
        name: "Check-in Event",
        slug: "check-in-event",
        color: "teal",
        internal: true,
        description:
          "Door and kiosk check-in events used to grant access and count class attendance.",
        properties: {
          checkInId: { type: "string", description: "Check-in event id" },
          memberId: { type: "string", description: "Member identifier" },
          locationId: { type: "string", description: "Club or studio" },
          source: {
            type: "string",
            enum: ["door", "kiosk", "staff"],
            description: "How the check-in was captured",
          },
          checkedInAt: {
            type: "string",
            format: "date-time",
            description: "When access was granted",
          },
        },
      }),
    ],
    workflowDefinitions: [
      defineWorkflow({
        id: "gym-member-onboarding",
        name: "Member Onboarding",
        slug: "member-onboarding",
        schemaId: "gym-membership",
        trigger: { type: "event", event: "membership.created" },
        steps: [
          { id: "waiver", type: "task", name: "Collect waiver" },
          { id: "credentials", type: "http", name: "Issue access credentials" },
          { id: "intro", type: "notify", name: "Book intro session" },
        ],
      }),
      defineWorkflow({
        id: "gym-class-check-in",
        name: "Class Check-in",
        slug: "class-check-in",
        schemaId: "gym-check-in",
        trigger: { type: "event", event: "member.arrives_for_class" },
        steps: [
          { id: "validate", type: "validate", name: "Validate booking" },
          { id: "attend", type: "transform", name: "Record attendance" },
          { id: "promote", type: "http", name: "Promote waitlist" },
        ],
      }),
      defineWorkflow({
        id: "gym-membership-renewal",
        name: "Membership Renewal",
        slug: "membership-renewal",
        schemaId: "gym-membership",
        trigger: { type: "schedule", event: "plan.expires_in_14_days" },
        steps: [
          { id: "offer", type: "notify", name: "Send renewal offer" },
          { id: "payment", type: "http", name: "Process payment" },
          { id: "extend", type: "transform", name: "Extend access" },
        ],
      }),
      defineWorkflow({
        id: "gym-freeze-request",
        name: "Membership Freeze",
        slug: "membership-freeze",
        schemaId: "gym-membership",
        active: false,
        trigger: { type: "event", event: "member.freeze_requested" },
        steps: [
          { id: "eligibility", type: "validate", name: "Review eligibility" },
          { id: "pause", type: "http", name: "Pause billing" },
          { id: "restore", type: "schedule", name: "Schedule access restore" },
        ],
      }),
    ],
    pipelineDefinitions: [
      definePipeline({
        id: "gym-access-stream",
        name: "Access Control Stream",
        slug: "access-control-stream",
        source: { type: "stream", name: "Door readers" },
        stages: [
          { id: "ingest", type: "extract", name: "Ingest door events" },
          { id: "authorize", type: "validate", name: "Authorize member" },
          { id: "publish", type: "publish", name: "Write access log" },
        ],
      }),
      definePipeline({
        id: "gym-booking-ingest",
        name: "Booking Ingest",
        slug: "booking-ingest",
        source: { type: "api", name: "Member app" },
        stages: [
          { id: "extract", type: "extract", name: "Pull bookings" },
          { id: "validate", type: "validate", name: "Validate class capacity" },
          { id: "publish", type: "publish", name: "Publish to schedules" },
        ],
      }),
      definePipeline({
        id: "gym-billing-sync",
        name: "Billing Sync",
        slug: "billing-sync",
        source: { type: "api", name: "Billing provider" },
        stages: [
          { id: "extract", type: "extract", name: "Pull dues and packs" },
          { id: "reconcile", type: "transform", name: "Reconcile failures" },
          { id: "publish", type: "publish", name: "Sync membership status" },
        ],
      }),
    ],
  },
  dentist: {
    id: "dentist",
    name: "Dentist Office",
    summary: "Dental practice network",
    description:
      "Dental practice network connecting family, pediatric, and orthodontic offices around patients, appointments, and claims.",
    industry: "Healthcare",
    headquarters: "Chicago, United States",
    coverage: "6 practices",
    status: "Active",
    color: "cyan",
    organizations: [
      {
        id: "dentist-family",
        name: "Family Practice",
        type: "General dentistry",
        location: "Chicago, United States",
        members: 10,
        description:
          "General dentistry practice for cleanings, restorations, and recall across family patients.",
        status: "Active",
        color: "blue",
      },
      {
        id: "dentist-pediatric",
        name: "Pediatric Dentistry",
        type: "Pediatric",
        location: "Evanston, United States",
        members: 7,
        description:
          "Pediatric office for first visits, sealants, and child-friendly restorative care.",
        status: "Active",
        color: "pink",
      },
      {
        id: "dentist-ortho",
        name: "Orthodontics",
        type: "Specialty",
        location: "Oak Park, United States",
        members: 6,
        description:
          "Orthodontic specialty for alignments, retainers, and treatment-plan progress checks.",
        status: "Active",
        color: "purple",
      },
    ],
    schemas: [
      defineSchema({
        id: "dentist-patient-record",
        name: "Patient Record",
        slug: "patient-record",
        color: "blue",
        description:
          "Patient demographics, history, and consent used by every office in the dental network.",
        properties: {
          patientId: { type: "string", description: "Patient identifier" },
          givenName: { type: "string", description: "Given name" },
          familyName: { type: "string", description: "Family name" },
          dateOfBirth: {
            type: "string",
            format: "date",
            description: "Date of birth",
          },
          insuranceMemberId: {
            type: "string",
            description: "Payer member id",
          },
          consentOnFile: {
            type: "boolean",
            description: "Whether treatment consent is on file",
          },
          consentFileId: {
            type: "string",
            format: "file",
            description: "Signed consent document",
          },
        },
      }),
      defineSchema({
        id: "dentist-appointment",
        name: "Appointment",
        slug: "appointment",
        color: "cyan",
        description:
          "Chair-time bookings with provider, operatory, and reminder status across practices.",
        properties: {
          appointmentId: { type: "string", description: "Appointment id" },
          patientId: { type: "string", description: "Patient identifier" },
          providerId: { type: "string", description: "Treating provider" },
          operatory: { type: "string", description: "Chair or operatory" },
          startsAt: {
            type: "string",
            format: "date-time",
            description: "Appointment start",
          },
          reminderStatus: {
            type: "string",
            enum: ["pending", "sent", "confirmed", "declined"],
            description: "Reminder state",
          },
        },
      }),
      defineSchema({
        id: "dentist-treatment-plan",
        name: "Treatment Plan",
        slug: "treatment-plan",
        color: "teal",
        description:
          "Proposed procedures, sequencing, and estimated cost shared with patients and specialists.",
        properties: {
          planId: { type: "string", description: "Treatment plan id" },
          patientId: { type: "string", description: "Patient identifier" },
          procedureCodes: {
            type: "array",
            items: { type: "string" },
            description: "CDT procedure codes",
          },
          estimatedCostCents: {
            type: "integer",
            description: "Estimated patient cost in cents",
          },
          status: {
            type: "string",
            enum: ["proposed", "accepted", "in_progress", "complete"],
            description: "Plan status",
          },
          planFileId: {
            type: "string",
            format: "file",
            description: "Treatment plan PDF",
          },
        },
      }),
      defineSchema({
        id: "dentist-insurance-claim",
        name: "Insurance Claim",
        slug: "insurance-claim",
        color: "orange",
        description:
          "Dental insurance claims submitted to payers after treatment is completed.",
        properties: {
          claimId: { type: "string", description: "Claim identifier" },
          patientId: { type: "string", description: "Patient identifier" },
          payerId: { type: "string", description: "Insurance payer" },
          amountCents: {
            type: "integer",
            description: "Billed amount in cents",
          },
          status: {
            type: "string",
            enum: ["submitted", "paid", "denied", "pending"],
            description: "Claim status",
          },
        },
      }),
    ],
    workflowDefinitions: [
      defineWorkflow({
        id: "dentist-patient-intake",
        name: "Patient Intake",
        slug: "patient-intake",
        schemaId: "dentist-patient-record",
        trigger: { type: "event", event: "new_patient.scheduled" },
        steps: [
          { id: "history", type: "task", name: "Collect history" },
          { id: "insurance", type: "http", name: "Verify insurance" },
          { id: "consent", type: "task", name: "Capture consent" },
        ],
      }),
      defineWorkflow({
        id: "dentist-appointment-reminders",
        name: "Appointment Reminders",
        slug: "appointment-reminders",
        schemaId: "dentist-appointment",
        trigger: { type: "schedule", event: "appointment.in_48_hours" },
        steps: [
          { id: "send", type: "notify", name: "Send SMS and email" },
          { id: "reschedule", type: "http", name: "Offer reschedule link" },
        ],
      }),
      defineWorkflow({
        id: "dentist-insurance-preauth",
        name: "Insurance Pre-authorization",
        slug: "insurance-preauthorization",
        schemaId: "dentist-treatment-plan",
        trigger: { type: "event", event: "treatment_plan.approved" },
        steps: [
          { id: "submit", type: "http", name: "Submit pre-authorization" },
          { id: "hold", type: "task", name: "Hold chair time" },
          { id: "release", type: "gateway", name: "Wait for payer" },
        ],
      }),
      defineWorkflow({
        id: "dentist-claim-follow-up",
        name: "Claim Follow-up",
        slug: "claim-follow-up",
        schemaId: "dentist-insurance-claim",
        active: false,
        trigger: { type: "schedule", event: "claim.unpaid_after_30_days" },
        steps: [
          { id: "review", type: "task", name: "Review denial" },
          { id: "correct", type: "transform", name: "Correct coding" },
          { id: "resubmit", type: "http", name: "Resubmit claim" },
        ],
      }),
    ],
    pipelineDefinitions: [
      definePipeline({
        id: "dentist-ehr-ingest",
        name: "EHR Ingest",
        slug: "ehr-ingest",
        source: { type: "api", name: "Practice EHR" },
        stages: [
          { id: "extract", type: "extract", name: "Pull patient records" },
          { id: "validate", type: "validate", name: "Validate demographics" },
          { id: "publish", type: "publish", name: "Publish shared schemas" },
        ],
      }),
      definePipeline({
        id: "dentist-claims-submit",
        name: "Claims Submit",
        slug: "claims-submit",
        source: { type: "api", name: "Completed treatment" },
        stages: [
          { id: "map", type: "transform", name: "Map treatment to claim" },
          { id: "validate", type: "validate", name: "Validate claim schema" },
          { id: "submit", type: "publish", name: "Submit to payer" },
        ],
      }),
      definePipeline({
        id: "dentist-reminder-dispatch",
        name: "Reminder Dispatch",
        slug: "reminder-dispatch",
        source: { type: "api", name: "Appointment calendar" },
        stages: [
          { id: "select", type: "extract", name: "Select upcoming visits" },
          { id: "dispatch", type: "publish", name: "Dispatch reminders" },
          { id: "record", type: "transform", name: "Record confirmations" },
        ],
      }),
    ],
  },
  personal: {
    id: "personal",
    name: "Personal",
    summary: "Household workspace",
    description:
      "Personal workspace connecting home, work, and family around expenses, tasks, and contacts.",
    industry: "Personal",
    headquarters: "Seattle, United States",
    coverage: "1 household",
    status: "Active",
    color: "purple",
    organizations: [
      {
        id: "personal-home",
        name: "Home",
        type: "Household",
        location: "Seattle, United States",
        members: 3,
        description:
          "Household bills, groceries, and the day-to-day running of the house.",
        status: "Active",
        color: "orange",
      },
      {
        id: "personal-work",
        name: "Work",
        type: "Career",
        location: "Seattle, United States",
        members: 1,
        description:
          "Freelance invoices, contracts, and work tasks kept next to household records.",
        status: "Active",
        color: "blue",
      },
      {
        id: "personal-family",
        name: "Family",
        type: "Shared",
        location: "Seattle, United States",
        members: 4,
        description:
          "Shared calendar, contacts, and reminders for family members.",
        status: "Active",
        color: "pink",
      },
    ],
    schemas: [
      defineSchema({
        id: "personal-expense",
        name: "Expense",
        slug: "expense",
        color: "purple",
        description:
          "Household and work expenses with category, due date, and optional receipt.",
        properties: {
          expenseId: { type: "string", description: "Expense identifier" },
          merchant: { type: "string", description: "Payee or merchant" },
          amountCents: {
            type: "integer",
            description: "Amount in cents",
          },
          category: {
            type: "string",
            enum: ["groceries", "utilities", "rent", "dining", "travel"],
            description: "Spend category",
          },
          status: {
            type: "string",
            enum: ["due", "paid", "reimbursed"],
            description: "Payment status",
          },
          dueOn: {
            type: "string",
            format: "date",
            description: "When the bill is due",
          },
          receiptFileId: {
            type: "string",
            format: "file",
            description: "Uploaded receipt",
          },
        },
      }),
      defineSchema({
        id: "personal-task",
        name: "Task",
        slug: "task",
        color: "teal",
        description:
          "Open work across home, career, and family with a due date and status.",
        properties: {
          taskId: { type: "string", description: "Task identifier" },
          title: { type: "string", description: "What needs doing" },
          area: {
            type: "string",
            enum: ["home", "work", "family"],
            description: "Which area owns the task",
          },
          status: {
            type: "string",
            enum: ["open", "doing", "done"],
            description: "Task status",
          },
          dueAt: {
            type: "string",
            format: "date-time",
            description: "When it is due",
          },
        },
      }),
      defineSchema({
        id: "personal-contact",
        name: "Contact",
        slug: "contact",
        color: "cyan",
        description:
          "People the household keeps in one place—family, sitters, and vendors.",
        properties: {
          contactId: { type: "string", description: "Contact identifier" },
          displayName: { type: "string", description: "Display name" },
          relationship: {
            type: "string",
            enum: ["family", "work", "vendor", "friend"],
            description: "How they relate to the household",
          },
          phone: { type: "string", description: "Phone number" },
          email: { type: "string", description: "Email address" },
        },
      }),
      defineSchema({
        id: "personal-subscription",
        name: "Subscription",
        slug: "subscription",
        color: "gray",
        active: false,
        internal: true,
        description:
          "Recurring charges watched so renewals can be cancelled or paid on time.",
        properties: {
          subscriptionId: {
            type: "string",
            description: "Subscription identifier",
          },
          vendor: { type: "string", description: "Service vendor" },
          amountCents: {
            type: "integer",
            description: "Recurring amount in cents",
          },
          cadence: {
            type: "string",
            enum: ["monthly", "yearly"],
            description: "Billing cadence",
          },
          nextChargeOn: {
            type: "string",
            format: "date",
            description: "Next charge date",
          },
        },
      }),
    ],
    workflowDefinitions: [
      defineWorkflow({
        id: "personal-bill-reminder",
        name: "Bill Reminder",
        slug: "bill-reminder",
        schemaId: "personal-expense",
        trigger: { type: "schedule", event: "expense.due_in_3_days" },
        steps: [
          { id: "notify", type: "notify", name: "Send due reminder" },
          { id: "pay", type: "task", name: "Mark paid or snooze" },
        ],
      }),
      defineWorkflow({
        id: "personal-expense-reimburse",
        name: "Expense Reimburse",
        slug: "expense-reimburse",
        schemaId: "personal-expense",
        trigger: { type: "event", event: "expense.marked_work" },
        steps: [
          { id: "attach", type: "task", name: "Attach receipt" },
          { id: "submit", type: "http", name: "Submit for reimbursement" },
          { id: "close", type: "transform", name: "Mark reimbursed" },
        ],
      }),
      defineWorkflow({
        id: "personal-task-follow-up",
        name: "Task Follow-up",
        slug: "task-follow-up",
        schemaId: "personal-task",
        trigger: { type: "schedule", event: "task.overdue" },
        steps: [
          { id: "bump", type: "notify", name: "Nudge the owner" },
          { id: "reschedule", type: "task", name: "Reschedule or close" },
        ],
      }),
      defineWorkflow({
        id: "personal-subscription-renewal",
        name: "Subscription Renewal",
        slug: "subscription-renewal",
        schemaId: "personal-subscription",
        active: false,
        trigger: { type: "schedule", event: "subscription.renews_in_7_days" },
        steps: [
          { id: "review", type: "task", name: "Review the charge" },
          { id: "cancel", type: "http", name: "Cancel or keep" },
        ],
      }),
    ],
    pipelineDefinitions: [
      definePipeline({
        id: "personal-bank-ingest",
        name: "Bank CSV Ingest",
        slug: "bank-csv-ingest",
        source: { type: "file", name: "Bank export" },
        stages: [
          { id: "parse", type: "extract", name: "Parse CSV rows" },
          { id: "validate", type: "validate", name: "Validate expense schema" },
          {
            id: "publish",
            type: "publish",
            name: "Publish household expenses",
          },
        ],
      }),
      definePipeline({
        id: "personal-calendar-sync",
        name: "Calendar Sync",
        slug: "calendar-sync",
        source: { type: "api", name: "Calendar" },
        stages: [
          { id: "extract", type: "extract", name: "Pull calendar events" },
          { id: "map", type: "transform", name: "Map to tasks" },
          { id: "publish", type: "publish", name: "Publish due tasks" },
        ],
      }),
      definePipeline({
        id: "personal-receipt-capture",
        name: "Receipt Capture",
        slug: "receipt-capture",
        active: false,
        source: { type: "file", name: "Receipt photos" },
        stages: [
          { id: "ingest", type: "extract", name: "Ingest receipts" },
          { id: "match", type: "transform", name: "Match to expenses" },
          { id: "publish", type: "publish", name: "Attach files" },
        ],
      }),
    ],
  },
  portfolio: {
    id: "portfolio",
    name: "Private Equity",
    summary: "Real estate private equity firm",
    description:
      "Real estate private equity firm connecting the GP, funds, and investor relations around properties, commitments, and distribution notices.",
    industry: "Real Estate / Private Equity",
    headquarters: "Chicago, United States",
    coverage: "14 properties",
    status: "Active",
    color: "blue",
    organizations: [
      {
        id: "portfolio-gp",
        name: "Alder Partners",
        type: "General partner",
        location: "Chicago, United States",
        members: 9,
        description:
          "General partner originating deals, setting fund strategy, and approving asset sales.",
        status: "Active",
        color: "blue",
      },
      {
        id: "portfolio-fund-iii",
        name: "Fund III",
        type: "Closed-end fund",
        location: "Chicago, United States",
        members: 6,
        description:
          "2019 vintage core-plus fund holding multifamily and industrial assets through harvest.",
        status: "Active",
        color: "purple",
      },
      {
        id: "portfolio-opportunity",
        name: "Opportunity Fund",
        type: "Value-add fund",
        location: "Austin, United States",
        members: 5,
        description:
          "Value-add fund for recapitalizations and shorter-hold dispositions.",
        status: "Active",
        color: "teal",
      },
      {
        id: "portfolio-ir",
        name: "Investor Relations",
        type: "LP servicing",
        location: "Chicago, United States",
        members: 4,
        description:
          "Investor relations desk that maintains LP records and sends capital calls and distribution notices.",
        status: "Active",
        color: "orange",
      },
    ],
    schemas: [
      defineSchema({
        id: "portfolio-investor",
        name: "Investor",
        slug: "investor",
        color: "orange",
        description:
          "Limited partner records used to email capital calls and distribution notices.",
        properties: {
          investorId: { type: "string", description: "Investor identifier" },
          legalName: {
            type: "string",
            description: "Legal name on the subscription",
          },
          email: { type: "string", description: "Notice email address" },
          type: {
            type: "string",
            enum: ["individual", "family_office", "institution"],
            description: "Investor type",
          },
        },
      }),
      defineSchema({
        id: "portfolio-fund",
        name: "Fund",
        slug: "fund",
        color: "purple",
        description:
          "Closed-end vehicles that own properties and have a set of committed investors.",
        properties: {
          fundId: { type: "string", description: "Fund identifier" },
          name: { type: "string", description: "Fund display name" },
          vintageYear: { type: "integer", description: "Vintage year" },
          status: {
            type: "string",
            enum: ["investing", "harvesting", "closed"],
            description: "Fund lifecycle",
          },
        },
      }),
      defineSchema({
        id: "portfolio-commitment",
        name: "Commitment",
        slug: "commitment",
        color: "cyan",
        description:
          "An investor's committed capital in a specific fund—the join used to fan out notices.",
        properties: {
          commitmentId: {
            type: "string",
            description: "Commitment identifier",
          },
          investorId: { type: "string", description: "Investor identifier" },
          fundId: { type: "string", description: "Fund the investor is in" },
          commitmentCents: {
            type: "integer",
            description: "Committed capital in cents",
          },
          status: {
            type: "string",
            enum: ["committed", "funded", "exited"],
            description: "Commitment status",
          },
        },
      }),
      defineSchema({
        id: "portfolio-property",
        name: "Property",
        slug: "property",
        color: "blue",
        description:
          "Investment properties owned by a fund. A sale triggers distribution notices to that fund's investors.",
        properties: {
          name: { type: "string", description: "Property name" },
          city: { type: "string", description: "City" },
          fundId: {
            type: "string",
            description: "Fund that owns the property",
          },
          status: {
            type: "string",
            enum: ["held", "under_contract", "sold"],
            description: "Asset status",
          },
          salePriceCents: {
            type: "integer",
            description: "Sale price in cents",
          },
          soldOn: {
            type: "string",
            format: "date",
            description: "Closing date when sold",
          },
          propertyId: { type: "string", description: "Property identifier" },
          closingFileId: {
            type: "string",
            format: "file",
            description: "Closing statement",
          },
        },
      }),
      defineSchema({
        id: "portfolio-distribution-notice",
        name: "Distribution Notice",
        slug: "distribution-notice",
        color: "teal",
        description:
          "Per-investor notice created when a property is sold, then emailed to limited partners in that fund.",
        properties: {
          noticeId: { type: "string", description: "Notice identifier" },
          propertyId: { type: "string", description: "Sold property" },
          fundId: {
            type: "string",
            description: "Fund that owned the property",
          },
          investorId: {
            type: "string",
            description: "Investor receiving the notice",
          },
          amountCents: {
            type: "integer",
            description: "Distribution amount in cents",
          },
          status: {
            type: "string",
            enum: ["draft", "sent"],
            description: "Notice status",
          },
          sentAt: {
            type: "string",
            format: "date-time",
            description: "When the email was sent",
          },
          noticeFileId: {
            type: "string",
            format: "file",
            description: "PDF notice attached to the email",
          },
        },
      }),
    ],
    workflowDefinitions: [
      defineWorkflow({
        id: "portfolio-distribution-notice",
        name: "Distribution Notice",
        slug: "distribution-notice",
        schemaId: "portfolio-property",
        trigger: { type: "event", event: "property.sold" },
        steps: [
          { id: "investors", type: "transform", name: "Match fund investors" },
          { id: "allocate", type: "transform", name: "Allocate sale proceeds" },
          { id: "notice", type: "task", name: "Create distribution notices" },
          { id: "email", type: "notify", name: "Email investors" },
        ],
      }),
      defineWorkflow({
        id: "portfolio-capital-call",
        name: "Capital Call",
        slug: "capital-call",
        schemaId: "portfolio-commitment",
        trigger: { type: "event", event: "acquisition.funded" },
        steps: [
          { id: "prorate", type: "transform", name: "Prorate by commitment" },
          { id: "notice", type: "task", name: "Issue capital call notices" },
          { id: "email", type: "notify", name: "Email investors" },
        ],
      }),
      defineWorkflow({
        id: "portfolio-acquisition-close",
        name: "Acquisition Close",
        slug: "acquisition-close",
        schemaId: "portfolio-property",
        trigger: { type: "event", event: "property.under_contract" },
        steps: [
          { id: "diligence", type: "task", name: "Complete diligence" },
          { id: "wire", type: "http", name: "Wire closing funds" },
          { id: "record", type: "transform", name: "Mark property held" },
        ],
      }),
      defineWorkflow({
        id: "portfolio-k1-package",
        name: "K-1 Package",
        slug: "k1-package",
        schemaId: "portfolio-investor",
        active: false,
        trigger: { type: "schedule", event: "tax_year.closed" },
        steps: [
          { id: "assemble", type: "task", name: "Assemble K-1 packets" },
          { id: "email", type: "notify", name: "Email investors" },
        ],
      }),
    ],
    pipelineDefinitions: [
      definePipeline({
        id: "portfolio-closing-ingest",
        name: "Closing Statement Ingest",
        slug: "closing-statement-ingest",
        source: { type: "file", name: "Escrow closing package" },
        stages: [
          { id: "parse", type: "extract", name: "Parse closing statement" },
          {
            id: "validate",
            type: "validate",
            name: "Validate property schema",
          },
          { id: "sold", type: "transform", name: "Mark property sold" },
          { id: "publish", type: "publish", name: "Publish to workflows" },
        ],
      }),
      definePipeline({
        id: "portfolio-investor-crm",
        name: "Investor CRM Sync",
        slug: "investor-crm-sync",
        source: { type: "api", name: "LP portal" },
        stages: [
          { id: "extract", type: "extract", name: "Pull investor records" },
          { id: "validate", type: "validate", name: "Validate emails" },
          { id: "publish", type: "publish", name: "Sync commitments" },
        ],
      }),
      definePipeline({
        id: "portfolio-fund-admin",
        name: "Fund Admin Export",
        slug: "fund-admin-export",
        active: false,
        source: { type: "api", name: "Fund administrator" },
        stages: [
          {
            id: "extract",
            type: "extract",
            name: "Pull capital account activity",
          },
          { id: "map", type: "transform", name: "Map to notices" },
          { id: "publish", type: "publish", name: "Publish distributions" },
        ],
      }),
    ],
  },
}

const workspaceListeners = new Set<() => void>()
let workspaceVersion = 0

export function subscribeWorkspace(listener: () => void) {
  workspaceListeners.add(listener)
  return () => {
    workspaceListeners.delete(listener)
  }
}

export function getWorkspaceVersion() {
  return workspaceVersion
}

function refreshDerivedLists() {
  networkList = Object.values(networks)
  organizationList = networkList.flatMap((network) =>
    network.organizations.map((organization) => ({ organization, network }))
  )
  schemaList = networkList.flatMap((network) =>
    network.schemas.map((schema) => ({ schema, network }))
  )
  workflowDefinitionList = networkList.flatMap((network) =>
    network.workflowDefinitions.map((workflowDefinition) => ({
      workflowDefinition,
      network,
    }))
  )
  pipelineDefinitionList = networkList.flatMap((network) =>
    network.pipelineDefinitions.map((pipelineDefinition) => ({
      pipelineDefinition,
      network,
    }))
  )
}

export function emitWorkspace() {
  workspaceVersion += 1
  refreshDerivedLists()
  workspaceListeners.forEach((listener) => listener())
}

export let networkList = Object.values(networks)

export let organizationList = networkList.flatMap((network) =>
  network.organizations.map((organization) => ({ organization, network }))
)

export function getOrganization(organizationId: string) {
  return organizationList.find(
    ({ organization }) => organization.id === organizationId
  )
}

export let schemaList = networkList.flatMap((network) =>
  network.schemas.map((schema) => ({ schema, network }))
)

export function getSchema(schemaId: string) {
  return schemaList.find(({ schema }) => schema.id === schemaId)
}

export let workflowDefinitionList = networkList.flatMap((network) =>
  network.workflowDefinitions.map((workflowDefinition) => ({
    workflowDefinition,
    network,
  }))
)

export function getWorkflowDefinition(workflowDefinitionId: string) {
  return workflowDefinitionList.find(
    ({ workflowDefinition }) => workflowDefinition.id === workflowDefinitionId
  )
}

export let pipelineDefinitionList = networkList.flatMap((network) =>
  network.pipelineDefinitions.map((pipelineDefinition) => ({
    pipelineDefinition,
    network,
  }))
)

export function getPipelineDefinition(pipelineDefinitionId: string) {
  return pipelineDefinitionList.find(
    ({ pipelineDefinition }) => pipelineDefinition.id === pipelineDefinitionId
  )
}

export type CreateNetworkInput = {
  name: string
  summary?: string
  description?: string
  industry?: string
  headquarters?: string
  coverage?: string
  color?: BadgeColor
}

export type CreateOrganizationInput = {
  name: string
  type?: string
  location?: string
  description?: string
  color?: BadgeColor
}

export function createNetwork(input: CreateNetworkInput): Network {
  const name = input.name.trim()
  const id = uniqueId(name, (candidate) => candidate in networks)
  const network: Network = {
    id,
    name,
    summary: input.summary?.trim() || "New partner network",
    description:
      input.description?.trim() ||
      `${name} network for partner organizations, shared schemas, and definitions.`,
    industry: input.industry?.trim() || "General",
    headquarters: input.headquarters?.trim() || "—",
    coverage: input.coverage?.trim() || "—",
    status: "Draft",
    color: input.color ?? "purple",
    organizations: [],
    schemas: [],
    workflowDefinitions: [],
    pipelineDefinitions: [],
  }

  networks[id] = network
  emitWorkspace()
  return network
}

export function createOrganization(
  networkId: string,
  input: CreateOrganizationInput
): Organization {
  const network = networks[networkId]
  if (!network) {
    throw new Error(`Network ${networkId} was not found.`)
  }

  const name = input.name.trim()
  const id = uniqueId(name, (candidate) =>
    Object.values(networks).some((item) =>
      item.organizations.some((organization) => organization.id === candidate)
    )
  )
  const organization: Organization = {
    id,
    name,
    type: input.type?.trim() || "Member",
    location: input.location?.trim() || "—",
    members: 1,
    description: input.description?.trim() || `${name} organization.`,
    status: "Draft",
    color: input.color ?? network.color,
  }

  network.organizations = [...network.organizations, organization]
  emitWorkspace()
  return organization
}

function takenSchemaId(id: string) {
  return Object.values(networks).some((network) =>
    network.schemas.some((schema) => schema.id === id)
  )
}

function takenWorkflowId(id: string) {
  return Object.values(networks).some((network) =>
    network.workflowDefinitions.some((item) => item.id === id)
  )
}

function takenPipelineId(id: string) {
  return Object.values(networks).some((network) =>
    network.pipelineDefinitions.some((item) => item.id === id)
  )
}

function takenSchemaSlug(networkId: string, slug: string, exceptId?: string) {
  return (
    networks[networkId]?.schemas.some(
      (schema) => schema.slug === slug && schema.id !== exceptId
    ) ?? false
  )
}

export type CreateSchemaInput = {
  name: string
  slug?: string
  description?: string
  color?: BadgeColor
  active?: boolean
  internal?: boolean
  properties: Record<string, JsonSchemaPropertySpec>
  required?: string[]
}

export function createSchema(
  networkId: string,
  input: CreateSchemaInput
): Schema {
  const network = networks[networkId]
  if (!network) {
    throw new Error(`Network ${networkId} was not found.`)
  }

  const name = input.name.trim()
  const slug = uniqueId(input.slug?.trim() || name, (candidate) =>
    takenSchemaSlug(networkId, candidate)
  )
  const schema = defineSchema({
    id: uniqueId(`${networkId}-${slug}`, takenSchemaId),
    name,
    slug,
    color: input.color ?? "purple",
    description: input.description?.trim() || `${name} schema.`,
    properties: input.properties,
    required: input.required,
    active: input.active ?? false,
    internal: input.internal ?? false,
  })

  network.schemas = [...network.schemas, schema]
  emitWorkspace()
  return schema
}

export function updateSchema(
  schemaId: string,
  input: CreateSchemaInput
): Schema {
  const result = getSchema(schemaId)
  if (!result) {
    throw new Error(`Schema ${schemaId} was not found.`)
  }

  const updated = defineSchema({
    id: result.schema.id,
    name: input.name.trim(),
    slug: result.schema.slug,
    color: input.color ?? result.schema.color,
    description:
      input.description?.trim() ||
      (typeof result.schema.definition.description === "string"
        ? result.schema.definition.description
        : `${input.name.trim()} schema.`),
    properties: input.properties,
    required: input.required,
    active: input.active ?? result.schema.active,
    internal: input.internal ?? result.schema.internal,
  })

  result.network.schemas = result.network.schemas.map((schema) =>
    schema.id === schemaId ? updated : schema
  )
  emitWorkspace()
  return updated
}

export type CreateWorkflowInput = {
  name: string
  slug?: string
  schemaId: string
  triggerType?: string
  triggerEvent?: string
  steps: { id: string; type: string; name: string }[]
  active?: boolean
  internal?: boolean
}

export function createWorkflowDefinition(
  networkId: string,
  input: CreateWorkflowInput
): WorkflowDefinition {
  const network = networks[networkId]
  if (!network) {
    throw new Error(`Network ${networkId} was not found.`)
  }

  const name = input.name.trim()
  const slug = uniqueId(input.slug?.trim() || name, (candidate) =>
    network.workflowDefinitions.some((item) => item.slug === candidate)
  )
  const workflowDefinition = defineWorkflow({
    id: uniqueId(`${networkId}-${slug}`, takenWorkflowId),
    name,
    slug,
    schemaId: input.schemaId,
    trigger: {
      type: input.triggerType?.trim() || "event",
      event: input.triggerEvent?.trim() || `${slug}.created`,
    },
    steps: input.steps,
    active: input.active ?? false,
    internal: input.internal ?? false,
  })

  network.workflowDefinitions = [
    ...network.workflowDefinitions,
    workflowDefinition,
  ]
  emitWorkspace()
  return workflowDefinition
}

export function updateWorkflowDefinition(
  workflowDefinitionId: string,
  input: CreateWorkflowInput
): WorkflowDefinition {
  const result = getWorkflowDefinition(workflowDefinitionId)
  if (!result) {
    throw new Error(
      `Workflow definition ${workflowDefinitionId} was not found.`
    )
  }

  const updated = defineWorkflow({
    id: result.workflowDefinition.id,
    name: input.name.trim(),
    slug: result.workflowDefinition.slug,
    schemaId: input.schemaId,
    trigger: {
      type: input.triggerType?.trim() || "event",
      event:
        input.triggerEvent?.trim() ||
        `${result.workflowDefinition.slug}.updated`,
    },
    steps: input.steps,
    active: input.active ?? result.workflowDefinition.active,
    internal: input.internal ?? result.workflowDefinition.internal,
  })

  result.network.workflowDefinitions = result.network.workflowDefinitions.map(
    (item) => (item.id === workflowDefinitionId ? updated : item)
  )
  emitWorkspace()
  return updated
}

export type CreatePipelineInput = {
  name: string
  slug?: string
  sourceType?: string
  sourceName?: string
  stages: { id: string; type: string; name: string }[]
  active?: boolean
  internal?: boolean
}

export function createPipelineDefinition(
  networkId: string,
  input: CreatePipelineInput
): PipelineDefinition {
  const network = networks[networkId]
  if (!network) {
    throw new Error(`Network ${networkId} was not found.`)
  }

  const name = input.name.trim()
  const slug = uniqueId(input.slug?.trim() || name, (candidate) =>
    network.pipelineDefinitions.some((item) => item.slug === candidate)
  )
  const pipelineDefinition = definePipeline({
    id: uniqueId(`${networkId}-${slug}`, takenPipelineId),
    name,
    slug,
    source: {
      type: input.sourceType?.trim() || "api",
      name: input.sourceName?.trim() || "Partner API",
    },
    stages: input.stages,
    active: input.active ?? false,
    internal: input.internal ?? false,
  })

  network.pipelineDefinitions = [
    ...network.pipelineDefinitions,
    pipelineDefinition,
  ]
  emitWorkspace()
  return pipelineDefinition
}

export function updatePipelineDefinition(
  pipelineDefinitionId: string,
  input: CreatePipelineInput
): PipelineDefinition {
  const result = getPipelineDefinition(pipelineDefinitionId)
  if (!result) {
    throw new Error(
      `Pipeline definition ${pipelineDefinitionId} was not found.`
    )
  }

  const updated = definePipeline({
    id: result.pipelineDefinition.id,
    name: input.name.trim(),
    slug: result.pipelineDefinition.slug,
    source: {
      type: input.sourceType?.trim() || "api",
      name: input.sourceName?.trim() || "Partner API",
    },
    stages: input.stages,
    active: input.active ?? result.pipelineDefinition.active,
    internal: input.internal ?? result.pipelineDefinition.internal,
  })

  result.network.pipelineDefinitions = result.network.pipelineDefinitions.map(
    (item) => (item.id === pipelineDefinitionId ? updated : item)
  )
  emitWorkspace()
  return updated
}
