import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Link, useSearchParams } from "react-router"
import {
  PencilIcon,
  PlusIcon,
  TableIcon,
  ViewIcon,
} from "lucide-react"
import { useTable } from "@tanstack/react-table"

import { AddTableDialog } from "@/components/add-table-dialog"
import { TableSheetMenu } from "@/components/table-sheet-menu"
import { useCreateEntity } from "@/components/create-entity"
import { FilePreviewDialog } from "@/components/file-preview"
import {
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
  columnLabel,
  RecordCell,
  SchemaSheetTabs,
  type RecordUser,
} from "@/components/schema-records-table"
import { SpreadsheetCellEditor } from "@/components/spreadsheet-cell-editor"
import {
  AddColumnButton,
  ColumnHeaderMenu,
} from "@/components/table-column-editor"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
  isUserArrayProperty,
  isUserProperty,
  type JsonObject,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceFiles,
  useWorkspaceNetworksWithDefinitions,
  useWorkspaceOrganizationUsers,
  workspaceRecordFromApi,
} from "@/lib/network-workspace"
import { useAuthorization } from "@/lib/authorization"
import {
  clipboardValueForProperty,
  coercePasteValue,
  encodeTsv,
  isCellInSelection,
  isSimpleSpreadsheetProperty,
  moveCellRef,
  parseTsv,
  sameSpreadsheetCell,
  selectionBounds,
  type SpreadsheetCellRef,
} from "@/lib/spreadsheet-table"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListRecordsQuery,
  useUpdateRecordMutation,
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
    isFetching: isWorkspaceFetching,
  } = useNetworkWorkspace()
  const { openCreateRecord, openEditRecord } = useCreateEntity()
  const {
    canOrg,
    canNetwork,
    isOrgUser,
    data: authorization,
  } = useAuthorization()
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
  const canCreateTable =
    canNetwork("schema", "create") && Boolean(activeNetwork)
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
  const canEditRecords = isOrgUser
    ? canOrg("record", "update") || canOrg("record", "create")
    : canNetwork("record", "update") ||
      Boolean(authorization?.network?.member)

  const sheetTabs =
    schemas.length > 0 || canCreateTable ? (
      <SchemaSheetTabs
        schemas={schemas}
        activeId={activeSchema?.id}
        onSelect={(schemaId) => setWorkbook({ schemaId })}
        renderMenu={(schema) => {
          const canEdit = canNetwork("schema", "update") && !schema.internal
          const canDelete = canNetwork("schema", "delete") && !schema.internal
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
              className="mb-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <PlusIcon className="size-3.5" />
              Add table
            </button>
          ) : null
        }
      />
    ) : null

  return (
    <DataTablePage
      title="Records"
      description="Tables are sheets in this workbook. Move with arrow keys, edit simple cells in place, and use the sheet tabs to switch tables."
      action={
        canCreateRecord ? (
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-xs">
        {sheetTabs ? (
          <div className="flex shrink-0 items-end gap-2 border-b bg-muted/30 px-2">
            {sheetTabs}
          </div>
        ) : null}
        {schemaListSettling ? (
          <Skeleton className="m-3 flex-1 rounded-lg" aria-busy="true" />
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
            canEditRecords={canEditRecords}
            onEdit={openEditRecord}
            onRefreshRelated={() => {
              void refetchFiles()
              void refetchNetworks()
            }}
            isRelatedRefreshing={isFilesFetching || isNetworksFetching}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
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
      </div>
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
  canEditRecords,
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
  canEditRecords: boolean
  onEdit: (recordId: string) => void
  onRefreshRelated: () => void
  isRelatedRefreshing: boolean
}) {
  const properties = useMemo(
    () => getJsonSchemaProperties(schema.definition),
    [schema.definition]
  )
  const propertiesByName = useMemo(() => {
    const map = new Map<string, JsonSchemaProperty>()
    for (const property of properties) {
      map.set(property.name, property)
    }
    return map
  }, [properties])
  const selectableColumnIds = useMemo(
    () => properties.map((property) => property.name),
    [properties]
  )
  const { organizationUsers } = useWorkspaceOrganizationUsers()
  const usersById = useMemo(() => {
    const users = new Map<string, RecordUser>()
    for (const user of organizationUsers) {
      if (organizationId && user.organizationId !== organizationId) {
        continue
      }
      users.set(user.id, user)
    }
    return users
  }, [organizationId, organizationUsers])
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
  const [activeCell, setActiveCell] = useState<SpreadsheetCellRef | null>(null)
  const [selectionAnchor, setSelectionAnchor] =
    useState<SpreadsheetCellRef | null>(null)
  const [selectionFocus, setSelectionFocus] =
    useState<SpreadsheetCellRef | null>(null)
  const [editing, setEditing] = useState<SpreadsheetCellRef | null>(null)
  const [editDraftSeed, setEditDraftSeed] = useState<string | undefined>()
  const [optimisticData, setOptimisticData] = useState<
    Record<string, JsonObject>
  >({})
  const gridRef = useRef<HTMLDivElement | null>(null)
  const editOnReleaseRef = useRef(false)
  const [updateRecord] = useUpdateRecordMutation()

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [debouncedQuery, columnFilters, network.id, organizationId, schema.id])

  const listParams = useMemo<ListRecordsParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isPropertySort(sort.id, properties) ? sort.id : "createdAt",
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
  const rows = useMemo(() => {
    const items = list?.items.map(workspaceRecordFromApi) ?? EMPTY_RECORDS
    if (Object.keys(optimisticData).length === 0) {
      return items
    }
    return items.map((record) => {
      const nextData = optimisticData[record.id]
      if (!nextData) {
        return record
      }
      return { ...record, data: nextData }
    })
  }, [list, optimisticData])
  const rowIds = useMemo(() => rows.map((record) => record.id), [rows])
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.keys(columnFilters.fields).length > 0

  useEffect(() => {
    setActiveCell(null)
    setSelectionAnchor(null)
    setSelectionFocus(null)
    setEditing(null)
    setEditDraftSeed(undefined)
    setOptimisticData({})
  }, [schema.id])

  useEffect(() => {
    setOptimisticData((current) => {
      if (Object.keys(current).length === 0) {
        return current
      }
      const next = { ...current }
      let changed = false
      for (const record of list?.items.map(workspaceRecordFromApi) ?? []) {
        const optimistic = next[record.id]
        if (!optimistic) {
          continue
        }
        if (JSON.stringify(optimistic) === JSON.stringify(record.data)) {
          delete next[record.id]
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [list])

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

  const hrefForUser = useCallback(
    (userId: string) => {
      return networkWorkspacePath({
        networkId: network.id,
        organizationId,
        rest: `organization-users/${userId}`,
      })
    },
    [network.id, organizationId]
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
            meta: { label: columnLabel(property) },
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
                usersById={usersById}
                schemas={network.schemas}
                href={hrefFor(row.original)}
                relatedHref={hrefForRelated}
                userHref={hrefForUser}
                onPreviewFile={setPreviewFileId}
                spreadsheet
              />
            ),
            size:
              isForeignProperty(property) ||
              isFileProperty(property) ||
              isUserProperty(property) ||
              isUserArrayProperty(property) ||
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
          meta: { label: "Actions" },
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
      hrefForUser,
      usersById,
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

  const visibleSelectableColumnIds = useMemo(() => {
    const visible = new Set(
      table.getVisibleLeafColumns().map((column) => column.id)
    )
    return selectableColumnIds.filter((id) => visible.has(id))
  }, [selectableColumnIds, table, columnVisibility])

  const selectCell = useCallback(
    (cell: SpreadsheetCellRef, extend: boolean) => {
      setEditing(null)
      setEditDraftSeed(undefined)
      setActiveCell(cell)
      if (extend && selectionAnchor) {
        setSelectionFocus(cell)
      } else {
        setSelectionAnchor(cell)
        setSelectionFocus(cell)
      }
    },
    [selectionAnchor]
  )

  const extendSelectionTo = useCallback((cell: SpreadsheetCellRef) => {
    setEditing(null)
    setEditDraftSeed(undefined)
    setActiveCell(cell)
    setSelectionFocus(cell)
  }, [])

  const beginEdit = useCallback(
    (cell: SpreadsheetCellRef, seed?: string) => {
      if (!canEditRecords) {
        return
      }
      const property = propertiesByName.get(cell.columnId)
      if (!property || !isSimpleSpreadsheetProperty(property)) {
        onEdit(cell.rowId)
        return
      }
      setActiveCell(cell)
      setSelectionAnchor(cell)
      setSelectionFocus(cell)
      setEditDraftSeed(seed)
      setEditing(cell)
    },
    [canEditRecords, onEdit, propertiesByName]
  )

  const commitCellValue = useCallback(
    async (cell: SpreadsheetCellRef, nextValue: JsonValue | null) => {
      const record = rows.find((item) => item.id === cell.rowId)
      const property = propertiesByName.get(cell.columnId)
      if (!record || !property) {
        setEditing(null)
        setEditDraftSeed(undefined)
        return
      }
      const previous = record.data[property.name]
      const normalizedPrevious =
        previous === undefined || previous === "" ? null : previous
      const normalizedNext = nextValue === "" ? null : nextValue
      if (
        JSON.stringify(normalizedPrevious) === JSON.stringify(normalizedNext)
      ) {
        setEditing(null)
        setEditDraftSeed(undefined)
        return
      }
      const nextData: JsonObject = { ...record.data }
      if (normalizedNext === null) {
        delete nextData[property.name]
      } else {
        nextData[property.name] = normalizedNext
      }
      setOptimisticData((current) => ({
        ...current,
        [record.id]: nextData,
      }))
      setEditing(null)
      setEditDraftSeed(undefined)
      try {
        await updateRecord({ id: record.id, data: nextData }).unwrap()
      } catch {
        setOptimisticData((current) => {
          const next = { ...current }
          delete next[record.id]
          return next
        })
      }
    },
    [propertiesByName, rows, updateRecord]
  )

  const isCellSelected = useCallback(
    (cell: SpreadsheetCellRef) =>
      isCellInSelection(
        cell,
        selectionAnchor,
        selectionFocus,
        rowIds,
        visibleSelectableColumnIds
      ),
    [rowIds, selectionAnchor, selectionFocus, visibleSelectableColumnIds]
  )

  const copySelection = useCallback(async () => {
    if (!selectionAnchor || !selectionFocus) {
      return
    }
    const bounds = selectionBounds(
      selectionAnchor,
      selectionFocus,
      rowIds,
      visibleSelectableColumnIds
    )
    if (!bounds) {
      return
    }
    const matrix: string[][] = []
    for (let rowIndex = bounds.rowStart; rowIndex <= bounds.rowEnd; rowIndex++) {
      const record = rows[rowIndex]
      if (!record) {
        continue
      }
      const line: string[] = []
      for (
        let colIndex = bounds.colStart;
        colIndex <= bounds.colEnd;
        colIndex++
      ) {
        const columnId = visibleSelectableColumnIds[colIndex]
        const property = columnId
          ? propertiesByName.get(columnId)
          : undefined
        if (!columnId || !property) {
          line.push("")
          continue
        }
        line.push(
          clipboardValueForProperty(record.data[property.name], property)
        )
      }
      matrix.push(line)
    }
    try {
      await navigator.clipboard.writeText(encodeTsv(matrix))
    } catch {
      // Clipboard may be unavailable in some environments.
    }
  }, [
    propertiesByName,
    rowIds,
    rows,
    selectionAnchor,
    selectionFocus,
    visibleSelectableColumnIds,
  ])

  const pasteSelection = useCallback(
    async (text: string) => {
      if (!canEditRecords || !activeCell) {
        return
      }
      const matrix = parseTsv(text)
      if (matrix.length === 0) {
        return
      }
      const startRow = rowIds.indexOf(activeCell.rowId)
      const startCol = visibleSelectableColumnIds.indexOf(activeCell.columnId)
      if (startRow < 0 || startCol < 0) {
        return
      }

      const updates = new Map<string, JsonObject>()
      for (let rowOffset = 0; rowOffset < matrix.length; rowOffset++) {
        const record = rows[startRow + rowOffset]
        if (!record) {
          break
        }
        const line = matrix[rowOffset] ?? []
        let nextData = updates.get(record.id) ?? { ...record.data }
        let changed = false
        for (let colOffset = 0; colOffset < line.length; colOffset++) {
          const columnId = visibleSelectableColumnIds[startCol + colOffset]
          const property = columnId
            ? propertiesByName.get(columnId)
            : undefined
          if (!property || !isSimpleSpreadsheetProperty(property)) {
            continue
          }
          const coerced = coercePasteValue(line[colOffset] ?? "", property)
          if (coerced === undefined) {
            continue
          }
          if (coerced === null) {
            if (property.name in nextData) {
              delete nextData[property.name]
              changed = true
            }
          } else if (
            JSON.stringify(nextData[property.name]) !== JSON.stringify(coerced)
          ) {
            nextData = { ...nextData, [property.name]: coerced }
            changed = true
          }
        }
        if (changed) {
          updates.set(record.id, nextData)
        }
      }

      if (updates.size === 0) {
        return
      }

      setOptimisticData((current) => {
        const next = { ...current }
        for (const [id, data] of updates) {
          next[id] = data
        }
        return next
      })

      const endRow = Math.min(
        rows.length - 1,
        startRow + matrix.length - 1
      )
      const endCol = Math.min(
        visibleSelectableColumnIds.length - 1,
        startCol + Math.max(...matrix.map((line) => line.length), 1) - 1
      )
      const focus: SpreadsheetCellRef = {
        rowId: rowIds[endRow] ?? activeCell.rowId,
        columnId:
          visibleSelectableColumnIds[endCol] ?? activeCell.columnId,
      }
      setSelectionAnchor(activeCell)
      setSelectionFocus(focus)
      setActiveCell(activeCell)

      await Promise.all(
        [...updates.entries()].map(async ([id, data]) => {
          try {
            await updateRecord({ id, data }).unwrap()
          } catch {
            setOptimisticData((current) => {
              const next = { ...current }
              delete next[id]
              return next
            })
          }
        })
      )
    },
    [
      activeCell,
      canEditRecords,
      propertiesByName,
      rowIds,
      rows,
      updateRecord,
      visibleSelectableColumnIds,
    ]
  )

  const onCellPointerDown = useCallback(
    (cell: SpreadsheetCellRef, event: ReactPointerEvent) => {
      editOnReleaseRef.current =
        !event.shiftKey && sameSpreadsheetCell(activeCell, cell) && !editing
      gridRef.current?.focus({ preventScroll: true })
      selectCell(cell, event.shiftKey)
    },
    [activeCell, editing, selectCell]
  )

  const onSelectionDrag = useCallback(
    (cell: SpreadsheetCellRef) => {
      editOnReleaseRef.current = false
      extendSelectionTo(cell)
    },
    [extendSelectionTo]
  )

  const onSelectionGestureEnd = useCallback(
    ({ cell, moved }: { cell: SpreadsheetCellRef; moved: boolean }) => {
      const shouldEdit = editOnReleaseRef.current && !moved
      editOnReleaseRef.current = false
      if (shouldEdit) {
        beginEdit(cell)
      }
      gridRef.current?.focus({ preventScroll: true })
    },
    [beginEdit]
  )

  const onCellDoubleClick = useCallback(
    (cell: SpreadsheetCellRef) => {
      editOnReleaseRef.current = false
      beginEdit(cell)
    },
    [beginEdit]
  )

  const onSpreadsheetKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (editing) {
        return
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input,textarea,select,[contenteditable=true]")
      ) {
        return
      }

      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === "c") {
        event.preventDefault()
        void copySelection()
        return
      }
      if (meta && event.key.toLowerCase() === "v") {
        if (!canEditRecords) {
          return
        }
        event.preventDefault()
        void navigator.clipboard.readText().then((text) => {
          void pasteSelection(text)
        })
        return
      }

      if (!activeCell || rowIds.length === 0 || visibleSelectableColumnIds.length === 0) {
        if (event.key.length === 1 && !meta && !event.altKey && rows[0]) {
          const first: SpreadsheetCellRef = {
            rowId: rows[0].id,
            columnId: visibleSelectableColumnIds[0] ?? "",
          }
          if (first.columnId) {
            beginEdit(first, event.key)
            event.preventDefault()
          }
        }
        return
      }

      if (event.key === "Escape") {
        event.preventDefault()
        setEditing(null)
        setEditDraftSeed(undefined)
        setSelectionAnchor(activeCell)
        setSelectionFocus(activeCell)
        return
      }

      if (event.key === "Enter") {
        event.preventDefault()
        beginEdit(activeCell)
        return
      }

      if (event.key === "F2") {
        event.preventDefault()
        beginEdit(activeCell)
        return
      }

      if (event.key === "Tab") {
        event.preventDefault()
        const next = moveCellRef(
          activeCell,
          rowIds,
          visibleSelectableColumnIds,
          0,
          event.shiftKey ? -1 : 1
        )
        selectCell(next, false)
        return
      }

      const arrowDelta: Record<string, { row: number; col: number }> = {
        ArrowUp: { row: -1, col: 0 },
        ArrowDown: { row: 1, col: 0 },
        ArrowLeft: { row: 0, col: -1 },
        ArrowRight: { row: 0, col: 1 },
      }
      const delta = arrowDelta[event.key]
      if (delta) {
        event.preventDefault()
        const next = moveCellRef(
          activeCell,
          rowIds,
          visibleSelectableColumnIds,
          delta.row,
          delta.col
        )
        selectCell(next, event.shiftKey)
        return
      }

      if (
        event.key.length === 1 &&
        !meta &&
        !event.altKey &&
        !event.ctrlKey &&
        event.key !== " "
      ) {
        const property = propertiesByName.get(activeCell.columnId)
        if (property && isSimpleSpreadsheetProperty(property) && canEditRecords) {
          event.preventDefault()
          beginEdit(activeCell, event.key)
        }
      }
    },
    [
      activeCell,
      beginEdit,
      canEditRecords,
      copySelection,
      editing,
      pasteSelection,
      propertiesByName,
      rowIds,
      rows,
      selectCell,
      visibleSelectableColumnIds,
    ]
  )

  const previewFile = previewFileId ? filesById.get(previewFileId) : undefined

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-3 py-2">
        <DataTableToolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search records..."
          searchClassName="sm:max-w-3xl"
          chips={<DataTableActiveFilters filters={activeFilters} />}
          trailing={
            <div className="flex items-center gap-2">
              {canEditColumns ? (
                <AddColumnButton
                  table={tableRef}
                  tables={relatedTables}
                  variant="toolbar"
                />
              ) : null}
              <DataTableViewOptions table={table} />
            </div>
          }
          onRefresh={() => {
            void refetch()
            onRefreshRelated()
          }}
          isRefreshing={isFetching || isRelatedRefreshing}
        />
      </div>
      {isError ? (
        <p className="px-3 py-2 text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load records")}
        </p>
      ) : (
        <>
          <DataTableView
            table={table}
            isLoading={isLoading}
            isRefreshing={isFetching}
            embedded
            empty={
              filtersActive ? "No records match this view." : "No records yet."
            }
            spreadsheet={{
              activeCell,
              selectionAnchor,
              selectionFocus,
              editing,
              selectableColumnIds: visibleSelectableColumnIds,
              rowIndexOffset: pagination.pageIndex * pagination.pageSize,
              isCellSelected,
              onCellPointerDown,
              onSelectionDrag,
              onSelectionGestureEnd,
              onCellDoubleClick,
              onKeyDown: onSpreadsheetKeyDown,
              gridRef,
              renderEditor: (cell) => {
                const record = rows.find((item) => item.id === cell.rowId)
                const property = propertiesByName.get(cell.columnId)
                if (!record || !property) {
                  return null
                }
                return (
                  <SpreadsheetCellEditor
                    property={property}
                    value={record.data[property.name]}
                    initialDraft={
                      sameSpreadsheetCell(editing, cell)
                        ? editDraftSeed
                        : undefined
                    }
                    onCommit={(next) => {
                      void commitCellValue(cell, next)
                    }}
                    onCancel={() => {
                      setEditing(null)
                      setEditDraftSeed(undefined)
                    }}
                  />
                )
              },
            }}
          />
          <div className="shrink-0 border-t px-3 py-2">
            <DataTablePagination
              table={table}
              summary={dataTablePageSummary({
                isLoading,
                pageIndex: pagination.pageIndex,
                pageSize: pagination.pageSize,
                total,
                singular: "record",
              })}
            />
          </div>
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
    </div>
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
