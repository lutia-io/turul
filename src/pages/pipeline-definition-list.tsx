import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { PencilIcon, PlusIcon, ViewIcon } from "lucide-react"
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
  numberFilterChipValue,
  stringFilterChipValue,
  type ColumnPinningState,
  type DataTableActiveFilter,
  type NumberFilterOp,
  type PaginationState,
  type SortingState,
  type StringFilterOp,
} from "@/components/data-table-view"
import { StatusBadge } from "@/components/json-definition-card"
import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { PipelineDefinition } from "@/data/networks"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { getBadgeColor, statusBadgeConfig } from "@/lib/badge"
import { enabledStatus, getPipelineLevels } from "@/lib/json-definition"
import {
  definitionScopeLabel,
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  workspacePipelineFromApi,
} from "@/lib/network-workspace"
import { pipelineSummary } from "@/lib/pipeline-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useListNetworksQuery } from "@/store/network-slice"
import {
  useListPipelineDefinitionsQuery,
  type ListPipelineDefinitionsParams,
  type PipelineDefinitionListSort,
} from "@/store/pipeline-slice"

const helper = createManagedColumnHelper<PipelineDefinition>()
const EMPTY_PIPELINES: PipelineDefinition[] = []

type PipelineColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  slug?: { op: StringFilterOp; value: string }
  network?: { op: StringFilterOp; value: string }
  scope?: "network" | "organization"
  stages?: { op: NumberFilterOp; value: number }
  status?: "enabled" | "disabled"
}

const sortFields: PipelineDefinitionListSort[] = [
  "name",
  "slug",
  "status",
  "network",
  "scope",
  "source",
  "stages",
]

