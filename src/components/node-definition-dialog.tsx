import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

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
import { useWorkspaceSchemas } from "@/lib/network-workspace"
import {
  bulkDefinitionFromDraft,
  bulkDraftFromDefinition,
  bulkOperationLabels,
  bulkOperations,
  defaultDefinition,
  emptyBulkRecord,
  emptyRecordFilter,
  fileDefinitionFromDraft,
  fileDraftFromDefinition,
  fileOperations,
  httpDefinitionFromDraft,
  httpDraftFromDefinition,
  httpMethods,
  isFileOperation,
  isHttpMethod,
  isBulkOperation,
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
  type BulkDefinitionDraft,
  type FileDefinitionDraft,
  type HttpDefinitionDraft,
  type ListMapperDefinitionDraft,
  type MappingEntry,
  type NodeType,
  type PipelineTemplateContext,
  type RecordDefinitionDraft,
} from "@/lib/node-definition"
import { arithmeticTemplateVariables } from "@/lib/template-arithmetic"
import type { PipelineNodeConfig } from "@/lib/pipeline-definition"

const CHOOSE_SCHEMA = "__choose_schema__"

type NodeDrafts = {
  http: HttpDefinitionDraft
  message: string
  mapping: MappingEntry[]
  listMapper: ListMapperDefinitionDraft
  file: FileDefinitionDraft
  record: RecordDefinitionDraft
  bulk: BulkDefinitionDraft
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
    bulk: bulkDraftFromDefinition(definition),
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
    case "BULK":
      return bulkDefinitionFromDraft(drafts.bulk)
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
  node,
  onSave,
  pipelineTemplateContext,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  node?: PipelineNodeConfig
  onSave: (node: PipelineNodeConfig) => void
  pipelineTemplateContext?: PipelineTemplateContext
}) {
  const formId = useId()
  const { schemas } = useWorkspaceSchemas()
  const editing = Boolean(node)
  const [name, setName] = useState("")
  const [type, setType] = useState<NodeType>("HTTP")
  const [drafts, setDrafts] = useState<NodeDrafts>(() =>
    draftsFromDefinition("HTTP", defaultDefinition("HTTP"))
  )
  const isLoading = false

  useEffect(() => {
    if (!open) {
      return
    }
    const nextType = node && isNodeType(node.type) ? node.type : "HTTP"
    const nextDefinition = node?.definition ?? defaultDefinition(nextType)
    setName(node?.name ?? "")
    setType(nextType)
    setDrafts(draftsFromDefinition(nextType, nextDefinition))
  }, [node, open])

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !composed.definition) {
      return
    }
    onSave({
      name: name.trim(),
      type,
      definition: composed.definition,
    })
    onOpenChange(false)
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
          <DialogTitle>{editing ? "Edit node" : "Add a node"}</DialogTitle>
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
                description="Stored on this pipeline and snapshotted when a run starts."
                value={preview}
                readOnly
                error={jsonError}
              />
            }
          >
            <FieldGroup className="gap-4">
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
              {type === "BULK" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-bulk-op`}>
                      Operation
                    </FieldLabel>
                    <Select
                      value={drafts.bulk.operation}
                      disabled={isLoading}
                      modal={false}
                      items={bulkOperations.map((item) => ({
                        value: item,
                        label: bulkOperationLabels[item],
                      }))}
                      onValueChange={(value) => {
                        if (!isBulkOperation(value)) {
                          return
                        }
                        setDrafts((current) => ({
                          ...current,
                          bulk: {
                            ...current.bulk,
                            operation: value,
                            records: current.bulk.records.map((record) => {
                              if (value !== "UPSERT" || record.recordId.trim()) {
                                return record
                              }
                              const alias = record.as.trim() || "item"
                              return {
                                ...record,
                                recordId: `{{ .${alias}.id }}`,
                              }
                            }),
                          },
                        }))
                      }}
                    >
                      <SelectTrigger id={`${formId}-bulk-op`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {bulkOperations.map((item) => (
                          <SelectItem key={item} value={item}>
                            {bulkOperationLabels[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {drafts.bulk.operation === "UPSERT"
                        ? "Update a record when the ID matches, otherwise create it."
                        : "Insert every item in each list as a new record."}
                    </FieldDescription>
                  </Field>
                <Field>
                  <FieldLabel>Record types</FieldLabel>
                  <FieldDescription>
                    Output is {'{ "created": [ ... ], "total": n }'}.
                  </FieldDescription>
                  <div className="mt-2 flex flex-col gap-3">
                    {drafts.bulk.records.map((record, index) => {
                      const alias = record.as.trim() || "item"
                      const item = itemFieldToken(alias)
                      const groups: TemplateVariableGroup[] = [
                        ...templateGroups,
                        {
                          label: `Each ${alias}`,
                          variables: [
                            {
                              label: `Current ${alias}`,
                              token: listItemTemplate(alias),
                              hint: "item",
                            },
                            {
                              label: "Item field",
                              token: item.token,
                              caretOffset: item.caretOffset,
                              hint: "item",
                            },
                          ],
                        },
                        ...(drafts.bulk.operation === "UPSERT"
                          ? [
                              {
                                label: "Existing record",
                                variables: [
                                  {
                                    label: "Record ID",
                                    token: "{{ .Context.id }}",
                                    hint: "context",
                                  },
                                  {
                                    label: "Record field",
                                    token: "{{ .Context.data. }}",
                                    caretOffset: "{{ .Context.data. }}".lastIndexOf(".") + 1,
                                    hint: "context",
                                  },
                                ],
                              } satisfies TemplateVariableGroup,
                            ]
                          : []),
                      ]
                      return (
                        <div
                          key={record.key}
                          className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">
                              Record type {index + 1}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={
                                isLoading || drafts.bulk.records.length === 1
                              }
                              onClick={() =>
                                setDrafts((current) => ({
                                  ...current,
                                  bulk: {
                                    ...current.bulk,
                                    records: current.bulk.records.filter(
                                      (item) => item.key !== record.key
                                    ),
                                  },
                                }))
                              }
                              aria-label={`Remove record type ${index + 1}`}
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                          <Field>
                            <FieldLabel htmlFor={`${formId}-bulk-schema-${record.key}`}>
                              Record type
                            </FieldLabel>
                            {schemas.length > 0 ? (
                              <Select
                                value={
                                  schemas.some(
                                    (schema) => schema.id === record.schemaId
                                  )
                                    ? record.schemaId
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
                                    bulk: {
                                      ...current.bulk,
                                      records: current.bulk.records.map(
                                        (item) =>
                                          item.key === record.key
                                            ? { ...item, schemaId: value }
                                            : item
                                      ),
                                    },
                                  }))
                                }}
                              >
                                <SelectTrigger
                                  id={`${formId}-bulk-schema-${record.key}`}
                                >
                                  <SelectValue placeholder="Choose a record type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={CHOOSE_SCHEMA}>
                                    Choose a record type
                                  </SelectItem>
                                  {schemas.map((schema) => (
                                    <SelectItem
                                      key={schema.id}
                                      value={schema.id}
                                    >
                                      {schema.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}
                            <TemplateValueInput
                              id={`${formId}-bulk-schema-id-${record.key}`}
                              value={record.schemaId}
                              onChange={(schemaId) =>
                                setDrafts((current) => ({
                                  ...current,
                                  bulk: {
                                    ...current.bulk,
                                    records: current.bulk.records.map((item) =>
                                      item.key === record.key
                                        ? { ...item, schemaId }
                                        : item
                                    ),
                                  },
                                }))
                              }
                              groups={templateGroups}
                              placeholder="{{ .Input.investorSchemaId }}"
                              disabled={isLoading}
                            />
                          </Field>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor={`${formId}-bulk-from-${record.key}`}>
                                From
                              </FieldLabel>
                              <TemplateValueInput
                                id={`${formId}-bulk-from-${record.key}`}
                                value={record.from}
                                onChange={(from) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    bulk: {
                                      ...current.bulk,
                                      records: current.bulk.records.map(
                                        (item) =>
                                          item.key === record.key
                                            ? { ...item, from }
                                            : item
                                      ),
                                    },
                                  }))
                                }
                                groups={templateGroups}
                                placeholder="{{ .Input.0.items }}"
                                required
                                disabled={isLoading}
                              />
                              <FieldDescription>
                                A list of items to insert as this record type.
                              </FieldDescription>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor={`${formId}-bulk-as-${record.key}`}>
                                Item name
                              </FieldLabel>
                              <Input
                                id={`${formId}-bulk-as-${record.key}`}
                                value={record.as}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    bulk: {
                                      ...current.bulk,
                                      records: current.bulk.records.map(
                                        (item) =>
                                          item.key === record.key
                                            ? {
                                                ...item,
                                                as: event.target.value,
                                              }
                                            : item
                                      ),
                                    },
                                  }))
                                }
                                placeholder="item"
                                disabled={isLoading}
                              />
                              <FieldDescription>
                                Templates read each element as{" "}
                                {"{{ ." + alias + " }}"}.
                              </FieldDescription>
                            </Field>
                          </div>
                          {drafts.bulk.operation === "UPSERT" ? (
                            <Field>
                              <FieldLabel
                                htmlFor={`${formId}-bulk-record-id-${record.key}`}
                              >
                                Record ID
                              </FieldLabel>
                              <TemplateValueInput
                                id={`${formId}-bulk-record-id-${record.key}`}
                                value={record.recordId}
                                onChange={(recordId) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    bulk: {
                                      ...current.bulk,
                                      records: current.bulk.records.map(
                                        (item) =>
                                          item.key === record.key
                                            ? { ...item, recordId }
                                            : item
                                      ),
                                    },
                                  }))
                                }
                                groups={groups}
                                placeholder={`{{ .${alias}.id }}`}
                                disabled={isLoading}
                              />
                              <FieldDescription>
                                If this ID exists, that record is updated.
                                Otherwise a new record is created.
                              </FieldDescription>
                            </Field>
                          ) : null}
                          <Field>
                            <FieldLabel>Record data</FieldLabel>
                            <MappingFields
                              entries={record.data}
                              onChange={(data) =>
                                setDrafts((current) => ({
                                  ...current,
                                  bulk: {
                                    ...current.bulk,
                                    records: current.bulk.records.map((item) =>
                                      item.key === record.key
                                        ? { ...item, data }
                                        : item
                                    ),
                                  },
                                }))
                              }
                              groups={groups}
                              disabled={isLoading}
                              valuePlaceholder={`{{ .${alias}. }}`}
                            />
                          </Field>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() =>
                        setDrafts((current) => {
                          const next = emptyBulkRecord()
                          if (current.bulk.operation === "UPSERT") {
                            next.recordId = `{{ .${next.as}.id }}`
                          }
                          return {
                            ...current,
                            bulk: {
                              ...current.bulk,
                              records: [...current.bulk.records, next],
                            },
                          }
                        })
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
                    >
                      <PlusIcon className="size-3.5" />
                      Add record type
                    </button>
                  </div>
                </Field>
                </>
              ) : null}
              {jsonError ? <FieldError>{jsonError}</FieldError> : null}
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
              disabled={Boolean(jsonError) || !name.trim()}
            >
              {editing ? "Save node" : "Add node"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
