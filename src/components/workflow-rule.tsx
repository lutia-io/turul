import { type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"

import { columnLabel, propertyLabel } from "@/components/schema-records-table"
import { PipelineLevelsView } from "@/components/pipeline-levels-editor"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import { getPipelineLevels, type JsonObject } from "@/lib/json-definition"
import { cn } from "@/lib/utils"
import {
  hasCriteria,
  logicLabels,
  operatorLabels,
  stringifyWorkflowValue,
  triggerFromApi,
  triggerKindShortLabels,
  triggerToApi,
  type CompareOperator,
  type CriteriaLogic,
  type TriggerDraft,
  type TriggerKind,
  type TriggerOn,
  type WorkflowCriteria,
  type WorkflowDefinitionBody,
  type WorkflowTrigger,
} from "@/lib/workflow-definition"

export const workflowLogicExplanations: Record<CriteriaLogic, string> = {
  AND: "Every condition in this group must be true.",
  OR: "At least one condition in this group must be true.",
  NOT: "None of the conditions in this group may be true.",
}

export const workflowLogicTone: Record<
  CriteriaLogic,
  { badge: string; text: string; accent: string }
> = {
  AND: {
    badge: "bg-sky-500/10 text-sky-800 dark:text-sky-300",
    text: "text-sky-700 dark:text-sky-300",
    accent: "border-l-sky-500",
  },
  OR: {
    badge: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
    accent: "border-l-amber-500",
  },
  NOT: {
    badge: "bg-rose-500/10 text-rose-800 dark:text-rose-300",
    text: "text-rose-700 dark:text-rose-300",
    accent: "border-l-rose-500",
  },
}

export type WorkflowTriggerTone = {
  badge: string
  text: string
  icon: string
  chipSelected: string
  accent: string
}

/** Colors for the atomic trigger events shown as badges. */
export const workflowTriggerOnTone: Record<TriggerOn, WorkflowTriggerTone> = {
  created: {
    badge: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    chipSelected:
      "border-emerald-500/35 bg-emerald-500/10 font-medium text-emerald-800 dark:text-emerald-300",
    accent: "border-l-emerald-500",
  },
  updated: {
    badge: "bg-amber-500/10 text-amber-900 dark:text-amber-300",
    text: "text-amber-800 dark:text-amber-300",
    icon: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    chipSelected:
      "border-amber-500/35 bg-amber-500/10 font-medium text-amber-900 dark:text-amber-300",
    accent: "border-l-amber-500",
  },
  schedule: {
    badge: "bg-violet-500/10 text-violet-800 dark:text-violet-300",
    text: "text-violet-700 dark:text-violet-300",
    icon: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    chipSelected:
      "border-violet-500/35 bg-violet-500/10 font-medium text-violet-800 dark:text-violet-300",
    accent: "border-l-violet-500",
  },
}

/** Selected chip styles for each trigger kind picker option. */
export const workflowTriggerKindTone: Record<TriggerKind, string> = {
  created: workflowTriggerOnTone.created.chipSelected,
  updated: workflowTriggerOnTone.updated.chipSelected,
  created_updated:
    "border-foreground/20 bg-muted font-medium text-foreground",
  schedule: workflowTriggerOnTone.schedule.chipSelected,
}

export function workflowTriggerIconTone(kind: TriggerKind) {
  if (kind === "created_updated") {
    return "bg-muted text-foreground"
  }
  if (kind === "schedule") {
    return workflowTriggerOnTone.schedule.icon
  }
  if (kind === "updated") {
    return workflowTriggerOnTone.updated.icon
  }
  return workflowTriggerOnTone.created.icon
}

export function workflowTriggerAccent(kind: TriggerKind) {
  if (kind === "created_updated") {
    return "border-l-emerald-500"
  }
  if (kind === "schedule") {
    return workflowTriggerOnTone.schedule.accent
  }
  if (kind === "updated") {
    return workflowTriggerOnTone.updated.accent
  }
  return workflowTriggerOnTone.created.accent
}

export function WorkflowTriggerBadges({
  trigger,
  className,
}: {
  trigger?: WorkflowTrigger | TriggerDraft
  className?: string
}) {
  const draft =
    trigger && "kind" in trigger ? trigger : triggerFromApi(trigger)
  const on = triggerToApi(draft).on ?? []
  const events: TriggerOn[] =
    on.length > 0
      ? on
      : draft.kind === "schedule"
        ? ["schedule"]
        : ["created"]

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {events.includes("created") ? (
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide",
            workflowTriggerOnTone.created.badge
          )}
        >
          {triggerKindShortLabels.created}
        </span>
      ) : null}
      {events.includes("updated") ? (
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide",
            workflowTriggerOnTone.updated.badge
          )}
        >
          {triggerKindShortLabels.updated}
        </span>
      ) : null}
      {events.includes("schedule") ? (
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide",
            workflowTriggerOnTone.schedule.badge
          )}
        >
          {triggerKindShortLabels.schedule}
        </span>
      ) : null}
    </div>
  )
}

