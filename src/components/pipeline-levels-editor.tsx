import { type ReactNode } from "react"
import {
  BoxIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

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
import { WorkflowSectionHeading } from "@/components/workflow-rule"
import { nodeConfigSummary, nodeTypeLabel } from "@/lib/node-definition"
import {
  movePipelineLevel,
  newPipelineLevel,
  pipelineLevelExplanation,
  pipelineLevelTitle,
  type CreatePipelineNodeTarget,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"
import type { NodeDefinition } from "@/data/networks"

const CHOOSE_NODE = "__choose_node__"

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
  const hasAssignedNodes = levels.some((level) => level.nodeIds.some(Boolean))

  function updateLevel(key: string, nodeIds: string[]) {
    onChange(
      levels.map((level) => (level.key === key ? { ...level, nodeIds } : level))
    )
  }

  function addLevel() {
    onChange([...levels, newPipelineLevel(levels)])
  }

  const lastHasNodes = Boolean(levels.at(-1)?.nodeIds.some(Boolean))

  if (!hasAssignedNodes) {
    return (
      <TooltipProvider delay={400}>
        <WorkflowSectionHeading
          icon={LayersIcon}
          title="Levels"
          description="The pipeline runs one level at a time. Choose what should run in the first level."
        />
        <EmptyPipelineStart
          nodes={nodes}
          pendingIds={pendingIds}
          selectedId={levels[0]?.nodeIds[0] ?? ""}
          createDisabled={createDisabled}
          onSelect={(nodeId) => {
            if (levels.length === 0) {
              onChange([{ ...newPipelineLevel(), nodeIds: [nodeId] }])
              return
            }
            updateLevel(levels[0].key, [nodeId])
          }}
          onCreate={() => onCreateNode({ kind: "empty" })}
        />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider delay={400}>
      <WorkflowSectionHeading
        icon={LayersIcon}
        title="Levels"
        description="The pipeline runs one level at a time. Nodes in the same level run together. When a level finishes, the next level starts."
      />
      <div className="mt-6 flex flex-col">
        {levels.map((level, levelIndex) => (
          <div key={level.key}>
            {levelIndex > 0 ? (
              <PipelineLevelJoiner nextLevel={levelIndex + 1} />
            ) : null}
            <StepCard
              level={level}
              levelIndex={levelIndex}
              totalLevels={levels.length}
              nodes={nodes}
              pendingIds={pendingIds}
              canMoveUp={levelIndex > 0}
              canMoveDown={levelIndex < levels.length - 1}
              createDisabled={createDisabled}
              onChange={(nodeIds) => updateLevel(level.key, nodeIds)}
              onMove={(offset) =>
                onChange(movePipelineLevel(levels, levelIndex, offset))
              }
              onRemove={() =>
                onChange(levels.filter((item) => item.key !== level.key))
              }
              onCreateNode={() =>
                onCreateNode({ kind: "level", levelKey: level.key })
              }
              onEditNode={(nodeId) => onEditNode(nodeId, level.key)}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={!lastHasNodes}
        onClick={addLevel}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <PlusIcon className="size-3.5" />
        Add the next level
      </button>
    </TooltipProvider>
  )
}

function EmptyPipelineStart({
  nodes,
  pendingIds,
  selectedId,
  createDisabled,
  onSelect,
  onCreate,
}: {
  nodes: NodeDefinition[]
  pendingIds: string[]
  selectedId: string
  createDisabled?: boolean
  onSelect: (nodeId: string) => void
  onCreate: () => void
}) {
  const showCards = nodes.length > 0 && nodes.length <= 8

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-l-4 border-l-violet-500 bg-muted/20">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-violet-500/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-violet-800 dark:text-violet-300">
            LEVEL 1
          </span>
          <p className="text-sm font-medium">
            What should run in the first level?
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          This level runs first. You can add the next level after it.
        </p>
      </div>
      <div className="flex flex-col gap-3 p-3">
        {nodes.length === 0 && pendingIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There are no nodes in this network yet. Create one for the first
            level.
          </p>
        ) : showCards ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelect(node.id)}
                className={cn(
                  "rounded-xl border bg-background p-4 text-left shadow-xs transition-colors hover:bg-muted/40",
                  selectedId === node.id && "ring-2 ring-violet-500/40"
                )}
              >
                <NodeSummary node={node} />
              </button>
            ))}
          </div>
        ) : (
          <NodeSelect
            value={selectedId}
            nodes={nodes}
            pendingIds={pendingIds}
            onChange={onSelect}
          />
        )}
        <button
          type="button"
          disabled={createDisabled}
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <PlusIcon className="size-3.5" />
          Create a new node
        </button>
      </div>
    </div>
  )
}

