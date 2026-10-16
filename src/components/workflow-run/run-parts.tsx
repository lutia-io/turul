import { useState, type ReactNode } from "react"
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react"

import { columnLabel, propertyLabel } from "@/components/schema-records-table"
import { workflowLogicTone } from "@/components/workflow-rule"
import {
  stepStateLabel,
  stepStateTone,
  type StepState,
} from "@/components/workflow-run/run-model"
import {
  stringifyDefinition,
  type JsonObject,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import { cn } from "@/lib/utils"
import {
  logicLabels,
  operatorLabels,
  stringifyWorkflowValue,
  type CompareOperator,
  type CriteriaLogic,
  type WorkflowCriteria,
} from "@/lib/workflow-definition"

export function StatePill({
  state,
  label,
  className,
}: {
  state: StepState
  label?: string
  className?: string
}) {
  const tone = stepStateTone[state]
  const Icon = tone.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tone.pill,
        className
      )}
    >
      <Icon className={cn("size-3", state === "running" && "animate-spin")} />
      {label ?? stepStateLabel[state]}
    </span>
  )
}

export function StateDot({
  state,
  className,
}: {
  state: StepState
  className?: string
}) {
  const tone = stepStateTone[state]
  const Icon = tone.icon
  return (
    <span
      className={cn(
        "flex size-5 items-center justify-center rounded-full ring-2 ring-card",
        tone.marker,
        className
      )}
    >
      <Icon
        className={cn("size-3", state === "running" && "animate-spin")}
        strokeWidth={3}
      />
      <span className="sr-only">{stepStateLabel[state]}</span>
    </span>
  )
}

export function JsonPanel({
  value,
  emptyMessage,
}: {
  value?: JsonObject
  emptyMessage: string
}) {
  const [copied, setCopied] = useState(false)

  if (!value || Object.keys(value).length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  const text = stringifyDefinition(value)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl bg-muted/40 ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px] text-muted-foreground ring-1 ring-foreground/10 transition-colors hover:text-foreground"
      >
        {copied ? (
          <CheckIcon className="size-3" />
        ) : (
          <CopyIcon className="size-3" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="max-h-96 overflow-auto px-4 py-3 pr-20 font-mono text-xs leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

export function Expandable({
  label,
  defaultOpen = false,
  children,
}: {
  label: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
        <ChevronDownIcon
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  )
}

export function ConditionList({
  criteria,
  fields,
}: {
  criteria: WorkflowCriteria
  fields: JsonSchemaProperty[]
}) {
  if (!criteria.logic) {
    return (
      <div className="rounded-xl border bg-background px-4 py-3">
        <ConditionLine leaf={criteria} fields={fields} />
      </div>
    )
  }

  const logic = criteria.logic as CriteriaLogic
  const conditions = criteria.conditions ?? []

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 bg-background px-4 py-3",
        workflowLogicTone[logic].accent
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">
        {logicLabels[logic]}
      </p>
      <ul className="mt-2 space-y-2">
        {conditions.map((condition, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckIcon className="mt-1 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1">
              {condition.logic ? (
                <ConditionList criteria={condition} fields={fields} />
              ) : (
                <ConditionLine leaf={condition} fields={fields} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConditionLine({
  leaf,
  fields,
}: {
  leaf: WorkflowCriteria
  fields: JsonSchemaProperty[]
}) {
  if (!leaf.field || !leaf.operator) {
    return <p className="text-sm text-muted-foreground">Incomplete condition</p>
  }
  const property = fields.find((field) => field.name === leaf.field)
  const label = property ? columnLabel(property) : propertyLabel(leaf.field)
  const operator =
    operatorLabels[leaf.operator as CompareOperator] ?? leaf.operator

  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{operator}</span>
      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
        {stringifyWorkflowValue(leaf.value)}
      </span>
    </p>
  )
}
