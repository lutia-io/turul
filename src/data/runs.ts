export type RunStatus = "Running" | "Queued" | "Succeeded" | "Failed" | "Paused"

export type WorkflowRun = {
  id: string
  workflowDefinitionId: string
  networkId: string
  organizationId?: string
  status: RunStatus
  currentStep: number
  startedAt: string
  updatedAt: string
  finishedAt?: string
}

export type PipelineRun = {
  id: string
  pipelineDefinitionId: string
  networkId: string
  organizationId?: string
  status: RunStatus
  currentStage: number
  startedAt: string
  updatedAt: string
  finishedAt?: string
}

const t0 = Date.now()

function at(minutesAgo: number, extraMs = 0) {
  return new Date(t0 - minutesAgo * 60_000 - extraMs).toISOString()
}

export const workflowRuns: WorkflowRun[] = [
  {
    id: "wf-logistics-hub",
    workflowDefinitionId: "logistics-hub-dispatch",
    networkId: "logistics",
    organizationId: "logistics-hub",
    status: "Running",
    currentStep: 2,
    startedAt: at(2),
    updatedAt: at(0, 9_000),
  },
  {
    id: "wf-logistics-customs",
    workflowDefinitionId: "logistics-customs-clearance",
    networkId: "logistics",
    organizationId: "logistics-customs",
    status: "Queued",
    currentStep: 0,
    startedAt: at(8),
    updatedAt: at(8),
  },
  {
    id: "wf-logistics-last-mile",
    workflowDefinitionId: "logistics-last-mile",
    networkId: "logistics",
    organizationId: "logistics-last-mile",
    status: "Succeeded",
    currentStep: 3,
    startedAt: at(36),
    updatedAt: at(21),
    finishedAt: at(21),
  },
  {
    id: "wf-cafe-order-downtown",
    workflowDefinitionId: "cafe-order-fulfillment",
    networkId: "cafe",
    organizationId: "cafe-downtown",
    status: "Running",
    currentStep: 2,
    startedAt: at(1),
    updatedAt: at(0, 5_000),
  },
  {
    id: "wf-cafe-order-university",
    workflowDefinitionId: "cafe-order-fulfillment",
    networkId: "cafe",
    organizationId: "cafe-university",
    status: "Running",
    currentStep: 1,
    startedAt: at(0, 40_000),
    updatedAt: at(0, 12_000),
  },
  {
    id: "wf-cafe-reorder",
    workflowDefinitionId: "cafe-inventory-reorder",
    networkId: "cafe",
    organizationId: "cafe-roastery",
    status: "Paused",
    currentStep: 1,
    startedAt: at(27),
    updatedAt: at(11),
  },
  {
    id: "wf-cafe-opening",
    workflowDefinitionId: "cafe-opening-checklist",
    networkId: "cafe",
    organizationId: "cafe-airport",
    status: "Succeeded",
    currentStep: 3,
    startedAt: at(180),
    updatedAt: at(164),
    finishedAt: at(164),
  },
  {
    id: "wf-gym-check-in",
    workflowDefinitionId: "gym-class-check-in",
    networkId: "gym",
    organizationId: "gym-flagship",
    status: "Running",
    currentStep: 2,
    startedAt: at(4),
    updatedAt: at(0, 22_000),
  },
  {
    id: "wf-gym-onboarding",
    workflowDefinitionId: "gym-member-onboarding",
    networkId: "gym",
    organizationId: "gym-pt",
    status: "Queued",
    currentStep: 0,
    startedAt: at(8),
    updatedAt: at(8),
  },
  {
    id: "wf-dentist-reminders",
    workflowDefinitionId: "dentist-appointment-reminders",
    networkId: "dentist",
    organizationId: "dentist-family",
    status: "Running",
    currentStep: 1,
    startedAt: at(5),
    updatedAt: at(0, 30_000),
  },
  {
    id: "wf-dentist-intake",
    workflowDefinitionId: "dentist-patient-intake",
    networkId: "dentist",
    organizationId: "dentist-pediatric",
    status: "Running",
    currentStep: 2,
    startedAt: at(18),
    updatedAt: at(2),
  },
  {
    id: "wf-dentist-claim",
    workflowDefinitionId: "dentist-claim-follow-up",
    networkId: "dentist",
    organizationId: "dentist-ortho",
    status: "Failed",
    currentStep: 2,
    startedAt: at(120),
    updatedAt: at(96),
    finishedAt: at(96),
  },
  {
    id: "wf-personal-bill",
    workflowDefinitionId: "personal-bill-reminder",
    networkId: "personal",
    organizationId: "personal-home",
    status: "Running",
    currentStep: 1,
    startedAt: at(3),
    updatedAt: at(0, 14_000),
  },
  {
    id: "wf-personal-reimburse",
    workflowDefinitionId: "personal-expense-reimburse",
    networkId: "personal",
    organizationId: "personal-work",
    status: "Queued",
    currentStep: 0,
    startedAt: at(7),
    updatedAt: at(7),
  },
  {
    id: "wf-personal-task",
    workflowDefinitionId: "personal-task-follow-up",
    networkId: "personal",
    organizationId: "personal-family",
    status: "Succeeded",
    currentStep: 2,
    startedAt: at(42),
    updatedAt: at(28),
    finishedAt: at(28),
  },
  {
    id: "wf-portfolio-distribution",
    workflowDefinitionId: "portfolio-distribution-notice",
    networkId: "portfolio",
    organizationId: "portfolio-ir",
    status: "Running",
    currentStep: 3,
    startedAt: at(2),
    updatedAt: at(0, 11_000),
  },
  {
    id: "wf-portfolio-acquisition",
    workflowDefinitionId: "portfolio-acquisition-close",
    networkId: "portfolio",
    organizationId: "portfolio-opportunity",
    status: "Queued",
    currentStep: 0,
    startedAt: at(9),
    updatedAt: at(9),
  },
  {
    id: "wf-portfolio-capital-call",
    workflowDefinitionId: "portfolio-capital-call",
    networkId: "portfolio",
    organizationId: "portfolio-gp",
    status: "Succeeded",
    currentStep: 3,
    startedAt: at(54),
    updatedAt: at(41),
    finishedAt: at(41),
  },
]

