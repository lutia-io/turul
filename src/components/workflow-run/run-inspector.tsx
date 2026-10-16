import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleAlertIcon,
  FileIcon,
  FilterIcon,
  Table2Icon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

import { visualForNodeType } from "@/components/pipeline-flow/pipeline-flow-nodes"
import { Button } from "@/components/ui/button"
import { WorkflowTriggerBadges } from "@/components/workflow-rule"
import {
  CONDITIONS_ID,
  TRIGGER_ID,
  allNodes,
  attemptDurationMs,
  formatAbsoluteTime,
  formatMs,
  isSuccessStatus,
  type LevelView,
  type NodeView,
  type StepState,
} from "@/components/workflow-run/run-model"
import {
  ConditionList,
  JsonPanel,
  StatePill,
} from "@/components/workflow-run/run-parts"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import {
  isNodeType,
  nodeConfigSummary,
  nodeTypeDescriptions,
  nodeTypeLabel,
} from "@/lib/node-definition"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import {
  criteriaSummary,
  hasCriteria,
  triggerSummary,
} from "@/lib/workflow-definition"
import type { ApiWorkflow } from "@/store/workflow-slice"

export function RunInspector({
  run,
  levels,
  fields,
  selected,
  order,
  onSelect,
  recordHref,
  fileHref,
}: {
  run: ApiWorkflow
  levels: LevelView[]
  fields: JsonSchemaProperty[]
  selected: string
  order: string[]
  onSelect: (id: string) => void
  recordHref?: string
  fileHref: (fileId: string) => string
}) {
  const index = order.indexOf(selected)
  const previous = index > 0 ? order[index - 1] : undefined
  const next = index < order.length - 1 ? order[index + 1] : undefined
  const node = allNodes(levels).find((item) => item.key === selected)

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
      {selected === TRIGGER_ID ? (
        <TriggerPanel run={run} fields={fields} recordHref={recordHref} />
      ) : selected === CONDITIONS_ID ? (
        <ConditionsPanel run={run} fields={fields} />
      ) : node ? (
        <NodePanel
          key={node.key}
          node={node}
          totalLevels={levels.length}
          fileHref={fileHref}
        />
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          disabled={!previous}
          onClick={() => previous && onSelect(previous)}
        >
          <ArrowLeftIcon />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {index + 1} of {order.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={!next}
          onClick={() => next && onSelect(next)}
        >
          Next
          <ArrowRightIcon />
        </Button>
      </div>
    </section>
  )
}

function PanelHeader({
  icon: Icon,
  iconClassName,
  eyebrow,
  title,
  description,
  state,
  stateLabel,
}: {
  icon: LucideIcon
  iconClassName: string
  eyebrow: string
  title: string
  description?: string
  state: StepState
  stateLabel?: string
}) {
  return (
    <div className="flex items-start gap-4">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          iconClassName
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <StatePill state={state} label={stateLabel} />
        </div>
        <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-pretty">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function TriggerPanel({
  run,
  fields,
  recordHref,
}: {
  run: ApiWorkflow
  fields: JsonSchemaProperty[]
  recordHref?: string
}) {
  const hasData = run.data && Object.keys(run.data).length > 0
  const [tab, setTab] = useState<"input" | "record">("input")

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <PanelHeader
        icon={ZapIcon}
        iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
        eyebrow="Trigger"
        title={triggerSummary(run.definition.trigger, fields)}
        description={`This is what started the run, ${formatRelativeTime(run.createdAt)}.`}
        state="done"
        stateLabel="Fired"
      />
      <div className="flex flex-wrap items-center gap-2">
        <WorkflowTriggerBadges trigger={run.definition.trigger} />
        {recordHref ? (
          <Link
            to={recordHref}
            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted/70"
          >
            <Table2Icon className="size-3.5 text-muted-foreground" />
            Open the record
          </Link>
        ) : null}
      </div>
      <div className="space-y-3">
        {hasData ? (
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "input", label: "Input" },
              { id: "record", label: "Record data" },
            ]}
          />
        ) : (
          <p className="text-sm font-medium">Input</p>
        )}
        {tab === "record" && hasData ? (
          <JsonPanel value={run.data} emptyMessage="No record data." />
        ) : (
          <JsonPanel
            value={run.input}
            emptyMessage="This run started without any input."
          />
        )}
      </div>
    </div>
  )
}

function ConditionsPanel({
  run,
  fields,
}: {
  run: ApiWorkflow
  fields: JsonSchemaProperty[]
}) {
  const criteria = run.definition.criteria
  const declared = hasCriteria(criteria)

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <PanelHeader
        icon={FilterIcon}
        iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
        eyebrow="Conditions"
        title={
          declared
            ? criteriaSummary(criteria, fields)
            : "No conditions to check"
        }
        description={
          declared
            ? "Every rule below was true when the trigger fired, so the workflow went ahead."
            : "This workflow runs every time its trigger fires."
        }
        state="done"
        stateLabel="Matched"
      />
      {declared ? <ConditionList criteria={criteria} fields={fields} /> : null}
    </div>
  )
}

type NodeTab = "output" | "input" | "attempts" | "config"

