import type { ReactNode } from "react"
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
  PlayIcon,
  PlusIcon,
  TableIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { StatusBadge } from "@/components/json-definition-card"
import { Button, buttonVariants } from "@/components/ui/button"
import { files } from "@/data/files"
import { records } from "@/data/records"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  getPipelineStages,
  jsonSchemaPropertyCount,
  pipelineSourceLabel,
  publicationStatus,
} from "@/lib/json-definition"
import { workflowSummary } from "@/lib/workflow-definition"
import {
  formatRelativeTime,
  listPipelineRunViews,
  listWorkflowRunViews,
} from "@/lib/runs"
import {
  networkWorkspacePath,
  schemaScopeLabel,
  useNetworkWorkspace,
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

function AttentionCard({
  to,
  name,
  kind,
  status,
  color,
  icon: Icon,
}: {
  to: string
  name: string
  kind: string
  status?: string
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
          {status ? <StatusBadge status={status} /> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{kind}</p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

function QuickActionCard({
  to,
  onClick,
  label,
  description,
  color,
  icon: Icon,
}: {
  to?: string
  onClick?: () => void
  label: string
  description: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)
  const content = (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </>
  )
  const className =
    "group flex min-h-[72px] w-full items-center gap-3 rounded-xl border bg-background px-3 py-2.5 shadow-xs transition-colors hover:bg-muted/50"

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
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
  const { network, organization, organizationId, href } = useNetworkWorkspace()
  const {
    openCreateOrganization,
    openCreateSchema,
    openCreateWorkflow,
    openCreatePipeline,
    openCreateRecord,
    openCreateFile,
  } = useCreateEntity()

  if (!network) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h1 className="text-lg font-semibold">Network not found</h1>
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
  const scopedRecords = records.filter((record) => {
    if (record.networkId !== network.id) {
      return false
    }
    return !organizationId || record.organizationId === organizationId
  })
  const scopedFiles = files.filter((file) => {
    if (file.networkId !== network.id) {
      return false
    }
    return !organizationId || file.organizationId === organizationId
  })
  const workflowViews = listWorkflowRunViews({
    networkId: network.id,
    organizationId,
  })
  const pipelineViews = listPipelineRunViews({
    networkId: network.id,
    organizationId,
  })
  const runningWorkflows = workflowViews.filter(
    (view) => view.run.status === "Running"
  ).length
  const queuedWorkflows = workflowViews.filter(
    (view) => view.run.status === "Queued"
  ).length
  const runningPipelines = pipelineViews.filter(
    (view) => view.run.status === "Running"
  ).length
  const queuedPipelines = pipelineViews.filter(
    (view) => view.run.status === "Queued"
  ).length
  const organizationCounts = countByStatus(
    network.organizations,
    (item) => item.status
  )
  const schemaCounts = countByStatus(network.schemas, (schema) =>
    publicationStatus(schema.active)
  )
  const attentionItems = [
    ...network.schemas
      .filter((schema) => !schema.active)
      .map((schema) => ({
        id: schema.id,
        name: schema.name,
        kind: "Schema",
        to: href(`schemas/${schema.id}`),
        color: accentColor,
        icon: FileJsonIcon,
      })),
    ...network.workflowDefinitions
      .filter((workflowDefinition) => !workflowDefinition.active)
      .map((workflowDefinition) => ({
        id: workflowDefinition.id,
        name: workflowDefinition.name,
        kind: "Workflow definition",
        to: href(`workflow-definitions/${workflowDefinition.id}`),
        color: accentColor,
        icon: WorkflowIcon,
      })),
    ...network.pipelineDefinitions
      .filter((pipelineDefinition) => !pipelineDefinition.active)
      .map((pipelineDefinition) => ({
        id: pipelineDefinition.id,
        name: pipelineDefinition.name,
        kind: "Pipeline definition",
        to: href(`pipeline-definitions/${pipelineDefinition.id}`),
        color: accentColor,
        icon: LayersIcon,
      })),
  ]
  const activeRuns = [
    ...listWorkflowRunViews({
      networkId: network.id,
      organizationId,
      filter: "active",
    }).map((view) => ({
      id: view.run.id,
      name: view.definition.name,
      kind: "Workflow",
      status: view.run.status,
      href: href(`workflows/${view.run.id}`),
      color: accentColor,
      icon: PlayIcon,
      current: view.current?.name,
      updatedAt: view.run.updatedAt,
    })),
    ...listPipelineRunViews({
      networkId: network.id,
      organizationId,
      filter: "active",
    }).map((view) => ({
      id: view.run.id,
      name: view.definition.name,
      kind: "Pipeline",
      status: view.run.status,
      href: href(`pipelines/${view.run.id}`),
      color: accentColor,
      icon: LayersIcon,
      current: view.current?.name,
      updatedAt: view.run.updatedAt,
    })),
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
        <Button onClick={() => openCreateOrganization(network.id)}>
          <PlusIcon />
          Add organization
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          to="#organizations"
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section id="organizations" className="flex flex-col gap-3">
            <SectionHeader
              title="Organizations"
              description={`Members of the ${network.name} network.`}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCreateOrganization(network.id)}
                >
                  <PlusIcon />
                  Add
                </Button>
              }
            />
            {network.organizations.length > 0 ? (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {network.organizations.map((item) => (
                  <EntityCard
                    key={item.id}
                    to={networkWorkspacePath({
                      networkId: network.id,
                      organizationId: item.id,
                    })}
                    name={item.name}
                    status={item.status}
                    color={item.color}
                    icon={Building2Icon}
                    subtitle={
                      [item.type, item.location].filter(Boolean).join(" · ") ||
                      "Organization"
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No organizations yet. Add one to start collaborating in this
                network.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeader
              title="Definitions"
              description={`Schemas and automation used by ${network.name}.`}
            />
            <div className="grid gap-3 lg:grid-cols-3">
              <DefinitionColumn
                title="Schemas"
                viewAll={href("schemas")}
                onAdd={() =>
                  openCreateSchema({
                    networkId: network.id,
                    organizationId,
                  })
                }
                empty="No schemas yet."
                items={network.schemas.map((schema) => ({
                  id: schema.id,
                  name: schema.name,
                  subtitle: `${schemaScopeLabel(schema, network.organizations)} · ${jsonSchemaPropertyCount(schema.definition)} properties`,
                  status: publicationStatus(schema.active),
                  color: accentColor,
                  icon: FileJsonIcon,
                  to: href(`schemas/${schema.id}`),
                }))}
              />
              <DefinitionColumn
                title="Workflows"
                viewAll={href("workflow-definitions")}
                onAdd={() => openCreateWorkflow(network.id)}
                empty="No workflow definitions yet."
                items={network.workflowDefinitions.map(
                  (workflowDefinition) => ({
                    id: workflowDefinition.id,
                    name: workflowDefinition.name,
                    subtitle: workflowSummary(workflowDefinition.definition),
                    status: publicationStatus(workflowDefinition.active),
                    color: accentColor,
                    icon: WorkflowIcon,
                    to: href(`workflow-definitions/${workflowDefinition.id}`),
                  })
                )}
              />
              <DefinitionColumn
                title="Pipelines"
                viewAll={href("pipeline-definitions")}
                onAdd={() => openCreatePipeline(network.id)}
                empty="No pipeline definitions yet."
                items={network.pipelineDefinitions.map(
                  (pipelineDefinition) => ({
                    id: pipelineDefinition.id,
                    name: pipelineDefinition.name,
                    subtitle: `${pipelineSourceLabel(pipelineDefinition.definition)} · ${getPipelineStages(pipelineDefinition.definition).length} stages`,
                    status: publicationStatus(pipelineDefinition.active),
                    color: accentColor,
                    icon: LayersIcon,
                    to: href(`pipeline-definitions/${pipelineDefinition.id}`),
                  })
                )}
              />
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <SectionHeader
              title="Active now"
              description={`Live executions${scopeLabel}.`}
            />
            {activeRuns.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeRuns.slice(0, 6).map((run) => {
                  const runTone = getBadgeColor(run.color)
                  return (
                    <Link
                      key={run.id}
                      to={run.href}
                      className="group flex min-h-[72px] items-center gap-3 rounded-xl border bg-background px-3 py-2.5 shadow-xs transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg",
                          runTone.bg,
                          runTone.text
                        )}
                      >
                        <run.icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">
                            {run.name}
                          </p>
                          <StatusBadge status={run.status} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {run.kind}
                          {run.current ? ` · ${run.current}` : ""} ·{" "}
                          {formatRelativeTime(run.updatedAt)}
                        </p>
                      </div>
                      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No workflows or pipelines are running right now.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeader
              title="Needs attention"
              description="Draft definitions that are not yet published."
            />
            {attentionItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {attentionItems.map((item) => (
                  <AttentionCard
                    key={item.id}
                    to={item.to}
                    name={item.name}
                    kind={item.kind}
                    status="Draft"
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
            <SectionHeader
              title="Quick actions"
              description="Jump into a common setup task."
            />
            <div className="flex flex-col gap-2">
              <QuickActionCard
                onClick={() =>
                  openCreateSchema({
                    networkId: network.id,
                    organizationId,
                  })
                }
                label="Create schema"
                description="Define a JSONB record shape"
                color={accentColor}
                icon={FileJsonIcon}
              />
              <QuickActionCard
                onClick={() =>
                  openCreateRecord({
                    networkId: network.id,
                    organizationId,
                  })
                }
                label="Add a record"
                description="Capture a row against a schema"
                color={accentColor}
                icon={TableIcon}
              />
              <QuickActionCard
                onClick={() =>
                  openCreateFile({
                    networkId: network.id,
                    organizationId,
                  })
                }
                label="Upload a file"
                description="Attach a document to this network"
                color={accentColor}
                icon={FileIcon}
              />
              <QuickActionCard
                to={href("workflows")}
                label="Open workflows"
                description="Live executions in flight"
                color={accentColor}
                icon={PlayIcon}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function DefinitionColumn({
  title,
  viewAll,
  onAdd,
  empty,
  items,
}: {
  title: string
  viewAll: string
  onAdd: () => void
  empty: string
  items: {
    id: string
    name: string
    subtitle: string
    status: string
    color: BadgeColor
    icon: LucideIcon
    to: string
  }[]
}) {
  const preview = items.slice(0, 4)
  const remaining = items.length - preview.length

  return (
    <div className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onAdd}>
            <PlusIcon />
            <span className="sr-only">Add {title.toLowerCase()}</span>
          </Button>
          <Link
            to={viewAll}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ArrowRightIcon />
            <span className="sr-only">View all {title.toLowerCase()}</span>
          </Link>
        </div>
      </div>
      {preview.length > 0 ? (
        <div className="flex flex-col gap-2">
          {preview.map((item) => (
            <AttentionCard
              key={item.id}
              to={item.to}
              name={item.name}
              kind={item.subtitle}
              status={item.status}
              color={item.color}
              icon={item.icon}
            />
          ))}
          {remaining > 0 ? (
            <Link
              to={viewAll}
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              +{remaining} more
              <ArrowRightIcon className="size-3.5" />
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}
