import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { PlayIcon, ViewIcon } from "lucide-react"
import { useTable } from "@tanstack/react-table"

import {
  DataTableCellLink,
  DataTablePage,
  DataTableToolbar,
  dataTablePageSummary,
  matchesQuery,
} from "@/components/data-table"
import {
  createManagedColumnHelper,
  DataTableActiveFilters,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableRowActions,
  DataTableView,
  DataTableViewOptions,
  managedTableFeatures,
  stringFilterChipValue,
  type ColumnPinningState,
  type DataTableActiveFilter,
  type PaginationState,
  type SortingState,
  type StringFilterOp,
} from "@/components/data-table-view"
import { RunStatusPill } from "@/components/run-card"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { RunStatus } from "@/data/runs"
import { getBadgeColor } from "@/lib/badge"
import {
  formatRelativeTime,
  formatRunDuration,
  listPipelineRunViews,
  runProgress,
} from "@/lib/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"

type PipelineRunRow = {
  id: string
  name: string
  href: string
  status: RunStatus
  networkName: string
  organizationName: string
  currentLabel: string
  currentIndex: number
  total: number
  startedAt: string
  finishedAt?: string
}

const helper = createManagedColumnHelper<PipelineRunRow>()

type PipelineColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  status?: RunStatus
  organization?: { op: StringFilterOp; value: string }
}

const statusOptions: { value: RunStatus; label: string }[] = [
  { value: "Queued", label: "Queued" },
  { value: "Running", label: "Running" },
  { value: "Succeeded", label: "Succeeded" },
  { value: "Failed", label: "Failed" },
]

function headerPin(column: {
  getIsPinned: () => false | "start" | "end"
  pin: (position: false | "start" | "end") => void
}) {
  return {
    position: column.getIsPinned(),
    onPin: (position: false | "start" | "end") => column.pin(position),
  }
}

function matchesString(
  value: string,
  filter?: { op: StringFilterOp; value: string }
) {
  if (!filter) {
    return true
  }
  if (filter.op === "empty") {
    return value.trim() === ""
  }
  const haystack = value.toLowerCase()
  const needle = filter.value.toLowerCase()
  if (filter.op === "eq") {
    return haystack === needle
  }
  if (filter.op === "startsWith") {
    return haystack.startsWith(needle)
  }
  return haystack.includes(needle)
}

