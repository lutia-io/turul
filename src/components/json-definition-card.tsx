import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getBadgeColor, statusBadgeConfig } from "@/lib/badge"
import {
  publicationStatus,
  stringifyDefinition,
  type DefinitionStep,
  type JsonObject,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import { cn } from "@/lib/utils"

export function StatusBadge({ status }: { status: string }) {
  const config = statusBadgeConfig[status]
  const Icon = config?.icon ?? statusBadgeConfig.Active.icon
  const tone = getBadgeColor(config?.color)

  return (
    <span className="inline-flex" title={status}>
      <Icon className={cn("size-4", tone.fg)} />
      <span className="sr-only">{status}</span>
    </span>
  )
}

export function DefinitionFlags({
  active,
  internal,
}: {
  active: boolean
  internal: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge status={publicationStatus(active)} />
      {internal ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Internal
        </span>
      ) : null}
    </div>
  )
}

export function JsonDefinitionCard({
  definition,
  label = "JSONB definition",
  description = "Stored as JSONB on the definition column.",
}: {
  definition: JsonObject
  label?: string
  description?: string
}) {
  const json = stringifyDefinition(definition)
  const [copied, setCopied] = useState(false)

  async function copyDefinition() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-medium">{label}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyDefinition}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-[32rem] overflow-auto bg-muted/30 p-4 font-mono text-[13px] leading-relaxed sm:p-5">
        {json}
      </pre>
    </section>
  )
}

export function SchemaPropertiesTable({
  properties,
}: {
  properties: JsonSchemaProperty[]
}) {
  if (properties.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This JSON Schema does not declare any properties.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="px-3.5 py-2.5 font-medium">Property</th>
            <th className="px-3.5 py-2.5 font-medium">Type</th>
            <th className="px-3.5 py-2.5 font-medium">Required</th>
            <th className="px-3.5 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.name} className="border-b last:border-b-0">
              <td className="px-3.5 py-2.5 font-mono text-[13px]">
                {property.name}
              </td>
              <td className="px-3.5 py-2.5 text-muted-foreground">
                {property.format
                  ? `${property.type} (${property.format})`
                  : property.enumValues
                    ? property.enumValues.join(" | ")
                    : property.type}
              </td>
              <td className="px-3.5 py-2.5 text-muted-foreground">
                {property.required ? "Yes" : "No"}
              </td>
              <td className="px-3.5 py-2.5 text-muted-foreground">
                {property.description ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DefinitionStepsList({
  steps,
  emptyLabel,
}: {
  steps: DefinitionStep[]
  emptyLabel: string
}) {
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step) => (
        <li
          key={step.id}
          className="flex min-w-0 items-center gap-3 rounded-xl border bg-background px-3.5 py-3"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs font-medium">
            {step.order}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{step.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {step.type}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function stringifyCriteriaValue(value: unknown) {
  if (value == null) {
    return "empty"
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ")
  }
  return String(value)
}

export function WorkflowCriteriaTree({
  criteria,
}: {
  criteria?: {
    logic?: string
    conditions?: unknown[]
    field?: string
    operator?: string
    value?: unknown
  }
}) {
  if (!criteria) {
    return (
      <p className="text-sm text-muted-foreground">
        This workflow does not declare any conditions.
      </p>
    )
  }

  if (criteria.logic) {
    const logicLabel =
      criteria.logic === "OR"
        ? "Any of these"
        : criteria.logic === "NOT"
          ? "None of these"
          : "All of these"
    const conditions = Array.isArray(criteria.conditions)
      ? criteria.conditions
      : []

    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-background p-3">
        <p className="text-sm font-medium">{logicLabel}</p>
        <div className="flex flex-col gap-2 pl-3">
          {conditions.map((condition, index) => (
            <WorkflowCriteriaTree
              key={index}
              criteria={
                condition && typeof condition === "object"
                  ? (condition as typeof criteria)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    )
  }

  if (!criteria.field || !criteria.operator) {
    return (
      <p className="text-sm text-muted-foreground">Incomplete condition.</p>
    )
  }

  const operator =
    criteria.operator === "eq"
      ? "is"
      : criteria.operator === "neq"
        ? "is not"
        : criteria.operator === "gt"
          ? "is greater than"
          : criteria.operator === "gte"
            ? "is at least"
            : criteria.operator === "lt"
              ? "is less than"
              : criteria.operator === "lte"
                ? "is at most"
                : criteria.operator === "in"
                  ? "is one of"
                  : criteria.operator

  return (
    <p className="rounded-xl border bg-background px-3.5 py-3 text-sm">
      <span className="font-mono">{criteria.field}</span> {operator}{" "}
      <span className="font-medium">
        {stringifyCriteriaValue(criteria.value)}
      </span>
    </p>
  )
}

export function WorkflowActionsList({
  actions,
}: {
  actions: { type: string; context?: Record<string, unknown> }[]
}) {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This workflow does not declare any actions.
      </p>
    )
  }

  const labels: Record<string, string> = {
    CREATE_RECORD: "Create a record",
    UPDATE_RECORD: "Update a record",
    UPSERT_RECORD: "Create or update a record",
    TRIGGER_PIPELINE: "Run a pipeline",
  }

  return (
    <ol className="flex flex-col gap-2">
      {actions.map((action, index) => {
        const context = action.context ?? {}
        const detail =
          typeof context.schemaId === "string"
            ? `Schema ${context.schemaId}`
            : typeof context.pipeline === "string"
              ? context.pipeline
              : typeof context.recordId === "string"
                ? `Record ${context.recordId}`
                : action.type

        return (
          <li
            key={`${action.type}-${index}`}
            className="flex min-w-0 items-center gap-3 rounded-xl border bg-background px-3.5 py-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs font-medium">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {labels[action.type] ?? action.type}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {detail}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
