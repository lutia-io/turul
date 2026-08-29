import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  Building2Icon,
  CheckIcon,
  CopyIcon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  WorkflowIcon,
} from "lucide-react"

import { JsonDefinitionCard } from "@/components/json-definition-card"
import { RunStatusPill } from "@/components/run-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkflowActionsJournal } from "@/components/workflow-actions"
import type { RunStatus } from "@/data/runs"
import type { DefinitionStep } from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceWorkflows,
} from "@/lib/network-workspace"
import {
  apiWorkflowCurrentStep,
  apiWorkflowStatus,
  apiWorkflowSteps,
  formatRelativeTime,
  formatRunDuration,
  runProgress,
} from "@/lib/runs"
import { cn } from "@/lib/utils"
import { parseWorkflowDefinition } from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetWorkflowQuery } from "@/store/workflow-slice"

type DataView = "steps" | "json"

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
  const progress = resolved ? runProgress(currentStep, steps.length, status) : 0
  const [dataView, setDataView] = useState<DataView>("steps")

  if (workflowQuery.isLoading) {
    return <WorkflowRunSkeleton />
  }

  if (workflowQuery.isError) {
    return (
      <WorkflowRunStatusPage
        title="Workflow run not found"
        message={getHumaErrorMessage(
          workflowQuery.error,
          "This workflow execution does not exist or is no longer available."
        )}
        destructive
      />
    )
  }

  if (!resolved || !workspaceNetwork) {
    return (
      <WorkflowRunStatusPage
        title="Workflow run not found"
        message="This workflow execution does not exist or is no longer available."
      />
    )
  }

  const duration = formatRunDuration({
    startedAt: resolved.createdAt,
    finishedAt: resolved.completedAt ?? undefined,
    status,
  })

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Workflow run
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-pretty">
              {definition?.name ?? "Workflow"}
            </h1>
            <RunStatusPill status={status} />
          </div>
          {resolved.error ? (
            <p className="max-w-2xl text-sm text-red-700 dark:text-red-400">
              {resolved.error}
            </p>
          ) : null}
        </div>
        {resolved.data ? (
          <Button
            type="button"
            variant={dataView === "json" ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              setDataView((view) => (view === "steps" ? "json" : "steps"))
            }
          >
            <FileJsonIcon />
            {dataView === "json" ? "Steps" : "JSON"}
          </Button>
        ) : null}
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {dataView === "json" && resolved.data ? (
            <JsonDefinitionCard
              definition={resolved.data}
              label="Trigger record"
              description="Record data captured when this workflow started."
            />
          ) : (
            <section className="min-w-0 rounded-2xl bg-card p-6 shadow-xs ring-1 ring-foreground/10 sm:p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium">Steps</h2>
                  <p className="text-sm text-muted-foreground">
                    {steps.length === 0
                      ? "This definition has no actions."
                      : `${progress}% complete`}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {Math.min(currentStep, steps.length)}/{steps.length}
                </p>
              </div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    status === "Failed" ? "bg-red-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {steps.length > 0 ? (
                <ol className="mt-8">
                  {steps.map((step, index) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      status={status}
                      currentStep={currentStep}
                      last={index === steps.length - 1}
                    />
                  ))}
                </ol>
              ) : null}
            </section>
          )}

          {dataView === "steps" ? (
            <WorkflowActionsJournal workflowId={resolved.id} steps={steps} />
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-6">
          <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Details
            </h2>
            <dl className="mt-4 space-y-4">
              <AsideRow label="Progress">
                <span className="tabular-nums">{progress}%</span>
              </AsideRow>
              <AsideRow label="Started">
                {formatRelativeTime(resolved.createdAt)}
              </AsideRow>
              <AsideRow label="Duration">{duration}</AsideRow>
              {definition ? (
                <AsideRow label="Definition">
                  <Link
                    to={href(`workflow-definitions/${definition.id}`)}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <WorkflowIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{definition.name}</span>
                  </Link>
                </AsideRow>
              ) : (
                <AsideRow label="Definition">
                  <span className="font-mono text-xs font-normal">
                    {resolved.workflowDefinitionId}
                  </span>
                </AsideRow>
              )}
              {organization ? (
                <AsideRow label="Organization">
                  <Link
                    to={networkWorkspacePath({
                      networkId: resolved.networkId,
                      organizationId: organization.id,
                    })}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{organization.name}</span>
                  </Link>
                </AsideRow>
              ) : (
                <AsideRow label="Network">
                  <Link
                    to={networkWorkspacePath({
                      networkId: resolved.networkId,
                    })}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <GalleryVerticalEndIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{workspaceNetwork.name}</span>
                  </Link>
                </AsideRow>
              )}
              <AsideRow label="ID">
                <CopyIdButton value={resolved.id} />
              </AsideRow>
            </dl>
            <Link
              to={href("workflows")}
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all workflow runs
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}

function StepRow({
  step,
  status,
  currentStep,
  last,
}: {
  step: DefinitionStep
  status: RunStatus
  currentStep: number
  last: boolean
}) {
  const isCurrent = step.order === currentStep
  const isDone =
    status === "Succeeded" || (currentStep > 0 && step.order < currentStep)
  const isFailed = status === "Failed" && isCurrent
  const label = isFailed
    ? "Failed"
    : isCurrent && status === "Running"
      ? "In progress"
      : isDone
        ? "Complete"
        : status === "Queued"
          ? "Queued"
          : "Pending"

  return (
    <li className="relative flex gap-3.5">
      {last ? null : (
        <span
          className={cn(
            "absolute top-8 bottom-0 left-[15px] w-px",
            isDone && !isFailed ? "bg-emerald-500/40" : "bg-border"
          )}
        />
      )}
      <span
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium",
          isFailed && "bg-red-500 text-white",
          isDone && !isFailed && "bg-emerald-500 text-white",
          isCurrent &&
            status === "Running" &&
            "bg-emerald-500 text-white ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-card",
          !isDone && !isCurrent && "bg-muted text-muted-foreground"
        )}
      >
        {step.order}
      </span>
      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        <p className="truncate text-sm font-medium">{step.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {step.type}
          {` · ${label}`}
        </p>
      </div>
    </li>
  )
}

function WorkflowRunSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="mt-4 h-1 w-full rounded-full" />
          <div className="mt-8 space-y-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex gap-3.5">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <Skeleton className="h-3 w-16" />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkflowRunStatusPage({
  title,
  message,
  destructive,
}: {
  title: string
  message: string
  destructive?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p
          className={cn(
            "text-sm",
            destructive ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

function AsideRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{children}</dd>
    </div>
  )
}

function CopyIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copyId() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copyId}
      className="inline-flex max-w-full items-center gap-1.5 font-mono text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <CheckIcon className="size-3.5 shrink-0" />
      ) : (
        <CopyIcon className="size-3.5 shrink-0" />
      )}
    </button>
  )
}
