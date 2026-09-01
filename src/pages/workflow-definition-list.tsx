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
import type { WorkflowDefinition } from "@/data/networks"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { publicationStatus } from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceSchemas,
  workspaceWorkflowFromApi,
} from "@/lib/network-workspace"
import {
  parseWorkflowDefinition,
  workflowSummary,
} from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useListNetworksQuery } from "@/store/network-slice"
import {
  useListWorkflowDefinitionsQuery,
  type ListWorkflowDefinitionsParams,
  type WorkflowDefinitionListSort,
} from "@/store/workflow-slice"

const helper = createManagedColumnHelper<WorkflowDefinition>()
const EMPTY_WORKFLOWS: WorkflowDefinition[] = []

type WorkflowColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  slug?: { op: StringFilterOp; value: string }
  network?: { op: StringFilterOp; value: string }
  schema?: { op: StringFilterOp; value: string }
  actions?: { op: NumberFilterOp; value: number }
  status?: "published" | "draft"
}

const sortFields: WorkflowDefinitionListSort[] = [
  "name",
  "slug",
  "status",
  "schema",
  "network",
  "actions",
]

function isWorkflowSort(value: string): value is WorkflowDefinitionListSort {
  return sortFields.includes(value as WorkflowDefinitionListSort)
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

function workflowActionCount(workflow: WorkflowDefinition) {
  return parseWorkflowDefinition(workflow.definition)?.actions.length ?? 0
}

export default function WorkflowDefinitionList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreateWorkflow, openEditWorkflow } = useCreateEntity()
  const { schemas } = useWorkspaceSchemas()
  const { data: networks } = useListNetworksQuery(undefined, {
    skip: !isAuthenticated || Boolean(network),
  })
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<WorkflowColumnFilters>({})
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

  const listParams = useMemo<ListWorkflowDefinitionsParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isWorkflowSort(sort.id) ? sort.id : "name",
      order: sort?.desc ? "desc" : "asc",
      networkId: network?.id,
      organizationId,
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
      schema: columnFilters.schema?.value,
      schemaOp: columnFilters.schema?.op,
      network: columnFilters.network?.value,
      networkOp: columnFilters.network?.op,
      actions: columnFilters.actions?.value,
      actionsOp: columnFilters.actions?.op,
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
    useListWorkflowDefinitionsQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const rows = useMemo(
    () => list?.items.map(workspaceWorkflowFromApi) ?? EMPTY_WORKFLOWS,
    [list]
  )
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)
  const schemasById = useMemo(
    () => new Map(schemas.map((schema) => [schema.id, schema])),
    [schemas]
  )
  const networksById = useMemo(
    () => new Map((networks ?? []).map((item) => [item.id, item])),
    [networks]
  )

  const hrefFor = useCallback(
    (workflow: WorkflowDefinition) => {
      return network?.id
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: `workflow-definitions/${workflow.id}`,
          })
        : `/app/workflow-definitions/${workflow.id}`
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
                (workflow) =>
                  workflow.networkId
                    ? (networksById.get(workflow.networkId)?.name ?? "—")
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
          (workflow) => schemasById.get(workflow.schemaId)?.name ?? "Record",
          {
            id: "schema",
            header: ({ column }) => (
              <DataTableColumnHeader
                title="Starts from"
                sorted={column.getIsSorted()}
                onSort={column.getToggleSortingHandler()}
                pin={headerPin(column)}
                filter={{
                  type: "text",
                  value: columnFilters.schema,
                  onChange: (value) =>
                    setColumnFilters((current) => ({
                      ...current,
                      schema: value,
                    })),
                }}
              />
            ),
            cell: ({ row }) => (
              <DataTableCellLink
                to={hrefFor(row.original)}
                className="text-muted-foreground"
              >
                {schemasById.get(row.original.schemaId)?.name ?? "Record"}
              </DataTableCellLink>
            ),
            size: 180,
          }
        ),
        helper.accessor(workflowActionCount, {
          id: "actions",
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Definition"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "number",
                value: columnFilters.actions,
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    actions: value,
                  })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="text-muted-foreground"
            >
              {workflowSummary(row.original.definition)}
            </DataTableCellLink>
          ),
          size: 280,
        }),
        helper.accessor((workflow) => publicationStatus(workflow.active), {
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
                    status: value as WorkflowColumnFilters["status"],
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
                    onClick={() => openEditWorkflow(row.original.id)}
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
    [
      columnFilters,
      hrefFor,
      network,
      networksById,
      openEditWorkflow,
      schemasById,
    ]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (workflow) => workflow.id,
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
    if (columnFilters.schema) {
      chips.push({
        id: "schema",
        label: "Starts from",
        value: stringFilterChipValue(columnFilters.schema.op, columnFilters.schema.value),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, schema: undefined })),
      })
    }
    if (columnFilters.actions) {
      chips.push({
        id: "actions",
        label: "Definition",
        value: numberFilterChipValue(
          columnFilters.actions.op,
          columnFilters.actions.value
        ),
        onRemove: () =>
          setColumnFilters((current) => ({
            ...current,
            actions: undefined,
          })),
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
      title="Workflow Definitions"
      description={
        organization
          ? `When a matching record is created in ${organization.name}, these workflows run their actions.`
          : network
            ? `When a record is created in ${network.name}, matching workflows run their actions.`
            : "Workflows that run when a matching record is created."
      }
      action={
        <Button onClick={() => openCreateWorkflow(network?.id)}>
          <PlusIcon />
          Create workflow definition
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
                  : "No workflow definitions yet. Create one to automate what happens when a record is created."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
    </DataTablePage>
  )
}

