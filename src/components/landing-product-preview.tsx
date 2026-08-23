import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowRightIcon,
  Building2Icon,
  FileJsonIcon,
  LayersIcon,
  LayoutDashboardIcon,
  PlayIcon,
  TableIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import { networks } from "@/data/networks"
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

const views = ["network", "schema", "records", "workflow", "pipeline"] as const

type PreviewView = (typeof views)[number]

const navItems: {
  id: PreviewView
  label: string
  icon: LucideIcon
}[] = [
  { id: "network", label: "Overview", icon: LayoutDashboardIcon },
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
  },
  {
    id: "gym",
    label: "Gym",
    networkId: "gym",
    schemaId: "gym-membership",
    workflowId: "gym-member-onboarding",
    pipelineId: "gym-billing-sync",
    highlightRecordId: "rec-gym-mem-05",
  },
  {
    id: "dentist",
    label: "Dentist",
    networkId: "dentist",
    schemaId: "dentist-appointment",
    workflowId: "dentist-appointment-reminders",
    pipelineId: "dentist-reminder-dispatch",
    highlightRecordId: "rec-den-appt-03",
  },
  {
    id: "dhl",
    label: "DHL",
    networkId: "dhl",
    schemaId: "dhl-shipment-manifest",
    workflowId: "dhl-hub-sort",
    pipelineId: "dhl-manifest-ingest",
    highlightRecordId: "rec-dhl-manifest-01",
  },
] as const

type ThreadConfig = (typeof threads)[number]

