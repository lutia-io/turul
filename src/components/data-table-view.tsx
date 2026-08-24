import { useState, type CSSProperties, type ReactNode } from "react"
import {
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type Column,
  type ColumnPinningState,
  type PaginationState,
  type ReactTable,
  type SortingState,
} from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  Columns3Icon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PinOffIcon,
  XIcon,
} from "lucide-react"

import { LoadingFrame } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export const managedTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnResizingFeature,
})

export function createManagedColumnHelper<
  TData extends Record<string, unknown>,
>() {
  return createColumnHelper<typeof managedTableFeatures, TData>()
}

export type ManagedTable<TData extends Record<string, unknown>> = ReactTable<
  typeof managedTableFeatures,
  TData
>

export type ColumnPinPosition = false | "start" | "end"

export type StringFilterOp = "contains" | "eq" | "startsWith" | "empty"
export type NumberFilterOp = "eq" | "gte" | "lte" | "empty"

export const emptyFilterValue = "__empty__"

export const stringFilterOps: { value: StringFilterOp; label: string }[] = [
  { value: "contains", label: "Contains" },
  { value: "eq", label: "Equals" },
  { value: "startsWith", label: "Starts with" },
  { value: "empty", label: "Is empty" },
]

export const numberFilterOps: { value: NumberFilterOp; label: string }[] = [
  { value: "eq", label: "Equals" },
  { value: "gte", label: "At least" },
  { value: "lte", label: "At most" },
  { value: "empty", label: "Is empty" },
]

export function stringFilterChipValue(op: StringFilterOp, value: string) {
  if (op === "empty") {
    return "Is empty"
  }
  const label = stringFilterOps.find((item) => item.value === op)?.label ?? op
  return `${label} “${value}”`
}

export function numberFilterChipValue(
  op: NumberFilterOp,
  value: number,
  format: (value: number) => string = String
) {
  if (op === "empty") {
    return "Is empty"
  }
  const label = numberFilterOps.find((item) => item.value === op)?.label ?? "="
  return `${label} ${format(value)}`
}

export type ColumnFilterConfig =
  | {
      type: "text"
      value?: { op: StringFilterOp; value: string }
      onChange: (value?: { op: StringFilterOp; value: string }) => void
    }
  | {
      type: "enum"
      value?: string
      options: { value: string; label: string }[]
      onChange: (value?: string) => void
    }
  | {
      type: "number"
      value?: { op: NumberFilterOp; value: number }
      onChange: (value?: { op: NumberFilterOp; value: number }) => void
    }

export type DataTableActiveFilter = {
  id: string
  label: string
  value: string
  onRemove: () => void
}

export type { ColumnPinningState, PaginationState, SortingState }

export function DataTableColumnHeader({
  title,
  sorted,
  onSort,
  filter,
  pin,
}: {
  title: string
  sorted?: false | "asc" | "desc"
  onSort?: (event: unknown) => void
  filter?: ColumnFilterConfig
  pin?: {
    position: ColumnPinPosition
    onPin: (position: ColumnPinPosition) => void
  }
}) {
  const SortIcon =
    sorted === "asc"
      ? ArrowUpIcon
      : sorted === "desc"
        ? ArrowDownIcon
        : ChevronsUpDownIcon
  const filterActive = isFilterActive(filter)

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex min-w-0 items-center gap-1 rounded-md px-0.5 font-medium hover:text-foreground"
        >
          <span className="truncate">{title}</span>
          <SortIcon
            className={cn(
              "size-3.5 shrink-0",
              sorted ? "opacity-100" : "opacity-40"
            )}
          />
        </button>
      ) : (
        <span className="truncate px-0.5 font-medium">{title}</span>
      )}
      {filter ? (
        <ColumnFilterButton
          title={title}
          filter={filter}
          active={filterActive}
        />
      ) : null}
      {pin ? (
        <ColumnPinButton
          title={title}
          position={pin.position}
          onPin={pin.onPin}
        />
      ) : null}
    </div>
  )
}

function isFilterActive(filter?: ColumnFilterConfig) {
  if (!filter) {
    return false
  }
  if (filter.type === "enum") {
    return Boolean(filter.value)
  }
  return Boolean(filter.value)
}

function ColumnFilterButton({
  title,
  filter,
  active,
}: {
  title: string
  filter: ColumnFilterConfig
  active: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(active && "text-foreground")}
          />
        }
      >
        <FilterIcon
          className={cn(
            "size-3",
            active ? "text-foreground" : "text-muted-foreground"
          )}
        />
        <span className="sr-only">Filter {title}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <ColumnFilterForm title={title} filter={filter} />
      </PopoverContent>
    </Popover>
  )
}

function ColumnPinButton({
  title,
  position,
  onPin,
}: {
  title: string
  position: ColumnPinPosition
  onPin: (position: ColumnPinPosition) => void
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(position && "text-foreground")}
          />
        }
      >
        {position === "start" ? (
          <ArrowLeftToLineIcon className="size-3" />
        ) : position === "end" ? (
          <ArrowRightToLineIcon className="size-3" />
        ) : (
          <PinOffIcon className="size-3 text-muted-foreground" />
        )}
        <span className="sr-only">Pin {title}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          Pin {title}
        </p>
        <ColumnPinMenu position={position} onPin={onPin} />
      </PopoverContent>
    </Popover>
  )
}

