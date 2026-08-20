import type { BadgeColor } from "@/lib/badge"

export type Organization = {
  id: string
  name: string
  type: string
  location: string
  members: number
  description: string
  status: string
  color: BadgeColor
}

export type Schema = {
  id: string
  name: string
  version: string
  format: string
  description: string
  status: string
  fields: number
  color: BadgeColor
}

export type WorkflowDefinition = {
  id: string
  name: string
  version: string
  trigger: string
  description: string
  status: string
  steps: number
}

export type PipelineDefinition = {
  id: string
  name: string
  version: string
  source: string
  description: string
  status: string
  stages: number
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
      {
        id: "dhl-shipment-manifest",
        name: "Shipment Manifest",
        version: "2.1",
        format: "JSON Schema",
        description:
          "Canonical shipment manifest used by DHL network partners for hub handoffs, customs, and last-mile dispatch.",
        status: "Published",
        fields: 48,
        color: "purple",
      },
      {
        id: "dhl-tracking-event",
        name: "Tracking Event",
        version: "1.4",
        format: "JSON Schema",
        description:
          "Scan and milestone events published as parcels move through DHL carriers, warehouses, and last-mile partners.",
        status: "Published",
        fields: 22,
        color: "blue",
      },
      {
        id: "dhl-customs-declaration",
        name: "Customs Declaration",
        version: "3.0",
        format: "XML",
        description:
          "Cross-border customs declaration payload shared with APAC and EMEA brokerage partners.",
        status: "Published",
        fields: 61,
        color: "cyan",
      },
      {
        id: "dhl-last-mile-delivery",
        name: "Last-mile Delivery",
        version: "1.2",
        format: "JSON Schema",
        description:
          "Proof-of-delivery, exception, and recipient capture records used by regional last-mile operators.",
        status: "Draft",
        fields: 18,
        color: "gray",
      },
    ],
    workflowDefinitions: [
      {
        id: "dhl-customs-clearance",
        name: "Customs Clearance",
        version: "3.0",
        trigger: "Shipment manifest received",
        description:
          "Orchestrates brokerage review, declaration submission, and hold release for cross-border DHL shipments.",
        status: "Published",
        steps: 7,
      },
      {
        id: "dhl-hub-sort",
        name: "Hub Sort & Dispatch",
        version: "2.2",
        trigger: "Inbound scan at hub",
        description:
          "Routes parcels through DHL hub sortation and dispatches them to the next carrier or last-mile partner.",
        status: "Published",
        steps: 5,
      },
      {
        id: "dhl-last-mile",
        name: "Last-mile Delivery",
        version: "1.5",
        trigger: "Out for delivery",
        description:
          "Coordinates last-mile assignment, recipient capture, and proof-of-delivery across DHL regional operators.",
        status: "Published",
        steps: 6,
      },
      {
        id: "dhl-exception-recovery",
        name: "Exception Recovery",
        version: "0.9",
        trigger: "Delivery exception raised",
        description:
          "Handles failed attempts, address corrections, and reattempts before returning to the originating hub.",
        status: "Draft",
        steps: 4,
      },
    ],
    pipelineDefinitions: [
      {
        id: "dhl-manifest-ingest",
        name: "Manifest Ingest",
        version: "2.0",
        source: "Partner API",
        description:
          "Ingests shipment manifests from DHL network partners, validates against schema, and publishes them for customs and hub workflows.",
        status: "Published",
        stages: 5,
      },
      {
        id: "dhl-tracking-stream",
        name: "Tracking Event Stream",
        version: "1.8",
        source: "Scan events",
        description:
          "Normalizes scan and milestone events from carriers, warehouses, and last-mile partners into a single tracking stream.",
        status: "Published",
        stages: 4,
      },
      {
        id: "dhl-customs-transform",
        name: "Customs Transform",
        version: "3.1",
        source: "XML declarations",
        description:
          "Transforms cross-border customs declarations into the DHL canonical payload used by brokerage partners.",
        status: "Published",
        stages: 6,
      },
      {
        id: "dhl-partner-edi-sync",
        name: "Partner EDI Sync",
        version: "0.4",
        source: "EDI mailbox",
        description:
          "Bidirectional EDI sync for regional partners that have not yet migrated to the JSON partner API.",
        status: "Draft",
        stages: 3,
      },
    ],
  },
  fedex: {
    id: "fedex",
    name: "FedEx",
    summary: "Express delivery network",
    description: "Express delivery network for time-critical freight and parcels.",
    industry: "Express Delivery",
    headquarters: "Memphis, United States",
    coverage: "220+ countries",
    status: "Active",
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
      {
        id: "fedex-air-waybill",
        name: "Air Waybill",
        version: "4.0",
        format: "EDI X12",
        description:
          "International air waybill schema used by FedEx Express for time-critical freight and parcel movements.",
        status: "Published",
        fields: 54,
        color: "blue",
      },
      {
        id: "fedex-ground-scan",
        name: "Ground Scan Event",
        version: "2.0",
        format: "JSON Schema",
        description:
          "Facility scan events for FedEx Ground pickup, sort, and delivery across North America.",
        status: "Published",
        fields: 16,
        color: "teal",
      },
      {
        id: "fedex-freight-bol",
        name: "Freight Bill of Lading",
        version: "1.1",
        format: "XML",
        description:
          "Less-than-truckload bill of lading exchanged with FedEx Freight terminals and shippers.",
        status: "Published",
        fields: 37,
        color: "red",
      },
    ],
    workflowDefinitions: [
      {
        id: "fedex-express-intake",
        name: "Express Air Intake",
        version: "4.1",
        trigger: "Air waybill created",
        description:
          "Validates time-critical FedEx Express shipments, books air capacity, and publishes tracking milestones.",
        status: "Published",
        steps: 6,
      },
      {
        id: "fedex-ground-sort",
        name: "Ground Sort",
        version: "2.0",
        trigger: "Facility scan event",
        description:
          "Processes FedEx Ground pickup, sort, and delivery scans across North American facilities.",
        status: "Published",
        steps: 4,
      },
      {
        id: "fedex-freight-tender",
        name: "Freight Tender",
        version: "1.3",
        trigger: "Bill of lading received",
        description:
          "Tenders less-than-truckload freight to FedEx Freight terminals and tracks pickup through delivery.",
        status: "Published",
        steps: 8,
      },
    ],
    pipelineDefinitions: [
      {
        id: "fedex-waybill-ingest",
        name: "Air Waybill Ingest",
        version: "4.0",
        source: "EDI X12",
        description:
          "Ingests international air waybills from FedEx Express, validates them, and feeds the express intake workflow.",
        status: "Published",
        stages: 5,
      },
      {
        id: "fedex-ground-scan-stream",
        name: "Ground Scan Stream",
        version: "2.1",
        source: "Facility scans",
        description:
          "Streams pickup, sort, and delivery scans from FedEx Ground facilities into a unified event pipeline.",
        status: "Published",
        stages: 3,
      },
      {
        id: "fedex-freight-bol-transform",
        name: "Freight BOL Transform",
        version: "1.2",
        source: "XML bills of lading",
        description:
          "Transforms less-than-truckload bills of lading into the canonical payload used by FedEx Freight terminals.",
        status: "Published",
        stages: 4,
      },
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
      {
        id: "cafe-menu-item",
        name: "Menu Item",
        version: "1.6",
        format: "JSON Schema",
        description:
          "Shared drink, pastry, and lunch items published to POS terminals across cafe locations.",
        status: "Published",
        fields: 24,
        color: "orange",
      },
      {
        id: "cafe-order-ticket",
        name: "Order Ticket",
        version: "2.0",
        format: "JSON Schema",
        description:
          "Barista tickets for in-shop, mobile, and kiosk orders including modifiers and pickup status.",
        status: "Published",
        fields: 31,
        color: "purple",
      },
      {
        id: "cafe-loyalty-transaction",
        name: "Loyalty Transaction",
        version: "1.3",
        format: "JSON Schema",
        description:
          "Points earned, redeemed, and adjusted across cafe locations and partner apps.",
        status: "Published",
        fields: 18,
        color: "pink",
      },
      {
        id: "cafe-inventory-count",
        name: "Inventory Count",
        version: "0.8",
        format: "JSON Schema",
        description:
          "Daily bean, milk, and pastry counts used to trigger restock from the roastery.",
        status: "Draft",
        fields: 15,
        color: "gray",
      },
    ],
    workflowDefinitions: [
      {
        id: "cafe-opening-checklist",
        name: "Opening Checklist",
        version: "1.4",
        trigger: "Shop opens",
        description:
          "Walks each cafe through equipment checks, cash drawer setup, and first-batch pastry pull.",
        status: "Published",
        steps: 6,
      },
      {
        id: "cafe-order-fulfillment",
        name: "Order Fulfillment",
        version: "2.1",
        trigger: "Order ticket created",
        description:
          "Routes tickets to bar and pastry, marks drinks ready, and notifies pickup or delivery.",
        status: "Published",
        steps: 5,
      },
      {
        id: "cafe-inventory-reorder",
        name: "Inventory Reorder",
        version: "1.0",
        trigger: "Low stock threshold",
        description:
          "Creates roastery restock requests when bean, milk, or pastry counts drop below par.",
        status: "Published",
        steps: 4,
      },
      {
        id: "cafe-loyalty-enroll",
        name: "Loyalty Enrollment",
        version: "0.7",
        trigger: "Guest opts in at POS",
        description:
          "Creates a loyalty profile, issues a welcome reward, and syncs the account to partner apps.",
        status: "Draft",
        steps: 3,
      },
    ],
    pipelineDefinitions: [
      {
        id: "cafe-pos-ingest",
        name: "POS Ingest",
        version: "2.0",
        source: "POS API",
        description:
          "Ingests order tickets from cafe POS terminals, validates menu items, and publishes them for fulfillment.",
        status: "Published",
        stages: 4,
      },
      {
        id: "cafe-loyalty-sync",
        name: "Loyalty Sync",
        version: "1.5",
        source: "Loyalty app",
        description:
          "Syncs points, redemptions, and profile updates between cafe locations and the loyalty partner.",
        status: "Published",
        stages: 3,
      },
      {
        id: "cafe-inventory-snapshot",
        name: "Inventory Snapshot",
        version: "0.9",
        source: "Shop counts",
        description:
          "Collects daily inventory counts and feeds the roastery reorder workflow.",
        status: "Draft",
        stages: 3,
      },
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
      {
        id: "gym-membership",
        name: "Membership",
        version: "3.2",
        format: "JSON Schema",
        description:
          "Member profile, plan tier, and access entitlements used by clubs and the front desk.",
        status: "Published",
        fields: 29,
        color: "green",
      },
      {
        id: "gym-class-booking",
        name: "Class Booking",
        version: "2.1",
        format: "JSON Schema",
        description:
          "Group class and personal training reservations with waitlist and cancellation windows.",
        status: "Published",
        fields: 21,
        color: "blue",
      },
      {
        id: "gym-check-in",
        name: "Check-in Event",
        version: "1.7",
        format: "JSON Schema",
        description:
          "Door and kiosk check-in events used to grant access and count class attendance.",
        status: "Published",
        fields: 14,
        color: "teal",
      },
    ],
    workflowDefinitions: [
      {
        id: "gym-member-onboarding",
        name: "Member Onboarding",
        version: "3.0",
        trigger: "Membership created",
        description:
          "Collects waiver, issues access credentials, and books the complimentary intro session.",
        status: "Published",
        steps: 7,
      },
      {
        id: "gym-class-check-in",
        name: "Class Check-in",
        version: "2.0",
        trigger: "Member arrives for class",
        description:
          "Validates the booking, records attendance, and promotes the next waitlisted member if needed.",
        status: "Published",
        steps: 4,
      },
      {
        id: "gym-membership-renewal",
        name: "Membership Renewal",
        version: "1.2",
        trigger: "Plan expires in 14 days",
        description:
          "Sends renewal offers, processes payment, and extends access before the membership lapses.",
        status: "Published",
        steps: 5,
      },
      {
        id: "gym-freeze-request",
        name: "Membership Freeze",
        version: "0.6",
        trigger: "Member requests freeze",
        description:
          "Reviews freeze eligibility, pauses billing, and schedules access restore on the return date.",
        status: "Draft",
        steps: 4,
      },
    ],
    pipelineDefinitions: [
      {
        id: "gym-access-stream",
        name: "Access Control Stream",
        version: "1.9",
        source: "Door readers",
        description:
          "Streams check-in events from club doors and kiosks into attendance and access logs.",
        status: "Published",
        stages: 3,
      },
      {
        id: "gym-booking-ingest",
        name: "Booking Ingest",
        version: "2.2",
        source: "Member app",
        description:
          "Ingests class and training bookings from the member app and publishes them to studio schedules.",
        status: "Published",
        stages: 4,
      },
      {
        id: "gym-billing-sync",
        name: "Billing Sync",
        version: "1.1",
        source: "Billing provider",
        description:
          "Syncs membership dues, session packs, and failed payments with the gym billing provider.",
        status: "Published",
        stages: 5,
      },
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
      {
        id: "dentist-patient-record",
        name: "Patient Record",
        version: "4.0",
        format: "FHIR JSON",
        description:
          "Patient demographics, history, and consent used by every office in the dental network.",
        status: "Published",
        fields: 52,
        color: "blue",
      },
      {
        id: "dentist-appointment",
        name: "Appointment",
        version: "2.3",
        format: "JSON Schema",
        description:
          "Chair-time bookings with provider, operatory, and reminder status across practices.",
        status: "Published",
        fields: 19,
        color: "cyan",
      },
      {
        id: "dentist-treatment-plan",
        name: "Treatment Plan",
        version: "1.5",
        format: "JSON Schema",
        description:
          "Proposed procedures, sequencing, and estimated cost shared with patients and specialists.",
        status: "Published",
        fields: 27,
        color: "teal",
      },
      {
        id: "dentist-insurance-claim",
        name: "Insurance Claim",
        version: "3.1",
        format: "X12 837",
        description:
          "Dental insurance claims submitted to payers after treatment is completed.",
        status: "Published",
        fields: 44,
        color: "orange",
      },
    ],
    workflowDefinitions: [
      {
        id: "dentist-patient-intake",
        name: "Patient Intake",
        version: "2.4",
        trigger: "New patient scheduled",
        description:
          "Collects history, insurance, and consent before the first visit at any practice.",
        status: "Published",
        steps: 6,
      },
      {
        id: "dentist-appointment-reminders",
        name: "Appointment Reminders",
        version: "1.8",
        trigger: "Appointment in 48 hours",
        description:
          "Sends SMS and email reminders and offers reschedule links for unconfirmed visits.",
        status: "Published",
        steps: 4,
      },
      {
        id: "dentist-insurance-preauth",
        name: "Insurance Pre-authorization",
        version: "1.1",
        trigger: "Treatment plan approved",
        description:
          "Submits pre-authorization for planned procedures and holds chair time until payer response.",
        status: "Published",
        steps: 5,
      },
      {
        id: "dentist-claim-follow-up",
        name: "Claim Follow-up",
        version: "0.5",
        trigger: "Claim unpaid after 30 days",
        description:
          "Reviews denied or delayed claims and resubmits with corrected coding or attachments.",
        status: "Draft",
        steps: 4,
      },
    ],
    pipelineDefinitions: [
      {
        id: "dentist-ehr-ingest",
        name: "EHR Ingest",
        version: "4.0",
        source: "Practice EHR",
        description:
          "Ingests patient records and appointments from practice EHRs into the shared dental schemas.",
        status: "Published",
        stages: 5,
      },
      {
        id: "dentist-claims-submit",
        name: "Claims Submit",
        version: "3.2",
        source: "Completed treatment",
        description:
          "Transforms completed treatment into payer claims and tracks remittance against each visit.",
        status: "Published",
        stages: 6,
      },
      {
        id: "dentist-reminder-dispatch",
        name: "Reminder Dispatch",
        version: "1.6",
        source: "Appointment calendar",
        description:
          "Dispatches appointment reminders and records confirmations back to the practice calendar.",
        status: "Published",
        stages: 3,
      },
    ],
  },
}

export const networkList = Object.values(networks)

export const organizationList = networkList.flatMap((network) =>
  network.organizations.map((organization) => ({ organization, network }))
)

export function getOrganization(organizationId: string) {
  return organizationList.find(
    ({ organization }) => organization.id === organizationId
  )
}

export const schemaList = networkList.flatMap((network) =>
  network.schemas.map((schema) => ({ schema, network }))
)

export function getSchema(schemaId: string) {
  return schemaList.find(({ schema }) => schema.id === schemaId)
}

export const workflowDefinitionList = networkList.flatMap((network) =>
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

export const pipelineDefinitionList = networkList.flatMap((network) =>
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
