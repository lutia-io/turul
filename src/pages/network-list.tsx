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
  UsersIcon,
  WorkflowIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { StatusBadge } from "@/components/json-definition-card"
import { LoadingFrame, RefreshButton } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
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

function formatDateTime(value?: string) {
  if (!value) {
    return undefined
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
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

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string
  value?: ReactNode
  mono?: boolean
}) {
  if (value == null || value === "") {
    return null
  }

  return (
    <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-medium wrap-break-word", mono && "font-mono text-sm")}>
        {value}
      </p>
    </div>
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
  const created = formatDateTime(organization.createdAt)
  const updated = formatDateTime(organization.updatedAt)

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-3.5 shadow-xs">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tracking-tight",
            tone.bg,
            tone.text
          )}
        >
          {organizationInitials(organization.name)}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium wrap-break-word">{organization.name}</p>
            <StatusBadge status={organization.status} />
          </div>
          {organization.description ? (
            <p className="text-sm text-pretty text-muted-foreground">
              {organization.description}
            </p>
          ) : null}
        </div>
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
              Open workspace
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <DetailItem label="Slug" value={slug} mono />
        <DetailItem label="Type" value={kind} />
        <DetailItem label="Location" value={organization.location} />
        <DetailItem
          label="Members"
          value={
            organization.members > 0
              ? countLabel(organization.members, "member")
              : undefined
          }
        />
        <DetailItem label="Created" value={created} />
        <DetailItem
          label="Updated"
          value={updated && updated !== created ? updated : undefined}
        />
      </div>
      <Link
        to={workspacePath}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Open workspace
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
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
  const created = formatDateTime(network.createdAt)
  const updated = formatDateTime(network.updatedAt)
  const organizationCount = network.organizations.length

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
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
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openCreateOrganization(network.id)}
          >
            <PlusIcon />
            Add organization
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" />}
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
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Slug" value={slug} mono />
          <DetailItem label="Industry" value={network.industry} />
          <DetailItem label="Headquarters" value={network.headquarters} />
          <DetailItem label="Coverage" value={network.coverage} />
          <DetailItem label="Created" value={created} />
          <DetailItem
            label="Updated"
            value={updated && updated !== created ? updated : undefined}
          />
        </div>
        <NetworkCounts network={network} />
        {organizationCount > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {network.organizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                networkId={network.id}
                organization={organization}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Building2Icon className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No organizations yet</p>
              <p className="text-sm text-muted-foreground">
                Add an organization to start collaborating in this network.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCreateOrganization(network.id)}
            >
              <PlusIcon />
              Add organization
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <Link
          to={`/app/networks/${network.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open network
          <ArrowRightIcon className="size-3.5" />
        </Link>
        {organizationCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <UsersIcon className="size-3.5" />
            {countLabel(organizationCount, "organization")}
          </span>
        ) : null}
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
    <div className="flex flex-col gap-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton key={index} className="h-[22rem] rounded-xl" />
      ))}
    </div>
  )
}

export default function NetworkList() {
  const { openCreateNetwork } = useCreateEntity()
  const { networks, isLoading, isFetching, isError, error, refetch } =
    useWorkspaceNetworks()

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <div className="flex flex-col gap-6">
            {networks.map((network) => (
              <NetworkCard key={network.id} network={network} />
            ))}
          </div>
        </LoadingFrame>
      )}
    </div>
  )
}
