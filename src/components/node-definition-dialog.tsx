import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
import {
  DefinitionDialogBody,
  DefinitionJsonPane,
  definitionDialogClassName,
} from "@/components/definition-dialog-layout"
import { MappingFields } from "@/components/mapping-fields"
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
import { stringifyDefinition, type JsonObject } from "@/lib/json-definition"
import {
  useWorkspaceNetworkList,
  useWorkspaceSchemas,
} from "@/lib/network-workspace"
import {
  defaultDefinition,
  emptyRecordFilter,
  fileDefinitionFromDraft,
  fileDraftFromDefinition,
  fileOperations,
  httpDefinitionFromDraft,
  httpDraftFromDefinition,
  httpMethods,
  isFileOperation,
  isHttpMethod,
  isNodeType,
  isRecordFilterOp,
  isRecordOperation,
  listItemTemplate,
  listMapperDefinitionFromDraft,
  listMapperDraftFromDefinition,
  mappingEntriesFromObject,
  mappingObjectFromEntries,
  nodeTypeLabels,
  nodeTypes,
  nowTemplate,
  pipelineInputFieldTemplate,
  pipelineInputTemplate,
  pipelineOutputTemplate,
  recordDefinitionFromDraft,
  recordDraftFromDefinition,
  recordFilterOpLabels,
  recordFilterOps,
  recordOperationLabels,
  recordOperations,
  type FileDefinitionDraft,
  type HttpDefinitionDraft,
  type ListMapperDefinitionDraft,
  type MappingEntry,
  type NodeType,
  type PipelineTemplateContext,
  type RecordDefinitionDraft,
} from "@/lib/node-definition"
import { slugifyId } from "@/lib/slug"
import { arithmeticTemplateVariables } from "@/lib/template-arithmetic"
import { getHumaErrorMessage } from "@/store/api"
import {
  useCreateNodeDefinitionMutation,
  useGetNodeDefinitionQuery,
  useUpdateNodeDefinitionMutation,
} from "@/store/node-slice"

const CHOOSE_SCHEMA = "__choose_schema__"

type NodeDrafts = {
  http: HttpDefinitionDraft
  message: string
  mapping: MappingEntry[]
  listMapper: ListMapperDefinitionDraft
  file: FileDefinitionDraft
  record: RecordDefinitionDraft
}

function draftsFromDefinition(
  type: NodeType,
  definition: JsonObject
): NodeDrafts {
  const http = httpDraftFromDefinition(definition)
  return {
    http,
    message: typeof definition.message === "string" ? definition.message : "ok",
    mapping: mappingEntriesFromObject(
      definition.mapping &&
        typeof definition.mapping === "object" &&
        !Array.isArray(definition.mapping)
        ? definition.mapping
        : undefined
    ),
    listMapper: listMapperDraftFromDefinition(definition),
    file: fileDraftFromDefinition(definition),
    record: recordDraftFromDefinition(definition),
  }
}

function definitionFromDrafts(
  type: NodeType,
  drafts: NodeDrafts
): { definition?: JsonObject; error?: string } {
  switch (type) {
    case "HTTP":
      return httpDefinitionFromDraft(drafts.http)
    case "NOOP":
      return { definition: { message: drafts.message } }
    case "MAPPER":
      return {
        definition: { mapping: mappingObjectFromEntries(drafts.mapping) },
      }
    case "LIST_MAPPER":
      return listMapperDefinitionFromDraft(drafts.listMapper)
    case "FILE":
      return { definition: fileDefinitionFromDraft(drafts.file) }
    case "RECORD":
      return { definition: recordDefinitionFromDraft(drafts.record) }
  }
}

function pipelineTemplateGroups(
  context?: PipelineTemplateContext
): TemplateVariableGroup[] {
  const namedField = pipelineInputFieldTemplate()
  const common: TemplateVariableGroup = {
    label: "Common values",
    variables: [
      { label: "Entire input", token: pipelineInputTemplate, hint: "input" },
      { label: "Current time", token: nowTemplate, hint: "now" },
      ...arithmeticTemplateVariables.map((item) => ({
        ...item,
        hint: "math",
      })),
    ],
  }
  const named: TemplateVariableGroup = {
    label: "Named input fields",
    variables: [
      {
        label: "Field path",
        token: namedField,
        caretOffset: namedField.lastIndexOf(".") + 1,
        hint: "input",
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
      hint: "previous",
    })),
  }

  if (context?.levelIndex === 0) {
    return [common, named]
  }
  if (context && context.levelIndex > 0) {
    return [common, named, previous]
  }
  return [common, named, previous]
}

