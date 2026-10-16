import { HourglassIcon } from "lucide-react"

import { visualForNodeType } from "@/components/pipeline-flow/pipeline-flow-nodes"
import {
  allNodes,
  formatMs,
  isSuccessStatus,
  type LevelView,
  type NodeView,
} from "@/components/workflow-run/run-model"
import { nodeTypeLabel } from "@/lib/node-definition"
import { cn } from "@/lib/utils"
import type { ApiWorkflow } from "@/store/workflow-slice"

type Bar = {
  id: string
  start: number
  end: number
  tone: "done" | "failed" | "running"
  label: string
}

const barTone: Record<Bar["tone"], string> = {
  done: "bg-emerald-500",
  failed: "bg-red-500",
  running: "animate-pulse bg-cyan-500",
}

export function RunTiming({
  run,
  levels,
  now,
  selected,
  onSelect,
}: {
  run: ApiWorkflow
  levels: LevelView[]
  now: number
  selected: string
  onSelect: (id: string) => void
}) {
  const nodes = allNodes(levels)
  const attempts = nodes.flatMap((node) => node.attempts)
  const live = run.status === "running" || run.status === "pending"
  const start = new Date(run.createdAt).getTime()
  const lastAttemptEnd = Math.max(
    start,
    ...attempts.map((attempt) => new Date(attempt.completedAt).getTime())
  )
  const end = Math.max(
    run.completedAt
      ? new Date(run.completedAt).getTime()
      : live
        ? now
        : lastAttemptEnd,
    lastAttemptEnd,
    start + 1
  )
  const total = end - start
  const rows = nodes
    .map((node) => ({ node, bars: barsFor(node, levels, start, now) }))
    .filter((row) => row.bars.length > 0)
  const firstStart = attempts.length
    ? Math.min(
        ...attempts.map((attempt) => new Date(attempt.startedAt).getTime())
      )
    : undefined
  const queueWait = firstStart != null ? firstStart - start : undefined

  return (
    <section className="min-w-0 rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Where the time went
          </h2>
          <p className="text-sm text-muted-foreground">
            Each bar is one try, placed on the run's clock. Red bars are tries
            that failed.
          </p>
        </div>
        {queueWait != null && queueWait >= 1000 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <HourglassIcon className="size-3.5" />
            Waited {formatMs(queueWait)} before the first action
          </span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {run.status === "pending"
            ? "Timing shows up once the first action starts."
            : "No timing was recorded for this run."}
        </div>
      ) : (
        <div className="mt-5">
          <ul className="space-y-1">
            {rows.map(({ node, bars }) => {
              const visual = visualForNodeType(node.type)
              const Icon = visual.icon
              return (
                <li key={node.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(node.key)}
                    className={cn(
                      "grid w-full grid-cols-[8rem_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60 sm:grid-cols-[11rem_minmax(0,1fr)]",
                      selected === node.key && "bg-muted"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md",
                          visual.wrap
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">
                          {nodeTypeLabel(node.type)}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          Step {node.levelIndex + 1}
                        </span>
                      </span>
                    </span>
                    <span className="relative h-6 rounded-md bg-muted/60">
                      {bars.map((bar) => {
                        const left = ((bar.start - start) / total) * 100
                        const width = Math.max(
                          ((bar.end - bar.start) / total) * 100,
                          0.8
                        )
                        return (
                          <span
                            key={bar.id}
                            title={bar.label}
                            className={cn(
                              "absolute inset-y-1 rounded-sm",
                              barTone[bar.tone]
                            )}
                            style={{
                              left: `${Math.min(left, 99.2)}%`,
                              width: `${Math.min(width, 100 - left)}%`,
                            }}
                          />
                        )
                      })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-2 grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <span />
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <span key={fraction}>
                  {fraction === 0 ? "0s" : formatMs(total * fraction)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function barsFor(
  node: NodeView,
  levels: LevelView[],
  runStart: number,
  now: number
): Bar[] {
  const bars: Bar[] = node.attempts.map((attempt) => {
    const ok = isSuccessStatus(attempt.status)
    const startedAt = new Date(attempt.startedAt).getTime()
    const completedAt = new Date(attempt.completedAt).getTime()
    return {
      id: attempt.id,
      start: startedAt,
      end: completedAt,
      tone: ok ? "done" : "failed",
      label: `Try ${attempt.attempt} · ${ok ? "Succeeded" : "Failed"} · ${formatMs(completedAt - startedAt)}`,
    }
  })

  if (node.state === "running") {
    const previousEnd = levels
      .slice(0, node.levelIndex)
      .flatMap((level) => level.nodes.flatMap((item) => item.attempts))
      .reduce(
        (latest, attempt) =>
          Math.max(latest, new Date(attempt.completedAt).getTime()),
        runStart
      )
    const startedAt = bars.at(-1)?.end ?? previousEnd
    bars.push({
      id: `${node.key}-running`,
      start: startedAt,
      end: Math.max(now, startedAt),
      tone: "running",
      label: `Running for ${formatMs(now - startedAt)}`,
    })
  }

  return bars
}
