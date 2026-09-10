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
  type PipelineNodeDraft,
} from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"

export function PipelineLevelsEditor({
  levels,
  onChange,
  onCreateNode,
  onEditNode,
}: {
  levels: PipelineLevelDraft[]
  onChange: (levels: PipelineLevelDraft[]) => void
  onCreateNode: (target: CreatePipelineNodeTarget) => void
  onEditNode: (nodeKey: string, levelKey: string) => void
}) {
  const hasAssignedNodes = levels.some((level) => level.nodes.length > 0)

  function updateLevel(key: string, nodes: PipelineNodeDraft[]) {
    onChange(
      levels.map((level) => (level.key === key ? { ...level, nodes } : level))
    )
  }

  function addLevel() {
    onChange([...levels, newPipelineLevel(levels)])
  }

  const lastHasNodes = Boolean(levels.at(-1)?.nodes.length)

  if (!hasAssignedNodes) {
    return (
      <TooltipProvider delay={400}>
        <WorkflowSectionHeading
          icon={LayersIcon}
          title="Levels"
          description="The pipeline runs one level at a time. Add a node to the first level."
        />
        <EmptyPipelineStart onCreate={() => onCreateNode({ kind: "empty" })} />
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
              canMoveUp={levelIndex > 0}
              canMoveDown={levelIndex < levels.length - 1}
              onChange={(nodes) => updateLevel(level.key, nodes)}
              onMove={(offset) =>
                onChange(movePipelineLevel(levels, levelIndex, offset))
              }
              onRemove={() =>
                onChange(levels.filter((item) => item.key !== level.key))
              }
              onCreateNode={() =>
                onCreateNode({ kind: "level", levelKey: level.key })
              }
              onEditNode={(nodeKey) => onEditNode(nodeKey, level.key)}
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

function EmptyPipelineStart({ onCreate }: { onCreate: () => void }) {
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
        <p className="text-sm text-muted-foreground">
          Add a node to start this pipeline. Node config is stored on the
          pipeline.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
        >
          <PlusIcon className="size-3.5" />
          Add a node
        </button>
      </div>
    </div>
  )
}

function StepCard({
  level,
  levelIndex,
  totalLevels,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onRemove,
  onCreateNode,
  onEditNode,
}: {
  level: PipelineLevelDraft
  levelIndex: number
  totalLevels: number
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (nodes: PipelineNodeDraft[]) => void
  onMove: (offset: number) => void
  onRemove: () => void
  onCreateNode: () => void
  onEditNode: (nodeKey: string) => void
}) {
  const parallel = level.nodes.length > 1
  const canRemoveStep = totalLevels > 1

  function removeSlot(index: number) {
    const next = level.nodes.filter((_, slotIndex) => slotIndex !== index)
    if (next.length === 0) {
      if (canRemoveStep) {
        onRemove()
        return
      }
      onChange([])
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
        {level.nodes.map((node, nodeIndex) => (
          <NodeSlot
            key={node.key}
            node={node}
            canRemove={level.nodes.length > 1 || canRemoveStep}
            onRemove={() => removeSlot(nodeIndex)}
            onEdit={() => onEditNode(node.key)}
          />
        ))}
        <button
          type="button"
          onClick={onCreateNode}
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
      </div>
    </div>
  )
}

function NodeSlot({
  node,
  canRemove,
  onRemove,
  onEdit,
}: {
  node: PipelineNodeDraft
  canRemove: boolean
  onRemove: () => void
  onEdit: () => void
}) {
  const summary = nodeConfigSummary(node.type, node.definition)

  return (
    <div className="group/node rounded-xl border bg-background p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <BoxIcon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {node.name.trim() || "Untitled node"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {nodeTypeLabel(node.type)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-focus-within/node:opacity-100 sm:group-hover/node:opacity-100">
          <IconTooltipButton label="Edit node" onClick={onEdit}>
            <PencilIcon />
          </IconTooltipButton>
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
    </div>
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