export const pipelineRuns: PipelineRun[] = [
  {
    id: "pl-logistics-manifest",
    pipelineDefinitionId: "logistics-manifest-ingest",
    networkId: "logistics",
    organizationId: "logistics-origin",
    status: "Running",
    currentStage: 2,
    startedAt: at(4),
    updatedAt: at(0, 12_000),
  },
  {
    id: "pl-logistics-scans",
    pipelineDefinitionId: "logistics-scan-stream",
    networkId: "logistics",
    organizationId: "logistics-hub",
    status: "Running",
    currentStage: 3,
    startedAt: at(9),
    updatedAt: at(0, 6_000),
  },
  {
    id: "pl-cafe-pos",
    pipelineDefinitionId: "cafe-pos-ingest",
    networkId: "cafe",
    organizationId: "cafe-downtown",
    status: "Running",
    currentStage: 1,
    startedAt: at(3),
    updatedAt: at(0, 9_000),
  },
  {
    id: "pl-cafe-loyalty",
    pipelineDefinitionId: "cafe-loyalty-sync",
    networkId: "cafe",
    organizationId: "cafe-university",
    status: "Running",
    currentStage: 2,
    startedAt: at(21),
    updatedAt: at(3),
  },
  {
    id: "pl-cafe-inventory",
    pipelineDefinitionId: "cafe-inventory-snapshot",
    networkId: "cafe",
    organizationId: "cafe-roastery",
    status: "Queued",
    currentStage: 0,
    startedAt: at(12),
    updatedAt: at(12),
  },
  {
    id: "pl-gym-access",
    pipelineDefinitionId: "gym-access-stream",
    networkId: "gym",
    organizationId: "gym-flagship",
    status: "Running",
    currentStage: 2,
    startedAt: at(8),
    updatedAt: at(0, 11_000),
  },
  {
    id: "pl-gym-billing",
    pipelineDefinitionId: "gym-billing-sync",
    networkId: "gym",
    organizationId: "gym-flagship",
    status: "Succeeded",
    currentStage: 3,
    startedAt: at(200),
    updatedAt: at(176),
    finishedAt: at(176),
  },
  {
    id: "pl-dentist-reminders",
    pipelineDefinitionId: "dentist-reminder-dispatch",
    networkId: "dentist",
    organizationId: "dentist-family",
    status: "Running",
    currentStage: 2,
    startedAt: at(6),
    updatedAt: at(0, 19_000),
  },
  {
    id: "pl-dentist-ehr",
    pipelineDefinitionId: "dentist-ehr-ingest",
    networkId: "dentist",
    organizationId: "dentist-pediatric",
    status: "Paused",
    currentStage: 1,
    startedAt: at(33),
    updatedAt: at(19),
  },
  {
    id: "pl-dentist-claims",
    pipelineDefinitionId: "dentist-claims-submit",
    networkId: "dentist",
    organizationId: "dentist-ortho",
    status: "Failed",
    currentStage: 2,
    startedAt: at(70),
    updatedAt: at(52),
    finishedAt: at(52),
  },
  {
    id: "pl-personal-bank",
    pipelineDefinitionId: "personal-bank-ingest",
    networkId: "personal",
    organizationId: "personal-home",
    status: "Running",
    currentStage: 2,
    startedAt: at(5),
    updatedAt: at(0, 16_000),
  },
  {
    id: "pl-personal-calendar",
    pipelineDefinitionId: "personal-calendar-sync",
    networkId: "personal",
    organizationId: "personal-family",
    status: "Succeeded",
    currentStage: 3,
    startedAt: at(64),
    updatedAt: at(48),
    finishedAt: at(48),
  },
  {
    id: "pl-portfolio-closing",
    pipelineDefinitionId: "portfolio-closing-ingest",
    networkId: "portfolio",
    organizationId: "portfolio-fund-iii",
    status: "Running",
    currentStage: 3,
    startedAt: at(4),
    updatedAt: at(0, 8_000),
  },
  {
    id: "pl-portfolio-crm",
    pipelineDefinitionId: "portfolio-investor-crm",
    networkId: "portfolio",
    organizationId: "portfolio-ir",
    status: "Succeeded",
    currentStage: 3,
    startedAt: at(38),
    updatedAt: at(22),
    finishedAt: at(22),
  },
]

export function getWorkflowRun(workflowRunId: string) {
  return workflowRuns.find((run) => run.id === workflowRunId)
}

export function getPipelineRun(pipelineRunId: string) {
  return pipelineRuns.find((run) => run.id === pipelineRunId)
}
