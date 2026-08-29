import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  GalleryVerticalEndIcon,
  MoreHorizontalIcon,
  NetworkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { RefreshButton } from "@/components/refresh-button"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
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
  useWorkspaceNetworks,
} from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { getHumaErrorMessage } from "@/store/api"
import { useDeleteNetworkMutation } from "@/store/network-slice"
import { useDeleteOrganizationMutation } from "@/store/organization-slice"
import type { Network, Organization } from "@/data/networks"

type NetworkDetails = Network & {
  slug?: string
  createdAt?: string
  updatedAt?: string
}

type OrganizationDetails = Organization & {
  slug?: string
  createdAt?: string
  updatedAt?: string
}

function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

function activityLabel(createdAt?: string, updatedAt?: string) {
  if (updatedAt && updatedAt !== createdAt) {
    return `Updated ${formatRelativeTime(updatedAt)}`
  }
  if (createdAt) {
    return `Created ${formatRelativeTime(createdAt)}`
  }
  return undefined
}

function MetaList({ items }: { items: ReactNode[] }) {
  const visible = items.filter(
    (item) => item != null && item !== false && item !== ""
  )

  if (visible.length === 0) {
    return null
  }

  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      {visible.map((item, index) => (
        <span key={index} className="inline-flex min-w-0 items-center gap-x-1.5">
          {index > 0 ? (
            <span aria-hidden="true">
              ·
            </span>
          ) : null}
          <span className="min-w-0 wrap-break-word">{item}</span>
        </span>
      ))}
    </p>
  )
}

function OrganizationCard({
  networkId,
  organization,
}: {
  networkId: string
  organization: OrganizationDetails
}) {
  const { openEditOrganization } = useCreateEntity()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const workspacePath = networkWorkspacePath({
    networkId,
    organizationId: organization.id,
  })

  return (
    <div className="group flex min-w-0 items-center gap-2 rounded-xl border bg-background p-3 shadow-xs transition-colors hover:bg-muted/50">
      <Link to={workspacePath} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tracking-tight">
          <Building2Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 truncate font-medium">{organization.name}</p>
          </div>
          <MetaList items={[activityLabel(organization.createdAt, organization.updatedAt)]} />
        </div>
        <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreHorizontalIcon />
          <span className="sr-only">Organization actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            onClick={() => openEditOrganization(organization.id)}
          >
            <PencilIcon />
            Edit organization
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon />
            Delete organization
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to={workspacePath} />}>
            <Building2Icon />
            View workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteOrganizationDialog
        organization={organization}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}

function AddOrganizationCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-dashed bg-transparent p-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-muted/80">
        <PlusIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Add organization</p>
        <p className="truncate text-xs text-muted-foreground">
          Start building in this network
        </p>
      </div>
    </button>
  )
}

function DeleteOrganizationDialog({
  organization,
  open,
  onOpenChange,
}: {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [deleteOrganization, deleteState] = useDeleteOrganizationMutation()

  async function handleDelete() {
    try {
      await deleteOrganization(organization.id).unwrap()
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
          <DialogTitle>Delete {organization.name}?</DialogTitle>
          <DialogDescription>
            This will permanently delete the organization. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {deleteState.error ? (
          <p className="text-sm text-destructive">
            {getHumaErrorMessage(
              deleteState.error,
              "Failed to delete organization"
            )}
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
            {deleteState.isLoading ? "Deleting..." : "Delete organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
  const organizationCount = network.organizations.length

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
            This will permanently delete the network
            {organizationCount > 0
              ? ` and ${organizationCount} ${organizationCount === 1 ? "organization" : "organizations"}`
              : ""}
            . This cannot be undone.
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
  const { openCreateOrganization, openEditNetwork } = useCreateEntity()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const networkPath = networkWorkspacePath({ networkId: network.id })
  const organizationCount = network.organizations.length

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{network.name}</CardTitle>
              </div>
              <MetaList
                items={[
                  network.slug ? <span className="font-mono">{network.slug}</span> : null,
                  activityLabel(network.createdAt, network.updatedAt),
                ]}
              />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" />}>
              <MoreHorizontalIcon />
              <span className="sr-only">Network actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem onClick={() => openEditNetwork(network.id)}>
                <PencilIcon />
                Edit network
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2Icon />
                Delete network
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {organizationCount > 0 ? countLabel(organizationCount, "organization") : "Organizations"}
          </p>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {network.organizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                networkId={network.id}
                organization={organization}
              />
            ))}
            <AddOrganizationCard onClick={() => openCreateOrganization(network.id)} />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link to={networkPath} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          View network
          <ArrowRightIcon />
        </Link>
      </CardFooter>
      <DeleteNetworkDialog network={network} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </Card>
  )
}

function OrganizationCardSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3 shadow-xs">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

function NetworkCardSkeleton() {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <Skeleton className="size-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="size-8 shrink-0 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <OrganizationCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-8 w-28" />
      </CardFooter>
    </Card>
  )
}

function NetworkListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <NetworkCardSkeleton key={index} />
      ))}
    </div>
  )
}

export default function NetworkList() {
  const { openCreateNetwork } = useCreateEntity()
  const { networks, isLoading, isFetching, isError, error, refetch } = useWorkspaceNetworks()

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            All Networks
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Inspect each network and its organizations, then open a workspace to
            collaborate.
          </p>
        </div>
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
        <div className="flex flex-col gap-4">
          {networks.map((network) => (
            <NetworkCard key={network.id} network={network} />
          ))}
        </div>
      )}
    </div>
  )
}
