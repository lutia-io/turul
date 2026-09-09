import { type ReactNode } from "react"
import { Link } from "react-router"
import {
  FileJsonIcon,
  type LucideIcon,
} from "lucide-react"

import { propertyLabel } from "@/components/schema-records-table"
import type { PipelineDefinition, Schema } from "@/data/networks"
import { cn } from "@/lib/utils"
import {
  actionDataEntries,
  actionTypeDescriptions,
  actionTypeLabels,
  hasCriteria,
  logicLabels,
  operatorLabels,
  stringifyWorkflowValue,
  type CompareOperator,
  type CriteriaLogic,
  type WorkflowAction,
  type WorkflowCriteria,
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

export function WorkflowSectionHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function WorkflowLogicJoiner({ logic }: { logic: CriteriaLogic }) {
  return (
    <div className="flex items-center gap-3 py-2" aria-hidden="true">
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
}: {
  criteria?: WorkflowCriteria
}) {
  if (!hasCriteria(criteria)) {
    return (
      <p className="text-sm text-muted-foreground">
        This workflow does not declare any conditions.
      </p>
    )
  }

  if (criteria?.logic) {
    return <CriteriaGroupView criteria={criteria} depth={0} />
  }

  return <CriteriaLeafView criteria={criteria!} />
}

function CriteriaGroupView({
  criteria,
  depth,
}: {
  criteria: WorkflowCriteria
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
                <CriteriaGroupView criteria={condition} depth={depth + 1} />
              ) : (
                <CriteriaLeafView criteria={condition} />
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

function CriteriaLeafView({ criteria }: { criteria: WorkflowCriteria }) {
  if (!criteria.field || !criteria.operator) {
    return (
      <div className="rounded-xl border bg-background px-4 py-3 text-sm text-muted-foreground">
        Incomplete condition.
      </div>
    )
  }

  const operator =
    operatorLabels[criteria.operator as CompareOperator] ?? criteria.operator

  return (
    <div className="rounded-xl border bg-background p-4 shadow-xs">
      <div className="grid gap-4 sm:grid-cols-3">
        <WorkflowCriterionPart label="Field">
          <p className="text-sm font-medium">{propertyLabel(criteria.field)}</p>
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

export function WorkflowActionView({
  action,
  index,
  last,
  schemas,
  pipelines,
  href,
}: {
  action: WorkflowAction
  index: number
  last: boolean
  schemas: Schema[]
  pipelines: PipelineDefinition[]
  href: (rest?: string) => string
}) {
  const label = actionTypeLabels[action.type] ?? action.type
  const description = actionTypeDescriptions[action.type]
  const schemaId =
    typeof action.context.schemaId === "string"
      ? action.context.schemaId
      : undefined
  const recordId =
    typeof action.context.recordId === "string"
      ? action.context.recordId
      : undefined
  const pipelineRef =
    typeof action.context.pipeline === "string"
      ? action.context.pipeline
      : undefined
  const schema = schemaId
    ? schemas.find((item) => item.id === schemaId)
    : undefined
  const pipeline = pipelineRef
    ? pipelines.find(
        (item) => item.id === pipelineRef || item.slug === pipelineRef
      )
    : undefined
  const data = actionDataEntries(action)
  const hasMeta = Boolean(schemaId || recordId || pipelineRef || data.length)

  return (
    <li className="relative flex gap-3.5">
      {last ? null : (
        <span className="absolute top-8 bottom-0 left-[15px] w-px bg-border" />
      )}
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-medium">
        {index + 1}
      </span>
      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        <div className="rounded-xl border bg-background p-4 shadow-xs">
          <p className="text-sm font-medium">{label}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
          {hasMeta ? (
            <dl className="mt-4 space-y-3">
              {schemaId ? (
                <ActionMeta label="Schema">
                  {schema ? (
                    <Link
                      to={href(`schemas/${schema.id}`)}
                      className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                    >
                      <FileJsonIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{schema.name}</span>
                    </Link>
                  ) : (
                    <span className="font-mono text-xs font-normal">
                      {schemaId}
                    </span>
                  )}
                </ActionMeta>
              ) : null}
              {recordId ? (
                <ActionMeta label="Record">
                  <span className="font-mono text-xs font-normal">
                    {recordId}
                  </span>
                </ActionMeta>
              ) : null}
              {pipelineRef ? (
                <ActionMeta label="Pipeline">
                  {pipeline ? (
                    <Link
                      to={href(`pipeline-definitions/${pipeline.id}`)}
                      className="hover:underline"
                    >
                      {pipeline.name}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs font-normal">
                      {pipelineRef}
                    </span>
                  )}
                </ActionMeta>
              ) : null}
              {data.length > 0 ? (
                <ActionMeta
                  label={
                    action.type === "TRIGGER_PIPELINE" ? "Input" : "Fields"
                  }
                >
                  <ul className="space-y-1.5">
                    {data.map(([name, value]) => (
                      <li
                        key={name}
                        className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-baseline gap-3"
                      >
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {name}
                        </span>
                        <span className="truncate text-sm">
                          {stringifyWorkflowValue(value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ActionMeta>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function ActionMeta({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  )
}

export function WorkflowEmptyAdd({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-8 text-center transition-colors hover:border-foreground/20 hover:bg-muted/40"
    >
      <span className="text-sm font-medium">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  )
}
