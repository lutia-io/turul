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
  stringFilterChipValue,
  type ColumnPinningState,
  type DataTableActiveFilter,
  type PaginationState,
  type SortingState,
  type StringFilterOp,
} from "@/components/data-table-view"
import { StatusBadge } from "@/components/json-definition-card"
import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { NodeDefinition } from "@/data/networks"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { publicationStatus } from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  workspaceNodeFromApi,
} from "@/lib/network-workspace"
import {
  isNodeType,
  nodeTypeLabel,
  nodeTypeLabels,
  nodeTypes,
} from "@/lib/node-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useListNetworksQuery } from "@/store/network-slice"
import {
  useListNodeDefinitionsQuery,
  type ListNodeDefinitionsParams,
  type NodeDefinitionListSort,
} from "@/store/node-slice"

const helper = createManagedColumnHelper<NodeDefinition>()
const EMPTY_NODES: NodeDefinition[] = []

type NodeColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  slug?: { op: StringFilterOp; value: string }
  network?: { op: StringFilterOp; value: string }
  type?: string
  status?: "published" | "draft"
}

const sortFields: NodeDefinitionListSort[] = [
  "name",
  "slug",
  "status",
  "type",
  "network",
]

function isNodeSort(value: string): value is NodeDefinitionListSort {
  return sortFields.includes(value as NodeDefinitionListSort)
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

export default function NodeDefinitionList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreateNode, openEditNode } = useCreateEntity()
  const { data: networks } = useListNetworksQuery(undefined, {
    skip: !isAuthenticated || Boolean(network),
  })
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<NodeColumnFilters>({})
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

  const listParams = useMemo<ListNodeDefinitionsParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isNodeSort(sort.id) ? sort.id : "name",
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
      type: columnFilters.type,
      typeOp: columnFilters.type ? "eq" : undefined,
      network: columnFilters.network?.value,
      networkOp: columnFilters.network?.op,
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
    useListNodeDefinitionsQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const rows = useMemo(
    () => list?.items.map(workspaceNodeFromApi) ?? EMPTY_NODES,
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
    (node: NodeDefinition) => {
      return network?.id
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: `node-definitions/${node.id}`,
          })
        : `/app/node-definitions/${node.id}`
    },
    [network?.id, organizationId]
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
                (node) =>
                  node.networkId
                    ? (networksById.get(node.networkId)?.name ?? "—")
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
        helper.accessor("type", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Type"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "enum",
                value: columnFilters.type,
                options: nodeTypes.map((item) => ({
                  value: item,
                  label: nodeTypeLabels[item],
                })),
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    type: value,
                  })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="text-muted-foreground"
            >
              {nodeTypeLabel(row.original.type)}
            </DataTableCellLink>
          ),
          size: 140,
        }),
        helper.accessor((node) => publicationStatus(node.active), {
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
                    status: value as NodeColumnFilters["status"],
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
                    onClick={() => openEditNode(row.original.id)}
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
    [columnFilters, hrefFor, network, networksById, openEditNode]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (node) => node.id,
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
    if (columnFilters.type) {
      chips.push({
        id: "type",
        label: "Type",
        value: isNodeType(columnFilters.type)
          ? nodeTypeLabels[columnFilters.type]
          : columnFilters.type,
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, type: undefined })),
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
      title="Node Definitions"
      description={
        organization
          ? `Reusable pipeline steps in ${organization.name}.`
          : network
            ? `Reusable pipeline steps for the ${network.name} network.`
            : "Reusable typed nodes that pipelines orchestrate in BFS levels."
      }
      action={
        <Button onClick={() => openCreateNode(network?.id)}>
          <PlusIcon />
          Create node
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search name or slug..."
        searchClassName="sm:max-w-3xl"
        chips={<DataTableActiveFilters filters={activeFilters} />}
        trailing={<DataTableViewOptions table={table} />}
        count={dataTablePageSummary({
          isLoading,
          loadingLabel: "Loading nodes...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
          singular: "node",
        })}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load node definitions")}
        </p>
      ) : (
        <>
          <DataTableView
            table={table}
            isRefreshing={isFetching}
            empty={
              isLoading
                ? "Loading nodes..."
                : filtersActive
                  ? "No nodes match this view."
                  : "No node definitions yet. Create one to reuse it in pipelines."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
    </DataTablePage>
  )
}
