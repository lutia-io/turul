import {
  createContext,
  useContext,
  type PointerEvent,
  type ReactNode,
} from "react"
import {
  ArrowLeftRightIcon,
  ChevronRightIcon,
  FileTextIcon,
  GlobeIcon,
  Layers2Icon,
  ListTreeIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Table2Icon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  isNodeType,
  nodeTypeLabels,
  nodeTypes,
  type NodeType,
} from "@/lib/node-definition"
import type {
  PipelineAddData,
  PipelineLabelData,
  PipelineNodeData,
} from "@/lib/pipeline-flow"
import type { CreatePipelineNodeTarget } from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"

export type PipelineFlowActions = {
  editable: boolean
  onEdit: (nodeKey: string, levelKey: string) => void
  onDelete: (nodeKey: string, levelKey: string) => void
  onRequestCreate: (
    target: CreatePipelineNodeTarget,
    clientX: number,
    clientY: number
  ) => void
}

const PipelineFlowActionsContext = createContext<PipelineFlowActions | null>(
  null
)

export function PipelineFlowActionsProvider({
  value,
  children,
}: {
  value: PipelineFlowActions
  children: ReactNode
}) {
  return (
    <PipelineFlowActionsContext.Provider value={value}>
      {children}
    </PipelineFlowActionsContext.Provider>
  )
}

export function usePipelineFlowActions() {
  return useContext(PipelineFlowActionsContext)
}

type NodeVisual = {
  icon: LucideIcon
  color: BadgeColor
  wrap: string
}

export const pipelineNodeVisuals: Record<NodeType, NodeVisual> = {
  NOOP: {
    icon: PlayIcon,
    color: "gray",
    wrap: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  },
  HTTP: {
    icon: GlobeIcon,
    color: "blue",
    wrap: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  MAPPER: {
    icon: ArrowLeftRightIcon,
    color: "purple",
    wrap: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  LIST_MAPPER: {
    icon: ListTreeIcon,
    color: "pink",
    wrap: "bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-300",
  },
  FILE: {
    icon: FileTextIcon,
    color: "orange",
    wrap: "bg-orange-500/10 text-orange-800 dark:text-orange-300",
  },
  RECORD: {
    icon: Table2Icon,
    color: "cyan",
    wrap: "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300",
  },
  BULK: {
    icon: Layers2Icon,
    color: "teal",
    wrap: "bg-teal-500/10 text-teal-800 dark:text-teal-300",
  },
}

export function visualForNodeType(type: string): NodeVisual {
  return isNodeType(type) ? pipelineNodeVisuals[type] : pipelineNodeVisuals.NOOP
}

export const pipelineNodeTypeItems = nodeTypes.map((type) => ({
  type,
  label: nodeTypeLabels[type],
  visual: pipelineNodeVisuals[type],
}))

function FlowHandle({
  side,
  connectable,
  onPointerDown,
}: {
  side: "left" | "right"
  connectable?: boolean
  onPointerDown?: (event: PointerEvent<HTMLSpanElement>) => void
}) {
  return (
    <span
      data-flow-handle={side}
      className={cn(
        "absolute top-1/2 z-10 size-2.5 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_22%,transparent)]",
        side === "left" ? "-left-1.5" : "-right-1.5",
        connectable && "cursor-crosshair"
      )}
      onPointerDown={connectable ? onPointerDown : undefined}
    />
  )
}

export function PipelineNodeCard({
  data,
  selected,
  onSelect,
  onConnectStart,
  onPointerDragStart,
}: {
  data: PipelineNodeData
  selected: boolean
  onSelect: () => void
  onConnectStart?: (event: PointerEvent<HTMLSpanElement>) => void
  onPointerDragStart?: (event: PointerEvent<HTMLDivElement>) => void
}) {
  const actions = usePipelineFlowActions()
  const visual = visualForNodeType(data.nodeType)
  const Icon = visual.icon
  const tone = getBadgeColor(visual.color)
  const editable = Boolean(actions?.editable)

  return (
    <Card
      size="sm"
      data-flow-node={data.nodeKey}
      onClick={onSelect}
      onDoubleClick={() => actions?.onEdit(data.nodeKey, data.levelKey)}
      onPointerDown={editable ? onPointerDragStart : undefined}
      className={cn(
        "relative h-full w-full cursor-default gap-0 overflow-visible py-3 transition-[box-shadow,transform,ring-color]",
        editable && "cursor-grab active:cursor-grabbing",
        selected
          ? "shadow-lg ring-2 shadow-primary/10 ring-primary"
          : "hover:shadow-md hover:ring-foreground/20"
      )}
    >
      {editable && selected ? (
        <div className="absolute -top-9 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-lg bg-popover p-0.5 shadow-md ring-1 ring-foreground/10">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    actions?.onEdit(data.nodeKey, data.levelKey)
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                />
              }
            >
              <PencilIcon />
              <span className="sr-only">Edit node</span>
            </TooltipTrigger>
            <TooltipContent>Edit node</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation()
                    actions?.onDelete(data.nodeKey, data.levelKey)
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                />
              }
            >
              <Trash2Icon />
              <span className="sr-only">Remove node</span>
            </TooltipTrigger>
            <TooltipContent>Remove node</TooltipContent>
          </Tooltip>
        </div>
      ) : null}
      <span
        className={cn("absolute inset-y-0 left-0 w-1 rounded-l-xl", tone.bg)}
      />
      <div className="flex items-start gap-3 px-3.5 pl-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            visual.wrap
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight">
            {data.name}
          </p>
          <p className="truncate text-[11px] font-medium text-muted-foreground">
            {isNodeType(data.nodeType)
              ? nodeTypeLabels[data.nodeType]
              : data.nodeType}
          </p>
        </div>
        {data.parallel ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Together
          </span>
        ) : null}
      </div>
      {data.summary ? (
        <p className="mt-2 truncate px-3.5 pl-4 font-mono text-[11px] text-muted-foreground">
          {data.summary}
        </p>
      ) : null}
      <FlowHandle side="left" />
      <FlowHandle
        side="right"
        connectable={editable}
        onPointerDown={onConnectStart}
      />
    </Card>
  )
}

