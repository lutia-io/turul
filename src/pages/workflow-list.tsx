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
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { getBadgeColor } from "@/lib/badge"
import {
  apiWorkflowCurrentStep,
  apiWorkflowStatus,
  apiWorkflowSteps,
  formatRelativeTime,
  formatRunDuration,
  runProgress,
} from "@/lib/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceWorkflows,
} from "@/lib/network-workspace"
import { parseWorkflowDefinition } from "@/lib/workflow-definition"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListWorkflowsQuery,
  type ApiWorkflowStatus,
  type ListWorkflowsParams,
  type WorkflowListSort,
} from "@/store/workflow-slice"

type WorkflowRunRow = {
  id: string
  name: string
  href: string
  status: ReturnType<typeof apiWorkflowStatus>
  apiStatus: ApiWorkflowStatus
  networkName: string
  organizationName: string
  currentLabel: string
  currentIndex: number
  total: number
  startedAt: string
  finishedAt?: string
}

const helper = createManagedColumnHelper<WorkflowRunRow>()
const EMPTY_ROWS: WorkflowRunRow[] = []

type WorkflowColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  status?: ApiWorkflowStatus
  organization?: { op: StringFilterOp; value: string }
}

const sortFields: WorkflowListSort[] = [
  "name",
  "status",
  "network",
  "organization",
  "currentAction",
  "createdAt",
  "duration",
]

const statusOptions: { value: ApiWorkflowStatus; label: string }[] = [
  { value: "pending", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Succeeded" },
  { value: "failed", label: "Failed" },
]

function isWorkflowRunSort(value: string): value is WorkflowListSort {
  return sortFields.includes(value as WorkflowListSort)
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

export default function WorkflowList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organizationId } = useNetworkWorkspace()
  const { workflows } = useWorkspaceWorkflows()
  const { organizations } = useWorkspaceOrganizations()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<WorkflowColumnFilters>({})
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

  const listParams = useMemo<ListWorkflowsParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isWorkflowRunSort(sort.id) ? sort.id : "createdAt",
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
    useListWorkflowsQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const workflowsById = useMemo(
    () => new Map(workflows.map((workflow) => [workflow.id, workflow])),
    [workflows]
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
      const definition = workflowsById.get(run.workflowDefinitionId)
      const steps = apiWorkflowSteps(parseWorkflowDefinition(run.definition))
      const currentIndex = apiWorkflowCurrentStep(run)
      const current = steps.find((step) => step.order === currentIndex)
      const organization = organizationsById.get(run.organizationId)
      const status = apiWorkflowStatus(run.status)
      return [
        {
          id: run.id,
          name: definition?.name ?? "Workflow",
          href: networkWorkspacePath({
            networkId: run.networkId,
            organizationId,
            rest: `workflows/${run.id}`,
          }),
          status,
          apiStatus: run.status,
          networkName: network?.name ?? run.networkId,
          organizationName: organization?.name ?? run.organizationId,
          currentLabel: current?.name ?? `Step ${currentIndex}`,
          currentIndex,
          total: steps.length,
          startedAt: run.createdAt,
          finishedAt: run.completedAt ?? undefined,
        } satisfies WorkflowRunRow,
      ]
    })
  }, [list, network, organizationId, organizationsById, workflowsById])
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)

  const hrefFor = useCallback((row: WorkflowRunRow) => row.href, [])

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Workflow"
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
                    status: value as WorkflowColumnFilters["status"],
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
          id: "currentAction",
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Step"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="max-w-[16rem]"
            >
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
            const tone = getBadgeColor("teal")
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
        helper.accessor(
          (row) =>
            formatRunDuration({
              startedAt: row.startedAt,
              finishedAt: row.finishedAt,
              status: row.status,
            }),
          {
            id: "duration",
            header: ({ column }) => (
              <DataTableColumnHeader
                title="Duration"
                sorted={column.getIsSorted()}
                onSort={column.getToggleSortingHandler()}
                pin={headerPin(column)}
              />
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
          }
        ),
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
        label: "Workflow",
        value: stringFilterChipValue(columnFilters.name.op, columnFilters.name.value),
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
      title={network ? `${network.name} workflows` : "Workflows"}
      description={
        network
          ? `Live workflow executions in ${network.name}${organizationId ? " for this organization" : ""}.`
          : "Active workflow executions across your networks. Open a run to inspect the current step."
      }
      action={
        <Button>
          <PlayIcon />
          Start a workflow
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search workflows..."
        searchClassName="sm:max-w-3xl"
        chips={<DataTableActiveFilters filters={activeFilters} />}
        trailing={<DataTableViewOptions table={table} />}
        count={dataTablePageSummary({
          isLoading,
          loadingLabel: "Loading workflows...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
          singular: "workflow",
        })}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load workflows")}
        </p>
      ) : (
        <>
          <DataTableView
            table={table}
            isRefreshing={isFetching}
            empty={
              isLoading
                ? "Loading workflows..."
                : filtersActive
                  ? "No workflows match this view."
                  : "No workflow executions yet."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
    </DataTablePage>
  )
}

