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
