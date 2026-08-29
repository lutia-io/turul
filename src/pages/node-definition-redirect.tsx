import { Navigate, useParams } from "react-router"

import { DefinitionSkeleton } from "@/components/definition-detail"
import {
  useNetworkWorkspace,
  useWorkspacePipelines,
} from "@/lib/network-workspace"
import { pipelinesUsingNode } from "@/lib/pipeline-definition"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetNodeDefinitionQuery } from "@/store/node-slice"

export default function NodeDefinitionRedirect() {
  const { pipelineDefinitionId, nodeDefinitionId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { href } = useNetworkWorkspace()
  const { pipelines, isLoading: pipelinesLoading } = useWorkspacePipelines()
  const nodeQuery = useGetNodeDefinitionQuery(nodeDefinitionId ?? "", {
    skip:
      !isAuthenticated || !nodeDefinitionId || Boolean(pipelineDefinitionId),
  })

  if (pipelineDefinitionId) {
    return (
      <Navigate
        to={href(`pipeline-definitions/${pipelineDefinitionId}`)}
        replace
      />
    )
  }

  if (!nodeDefinitionId) {
    return <Navigate to={href("pipeline-definitions")} replace />
  }

  if (pipelinesLoading || nodeQuery.isLoading) {
    return <DefinitionSkeleton />
  }

  const match = pipelinesUsingNode(pipelines, nodeDefinitionId)[0]
  if (match) {
    return (
      <Navigate
        to={href(`pipeline-definitions/${match.pipeline.id}`)}
        replace
      />
    )
  }

  return <Navigate to={href("pipeline-definitions")} replace />
}
