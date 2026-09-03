import { useEffect, useId, useMemo, useState, type FormEvent } from "react"

import { CheckboxField } from "@/components/checkbox-field"
import {
  DefinitionDialogBody,
  DefinitionJsonPane,
  definitionDialogClassName,
} from "@/components/definition-dialog-layout"
import {
  TemplateValueInput,
  type TemplateVariableGroup,
} from "@/components/template-value-input"
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
import {
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
} from "@/lib/json-definition"
import { useWorkspaceNetworkList } from "@/lib/network-workspace"
import {
  defaultDefinition,
  executableNodeTypes,
  httpDefinitionFromDraft,
  httpDraftFromDefinition,
  httpMethods,
  isHttpMethod,
  isNodeType,
  nodeTypeLabels,
  nodeTypes,
  nowTemplate,
  pipelineInputFieldTemplate,
  pipelineInputTemplate,
  pipelineOutputTemplate,
  type HttpDefinitionDraft,
  type NodeType,
  type PipelineTemplateContext,
} from "@/lib/node-definition"
import { slugifyId } from "@/lib/slug"
import { getHumaErrorMessage } from "@/store/api"
import {
  useCreateNodeDefinitionMutation,
  useGetNodeDefinitionQuery,
  useUpdateNodeDefinitionMutation,
} from "@/store/node-slice"

function definitionFromFields(
  type: NodeType,
  http: HttpDefinitionDraft,
  message: string,
  jsonText: string
): { definition?: JsonObject; error?: string } {
  if (type === "HTTP") {
    return httpDefinitionFromDraft(http)
  }
  if (type === "NOOP") {
    return { definition: { message } }
  }
  const parsed = parseJsonObject(jsonText)
  if (!parsed) {
    return { error: "Definition must be a JSON object" }
  }
  return { definition: parsed }
}

function pipelineTemplateGroups(
  context?: PipelineTemplateContext
): TemplateVariableGroup[] {
  const namedField = pipelineInputFieldTemplate()
  const common: TemplateVariableGroup = {
    variables: [
      { label: "Entire input", token: pipelineInputTemplate },
      { label: "Current time", token: nowTemplate },
    ],
  }
  const named: TemplateVariableGroup = {
    label: "Named input fields",
    variables: [
      {
        label: "Field path",
        token: namedField,
        caretOffset: namedField.lastIndexOf(".") + 1,
      },
    ],
  }
  const previousOutputs =
    context && context.previousOutputs.length > 0
      ? context.previousOutputs
      : [0, 1, 2].map((index) => ({ index, label: `Output ${index}` }))
  const previous: TemplateVariableGroup = {
    label: "Previous level",
    variables: previousOutputs.map((output) => ({
      label: output.label,
      token: pipelineOutputTemplate(output.index),
    })),
  }

  if (context?.levelIndex === 0) {
    return [common, named]
  }
  if (context && context.levelIndex > 0) {
    return [common, previous]
  }
  return [common, named, previous]
}

