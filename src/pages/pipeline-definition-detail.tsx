import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { Link, useParams, useSearchParams } from "react-router"
import {
  BoxIcon,
  Building2Icon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  LayersIcon,
  Loader,
  PencilIcon,
  PlayIcon,
  type LucideIcon,
} from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
import { useCreateEntity } from "@/components/create-entity"
import {
  AsideRow,
  AuditStamp,
  CopyIdButton,
  DefinitionAsideCard,
  DefinitionCard,
  DefinitionColumns,
  DefinitionPage,
  DefinitionSkeleton,
  DefinitionStatusPage,
  PublicationPills,
} from "@/components/definition-detail"
import { DefinitionJsonPane } from "@/components/definition-dialog-layout"
import { JsonDefinitionCard } from "@/components/json-definition-card"
import { NodeDefinitionDialog } from "@/components/node-definition-dialog"
import {
  PipelineLevelJoiner,
  PipelineLevelsEditor,
} from "@/components/pipeline-levels-editor"
import { RunStatusPill } from "@/components/run-card"
import { RunPipelineDialog } from "@/components/run-pipeline-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { PipelineDefinition } from "@/data/networks"
import {
  getPipelineLevels,
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
  type PipelineLevelNode,
} from "@/lib/json-definition"
import {
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspacePipelineRuns,
  workspacePipelineFromApi,
} from "@/lib/network-workspace"
import {
  nodeConfigSummary,
  nodeTypeLabel,
  pipelineTemplateContextForLevel,
} from "@/lib/node-definition"
import {
  insertCreatedNode,
  levelsFromApi,
  levelsToApi,
  parsePipelineDefinition,
  pipelineDraftSentence,
  pipelineLevelExplanation,
  pipelineLevelTitle,
  pipelineNodeCount,
  pipelineSummary,
  replacePipelineNode,
  type CreatePipelineNodeTarget,
  type PipelineDefinitionBody,
  type PipelineLevelDraft,
  type PipelineNodeConfig,
  type PipelineNodeEditorTarget,
} from "@/lib/pipeline-definition"
import { apiPipelineStatus, formatRelativeTime } from "@/lib/runs"
import { getHumaErrorMessage, getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useGetPipelineDefinitionQuery,
  useUpdatePipelineDefinitionMutation,
} from "@/store/pipeline-slice"

type PipelineView = "levels" | "json"

function pipelineDefinitionError(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "JSON must be a pipeline definition object"
    }
    if (!parsePipelineDefinition(parsed as JsonObject)) {
      return "JSON must include at least one level with a node"
    }
    return null
  } catch {
    return "Invalid JSON"
  }
}

