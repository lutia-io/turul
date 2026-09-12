import type { ReactNode } from "react"
import { Link } from "react-router"
import {
  CircleAlertIcon,
  ClockIcon,
  LoaderCircleIcon,
  type LucideIcon,
} from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"

export function countByStatus<T>(items: T[], statusOf: (item: T) => string) {
  return items.reduce(
    (counts, item) => {
      if (statusOf(item) === "Draft") {
        counts.draft += 1
      } else {
        counts.live += 1
      }
      return counts
    },
    { live: 0, draft: 0 }
  )
}

const snapshotTones = {
  running: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  queued: "bg-amber-500/10 text-amber-800 dark:text-amber-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  attention: "bg-amber-500/10 text-amber-800 dark:text-amber-400",
} as const

const snapshotIcons = {
  running: LoaderCircleIcon,
  queued: ClockIcon,
  failed: CircleAlertIcon,
  attention: CircleAlertIcon,
} as const

export function SnapshotChip({
  kind,
  value,
  label,
}: {
  kind: keyof typeof snapshotTones
  value: number
  label: string
}) {
  const Icon = snapshotIcons[kind]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        snapshotTones[kind],
        kind === "running" && value > 0 && "[&_svg]:animate-spin"
      )}
    >
      <Icon className="size-3.5" />
      <span className="tabular-nums">{value}</span>
      {label}
    </span>
  )
}

export type MetricItem = {
  to: string
  label: string
  value: number
  detail: string
  color: BadgeColor
  icon: LucideIcon
}

function MetricTile({
  to,
  label,
  value,
  detail,
  color,
  icon: Icon,
}: MetricItem) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="flex min-w-0 items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40"
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </Link>
  )
}

function MetricTileSkeleton({
  label,
  color,
  icon: Icon,
}: Pick<MetricItem, "label" | "color" | "icon">) {
  const tone = getBadgeColor(color)

  return (
    <div className="flex min-w-0 items-start gap-3 px-4 py-4">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

function metricCellClass(index: number, count: number) {
  const last = index === count - 1

  return cn(
    "min-w-0 border-border",
    !last && "border-b xl:border-b-0",
    index % 2 === 0 && "sm:border-r",
    "xl:border-r xl:last:border-r-0",
    last && count % 2 === 1 && "sm:col-span-2 sm:border-r-0 xl:col-span-1"
  )
}

export function MetricStrip({
  items,
  columns = items.length,
}: {
  items: MetricItem[]
  columns?: number
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:grid-cols-2",
        columns >= 6 ? "xl:grid-cols-6" : "xl:grid-cols-5"
      )}
    >
      {items.map((item, index) => (
        <div key={item.label} className={metricCellClass(index, items.length)}>
          <MetricTile {...item} />
        </div>
      ))}
    </div>
  )
}

export function MetricStripSkeleton({
  items,
}: {
  items: Pick<MetricItem, "label" | "color" | "icon">[]
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 sm:grid-cols-2",
        items.length >= 6 ? "xl:grid-cols-6" : "xl:grid-cols-5"
      )}
    >
      {items.map((item, index) => (
        <div key={item.label} className={metricCellClass(index, items.length)}>
          <MetricTileSkeleton {...item} />
        </div>
      ))}
    </div>
  )
}

export function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const tone = getBadgeColor(item.color)
        const Icon = item.icon

        return (
          <Link
            key={item.label}
            to={item.to}
            className="flex min-w-0 items-start gap-3 rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
                {item.value}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function DashboardPage({
  children,
  tone = "workspace",
}: {
  children: ReactNode
  tone?: "workspace" | "network"
}) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col gap-6 p-4 sm:p-6",
        tone === "workspace" && "bg-background",
        tone === "network" && "bg-muted/50"
      )}
    >
      {children}
    </div>
  )
}

export function DashboardHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  color,
  badges,
  chips,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  color?: BadgeColor
  badges?: ReactNode
  chips?: ReactNode
  actions?: ReactNode
}) {
  const tone = getBadgeColor(color)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon ? (
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl",
              tone.bg,
              tone.text
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className={cn(
                "text-2xl font-semibold tracking-tight sm:text-3xl",
                eyebrow ? "mt-1" : null
              )}
            >
              {title}
            </h1>
            {badges}
          </div>
          {description ? (
            <div className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {description}
            </div>
          ) : null}
          {chips ? (
            <div className="mt-3 flex flex-wrap gap-2">{chips}</div>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export function DashboardSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