export default function PipelineList() {
  const { network, organizationId } = useNetworkWorkspace()
  const [query, setQuery] = useState("")
  const [columnFilters, setColumnFilters] = useState<PipelineColumnFilters>({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: "startedAt", desc: true },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [columnVisibility, setColumnVisibility] = useState({})
  const [columnSizing, setColumnSizing] = useState({})
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    start: [],
    end: ["rowActions"],
  })

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [query, columnFilters, network?.id, organizationId])

  const items = useMemo<PipelineRunRow[]>(
    () =>
      listPipelineRunViews({
        networkId: network?.id,
        organizationId,
      }).map((view) => ({
        id: view.run.id,
        name: view.definition.name,
        href: networkWorkspacePath({
          networkId: view.network.id,
          rest: `pipelines/${view.run.id}`,
        }),
        status: view.run.status,
        networkName: view.network.name,
        organizationName: view.organization?.name ?? "",
        currentLabel: view.current?.name ?? `Stage ${view.run.currentStage}`,
        currentIndex: view.run.currentStage,
        total: view.stages.length,
        startedAt: view.run.startedAt,
        finishedAt: view.run.finishedAt,
      })),
    [network?.id, organizationId]
  )

  const rows = useMemo(
    () =>
      items.filter((item) => {
        if (
          !matchesQuery(query, [
            item.name,
            item.status,
            item.networkName,
            item.organizationName,
            item.currentLabel,
            item.id,
          ])
        ) {
          return false
        }
        if (!matchesString(item.name, columnFilters.name)) {
          return false
        }
        if (columnFilters.status && item.status !== columnFilters.status) {
          return false
        }
        if (!matchesString(item.organizationName, columnFilters.organization)) {
          return false
        }
        return true
      }),
    [columnFilters, items, query]
  )
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Pipeline"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "text",
                value: columnFilters.name,
                onChange: (value) =>
                  setColumnFilters((current) => ({ ...current, name: value })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={row.original.href}
              className="max-w-[22rem] font-medium"
            >
              {row.original.name}
            </DataTableCellLink>
          ),
          size: 240,
          enableHiding: false,
        }),
        helper.accessor("status", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Status"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "enum",
                value: columnFilters.status,
                options: statusOptions,
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    status: value as PipelineColumnFilters["status"],
                  })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink to={row.original.href}>
              <RunStatusPill status={row.original.status} />
            </DataTableCellLink>
          ),
          size: 140,
        }),
        ...(!organizationId
          ? [
              helper.accessor("organizationName", {
                id: "organization",
                header: ({ column }) => (
                  <DataTableColumnHeader
                    title="Organization"
                    sorted={column.getIsSorted()}
                    onSort={column.getToggleSortingHandler()}
                    pin={headerPin(column)}
                    filter={{
                      type: "text",
                      value: columnFilters.organization,
                      onChange: (value) =>
                        setColumnFilters((current) => ({
                          ...current,
                          organization: value,
                        })),
                    }}
                  />
                ),
                cell: ({ row }) => (
                  <DataTableCellLink
                    to={row.original.href}
                    className="text-muted-foreground"
                  >
                    {row.original.organizationName || "—"}
                  </DataTableCellLink>
                ),
                size: 180,
              }),
            ]
          : []),
        helper.accessor("currentLabel", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Stage"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink to={row.original.href} className="max-w-[16rem]">
              {row.original.status === "Queued"
                ? "Waiting to start"
                : row.original.currentLabel}
            </DataTableCellLink>
          ),
          size: 180,
        }),
        helper.accessor("currentIndex", {
          id: "progress",
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Progress"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
            />
          ),
          cell: ({ row }) => {
            const progress = runProgress(
              row.original.currentIndex,
              row.original.total,
              row.original.status
            )
            const tone = getBadgeColor("pink")
            return (
              <DataTableCellLink
                to={row.original.href}
                className="flex items-center gap-2"
              >
                <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "h-full rounded-full",
                      row.original.status === "Failed" ? "bg-red-500" : tone.bg,
                      row.original.status === "Running" && "animate-pulse"
                    )}
                    style={{
                      width: `${Math.max(progress, row.original.status === "Running" ? 8 : 0)}%`,
                    }}
                  />
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {row.original.currentIndex}/{row.original.total}
                </span>
              </DataTableCellLink>
            )
          },
          size: 140,
        }),
        helper.accessor("startedAt", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Started"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={row.original.href}
              className="whitespace-nowrap text-muted-foreground"
            >
              {formatRelativeTime(row.original.startedAt)}
            </DataTableCellLink>
          ),
          size: 140,
        }),
        helper.display({
          id: "duration",
          header: ({ column }) => (
            <DataTableColumnHeader title="Duration" pin={headerPin(column)} />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={row.original.href}
              className="whitespace-nowrap text-muted-foreground tabular-nums"
            >
              {formatRunDuration(row.original)}
            </DataTableCellLink>
          ),
          size: 110,
        }),
        helper.display({
          id: "rowActions",
          enableSorting: false,
          enableHiding: false,
          enableResizing: false,
          size: 52,
          minSize: 52,
          maxSize: 52,
          cell: ({ row }) => (
            <DataTableRowActions
              items={
                <DropdownMenuItem render={<Link to={row.original.href} />}>
                  <ViewIcon />
                  View
                </DropdownMenuItem>
              }
            />
          ),
        }),
      ]),
    [columnFilters, organizationId]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    defaultColumn: {
      minSize: 80,
      size: 160,
      maxSize: 480,
    },
    autoResetPageIndex: false,
    enableSortingRemoval: false,
    enableMultiSort: false,
    enableColumnResizing: true,
    enableColumnPinning: true,
    columnResizeMode: "onChange",
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnSizing,
      columnPinning,
    },
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(updater)
      setPagination((current) => ({ ...current, pageIndex: 0 }))
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
  })

  const activeFilters = useMemo<DataTableActiveFilter[]>(() => {
    const chips: DataTableActiveFilter[] = []
    if (columnFilters.name) {
      chips.push({
        id: "name",
        label: "Pipeline",
        value: stringFilterChipValue(columnFilters.name.op, columnFilters.name.value),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, name: undefined })),
      })
    }
    if (columnFilters.status) {
      chips.push({
        id: "status",
        label: "Status",
        value: columnFilters.status,
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, status: undefined })),
      })
    }
    if (columnFilters.organization) {
      chips.push({
        id: "organization",
        label: "Organization",
        value: stringFilterChipValue(columnFilters.organization.op, columnFilters.organization.value),
        onRemove: () =>
          setColumnFilters((current) => ({
            ...current,
            organization: undefined,
          })),
      })
    }
    return chips
  }, [columnFilters])

  return (
    <DataTablePage
      title={network ? `${network.name} pipelines` : "Pipelines"}
      description={
        network
          ? `Live pipeline executions in ${network.name}${organizationId ? " for this organization" : ""}.`
          : "Active pipeline executions across your networks. Open a run to inspect the current stage."
      }
      action={
        <Button>
          <PlayIcon />
          Start a pipeline
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search pipelines..."
        searchClassName="sm:max-w-3xl"
        chips={<DataTableActiveFilters filters={activeFilters} />}
        trailing={<DataTableViewOptions table={table} />}
        count={dataTablePageSummary({
          isLoading: false,
          loadingLabel: "Loading pipelines...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total: rows.length,
          singular: "pipeline",
        })}
      />
      <DataTableView
        table={table}
        empty={
          filtersActive
            ? "No pipelines match this view."
            : "No pipeline executions yet."
        }
      />
      <DataTablePagination table={table} />
    </DataTablePage>
  )
}

