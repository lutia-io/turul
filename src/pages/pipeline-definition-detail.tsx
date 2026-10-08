import { useId, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import {
  Building2Icon,
  GalleryVerticalEndIcon,
  LayersIcon,
  Loader,
  PencilIcon,
  PlayIcon,
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
import {
  PipelineDefinitionBuilder,
  type PipelineDefinitionBuilderHandle,
} from "@/components/pipeline-definition-builder"
import { PipelineFlowCanvas } from "@/components/pipeline-flow"
import { PipelineLevelsView } from "@/components/pipeline-levels-editor"
import {
  PipelineViewMenu,
  type PipelineView,
} from "@/components/pipeline-view-menu"
import { RunStatusPill } from "@/components/run-card"
import { RunPipelineDialog } from "@/components/run-pipeline-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { PipelineDefinition } from "@/data/networks"
import { getPipelineLevels } from "@/lib/json-definition"
import {
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspacePipelineRuns,
  workspacePipelineFromApi,
} from "@/lib/network-workspace"
import {
  levelsFromApi,
  levelsToApi,
  parsePipelineDefinition,
  pipelineDraftSentence,
  pipelineNodeCount,
  pipelineSummary,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import { apiPipelineStatus, formatRelativeTime } from "@/lib/runs"
import { getHumaErrorMessage, getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useGetPipelineDefinitionQuery,
  useUpdatePipelineDefinitionMutation,
} from "@/store/pipeline-slice"

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
  const viewLevels = useMemo(
    () =>
      visiblePipeline
        ? levelsFromApi(parsePipelineDefinition(visiblePipeline.definition))
        : [],
    [visiblePipeline]
  )
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
        onCancel={() => setSearchParams({})}
      />
    )
  }

  return (
    <DefinitionPage fill>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 px-4 pt-5 sm:px-6 lg:px-8">
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
          <PipelineViewMenu value={pipelineView} onChange={setPipelineView} />
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

      <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-4 sm:px-6 lg:px-8">
        {pipelineView === "canvas" ? (
          <PipelineFlowCanvas
            className="h-full min-h-0 flex-1"
            levels={viewLevels}
            sentence={summary}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DefinitionColumns aside={aside}>
              <DefinitionCard>
                <PipelineLevelsView levels={levels} />
              </DefinitionCard>
            </DefinitionColumns>
          </div>
        )}
      </div>

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
  onCancel,
}: {
  pipeline: PipelineDefinition
  href: (rest?: string) => string
  onCancel: () => void
}) {
  const formId = useId()
  const builderRef = useRef<PipelineDefinitionBuilderHandle>(null)
  const [updatePipeline, updateState] = useUpdatePipelineDefinitionMutation()
  const parsed = parsePipelineDefinition(pipeline.definition)
  const [definitionView, setDefinitionView] = useState<PipelineView>("levels")
  const [nodeOpen, setNodeOpen] = useState(false)
  const [name, setName] = useState(pipeline.name)
  const [description, setDescription] = useState(pipeline.description ?? "")
  const [active, setActive] = useState(pipeline.active)
  const [levels, setLevels] = useState<PipelineLevelDraft[]>(() =>
    levelsFromApi(parsed)
  )
  const isLoading = updateState.isLoading
  const error = updateState.error

  const definition = useMemo(() => levelsToApi(levels), [levels])
  const canSubmit = Boolean(name.trim()) && (Boolean(definition) || nodeOpen)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const committed = builderRef.current?.commitOpenNode()
    if (!committed?.ok) {
      return
    }
    const body = levelsToApi(committed.levels)
    if (!name.trim() || !body) {
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
    <DefinitionPage fill>
      <form
        id={formId}
        onSubmit={handleSubmit}
        autoComplete="off"
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 px-4 pt-5 sm:px-6 lg:px-8">
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
            {error ? (
              <FieldError>{getHumaErrorMessage(error)}</FieldError>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {nodeOpen ? null : (
              <PipelineViewMenu
                value={definitionView}
                onChange={setDefinitionView}
              />
            )}
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
              disabled={isLoading || !canSubmit}
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

        <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-4 sm:px-6 lg:px-8">
          <PipelineDefinitionBuilder
            ref={builderRef}
            levels={levels}
            onChange={setLevels}
            view={definitionView}
            sentence={pipelineDraftSentence(levels)}
            onNodeSessionChange={setNodeOpen}
          />
        </div>
      </form>
    </DefinitionPage>
  )
}
