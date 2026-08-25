import { useState } from "react"
import { Link, useParams } from "react-router"
import {
  BoxIcon,
  GalleryVerticalEndIcon,
  HashIcon,
  LayersIcon,
  PencilIcon,
  PlayIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import {
  DefinitionFlags,
  JsonDefinitionCard,
} from "@/components/json-definition-card"
import { RunPipelineDialog } from "@/components/run-pipeline-dialog"
import { Button } from "@/components/ui/button"
import { getPipelineLevels } from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceNodes,
  workspacePipelineFromApi,
} from "@/lib/network-workspace"
import { nodeTypeLabel } from "@/lib/node-definition"
import { pipelineSummary } from "@/lib/pipeline-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetPipelineDefinitionQuery } from "@/store/pipeline-slice"

export default function PipelineDefinitionDetail() {
  const { pipelineDefinitionId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { nodes } = useWorkspaceNodes()
  const { openEditPipeline } = useCreateEntity()
  const [runOpen, setRunOpen] = useState(false)
  const pipelineQuery = useGetPipelineDefinitionQuery(
    pipelineDefinitionId ?? "",
    { skip: !isAuthenticated || !pipelineDefinitionId }
  )
  const pipelineDefinition = pipelineQuery.data
    ? workspacePipelineFromApi(pipelineQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || pipelineDefinition?.networkId === workspaceNetwork.id
  const visiblePipeline = belongsToWorkspace ? pipelineDefinition : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const levels = visiblePipeline
    ? getPipelineLevels(visiblePipeline.definition)
    : []
  const summary = visiblePipeline
    ? pipelineSummary(visiblePipeline.definition)
    : ""

  if (pipelineQuery.isLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Loading pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Fetching this pipeline definition from the server.
        </p>
      </div>
    )
  }

  if (pipelineQuery.isError) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Pipeline definition not found</h1>
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(
            pipelineQuery.error,
            "This pipeline definition does not exist or is no longer available."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {visiblePipeline && network ? (
        <>
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-pink-500 text-white">
              <LayersIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {visiblePipeline.name}
                </h1>
                <DefinitionFlags
                  active={visiblePipeline.active}
                  internal={visiblePipeline.internal}
                />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {visiblePipeline.slug}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={visiblePipeline.internal}
                onClick={() => openEditPipeline(visiblePipeline.id)}
              >
                <PencilIcon />
                Edit
              </Button>
              <Button
                disabled={!visiblePipeline.active}
                onClick={() => setRunOpen(true)}
              >
                <PlayIcon />
                Run
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <HashIcon className="size-3.5" />
                Levels
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {levels.length}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs sm:col-span-2">
              <p className="text-sm text-muted-foreground">Graph</p>
              <p className="mt-1 truncate font-medium">{summary}</p>
            </div>
          </div>

          <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Levels
              </h2>
              <p className="text-sm text-muted-foreground">
                All nodes in a level run. Later levels read previous outputs by
                0-based index.
              </p>
            </div>
            {levels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This pipeline definition does not declare any levels.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {levels.map((level, levelIndex) => (
                  <li
                    key={`level-${levelIndex}`}
                    className="rounded-xl border bg-background px-3.5 py-3"
                  >
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Level {levelIndex}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {level.map((ref, nodeIndex) => {
                        const node = nodesById.get(ref.id)
                        return (
                          <li key={`${ref.id}-${nodeIndex}`}>
                            {node ? (
                              <Link
                                to={networkWorkspacePath({
                                  networkId: network.id,
                                  organizationId,
                                  rest: `node-definitions/${node.id}`,
                                })}
                                className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-muted/50"
                              >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs font-medium">
                                  {nodeIndex}
                                </span>
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                                  <BoxIcon className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">
                                    {node.name}
                                  </p>
                                  <p className="truncate font-mono text-xs text-muted-foreground">
                                    {node.slug} · {nodeTypeLabel(node.type)}
                                  </p>
                                </div>
                              </Link>
                            ) : (
                              <div className="flex min-w-0 items-center gap-3 px-1 py-1">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs font-medium">
                                  {nodeIndex}
                                </span>
                                <p className="truncate font-mono text-sm text-muted-foreground">
                                  {ref.id}
                                </p>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <JsonDefinitionCard definition={visiblePipeline.definition} />

          <section className="flex min-w-0 flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Network
              </h2>
              <p className="text-sm text-muted-foreground">
                This pipeline definition belongs to the {network.name} network.
              </p>
            </div>
            <Link
              to={href()}
              className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{network.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {network.description || network.summary}
                </p>
              </div>
            </Link>
          </section>

          <RunPipelineDialog
            open={runOpen}
            onOpenChange={setRunOpen}
            pipelineDefinitionId={visiblePipeline.id}
            networkId={network.id}
            organizationId={organizationId}
          />
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
