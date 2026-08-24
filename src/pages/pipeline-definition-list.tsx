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
import {
  getPipelineStages,
  pipelineSourceLabel,
  publicationStatus,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  workspacePipelineFromApi,
} from "@/lib/network-workspace"
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
  source?: { op: StringFilterOp; value: string }
  stages?: { op: NumberFilterOp; value: number }
  status?: "published" | "draft"
}

const sortFields: PipelineDefinitionListSort[] = [
  "name",
  "slug",
  "status",
  "network",
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

function pipelineStageCount(pipeline: PipelineDefinition) {
  return getPipelineStages(pipeline.definition).length
}

export default function PipelineDefinitionList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreatePipeline, openEditPipeline } = useCreateEntity()
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
      active:
        columnFilters.status === "published"
          ? true
          : columnFilters.status === "draft"
            ? false
            : undefined,
      name: columnFilters.name?.value,
      nameOp: columnFilters.name?.op,
      slug: columnFilters.slug?.value,
      slugOp: columnFilters.slug?.op,
      network: columnFilters.network?.value,
      networkOp: columnFilters.network?.op,
      source: columnFilters.source?.value,
      sourceOp: columnFilters.source?.op,
      stages: columnFilters.stages?.value,
      stagesOp: columnFilters.stages?.op,
    }
  }, [
    columnFilters,
    debouncedQuery,
    network?.id,
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
              className="font-medium"
            >
              {row.original.name}
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
        helper.accessor(
          (pipeline) => pipelineSourceLabel(pipeline.definition),
          {
            id: "source",
            header: ({ column }) => (
              <DataTableColumnHeader
                title="Source"
                sorted={column.getIsSorted()}
                onSort={column.getToggleSortingHandler()}
                pin={headerPin(column)}
                filter={{
                  type: "text",
                  value: columnFilters.source,
                  onChange: (value) =>
                    setColumnFilters((current) => ({
                      ...current,
                      source: value,
                    })),
                }}
              />
            ),
            cell: ({ row }) => (
              <DataTableCellLink
                to={hrefFor(row.original)}
                className="text-muted-foreground"
              >
                {pipelineSourceLabel(row.original.definition)}
              </DataTableCellLink>
            ),
            size: 180,
          }
        ),
        helper.accessor(pipelineStageCount, {
          id: "stages",
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Stages"
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
              {pipelineStageCount(row.original)}
            </DataTableCellLink>
          ),
          size: 120,
        }),
        helper.accessor((pipeline) => publicationStatus(pipeline.active), {
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
                  { value: "published", label: "Published" },
                  { value: "draft", label: "Draft" },
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
            const status = publicationStatus(row.original.active)
            return (
              <DataTableCellLink
                to={hrefFor(row.original)}
                className="inline-flex items-center gap-1.5"
              >
                <StatusBadge status={status} />
                <span className="text-muted-foreground">{status}</span>
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
    [columnFilters, hrefFor, network, networksById, openEditPipeline]
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
        value: stringFilterChipValue(columnFilters.name.op, columnFilters.name.value),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, name: undefined })),
      })
    }
    if (columnFilters.slug) {
      chips.push({
        id: "slug",
        label: "Slug",
        value: stringFilterChipValue(columnFilters.slug.op, columnFilters.slug.value),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, slug: undefined })),
      })
    }
    if (columnFilters.network) {
      chips.push({
        id: "network",
        label: "Network",
        value: stringFilterChipValue(columnFilters.network.op, columnFilters.network.value),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, network: undefined })),
      })
    }
    if (columnFilters.source) {
      chips.push({
        id: "source",
        label: "Source",
        value: stringFilterChipValue(columnFilters.source.op, columnFilters.source.value),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, source: undefined })),
      })
    }
    if (columnFilters.stages) {
      chips.push({
        id: "stages",
        label: "Stages",
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
        value: columnFilters.status === "published" ? "Published" : "Draft",
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
          ? `Ingest pipelines that move partner data into records in ${organization.name}.`
          : network
            ? `Pipeline definitions used by the ${network.name} network.`
            : "Ingest pipelines that move partner data into records."
      }
      action={
        <Button onClick={() => openCreatePipeline(network?.id)}>
          <PlusIcon />
          Create pipeline
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

