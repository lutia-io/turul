import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { CheckboxField } from "@/components/checkbox-field"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { WorkflowActionsBuilder } from "@/components/workflow-actions-builder"
import { WorkflowCriteriaBuilder } from "@/components/workflow-criteria-builder"
import {
  getWorkflowDefinition,
  updateWorkflowDefinition,
} from "@/data/networks"
import {
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceNetworks,
  useWorkspaceSchemas,
  workspaceWorkflowFromApi,
} from "@/lib/network-workspace"
import { slugifyId } from "@/lib/slug"
import {
  actionsFromApi,
  actionsToApi,
  criteriaFromApi,
  criteriaToApi,
  emptyAction,
  emptyGroup,
  parseWorkflowDefinition,
  schemaFieldOptions,
  type ActionDraft,
  type CriteriaGroupDraft,
  type WorkflowDefinitionBody,
} from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"
import {
  useCreateWorkflowDefinitionMutation,
  useGetWorkflowDefinitionQuery,
} from "@/store/workflow-slice"

function workflowDefinitionError(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "JSON must be a workflow definition object"
    }
    if (!parseWorkflowDefinition(parsed as JsonObject)) {
      return "JSON must include criteria or actions"
    }
    return null
  } catch {
    return "Invalid JSON"
  }
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
  const { networks } = useWorkspaceNetworks()
  const { schemas } = useWorkspaceSchemas()
  const { organizationId } = useNetworkWorkspace()
  const [createWorkflow, { isLoading, error, reset }] =
    useCreateWorkflowDefinitionMutation()
  const apiWorkflowQuery = useGetWorkflowDefinitionQuery(
    workflowDefinitionId ?? "",
    { skip: !open || !workflowDefinitionId }
  )
  const existing = workflowDefinitionId
    ? getWorkflowDefinition(workflowDefinitionId)
    : undefined
  const editing = Boolean(workflowDefinitionId)
  const lockNetwork = Boolean(networkId)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? existing?.network.id ?? networks[0]?.id ?? ""
  )
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [schemaId, setSchemaId] = useState("")
  const [active, setActive] = useState(true)
  const [criteria, setCriteria] = useState<CriteriaGroupDraft>(emptyGroup())
  const [actions, setActions] = useState<ActionDraft[]>([emptyAction()])
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const jsonSourceRef = useRef<"builder" | "json">("builder")

  const firstNetworkId = networks[0]?.id ?? ""
  const networkSchemas = useMemo(
    () => schemas.filter((schema) => schema.networkId === selectedNetworkId),
    [schemas, selectedNetworkId]
  )
  const triggerSchema = networkSchemas.find((schema) => schema.id === schemaId)
  const triggerFields = schemaFieldOptions(triggerSchema?.definition)

  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  useEffect(() => {
    if (!open) {
      return
    }

    const mockCurrent = workflowDefinitionId
      ? getWorkflowDefinition(workflowDefinitionId)?.workflowDefinition
      : undefined
    const current =
      mockCurrent ??
      (apiWorkflowQuery.data
        ? workspaceWorkflowFromApi(apiWorkflowQuery.data)
        : undefined)
    const parsed = parseWorkflowDefinition(current?.definition)

    setName(current?.name ?? "")
    setSlug(current?.slug ?? "")
    setSlugTouched(Boolean(current))
    setSchemaId(current?.schemaId ?? "")
    setActive(current?.active ?? true)
    jsonSourceRef.current = "builder"
    setJsonError(null)
    setCriteria(criteriaFromApi(parsed?.criteria))
    setActions(actionsFromApi(parsed?.actions))
  }, [apiWorkflowQuery.data, open, workflowDefinitionId])

  useEffect(() => {
    if (!open) {
      return
    }
    const mockCurrent = workflowDefinitionId
      ? getWorkflowDefinition(workflowDefinitionId)
      : undefined
    setSelectedNetworkId((current) => {
      if (networkId) {
        return networkId
      }
      return (
        (mockCurrent?.network.id ??
          apiWorkflowQuery.data?.networkId ??
          current) ||
        firstNetworkId
      )
    })
  }, [
    apiWorkflowQuery.data?.networkId,
    firstNetworkId,
    networkId,
    open,
    workflowDefinitionId,
  ])

  useEffect(() => {
    if (!open || editing || schemaId) {
      return
    }
    setSchemaId(networkSchemas[0]?.id ?? "")
  }, [editing, networkSchemas, open, schemaId])

  const definition = useMemo<WorkflowDefinitionBody | undefined>(() => {
    const nextCriteria = criteriaToApi(criteria, triggerFields)
    const nextActions = actionsToApi(actions)
    if (!nextCriteria) {
      return undefined
    }
    return {
      criteria: nextCriteria,
      actions: nextActions,
    }
  }, [actions, criteria, triggerFields])

  const generatedJson = stringifyDefinition(
    definition ?? { criteria: {}, actions: [] }
  )

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

  function applyWorkflowDefinition(body: WorkflowDefinitionBody) {
    jsonSourceRef.current = "json"
    setCriteria(criteriaFromApi(body.criteria))
    setActions(actionsFromApi(body.actions))
  }

  function handleJsonChange(text: string) {
    jsonSourceRef.current = "json"
    setJsonText(text)
    const parsed = parseJsonObject(text)
    if (!parsed) {
      setJsonError(workflowDefinitionError(text))
      return
    }
    const body = parseWorkflowDefinition(parsed)
    if (!body) {
      setJsonError("JSON must include criteria or actions")
      return
    }
    setJsonError(null)
    applyWorkflowDefinition(body)
  }

  function handleJsonBlur() {
    if (!jsonText.trim()) {
      jsonSourceRef.current = "builder"
      setJsonText(generatedJson)
      setJsonError(null)
      return
    }
    const parsed = parseJsonObject(jsonText)
    const body = parsed ? parseWorkflowDefinition(parsed) : undefined
    if (!parsed || !body) {
      setJsonError(workflowDefinitionError(jsonText))
      return
    }
    jsonSourceRef.current = "json"
    setJsonError(null)
    applyWorkflowDefinition(body)
    setJsonText(stringifyDefinition(parsed))
  }

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(selectedNetworkId) &&
    Boolean(schemaId) &&
    Boolean(definition) &&
    (definition?.actions.length ?? 0) > 0 &&
    !jsonError

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !definition) {
      return
    }

    const parsed = parseJsonObject(jsonText)
    const body = parsed ? parseWorkflowDefinition(parsed) : definition
    if (!body || body.actions.length === 0) {
      return
    }

    if (editing) {
      if (existing) {
        updateWorkflowDefinition(workflowDefinitionId!, {
          name,
          slug: slugTouched ? slug : slugifyId(name),
          schemaId,
          triggerType: "record",
          triggerEvent: `${slugifyId(name)}.created`,
          steps: [],
          active,
          internal: existing.workflowDefinition.internal,
        })
      }
      onOpenChange(false)
      return
    }

    void submitCreate(body)
  }

  async function submitCreate(body: WorkflowDefinitionBody) {
    try {
      const workflow = await createWorkflow({
        name: name.trim(),
        active,
        definition: body,
        schemaId,
        networkId: selectedNetworkId,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: organizationId || undefined,
          rest: `workflow-definitions/${workflow.id}`,
        })
      )
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>
            {editing ? "Edit workflow" : "Create a workflow"}
          </DialogTitle>
          <DialogDescription>
            Pick the record type, describe when it should run, then choose what
            happens next.
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
              {networks.length > 0 && !editing ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                  <NativeSelect
                    id={`${formId}-network`}
                    value={selectedNetworkId}
                    disabled={lockNetwork || isLoading}
                    onChange={(event) => {
                      const nextId = event.target.value
                      setSelectedNetworkId(nextId)
                      const nextSchema = schemas.find(
                        (schema) => schema.networkId === nextId
                      )
                      setSchemaId(nextSchema?.id ?? "")
                    }}
                    required
                  >
                    {networks.map((network) => (
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
                    placeholder="Shipment overweight"
                    autoFocus
                    required
                    disabled={isLoading}
                    aria-invalid={error ? true : undefined}
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
                    placeholder="shipment-overweight"
                    className="font-mono"
                    disabled={editing}
                    required
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor={`${formId}-schema`}>
                  Start from records of
                </FieldLabel>
                {networkSchemas.length > 0 ? (
                  <NativeSelect
                    id={`${formId}-schema`}
                    value={schemaId}
                    onChange={(event) => setSchemaId(event.target.value)}
                    required
                    disabled={isLoading}
                  >
                    {networkSchemas.map((schema) => (
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
                <p className="text-xs text-muted-foreground">
                  The workflow watches new records on this schema and uses its
                  fields in conditions.
                </p>
              </Field>
              <CheckboxField
                id={`${formId}-active`}
                checked={active}
                onChange={setActive}
                label="Turn this workflow on"
              />
              {error ? (
                <FieldError>{getHumaErrorMessage(error)}</FieldError>
              ) : null}
            </FieldGroup>

            <WorkflowCriteriaBuilder
              value={criteria}
              fields={triggerFields}
              onChange={(next) => {
                markBuilderSource()
                setCriteria(next)
              }}
            />

            <WorkflowActionsBuilder
              value={actions}
              schemas={networkSchemas}
              triggerFields={triggerFields}
              onChange={(next) => {
                markBuilderSource()
                setActions(next)
              }}
            />

            <div className="overflow-hidden rounded-xl border bg-muted/30">
              <div className="border-b px-3 py-2">
                <p className="text-xs font-medium">JSONB preview</p>
                <p className="text-[11px] text-muted-foreground">
                  Paste a workflow definition to fill the builder, or edit
                  conditions and actions above to update this JSON.
                </p>
              </div>
              <Textarea
                id={`${formId}-json`}
                value={jsonText}
                onChange={(event) => handleJsonChange(event.target.value)}
                onBlur={handleJsonBlur}
                spellCheck={false}
                aria-invalid={jsonError ? true : undefined}
                className="max-h-64 min-h-48 resize-y rounded-none border-0 bg-transparent font-mono text-[12px] leading-relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
              />
              {jsonError ? (
                <div className="border-t px-3 py-2">
                  <FieldError>{jsonError}</FieldError>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={isLoading} />}
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={isLoading || !canSubmit || Boolean(jsonError)}
            >
              {isLoading
                ? "Creating..."
                : editing
                  ? "Save workflow"
                  : "Create workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
