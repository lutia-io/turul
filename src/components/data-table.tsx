import { type ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  SearchIcon,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type SortDirection = "asc" | "desc"

export type DataTableSort<K extends string> = {
  key: K
  direction: SortDirection
}

export type DataTableColumn<T, K extends string = string> = {
  key: K
  label: string
  sortable?: boolean
  className?: string
  render: (row: T) => ReactNode
}

export function toggleSort<K extends string>(
  current: DataTableSort<K>,
  key: K,
  defaultDescKeys: readonly K[] = []
): DataTableSort<K> {
  if (current.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    }
  }

  return {
    key,
    direction: defaultDescKeys.includes(key) ? "desc" : "asc",
  }
}

export function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

export function matchesQuery(
  query: string,
  values: Array<string | number | null | undefined>
) {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return true
  }

  return values.join(" ").toLowerCase().includes(needle)
}

export function dataTableCount({
  isLoading,
  loadingLabel,
  visible,
  total,
  singular,
  plural,
}: {
  isLoading?: boolean
  loadingLabel: string
  visible: number
  total: number
  singular: string
  plural?: string
}) {
  if (isLoading) {
    return loadingLabel
  }

  const word = plural ?? `${singular}s`
  if (visible === total) {
    return `${total} ${total === 1 ? singular : word}`
  }

  return `${visible} of ${total} ${word}`
}

export function DataTablePage({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-[calc(100svh-var(--app-header-height))] min-h-0 flex-col gap-4 overflow-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function DataTableToolbar({
  query,
  onQueryChange,
  searchPlaceholder,
  filters,
  count,
}: {
  query: string
  onQueryChange: (query: string) => void
  searchPlaceholder: string
  filters?: ReactNode
  count: string
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 bg-background pl-8"
          />
        </div>
        {filters}
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">{count}</p>
    </div>
  )
}

export function DataTableFilter({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      {options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

export function DataTableHead<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: K
  sort: DataTableSort<K>
  onSort: (key: K) => void
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

export function DataTableCellLink({
  to,
  children,
  className,
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link to={to} className={cn("block truncate", className)}>
      {children}
    </Link>
  )
}

export function DataTable<T, K extends string>({
  columns,
  rows,
  sort,
  onSort,
  getRowId,
  empty,
}: {
  columns: DataTableColumn<T, K>[]
  rows: T[]
  sort: DataTableSort<K>
  onSort: (key: K) => void
  getRowId: (row: T) => string
  empty: string
}) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border bg-background shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) =>
              column.sortable === false ? (
                <TableHead key={column.key}>{column.label}</TableHead>
              ) : (
                <DataTableHead
                  key={column.key}
                  label={column.label}
                  sortKey={column.key}
                  sort={sort}
                  onSort={onSort}
                />
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={Math.max(columns.length, 1)}
                className="h-24 text-center text-muted-foreground"
              >
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
