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
}

export type WorkflowDefinition = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  schemaId: string
  definition: JsonObject
}

export type PipelineDefinition = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  definition: JsonObject
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
}

export const networks: Record<string, Network> = {
  dhl: {
    id: "dhl",
    name: "DHL",
    summary: "Global logistics network",
    description:
      "Global logistics network connecting carriers, warehouses, and last-mile partners.",
    industry: "Logistics & Supply Chain",
    headquarters: "Bonn, Germany",
    coverage: "220+ countries",
    status: "Active",
    color: "yellow",
    organizations: [
      {
        id: "dhl-apac",
        name: "DHL APAC",
        type: "Express delivery",
        location: "Singapore",
        members: 12,
        description:
          "Asia-Pacific express operations covering regional hubs, customs, and last-mile partners.",
        status: "Active",
        color: "yellow",
      },
      {
        id: "dhl-emea",
        name: "DHL EMEA",
        type: "Warehousing & distribution",
        location: "Bonn, Germany",
        members: 8,
        description:
          "Europe, Middle East, and Africa warehousing and distribution for DHL network partners.",
        status: "Active",
        color: "red",
      },
      {
        id: "dhl-na",
        name: "DHL NA",
        type: "Air & ocean freight",
        location: "Plantation, United States",
        members: 6,
        description:
          "North American air and ocean freight coordination across DHL forwarding partners.",
        status: "Active",
        color: "orange",
      },
      {
        id: "dhl-latam",
        name: "DHL LATAM",
        type: "Road freight",
        location: "Mexico City, Mexico",
        members: 4,
        description:
          "Latin American road freight and cross-border distribution for DHL network members.",
        status: "Active",
        color: "pink",
      },
      {
        id: "dhl-africa",
        name: "DHL AFRICA",
        type: "Parcel & last mile",
        location: "Johannesburg, South Africa",
        members: 5,
        description:
          "African parcel and last-mile operations connecting regional carriers to the DHL network.",
        status: "Active",
        color: "teal",
      },
    ],
    schemas: [
      defineSchema({
        id: "dhl-shipment-manifest",
        name: "Shipment Manifest",
        slug: "shipment-manifest",
        color: "purple",
        description:
          "Canonical shipment manifest used by DHL network partners for hub handoffs, customs, and last-mile dispatch.",
        properties: {
          shipmentId: {
            type: "string",
            description: "Network-unique shipment identifier",
          },
          originHub: { type: "string", description: "Origin hub code" },
          destinationHub: {
            type: "string",
            description: "Destination hub code",
          },
          pieces: {
            type: "integer",
            description: "Number of pieces in the consignment",
          },
          weightKg: {
            type: "number",
            description: "Total chargeable weight in kilograms",
          },
          incoterms: {
            type: "string",
            enum: ["DAP", "DDP", "EXW", "FOB"],
            description: "Shipping terms",
          },
          readyAt: {
            type: "string",
            format: "date-time",
            description: "When the shipment is ready for pickup",
          },
        },
      }),
      defineSchema({
        id: "dhl-tracking-event",
        name: "Tracking Event",
        slug: "tracking-event",
        color: "blue",
        internal: true,
        description:
          "Scan and milestone events published as parcels move through DHL carriers, warehouses, and last-mile partners.",
        properties: {
          eventId: { type: "string", description: "Unique scan event id" },
          shipmentId: {
            type: "string",
            description: "Related shipment identifier",
          },
          facilityCode: {
            type: "string",
            description: "Facility or vehicle code that produced the scan",
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
            description: "Normalized tracking milestone",
          },
          scannedAt: {
            type: "string",
            format: "date-time",
            description: "When the event was captured",
          },
        },
      }),
      defineSchema({
        id: "dhl-customs-declaration",
        name: "Customs Declaration",
        slug: "customs-declaration",
        color: "cyan",
        description:
          "Cross-border customs declaration payload shared with APAC and EMEA brokerage partners.",
        properties: {
          declarationId: {
            type: "string",
            description: "Brokerage declaration identifier",
          },
          shipmentId: {
            type: "string",
            description: "Related shipment identifier",
          },
          originCountry: {
            type: "string",
            description: "ISO 3166-1 origin country",
          },
          destinationCountry: {
            type: "string",
            description: "ISO 3166-1 destination country",
          },
          declaredValue: {
            type: "number",
            description: "Total declared value",
          },
          currency: { type: "string", description: "ISO 4217 currency code" },
          hsCodes: {
            type: "array",
            items: { type: "string" },
            description: "Harmonized system codes on the declaration",
          },
          documentFileId: {
            type: "string",
            format: "file",
            description: "Uploaded customs document",
          },
        },
        required: [
          "declarationId",
          "shipmentId",
          "originCountry",
          "destinationCountry",
        ],
      }),
      defineSchema({
        id: "dhl-last-mile-delivery",
        name: "Last-mile Delivery",
        slug: "last-mile-delivery",
        color: "gray",
        active: false,
        description:
          "Proof-of-delivery, exception, and recipient capture records used by regional last-mile operators.",
        properties: {
          deliveryId: { type: "string", description: "Last-mile stop id" },
          shipmentId: {
            type: "string",
            description: "Related shipment identifier",
          },
          recipientName: {
            type: "string",
            description: "Name captured at delivery",
          },
          status: {
            type: "string",
            enum: ["delivered", "attempted", "refused", "returned"],
            description: "Delivery outcome",
          },
          signatureCaptured: {
            type: "boolean",
            description: "Whether a signature was collected",
          },
          completedAt: {
            type: "string",
            format: "date-time",
            description: "When the stop was closed",
          },
          proofFileId: {
            type: "string",
            format: "file",
            description: "Proof-of-delivery image or PDF",
          },
        },
      }),
    ],
    workflowDefinitions: [
      defineWorkflow({
        id: "dhl-customs-clearance",
        name: "Customs Clearance",
        slug: "customs-clearance",
        schemaId: "dhl-customs-declaration",
        trigger: { type: "event", event: "shipment.manifest.received" },
        steps: [
          { id: "validate", type: "validate", name: "Validate declaration" },
          { id: "broker-review", type: "task", name: "Brokerage review" },
          { id: "submit", type: "http", name: "Submit to customs" },
          { id: "hold-check", type: "gateway", name: "Check hold status" },
          { id: "release", type: "transform", name: "Release shipment" },
        ],
      }),
      defineWorkflow({
        id: "dhl-hub-sort",
        name: "Hub Sort & Dispatch",
        slug: "hub-sort-dispatch",
        schemaId: "dhl-shipment-manifest",
        trigger: { type: "event", event: "scan.at_hub" },
        steps: [
          { id: "identify", type: "validate", name: "Identify shipment" },
          { id: "sort", type: "transform", name: "Assign sort lane" },
          { id: "dispatch", type: "http", name: "Dispatch to next hop" },
          { id: "notify", type: "notify", name: "Publish tracking event" },
        ],
      }),
      defineWorkflow({
        id: "dhl-last-mile",
        name: "Last-mile Delivery",
        slug: "last-mile-delivery",
        schemaId: "dhl-last-mile-delivery",
        trigger: { type: "event", event: "shipment.out_for_delivery" },
        steps: [
          { id: "assign", type: "task", name: "Assign courier" },
          { id: "route", type: "transform", name: "Build stop list" },
          { id: "capture", type: "http", name: "Capture proof of delivery" },
          { id: "close", type: "transform", name: "Close delivery stop" },
        ],
      }),
      defineWorkflow({
        id: "dhl-exception-recovery",
        name: "Exception Recovery",
        slug: "exception-recovery",
        schemaId: "dhl-tracking-event",
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
        id: "dhl-manifest-ingest",
        name: "Manifest Ingest",
        slug: "manifest-ingest",
        source: { type: "api", name: "Partner API" },
        stages: [
          { id: "extract", type: "extract", name: "Pull manifests" },
          { id: "validate", type: "validate", name: "Validate against schema" },
          { id: "normalize", type: "transform", name: "Normalize partners" },
          { id: "publish", type: "publish", name: "Publish to workflows" },
        ],
      }),
      definePipeline({
        id: "dhl-tracking-stream",
        name: "Tracking Event Stream",
        slug: "tracking-event-stream",
        source: { type: "stream", name: "Scan events" },
        stages: [
          { id: "ingest", type: "extract", name: "Ingest scans" },
          { id: "normalize", type: "transform", name: "Normalize milestones" },
          { id: "dedupe", type: "transform", name: "Dedupe event ids" },
          { id: "publish", type: "publish", name: "Publish tracking stream" },
        ],
      }),
      definePipeline({
        id: "dhl-customs-transform",
        name: "Customs Transform",
        slug: "customs-transform",
        source: { type: "file", name: "XML declarations" },
        stages: [
          { id: "parse", type: "extract", name: "Parse XML" },
          { id: "map", type: "transform", name: "Map to canonical schema" },
          { id: "validate", type: "validate", name: "Validate declaration" },
          { id: "publish", type: "publish", name: "Hand off to brokerage" },
        ],
      }),
      definePipeline({
        id: "dhl-partner-edi-sync",
        name: "Partner EDI Sync",
        slug: "partner-edi-sync",
        active: false,
        source: { type: "mailbox", name: "EDI mailbox" },
        stages: [
          { id: "fetch", type: "extract", name: "Fetch EDI documents" },
          { id: "translate", type: "transform", name: "Translate to JSON" },
          { id: "publish", type: "publish", name: "Sync partner records" },
        ],
      }),
    ],
  },
  fedex: {
    id: "fedex",
    name: "FedEx",
    summary: "Express delivery network",
    description:
      "Express delivery network for time-critical freight and parcels.",
    industry: "Express Delivery",
    headquarters: "Memphis, United States",
    coverage: "220+ countries",
    status: "Active",
    color: "purple",
    organizations: [
      {
        id: "fedex-express",
        name: "FedEx Express",
        type: "Express delivery",
        location: "Memphis, United States",
        members: 9,
        description:
          "Time-critical international express delivery across the FedEx air network.",
        status: "Active",
        color: "purple",
      },
      {
        id: "fedex-ground",
        name: "FedEx Ground",
        type: "Ground shipping",
        location: "Pittsburgh, United States",
        members: 7,
        description:
          "Business-to-business and residential ground shipping across North America.",
        status: "Active",
        color: "green",
      },
      {
        id: "fedex-freight",
        name: "FedEx Freight",
        type: "Less-than-truckload",
        location: "Memphis, United States",
        members: 5,
        description:
          "Less-than-truckload freight services for regional and long-haul shipments.",
        status: "Active",
        color: "orange",
      },
    ],
    schemas: [
      defineSchema({
        id: "fedex-air-waybill",
        name: "Air Waybill",
        slug: "air-waybill",
        color: "blue",
        description:
          "International air waybill schema used by FedEx Express for time-critical freight and parcel movements.",
        properties: {
          waybillNumber: {
            type: "string",
            description: "Air waybill number",
          },
          originAirport: {
            type: "string",
            description: "IATA origin airport",
          },
          destinationAirport: {
            type: "string",
            description: "IATA destination airport",
          },
          serviceLevel: {
            type: "string",
            enum: ["priority", "standard", "economy"],
            description: "Express service level",
          },
          pieces: { type: "integer", description: "Number of pieces" },
          chargeableWeightKg: {
            type: "number",
            description: "Chargeable weight in kilograms",
          },
        },
      }),
      defineSchema({
        id: "fedex-ground-scan",
        name: "Ground Scan Event",
        slug: "ground-scan-event",
        color: "teal",
        description:
          "Facility scan events for FedEx Ground pickup, sort, and delivery across North America.",
        properties: {
          scanId: { type: "string", description: "Facility scan identifier" },
          trackingNumber: {
            type: "string",
            description: "Ground tracking number",
          },
          facilityId: {
            type: "string",
            description: "Originating facility",
          },
          scanType: {
            type: "string",
            enum: ["pickup", "sort", "delivery"],
            description: "Scan classification",
          },
          scannedAt: {
            type: "string",
            format: "date-time",
            description: "When the scan occurred",
          },
        },
      }),
      defineSchema({
        id: "fedex-freight-bol",
        name: "Freight Bill of Lading",
        slug: "freight-bill-of-lading",
        color: "red",
        description:
          "Less-than-truckload bill of lading exchanged with FedEx Freight terminals and shippers.",
        properties: {
          bolNumber: { type: "string", description: "Bill of lading number" },
          shipperName: { type: "string", description: "Shipper legal name" },
          consigneeName: {
            type: "string",
            description: "Consignee legal name",
          },
          freightClass: {
            type: "string",
            description: "NMFC freight class",
          },
          handlingUnits: {
            type: "integer",
            description: "Number of handling units",
          },
          weightLbs: {
            type: "number",
            description: "Total weight in pounds",
          },
          scanFileId: {
            type: "string",
            format: "file",
            description: "Scanned bill of lading",
          },
        },
      }),
    ],
    workflowDefinitions: [
      defineWorkflow({
        id: "fedex-express-intake",
        name: "Express Air Intake",
        slug: "express-air-intake",
        schemaId: "fedex-air-waybill",
        trigger: { type: "event", event: "air_waybill.created" },
        steps: [
          { id: "validate", type: "validate", name: "Validate waybill" },
          { id: "capacity", type: "task", name: "Book air capacity" },
          { id: "milestone", type: "notify", name: "Publish first milestone" },
        ],
      }),
      defineWorkflow({
        id: "fedex-ground-sort",
        name: "Ground Sort",
        slug: "ground-sort",
        schemaId: "fedex-ground-scan",
        trigger: { type: "event", event: "facility.scan" },
        steps: [
          { id: "accept", type: "validate", name: "Accept scan" },
          { id: "sort", type: "transform", name: "Assign outbound door" },
          { id: "publish", type: "notify", name: "Publish sort event" },
        ],
      }),
      defineWorkflow({
        id: "fedex-freight-tender",
        name: "Freight Tender",
        slug: "freight-tender",
        schemaId: "fedex-freight-bol",
        trigger: { type: "event", event: "bill_of_lading.received" },
        steps: [
          { id: "tender", type: "http", name: "Tender to terminal" },
          { id: "pickup", type: "task", name: "Confirm pickup" },
          { id: "track", type: "notify", name: "Track to delivery" },
        ],
      }),
    ],
    pipelineDefinitions: [
      definePipeline({
        id: "fedex-waybill-ingest",
        name: "Air Waybill Ingest",
        slug: "air-waybill-ingest",
        source: { type: "edi", name: "EDI X12" },
        stages: [
          { id: "extract", type: "extract", name: "Read X12 waybills" },
          { id: "validate", type: "validate", name: "Validate waybill schema" },
          { id: "publish", type: "publish", name: "Feed express intake" },
        ],
      }),
      definePipeline({
        id: "fedex-ground-scan-stream",
        name: "Ground Scan Stream",
        slug: "ground-scan-stream",
        source: { type: "stream", name: "Facility scans" },
        stages: [
          { id: "ingest", type: "extract", name: "Ingest facility scans" },
          { id: "normalize", type: "transform", name: "Normalize scan types" },
          { id: "publish", type: "publish", name: "Publish unified stream" },
        ],
      }),
      definePipeline({
        id: "fedex-freight-bol-transform",
        name: "Freight BOL Transform",
        slug: "freight-bol-transform",
        source: { type: "file", name: "XML bills of lading" },
        stages: [
          { id: "parse", type: "extract", name: "Parse BOL XML" },
          { id: "map", type: "transform", name: "Map to freight schema" },
          { id: "publish", type: "publish", name: "Publish to terminals" },
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
