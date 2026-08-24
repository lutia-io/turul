import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { ViewIcon } from "lucide-react"
import { useTable } from "@tanstack/react-table"

import { FilePreviewDialog, FileThumbnail } from "@/components/file-preview"
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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { StoredFile } from "@/data/files"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { fileKindLabel } from "@/lib/file-preview"
import { formatFileSize } from "@/lib/records"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  workspaceFileFromApi,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListFilesQuery,
  type FileContentTypeFilter,
  type FileListSort,
  type ListFilesParams,
} from "@/store/file-slice"

const helper = createManagedColumnHelper<StoredFile>()
const EMPTY_FILES: StoredFile[] = []

type FileColumnFilters = {
  filename?: { op: StringFilterOp; value: string }
  contentType?: FileContentTypeFilter
  sizeBytes?: { op: NumberFilterOp; value: number }
  organization?: { op: StringFilterOp; value: string }
}

const sortFields: FileListSort[] = [
  "filename",
  "contentType",
  "sizeBytes",
  "organization",
  "createdAt",
  "updatedAt",
]

const fileTypeOptions: { value: FileContentTypeFilter; label: string }[] = [
  { value: "Image", label: "Images" },
  { value: "PDF", label: "PDFs" },
  { value: "CSV", label: "CSVs" },
  { value: "Spreadsheet", label: "Spreadsheets" },
  { value: "Other", label: "Other" },
]

function isFileSort(value: string): value is FileListSort {
  return sortFields.includes(value as FileListSort)
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

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function FilesPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organizationId } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<FileColumnFilters>({})
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
  }, [debouncedQuery, columnFilters, network?.id, organizationId])

  const listParams = useMemo<ListFilesParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isFileSort(sort.id) ? sort.id : "createdAt",
      order: sort?.desc ? "desc" : "asc",
      networkId: network?.id,
      organizationId,
      filename: columnFilters.filename?.value,
      filenameOp: columnFilters.filename?.op,
      contentType: columnFilters.contentType,
      sizeBytes: columnFilters.sizeBytes?.value,
      sizeBytesOp: columnFilters.sizeBytes?.op,
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
    useListFilesQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const rows = useMemo(
    () => list?.items.map(workspaceFileFromApi) ?? EMPTY_FILES,
    [list]
  )
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)
  const organizationsById = useMemo(
    () =>
      new Map(
        organizations.map((organization) => [organization.id, organization])
      ),
    [organizations]
  )

  const hrefFor = useCallback(
    (file: StoredFile) => {
      return networkWorkspacePath({
        networkId: file.networkId,
        organizationId,
        rest: `files/${file.id}`,
      })
    },
    [organizationId]
  )

  const previewFile = previewFileId
    ? rows.find((file) => file.id === previewFileId)
    : undefined

  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "preview",
          enableSorting: false,
          header: ({ column }) => (
            <DataTableColumnHeader title="Preview" pin={headerPin(column)} />
          ),
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() => setPreviewFileId(row.original.id)}
              className="rounded-sm"
            >
              <FileThumbnail file={row.original} className="size-10" />
              <span className="sr-only">Preview {row.original.filename}</span>
            </button>
          ),
          size: 88,
          minSize: 72,
        }),
        helper.accessor("filename", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Filename"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "text",
                value: columnFilters.filename,
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    filename: value,
                  })),
              }}
            />
          ),
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() => setPreviewFileId(row.original.id)}
              className="block w-full truncate text-left font-medium hover:underline"
            >
              {row.original.filename}
            </button>
          ),
          size: 240,
          enableHiding: false,
        }),
        helper.accessor((file) => fileKindLabel(file), {
          id: "contentType",
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Type"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "enum",
                value: columnFilters.contentType,
                options: fileTypeOptions,
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    contentType: value as FileColumnFilters["contentType"],
                  })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="text-muted-foreground"
            >
              {fileKindLabel(row.original)}
            </DataTableCellLink>
          ),
          size: 140,
        }),
        helper.accessor("sizeBytes", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Size"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "number",
                value: columnFilters.sizeBytes,
                onChange: (value) =>
                  setColumnFilters((current) => ({
                    ...current,
                    sizeBytes: value,
                  })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="font-mono tabular-nums"
            >
              {formatFileSize(row.original.sizeBytes)}
            </DataTableCellLink>
          ),
          size: 120,
        }),
        ...(!organizationId
          ? [
              helper.accessor(
                (file) =>
                  organizationsById.get(file.organizationId)?.name ??
                  file.organizationId,
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
    [columnFilters, hrefFor, organizationId, organizationsById]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (file) => file.id,
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
    if (columnFilters.filename) {
      chips.push({
        id: "filename",
        label: "Filename",
        value: stringFilterChipValue(columnFilters.filename.op, columnFilters.filename.value),
        onRemove: () =>
          setColumnFilters((current) => ({
            ...current,
            filename: undefined,
          })),
      })
    }
    if (columnFilters.contentType) {
      chips.push({
        id: "contentType",
        label: "Type",
        value:
          fileTypeOptions.find(
            (option) => option.value === columnFilters.contentType
          )?.label ?? columnFilters.contentType,
        onRemove: () =>
          setColumnFilters((current) => ({
            ...current,
            contentType: undefined,
          })),
      })
    }
    if (columnFilters.sizeBytes) {
      chips.push({
        id: "sizeBytes",
        label: "Size",
        value: numberFilterChipValue(
          columnFilters.sizeBytes.op,
          columnFilters.sizeBytes.value,
          formatFileSize
        ),
        onRemove: () =>
          setColumnFilters((current) => ({
            ...current,
            sizeBytes: undefined,
          })),
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
      title="Files"
      description="Uploaded files referenced from record data. Click a file to preview it, or open the row for the full page."
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search filename or type..."
        searchClassName="sm:max-w-3xl"
        chips={<DataTableActiveFilters filters={activeFilters} />}
        trailing={<DataTableViewOptions table={table} />}
        count={dataTablePageSummary({
          isLoading,
          loadingLabel: "Loading files...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
          singular: "file",
        })}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load files")}
        </p>
      ) : (
        <>
          <DataTableView
            table={table}
            isRefreshing={isFetching}
            empty={
              isLoading
                ? "Loading files..."
                : filtersActive
                  ? "No files match this view."
                  : "No files yet."
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
        href={previewFile ? hrefFor(previewFile) : undefined}
      />
    </DataTablePage>
  )
}

