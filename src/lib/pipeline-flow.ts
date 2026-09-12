import {
  nodeConfigSummary,
  nodeTypeLabels,
  type NodeType,
  isNodeType,
} from "@/lib/node-definition"
import {
  pipelineLevelExplanation,
  pipelineLevelTitle,
  type CreatePipelineNodeTarget,
  type PipelineLevelDraft,
  type PipelineNodeDraft,
} from "@/lib/pipeline-definition"

export const FLOW = {
  nodeWidth: 272,
  nodeHeight: 112,
  addHeight: 76,
  inputWidth: 176,
  inputHeight: 96,
  gate: 40,
  levelGap: 136,
  nodeYGap: 18,
  originX: 48,
  contentY: 92,
  labelY: 32,
  pad: 64,
} as const

export const PIPELINE_DND_TYPE = "application/x-turul-pipeline-node"

export type PipelineNodeData = {
  nodeKey: string
  levelKey: string
  levelIndex: number
  name: string
  nodeType: string
  summary: string
  parallel: boolean
}

export type PipelineAddData = {
  target: CreatePipelineNodeTarget
  label: string
  hint: string
}

export type PipelineLabelData = {
  title: string
  subtitle: string
  parallel: boolean
}

export type FlowItem =
  | {
      id: string
      kind: "input"
      x: number
      y: number
      width: number
      height: number
    }
  | {
      id: string
      kind: "label"
      x: number
      y: number
      width: number
      height: number
      data: PipelineLabelData
    }
  | {
      id: string
      kind: "node"
      x: number
      y: number
      width: number
      height: number
      data: PipelineNodeData
    }
  | {
      id: string
      kind: "add"
      x: number
      y: number
      width: number
      height: number
      data: PipelineAddData
    }
  | {
      id: string
      kind: "gate"
      x: number
      y: number
      width: number
      height: number
    }

export type FlowEdge = {
  id: string
  sourceId: string
  targetId: string
  animated: boolean
}

export type FlowLayout = {
  items: FlowItem[]
  edges: FlowEdge[]
  width: number
  height: number
  columnCount: number
}

export function levelColumnX(levelIndex: number) {
  return (
    FLOW.originX +
    FLOW.inputWidth +
    FLOW.levelGap +
    levelIndex * (FLOW.nodeWidth + FLOW.levelGap)
  )
}

export function nodeStackY(index: number) {
  return FLOW.contentY + index * (FLOW.nodeHeight + FLOW.nodeYGap)
}

export function snapLevelIndex(x: number, levelCount: number) {
  const columns = Math.max(levelCount, 1)
  const col0 = levelColumnX(0)
  const pitch = FLOW.nodeWidth + FLOW.levelGap
  const raw = Math.round((x - col0) / pitch)
  return Math.max(0, Math.min(columns, raw))
}

export function snapNodeIndex(y: number, count: number) {
  if (count <= 0) {
    return 0
  }
  const relative = y - FLOW.contentY + (FLOW.nodeHeight + FLOW.nodeYGap) / 2
  const index = Math.floor(relative / (FLOW.nodeHeight + FLOW.nodeYGap))
  return Math.max(0, Math.min(count, index))
}

export function defaultCreatedNodeName(
  type: NodeType,
  levels: PipelineLevelDraft[]
) {
  const label = nodeTypeLabels[type]
  const used = levels
    .flatMap((level) => level.nodes)
    .map((node) => node.name.trim())
    .filter(Boolean)
  if (!used.includes(label)) {
    return label
  }
  let suffix = 2
  while (used.includes(`${label} ${suffix}`)) {
    suffix += 1
  }
  return `${label} ${suffix}`
}

