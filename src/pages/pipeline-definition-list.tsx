import { Link } from "react-router"
import { ChevronRightIcon, LayersIcon, PlusIcon } from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import { pipelineDefinitionList } from "@/data/networks"
import { getPipelineStages, pipelineSourceLabel } from "@/lib/json-definition"
import { useNetworkWorkspace } from "@/lib/network-workspace"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"

export default function PipelineDefinitionList() {
  const { network, href } = useNetworkWorkspace()
  const { openCreatePipeline } = useCreateEntity()
  const items = network
    ? network.pipelineDefinitions.map((pipelineDefinition) => ({
        pipelineDefinition,
        network,
      }))
    : pipelineDefinitionList

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Pipeline Definitions</h1>
          <p className="text-sm text-muted-foreground">
            {network
              ? `Pipeline definitions used by the ${network.name} network.`
              : "Choose a pipeline definition to view its details."}
          </p>
        </div>
        <Button onClick={() => openCreatePipeline(network?.id)}>
          <PlusIcon />
          Create pipeline
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {items.length > 0 ? (
          items.map(({ pipelineDefinition, network: itemNetwork }) => (
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
                      ? `${pipelineSourceLabel(pipelineDefinition.definition)} · ${getPipelineStages(pipelineDefinition.definition).length} stages`
                      : `${itemNetwork.name} · ${pipelineSourceLabel(pipelineDefinition.definition)}`}
                  </CardDescription>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No pipeline definitions yet.
          </p>
        )}
      </div>
    </div>
  )
}