function ColumnPinMenu({
  position,
  onPin,
}: {
  position: ColumnPinPosition
  onPin: (position: ColumnPinPosition) => void
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onPin(position === "start" ? false : "start")}
        className={cn(
          "flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted",
          position === "start" && "bg-muted font-medium"
        )}
      >
        <ArrowLeftToLineIcon className="size-3.5" />
        Pin left
      </button>
      <button
        type="button"
        onClick={() => onPin(position === "end" ? false : "end")}
        className={cn(
          "flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted",
          position === "end" && "bg-muted font-medium"
        )}
      >
        <ArrowRightToLineIcon className="size-3.5" />
        Pin right
      </button>
      {position ? (
        <button
          type="button"
          onClick={() => onPin(false)}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted"
        >
          <PinOffIcon className="size-3.5" />
          Unpin
        </button>
      ) : null}
    </div>
  )
}

function ColumnFilterForm({
  title,
  filter,
}: {
  title: string
  filter: ColumnFilterConfig
}) {
  if (filter.type === "enum") {
    return (
      <div className="flex flex-col gap-1">
        <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          Filter {title}
        </p>
        {filter.options.map((option) => {
          const selected = filter.value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                filter.onChange(selected ? undefined : option.value)
              }
              className={cn(
                "flex w-full items-center rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted",
                selected && "bg-muted font-medium"
              )}
            >
              {option.label}
            </button>
          )
        })}
        {filter.value ? (
          <button
            type="button"
            onClick={() => filter.onChange(undefined)}
            className="mt-1 rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Clear filter
          </button>
        ) : null}
      </div>
    )
  }

  if (filter.type === "number") {
    return <NumberFilterForm title={title} filter={filter} />
  }

  return <TextFilterForm title={title} filter={filter} />
}

function TextFilterForm({
  title,
  filter,
}: {
  title: string
  filter: Extract<ColumnFilterConfig, { type: "text" }>
}) {
  const [op, setOp] = useState<StringFilterOp>(filter.value?.op ?? "contains")
  const [value, setValue] = useState(filter.value?.value ?? "")

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (op === "empty") {
          filter.onChange({ op, value: "" })
          return
        }
        const next = value.trim()
        filter.onChange(next ? { op, value: next } : undefined)
      }}
    >
      <p className="text-xs font-medium text-muted-foreground">
        Filter {title}
      </p>
      <NativeSelect
        aria-label={`${title} filter operator`}
        value={op}
        onChange={(event) => setOp(event.target.value as StringFilterOp)}
      >
        {stringFilterOps.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {op === "empty" ? null : (
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`Filter ${title.toLowerCase()}...`}
          className="h-8"
        />
      )}
      <div className="flex justify-end gap-1.5">
        {filter.value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setValue("")
              filter.onChange(undefined)
            }}
          >
            Clear
          </Button>
        ) : null}
        <Button type="submit" size="sm">
          Apply
        </Button>
      </div>
    </form>
  )
}

function NumberFilterForm({
  title,
  filter,
}: {
  title: string
  filter: Extract<ColumnFilterConfig, { type: "number" }>
}) {
  const [op, setOp] = useState<NumberFilterOp>(filter.value?.op ?? "eq")
  const [value, setValue] = useState(
    filter.value ? String(filter.value.value) : ""
  )

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (op === "empty") {
          filter.onChange({ op, value: 0 })
          return
        }
        const parsed = Number(value)
        if (!Number.isFinite(parsed) || parsed < 0) {
          filter.onChange(undefined)
          return
        }
        filter.onChange({ op, value: parsed })
      }}
    >
      <p className="text-xs font-medium text-muted-foreground">
        Filter {title}
      </p>
      <NativeSelect
        aria-label={`${title} filter operator`}
        value={op}
        onChange={(event) => setOp(event.target.value as NumberFilterOp)}
      >
        {numberFilterOps.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {op === "empty" ? null : (
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="0"
          className="h-8"
        />
      )}
      <div className="flex justify-end gap-1.5">
        {filter.value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setValue("")
              filter.onChange(undefined)
            }}
          >
            Clear
          </Button>
        ) : null}
        <Button type="submit" size="sm">
          Apply
        </Button>
      </div>
    </form>
  )
}

export function DataTableActiveFilters({
  filters,
}: {
  filters: DataTableActiveFilter[]
}) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={filter.onRemove}
          className="inline-flex h-7 items-center gap-1 rounded-full border bg-background px-2 text-xs font-medium hover:bg-muted"
        >
          <span className="text-muted-foreground">{filter.label}</span>
          <span>{filter.value}</span>
          <XIcon className="size-3 text-muted-foreground" />
          <span className="sr-only">Remove {filter.label} filter</span>
        </button>
      ))}
    </div>
  )
}

