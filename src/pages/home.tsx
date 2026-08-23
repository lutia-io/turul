import { useMemo } from "react"
import { Link } from "react-router"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
} from "recharts"
import {
  ArrowRightIcon,
  Building2Icon,
  FileIcon,
  FileJsonIcon,
  LayersIcon,
  ListIcon,
  PlusIcon,
  TableIcon,
  TrendingDownIcon,
  TrendingUpIcon,
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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
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

const ACTIVITY_DAYS = 14

const activityChartConfig = {
  records: {
    label: "Records",
    color: "var(--chart-1)",
  },
  files: {
    label: "Files",
    color: "var(--chart-2)",
  },
  runs: {
    label: "Workflow runs",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const runStatusChartConfig = {
  running: {
    label: "Running",
    color: "oklch(0.72 0.12 215)",
  },
  pending: {
    label: "Queued",
    color: "oklch(0.83 0.14 85)",
  },
  completed: {
    label: "Completed",
    color: "oklch(0.7 0.15 155)",
  },
  failed: {
    label: "Failed",
    color: "oklch(0.64 0.22 27)",
  },
} satisfies ChartConfig

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

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function dayKeyFromIso(iso: string) {
  return dayKey(new Date(iso))
}

function lastNDays(count: number, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() - (count - 1 - index))

    return {
      key: dayKey(date),
      label: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }
  })
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

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return Math.round(((current - previous) / previous) * 100)
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
  const previewOrgs = network.organizations.slice(0, 4)
  const remaining = network.organizations.length - previewOrgs.length

  return (
    <Link to={`/app/networks/${network.id}`} className="block">
      <Card size="sm" className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <ListIcon className="size-4" />
            </div>
            <CardDescription className="truncate">
              {network.summary || "Network workspace"}
            </CardDescription>
          </div>
          <CardAction>
            <ArrowRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {network.organizations.length}
            </span>{" "}
            orgs
            <span className="mx-1.5 text-border">·</span>
            <span className="font-medium text-foreground tabular-nums">
              {network.schemas.length}
            </span>{" "}
            schemas
            <span className="mx-1.5 text-border">·</span>
            <span className="font-medium text-foreground tabular-nums">
              {network.workflowDefinitions.length}
            </span>{" "}
            workflows
          </p>
          {previewOrgs.length > 0 ? (
            <div className="flex shrink-0 items-center">
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
              {remaining > 0 ? (
                <span className="ml-1.5 text-[11px] text-muted-foreground">
                  +{remaining}
                </span>
              ) : null}
            </div>
          ) : null}
        </CardContent>
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

function ActivityChart({
  data,
  total,
  change,
}: {
  data: { label: string; records: number; files: number; runs: number }[]
  total: number
  change: number
}) {
  const TrendIcon = change < 0 ? TrendingDownIcon : TrendingUpIcon

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Workspace activity</CardTitle>
        <CardDescription>
          Records, files, and workflow runs over the last {ACTIVITY_DAYS} days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={activityChartConfig}
          className="aspect-auto h-[220px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 8, right: 8, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="equidistantPreserveStart"
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="records"
              type="monotone"
              fill="var(--color-records)"
              fillOpacity={0.35}
              stroke="var(--color-records)"
              strokeWidth={1.5}
              stackId="activity"
            />
            <Area
              dataKey="files"
              type="monotone"
              fill="var(--color-files)"
              fillOpacity={0.35}
              stroke="var(--color-files)"
              strokeWidth={1.5}
              stackId="activity"
            />
            <Area
              dataKey="runs"
              type="monotone"
              fill="var(--color-runs)"
              fillOpacity={0.4}
              stroke="var(--color-runs)"
              strokeWidth={1.5}
              stackId="activity"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="gap-2 text-sm">
        {total === 0 ? (
          <span className="text-muted-foreground">
            No records, files, or runs in this window.
          </span>
        ) : (
          <>
            <TrendIcon className="size-4" />
            <span className="font-medium tabular-nums">
              {total.toLocaleString()} events
            </span>
            <span className="text-muted-foreground">
              {change === 0
                ? "even with the prior 7 days"
                : `${Math.abs(change)}% ${change > 0 ? "up" : "down"} from the prior 7 days`}
            </span>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

function RunStatusChart({
  data,
  total,
}: {
  data: { status: keyof typeof runStatusChartConfig; value: number }[]
  total: number
}) {
  const slices = data.filter((item) => item.value > 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Workflow health</CardTitle>
        <CardDescription>Run status across the workspace.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No workflow runs yet.
          </p>
        ) : (
          <ChartContainer
            config={runStatusChartConfig}
            className="mx-auto aspect-square max-h-[220px]"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent hideLabel nameKey="status" />}
              />
              <Pie
                data={slices.map((item) => ({
                  ...item,
                  fill: `var(--color-${item.status})`,
                }))}
                dataKey="value"
                nameKey="status"
                innerRadius={62}
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-semibold"
                          >
                            {total.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 22}
                            className="fill-muted-foreground text-xs"
                          >
                            runs
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        {data.map((item) => (
          <div
            key={item.status}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: runStatusChartConfig[item.status].color,
                }}
              />
              {runStatusChartConfig[item.status].label}
            </span>
            <span className="font-medium tabular-nums">{item.value}</span>
          </div>
        ))}
      </CardFooter>
    </Card>
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

  const activity = useMemo(() => {
    const days = lastNDays(ACTIVITY_DAYS)
    const counts = new Map(
      days.map((day) => [day.key, { records: 0, files: 0, runs: 0 }])
    )

    for (const record of records) {
      const key = dayKeyFromIso(record.createdAt)
      const bucket = counts.get(key)
      if (bucket) bucket.records += 1
    }

    for (const file of files) {
      const key = dayKeyFromIso(file.createdAt)
      const bucket = counts.get(key)
      if (bucket) bucket.files += 1
    }

    for (const run of workflowRuns) {
      const key = dayKeyFromIso(run.createdAt)
      const bucket = counts.get(key)
      if (bucket) bucket.runs += 1
    }

    return days.map((day) => ({
      label: day.label,
      ...counts.get(day.key)!,
    }))
  }, [files, records, workflowRuns])

  const activityTotals = useMemo(() => {
    const sum = (slice: typeof activity, key: "records" | "files" | "runs") =>
      slice.reduce((total, day) => total + day[key], 0)
    const recent = activity.slice(-7)
    const previous = activity.slice(0, 7)
    const recentTotal =
      sum(recent, "records") + sum(recent, "files") + sum(recent, "runs")
    const previousTotal =
      sum(previous, "records") + sum(previous, "files") + sum(previous, "runs")

    return {
      total:
        sum(activity, "records") +
        sum(activity, "files") +
        sum(activity, "runs"),
      change: percentChange(recentTotal, previousTotal),
    }
  }, [activity])

  const runStatusData = useMemo(
    () =>
      [
        { status: "running" as const, value: runningWorkflows },
        { status: "pending" as const, value: queuedWorkflows },
        { status: "completed" as const, value: completedWorkflows },
        { status: "failed" as const, value: failedWorkflows },
      ] satisfies {
        status: keyof typeof runStatusChartConfig
        value: number
      }[],
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
                detail={`${activity
                  .slice(-7)
                  .reduce(
                    (total, day) => total + day.records,
                    0
                  )} created this week`}
                color="blue"
                icon={TableIcon}
              />
              <StatCard
                to={workspaceHref("files")}
                label="Files"
                value={files.length}
                detail={`${activity
                  .slice(-7)
                  .reduce(
                    (total, day) => total + day.files,
                    0
                  )} uploaded this week`}
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
                <div className="flex flex-col gap-2">
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
