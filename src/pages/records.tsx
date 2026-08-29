import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { TableIcon, ViewIcon } from "lucide-react"
import { useTable } from "@tanstack/react-table"

import { FilePreviewDialog } from "@/components/file-preview"
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
  emptyFilterValue,
  numberFilterChipValue,
  stringFilterChipValue,
  type ColumnFilterConfig,
  type ColumnPinningState,
  type DataTableActiveFilter,
  type NumberFilterOp,
  type PaginationState,
  type SortingState,
  type StringFilterOp,
} from "@/components/data-table-view"
import {
  propertyLabel,
  RecordCell,
  SchemaSheetTabs,
} from "@/components/schema-records-table"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { StoredFile, StoredRecord } from "@/data/files"
import type { Network, Organization, Schema } from "@/data/networks"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { getBadgeColor } from "@/lib/badge"
import {
  getJsonSchemaProperties,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceFiles,
  useWorkspaceNetworksWithDefinitions,
  useWorkspaceOrganizations,
  workspaceRecordFromApi,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListRecordsQuery,
  type ListRecordsParams,
  type RecordFieldFilter,
} from "@/store/record-slice"

const helper = createManagedColumnHelper<StoredRecord>()
const EMPTY_RECORDS: StoredRecord[] = []

type FieldFilter =
  | { type: "text"; op: StringFilterOp; value: string }
  | { type: "number"; op: NumberFilterOp; value: number }
  | { type: "enum"; value: string }

type RecordColumnFilters = {
  organization?: { op: StringFilterOp; value: string }
  fields: Record<string, FieldFilter>
}

const reservedSorts = ["organization", "createdAt"] as const

function headerPin(column: {
  getIsPinned: () => false | "start" | "end"
  pin: (position: false | "start" | "end") => void
}) {
  return {
    position: column.getIsPinned(),
    onPin: (position: false | "start" | "end") => column.pin(position),
  }
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function isRecordSort(value: string, properties: JsonSchemaProperty[]) {
  return (
    reservedSorts.includes(value as (typeof reservedSorts)[number]) ||
    properties.some((property) => property.name === value)
  )
}

function fieldFilterParams(
  fields: Record<string, FieldFilter>
): RecordFieldFilter[] {
  return Object.entries(fields).map(([name, filter]) => {
    if (filter.type === "number") {
      if (filter.op === "empty") {
        return { name, op: "empty" }
      }
      return { name, value: String(filter.value), op: filter.op }
    }
    if (filter.type === "enum") {
      if (filter.value === emptyFilterValue) {
        return { name, op: "empty" }
      }
      return { name, value: filter.value, op: "eq" }
    }
    if (filter.op === "empty") {
      return { name, op: "empty" }
    }
    return { name, value: filter.value, op: filter.op }
  })
}

function propertyFilterConfig(
  property: JsonSchemaProperty,
  value: FieldFilter | undefined,
  onChange: (value?: FieldFilter) => void
): ColumnFilterConfig {
  if (property.enumValues && property.enumValues.length > 0) {
    return {
      type: "enum",
      value: value?.type === "enum" ? value.value : undefined,
      options: [
        { value: emptyFilterValue, label: "Is empty" },
        ...property.enumValues.map((item) => ({
          value: item,
          label: item,
        })),
      ],
      onChange: (next) =>
        onChange(next ? { type: "enum", value: next } : undefined),
    }
  }

  if (property.type === "boolean") {
    return {
      type: "enum",
      value: value?.type === "enum" ? value.value : undefined,
      options: [
        { value: emptyFilterValue, label: "Is empty" },
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
      onChange: (next) =>
        onChange(next ? { type: "enum", value: next } : undefined),
    }
  }

  if (property.type === "number" || property.type === "integer") {
    return {
      type: "number",
      value:
        value?.type === "number"
          ? { op: value.op, value: value.value }
          : undefined,
      onChange: (next) =>
        onChange(next ? { type: "number", ...next } : undefined),
    }
  }

  return {
    type: "text",
    value:
      value?.type === "text" ? { op: value.op, value: value.value } : undefined,
    onChange: (next) => onChange(next ? { type: "text", ...next } : undefined),
  }
}

function fieldFilterChip(filter: FieldFilter): string {
  if (filter.type === "number") {
    return numberFilterChipValue(filter.op, filter.value)
  }
  if (filter.type === "enum") {
    if (filter.value === emptyFilterValue) {
      return "Is empty"
    }
    if (filter.value === "true") {
      return "Yes"
    }
    if (filter.value === "false") {
      return "No"
    }
    return filter.value
  }
  return stringFilterChipValue(filter.op, filter.value)
}

export default function RecordsPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organizationId } = useNetworkWorkspace()
  const {
    networks: workspaceNetworks,
    refetch: refetchNetworks,
    isFetching: isNetworksFetching,
  } = useWorkspaceNetworksWithDefinitions()
  const { organizations } = useWorkspaceOrganizations()
  const {
    files,
    refetch: refetchFiles,
    isFetching: isFilesFetching,
  } = useWorkspaceFiles()
  const [params, setParams] = useSearchParams()
  const networks = network ? [network] : workspaceNetworks
  const requestedNetworkId = params.get("network")
  const activeNetwork =
    network ??
    networks.find((item) => item.id === requestedNetworkId) ??
    networks[0]
  const schemas = activeNetwork?.schemas ?? []
  const requestedSchemaId = params.get("schema")
  const activeSchema =
    schemas.find((item) => item.id === requestedSchemaId) ?? schemas[0]
  const filesById = useMemo(
    () => new Map(files.map((file) => [file.id, file])),
    [files]
  )
  const organizationsById = useMemo(
    () =>
      new Map(
        organizations.map((organization) => [organization.id, organization])
      ),
    [organizations]
  )

  function setWorkbook(next: { networkId?: string; schemaId?: string }) {
    const nextParams = new URLSearchParams(params)

    if (next.networkId && !network) {
      nextParams.set("network", next.networkId)
      nextParams.delete("schema")
    }

    if (next.schemaId) {
      nextParams.set("schema", next.schemaId)
    }

    setParams(nextParams, { replace: true })
  }

  return (
    <DataTablePage
      title="Records"
      description="Each schema is a table. Open a row for the record, or click a file to preview it."
    >
      {!network ? (
        <div className="flex min-w-0 shrink-0 gap-1 overflow-x-auto">
          {networks.map((item) => (
            <NetworkPill
              key={item.id}
              network={item}
              active={item.id === activeNetwork?.id}
              onSelect={() => setWorkbook({ networkId: item.id })}
            />
          ))}
        </div>
      ) : null}

      {schemas.length > 0 ? (
        <SchemaSheetTabs
          schemas={schemas}
          activeId={activeSchema?.id}
          onSelect={(schemaId) => setWorkbook({ schemaId })}
        />
      ) : null}

      {activeSchema && activeNetwork ? (
        <SchemaRecordsDataTable
          key={activeSchema.id}
          schema={activeSchema}
          network={activeNetwork}
          organizationId={organizationId}
          organizationsById={organizationsById}
          filesById={filesById}
          isAuthenticated={isAuthenticated}
          onRefreshRelated={() => {
            void refetchFiles()
            void refetchNetworks()
          }}
          isRelatedRefreshing={isFilesFetching || isNetworksFetching}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-xl border bg-background text-sm text-muted-foreground">
          <TableIcon className="mr-2 size-4" />
          No schemas in this network.
        </div>
      )}
    </DataTablePage>
  )
}