export function PipelineInputCard({
  onConnectStart,
}: {
  onConnectStart?: (event: PointerEvent<HTMLSpanElement>) => void
}) {
  const actions = usePipelineFlowActions()
  const editable = Boolean(actions?.editable)

  return (
    <Card
      size="sm"
      className="relative h-full w-full justify-center gap-0 overflow-visible border-0 bg-primary/8 py-3 ring-1 ring-primary/20"
    >
      <div className="flex items-center gap-3 px-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <PlayIcon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Input</p>
          <p className="text-[11px] text-muted-foreground">
            Payload for level 1
          </p>
        </div>
      </div>
      <FlowHandle
        side="right"
        connectable={editable}
        onPointerDown={onConnectStart}
      />
    </Card>
  )
}

export function PipelineGateCard() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="flex size-8 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-primary/25">
        <ChevronRightIcon className="size-3.5" />
      </span>
    </div>
  )
}

export function PipelineAddCard({ data }: { data: PipelineAddData }) {
  const actions = usePipelineFlowActions()

  return (
    <button
      type="button"
      data-flow-add={
        data.target.kind === "level" ? data.target.levelKey : "next"
      }
      onClick={(event) =>
        actions?.onRequestCreate(data.target, event.clientX, event.clientY)
      }
      className="relative flex h-full w-full items-start gap-3 rounded-2xl border border-dashed border-foreground/15 bg-background/40 px-3.5 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <PlusIcon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{data.label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {data.hint}
        </span>
      </span>
      <FlowHandle side="left" />
    </button>
  )
}

export function PipelineLabelCard({ data }: { data: PipelineLabelData }) {
  return (
    <div className="pointer-events-none w-full">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-violet-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-violet-800 dark:text-violet-300">
          {data.title.toUpperCase()}
        </span>
        {data.parallel ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Together
          </span>
        ) : null}
      </div>
    </div>
  )
}
