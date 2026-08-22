import { useEffect, useId, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { CheckboxField } from "@/components/checkbox-field"
import {
  DefinitionStepEditor,
  newFlowStep,
  type FlowStepDraft,
} from "@/components/definition-step-editor"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  createPipelineDefinition,
  getPipelineDefinition,
  networkList,
  updatePipelineDefinition,
} from "@/data/networks"
import { getPipelineStages, stringifyDefinition } from "@/lib/json-definition"
import { networkWorkspacePath } from "@/lib/network-workspace"
import { slugifyId } from "@/lib/slug"

const sourceTypes = ["api", "stream", "file", "mailbox", "database"]
const stageTypes = ["extract", "validate", "transform", "publish"]

function draftsFromPipeline(pipelineDefinitionId?: string): FlowStepDraft[] {
  const result = pipelineDefinitionId
    ? getPipelineDefinition(pipelineDefinitionId)
    : undefined
  const stages = result
    ? getPipelineStages(result.pipelineDefinition.definition)
    : []

  if (stages.length === 0) {
    return [newFlowStep("extract", "Extract records")]
  }

  return stages.map((stage) => ({
    key: stage.id,
    id: stage.id,
    type: stage.type,
    name: stage.name,
  }))
}

export function PipelineDefinitionDialog({
  open,
  onOpenChange,
  networkId,
  pipelineDefinitionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  pipelineDefinitionId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const existing = pipelineDefinitionId
    ? getPipelineDefinition(pipelineDefinitionId)
    : undefined
  const editing = Boolean(existing)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? existing?.network.id ?? networkList[0]?.id ?? ""
  )
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [sourceType, setSourceType] = useState("api")
  const [sourceName, setSourceName] = useState("")
  const [active, setActive] = useState(false)
  const [internal, setInternal] = useState(false)
  const [stages, setStages] = useState<FlowStepDraft[]>([
    newFlowStep("extract", "Extract records"),
  ])

  useEffect(() => {
    if (!open) {
      return
    }

    const current = pipelineDefinitionId
      ? getPipelineDefinition(pipelineDefinitionId)
      : undefined
    const source = current?.pipelineDefinition.definition.source
    const sourceObject =
      source && typeof source === "object" && !Array.isArray(source)
        ? source
        : undefined

    setSelectedNetworkId(
      networkId ?? current?.network.id ?? networkList[0]?.id ?? ""
    )
    setName(current?.pipelineDefinition.name ?? "")
    setSlug(current?.pipelineDefinition.slug ?? "")
    setSlugTouched(Boolean(current))
    setSourceType(
      typeof sourceObject?.type === "string" ? sourceObject.type : "api"
    )
    setSourceName(
      typeof sourceObject?.name === "string" ? sourceObject.name : ""
    )
    setActive(current?.pipelineDefinition.active ?? false)
    setInternal(current?.pipelineDefinition.internal ?? false)
    setStages(draftsFromPipeline(pipelineDefinitionId))
  }, [networkId, open, pipelineDefinitionId])

  const preview = stringifyDefinition({
    version: 1,
    source: {
      type: sourceType,
      name: sourceName.trim() || "Partner API",
    },
    stages: stages.map((stage, index) => ({
      id: slugifyId(stage.id || stage.name || `stage-${index + 1}`),
      type: stage.type,
      name: stage.name.trim() || `Stage ${index + 1}`,
      order: index + 1,
    })),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !selectedNetworkId) {
      return
    }

    const input = {
      name,
      slug: slugTouched ? slug : slugifyId(name),
      sourceType,
      sourceName: sourceName.trim() || "Partner API",
      stages: stages.map((stage, index) => ({
        id: slugifyId(stage.id || stage.name || `stage-${index + 1}`),
        type: stage.type,
        name: stage.name.trim() || `Stage ${index + 1}`,
      })),
      active,
      internal,
    }

    const pipeline = editing
      ? updatePipelineDefinition(pipelineDefinitionId!, input)
      : createPipelineDefinition(selectedNetworkId, input)

    onOpenChange(false)
    if (!editing) {
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          rest: `pipeline-definitions/${pipeline.id}`,
        })
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>
            {editing
              ? "Edit pipeline definition"
              : "Create a pipeline definition"}
          </DialogTitle>
          <DialogDescription>
            Choose a source and order the stages stored in the JSONB definition.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <FieldGroup>
              {!editing ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                  <NativeSelect
                    id={`${formId}-network`}
                    value={selectedNetworkId}
                    disabled={Boolean(networkId)}
                    onChange={(event) =>
                      setSelectedNetworkId(event.target.value)
                    }
                    required
                  >
                    {networkList.map((network) => (
                      <NativeSelectOption key={network.id} value={network.id}>
                        {network.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input
                    id={`${formId}-name`}
                    value={name}
                    onChange={(event) => {
                      const next = event.target.value
                      setName(next)
                      if (!slugTouched) {
                        setSlug(slugifyId(next))
                      }
                    }}
                    placeholder="Manifest ingest"
                    autoFocus
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${formId}-slug`}>Slug</FieldLabel>
                  <Input
                    id={`${formId}-slug`}
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true)
                      setSlug(event.target.value)
                    }}
                    className="font-mono"
                    disabled={editing}
                    required
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${formId}-source-type`}>
                    Source type
                  </FieldLabel>
                  <NativeSelect
                    id={`${formId}-source-type`}
                    value={sourceType}
                    onChange={(event) => setSourceType(event.target.value)}
                  >
                    {sourceTypes.map((type) => (
                      <NativeSelectOption key={type} value={type}>
                        {type}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${formId}-source-name`}>
                    Source name
                  </FieldLabel>
                  <Input
                    id={`${formId}-source-name`}
                    value={sourceName}
                    onChange={(event) => setSourceName(event.target.value)}
                    placeholder="Partner API"
                  />
                </Field>
              </div>
              <div className="flex gap-5">
                <CheckboxField
                  id={`${formId}-active`}
                  checked={active}
                  onChange={setActive}
                  label="Published"
                />
                <CheckboxField
                  id={`${formId}-internal`}
                  checked={internal}
                  onChange={setInternal}
                  label="Internal"
                />
              </div>
            </FieldGroup>

            <div className="flex flex-col gap-2">
              <div>
                <h3 className="text-sm font-medium">Stages</h3>
                <p className="text-xs text-muted-foreground">
                  Ordered stages stored on the definition.
                </p>
              </div>
              <DefinitionStepEditor
                noun="stage"
                steps={stages}
                typeOptions={stageTypes}
                onChange={setStages}
              />
            </div>

            <div className="overflow-hidden rounded-xl border bg-muted/30">
              <div className="border-b px-3 py-2">
                <p className="text-xs font-medium">JSONB preview</p>
              </div>
              <pre className="max-h-40 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
                {preview}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!name.trim() || !selectedNetworkId}>
              {editing ? "Save pipeline" : "Create pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
