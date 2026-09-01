import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useNavigate, useParams } from "react-router"
import { Loader } from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
import { Button } from "@/components/ui/button"
import {
  DefinitionDialogBody,
  DefinitionJsonPane,
  definitionDialogClassName,
} from "@/components/definition-dialog-layout"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WorkflowActionsBuilder } from "@/components/workflow-actions-builder"
import { WorkflowCriteriaBuilder } from "@/components/workflow-criteria-builder"
import { getWorkflowDefinition } from "@/data/networks"
import {
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
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
  useUpdateWorkflowDefinitionMutation,
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
  const { networks } = useWorkspaceNetworkList()
  const { schemas } = useWorkspaceSchemas({ skip: !open })
  const { organizationId } = useParams()
  const [createWorkflow, createState] = useCreateWorkflowDefinitionMutation()
  const [updateWorkflow, updateState] = useUpdateWorkflowDefinitionMutation()
  const isLoading = createState.isLoading || updateState.isLoading
  const error = createState.error ?? updateState.error
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
    createState.reset()
    updateState.reset()
    // Reset only when the dialog opens or closes. `reset` changes after each
    // mutation (it closes over requestId) and would clear a 409 before render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const mockCurrent = workflowDefinitionId
      ? getWorkflowDefinition(workflowDefinitionId)?.workflowDefinition
      : undefined
    const current =
      mockCurrent ??
      (workflowDefinitionId && apiWorkflowQuery.currentData
        ? workspaceWorkflowFromApi(apiWorkflowQuery.currentData)
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
  }, [apiWorkflowQuery.currentData, open, workflowDefinitionId])

  useEffect(() => {
    if (!open) {
      return
    }
    const mockCurrent = workflowDefinitionId
      ? getWorkflowDefinition(workflowDefinitionId)
      : undefined
    const apiCurrent = workflowDefinitionId
      ? apiWorkflowQuery.currentData
      : undefined
    setSelectedNetworkId((current) => {
      if (networkId) {
        return networkId
      }
      return (
        (mockCurrent?.network.id ?? apiCurrent?.networkId ?? current) ||
        firstNetworkId
      )
    })
  }, [
    apiWorkflowQuery.currentData,
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

  const chooseSchemaValue = "__choose_schema__"
  const schemaField = (
    <Field>
      <FieldLabel htmlFor={`${formId}-schema`}>Record type</FieldLabel>
      {networkSchemas.length > 0 ? (
        <Select
          value={schemaId || chooseSchemaValue}
          disabled={isLoading}
          required
          modal={false}
          items={[
            { value: chooseSchemaValue, label: "Choose a record type" },
            ...networkSchemas.map((schema) => ({
              value: schema.id,
              label: schema.name,
            })),
          ]}
          onValueChange={(value) => {
            if (!value || value === chooseSchemaValue) {
              setSchemaId("")
              return
            }
            setSchemaId(value)
          }}
        >
          <SelectTrigger id={`${formId}-schema`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={chooseSchemaValue}>
              Choose a record type
            </SelectItem>
            {networkSchemas.map((schema) => (
              <SelectItem key={schema.id} value={schema.id}>
                {schema.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-sm text-muted-foreground">
          Create a schema in this network before adding a workflow.
        </p>
      )}
      <FieldDescription>
        The workflow watches new records of this type and uses its fields in
        conditions.
      </FieldDescription>
    </Field>
  )

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

    void submitDefinition(body)
  }

  async function submitDefinition(body: WorkflowDefinitionBody) {
    try {
      if (editing) {
        await updateWorkflow({
          id: workflowDefinitionId!,
          name: name.trim(),
          active,
          definition: body,
          schemaId,
        }).unwrap()
        onOpenChange(false)
        return
      }

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
      <DialogContent size="full" className={definitionDialogClassName}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>
            {editing ? "Edit workflow definition" : "Create a workflow definition"}
          </DialogTitle>
          <DialogDescription>
            {triggerSchema
              ? `When a matching ${triggerSchema.name} record is created, this workflow runs the actions you define.`
              : "Pick a record type, add conditions for when it should run, then choose what happens next."}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <DefinitionDialogBody
            json={
              <DefinitionJsonPane
                id={`${formId}-json`}
                title="JSON definition"
                description="Updates as you edit conditions and actions. Paste a definition to fill the builder."
                value={jsonText}
                onChange={handleJsonChange}
                onBlur={handleJsonBlur}
                error={jsonError}
              />
            }
          >
            <FieldGroup className="gap-4">
              {networks.length > 0 && !editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`${formId}-network`}>
                      Network
                    </FieldLabel>
                    <Select
                      value={selectedNetworkId}
                      disabled={lockNetwork || isLoading}
                      required
                      modal={false}
                      items={networks.map((network) => ({
                        value: network.id,
                        label: network.name,
                      }))}
                      onValueChange={(value) => {
                        if (!value) {
                          return
                        }
                        setSelectedNetworkId(value)
                        const nextSchema = schemas.find(
                          (schema) => schema.networkId === value
                        )
                        setSchemaId(nextSchema?.id ?? "")
                      }}
                    >
                      <SelectTrigger id={`${formId}-network`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {networks.map((network) => (
                          <SelectItem key={network.id} value={network.id}>
                            {network.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {schemaField}
                </div>
              ) : (
                schemaField
              )}
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
                <CheckboxField
                  id={`${formId}-active`}
                  checked={active}
                  onChange={setActive}
                  label="Published"
                />
                <FieldDescription>
                  Published workflows run when a matching record is created.
                  Drafts are saved but do not run.
                </FieldDescription>
              </Field>
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
          </DefinitionDialogBody>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={isLoading} />}
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={isLoading || !canSubmit || Boolean(jsonError)}
              aria-busy={isLoading}
              className={isLoading ? "disabled:opacity-100" : undefined}
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" />
                  <span className="sr-only">
                    {editing ? "Saving" : "Creating"}
                  </span>
                </>
              ) : editing ? (
                "Save workflow definition"
              ) : (
                "Create workflow definition"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
