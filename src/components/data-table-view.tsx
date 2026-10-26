import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
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
  ChevronDownIcon,
  Columns3Icon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinOffIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { LoadingFrame } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  sameSpreadsheetCell,
  type SpreadsheetCellRef,
} from "@/lib/spreadsheet-table"
import { cn } from "@/lib/utils"

export type DataTableSpreadsheetProps = {
  activeCell: SpreadsheetCellRef | null
  selectionAnchor: SpreadsheetCellRef | null
  selectionFocus: SpreadsheetCellRef | null
  editing: SpreadsheetCellRef | null
  selectableColumnIds: string[]
  rowIndexOffset?: number
  isCellSelected: (cell: SpreadsheetCellRef) => boolean
  onCellPointerDown: (
    cell: SpreadsheetCellRef,
    event: ReactPointerEvent
  ) => void
  onSelectionDrag: (cell: SpreadsheetCellRef) => void
  onSelectionGestureEnd?: (detail: {
    cell: SpreadsheetCellRef
    moved: boolean
  }) => void
  onCellDoubleClick: (cell: SpreadsheetCellRef) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void
  renderEditor?: (cell: SpreadsheetCellRef) => ReactNode
  gridRef?: RefObject<HTMLDivElement | null>
}

function cellRefFromPoint(x: number, y: number): SpreadsheetCellRef | null {
  const target = document.elementFromPoint(x, y)
  if (!(target instanceof Element)) {
    return null
  }
  const node = target.closest<HTMLElement>("[data-spreadsheet-cell]")
  const key = node?.dataset.spreadsheetCell
  if (!key) {
    return null
  }
  const separator = key.indexOf(":")
  if (separator <= 0) {
    return null
  }
  return {
    rowId: key.slice(0, separator),
    columnId: key.slice(separator + 1),
  }
}

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
  onEdit,
  onDelete,
  onHide,
  workflows,
}: {
  title: string
  sorted?: false | "asc" | "desc"
  onSort?: (descending: boolean) => void
  filter?: ColumnFilterConfig
  pin?: {
    position: ColumnPinPosition
    onPin: (position: ColumnPinPosition) => void
  }
  onEdit?: () => void
  onDelete?: () => void
  onHide?: () => void
  workflows?: ReactNode
}) {
  const filterActive = isFilterActive(filter)
  const hasMenu = Boolean(
    onSort || filter || pin || onEdit || onDelete || onHide || workflows
  )
  const SortMark =
    sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : null

  if (!hasMenu) {
    return <span className="truncate px-0.5 font-medium">{title}</span>
  }

  const sections = [
    onEdit ? (
      <DropdownMenuItem key="edit" onClick={onEdit}>
        <PencilIcon />
        Edit column
      </DropdownMenuItem>
    ) : null,
    workflows ?? null,
    onSort ? (
      <DropdownMenuGroup key="sort">
        <DropdownMenuItem
          className={cn(sorted === "asc" && "font-medium")}
          onClick={() => onSort(false)}
        >
          <ArrowDownIcon />
          Sort A → Z
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(sorted === "desc" && "font-medium")}
          onClick={() => onSort(true)}
        >
          <ArrowUpIcon />
          Sort Z → A
        </DropdownMenuItem>
      </DropdownMenuGroup>
    ) : null,
    filter ? (
      <DropdownMenuSub key="filter">
        <DropdownMenuSubTrigger>
          <FilterIcon />
          Filter by this column
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-64 p-2">
          <ColumnFilterForm title={title} filter={filter} />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    ) : null,
    pin ? (
      <DropdownMenuGroup key="pin">
        <DropdownMenuItem
          className={cn(pin.position === "start" && "font-medium")}
          onClick={() => pin.onPin(pin.position === "start" ? false : "start")}
        >
          <ArrowLeftToLineIcon />
          Pin left
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(pin.position === "end" && "font-medium")}
          onClick={() => pin.onPin(pin.position === "end" ? false : "end")}
        >
          <ArrowRightToLineIcon />
          Pin right
        </DropdownMenuItem>
        {pin.position ? (
          <DropdownMenuItem onClick={() => pin.onPin(false)}>
            <PinOffIcon />
            Unpin
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuGroup>
    ) : null,
    onHide ? (
      <DropdownMenuItem key="hide" onClick={onHide}>
        <EyeOffIcon />
        Hide column
      </DropdownMenuItem>
    ) : null,
    onDelete ? (
      <DropdownMenuItem key="delete" variant="destructive" onClick={onDelete}>
        <Trash2Icon />
        Delete column
      </DropdownMenuItem>
    ) : null,
  ].filter((section) => section !== null)

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1 truncate px-0.5 font-medium">{title}</span>
      {SortMark ? <SortMark className="size-3.5 shrink-0" /> : null}
      {filterActive ? (
        <FilterIcon className="size-3 shrink-0 text-foreground" />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Open ${title} column menu`}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-max min-w-56">
          {sections.flatMap((section, index) =>
            index === 0
              ? [section]
              : [
                  <DropdownMenuSeparator key={`divider-${index}`} />,
                  section,
                ]
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
  const meta = column.columnDef.meta as { label?: string } | undefined
  if (meta?.label) {
    return meta.label
  }
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
  const center = table.getCenterVisibleLeafColumns()
  const end = table.getEndVisibleLeafColumns()
  if (
    start[start.length - 1]?.id === columnId &&
    (center.length > 0 || end.length > 0)
  ) {
    return "shadow-[inset_-8px_0_8px_-8px_rgba(0,0,0,0.18)]"
  }
  if (
    end[0]?.id === columnId &&
    (center.length > 0 || start.length > 0)
  ) {
    return "shadow-[inset_8px_0_8px_-8px_rgba(0,0,0,0.18)]"
  }
  return undefined
}

export function DataTableView<TData extends Record<string, unknown>>({
  table,
  empty,
  isLoading,
  isRefreshing,
  spreadsheet,
  embedded,
}: {
  table: ManagedTable<TData>
  empty: string
  isLoading?: boolean
  isRefreshing?: boolean
  spreadsheet?: DataTableSpreadsheetProps
  embedded?: boolean
}) {
  const rows = table.getRowModel().rows
  const visibleColumns = table.getVisibleLeafColumns()
  const showSkeleton = isLoading && rows.length === 0
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragPointerIdRef = useRef<number | null>(null)
  const lastDragCellRef = useRef<string | null>(null)
  const dragStartRef = useRef<{
    cell: SpreadsheetCellRef
    x: number
    y: number
  } | null>(null)
  const dragMovedRef = useRef(false)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const showRowIndex = Boolean(spreadsheet)
  const selectable = new Set(spreadsheet?.selectableColumnIds ?? [])
  const dataColSpan =
    visibleColumns.length + (showRowIndex ? 1 : 0)

  useEffect(() => {
    if (!spreadsheet?.activeCell || spreadsheet.editing || isDraggingSelection) {
      return
    }
    const root = scrollRef.current
    if (!root) {
      return
    }
    const node = root.querySelector<HTMLElement>(
      `[data-spreadsheet-cell="${spreadsheet.activeCell.rowId}:${spreadsheet.activeCell.columnId}"]`
    )
    node?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [
    isDraggingSelection,
    spreadsheet?.activeCell,
    spreadsheet?.editing,
  ])

  function endSelectionDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId) {
      return
    }
    const start = dragStartRef.current
    const moved = dragMovedRef.current
    dragPointerIdRef.current = null
    lastDragCellRef.current = null
    dragStartRef.current = null
    dragMovedRef.current = false
    setIsDraggingSelection(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (start && spreadsheet?.onSelectionGestureEnd) {
      spreadsheet.onSelectionGestureEnd({ cell: start.cell, moved })
    }
    scrollRef.current?.focus({ preventScroll: true })
  }

  function moveSelectionDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId || !spreadsheet) {
      return
    }
    const start = dragStartRef.current
    if (start && !dragMovedRef.current) {
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (dx * dx + dy * dy > 9) {
        dragMovedRef.current = true
      }
    }
    const cell = cellRefFromPoint(event.clientX, event.clientY)
    if (!cell) {
      return
    }
    const key = `${cell.rowId}:${cell.columnId}`
    if (lastDragCellRef.current === key) {
      return
    }
    lastDragCellRef.current = key
    dragMovedRef.current = true
    spreadsheet.onSelectionDrag(cell)
  }

  return (
    <LoadingFrame
      isLoading={isRefreshing && !showSkeleton}
      className={cn(
        "min-h-0 min-w-0 flex-1 overflow-hidden bg-background",
        embedded
          ? "rounded-none border-0 shadow-none"
          : "rounded-xl border shadow-xs"
      )}
    >
      <div
        ref={(node) => {
          scrollRef.current = node
          if (spreadsheet?.gridRef) {
            spreadsheet.gridRef.current = node
          }
        }}
        className={cn(
          "h-full min-h-0 overflow-auto outline-none",
          isDraggingSelection && "select-none"
        )}
        tabIndex={spreadsheet ? 0 : undefined}
        role={spreadsheet ? "grid" : undefined}
        aria-label={spreadsheet ? "Records spreadsheet" : undefined}
        onKeyDown={spreadsheet?.onKeyDown}
        onPointerMove={spreadsheet ? moveSelectionDrag : undefined}
        onPointerUp={spreadsheet ? endSelectionDrag : undefined}
        onPointerCancel={spreadsheet ? endSelectionDrag : undefined}
      >
        <Table
          className="w-full"
          style={{
            tableLayout: "fixed",
            minWidth:
              table.getTotalSize() + (showRowIndex ? 44 : 0),
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {showRowIndex ? (
                  <TableHead
                    className="sticky left-0 z-30 w-11 min-w-11 border-r border-border bg-muted/95 px-1 text-center"
                    style={{ width: 44, minWidth: 44, maxWidth: 44 }}
                  >
                    <span className="sr-only">Row</span>
                  </TableHead>
                ) : null}
                {headerGroup.headers.map((header) => {
                  const pinned = header.column.getIsPinned()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "relative overflow-hidden border-r border-border last:border-r-0",
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
              rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  className={spreadsheet ? "hover:bg-transparent" : undefined}
                >
                  {showRowIndex ? (
                    <TableCell
                      className="sticky left-0 z-20 w-11 min-w-11 border-r border-border bg-muted/40 px-1 text-center text-[11px] tabular-nums text-muted-foreground"
                      style={{ width: 44, minWidth: 44, maxWidth: 44 }}
                    >
                      {(spreadsheet?.rowIndexOffset ?? 0) + rowIndex + 1}
                    </TableCell>
                  ) : null}
                  {row.getVisibleCells().map((cell) => {
                    const pinned = cell.column.getIsPinned()
                    const ref: SpreadsheetCellRef = {
                      rowId: row.id,
                      columnId: cell.column.id,
                    }
                    const canSelect = selectable.has(cell.column.id)
                    const active =
                      spreadsheet &&
                      sameSpreadsheetCell(spreadsheet.activeCell, ref)
                    const selected =
                      spreadsheet && spreadsheet.isCellSelected(ref)
                    const editing =
                      spreadsheet &&
                      sameSpreadsheetCell(spreadsheet.editing, ref)

                    return (
                      <TableCell
                        key={cell.id}
                        data-spreadsheet-cell={
                          canSelect
                            ? `${ref.rowId}:${ref.columnId}`
                            : undefined
                        }
                        className={cn(
                          "overflow-hidden border-r border-border last:border-r-0",
                          pinned && "z-10 bg-background",
                          pinnedEdgeClass(table, cell.column.id),
                          canSelect && "cursor-cell select-none",
                          selected && !editing && "bg-primary/10",
                          active &&
                            !editing &&
                            "relative z-10 ring-2 ring-primary ring-inset",
                          editing && "p-0.5"
                        )}
                        style={pinnedStyle(cell.column)}
                        onPointerDown={
                          spreadsheet && canSelect
                            ? (event) => {
                                if (event.button !== 0) {
                                  return
                                }
                                if (
                                  sameSpreadsheetCell(spreadsheet.editing, ref)
                                ) {
                                  return
                                }
                                if (
                                  event.target instanceof Element &&
                                  event.target.closest(
                                    "a,button,input,select,textarea,[role='menu'],[data-slot='dropdown-menu-trigger']"
                                  )
                                ) {
                                  return
                                }
                                spreadsheet.onCellPointerDown(ref, event)
                                dragPointerIdRef.current = event.pointerId
                                lastDragCellRef.current = `${ref.rowId}:${ref.columnId}`
                                dragMovedRef.current = false
                                dragStartRef.current = {
                                  cell: ref,
                                  x: event.clientX,
                                  y: event.clientY,
                                }
                                setIsDraggingSelection(true)
                                scrollRef.current?.setPointerCapture(
                                  event.pointerId
                                )
                              }
                            : undefined
                        }
                        onDoubleClick={
                          spreadsheet && canSelect
                            ? () => spreadsheet.onCellDoubleClick(ref)
                            : undefined
                        }
                      >
                        {editing && spreadsheet?.renderEditor
                          ? spreadsheet.renderEditor(ref)
                          : (
                              <table.FlexRender cell={cell} />
                            )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : showSkeleton ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-transparent">
                  {showRowIndex ? (
                    <TableCell className="w-11 border-r">
                      <Skeleton className="mx-auto h-3 w-4" />
                    </TableCell>
                  ) : null}
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={Math.max(dataColSpan, 1)}
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
  summary,
}: {
  table: ManagedTable<TData>
  pageSizeOptions?: number[]
  summary?: ReactNode
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
      <div className="flex items-center gap-3">
        {summary ? (
          <div className="text-sm text-muted-foreground tabular-nums">
            {summary}
          </div>
        ) : null}
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
