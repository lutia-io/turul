import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import {
  GalleryVerticalEndIcon,
  MoreHorizontalIcon,
  NetworkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import {
  DataTableToolbar,
  dataTablePageSummary,
} from "@/components/data-table"
import { LoadingFrame, RefreshButton } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { networkWorkspacePath } from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { userDisplayName } from "@/lib/user"
import { getHumaErrorMessage, type ApiUserRef } from "@/store/api"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"
import {
  useDeleteNetworkMutation,
  useListNetworksQuery,
  type ApiNetwork,
  type ListNetworksParams,
  type NetworkListSort,
} from "@/store/network-slice"

type NetworkDetails = ApiNetwork

const PAGE_SIZES = [12, 24, 48]
const sortFields: NetworkListSort[] = ["name", "slug", "createdAt", "updatedAt"]

const sortOptions: { value: string; label: string }[] = [
  { value: "name:asc", label: "Name (A–Z)" },
  { value: "name:desc", label: "Name (Z–A)" },
  { value: "slug:asc", label: "Slug (A–Z)" },
  { value: "slug:desc", label: "Slug (Z–A)" },
  { value: "createdAt:asc", label: "Created (oldest)" },
  { value: "createdAt:desc", label: "Created (newest)" },
  { value: "updatedAt:asc", label: "Updated (oldest)" },
  { value: "updatedAt:desc", label: "Updated (newest)" },
]

function isNetworkSort(value: string): value is NetworkListSort {
  return sortFields.includes(value as NetworkListSort)
}

function activityLabel(
  createdAt?: string,
  updatedAt?: string,
  createdBy?: ApiUserRef,
  updatedBy?: ApiUserRef
) {
  if (updatedAt && updatedAt !== createdAt) {
    const who = userDisplayName(updatedBy)
    return `Updated ${formatRelativeTime(updatedAt)}${who ? ` by ${who}` : ""}`
  }
  if (createdAt) {
    const who = userDisplayName(createdBy)
    return `Created ${formatRelativeTime(createdAt)}${who ? ` by ${who}` : ""}`
  }
  return undefined
}

function DeleteNetworkDialog({
  network,
  open,
  onOpenChange,
}: {
  network: NetworkDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [deleteNetwork, deleteState] = useDeleteNetworkMutation()

  async function handleDelete() {
    try {
      await deleteNetwork(network.id).unwrap()
      onOpenChange(false)
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          deleteState.reset()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete {network.name}?</DialogTitle>
          <DialogDescription>
            This will permanently delete the network and its organizations.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {deleteState.error ? (
          <p className="text-sm text-destructive">
            {getHumaErrorMessage(deleteState.error, "Failed to delete network")}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={deleteState.isLoading} />
            }
          >
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteState.isLoading}
          >
            {deleteState.isLoading ? "Deleting..." : "Delete network"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NetworkCard({ network }: { network: NetworkDetails }) {
  const { openEditNetwork } = useCreateEntity()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const networkPath = networkWorkspacePath({ networkId: network.id })
  const activity = activityLabel(
    network.createdAt,
    network.updatedAt,
    network.createdBy,
    network.updatedBy
  )

  return (
    <div className="flex h-full min-w-0 items-start gap-1 rounded-xl bg-card p-2.5 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40">
      <Link
        to={networkPath}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GalleryVerticalEndIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="truncate font-medium leading-snug">{network.name}</p>
          {activity ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {activity}
            </p>
          ) : null}
        </div>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="shrink-0" />}
        >
          <MoreHorizontalIcon />
          <span className="sr-only">Network actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={() => openEditNetwork(network.id)}>
            <PencilIcon />
            Edit network
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            Delete network
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteNetworkDialog
        network={network}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}

function NetworkCardSkeleton() {
  return (
    <div className="flex h-full min-w-0 items-start gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full max-w-40" />
      </div>
      <Skeleton className="size-7 shrink-0 rounded-md" />
    </div>
  )
}

function NetworkListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2 @5xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <NetworkCardSkeleton key={index} />
      ))}
    </div>
  )
}

