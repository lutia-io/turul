import {
  getOrganization,
  getPipelineDefinition,
  getWorkflowDefinition,
  networks,
  type Network,
  type Organization,
  type PipelineDefinition,
  type WorkflowDefinition,
} from "@/data/networks"
import {
  pipelineRuns,
  workflowRuns,
  type PipelineRun,
  type RunStatus,
  type WorkflowRun,
} from "@/data/runs"
import {
  getPipelineStages,
  getWorkflowSteps,
  type DefinitionStep,
} from "@/lib/json-definition"
import {
  actionTypeLabels,
  parseWorkflowDefinition,
  type WorkflowActionType,
  type WorkflowDefinitionBody,
} from "@/lib/workflow-definition"
import type { ApiWorkflow } from "@/store/workflow-slice"

export const activeRunStatuses: RunStatus[] = ["Running", "Queued", "Paused"]

export type RunFilter = "active" | "succeeded" | "failed" | "all"

export type WorkflowRunView = {
  run: WorkflowRun
  definition: WorkflowDefinition
  network: Network
  organization?: Organization
  steps: DefinitionStep[]
  current?: DefinitionStep
}

export type PipelineRunView = {
  run: PipelineRun
  definition: PipelineDefinition
  network: Network
  organization?: Organization
  stages: DefinitionStep[]
  current?: DefinitionStep
}

function matchesScope(
  run: { networkId: string; organizationId?: string },
  networkId?: string,
  organizationId?: string
) {
  if (networkId && run.networkId !== networkId) {
    return false
  }

  if (organizationId && run.organizationId !== organizationId) {
    return false
  }

  return true
}

function matchesFilter(status: RunStatus, filter: RunFilter) {
  if (filter === "all") {
    return true
  }

  if (filter === "active") {
    return activeRunStatuses.includes(status)
  }

  if (filter === "succeeded") {
    return status === "Succeeded"
  }

  return status === "Failed"
}

export function isActiveRun(status: RunStatus) {
  return activeRunStatuses.includes(status)
}

export function runProgress(current: number, total: number, status: RunStatus) {
  if (total <= 0) {
    return 0
  }

  if (status === "Succeeded") {
    return 100
  }

  if (status === "Queued" || current <= 0) {
    return 0
  }

  const completed = status === "Failed" ? current : Math.max(current - 1, 0)
  return Math.min(100, Math.round((completed / total) * 100))
}

