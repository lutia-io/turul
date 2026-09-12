import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"
import {
  GripVerticalIcon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
} from "lucide-react"

import {
  PipelineAddCard,
  PipelineFlowActionsProvider,
  PipelineGateCard,
  PipelineInputCard,
  PipelineLabelCard,
  PipelineNodeCard,
  pipelineNodeTypeItems,
} from "@/components/pipeline-flow/pipeline-flow-nodes"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { defaultDefinition, type NodeType } from "@/lib/node-definition"
import {
  createTargetForSource,
  defaultCreatedNodeName,
  FLOW,
  flowBezierPath,
  hitItem,
  itemHandle,
  levelColumnX,
  levelsToFlow,
  PIPELINE_DND_TYPE,
  snapLevelIndex,
  snapNodeIndex,
  type FlowItem,
  type FlowLayout,
} from "@/lib/pipeline-flow"
import {
  insertCreatedNode,
  movePipelineNode,
  removePipelineNode,
  type CreatePipelineNodeTarget,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import { cn } from "@/lib/utils"

const MIN_ZOOM = 0.4
const MAX_ZOOM = 1.35

const minimapFill: Record<string, string> = {
  NOOP: "#71717a",
  HTTP: "#3b82f6",
  MAPPER: "#8b5cf6",
  LIST_MAPPER: "#d946ef",
  FILE: "#f97316",
  RECORD: "#06b6d4",
  BULK: "#14b8a6",
}

function paletteTarget(levels: PipelineLevelDraft[]): CreatePipelineNodeTarget {
  const lastWithNodes = [...levels]
    .reverse()
    .find((level) => level.nodes.length > 0)
  if (lastWithNodes) {
    return { kind: "level", levelKey: lastWithNodes.key }
  }
  return { kind: "empty" }
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

export function PipelineFlowCanvas({
  levels,
  onChange,
  onEditNode,
  details,
  sentence,
  className,
}: {
  levels: PipelineLevelDraft[]
  onChange?: (levels: PipelineLevelDraft[]) => void
  onEditNode?: (nodeKey: string, levelKey: string) => void
  details?: ReactNode
  sentence?: string
  className?: string
}) {
  const gradientId = useId()
  const editable = Boolean(onChange)
  const viewportRef = useRef<HTMLDivElement>(null)
  const levelsRef = useRef(levels)
  levelsRef.current = levels
  const [pan, setPan] = useState({ x: 32, y: 24 })
  const [zoom, setZoom] = useState(1)
  const panRef = useRef(pan)
  const zoomRef = useRef(zoom)
  panRef.current = pan
  zoomRef.current = zoom
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dropLevel, setDropLevel] = useState<number | null>(null)
  const [dragging, setDragging] = useState<{
    nodeKey: string
    x: number
    y: number
  } | null>(null)
  const [connecting, setConnecting] = useState<{
    sourceId: string
    x: number
    y: number
  } | null>(null)
  const [picker, setPicker] = useState<{
    x: number
    y: number
    target: CreatePipelineNodeTarget
  } | null>(null)
  const panDrag = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)
  const nodeDrag = useRef<{
    pointerId: number
    nodeKey: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const connectDrag = useRef<{
    pointerId: number
    sourceId: string
  } | null>(null)
  const layout = useMemo(
    () => levelsToFlow(levels, { editable }),
    [editable, levels]
  )
  const nodeCount = levels.reduce(
    (count, level) => count + level.nodes.length,
    0
  )
  const fitSignature = `${levels.length}:${nodeCount}:${editable}:${layout.width}:${layout.height}`
  const lastFit = useRef("")
  const itemsById = useMemo(() => {
    const map = new Map<string, FlowItem>()
    for (const item of layout.items) {
      map.set(item.id, item)
    }
    return map
  }, [layout.items])

  const clientToFlow = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const currentPan = panRef.current
    const currentZoom = zoomRef.current
    if (!rect) {
      return { x: 0, y: 0 }
    }
    return {
      x: (clientX - rect.left - currentPan.x) / currentZoom,
      y: (clientY - rect.top - currentPan.y) / currentZoom,
    }
  }, [])

  const fitView = useCallback(
    (nextLayout: FlowLayout = layout) => {
      const el = viewportRef.current
      if (!el) {
        return
      }
      const width = el.clientWidth
      const height = el.clientHeight
      if (width < 8 || height < 8) {
        return
      }
      const padding = 72
      const nextZoom = clampZoom(
        Math.min(
          (width - padding * 2) / Math.max(nextLayout.width, 1),
          (height - padding * 2) / Math.max(nextLayout.height, 1),
          1
        )
      )
      setZoom(nextZoom)
      setPan({
        x: (width - nextLayout.width * nextZoom) / 2,
        y: Math.max(20, (height - nextLayout.height * nextZoom) / 2),
      })
    },
    [layout]
  )

  useEffect(() => {
    if (lastFit.current === fitSignature) {
      return
    }
    lastFit.current = fitSignature
    const frame = requestAnimationFrame(() => fitView())
    return () => cancelAnimationFrame(frame)
  }, [fitSignature, fitView])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) {
      return
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const currentPan = panRef.current
      const currentZoom = zoomRef.current
      if (event.ctrlKey || event.metaKey) {
        const rect = el.getBoundingClientRect()
        const nextZoom = clampZoom(
          currentZoom * (event.deltaY < 0 ? 1.08 : 0.92)
        )
        const cx = event.clientX - rect.left
        const cy = event.clientY - rect.top
        const worldX = (cx - currentPan.x) / currentZoom
        const worldY = (cy - currentPan.y) / currentZoom
        setZoom(nextZoom)
        setPan({
          x: cx - worldX * nextZoom,
          y: cy - worldY * nextZoom,
        })
        return
      }
      setPan({
        x: currentPan.x - event.deltaX,
        y: currentPan.y - event.deltaY,
      })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const createNode = useCallback(
    (target: CreatePipelineNodeTarget, type: NodeType) => {
      if (!onChange) {
        return
      }
      const current = levelsRef.current
      onChange(
        insertCreatedNode(
          current,
          {
            name: defaultCreatedNodeName(type, current),
            type,
            definition: defaultDefinition(type),
          },
          target
        )
      )
      setPicker(null)
    },
    [onChange]
  )

  const requestCreate = useCallback(
    (target: CreatePipelineNodeTarget, clientX: number, clientY: number) => {
      setPicker({ x: clientX, y: clientY, target })
    },
    []
  )

  const deleteNode = useCallback(
    (nodeKey: string, levelKey: string) => {
      onChange?.(removePipelineNode(levelsRef.current, levelKey, nodeKey))
      setSelectedId(null)
    },
    [onChange]
  )

  const actions = useMemo(
    () => ({
      editable,
      onEdit: (nodeKey: string, levelKey: string) => {
        onEditNode?.(nodeKey, levelKey)
      },
      onDelete: deleteNode,
      onRequestCreate: requestCreate,
    }),
    [deleteNode, editable, onEditNode, requestCreate]
  )

  useEffect(() => {
    if (!editable) {
      return
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return
      }
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return
      }
      if (!selectedId) {
        return
      }
      const item = itemsById.get(selectedId)
      if (item?.kind !== "node") {
        return
      }
      event.preventDefault()
      deleteNode(item.data.nodeKey, item.data.levelKey)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [deleteNode, editable, itemsById, selectedId])

  function onPanePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return
    }
    const target = event.target as HTMLElement
    if (
      target.closest(
        "[data-flow-node], [data-flow-add], [data-flow-handle], [data-flow-chrome]"
      )
    ) {
      return
    }
    setSelectedId(null)
    setPicker(null)
    panDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: pan.x,
      origY: pan.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onViewportPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (panDrag.current && panDrag.current.pointerId === event.pointerId) {
      setPan({
        x: panDrag.current.origX + event.clientX - panDrag.current.startX,
        y: panDrag.current.origY + event.clientY - panDrag.current.startY,
      })
      return
    }
    if (nodeDrag.current && nodeDrag.current.pointerId === event.pointerId) {
      const point = clientToFlow(event.clientX, event.clientY)
      setDragging({
        nodeKey: nodeDrag.current.nodeKey,
        x: point.x - nodeDrag.current.offsetX,
        y: point.y - nodeDrag.current.offsetY,
      })
      setDropLevel(snapLevelIndex(point.x, levelsRef.current.length))
      return
    }
    if (
      connectDrag.current &&
      connectDrag.current.pointerId === event.pointerId
    ) {
      const point = clientToFlow(event.clientX, event.clientY)
      setConnecting({
        sourceId: connectDrag.current.sourceId,
        x: point.x,
        y: point.y,
      })
    }
  }

  function finishNodeDrag(clientX: number, clientY: number) {
    const drag = nodeDrag.current
    nodeDrag.current = null
    setDragging(null)
    setDropLevel(null)
    if (!drag || !onChange) {
      return
    }
    const point = clientToFlow(clientX, clientY)
    const current = levelsRef.current
    const nextLevel = snapLevelIndex(point.x, current.length)
    const targetLevel = current[Math.min(nextLevel, current.length - 1)]
    const count = targetLevel
      ? targetLevel.nodes.filter((item) => item.key !== drag.nodeKey).length
      : 0
    onChange(
      movePipelineNode(
        current,
        drag.nodeKey,
        nextLevel,
        snapNodeIndex(point.y, count)
      )
    )
  }

  function finishConnect(clientX: number, clientY: number) {
    const drag = connectDrag.current
    connectDrag.current = null
    setConnecting(null)
    if (!drag || !onChange) {
      return
    }
    const point = clientToFlow(clientX, clientY)
    const hit = hitItem(layout.items, point.x, point.y, ["add"])
    const source = itemsById.get(drag.sourceId)
    if (hit?.kind === "add") {
      requestCreate(hit.data.target, clientX, clientY)
      return
    }
    if (source?.kind === "node") {
      const snapped = snapLevelIndex(point.x, levelsRef.current.length)
      if (snapped === source.data.levelIndex) {
        requestCreate(
          { kind: "level", levelKey: source.data.levelKey },
          clientX,
          clientY
        )
        return
      }
      requestCreate(
        createTargetForSource(levelsRef.current, {
          kind: "node",
          levelKey: source.data.levelKey,
          levelIndex: source.data.levelIndex,
        }),
        clientX,
        clientY
      )
      return
    }
    if (source?.kind === "input") {
      requestCreate(
        createTargetForSource(levelsRef.current, { kind: "input" }),
        clientX,
        clientY
      )
    }
  }

  function onViewportPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (panDrag.current?.pointerId === event.pointerId) {
      panDrag.current = null
    }
    if (nodeDrag.current?.pointerId === event.pointerId) {
      finishNodeDrag(event.clientX, event.clientY)
    }
    if (connectDrag.current?.pointerId === event.pointerId) {
      finishConnect(event.clientX, event.clientY)
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const point = clientToFlow(event.clientX, event.clientY)
    setDropLevel(snapLevelIndex(point.x, levelsRef.current.length))
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDropLevel(null)
    if (!onChange) {
      return
    }
    const raw =
      event.dataTransfer.getData(PIPELINE_DND_TYPE) ||
      event.dataTransfer.getData("text/plain")
    const type = pipelineNodeTypeItems.find((item) => item.type === raw)?.type
    if (!type) {
      return
    }
    const point = clientToFlow(event.clientX, event.clientY)
    const current = levelsRef.current
    const levelIndex = snapLevelIndex(point.x, current.length)
    const last = current[current.length - 1]
    const target: CreatePipelineNodeTarget =
      levelIndex >= current.length && last
        ? { kind: "after-level", afterLevelKey: last.key }
        : current[levelIndex]
          ? { kind: "level", levelKey: current[levelIndex].key }
          : { kind: "empty" }
    createNode(target, type)
  }

  const highlightColumns = layout.columnCount

  return (
    <TooltipProvider delay={250}>
      <PipelineFlowActionsProvider value={actions}>
        <div
          className={cn(
            "pipeline-flow relative isolate min-h-[28rem] overflow-hidden rounded-2xl bg-background shadow-xs ring-1 ring-foreground/10",
            className
          )}
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_52%)]" />
          <div
            ref={viewportRef}
            className="absolute inset-0 z-10 cursor-grab overflow-hidden active:cursor-grabbing"
            onPointerDown={onPanePointerDown}
            onPointerMove={onViewportPointerMove}
            onPointerUp={onViewportPointerUp}
            onPointerCancel={onViewportPointerUp}
            onDragOver={editable ? onDragOver : undefined}
            onDrop={editable ? onDrop : undefined}
            onDragLeave={editable ? () => setDropLevel(null) : undefined}
          >
            <div
              className="absolute top-0 left-0 origin-top-left will-change-transform"
              style={{
                width: layout.width,
                height: layout.height,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              <LevelBands count={highlightColumns} active={dropLevel} />
              <svg
                className="pointer-events-none absolute inset-0 overflow-visible"
                width={layout.width}
                height={layout.height}
              >
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="var(--pipeline-edge-from)" />
                    <stop offset="100%" stopColor="var(--pipeline-edge-to)" />
                  </linearGradient>
                </defs>
                {layout.edges.map((edge) => {
                  const source = itemsById.get(edge.sourceId)
                  const target = itemsById.get(edge.targetId)
                  if (!source || !target) {
                    return null
                  }
                  const from = itemHandle(source, "right")
                  const to = itemHandle(target, "left")
                  return (
                    <path
                      key={edge.id}
                      d={flowBezierPath(from.x, from.y, to.x, to.y)}
                      fill="none"
                      stroke={`url(#${gradientId})`}
                      strokeWidth={2}
                      strokeLinecap="round"
                      className={
                        edge.animated ? "pipeline-edge-animated" : undefined
                      }
                    />
                  )
                })}
                {connecting
                  ? (() => {
                      const source = itemsById.get(connecting.sourceId)
                      if (!source) {
                        return null
                      }
                      const from = itemHandle(source, "right")
                      return (
                        <path
                          d={flowBezierPath(
                            from.x,
                            from.y,
                            connecting.x,
                            connecting.y
                          )}
                          fill="none"
                          stroke="var(--pipeline-edge-to)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeDasharray="6 7"
                        />
                      )
                    })()
                  : null}
              </svg>
              {layout.items.map((item) => {
                const hidden =
                  dragging &&
                  item.kind === "node" &&
                  item.data.nodeKey === dragging.nodeKey
                return (
                  <div
                    key={item.id}
                    className={cn("absolute", hidden && "opacity-30")}
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                    }}
                  >
                    {item.kind === "input" ? (
                      <PipelineInputCard
                        onConnectStart={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          connectDrag.current = {
                            pointerId: event.pointerId,
                            sourceId: item.id,
                          }
                          viewportRef.current?.setPointerCapture(
                            event.pointerId
                          )
                          const point = clientToFlow(
                            event.clientX,
                            event.clientY
                          )
                          setConnecting({
                            sourceId: item.id,
                            x: point.x,
                            y: point.y,
                          })
                        }}
                      />
                    ) : null}
                    {item.kind === "label" ? (
                      <PipelineLabelCard data={item.data} />
                    ) : null}
                    {item.kind === "gate" ? <PipelineGateCard /> : null}
                    {item.kind === "add" ? (
                      <PipelineAddCard data={item.data} />
                    ) : null}
                    {item.kind === "node" ? (
                      <PipelineNodeCard
                        data={item.data}
                        selected={selectedId === item.id}
                        onSelect={() => setSelectedId(item.id)}
                        onConnectStart={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          connectDrag.current = {
                            pointerId: event.pointerId,
                            sourceId: item.id,
                          }
                          viewportRef.current?.setPointerCapture(
                            event.pointerId
                          )
                          const point = clientToFlow(
                            event.clientX,
                            event.clientY
                          )
                          setConnecting({
                            sourceId: item.id,
                            x: point.x,
                            y: point.y,
                          })
                        }}
                        onPointerDragStart={(event) => {
                          if (event.button !== 0) {
                            return
                          }
                          const handle = event.target as HTMLElement
                          if (handle.closest("[data-flow-handle], button")) {
                            return
                          }
                          event.stopPropagation()
                          const point = clientToFlow(
                            event.clientX,
                            event.clientY
                          )
                          nodeDrag.current = {
                            pointerId: event.pointerId,
                            nodeKey: item.data.nodeKey,
                            offsetX: point.x - item.x,
                            offsetY: point.y - item.y,
                          }
                          setSelectedId(item.id)
                          setDragging({
                            nodeKey: item.data.nodeKey,
                            x: item.x,
                            y: item.y,
                          })
                          viewportRef.current?.setPointerCapture(
                            event.pointerId
                          )
                        }}
                      />
                    ) : null}
                  </div>
                )
              })}
              {dragging
                ? (() => {
                    const item = layout.items.find(
                      (entry) =>
                        entry.kind === "node" &&
                        entry.data.nodeKey === dragging.nodeKey
                    )
                    if (!item || item.kind !== "node") {
                      return null
                    }
                    return (
                      <div
                        className="pointer-events-none absolute z-20 opacity-90"
                        style={{
                          left: dragging.x,
                          top: dragging.y,
                          width: item.width,
                          height: item.height,
                        }}
                      >
                        <PipelineNodeCard
                          data={item.data}
                          selected
                          onSelect={() => undefined}
                        />
                      </div>
                    )
                  })()
                : null}
            </div>
          </div>

          {editable ? (
            <div
              data-flow-chrome
              className="pointer-events-auto absolute top-3 left-3 z-20 w-[13.5rem]"
            >
              <NodePalette
                onPick={(type) =>
                  createNode(paletteTarget(levelsRef.current), type)
                }
              />
            </div>
          ) : null}

          {sentence ? (
            <div
              data-flow-chrome
              className={cn(
                "pointer-events-none absolute top-3 z-20 max-w-xl",
                editable ? "left-[15.5rem]" : "left-3"
              )}
            >
              <p className="rounded-xl bg-card/85 px-3 py-2 text-xs text-pretty text-muted-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm">
                {sentence}
              </p>
            </div>
          ) : null}

          {details ? (
            <div
              data-flow-chrome
              className="pointer-events-auto absolute top-3 right-3 z-20 hidden max-h-[calc(100%-1.5rem)] w-72 overflow-y-auto xl:block"
            >
              {details}
            </div>
          ) : null}

          <div
            data-flow-chrome
            className="absolute bottom-3 left-3 z-20 flex overflow-hidden rounded-xl bg-card/90 shadow-md ring-1 ring-foreground/10 backdrop-blur-sm"
          >
            <ZoomButton
              label="Zoom in"
              onClick={() => setZoom((value) => clampZoom(value * 1.12))}
            >
              <PlusIcon />
            </ZoomButton>
            <ZoomButton
              label="Zoom out"
              onClick={() => setZoom((value) => clampZoom(value / 1.12))}
            >
              <MinusIcon />
            </ZoomButton>
            <ZoomButton label="Fit view" onClick={() => fitView()}>
              <Maximize2Icon />
            </ZoomButton>
          </div>

          <MiniMapCard
            layout={layout}
            pan={pan}
            zoom={zoom}
            viewportRef={viewportRef}
            onPan={setPan}
          />
        </div>
        {picker ? (
          <NodeTypePicker
            x={picker.x}
            y={picker.y}
            onPick={(type) => createNode(picker.target, type)}
            onClose={() => setPicker(null)}
          />
        ) : null}
      </PipelineFlowActionsProvider>
    </TooltipProvider>
  )
}

