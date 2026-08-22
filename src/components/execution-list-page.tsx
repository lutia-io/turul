import { useMemo, useState } from "react"
import { PlayIcon } from "lucide-react"

import {
  DataTable,
  DataTableCellLink,
  DataTablePage,
  DataTableToolbar,
  compareText,
  dataTableCount,
  matchesQuery,
  toggleSort,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/data-table"
import { RunFilterBar, RunStatusPill } from "@/components/run-card"
import { Button } from "@/components/ui/button"
import type { BadgeColor } from "@/lib/badge"
import { getBadgeColor } from "@/lib/badge"
import type { RunStatus } from "@/data/runs"
import {
  formatRelativeTime,
  formatRunDuration,
  isActiveRun,
  runProgress,
  type RunFilter,
} from "@/lib/runs"
import type { Network } from "@/data/networks"
import { cn } from "@/lib/utils"

export type ExecutionListItem = {
  id: string
  name: string
  href: string
  status: RunStatus
  color: BadgeColor
  network: Network
  organizationName?: string
  currentLabel?: string
  currentIndex: number
  total: number
  startedAt: string
  finishedAt?: string
}

type ExecutionSortKey =
  | "name"
  | "status"
  | "network"
  | "organization"
  | "current"
  | "progress"
  | "started"
  | "duration"

const statusRank: Record<RunStatus, number> = {
  Running: 0,
  Queued: 1,
  Paused: 2,
  Failed: 3,
  Succeeded: 4,
}

export function ExecutionListPage({
  title,
  description,
  startLabel,
  itemLabel,
  unit,
  items,
  emptyLabel,
  showNetwork = true,
  showOrganization = true,
}: {
  title: string
  description: string
  startLabel: string
  itemLabel: string
  unit: string
  items: ExecutionListItem[]
  emptyLabel: string
  showNetwork?: boolean
  showOrganization?: boolean
}) {
  const [filter, setFilter] = useState<RunFilter>("active")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<DataTableSort<ExecutionSortKey>>({
    key: "started",
    direction: "desc",
  })
  const counts = {
    all: items.length,
    active: items.filter((item) => isActiveRun(item.status)).length,
    succeeded: items.filter((item) => item.status === "Succeeded").length,
    failed: items.filter((item) => item.status === "Failed").length,
  }
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "all") return true
        if (filter === "active") return isActiveRun(item.status)
        if (filter === "succeeded") return item.status === "Succeeded"
        return item.status === "Failed"
      }),
    [filter, items]
  )
  const searched = filtered.filter((item) =>
    matchesQuery(query, [
      item.name,
      item.status,
      item.network.name,
      item.organizationName,
      item.currentLabel,
      item.id,
    ])
  )
  const rows = [...searched].sort((left, right) => {
    const result = compareExecutions(left, right, sort.key)
    return sort.direction === "asc" ? result : -result
  })

  const columns: DataTableColumn<ExecutionListItem, ExecutionSortKey>[] = [
    {
      key: "name",
      label: itemLabel === "workflow" ? "Workflow" : "Pipeline",
      render: (item) => (
        <DataTableCellLink
          to={item.href}
          className="max-w-[22rem] font-medium hover:underline"
        >
          {item.name}
        </DataTableCellLink>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item) => (
        <DataTableCellLink to={item.href}>
          <RunStatusPill status={item.status} />
        </DataTableCellLink>
      ),
    },
    ...(showNetwork
      ? [
          {
            key: "network" as const,
            label: "Network",
            className: "text-muted-foreground",
            render: (item: ExecutionListItem) => (
              <DataTableCellLink to={item.href}>
                {item.network.name}
              </DataTableCellLink>
            ),
          },
        ]
      : []),
    ...(showOrganization
      ? [
          {
            key: "organization" as const,
            label: "Organization",
            className: "text-muted-foreground",
            render: (item: ExecutionListItem) => (
              <DataTableCellLink to={item.href}>
                {item.organizationName ?? "—"}
              </DataTableCellLink>
            ),
          },
        ]
      : []),
    {
      key: "current",
      label: unit,
      render: (item) => (
        <DataTableCellLink to={item.href} className="max-w-[16rem]">
          {item.status === "Queued"
            ? "Waiting to start"
            : (item.currentLabel ?? `${unit} ${item.currentIndex}`)}
        </DataTableCellLink>
      ),
    },
    {
      key: "progress",
      label: "Progress",
      render: (item) => {
        const progress = runProgress(
          item.currentIndex,
          item.total,
          item.status
        )
        const tone = getBadgeColor(item.color)
        return (
          <DataTableCellLink
            to={item.href}
            className="flex items-center gap-2"
          >
            <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "h-full rounded-full",
                  item.status === "Failed" ? "bg-red-500" : tone.bg,
                  item.status === "Running" && "animate-pulse"
                )}
                style={{
                  width: `${Math.max(progress, item.status === "Running" ? 8 : 0)}%`,
                }}
              />
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {item.currentIndex}/{item.total}
            </span>
          </DataTableCellLink>
        )
      },
    },
    {
      key: "started",
      label: "Started",
      className: "text-muted-foreground",
      render: (item) => (
        <DataTableCellLink to={item.href} className="whitespace-nowrap">
          {formatRelativeTime(item.startedAt)}
        </DataTableCellLink>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      className: "text-muted-foreground tabular-nums",
      render: (item) => (
        <DataTableCellLink to={item.href} className="whitespace-nowrap">
          {formatRunDuration(item)}
        </DataTableCellLink>
      ),
    },
  ]

  return (
    <DataTablePage
      title={title}
      description={description}
      action={
        <Button>
          <PlayIcon />
          {startLabel}
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={`Search ${itemLabel}s...`}
        filters={
          <RunFilterBar value={filter} onChange={setFilter} counts={counts} />
        }
        count={dataTableCount({
          visible: rows.length,
          total: items.length,
          singular: itemLabel,
        })}
      />
      <DataTable
        columns={columns}
        rows={rows}
        sort={sort}
        onSort={(key) =>
          setSort((current) =>
            toggleSort(current, key, ["started", "duration", "progress"])
          )
        }
        getRowId={(item) => item.id}
        empty={emptyLabel}
      />
    </DataTablePage>
  )
}

function compareExecutions(
  left: ExecutionListItem,
  right: ExecutionListItem,
  key: ExecutionSortKey
) {
  if (key === "status") {
    return statusRank[left.status] - statusRank[right.status]
  }
  if (key === "network") {
    return compareText(left.network.name, right.network.name)
  }
  if (key === "organization") {
    return compareText(
      left.organizationName ?? "",
      right.organizationName ?? ""
    )
  }
  if (key === "current") {
    return left.currentIndex - right.currentIndex
  }
  if (key === "progress") {
    return (
      runProgress(left.currentIndex, left.total, left.status) -
      runProgress(right.currentIndex, right.total, right.status)
    )
  }
  if (key === "started") {
    return (
      new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime()
    )
  }
  if (key === "duration") {
    return durationMs(left) - durationMs(right)
  }
  return compareText(left.name, right.name)
}

function durationMs(item: ExecutionListItem) {
  const end = item.finishedAt ? new Date(item.finishedAt).getTime() : Date.now()
  return end - new Date(item.startedAt).getTime()
}
