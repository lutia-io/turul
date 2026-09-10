import type { PipelineDefinition } from "@/data/networks"
import { getPipelineLevels, type JsonObject } from "@/lib/json-definition"

export type PipelineNodeRef = { id: string }

export type PipelineDefinitionBody = {
  nodes: PipelineNodeRef[][]
}

export type PipelineLevelDraft = {
  key: string
  nodeIds: string[]
}

export type CreatePipelineNodeTarget =
  { kind: "empty" } | { kind: "level"; levelKey: string }

let draftSeq = 0

export function newDraftKey(prefix = "item") {
  draftSeq += 1
  return `${prefix}-${draftSeq}-${Math.random().toString(36).slice(2, 8)}`
}

export function newPipelineLevel(
  existing: PipelineLevelDraft[] = []
): PipelineLevelDraft {
  return {
    key: newDraftKey(`level-${existing.length + 1}`),
    nodeIds: [""],
  }
}

export function emptyPipelineLevels(): PipelineLevelDraft[] {
  return [newPipelineLevel()]
}

export function emptyPipelineDefinition(): PipelineDefinitionBody {
  return { nodes: [] }
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

export function levelsFromApi(
  definition?: PipelineDefinitionBody
): PipelineLevelDraft[] {
  if (!definition || definition.nodes.length === 0) {
    return emptyPipelineLevels()
  }
  return definition.nodes.map((level) => ({
    key: newDraftKey("level"),
    nodeIds: level.map((node) => node.id),
  }))
}

export function levelsToApi(
  levels: PipelineLevelDraft[]
): PipelineDefinitionBody | undefined {
  const nodes = levels
    .map((level) => level.nodeIds.filter(Boolean).map((id) => ({ id })))
    .filter((level) => level.length > 0)
  if (nodes.length === 0) {
    return undefined
  }
  return { nodes }
}

function fillFirstEmptyOrAppend(nodeIds: string[], nodeId: string) {
  const emptyIndex = nodeIds.findIndex((id) => !id)
  if (emptyIndex >= 0) {
    const next = [...nodeIds]
    next[emptyIndex] = nodeId
    return next
  }
  return [...nodeIds, nodeId]
}

export function insertCreatedNode(
  levels: PipelineLevelDraft[],
  nodeId: string,
  target: CreatePipelineNodeTarget
): PipelineLevelDraft[] {
  if (target.kind === "empty") {
    if (levels.length === 0) {
      return [{ ...newPipelineLevel(), nodeIds: [nodeId] }]
    }
    const levelWithEmpty = levels.find((level) =>
      level.nodeIds.some((id) => !id)
    )
    const targetLevel = levelWithEmpty ?? levels[0]
    return levels.map((level) =>
      level.key === targetLevel.key
        ? { ...level, nodeIds: fillFirstEmptyOrAppend(level.nodeIds, nodeId) }
        : level
    )
  }

  if (!levels.some((level) => level.key === target.levelKey)) {
    return [...levels, { ...newPipelineLevel(levels), nodeIds: [nodeId] }]
  }

  return levels.map((level) =>
    level.key === target.levelKey
      ? { ...level, nodeIds: fillFirstEmptyOrAppend(level.nodeIds, nodeId) }
      : level
  )
}

export function movePipelineLevel(
  levels: PipelineLevelDraft[],
  index: number,
  offset: number
): PipelineLevelDraft[] {
  const nextIndex = index + offset
  if (nextIndex < 0 || nextIndex >= levels.length) {
    return levels
  }
  const next = [...levels]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  return next
}

function joinNames(names: string[]) {
  if (names.length === 0) {
    return ""
  }
  if (names.length === 1) {
    return names[0]
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} together`
  }
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]} together`
}

export function pipelineFlowSentence(
  levels: { nodeIds: string[] }[],
  nameOf: (id: string) => string | undefined
) {
  const parts = levels.flatMap((level) => {
    const names = level.nodeIds
      .filter(Boolean)
      .map((id) => nameOf(id)?.trim() || "a node")
    return names.length > 0 ? [joinNames(names)] : []
  })
  if (parts.length === 0) {
    return "Add the first level to start this pipeline."
  }
  if (parts.length === 1) {
    return `Runs in one level: ${parts[0]}.`
  }
  return `Runs level by level: ${parts[0]}, then ${parts.slice(1).join(", then ")}.`
}

export function pipelineLevelTitle(levelIndex: number) {
  return `Level ${levelIndex + 1}`
}

export function pipelineLevelExplanation(
  levelIndex: number,
  totalLevels: number,
  parallel: boolean
) {
  const parts: string[] = []
  if (levelIndex === 0) {
    parts.push("This is the first level. It runs first.")
  } else {
    parts.push(
      `This is the next level. It starts after level ${levelIndex} finishes.`
    )
  }
  if (parallel) {
    parts.push("Nodes in this level run at the same time.")
  }
  if (levelIndex < totalLevels - 1) {
    parts.push("The following level waits until this one is done.")
  }
  return parts.join(" ")
}

export function pipelineDraftSentence(
  levels: PipelineLevelDraft[],
  nameOf: (id: string) => string | undefined
) {
  return pipelineFlowSentence(levels, nameOf)
}

export function pipelineSummary(
  definition: JsonObject,
  names?: Map<string, string>
) {
  const levels = getPipelineLevels(definition)
  const nodeCount = levels.reduce((count, level) => count + level.length, 0)
  if (levels.length === 0) {
    return "No levels yet"
  }
  if (names && names.size > 0) {
    return pipelineFlowSentence(
      levels.map((level) => ({ nodeIds: level.map((node) => node.id) })),
      (id) => names.get(id)
    )
  }
  return `${levels.length} ${levels.length === 1 ? "level" : "levels"} · ${nodeCount} ${nodeCount === 1 ? "node" : "nodes"}`
}

export function pipelineNodeCount(definition: JsonObject) {
  return getPipelineLevels(definition).reduce(
    (count, level) => count + level.length,
    0
  )
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
