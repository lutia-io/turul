import type { JsonObject } from "@/lib/json-definition"
import { getWorkflowRunView } from "@/lib/runs"
import { workflowRuns, type WorkflowRun } from "@/data/runs"

export type WorkflowActionStatus = "succeeded" | "failed" | "running"

export type WorkflowAction = {
  id: string
  workflowId: string
  actionIndex: number
  attempt: number
  actionType: string
  status: WorkflowActionStatus
  input?: JsonObject
  output?: JsonObject
  error?: string
  startedAt: string
  completedAt: string
}

function hash(value: string) {
  let total = 0

  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) | 0
  }

  return Math.abs(total)
}

function at(iso: string, offsetMs: number) {
  return new Date(new Date(iso).getTime() + offsetMs).toISOString()
}

function actionForStep(
  run: WorkflowRun,
  step: { id: string; type: string; name: string; order: number },
  attempt: number,
  status: WorkflowActionStatus,
  startedAt: string,
  completedAt: string,
  error?: string
): WorkflowAction {
  const input: JsonObject = {
    stepId: step.id,
    stepName: step.name,
    organizationId: run.organizationId ?? null,
  }

  const output: JsonObject | undefined =
    status === "succeeded"
      ? {
          ok: true,
          durationMs: Math.max(
            400,
            new Date(completedAt).getTime() - new Date(startedAt).getTime()
          ),
        }
      : status === "failed"
        ? { ok: false }
        : undefined

  return {
    id: `${run.id}:${step.order - 1}:${attempt}`,
    workflowId: run.id,
    actionIndex: step.order - 1,
    attempt,
    actionType: step.type,
    status,
    input,
    output,
    error,
    startedAt,
    completedAt,
  }
}

function actionsForRun(run: WorkflowRun): WorkflowAction[] {
  const view = getWorkflowRunView(run)

  if (!view || run.status === "Queued" || run.currentStep <= 0) {
    return []
  }

  const end = new Date(run.finishedAt ?? run.updatedAt).getTime()
  const start = new Date(run.startedAt).getTime()
  const span = Math.max(end - start, 8_000)
  const slice = span / Math.max(view.steps.length, 1)
  const actions: WorkflowAction[] = []

  for (const step of view.steps) {
    const isPast = run.status === "Succeeded" || step.order < run.currentStep
    const isCurrent = step.order === run.currentStep

    if (!isPast && !isCurrent) {
      continue
    }

    const stepStart = at(run.startedAt, (step.order - 1) * slice)
    const stepEnd = at(run.startedAt, step.order * slice)
    const retried = isPast && hash(`${run.id}:${step.id}`) % 6 === 0

    if (retried) {
      const failEnd = at(stepStart, slice * 0.35)
      actions.push(
        actionForStep(
          run,
          step,
          1,
          "failed",
          stepStart,
          failEnd,
          "Timeout waiting for downstream acknowledgement"
        )
      )
      actions.push(actionForStep(run, step, 2, "succeeded", failEnd, stepEnd))
      continue
    }

    if (isPast) {
      actions.push(actionForStep(run, step, 1, "succeeded", stepStart, stepEnd))
      continue
    }

    if (run.status === "Failed") {
      const firstEnd = at(stepStart, slice * 0.4)
      actions.push(
        actionForStep(
          run,
          step,
          1,
          "failed",
          stepStart,
          firstEnd,
          "Validation rejected by partner system"
        )
      )
      actions.push(
        actionForStep(
          run,
          step,
          2,
          "failed",
          firstEnd,
          run.finishedAt ?? run.updatedAt,
          "Retry exhausted after partner rejection"
        )
      )
      continue
    }

    actions.push(
      actionForStep(run, step, 1, "running", stepStart, run.updatedAt)
    )
  }

  return actions
}

export const workflowActions: WorkflowAction[] =
  workflowRuns.flatMap(actionsForRun)

export function getWorkflowActions(workflowId: string) {
  return workflowActions
    .filter((action) => action.workflowId === workflowId)
    .sort((left, right) =>
      left.actionIndex === right.actionIndex
        ? left.attempt - right.attempt
        : left.actionIndex - right.actionIndex
    )
}
