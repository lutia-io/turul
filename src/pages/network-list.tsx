import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WorkflowIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { StatusBadge } from "@/components/json-definition-card"
import { LoadingFrame, RefreshButton } from "@/components/refresh-button"
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
import { getBadgeColor } from "@/lib/badge"
import {
  networkWorkspacePath,
  useWorkspaceNetworks,
} from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useDeleteNetworkMutation } from "@/store/network-slice"
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

function organizationInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "Or"
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2)
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`
}

function organizationSlug(organization: OrganizationDetails) {
  return organization.slug || undefined
}

function organizationKind(organization: OrganizationDetails) {
  const slug = organizationSlug(organization)
  if (organization.type && organization.type !== slug) {
    return organization.type
  }
  return undefined
}

function networkSlug(network: NetworkDetails) {
  return network.slug || network.summary || undefined
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
            <span aria-hidden="true" className="text-border">
              ·
            </span>
          ) : null}
          <span className="min-w-0 wrap-break-word">{item}</span>
        </span>
      ))}
    </p>
  )
}

function NetworkCounts({ network }: { network: Network }) {
  const items = [
    {
      to: networkWorkspacePath({ networkId: network.id, rest: "schemas" }),
      label: "Schemas",
      value: network.schemas.length,
      icon: FileJsonIcon,
    },
    {
      to: networkWorkspacePath({
        networkId: network.id,
        rest: "workflow-definitions",
      }),
      label: "Workflows",
      value: network.workflowDefinitions.length,
      icon: WorkflowIcon,
    },
    {
      to: networkWorkspacePath({
        networkId: network.id,
        rest: "pipeline-definitions",
      }),
      label: "Pipelines",
      value: network.pipelineDefinitions.length,
      icon: LayersIcon,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="rounded-xl border bg-background px-3 py-2.5 shadow-xs transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <item.icon className="size-3.5" />
            <p className="truncate text-xs">{item.label}</p>
          </div>
          <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
            {item.value}
          </p>
        </Link>
      ))}
    </div>
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
  const tone = getBadgeColor(organization.color)
  const workspacePath = networkWorkspacePath({
    networkId,
    organizationId: organization.id,
  })
  const slug = organizationSlug(organization)
  const kind = organizationKind(organization)

  return (
    <div className="group flex min-w-0 items-center gap-2 rounded-xl border bg-background p-3 shadow-xs transition-colors hover:bg-muted/50">
      <Link
        to={workspacePath}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tracking-tight",
            tone.bg,
            tone.text
          )}
        >
          {organizationInitials(organization.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 truncate font-medium">{organization.name}</p>
            <StatusBadge status={organization.status} />
          </div>
          <MetaList
            items={[
              slug ? <span className="font-mono">{slug}</span> : null,
              kind,
              organization.location,
              organization.members > 0
                ? countLabel(organization.members, "member")
                : null,
            ]}
          />
        </div>
        <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" />}
        >
          <MoreHorizontalIcon />
          <span className="sr-only">Organization actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem render={<Link to={workspacePath} />}>
            <Building2Icon />
            View workspace
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => openEditOrganization(organization.id)}
          >
            <PencilIcon />
            Edit organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
          Start collaborating in this network
        </p>
      </div>
    </button>
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
  const tone = getBadgeColor(network.color)
  const slug = networkSlug(network)
  const networkPath = networkWorkspacePath({ networkId: network.id })
  const organizationCount = network.organizations.length

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <GalleryVerticalEndIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{network.name}</CardTitle>
                <StatusBadge status={network.status} />
              </div>
              {network.description ? (
                <CardDescription className="max-w-2xl text-pretty">
                  {network.description}
                </CardDescription>
              ) : null}
              <MetaList
                items={[
                  slug ? <span className="font-mono">{slug}</span> : null,
                  network.industry,
                  network.headquarters,
                  network.coverage,
                  activityLabel(network.createdAt, network.updatedAt),
                ]}
              />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" />}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">Network actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem render={<Link to={networkPath} />}>
                <GalleryVerticalEndIcon />
                View network
              </DropdownMenuItem>
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
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <NetworkCounts network={network} />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {organizationCount > 0
              ? countLabel(organizationCount, "organization")
              : "Organizations"}
          </p>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {network.organizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                networkId={network.id}
                organization={organization}
              />
            ))}
            <AddOrganizationCard
              onClick={() => openCreateOrganization(network.id)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link
          to={networkPath}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          View network
          <ArrowRightIcon />
        </Link>
      </CardFooter>
      <DeleteNetworkDialog
        network={network}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  )
}

function NetworkListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton key={index} className="h-72 rounded-xl" />
      ))}
    </div>
  )
}

export default function NetworkList() {
  const { openCreateNetwork } = useCreateEntity()
  const { networks, isLoading, isFetching, isError, error, refetch } =
    useWorkspaceNetworks()

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
          <RefreshButton
            onRefresh={refetch}
            isRefreshing={isFetching}
            size="icon"
          />
          <Button onClick={openCreateNetwork}>
            <PlusIcon />
            Create a network
          </Button>
        </div>
      </div>

      {isLoading ? (
        <NetworkListSkeleton />
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load networks")}
        </p>
      ) : networks.length === 0 ? (
        <Card className="items-center px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-violet-500 text-white">
            <GalleryVerticalEndIcon className="size-5" />
          </div>
          <div className="flex max-w-md flex-col items-center gap-1.5">
            <CardTitle className="text-lg">No networks yet</CardTitle>
            <CardDescription className="text-pretty">
              A network is the workspace for partner organizations, schemas,
              records, and the workflows that run on them.
            </CardDescription>
          </div>
          <Button onClick={openCreateNetwork}>
            <PlusIcon />
            Create a network
          </Button>
        </Card>
      ) : (
        <LoadingFrame isLoading={isFetching} className="rounded-xl">
          <div className="flex flex-col gap-4">
            {networks.map((network) => (
              <NetworkCard key={network.id} network={network} />
            ))}
          </div>
        </LoadingFrame>
      )}
    </div>
  )
}
