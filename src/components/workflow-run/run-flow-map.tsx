import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react"
import { FilterIcon, FlagIcon, ZapIcon, type LucideIcon } from "lucide-react"

import { visualForNodeType } from "@/components/pipeline-flow/pipeline-flow-nodes"
import { StateDot, StatePill } from "@/components/workflow-run/run-parts"
import {
  CONDITIONS_ID,
  TRIGGER_ID,
  formatMs,
  levelDurationMs,
  nodeDurationMs,
  stepStateLabel,
  stepStateTone,
  type LevelView,
  type StepState,
} from "@/components/workflow-run/run-model"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import { nodeConfigSummary, nodeTypeLabel } from "@/lib/node-definition"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import {
  countCriteriaLeaves,
  hasCriteria,
  triggerFromApi,
  triggerKindShortLabels,
  triggerSummary,
} from "@/lib/workflow-definition"
import type { ApiWorkflow } from "@/store/workflow-slice"

const CONNECTOR_WIDTH = 48

export function RunFlowMap({
  run,
  levels,
  fields,
  selected,
  order,
  onSelect,
}: {
  run: ApiWorkflow
  levels: LevelView[]
  fields: JsonSchemaProperty[]
  selected: string
  order: string[]
  onSelect: (id: string) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const conditionCount = countCriteriaLeaves(run.definition.criteria)
  const trigger = triggerFromApi(run.definition.trigger)

  useEffect(() => {
    const scroller = scrollerRef.current
    const card = scroller?.querySelector<HTMLElement>(
      `[data-flow-id="${selected}"]`
    )
    if (!scroller || !card) {
      return
    }
    const left =
      card.offsetLeft - scroller.clientWidth / 2 + card.clientWidth / 2
    scroller.scrollTo({ left, behavior: "smooth" })
  }, [selected])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return
    }
    event.preventDefault()
    const index = order.indexOf(selected)
    const next =
      order[
        Math.min(
          Math.max(index + (event.key === "ArrowRight" ? 1 : -1), 0),
          order.length - 1
        )
      ]
    onSelect(next)
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-flow-id="${next}"]`)
      ?.focus({ preventScroll: true })
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Flow</h2>
          <p className="text-sm text-muted-foreground">
            Select any card to inspect it. Use the arrow keys to step through.
          </p>
        </div>
        <Legend />
      </div>

      <div
        ref={scrollerRef}
        onKeyDown={onKeyDown}
        className="relative overflow-x-auto"
      >
        <div className="flex min-w-max items-stretch px-5 py-6 sm:px-6">
          <FlowColumn label="Trigger">
            <FlowCard
              id={TRIGGER_ID}
              selected={selected === TRIGGER_ID}
              onSelect={onSelect}
              state="done"
              icon={ZapIcon}
              iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
              title={triggerKindShortLabels[trigger.kind]}
              subtitle={triggerSummary(run.definition.trigger, fields)}
              footer={formatRelativeTime(run.createdAt)}
            />
          </FlowColumn>
          <Connector state="done" />
          <FlowColumn label="Conditions">
            <FlowCard
              id={CONDITIONS_ID}
              selected={selected === CONDITIONS_ID}
              onSelect={onSelect}
              state="done"
              icon={FilterIcon}
              iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
              title={
                hasCriteria(run.definition.criteria)
                  ? `${conditionCount} ${conditionCount === 1 ? "condition" : "conditions"}`
                  : "Always runs"
              }
              subtitle="Matched"
            />
          </FlowColumn>
          {levels.map((level) => (
            <LevelColumn
              key={level.index}
              level={level}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
          <Connector state={finishConnectorState(run.status)} />
          <FlowColumn label="Finish">
            <FinishCard run={run} />
          </FlowColumn>
        </div>
      </div>
    </section>
  )
}

function LevelColumn({
  level,
  selected,
  onSelect,
}: {
  level: LevelView
  selected: string
  onSelect: (id: string) => void
}) {
  const parallel = level.nodes.length > 1
  const duration = levelDurationMs(level)

  return (
    <>
      <Connector state={connectorStateFor(level.state)} />
      <FlowColumn
        label={`Step ${level.index + 1}`}
        aside={
          duration != null && level.state !== "running" ? (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {formatMs(duration)}
            </span>
          ) : (
            <span
              className={cn("text-[11px]", stepStateTone[level.state].text)}
            >
              {stepStateLabel[level.state]}
            </span>
          )
        }
      >
        <div
          className={cn(
            "flex flex-col gap-2",
            parallel &&
              "rounded-2xl border border-dashed border-foreground/15 bg-background/60 p-2"
          )}
        >
          {parallel ? (
            <p className="px-1 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Runs together
            </p>
          ) : null}
          {level.nodes.map((node) => {
            const visual = visualForNodeType(node.type)
            const label = nodeTypeLabel(node.type)
            const summary = nodeConfigSummary(node.type, node.definition)
            const duration = nodeDurationMs(node)
            const tries = node.attempts.length
            return (
              <FlowCard
                key={node.key}
                id={node.key}
                selected={selected === node.key}
                onSelect={onSelect}
                state={node.state}
                icon={visual.icon}
                iconClassName={visual.wrap}
                title={label}
                subtitle={summary !== label ? summary : undefined}
                footer={
                  node.retrying
                    ? `Retrying · try ${tries + 1}`
                    : duration != null
                      ? `${formatMs(duration)}${tries > 1 ? ` · ${tries} tries` : ""}`
                      : undefined
                }
              />
            )
          })}
        </div>
      </FlowColumn>
    </>
  )
}

function FlowColumn({
  label,
  aside,
  children,
}: {
  label: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col">
      <div className="flex h-7 items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </span>
        {aside}
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  )
}

function FlowCard({
  id,
  selected,
  onSelect,
  state,
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  footer,
}: {
  id: string
  selected: boolean
  onSelect: (id: string) => void
  state: StepState
  icon: LucideIcon
  iconClassName: string
  title: string
  subtitle?: string
  footer?: string
}) {
  return (
    <button
      type="button"
      data-flow-id={id}
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-56 items-start gap-3 rounded-xl border bg-background p-3 text-left shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        stepStateTone[state].border,
        selected &&
          "-translate-y-0.5 border-transparent shadow-md ring-2 ring-primary"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          iconClassName
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
        {footer ? (
          <span className="mt-1 block truncate text-[11px] text-muted-foreground tabular-nums">
            {footer}
          </span>
        ) : null}
      </span>
      <StateDot state={state} className="absolute -top-2 -right-2" />
    </button>
  )
}

function FinishCard({ run }: { run: ApiWorkflow }) {
  const state: StepState =
    run.status === "completed"
      ? "done"
      : run.status === "failed"
        ? "failed"
        : "waiting"
  const title =
    run.status === "completed"
      ? "Finished"
      : run.status === "failed"
        ? "Stopped"
        : run.status === "pending"
          ? "Not started"
          : "In progress"

  return (
    <div
      className={cn(
        "flex w-44 items-center gap-3 rounded-xl border bg-background p-3 shadow-xs",
        stepStateTone[state].border
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          stepStateTone[state].marker
        )}
      >
        <FlagIcon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {run.completedAt ? (
          <span className="block truncate text-xs text-muted-foreground">
            {formatRelativeTime(run.completedAt)}
          </span>
        ) : (
          <StatePill
            state={run.status === "running" ? "running" : "waiting"}
            label={run.status === "running" ? "Live" : "Queued"}
            className="mt-0.5"
          />
        )}
      </span>
    </div>
  )
}

function connectorStateFor(state: StepState): StepState {
  if (state === "done" || state === "failed") {
    return "done"
  }
  return state
}

function finishConnectorState(status: ApiWorkflow["status"]): StepState {
  if (status === "completed") {
    return "done"
  }
  if (status === "failed") {
    return "skipped"
  }
  return "waiting"
}

function Connector({ state }: { state: StepState }) {
  const dashed = state !== "done"
  return (
    <div className="flex shrink-0 flex-col" aria-hidden>
      <div className="h-7" />
      <div className="flex flex-1 items-center">
        <svg
          width={CONNECTOR_WIDTH}
          height={12}
          viewBox={`0 0 ${CONNECTOR_WIDTH} 12`}
          className={cn("overflow-visible", stepStateTone[state].stroke)}
          fill="none"
        >
          <line
            x1={4}
            y1={6}
            x2={CONNECTOR_WIDTH - 6}
            y2={6}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={dashed ? "4 5" : undefined}
          >
            {state === "running" ? (
              <animate
                attributeName="stroke-dashoffset"
                from="18"
                to="0"
                dur="0.6s"
                repeatCount="indefinite"
              />
            ) : null}
          </line>
          <path
            d={`M${CONNECTOR_WIDTH - 9} 2 L${CONNECTOR_WIDTH - 4} 6 L${CONNECTOR_WIDTH - 9} 10`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

function Legend() {
  const items: StepState[] = ["done", "running", "failed", "waiting"]
  return (
    <ul className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {items.map((state) => (
        <li key={state} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "size-2 rounded-full",
              state === "waiting"
                ? "ring-1 ring-muted-foreground/40"
                : stepStateTone[state].bar
            )}
          />
          {stepStateLabel[state]}
        </li>
      ))}
    </ul>
  )
}
