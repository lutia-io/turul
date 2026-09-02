import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowRightIcon,
  Building2Icon,
  FileJsonIcon,
  LayersIcon,
  ListIcon,
  MousePointerClickIcon,
  PlayIcon,
  TableIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import {
  networks,
  type Organization,
  type PipelineDefinition,
  type Schema,
  type WorkflowDefinition,
} from "@/data/networks"
import { recordsForSchema } from "@/data/records"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  definitionDescription,
  getJsonSchemaProperties,
  getPipelineStages,
  getWorkflowSteps,
  jsonSchemaPropertyCount,
  pipelineSourceLabel,
  workflowTriggerLabel,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import { formatCellValue } from "@/lib/records"
import { cn } from "@/lib/utils"

const views = [
  "network",
  "organizations",
  "schema",
  "records",
  "workflow",
  "pipeline",
] as const

type PreviewView = (typeof views)[number]

const navItems: {
  id: PreviewView
  label: string
  icon: LucideIcon
}[] = [
  { id: "network", label: "Network", icon: ListIcon },
  { id: "organizations", label: "Organizations", icon: Building2Icon },
  { id: "schema", label: "Schemas", icon: FileJsonIcon },
  { id: "records", label: "Records", icon: TableIcon },
  { id: "workflow", label: "Workflows", icon: WorkflowIcon },
  { id: "pipeline", label: "Pipelines", icon: LayersIcon },
]

const threads = [
  {
    id: "cafe",
    label: "Cafe",
    networkId: "cafe",
    schemaId: "cafe-order-ticket",
    workflowId: "cafe-order-fulfillment",
    pipelineId: "cafe-pos-ingest",
    highlightRecordId: "rec-cafe-order-04",
    story: "An order sends a ticket to the bar.",
    from: "POS",
  },
  {
    id: "logistics",
    label: "Logistics",
    networkId: "logistics",
    schemaId: "logistics-shipment",
    workflowId: "logistics-hub-dispatch",
    pipelineId: "logistics-manifest-ingest",
    highlightRecordId: "rec-log-ship-03",
    story: "A hub arrival sends a dispatch to last mile.",
    from: "Warehouse",
  },
  {
    id: "gym",
    label: "Gym",
    networkId: "gym",
    schemaId: "gym-membership",
    workflowId: "gym-member-onboarding",
    pipelineId: "gym-billing-sync",
    highlightRecordId: "rec-gym-mem-05",
    story: "A new member gets access and an intro session.",
    from: "Billing",
  },
  {
    id: "dentist",
    label: "Dentist",
    networkId: "dentist",
    schemaId: "dentist-appointment",
    workflowId: "dentist-appointment-reminders",
    pipelineId: "dentist-reminder-dispatch",
    highlightRecordId: "rec-den-appt-03",
    story: "An upcoming visit sends a reminder.",
    from: "Calendar",
  },
  {
    id: "personal",
    label: "Personal",
    networkId: "personal",
    schemaId: "personal-expense",
    workflowId: "personal-bill-reminder",
    pipelineId: "personal-bank-ingest",
    highlightRecordId: "rec-pers-exp-03",
    story: "A due bill sends a reminder.",
    from: "Bank",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    networkId: "portfolio",
    schemaId: "portfolio-property",
    workflowId: "portfolio-distribution-notice",
    pipelineId: "portfolio-closing-ingest",
    highlightRecordId: "rec-pe-prop-03",
    story: "A property sale emails investors in that fund.",
    from: "Escrow",
  },
] as const

type ThreadConfig = (typeof threads)[number]

