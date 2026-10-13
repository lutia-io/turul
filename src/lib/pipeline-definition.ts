import { getPipelineLevels, type JsonObject } from "@/lib/json-definition"
import {
  defaultDefinition,
  isNodeType,
  nodeTypeLabel,
  type NodeType,
} from "@/lib/node-definition"

export type PipelineNodeConfig = {
  type: NodeType
  definition: JsonObject
}

export type PipelineDefinitionBody = {
  nodes: PipelineNodeConfig[][]
}

export type PipelineNodeDraft = PipelineNodeConfig & {
  key: string
}

export type PipelineLevelDraft = {
  key: string
  nodes: PipelineNodeDraft[]
}

export type CreatePipelineNodeTarget =
  | { kind: "empty" }
  | { kind: "level"; levelKey: string }
  | { kind: "after-level"; afterLevelKey: string }

export type PipelineNodeEditorTarget = {
  levelKey: string
  nodeKey?: string
}

let draftSeq = 0

export function newDraftKey(prefix = "item") {
  draftSeq += 1
  return `${prefix}-${draftSeq}-${Math.random().toString(36).slice(2, 8)}`
}

export function newPipelineNode(
  node?: Partial<PipelineNodeConfig>
): PipelineNodeDraft {
  const type = node?.type && isNodeType(node.type) ? node.type : "HTTP"
  return {
    key: newDraftKey("node"),
    type,
    definition: node?.definition ?? defaultDefinition(type),
  }
}

export function newPipelineLevel(
  existing: PipelineLevelDraft[] = []
): PipelineLevelDraft {
  return {
    key: newDraftKey(`level-${existing.length + 1}`),
    nodes: [],
  }
}

export function emptyPipelineLevels(): PipelineLevelDraft[] {
  return [newPipelineLevel()]
}

export function emptyPipelineDefinition(): PipelineDefinitionBody {
  return { nodes: [] }
}

function parseNodeConfig(value: unknown): PipelineNodeConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }
  const item = value as {
    type?: unknown
    definition?: unknown
  }
  if (typeof item.type !== "string" || !isNodeType(item.type)) {
    return undefined
  }
  if (
    !item.definition ||
    typeof item.definition !== "object" ||
    Array.isArray(item.definition)
  ) {
    return undefined
  }
  return {
    type: item.type,
    definition: item.definition as JsonObject,
  }
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

  const levels: PipelineNodeConfig[][] = []
  for (const level of nodes) {
    if (!Array.isArray(level) || level.length === 0) {
      return undefined
    }
    const parsed: PipelineNodeConfig[] = []
    for (const item of level) {
      const node = parseNodeConfig(item)
      if (!node) {
        return undefined
      }
      parsed.push(node)
    }
    levels.push(parsed)
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
    nodes: level.map((node) => newPipelineNode(node)),
  }))
}

export function levelsToApi(
  levels: PipelineLevelDraft[]
): PipelineDefinitionBody | undefined {
  const nodes = levels
    .map((level) =>
      level.nodes.map((node) => ({
        type: node.type,
        definition: node.definition,
      }))
    )
    .filter((level) => level.length > 0)
  if (nodes.length === 0) {
    return undefined
  }
  return { nodes }
}

export function compactPipelineLevels(
  levels: PipelineLevelDraft[]
): PipelineLevelDraft[] {
  const next = levels.filter((level) => level.nodes.length > 0)
  return next.length > 0 ? next : emptyPipelineLevels()
}

export function insertCreatedNode(
  levels: PipelineLevelDraft[],
  node: PipelineNodeConfig,
  target: CreatePipelineNodeTarget
): PipelineLevelDraft[] {
  const nextNode = newPipelineNode(node)
  if (target.kind === "empty") {
    if (levels.length === 0) {
      return [{ ...newPipelineLevel(), nodes: [nextNode] }]
    }
    const targetLevel = levels[0]
    return levels.map((level) =>
      level.key === targetLevel.key
        ? { ...level, nodes: [...level.nodes, nextNode] }
        : level
    )
  }

  if (target.kind === "after-level") {
    const index = levels.findIndex(
      (level) => level.key === target.afterLevelKey
    )
    const newLevel = { ...newPipelineLevel(levels), nodes: [nextNode] }
    if (index < 0) {
      return [...levels, newLevel]
    }
    const next = [...levels]
    next.splice(index + 1, 0, newLevel)
    return next
  }

  if (!levels.some((level) => level.key === target.levelKey)) {
    return [...levels, { ...newPipelineLevel(levels), nodes: [nextNode] }]
  }

  return levels.map((level) =>
    level.key === target.levelKey
      ? { ...level, nodes: [...level.nodes, nextNode] }
      : level
  )
}

