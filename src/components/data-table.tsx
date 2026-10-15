import { type ReactNode } from "react"
import { Link } from "react-router"
import { SearchIcon, XIcon } from "lucide-react"

import { RefreshButton } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function dataTablePageSummary({
  isLoading,
  pageIndex,
  pageSize,
  total,
  singular,
  plural,
}: {
  isLoading?: boolean
  pageIndex: number
  pageSize: number
  total: number
  singular: string
  plural?: string
}): ReactNode {
  if (isLoading) {
    return <Skeleton className="h-4 w-28" />
  }

  const word = plural ?? `${singular}s`
  if (total === 0) {
    return `0 ${word}`
  }

  const start = pageIndex * pageSize + 1
  const end = Math.min(total, (pageIndex + 1) * pageSize)
  return `${start}–${end} of ${total} ${word}`
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
  searchClassName,
  filters,
  chips,
  trailing,
  count,
  onRefresh,
  isRefreshing,
}: {
  query: string
  onQueryChange: (query: string) => void
  searchPlaceholder: string
  searchClassName?: string
  filters?: ReactNode
  chips?: ReactNode
  trailing?: ReactNode
  count?: ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={cn("relative w-full", searchClassName ?? "sm:max-w-sm")}
          >
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "h-8 bg-background pl-8 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
                query && "pr-8"
              )}
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => onQueryChange("")}
              >
                <XIcon />
                <span className="sr-only">Clear search</span>
              </Button>
            ) : null}
          </div>
          {filters}
        </div>
        <div className="flex items-center gap-2">
          {trailing}
          {onRefresh ? (
            <RefreshButton
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              size="icon"
            />
          ) : null}
          {count ? (
            <div className="text-sm text-muted-foreground tabular-nums">
              {count}
            </div>
          ) : null}
        </div>
      </div>
      {chips}
    </div>
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
