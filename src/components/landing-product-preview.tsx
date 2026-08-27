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

import { networks } from "@/data/networks"
import { recordsForSchema } from "@/data/records"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  getJsonSchemaProperties,
  getPipelineStages,
  getWorkflowSteps,
  jsonSchemaPropertyCount,
  pipelineSourceLabel,
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

function humanize(name: string) {
  return name
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
  organizations: { id: string; name: string }[]
) {
  if (typeof raw === "string") {
    const organization = organizations.find((item) => item.id === raw)
    if (organization) {
      return organization.name
    }
  }

  return formatCellValue(raw, column)
}

function previewRecords(
  schemaId: string,
  highlightRecordId: string,
  limit = 4
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
  active,
  onClick,
}: {
  children: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-md px-2 py-1 text-left text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/10"
          : "bg-muted text-foreground hover:bg-muted/80"
      )}
    >
      {children}
    </button>
  )
}

function SnapshotCard({
  icon,
  color,
  label,
  title,
  onClick,
  children,
}: {
  icon: LucideIcon
  color: BadgeColor
  label: string
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <ToneIcon color={color} icon={icon} />
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="line-clamp-2 text-sm font-medium">{title}</p>
        </div>
      </div>
      {children}
    </button>
  )
}

function NetworkPane({
  example,
  onView,
}: {
  example: PreviewExample
  onView: (view: PreviewView) => void
}) {
  const {
    network,
    schema,
    workflow,
    pipeline,
    columns,
    records,
    highlightRecordId,
    organizations,
    steps,
  } = example
  const row =
    records.find((record) => record.id === highlightRecordId) ?? records[0]

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
      <p className="text-sm leading-6 text-muted-foreground">
        These teams share one table. When a row lands, Lutia runs the next step.
      </p>
      <SnapshotCard
        icon={Building2Icon}
        color={network.color}
        label="Teams"
        title={`${network.organizations.length} organizations`}
        onClick={() => onView("organizations")}
      >
        <p className="text-xs leading-5 text-muted-foreground">
          {network.organizations.map((item) => item.name).join(" · ")}
        </p>
      </SnapshotCard>
      <SnapshotCard
        icon={TableIcon}
        color={schema.color}
        label="Shared table"
        title={schema.name}
        onClick={() => onView("records")}
      >
        {row ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.name} className="min-w-0">
                <p className="truncate text-[11px] text-muted-foreground">
                  {humanize(column.name)}
                </p>
                <p className="truncate text-xs font-medium">
                  {displayCell(column, row.data[column.name], organizations)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </SnapshotCard>
      <SnapshotCard
        icon={WorkflowIcon}
        color="teal"
        label="What Lutia does next"
        title={workflow.name}
        onClick={() => onView("workflow")}
      >
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {steps.map((step) => step.name).join(" → ")}
        </p>
      </SnapshotCard>
      <p className="text-xs text-muted-foreground">
        Rows arrive from {example.from} through{" "}
        <button
          type="button"
          className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("pipeline")}
        >
          {pipeline.name}
        </button>
        .
      </p>
    </div>
  )
}

function OrganizationsPane({
  example,
  onView,
}: {
  example: PreviewExample
  onView: (view: PreviewView) => void
}) {
  const { network, schema } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ToneIcon color={network.color} icon={Building2Icon} />
        <div>
          <h3 className="text-sm font-semibold">Organizations</h3>
          <p className="text-xs text-muted-foreground">Teams in this network</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        They all write to the same table.
      </p>
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
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {organization.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Shared table:{" "}
        <button
          type="button"
          className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("schema")}
        >
          {schema.name}
        </button>
        .
      </p>
    </div>
  )
}