function itemFieldToken(alias: string) {
  const name = alias.trim() || "item"
  const token = `{{ .${name}. }}`
  return { token, caretOffset: token.lastIndexOf(".") + 1 }
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
  const { schemas } = useWorkspaceSchemas()
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
  const [drafts, setDrafts] = useState<NodeDrafts>(() =>
    draftsFromDefinition("HTTP", defaultDefinition("HTTP"))
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
    setDrafts(draftsFromDefinition(nextType, nextDefinition))
  }, [
    existingQuery.currentData,
    firstNetworkId,
    networkId,
    nodeDefinitionId,
    open,
  ])

  const composed = definitionFromDrafts(type, drafts)
  const preview = stringifyDefinition(
    composed.definition ?? defaultDefinition(type)
  )
  const jsonError = composed.error ?? null

  function applyType(next: NodeType) {
    setType(next)
    setDrafts(draftsFromDefinition(next, defaultDefinition(next)))
  }

  const templateGroups = useMemo(
    () => pipelineTemplateGroups(pipelineTemplateContext),
    [pipelineTemplateContext]
  )
  const listMapperGroups = useMemo(() => {
    const item = itemFieldToken(drafts.listMapper.as)
    return [
      ...templateGroups,
      {
        label: `Each ${drafts.listMapper.as.trim() || "item"}`,
        variables: [
          {
            label: `Current ${drafts.listMapper.as.trim() || "item"}`,
            token: listItemTemplate(drafts.listMapper.as),
            hint: "item",
          },
          {
            label: "Item field",
            token: item.token,
            caretOffset: item.caretOffset,
            hint: "item",
          },
        ],
      } satisfies TemplateVariableGroup,
    ]
  }, [drafts.listMapper.as, templateGroups])
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
  const schemaItems = useMemo(
    () => [
      { value: CHOOSE_SCHEMA, label: "Choose a record type" },
      ...schemas.map((schema) => ({ value: schema.id, label: schema.name })),
    ],
    [schemas]
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

  const recordNeedsSchema =
    drafts.record.operation === "LIST" ||
    drafts.record.operation === "CREATE" ||
    drafts.record.operation === "UPSERT"
  const recordNeedsId =
    drafts.record.operation === "GET" ||
    drafts.record.operation === "UPDATE" ||
    drafts.record.operation === "UPSERT"
  const recordNeedsData =
    drafts.record.operation === "CREATE" ||
    drafts.record.operation === "UPDATE" ||
    drafts.record.operation === "UPSERT"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className={definitionDialogClassName}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>{editing ? "Edit node" : "Create a node"}</DialogTitle>
          <DialogDescription>
            {pipelineTemplateContext
              ? pipelineTemplateContext.levelIndex === 0
                ? "This step runs first with the pipeline input. Insert {{ }} next to any text in a field."
                : `This step runs in level ${pipelineTemplateContext.levelIndex} and can read the previous level and the original pipeline input. Insert {{ }} next to any text in a field.`
              : "Pipeline steps. Templates use {{ .Input }} for this run's data."}
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
                        value={drafts.http.method}
                        disabled={isLoading}
                        modal={false}
                        items={methodItems}
                        onValueChange={(value) => {
                          if (isHttpMethod(value)) {
                            setDrafts((current) => ({
                              ...current,
                              http: { ...current.http, method: value },
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
                        value={drafts.http.url}
                        onChange={(url) =>
                          setDrafts((current) => ({
                            ...current,
                            http: { ...current.http, url },
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
                      value={drafts.http.headersText}
                      onChange={(headersText) =>
                        setDrafts((current) => ({
                          ...current,
                          http: { ...current.http, headersText },
                        }))
                      }
                      groups={templateGroups}
                      disabled={isLoading}
                    />
                    <FieldDescription>
                      JSON object. Templates use {"{{ .Input.orgId }}"} on the
                      first level and {"{{ .Input.1.body.name }}"} on later
                      levels. Enqueue fields stay available as{" "}
                      {"{{ .Input.salePrice }}"}.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-body`}>Body</FieldLabel>
                    <TemplateValueInput
                      id={`${formId}-body`}
                      multiline
                      inputClassName="min-h-28"
                      value={drafts.http.bodyText}
                      onChange={(bodyText) =>
                        setDrafts((current) => ({
                          ...current,
                          http: { ...current.http, bodyText },
                        }))
                      }
                      groups={templateGroups}
                      placeholder="Leave empty for GET"
                      disabled={isLoading}
                    />
                  </Field>
                </>
              ) : null}
              {type === "NOOP" ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-message`}>Message</FieldLabel>
                  <TemplateValueInput
                    id={`${formId}-message`}
                    value={drafts.message}
                    onChange={(message) =>
                      setDrafts((current) => ({ ...current, message }))
                    }
                    groups={templateGroups}
                    placeholder="ok"
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    Returned as {'{ "message": "..." }'}. Insert pipeline input
                    with {"{{ }}"}.
                  </FieldDescription>
                </Field>
              ) : null}
              {type === "MAPPER" ? (
                <Field>
                  <FieldLabel>Mapped fields</FieldLabel>
                  <MappingFields
                    entries={drafts.mapping}
                    onChange={(mapping) =>
                      setDrafts((current) => ({ ...current, mapping }))
                    }
                    groups={templateGroups}
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    Builds one object. Values can use {"{{ .Input }}"} and
                    arithmetic such as {"{{ mul .Input.salePrice 2 }}"}.
                  </FieldDescription>
                </Field>
              ) : null}
              {type === "LIST_MAPPER" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`${formId}-from`}>From</FieldLabel>
                      <TemplateValueInput
                        id={`${formId}-from`}
                        value={drafts.listMapper.from}
                        onChange={(from) =>
                          setDrafts((current) => ({
                            ...current,
                            listMapper: { ...current.listMapper, from },
                          }))
                        }
                        groups={templateGroups}
                        placeholder="{{ .Input.0.records }}"
                        required
                        disabled={isLoading}
                      />
                      <FieldDescription>
                        A list, usually {"{{ .Input.0.records }}"} from a record
                        list step.
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${formId}-as`}>
                        Item name
                      </FieldLabel>
                      <Input
                        id={`${formId}-as`}
                        value={drafts.listMapper.as}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            listMapper: {
                              ...current.listMapper,
                              as: event.target.value,
                            },
                          }))
                        }
                        placeholder="item"
                        disabled={isLoading}
                      />
                      <FieldDescription>
                        Templates read each element as{" "}
                        {"{{ ." +
                          (drafts.listMapper.as.trim() || "item") +
                          " }}"}
                        .
                      </FieldDescription>
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Mapped fields</FieldLabel>
                    <MappingFields
                      entries={drafts.listMapper.mapping}
                      onChange={(mapping) =>
                        setDrafts((current) => ({
                          ...current,
                          listMapper: { ...current.listMapper, mapping },
                        }))
                      }
                      groups={listMapperGroups}
                      disabled={isLoading}
                      valuePlaceholder={`{{ .${drafts.listMapper.as.trim() || "item"}.id }}`}
                    />
                    <FieldDescription>
                      Output is {'{ "items": [ ... ] }'}.
                    </FieldDescription>
                  </Field>
                </>
              ) : null}
              {type === "FILE" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-file-op`}>
                      Operation
                    </FieldLabel>
                    <Select
                      value={drafts.file.operation}
                      disabled={isLoading}
                      modal={false}
                      items={fileOperations.map((item) => ({
                        value: item,
                        label: item,
                      }))}
                      onValueChange={(value) => {
                        if (isFileOperation(value)) {
                          setDrafts((current) => ({
                            ...current,
                            file: { ...current.file, operation: value },
                          }))
                        }
                      }}
                    >
                      <SelectTrigger id={`${formId}-file-op`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fileOperations.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {drafts.file.operation === "READ" ? (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-file-id`}>
                        File ID
                      </FieldLabel>
                      <TemplateValueInput
                        id={`${formId}-file-id`}
                        value={drafts.file.fileId}
                        onChange={(fileId) =>
                          setDrafts((current) => ({
                            ...current,
                            file: { ...current.file, fileId },
                          }))
                        }
                        groups={templateGroups}
                        placeholder="{{ .Input.2.fileId }}"
                        required
                        disabled={isLoading}
                      />
                    </Field>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor={`${formId}-filename`}>
                            Filename
                          </FieldLabel>
                          <TemplateValueInput
                            id={`${formId}-filename`}
                            value={drafts.file.filename}
                            onChange={(filename) =>
                              setDrafts((current) => ({
                                ...current,
                                file: { ...current.file, filename },
                              }))
                            }
                            groups={templateGroups}
                            placeholder="notice-{{ .Input.propertyId }}.txt"
                            required
                            disabled={isLoading}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`${formId}-content-type`}>
                            MIME type
                          </FieldLabel>
                          <TemplateValueInput
                            id={`${formId}-content-type`}
                            value={drafts.file.contentType}
                            onChange={(contentType) =>
                              setDrafts((current) => ({
                                ...current,
                                file: { ...current.file, contentType },
                              }))
                            }
                            groups={templateGroups}
                            placeholder="text/plain"
                            disabled={isLoading}
                          />
                        </Field>
                      </div>
                      <Field>
                        <FieldLabel htmlFor={`${formId}-content`}>
                          Content
                        </FieldLabel>
                        <TemplateValueInput
                          id={`${formId}-content`}
                          multiline
                          inputClassName="min-h-40"
                          value={drafts.file.content}
                          onChange={(content) =>
                            setDrafts((current) => ({
                              ...current,
                              file: { ...current.file, content },
                            }))
                          }
                          groups={templateGroups}
                          placeholder="Distribution notice…"
                          disabled={isLoading}
                        />
                        <FieldDescription>
                          Stored as a file. The next step reads{" "}
                          {"{{ .Input.0.fileId }}"} from this node's output.
                        </FieldDescription>
                      </Field>
                    </>
                  )}
                </>
              ) : null}
              {type === "RECORD" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-record-op`}>
                      Operation
                    </FieldLabel>
                    <Select
                      value={drafts.record.operation}
                      disabled={isLoading}
                      modal={false}
                      items={recordOperations.map((item) => ({
                        value: item,
                        label: recordOperationLabels[item],
                      }))}
                      onValueChange={(value) => {
                        if (isRecordOperation(value)) {
                          setDrafts((current) => ({
                            ...current,
                            record: { ...current.record, operation: value },
                          }))
                        }
                      }}
                    >
                      <SelectTrigger id={`${formId}-record-op`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {recordOperations.map((item) => (
                          <SelectItem key={item} value={item}>
                            {recordOperationLabels[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {recordNeedsSchema ? (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-schema`}>
                        Record type
                      </FieldLabel>
                      {schemas.length > 0 ? (
                        <Select
                          value={
                            schemas.some(
                              (schema) => schema.id === drafts.record.schemaId
                            )
                              ? drafts.record.schemaId
                              : CHOOSE_SCHEMA
                          }
                          disabled={isLoading}
                          modal={false}
                          items={schemaItems}
                          onValueChange={(value) => {
                            if (!value || value === CHOOSE_SCHEMA) {
                              return
                            }
                            setDrafts((current) => ({
                              ...current,
                              record: {
                                ...current.record,
                                schemaId: value,
                              },
                            }))
                          }}
                        >
                          <SelectTrigger id={`${formId}-schema`}>
                            <SelectValue placeholder="Insert a record type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={CHOOSE_SCHEMA}>
                              Choose a record type
                            </SelectItem>
                            {schemas.map((schema) => (
                              <SelectItem key={schema.id} value={schema.id}>
                                {schema.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <TemplateValueInput
                        id={`${formId}-schema-id`}
                        value={drafts.record.schemaId}
                        onChange={(schemaId) =>
                          setDrafts((current) => ({
                            ...current,
                            record: { ...current.record, schemaId },
                          }))
                        }
                        groups={templateGroups}
                        placeholder="{{ .Input.investorSchemaId }}"
                        disabled={isLoading}
                      />
                      <FieldDescription>
                        Pick a record type or use {"{{ .Input.schemaId }}"}.
                      </FieldDescription>
                    </Field>
                  ) : null}
                  {recordNeedsId ? (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-record-id`}>
                        Record ID
                      </FieldLabel>
                      <TemplateValueInput
                        id={`${formId}-record-id`}
                        value={drafts.record.recordId}
                        onChange={(recordId) =>
                          setDrafts((current) => ({
                            ...current,
                            record: { ...current.record, recordId },
                          }))
                        }
                        groups={templateGroups}
                        placeholder="{{ .Input.recordId }}"
                        disabled={isLoading}
                      />
                    </Field>
                  ) : null}
                  {drafts.record.operation === "LIST" ? (
                    <Field>
                      <FieldLabel>Filters</FieldLabel>
                      <div className="flex flex-col gap-2">
                        {drafts.record.filters.map((filter) => (
                          <div
                            key={filter.key}
                            className="grid items-start gap-2 rounded-lg border bg-muted/20 p-2.5 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto]"
                          >
                            <Field className="gap-1">
                              <FieldLabel>Field</FieldLabel>
                              <TemplateValueInput
                                value={filter.field}
                                onChange={(field) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    record: {
                                      ...current.record,
                                      filters: current.record.filters.map(
                                        (item) =>
                                          item.key === filter.key
                                            ? { ...item, field }
                                            : item
                                      ),
                                    },
                                  }))
                                }
                                groups={templateGroups}
                                placeholder="fundId"
                                disabled={isLoading}
                              />
                            </Field>
                            <Field className="gap-1">
                              <FieldLabel>Op</FieldLabel>
                              <Select
                                value={filter.op}
                                disabled={isLoading}
                                modal={false}
                                items={recordFilterOps.map((op) => ({
                                  value: op,
                                  label: recordFilterOpLabels[op],
                                }))}
                                onValueChange={(value) => {
                                  if (!isRecordFilterOp(value)) {
                                    return
                                  }
                                  setDrafts((current) => ({
                                    ...current,
                                    record: {
                                      ...current.record,
                                      filters: current.record.filters.map(
                                        (item) =>
                                          item.key === filter.key
                                            ? { ...item, op: value }
                                            : item
                                      ),
                                    },
                                  }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {recordFilterOps.map((op) => (
                                    <SelectItem key={op} value={op}>
                                      {recordFilterOpLabels[op]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field className="gap-1">
                              <FieldLabel>Value</FieldLabel>
                              <TemplateValueInput
                                value={filter.value}
                                onChange={(value) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    record: {
                                      ...current.record,
                                      filters: current.record.filters.map(
                                        (item) =>
                                          item.key === filter.key
                                            ? { ...item, value }
                                            : item
                                      ),
                                    },
                                  }))
                                }
                                groups={templateGroups}
                                placeholder="{{ .Input.fundId }}"
                                disabled={isLoading || filter.op === "empty"}
                              />
                            </Field>
                            <div className="flex h-8 items-center sm:mt-6">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={
                                  isLoading ||
                                  drafts.record.filters.length === 1
                                }
                                onClick={() =>
                                  setDrafts((current) => ({
                                    ...current,
                                    record: {
                                      ...current.record,
                                      filters: current.record.filters.filter(
                                        (item) => item.key !== filter.key
                                      ),
                                    },
                                  }))
                                }
                                aria-label="Remove filter"
                              >
                                <Trash2Icon />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            setDrafts((current) => ({
                              ...current,
                              record: {
                                ...current.record,
                                filters: [
                                  ...current.record.filters,
                                  emptyRecordFilter(),
                                ],
                              },
                            }))
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
                        >
                          <PlusIcon className="size-3.5" />
                          Add filter
                        </button>
                      </div>
                    </Field>
                  ) : null}
                  {recordNeedsData ? (
                    <Field>
                      <FieldLabel>Record data</FieldLabel>
                      <MappingFields
                        entries={drafts.record.data}
                        onChange={(data) =>
                          setDrafts((current) => ({
                            ...current,
                            record: { ...current.record, data },
                          }))
                        }
                        groups={templateGroups}
                        disabled={isLoading}
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}
              <Field>
                <CheckboxField
                  id={`${formId}-active`}
                  checked={active}
                  onChange={setActive}
                  label="Enabled"
                />
                <FieldDescription>
                  Enabled nodes can be used in new pipeline runs.
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
