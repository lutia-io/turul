import { Link } from "react-router"
import { ChevronRightIcon, LayersIcon } from "lucide-react"

import { pipelineDefinitionList } from "@/data/networks"
import { useNetworkWorkspace } from "@/lib/network-workspace"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"

export default function PipelineDefinitionList() {
  const { network, href } = useNetworkWorkspace()
  const items = network
    ? network.pipelineDefinitions.map((pipelineDefinition) => ({
        pipelineDefinition,
        network,
      }))
    : pipelineDefinitionList

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Pipeline Definitions</h1>
        <p className="text-sm text-muted-foreground">
          {network
            ? `Pipeline definitions used by the ${network.name} network.`
            : "Choose a pipeline definition to view its details."}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {items.map(({ pipelineDefinition, network: itemNetwork }) => (
          <Link
            key={pipelineDefinition.id}
            to={
              network
                ? href(`pipeline-definitions/${pipelineDefinition.id}`)
                : `/app/pipeline-definitions/${pipelineDefinition.id}`
            }
            className="block"
          >
            <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayersIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle>{pipelineDefinition.name}</CardTitle>
                <CardDescription>
                  {network
                    ? `${pipelineDefinition.source} · v${pipelineDefinition.version} · ${pipelineDefinition.stages} stages`
                    : `${itemNetwork.name} · ${pipelineDefinition.source} · v${pipelineDefinition.version}`}
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
