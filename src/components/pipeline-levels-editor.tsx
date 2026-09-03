import { type ReactNode } from "react"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { nodeConfigSummary, nodeTypeLabel } from "@/lib/node-definition"
import { cn } from "@/lib/utils"
import type { NodeDefinition } from "@/data/networks"

export type PipelineLevelDraft = {
  key: string
  nodeIds: string[]
}

export type CreatePipelineNodeTarget =
  { kind: "empty" } | { kind: "level"; levelKey: string }

export function newPipelineLevel(
  existing: PipelineLevelDraft[] = []
): PipelineLevelDraft {
  return {
    key: `level-${existing.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
    nodeIds: [""],
  }
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

export function PipelineLevelsEditor({
  levels,
  nodes,
  onChange,
  onCreateNode,
  onEditNode,
  createDisabled,
}: {
  levels: PipelineLevelDraft[]
  nodes: NodeDefinition[]
  onChange: (levels: PipelineLevelDraft[]) => void
  onCreateNode: (target: CreatePipelineNodeTarget) => void
  onEditNode: (nodeId: string, levelKey: string) => void
  createDisabled?: boolean
}) {
  const pendingIds = [
    ...new Set(
      levels.flatMap((level) =>
        level.nodeIds.filter(
          (id) => id && !nodes.some((node) => node.id === id)
        )
      )
    ),
  ]
  const nodeItems = [
    ...nodes.map((node) => ({
      value: node.id,
      label: `${node.name} (${nodeTypeLabel(node.type)})`,
    })),
    ...pendingIds.map((id) => ({ value: id, label: "New node" })),
  ]

  function updateLevel(key: string, nodeIds: string[]) {
    onChange(
      levels.map((level) => (level.key === key ? { ...level, nodeIds } : level))
    )
  }

  function addLevel() {
    onChange([...levels, newPipelineLevel(levels)])
  }

  const hasAssignedNodes = levels.some((level) => level.nodeIds.some(Boolean))

  if (nodes.length === 0 && !hasAssignedNodes) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Create a node to add it to this pipeline.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={createDisabled}
          onClick={() => onCreateNode({ kind: "empty" })}
        >
          <PlusIcon />
          Create node
        </Button>
      </div>
    )
  }

  if (levels.length === 0) {
    return (
      <button
        type="button"
        onClick={addLevel}
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <PlusIcon className="size-4" />
        Add a level.
      </button>
    )
  }

  return (
    <TooltipProvider delay={400}>
      <div className="flex flex-col gap-3">
        {levels.map((level, levelIndex) => (
          <div
            key={level.key}
            className="overflow-hidden rounded-xl border bg-background"
          >
            <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Level {levelIndex}</p>
                <p className="text-xs text-muted-foreground">
                  Order is the 0-based index later levels read as {"{{ .Input."}
                  {levelIndex === 0 ? "0" : String(levelIndex)}
                  {" }}"}
                </p>
              </div>
              <IconTooltipButton
                label="Remove level"
                disabled={levels.length === 1}
                destructive
                onClick={() =>
                  onChange(levels.filter((item) => item.key !== level.key))
                }
              >
                <Trash2Icon />
              </IconTooltipButton>
            </div>
            <div className="flex flex-col gap-2 p-3">
              {level.nodeIds.map((nodeId, nodeIndex) => {
                const node = nodes.find((item) => item.id === nodeId)
                const summary = node
                  ? nodeConfigSummary(node.type, node.definition)
                  : nodeId
                    ? "New node"
                    : undefined
                const canEdit = Boolean(nodeId) && !node?.internal

                return (
                  <div
                    key={`${level.key}-${nodeIndex}`}
                    className="rounded-lg border bg-muted/10 p-2"
                  >
                    <div className="flex gap-2">
                      <Select
                        value={nodeId || "__choose_node__"}
                        modal={false}
                        items={[
                          { value: "__choose_node__", label: "Choose a node" },
                          ...nodeItems,
                        ]}
                        onValueChange={(value) => {
                          const next = [...level.nodeIds]
                          next[nodeIndex] =
                            value === "__choose_node__" ? "" : value
                          updateLevel(level.key, next)
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Choose a node" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__choose_node__">
                            Choose a node
                          </SelectItem>
                          {nodes.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                              <span className="ml-1 font-mono text-xs text-muted-foreground">
                                {item.slug} · {nodeTypeLabel(item.type)}
                              </span>
                            </SelectItem>
                          ))}
                          {pendingIds.map((id) => (
                            <SelectItem key={id} value={id}>
                              New node
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="self-start"
                          onClick={() => onEditNode(nodeId, level.key)}
                        >
                          <PencilIcon />
                          Edit
                        </Button>
                      ) : null}
                      <IconTooltipButton
                        label="Remove node"
                        disabled={level.nodeIds.length === 1}
                        destructive
                        onClick={() =>
                          updateLevel(
                            level.key,
                            level.nodeIds.filter(
                              (_, index) => index !== nodeIndex
                            )
                          )
                        }
                      >
                        <Trash2Icon />
                      </IconTooltipButton>
                    </div>
                    {summary ? (
                      <p className="mt-1.5 truncate px-1 font-mono text-[11px] text-muted-foreground">
                        {summary}
                      </p>
                    ) : null}
                  </div>
                )
              })}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateLevel(level.key, [...level.nodeIds, ""])}
                >
                  <PlusIcon />
                  Add node
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={createDisabled}
                  onClick={() =>
                    onCreateNode({ kind: "level", levelKey: level.key })
                  }
                >
                  <PlusIcon />
                  Create node
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addLevel}>
          <PlusIcon />
          Add level
        </Button>
      </div>
    </TooltipProvider>
  )
}

function IconTooltipButton({
  label,
  disabled,
  onClick,
  destructive,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  destructive?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "self-start text-muted-foreground",
              destructive && "hover:bg-destructive/10 hover:text-destructive"
            )}
          />
        }
      >
        {children}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
