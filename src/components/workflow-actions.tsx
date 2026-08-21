import { useMemo, useState } from "react"
import { ChevronDownIcon, SearchIcon } from "lucide-react"

import { RunStatusPill } from "@/components/run-card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getWorkflowActions,
  type WorkflowAction,
  type WorkflowActionStatus,
} from "@/data/workflow-actions"
import type { RunStatus } from "@/data/runs"
import type { DefinitionStep } from "@/lib/json-definition"
import { stringifyDefinition, type JsonObject } from "@/lib/json-definition"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"

const actionStatusLabel: Record<WorkflowActionStatus, RunStatus> = {
  succeeded: "Succeeded",
  failed: "Failed",
  running: "Running",
}

export function WorkflowActionsJournal({
  workflowId,
  steps,
}: {
  workflowId: string
  steps: DefinitionStep[]
}) {
  const actions = getWorkflowActions(workflowId)
  const [query, setQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string>()
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const labeled = actions.map((action) => {
      const step = steps.find((item) => item.order - 1 === action.actionIndex)
      return {
        action,
        step,
        name: step?.name ?? `Action ${action.actionIndex}`,
        type: step?.type ?? action.actionType,
      }
    })

    if (!needle) {
      return labeled
    }

    return labeled.filter((row) =>
      [
        row.name,
        row.type,
        row.action.status,
        row.action.error ?? "",
        String(row.action.actionIndex),
        String(row.action.attempt),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [actions, query, steps])

  return (
    <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Actions</h2>
          <p className="text-sm text-muted-foreground">
            Append-only journal of action attempts. Failed attempts are kept.
          </p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {rows.length === actions.length
            ? `${actions.length} attempt${actions.length === 1 ? "" : "s"}`
            : `${rows.length} of ${actions.length} attempts`}
        </p>
      </div>

      {actions.length > 0 ? (
        <>
          <div className="relative w-full max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search actions..."
              className="h-8 bg-background pl-8"
            />
          </div>
          <div className="overflow-auto rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Attempt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map(({ action, name, type }) => {
                    const durationMs =
                      new Date(action.completedAt).getTime() -
                      new Date(action.startedAt).getTime()
                    const expanded = expandedId === action.id

                    return (
                      <ActionRows
                        key={action.id}
                        action={action}
                        name={name}
                        type={type}
                        durationMs={durationMs}
                        expanded={expanded}
                        onToggle={() =>
                          setExpandedId(expanded ? undefined : action.id)
                        }
                      />
                    )
                  })
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No actions match this search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No action attempts yet. Queued workflows wait until the first step
          starts.
        </p>
      )}
    </section>
  )
}

function ActionRows({
  action,
  name,
  type,
  durationMs,
  expanded,
  onToggle,
}: {
  action: WorkflowAction
  name: string
  type: string
  durationMs: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer"
        data-selected={expanded}
        onClick={onToggle}
      >
        <TableCell className="font-mono text-muted-foreground tabular-nums">
          {action.actionIndex}
        </TableCell>
        <TableCell className="max-w-[16rem] truncate font-medium">
          {name}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {type}
        </TableCell>
        <TableCell className="tabular-nums">{action.attempt}</TableCell>
        <TableCell>
          <RunStatusPill status={actionStatusLabel[action.status]} />
        </TableCell>
        <TableCell className="text-muted-foreground tabular-nums">
          {formatDuration(durationMs)}
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {formatRelativeTime(action.startedAt)}
        </TableCell>
        <TableCell className="max-w-[18rem] truncate text-red-700 dark:text-red-400">
          {action.error ?? <span className="text-muted-foreground">—</span>}
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="bg-muted/30">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-muted-foreground">
                Attempt details
              </p>
              <ChevronDownIcon className="size-3.5 rotate-180 text-muted-foreground" />
            </div>
            {action.error ? (
              <p className="mb-2 text-sm text-red-700 dark:text-red-400">
                {action.error}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <JsonBlock label="input" value={action.input} />
              <JsonBlock label="output" value={action.output} />
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

function JsonBlock({ label, value }: { label: string; value?: JsonObject }) {
  const [open, setOpen] = useState(true)

  if (!value) {
    return (
      <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
        {label} · none
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-background ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
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
