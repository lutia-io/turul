import type { PipelineDefinition } from "@/data/networks"
import type { JsonObject } from "@/lib/json-definition"
import type { PipelineDefinitionBody } from "@/lib/pipeline-definition"

export type WorkflowPipelineSession = {
  actionKey: string
  mode: "create" | "edit"
  pipelineId?: string
}

export type SavedWorkflowPipeline = {
  id: string
  name: string
  description: string
  active: boolean
  definition: PipelineDefinitionBody
  networkId: string
  organizationId?: string
}

export function workspacePipelineFromSaved(
  saved: SavedWorkflowPipeline
): PipelineDefinition {
  return {
    id: saved.id,
    name: saved.name,
    slug: saved.id,
    description: saved.description,
    active: saved.active,
    internal: false,
    definition: JSON.parse(JSON.stringify(saved.definition)) as JsonObject,
    networkId: saved.networkId,
    organizationId: saved.organizationId,
  }
}

export function mergeWorkspacePipelines(
  remote: PipelineDefinition[],
  saved: PipelineDefinition[]
) {
  if (saved.length === 0) {
    return remote
  }
  const savedById = new Map(saved.map((pipeline) => [pipeline.id, pipeline]))
  const seen = new Set<string>()
  const merged = remote.map((pipeline) => {
    seen.add(pipeline.id)
    return savedById.get(pipeline.id) ?? pipeline
  })
  for (const pipeline of saved) {
    if (!seen.has(pipeline.id)) {
      merged.push(pipeline)
    }
  }
  return merged
}