function LevelBands({
  count,
  active,
}: {
  count: number
  active: number | null
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn(
            "pointer-events-none absolute top-5 rounded-3xl transition-colors",
            active === index
              ? "bg-primary/10 ring-1 ring-primary/25"
              : "bg-violet-500/[0.04] ring-1 ring-violet-500/10"
          )}
          style={{
            left: levelColumnX(index) - 16,
            width: FLOW.nodeWidth + 32,
            height: 920,
          }}
        />
      ))}
    </>
  )
}

function NodePalette({ onPick }: { onPick: (type: NodeType) => void }) {
  return (
    <Card size="sm" className="gap-1 bg-card/90 py-2 backdrop-blur-sm">
      <p className="px-3.5 pt-1 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Nodes
      </p>
      <div className="flex flex-col gap-0.5 px-1.5">
        {pipelineNodeTypeItems.map((item) => (
          <button
            key={item.type}
            type="button"
            draggable
            onClick={() => onPick(item.type)}
            onDragStart={(event) => {
              event.dataTransfer.setData(PIPELINE_DND_TYPE, item.type)
              event.dataTransfer.setData("text/plain", item.type)
              event.dataTransfer.effectAllowed = "move"
            }}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-muted"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg",
                item.visual.wrap
              )}
            >
              <item.visual.icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {item.label}
            </span>
            <GripVerticalIcon className="size-3.5 text-muted-foreground/70" />
          </button>
        ))}
      </div>
      <p className="px-3.5 pt-1 pb-1 text-[11px] leading-relaxed text-muted-foreground">
        Drag onto a level, or pull a handle to the right to add the next step.
      </p>
    </Card>
  )
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-none"
            onClick={onClick}
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