export function WorkflowSectionHeading({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  iconClassName,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
  iconClassName?: string
}) {
  return (
    <div className={cn("flex items-start justify-between", compact ? "gap-2" : "gap-3")}>
      <div className={cn("flex min-w-0 items-start", compact ? "gap-2" : "gap-3")}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md",
            compact ? "size-7" : "size-9",
            iconClassName ?? "bg-muted"
          )}
        >
          <Icon className={compact ? "size-3.5" : "size-4"} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{title}</h2>
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {description}
          </p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function WorkflowLogicJoiner({ logic }: { logic: CriteriaLogic }) {
  return (
    <div className="flex items-center gap-3 py-1.5" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span
        className={cn(
          "font-mono text-[11px] font-semibold tracking-[0.18em]",
          workflowLogicTone[logic].text
        )}
      >
        {logic}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export function WorkflowCriterionPart({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export function WorkflowCriteriaView({
  criteria,
  fields,
}: {
  criteria?: WorkflowCriteria
  fields?: JsonSchemaProperty[]
}) {
  if (!hasCriteria(criteria)) {
    return (
      <p className="text-sm text-muted-foreground">
        This workflow does not declare any conditions.
      </p>
    )
  }

  if (criteria?.logic) {
    return <CriteriaGroupView criteria={criteria} fields={fields} depth={0} />
  }

  return <CriteriaLeafView criteria={criteria!} fields={fields} />
}

function CriteriaGroupView({
  criteria,
  fields,
  depth,
}: {
  criteria: WorkflowCriteria
  fields?: JsonSchemaProperty[]
  depth: number
}) {
  const logic = (criteria.logic ?? "AND") as CriteriaLogic
  const conditions = Array.isArray(criteria.conditions)
    ? criteria.conditions
    : []
  const tone = workflowLogicTone[logic]

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-l-4 bg-muted/20",
        tone.accent,
        depth > 0 && "border-dashed bg-background"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold tracking-wider",
                tone.badge
              )}
            >
              {logic}
            </span>
            <p className="text-sm font-medium">{logicLabels[logic] ?? logic}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {workflowLogicExplanations[logic]}
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {conditions.length} {conditions.length === 1 ? "item" : "items"} in
          this group
        </p>
      </div>
      <div className="flex flex-col p-3">
        {conditions.length > 0 ? (
          conditions.map((condition, index) => (
            <div key={index}>
              {index > 0 ? <WorkflowLogicJoiner logic={logic} /> : null}
              {condition.logic ? (
                <CriteriaGroupView
                  criteria={condition}
                  fields={fields}
                  depth={depth + 1}
                />
              ) : (
                <CriteriaLeafView criteria={condition} fields={fields} />
              )}
            </div>
          ))
        ) : (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No conditions in this group.
          </p>
        )}
      </div>
    </div>
  )
}

function CriteriaLeafView({
  criteria,
  fields,
}: {
  criteria: WorkflowCriteria
  fields?: JsonSchemaProperty[]
}) {
  if (!criteria.field || !criteria.operator) {
    return (
      <div className="rounded-xl border bg-background px-4 py-3 text-sm text-muted-foreground">
        Incomplete condition.
      </div>
    )
  }

  const operator =
    operatorLabels[criteria.operator as CompareOperator] ?? criteria.operator
  const property = fields?.find((field) => field.name === criteria.field)
  const label = property ? columnLabel(property) : propertyLabel(criteria.field)

  return (
    <div className="rounded-xl border bg-background p-4 shadow-xs">
      <div className="grid gap-4 sm:grid-cols-3">
        <WorkflowCriterionPart label="Field">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {criteria.field}
          </p>
        </WorkflowCriterionPart>
        <WorkflowCriterionPart label="Comparison">
          <p className="text-sm">{operator}</p>
        </WorkflowCriterionPart>
        <WorkflowCriterionPart label="Value">
          <p className="text-sm font-medium">
            {stringifyWorkflowValue(criteria.value)}
          </p>
        </WorkflowCriterionPart>
      </div>
    </div>
  )
}

export function WorkflowNodesView({
  definition,
}: {
  definition?: WorkflowDefinitionBody
}) {
  const levels = getPipelineLevels(
    definition?.nodes ? ({ nodes: definition.nodes } as JsonObject) : {}
  )
  if (levels.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        This workflow does not declare any nodes.
      </p>
    )
  }
  return (
    <div className="mt-6 [&>div:first-child]:hidden">
      <PipelineLevelsView levels={levels} />
    </div>
  )
}

export function WorkflowEmptyAdd({
  title,
  description,
  onClick,
  compact = false,
}: {
  title: string
  description: string
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors hover:border-foreground/20 hover:bg-muted/40",
        compact
          ? "gap-1 px-3 py-4"
          : "gap-1.5 px-4 py-8"
      )}
    >
      <span className="text-sm font-medium">{title}</span>
      <span
        className={cn(
          "text-muted-foreground",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </span>
    </button>
  )
}
