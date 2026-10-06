import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { PencilIcon, PlusIcon, TableIcon, ViewIcon, WorkflowIcon } from "lucide-react"
import { useTable } from "@tanstack/react-table"

import { AddTableDialog } from "@/components/add-table-dialog"
import { TableSheetMenu } from "@/components/table-sheet-menu"
import { useCreateEntity } from "@/components/create-entity"
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
  DataTablePagination,
  DataTableRowActions,
  DataTableView,
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
  columnLabel,
  RecordCell,
  SchemaSheetTabs,
} from "@/components/schema-records-table"
import {
  AddColumnButton,
  ColumnHeaderMenu,
} from "@/components/table-column-editor"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { StoredFile, StoredRecord } from "@/data/files"
import type { Network, Schema } from "@/data/networks"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { getBadgeColor } from "@/lib/badge"
import {
  getJsonSchemaProperties,
  isAddressProperty,
  isEmailProperty,
  isFileProperty,
  isForeignProperty,
  isPhoneProperty,
  isUriProperty,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceFiles,
  useWorkspaceNetworksWithDefinitions,
  workspaceRecordFromApi,
} from "@/lib/network-workspace"
import { useAuthorization } from "@/lib/authorization"
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
  fields: Record<string, FieldFilter>
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

function isPropertySort(value: string, properties: JsonSchemaProperty[]) {
  return properties.some((property) => property.name === value)
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

  if (property.type === "number") {
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
  const {
    network,
    organizationId,
    href,
    isFetching: isWorkspaceFetching,
  } = useNetworkWorkspace()
  const { openCreateRecord, openEditRecord } = useCreateEntity()
  const { canOrg, canNetwork, isOrgUser, data: authorization } =
    useAuthorization()
  const [addTableOpen, setAddTableOpen] = useState(false)
  const {
    networks: workspaceNetworks,
    refetch: refetchNetworks,
    isFetching: isNetworksFetching,
  } = useWorkspaceNetworksWithDefinitions()
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
  const requestedSchema = schemas.find((item) => item.id === requestedSchemaId)
  const schemaListSettling =
    Boolean(requestedSchemaId) &&
    !requestedSchema &&
    (network ? isWorkspaceFetching : isNetworksFetching)
  const activeSchema =
    requestedSchema ?? (schemaListSettling ? undefined : schemas[0])
  const canCreateTable = canNetwork("schema", "create") && Boolean(activeNetwork)
  const filesById = useMemo(
    () => new Map(files.map((file) => [file.id, file])),
    [files]
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

  const canCreateRecord = isOrgUser
    ? canOrg("record", "create")
    : Boolean(authorization?.network?.member)
  const canViewWorkflows = canNetwork("workflow_definition", "read")
  const workflowsHref = activeNetwork
    ? networkWorkspacePath({
        networkId: activeNetwork.id,
        organizationId,
        rest: "workflow-definitions",
      })
    : href("workflow-definitions")

  return (
    <DataTablePage
      title="Records"
      description="Each table is one kind of record. Hover a related record, URL, or file for a preview, then click to open it."
      action={
        canViewWorkflows || canCreateRecord ? (
          <div className="flex items-center gap-2">
            {canViewWorkflows ? (
              <Button
                variant="outline"
                render={<Link to={workflowsHref} />}
              >
                <WorkflowIcon />
                Workflows
              </Button>
            ) : null}
            {canCreateRecord ? (
              <Button
                onClick={() =>
                  openCreateRecord({
                    networkId: activeNetwork?.id,
                    organizationId,
                    schemaId: activeSchema?.id,
                  })
                }
              >
                <PlusIcon />
                Create record
              </Button>
            ) : null}
          </div>
        ) : null
      }
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

      {schemas.length > 0 || canCreateTable ? (
        <SchemaSheetTabs
          schemas={schemas}
          activeId={activeSchema?.id}
          onSelect={(schemaId) => setWorkbook({ schemaId })}
          renderMenu={(schema) => {
            const canEdit = canNetwork("schema", "update") && !schema.internal
            const canDelete = canNetwork("schema", "delete") && !schema.internal
            const canWorkflow =
              canNetwork("workflow_definition", "read") ||
              canNetwork("workflow_definition", "create")
            if (!canEdit && !canDelete && !canWorkflow) {
              return null
            }
            return (
              <TableSheetMenu
                schema={schema}
                canEdit={canEdit}
                canDelete={canDelete}
                onDeleted={(schemaId) => {
                  if (activeSchema?.id !== schemaId) {
                    return
                  }
                  const remaining = schemas.filter((item) => item.id !== schemaId)
                  const nextParams = new URLSearchParams(params)
                  if (remaining[0]) {
                    nextParams.set("schema", remaining[0].id)
                  } else {
                    nextParams.delete("schema")
                  }
                  setParams(nextParams, { replace: true })
                }}
              />
            )
          }}
          trailing={
            canCreateTable ? (
              <button
                type="button"
                onClick={() => setAddTableOpen(true)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <PlusIcon className="size-3.5" />
                Add table
              </button>
            ) : null
          }
        />
      ) : null}

      {schemaListSettling ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border bg-background text-sm text-muted-foreground">
          Loading table...
        </div>
      ) : activeSchema && activeNetwork ? (
        <SchemaRecordsDataTable
          key={activeSchema.id}
          schema={activeSchema}
          network={activeNetwork}
          organizationId={organizationId}
          filesById={filesById}
          isAuthenticated={isAuthenticated}
          canEditColumns={
            canNetwork("schema", "update") && !activeSchema.internal
          }
          onEdit={openEditRecord}
          onRefreshRelated={() => {
            void refetchFiles()
            void refetchNetworks()
          }}
          isRelatedRefreshing={isFilesFetching || isNetworksFetching}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border bg-background text-sm text-muted-foreground">
          <span className="inline-flex items-center">
            <TableIcon className="mr-2 size-4" />
            No tables yet.
          </span>
          {canCreateTable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddTableOpen(true)}
            >
              <PlusIcon />
              Add table
            </Button>
          ) : null}
        </div>
      )}
      <AddTableDialog
        open={addTableOpen}
        onOpenChange={setAddTableOpen}
        networkId={activeNetwork?.id}
        organizationId={organizationId}
        onCreated={(schemaId) => setWorkbook({ schemaId })}
      />
    </DataTablePage>
  )
}

