import { useMemo } from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  FileIcon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  LayersIcon,
  ListIcon,
  PlusIcon,
  TableIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import { type Network } from "@/data/networks"
import { useCreateEntity } from "@/components/create-entity"
import { StatusBadge } from "@/components/json-definition-card"
import { LoadingFrame, RefreshButton } from "@/components/refresh-button"
import { RunStatusPill } from "@/components/run-card"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityChart, RunStatusChart } from "@/components/workspace-charts"
import { bucketActivity, summarizeActivity } from "@/lib/activity"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  networkWorkspacePath,
  useWorkspaceFiles,
  useWorkspaceNetworks,
  useWorkspaceRecords,
  useWorkspaceWorkflowRuns,
} from "@/lib/network-workspace"
import { apiWorkflowStatus, formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { selectAuthEmail } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"

function displayNameFromEmail(email: string | null) {
  if (!email) {
    return null
  }

  return email.split("@")[0] || email
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
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
    <Link to={to} className="block min-w-0">
      <Card size="sm" className="h-full transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </CardTitle>
          <CardAction>
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <Icon className="size-4" />
            </div>
          </CardAction>
        </CardHeader>
        <CardFooter className="text-xs text-muted-foreground">
          {detail}
        </CardFooter>
      </Card>
    </Link>
  )
}

