import {
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import { useNavigate } from "react-router"
import { Loader } from "lucide-react"

import { EnabledField } from "@/components/checkbox-field"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WorkflowRuleEditor } from "@/components/workflow-rule-editor"
import {
  emptyPipelineLevels,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
} from "@/lib/network-workspace"
import {
  criteriaToApi,
  emptyGroup,
  emptyTrigger,
  schemaFieldOptions,
  triggerToApi,
  workflowNodesToApi,
  type CriteriaGroupDraft,
  type TriggerDraft,
  type WorkflowDefinitionBody,
} from "@/lib/workflow-definition"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useCreateWorkflowDefinitionMutation } from "@/store/workflow-slice"

const entireNetworkValue = "__network__"

export function WorkflowDefinitionDialog({
  open,
  onOpenChange,
  networkId,
  organizationId,
  schemaId: lockedSchemaId,
  field,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  organizationId?: string
  schemaId?: string
  field?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const [createWorkflow, createState] = useCreateWorkflowDefinitionMutation()
  const isLoading = createState.isLoading
  const error = createState.error
  const lockNetwork = Boolean(networkId)
  const lockOrganization = Boolean(organizationId)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networks[0]?.id ?? ""
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId ?? ""
  )
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [schemaId, setSchemaId] = useState(lockedSchemaId ?? "")
  const [active, setActive] = useState(true)
  const [trigger, setTrigger] = useState<TriggerDraft>(presetTrigger(field))
  const [criteria, setCriteria] = useState<CriteriaGroupDraft>(emptyGroup())
  const [levels, setLevels] = useState<PipelineLevelDraft[]>(emptyPipelineLevels)

  const { organizations: networkOrganizations } = useWorkspaceOrganizations({
    skip: !open || !selectedNetworkId,
    networkId: selectedNetworkId,
  })
  const { schemas: networkSchemas } = useWorkspaceSchemas({
    skip: !open || !selectedNetworkId,
    networkId: selectedNetworkId,
    organizationId: selectedOrganizationId || undefined,
    networkScopeOnly: !selectedOrganizationId,
  })
  const firstNetworkId = networks[0]?.id ?? ""
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
    setDescription("")
    setSchemaId(lockedSchemaId ?? "")
    setSelectedOrganizationId(organizationId ?? "")
    setActive(true)
    setTrigger(presetTrigger(field))
    setCriteria(emptyGroup())
    setLevels(emptyPipelineLevels())
  }, [open, organizationId, lockedSchemaId, field])

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
    if (!open || lockedSchemaId) {
      return
    }
    setSchemaId((current) => {
      if (current && networkSchemas.some((schema) => schema.id === current)) {
        return current
      }
      return networkSchemas[0]?.id ?? ""
    })
  }, [lockedSchemaId, networkSchemas, open])

  const definition = useMemo<WorkflowDefinitionBody | undefined>(() => {
    const nodes = workflowNodesToApi(levels)
    if (!nodes?.length) {
      return undefined
    }
    return {
      trigger: triggerToApi(trigger),
      criteria: criteriaToApi(criteria, triggerFields) ?? {},
      nodes,
    }
  }, [criteria, levels, trigger, triggerFields])

  const showNetwork = networks.length > 0 && !lockNetwork
  const showOrganization = true

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(selectedNetworkId) &&
    Boolean(schemaId) &&
    Boolean(definition) &&
    (definition?.nodes.length ?? 0) > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !definition || definition.nodes.length === 0) {
      return
    }

    void submitDefinition(definition)
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
  }

  async function submitDefinition(body: WorkflowDefinitionBody) {
    try {
      const workflow = await createWorkflow({
        name: name.trim(),
        description: description.trim(),
        active,
        definition: body,
        schemaId,
        networkId: selectedNetworkId,
        organizationId: selectedOrganizationId || undefined,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: selectedOrganizationId || undefined,
          rest: `workflow-definitions/${workflow.id}`,
        })
      )
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size="full"
        className="inset-y-4 inset-x-3 sm:inset-x-6 sm:inset-y-4 lg:inset-x-10 xl:inset-x-12"
      >
        <>
            <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
              <div className="min-w-0 space-y-1">
                <DialogTitle>Create a workflow definition</DialogTitle>
                <DialogDescription className="text-xs">
                  Configure the rule on the left. The preview updates as you
                  edit.
                </DialogDescription>
              </div>
            </DialogHeader>
            <form
              id={formId}
              onSubmit={handleSubmit}
              autoComplete="off"
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-muted/40 px-4 py-3">
                <FieldGroup className="shrink-0 gap-2 rounded-xl bg-card p-3 shadow-xs ring-1 ring-foreground/10">
                  <div
                    className={cn(
                      "grid gap-2",
                      showNetwork
                        ? "sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
                        : "sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
                    )}
                  >
                    <Field className="gap-1">
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
                    <Field className="gap-1">
                      <FieldLabel htmlFor={`${formId}-description`}>
                        Description
                      </FieldLabel>
                      <Input
                        id={`${formId}-description`}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="What this workflow does"
                        disabled={isLoading}
                      />
                    </Field>
                    {showNetwork ? (
                      <Field className="gap-1">
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
                            if (!lockOrganization) {
                              setSelectedOrganizationId("")
                            }
                            setSchemaId("")
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
                    ) : null}
                    {showOrganization ? (
                      <Field className="gap-1">
                        <FieldLabel htmlFor={`${formId}-organization`}>
                          Organization
                        </FieldLabel>
                        <Select
                          value={selectedOrganizationId || entireNetworkValue}
                          disabled={lockOrganization || isLoading}
                          modal={false}
                          items={[
                            {
                              value: entireNetworkValue,
                              label: "Entire network",
                            },
                            ...networkOrganizations.map((organization) => ({
                              value: organization.id,
                              label: organization.name,
                            })),
                          ]}
                          onValueChange={(value) => {
                            if (!value || value === entireNetworkValue) {
                              setSelectedOrganizationId("")
                              return
                            }
                            setSelectedOrganizationId(value)
                          }}
                        >
                          <SelectTrigger id={`${formId}-organization`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={entireNetworkValue}>
                              Entire network
                            </SelectItem>
                            {networkOrganizations.map((organization) => (
                              <SelectItem
                                key={organization.id}
                                value={organization.id}
                              >
                                {organization.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : null}
                    <EnabledField
                      formId={formId}
                      checked={active}
                      onChange={setActive}
                    />
                  </div>
                  {error ? (
                    <FieldError>{getHumaErrorMessage(error)}</FieldError>
                  ) : null}
                </FieldGroup>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <WorkflowRuleEditor
                    compact
                    trigger={trigger}
                    criteria={criteria}
                    levels={levels}
                    fields={triggerFields}
                    schemaName={triggerSchema?.name}
                    networkId={selectedNetworkId}
                    organizationId={selectedOrganizationId || undefined}
                    schemaField={
                      lockedSchemaId ? (
                        <Field className="gap-1">
                          <FieldLabel>Assigned table</FieldLabel>
                          <p className="text-sm font-medium">
                            {triggerSchema?.name ?? "Selected table"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            This workflow definition belongs to this table.
                          </p>
                        </Field>
                      ) : (
                        <SchemaSelect
                          formId={formId}
                          schemaId={schemaId}
                          schemas={networkSchemas}
                          isLoading={isLoading}
                          onChange={setSchemaId}
                        />
                      )
                    }
                    onTriggerChange={setTrigger}
                    onCriteriaChange={setCriteria}
                    onLevelsChange={setLevels}
                  />
                </div>
              </div>
              <DialogFooter className="py-3 [[data-size=full]_&]:px-4">
                <DialogClose
                  render={<Button variant="outline" disabled={isLoading} />}
                >
                  Cancel
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isLoading || !canSubmit}
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
        </>
      </DialogContent>
    </Dialog>
  )
}

function presetTrigger(field?: string): TriggerDraft {
  const trigger = emptyTrigger()
  if (!field) {
    return trigger
  }
  return { ...trigger, kind: "updated", changed: [field] }
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
    <Field className="gap-1">
      <FieldLabel htmlFor={`${formId}-schema`}>Assigned table</FieldLabel>
      {schemas.length > 0 ? (
        <>
          <Select
            value={schemaId || chooseSchemaValue}
            disabled={isLoading}
            required
            modal={false}
            items={[
              { value: chooseSchemaValue, label: "Choose a table" },
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
              <SelectItem value={chooseSchemaValue}>Choose a table</SelectItem>
              {schemas.map((schema) => (
                <SelectItem key={schema.id} value={schema.id}>
                  {schema.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This workflow definition belongs to the selected table.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add a table on the records page before adding a workflow.
        </p>
      )}
    </Field>
  )
}
