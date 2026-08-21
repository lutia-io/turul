import { ExecutionListPage } from "@/components/execution-list-page"
import { listWorkflowRunViews } from "@/lib/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"

export default function WorkflowList() {
  const { network, organizationId } = useNetworkWorkspace()
  const items = listWorkflowRunViews({
    networkId: network?.id,
    organizationId,
  }).map((view) => ({
    id: view.run.id,
    name: view.definition.name,
    href: networkWorkspacePath({
      networkId: view.network.id,
      rest: `workflows/${view.run.id}`,
    }),
    status: view.run.status,
    color: "teal" as const,
    network: view.network,
    organizationName: view.organization?.name,
    currentLabel: view.current?.name,
    currentIndex: view.run.currentStep,
    total: view.steps.length,
    startedAt: view.run.startedAt,
    finishedAt: view.run.finishedAt,
  }))

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
    />
  )
}