function SchemaRecordsDataTable({
  schema,
  network,
  organizationId,
  filesById,
  isAuthenticated,
  canEditColumns,
  onEdit,
  onRefreshRelated,
  isRelatedRefreshing,
}: {
  schema: Schema
  network: Network
  organizationId?: string
  filesById: Map<string, StoredFile>
  isAuthenticated: boolean
  canEditColumns: boolean
  onEdit: (recordId: string) => void
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
  const [sorting, setSorting] = useState<SortingState>([])
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
      sort:
        sort && isPropertySort(sort.id, properties) ? sort.id : "createdAt",
      order:
        sort && isPropertySort(sort.id, properties)
          ? sort.desc
            ? "desc"
            : "asc"
          : "desc",
      schemaId: schema.id,
      networkId: network.id,
      organizationId,
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
    query.trim().length > 0 || Object.keys(columnFilters.fields).length > 0

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

  const relatedTables = useMemo(
    () => network.schemas.map((item) => ({ id: item.id, name: item.name })),
    [network.schemas]
  )
  const tableRef = useMemo(
    () => ({
      id: schema.id,
      name: schema.name,
      definition: schema.definition,
    }),
    [schema.definition, schema.id, schema.name]
  )

  const setFieldFilter = useCallback((name: string, value?: FieldFilter) => {
    setColumnFilters((current) => {
      const fields = { ...current.fields }
      if (value) {
        fields[name] = value
      } else {
        delete fields[name]
      }
      return { ...current, fields }
    })
  }, [])

  const columns = useMemo(
    () =>
      helper.columns([
        ...properties.map((property) =>
          helper.accessor((record) => record.data[property.name], {
            id: property.name,
            header: ({ column }) => (
              <ColumnHeaderMenu
                table={tableRef}
                tables={relatedTables}
                property={property}
                canEdit={canEditColumns}
                title={columnLabel(property)}
                sorted={column.getIsSorted()}
                onSort={(descending) => column.toggleSorting(descending)}
                pin={headerPin(column)}
                onHide={
                  column.getCanHide()
                    ? () => column.toggleVisibility(false)
                    : undefined
                }
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
                schemas={network.schemas}
                href={hrefFor(row.original)}
                relatedHref={hrefForRelated}
                onPreviewFile={setPreviewFileId}
              />
            ),
            size:
              isForeignProperty(property) ||
              isFileProperty(property) ||
              isUriProperty(property) ||
              isEmailProperty(property) ||
              isPhoneProperty(property) ||
              isAddressProperty(property)
                ? 200
                : 160,
          })
        ),
        helper.display({
          id: "actions",
          enableSorting: false,
          enableHiding: false,
          enableResizing: false,
          size: 52,
          minSize: 52,
          maxSize: 52,
          header: () =>
            canEditColumns ? (
              <AddColumnButton table={tableRef} tables={relatedTables} />
            ) : null,
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
                  <DropdownMenuItem onClick={() => onEdit(row.original.id)}>
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
      canEditColumns,
      columnFilters.fields,
      filesById,
      hrefFor,
      hrefForRelated,
      network.schemas,
      onEdit,
      properties,
      relatedById,
      relatedTables,
      setFieldFilter,
      tableRef,
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
    onColumnPinningChange: (updater) => {
      setColumnPinning((current) => {
        const next = typeof updater === "function" ? updater(current) : updater
        const end = (next.end ?? []).filter((id) => id !== "actions")
        end.push("actions")
        return { ...next, end }
      })
    },
  })

  const activeFilters = useMemo<DataTableActiveFilter[]>(() => {
    const chips: DataTableActiveFilter[] = []
    for (const property of properties) {
      const filter = columnFilters.fields[property.name]
      if (!filter) {
        continue
      }
      chips.push({
        id: property.name,
        label: columnLabel(property),
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
          <DataTablePagination
            table={table}
            summary={dataTablePageSummary({
              isLoading,
              loadingLabel: "Loading records...",
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              total,
              singular: "record",
            })}
          />
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
