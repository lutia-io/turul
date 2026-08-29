import type { PipelineDefinition } from "@/data/networks"
import { getPipelineLevels, type JsonObject } from "@/lib/json-definition"

export type PipelineNodeRef = { id: string }

export type PipelineDefinitionBody = {
  nodes: PipelineNodeRef[][]
}

export function emptyPipelineDefinition(): PipelineDefinitionBody {
  return { nodes: [[{ id: "" }]] }
}

export function parsePipelineDefinition(
  value: unknown
): PipelineDefinitionBody | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }
  const nodes = (value as JsonObject).nodes
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return undefined
  }

  const levels: PipelineNodeRef[][] = []
  for (const level of nodes) {
    if (!Array.isArray(level) || level.length === 0) {
      return undefined
    }
    const refs: PipelineNodeRef[] = []
    for (const item of level) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return undefined
      }
      const id = (item as { id?: unknown }).id
      if (typeof id !== "string" || !id.trim()) {
        return undefined
      }
      refs.push({ id: id.trim() })
    }
    levels.push(refs)
  }

  return { nodes: levels }
}

export function pipelineSummary(
  definition: JsonObject,
  names?: Map<string, string>
) {
  const levels = getPipelineLevels(definition)
  const nodeCount = levels.reduce((count, level) => count + level.length, 0)
  if (levels.length === 0) {
    return "Empty pipeline"
  }
  if (names && names.size > 0) {
    const first = levels[0]
      ?.map((node, index) => names.get(node.id) ?? `[${index}]`)
      .join(", ")
    if (first) {
      return `${levels.length} ${levels.length === 1 ? "level" : "levels"} · ${first}`
    }
  }
  return `${levels.length} ${levels.length === 1 ? "level" : "levels"} · ${nodeCount} ${nodeCount === 1 ? "node" : "nodes"}`
}

export function pipelineNodeCount(definition: JsonObject) {
  return getPipelineLevels(definition).reduce(
    (count, level) => count + level.length,
    0
  )
}

export function appendNodeToPipelineLevel(
  definition: JsonObject,
  levelIndex: number,
  nodeId: string
): PipelineDefinitionBody {
  const levels = getPipelineLevels(definition).map((level) =>
    level.map((ref) => ({ id: ref.id }))
  )
  if (levels.length === 0) {
    return { nodes: [[{ id: nodeId }]] }
  }
  while (levels.length <= levelIndex) {
    levels.push([])
  }
  levels[levelIndex] = [...levels[levelIndex], { id: nodeId }]
  return { nodes: levels }
}

export function pipelinesUsingNode(
  pipelines: PipelineDefinition[],
  nodeId: string
) {
  return pipelines.flatMap((pipeline) => {
    const levelIndexes = getPipelineLevels(pipeline.definition).flatMap(
      (level, index) => (level.some((ref) => ref.id === nodeId) ? [index] : [])
    )
    if (levelIndexes.length === 0) {
      return []
    }
    return [{ pipeline, levelIndexes }]
  })
}
