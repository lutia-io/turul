import { useMemo, type ReactNode } from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  FileIcon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  GlobeIcon,
  LayersIcon,
  MapPinIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TableIcon,
  type LucideIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { StatusBadge } from "@/components/json-definition-card"
import { LoadingFrame, RefreshButton } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
import { ActivityChart, RunStatusChart } from "@/components/workspace-charts"
import {
  ACTIVITY_DAYS,
  bucketActivity,
  summarizeActivity,
} from "@/lib/activity"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import { publicationStatus } from "@/lib/json-definition"
import {
  apiPipelineCurrentLevel,
  apiPipelineLevelSteps,
  apiPipelineStatus,
  apiWorkflowCurrentStep,
  apiWorkflowStatus,
  apiWorkflowSteps,
  formatRelativeTime,
  matchesPipelineScope,
  matchesWorkflowScope,
} from "@/lib/runs"
import { parseWorkflowDefinition } from "@/lib/workflow-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceFiles,
  useWorkspaceOrganizations,
  useWorkspacePipelineRuns,
  useWorkspaceRecords,
  useWorkspaceWorkflowRuns,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"

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
  draftLabel = "draft",
  color,
  icon: Icon,
}: {
  to: string
  label: string
  value: number
  live: number
  draft: number
  liveLabel: string
  draftLabel?: string
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
          {draft > 0 ? ` · ${draft} ${draftLabel}` : ""}
        </p>
      </div>
    </Link>
  )
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

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export default function NetworkDetail() {
  const {
    network,
    organization,
    organizationId,
    href,
    refetch: refetchWorkspace,
    isFetching: isWorkspaceFetching,
  } = useNetworkWorkspace()
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
  const { isFetching: isOrganizationsFetching } = useWorkspaceOrganizations()
  const {
    openCreateOrganization,
    openEditNetwork,
    openEditOrganization,
  } = useCreateEntity()

  function refreshNetwork() {
    void refetchWorkspace()
    void refetchRecords()
    void refetchFiles()
    void refetchRuns()
    void refetchPipelineRuns()
  }

  const isRefreshing =
    isWorkspaceFetching ||
    isRecordsFetching ||
    isFilesFetching ||
    isRunsFetching ||
    isPipelineRunsFetching

  const scopedRecords = useMemo(
    () =>
      records.filter((record) => {
        if (!network || record.networkId !== network.id) {
          return false
        }
        return !organizationId || record.organizationId === organizationId
      }),
    [network, organizationId, records]
  )
  const scopedFiles = useMemo(
    () =>
      files.filter((file) => {
        if (!network || file.networkId !== network.id) {
          return false
        }
        return !organizationId || file.organizationId === organizationId
      }),
    [files, network, organizationId]
  )
  const scopedWorkflows = useMemo(
    () =>
      network
        ? workflowRuns.filter((run) =>
            matchesWorkflowScope(run, network.id, organizationId)
          )
        : [],
    [network, organizationId, workflowRuns]
  )
  const scopedPipelines = useMemo(
    () =>
      network
        ? pipelineRuns.filter((run) =>
            matchesPipelineScope(run, network.id, organizationId)
          )
        : [],
    [network, organizationId, pipelineRuns]
  )
  const runningWorkflows = scopedWorkflows.filter(
    (run) => run.status === "running"
  ).length
  const queuedWorkflows = scopedWorkflows.filter(
    (run) => run.status === "pending"
  ).length
  const completedWorkflows = scopedWorkflows.filter(
    (run) => run.status === "completed"
  ).length
  const failedWorkflows = scopedWorkflows.filter(
    (run) => run.status === "failed"
  ).length
  const activity = useMemo(
    () =>
      bucketActivity({
        records: scopedRecords,
        files: scopedFiles,
        runs: [...scopedWorkflows, ...scopedPipelines],
      }),
    [scopedFiles, scopedPipelines, scopedRecords, scopedWorkflows]
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

  if (!network) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">Network not found</h1>
          <RefreshButton
            onRefresh={refreshNetwork}
            isRefreshing={isRefreshing}
            size="icon"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          This network does not exist or is no longer available.
        </p>
        <Link
          to="/app/networks"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to all networks
        </Link>
      </div>
    )
  }

  const accentColor = organization?.color ?? network.color
  const tone = getBadgeColor(accentColor)
  const HeaderIcon = organization ? Building2Icon : GalleryVerticalEndIcon
  const runningPipelines = scopedPipelines.filter(
    (run) => run.status === "running"
  ).length
  const queuedPipelines = scopedPipelines.filter(
    (run) => run.status === "pending"
  ).length
  const organizationCounts = countByStatus(
    network.organizations,
    (item) => item.status
  )
  const schemaCounts = countByStatus(network.schemas, (schema) =>
    publicationStatus(schema.active)
  )
  const activeRuns = [
    ...scopedWorkflows
      .filter((run) => run.status === "pending" || run.status === "running")
      .map((run) => {
        const definition = network.workflowDefinitions.find(
          (item) => item.id === run.workflowDefinitionId
        )
        const steps = apiWorkflowSteps(parseWorkflowDefinition(run.definition))
        const current = steps.find(
          (step) => step.order === apiWorkflowCurrentStep(run)
        )
        return {
          id: run.id,
          name: definition?.name ?? "Workflow",
          kind: "Workflow",
          status: apiWorkflowStatus(run.status),
          href: href(`workflows/${run.id}`),
          color: accentColor,
          icon: PlayIcon,
          current: current?.name,
          updatedAt: run.completedAt ?? run.createdAt,
        }
      }),
    ...scopedPipelines
      .filter((run) => run.status === "pending" || run.status === "running")
      .map((run) => {
        const definition = network.pipelineDefinitions.find(
          (item) => item.id === run.pipelineDefinitionId
        )
        const steps = apiPipelineLevelSteps(run.definition)
        const current = steps.find(
          (step) => step.order === apiPipelineCurrentLevel(run)
        )
        return {
          id: run.id,
          name: definition?.name ?? "Pipeline",
          kind: "Pipeline",
          status: apiPipelineStatus(run.status),
          href: href(`pipelines/${run.id}`),
          color: accentColor,
          icon: LayersIcon,
          current: current?.name,
          updatedAt: run.completedAt ?? run.createdAt,
        }
      }),
  ].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  )
  const scopeLabel = organization
    ? ` in ${organization.name}`
    : ` across ${network.name}`

  return (
    <div className="flex flex-1 flex-col gap-6 bg-muted/40 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-lg",
              tone.bg,
              tone.text
            )}
          >
            <HeaderIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {network.name}
              </h1>
              <StatusBadge status={network.status} />
              {network.industry ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {network.industry}
                </span>
              ) : network.summary ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {network.summary}
                </span>
              ) : null}
            </div>
            {network.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {network.description}
                {organization
                  ? ` Showing activity for ${organization.name}.`
                  : ""}
              </p>
            ) : organization ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Showing activity for {organization.name}.
              </p>
            ) : null}
            {(network.headquarters || network.coverage) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton
            onRefresh={refreshNetwork}
            isRefreshing={isRefreshing}
            size="icon"
          />
          <Button
            variant="outline"
            onClick={() =>
              organization
                ? openEditOrganization(organization.id)
                : openEditNetwork(network.id)
            }
          >
            <PencilIcon />
            {organization ? "Edit organization" : "Edit network"}
          </Button>
          <Button onClick={() => openCreateOrganization(network.id)}>
            <PlusIcon />
            Add organization
          </Button>
        </div>
      </div>

      <LoadingFrame isLoading={isRefreshing} className="rounded-xl">
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              to={href("organizations")}
              label="Organizations"
              value={network.organizations.length}
              live={organizationCounts.live}
              draft={organizationCounts.draft}
              liveLabel="active"
              color={accentColor}
              icon={Building2Icon}
            />
            <StatCard
              to={href("schemas")}
              label="Schemas"
              value={network.schemas.length}
              live={schemaCounts.live}
              draft={schemaCounts.draft}
              liveLabel="published"
              color={accentColor}
              icon={FileJsonIcon}
            />
            <StatCard
              to={href("records")}
              label="Records"
              value={scopedRecords.length}
              live={scopedRecords.length}
              draft={0}
              liveLabel="rows"
              color={accentColor}
              icon={TableIcon}
            />
            <StatCard
              to={href("files")}
              label="Files"
              value={scopedFiles.length}
              live={scopedFiles.length}
              draft={0}
              liveLabel="uploaded"
              color={accentColor}
              icon={FileIcon}
            />
            <StatCard
              to={href("workflows")}
              label="Workflows"
              value={runningWorkflows + queuedWorkflows}
              live={runningWorkflows}
              draft={queuedWorkflows}
              liveLabel="running"
              draftLabel="queued"
              color={accentColor}
              icon={PlayIcon}
            />
            <StatCard
              to={href("pipelines")}
              label="Pipelines"
              value={runningPipelines + queuedPipelines}
              live={runningPipelines}
              draft={queuedPipelines}
              liveLabel="running"
              draftLabel="queued"
              color={accentColor}
              icon={LayersIcon}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_22rem]">
            <ActivityChart
              data={activity}
              total={activityTotals.total}
              change={activityTotals.change}
              title="Network activity"
              description={`Records, files, and workflow runs${scopeLabel} over the last ${ACTIVITY_DAYS} days.`}
            />
            <RunStatusChart
              data={runStatusData}
              total={scopedWorkflows.length}
              description={`Run status${scopeLabel}.`}
            />
          </div>
        </div>
      </LoadingFrame>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Active now"
          description={`Live executions${scopeLabel}.`}
        />
        <LoadingFrame
          isLoading={isRunsFetching}
          className="min-h-24 rounded-xl"
        >
          {activeRuns.length > 0 ? (
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {activeRuns.slice(0, 6).map((run) => (
                <EntityCard
                  key={run.id}
                  to={run.href}
                  name={run.name}
                  status={run.status}
                  color={run.color}
                  icon={run.icon}
                  subtitle={`${run.kind}${run.current ? ` · ${run.current}` : ""} · ${formatRelativeTime(run.updatedAt)}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No workflows or pipelines are running right now.
            </p>
          )}
        </LoadingFrame>
      </section>
    </div>
  )
}
