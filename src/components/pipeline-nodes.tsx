import { useMemo, useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import { RunStatusPill } from "@/components/run-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RunStatus } from "@/data/runs"
import { stringifyDefinition, type JsonObject } from "@/lib/json-definition"
import { nodeTypeLabel } from "@/lib/node-definition"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListPipelineNodesQuery,
  type ApiPipelineNode,
  type ApiSnapshotNode,
} from "@/store/pipeline-slice"

const nodeStatusLabel: Record<string, RunStatus> = {
  completed: "Succeeded",
  failed: "Failed",
  succeeded: "Succeeded",
  running: "Running",
}

function asJsonObject(value: unknown): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject
  }
  return undefined
}

export function PipelineNodesJournal({
  pipelineId,
  snapshot,
}: {
  pipelineId: string
  snapshot: ApiSnapshotNode[][]
}) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListPipelineNodesQuery(pipelineId, {
    skip: !isAuthenticated || !pipelineId,
  })
  const nodes = query.data ?? []
  const [expandedId, setExpandedId] = useState<string>()
  const rows = useMemo(
    () =>
      nodes.map((node) => {
        const snap = snapshot[node.levelIndex]?.[node.nodeIndex]
        return {
          node,
          name: snap?.name ?? node.nodeSlug ?? `Node ${node.nodeIndex}`,
          type: snap?.type ?? node.nodeType,
        }
      }),
    [nodes, snapshot]
  )

  return (
    <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Nodes</h2>
          <p className="text-sm text-muted-foreground">
            Append-only journal of node attempts. Failed attempts are kept.
          </p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {query.isLoading
            ? "Loading..."
            : `${nodes.length} attempt${nodes.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(query.error, "Failed to load pipeline nodes")}
        </p>
      ) : query.isLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading node attempts...
        </p>
      ) : nodes.length > 0 ? (
        <div className="overflow-auto rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">Lvl</TableHead>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ node, name, type }) => {
                const durationMs =
                  new Date(node.completedAt).getTime() -
                  new Date(node.startedAt).getTime()
                const expanded = expandedId === node.id

                return (
                  <NodeRows
                    key={node.id}
                    node={node}
                    name={name}
                    type={type}
                    durationMs={durationMs}
                    expanded={expanded}
                    onToggle={() =>
                      setExpandedId(expanded ? undefined : node.id)
                    }
                  />
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No node attempts yet. Queued pipelines wait until the first level
          starts.
        </p>
      )}
    </section>
  )
}

function NodeRows({
  node,
  name,
  type,
  durationMs,
  expanded,
  onToggle,
}: {
  node: ApiPipelineNode
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
          {node.levelIndex}
        </TableCell>
        <TableCell className="font-mono text-muted-foreground tabular-nums">
          {node.nodeIndex}
        </TableCell>
        <TableCell className="max-w-[16rem] truncate font-medium">
          {name}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {nodeTypeLabel(type)}
        </TableCell>
        <TableCell className="tabular-nums">{node.attempt}</TableCell>
        <TableCell>
          <RunStatusPill status={nodeStatusLabel[node.status] ?? "Queued"} />
        </TableCell>
        <TableCell className="text-muted-foreground tabular-nums">
          {formatDuration(durationMs)}
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {formatRelativeTime(node.startedAt)}
        </TableCell>
        <TableCell className="max-w-[18rem] truncate text-red-700 dark:text-red-400">
          {node.error ?? <span className="text-muted-foreground">—</span>}
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={9} className="bg-muted/30">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-muted-foreground">
                Attempt details
              </p>
              <ChevronDownIcon className="size-3.5 rotate-180 text-muted-foreground" />
            </div>
            {node.error ? (
              <p className="mb-2 text-sm text-red-700 dark:text-red-400">
                {node.error}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <JsonBlock label="input" value={asJsonObject(node.input)} />
              <JsonBlock label="output" value={asJsonObject(node.output)} />
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
