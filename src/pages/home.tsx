import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  FileJsonIcon,
  GlobeIcon,
  LayersIcon,
  ListIcon,
  MapPinIcon,
  PlusIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import {
  networkList,
  organizationList,
  pipelineDefinitionList,
  schemaList,
  workflowDefinitionList,
  type Network,
} from "@/data/networks"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getBadgeColor, statusBadgeConfig, type BadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"

const userName = "John"

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function StatusBadge({ status }: { status: string }) {
  const config = statusBadgeConfig[status]
  const Icon = config?.icon ?? statusBadgeConfig.Active.icon
  const tone = getBadgeColor(config?.color)

  return (
    <span className="inline-flex" title={status}>
      <Icon className={cn("size-4", tone.fg)} />
      <span className="sr-only">{status}</span>
    </span>
  )
}

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

function StatCard({
  to,
  label,
  value,
  live,
  draft,
  liveLabel,
  color,
  icon: Icon,
}: {
  to: string
  label: string
  value: number
  live: number
  draft: number
  liveLabel: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)
  const liveShare = value > 0 ? (live / value) * 100 : 0

  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-xl border bg-background shadow-xs transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3.5 px-3.5 py-3">
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
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="truncate text-sm font-medium">{label}</p>
        </div>
      </div>
      <div className="mt-auto border-t bg-muted/40 px-3.5 py-2.5">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          <span
            className={cn("h-full rounded-full", tone.bg)}
            style={{ width: `${liveShare}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {live} {liveLabel}
          {draft > 0 ? ` · ${draft} draft` : ""}
        </p>
      </div>
    </Link>
  )
}

function NetworkCard({ network }: { network: Network }) {
  const previewOrgs = network.organizations.slice(0, 5)
  const remaining = network.organizations.length - previewOrgs.length
  const color = network.organizations[0]?.color ?? "gray"
  const tone = getBadgeColor(color)
  const metrics = [
    {
      label: "Organizations",
      value: network.organizations.length,
    },
    {
      label: "Schemas",
      value: network.schemas.length,
    },
    {
      label: "Workflows",
      value: network.workflowDefinitions.length,
    },
    {
      label: "Pipelines",
      value: network.pipelineDefinitions.length,
    },
  ]

  return (
    <Link to={`/app/networks/${network.id}`} className="block h-full">
      <Card className="h-full gap-0 py-0 transition-colors hover:bg-muted/50">
        <CardHeader className="gap-4 p-5">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <ListIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <CardTitle className="truncate">{network.name}</CardTitle>
                <StatusBadge status={network.status} />
              </div>
              <CardDescription className="mt-0.5">
                {network.summary}
              </CardDescription>
              <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {network.industry}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 px-5 pb-5">
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl bg-muted/70 px-3 py-2.5"
              >
                <p className="text-lg font-semibold tracking-tight tabular-nums">
                  {metric.value}
                </p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center">
            <div className="flex -space-x-1.5">
              {previewOrgs.map((organization) => {
                const orgTone = getBadgeColor(organization.color)
                return (
                  <span
                    key={organization.id}
                    title={organization.name}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg ring-2 ring-card",
                      orgTone.bg,
                      orgTone.text
                    )}
                  >
                    <Building2Icon className="size-3.5" />
                    <span className="sr-only">{organization.name}</span>
                  </span>
                )
              })}
            </div>
            {remaining > 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">
                +{remaining} more
              </span>
            ) : (
              <span className="ml-2 truncate text-xs text-muted-foreground">
                {network.organizations.length} organizations
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-3 text-sm text-muted-foreground">
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="size-3.5" />
              {network.headquarters}
            </span>
            <span className="inline-flex items-center gap-1">
              <GlobeIcon className="size-3.5" />
              {network.coverage}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground">
            View
            <ArrowRightIcon className="size-3.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}

function AttentionCard({
  to,
  name,
  kind,
  networkName,
  color,
  icon: Icon,
}: {
  to: string
  name: string
  kind: string
  networkName: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-h-[72px] items-center gap-3 rounded-xl border bg-background px-3 py-2.5 shadow-xs transition-colors hover:bg-muted/50"
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{name}</p>
          <StatusBadge status="Draft" />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {kind} · {networkName}
        </p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

function QuickActionCard({
  to,
  label,
  description,
  color,
  icon: Icon,
}: {
  to: string
  label: string
  description: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-h-[72px] items-center gap-3 rounded-xl border bg-background px-3 py-2.5 shadow-xs transition-colors hover:bg-muted/50"
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

type AttentionItem = {
  id: string
  name: string
  kind: string
  networkName: string
  to: string
  color: BadgeColor
  icon: LucideIcon
}

export default function Home() {
  const greeting = greetingForHour(new Date().getHours())
  const currentNetwork = networkList[0]
  const networkCounts = countByStatus(networkList, (network) => network.status)
  const organizationCounts = countByStatus(
    organizationList,
    ({ organization }) => organization.status
  )
  const schemaCounts = countByStatus(schemaList, ({ schema }) => schema.status)
  const workflowCounts = countByStatus(
    workflowDefinitionList,
    ({ workflowDefinition }) => workflowDefinition.status
  )
  const pipelineCounts = countByStatus(
    pipelineDefinitionList,
    ({ pipelineDefinition }) => pipelineDefinition.status
  )
  const draftCount =
    schemaCounts.draft + workflowCounts.draft + pipelineCounts.draft

  const attentionItems: AttentionItem[] = [
    ...schemaList
      .filter(({ schema }) => schema.status === "Draft")
      .map(({ schema, network }) => ({
        id: schema.id,
        name: schema.name,
        kind: "Schema",
        networkName: network.name,
        to: `/app/schemas/${schema.id}`,
        color: schema.color,
        icon: FileJsonIcon,
      })),
    ...workflowDefinitionList
      .filter(({ workflowDefinition }) => workflowDefinition.status === "Draft")
      .map(({ workflowDefinition, network }) => ({
        id: workflowDefinition.id,
        name: workflowDefinition.name,
        kind: "Workflow",
        networkName: network.name,
        to: `/app/workflow-definitions/${workflowDefinition.id}`,
        color: "teal" as const,
        icon: WorkflowIcon,
      })),
    ...pipelineDefinitionList
      .filter(({ pipelineDefinition }) => pipelineDefinition.status === "Draft")
      .map(({ pipelineDefinition, network }) => ({
        id: pipelineDefinition.id,
        name: pipelineDefinition.name,
        kind: "Pipeline",
        networkName: network.name,
        to: `/app/pipeline-definitions/${pipelineDefinition.id}`,
        color: "pink" as const,
        icon: LayersIcon,
      })),
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 bg-muted/40 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting}, {userName}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {currentNetwork.name} is your active network.{" "}
              {organizationList.length} organizations and {schemaList.length}{" "}
              schemas are in play
              {draftCount > 0
                ? `, with ${draftCount} draft${draftCount === 1 ? "" : "s"} waiting on review.`
                : "."}
            </p>
          </div>
          <Button render={<Link to="/app/networks" />}>
            <PlusIcon />
            Create a network
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            to="/app/networks"
            label="Networks"
            value={networkList.length}
            live={networkCounts.live}
            draft={networkCounts.draft}
            liveLabel="active"
            color="purple"
            icon={ListIcon}
          />
          <StatCard
            to="/app/organizations"
            label="Organizations"
            value={organizationList.length}
            live={organizationCounts.live}
            draft={organizationCounts.draft}
            liveLabel="active"
            color="orange"
            icon={Building2Icon}
          />
          <StatCard
            to="/app/schemas"
            label="Schemas"
            value={schemaList.length}
            live={schemaCounts.live}
            draft={schemaCounts.draft}
            liveLabel="published"
            color="blue"
            icon={FileJsonIcon}
          />
          <StatCard
            to="/app/workflow-definitions"
            label="Workflows"
            value={workflowDefinitionList.length}
            live={workflowCounts.live}
            draft={workflowCounts.draft}
            liveLabel="published"
            color="teal"
            icon={WorkflowIcon}
          />
          <StatCard
            to="/app/pipeline-definitions"
            label="Pipelines"
            value={pipelineDefinitionList.length}
            live={pipelineCounts.live}
            draft={pipelineCounts.draft}
            liveLabel="published"
            color="pink"
            icon={LayersIcon}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Your networks
                </h2>
                <p className="text-sm text-muted-foreground">
                  Open a network to inspect organizations, schemas, and
                  definitions.
                </p>
              </div>
              <Link
                to="/app/networks"
                className="hidden shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex sm:items-center sm:gap-1"
              >
                View all
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {networkList.map((network) => (
                <NetworkCard key={network.id} network={network} />
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Needs attention
                </h2>
                <p className="text-sm text-muted-foreground">
                  Draft definitions that are not yet published.
                </p>
              </div>
              {attentionItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {attentionItems.map((item) => (
                    <AttentionCard
                      key={item.id}
                      to={item.to}
                      name={item.name}
                      kind={item.kind}
                      networkName={item.networkName}
                      color={item.color}
                      icon={item.icon}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing waiting on review.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Quick actions
                </h2>
                <p className="text-sm text-muted-foreground">
                  Jump into a common setup task.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <QuickActionCard
                  to="/app/networks"
                  label="Browse networks"
                  description="Open partner ecosystems"
                  color="purple"
                  icon={ListIcon}
                />
                <QuickActionCard
                  to="/app/organizations"
                  label="View organizations"
                  description="Members across networks"
                  color="orange"
                  icon={Building2Icon}
                />
                <QuickActionCard
                  to="/app/schemas"
                  label="Review schemas"
                  description="Shared data contracts"
                  color="blue"
                  icon={FileJsonIcon}
                />
                <QuickActionCard
                  to="/app/workflow-definitions"
                  label="Open workflows"
                  description="Orchestration definitions"
                  color="teal"
                  icon={WorkflowIcon}
                />
              </div>
            </section>
          </aside>
        </div>
    </div>
  )
}