function fieldLabel(name: string) {
  return name
    .replace(/Id$/, " ID")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function propertyKind(property: JsonSchemaProperty) {
  if (property.enumValues && property.enumValues.length > 0) {
    return "Choice"
  }
  if (property.format === "date") {
    return "Date"
  }
  if (property.format === "date-time") {
    return "Date & time"
  }
  if (property.format === "file") {
    return "File"
  }
  if (property.itemsType) {
    return "List"
  }
  if (property.type === "boolean") {
    return "Yes / no"
  }
  if (property.type === "integer" || property.type === "number") {
    return "Number"
  }
  return "Text"
}

function previewColumns(properties: JsonSchemaProperty[]) {
  const usable = properties.filter((property) => property.format !== "file")
  const enums = usable.filter(
    (property) => property.enumValues && property.enumValues.length > 0
  )
  const rest = usable.filter(
    (property) =>
      property.format !== "date-time" &&
      property.format !== "date" &&
      !(property.enumValues && property.enumValues.length > 0)
  )
  const seen = new Set<string>()

  return [...rest.slice(0, 2), ...enums, ...rest.slice(2), ...usable]
    .filter((property) => {
      if (seen.has(property.name)) {
        return false
      }
      seen.add(property.name)
      return true
    })
    .slice(0, 4)
}

function displayCell(
  column: JsonSchemaProperty,
  raw: JsonValue | undefined,
  organizations: Organization[]
) {
  if (typeof raw === "string") {
    const organization = organizations.find((item) => item.id === raw)
    if (organization) {
      return organization.name
    }
    if (column.enumValues && column.enumValues.length > 0) {
      return fieldLabel(raw)
    }
  }

  return formatCellValue(raw, column)
}

function previewRecords(
  schemaId: string,
  highlightRecordId: string,
  limit = 5
) {
  const all = recordsForSchema(schemaId)
  const highlighted = all.find((record) => record.id === highlightRecordId)
  const rest = all.filter((record) => record.id !== highlightRecordId)

  if (!highlighted) {
    return all.slice(0, limit)
  }

  return [highlighted, ...rest].slice(0, limit)
}

function ToneIcon({
  color,
  icon: Icon,
  className,
}: {
  color: BadgeColor
  icon: LucideIcon
  className?: string
}) {
  const tone = getBadgeColor(color)

  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        tone.bg,
        tone.text,
        className
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}

function ColorDot({ color }: { color: BadgeColor | string }) {
  const tone = getBadgeColor(color)

  return <span className={cn("size-2 shrink-0 rounded-full", tone.bg)} />
}

function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode
  tone?: "muted" | "live" | "warn"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "live" &&
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        tone === "warn" && "bg-amber-500/15 text-amber-800 dark:text-amber-400"
      )}
    >
      {children}
    </span>
  )
}

function JumpButton({
  children,
  step,
  active,
  onClick,
}: {
  children: ReactNode
  step: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 pl-1 text-left text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/10"
          : "bg-muted text-foreground hover:bg-muted/80"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground ring-1 ring-foreground/10"
        )}
      >
        {step}
      </span>
      {children}
    </button>
  )
}

