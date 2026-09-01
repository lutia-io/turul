import { useRef, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  BoxIcon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  LayersIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  type LucideIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import {
  AsideRow,
  CopyIdButton,
  DefinitionAsideCard,
  DefinitionCard,
  DefinitionColumns,
  DefinitionPage,
  DefinitionSkeleton,
  DefinitionStatusPage,
  PublicationPills,
} from "@/components/definition-detail"
import { JsonDefinitionCard } from "@/components/json-definition-card"
import { NodeDefinitionDialog } from "@/components/node-definition-dialog"
import { RunStatusPill } from "@/components/run-card"
import { RunPipelineDialog } from "@/components/run-pipeline-dialog"
import { Button } from "@/components/ui/button"
import type { NodeDefinition } from "@/data/networks"
import {
  getPipelineLevels,
  type PipelineLevelNode,
} from "@/lib/json-definition"
import {
  useNetworkWorkspace,
  useWorkspaceNodes,
  useWorkspacePipelineRuns,
  workspacePipelineFromApi,
} from "@/lib/network-workspace"
import { nodeTypeLabel } from "@/lib/node-definition"
import {
  appendNodeToPipelineLevel,
  pipelineNodeCount,
  pipelineSummary,
} from "@/lib/pipeline-definition"
import { apiPipelineStatus, formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useGetPipelineDefinitionQuery,
  useUpdatePipelineDefinitionMutation,
} from "@/store/pipeline-slice"

type PipelineView = "levels" | "json"

export default function PipelineDefinitionDetail() {
  const { pipelineDefinitionId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { nodes } = useWorkspaceNodes()
  const { runs } = useWorkspacePipelineRuns()
  const { openEditPipeline, openEditNode } = useCreateEntity()
  const [updatePipeline] = useUpdatePipelineDefinitionMutation()
  const [runOpen, setRunOpen] = useState(false)
  const [pipelineView, setPipelineView] = useState<PipelineView>("levels")
  const [createNodeOpen, setCreateNodeOpen] = useState(false)
  const [createNodeKey, setCreateNodeKey] = useState(0)
  const createNodeLevelRef = useRef(0)

  function openCreateNode(levelIndex: number) {
    createNodeLevelRef.current = levelIndex
    setCreateNodeKey((key) => key + 1)
    setCreateNodeOpen(true)
  }

  const pipelineQuery = useGetPipelineDefinitionQuery(
    pipelineDefinitionId ?? "",
    { skip: !isAuthenticated || !pipelineDefinitionId }
  )
  const pipelineDefinition = pipelineQuery.data
    ? workspacePipelineFromApi(pipelineQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || pipelineDefinition?.networkId === workspaceNetwork.id
  const visiblePipeline = belongsToWorkspace ? pipelineDefinition : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const levels = visiblePipeline
    ? getPipelineLevels(visiblePipeline.definition)
    : []
  const nodeCount = visiblePipeline
    ? pipelineNodeCount(visiblePipeline.definition)
    : 0
  const summary = visiblePipeline
    ? pipelineSummary(visiblePipeline.definition)
    : ""
  const relatedRuns = visiblePipeline
    ? runs
        .filter(
          (run) =>
            run.pipelineDefinitionId === visiblePipeline.id &&
            (!organizationId || run.organizationId === organizationId)
        )
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 5)
    : []
  const createdAt = pipelineQuery.data?.createdAt
  const updatedAt = pipelineQuery.data?.updatedAt

  if (pipelineQuery.isLoading) {
    return <DefinitionSkeleton />
  }

  if (pipelineQuery.isError) {
    return (
      <DefinitionStatusPage
        {...getHumaLoadErrorCopy(pipelineQuery.error, {
          resource: "Pipeline definition",
          notFoundMessage:
            "This pipeline definition does not exist or is no longer available.",
        })}
      />
    )
  }

  if (!visiblePipeline || !network) {
    return (
      <DefinitionStatusPage
        title="Pipeline definition not found"
        message="This pipeline definition does not exist or is no longer available."
      />
    )
  }

  return (
    <DefinitionPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <Link
            to={href("pipeline-definitions")}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pipeline definition
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-pretty">
              {visiblePipeline.name}
            </h1>
            <PublicationPills
              active={visiblePipeline.active}
              internal={visiblePipeline.internal}
            />
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={pipelineView === "json" ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              setPipelineView((view) => (view === "levels" ? "json" : "levels"))
            }
          >
            <FileJsonIcon />
            {pipelineView === "json" ? "Levels" : "JSON"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={visiblePipeline.internal}
            onClick={() => openEditPipeline(visiblePipeline.id)}
          >
            <PencilIcon />
            Edit
          </Button>
          <Button
            size="sm"
            disabled={!visiblePipeline.active}
            onClick={() => setRunOpen(true)}
          >
            <PlayIcon />
            Run
          </Button>
        </div>
      </div>

      <DefinitionColumns
        aside={
          <>
            <DefinitionAsideCard
              title="Details"
              footer={
                <Link
                  to={href("pipeline-definitions")}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all pipeline definitions
                </Link>
              }
            >
              <dl className="mt-4 space-y-4">
                <AsideRow label="Slug">
                  <span className="font-mono text-xs font-normal">
                    {visiblePipeline.slug}
                  </span>
                </AsideRow>
                <AsideRow label="Levels">
                  <span className="tabular-nums">{levels.length}</span>
                </AsideRow>
                <AsideRow label="Nodes">
                  <span className="tabular-nums">{nodeCount}</span>
                </AsideRow>
                <AsideRow label="Network">
                  <Link
                    to={href()}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <GalleryVerticalEndIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{network.name}</span>
                  </Link>
                </AsideRow>
                {createdAt ? (
                  <AsideRow label="Created">
                    {formatRelativeTime(createdAt)}
                  </AsideRow>
                ) : null}
                {updatedAt && updatedAt !== createdAt ? (
                  <AsideRow label="Updated">
                    {formatRelativeTime(updatedAt)}
                  </AsideRow>
                ) : null}
                <AsideRow label="ID">
                  <CopyIdButton value={visiblePipeline.id} />
                </AsideRow>
              </dl>
            </DefinitionAsideCard>

            <DefinitionAsideCard
              title="Recent runs"
              footer={
                <Link
                  to={href("pipelines")}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all pipeline runs
                </Link>
              }
            >
              {relatedRuns.length > 0 ? (
                <div className="mt-3 flex flex-col gap-1">
                  {relatedRuns.map((run) => (
                    <Link
                      key={run.id}
                      to={href(`pipelines/${run.id}`)}
                      className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <LayersIcon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <RunStatusPill
                            status={apiPipelineStatus(run.status)}
                          />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {formatRelativeTime(run.createdAt)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No runs for this pipeline yet.
                </p>
              )}
            </DefinitionAsideCard>
          </>
        }
      >
        {pipelineView === "json" ? (
          <JsonDefinitionCard
            definition={visiblePipeline.definition}
            label="JSONB definition"
            description="Levels and node references stored on this pipeline."
          />
        ) : (
          <DefinitionCard>
            <SectionHeading
              icon={LayersIcon}
              title="Levels"
              description="Levels run in order. Open a node to edit it. Nodes in the same level run together."
            />
            {levels.length === 0 ? (
              <div className="mt-6">
                <LevelCard
                  level={[]}
                  levelIndex={0}
                  totalLevels={1}
                  nodesById={nodesById}
                  onSelectNode={openEditNode}
                  onAddNode={
                    visiblePipeline.internal
                      ? undefined
                      : () => openCreateNode(0)
                  }
                />
              </div>
            ) : (
              <div className="mt-6 flex flex-col">
                {levels.map((level, levelIndex) => (
                  <div key={`level-${levelIndex}`}>
                    {levelIndex > 0 ? <LevelJoiner /> : null}
                    <LevelCard
                      level={level}
                      levelIndex={levelIndex}
                      totalLevels={levels.length}
                      nodesById={nodesById}
                      onSelectNode={openEditNode}
                      onAddNode={
                        visiblePipeline.internal
                          ? undefined
                          : () => openCreateNode(levelIndex)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </DefinitionCard>
        )}
      </DefinitionColumns>

      <RunPipelineDialog
        open={runOpen}
        onOpenChange={setRunOpen}
        pipelineDefinitionId={visiblePipeline.id}
        networkId={network.id}
        organizationId={organizationId}
      />
      <NodeDefinitionDialog
        key={createNodeKey}
        open={createNodeOpen}
        onOpenChange={setCreateNodeOpen}
        networkId={network.id}
        onCreated={(nodeId) => {
          void updatePipeline({
            id: visiblePipeline.id,
            name: visiblePipeline.name,
            active: visiblePipeline.active,
            definition: appendNodeToPipelineLevel(
              visiblePipeline.definition,
              createNodeLevelRef.current,
              nodeId
            ),
          })
        }}
      />
    </DefinitionPage>
  )
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function LevelJoiner() {
  return (
    <div className="flex items-center gap-3 py-2" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-violet-700 dark:text-violet-300">
        THEN
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function LevelCard({
  level,
  levelIndex,
  totalLevels,
  nodesById,
  onSelectNode,
  onAddNode,
}: {
  level: PipelineLevelNode[]
  levelIndex: number
  totalLevels: number
  nodesById: Map<string, NodeDefinition>
  onSelectNode: (nodeId: string) => void
  onAddNode?: () => void
}) {
  const parallel = level.length > 1

  return (
    <div className="overflow-hidden rounded-xl border border-l-4 border-l-violet-500 bg-muted/20">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-violet-500/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-violet-800 dark:text-violet-300">
              {levelIndex}
            </span>
            <p className="text-sm font-medium">Level {levelIndex}</p>
            {parallel ? (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                In parallel
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {levelExplanation(levelIndex, totalLevels, parallel)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground tabular-nums">
            {level.length} {level.length === 1 ? "node" : "nodes"}
          </p>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {level.map((ref, nodeIndex) => (
          <NodeCard
            key={`${ref.id}-${nodeIndex}`}
            node={nodesById.get(ref.id)}
            nodeId={ref.id}
            onSelect={onSelectNode}
          />
        ))}
        {onAddNode ? <AddNodeCard onClick={onAddNode} /> : null}
      </div>
    </div>
  )
}

function AddNodeCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 items-start gap-3 rounded-xl border border-dashed bg-transparent p-4 text-left transition-colors hover:bg-muted/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-muted/80">
        <PlusIcon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">Add node</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Create a step in this level
        </span>
      </span>
    </button>
  )
}

function NodeCard({
  node,
  nodeId,
  onSelect,
}: {
  node?: NodeDefinition
  nodeId: string
  onSelect: (nodeId: string) => void
}) {
  const body = (
    <>
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
            {node?.name ?? "Missing node"}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {node?.slug ?? nodeId}
          </p>
        </div>
      </div>
      <dl className="mt-4">
        <MetaPart label="Type">
          {node ? nodeTypeLabel(node.type) : "Unknown"}
        </MetaPart>
      </dl>
    </>
  )

  if (!node) {
    return (
      <div className="rounded-xl border bg-background p-4 shadow-xs">
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className="rounded-xl border bg-background p-4 text-left shadow-xs transition-colors hover:bg-muted/40"
    >
      {body}
    </button>
  )
}

function MetaPart({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm">{children}</dd>
    </div>
  )
}

function levelExplanation(
  levelIndex: number,
  totalLevels: number,
  parallel: boolean
) {
  const parts: string[] = []
  if (levelIndex === 0) {
    parts.push("Runs first with the pipeline input.")
  } else {
    parts.push(`Runs after level ${levelIndex - 1}.`)
  }
  if (parallel) {
    parts.push("These nodes run at the same time.")
  }
  if (levelIndex < totalLevels - 1) {
    parts.push("Later levels can read this output.")
  }
  return parts.join(" ")
}
