import type { ReactNode } from "react"
import { ArrowDownIcon } from "lucide-react"

import { columnLabel, propertyLabel } from "@/components/schema-records-table"
import {
  WorkflowTriggerBadges,
  workflowLogicTone,
} from "@/components/workflow-rule"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import { nodeConfigSummary, nodeTypeLabel } from "@/lib/node-definition"
import type { PipelineLevelDraft } from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"
import {
  criteriaToApi,
  countCriteriaLeaves,
  hasCriteria,
  operatorLabels,
  stringifyWorkflowValue,
  triggerSummary,
  triggerToApi,
  type CompareOperator,
  type CriteriaGroupDraft,
  type CriteriaLogic,
  type TriggerDraft,
  type TriggerKind,
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
      <div className="shrink-0 border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">Snapshot</p>
          <div className="flex items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground">
            <StatChip>{conditionCount} if</StatChip>
            <StatChip>{nodeCount} actions</StatChip>
          </div>
        </div>
        <p className="mt-1 truncate text-[11px] leading-snug text-muted-foreground">
          {triggerSummary(triggerApi, fields)}
          {schemaName ? ` · ${schemaName}` : ""}
          {conditionCount > 0
            ? ` · ${conditionCount} ${conditionCount === 1 ? "condition" : "conditions"}`
            : " · always"}
          {nodeCount > 0
            ? ` · ${nodeCount} ${nodeCount === 1 ? "node" : "nodes"}`
            : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <PreviewSection label="When" accent={triggerAccentBar(trigger.kind)}>
          <div className="flex flex-wrap items-center gap-1">
            <WorkflowTriggerBadges trigger={trigger} className="gap-1" />
            {schemaName ? <MetaChip>{schemaName}</MetaChip> : null}
          </div>
          {changedLabels.length > 0 ? (
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              <span className="text-muted-foreground/70">Fields </span>
              {changedLabels.join(", ")}
            </p>
          ) : null}
          {trigger.kind === "schedule" ? (
            <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground">
              {triggerSummary(triggerApi, fields)}
            </p>
          ) : null}
        </PreviewSection>

        <PreviewSection label="If" accent="bg-sky-500">
          {hasCriteria(criteriaApi) && criteriaApi ? (
            <CriteriaSnapshot criteria={criteriaApi} fields={fields} />
          ) : (
            <p className="text-[11px] text-muted-foreground">Always matches</p>
          )}
        </PreviewSection>

        <PreviewSection label="Actions" accent="bg-violet-500" last>
          {nodeLevels.length > 0 ? (
            <FlowSnapshot nodeLevels={nodeLevels} />
          ) : (
            <p className="text-[11px] text-muted-foreground">{emptyThenHint}</p>
          )}
        </PreviewSection>
      </div>
    </aside>
  )
}

function triggerAccentBar(kind: TriggerKind) {
  if (kind === "schedule") {
    return "bg-violet-500"
  }
  if (kind === "updated") {
    return "bg-amber-500"
  }
  return "bg-emerald-500"
}

function PreviewSection({
  label,
  accent,
  children,
  last = false,
}: {
  label: string
  accent: string
  children: ReactNode
  last?: boolean
}) {
  return (
    <section
      className={cn(
        "relative px-3 py-2.5 pl-3.5",
        !last && "border-b border-border/70"
      )}
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-[3px]", accent)}
        aria-hidden
      />
      <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </section>
  )
}

function StatChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-medium">
      {children}
    </span>
  )
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  )
}

function CriteriaSnapshot({
  criteria,
  fields,
  depth = 0,
}: {
  criteria: WorkflowCriteria
  fields: JsonSchemaProperty[]
  depth?: number
}) {
  if (criteria.logic) {
    const logic = criteria.logic as CriteriaLogic
    const conditions = criteria.conditions ?? []
    const tone = workflowLogicTone[logic]

    return (
      <div className={cn(depth > 0 && "rounded-md bg-muted/40 px-1.5 py-1")}>
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded px-1 py-px font-mono text-[10px] font-semibold tracking-wider",
              tone.badge
            )}
          >
            {logic}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {conditions.length}
          </span>
        </div>
        <ul className="space-y-0.5">
          {conditions.map((child, index) => (
            <li key={index}>
              {index > 0 ? (
                <p
                  className={cn(
                    "py-0.5 text-center font-mono text-[9px] font-semibold tracking-[0.16em]",
                    tone.text
                  )}
                  aria-hidden
                >
                  {logic}
                </p>
              ) : null}
              {child.logic ? (
                <CriteriaSnapshot
                  criteria={child}
                  fields={fields}
                  depth={depth + 1}
                />
              ) : (
                <ConditionLine leaf={child} fields={fields} />
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return <ConditionLine leaf={criteria} fields={fields} />
}

function ConditionLine({
  leaf,
  fields,
}: {
  leaf: { field?: string; operator?: string; value?: unknown }
  fields: JsonSchemaProperty[]
}) {
  if (!leaf.field || !leaf.operator) {
    return (
      <p className="text-[11px] text-muted-foreground">Incomplete condition</p>
    )
  }

  const property = fields.find((field) => field.name === leaf.field)
  const label = property
    ? columnLabel(property)
    : propertyLabel(leaf.field)
  const operator =
    operatorLabels[leaf.operator as CompareOperator] ?? leaf.operator

  return (
    <p className="truncate font-mono text-[11px] leading-snug">
      <span className="text-foreground/90">{label}</span>{" "}
      <span className="text-muted-foreground/75">{operator}</span>{" "}
      <span className="text-foreground/90">
        {stringifyWorkflowValue(leaf.value as never)}
      </span>
    </p>
  )
}

function FlowSnapshot({ nodeLevels }: { nodeLevels: PipelineLevelDraft[] }) {
  return (
    <ol className="space-y-0">
      {nodeLevels.map((level, levelIndex) => {
        const parallel = level.nodes.length > 1

        return (
          <li key={level.key}>
            {levelIndex > 0 ? (
              <div className="flex justify-center py-1" aria-hidden>
                <ArrowDownIcon className="size-2.5 text-muted-foreground/50" />
              </div>
            ) : null}
            <div
              className={cn(
                parallel
                  ? "grid gap-1"
                  : "flex flex-col gap-1",
                parallel &&
                  (level.nodes.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]")
              )}
            >
              {level.nodes.map((node) => {
                const summary = nodeConfigSummary(node.type, node.definition)
                const typeLabel = nodeTypeLabel(node.type)
                const showSummary = summary && summary !== typeLabel

                return (
                  <div
                    key={node.key}
                    className="min-w-0 rounded-md bg-muted/55 px-1.5 py-1"
                    title={showSummary ? `${typeLabel} · ${summary}` : typeLabel}
                  >
                    <p className="truncate text-[11px] font-medium leading-tight">
                      {typeLabel}
                    </p>
                    {showSummary ? (
                      <p className="mt-0.5 truncate font-mono text-[10px] leading-tight text-muted-foreground">
                        {summary}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
