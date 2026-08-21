import { ExecutionListPage } from "@/components/execution-list-page"
import { listPipelineRunViews } from "@/lib/runs"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"

export default function PipelineList() {
  const { network, organizationId } = useNetworkWorkspace()
  const items = listPipelineRunViews({
    networkId: network?.id,
    organizationId,
  }).map((view) => ({
    id: view.run.id,
    name: view.definition.name,
    href: networkWorkspacePath({
      networkId: view.network.id,
      rest: `pipelines/${view.run.id}`,
    }),
    status: view.run.status,
    color: "pink" as const,
    network: view.network,
    organizationName: view.organization?.name,
    currentLabel: view.current?.name,
    currentIndex: view.run.currentStage,
    total: view.stages.length,
    startedAt: view.run.startedAt,
    finishedAt: view.run.finishedAt,
  }))

  return (
    <ExecutionListPage
      title={network ? `${network.name} pipelines` : "Pipelines"}
      description={
        network
          ? `Live pipeline executions in ${network.name}${organizationId ? " for this organization" : ""}.`
          : "Active pipeline executions across your networks. Open a run to inspect the current stage."
      }
      startLabel="Start a pipeline"
      itemLabel="pipeline"
      unit="Stage"
      items={items}
      emptyLabel="No pipelines match this filter."
      showNetwork={!network}
      showOrganization={!organizationId}
    />
  )
}
