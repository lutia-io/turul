import { useMemo, useState } from "react"

import { FilePreviewDialog, FileThumbnail } from "@/components/file-preview"
import {
  DataTable,
  DataTableCellLink,
  DataTableFilter,
  DataTablePage,
  DataTableToolbar,
  compareText,
  dataTableCount,
  matchesQuery,
  toggleSort,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/data-table"
import type { StoredFile } from "@/data/files"
import { fileKindLabel } from "@/lib/file-preview"
import { formatFileSize } from "@/lib/records"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceFiles,
  useWorkspaceOrganizations,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"

type FileSortKey =
  | "preview"
  | "filename"
  | "contentType"
  | "sizeBytes"
  | "organization"
  | "createdAt"

const fileTypeOptions = [
  { value: "all", label: "All types" },
  { value: "Image", label: "Images" },
  { value: "PDF", label: "PDFs" },
  { value: "CSV", label: "CSVs" },
  { value: "Spreadsheet", label: "Spreadsheets" },
  { value: "Other", label: "Other" },
]

function fileTypeBucket(file: StoredFile) {
  const label = fileKindLabel(file)
  if (
    label === "Image" ||
    label === "PDF" ||
    label === "CSV" ||
    label === "Spreadsheet"
  ) {
    return label
  }
  return "Other"
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
  const { network, organizationId } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { files, isLoading, isError, error } = useWorkspaceFiles()
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [previewFileId, setPreviewFileId] = useState<string>()
  const [sort, setSort] = useState<DataTableSort<FileSortKey>>({
    key: "createdAt",
    direction: "desc",
  })
  const organizationsById = useMemo(
    () =>
      new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  )
  const scoped = files.filter((file) => {
    if (network && file.networkId !== network.id) {
      return false
    }
    if (organizationId && file.organizationId !== organizationId) {
      return false
    }
    return true
  })
  const filtered = scoped.filter((file) => {
    if (typeFilter !== "all" && fileTypeBucket(file) !== typeFilter) {
      return false
    }

    return matchesQuery(query, [
      file.filename,
      file.contentType,
      fileKindLabel(file),
      organizationsById.get(file.organizationId)?.name,
      file.id,
    ])
  })
  const rows = [...filtered].sort((left, right) => {
    const result = compareFiles(left, right, sort.key, organizationsById)
    return sort.direction === "asc" ? result : -result
  })
  const filtersActive = query.trim().length > 0 || typeFilter !== "all"

  function hrefFor(file: StoredFile) {
    return networkWorkspacePath({
      networkId: file.networkId,
      organizationId,
      rest: `files/${file.id}`,
    })
  }

  const previewFile = previewFileId
    ? rows.find((file) => file.id === previewFileId)
    : undefined

  const columns: DataTableColumn<StoredFile, FileSortKey>[] = [
    {
      key: "preview",
      label: "Preview",
      sortable: false,
      className: "w-14",
      render: (file) => (
        <button
          type="button"
          onClick={() => setPreviewFileId(file.id)}
          className="rounded-sm"
        >
          <FileThumbnail file={file} className="size-10" />
          <span className="sr-only">Preview {file.filename}</span>
        </button>
      ),
    },
    {
      key: "filename",
      label: "Filename",
      render: (file) => (
        <button
          type="button"
          onClick={() => setPreviewFileId(file.id)}
          className="block max-w-[22rem] truncate text-left font-medium hover:underline"
        >
          {file.filename}
        </button>
      ),
    },
    {
      key: "contentType",
      label: "Type",
      className: "text-muted-foreground",
      render: (file) => (
        <DataTableCellLink to={hrefFor(file)}>
          {fileKindLabel(file)}
        </DataTableCellLink>
      ),
    },
    {
      key: "sizeBytes",
      label: "Size",
      className: "font-mono tabular-nums",
      render: (file) => (
        <DataTableCellLink to={hrefFor(file)}>
          {formatFileSize(file.sizeBytes)}
        </DataTableCellLink>
      ),
    },
    ...(!organizationId
      ? [
          {
            key: "organization" as const,
            label: "Organization",
            className: "text-muted-foreground",
            render: (file: StoredFile) => (
              <DataTableCellLink to={hrefFor(file)}>
                {organizationsById.get(file.organizationId)?.name ??
                  file.organizationId}
              </DataTableCellLink>
            ),
          },
        ]
      : []),
    {
      key: "createdAt",
      label: "Created",
      className: "text-muted-foreground",
      render: (file) => (
        <DataTableCellLink to={hrefFor(file)} className="whitespace-nowrap">
          {formatCreatedAt(file.createdAt)}
        </DataTableCellLink>
      ),
    },
  ]

  return (
    <DataTablePage
      title="Files"
      description="Uploaded files referenced from record data. Click a file to preview it, or open the row for the full page."
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search files..."
        filters={
          <DataTableFilter
            label="Filter by type"
            value={typeFilter}
            onChange={setTypeFilter}
            className="sm:w-40"
            options={fileTypeOptions}
          />
        }
        count={dataTableCount({
          isLoading,
          loadingLabel: "Loading files...",
          visible: rows.length,
          total: scoped.length,
          singular: "file",
        })}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load files")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          sort={sort}
          onSort={(key) =>
            setSort((current) =>
              toggleSort(current, key, ["createdAt", "sizeBytes"])
            )
          }
          getRowId={(file) => file.id}
          empty={
            isLoading
              ? "Loading files..."
              : filtersActive
                ? "No files match this view."
                : "No files yet."
          }
        />
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

function compareFiles(
  left: StoredFile,
  right: StoredFile,
  key: FileSortKey,
  organizationsById: Map<string, { name: string }>
) {
  if (key === "sizeBytes") {
    return left.sizeBytes - right.sizeBytes
  }
  if (key === "createdAt") {
    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
  }
  if (key === "organization") {
    return compareText(
      organizationsById.get(left.organizationId)?.name ?? "",
      organizationsById.get(right.organizationId)?.name ?? ""
    )
  }
  if (key === "contentType") {
    return compareText(fileKindLabel(left), fileKindLabel(right))
  }
  return compareText(left.filename, right.filename)
}