export function createTargetForSource(
  levels: PipelineLevelDraft[],
  source:
    { kind: "node"; levelKey: string; levelIndex: number } | { kind: "input" }
): CreatePipelineNodeTarget {
  if (source.kind === "node") {
    const next = levels[source.levelIndex + 1]
    if (next) {
      return { kind: "level", levelKey: next.key }
    }
    return { kind: "after-level", afterLevelKey: source.levelKey }
  }
  const first = levels[0]
  if (!first) {
    return { kind: "empty" }
  }
  return { kind: "level", levelKey: first.key }
}

export function itemCenter(
  item: Pick<FlowItem, "x" | "y" | "width" | "height">
) {
  return { x: item.x + item.width / 2, y: item.y + item.height / 2 }
}

export function itemHandle(
  item: Pick<FlowItem, "x" | "y" | "width" | "height">,
  side: "left" | "right"
) {
  return {
    x: side === "left" ? item.x : item.x + item.width,
    y: item.y + item.height / 2,
  }
}

export function flowBezierPath(x1: number, y1: number, x2: number, y2: number) {
  const curve = Math.max(Math.abs(x2 - x1) * 0.45, 28)
  return `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`
}

export function hitItem(
  items: FlowItem[],
  x: number,
  y: number,
  kinds?: FlowItem["kind"][]
) {
  const list = kinds ? items.filter((item) => kinds.includes(item.kind)) : items
  return [...list]
    .reverse()
    .find(
      (item) =>
        x >= item.x &&
        x <= item.x + item.width &&
        y >= item.y &&
        y <= item.y + item.height
    )
}

function draftType(node: PipelineNodeDraft) {
  return isNodeType(node.type) ? node.type : node.type
}

