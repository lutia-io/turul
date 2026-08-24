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
import type { Schema } from "@/data/networks"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  jsonSchemaPropertyCount,
  publicationStatus,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  schemaScopeLabel,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  workspaceSchemaFromApi,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListSchemasQuery,
  type ListSchemasParams,
  type SchemaListSort,
} from "@/store/schema-slice"

const helper = createManagedColumnHelper<Schema>()
const EMPTY_SCHEMAS: Schema[] = []

type SchemaColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  slug?: { op: StringFilterOp; value: string }
  scope?: "network" | "organization"
  status?: "published" | "draft"
  properties?: { op: NumberFilterOp; value: number }
}

const sortFields: SchemaListSort[] = [
  "name",
  "slug",
  "status",
  "scope",
  "properties",
]

function isSchemaSort(value: string): value is SchemaListSort {
  return sortFields.includes(value as SchemaListSort)
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

export default function SchemaList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreateSchema, openEditSchema } = useCreateEntity()
  const { organizations } = useWorkspaceOrganizations()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<SchemaColumnFilters>({})
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
    end: ["actions"],
  })

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [debouncedQuery, columnFilters, network?.id, organizationId])

  const listParams = useMemo<ListSchemasParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isSchemaSort(sort.id) ? sort.id : "name",
      order: sort?.desc ? "desc" : "asc",
      networkId: network?.id,
      organizationId,
      scope: columnFilters.scope,
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
      properties: columnFilters.properties?.value,
      propertiesOp: columnFilters.properties?.op,
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
    useListSchemasQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const rows = useMemo(
    () => list?.items.map(workspaceSchemaFromApi) ?? EMPTY_SCHEMAS,
    [list]
  )
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)

  const hrefFor = useCallback(
    (schema: Schema) => {
      return network?.id
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: `schemas/${schema.id}`,
          })
        : `/app/schemas/${schema.id}`
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
        helper.accessor((schema) => schemaScopeLabel(schema, organizations), {
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
                  { value: "network", label: "Network schemas" },
                  { value: "organization", label: "Organization schemas" },
                ],
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    scope: value as SchemaColumnFilters["scope"],
                  })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="text-muted-foreground"
            >
              {schemaScopeLabel(row.original, organizations)}
            </DataTableCellLink>
          ),
          size: 160,
        }),
        helper.accessor(
          (schema) => jsonSchemaPropertyCount(schema.definition),
          {
            id: "properties",
            header: ({ column }) => (
              <DataTableColumnHeader
                title="Properties"
                sorted={column.getIsSorted()}
                onSort={column.getToggleSortingHandler()}
                pin={headerPin(column)}
                filter={{
                  type: "number",
                  value: columnFilters.properties,
                  onChange: (value) =>
                    setColumnFilters((current) => ({
                      ...current,
                      properties: value,
                    })),
                }}
              />
            ),
            cell: ({ row }) => (
              <DataTableCellLink
                to={hrefFor(row.original)}
                className="text-muted-foreground tabular-nums"
              >
                {jsonSchemaPropertyCount(row.original.definition)}
              </DataTableCellLink>
            ),
            size: 120,
          }
        ),
        helper.accessor((schema) => publicationStatus(schema.active), {
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
                    status: value as SchemaColumnFilters["status"],
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
          id: "actions",
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
                    onClick={() => openEditSchema(row.original.id)}
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
    [columnFilters, hrefFor, openEditSchema, organizations]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (schema) => schema.id,
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
    if (columnFilters.scope) {
      chips.push({
        id: "scope",
        label: "Scope",
        value:
          columnFilters.scope === "network"
            ? "Network schemas"
            : "Organization schemas",
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, scope: undefined })),
      })
    }
    if (columnFilters.properties) {
      chips.push({
        id: "properties",
        label: "Properties",
        value: numberFilterChipValue(
          columnFilters.properties.op,
          columnFilters.properties.value
        ),
        onRemove: () =>
          setColumnFilters((current) => ({
            ...current,
            properties: undefined,
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
      title="Schemas"
      description={
        organization
          ? `Network-wide schemas shared with ${organization.name}, plus schemas that belong only to this organization.`
          : network
            ? `Data shapes used by records in ${network.name}.`
            : "Data shapes used by records across your networks."
      }
      action={
        <Button
          onClick={() =>
            openCreateSchema({
              networkId: network?.id,
              organizationId,
            })
          }
        >
          <PlusIcon />
          Create schema
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
          loadingLabel: "Loading schemas...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
          singular: "schema",
        })}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load schemas")}
        </p>
      ) : (
        <>
          <DataTableView
            table={table}
            isRefreshing={isFetching}
            empty={
              isLoading
                ? "Loading schemas..."
                : filtersActive
                  ? "No schemas match this view."
                  : "No schemas yet. Create one to define the JSONB shape of records."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
    </DataTablePage>
  )
}

