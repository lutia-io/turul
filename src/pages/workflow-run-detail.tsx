import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  ArrowLeftIcon,
  Building2Icon,
  ChevronDownIcon,
  CircleAlertIcon,
  GalleryVerticalEndIcon,
  ListIcon,
  RotateCcwIcon,
  Table2Icon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import {
  AsideRow,
  CopyIdButton,
  DefinitionAsideCard,
  DefinitionPage,
  DefinitionStatusPage,
} from "@/components/definition-detail"
import { RunStatusPill } from "@/components/run-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { WorkflowNodesJournal } from "@/components/workflow-actions"
import { RunFlowMap } from "@/components/workflow-run/run-flow-map"
import { RunInspector } from "@/components/workflow-run/run-inspector"
import {
  allNodes,
  buildLevels,
  defaultSelection,
  formatAbsoluteTime,
  formatMs,
  retryCount,
  runElapsedMs,
  runNarrative,
  selectionOrder,
  stepStateLabel,
  stepStateTone,
  type LevelView,
} from "@/components/workflow-run/run-model"
import { RunTiming } from "@/components/workflow-run/run-timing"
import type { RunStatus } from "@/data/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
  useWorkspaceWorkflows,
} from "@/lib/network-workspace"
import { apiWorkflowStatus, formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { schemaFieldOptions } from "@/lib/workflow-definition"
import { getHumaErrorMessage, getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useGetWorkflowQuery,
  useListWorkflowNodesQuery,
  useRetryWorkflowMutation,
} from "@/store/workflow-slice"

const heroIconTone: Record<RunStatus, string> = {
  Succeeded:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  Failed: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400",
  Running: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/20 dark:text-cyan-400",
  Queued:
    "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
  Paused: "bg-muted text-muted-foreground ring-foreground/10",
}

export default function WorkflowRunDetail() {
  const { workflowRunId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { workflows } = useWorkspaceWorkflows()
  const { schemas } = useWorkspaceSchemas()
  const skipWorkflow = !isAuthenticated || !workflowRunId
  const workflowQuery = useGetWorkflowQuery(workflowRunId ?? "", {
    skip: skipWorkflow,
  })
  const live =
    workflowQuery.data?.status === "pending" ||
    workflowQuery.data?.status === "running"
  useGetWorkflowQuery(workflowRunId ?? "", {
    skip: skipWorkflow || !live,
    pollingInterval: 2000,
  })
  const nodesQuery = useListWorkflowNodesQuery(workflowRunId ?? "", {
    skip: skipWorkflow,
    pollingInterval: live ? 2000 : 0,
  })
  const [retryWorkflow, retryState] = useRetryWorkflowMutation()
  const [picked, setPicked] = useState<string>()
  const [showLog, setShowLog] = useState(false)
  const now = useNow(live)

  const workflow = workflowQuery.data
  const belongsToWorkspace =
    !workspaceNetwork ||
    (workflow?.networkId === workspaceNetwork.id &&
      (!organizationId || workflow.organizationId === organizationId))
  const resolved = belongsToWorkspace ? workflow : undefined
  const attempts = nodesQuery.data
  const levels = useMemo(
    () => (resolved ? buildLevels(resolved, attempts ?? []) : []),
    [resolved, attempts]
  )

  if (workflowQuery.isLoading) {
    return <WorkflowRunSkeleton />
  }

  if (workflowQuery.isError) {
    return (
      <DefinitionStatusPage
        {...getHumaLoadErrorCopy(workflowQuery.error, {
          resource: "Workflow run",
          notFoundMessage:
            "This workflow execution does not exist or is no longer available.",
        })}
        action={<BackToRunsButton to={href("workflows")} />}
      />
    )
  }

  if (!resolved || !workspaceNetwork) {
    return (
      <DefinitionStatusPage
        title="Workflow run not found"
        message="This workflow execution does not exist or is no longer available."
        action={<BackToRunsButton to={href("workflows")} />}
      />
    )
  }

  const definition = workflows.find(
    (item) => item.id === resolved.workflowDefinitionId
  )
  const organization = organizations.find(
    (item) => item.id === resolved.organizationId
  )
  const schema = definition?.schemaId
    ? schemas.find((item) => item.id === definition.schemaId)
    : undefined
  const fields = schemaFieldOptions(schema?.definition)
  const status = apiWorkflowStatus(resolved.status)
  const order = selectionOrder(levels)
  const selected =
    picked && order.includes(picked) ? picked : defaultSelection(levels)
  const nodes = allNodes(levels)
  const doneCount = levels.filter((level) => level.state === "done").length
  const retries = retryCount(levels)
  const failedNode = nodes.find((node) => node.state === "failed")
  const runError = resolved.error ?? failedNode?.attempts.at(-1)?.error
  const elapsed = formatMs(runElapsedMs(resolved, now))
  const recordHref = resolved.recordId
    ? href(`records/${resolved.recordId}`)
    : undefined

  return (
    <DefinitionPage>
      <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-8">
        <Link
          to={href("workflows")}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          All workflow runs
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl ring-1",
                heroIconTone[status]
              )}
            >
              <WorkflowIcon className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-pretty">
                  {definition?.name ?? "Workflow run"}
                </h1>
                <RunStatusPill status={status} />
              </div>
              <p className="max-w-3xl text-base text-pretty text-foreground/80">
                {runNarrative(resolved, levels, now)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {definition ? (
              <Button
                variant="outline"
                render={
                  <Link to={href(`workflow-definitions/${definition.id}`)} />
                }
              >
                <WorkflowIcon />
                Open workflow
              </Button>
            ) : null}
            {resolved.status === "failed" ? (
              <Button
                type="button"
                onClick={() => {
                  void retryWorkflow(resolved.id)
                }}
                disabled={retryState.isLoading}
                aria-busy={retryState.isLoading}
              >
                {retryState.isLoading ? (
                  <Spinner label="Retrying" />
                ) : (
                  <>
                    <RotateCcwIcon />
                    Retry run
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>

        {resolved.status === "failed" && (runError || retryState.isError) ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl bg-red-500/5 p-4 ring-1 ring-red-500/20"
          >
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0 space-y-1 text-sm">
              {runError ? (
                <p className="break-words text-red-700 dark:text-red-400">
                  {runError}
                </p>
              ) : null}
              {retryState.isError ? (
                <p className="text-destructive">
                  {getHumaErrorMessage(
                    retryState.error,
                    "Failed to retry workflow"
                  )}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Fix the cause, then retry. Steps that already finished won't
                  run again.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label={live ? "Running for" : "Duration"}
            value={status === "Queued" ? "—" : elapsed}
            hint={
              <span title={formatAbsoluteTime(resolved.createdAt)}>
                Started {formatRelativeTime(resolved.createdAt)}
              </span>
            }
          />
          <StatTile
            label="Steps"
            value={
              <>
                {doneCount}
                <span className="text-muted-foreground">/{levels.length}</span>
              </>
            }
            hint={<StepSegments levels={levels} />}
          />
          <StatTile
            label="Actions"
            value={nodes.length}
            hint={`${nodes.filter((node) => node.state === "done").length} finished`}
          />
          <StatTile
            label="Retries"
            value={retries}
            hint={
              retries === 0
                ? "None needed"
                : `Across ${nodes.filter((node) => node.attempts.length > 1).length} actions`
            }
          />
        </dl>
      </section>

      <RunFlowMap
        run={resolved}
        levels={levels}
        fields={fields}
        selected={selected}
        order={order}
        onSelect={setPicked}
      />

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <RunInspector
          run={resolved}
          levels={levels}
          fields={fields}
          selected={selected}
          order={order}
          onSelect={setPicked}
          recordHref={recordHref}
          fileHref={(fileId) => href(`files/${fileId}`)}
        />

        <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-6">
          <DefinitionAsideCard title="Details">
            <dl className="mt-4 space-y-4">
              <AsideRow label="Started">
                <span title={formatAbsoluteTime(resolved.createdAt)}>
                  {formatRelativeTime(resolved.createdAt)}
                </span>
              </AsideRow>
              {resolved.completedAt ? (
                <AsideRow label="Finished">
                  <span title={formatAbsoluteTime(resolved.completedAt)}>
                    {formatRelativeTime(resolved.completedAt)}
                  </span>
                </AsideRow>
              ) : null}
              {resolved.maxAttempts > 1 ? (
                <AsideRow label="Run attempts">
                  <span className="tabular-nums">
                    {resolved.attempts} of {resolved.maxAttempts}
                  </span>
                </AsideRow>
              ) : null}
              <AsideRow label="Workflow">
                {definition ? (
                  <AsideLink
                    to={href(`workflow-definitions/${definition.id}`)}
                    icon={WorkflowIcon}
                  >
                    {definition.name}
                  </AsideLink>
                ) : (
                  <span className="font-mono text-xs font-normal">
                    {resolved.workflowDefinitionId}
                  </span>
                )}
              </AsideRow>
              {recordHref ? (
                <AsideRow label="Record">
                  <AsideLink to={recordHref} icon={Table2Icon}>
                    {schema?.name ?? "View record"}
                  </AsideLink>
                </AsideRow>
              ) : null}
              {organization ? (
                <AsideRow label="Organization">
                  <AsideLink
                    to={href(`organization/${organization.id}`)}
                    icon={Building2Icon}
                  >
                    {organization.name}
                  </AsideLink>
                </AsideRow>
              ) : (
                <AsideRow label="Network">
                  <AsideLink
                    to={networkWorkspacePath({ networkId: resolved.networkId })}
                    icon={GalleryVerticalEndIcon}
                  >
                    {workspaceNetwork.name}
                  </AsideLink>
                </AsideRow>
              )}
              <AsideRow label="Run ID">
                <CopyIdButton value={resolved.id} />
              </AsideRow>
            </dl>
          </DefinitionAsideCard>
        </aside>
      </div>

      <RunTiming
        run={resolved}
        levels={levels}
        now={now}
        selected={selected}
        onSelect={setPicked}
      />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowLog((current) => !current)}
          aria-expanded={showLog}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ListIcon className="size-4" />
          {showLog ? "Hide raw attempt log" : "Show raw attempt log"}
          {attempts ? (
            <span className="tabular-nums">({attempts.length})</span>
          ) : null}
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform",
              showLog && "rotate-180"
            )}
          />
        </button>
        {showLog ? (
          <WorkflowNodesJournal
            workflowId={resolved.id}
            pollingInterval={live ? 2000 : 0}
          />
        ) : null}
      </div>
    </DefinitionPage>
  )
}

function useNow(live: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!live) {
      return
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [live])
  return now
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="min-w-0 rounded-xl bg-background px-4 py-3 ring-1 ring-foreground/10">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
      {hint ? (
        <dd className="mt-1 truncate text-xs text-muted-foreground">{hint}</dd>
      ) : null}
    </div>
  )
}

function StepSegments({ levels }: { levels: LevelView[] }) {
  if (levels.length === 0) {
    return "No steps"
  }
  return (
    <span className="flex h-4 items-center gap-1" aria-hidden>
      {levels.map((level) => (
        <span
          key={level.index}
          title={`Step ${level.index + 1}: ${stepStateLabel[level.state]}`}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            stepStateTone[level.state].bar
          )}
        />
      ))}
    </span>
  )
}

function AsideLink({
  to,
  icon: Icon,
  children,
}: {
  to: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className="inline-flex max-w-full items-center gap-1.5 hover:underline"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{children}</span>
    </Link>
  )
}

function BackToRunsButton({ to }: { to: string }) {
  return (
    <Button variant="outline" render={<Link to={to} />}>
      <ArrowLeftIcon />
      All workflow runs
    </Button>
  )
}

function WorkflowRunSkeleton() {
  return (
    <DefinitionPage>
      <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-8">
        <Skeleton className="h-3 w-28" />
        <div className="mt-4 flex items-start gap-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        <Skeleton className="h-5 w-16" />
        <div className="mt-6 flex items-center gap-4 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-56 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </DefinitionPage>
  )
}
