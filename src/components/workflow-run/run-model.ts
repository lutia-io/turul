import {
  CheckIcon,
  CircleDashedIcon,
  CircleSlashIcon,
  LoaderCircleIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import type { JsonObject } from "@/lib/json-definition"
import { nodeTypeLabel } from "@/lib/node-definition"
import type { ApiWorkflow, ApiWorkflowNode } from "@/store/workflow-slice"

export type StepState = "done" | "failed" | "running" | "waiting" | "skipped"

export type NodeView = {
  key: string
  type: string
  definition: JsonObject
  levelIndex: number
  nodeIndex: number
  attempts: ApiWorkflowNode[]
  state: StepState
  retrying: boolean
}

export type LevelView = {
  index: number
  nodes: NodeView[]
  state: StepState
}

export const TRIGGER_ID = "trigger"
export const CONDITIONS_ID = "conditions"

export const stepStateTone: Record<
  StepState,
  {
    marker: string
    text: string
    pill: string
    bar: string
    stroke: string
    border: string
    icon: LucideIcon
  }
> = {
  done: {
    marker: "bg-emerald-500 text-white",
    text: "text-emerald-700 dark:text-emerald-400",
    pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-500",
    stroke: "stroke-emerald-500/70",
    border: "border-emerald-500/30",
    icon: CheckIcon,
  },
  failed: {
    marker: "bg-red-500 text-white",
    text: "text-red-700 dark:text-red-400",
    pill: "bg-red-500/10 text-red-700 dark:text-red-400",
    bar: "bg-red-500",
    stroke: "stroke-red-500/70",
    border: "border-red-500/50",
    icon: XIcon,
  },
  running: {
    marker: "bg-cyan-500 text-white",
    text: "text-cyan-700 dark:text-cyan-400",
    pill: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    bar: "animate-pulse bg-cyan-500",
    stroke: "stroke-cyan-500",
    border: "border-cyan-500/50 shadow-[0_0_0_4px] shadow-cyan-500/15",
    icon: LoaderCircleIcon,
  },
  waiting: {
    marker: "bg-card text-muted-foreground ring-1 ring-border",
    text: "text-muted-foreground",
    pill: "bg-muted text-muted-foreground",
    bar: "bg-muted-foreground/15",
    stroke: "stroke-border",
    border: "border-dashed",
    icon: CircleDashedIcon,
  },
  skipped: {
    marker: "bg-muted text-muted-foreground/70",
    text: "text-muted-foreground",
    pill: "bg-muted text-muted-foreground",
    bar: "bg-muted-foreground/10",
    stroke: "stroke-border",
    border: "border-dashed opacity-60",
    icon: CircleSlashIcon,
  },
}

export const stepStateLabel: Record<StepState, string> = {
  done: "Done",
  failed: "Failed",
  running: "Running",
  waiting: "Waiting",
  skipped: "Didn't run",
}

export function isSuccessStatus(status: string) {
  return status === "completed" || status === "succeeded"
}

export function buildLevels(
  run: ApiWorkflow,
  attempts: ApiWorkflowNode[]
): LevelView[] {
  const byNode = new Map<string, ApiWorkflowNode[]>()
  for (const attempt of attempts) {
    const key = nodeKey(attempt.levelIndex, attempt.nodeIndex)
    byNode.set(key, [...(byNode.get(key) ?? []), attempt])
  }

  return (run.definition.nodes ?? []).map((level, levelIndex) => {
    const nodes = level.map((node, nodeIndex): NodeView => {
      const key = nodeKey(levelIndex, nodeIndex)
      const history = (byNode.get(key) ?? []).sort(
        (left, right) => left.attempt - right.attempt
      )
      const latest = history.at(-1)
      const state = nodeState(run, levelIndex, latest)
      return {
        key,
        type: node.type,
        definition: node.definition,
        levelIndex,
        nodeIndex,
        attempts: history,
        state,
        retrying: state === "running" && latest?.status === "failed",
      }
    })
    return {
      index: levelIndex,
      nodes,
      state: levelState(nodes.map((node) => node.state)),
    }
  })
}

function nodeKey(levelIndex: number, nodeIndex: number) {
  return `node:${levelIndex}:${nodeIndex}`
}

function nodeState(
  run: ApiWorkflow,
  levelIndex: number,
  latest: ApiWorkflowNode | undefined
): StepState {
  if (latest && isSuccessStatus(latest.status)) {
    return "done"
  }
  if (run.status === "completed") {
    return "done"
  }
  if (run.status === "pending") {
    return "waiting"
  }
  if (levelIndex < run.currentLevel) {
    return latest?.status === "failed" ? "failed" : "done"
  }
  if (levelIndex > run.currentLevel) {
    return run.status === "failed" ? "skipped" : "waiting"
  }
  if (run.status === "running") {
    return "running"
  }
  return latest ? "failed" : "skipped"
}

function levelState(states: StepState[]): StepState {
  if (states.includes("failed")) {
    return "failed"
  }
  if (states.includes("running")) {
    return "running"
  }
  if (states.every((state) => state === "done")) {
    return "done"
  }
  if (states.every((state) => state === "skipped")) {
    return "skipped"
  }
  return "waiting"
}

export function allNodes(levels: LevelView[]) {
  return levels.flatMap((level) => level.nodes)
}

export function selectionOrder(levels: LevelView[]) {
  return [
    TRIGGER_ID,
    CONDITIONS_ID,
    ...allNodes(levels).map((node) => node.key),
  ]
}

export function defaultSelection(levels: LevelView[]) {
  const nodes = allNodes(levels)
  return (
    nodes.find((node) => node.state === "failed")?.key ??
    nodes.find((node) => node.state === "running")?.key ??
    TRIGGER_ID
  )
}

export function retryCount(levels: LevelView[]) {
  return allNodes(levels).reduce(
    (total, node) => total + Math.max(node.attempts.length - 1, 0),
    0
  )
}

export function attemptDurationMs(attempt: ApiWorkflowNode) {
  return (
    new Date(attempt.completedAt).getTime() -
    new Date(attempt.startedAt).getTime()
  )
}

export function nodeDurationMs(node: NodeView) {
  const latest = node.attempts.at(-1)
  return latest ? attemptDurationMs(latest) : undefined
}

export function levelDurationMs(level: LevelView) {
  const attempts = level.nodes.flatMap((node) => node.attempts)
  if (attempts.length === 0) {
    return undefined
  }
  const start = Math.min(
    ...attempts.map((attempt) => new Date(attempt.startedAt).getTime())
  )
  const end = Math.max(
    ...attempts.map((attempt) => new Date(attempt.completedAt).getTime())
  )
  return end - start
}

export function formatMs(ms: number | undefined) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return "—"
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes < 60) {
    return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`
  }
  const hours = Math.floor(minutes / 60)
  const minuteRemainder = minutes % 60
  return minuteRemainder === 0 ? `${hours}h` : `${hours}h ${minuteRemainder}m`
}

export function formatAbsoluteTime(iso: string) {
  return new Date(iso).toLocaleString()
}

export function runElapsedMs(run: ApiWorkflow, now: number) {
  const end = run.completedAt ? new Date(run.completedAt).getTime() : now
  return Math.max(end - new Date(run.createdAt).getTime(), 0)
}

function joinLabels(labels: string[]) {
  if (labels.length <= 1) {
    return labels[0] ?? ""
  }
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

export function runNarrative(
  run: ApiWorkflow,
  levels: LevelView[],
  now: number
) {
  const nodes = allNodes(levels)
  const elapsed = formatMs(runElapsedMs(run, now))
  const scope = `${plural(nodes.length, "action")} across ${plural(levels.length, "step")}`

  if (run.status === "pending") {
    return `Queued and waiting to start. Once it begins it will run ${scope}.`
  }

  if (run.status === "running") {
    const current = levels.find((level) => level.state === "running")
    const done = levels.filter((level) => level.state === "done").length
    if (!current) {
      return `Running for ${elapsed}. ${done} of ${plural(levels.length, "step")} finished so far.`
    }
    const labels = joinLabels(
      current.nodes
        .filter((node) => node.state === "running")
        .map((node) => nodeTypeLabel(node.type))
    )
    const retrying = current.nodes.some((node) => node.retrying)
    return `Running for ${elapsed}. ${done} of ${plural(levels.length, "step")} finished, now ${retrying ? "retrying" : "working on"} step ${current.index + 1}: ${labels}.`
  }

  if (run.status === "failed") {
    const failed = nodes.find((node) => node.state === "failed")
    if (!failed) {
      return `Stopped after ${elapsed} without finishing.`
    }
    const tries = failed.attempts.length
    return `Stopped at step ${failed.levelIndex + 1} after ${elapsed}. The ${nodeTypeLabel(failed.type)} action failed${tries > 1 ? ` after ${tries} tries` : ""}, so the remaining steps didn't run.`
  }

  const retries = retryCount(levels)
  return `Ran ${scope} in ${elapsed}.${
    retries > 0
      ? ` It needed ${retries} ${retries === 1 ? "retry" : "retries"} along the way, but everything finished.`
      : " Every action succeeded on the first try."
  }`
}
