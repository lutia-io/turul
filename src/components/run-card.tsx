import { Link } from "react-router"
import { type LucideIcon } from "lucide-react"

import { getBadgeColor, statusBadgeConfig, type BadgeColor } from "@/lib/badge"
import {
  formatRelativeTime,
  formatRunDuration,
  runProgress,
  type RunFilter,
} from "@/lib/runs"
import type { RunStatus } from "@/data/runs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const config = statusBadgeConfig[status]
  const Icon = config?.icon ?? statusBadgeConfig.Running.icon
  const tone = getBadgeColor(config?.color)

  return (
    <span className="inline-flex items-center" title={status}>
      <Icon
        className={cn(
          "size-4",
          tone.fg,
          status === "Running" && "animate-spin"
        )}
      />
      <span className="sr-only">{status}</span>
    </span>
  )
}

export function RunFilterBar({
  value,
  onChange,
  counts,
}: {
  value: RunFilter
  onChange: (value: RunFilter) => void
  counts: { active: number; succeeded: number; failed: number; all: number }
}) {
  const filters: { id: RunFilter; label: string; count: number }[] = [
    { id: "active", label: "Active", count: counts.active },
    { id: "succeeded", label: "Succeeded", count: counts.succeeded },
    { id: "failed", label: "Failed", count: counts.failed },
    { id: "all", label: "All", count: counts.all },
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((filter) => (
        <Button
          key={filter.id}
          size="sm"
          variant={value === filter.id ? "default" : "outline"}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
          <span className="tabular-nums opacity-70">{filter.count}</span>
        </Button>
      ))}
    </div>
  )
}

export function RunCard({
  to,
  name,
  status,
  color,
  icon: Icon,
  networkName,
  organizationName,
  currentLabel,
  currentIndex,
  total,
  unit,
  startedAt,
  finishedAt,
}: {
  to: string
  name: string
  status: RunStatus
  color: BadgeColor
  icon: LucideIcon
  networkName: string
  organizationName?: string
  currentLabel?: string
  currentIndex: number
  total: number
  unit: string
  startedAt: string
  finishedAt?: string
}) {
  const tone = getBadgeColor(color)
  const progress = runProgress(currentIndex, total, status)
  const stepLabel =
    status === "Queued"
      ? "Waiting to start"
      : currentLabel
        ? `${unit} ${currentIndex} of ${total} · ${currentLabel}`
        : `${unit} ${currentIndex} of ${total}`

  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background shadow-xs transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-center gap-3.5 px-3.5 py-3">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-lg",
            tone.bg,
            tone.text
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 truncate font-medium">{name}</p>
            <span className="shrink-0">
              <RunStatusBadge status={status} />
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                status === "Running" &&
                  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
                status === "Queued" &&
                  "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                status === "Succeeded" &&
                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                status === "Failed" &&
                  "bg-red-500/10 text-red-700 dark:text-red-400",
                status === "Paused" && "bg-muted text-muted-foreground"
              )}
            >
              {status}
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {networkName}
            {organizationName ? ` · ${organizationName}` : ""} · {stepLabel}
          </p>
        </div>
      </div>
      <div className="border-t bg-muted/40 px-3.5 py-2.5">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          <span
            className={cn(
              "h-full rounded-full",
              status === "Failed" ? "bg-red-500" : tone.bg,
              status === "Running" && "animate-pulse"
            )}
            style={{
              width: `${Math.max(progress, status === "Running" ? 8 : 0)}%`,
            }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {status === "Succeeded" || status === "Failed"
            ? `${status === "Succeeded" ? "Finished" : "Failed"} ${formatRelativeTime(finishedAt ?? startedAt)} · ran ${formatRunDuration({ status, startedAt, finishedAt })}`
            : `Started ${formatRelativeTime(startedAt)} · ${formatRunDuration({ status, startedAt, finishedAt })} elapsed`}
        </p>
      </div>
    </Link>
  )
}
