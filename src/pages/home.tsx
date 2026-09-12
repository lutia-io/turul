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
  NetworkIcon,
  PlusIcon,
  TableIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import { type Network } from "@/data/networks"
import { useCreateEntity } from "@/components/create-entity"
import { StatusBadge } from "@/components/json-definition-card"
import { RefreshButton } from "@/components/refresh-button"
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
import {
  ActivityChart,
  RunStatusChart,
  VolumeChart,
  runStatusSlices,
} from "@/components/workspace-charts"
import {
  DashboardHeader,
  DashboardPage,
  DashboardSection,
  MetricStrip,
  MetricStripSkeleton,
  SnapshotChip,
  countByStatus,
} from "@/components/workspace-dashboard"
import {
  ACTIVITY_DAYS,
  bucketActivity,
  summarizeActivity,
  topVolumeRows,
} from "@/lib/activity"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  networkWorkspacePath,
  useWorkspaceFiles,
  useWorkspaceNetworksWithDefinitions,
  useWorkspacePipelineRuns,
  useWorkspaceRecords,
  useWorkspaceWorkflowRuns,
} from "@/lib/network-workspace"
import {
  apiWorkflowStatus,
  countWorkflowRunStatuses,
  formatRelativeTime,
} from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage, useMeQuery } from "@/store/api"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function todayLabel(now = new Date()) {
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function NetworkCard({ network }: { network: Network }) {
  const tone = getBadgeColor(network.color)
  const networkPath = networkWorkspacePath({ networkId: network.id })
  const previewOrgs = network.organizations.slice(0, 3)
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

  return (
    <Card size="sm" className="h-full">
      <CardHeader className="border-b">
        <Link to={networkPath} className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              tone.bg,
              tone.text
            )}
          >
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="min-w-0 truncate">{network.name}</CardTitle>
              <StatusBadge status={network.status} />
            </div>
            <CardDescription className="line-clamp-2 text-pretty">
              {network.description ||
                network.summary ||
                `${network.organizations.length} ${
                  network.organizations.length === 1
                    ? "organization"
                    : "organizations"
                }`}
            </CardDescription>
          </div>
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {counts.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-lg bg-muted/50 px-2.5 py-2 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-1 text-muted-foreground">
                <item.icon className="size-3.5" />
                <p className="truncate text-[11px]">{item.label}</p>
              </div>
              <p className="mt-1 text-base font-semibold tracking-tight tabular-nums">
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
        <Link
          to={networkPath}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Open
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
      className="group flex min-h-[56px] items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50"
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-3.5" />
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
      <MetricStripSkeleton
        items={[
          { label: "Networks", color: "purple", icon: ListIcon },
          { label: "Organizations", color: "cyan", icon: Building2Icon },
          { label: "Records", color: "blue", icon: TableIcon },
          { label: "Files", color: "gray", icon: FileIcon },
          { label: "Workflow runs", color: "teal", icon: WorkflowIcon },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,22rem)]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Workspace activity</CardTitle>
            <CardDescription>
              Records, files, and workflow runs over the last {ACTIVITY_DAYS}{" "}
              days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Workflow health</CardTitle>
            <CardDescription>Run status across the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center">
            <Skeleton className="size-[200px] rounded-full" />
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </CardFooter>
        </Card>
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
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { data: me } = useMeQuery(undefined, { skip: !isAuthenticated })
  const userName = me?.firstName.trim() || null
  const {
    networks,
    isLoading: isNetworksLoading,
    isFetching: isNetworksFetching,
    isError: isNetworksError,
    error: networksError,
    refetch: refetchNetworks,
  } = useWorkspaceNetworksWithDefinitions()
  const {
    records,
    refetch: refetchRecords,
    isFetching: isRecordsFetching,
  } = useWorkspaceRecords()
  const {
    files,
    refetch: refetchFiles,
    isFetching: isFilesFetching,
  } = useWorkspaceFiles()
  const {
    runs: workflowRuns,
    refetch: refetchRuns,
    isFetching: isRunsFetching,
  } = useWorkspaceWorkflowRuns()
  const {
    runs: pipelineRuns,
    refetch: refetchPipelineRuns,
    isFetching: isPipelineRunsFetching,
  } = useWorkspacePipelineRuns()
  const greeting = greetingForHour(new Date().getHours())
  const currentNetwork = networks[0]
  const isRefreshing =
    isNetworksFetching ||
    isRecordsFetching ||
    isFilesFetching ||
    isRunsFetching ||
    isPipelineRunsFetching
  const isInitialLoading =
    isNetworksLoading && networks.length === 0 && !isNetworksError

  function refreshHome() {
    void refetchNetworks()
    void refetchRecords()
    void refetchFiles()
    void refetchRuns()
    void refetchPipelineRuns()
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
  const allRuns = useMemo(
    () => [...workflowRuns, ...pipelineRuns],
    [pipelineRuns, workflowRuns]
  )
  const runCounts = useMemo(
    () => countWorkflowRunStatuses(workflowRuns),
    [workflowRuns]
  )
  const liveCounts = useMemo(() => countWorkflowRunStatuses(allRuns), [allRuns])
  const pipelineCounts = useMemo(
    () => countWorkflowRunStatuses(pipelineRuns),
    [pipelineRuns]
  )
  const activity = useMemo(
    () =>
      bucketActivity({
        records,
        files,
        runs: allRuns,
      }),
    [allRuns, files, records]
  )
  const activityTotals = useMemo(() => summarizeActivity(activity), [activity])
  const runStatusData = useMemo(() => runStatusSlices(runCounts), [runCounts])
  const pipelineStatusData = useMemo(
    () => runStatusSlices(pipelineCounts),
    [pipelineCounts]
  )
  const volumeByNetwork = useMemo(
    () =>
      topVolumeRows(
        networks.map((network) => ({
          name: network.name,
          records: records.filter((item) => item.networkId === network.id)
            .length,
          files: files.filter((item) => item.networkId === network.id).length,
          runs: allRuns.filter((item) => item.networkId === network.id).length,
        }))
      ),
    [allRuns, files, networks, records]
  )

  const attentionItems: AttentionItem[] = useMemo(() => {
    const failedRuns: AttentionItem[] = workflowRuns
      .filter((run) => apiWorkflowStatus(run.status) === "Failed")
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
      .slice(0, 6)
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
    : currentNetwork
      ? `${networks.length} network${networks.length === 1 ? "" : "s"} · ${organizations.length} organization${organizations.length === 1 ? "" : "s"}`
      : "Create a network to start collecting records, files, and runs."

  return (
    <DashboardPage tone="workspace">
      <DashboardHeader
        eyebrow={todayLabel()}
        title={userName ? `${greeting}, ${userName}` : greeting}
        badges={
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Workspace
          </span>
        }
        description={
          isInitialLoading ? (
            <Skeleton className="h-5 w-72 max-w-full" />
          ) : (
            <p className={isNetworksError ? "text-destructive" : undefined}>
              {subtitle}
            </p>
          )
        }
        chips={
          !isInitialLoading && !isNetworksError && networks.length > 0 ? (
            <>
              <SnapshotChip
                kind="running"
                value={liveCounts.running}
                label="running"
              />
              <SnapshotChip
                kind="failed"
                value={liveCounts.failed}
                label="failed"
              />
              <SnapshotChip
                kind="attention"
                value={attentionItems.length}
                label="need attention"
              />
            </>
          ) : null
        }
        actions={
          <>
            {networks.length > 0 || isRefreshing ? (
              <RefreshButton
                onRefresh={refreshHome}
                isRefreshing={isRefreshing}
                size="icon"
              />
            ) : null}
            <Button onClick={openCreateNetwork}>
              <PlusIcon />
              Create a network
            </Button>
          </>
        }
      />

      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : !isNetworksError && networks.length === 0 ? (
        <Card className="items-center px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <NetworkIcon className="size-6" />
          </div>
          <div className="flex max-w-md flex-col items-center gap-1.5">
            <CardTitle className="text-lg">Start with a network</CardTitle>
            <CardDescription className="text-pretty">
              A network is the workspace for organizations, schemas, records,
              and the workflows that run on them.
            </CardDescription>
          </div>
          <Button onClick={openCreateNetwork}>
            <PlusIcon />
            Create a network
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <MetricStrip
            items={[
              {
                to: "/app/networks",
                label: "Networks",
                value: networks.length,
                detail:
                  networkCounts.draft > 0
                    ? `${networkCounts.live} active · ${networkCounts.draft} draft`
                    : `${networkCounts.live} active`,
                color: "purple",
                icon: ListIcon,
              },
              {
                to: workspaceHref(),
                label: "Organizations",
                value: organizations.length,
                detail:
                  organizationCounts.draft > 0
                    ? `${organizationCounts.live} active · ${organizationCounts.draft} draft`
                    : `${organizationCounts.live} active`,
                color: "cyan",
                icon: Building2Icon,
              },
              {
                to: workspaceHref("records"),
                label: "Records",
                value: records.length,
                detail: `${activityTotals.recordsThisWeek} created this week`,
                color: "blue",
                icon: TableIcon,
              },
              {
                to: workspaceHref("files"),
                label: "Files",
                value: files.length,
                detail: `${activityTotals.filesThisWeek} uploaded this week`,
                color: "gray",
                icon: FileIcon,
              },
              {
                to: workspaceHref("workflows"),
                label: "Workflow runs",
                value: workflowRuns.length,
                detail:
                  runCounts.failed > 0
                    ? `${runCounts.running} running · ${runCounts.failed} failed`
                    : runCounts.pending > 0
                      ? `${runCounts.running} running · ${runCounts.pending} queued`
                      : `${runCounts.running} running`,
                color: "teal",
                icon: WorkflowIcon,
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,22rem)]">
            <ActivityChart
              data={activity}
              total={activityTotals.total}
              change={activityTotals.change}
            />
            <RunStatusChart
              data={runStatusData}
              total={workflowRuns.length}
              description="Workflow executions across every network."
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <VolumeChart
              data={volumeByNetwork}
              title="Volume by network"
              description="Records, files, and runs compared across workspaces."
              emptyLabel="No records, files, or runs to compare yet."
            />
            <RunStatusChart
              data={pipelineStatusData}
              total={pipelineRuns.length}
              title="Pipeline health"
              description="Ingest and pipeline executions across the workspace."
              emptyHint="No pipeline runs yet. Status will fill in as ingest starts."
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
            <DashboardSection
              title="Your networks"
              description="Organizations, schemas, and automations in each workspace."
              action={
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
              }
            >
              {isNetworksError ? (
                <p className="text-sm text-destructive">
                  {getHumaErrorMessage(
                    networksError,
                    "Failed to load networks"
                  )}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {networks.map((network) => (
                    <NetworkCard key={network.id} network={network} />
                  ))}
                </div>
              )}
            </DashboardSection>

            <aside className="flex min-w-0 flex-col gap-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Needs attention</CardTitle>
                  <CardDescription>
                    Failed runs and unpublished definitions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="-mx-3">
                  {attentionItems.length > 0 ? (
                    <div className="flex flex-col divide-y">
                      {attentionItems.slice(0, 5).map((item) => (
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
                    <p className="px-3 pb-1 text-sm text-muted-foreground">
                      Nothing waiting on review.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>Recent runs</CardTitle>
                  <CardDescription>Latest workflow executions.</CardDescription>
                  <CardAction>
                    <Link
                      to={workspaceHref("workflows")}
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                      })}
                    >
                      View
                      <ArrowRightIcon />
                    </Link>
                  </CardAction>
                </CardHeader>
                <CardContent className="-mx-3">
                  {recentRuns.length > 0 ? (
                    <div className="flex flex-col divide-y">
                      {recentRuns.map(({ run, name, networkName }) => (
                        <Link
                          key={run.id}
                          to={`/app/networks/${run.networkId}/workflows/${run.id}`}
                          className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
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
                    </div>
                  ) : (
                    <p className="px-3 pb-1 text-sm text-muted-foreground">
                      No workflow runs yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      )}
    </DashboardPage>
  )
}