function SchemaPane({
  example,
  onView,
}: {
  example: PreviewExample
  onView: (view: PreviewView) => void
}) {
  const { schema, properties } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ToneIcon color={schema.color} icon={FileJsonIcon} />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{schema.name}</h3>
            <Pill tone={schema.active ? "live" : "warn"}>
              {schema.active ? "In use" : "Draft"}
            </Pill>
          </div>
          <p className="text-xs text-muted-foreground">
            {jsonSchemaPropertyCount(schema.definition)} fields every row uses
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        The shared form. Nothing is saved unless it matches.
      </p>
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <span>Field</span>
          <span>Kind</span>
          <span>Needed</span>
        </div>
        {properties.map((property) => (
          <div
            key={property.name}
            className="grid grid-cols-[1fr_auto_auto] items-start gap-x-4 border-b px-3 py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium">{humanize(property.name)}</p>
              {property.enumValues && property.enumValues.length > 0 ? (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {property.enumValues.map(humanize).join(" · ")}
                </p>
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
        See saved rows in{" "}
        <button
          type="button"
          className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("records")}
        >
          records
        </button>
        .
      </p>
    </div>
  )
}

function RecordsPane({
  example,
  onView,
}: {
  example: PreviewExample
  onView: (view: PreviewView) => void
}) {
  const { schema, columns, records, highlightRecordId, organizations } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToneIcon color={schema.color} icon={TableIcon} />
          <div>
            <h3 className="text-sm font-semibold">{schema.name}</h3>
            <p className="text-xs text-muted-foreground">The live table</p>
          </div>
        </div>
        <Pill>{records.length} rows</Pill>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <div
          className="grid min-w-[32rem] gap-x-3 border-b bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          }}
        >
          {columns.map((column) => (
            <span key={column.name}>{humanize(column.name)}</span>
          ))}
        </div>
        {records.map((record) => {
          const highlighted = record.id === highlightRecordId
          const title = columns
            .map((column) =>
              displayCell(column, record.data[column.name], organizations)
            )
            .join(" · ")

          return (
            <div
              key={record.id}
              title={title}
              className={cn(
                "grid min-w-[32rem] items-center gap-x-3 border-b px-3 py-2.5 last:border-b-0",
                highlighted && "bg-amber-500/10"
              )}
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
              }}
            >
              {columns.map((column) => (
                <span key={column.name} className="truncate text-xs">
                  {displayCell(column, record.data[column.name], organizations)}
                </span>
              ))}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Highlighted row is the one Lutia is acting on —{" "}
        <button
          type="button"
          className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("workflow")}
        >
          {example.workflow.name}
        </button>
        .
      </p>
    </div>
  )
}

function WorkflowPane({
  example,
  onView,
}: {
  example: PreviewExample
  onView: (view: PreviewView) => void
}) {
  const { workflow, schema, steps } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ToneIcon color="teal" icon={WorkflowIcon} />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{workflow.name}</h3>
            <Pill tone={workflow.active ? "live" : "warn"}>
              {workflow.active ? "On" : "Off"}
            </Pill>
          </div>
          <p className="text-xs text-muted-foreground">
            Watches{" "}
            <button
              type="button"
              className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() => onView("schema")}
            >
              {schema.name}
            </button>{" "}
            records
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{example.story}</p>
      <ol className="grid gap-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
              {step.order}
            </span>
            <p className="text-xs font-medium">{step.name}</p>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <PlayIcon className="size-3.5 text-teal-600 dark:text-teal-400" />
        When that row lands, Lutia does this.
      </div>
    </div>
  )
}

function PipelinePane({
  example,
  onView,
}: {
  example: PreviewExample
  onView: (view: PreviewView) => void
}) {
  const { pipeline, schema, stages, source } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ToneIcon color="pink" icon={LayersIcon} />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{pipeline.name}</h3>
            <Pill tone={pipeline.active ? "live" : "warn"}>
              {pipeline.active ? "On" : "Off"}
            </Pill>
          </div>
          <p className="text-xs text-muted-foreground">From {source}</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        How rows get into Lutia from {example.from}.
      </p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {stages.map((stage) => (
          <li
            key={stage.id}
            className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2.5"
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-[11px] font-semibold text-pink-700 dark:text-pink-400">
              {stage.order}
            </span>
            <p className="text-xs leading-5 font-medium">{stage.name}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        Then Lutia checks{" "}
        <button
          type="button"
          className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("schema")}
        >
          {schema.name}
        </button>
        .
      </p>
    </div>
  )
}

type PreviewExample = {
  config: ThreadConfig
  story: string
  from: string
  network: (typeof networks)[string]
  schema: (typeof networks)[string]["schemas"][number]
  workflow: (typeof networks)[string]["workflowDefinitions"][number]
  pipeline: (typeof networks)[string]["pipelineDefinitions"][number]
  properties: JsonSchemaProperty[]
  columns: JsonSchemaProperty[]
  records: ReturnType<typeof recordsForSchema>
  organizations: (typeof networks)[string]["organizations"]
  highlightRecordId: string
  steps: ReturnType<typeof getWorkflowSteps>
  stages: ReturnType<typeof getPipelineStages>
  source: string
}

function buildExample(config: ThreadConfig): PreviewExample | null {
  const network = networks[config.networkId]
  const schema = network?.schemas.find((item) => item.id === config.schemaId)
  const workflow = network?.workflowDefinitions.find(
    (item) => item.id === config.workflowId
  )
  const pipeline = network?.pipelineDefinitions.find(
    (item) => item.id === config.pipelineId
  )

  if (!network || !schema || !workflow || !pipeline) {
    return null
  }

  const properties = getJsonSchemaProperties(schema.definition)

  return {
    config,
    story: config.story,
    from: config.from,
    network,
    schema,
    workflow,
    pipeline,
    properties,
    columns: previewColumns(properties),
    records: previewRecords(config.schemaId, config.highlightRecordId),
    organizations: network.organizations,
    highlightRecordId: config.highlightRecordId,
    steps: getWorkflowSteps(workflow.definition),
    stages: getPipelineStages(pipeline.definition),
    source: pipelineSourceLabel(pipeline.definition),
  }
}

export function LandingProductPreview() {
  const [threadId, setThreadId] = useState<ThreadConfig["id"]>(threads[0].id)
  const [view, setView] = useState<PreviewView>("network")
  const example = useMemo(() => {
    const config = threads.find((item) => item.id === threadId) ?? threads[0]
    return buildExample(config)
  }, [threadId])

  if (!example) {
    return null
  }

  function selectThread(id: ThreadConfig["id"]) {
    setThreadId(id)
    setView("network")
  }

  const pane = {
    network: <NetworkPane example={example} onView={setView} />,
    organizations: <OrganizationsPane example={example} onView={setView} />,
    schema: <SchemaPane example={example} onView={setView} />,
    records: <RecordsPane example={example} onView={setView} />,
    workflow: <WorkflowPane example={example} onView={setView} />,
    pipeline: <PipelinePane example={example} onView={setView} />,
  }[view]

  const loop = [
    { id: "network" as const, label: "Network" },
    { id: "organizations" as const, label: "Organizations" },
    { id: "schema" as const, label: example.schema.name },
    { id: "records" as const, label: "Records" },
    { id: "workflow" as const, label: example.workflow.name },
    { id: "pipeline" as const, label: example.pipeline.name },
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
                active={view === item.id}
                onClick={() => setView(item.id)}
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
                    onClick={() => setView(item.id)}
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
          <div className="min-h-[24rem] p-4 sm:p-5">{pane}</div>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">
        {example.story}
      </p>
    </div>
  )
}
