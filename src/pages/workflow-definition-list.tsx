import { Link } from "react-router"
import { ChevronRightIcon, WorkflowIcon } from "lucide-react"

import { workflowDefinitionList } from "@/data/networks"
import { useNetworkWorkspace } from "@/lib/network-workspace"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"

export default function WorkflowDefinitionList() {
  const { network, href } = useNetworkWorkspace()
  const items = network
    ? network.workflowDefinitions.map((workflowDefinition) => ({
        workflowDefinition,
        network,
      }))
    : workflowDefinitionList

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Workflow Definitions</h1>
        <p className="text-sm text-muted-foreground">
          {network
            ? `Workflow definitions used by the ${network.name} network.`
            : "Choose a workflow definition to view its details."}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {items.map(({ workflowDefinition, network: itemNetwork }) => (
          <Link
            key={workflowDefinition.id}
            to={
              network
                ? href(`workflow-definitions/${workflowDefinition.id}`)
                : `/app/workflow-definitions/${workflowDefinition.id}`
            }
            className="block"
          >
            <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <WorkflowIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle>{workflowDefinition.name}</CardTitle>
                <CardDescription>
                  {network
                    ? `${workflowDefinition.trigger} · v${workflowDefinition.version} · ${workflowDefinition.steps} steps`
                    : `${itemNetwork.name} · ${workflowDefinition.trigger} · v${workflowDefinition.version}`}
                </CardDescription>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