function SchemaRecordsDataTable({
  schema,
  network,
  organizationId,
  organizationsById,
  filesById,
  isAuthenticated,
  onRefreshRelated,
  isRelatedRefreshing,
}: {
  schema: Schema
  network: Network
  organizationId?: string
  organizationsById: Map<string, Organization>
  filesById: Map<string, StoredFile>
  isAuthenticated: boolean
  onRefreshRelated: () => void
  isRelatedRefreshing: boolean
}) {
  const properties = useMemo(
    () => getJsonSchemaProperties(schema.definition),
    [schema.definition]
  )
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<RecordColumnFilters>({
    fields: {},
  })
  const [previewFileId, setPreviewFileId] = useState<string>()
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
    end: ["actions"],
  })

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [debouncedQuery, columnFilters, network.id, organizationId, schema.id])

  const listParams = useMemo<ListRecordsParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isRecordSort(sort.id, properties) ? sort.id : "createdAt",
      order: sort?.desc ? "desc" : "asc",
      schemaId: schema.id,
      networkId: network.id,
      organizationId,
      organization: columnFilters.organization?.value,
      organizationOp: columnFilters.organization?.op,
      fields: fieldFilterParams(columnFilters.fields),
    }
  }, [
    columnFilters,
    debouncedQuery,
    network.id,
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    properties,
    schema.id,
    sorting,
  ])

  const { data, isLoading, isFetching, isError, error, refetch } =
    useListRecordsQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const rows = useMemo(
    () => list?.items.map(workspaceRecordFromApi) ?? EMPTY_RECORDS,
    [list]
  )
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 ||
    Boolean(columnFilters.organization) ||
    Object.keys(columnFilters.fields).length > 0

  const hrefFor = useCallback(
    (record: StoredRecord) => {
      return networkWorkspacePath({
        networkId: record.networkId,
        organizationId,
        rest: `records/${record.id}`,
      })
    },
    [organizationId]
  )

  const hrefForRelated = useCallback(
    (recordId: string) => {
      return networkWorkspacePath({
        networkId: network.id,
        organizationId,
        rest: `records/${recordId}`,
      })
    },
    [network.id, organizationId]
  )

  const relatedById = useMemo(() => {
    const related = list?.related ?? {}
    return new Map(Object.entries(related))
  }, [list])

  const fileHref = useCallback(
    (fileId: string) => {
      return networkWorkspacePath({
        networkId: network.id,
        organizationId,
        rest: `files/${fileId}`,
      })
    },
    [network.id, organizationId]
  )

  const setFieldFilter = useCallback(
    (name: string, value?: FieldFilter) => {
      setColumnFilters((current) => {
        const fields = { ...current.fields }
        if (value) {
          fields[name] = value
        } else {
          delete fields[name]
        }
        return { ...current, fields }
      })
    },
    []
  )

  const columns = useMemo(
    () =>
      helper.columns([
        ...(!organizationId
          ? [
              helper.accessor(
                (record) =>
                  organizationsById.get(record.organizationId)?.name ??
                  record.organizationId,
                {
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
                      {organizationsById.get(row.original.organizationId)
                        ?.name ?? row.original.organizationId}
                    </DataTableCellLink>
                  ),
                  size: 180,
                }
              ),
            ]
          : []),
        ...properties.map((property) =>
          helper.accessor((record) => record.data[property.name], {
            id: property.name,
            header: ({ column }) => (
              <DataTableColumnHeader
                title={propertyLabel(property.name)}
                sorted={column.getIsSorted()}
                onSort={column.getToggleSortingHandler()}
                pin={headerPin(column)}
                filter={propertyFilterConfig(
                  property,
                  columnFilters.fields[property.name],
                  (value) => setFieldFilter(property.name, value)
                )}
              />
            ),
            cell: ({ row }) => (
              <RecordCell
                record={row.original}
                property={property}
                filesById={filesById}
                relatedById={relatedById}
                href={hrefFor(row.original)}
                relatedHref={hrefForRelated}
                onPreviewFile={setPreviewFileId}
              />
            ),
            size: 160,
          })
        ),
        helper.accessor("createdAt", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Created"
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
              {formatCreatedAt(row.original.createdAt)}
            </DataTableCellLink>
          ),
          size: 160,
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
                <DropdownMenuItem render={<Link to={hrefFor(row.original)} />}>
                  <ViewIcon />
                  View
                </DropdownMenuItem>
              }
            />
          ),
        }),
      ]),
    [
      columnFilters.fields,
      columnFilters.organization,
      filesById,
      hrefFor,
      hrefForRelated,
      organizationId,
      organizationsById,
      properties,
      relatedById,
      setFieldFilter,
    ]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (record) => record.id,
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
    for (const property of properties) {
      const filter = columnFilters.fields[property.name]
      if (!filter) {
        continue
      }
      chips.push({
        id: property.name,
        label: propertyLabel(property.name),
        value: fieldFilterChip(filter),
        onRemove: () => setFieldFilter(property.name),
      })
    }
    return chips
  }, [columnFilters, properties, setFieldFilter])

  const previewFile = previewFileId ? filesById.get(previewFileId) : undefined

  return (
    <>
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search records..."
        searchClassName="sm:max-w-3xl"
        chips={<DataTableActiveFilters filters={activeFilters} />}
        trailing={<DataTableViewOptions table={table} />}
        count={dataTablePageSummary({
          isLoading,
          loadingLabel: "Loading records...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
          singular: "record",
        })}
        onRefresh={() => {
          void refetch()
          onRefreshRelated()
        }}
        isRefreshing={isFetching || isRelatedRefreshing}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load records")}
        </p>
      ) : (
        <>
          <DataTableView
            table={table}
            isRefreshing={isFetching}
            empty={
              isLoading
                ? "Loading records..."
                : filtersActive
                  ? "No records match this view."
                  : "No records yet."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
      <FilePreviewDialog
        file={previewFile}
        open={Boolean(previewFileId)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFileId(undefined)
          }
        }}
        href={previewFileId ? fileHref(previewFileId) : undefined}
      />
    </>
  )
}

function NetworkPill({
  network,
  active,
  onSelect,
}: {
  network: Network
  active: boolean
  onSelect: () => void
}) {
  const tone = getBadgeColor(network.color)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-foreground/15 bg-background font-medium shadow-xs"
          : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <span className={cn("size-2 rounded-full", tone.bg)} />
      {network.name}
    </button>
  )
}

