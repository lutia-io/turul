import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  FilterIcon,
  SearchIcon,
} from "lucide-react"

import { FilePreviewSheet, FileThumbnail } from "@/components/file-preview"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { StoredFile, StoredRecord } from "@/data/files"
import type { Organization, Schema } from "@/data/networks"
import { getBadgeColor } from "@/lib/badge"
import {
  getJsonSchemaProperties,
  isFileProperty,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import {
  compareCellValues,
  formatCellValue,
  recordMatchesQuery,
  uniqueColumnValues,
} from "@/lib/records"
import { cn } from "@/lib/utils"

type SortState = {
  key: string
  direction: "asc" | "desc"
}

export function SchemaRecordsTable({
  schema,
  records,
  filesById,
  organizationsById,
  recordHref,
  fileHref,
  showOrganization = true,
}: {
  schema: Schema
  records: StoredRecord[]
  filesById: Map<string, StoredFile>
  organizationsById: Map<string, Organization>
  recordHref: (record: StoredRecord) => string
  fileHref: (fileId: string) => string
  showOrganization?: boolean
}) {
  const properties = getJsonSchemaProperties(schema.definition)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState>()
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(
    {}
  )
  const [previewFileId, setPreviewFileId] = useState<string>()

  const searched = useMemo(
    () =>
      records.filter((record) =>
        recordMatchesQuery(record, query, properties, filesById)
      ),
    [filesById, properties, query, records]
  )

  const filtered = useMemo(() => {
    return searched.filter((record) =>
      properties.every((property) => {
        const selected = columnFilters[property.name]
        if (!selected || selected.length === 0) {
          return true
        }

        const value = record.data[property.name]
        const label =
          property.format === "file" && typeof value === "string"
            ? (filesById.get(value)?.filename ?? value)
            : formatCellValue(value, property)

        return selected.includes(label)
      })
    )
  }, [columnFilters, filesById, properties, searched])

  const rows = useMemo(() => {
    if (!sort) {
      return filtered
    }

    const property = properties.find((item) => item.name === sort.key)
    const copy = [...filtered]

    copy.sort((left, right) => {
      if (sort.key === "organization") {
        const leftName = organizationsById.get(left.organizationId)?.name ?? ""
        const rightName =
          organizationsById.get(right.organizationId)?.name ?? ""
        const result = leftName.localeCompare(rightName)
        return sort.direction === "asc" ? result : -result
      }

      if (!property) {
        return 0
      }

      const result = compareCellValues(
        left.data[property.name],
        right.data[property.name],
        property
      )
      return sort.direction === "asc" ? result : -result
    })

    return copy
  }, [filtered, organizationsById, properties, sort])

  useEffect(() => {
    setQuery("")
    setSort(undefined)
    setColumnFilters({})
    setPreviewFileId(undefined)
  }, [schema.id])

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) {
        return { key, direction: "asc" }
      }

      if (current.direction === "asc") {
        return { key, direction: "desc" }
      }

      return undefined
    })
  }

  function toggleFilter(propertyName: string, value: string) {
    setColumnFilters((current) => {
      const selected = new Set(current[propertyName] ?? [])
      if (selected.has(value)) {
        selected.delete(value)
      } else {
        selected.add(value)
      }

      return {
        ...current,
        [propertyName]: [...selected],
      }
    })
  }

  const activeFilterCount = Object.values(columnFilters).filter(
    (values) => values.length > 0
  ).length
  const previewFile = previewFileId ? filesById.get(previewFileId) : undefined

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records..."
            className="h-8 bg-background pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {rows.length === records.length
            ? `${records.length} records`
            : `${rows.length} of ${records.length} records`}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filters` : ""}
        </p>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {showOrganization ? (
                <SortableHead
                  label="Organization"
                  sortKey="organization"
                  sort={sort}
                  onSort={toggleSort}
                />
              ) : null}
              {properties.map((property) => (
                <SortableHead
                  key={property.name}
                  label={propertyLabel(property.name)}
                  description={property.description}
                  sortKey={property.name}
                  sort={sort}
                  onSort={toggleSort}
                  filterValues={uniqueColumnValues(
                    searched,
                    property,
                    filesById
                  )}
                  selectedFilters={columnFilters[property.name] ?? []}
                  onToggleFilter={(value) => toggleFilter(property.name, value)}
                  onClearFilter={() =>
                    setColumnFilters((current) => ({
                      ...current,
                      [property.name]: [],
                    }))
                  }
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow key={row.id} className="group">
                  {showOrganization ? (
                    <TableCell className="py-2.5">
                      <Link
                        to={recordHref(row)}
                        className="block min-w-[9rem] truncate text-muted-foreground"
                      >
                        {organizationsById.get(row.organizationId)?.name ??
                          row.organizationId}
                      </Link>
                    </TableCell>
                  ) : null}
                  {properties.map((property) => (
                    <TableCell key={property.name} className="py-2.5">
                      <RecordCell
                        record={row}
                        property={property}
                        filesById={filesById}
                        href={recordHref(row)}
                        onPreviewFile={setPreviewFileId}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={properties.length + (showOrganization ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  No records match this view.
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
        href={previewFileId ? fileHref(previewFileId) : undefined}
      />
    </div>
  )
}

function SortableHead({
  label,
  description,
  sortKey,
  sort,
  onSort,
  filterValues,
  selectedFilters = [],
  onToggleFilter,
  onClearFilter,
}: {
  label: string
  description?: string
  sortKey: string
  sort?: SortState
  onSort: (key: string) => void
  filterValues?: string[]
  selectedFilters?: string[]
  onToggleFilter?: (value: string) => void
  onClearFilter?: () => void
}) {
  const direction = sort?.key === sortKey ? sort.direction : undefined
  const SortIcon =
    direction === "asc"
      ? ArrowUpIcon
      : direction === "desc"
        ? ArrowDownIcon
        : ChevronsUpDownIcon

  return (
    <TableHead title={description}>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="inline-flex items-center gap-1 rounded-md px-0.5 font-medium hover:text-foreground"
        >
          {label}
          <SortIcon
            className={cn("size-3.5", direction ? "opacity-100" : "opacity-40")}
          />
        </button>
        {filterValues && filterValues.length > 0 && onToggleFilter ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    selectedFilters.length > 0 && "text-foreground"
                  )}
                />
              }
            >
              <FilterIcon
                className={cn(
                  "size-3",
                  selectedFilters.length > 0
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              />
              <span className="sr-only">Filter {label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              <DropdownMenuLabel>Filter {label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterValues.map((value) => (
                <DropdownMenuCheckboxItem
                  key={value}
                  checked={selectedFilters.includes(value)}
                  onCheckedChange={() => onToggleFilter(value)}
                >
                  {value}
                </DropdownMenuCheckboxItem>
              ))}
              {selectedFilters.length > 0 && onClearFilter ? (
                <>
                  <DropdownMenuSeparator />
                  <button
                    type="button"
                    onClick={onClearFilter}
                    className="flex w-full rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Clear filter
                  </button>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </TableHead>
  )
}

function RecordCell({
  record,
  property,
  filesById,
  href,
  onPreviewFile,
}: {
  record: StoredRecord
  property: JsonSchemaProperty
  filesById: Map<string, StoredFile>
  href: string
  onPreviewFile: (fileId: string) => void
}) {
  const value = record.data[property.name]

  if (isFileProperty(property) && typeof value === "string" && value) {
    const file = filesById.get(value)

    return (
      <button
        type="button"
        onClick={() => onPreviewFile(value)}
        className="inline-flex max-w-[16rem] items-center gap-2 truncate rounded-lg bg-muted/70 px-1.5 py-1 text-left text-xs font-medium transition-colors hover:bg-muted"
      >
        {file ? <FileThumbnail file={file} className="size-6" /> : null}
        <span className="truncate">{file?.filename ?? value}</span>
      </button>
    )
  }

  const text = formatCellValue(value, property)
  const tone =
    property.enumValues && typeof value === "string"
      ? enumTone(value)
      : undefined

  return (
    <Link
      to={href}
      className={cn(
        "block max-w-[18rem] min-w-[6rem] truncate",
        property.type === "number" || property.type === "integer"
          ? "text-right font-medium tabular-nums"
          : null
      )}
    >
      {property.enumValues && typeof value === "string" && text ? (
        <span
          className={cn(
            "inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium",
            tone
          )}
        >
          {text}
        </span>
      ) : text ? (
        text
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </Link>
  )
}

function propertyLabel(name: string) {
  return name
    .replace(/Id$/, " ID")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase())
}

function enumTone(value: string) {
  if (
    [
      "delivered",
      "active",
      "confirmed",
      "paid",
      "complete",
      "accepted",
      "ready",
      "picked_up",
    ].includes(value)
  ) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  }

  if (["failed", "denied", "refused", "lapsed", "declined"].includes(value)) {
    return "bg-red-500/10 text-red-700 dark:text-red-400"
  }

  if (
    ["queued", "pending", "proposed", "frozen", "attempted", "draft"].includes(
      value
    )
  ) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
  }

  return undefined
}

export function SchemaSheetTabs({
  schemas,
  activeId,
  onSelect,
}: {
  schemas: Schema[]
  activeId?: string
  onSelect: (schemaId: string) => void
}) {
  return (
    <div className="flex min-w-0 gap-1 overflow-x-auto">
      {schemas.map((schema) => {
        const tone = getBadgeColor(schema.color)
        const active = schema.id === activeId

        return (
          <button
            key={schema.id}
            type="button"
            onClick={() => onSelect(schema.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
              active
                ? "border-foreground/15 bg-background font-medium shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className={cn("size-2 rounded-full", tone.bg)} />
            {schema.name}
          </button>
        )
      })}
    </div>
  )
}