function NetworkCard({ network }: { network: Network }) {
  const tone = getBadgeColor(network.color)
  const networkPath = networkWorkspacePath({ networkId: network.id })
  const previewOrgs = network.organizations.slice(0, 4)
  const remaining = network.organizations.length - previewOrgs.length
  const counts = [
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
  const meta = [
    network.industry,
    network.headquarters,
    network.organizations.length > 0
      ? `${network.organizations.length} ${
          network.organizations.length === 1 ? "organization" : "organizations"
        }`
      : null,
  ].filter(Boolean)

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              tone.bg,
              tone.text
            )}
          >
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{network.name}</CardTitle>
              <StatusBadge status={network.status} />
            </div>
            {network.description || network.summary ? (
              <CardDescription className="line-clamp-2 text-pretty">
                {network.description || network.summary}
              </CardDescription>
            ) : null}
            {meta.length > 0 ? (
              <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                {meta.map((item, index) => (
                  <span
                    key={item}
                    className="inline-flex min-w-0 items-center gap-x-1.5"
                  >
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-border">
                        ·
                      </span>
                    ) : null}
                    <span className="min-w-0 truncate">{item}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {counts.map((item) => (
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
        {previewOrgs.length > 0 ? (
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex -space-x-1.5">
              {previewOrgs.map((organization) => {
                const orgTone = getBadgeColor(organization.color)
                return (
                  <span
                    key={organization.id}
                    title={organization.name}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md ring-2 ring-card",
                      orgTone.bg,
                      orgTone.text
                    )}
                  >
                    <Building2Icon className="size-3" />
                    <span className="sr-only">{organization.name}</span>
                  </span>
                )
              })}
            </div>
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {previewOrgs.map((organization) => organization.name).join(", ")}
              {remaining > 0 ? ` +${remaining}` : ""}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No organizations yet</p>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Link to={networkPath} className={buttonVariants({ size: "sm" })}>
          View network
          <ArrowRightIcon />
        </Link>
      </CardFooter>
    </Card>
  )
}

function AttentionCard({
  to,
  name,
  kind,
  networkName,
  color,
  icon: Icon,
  status,
}: {
  to: string
  name: string
  kind: string
  networkName: string
  color: BadgeColor
  icon: LucideIcon
  status: string
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-h-[64px] items-center gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
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
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{name}</p>
          <StatusBadge status={status} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {kind} · {networkName}
        </p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[108px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_22rem]">
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    </div>
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
  status: string
}

export default function Home() {
  const { openCreateNetwork } = useCreateEntity()
  const email = useAppSelector(selectAuthEmail)
  const userName = displayNameFromEmail(email)
  const {
    networks,
    isLoading: isNetworksLoading,
    isFetching: isNetworksFetching,
    isError: isNetworksError,
    error: networksError,
    refetch: refetchNetworks,
  } = useWorkspaceNetworks()
  const {
    records,
    refetch: refetchRecords,
    isFetching: isRecordsFetching,
    isLoading: isRecordsLoading,
  } = useWorkspaceRecords()
  const {
    files,
    refetch: refetchFiles,
    isFetching: isFilesFetching,
    isLoading: isFilesLoading,
  } = useWorkspaceFiles()
  const {
    runs: workflowRuns,
    refetch: refetchRuns,
    isFetching: isRunsFetching,
    isLoading: isRunsLoading,
  } = useWorkspaceWorkflowRuns()
  const greeting = greetingForHour(new Date().getHours())
  const currentNetwork = networks[0]
  const isInitialLoading =
    isNetworksLoading || isRecordsLoading || isFilesLoading || isRunsLoading
  const isRefreshing =
    isNetworksFetching || isRecordsFetching || isFilesFetching || isRunsFetching

  function refreshHome() {
    void refetchNetworks()
    void refetchRecords()
    void refetchFiles()
    void refetchRuns()
  }

  const workspaceHref = (rest = "") =>
    currentNetwork
      ? networkWorkspacePath({ networkId: currentNetwork.id, rest })
      : "/app/networks"

  const organizations = networks.flatMap((network) => network.organizations)
  const networkCounts = countByStatus(networks, (network) => network.status)
  const organizationCounts = countByStatus(
    organizations,
    (organization) => organization.status
  )
  const runningWorkflows = workflowRuns.filter(
    (run) => run.status === "running"
  ).length
  const queuedWorkflows = workflowRuns.filter(
    (run) => run.status === "pending"
  ).length
  const failedWorkflows = workflowRuns.filter(
    (run) => run.status === "failed"
  ).length
  const completedWorkflows = workflowRuns.filter(
    (run) => run.status === "completed"
  ).length

  const activity = useMemo(
    () =>
      bucketActivity({
        records,
        files,
        runs: workflowRuns,
      }),
    [files, records, workflowRuns]
  )
  const activityTotals = useMemo(() => summarizeActivity(activity), [activity])

  const runStatusData = useMemo(
    () => [
      { status: "running" as const, value: runningWorkflows },
      { status: "pending" as const, value: queuedWorkflows },
      { status: "completed" as const, value: completedWorkflows },
      { status: "failed" as const, value: failedWorkflows },
    ],
    [completedWorkflows, failedWorkflows, queuedWorkflows, runningWorkflows]
  )

  const attentionItems: AttentionItem[] = useMemo(() => {
    const failedRuns: AttentionItem[] = workflowRuns
      .filter((run) => run.status === "failed")
      .map((run) => {
        const network = networks.find((item) => item.id === run.networkId)
        const definition = network?.workflowDefinitions.find(
          (item) => item.id === run.workflowDefinitionId
        )

        return {
          id: `run-${run.id}`,
          name: definition?.name ?? "Workflow run",
          kind: "Failed run",
          networkName: network?.name ?? "Network",
          to: `/app/networks/${run.networkId}/workflows/${run.id}`,
          color: "red" as const,
          icon: WorkflowIcon,
          status: "Failed",
        }
      })

    const drafts = networks.flatMap((network) => [
      ...network.schemas
        .filter((schema) => !schema.active)
        .map((schema) => ({
          id: schema.id,
          name: schema.name,
          kind: "Schema",
          networkName: network.name,
          to: `/app/networks/${network.id}/schemas/${schema.id}`,
          color: schema.color,
          icon: FileJsonIcon,
          status: "Draft",
        })),
      ...network.workflowDefinitions
        .filter((workflowDefinition) => !workflowDefinition.active)
        .map((workflowDefinition) => ({
          id: workflowDefinition.id,
          name: workflowDefinition.name,
          kind: "Workflow",
          networkName: network.name,
          to: `/app/networks/${network.id}/workflow-definitions/${workflowDefinition.id}`,
          color: "teal" as const,
          icon: WorkflowIcon,
          status: "Draft",
        })),
      ...network.pipelineDefinitions
        .filter((pipelineDefinition) => !pipelineDefinition.active)
        .map((pipelineDefinition) => ({
          id: pipelineDefinition.id,
          name: pipelineDefinition.name,
          kind: "Pipeline",
          networkName: network.name,
          to: `/app/networks/${network.id}/pipeline-definitions/${pipelineDefinition.id}`,
          color: "pink" as const,
          icon: LayersIcon,
          status: "Draft",
        })),
    ])

    return [...failedRuns, ...drafts]
  }, [networks, workflowRuns])

  const recentRuns = useMemo(() => {
    const definitions = new Map(
      networks.flatMap((network) =>
        network.workflowDefinitions.map((definition) => [
          definition.id,
          { name: definition.name, networkName: network.name },
        ])
      )
    )

    return [...workflowRuns]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
      )
      .slice(0, 5)
      .map((run) => {
        const definition = definitions.get(run.workflowDefinitionId)

        return {
          run,
          name: definition?.name ?? "Workflow run",
          networkName: definition?.networkName,
        }
      })
  }, [networks, workflowRuns])

  const subtitle = isNetworksError
    ? getHumaErrorMessage(networksError, "Failed to load networks")
    : isInitialLoading
      ? "Loading your workspace..."
      : currentNetwork
        ? `${networks.length} network${networks.length === 1 ? "" : "s"} · ${organizations.length} organizations · ${attentionItems.length} item${attentionItems.length === 1 ? "" : "s"} need attention.`
        : "Create a network to start collecting records, files, and runs."

  return (
    <div className="flex flex-1 flex-col gap-6 bg-muted/40 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {userName ? `${greeting}, ${userName}` : greeting}
          </h1>
          <p
            className={cn(
              "mt-1 max-w-2xl text-sm",
              isNetworksError ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton
            onRefresh={refreshHome}
            isRefreshing={isRefreshing}
            size="icon"
          />
          <Button onClick={openCreateNetwork}>
            <PlusIcon />
            Create a network
          </Button>
        </div>
      </div>

      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : !isNetworksError && networks.length === 0 ? (
        <Card className="items-center px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-violet-500 text-white">
            <ListIcon className="size-5" />
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
        <LoadingFrame isLoading={isRefreshing} className="rounded-xl">
          <div className="flex flex-col gap-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                to="/app/networks"
                label="Networks"
                value={networks.length}
                detail={
                  networkCounts.draft > 0
                    ? `${networkCounts.live} active · ${networkCounts.draft} draft`
                    : `${networkCounts.live} active`
                }
                color="purple"
                icon={ListIcon}
              />
              <StatCard
                to={workspaceHref()}
                label="Organizations"
                value={organizations.length}
                detail={
                  organizationCounts.draft > 0
                    ? `${organizationCounts.live} active · ${organizationCounts.draft} draft`
                    : `${organizationCounts.live} members`
                }
                color="cyan"
                icon={Building2Icon}
              />
              <StatCard
                to={workspaceHref("records")}
                label="Records"
                value={records.length}
                detail={`${activityTotals.recordsThisWeek} created this week`}
                color="blue"
                icon={TableIcon}
              />
              <StatCard
                to={workspaceHref("files")}
                label="Files"
                value={files.length}
                detail={`${activityTotals.filesThisWeek} uploaded this week`}
                color="gray"
                icon={FileIcon}
              />
              <StatCard
                to={workspaceHref("workflows")}
                label="Workflows"
                value={workflowRuns.length}
                detail={
                  failedWorkflows > 0
                    ? `${runningWorkflows} running · ${failedWorkflows} failed`
                    : queuedWorkflows > 0
                      ? `${runningWorkflows} running · ${queuedWorkflows} queued`
                      : `${runningWorkflows} running`
                }
                color="teal"
                icon={WorkflowIcon}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_22rem]">
              <ActivityChart
                data={activity}
                total={activityTotals.total}
                change={activityTotals.change}
              />
              <RunStatusChart
                data={runStatusData}
                total={workflowRuns.length}
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
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "hidden shrink-0 sm:inline-flex"
                    )}
                  >
                    View all
                    <ArrowRightIcon />
                  </Link>
                </div>
                <div className="flex flex-col gap-3">
                  {isNetworksError ? (
                    <p className="text-sm text-destructive">
                      {getHumaErrorMessage(
                        networksError,
                        "Failed to load networks"
                      )}
                    </p>
                  ) : (
                    networks.map((network) => (
                      <NetworkCard key={network.id} network={network} />
                    ))
                  )}
                </div>
              </section>

              <aside className="flex flex-col gap-6">
                <section className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">
                      Needs attention
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Failed runs and unpublished definitions.
                    </p>
                  </div>
                  {attentionItems.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {attentionItems.slice(0, 6).map((item) => (
                        <AttentionCard
                          key={item.id}
                          to={item.to}
                          name={item.name}
                          kind={item.kind}
                          networkName={item.networkName}
                          color={item.color}
                          icon={item.icon}
                          status={item.status}
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
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight">
                        Recent runs
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Latest workflow executions.
                      </p>
                    </div>
                    <Link
                      to={workspaceHref("workflows")}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "shrink-0"
                      )}
                    >
                      View
                      <ArrowRightIcon />
                    </Link>
                  </div>
                  {recentRuns.length > 0 ? (
                    <Card size="sm">
                      <CardContent className="flex flex-col divide-y">
                        {recentRuns.map(({ run, name, networkName }) => (
                          <Link
                            key={run.id}
                            to={`/app/networks/${run.networkId}/workflows/${run.id}`}
                            className="flex items-center gap-3 py-2 transition-colors first:pt-0 last:pb-0 hover:bg-muted/60"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {formatRelativeTime(run.createdAt)}
                                {networkName ? ` · ${networkName}` : ""}
                              </p>
                            </div>
                            <RunStatusPill
                              status={apiWorkflowStatus(run.status)}
                            />
                          </Link>
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No workflow runs yet.
                    </p>
                  )}
                </section>
              </aside>
            </div>
          </div>
        </LoadingFrame>
      )}
    </div>
  )
}
