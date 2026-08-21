import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import { RunStatusBadge } from "@/components/run-card"
import {
  getWorkflowActions,
  type WorkflowAction,
} from "@/data/workflow-actions"
import type { DefinitionStep } from "@/lib/json-definition"
import { stringifyDefinition, type JsonObject } from "@/lib/json-definition"
import { cn } from "@/lib/utils"

const actionStatusLabel = {
  succeeded: "Succeeded",
  failed: "Failed",
  running: "Running",
} as const

export function WorkflowActionsJournal({
  workflowId,
  steps,
}: {
  workflowId: string
  steps: DefinitionStep[]
}) {
  const actions = getWorkflowActions(workflowId)
  const groups = groupActions(actions, steps)

  return (
    <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Actions</h2>
        <p className="text-sm text-muted-foreground">
          Append-only journal of action attempts. Failed attempts are kept.
        </p>
      </div>
      {groups.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {groups.map((group) => (
            <li
              key={group.actionIndex}
              className="overflow-hidden rounded-xl border bg-background"
            >
              <div className="flex items-center gap-3 border-b px-3.5 py-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs">
                  {group.actionIndex}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {group.step?.name ?? `Action ${group.actionIndex}`}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {group.step?.type ?? group.actions[0]?.actionType}
                  </p>
                </div>
              </div>
              <ul className="divide-y">
                {group.actions.map((action) => (
                  <ActionAttempt key={action.id} action={action} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          No action attempts yet. Queued workflows wait until the first step
          starts.
        </p>
      )}
    </section>
  )
}

function ActionAttempt({ action }: { action: WorkflowAction }) {
  const durationMs =
    new Date(action.completedAt).getTime() -
    new Date(action.startedAt).getTime()

  return (
    <li className="px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          attempt {action.attempt}
        </span>
        <RunStatusBadge status={actionStatusLabel[action.status]} />
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(durationMs)}
        </span>
      </div>
      {action.error ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">
          {action.error}
        </p>
      ) : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <JsonBlock label="input" value={action.input} />
        <JsonBlock label="output" value={action.output} />
      </div>
    </li>
  )
}

function JsonBlock({ label, value }: { label: string; value?: JsonObject }) {
  const [open, setOpen] = useState(false)

  if (!value) {
    return (
      <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
        {label} · none
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs font-medium"
      >
        {label}
        <ChevronDownIcon
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <pre className="overflow-auto border-t px-2.5 py-2 font-mono text-[11px] leading-relaxed">
          {stringifyDefinition(value)}
        </pre>
      ) : null}
    </div>
  )
}

function groupActions(actions: WorkflowAction[], steps: DefinitionStep[]) {
  const byIndex = new Map<number, WorkflowAction[]>()

  for (const action of actions) {
    const existing = byIndex.get(action.actionIndex) ?? []
    existing.push(action)
    byIndex.set(action.actionIndex, existing)
  }

  return [...byIndex.entries()].map(([actionIndex, group]) => ({
    actionIndex,
    step: steps.find((step) => step.order - 1 === actionIndex),
    actions: group,
  }))
}

function formatDuration(ms: number) {
  if (ms < 1000) {
    return `${Math.max(ms, 0)}ms`
  }

  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }

  return `${Math.round(seconds / 60)}m`
}