function MiniMapCard({
  layout,
  pan,
  zoom,
  viewportRef,
  onPan,
}: {
  layout: FlowLayout
  pan: { x: number; y: number }
  zoom: number
  viewportRef: RefObject<HTMLDivElement | null>
  onPan: (next: { x: number; y: number }) => void
}) {
  const width = 148
  const height = 96
  const scale = Math.min(
    width / Math.max(layout.width, 1),
    height / Math.max(layout.height, 1)
  )
  const view = viewportRef.current
  const viewW = (view?.clientWidth ?? 0) / zoom
  const viewH = (view?.clientHeight ?? 0) / zoom
  const viewX = -pan.x / zoom
  const viewY = -pan.y / zoom

  return (
    <Card
      data-flow-chrome
      size="sm"
      className="absolute right-3 bottom-3 z-20 gap-0 overflow-hidden bg-card/90 p-1.5 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label="Minimap"
        className="relative block"
        style={{ width, height }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const x = (event.clientX - rect.left) / scale
          const y = (event.clientY - rect.top) / scale
          const el = viewportRef.current
          if (!el) {
            return
          }
          onPan({
            x: el.clientWidth / 2 - x * zoom,
            y: el.clientHeight / 2 - y * zoom,
          })
        }}
      >
        <svg width={width} height={height} className="overflow-visible">
          {layout.items.map((item) => {
            if (item.kind === "label") {
              return null
            }
            const fill =
              item.kind === "node"
                ? (minimapFill[item.data.nodeType] ?? "#8b5cf6")
                : item.kind === "input"
                  ? "var(--primary)"
                  : item.kind === "gate"
                    ? "color-mix(in oklch, var(--primary) 55%, transparent)"
                    : "color-mix(in oklch, var(--foreground) 18%, transparent)"
            return (
              <rect
                key={item.id}
                x={item.x * scale}
                y={item.y * scale}
                width={Math.max(item.width * scale, 3)}
                height={Math.max(item.height * scale, 3)}
                rx={2}
                fill={fill}
              />
            )
          })}
          <rect
            x={viewX * scale}
            y={viewY * scale}
            width={viewW * scale}
            height={viewH * scale}
            fill="color-mix(in oklch, var(--foreground) 8%, transparent)"
            stroke="color-mix(in oklch, var(--foreground) 28%, transparent)"
            strokeWidth={1}
          />
        </svg>
      </button>
    </Card>
  )
}

function NodeTypePicker({
  x,
  y,
  onPick,
  onClose,
}: {
  x: number
  y: number
  onPick: (type: NodeType) => void
  onClose: () => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[90]"
      onMouseDown={onClose}
      onContextMenu={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <Card
        size="sm"
        className="absolute w-56 gap-1 py-1.5"
        style={{
          left: Math.min(Math.max(12, x), window.innerWidth - 240),
          top: Math.min(Math.max(12, y), window.innerHeight - 360),
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="px-3 pt-1 pb-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Add a node
        </p>
        <div className="px-1">
          {pipelineNodeTypeItems.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => onPick(item.type)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  item.visual.wrap
                )}
              >
                <item.visual.icon className="size-3.5" />
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>,
    document.body
  )
}