export function NodeDefinitionDialog({
  open,
  onOpenChange,
  networkId,
  nodeDefinitionId,
  onCreated,
  pipelineTemplateContext,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  nodeDefinitionId?: string
  onCreated?: (nodeId: string) => void
  pipelineTemplateContext?: PipelineTemplateContext
}) {
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const [createNode, createState] = useCreateNodeDefinitionMutation()
  const [updateNode, updateState] = useUpdateNodeDefinitionMutation()
  const isLoading = createState.isLoading || updateState.isLoading
  const error = createState.error ?? updateState.error
  const existingQuery = useGetNodeDefinitionQuery(nodeDefinitionId ?? "", {
    skip: !open || !nodeDefinitionId,
  })
  const editing = Boolean(nodeDefinitionId)
  const firstNetworkId = networks[0]?.id ?? ""
  const [selectedNetworkId, setSelectedNetworkId] = useState(networkId ?? "")
  const [name, setName] = useState("")
  const [active, setActive] = useState(true)
  const [type, setType] = useState<NodeType>("HTTP")
  const [message, setMessage] = useState("ok")
  const [http, setHttp] = useState<HttpDefinitionDraft>(() =>
    httpDraftFromDefinition(defaultDefinition("HTTP"))
  )
  const [jsonText, setJsonText] = useState(
    stringifyDefinition(defaultDefinition("HTTP"))
  )

  useEffect(() => {
    if (!open) {
      return
    }
    const current = nodeDefinitionId ? existingQuery.currentData : undefined
    const nextType = current && isNodeType(current.type) ? current.type : "HTTP"
    const nextDefinition = current?.definition ?? defaultDefinition(nextType)
    setSelectedNetworkId(networkId ?? current?.networkId ?? firstNetworkId)
    setName(current?.name ?? "")
    setActive(current?.active ?? true)
    setType(nextType)
    setMessage(
      typeof nextDefinition.message === "string" ? nextDefinition.message : "ok"
    )
    setHttp(httpDraftFromDefinition(nextDefinition))
    setJsonText(stringifyDefinition(nextDefinition))
  }, [
    existingQuery.currentData,
    firstNetworkId,
    networkId,
    nodeDefinitionId,
    open,
  ])

  const composed = definitionFromFields(type, http, message, jsonText)
  const preview = stringifyDefinition(
    composed.definition ?? defaultDefinition(type)
  )
  const jsonError = composed.error ?? null

  function applyType(next: NodeType) {
    const nextDefinition = defaultDefinition(next)
    setType(next)
    setMessage(
      typeof nextDefinition.message === "string" ? nextDefinition.message : "ok"
    )
    setHttp(httpDraftFromDefinition(nextDefinition))
    setJsonText(stringifyDefinition(nextDefinition))
  }

  const templateGroups = useMemo(
    () => pipelineTemplateGroups(pipelineTemplateContext),
    [pipelineTemplateContext]
  )
  const typeItems = useMemo(
    () =>
      nodeTypes.map((item) => ({
        value: item,
        label: nodeTypeLabels[item],
      })),
    []
  )
  const networkItems = useMemo(
    () => networks.map((item) => ({ value: item.id, label: item.name })),
    [networks]
  )
  const methodItems = useMemo(
    () => httpMethods.map((item) => ({ value: item, label: item })),
    []
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !selectedNetworkId || !composed.definition) {
      return
    }
    try {
      if (editing && nodeDefinitionId) {
        await updateNode({
          id: nodeDefinitionId,
          name: name.trim(),
          active,
          type,
          definition: composed.definition,
        }).unwrap()
        onOpenChange(false)
        return
      }
      const created = await createNode({
        name: name.trim(),
        active,
        type,
        definition: composed.definition,
        networkId: selectedNetworkId,
      }).unwrap()
      onCreated?.(created.id)
      onOpenChange(false)
    } catch {
      // RTK Query error is shown below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className={definitionDialogClassName}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>{editing ? "Edit node" : "Create a node"}</DialogTitle>
          <DialogDescription>
            {pipelineTemplateContext
              ? pipelineTemplateContext.levelIndex === 0
                ? "This step runs first with the pipeline input. Insert {{ }} next to any text in a field."
                : `This step runs in level ${pipelineTemplateContext.levelIndex} and can read the previous level. Insert {{ }} next to any text in a field.`
              : "Pipeline steps. HTTP and no-op nodes run today; mapper and file types can be stored but are not executed yet."}
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
                title="JSON definition"
                description="Stored on the node and snapshotted when a pipeline run starts."
                value={preview}
                readOnly
                error={jsonError}
              />
            }
          >
            <FieldGroup className="gap-4">
              {!editing ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                  <Select
                    value={selectedNetworkId}
                    disabled={Boolean(networkId) || isLoading}
                    required
                    modal={false}
                    items={networkItems}
                    onValueChange={(value) => {
                      if (value) {
                        setSelectedNetworkId(value)
                      }
                    }}
                  >
                    <SelectTrigger id={`${formId}-network`}>
                      <SelectValue placeholder="Select a network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input
                    id={`${formId}-name`}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Fetch users"
                    autoFocus
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    Slug {slugifyId(name) || "is generated from the name"}.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${formId}-type`}>Type</FieldLabel>
                  <Select
                    value={type}
                    disabled={isLoading}
                    modal={false}
                    items={typeItems}
                    onValueChange={(value) => {
                      if (isNodeType(value)) {
                        applyType(value)
                      }
                    }}
                  >
                    <SelectTrigger id={`${formId}-type`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {nodeTypes.map((item) => (
                        <SelectItem key={item} value={item}>
                          {nodeTypeLabels[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {type === "HTTP" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`${formId}-method`}>
                        Method
                      </FieldLabel>
                      <Select
                        value={http.method}
                        disabled={isLoading}
                        modal={false}
                        items={methodItems}
                        onValueChange={(value) => {
                          if (isHttpMethod(value)) {
                            setHttp((current) => ({
                              ...current,
                              method: value,
                            }))
                          }
                        }}
                      >
                        <SelectTrigger id={`${formId}-method`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {httpMethods.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${formId}-url`}>URL</FieldLabel>
                      <TemplateValueInput
                        id={`${formId}-url`}
                        value={http.url}
                        onChange={(url) =>
                          setHttp((current) => ({
                            ...current,
                            url,
                          }))
                        }
                        groups={templateGroups}
                        placeholder="https://api.example.com/orgs/{{ .Input.orgId }}"
                        required
                        disabled={isLoading}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-headers`}>
                      Headers
                    </FieldLabel>
                    <TemplateValueInput
                      id={`${formId}-headers`}
                      multiline
                      inputClassName="min-h-24"
                      value={http.headersText}
                      onChange={(headersText) =>
                        setHttp((current) => ({
                          ...current,
                          headersText,
                        }))
                      }
                      groups={templateGroups}
                      disabled={isLoading}
                    />
                    <FieldDescription>
                      JSON object. Templates use {"{{ .Input.orgId }}"} on the
                      first level and {"{{ .Input.1.body.name }}"} on later
                      levels.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-body`}>Body</FieldLabel>
                    <TemplateValueInput
                      id={`${formId}-body`}
                      multiline
                      inputClassName="min-h-28"
                      value={http.bodyText}
                      onChange={(bodyText) =>
                        setHttp((current) => ({
                          ...current,
                          bodyText,
                        }))
                      }
                      groups={templateGroups}
                      placeholder="Leave empty for GET"
                      disabled={isLoading}
                    />
                  </Field>
                </>
              ) : type === "NOOP" ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-message`}>Message</FieldLabel>
                  <TemplateValueInput
                    id={`${formId}-message`}
                    value={message}
                    onChange={setMessage}
                    groups={templateGroups}
                    placeholder="ok"
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    Returned as {'{ "message": "..." }'}. Insert pipeline input
                    with {"{{ }}"}.
                  </FieldDescription>
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor={`${formId}-json`}>
                    Definition JSON
                  </FieldLabel>
                  <TemplateValueInput
                    id={`${formId}-json`}
                    multiline
                    inputClassName="min-h-40"
                    value={jsonText}
                    onChange={setJsonText}
                    groups={templateGroups}
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    {nodeTypeLabels[type]} nodes can be stored but are not
                    executed yet.
                  </FieldDescription>
                </Field>
              )}
              <Field>
                <CheckboxField
                  id={`${formId}-active`}
                  checked={active}
                  onChange={setActive}
                  label="Published"
                />
                <FieldDescription>
                  {executableNodeTypes.has(type)
                    ? "Published nodes can be used in new pipeline runs."
                    : "This type is stored for later; the executor reports it as not implemented."}
                </FieldDescription>
              </Field>
              {jsonError ? <FieldError>{jsonError}</FieldError> : null}
              {error ? (
                <FieldError>
                  {getHumaErrorMessage(error, "Failed to save node definition")}
                </FieldError>
              ) : null}
            </FieldGroup>
          </DefinitionDialogBody>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={isLoading} />}
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={
                isLoading ||
                Boolean(jsonError) ||
                !name.trim() ||
                !selectedNetworkId
              }
            >
              {isLoading
                ? editing
                  ? "Saving..."
                  : "Creating..."
                : editing
                  ? "Save node"
                  : "Create node"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