export function DataTableViewOptions<TData extends Record<string, unknown>>({
  table,
}: {
  table: ManagedTable<TData>
}) {
  const columns = table.getAllLeafColumns()

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <Columns3Icon />
        Columns
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          Columns
        </p>
        <div className="flex flex-col gap-0.5">
          {columns.map((column) => {
            const visible = column.getIsVisible()
            const canHide = column.getCanHide()
            const pinned = column.getIsPinned()

            return (
              <div
                key={column.id}
                className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted/60"
              >
                <button
                  type="button"
                  disabled={!canHide}
                  onClick={() => column.toggleVisibility(!visible)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40"
                  aria-pressed={visible}
                  aria-label={`${visible ? "Hide" : "Show"} ${columnLabel(column)}`}
                >
                  {visible ? (
                    <EyeIcon className="size-3.5" />
                  ) : (
                    <EyeOffIcon className="size-3.5" />
                  )}
                </button>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {columnLabel(column)}
                </span>
                {column.getCanPin() ? (
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-pressed={pinned === "start"}
                      aria-label={`Pin ${columnLabel(column)} left`}
                      className={cn(
                        pinned === "start"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                      onClick={() =>
                        column.pin(pinned === "start" ? false : "start")
                      }
                    >
                      <ArrowLeftToLineIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-pressed={pinned === "end"}
                      aria-label={`Pin ${columnLabel(column)} right`}
                      className={cn(
                        pinned === "end"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                      onClick={() =>
                        column.pin(pinned === "end" ? false : "end")
                      }
                    >
                      <ArrowRightToLineIcon />
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function columnLabel<TData extends Record<string, unknown>>(
  column: Column<typeof managedTableFeatures, TData, unknown>
) {
  const header = column.columnDef.header
  if (typeof header === "string" && header.length > 0) {
    return header
  }
  return column.id.charAt(0).toUpperCase() + column.id.slice(1)
}

export function DataTableRowActions({ items }: { items: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
          />
        }
      >
        <MoreHorizontalIcon />
        <span className="sr-only">Open row actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {items}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function pinnedStyle<TData extends Record<string, unknown>>(
  column: Column<typeof managedTableFeatures, TData, unknown>
): CSSProperties {
  const pinned = column.getIsPinned()
  return {
    width: column.getSize(),
    position: pinned ? "sticky" : undefined,
    left: pinned === "start" ? column.getStart("start") : undefined,
    right: pinned === "end" ? column.getAfter("end") : undefined,
  }
}

function pinnedEdgeClass<TData extends Record<string, unknown>>(
  table: ManagedTable<TData>,
  columnId: string
) {
  const start = table.getStartVisibleLeafColumns()
  const end = table.getEndVisibleLeafColumns()
  if (start[start.length - 1]?.id === columnId) {
    return "shadow-[inset_-8px_0_8px_-8px_rgba(0,0,0,0.18)]"
  }
  if (end[0]?.id === columnId) {
    return "shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.18)]"
  }
  return undefined
}

export function DataTableView<TData extends Record<string, unknown>>({
  table,
  empty,
  isRefreshing,
}: {
  table: ManagedTable<TData>
  empty: string
  isRefreshing?: boolean
}) {
  const rows = table.getRowModel().rows
  const visibleColumns = table.getVisibleLeafColumns()

  return (
    <LoadingFrame
      isLoading={isRefreshing}
      className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border bg-background shadow-xs"
    >
      <div className="h-full min-h-0 overflow-auto">
        <Table
          className="w-full"
          style={{
            tableLayout: "fixed",
            minWidth: table.getTotalSize(),
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const pinned = header.column.getIsPinned()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "relative overflow-hidden",
                        pinned && "z-20 bg-muted/95",
                        pinnedEdgeClass(table, header.column.id)
                      )}
                      style={pinnedStyle(header.column)}
                    >
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                      {header.column.getCanResize() ? (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            "absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize touch-none bg-transparent select-none hover:bg-border",
                            header.column.getIsResizing() && "bg-primary"
                          )}
                        />
                      ) : null}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const pinned = cell.column.getIsPinned()
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "overflow-hidden",
                          pinned && "z-10 bg-background",
                          pinnedEdgeClass(table, cell.column.id)
                        )}
                        style={pinnedStyle(cell.column)}
                      >
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={Math.max(visibleColumns.length, 1)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </LoadingFrame>
  )
}

export function DataTablePagination<TData extends Record<string, unknown>>({
  table,
  pageSizeOptions = [10, 20, 50],
}: {
  table: ManagedTable<TData>
  pageSizeOptions?: number[]
}) {
  const pageCount = Math.max(table.getPageCount(), 1)
  const pageIndex = table.state.pagination.pageIndex
  const pageSize = table.state.pagination.pageSize

  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page</span>
        <NativeSelect
          aria-label="Rows per page"
          value={String(pageSize)}
          className="w-[4.5rem]"
          onChange={(event) => {
            table.setPageSize(Number(event.target.value))
            table.setPageIndex(0)
          }}
        >
          {pageSizeOptions.map((size) => (
            <NativeSelectOption key={size} value={String(size)}>
              {size}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground tabular-nums">
          Page {pageIndex + 1} of {pageCount}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