export function removePipelineNode(
  levels: PipelineLevelDraft[],
  levelKey: string,
  nodeKey: string
): PipelineLevelDraft[] {
  return compactPipelineLevels(
    levels.map((level) =>
      level.key === levelKey
        ? {
            ...level,
            nodes: level.nodes.filter((node) => node.key !== nodeKey),
          }
        : level
    )
  )
}

export function movePipelineNode(
  levels: PipelineLevelDraft[],
  nodeKey: string,
  toLevelIndex: number,
  toIndex: number
): PipelineLevelDraft[] {
  const fromLevelIndex = levels.findIndex((level) =>
    level.nodes.some((node) => node.key === nodeKey)
  )
  const fromIndex =
    fromLevelIndex >= 0
      ? levels[fromLevelIndex].nodes.findIndex((node) => node.key === nodeKey)
      : -1
  const targetIndex = Math.max(0, toLevelIndex)
  if (
    fromLevelIndex >= 0 &&
    fromIndex >= 0 &&
    fromLevelIndex === Math.min(targetIndex, levels.length - 1) &&
    targetIndex < levels.length &&
    fromIndex === toIndex
  ) {
    return levels
  }

  let moving: PipelineNodeDraft | undefined
  const without = levels.map((level) => {
    const node = level.nodes.find((item) => item.key === nodeKey)
    if (!node) {
      return level
    }
    moving = node
    return {
      ...level,
      nodes: level.nodes.filter((item) => item.key !== nodeKey),
    }
  })
  if (!moving) {
    return levels
  }

  const next = [...without]
  if (targetIndex >= next.length) {
    next.push({ ...newPipelineLevel(next), nodes: [] })
  }

  const levelIndex = Math.min(targetIndex, next.length - 1)
  const level = next[levelIndex]
  const insertAt = Math.max(0, Math.min(toIndex, level.nodes.length))
  const nodes = [...level.nodes]
  nodes.splice(insertAt, 0, moving)
  next[levelIndex] = { ...level, nodes }
  return compactPipelineLevels(next)
}

export function replacePipelineNode(
  levels: PipelineLevelDraft[],
  levelKey: string,
  nodeKey: string,
  node: PipelineNodeConfig
): PipelineLevelDraft[] {
  return levels.map((level) =>
    level.key === levelKey
      ? {
          ...level,
          nodes: level.nodes.map((item) =>
            item.key === nodeKey ? { ...item, ...node, key: item.key } : item
          ),
        }
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

function joinLabels(labels: string[]) {
  if (labels.length === 0) {
    return ""
  }
  if (labels.length === 1) {
    return labels[0]
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]} together`
  }
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]} together`
}

export function pipelineFlowSentence(levels: { labels: string[] }[]) {
  const parts = levels.flatMap((level) =>
    level.labels.length > 0 ? [joinLabels(level.labels)] : []
  )
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

export function pipelineDraftSentence(levels: PipelineLevelDraft[]) {
  return pipelineFlowSentence(
    levels.map((level) => ({
      labels: level.nodes.map((node) => nodeTypeLabel(node.type) || "a node"),
    }))
  )
}

export function pipelineSummary(definition: JsonObject) {
  const levels = getPipelineLevels(definition)
  if (levels.length === 0) {
    return "No levels yet"
  }
  return pipelineFlowSentence(
    levels.map((level) => ({
      labels: level.map((node) => nodeTypeLabel(node.type) || "a node"),
    }))
  )
}

export function pipelineNodeCount(definition: JsonObject) {
  return getPipelineLevels(definition).reduce(
    (count, level) => count + level.length,
    0
  )
}
