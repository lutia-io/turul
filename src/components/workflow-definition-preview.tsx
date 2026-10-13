import type { ReactNode } from "react"
import {
  ClockIcon,
  FilterIcon,
  WorkflowIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

import { columnLabel } from "@/components/schema-records-table"
import { WorkflowTriggerBadges } from "@/components/workflow-rule"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import { nodeTypeLabel } from "@/lib/node-definition"
import {
  pipelineLevelTitle,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"
import {
  criteriaSummary,
  criteriaToApi,
  countCriteriaLeaves,
  hasCriteria,
  operatorLabels,
  stringifyWorkflowValue,
  triggerSummary,
  triggerToApi,
  workflowDraftSentence,
  type CompareOperator,
  type CriteriaGroupDraft,
  type TriggerDraft,
  type WorkflowCriteria,
} from "@/lib/workflow-definition"

export function WorkflowDefinitionPreview({
  trigger,
  criteria,
  levels,
  fields,
  schemaName,
  className,
  emptyThenHint = "Add nodes to run after the rule matches",
}: {
  trigger: TriggerDraft
  criteria: CriteriaGroupDraft
  levels: PipelineLevelDraft[]
  fields: JsonSchemaProperty[]
  schemaName?: string
  className?: string
  emptyThenHint?: string
}) {
  const triggerApi = triggerToApi(trigger)
  const criteriaApi = criteriaToApi(criteria, fields)
  const sentence = workflowDraftSentence(trigger, criteria, levels, fields)
  const nodeLevels = levels.filter((level) => level.nodes.length > 0)
  const nodeCount = nodeLevels.reduce(
    (count, level) => count + level.nodes.length,
    0
  )
  const conditionCount = countCriteriaLeaves(criteriaApi)
  const changedLabels =
    trigger.kind === "updated" || trigger.kind === "created_updated"
      ? trigger.changed.map((name) => {
          const field = fields.find((item) => item.name === name)
          return field ? columnLabel(field) : name
        })
      : []

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="shrink-0 border-b px-3.5 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Preview</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {conditionCount} if · {nodeCount} then
          </p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-pretty text-muted-foreground">
          {sentence}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        <ol className="space-y-0">
          <SnapshotStep
            icon={trigger.kind === "schedule" ? ClockIcon : WorkflowIcon}
            label="When"
            detail={triggerSummary(triggerApi, fields)}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <WorkflowTriggerBadges trigger={trigger} />
              {schemaName ? (
                <SnapshotChip muted>{schemaName}</SnapshotChip>
              ) : null}
              {changedLabels.map((label) => (
                <SnapshotChip key={label}>{label}</SnapshotChip>
              ))}
            </div>
          </SnapshotStep>

          <SnapshotStep
            icon={FilterIcon}
            label="If"
            detail={
              hasCriteria(criteriaApi)
                ? criteriaSummary(criteriaApi, fields)
                : "Always"
            }
            connector
          >
            {hasCriteria(criteriaApi) ? (
              <ul className="space-y-1">
                {flattenCriteriaLeaves(criteriaApi).map((leaf, index) => (
                  <li key={`${leaf.field}-${index}`}>
                    <ConditionLine leaf={leaf} fields={fields} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                No extra conditions
              </p>
            )}
          </SnapshotStep>

          <SnapshotStep
            icon={ZapIcon}
            label="Then"
            detail={
              nodeCount > 0
                ? `${nodeCount} ${nodeCount === 1 ? "node" : "nodes"} · ${nodeLevels.length} ${nodeLevels.length === 1 ? "level" : "levels"}`
                : "No nodes"
            }
            connector
            last
          >
            {nodeLevels.length > 0 ? (
              <FlowSnapshot levels={levels} nodeLevels={nodeLevels} />
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {emptyThenHint}
              </p>
            )}
          </SnapshotStep>
        </ol>
      </div>
    </aside>
  )
}

function SnapshotStep({
  icon: Icon,
  label,
  detail,
  children,
  connector = false,
  last = false,
}: {
  icon: LucideIcon
  label: string
  detail: string
  children?: ReactNode
  connector?: boolean
  last?: boolean
}) {
  return (
    <li className="relative flex gap-2.5">
      <div className="flex w-5 shrink-0 flex-col items-center">
        {connector ? (
          <span className="h-2 w-px shrink-0 bg-border" aria-hidden />
        ) : (
          <span className="h-2 shrink-0" aria-hidden />
        )}
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-card">
          <Icon className="size-2.5" />
        </span>
        {!last ? (
          <span className="w-px flex-1 bg-border" aria-hidden />
        ) : null}
      </div>
      <div className={cn("min-w-0 flex-1 pb-4", last && "pb-0")}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="min-w-0 text-xs text-pretty text-foreground/80">
            {detail}
          </p>
        </div>
        {children ? <div className="mt-1.5">{children}</div> : null}
      </div>
    </li>
  )
}

function SnapshotChip({
  children,
  muted = false,
}: {
  children: ReactNode
  muted?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px]",
        muted
          ? "bg-muted text-muted-foreground"
          : "bg-foreground/[0.06] text-foreground"
      )}
    >
      {children}
    </span>
  )
}

function ConditionLine({
  leaf,
  fields,
}: {
  leaf: { field: string; operator: string; value: unknown }
  fields: JsonSchemaProperty[]
}) {
  const property = fields.find((field) => field.name === leaf.field)
  const label = property ? columnLabel(property) : leaf.field
  const operator =
    operatorLabels[leaf.operator as CompareOperator] ?? leaf.operator

  return (
    <p className="truncate font-mono text-[11px] leading-snug text-muted-foreground">
      <span className="text-foreground/85">{label}</span>{" "}
      <span className="text-muted-foreground/80">{operator}</span>{" "}
      <span className="text-foreground/85">
        {stringifyWorkflowValue(leaf.value as never)}
      </span>
    </p>
  )
}

function FlowSnapshot({
  levels,
  nodeLevels,
}: {
  levels: PipelineLevelDraft[]
  nodeLevels: PipelineLevelDraft[]
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2">
      <div className="flex flex-col gap-1">
        {nodeLevels.map((level, levelIndex) => {
          const absoluteIndex = levels.findIndex(
            (item) => item.key === level.key
          )
          const index = absoluteIndex >= 0 ? absoluteIndex : levelIndex
          const parallel = level.nodes.length > 1

          return (
            <div key={level.key} className="flex flex-col gap-1">
              {levelIndex > 0 ? (
                <div className="flex justify-center py-0.5" aria-hidden>
                  <span className="h-2.5 w-px bg-foreground/15" />
                </div>
              ) : null}
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-10 shrink-0 text-right font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {pipelineLevelTitle(index)
                    .replace("Level ", "L")
                    .toUpperCase()}
                </span>
                <div
                  className={cn(
                    "min-w-0 flex-1",
                    parallel ? "flex flex-wrap gap-1" : "flex flex-col gap-1"
                  )}
                >
                  {level.nodes.map((node) => (
                    <span
                      key={node.key}
                      className="inline-flex min-w-0 max-w-full items-baseline gap-1 rounded-md border border-foreground/8 bg-background px-1.5 py-1 text-[11px] leading-tight shadow-xs"
                      title={`${node.name.trim() || "Untitled"} · ${nodeTypeLabel(node.type)}`}
                    >
                      <span className="size-1.5 shrink-0 translate-y-px rounded-full bg-foreground/35" />
                      <span className="min-w-0 truncate font-medium">
                        {node.name.trim() || "Untitled"}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {nodeTypeLabel(node.type)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function flattenCriteriaLeaves(
  criteria: WorkflowCriteria | undefined
): { field: string; operator: string; value: unknown }[] {
  if (!criteria) {
    return []
  }
  if (criteria.logic) {
    return (criteria.conditions ?? []).flatMap((child) =>
      flattenCriteriaLeaves(child)
    )
  }
  if (!criteria.field || !criteria.operator) {
    return []
  }
  return [
    {
      field: criteria.field,
      operator: criteria.operator,
      value: criteria.value,
    },
  ]
}
