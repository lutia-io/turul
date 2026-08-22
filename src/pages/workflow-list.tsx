import { ExecutionListPage } from "@/components/execution-list-page"
import { RefreshButton } from "@/components/refresh-button"
import {
  apiWorkflowCurrentStep,
  apiWorkflowStatus,
  apiWorkflowSteps,
  matchesWorkflowScope,
} from "@/lib/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceWorkflowRuns,
  useWorkspaceWorkflows,
} from "@/lib/network-workspace"
import { parseWorkflowDefinition } from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"

export default function WorkflowList() {
  const { network, organizationId } = useNetworkWorkspace()
  const { workflows } = useWorkspaceWorkflows()
  const { organizations } = useWorkspaceOrganizations()
  const { runs, isLoading, isFetching, isError, error, refetch } =
    useWorkspaceWorkflowRuns()
  const items = runs
    .filter((run) => matchesWorkflowScope(run, network?.id, organizationId))
    .flatMap((run) => {
      const itemNetwork = network
      if (!itemNetwork || itemNetwork.id !== run.networkId) {
        return []
      }
      const definition = workflows.find(
        (item) => item.id === run.workflowDefinitionId
      )
      const steps = apiWorkflowSteps(parseWorkflowDefinition(run.definition))
      const currentIndex = apiWorkflowCurrentStep(run)
      const current = steps.find((step) => step.order === currentIndex)
      const organization = organizations.find(
        (item) => item.id === run.organizationId
      )

      return [
        {
          id: run.id,
          name: definition?.name ?? "Workflow",
          href: networkWorkspacePath({
            networkId: run.networkId,
            organizationId,
            rest: `workflows/${run.id}`,
          }),
          status: apiWorkflowStatus(run.status),
          color: "teal" as const,
          network: itemNetwork,
          organizationName: organization?.name,
          currentLabel: current?.name,
          currentIndex,
          total: steps.length,
          startedAt: run.createdAt,
          finishedAt: run.completedAt ?? undefined,
        },
      ]
    })

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {network ? `${network.name} workflows` : "Workflows"}
        </h1>
        <p className="text-sm text-muted-foreground">Loading workflows...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {network ? `${network.name} workflows` : "Workflows"}
          </h1>
          <RefreshButton
            onRefresh={refetch}
            isRefreshing={isFetching}
            size="icon"
          />
        </div>
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load workflows")}
        </p>
      </div>
    )
  }

  return (
    <ExecutionListPage
      title={network ? `${network.name} workflows` : "Workflows"}
      description={
        network
          ? `Live workflow executions in ${network.name}${organizationId ? " for this organization" : ""}.`
          : "Active workflow executions across your networks. Open a run to inspect the current step."
      }
      startLabel="Start a workflow"
      itemLabel="workflow"
      unit="Step"
      items={items}
      emptyLabel="No workflows match this filter."
      showNetwork={!network}
      showOrganization={!organizationId}
      onRefresh={refetch}
      isRefreshing={isFetching}
    />
  )
}
