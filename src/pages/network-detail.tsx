import { useMemo } from "react"
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
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { StatusBadge } from "@/components/json-definition-card"
import { RefreshButton } from "@/components/refresh-button"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { OutcomeChart, VolumeChart } from "@/components/workspace-charts"
import {
  DashboardHeader,
  DashboardPage,
  DashboardSection,
  MetricGrid,
  SnapshotChip,
  countByStatus,
} from "@/components/workspace-dashboard"
import {
  ACTIVITY_DAYS,
  bucketActivity,
  bucketRunOutcomes,
  summarizeActivity,
  topVolumeRows,
} from "@/lib/activity"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  apiPipelineCurrentLevel,
  apiPipelineLevelSteps,
  apiPipelineStatus,
  apiWorkflowCurrentStep,
  apiWorkflowStatus,
  apiWorkflowSteps,
  countWorkflowRunStatuses,
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
import { userDisplayName } from "@/lib/user"
import { cn } from "@/lib/utils"

function PulseRow({
  to,
  name,
  subtitle,
  color,
  icon: Icon,
  status,
}: {
  to: string
  name: string
  subtitle: string
  color: BadgeColor
  icon: LucideIcon
  status?: string
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-h-[56px] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
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
          {status ? <StatusBadge status={status} /> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

function ActiveBoardCard({
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
  status: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-h-[92px] min-w-0 items-center gap-3.5 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate font-medium">{name}</p>
          <span className="shrink-0">
            <StatusBadge status={status} />
          </span>
        </div>
        <p className="text-sm text-muted-foreground sm:truncate">{subtitle}</p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
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
  const { openCreateOrganization, openEditNetwork, openEditOrganization } =
    useCreateEntity()

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
    isPipelineRunsFetching ||
    isOrganizationsFetching

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
  const workflowCounts = useMemo(
    () => countWorkflowRunStatuses(scopedWorkflows),
    [scopedWorkflows]
  )
  const pipelineCounts = useMemo(
    () => countWorkflowRunStatuses(scopedPipelines),
    [scopedPipelines]
  )
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

  if (!network) {
    return (
      <DashboardPage>
        <DashboardHeader
          title="Network not found"
          description="This network does not exist or is no longer available."
          actions={
            <RefreshButton
              onRefresh={refreshNetwork}
              isRefreshing={isRefreshing}
              size="icon"
            />
          }
        />
        <Link
          to="/app/networks"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to all networks
        </Link>
      </DashboardPage>
    )
  }

  const accentColor = organization?.color ?? network.color
  const HeaderIcon = organization ? Building2Icon : GalleryVerticalEndIcon
  const organizationCounts = countByStatus(
    network.organizations,
    (item) => item.status
  )
  const liveRunning = workflowCounts.running + pipelineCounts.running
  const liveQueued = workflowCounts.pending + pipelineCounts.pending
  const liveFailed = workflowCounts.failed + pipelineCounts.failed
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
  const attentionItems = [
    ...scopedWorkflows
      .filter((run) => apiWorkflowStatus(run.status) === "Failed")
      .map((run) => {
        const definition = network.workflowDefinitions.find(
          (item) => item.id === run.workflowDefinitionId
        )
        return {
          id: `wf-${run.id}`,
          name: definition?.name ?? "Workflow run",
          kind: "Failed run",
          to: href(`workflows/${run.id}`),
          color: "red" as const,
          icon: WorkflowIcon,
          status: "Failed",
        }
      }),
    ...scopedPipelines
      .filter((run) => apiPipelineStatus(run.status) === "Failed")
      .map((run) => {
        const definition = network.pipelineDefinitions.find(
          (item) => item.id === run.pipelineDefinitionId
        )
        return {
          id: `pl-${run.id}`,
          name: definition?.name ?? "Pipeline run",
          kind: "Failed run",
          to: href(`pipelines/${run.id}`),
          color: "red" as const,
          icon: LayersIcon,
          status: "Failed",
        }
      }),
    ...network.workflowDefinitions
      .filter((item) => !item.active)
      .map((item) => ({
        id: item.id,
        name: item.name,
        kind: "Workflow",
        to: href(`workflow-definitions/${item.id}`),
        color: "teal" as const,
        icon: WorkflowIcon,
        status: "Draft",
      })),
    ...network.pipelineDefinitions
      .filter((item) => !item.active)
      .map((item) => ({
        id: item.id,
        name: item.name,
        kind: "Pipeline",
        to: href(`pipeline-definitions/${item.id}`),
        color: "pink" as const,
        icon: LayersIcon,
        status: "Draft",
      })),
  ]
  const scopeLabel = organization
    ? ` in ${organization.name}`
    : ` across ${network.name}`
  const attributionSubject = organization ?? network
  const createdByName = userDisplayName(attributionSubject.createdBy)
  const updatedByName = userDisplayName(attributionSubject.updatedBy)
  const previewOrgs = organization ? [] : network.organizations.slice(0, 6)
  const outcomes = bucketRunOutcomes([...scopedWorkflows, ...scopedPipelines])
  const volumeByOrg = topVolumeRows(
    network.organizations.map((item) => ({
      name: item.name,
      records: scopedRecords.filter(
        (record) => record.organizationId === item.id
      ).length,
      files: scopedFiles.filter((file) => file.organizationId === item.id)
        .length,
      runs: [...scopedWorkflows, ...scopedPipelines].filter(
        (run) => run.organizationId === item.id
      ).length,
    }))
  )
  const volumeBySchema = topVolumeRows(
    network.schemas.map((schema) => ({
      name: schema.name,
      records: scopedRecords.filter((record) => record.schemaId === schema.id)
        .length,
      files: 0,
      runs: 0,
    })),
    8
  )

  return (
    <DashboardPage tone="network">
      <div className="-mx-4 -mt-4 border-b bg-background px-4 py-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-6">
        <DashboardHeader
          eyebrow={organization ? "Organization" : "Network"}
          icon={HeaderIcon}
          color={accentColor}
          title={organization?.name ?? network.name}
          badges={
            <>
              <StatusBadge status={organization?.status ?? network.status} />
              {network.industry ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {network.industry}
                </span>
              ) : network.summary ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {network.summary}
                </span>
              ) : null}
            </>
          }
          description={
            <>
              {network.description ? (
                <p>
                  {network.description}
                  {organization
                    ? ` Showing activity for ${organization.name}.`
                    : ""}
                </p>
              ) : organization ? (
                <p>Showing activity for {organization.name}.</p>
              ) : null}
              {network.headquarters || network.coverage ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
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
              {attributionSubject.createdAt ? (
                <p className="mt-2">
                  Created {formatRelativeTime(attributionSubject.createdAt)}
                  {createdByName ? ` by ${createdByName}` : ""}
                  {attributionSubject.updatedAt &&
                  attributionSubject.updatedAt !==
                    attributionSubject.createdAt ? (
                    <>
                      {" "}
                      · Updated{" "}
                      {formatRelativeTime(attributionSubject.updatedAt)}
                      {updatedByName ? ` by ${updatedByName}` : ""}
                    </>
                  ) : null}
                </p>
              ) : null}
            </>
          }
          chips={
            <>
              <SnapshotChip
                kind="running"
                value={liveRunning}
                label="running"
              />
              <SnapshotChip kind="queued" value={liveQueued} label="queued" />
              <SnapshotChip kind="failed" value={liveFailed} label="failed" />
            </>
          }
          actions={
            <>
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
            </>
          }
        />
      </div>

      <MetricGrid
        items={[
          {
            to: href("organizations"),
            label: "Organizations",
            value: network.organizations.length,
            detail:
              organizationCounts.draft > 0
                ? `${organizationCounts.live} active · ${organizationCounts.draft} draft`
                : `${organizationCounts.live} active`,
            color: accentColor,
            icon: Building2Icon,
          },
          {
            to: href("schemas"),
            label: "Schemas",
            value: network.schemas.length,
            detail: `${network.schemas.length} defined`,
            color: "blue",
            icon: FileJsonIcon,
          },
          {
            to: href("records"),
            label: "Records",
            value: scopedRecords.length,
            detail: `${activityTotals.recordsThisWeek} created this week`,
            color: "cyan",
            icon: TableIcon,
          },
          {
            to: href("files"),
            label: "Files",
            value: scopedFiles.length,
            detail: `${activityTotals.filesThisWeek} uploaded this week`,
            color: "gray",
            icon: FileIcon,
          },
          {
            to: href("workflows"),
            label: "Workflows",
            value: scopedWorkflows.length,
            detail:
              workflowCounts.failed > 0
                ? `${workflowCounts.running} running · ${workflowCounts.failed} failed`
                : `${workflowCounts.running} running · ${workflowCounts.pending} queued`,
            color: "teal",
            icon: PlayIcon,
          },
          {
            to: href("pipelines"),
            label: "Pipelines",
            value: scopedPipelines.length,
            detail: `${pipelineCounts.running} running · ${pipelineCounts.pending} queued`,
            color: "pink",
            icon: LayersIcon,
          },
        ]}
      />

      <div
        className={cn(
          "grid gap-4",
          organization ? "xl:grid-cols-2" : undefined
        )}
      >
        <OutcomeChart
          data={outcomes}
          title="Run outcomes"
          description={`Finished workflow and pipeline runs${scopeLabel} over the last ${ACTIVITY_DAYS} days.`}
        />
        {organization ? (
          <VolumeChart
            data={volumeBySchema}
            title="Records by schema"
            description={`Rows in ${organization.name}, grouped by schema.`}
            series={["records"]}
            emptyLabel="No records in this organization yet."
          />
        ) : null}
      </div>

      {organization ? null : (
        <div className="grid gap-4 xl:grid-cols-2">
          <VolumeChart
            data={volumeByOrg}
            title="Volume by organization"
            description={`Records, files, and runs${scopeLabel}.`}
            emptyLabel="No organization volume yet."
          />
          <VolumeChart
            data={volumeBySchema}
            title="Records by schema"
            description={`Which shared forms hold the rows${scopeLabel}.`}
            series={["records"]}
            emptyLabel="No records in these schemas yet."
          />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <DashboardSection
          title="Active now"
          description={`Live operations board${scopeLabel}.`}
          action={
            <Link
              to={href("workflows")}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View
              <ArrowRightIcon />
            </Link>
          }
        >
          {activeRuns.length > 0 ? (
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {activeRuns.slice(0, 6).map((run) => (
                <ActiveBoardCard
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
            <Card size="sm">
              <CardContent>
                <p className="py-2 text-sm text-muted-foreground">
                  No workflows or pipelines are running right now.
                </p>
              </CardContent>
            </Card>
          )}
        </DashboardSection>

        <aside className="flex min-w-0 flex-col gap-4">
          {previewOrgs.length > 0 ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
                <CardDescription>
                  Teams writing to this network.
                </CardDescription>
                <CardAction>
                  <Link
                    to={href("organizations")}
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
                <div className="flex flex-col divide-y">
                  {previewOrgs.map((item) => (
                    <PulseRow
                      key={item.id}
                      to={networkWorkspacePath({
                        networkId: network.id,
                        organizationId: item.id,
                      })}
                      name={item.name}
                      subtitle={[item.type, item.location]
                        .filter(Boolean)
                        .join(" · ")}
                      color={item.color}
                      icon={Building2Icon}
                      status={item.status}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

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
                    <PulseRow
                      key={item.id}
                      to={item.to}
                      name={item.name}
                      subtitle={item.kind}
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
        </aside>
      </div>
    </DashboardPage>
  )
}