export function levelsToFlow(
  levels: PipelineLevelDraft[],
  options: { editable: boolean }
): FlowLayout {
  const items: FlowItem[] = []
  const edges: FlowEdge[] = []
  const populated = levels.some((level) => level.nodes.length > 0)
  const firstLevel = levels[0]
  const inputY =
    FLOW.contentY +
    (firstLevel && firstLevel.nodes.length > 1
      ? (nodeStackY(firstLevel.nodes.length - 1) +
          FLOW.nodeHeight -
          FLOW.contentY) /
          2 -
        FLOW.inputHeight / 2
      : (FLOW.nodeHeight - FLOW.inputHeight) / 2)

  items.push({
    id: "pipeline-input",
    kind: "input",
    x: FLOW.originX,
    y: inputY,
    width: FLOW.inputWidth,
    height: FLOW.inputHeight,
  })

  levels.forEach((level, levelIndex) => {
    const parallel = level.nodes.length > 1
    const x = levelColumnX(levelIndex)
    items.push({
      id: `label-${level.key}`,
      kind: "label",
      x,
      y: FLOW.labelY,
      width: FLOW.nodeWidth,
      height: 28,
      data: {
        title: pipelineLevelTitle(levelIndex),
        subtitle: pipelineLevelExplanation(levelIndex, levels.length, parallel),
        parallel,
      },
    })

    level.nodes.forEach((node, nodeIndex) => {
      items.push({
        id: node.key,
        kind: "node",
        x,
        y: nodeStackY(nodeIndex),
        width: FLOW.nodeWidth,
        height: FLOW.nodeHeight,
        data: {
          nodeKey: node.key,
          levelKey: level.key,
          levelIndex,
          name: node.name.trim() || "Untitled node",
          nodeType: draftType(node),
          summary: nodeConfigSummary(node.type, node.definition),
          parallel,
        },
      })
    })

    if (options.editable) {
      items.push({
        id: `add-${level.key}`,
        kind: "add",
        x,
        y:
          level.nodes.length === 0
            ? FLOW.contentY
            : nodeStackY(level.nodes.length),
        width: FLOW.nodeWidth,
        height: FLOW.addHeight,
        data: {
          target: { kind: "level", levelKey: level.key },
          label:
            level.nodes.length === 0 ? "Add a node" : "Add a parallel node",
          hint:
            level.nodes.length === 0
              ? "This level runs first"
              : "Runs at the same time as the others here",
        },
      })
    }
  })

  if (options.editable && populated) {
    const last = levels[levels.length - 1]
    if (last && last.nodes.length > 0) {
      const x = levelColumnX(levels.length)
      items.push({
        id: "label-next",
        kind: "label",
        x,
        y: FLOW.labelY,
        width: FLOW.nodeWidth,
        height: 28,
        data: {
          title: pipelineLevelTitle(levels.length),
          subtitle: "Starts after the previous level finishes.",
          parallel: false,
        },
      })
      items.push({
        id: "add-next-level",
        kind: "add",
        x,
        y: FLOW.contentY,
        width: FLOW.nodeWidth,
        height: FLOW.addHeight,
        data: {
          target: { kind: "after-level", afterLevelKey: last.key },
          label: "Add the next level",
          hint: "Runs after this level completes",
        },
      })
    }
  }

  const firstNodes = firstLevel?.nodes ?? []
  if (firstNodes.length > 0) {
    for (const node of firstNodes) {
      edges.push({
        id: `e-in-${node.key}`,
        sourceId: "pipeline-input",
        targetId: node.key,
        animated: true,
      })
    }
  } else if (options.editable && firstLevel) {
    edges.push({
      id: "e-in-add",
      sourceId: "pipeline-input",
      targetId: `add-${firstLevel.key}`,
      animated: true,
    })
  }

  for (let index = 0; index < levels.length; index += 1) {
    const level = levels[index]
    const next = levels[index + 1]
    const nextAdd = options.editable && !next && level.nodes.length > 0
    if ((!next || next.nodes.length === 0) && !nextAdd) {
      continue
    }

    const gateId = `gate-${level.key}`
    const leftCount = Math.max(level.nodes.length, 1)
    const rightCount = nextAdd ? 1 : Math.max(next?.nodes.length ?? 1, 1)
    const leftCenter =
      FLOW.contentY +
      (leftCount * FLOW.nodeHeight + (leftCount - 1) * FLOW.nodeYGap) / 2
    const rightCenter =
      FLOW.contentY +
      (rightCount * FLOW.nodeHeight + (rightCount - 1) * FLOW.nodeYGap) / 2

    items.push({
      id: gateId,
      kind: "gate",
      x:
        levelColumnX(index) +
        FLOW.nodeWidth +
        FLOW.levelGap / 2 -
        FLOW.gate / 2,
      y: (leftCenter + rightCenter) / 2 - FLOW.gate / 2,
      width: FLOW.gate,
      height: FLOW.gate,
    })

    for (const node of level.nodes) {
      edges.push({
        id: `e-${node.key}-${gateId}`,
        sourceId: node.key,
        targetId: gateId,
        animated: false,
      })
    }
    if (level.nodes.length === 0 && options.editable) {
      edges.push({
        id: `e-add-${level.key}-${gateId}`,
        sourceId: `add-${level.key}`,
        targetId: gateId,
        animated: false,
      })
    }

    if (next && next.nodes.length > 0) {
      for (const node of next.nodes) {
        edges.push({
          id: `e-${gateId}-${node.key}`,
          sourceId: gateId,
          targetId: node.key,
          animated: true,
        })
      }
    } else if (nextAdd) {
      edges.push({
        id: `e-${gateId}-next`,
        sourceId: gateId,
        targetId: "add-next-level",
        animated: true,
      })
    }
  }

  const columnCount =
    Math.max(levels.length, 1) + (options.editable && populated ? 1 : 0)
  const right = items.reduce(
    (max, item) => Math.max(max, item.x + item.width),
    FLOW.originX + FLOW.inputWidth
  )
  const bottom = items.reduce(
    (max, item) => Math.max(max, item.y + item.height),
    FLOW.contentY + FLOW.nodeHeight
  )

  return {
    items,
    edges,
    columnCount,
    width: right + FLOW.pad,
    height: bottom + FLOW.pad,
  }
}