export default function PipelineDefinitionDetail() {
  const { pipelineDefinitionId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { runs } = useWorkspacePipelineRuns()
  const { organizations } = useWorkspaceOrganizations()
  const { openEditPipeline } = useCreateEntity()
  const [runOpen, setRunOpen] = useState(false)
  const [pipelineView, setPipelineView] = useState<PipelineView>("levels")

  const pipelineQuery = useGetPipelineDefinitionQuery(
    pipelineDefinitionId ?? "",
    { skip: !isAuthenticated || !pipelineDefinitionId }
  )
  const pipelineDefinition = pipelineQuery.data
    ? workspacePipelineFromApi(pipelineQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork ||
    (pipelineDefinition?.networkId === workspaceNetwork.id &&
      (!organizationId ||
        !pipelineDefinition.organizationId ||
        pipelineDefinition.organizationId === organizationId))
  const visiblePipeline = belongsToWorkspace ? pipelineDefinition : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const organization = visiblePipeline?.organizationId
    ? organizations.find((item) => item.id === visiblePipeline.organizationId)
    : undefined
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
  const createdBy = pipelineQuery.data?.createdBy
  const updatedBy = pipelineQuery.data?.updatedBy
  const editing =
    searchParams.get("edit") === "1" &&
    Boolean(visiblePipeline) &&
    !visiblePipeline?.internal

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

  const aside = (
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
          {organization ? (
            <AsideRow label="Organization">
              <Link
                to={href(`organization/${organization.id}`)}
                className="inline-flex max-w-full items-center gap-1.5 hover:underline"
              >
                <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{organization.name}</span>
              </Link>
            </AsideRow>
          ) : null}
          <AsideRow label="Network">
            <Link
              to={href()}
              className="inline-flex max-w-full items-center gap-1.5 hover:underline"
            >
              <GalleryVerticalEndIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{network.name}</span>
            </Link>
          </AsideRow>
          <AuditStamp label="Created" at={createdAt} user={createdBy} />
          {updatedAt && updatedAt !== createdAt ? (
            <AuditStamp label="Updated" at={updatedAt} user={updatedBy} />
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
                    <RunStatusPill status={apiPipelineStatus(run.status)} />
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
  )

  if (editing) {
    return (
      <PipelineDefinitionEdit
        key={visiblePipeline.id}
        pipeline={visiblePipeline}
        href={href}
        aside={aside}
        onCancel={() => setSearchParams({})}
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
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
            {visiblePipeline.description || summary}
          </p>
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

      <DefinitionColumns aside={aside}>
        {pipelineView === "json" ? (
          <JsonDefinitionCard
            definition={visiblePipeline.definition}
            label="JSONB definition"
            description="Levels and node configs stored on this pipeline."
          />
        ) : (
          <DefinitionCard>
            <SectionHeading
              icon={LayersIcon}
              title="Levels"
              description="The pipeline runs one level at a time. Nodes in the same level run together. When a level finishes, the next level starts."
            />
            {levels.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                This pipeline does not have any levels yet.
              </p>
            ) : (
              <div className="mt-6 flex flex-col">
                {levels.map((level, levelIndex) => (
                  <div key={`level-${levelIndex}`}>
                    {levelIndex > 0 ? (
                      <PipelineLevelJoiner nextLevel={levelIndex + 1} />
                    ) : null}
                    <LevelCard
                      level={level}
                      levelIndex={levelIndex}
                      totalLevels={levels.length}
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
    </DefinitionPage>
  )
}

function PipelineDefinitionEdit({
  pipeline,
  href,
  aside,
  onCancel,
}: {
  pipeline: PipelineDefinition
  href: (rest?: string) => string
  aside: ReactNode
  onCancel: () => void
}) {
  const formId = useId()
  const [updatePipeline, updateState] = useUpdatePipelineDefinitionMutation()
  const parsed = parsePipelineDefinition(pipeline.definition)
  const [definitionView, setDefinitionView] = useState<PipelineView>("levels")
  const [name, setName] = useState(pipeline.name)
  const [description, setDescription] = useState(pipeline.description ?? "")
  const [active, setActive] = useState(pipeline.active)
  const [levels, setLevels] = useState<PipelineLevelDraft[]>(() =>
    levelsFromApi(parsed)
  )
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const jsonSourceRef = useRef<"builder" | "json">("builder")
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [nodeDialogKey, setNodeDialogKey] = useState(0)
  const [nodeDialogNode, setNodeDialogNode] = useState<PipelineNodeConfig>()
  const [nodeDialogContext, setNodeDialogContext] = useState(
    pipelineTemplateContextForLevel(0, [])
  )
  const createNodeTargetRef = useRef<PipelineNodeEditorTarget | null>(null)
  const isLoading = updateState.isLoading
  const error = updateState.error

  const definition = useMemo(() => levelsToApi(levels), [levels])
  const generatedJson = stringifyDefinition(definition ?? { nodes: [] })

  useEffect(() => {
    if (jsonSourceRef.current === "json") {
      return
    }
    setJsonText(generatedJson)
    setJsonError(null)
  }, [generatedJson])

  function markBuilderSource() {
    jsonSourceRef.current = "builder"
  }

  function applyPipelineDefinition(body: PipelineDefinitionBody) {
    jsonSourceRef.current = "json"
    setLevels(levelsFromApi(body))
  }

  function handleJsonChange(text: string) {
    jsonSourceRef.current = "json"
    setJsonText(text)
    const parsedJson = parseJsonObject(text)
    if (!parsedJson) {
      setJsonError(pipelineDefinitionError(text))
      return
    }
    const body = parsePipelineDefinition(parsedJson)
    if (!body) {
      setJsonError("JSON must include at least one level with a node")
      return
    }
    setJsonError(null)
    applyPipelineDefinition(body)
  }

  function handleJsonBlur() {
    if (!jsonText.trim()) {
      jsonSourceRef.current = "builder"
      setJsonText(generatedJson)
      setJsonError(null)
      return
    }
    const parsedJson = parseJsonObject(jsonText)
    const body = parsedJson ? parsePipelineDefinition(parsedJson) : undefined
    if (!parsedJson || !body) {
      setJsonError(pipelineDefinitionError(jsonText))
      return
    }
    jsonSourceRef.current = "json"
    setJsonError(null)
    applyPipelineDefinition(body)
    setJsonText(stringifyDefinition(parsedJson))
  }

  function templateContextForLevelIndex(levelIndex: number) {
    const index = Math.max(0, levelIndex)
    return pipelineTemplateContextForLevel(
      index,
      levels[index - 1]?.nodes ?? []
    )
  }

  function openNodeDialog(options: {
    node?: PipelineNodeConfig
    levelIndex: number
    target: PipelineNodeEditorTarget
  }) {
    createNodeTargetRef.current = options.target
    setNodeDialogNode(options.node)
    setNodeDialogContext(templateContextForLevelIndex(options.levelIndex))
    setNodeDialogKey((key) => key + 1)
    setNodeDialogOpen(true)
  }

  function openCreateNode(target: CreatePipelineNodeTarget) {
    const levelIndex =
      target.kind === "level"
        ? levels.findIndex((level) => level.key === target.levelKey)
        : 0
    const level = levels[Math.max(0, levelIndex)]
    openNodeDialog({
      levelIndex,
      target: {
        levelKey:
          level?.key ??
          (target.kind === "level" ? target.levelKey : (levels[0]?.key ?? "")),
      },
    })
  }

  function openEditNode(nodeKey: string, levelKey: string) {
    const levelIndex = levels.findIndex((level) => level.key === levelKey)
    const node = levels[levelIndex]?.nodes.find((item) => item.key === nodeKey)
    openNodeDialog({
      node,
      levelIndex,
      target: { levelKey, nodeKey },
    })
  }

  function handleNodeSave(node: PipelineNodeConfig) {
    const target = createNodeTargetRef.current
    createNodeTargetRef.current = null
    if (!target) {
      return
    }
    markBuilderSource()
    if (target.nodeKey) {
      setLevels((current) =>
        replacePipelineNode(current, target.levelKey, target.nodeKey!, node)
      )
      return
    }
    setLevels((current) =>
      insertCreatedNode(current, node, {
        kind: "level",
        levelKey: target.levelKey,
      })
    )
  }

  const canSubmit = Boolean(name.trim()) && Boolean(definition) && !jsonError

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !definition) {
      return
    }
    const parsedJson = parseJsonObject(jsonText)
    const body = parsedJson ? parsePipelineDefinition(parsedJson) : definition
    if (!body) {
      return
    }
    try {
      await updatePipeline({
        id: pipeline.id,
        name: name.trim(),
        description: description.trim(),
        active,
        definition: body,
      }).unwrap()
      onCancel()
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <DefinitionPage>
      <form
        id={formId}
        onSubmit={handleSubmit}
        autoComplete="off"
        className="flex min-w-0 flex-1 flex-col gap-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Link
              to={href("pipeline-definitions")}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pipeline definition
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <Field className="max-w-md min-w-56 gap-1">
                <FieldLabel htmlFor={`${formId}-name`} className="sr-only">
                  Name
                </FieldLabel>
                <Input
                  id={`${formId}-name`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10 text-lg font-semibold"
                  required
                  disabled={isLoading}
                />
              </Field>
              <CheckboxField
                id={`${formId}-active`}
                checked={active}
                onChange={setActive}
                label="Enabled"
              />
            </div>
            <Field className="max-w-2xl gap-1">
              <FieldLabel htmlFor={`${formId}-description`} className="sr-only">
                Description
              </FieldLabel>
              <Input
                id={`${formId}-description`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this pipeline does"
                disabled={isLoading}
              />
            </Field>
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
              {pipelineDraftSentence(levels)}
            </p>
            {error ? (
              <FieldError>{getHumaErrorMessage(error)}</FieldError>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={definitionView === "json" ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setDefinitionView((view) =>
                  view === "levels" ? "json" : "levels"
                )
              }
            >
              <FileJsonIcon />
              {definitionView === "json" ? "Levels" : "JSON"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !canSubmit || Boolean(jsonError)}
              aria-busy={isLoading}
              className={isLoading ? "disabled:opacity-100" : undefined}
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" />
                  <span className="sr-only">Saving</span>
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>

        <DefinitionColumns aside={aside}>
          {definitionView === "json" ? (
            <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
              <DefinitionJsonPane
                id={`${formId}-json`}
                title="JSON definition"
                description="Updates as you edit. Paste a definition to fill the builder."
                value={jsonText}
                onChange={handleJsonChange}
                onBlur={handleJsonBlur}
                error={jsonError}
              />
            </div>
          ) : (
            <DefinitionCard>
              <PipelineLevelsEditor
                levels={levels}
                onChange={(next) => {
                  markBuilderSource()
                  setLevels(next)
                }}
                onCreateNode={openCreateNode}
                onEditNode={openEditNode}
              />
            </DefinitionCard>
          )}
        </DefinitionColumns>
      </form>
      <NodeDefinitionDialog
        key={nodeDialogKey}
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        node={nodeDialogNode}
        onSave={handleNodeSave}
        pipelineTemplateContext={nodeDialogContext}
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

function LevelCard({
  level,
  levelIndex,
  totalLevels,
}: {
  level: PipelineLevelNode[]
  levelIndex: number
  totalLevels: number
}) {
  const parallel = level.length > 1

  return (
    <div className="overflow-hidden rounded-xl border border-l-4 border-l-violet-500 bg-muted/20">
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
        <div className="text-right">
          <p className="text-xs text-muted-foreground tabular-nums">
            {level.length} {level.length === 1 ? "node" : "nodes"}
          </p>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {level.map((node, nodeIndex) => (
          <NodeCard key={`${node.name}-${nodeIndex}`} node={node} />
        ))}
      </div>
    </div>
  )
}

function NodeCard({ node }: { node: PipelineLevelNode }) {
  const summary = nodeConfigSummary(node.type, node.definition)
  return (
    <div className="rounded-xl border bg-background p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <BoxIcon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{node.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {nodeTypeLabel(node.type)}
          </p>
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
