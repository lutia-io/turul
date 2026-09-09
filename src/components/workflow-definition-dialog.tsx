import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { useNavigate, useParams } from "react-router"
import { FileJsonIcon, Loader } from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
import { Button } from "@/components/ui/button"
import { DefinitionJsonPane } from "@/components/definition-dialog-layout"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WorkflowRuleEditor } from "@/components/workflow-rule-editor"
import {
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspacePipelines,
  useWorkspaceSchemas,
} from "@/lib/network-workspace"
import {
  actionsFromApi,
  actionsToApi,
  criteriaFromApi,
  criteriaToApi,
  emptyGroup,
  emptyTrigger,
  parseWorkflowDefinition,
  schemaFieldOptions,
  triggerFromApi,
  triggerToApi,
  workflowDraftSentence,
  type ActionDraft,
  type CriteriaGroupDraft,
  type TriggerDraft,
  type WorkflowDefinitionBody,
} from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useCreateWorkflowDefinitionMutation } from "@/store/workflow-slice"

function workflowDefinitionError(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "JSON must be a workflow definition object"
    }
    if (!parseWorkflowDefinition(parsed as JsonObject)) {
      return "JSON must include actions"
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const { schemas } = useWorkspaceSchemas({ skip: !open })
  const { pipelines } = useWorkspacePipelines({ skip: !open })
  const { organizationId } = useParams()
  const [createWorkflow, createState] = useCreateWorkflowDefinitionMutation()
  const isLoading = createState.isLoading
  const error = createState.error
  const lockNetwork = Boolean(networkId)
  const [definitionView, setDefinitionView] = useState<"rule" | "json">("rule")
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networks[0]?.id ?? ""
  )
  const [name, setName] = useState("")
  const [schemaId, setSchemaId] = useState("")
  const [active, setActive] = useState(true)
  const [trigger, setTrigger] = useState<TriggerDraft>(emptyTrigger())
  const [criteria, setCriteria] = useState<CriteriaGroupDraft>(emptyGroup())
  const [actions, setActions] = useState<ActionDraft[]>([])
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const jsonSourceRef = useRef<"builder" | "json">("builder")

  const firstNetworkId = networks[0]?.id ?? ""
  const networkSchemas = useMemo(
    () => schemas.filter((schema) => schema.networkId === selectedNetworkId),
    [schemas, selectedNetworkId]
  )
  const networkPipelines = useMemo(
    () =>
      pipelines
        .filter((pipeline) => pipeline.networkId === selectedNetworkId)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [pipelines, selectedNetworkId]
  )
  const triggerSchema = networkSchemas.find((schema) => schema.id === schemaId)
  const triggerFields = schemaFieldOptions(triggerSchema?.definition)

  useEffect(() => {
    createState.reset()
    // Reset only when the dialog opens or closes. `reset` changes after each
    // mutation (it closes over requestId) and would clear a 409 before render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    setName("")
    setSchemaId("")
    setActive(true)
    setDefinitionView("rule")
    jsonSourceRef.current = "builder"
    setJsonError(null)
    setTrigger(emptyTrigger())
    setCriteria(emptyGroup())
    setActions([])
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedNetworkId((current) => {
      if (networkId) {
        return networkId
      }
      return current || firstNetworkId
    })
  }, [firstNetworkId, networkId, open])

  useEffect(() => {
    if (!open || schemaId) {
      return
    }
    setSchemaId(networkSchemas[0]?.id ?? "")
  }, [networkSchemas, open, schemaId])

  const definition = useMemo<WorkflowDefinitionBody | undefined>(() => {
    const nextActions = actionsToApi(actions)
    if (nextActions.length === 0) {
      return undefined
    }
    return {
      trigger: triggerToApi(trigger),
      criteria: criteriaToApi(criteria, triggerFields) ?? {},
      actions: nextActions,
    }
  }, [actions, criteria, trigger, triggerFields])

  const generatedJson = stringifyDefinition(
    definition ?? { trigger: triggerToApi(trigger), criteria: {}, actions: [] }
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
    setTrigger(triggerFromApi(body.trigger))
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
      setJsonError("JSON must include actions")
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

  const showNetwork = networks.length > 0 && !lockNetwork
  const sentence = workflowDraftSentence(
    trigger,
    criteria,
    actions,
    triggerFields
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
      <DialogContent
        size="full"
        className="sm:inset-x-[8vw] lg:inset-x-16 xl:inset-x-[12vw]"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <DialogTitle>Create a workflow</DialogTitle>
              <DialogDescription>{sentence}</DialogDescription>
            </div>
            <Button
              type="button"
              variant={definitionView === "json" ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setDefinitionView((view) => (view === "rule" ? "json" : "rule"))
              }
            >
              <FileJsonIcon />
              {definitionView === "json" ? "Rule" : "JSON"}
            </Button>
          </div>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden bg-muted/40 px-6 py-5">
              <FieldGroup className="shrink-0 gap-4 rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
                {showNetwork ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`${formId}-network`}>
                        Network
                      </FieldLabel>
                      <Select
                        value={selectedNetworkId}
                        disabled={isLoading}
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
                    <SchemaSelect
                      formId={formId}
                      schemaId={schemaId}
                      schemas={networkSchemas}
                      isLoading={isLoading}
                      onChange={setSchemaId}
                    />
                  </div>
                ) : (
                  <SchemaSelect
                    formId={formId}
                    schemaId={schemaId}
                    schemas={networkSchemas}
                    isLoading={isLoading}
                    onChange={setSchemaId}
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <Field>
                    <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                    <Input
                      id={`${formId}-name`}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Shipment overweight"
                      autoFocus
                      required
                      disabled={isLoading}
                      aria-invalid={error ? true : undefined}
                    />
                  </Field>
                  <Field className="sm:pb-1">
                    <CheckboxField
                      id={`${formId}-active`}
                      checked={active}
                      onChange={setActive}
                      label="Enabled"
                    />
                  </Field>
                </div>
                {error ? (
                  <FieldError>{getHumaErrorMessage(error)}</FieldError>
                ) : null}
              </FieldGroup>

              {definitionView === "json" ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
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
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
                  <WorkflowRuleEditor
                    trigger={trigger}
                    criteria={criteria}
                    actions={actions}
                    fields={triggerFields}
                    schemas={networkSchemas}
                    pipelines={networkPipelines}
                    triggerSchemaId={schemaId}
                    schemaName={triggerSchema?.name}
                    onTriggerChange={(next) => {
                      markBuilderSource()
                      setTrigger(next)
                    }}
                    onCriteriaChange={(next) => {
                      markBuilderSource()
                      setCriteria(next)
                    }}
                    onActionsChange={(next) => {
                      markBuilderSource()
                      setActions(next)
                    }}
                  />
                </div>
              )}
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
              aria-busy={isLoading}
              className={isLoading ? "disabled:opacity-100" : undefined}
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" />
                  <span className="sr-only">Creating</span>
                </>
              ) : (
                "Create workflow"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SchemaSelect({
  formId,
  schemaId,
  schemas,
  isLoading,
  onChange,
}: {
  formId: string
  schemaId: string
  schemas: { id: string; name: string }[]
  isLoading: boolean
  onChange: (schemaId: string) => void
}) {
  const chooseSchemaValue = "__choose_schema__"
  return (
    <Field>
      <FieldLabel htmlFor={`${formId}-schema`}>Record type</FieldLabel>
      {schemas.length > 0 ? (
        <Select
          value={schemaId || chooseSchemaValue}
          disabled={isLoading}
          required
          modal={false}
          items={[
            { value: chooseSchemaValue, label: "Choose a record type" },
            ...schemas.map((schema) => ({
              value: schema.id,
              label: schema.name,
            })),
          ]}
          onValueChange={(value) => {
            if (!value || value === chooseSchemaValue) {
              onChange("")
              return
            }
            onChange(value)
          }}
        >
          <SelectTrigger id={`${formId}-schema`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={chooseSchemaValue}>
              Choose a record type
            </SelectItem>
            {schemas.map((schema) => (
              <SelectItem key={schema.id} value={schema.id}>
                {schema.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-sm text-muted-foreground">
          Create a record type in this network before adding a workflow.
        </p>
      )}
    </Field>
  )
}
