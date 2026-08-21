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
  createWorkflowDefinition,
  getWorkflowDefinition,
  networkList,
  updateWorkflowDefinition,
} from "@/data/networks"
import { getWorkflowSteps, stringifyDefinition } from "@/lib/json-definition"
import { networkWorkspacePath } from "@/lib/network-workspace"
import { slugifyId } from "@/lib/slug"

const triggerTypes = ["event", "webhook", "schedule", "record"]
const stepTypes = ["validate", "transform", "http", "task", "notify", "gateway"]

function draftsFromWorkflow(workflowDefinitionId?: string): FlowStepDraft[] {
  const result = workflowDefinitionId
    ? getWorkflowDefinition(workflowDefinitionId)
    : undefined
  const steps = result
    ? getWorkflowSteps(result.workflowDefinition.definition)
    : []

  if (steps.length === 0) {
    return [newFlowStep("validate", "Validate input")]
  }

  return steps.map((step) => ({
    key: step.id,
    id: step.id,
    type: step.type,
    name: step.name,
  }))
}

export function WorkflowDefinitionDialog({
  open,
  onOpenChange,
  networkId,
  workflowDefinitionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  workflowDefinitionId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const existing = workflowDefinitionId
    ? getWorkflowDefinition(workflowDefinitionId)
    : undefined
  const editing = Boolean(existing)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? existing?.network.id ?? networkList[0]?.id ?? ""
  )
  const selectedNetwork =
    networkList.find((network) => network.id === selectedNetworkId) ??
    existing?.network
  const schemas = selectedNetwork?.schemas ?? []
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [schemaId, setSchemaId] = useState("")
  const [triggerType, setTriggerType] = useState("event")
  const [triggerEvent, setTriggerEvent] = useState("")
  const [active, setActive] = useState(false)
  const [internal, setInternal] = useState(false)
  const [steps, setSteps] = useState<FlowStepDraft[]>([
    newFlowStep("validate", "Validate input"),
  ])

  useEffect(() => {
    if (!open) {
      return
    }

    const current = workflowDefinitionId
      ? getWorkflowDefinition(workflowDefinitionId)
      : undefined
    const nextNetworkId =
      networkId ?? current?.network.id ?? networkList[0]?.id ?? ""
    const nextNetwork = networkList.find(
      (network) => network.id === nextNetworkId
    )
    const trigger = current?.workflowDefinition.definition.trigger
    const triggerObject =
      trigger && typeof trigger === "object" && !Array.isArray(trigger)
        ? trigger
        : undefined

    setSelectedNetworkId(nextNetworkId)
    setName(current?.workflowDefinition.name ?? "")
    setSlug(current?.workflowDefinition.slug ?? "")
    setSlugTouched(Boolean(current))
    setSchemaId(
      current?.workflowDefinition.schemaId ?? nextNetwork?.schemas[0]?.id ?? ""
    )
    setTriggerType(
      typeof triggerObject?.type === "string" ? triggerObject.type : "event"
    )
    setTriggerEvent(
      typeof triggerObject?.event === "string" ? triggerObject.event : ""
    )
    setActive(current?.workflowDefinition.active ?? false)
    setInternal(current?.workflowDefinition.internal ?? false)
    setSteps(draftsFromWorkflow(workflowDefinitionId))
  }, [networkId, open, workflowDefinitionId])

  const preview = stringifyDefinition({
    version: 1,
    schemaId,
    trigger: {
      type: triggerType,
      event: triggerEvent || `${slugifyId(name) || "workflow"}.created`,
    },
    steps: steps.map((step, index) => ({
      id: slugifyId(step.id || step.name || `step-${index + 1}`),
      type: step.type,
      name: step.name.trim() || `Step ${index + 1}`,
      order: index + 1,
    })),
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !selectedNetworkId || !schemaId) {
      return
    }

    const input = {
      name,
      slug: slugTouched ? slug : slugifyId(name),
      schemaId,
      triggerType,
      triggerEvent: triggerEvent.trim() || `${slugifyId(name)}.created`,
      steps: steps.map((step, index) => ({
        id: slugifyId(step.id || step.name || `step-${index + 1}`),
        type: step.type,
        name: step.name.trim() || `Step ${index + 1}`,
      })),
      active,
      internal,
    }

    const workflow = editing
      ? updateWorkflowDefinition(workflowDefinitionId!, input)
      : createWorkflowDefinition(selectedNetworkId, input)

    onOpenChange(false)
    if (!editing) {
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          rest: `workflow-definitions/${workflow.id}`,
        })
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,56rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>
            {editing
              ? "Edit workflow definition"
              : "Create a workflow definition"}
          </DialogTitle>
          <DialogDescription>
            Bind a schema, choose a trigger, and order the steps stored in the
            JSONB definition.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            <FieldGroup>
              {!editing ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                  <NativeSelect
                    id={`${formId}-network`}
                    value={selectedNetworkId}
                    disabled={Boolean(networkId)}
                    onChange={(event) => {
                      const nextId = event.target.value
                      setSelectedNetworkId(nextId)
                      const nextNetwork = networkList.find(
                        (network) => network.id === nextId
                      )
                      setSchemaId(nextNetwork?.schemas[0]?.id ?? "")
                    }}
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
                    placeholder="Customs brokerage"
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
              <Field>
                <FieldLabel htmlFor={`${formId}-schema`}>Schema</FieldLabel>
                {schemas.length > 0 ? (
                  <NativeSelect
                    id={`${formId}-schema`}
                    value={schemaId}
                    onChange={(event) => setSchemaId(event.target.value)}
                    required
                  >
                    {schemas.map((schema) => (
                      <NativeSelectOption key={schema.id} value={schema.id}>
                        {schema.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Create a schema in this network before adding a workflow.
                  </p>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${formId}-trigger-type`}>
                    Trigger type
                  </FieldLabel>
                  <NativeSelect
                    id={`${formId}-trigger-type`}
                    value={triggerType}
                    onChange={(event) => setTriggerType(event.target.value)}
                  >
                    {triggerTypes.map((type) => (
                      <NativeSelectOption key={type} value={type}>
                        {type}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${formId}-trigger-event`}>
                    Trigger event
                  </FieldLabel>
                  <Input
                    id={`${formId}-trigger-event`}
                    value={triggerEvent}
                    onChange={(event) => setTriggerEvent(event.target.value)}
                    placeholder="shipment.manifest.received"
                    className="font-mono"
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
                <h3 className="text-sm font-medium">Steps</h3>
                <p className="text-xs text-muted-foreground">
                  Ordered actions stored on the definition.
                </p>
              </div>
              <DefinitionStepEditor
                noun="step"
                steps={steps}
                typeOptions={stepTypes}
                onChange={setSteps}
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
          <DialogFooter className="mx-0 mb-0">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={!name.trim() || !selectedNetworkId || !schemaId}
            >
              {editing ? "Save workflow" : "Create workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