function propertyTypeLabel(property: JsonSchemaProperty) {
  if (property.enumValues && property.enumValues.length > 0) {
    return "enum"
  }
  if (property.format) {
    return property.format
  }
  if (property.itemsType) {
    return `${property.itemsType}[]`
  }
  return property.type
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
        "rounded-md px-2 py-1 text-left text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground hover:bg-muted/80"
      )}
    >
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
  const { network, schema, workflow, pipeline } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight">
              {network.name}
            </h3>
            <Pill tone="live">{network.status}</Pill>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {network.description}
          </p>
        </div>
        <Pill>{network.industry}</Pill>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            label: "Organizations",
            value: network.organizations.length,
          },
          { label: "Schemas", value: network.schemas.length },
          {
            label: "Workflows",
            value: network.workflowDefinitions.length,
          },
          {
            label: "Pipelines",
            value: network.pipelineDefinitions.length,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl bg-muted/70 px-3 py-2.5"
          >
            <p className="text-lg font-semibold tracking-tight tabular-nums">
              {metric.value}
            </p>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {network.organizations.slice(0, 4).map((organization) => (
          <div
            key={organization.id}
            className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5"
          >
            <ToneIcon color={organization.color} icon={Building2Icon} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {organization.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {organization.location}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onView("schema")}
          className="rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        >
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Schema
          </p>
          <p className="mt-1 text-sm font-medium">{schema.name}</p>
        </button>
        <button
          type="button"
          onClick={() => onView("workflow")}
          className="rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        >
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Workflow
          </p>
          <p className="mt-1 text-sm font-medium">{workflow.name}</p>
        </button>
        <button
          type="button"
          onClick={() => onView("pipeline")}
          className="rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        >
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Pipeline
          </p>
          <p className="mt-1 text-sm font-medium">{pipeline.name}</p>
        </button>
      </div>
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
  const description = definitionDescription(schema.definition)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToneIcon color={schema.color} icon={FileJsonIcon} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{schema.name}</h3>
              <Pill tone={schema.active ? "live" : "warn"}>
                {schema.active ? "Published" : "Draft"}
              </Pill>
            </div>
            <p className="text-xs text-muted-foreground">
              {schema.slug} · {jsonSchemaPropertyCount(schema.definition)}{" "}
              properties
            </p>
          </div>
        </div>
      </div>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <span>Field</span>
          <span>Type</span>
          <span>Rule</span>
        </div>
        {properties.map((property) => (
          <div
            key={property.name}
            className="grid grid-cols-[1fr_auto_auto] items-start gap-x-4 border-b px-3 py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs">{property.name}</p>
              {property.enumValues && property.enumValues.length > 0 ? (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {property.enumValues.join(" · ")}
                </p>
              ) : property.description ? (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {property.description}
                </p>
              ) : null}
            </div>
            <span className="pt-0.5 text-xs text-muted-foreground">
              {propertyTypeLabel(property)}
            </span>
            <span className="pt-0.5 text-xs text-muted-foreground">
              {property.required ? "required" : "optional"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Records,{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("workflow")}
        >
          {example.workflow.name}
        </button>
        , and{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("pipeline")}
        >
          {example.pipeline.name}
        </button>{" "}
        all use this contract.
      </p>
    </div>
  )
}

function RecordsPane({ example }: { example: PreviewExample }) {
  const { schema, columns, records, highlightRecordId, organizations } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToneIcon color={schema.color} icon={TableIcon} />
          <div>
            <h3 className="text-sm font-semibold">{schema.name}</h3>
            <p className="text-xs text-muted-foreground">
              Live rows against the published schema
            </p>
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
            <span key={column.name}>{column.name}</span>
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
        Highlighted row is the record {example.workflow.name} is watching.
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
  const { workflow, schema, pipeline, steps, trigger } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToneIcon color="teal" icon={WorkflowIcon} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{workflow.name}</h3>
              <Pill tone={workflow.active ? "live" : "warn"}>
                {workflow.active ? "Published" : "Draft"}
              </Pill>
            </div>
            <p className="text-xs text-muted-foreground">
              Bound to{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => onView("schema")}
              >
                {schema.name}
              </button>
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-background p-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Trigger
        </p>
        <p className="mt-2 font-mono text-xs">{trigger}</p>
      </div>
      <ol className="grid gap-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
              {step.order}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{step.name}</p>
              <p className="text-[11px] text-muted-foreground">{step.type}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <PlayIcon className="size-3.5 text-teal-600 dark:text-teal-400" />
        Runs on {schema.name} records published by{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("pipeline")}
        >
          {pipeline.name}
        </button>
        .
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
  const { pipeline, schema, workflow, stages, source } = example

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ToneIcon color="pink" icon={LayersIcon} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{pipeline.name}</h3>
              <Pill tone={pipeline.active ? "live" : "warn"}>
                {pipeline.active ? "Published" : "Draft"}
              </Pill>
            </div>
            <p className="text-xs text-muted-foreground">Source · {source}</p>
          </div>
        </div>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage) => (
          <li
            key={stage.id}
            className="flex items-start gap-2 rounded-xl border bg-background px-3 py-2.5"
          >
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-[11px] font-semibold text-pink-700 dark:text-pink-400">
              {stage.order}
            </span>
            <div className="min-w-0">
              <p className="text-xs leading-5 font-medium">{stage.name}</p>
              <p className="text-[11px] text-muted-foreground">{stage.type}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        Validates against{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("schema")}
        >
          {schema.name}
        </button>
        , then{" "}
        <button
          type="button"
          className="font-medium text-foreground underline-offset-2 hover:underline"
          onClick={() => onView("workflow")}
        >
          {workflow.name}
        </button>{" "}
        picks up the published records.
      </p>
    </div>
  )
}

type PreviewExample = {
  config: ThreadConfig
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
  trigger: string
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
    trigger: workflowTriggerLabel(workflow.definition),
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

  const pane = {
    network: <NetworkPane example={example} onView={setView} />,
    schema: <SchemaPane example={example} onView={setView} />,
    records: <RecordsPane example={example} />,
    workflow: <WorkflowPane example={example} onView={setView} />,
    pipeline: <PipelinePane example={example} onView={setView} />,
  }[view]

  return (
    <div>
      <div
        role="tablist"
        aria-label="Example networks"
        className="mx-auto mb-4 grid max-w-lg grid-cols-4 rounded-lg border bg-muted p-1"
      >
        {threads.map((item) => {
          const selected = item.id === threadId

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setThreadId(item.id)}
              className={cn(
                "rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                selected
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
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
          <p className="truncate text-xs text-muted-foreground">
            lutia.app / {example.network.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
          <JumpButton
            active={view === "schema"}
            onClick={() => setView("schema")}
          >
            {example.schema.name}
          </JumpButton>
          <ArrowRightIcon className="size-3.5 text-muted-foreground" />
          <JumpButton
            active={view === "records"}
            onClick={() => setView("records")}
          >
            Records
          </JumpButton>
          <ArrowRightIcon className="size-3.5 text-muted-foreground" />
          <JumpButton
            active={view === "workflow"}
            onClick={() => setView("workflow")}
          >
            {example.workflow.name}
          </JumpButton>
          <ArrowRightIcon className="size-3.5 text-muted-foreground" />
          <JumpButton
            active={view === "pipeline"}
            onClick={() => setView("pipeline")}
          >
            {example.pipeline.name}
          </JumpButton>
        </div>
        <div className="grid md:grid-cols-[11.5rem_minmax(0,1fr)]">
          <aside className="hidden border-r bg-muted/30 p-3 md:block">
            <p className="px-2 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Workspace
            </p>
            <nav className="flex flex-col gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = view === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors",
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
        {example.pipeline.name} publishes {example.schema.name} records, then{" "}
        {example.workflow.name} runs on{" "}
        <span className="font-mono text-xs">{example.trigger}</span>.
      </p>
    </div>
  )
}
