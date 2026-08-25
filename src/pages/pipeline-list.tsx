import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { PlayIcon, ViewIcon } from "lucide-react"
import { useTable } from "@tanstack/react-table"

import {
  DataTableCellLink,
  DataTablePage,
  DataTableToolbar,
  dataTablePageSummary,
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
import { buttonVariants } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { getBadgeColor } from "@/lib/badge"
import {
  apiPipelineCurrentLevel,
  apiPipelineLevelSteps,
  apiPipelineStatus,
  formatRelativeTime,
  formatRunDuration,
  runProgress,
} from "@/lib/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspacePipelines,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListPipelinesQuery,
  type ApiPipelineStatus,
  type ListPipelinesParams,
  type PipelineListSort,
} from "@/store/pipeline-slice"

type PipelineRunRow = {
  id: string
  name: string
  href: string
  status: ReturnType<typeof apiPipelineStatus>
  apiStatus: ApiPipelineStatus
  networkName: string
  organizationName: string
  currentLabel: string
  currentIndex: number
  total: number
  startedAt: string
  finishedAt?: string
}

const helper = createManagedColumnHelper<PipelineRunRow>()
const EMPTY_ROWS: PipelineRunRow[] = []

type PipelineColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  status?: ApiPipelineStatus
  organization?: { op: StringFilterOp; value: string }
}

const sortFields: PipelineListSort[] = [
  "name",
  "status",
  "network",
  "organization",
  "currentLevel",
  "createdAt",
  "duration",
]

const statusOptions: { value: ApiPipelineStatus; label: string }[] = [
  { value: "pending", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Succeeded" },
  { value: "failed", label: "Failed" },
]

function isPipelineRunSort(value: string): value is PipelineListSort {
  return sortFields.includes(value as PipelineListSort)
}

function headerPin(column: {
  getIsPinned: () => false | "start" | "end"
  pin: (position: false | "start" | "end") => void
}) {
  return {
    position: column.getIsPinned(),
    onPin: (position: false | "start" | "end") => column.pin(position),
  }
}

export default function PipelineList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organizationId } = useNetworkWorkspace()
  const { pipelines } = useWorkspacePipelines()
  const { organizations } = useWorkspaceOrganizations()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<PipelineColumnFilters>({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
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
  }, [debouncedQuery, columnFilters, network?.id, organizationId])

  const listParams = useMemo<ListPipelinesParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isPipelineRunSort(sort.id) ? sort.id : "createdAt",
      order: sort?.desc ? "desc" : "asc",
      networkId: network?.id,
      organizationId,
      name: columnFilters.name?.value,
      nameOp: columnFilters.name?.op,
      status: columnFilters.status,
      organization: columnFilters.organization?.value,
      organizationOp: columnFilters.organization?.op,
    }
  }, [
    columnFilters,
    debouncedQuery,
    network?.id,
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
  ])

  const { data, isLoading, isFetching, isError, error, refetch } =
    useListPipelinesQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const pipelinesById = useMemo(
    () => new Map(pipelines.map((pipeline) => [pipeline.id, pipeline])),
    [pipelines]
  )
  const organizationsById = useMemo(
    () =>
      new Map(
        organizations.map((organization) => [organization.id, organization])
      ),
    [organizations]
  )
  const rows = useMemo(() => {
    if (!list) {
      return EMPTY_ROWS
    }
    return list.items.flatMap((run) => {
      if (network && run.networkId !== network.id) {
        return []
      }
      const definition = pipelinesById.get(run.pipelineDefinitionId)
      const steps = apiPipelineLevelSteps(run.definition)
      const currentIndex = apiPipelineCurrentLevel(run)
      const current = steps.find((step) => step.order === currentIndex)
      const organization = organizationsById.get(run.organizationId)
      const status = apiPipelineStatus(run.status)
      return [
        {
          id: run.id,
          name: definition?.name ?? "Pipeline",
          href: networkWorkspacePath({
            networkId: run.networkId,
            organizationId,
            rest: `pipelines/${run.id}`,
          }),
          status,
          apiStatus: run.status,
          networkName: network?.name ?? run.networkId,
          organizationName: organization?.name ?? run.organizationId,
          currentLabel: current?.name ?? `Level ${Math.max(currentIndex - 1, 0)}`,
          currentIndex,
          total: steps.length,
          startedAt: run.createdAt,
          finishedAt: run.completedAt ?? undefined,
        } satisfies PipelineRunRow,
      ]
    })
  }, [list, network, organizationId, organizationsById, pipelinesById])
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)

  const hrefFor = useCallback((row: PipelineRunRow) => row.href, [])

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
              to={hrefFor(row.original)}
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
            <DataTableCellLink to={hrefFor(row.original)}>
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
                    to={hrefFor(row.original)}
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
              title="Level"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink to={hrefFor(row.original)} className="max-w-[16rem]">
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
                to={hrefFor(row.original)}
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
          id: "createdAt",
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
              to={hrefFor(row.original)}
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
              to={hrefFor(row.original)}
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
                <DropdownMenuItem render={<Link to={hrefFor(row.original)} />}>
                  <ViewIcon />
                  View
                </DropdownMenuItem>
              }
            />
          ),
        }),
      ]),
    [columnFilters, hrefFor, organizationId]
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
    manualPagination: true,
    manualSorting: true,
    autoResetPageIndex: false,
    enableSortingRemoval: false,
    enableMultiSort: false,
    enableColumnResizing: true,
    enableColumnPinning: true,
    columnResizeMode: "onChange",
    rowCount: total,
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
        value: stringFilterChipValue(
          columnFilters.name.op,
          columnFilters.name.value
        ),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, name: undefined })),
      })
    }
    if (columnFilters.status) {
      chips.push({
        id: "status",
        label: "Status",
        value:
          statusOptions.find((option) => option.value === columnFilters.status)
            ?.label ?? columnFilters.status,
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, status: undefined })),
      })
    }
    if (columnFilters.organization) {
      chips.push({
        id: "organization",
        label: "Organization",
        value: stringFilterChipValue(
          columnFilters.organization.op,
          columnFilters.organization.value
        ),
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
          : "Active pipeline executions across your networks. Open a run to inspect the current level."
      }
      action={
        network ? (
          <Link
            to={networkWorkspacePath({
              networkId: network.id,
              organizationId,
              rest: "pipeline-definitions",
            })}
            className={buttonVariants()}
          >
            <PlayIcon />
            Start a pipeline
          </Link>
        ) : null
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
          isLoading,
          loadingLabel: "Loading pipelines...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
          singular: "pipeline",
        })}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load pipelines")}
        </p>
      ) : (
        <>
          <DataTableView
            table={table}
            isRefreshing={isFetching}
            empty={
              isLoading
                ? "Loading pipelines..."
                : filtersActive
                  ? "No pipelines match this view."
                  : "No pipeline executions yet."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
    </DataTablePage>
  )
}
