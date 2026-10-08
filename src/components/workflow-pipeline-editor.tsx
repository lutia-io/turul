import {
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react"
import { Loader } from "lucide-react"

import { EnabledField } from "@/components/checkbox-field"
import {
  PipelineDefinitionBuilder,
  type PipelineDefinitionBuilderHandle,
} from "@/components/pipeline-definition-builder"
import {
  PipelineViewMenu,
  type PipelineView,
} from "@/components/pipeline-view-menu"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { PipelineDefinition } from "@/data/networks"
import {
  levelsFromApi,
  levelsToApi,
  parsePipelineDefinition,
  pipelineDraftSentence,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import type { SavedWorkflowPipeline } from "@/lib/workflow-pipeline"
import { getHumaErrorMessage } from "@/store/api"
import {
  useCreatePipelineDefinitionMutation,
  useUpdatePipelineDefinitionMutation,
} from "@/store/pipeline-slice"

export type WorkflowPipelineEditorHandle = {
  cancelNode: () => boolean
}

export function WorkflowPipelineEditor({
  ref,
  mode,
  pipeline,
  networkId,
  organizationId,
  layeredCancel = false,
  onDone,
  onCancel,
}: {
  ref?: Ref<WorkflowPipelineEditorHandle>
  mode: "create" | "edit"
  pipeline?: PipelineDefinition
  networkId: string
  organizationId?: string
  layeredCancel?: boolean
  onDone: (pipeline: SavedWorkflowPipeline) => void
  onCancel: () => void
}) {
  const formId = useId()
  const builderRef = useRef<PipelineDefinitionBuilderHandle>(null)
  const [createPipeline, createState] = useCreatePipelineDefinitionMutation()
  const [updatePipeline, updateState] = useUpdatePipelineDefinitionMutation()
  const [definitionView, setDefinitionView] = useState<PipelineView>("levels")
  const [nodeOpen, setNodeOpen] = useState(false)
  const [name, setName] = useState(
    mode === "edit" ? (pipeline?.name ?? "") : ""
  )
  const [description, setDescription] = useState(
    mode === "edit" ? (pipeline?.description ?? "") : ""
  )
  const [active, setActive] = useState(
    mode === "edit" ? (pipeline?.active ?? true) : true
  )
  const [levels, setLevels] = useState<PipelineLevelDraft[]>(() =>
    levelsFromApi(
      mode === "edit" && pipeline
        ? parsePipelineDefinition(pipeline.definition)
        : undefined
    )
  )
  const isLoading = createState.isLoading || updateState.isLoading
  const error = createState.error ?? updateState.error
  const sentence = pipelineDraftSentence(levels)
  const definition = useMemo(() => levelsToApi(levels), [levels])
  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(networkId) &&
    (Boolean(definition) || nodeOpen)
  const missingPipeline = mode === "edit" && !pipeline

  useImperativeHandle(
    ref,
    () => ({
      cancelNode() {
        if (!nodeOpen) {
          return false
        }
        builderRef.current?.cancelNode()
        setNodeOpen(false)
        return true
      },
    }),
    [nodeOpen]
  )

  function handleLayeredCancel() {
    if (nodeOpen) {
      builderRef.current?.cancelNode()
      return
    }
    onCancel()
  }

  async function handleDone() {
    const committed = builderRef.current?.commitOpenNode()
    if (!committed?.ok) {
      return
    }
    const body = levelsToApi(committed.levels)
    if (!name.trim() || !networkId || !body) {
      return
    }
    const saved = {
      name: name.trim(),
      description: description.trim(),
      active,
      definition: body,
    }
    try {
      if (mode === "create") {
        const created = await createPipeline({
          ...saved,
          networkId,
          organizationId,
        }).unwrap()
        onDone({
          id: created.id,
          ...saved,
          networkId,
          organizationId,
        })
        return
      }
      if (!pipeline) {
        return
      }
      const updated = await updatePipeline({
        id: pipeline.id,
        ...saved,
      }).unwrap()
      onDone({
        id: updated.id,
        ...saved,
        networkId,
        organizationId: pipeline.organizationId,
      })
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  if (missingPipeline) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-6 py-4 pr-14">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-medium">Edit pipeline</h2>
            <p className="text-sm text-muted-foreground">
              This pipeline is no longer available.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-6 py-4 pr-14">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-medium">
            {mode === "create" ? "Create a pipeline" : "Edit pipeline"}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            {mode === "edit"
              ? "Changes apply everywhere this pipeline is used."
              : sentence}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nodeOpen ? null : (
            <PipelineViewMenu
              value={definitionView}
              onChange={setDefinitionView}
            />
          )}
          {layeredCancel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={handleLayeredCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={onCancel}
          >
            Back
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading || !canSubmit}
            aria-busy={isLoading}
            className={isLoading ? "disabled:opacity-100" : undefined}
            onClick={() => {
              void handleDone()
            }}
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin" />
                <span className="sr-only">Saving</span>
              </>
            ) : (
              "Done"
            )}
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden bg-muted/40 px-6 py-5">
        <FieldGroup className="shrink-0 gap-3 rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,1fr))_auto]">
            <Field className="gap-1">
              <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Fetch and summarize"
                autoFocus
                required
                disabled={isLoading}
                aria-invalid={error ? true : undefined}
              />
            </Field>
            <Field className="gap-1">
              <FieldLabel htmlFor={`${formId}-description`}>
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
            <EnabledField
              formId={formId}
              checked={active}
              onChange={setActive}
            />
          </div>
          {error ? <FieldError>{getHumaErrorMessage(error)}</FieldError> : null}
        </FieldGroup>
        <PipelineDefinitionBuilder
          ref={builderRef}
          levels={levels}
          onChange={setLevels}
          view={definitionView}
          sentence={sentence}
          onNodeSessionChange={setNodeOpen}
        />
      </div>
    </div>
  )
}
