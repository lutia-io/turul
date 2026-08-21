import { Link, useParams } from "react-router"
import {
  Building2Icon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  LayersIcon,
} from "lucide-react"

import { RunStatusBadge } from "@/components/run-card"
import { getBadgeColor } from "@/lib/badge"
import {
  formatRelativeTime,
  formatRunDuration,
  getPipelineRunView,
  runProgress,
} from "@/lib/runs"
import { getPipelineRun } from "@/data/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"

export default function PipelineRunDetail() {
  const { pipelineRunId } = useParams()
  const { network: workspaceNetwork } = useNetworkWorkspace()
  const run = pipelineRunId ? getPipelineRun(pipelineRunId) : undefined
  const view = run ? getPipelineRunView(run) : undefined
  const belongsToWorkspace =
    !workspaceNetwork || view?.network.id === workspaceNetwork.id
  const resolved = belongsToWorkspace ? view : undefined
  const tone = getBadgeColor("pink")
  const progress = resolved
    ? runProgress(
        resolved.run.currentStage,
        resolved.stages.length,
        resolved.run.status
      )
    : 0

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {resolved ? (
        <>
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <LayersIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {resolved.definition.name}
                </h1>
                <RunStatusBadge status={resolved.run.status} />
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {resolved.run.status}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {resolved.run.id}
              </p>
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
                {formatRelativeTime(resolved.run.startedAt)}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="mt-1 font-medium">
                {formatRunDuration(resolved.run)}
              </p>
            </div>
          </div>

          <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Stages</h2>
              <p className="text-sm text-muted-foreground">
                Execution progress against the pipeline definition.
              </p>
            </div>
            <ol className="flex flex-col gap-2">
              {resolved.stages.map((stage) => {
                const isCurrent = stage.order === resolved.run.currentStage
                const isDone =
                  resolved.run.status === "Succeeded" ||
                  (resolved.run.currentStage > 0 &&
                    stage.order < resolved.run.currentStage)
                const isFailed = resolved.run.status === "Failed" && isCurrent

                return (
                  <li
                    key={stage.id}
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
                        isCurrent && !isFailed && "bg-pink-500 text-white",
                        isDone && !isCurrent && "bg-emerald-500 text-white",
                        !isDone && !isCurrent && "bg-muted"
                      )}
                    >
                      {stage.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{stage.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {stage.type}
                        {isFailed
                          ? " · failed"
                          : isCurrent && resolved.run.status === "Running"
                            ? " · in progress"
                            : isDone
                              ? " · complete"
                              : resolved.run.status === "Queued"
                                ? " · queued"
                                : " · pending"}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to={networkWorkspacePath({
                networkId: resolved.network.id,
                rest: `pipeline-definitions/${resolved.definition.id}`,
              })}
              className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileJsonIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Definition</p>
                <p className="truncate font-medium">
                  {resolved.definition.name}
                </p>
              </div>
            </Link>
            {resolved.organization ? (
              <Link
                to={networkWorkspacePath({
                  networkId: resolved.network.id,
                  organizationId: resolved.organization.id,
                })}
                className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="truncate font-medium">
                    {resolved.organization.name}
                  </p>
                </div>
              </Link>
            ) : (
              <Link
                to={networkWorkspacePath({ networkId: resolved.network.id })}
                className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <GalleryVerticalEndIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Network</p>
                  <p className="truncate font-medium">
                    {resolved.network.name}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">Pipeline run not found</h1>
          <p className="text-sm text-muted-foreground">
            This pipeline execution does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
