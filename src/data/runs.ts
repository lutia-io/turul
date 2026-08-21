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
    id: "wf-dhl-customs-apac",
    workflowDefinitionId: "dhl-customs-clearance",
    networkId: "dhl",
    organizationId: "dhl-apac",
    status: "Running",
    currentStep: 2,
    startedAt: at(6),
    updatedAt: at(0, 18_000),
  },
  {
    id: "wf-dhl-hub-emea",
    workflowDefinitionId: "dhl-hub-sort",
    networkId: "dhl",
    organizationId: "dhl-emea",
    status: "Running",
    currentStep: 3,
    startedAt: at(14),
    updatedAt: at(1),
  },
  {
    id: "wf-dhl-last-mile-na",
    workflowDefinitionId: "dhl-last-mile",
    networkId: "dhl",
    organizationId: "dhl-na",
    status: "Running",
    currentStep: 1,
    startedAt: at(2),
    updatedAt: at(0, 8_000),
  },
  {
    id: "wf-dhl-customs-latam",
    workflowDefinitionId: "dhl-customs-clearance",
    networkId: "dhl",
    organizationId: "dhl-latam",
    status: "Queued",
    currentStep: 0,
    startedAt: at(1),
    updatedAt: at(1),
  },
  {
    id: "wf-dhl-hub-africa",
    workflowDefinitionId: "dhl-hub-sort",
    networkId: "dhl",
    organizationId: "dhl-africa",
    status: "Succeeded",
    currentStep: 4,
    startedAt: at(48),
    updatedAt: at(31),
    finishedAt: at(31),
  },
  {
    id: "wf-dhl-last-mile-failed",
    workflowDefinitionId: "dhl-last-mile",
    networkId: "dhl",
    organizationId: "dhl-apac",
    status: "Failed",
    currentStep: 3,
    startedAt: at(22),
    updatedAt: at(9),
    finishedAt: at(9),
  },
  {
    id: "wf-fedex-express",
    workflowDefinitionId: "fedex-express-intake",
    networkId: "fedex",
    organizationId: "fedex-express",
    status: "Running",
    currentStep: 2,
    startedAt: at(9),
    updatedAt: at(0, 40_000),
  },
  {
    id: "wf-fedex-ground",
    workflowDefinitionId: "fedex-ground-sort",
    networkId: "fedex",
    organizationId: "fedex-ground",
    status: "Queued",
    currentStep: 0,
    startedAt: at(3),
    updatedAt: at(3),
  },
  {
    id: "wf-fedex-freight",
    workflowDefinitionId: "fedex-freight-tender",
    networkId: "fedex",
    organizationId: "fedex-freight",
    status: "Succeeded",
    currentStep: 3,
    startedAt: at(90),
    updatedAt: at(71),
    finishedAt: at(71),
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
]

export const pipelineRuns: PipelineRun[] = [
  {
    id: "pl-dhl-tracking",
    pipelineDefinitionId: "dhl-tracking-stream",
    networkId: "dhl",
    organizationId: "dhl-emea",
    status: "Running",
    currentStage: 3,
    startedAt: at(11),
    updatedAt: at(0, 15_000),
  },
  {
    id: "pl-dhl-manifest",
    pipelineDefinitionId: "dhl-manifest-ingest",
    networkId: "dhl",
    organizationId: "dhl-apac",
    status: "Running",
    currentStage: 2,
    startedAt: at(7),
    updatedAt: at(1),
  },
  {
    id: "pl-dhl-customs",
    pipelineDefinitionId: "dhl-customs-transform",
    networkId: "dhl",
    organizationId: "dhl-emea",
    status: "Succeeded",
    currentStage: 4,
    startedAt: at(55),
    updatedAt: at(38),
    finishedAt: at(38),
  },
  {
    id: "pl-dhl-edi",
    pipelineDefinitionId: "dhl-partner-edi-sync",
    networkId: "dhl",
    organizationId: "dhl-latam",
    status: "Failed",
    currentStage: 2,
    startedAt: at(40),
    updatedAt: at(28),
    finishedAt: at(28),
  },
  {
    id: "pl-fedex-scans",
    pipelineDefinitionId: "fedex-ground-scan-stream",
    networkId: "fedex",
    organizationId: "fedex-ground",
    status: "Running",
    currentStage: 2,
    startedAt: at(16),
    updatedAt: at(0, 25_000),
  },
  {
    id: "pl-fedex-waybill",
    pipelineDefinitionId: "fedex-waybill-ingest",
    networkId: "fedex",
    organizationId: "fedex-express",
    status: "Queued",
    currentStage: 0,
    startedAt: at(4),
    updatedAt: at(4),
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
]

export function getWorkflowRun(workflowRunId: string) {
  return workflowRuns.find((run) => run.id === workflowRunId)
}

export function getPipelineRun(pipelineRunId: string) {
  return pipelineRuns.find((run) => run.id === pipelineRunId)
}