function isPipelineSort(value: string): value is PipelineDefinitionListSort {
  return sortFields.includes(value as PipelineDefinitionListSort)
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

function pipelineLevelCount(pipeline: PipelineDefinition) {
  return getPipelineLevels(pipeline.definition).length
}

export default function PipelineDefinitionList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreatePipeline, openEditPipeline } = useCreateEntity()
  const { organizations } = useWorkspaceOrganizations()
  const { data: networks } = useListNetworksQuery(undefined, {
    skip: !isAuthenticated || Boolean(network),
  })
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<PipelineColumnFilters>({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
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

  const listParams = useMemo<ListPipelineDefinitionsParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isPipelineSort(sort.id) ? sort.id : "name",
      order: sort?.desc ? "desc" : "asc",
      networkId: network?.id,
      organizationId,
      scope: columnFilters.scope,
      active:
        columnFilters.status === "enabled"
          ? true
          : columnFilters.status === "disabled"
            ? false
            : undefined,
      name: columnFilters.name?.value,
      nameOp: columnFilters.name?.op,
      slug: columnFilters.slug?.value,
      slugOp: columnFilters.slug?.op,
      network: columnFilters.network?.value,
      networkOp: columnFilters.network?.op,
      stages: columnFilters.stages?.value,
      stagesOp: columnFilters.stages?.op,
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
    useListPipelineDefinitionsQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const rows = useMemo(
    () => list?.items.map(workspacePipelineFromApi) ?? EMPTY_PIPELINES,
    [list]
  )
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)
  const networksById = useMemo(
    () => new Map((networks ?? []).map((item) => [item.id, item])),
    [networks]
  )

  const hrefFor = useCallback(
    (pipeline: PipelineDefinition) => {
      return network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: `pipeline-definitions/${pipeline.id}`,
          })
        : `/app/pipeline-definitions/${pipeline.id}`
    },
    [network, organizationId]
  )

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Name"
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
              className="block overflow-visible whitespace-normal font-medium"
            >
              <span className="block truncate">{row.original.name}</span>
              {row.original.description ? (
                <span className="mt-0.5 block truncate text-sm font-normal text-muted-foreground">
                  {row.original.description}
                </span>
              ) : null}
            </DataTableCellLink>
          ),
          size: 240,
          enableHiding: false,
        }),
        helper.accessor("slug", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Slug"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "text",
                value: columnFilters.slug,
                onChange: (value) =>
                  setColumnFilters((current) => ({ ...current, slug: value })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="font-mono text-muted-foreground"
            >
              {row.original.slug}
            </DataTableCellLink>
          ),
          size: 180,
        }),
        helper.accessor(
          (pipeline) =>
            definitionScopeLabel(pipeline.organizationId, organizations),
          {
            id: "scope",
            header: ({ column }) => (
              <DataTableColumnHeader
                title="Scope"
                sorted={column.getIsSorted()}
                onSort={column.getToggleSortingHandler()}
                pin={headerPin(column)}
                filter={{
                  type: "enum",
                  value: columnFilters.scope,
                  options: [
                    { value: "network", label: "Network pipelines" },
                    {
                      value: "organization",
                      label: "Organization pipelines",
                    },
                  ],
                  onChange: (value) =>
                    setColumnFilters((current) => ({
                      ...current,
                      scope: value as PipelineColumnFilters["scope"],
                    })),
                }}
              />
            ),
            cell: ({ row }) => (
              <DataTableCellLink
                to={hrefFor(row.original)}
                className="text-muted-foreground"
              >
                {definitionScopeLabel(
                  row.original.organizationId,
                  organizations
                )}
              </DataTableCellLink>
            ),
            size: 160,
          }
        ),
        ...(!network
          ? [
              helper.accessor(
                (pipeline) =>
                  pipeline.networkId
                    ? (networksById.get(pipeline.networkId)?.name ?? "—")
                    : "—",
                {
                  id: "network",
                  header: ({ column }) => (
                    <DataTableColumnHeader
                      title="Network"
                      sorted={column.getIsSorted()}
                      onSort={column.getToggleSortingHandler()}
                      pin={headerPin(column)}
                      filter={{
                        type: "text",
                        value: columnFilters.network,
                        onChange: (value) =>
                          setColumnFilters((current) => ({
                            ...current,
                            network: value,
                          })),
                      }}
                    />
                  ),
                  cell: ({ row }) => (
                    <DataTableCellLink
                      to={hrefFor(row.original)}
                      className="text-muted-foreground"
                    >
                      {row.original.networkId
                        ? (networksById.get(row.original.networkId)?.name ??
                          "—")
                        : "—"}
                    </DataTableCellLink>
                  ),
                  size: 180,
                }
              ),
            ]
          : []),
        helper.accessor((pipeline) => pipelineSummary(pipeline.definition), {
          id: "source",
          enableSorting: false,
          header: ({ column }) => (
            <DataTableColumnHeader title="Definition" pin={headerPin(column)} />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="text-muted-foreground"
            >
              {pipelineSummary(row.original.definition)}
            </DataTableCellLink>
          ),
          size: 220,
        }),
        helper.accessor(pipelineLevelCount, {
          id: "stages",
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Levels"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "number",
                value: columnFilters.stages,
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    stages: value,
                  })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="text-muted-foreground tabular-nums"
            >
              {pipelineLevelCount(row.original)}
            </DataTableCellLink>
          ),
          size: 120,
        }),
        helper.accessor((pipeline) => enabledStatus(pipeline.active), {
          id: "status",
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Status"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "enum",
                value: columnFilters.status,
                options: [
                  { value: "enabled", label: "Enabled" },
                  { value: "disabled", label: "Disabled" },
                ],
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    status: value as PipelineColumnFilters["status"],
                  })),
              }}
            />
          ),
          cell: ({ row }) => {
            const status = enabledStatus(row.original.active)
            const tone = getBadgeColor(statusBadgeConfig[status]?.color)
            return (
              <DataTableCellLink
                to={hrefFor(row.original)}
                className="inline-flex items-center gap-1.5"
              >
                <StatusBadge status={status} />
                <span className={tone.fg}>{status}</span>
              </DataTableCellLink>
            )
          },
          size: 140,
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
                <>
                  <DropdownMenuItem
                    render={<Link to={hrefFor(row.original)} />}
                  >
                    <ViewIcon />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openEditPipeline(row.original.id)}
                  >
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>
                </>
              }
            />
          ),
        }),
      ]),
    [columnFilters, hrefFor, network, networksById, openEditPipeline, organizations]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (pipeline) => pipeline.id,
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
        label: "Name",
        value: stringFilterChipValue(
          columnFilters.name.op,
          columnFilters.name.value
        ),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, name: undefined })),
      })
    }
    if (columnFilters.slug) {
      chips.push({
        id: "slug",
        label: "Slug",
        value: stringFilterChipValue(
          columnFilters.slug.op,
          columnFilters.slug.value
        ),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, slug: undefined })),
      })
    }
    if (columnFilters.scope) {
      chips.push({
        id: "scope",
        label: "Scope",
        value:
          columnFilters.scope === "network"
            ? "Network pipelines"
            : "Organization pipelines",
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, scope: undefined })),
      })
    }
    if (columnFilters.network) {
      chips.push({
        id: "network",
        label: "Network",
        value: stringFilterChipValue(
          columnFilters.network.op,
          columnFilters.network.value
        ),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, network: undefined })),
      })
    }
    if (columnFilters.stages) {
      chips.push({
        id: "stages",
        label: "Levels",
        value: numberFilterChipValue(
          columnFilters.stages.op,
          columnFilters.stages.value
        ),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, stages: undefined })),
      })
    }
    if (columnFilters.status) {
      chips.push({
        id: "status",
        label: "Status",
        value: columnFilters.status === "enabled" ? "Enabled" : "Disabled",
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, status: undefined })),
      })
    }
    return chips
  }, [columnFilters])

  return (
    <DataTablePage
      title="Pipeline Definitions"
      description={
        organization
          ? `Network-wide pipelines shared with ${organization.name}, plus pipelines that belong only to this organization.`
          : network
            ? `Pipelines for ${network.name} run one level at a time.`
            : "Pipelines that run one level at a time, then the next."
      }
      action={
        <Button
          onClick={() =>
            openCreatePipeline({
              networkId: network?.id,
              organizationId,
            })
          }
        >
          <PlusIcon />
          Create pipeline definition
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
                  : "No pipeline definitions yet."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
    </DataTablePage>
  )
}