function TextLink({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function SchemaTabs({
  schemas,
  activeId,
  counts,
  onSelect,
}: {
  schemas: Schema[]
  activeId?: string
  counts: Record<string, number>
  onSelect: (schemaId: string) => void
}) {
  return (
    <div className="flex min-w-0 gap-1 overflow-x-auto">
      {schemas.map((schema) => {
        const active = schema.id === activeId
        const count = counts[schema.id] ?? 0

        return (
          <button
            key={schema.id}
            type="button"
            onClick={() => onSelect(schema.id)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              active
                ? "border-foreground/15 bg-background font-medium shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <ColorDot color={schema.color} />
            {schema.name}
            <span
              className={cn(
                "tabular-nums",
                active ? "text-muted-foreground" : "text-muted-foreground/80"
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function eventLabel(value: string) {
  return fieldLabel(value.replace(/[._]+/g, " "))
}

function FlowSteps({
  steps,
  tone,
  leading,
}: {
  steps: { id: string; name: string; order: number }[]
  tone: "teal" | "pink"
  leading?: { label: string; title: string }
}) {
  const badge =
    tone === "teal"
      ? "bg-teal-500/15 text-teal-700 dark:text-teal-400"
      : "bg-pink-500/15 text-pink-700 dark:text-pink-400"

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {leading ? (
        <li className="flex items-center gap-2">
          <div className="rounded-xl border border-dashed bg-background px-3 py-2">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {leading.label}
            </p>
            <p className="text-xs font-medium">{leading.title}</p>
          </div>
          {steps.length > 0 ? (
            <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
          ) : null}
        </li>
      ) : null}
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                badge
              )}
            >
              {step.order}
            </span>
            <span className="text-xs font-medium">{step.name}</span>
          </div>
          {index < steps.length - 1 ? (
            <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function SelectableRow({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-foreground/15 bg-background shadow-xs ring-1 ring-foreground/10"
          : "bg-background/60 hover:bg-muted/50"
      )}
    >
      {children}
    </button>
  )
}

function PreviewCell({
  column,
  raw,
  organizations,
}: {
  column: JsonSchemaProperty
  raw: JsonValue | undefined
  organizations: Organization[]
}) {
  const text = displayCell(column, raw, organizations)

  if (column.enumValues && column.enumValues.length > 0 && text) {
    return (
      <span className="inline-flex max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
        {text}
      </span>
    )
  }

  return <span className="truncate text-xs">{text}</span>
}

function RecordsTable({
  columns,
  records,
  organizations,
  highlightRecordId,
}: {
  columns: JsonSchemaProperty[]
  records: ReturnType<typeof recordsForSchema>
  organizations: Organization[]
  highlightRecordId?: string
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <div
        className="grid min-w-[36rem] gap-x-3 border-b bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground"
        style={{
          gridTemplateColumns: `7rem repeat(${columns.length}, minmax(0, 1fr))`,
        }}
      >
        <span>Team</span>
        {columns.map((column) => (
          <span key={column.name}>{fieldLabel(column.name)}</span>
        ))}
      </div>
      {records.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
          No rows in this table yet.
        </p>
      ) : (
        records.map((record) => {
          const highlighted = record.id === highlightRecordId
          const team =
            organizations.find((item) => item.id === record.organizationId)
              ?.name ?? "—"

          return (
            <div
              key={record.id}
              className={cn(
                "grid min-w-[36rem] items-center gap-x-3 border-b px-3 py-2.5 last:border-b-0",
                highlighted && "bg-amber-500/10"
              )}
              style={{
                gridTemplateColumns: `7rem repeat(${columns.length}, minmax(0, 1fr))`,
              }}
            >
              <span className="truncate text-xs text-muted-foreground">
                {team}
              </span>
              {columns.map((column) => (
                <PreviewCell
                  key={column.name}
                  column={column}
                  raw={record.data[column.name]}
                  organizations={organizations}
                />
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}

type SchemaPreview = {
  schema: Schema
  properties: JsonSchemaProperty[]
  columns: JsonSchemaProperty[]
  records: ReturnType<typeof recordsForSchema>
  recordCount: number
  description: string
}

type WorkflowPreview = {
  workflow: WorkflowDefinition
  steps: ReturnType<typeof getWorkflowSteps>
  trigger: string
  schema?: Schema
}

type PipelinePreview = {
  pipeline: PipelineDefinition
  stages: ReturnType<typeof getPipelineStages>
  source: string
}

type PreviewExample = {
  config: ThreadConfig
  story: string
  from: string
  network: (typeof networks)[string]
  organizations: Organization[]
  schemas: SchemaPreview[]
  workflows: WorkflowPreview[]
  pipelines: PipelinePreview[]
  highlightRecordId: string
  totalRecords: number
}

function buildExample(config: ThreadConfig): PreviewExample | null {
  const network = networks[config.networkId]
  if (!network) {
    return null
  }

  const schemas = network.schemas.map((schema) => {
    const properties = getJsonSchemaProperties(schema.definition)
    return {
      schema,
      properties,
      columns: previewColumns(properties),
      records: previewRecords(schema.id, config.highlightRecordId),
      recordCount: recordsForSchema(schema.id).length,
      description: definitionDescription(schema.definition) ?? "",
    }
  })

  const workflows = network.workflowDefinitions.map((workflow) => ({
    workflow,
    steps: getWorkflowSteps(workflow.definition),
    trigger: workflowTriggerLabel(workflow.definition),
    schema: network.schemas.find((item) => item.id === workflow.schemaId),
  }))

  const pipelines = network.pipelineDefinitions.map((pipeline) => ({
    pipeline,
    stages: getPipelineStages(pipeline.definition),
    source: pipelineSourceLabel(pipeline.definition),
  }))

  return {
    config,
    story: config.story,
    from: config.from,
    network,
    organizations: network.organizations,
    schemas,
    workflows,
    pipelines,
    highlightRecordId: config.highlightRecordId,
    totalRecords: schemas.reduce((sum, item) => sum + item.recordCount, 0),
  }
}

function NetworkPane({
  example,
  selectedSchemaId,
  onOpen,
}: {
  example: PreviewExample
  selectedSchemaId: string
  onOpen: (
    view: PreviewView,
    ids?: { schemaId?: string; workflowId?: string; pipelineId?: string }
  ) => void
}) {
  const { network, schemas, workflows, pipelines, organizations } = example

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold tracking-tight">
            {network.name}
          </h3>
          <Pill tone="live">Live</Pill>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{example.story}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            {
              view: "schema" as const,
              label: "Schemas",
              value: schemas.length,
              color: "blue" as const,
              icon: FileJsonIcon,
            },
            {
              view: "records" as const,
              label: "Records",
              value: example.totalRecords,
              color: "cyan" as const,
              icon: TableIcon,
            },
            {
              view: "workflow" as const,
              label: "Workflows",
              value: workflows.length,
              color: "teal" as const,
              icon: WorkflowIcon,
            },
            {
              view: "pipeline" as const,
              label: "Pipelines",
              value: pipelines.length,
              color: "pink" as const,
              icon: LayersIcon,
            },
          ] as const
        ).map((stat) => (
          <button
            key={stat.view}
            type="button"
            onClick={() => onOpen(stat.view)}
            className="flex cursor-pointer flex-col gap-2 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
          >
            <ToneIcon color={stat.color} icon={stat.icon} className="size-7" />
            <div>
              <p className="text-lg font-semibold tracking-tight tabular-nums">
                {stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Shared tables
          </p>
          <button
            type="button"
            className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onOpen("organizations")}
          >
            {organizations.length} teams
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {schemas.map((item) => {
            const active = item.schema.id === selectedSchemaId

            return (
              <button
                key={item.schema.id}
                type="button"
                onClick={() => onOpen("schema", { schemaId: item.schema.id })}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-foreground/15 bg-background shadow-xs ring-1 ring-foreground/10"
                    : "bg-background hover:bg-muted/50"
                )}
              >
                <ColorDot color={item.schema.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.schema.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {item.properties.length} fields · {item.recordCount} rows
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Rows arrive from {example.from} through{" "}
        <TextLink
          onClick={() =>
            onOpen("pipeline", { pipelineId: example.config.pipelineId })
          }
        >
          {pipelines.find(
            (item) => item.pipeline.id === example.config.pipelineId
          )?.pipeline.name ?? "a pipeline"}
        </TextLink>
        . Matching rows run{" "}
        <TextLink
          onClick={() =>
            onOpen("workflow", { workflowId: example.config.workflowId })
          }
        >
          {workflows.find(
            (item) => item.workflow.id === example.config.workflowId
          )?.workflow.name ?? "a workflow"}
        </TextLink>
        .
      </p>
    </div>
  )
}

function OrganizationsPane({
  example,
  onOpen,
}: {
  example: PreviewExample
  onOpen: (view: PreviewView, ids?: { schemaId?: string }) => void
}) {
  const { network, schemas } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ToneIcon color={network.color} icon={Building2Icon} />
        <div>
          <h3 className="text-sm font-semibold">Organizations</h3>
          <p className="text-xs text-muted-foreground">
            {network.organizations.length} teams writing to the same tables
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {network.organizations.map((organization) => (
          <div
            key={organization.id}
            className="flex items-start gap-3 rounded-xl border bg-background px-3 py-2.5"
          >
            <ToneIcon color={organization.color} icon={Building2Icon} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{organization.name}</p>
              <p className="text-xs text-muted-foreground">
                {organization.type} · {organization.location}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {schemas.map((item) => (
          <button
            key={item.schema.id}
            type="button"
            onClick={() => onOpen("schema", { schemaId: item.schema.id })}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-muted/60"
          >
            <ColorDot color={item.schema.color} />
            {item.schema.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function SchemaPane({
  example,
  selected,
  onOpen,
}: {
  example: PreviewExample
  selected: SchemaPreview
  onOpen: (view: PreviewView, ids?: { schemaId?: string }) => void
}) {
  const published = example.schemas.filter((item) => item.schema.active).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToneIcon color="blue" icon={FileJsonIcon} />
          <div>
            <h3 className="text-sm font-semibold">Schemas</h3>
            <p className="text-xs text-muted-foreground">
              {example.schemas.length} shared forms · {published} in use
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {example.schemas.map((item) => {
          const active = item.schema.id === selected.schema.id

          return (
            <button
              key={item.schema.id}
              type="button"
              onClick={() => onOpen("schema", { schemaId: item.schema.id })}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-foreground/15 bg-background shadow-xs ring-1 ring-foreground/10"
                  : "bg-background hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <ColorDot color={item.schema.color} />
                <p className="min-w-0 truncate text-sm font-medium">
                  {item.schema.name}
                </p>
                <Pill tone={item.schema.active ? "live" : "warn"}>
                  {item.schema.active ? "In use" : "Draft"}
                </Pill>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {jsonSchemaPropertyCount(item.schema.definition)} fields ·{" "}
                {item.recordCount} rows
              </p>
            </button>
          )
        })}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{selected.schema.name}</h4>
          {selected.description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {selected.description}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Every saved row has to match these fields.
            </p>
          )}
        </div>
        <Pill>{selected.properties.length} fields</Pill>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <span>Field</span>
          <span>Kind</span>
          <span>Needed</span>
        </div>
        {selected.properties.map((property) => (
          <div
            key={property.name}
            className="grid grid-cols-[1fr_auto_auto] items-start gap-x-4 border-b px-3 py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium">{fieldLabel(property.name)}</p>
              {property.enumValues && property.enumValues.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {property.enumValues.map((value) => (
                    <span
                      key={value}
                      className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {fieldLabel(value)}
                    </span>
                  ))}
                </div>
              ) : property.description ? (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {property.description}
                </p>
              ) : null}
            </div>
            <span className="pt-0.5 text-xs text-muted-foreground">
              {propertyKind(property)}
            </span>
            <span className="pt-0.5 text-xs text-muted-foreground">
              {property.required ? "Yes" : "No"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        See {selected.recordCount} saved rows in{" "}
        <TextLink
          onClick={() => onOpen("records", { schemaId: selected.schema.id })}
        >
          records
        </TextLink>
        .
      </p>
    </div>
  )
}

function RecordsPane({
  example,
  selected,
  onOpen,
}: {
  example: PreviewExample
  selected: SchemaPreview
  onOpen: (
    view: PreviewView,
    ids?: { schemaId?: string; workflowId?: string }
  ) => void
}) {
  const workflow = example.workflows.find(
    (item) => item.schema?.id === selected.schema.id && item.workflow.active
  )
  const highlightRecordId =
    selected.schema.id === example.config.schemaId
      ? example.highlightRecordId
      : undefined
  const counts = Object.fromEntries(
    example.schemas.map((item) => [item.schema.id, item.recordCount])
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToneIcon color={selected.schema.color} icon={TableIcon} />
          <div>
            <h3 className="text-sm font-semibold">Records</h3>
            <p className="text-xs text-muted-foreground">
              {example.schemas.length} tables · {example.totalRecords} rows
            </p>
          </div>
        </div>
        <Pill>{selected.recordCount} in this table</Pill>
      </div>
      <SchemaTabs
        schemas={example.schemas.map((item) => item.schema)}
        activeId={selected.schema.id}
        counts={counts}
        onSelect={(schemaId) => onOpen("records", { schemaId })}
      />
      <RecordsTable
        columns={selected.columns}
        records={selected.records}
        organizations={example.organizations}
        highlightRecordId={highlightRecordId}
      />
      <p className="text-xs text-muted-foreground">
        {highlightRecordId
          ? "Highlighted row is the one Lutia is acting on"
          : `Rows in ${selected.schema.name}`}
        {workflow ? (
          <>
            {" — "}
            <TextLink
              onClick={() =>
                onOpen("workflow", {
                  schemaId: selected.schema.id,
                  workflowId: workflow.workflow.id,
                })
              }
            >
              {workflow.workflow.name}
            </TextLink>
          </>
        ) : (
          "."
        )}
      </p>
    </div>
  )
}

function WorkflowPane({
  example,
  selected,
  onOpen,
}: {
  example: PreviewExample
  selected: WorkflowPreview
  onOpen: (
    view: PreviewView,
    ids?: { schemaId?: string; workflowId?: string }
  ) => void
}) {
  const live = example.workflows.filter((item) => item.workflow.active).length
  const watchedSchema = selected.schema

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ToneIcon color="teal" icon={WorkflowIcon} />
        <div>
          <h3 className="text-sm font-semibold">Workflows</h3>
          <p className="text-xs text-muted-foreground">
            {example.workflows.length} automations · {live} on
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {example.workflows.map((item) => {
          const active = item.workflow.id === selected.workflow.id

          return (
            <SelectableRow
              key={item.workflow.id}
              active={active}
              onClick={() =>
                onOpen("workflow", {
                  workflowId: item.workflow.id,
                  schemaId: item.schema?.id,
                })
              }
            >
              <ToneIcon color="teal" icon={WorkflowIcon} className="size-7" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {item.workflow.name}
                  </p>
                  <Pill tone={item.workflow.active ? "live" : "warn"}>
                    {item.workflow.active ? "On" : "Off"}
                  </Pill>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {item.schema?.name ?? "Schema"} · {item.steps.length}{" "}
                  {item.steps.length === 1 ? "step" : "steps"}
                </p>
              </div>
            </SelectableRow>
          )
        })}
      </div>
      <div className="rounded-xl border bg-muted/30 p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold">{selected.workflow.name}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Watches{" "}
              {watchedSchema ? (
                <TextLink
                  onClick={() =>
                    onOpen("schema", { schemaId: watchedSchema.id })
                  }
                >
                  {watchedSchema.name}
                </TextLink>
              ) : (
                "a schema"
              )}{" "}
              · {eventLabel(selected.trigger)}
            </p>
          </div>
        </div>
        <FlowSteps steps={selected.steps} tone="teal" />
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <PlayIcon className="size-3.5 text-teal-600 dark:text-teal-400" />
          When a matching row lands, Lutia does this.
        </div>
      </div>
    </div>
  )
}

function PipelinePane({
  example,
  selected,
  onOpen,
}: {
  example: PreviewExample
  selected: PipelinePreview
  onOpen: (
    view: PreviewView,
    ids?: { schemaId?: string; pipelineId?: string }
  ) => void
}) {
  const live = example.pipelines.filter((item) => item.pipeline.active).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ToneIcon color="pink" icon={LayersIcon} />
        <div>
          <h3 className="text-sm font-semibold">Pipelines</h3>
          <p className="text-xs text-muted-foreground">
            {example.pipelines.length} ingest paths · {live} on
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {example.pipelines.map((item) => {
          const active = item.pipeline.id === selected.pipeline.id

          return (
            <SelectableRow
              key={item.pipeline.id}
              active={active}
              onClick={() =>
                onOpen("pipeline", { pipelineId: item.pipeline.id })
              }
            >
              <ToneIcon color="pink" icon={LayersIcon} className="size-7" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {item.pipeline.name}
                  </p>
                  <Pill tone={item.pipeline.active ? "live" : "warn"}>
                    {item.pipeline.active ? "On" : "Off"}
                  </Pill>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  From {item.source} · {item.stages.length}{" "}
                  {item.stages.length === 1 ? "stage" : "stages"}
                </p>
              </div>
            </SelectableRow>
          )
        })}
      </div>
      <div className="rounded-xl border bg-muted/30 p-3">
        <div className="mb-3">
          <h4 className="text-sm font-semibold">{selected.pipeline.name}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How rows get into Lutia from {selected.source}.
          </p>
        </div>
        <FlowSteps
          steps={selected.stages}
          tone="pink"
          leading={{ label: "Source", title: selected.source }}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Then Lutia checks the matching{" "}
          <TextLink onClick={() => onOpen("schema")}>schema</TextLink> before a
          row is saved.
        </p>
      </div>
    </div>
  )
}

export function LandingProductPreview() {
  const [threadId, setThreadId] = useState<ThreadConfig["id"]>(threads[0].id)
  const [view, setView] = useState<PreviewView>("network")
  const [selectedSchemaId, setSelectedSchemaId] = useState(threads[0].schemaId)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(
    threads[0].workflowId
  )
  const [selectedPipelineId, setSelectedPipelineId] = useState(
    threads[0].pipelineId
  )
  const example = useMemo(() => {
    const config = threads.find((item) => item.id === threadId) ?? threads[0]
    return buildExample(config)
  }, [threadId])

  if (!example) {
    return null
  }

  const selectedSchema =
    example.schemas.find((item) => item.schema.id === selectedSchemaId) ??
    example.schemas.find(
      (item) => item.schema.id === example.config.schemaId
    ) ??
    example.schemas[0]
  const selectedWorkflow =
    example.workflows.find((item) => item.workflow.id === selectedWorkflowId) ??
    example.workflows.find(
      (item) => item.workflow.id === example.config.workflowId
    ) ??
    example.workflows[0]
  const selectedPipeline =
    example.pipelines.find((item) => item.pipeline.id === selectedPipelineId) ??
    example.pipelines.find(
      (item) => item.pipeline.id === example.config.pipelineId
    ) ??
    example.pipelines[0]

  function selectThread(id: ThreadConfig["id"]) {
    const config = threads.find((item) => item.id === id) ?? threads[0]
    setThreadId(id)
    setView("network")
    setSelectedSchemaId(config.schemaId)
    setSelectedWorkflowId(config.workflowId)
    setSelectedPipelineId(config.pipelineId)
  }

  function onOpen(
    next: PreviewView,
    ids?: { schemaId?: string; workflowId?: string; pipelineId?: string }
  ) {
    if (ids?.schemaId) {
      setSelectedSchemaId(ids.schemaId)
    }
    if (ids?.workflowId) {
      setSelectedWorkflowId(ids.workflowId)
    }
    if (ids?.pipelineId) {
      setSelectedPipelineId(ids.pipelineId)
    }
    setView(next)
  }

  const pane =
    view === "network" ? (
      <NetworkPane
        example={example}
        selectedSchemaId={selectedSchema?.schema.id ?? selectedSchemaId}
        onOpen={onOpen}
      />
    ) : view === "organizations" ? (
      <OrganizationsPane example={example} onOpen={onOpen} />
    ) : view === "schema" && selectedSchema ? (
      <SchemaPane example={example} selected={selectedSchema} onOpen={onOpen} />
    ) : view === "records" && selectedSchema ? (
      <RecordsPane
        example={example}
        selected={selectedSchema}
        onOpen={onOpen}
      />
    ) : view === "workflow" && selectedWorkflow ? (
      <WorkflowPane
        example={example}
        selected={selectedWorkflow}
        onOpen={onOpen}
      />
    ) : view === "pipeline" && selectedPipeline ? (
      <PipelinePane
        example={example}
        selected={selectedPipeline}
        onOpen={onOpen}
      />
    ) : null

  const loop = [
    { id: "network" as const, label: "Network" },
    { id: "organizations" as const, label: "Organizations" },
    { id: "schema" as const, label: "Schemas" },
    { id: "records" as const, label: "Records" },
    { id: "workflow" as const, label: "Workflows" },
    { id: "pipeline" as const, label: "Pipelines" },
  ]

  return (
    <div>
      <div className="mb-3 flex flex-col items-center gap-1 text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
          <MousePointerClickIcon className="size-4 text-primary" />
          Click around. This is live.
        </p>
      </div>
      <div
        role="tablist"
        aria-label="Example networks"
        className="mx-auto mb-4 grid max-w-3xl grid-cols-2 rounded-xl border bg-muted p-1.5 sm:grid-cols-3 lg:grid-cols-6"
      >
        {threads.map((item) => {
          const selected = item.id === threadId

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectThread(item.id)}
              className={cn(
                "cursor-pointer rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                selected
                  ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-xl ring-1 ring-foreground/10">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            lutia.app / {example.network.name}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <MousePointerClickIcon className="size-3" />
            Interactive
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
          {loop.map((item, index) => (
            <span key={item.id} className="flex items-center gap-1.5">
              {index > 0 ? (
                <ArrowRightIcon className="size-3.5 text-muted-foreground" />
              ) : null}
              <JumpButton
                step={index + 1}
                active={view === item.id}
                onClick={() => onOpen(item.id)}
              >
                {item.label}
              </JumpButton>
            </span>
          ))}
        </div>
        <div className="grid md:grid-cols-[11.5rem_minmax(0,1fr)]">
          <aside className="border-b bg-muted/30 p-3 md:border-r md:border-b-0">
            <p className="px-2 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Workspace
            </p>
            <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = view === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpen(item.id)}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors",
                      active
                        ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/10"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </aside>
          <div className="min-h-[26rem] p-4 sm:p-5">{pane}</div>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">
        {example.story}
      </p>
    </div>
  )
}