function NetworkListPagination({
  pageIndex,
  pageSize,
  total,
  onPageIndexChange,
  onPageSizeChange,
}: {
  pageIndex: number
  pageSize: number
  total: number
  onPageIndexChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const pageCount = Math.max(Math.ceil(total / pageSize), 1)

  return (
    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Cards per page</span>
        <NativeSelect
          aria-label="Cards per page"
          value={String(pageSize)}
          className="w-[4.5rem]"
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <NativeSelectOption key={size} value={String(size)}>
              {size}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          Page {pageIndex + 1} of {pageCount}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(pageIndex - 1)}
          disabled={pageIndex <= 0}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(pageIndex + 1)}
          disabled={pageIndex + 1 >= pageCount}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export default function NetworkList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { openCreateNetwork } = useCreateEntity()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [sort, setSort] = useState<NetworkListSort>("createdAt")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(12)

  useEffect(() => {
    setPageIndex(0)
  }, [debouncedQuery, sort, order])

  const listParams = useMemo<ListNetworksParams>(
    () => ({
      page: pageIndex + 1,
      pageSize,
      q: debouncedQuery.trim() || undefined,
      sort,
      order,
    }),
    [debouncedQuery, order, pageIndex, pageSize, sort]
  )

  const { data, isLoading, isFetching, isError, error, refetch } =
    useListNetworksQuery(listParams, { skip: !isAuthenticated })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const networks = list?.items ?? []
  const total = list?.total ?? 0
  const filtersActive = query.trim().length > 0
  const showInitialSkeleton = !list && (isLoading || isFetching) && !isError
  const showEmpty =
    data != null && data.total === 0 && !filtersActive && !isError
  const showHeaderCreate = !showEmpty

  return (
    <div className="@container flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            All Networks
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Open a network workspace to collaborate.
          </p>
        </div>
        {showHeaderCreate ? (
          <div className="flex items-center gap-2">
            {networks.length > 0 || filtersActive ? (
              <RefreshButton
                onRefresh={refetch}
                isRefreshing={isFetching}
                size="icon"
              />
            ) : null}
            <Button onClick={openCreateNetwork}>
              <PlusIcon />
              Create a network
            </Button>
          </div>
        ) : null}
      </div>

      {showEmpty ? null : (
        <DataTableToolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search name or slug..."
          searchClassName="sm:max-w-3xl"
          filters={
            <NativeSelect
              aria-label="Sort networks"
              value={`${sort}:${order}`}
              className="w-48"
              onChange={(event) => {
                const [nextSort, nextOrder] = event.target.value.split(":")
                if (nextSort && isNetworkSort(nextSort)) {
                  setSort(nextSort)
                }
                if (nextOrder === "asc" || nextOrder === "desc") {
                  setOrder(nextOrder)
                }
              }}
            >
              {sortOptions.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          }
          count={dataTablePageSummary({
            isLoading: isLoading || isFetching,
            loadingLabel: "Loading networks...",
            pageIndex,
            pageSize,
            total,
            singular: "network",
          })}
        />
      )}

      {showInitialSkeleton ? (
        <NetworkListSkeleton />
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load networks")}
        </p>
      ) : showEmpty ? (
        <Card className="items-center px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-violet-500 text-white">
            <NetworkIcon className="size-5" />
          </div>
          <div className="flex max-w-md flex-col items-center gap-1.5">
            <CardTitle className="text-lg">No networks yet</CardTitle>
            <CardDescription className="text-pretty">
              A network is the workspace for partner organizations to
              collaborate.
            </CardDescription>
          </div>
          <Button onClick={openCreateNetwork}>
            <PlusIcon />
            Create a network
          </Button>
        </Card>
      ) : (
        <>
          <LoadingFrame isLoading={isFetching} label="Loading networks">
            {networks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No networks match this view.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2 @5xl:grid-cols-3">
                {networks.map((network) => (
                  <NetworkCard key={network.id} network={network} />
                ))}
              </div>
            )}
          </LoadingFrame>
          <NetworkListPagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            total={total}
            onPageIndexChange={setPageIndex}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize)
              setPageIndex(0)
            }}
          />
        </>
      )}
    </div>
  )
}