export function formatRelativeTime(iso: string, now = Date.now()) {
  const deltaMs = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.round(deltaMs / 60_000)

  if (minutes < 1) {
    return "just now"
  }

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.round(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function formatRunDuration(run: {
  startedAt: string
  finishedAt?: string
  status: RunStatus
}) {
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now()
  const minutes = Math.max(
    1,
    Math.round((end - new Date(run.startedAt).getTime()) / 60_000)
  )

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

export function getWorkflowRunView(
  run: WorkflowRun
): WorkflowRunView | undefined {
  const result = getWorkflowDefinition(run.workflowDefinitionId)
  const network = networks[run.networkId]

  if (!result || !network) {
    return undefined
  }

  const steps = getWorkflowSteps(result.workflowDefinition.definition)
  const current = steps.find((step) => step.order === run.currentStep)

  return {
    run,
    definition: result.workflowDefinition,
    network,
    organization: run.organizationId
      ? getOrganization(run.organizationId)?.organization
      : undefined,
    steps,
    current,
  }
}

export function getPipelineRunView(
  run: PipelineRun
): PipelineRunView | undefined {
  const result = getPipelineDefinition(run.pipelineDefinitionId)
  const network = networks[run.networkId]

  if (!result || !network) {
    return undefined
  }

  const stages = getPipelineStages(result.pipelineDefinition.definition)
  const current = stages.find((stage) => stage.order === run.currentStage)

  return {
    run,
    definition: result.pipelineDefinition,
    network,
    organization: run.organizationId
      ? getOrganization(run.organizationId)?.organization
      : undefined,
    stages,
    current,
  }
}

export function listWorkflowRunViews({
  networkId,
  organizationId,
  filter = "all",
}: {
  networkId?: string
  organizationId?: string
  filter?: RunFilter
} = {}) {
  return workflowRuns
    .filter((run) => matchesScope(run, networkId, organizationId))
    .filter((run) => matchesFilter(run.status, filter))
    .map(getWorkflowRunView)
    .filter((view): view is WorkflowRunView => view !== undefined)
}

export function listPipelineRunViews({
  networkId,
  organizationId,
  filter = "all",
}: {
  networkId?: string
  organizationId?: string
  filter?: RunFilter
} = {}) {
  return pipelineRuns
    .filter((run) => matchesScope(run, networkId, organizationId))
    .filter((run) => matchesFilter(run.status, filter))
    .map(getPipelineRunView)
    .filter((view): view is PipelineRunView => view !== undefined)
}

export function apiWorkflowStatus(status: string): RunStatus {
  switch (status) {
    case "running":
      return "Running"
    case "completed":
      return "Succeeded"
    case "failed":
      return "Failed"
    default:
      return "Queued"
  }
}

export function apiWorkflowSteps(
  definition: WorkflowDefinitionBody | undefined
): DefinitionStep[] {
  return (definition?.actions ?? []).map((action, index) => ({
    id: String(index),
    type: action.type,
    name: actionTypeLabels[action.type as WorkflowActionType] ?? action.type,
    order: index + 1,
  }))
}

export function apiWorkflowCurrentStep(workflow: ApiWorkflow) {
  const total =
    parseWorkflowDefinition(workflow.definition)?.actions.length ?? 0
  if (workflow.status === "pending") {
    return 0
  }
  if (workflow.status === "completed") {
    return total
  }
  if (workflow.status === "failed") {
    return Math.min(Math.max(workflow.currentAction, 1), Math.max(total, 1))
  }
  return Math.min(workflow.currentAction + 1, Math.max(total, 1))
}

export function matchesWorkflowScope(
  workflow: Pick<ApiWorkflow, "networkId" | "organizationId">,
  networkId?: string,
  organizationId?: string
) {
  if (networkId && workflow.networkId !== networkId) {
    return false
  }
  if (organizationId && workflow.organizationId !== organizationId) {
    return false
  }
  return true
}

export function apiPipelineStatus(status: string): RunStatus {
  switch (status) {
    case "running":
      return "Running"
    case "completed":
      return "Succeeded"
    case "failed":
      return "Failed"
    default:
      return "Queued"
  }
}

export function apiPipelineLevelSteps(
  definition: { nodes?: { name?: string; type?: string }[][] } | undefined
): DefinitionStep[] {
  return (definition?.nodes ?? []).map((level, index) => ({
    id: `level-${index}`,
    type: "level",
    name:
      level
        .map((node) => node.name)
        .filter(Boolean)
        .join(", ") || `Level ${index}`,
    order: index + 1,
  }))
}

export function apiPipelineCurrentLevel(pipeline: {
  status: string
  currentLevel: number
  definition: { nodes?: unknown[] }
}) {
  const total = pipeline.definition.nodes?.length ?? 0
  if (pipeline.status === "pending") {
    return 0
  }
  if (pipeline.status === "completed") {
    return total
  }
  if (pipeline.status === "failed") {
    return Math.min(Math.max(pipeline.currentLevel + 1, 1), Math.max(total, 1))
  }
  return Math.min(pipeline.currentLevel + 1, Math.max(total, 1))
}

export function matchesPipelineScope(
  pipeline: Pick<{ networkId: string; organizationId: string }, "networkId" | "organizationId">,
  networkId?: string,
  organizationId?: string
) {
  if (networkId && pipeline.networkId !== networkId) {
    return false
  }
  if (organizationId && pipeline.organizationId !== organizationId) {
    return false
  }
  return true
}
