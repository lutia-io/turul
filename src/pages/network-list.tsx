import { useState } from "react"
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
import { RefreshButton } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
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
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
} from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { userDisplayName } from "@/lib/user"
import { getHumaErrorMessage } from "@/store/api"
import { useDeleteNetworkMutation } from "@/store/network-slice"
import type { Network } from "@/data/networks"
import type { ApiUserRef } from "@/store/api"

type NetworkDetails = Network

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
  network: Network
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

export default function NetworkList() {
  const { openCreateNetwork } = useCreateEntity()
  const { networks, isLoading, isFetching, isError, error, refetch } =
    useWorkspaceNetworkList()
  const showHeaderCreate =
    isLoading || isFetching || isError || networks.length > 0

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
            {networks.length > 0 ? (
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

      {isLoading || isFetching ? (
        <NetworkListSkeleton />
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load networks")}
        </p>
      ) : networks.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2 @5xl:grid-cols-3">
          {networks.map((network) => (
            <NetworkCard key={network.id} network={network} />
          ))}
        </div>
      )}
    </div>
  )
}
