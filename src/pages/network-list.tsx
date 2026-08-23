import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  GlobeIcon,
  LayersIcon,
  MapPinIcon,
  PlusIcon,
  WorkflowIcon,
  type LucideIcon,
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
import { Skeleton } from "@/components/ui/skeleton"
import { publicationStatus } from "@/lib/json-definition"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  networkWorkspacePath,
  useWorkspaceNetworks,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import type { Network, Organization } from "@/data/networks"

function countByStatus<T>(items: T[], statusOf: (item: T) => string) {
  return items.reduce(
    (counts, item) => {
      if (statusOf(item) === "Draft") {
        counts.draft += 1
      } else {
        counts.live += 1
      }
      return counts
    },
    { live: 0, draft: 0 }
  )
}

function statusDetail(counts: { live: number; draft: number }, liveLabel: string) {
  if (counts.draft > 0) {
    return `${counts.live} ${liveLabel} · ${counts.draft} draft`
  }
  return `${counts.live} ${liveLabel}`
}

function EntityCard({
  to,
  name,
  subtitle,
  status,
  color,
  icon: Icon,
}: {
  to: string
  name: string
  subtitle: string
  status?: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-h-[88px] min-w-0 items-center gap-3.5 overflow-hidden rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate font-medium">{name}</p>
          {status ? (
            <span className="shrink-0">
              <StatusBadge status={status} />
            </span>
          ) : null}
        </div>
        <p className="text-sm wrap-break-word text-muted-foreground sm:truncate">
          {subtitle}
        </p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

function OrganizationCard({
  organization,
  networkId,
}: {
  organization: Organization
  networkId: string
}) {
  return (
    <EntityCard
      to={networkWorkspacePath({
        networkId,
        organizationId: organization.id,
      })}
      name={organization.name}
      status={organization.status}
      color={organization.color}
      icon={Building2Icon}
      subtitle={
        [organization.type, organization.location]
          .filter(Boolean)
          .join(" · ") || "Organization"
      }
    />
  )
}

function NetworkStat({
  to,
  label,
  value,
  detail,
  color,
  icon: Icon,
}: {
  to: string
  label: string
  value: number
  detail: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-xl border bg-background px-3 py-2.5 shadow-xs transition-colors hover:bg-muted/50"
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {label}
          <span className="mx-1 text-border">·</span>
          {detail}
        </p>
      </div>
    </Link>
  )
}

function NetworkCard({ network }: { network: Network }) {
  const { openCreateOrganization } = useCreateEntity()
  const tone = getBadgeColor(network.color)
  const organizationCounts = countByStatus(
    network.organizations,
    (organization) => organization.status
  )
  const schemaCounts = countByStatus(network.schemas, (schema) =>
    publicationStatus(schema.active)
  )
  const workflowCounts = countByStatus(
    network.workflowDefinitions,
    (workflow) => publicationStatus(workflow.active)
  )
  const pipelineCounts = countByStatus(
    network.pipelineDefinitions,
    (pipeline) => publicationStatus(pipeline.active)
  )
  const industryLabel = network.industry || network.summary

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
              {industryLabel ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {industryLabel}
                </span>
              ) : null}
            </div>
            {network.description ? (
              <CardDescription className="max-w-2xl text-pretty">
                {network.description}
              </CardDescription>
            ) : null}
            {network.headquarters || network.coverage ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {network.headquarters ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="size-3.5" />
                    {network.headquarters}
                  </span>
                ) : null}
                {network.coverage ? (
                  <span className="inline-flex items-center gap-1">
                    <GlobeIcon className="size-3.5" />
                    {network.coverage}
                  </span>
                ) : null}
              </div>
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
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <NetworkStat
            to={`/app/networks/${network.id}`}
            label="Organizations"
            value={network.organizations.length}
            detail={statusDetail(organizationCounts, "active")}
            color="cyan"
            icon={Building2Icon}
          />
          <NetworkStat
            to={networkWorkspacePath({
              networkId: network.id,
              rest: "schemas",
            })}
            label="Schemas"
            value={network.schemas.length}
            detail={statusDetail(schemaCounts, "published")}
            color="purple"
            icon={FileJsonIcon}
          />
          <NetworkStat
            to={networkWorkspacePath({
              networkId: network.id,
              rest: "workflow-definitions",
            })}
            label="Workflows"
            value={network.workflowDefinitions.length}
            detail={statusDetail(workflowCounts, "published")}
            color="teal"
            icon={WorkflowIcon}
          />
          <NetworkStat
            to={networkWorkspacePath({
              networkId: network.id,
              rest: "pipeline-definitions",
            })}
            label="Pipelines"
            value={network.pipelineDefinitions.length}
            detail={statusDetail(pipelineCounts, "published")}
            color="pink"
            icon={LayersIcon}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Link
          to={`/app/networks/${network.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View network
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </CardFooter>
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
            Networks group organizations and the schemas they share. Open a card
            to inspect a member, or view the full network.
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