function StepCard({
  level,
  levelIndex,
  totalLevels,
  nodes,
  pendingIds,
  canMoveUp,
  canMoveDown,
  createDisabled,
  onChange,
  onMove,
  onRemove,
  onCreateNode,
  onEditNode,
}: {
  level: PipelineLevelDraft
  levelIndex: number
  totalLevels: number
  nodes: NodeDefinition[]
  pendingIds: string[]
  canMoveUp: boolean
  canMoveDown: boolean
  createDisabled?: boolean
  onChange: (nodeIds: string[]) => void
  onMove: (offset: number) => void
  onRemove: () => void
  onCreateNode: () => void
  onEditNode: (nodeId: string) => void
}) {
  const assigned = level.nodeIds.filter(Boolean)
  const parallel = assigned.length > 1
  const canRemoveStep = totalLevels > 1

  function updateSlot(index: number, nodeId: string) {
    const next = [...level.nodeIds]
    next[index] = nodeId
    onChange(next)
  }

  function removeSlot(index: number) {
    const next = level.nodeIds.filter((_, slotIndex) => slotIndex !== index)
    if (next.length === 0) {
      if (canRemoveStep) {
        onRemove()
        return
      }
      onChange([""])
      return
    }
    onChange(next)
  }

  return (
    <div className="group/level overflow-hidden rounded-xl border border-l-4 border-l-violet-500 bg-muted/20">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-violet-500/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-violet-800 dark:text-violet-300">
              {pipelineLevelTitle(levelIndex).toUpperCase()}
            </span>
            {levelIndex === 0 ? (
              <p className="text-sm font-medium">Runs first</p>
            ) : (
              <p className="text-sm font-medium">
                After {pipelineLevelTitle(levelIndex - 1).toLowerCase()}
              </p>
            )}
            {parallel ? (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Same level · together
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {pipelineLevelExplanation(levelIndex, totalLevels, parallel)}
          </p>
        </div>
        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-focus-within/level:opacity-100 sm:group-hover/level:opacity-100">
          <IconTooltipButton
            label="Move level up"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon />
          </IconTooltipButton>
          <IconTooltipButton
            label="Move level down"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon />
          </IconTooltipButton>
          <IconTooltipButton
            label="Remove level"
            disabled={!canRemoveStep}
            destructive
            onClick={onRemove}
          >
            <Trash2Icon />
          </IconTooltipButton>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {level.nodeIds.map((nodeId, nodeIndex) => {
          const node = nodes.find((item) => item.id === nodeId)
          return (
            <NodeSlot
              key={`${level.key}-${nodeIndex}`}
              node={node}
              nodeId={nodeId}
              nodes={nodes}
              pendingIds={pendingIds}
              canRemove={level.nodeIds.length > 1 || canRemoveStep}
              onChange={(nextId) => updateSlot(nodeIndex, nextId)}
              onRemove={() => removeSlot(nodeIndex)}
              onEdit={
                nodeId && !node?.internal ? () => onEditNode(nodeId) : undefined
              }
            />
          )
        })}
        <button
          type="button"
          onClick={() => onChange([...level.nodeIds, ""])}
          className="flex min-w-0 items-start gap-3 rounded-xl border border-dashed bg-transparent p-4 text-left transition-colors hover:bg-muted/40"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <PlusIcon className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              Add another node in this level
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Runs at the same time as the other nodes here
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={createDisabled}
          onClick={onCreateNode}
          className="flex min-w-0 items-start gap-3 rounded-xl border border-dashed bg-transparent p-4 text-left transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <PlusIcon className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Create a new node</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Make a node and add it to this level
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}

function NodeSlot({
  node,
  nodeId,
  nodes,
  pendingIds,
  canRemove,
  onChange,
  onRemove,
  onEdit,
}: {
  node?: NodeDefinition
  nodeId: string
  nodes: NodeDefinition[]
  pendingIds: string[]
  canRemove: boolean
  onChange: (nodeId: string) => void
  onRemove: () => void
  onEdit?: () => void
}) {
  if (!nodeId) {
    return (
      <div className="rounded-xl border bg-background p-4 shadow-xs">
        <p className="text-sm font-medium">Choose a node</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          This level needs a node before the pipeline can run.
        </p>
        <div className="mt-3">
          <NodeSelect
            value=""
            nodes={nodes}
            pendingIds={pendingIds}
            onChange={onChange}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <IconTooltipButton
            label="Remove node"
            disabled={!canRemove}
            destructive
            onClick={onRemove}
          >
            <Trash2Icon />
          </IconTooltipButton>
        </div>
      </div>
    )
  }

  const summary = node
    ? nodeConfigSummary(node.type, node.definition)
    : nodeId
      ? "New node"
      : undefined

  return (
    <div className="group/node rounded-xl border bg-background p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            node
              ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
              : "bg-muted text-muted-foreground"
          )}
        >
          <BoxIcon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {node?.name ?? "New node"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {node ? nodeTypeLabel(node.type) : "Just created"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-focus-within/node:opacity-100 sm:group-hover/node:opacity-100">
          {onEdit ? (
            <IconTooltipButton label="Edit node" onClick={onEdit}>
              <PencilIcon />
            </IconTooltipButton>
          ) : null}
          <IconTooltipButton
            label="Remove node"
            disabled={!canRemove}
            destructive
            onClick={onRemove}
          >
            <Trash2Icon />
          </IconTooltipButton>
        </div>
      </div>
      {summary ? (
        <p className="mt-3 truncate font-mono text-xs text-muted-foreground">
          {summary}
        </p>
      ) : null}
      {nodes.length > 0 ? (
        <div className="mt-3">
          <NodeSelect
            value={nodeId}
            nodes={nodes}
            pendingIds={pendingIds}
            onChange={onChange}
          />
        </div>
      ) : null}
    </div>
  )
}

function NodeSummary({ node }: { node: NodeDefinition }) {
  const summary = nodeConfigSummary(node.type, node.definition)
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
        <BoxIcon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{node.name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {nodeTypeLabel(node.type)}
          {summary ? ` · ${summary}` : ""}
        </span>
      </span>
    </div>
  )
}

function NodeSelect({
  value,
  nodes,
  pendingIds,
  onChange,
}: {
  value: string
  nodes: NodeDefinition[]
  pendingIds: string[]
  onChange: (nodeId: string) => void
}) {
  return (
    <Select
      value={value || CHOOSE_NODE}
      modal={false}
      items={[
        { value: CHOOSE_NODE, label: "Choose a node" },
        ...nodes.map((node) => ({
          value: node.id,
          label: `${node.name} (${nodeTypeLabel(node.type)})`,
        })),
        ...pendingIds.map((id) => ({ value: id, label: "New node" })),
      ]}
      onValueChange={(next) => {
        if (!next || next === CHOOSE_NODE) {
          onChange("")
          return
        }
        onChange(next)
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Choose a node" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CHOOSE_NODE}>Choose a node</SelectItem>
        {nodes.map((node) => (
          <SelectItem key={node.id} value={node.id}>
            {node.name}
            <span className="ml-1 text-xs text-muted-foreground">
              {nodeTypeLabel(node.type)}
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
  )
}

export function PipelineLevelJoiner({ nextLevel }: { nextLevel: number }) {
  return (
    <div className="flex flex-col items-center py-2" aria-hidden="true">
      <span className="h-4 w-px bg-violet-500/40" />
      <span className="my-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-violet-700 dark:text-violet-300">
        THEN {pipelineLevelTitle(nextLevel - 1).toUpperCase()}
      </span>
      <span className="h-4 w-px bg-violet-500/40" />
    </div>
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
            size="icon-xs"
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "text-muted-foreground",
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
