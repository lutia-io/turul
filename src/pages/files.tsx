import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

import { FilePreviewSheet, FileThumbnail } from "@/components/file-preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { files, type StoredFile } from "@/data/files"
import { organizationList } from "@/data/networks"
import { fileKindLabel } from "@/lib/file-preview"
import { formatFileSize } from "@/lib/records"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"

type FileSortKey =
  "filename" | "contentType" | "sizeBytes" | "organization" | "createdAt"

export default function FilesPage() {
  const { network, organizationId } = useNetworkWorkspace()
  const [query, setQuery] = useState("")
  const [previewFileId, setPreviewFileId] = useState<string>()
  const [sort, setSort] = useState<{
    key: FileSortKey
    direction: "asc" | "desc"
  }>({
    key: "createdAt",
    direction: "desc",
  })
  const organizationsById = useMemo(
    () =>
      new Map(
        organizationList.map(({ organization }) => [
          organization.id,
          organization,
        ])
      ),
    []
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
  const searched = scoped.filter((file) => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return true
    }

    const organization = organizationsById.get(file.organizationId)?.name ?? ""
    return [file.filename, file.contentType, organization, file.id]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  })
  const rows = [...searched].sort((left, right) => {
    const result = compareFiles(left, right, sort.key, organizationsById)
    return sort.direction === "asc" ? result : -result
  })

  function toggleSort(key: FileSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : {
            key,
            direction:
              key === "createdAt" || key === "sizeBytes" ? "desc" : "asc",
          }
    )
  }

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

  return (
    <div className="flex h-[calc(100svh-var(--app-header-height))] min-h-0 flex-col gap-4 overflow-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Uploaded files referenced from record data. Click a file to preview
            it, or open the row for the full page.
          </p>
        </div>
        <Button>
          <PlusIcon />
          Upload file
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files..."
            className="h-8 pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {rows.length === scoped.length
            ? `${scoped.length} files`
            : `${rows.length} of ${scoped.length} files`}
        </p>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border bg-background shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14">Preview</TableHead>
              <FileHead
                label="Filename"
                sortKey="filename"
                sort={sort}
                onSort={toggleSort}
              />
              <FileHead
                label="Type"
                sortKey="contentType"
                sort={sort}
                onSort={toggleSort}
              />
              <FileHead
                label="Size"
                sortKey="sizeBytes"
                sort={sort}
                onSort={toggleSort}
              />
              {!organizationId ? (
                <FileHead
                  label="Organization"
                  sortKey="organization"
                  sort={sort}
                  onSort={toggleSort}
                />
              ) : null}
              <FileHead
                label="Created"
                sortKey="createdAt"
                sort={sort}
                onSort={toggleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setPreviewFileId(file.id)}
                      className="rounded-sm"
                    >
                      <FileThumbnail file={file} className="size-10" />
                      <span className="sr-only">Preview {file.filename}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setPreviewFileId(file.id)}
                      className="block max-w-[22rem] truncate text-left font-medium hover:underline"
                    >
                      {file.filename}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link to={hrefFor(file)} className="block truncate">
                      {fileKindLabel(file)}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    <Link to={hrefFor(file)} className="block">
                      {formatFileSize(file.sizeBytes)}
                    </Link>
                  </TableCell>
                  {!organizationId ? (
                    <TableCell className="text-muted-foreground">
                      <Link to={hrefFor(file)} className="block truncate">
                        {organizationsById.get(file.organizationId)?.name ??
                          file.organizationId}
                      </Link>
                    </TableCell>
                  ) : null}
                  <TableCell className="text-muted-foreground">
                    <Link
                      to={hrefFor(file)}
                      className="block whitespace-nowrap"
                    >
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(file.createdAt))}
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={organizationId ? 5 : 6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No files match this view.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <FilePreviewSheet
        file={previewFile}
        open={Boolean(previewFile)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFileId(undefined)
          }
        }}
        href={previewFile ? hrefFor(previewFile) : undefined}
      />
    </div>
  )
}

function FileHead({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: FileSortKey
  sort: { key: FileSortKey; direction: "asc" | "desc" }
  onSort: (key: FileSortKey) => void
}) {
  const direction = sort.key === sortKey ? sort.direction : undefined
  const Icon =
    direction === "asc"
      ? ArrowUpIcon
      : direction === "desc"
        ? ArrowDownIcon
        : ChevronsUpDownIcon

  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <Icon className="size-3.5 opacity-60" />
      </button>
    </TableHead>
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
    const leftName = organizationsById.get(left.organizationId)?.name ?? ""
    const rightName = organizationsById.get(right.organizationId)?.name ?? ""
    return leftName.localeCompare(rightName)
  }

  return String(left[key]).localeCompare(String(right[key]), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}
