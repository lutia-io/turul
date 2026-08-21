import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  PlayIcon,
  SearchIcon,
} from "lucide-react"

import { RunFilterBar, RunStatusPill } from "@/components/run-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  const [sort, setSort] = useState<{
    key: ExecutionSortKey
    direction: "asc" | "desc"
  }>({
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
  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return filtered
    }

    return filtered.filter((item) =>
      [
        item.name,
        item.status,
        item.network.name,
        item.organizationName ?? "",
        item.currentLabel ?? "",
        item.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [filtered, query])
  const rows = useMemo(() => {
    const copy = [...searched]
    copy.sort((left, right) => {
      const result = compareExecutions(left, right, sort.key)
      return sort.direction === "asc" ? result : -result
    })
    return copy
  }, [searched, sort])
  const columnCount = 6 + (showNetwork ? 1 : 0) + (showOrganization ? 1 : 0)

  function toggleSort(key: ExecutionSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : {
            key,
            direction:
              key === "started" || key === "duration" || key === "progress"
                ? "desc"
                : "asc",
          }
    )
  }

  return (
    <div className="flex h-[calc(100svh-var(--app-header-height))] min-h-0 flex-col gap-4 overflow-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Button>
          <PlayIcon />
          {startLabel}
        </Button>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative w-full max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${itemLabel}s...`}
              className="h-8 bg-background pl-8"
            />
          </div>
          <RunFilterBar value={filter} onChange={setFilter} counts={counts} />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {rows.length === items.length
            ? `${items.length} ${itemLabel}${items.length === 1 ? "" : "s"}`
            : `${rows.length} of ${items.length} ${itemLabel}s`}
        </p>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead
                label={itemLabel === "workflow" ? "Workflow" : "Pipeline"}
                sortKey="name"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Status"
                sortKey="status"
                sort={sort}
                onSort={toggleSort}
              />
              {showNetwork ? (
                <SortableHead
                  label="Network"
                  sortKey="network"
                  sort={sort}
                  onSort={toggleSort}
                />
              ) : null}
              {showOrganization ? (
                <SortableHead
                  label="Organization"
                  sortKey="organization"
                  sort={sort}
                  onSort={toggleSort}
                />
              ) : null}
              <SortableHead
                label={unit}
                sortKey="current"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Progress"
                sortKey="progress"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Started"
                sortKey="started"
                sort={sort}
                onSort={toggleSort}
              />
              <SortableHead
                label="Duration"
                sortKey="duration"
                sort={sort}
                onSort={toggleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((item) => {
                const progress = runProgress(
                  item.currentIndex,
                  item.total,
                  item.status
                )
                const tone = getBadgeColor(item.color)
                const current =
                  item.status === "Queued"
                    ? "Waiting to start"
                    : (item.currentLabel ?? `${unit} ${item.currentIndex}`)

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        to={item.href}
                        className="block max-w-[22rem] truncate font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={item.href} className="block">
                        <RunStatusPill status={item.status} />
                      </Link>
                    </TableCell>
                    {showNetwork ? (
                      <TableCell className="text-muted-foreground">
                        <Link to={item.href} className="block truncate">
                          {item.network.name}
                        </Link>
                      </TableCell>
                    ) : null}
                    {showOrganization ? (
                      <TableCell className="text-muted-foreground">
                        <Link to={item.href} className="block truncate">
                          {item.organizationName ?? "—"}
                        </Link>
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <Link
                        to={item.href}
                        className="block max-w-[16rem] truncate"
                      >
                        {current}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={item.href} className="flex items-center gap-2">
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
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link to={item.href} className="block whitespace-nowrap">
                        {formatRelativeTime(item.startedAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      <Link to={item.href} className="block whitespace-nowrap">
                        {formatRunDuration(item)}
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: ExecutionSortKey
  sort: { key: ExecutionSortKey; direction: "asc" | "desc" }
  onSort: (key: ExecutionSortKey) => void
}) {
  const direction = sort.key === sortKey ? sort.direction : undefined
  const Icon =
    direction === "asc"
      ? ArrowUpIcon
      : direction === "desc"
        ? ArrowDownIcon
        : ChevronsUpDownIcon

  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <Icon className="size-3.5 opacity-60" />
      </button>
    </TableHead>
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
    return left.network.name.localeCompare(right.network.name)
  }

  if (key === "organization") {
    return (left.organizationName ?? "").localeCompare(
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

  return left.name.localeCompare(right.name, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function durationMs(item: ExecutionListItem) {
  const end = item.finishedAt ? new Date(item.finishedAt).getTime() : Date.now()
  return end - new Date(item.startedAt).getTime()
}
