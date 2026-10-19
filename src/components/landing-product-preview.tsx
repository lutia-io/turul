import { useMemo, useState } from "react"
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  networks,
  type Organization,
  type Schema,
} from "@/data/networks"
import { recordsForSchema } from "@/data/records"
import {
  getJsonSchemaProperties,
  getPipelineStages,
  getWorkflowSteps,
  pipelineSourceLabel,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import { formatCellValue } from "@/lib/records"
import { cn } from "@/lib/utils"

const examples = [
  {
    id: "cafe",
    label: "Cafe",
    networkId: "cafe",
    schemaId: "cafe-order-ticket",
    workflowId: "cafe-order-fulfillment",
    pipelineId: "cafe-pos-ingest",
    highlightRecordId: "rec-cafe-order-04",
    story: "Shops share one order shape. A new ticket goes to the bar.",
  },
  {
    id: "logistics",
    label: "Logistics",
    networkId: "logistics",
    schemaId: "logistics-shipment",
    workflowId: "logistics-hub-dispatch",
    pipelineId: "logistics-manifest-ingest",
    highlightRecordId: "rec-log-ship-03",
    story: "Warehouses and carriers share shipments. Arrival triggers dispatch.",
  },
  {
    id: "school",
    label: "School",
    networkId: "school",
    schemaId: "school-enrollment",
    workflowId: "school-student-onboarding",
    pipelineId: "school-sis-ingest",
    highlightRecordId: "rec-sch-enr-04",
    story: "Campuses share enrollments. A new student notifies the counselor.",
  },
] as const

type ExampleConfig = (typeof examples)[number]

const steps = [
  {
    id: "teams",
    label: "Teams",
    title: "A network is the shared workspace",
    hint: "Partner organizations join one network so they can work from the same data.",
  },
  {
    id: "table",
    label: "Table",
    title: "They agree on a table",
    hint: "A table is the shared form — columns, types, and what’s required. No more mismatched spreadsheets.",
  },
  {
    id: "records",
    label: "Rows",
    title: "Rows fill that shape",
    hint: "Every record is a row that matches the table. Teams write their own data into the same structure.",
  },
  {
    id: "automate",
    label: "Automate",
    title: "Lutia runs the next step",
    hint: "Pipelines bring data in. Workflows act when a row matches — notify, route, or hand off work.",
  },
] as const

type StepId = (typeof steps)[number]["id"]

function fieldLabel(name: string) {
  return name
    .replace(/Id$/, " ID")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function propertyKind(property: JsonSchemaProperty) {
  if (property.enumValues && property.enumValues.length > 0) return "Choice"
  if (property.format === "date") return "Date"
  if (property.format === "date-time") return "Date & time"
  if (property.format === "email") return "Email"
  if (property.type === "boolean") return "Yes / no"
  if (property.type === "number") return "Number"
  if (property.itemsType) return "List"
  return "Text"
}

function previewColumns(properties: JsonSchemaProperty[]) {
  const usable = properties.filter((property) => property.format !== "file")
  const enums = usable.filter(
    (property) => property.enumValues && property.enumValues.length > 0
  )
  const rest = usable.filter(
    (property) => !(property.enumValues && property.enumValues.length > 0)
  )
  const seen = new Set<string>()

  return [...rest.slice(0, 2), ...enums, ...rest.slice(2)]
    .filter((property) => {
      if (seen.has(property.name)) return false
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
    if (organization) return organization.name
    if (column.enumValues && column.enumValues.length > 0) {
      return fieldLabel(raw)
    }
  }
  return formatCellValue(raw, column)
}

type BuiltExample = {
  config: ExampleConfig
  organizations: Organization[]
  schema: Schema
  properties: JsonSchemaProperty[]
  columns: JsonSchemaProperty[]
  records: ReturnType<typeof recordsForSchema>
  workflowName: string
  workflowSteps: { id: string; name: string; order: number }[]
  pipelineName: string
  pipelineSource: string
  pipelineStages: { id: string; name: string; order: number }[]
}

function buildExample(config: ExampleConfig): BuiltExample | null {
  const network = networks[config.networkId]
  if (!network) return null

  const schema = network.schemas.find((item) => item.id === config.schemaId)
  const workflow = network.workflowDefinitions.find(
    (item) => item.id === config.workflowId
  )
  const pipeline = network.pipelineDefinitions.find(
    (item) => item.id === config.pipelineId
  )
  if (!schema || !workflow || !pipeline) return null

  const properties = getJsonSchemaProperties(schema.definition)
  const allRecords = recordsForSchema(schema.id)
  const highlighted = allRecords.find(
    (record) => record.id === config.highlightRecordId
  )
  const rest = allRecords.filter(
    (record) => record.id !== config.highlightRecordId
  )
  const records = highlighted
    ? [highlighted, ...rest].slice(0, 4)
    : allRecords.slice(0, 4)

  return {
    config,
    organizations: network.organizations,
    schema,
    properties,
    columns: previewColumns(properties),
    records,
    workflowName: workflow.name,
    workflowSteps: getWorkflowSteps(workflow.definition),
    pipelineName: pipeline.name,
    pipelineSource: pipelineSourceLabel(pipeline.definition),
    pipelineStages: getPipelineStages(pipeline.definition),
  }
}

function StepRail({
  activeIndex,
  onSelect,
}: {
  activeIndex: number
  onSelect: (index: number) => void
}) {
  return (
    <ol className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
      {steps.map((step, index) => {
        const active = index === activeIndex
        const done = index < activeIndex

        return (
          <li key={step.id} className="flex items-center gap-1">
            {index > 0 ? (
              <ArrowRightIcon className="mx-0.5 hidden size-3.5 text-muted-foreground/50 sm:block" />
            ) : null}
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                active
                  ? "bg-foreground text-background"
                  : done
                    ? "text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                  active
                    ? "bg-background text-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              {step.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function TeamsStep({ example }: { example: BuiltExample }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {example.organizations.map((organization) => (
        <li
          key={organization.id}
          className="rounded-lg border px-3 py-2.5"
        >
          <p className="text-sm font-medium">{organization.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {organization.type}
            {organization.location ? ` · ${organization.location}` : ""}
          </p>
        </li>
      ))}
    </ul>
  )
}

function TableStep({ example }: { example: BuiltExample }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold">{example.schema.name}</h4>
        <p className="text-xs text-muted-foreground tabular-nums">
          {example.properties.length} fields
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <span>Field</span>
          <span>Type</span>
          <span>Required</span>
        </div>
        {example.properties.map((property) => (
          <div
            key={property.name}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b px-3 py-2 last:border-b-0"
          >
            <p className="text-sm">{fieldLabel(property.name)}</p>
            <span className="text-xs text-muted-foreground">
              {propertyKind(property)}
            </span>
            <span className="text-xs text-muted-foreground">
              {property.required ? "Yes" : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecordsStep({ example }: { example: BuiltExample }) {
  const { columns, records, organizations, config } = example

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold">{example.schema.name}</h4>
        <p className="text-xs text-muted-foreground">
          Highlighted row is the one that triggers work
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <div
          className="grid min-w-[32rem] gap-x-3 border-b bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground"
          style={{
            gridTemplateColumns: `6.5rem repeat(${columns.length}, minmax(0, 1fr))`,
          }}
        >
          <span>Team</span>
          {columns.map((column) => (
            <span key={column.name}>{fieldLabel(column.name)}</span>
          ))}
        </div>
        {records.map((record) => {
          const highlighted = record.id === config.highlightRecordId
          const team =
            organizations.find((item) => item.id === record.organizationId)
              ?.name ?? "—"

          return (
            <div
              key={record.id}
              className={cn(
                "grid min-w-[32rem] items-center gap-x-3 border-b px-3 py-2.5 last:border-b-0",
                highlighted && "bg-muted/60"
              )}
              style={{
                gridTemplateColumns: `6.5rem repeat(${columns.length}, minmax(0, 1fr))`,
              }}
            >
              <span className="truncate text-xs text-muted-foreground">
                {team}
              </span>
              {columns.map((column) => (
                <span key={column.name} className="truncate text-xs">
                  {displayCell(column, record.data[column.name], organizations)}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AutomateStep({ example }: { example: BuiltExample }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border p-4">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Pipeline — data in
        </p>
        <h4 className="mt-1.5 text-sm font-semibold">{example.pipelineName}</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          From {example.pipelineSource} into {example.schema.name}
        </p>
        <ol className="mt-3 space-y-1.5">
          {example.pipelineStages.map((stage) => (
            <li
              key={stage.id}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                {stage.order}
              </span>
              {stage.name}
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Workflow — what runs
        </p>
        <h4 className="mt-1.5 text-sm font-semibold">{example.workflowName}</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          When a matching row lands in {example.schema.name}
        </p>
        <ol className="mt-3 space-y-1.5">
          {example.workflowSteps.map((step) => (
            <li
              key={step.id}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                {step.order}
              </span>
              {step.name}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function StepBody({
  stepId,
  example,
}: {
  stepId: StepId
  example: BuiltExample
}) {
  if (stepId === "teams") return <TeamsStep example={example} />
  if (stepId === "table") return <TableStep example={example} />
  if (stepId === "records") return <RecordsStep example={example} />
  return <AutomateStep example={example} />
}

export function LandingProductPreview() {
  const [exampleId, setExampleId] = useState<ExampleConfig["id"]>(examples[0].id)
  const [stepIndex, setStepIndex] = useState(0)

  const example = useMemo(() => {
    const config = examples.find((item) => item.id === exampleId) ?? examples[0]
    return buildExample(config)
  }, [exampleId])

  if (!example) return null

  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  function selectExample(id: ExampleConfig["id"]) {
    setExampleId(id)
    setStepIndex(0)
  }

  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium tracking-widest text-primary uppercase">
          See it in action
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">
          One shared shape. Then the next step.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Pick an example and walk through how Lutia works — from the teams in a
          network to the automation that runs when data lands.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Example networks"
        className="mx-auto mt-8 flex max-w-md justify-center gap-1 rounded-xl border bg-muted/50 p-1"
      >
        {examples.map((item) => {
          const selected = item.id === exampleId

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectExample(item.id)}
              className={cn(
                "flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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

      <p className="mx-auto mt-4 max-w-xl text-center text-sm text-muted-foreground">
        {example.config.story}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-4 py-3 sm:px-5">
          <StepRail
            activeIndex={stepIndex}
            onSelect={setStepIndex}
          />
        </div>

        <div className="px-4 py-5 sm:px-5 sm:py-6">
          <div className="mb-5 max-w-xl">
            <h3 className="text-lg font-semibold tracking-tight">
              {step.title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {step.hint}
            </p>
          </div>
          <StepBody stepId={step.id} example={example} />
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              isFirst && "invisible"
            )}
          >
            <ChevronLeftIcon />
            Back
          </button>
          <p className="text-xs text-muted-foreground tabular-nums">
            {stepIndex + 1} / {steps.length}
          </p>
          <button
            type="button"
            disabled={isLast}
            onClick={() =>
              setStepIndex((index) => Math.min(steps.length - 1, index + 1))
            }
            className={cn(
              buttonVariants({ variant: isLast ? "ghost" : "default", size: "sm" }),
              isLast && "invisible"
            )}
          >
            Next
            <ChevronRightIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
