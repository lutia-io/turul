import { Link, useParams } from "react-router"
import {
  BoxIcon,
  GalleryVerticalEndIcon,
  HashIcon,
  PencilIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import {
  DefinitionFlags,
  JsonDefinitionCard,
} from "@/components/json-definition-card"
import { Button } from "@/components/ui/button"
import {
  useNetworkWorkspace,
  workspaceNodeFromApi,
} from "@/lib/network-workspace"
import {
  executableNodeTypes,
  isNodeType,
  nodeTypeLabel,
} from "@/lib/node-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetNodeDefinitionQuery } from "@/store/node-slice"

export default function NodeDefinitionDetail() {
  const { nodeDefinitionId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network: workspaceNetwork, href } = useNetworkWorkspace()
  const { openEditNode } = useCreateEntity()
  const nodeQuery = useGetNodeDefinitionQuery(nodeDefinitionId ?? "", {
    skip: !isAuthenticated || !nodeDefinitionId,
  })
  const nodeDefinition = nodeQuery.data
    ? workspaceNodeFromApi(nodeQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || nodeDefinition?.networkId === workspaceNetwork.id
  const visibleNode = belongsToWorkspace ? nodeDefinition : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const executable =
    visibleNode && isNodeType(visibleNode.type)
      ? executableNodeTypes.has(visibleNode.type)
      : false

  if (nodeQuery.isLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Loading node</h1>
        <p className="text-sm text-muted-foreground">
          Fetching this node definition from the server.
        </p>
      </div>
    )
  }

  if (nodeQuery.isError) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Node definition not found</h1>
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(
            nodeQuery.error,
            "This node definition does not exist or is no longer available."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {visibleNode && network ? (
        <>
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white">
              <BoxIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {visibleNode.name}
                </h1>
                <DefinitionFlags
                  active={visibleNode.active}
                  internal={visibleNode.internal}
                />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {visibleNode.slug}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={visibleNode.internal}
              onClick={() => openEditNode(visibleNode.id)}
            >
              <PencilIcon />
              Edit
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <HashIcon className="size-3.5" />
                Type
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {nodeTypeLabel(visibleNode.type)}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs sm:col-span-2">
              <p className="text-sm text-muted-foreground">Execution</p>
              <p className="mt-1 truncate text-sm font-medium">
                {executable
                  ? "This node type runs in pipeline executions."
                  : "Stored for later. The executor reports this type as not implemented."}
              </p>
            </div>
          </div>

          <JsonDefinitionCard definition={visibleNode.definition} />

          <section className="flex min-w-0 flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Network
              </h2>
              <p className="text-sm text-muted-foreground">
                This node definition belongs to the {network.name} network.
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
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">Node definition not found</h1>
          <p className="text-sm text-muted-foreground">
            This node definition does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