function NodePanel({
  node,
  totalLevels,
  fileHref,
}: {
  node: NodeView
  totalLevels: number
  fileHref: (fileId: string) => string
}) {
  const [tab, setTab] = useState<NodeTab>("output")
  const visual = visualForNodeType(node.type)
  const label = nodeTypeLabel(node.type)
  const summary = nodeConfigSummary(node.type, node.definition)
  const latest = node.attempts.at(-1)
  const files = latest?.payload?.files ?? []

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <PanelHeader
        icon={visual.icon}
        iconClassName={visual.wrap}
        eyebrow={`Step ${node.levelIndex + 1} of ${totalLevels} · Action ${node.nodeIndex + 1}`}
        title={summary && summary !== label ? `${label}: ${summary}` : label}
        description={
          isNodeType(node.type) ? nodeTypeDescriptions[node.type] : undefined
        }
        state={node.state}
        stateLabel={node.retrying ? "Retrying" : undefined}
      />

      {latest?.error && node.state !== "done" ? (
        <div className="flex items-start gap-3 rounded-xl bg-red-500/5 p-4 ring-1 ring-red-500/20">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">
              {node.retrying
                ? `Try ${node.attempts.length} failed, trying again`
                : node.attempts.length > 1
                  ? `Failed after ${node.attempts.length} tries`
                  : "This action failed"}
            </p>
            <p className="text-sm break-words text-red-700 dark:text-red-400">
              {latest.error}
            </p>
          </div>
        </div>
      ) : null}

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border">
        <Metric label={node.retrying ? "Last try took" : "Duration"}>
          {latest ? formatMs(attemptDurationMs(latest)) : "—"}
        </Metric>
        <Metric label="Tries">{node.attempts.length || "—"}</Metric>
        <Metric label="Started">
          {latest ? (
            <span title={formatAbsoluteTime(latest.startedAt)}>
              {formatRelativeTime(latest.startedAt)}
            </span>
          ) : (
            "—"
          )}
        </Metric>
      </dl>

      <div className="space-y-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "output", label: "Output" },
            { id: "input", label: "Input" },
            {
              id: "attempts",
              label: "Attempts",
              count: node.attempts.length,
            },
            { id: "config", label: "Settings" },
          ]}
        />
        {tab === "output" ? (
          <>
            <JsonPanel
              value={latest?.output}
              emptyMessage={emptyMessage(node, "output")}
            />
            {files.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {files.map((file) => (
                  <li key={file.fileId}>
                    <Link
                      to={fileHref(file.fileId)}
                      className="inline-flex max-w-60 items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs ring-1 ring-foreground/10 transition-colors hover:bg-muted"
                    >
                      <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {file.filename ?? file.fileId}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : tab === "input" ? (
          <JsonPanel
            value={latest?.input}
            emptyMessage={emptyMessage(node, "input")}
          />
        ) : tab === "attempts" ? (
          <AttemptList node={node} />
        ) : (
          <JsonPanel
            value={node.definition}
            emptyMessage="This action has no settings."
          />
        )}
      </div>
    </div>
  )
}

function emptyMessage(node: NodeView, kind: "input" | "output") {
  switch (node.state) {
    case "running":
      return "This action is running now. Its data shows up when it finishes."
    case "waiting":
      return "This action hasn't started yet. It runs once the earlier steps finish."
    case "skipped":
      return "This action didn't run because an earlier step failed."
    default:
      return kind === "output"
        ? "This action didn't return any output."
        : "This action didn't receive any input."
  }
}

function AttemptList({ node }: { node: NodeView }) {
  if (node.attempts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage(node, "output")}
      </div>
    )
  }

  return (
    <ol className="relative space-y-3 pl-6">
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[7px] w-0.5 rounded-full bg-border"
      />
      {node.attempts.map((attempt) => {
        const ok = isSuccessStatus(attempt.status)
        return (
          <li key={attempt.id} className="relative">
            <span
              className={cn(
                "absolute top-1.5 -left-6 size-4 rounded-full ring-4 ring-card",
                ok ? "bg-emerald-500" : "bg-red-500"
              )}
            />
            <div className="rounded-xl border bg-background px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Try {attempt.attempt}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                  <span title={formatAbsoluteTime(attempt.startedAt)}>
                    {formatRelativeTime(attempt.startedAt)}
                  </span>
                  <span>·</span>
                  <span>{formatMs(attemptDurationMs(attempt))}</span>
                  <StatePill state={ok ? "done" : "failed"} />
                </div>
              </div>
              {attempt.error ? (
                <p className="mt-1.5 text-sm break-words text-red-700 dark:text-red-400">
                  {attempt.error}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
      {node.retrying ? (
        <li className="relative">
          <span className="absolute top-1.5 -left-6 size-4 animate-pulse rounded-full bg-cyan-500 ring-4 ring-card" />
          <p className="px-1 py-1 text-sm text-muted-foreground">
            Try {node.attempts.length + 1} is running now…
          </p>
        </li>
      ) : null}
    </ol>
  )
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-background px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums">
        {children}
      </dd>
    </div>
  )
}

function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T
  onChange: (value: T) => void
  items: { id: T; label: string; count?: number }[]
}) {
  return (
    <div
      role="tablist"
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
            value === item.id && "bg-background text-foreground shadow-xs"
          )}
        >
          {item.label}
          {item.count ? (
            <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[10px] tabular-nums">
              {item.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
