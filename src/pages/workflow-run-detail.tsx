import { Link, useParams } from "react-router"
import {
  Building2Icon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  WorkflowIcon,
} from "lucide-react"

import { JsonDefinitionCard } from "@/components/json-definition-card"
import { RunStatusBadge } from "@/components/run-card"
import { WorkflowActionsJournal } from "@/components/workflow-actions"
import { getBadgeColor } from "@/lib/badge"
import {
  apiWorkflowCurrentStep,
  apiWorkflowStatus,
  apiWorkflowSteps,
  formatRelativeTime,
  formatRunDuration,
  runProgress,
} from "@/lib/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceWorkflows,
} from "@/lib/network-workspace"
import { parseWorkflowDefinition } from "@/lib/workflow-definition"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetWorkflowQuery } from "@/store/workflow-slice"

export default function WorkflowRunDetail() {
  const { workflowRunId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network: workspaceNetwork, organizationId } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { workflows } = useWorkspaceWorkflows()
  const workflowQuery = useGetWorkflowQuery(workflowRunId ?? "", {
    skip: !isAuthenticated || !workflowRunId,
  })
  const workflow = workflowQuery.data
  const belongsToWorkspace =
    !workspaceNetwork ||
    (workflow?.networkId === workspaceNetwork.id &&
      (!organizationId || workflow.organizationId === organizationId))
  const resolved = belongsToWorkspace ? workflow : undefined
  const definition = resolved
    ? workflows.find((item) => item.id === resolved.workflowDefinitionId)
    : undefined
  const organization = resolved
    ? organizations.find((item) => item.id === resolved.organizationId)
    : undefined
  const parsed = resolved
    ? parseWorkflowDefinition(resolved.definition)
    : undefined
  const steps = apiWorkflowSteps(parsed)
  const status = resolved ? apiWorkflowStatus(resolved.status) : "Queued"
  const currentStep = resolved ? apiWorkflowCurrentStep(resolved) : 0
  const tone = getBadgeColor("teal")
  const progress = resolved ? runProgress(currentStep, steps.length, status) : 0

  if (workflowQuery.isLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Loading workflow</h1>
        <p className="text-sm text-muted-foreground">
          Fetching this workflow execution from the server.
        </p>
      </div>
    )
  }

  if (workflowQuery.isError) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Workflow run not found</h1>
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(
            workflowQuery.error,
            "This workflow execution does not exist or is no longer available."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {resolved && workspaceNetwork ? (
        <>
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <WorkflowIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {definition?.name ?? "Workflow"}
                </h1>
                <RunStatusBadge status={status} />
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {status}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {resolved.id}
              </p>
              {resolved.error ? (
                <p className="text-sm text-red-700 dark:text-red-400">
                  {resolved.error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {progress}%
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="mt-1 font-medium">
                {formatRelativeTime(resolved.createdAt)}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="mt-1 font-medium">
                {formatRunDuration({
                  startedAt: resolved.createdAt,
                  finishedAt: resolved.completedAt ?? undefined,
                  status,
                })}
              </p>
            </div>
          </div>

          <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Steps</h2>
              <p className="text-sm text-muted-foreground">
                Execution progress against the workflow definition.
              </p>
            </div>
            <ol className="flex flex-col gap-2">
              {steps.map((step) => {
                const isCurrent = step.order === currentStep
                const isDone =
                  status === "Succeeded" ||
                  (currentStep > 0 && step.order < currentStep)
                const isFailed = status === "Failed" && isCurrent

                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3",
                      isCurrent || isFailed
                        ? "border-foreground/15 bg-background"
                        : "bg-background/60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-medium",
                        isFailed && "bg-red-500 text-white",
                        isCurrent && !isFailed && "bg-cyan-500 text-cyan-950",
                        isDone && !isCurrent && "bg-emerald-500 text-white",
                        !isDone && !isCurrent && "bg-muted"
                      )}
                    >
                      {step.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{step.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {step.type}
                        {isFailed
                          ? " · failed"
                          : isCurrent && status === "Running"
                            ? " · in progress"
                            : isDone
                              ? " · complete"
                              : status === "Queued"
                                ? " · queued"
                                : " · pending"}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          <WorkflowActionsJournal workflowId={resolved.id} steps={steps} />

          {resolved.data ? (
            <JsonDefinitionCard
              definition={resolved.data}
              label="Trigger record"
              description="Record data captured when this workflow started."
            />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {definition ? (
              <Link
                to={networkWorkspacePath({
                  networkId: resolved.networkId,
                  rest: `workflow-definitions/${definition.id}`,
                })}
                className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileJsonIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Definition</p>
                  <p className="truncate font-medium">{definition.name}</p>
                </div>
              </Link>
            ) : (
              <div className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileJsonIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Definition</p>
                  <p className="truncate font-mono text-sm font-medium">
                    {resolved.workflowDefinitionId}
                  </p>
                </div>
              </div>
            )}
            {organization ? (
              <Link
                to={networkWorkspacePath({
                  networkId: resolved.networkId,
                  organizationId: organization.id,
                })}
                className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="truncate font-medium">{organization.name}</p>
                </div>
              </Link>
            ) : (
              <Link
                to={networkWorkspacePath({ networkId: resolved.networkId })}
                className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <GalleryVerticalEndIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Network</p>
                  <p className="truncate font-medium">
                    {workspaceNetwork.name}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">Workflow run not found</h1>
          <p className="text-sm text-muted-foreground">
            This workflow execution does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
