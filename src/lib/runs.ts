import {
  getOrganization,
  getWorkflowDefinition,
  networks,
  type Network,
  type Organization,
  type WorkflowDefinition,
} from "@/data/networks"
import {
  type RunStatus,
  type WorkflowRun,
} from "@/data/runs"
import {
  getPipelineLevels,
  getWorkflowSteps,
  type DefinitionStep,
  type JsonObject,
} from "@/lib/json-definition"
import { nodeTypeLabel } from "@/lib/node-definition"
import {
  parseWorkflowDefinition,
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

export function apiWorkflowStatus(status: string): RunStatus {
  switch (status.toLowerCase()) {
    case "running":
      return "Running"
    case "completed":
    case "succeeded":
      return "Succeeded"
    case "failed":
      return "Failed"
    default:
      return "Queued"
  }
}

export function countWorkflowRunStatuses(runs: { status: string }[]) {
  const counts = {
    running: 0,
    pending: 0,
    completed: 0,
    failed: 0,
  }

  for (const run of runs) {
    const status = apiWorkflowStatus(run.status)
    if (status === "Running") {
      counts.running += 1
    } else if (status === "Queued" || status === "Paused") {
      counts.pending += 1
    } else if (status === "Succeeded") {
      counts.completed += 1
    } else if (status === "Failed") {
      counts.failed += 1
    }
  }

  return counts
}

export function apiWorkflowSteps(
  definition: WorkflowDefinitionBody | undefined
): DefinitionStep[] {
  const levels = getPipelineLevels(
    definition ? ({ nodes: definition.nodes } as JsonObject) : {}
  )
  return levels.map((level, levelIndex) => ({
    id: `level-${levelIndex}`,
    type: "level",
    name:
      level
        .map((node) => nodeTypeLabel(node.type))
        .filter(Boolean)
        .join(", ") || `Level ${levelIndex + 1}`,
    order: levelIndex + 1,
  }))
}

export function apiWorkflowCurrentStep(workflow: ApiWorkflow) {
  const total =
    parseWorkflowDefinition(workflow.definition)?.nodes.length ?? 0
  const currentLevel = workflow.currentLevel ?? 0
  if (workflow.status === "pending") {
    return 0
  }
  if (workflow.status === "completed") {
    return total
  }
  if (workflow.status === "failed") {
    return Math.min(Math.max(currentLevel + 1, 1), Math.max(total, 1))
  }
  return Math.min(currentLevel + 1, Math.max(total, 1))
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
