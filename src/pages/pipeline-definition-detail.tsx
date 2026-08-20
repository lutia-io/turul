import { Link, useParams } from "react-router"
import { GalleryVerticalEndIcon, HashIcon, LayersIcon } from "lucide-react"

import { getPipelineDefinition } from "@/data/networks"
import { useNetworkWorkspace } from "@/lib/network-workspace"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function PipelineDefinitionDetail() {
  const { pipelineDefinitionId } = useParams()
  const { network: workspaceNetwork, href } = useNetworkWorkspace()
  const result = pipelineDefinitionId
    ? getPipelineDefinition(pipelineDefinitionId)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || result?.network.id === workspaceNetwork.id
  const pipelineDefinition = belongsToWorkspace
    ? result?.pipelineDefinition
    : undefined
  const network = belongsToWorkspace ? result?.network : undefined

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {pipelineDefinition && network ? (
        <>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayersIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold">
                  {pipelineDefinition.name}
                </h1>
                <span
                  className={
                    pipelineDefinition.status === "Published"
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                      : "rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
                  }
                >
                  {pipelineDefinition.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {pipelineDefinition.description}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <CardDescription className="flex items-center gap-1">
                  <HashIcon className="size-3.5" />
                  Stages
                </CardDescription>
                <CardTitle className="text-2xl">
                  {pipelineDefinition.stages}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Source</CardDescription>
                <CardTitle>{pipelineDefinition.source}</CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Version</CardDescription>
                <CardTitle>v{pipelineDefinition.version}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">Network</h2>
              <p className="text-sm text-muted-foreground">
                This pipeline definition is used by the {network.name} network.
              </p>
            </div>
            <Link to={href()} className="block">
              <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <GalleryVerticalEndIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle>{network.name}</CardTitle>
                  <CardDescription>{network.description}</CardDescription>
                </div>
              </Card>
            </Link>
          </div>
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">
            Pipeline definition not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This pipeline definition does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
