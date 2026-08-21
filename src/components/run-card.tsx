import { getBadgeColor, statusBadgeConfig } from "@/lib/badge"
import { type RunFilter } from "@/lib/runs"
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

export function RunStatusPill({ status }: { status: RunStatus }) {
  const config = statusBadgeConfig[status]
  const Icon = config?.icon ?? statusBadgeConfig.Running.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "Running" &&
          "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
        status === "Queued" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        status === "Succeeded" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "Failed" && "bg-red-500/10 text-red-700 dark:text-red-400",
        status === "Paused" && "bg-muted text-muted-foreground"
      )}
    >
      <Icon
        className={cn("size-3.5", status === "Running" && "animate-spin")}
      />
      {status}
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
