import {
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { MappingFields } from "@/components/mapping-fields"
import { pipelineNodeVisuals } from "@/components/pipeline-flow/pipeline-flow-nodes"
import { NodeTypePicker } from "@/components/node-type-picker"
import {
  TemplateValueInput,
  type TemplateVariableGroup,
} from "@/components/template-value-input"
import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import type { JsonObject } from "@/lib/json-definition"
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
  nodeTypeDescriptions,
  nodeTypeLabels,
  pipelineInputFieldTemplate,
  pipelineInputTemplate,
  pipelineOutputFieldTemplate,
  pipelineOutputTemplate,
  recordDefinitionFromDraft,
  recordDraftFromDefinition,
  recordFilterOpLabels,
  recordFilterOps,
  recordOperationLabels,
  recordOperations,
  triggerWorkflowDefinitionFromDraft,
  triggerWorkflowDraftFromDefinition,
  type BulkDefinitionDraft,
  type FileDefinitionDraft,
  type HttpDefinitionDraft,
  type ListMapperDefinitionDraft,
  type MappingEntry,
  type NodeType,
  type PipelineTemplateContext,
  type RecordDefinitionDraft,
  type TriggerWorkflowDefinitionDraft,
} from "@/lib/node-definition"
import { useListWorkflowDefinitionsQuery } from "@/store/workflow-slice"
import { utilityTemplateGroups } from "@/lib/template-mock"
import type { PipelineNodeConfig } from "@/lib/pipeline-definition"

const CHOOSE_SCHEMA = "__choose_schema__"
const CHOOSE_WORKFLOW = "__choose_workflow__"

type NodeDrafts = {
  http: HttpDefinitionDraft
  message: string
  mapping: MappingEntry[]
  listMapper: ListMapperDefinitionDraft
  file: FileDefinitionDraft
  record: RecordDefinitionDraft
  bulk: BulkDefinitionDraft
  triggerWorkflow: TriggerWorkflowDefinitionDraft
}

function draftsFromDefinition(
  _type: NodeType,
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
    triggerWorkflow: triggerWorkflowDraftFromDefinition(definition),
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
    case "TRIGGER_WORKFLOW":
      return triggerWorkflowDefinitionFromDraft(drafts.triggerWorkflow)
  }
}

function pipelineTemplateGroups(
  context?: PipelineTemplateContext
): TemplateVariableGroup[] {
  const namedField = pipelineInputFieldTemplate()
  const input: TemplateVariableGroup = {
    label: "Pipeline input",
    submenu: true,
    variables: [
      { label: "Entire input", token: pipelineInputTemplate },
      {
        label: "Field",
        token: namedField,
        caretOffset: namedField.lastIndexOf(".") + 1,
      },
    ],
  }
  const previousNodes =
    context && context.levelIndex > 0 ? context.previousOutputs : []
  const previous: TemplateVariableGroup | undefined =
    previousNodes.length > 0
      ? {
          label: "Previous level",
          submenu: true,
          variables: [],
          groups: previousNodes.map((output) => {
            const field = pipelineOutputFieldTemplate(output.index)
            const name = output.label.trim()
            const ranked =
              name && name !== `Output ${output.index}`
                ? `${output.index} · ${name}`
                : String(output.index)
            return {
              label: ranked,
              submenu: true,
              variables: [
                {
                  label: "Entire output",
                  token: pipelineOutputTemplate(output.index),
                },
                ...output.fields.map((item) => ({
                  label: item.label,
                  token: pipelineOutputFieldTemplate(output.index, item.path),
                })),
                {
                  label: "Field",
                  token: field,
                  caretOffset: field.lastIndexOf(".") + 1,
                },
              ],
            }
          }),
        }
      : undefined

  const triggerRecord: TemplateVariableGroup = {
    label: "Trigger record",
    submenu: true,
    variables: [
      { label: "Record ID", token: "{{ .Record.id }}" },
      {
        label: "Record field",
        token: "{{ .Record.data. }}",
        caretOffset: "{{ .Record.data. }}".lastIndexOf(".") + 1,
      },
    ],
  }

  return [
    input,
    triggerRecord,
    ...(previous ? [previous] : []),
    ...utilityTemplateGroups(),
  ]
}

function itemFieldToken(alias: string) {
  const name = alias.trim() || "item"
  const token = `{{ .${name}. }}`
  return { token, caretOffset: token.lastIndexOf(".") + 1 }
}

export type NodeDefinitionEditorHandle = {
  commit: () => PipelineNodeConfig | null
}

function stepDescription(context?: PipelineTemplateContext) {
  if (!context) {
    return "Pipeline steps. Templates use {{ .Input }} for this run's data."
  }
  if (context.levelIndex === 0) {
    return "This step runs first with the pipeline input. Insert {{ }} next to any text in a field."
  }
  return `This step runs in level ${context.levelIndex} and can read the previous level and the original pipeline input. Insert {{ }} next to any text in a field.`
}

export function NodeDefinitionEditor({
  ref,
  node,
  initialType,
  onDone,
  onCancel,
  pipelineTemplateContext,
  networkId,
  organizationId,
}: {
  ref?: Ref<NodeDefinitionEditorHandle>
  node?: PipelineNodeConfig
  initialType?: NodeType
  onDone: (node: PipelineNodeConfig) => void
  onCancel: () => void
  pipelineTemplateContext?: PipelineTemplateContext
  networkId?: string
  organizationId?: string
}) {
  const formId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const { schemas: availableSchemas } = useWorkspaceSchemas({
    networkId,
    organizationId: organizationId || undefined,
    networkScopeOnly: !organizationId,
    skip: !networkId,
  })
  const workflowDefinitionsQuery = useListWorkflowDefinitionsQuery(
    {
      networkId: networkId || "",
      organizationId: organizationId || undefined,
      pageSize: 100,
    },
    { skip: !networkId }
  )
  const workflowDefinitionItems = useMemo(() => {
    const items = workflowDefinitionsQuery.data?.items ?? []
    return items.map((item) => {
      const slug = item.slug?.trim() ?? ""
      return {
        id: item.id,
        value: slug || item.id,
        label: item.name?.trim()
          ? `${item.name}${slug ? ` (${slug})` : ""}`
          : slug || item.id,
      }
    })
  }, [workflowDefinitionsQuery.data?.items])
  const selectedTriggerWorkflow = useMemo(() => {
    const current = drafts.triggerWorkflow.workflow.trim()
    if (!current) {
      return CHOOSE_WORKFLOW
    }
    const match = workflowDefinitionItems.find(
      (item) => item.value === current || item.id === current
    )
    return match?.value ?? CHOOSE_WORKFLOW
  }, [drafts.triggerWorkflow.workflow, workflowDefinitionItems])
  const editing = Boolean(node)
  const startingType: NodeType | null =
    node && isNodeType(node.type) ? node.type : (initialType ?? null)
  const [type, setType] = useState<NodeType | null>(startingType)
  const [pickingType, setPickingType] = useState(!startingType)
  const [drafts, setDrafts] = useState<NodeDrafts>(() =>
    draftsFromDefinition(
      startingType ?? "HTTP",
      node?.definition ??
        (startingType ? defaultDefinition(startingType) : {})
    )
  )
  const isLoading = false

  const composed = type
    ? definitionFromDrafts(type, drafts)
    : { definition: undefined, error: undefined }
  const jsonError = composed.error ?? null

  const commit = useCallback((): PipelineNodeConfig | null => {
    if (!type || !composed.definition) {
      return null
    }
    return {
      type,
      definition: composed.definition,
    }
  }, [composed.definition, type])

  useImperativeHandle(ref, () => ({ commit }), [commit])

  function applyType(next: NodeType) {
    if (next === type) {
      setPickingType(false)
      return
    }
    const nextDrafts = draftsFromDefinition(next, defaultDefinition(next))
    setType(next)
    setPickingType(false)
    setDrafts(nextDrafts)
  }

  const templateGroups = useMemo(
    () => pipelineTemplateGroups(pipelineTemplateContext),
    [pipelineTemplateContext]
  )
  const listMapperGroups = useMemo(() => {
    const alias = drafts.listMapper.as.trim() || "item"
    const item = itemFieldToken(alias)
    return [
      ...templateGroups,
      {
        label: `Each loop item (${alias})`,
        submenu: true,
        variables: [
          {
            label: "Whole item",
            token: listItemTemplate(alias),
          },
          {
            label: "Field",
            token: item.token,
            caretOffset: item.caretOffset,
          },
        ],
      } satisfies TemplateVariableGroup,
    ]
  }, [drafts.listMapper.as, templateGroups])
  const methodItems = useMemo(
    () => httpMethods.map((item) => ({ value: item, label: item })),
    []
  )
  const schemaItems = useMemo(
    () => [
      { value: CHOOSE_SCHEMA, label: "Choose a record type" },
      ...availableSchemas.map((schema) => ({
        value: schema.id,
        label: schema.name,
      })),
    ],
    [availableSchemas]
  )

  function handleDone() {
    const invalid = rootRef.current?.querySelector(":invalid")
    if (
      invalid instanceof HTMLInputElement ||
      invalid instanceof HTMLTextAreaElement ||
      invalid instanceof HTMLSelectElement
    ) {
      invalid.reportValidity()
      return
    }
    const next = commit()
    if (!next) {
      return
    }
    onDone(next)
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
  const showTypePicker = pickingType || !type
  const selectedVisual = type ? pipelineNodeVisuals[type] : null
  const SelectedIcon = selectedVisual?.icon

  return (
    <div
      ref={rootRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10"
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          event.target instanceof HTMLInputElement &&
          event.target.type !== "search"
        ) {
          event.preventDefault()
        }
      }}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-6 py-4">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-medium">
            {showTypePicker
              ? "Choose a node"
              : editing
                ? "Edit node"
                : "Add a node"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {showTypePicker
              ? "Search and pick what this step should do."
              : stepDescription(pipelineTemplateContext)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => {
              if (showTypePicker && type) {
                setPickingType(false)
                return
              }
              onCancel()
            }}
          >
            Back
          </Button>
          {!showTypePicker ? (
            <Button
              type="button"
              size="sm"
              disabled={isLoading || !type || Boolean(jsonError)}
              onClick={handleDone}
            >
              Done
            </Button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {showTypePicker ? (
          <NodeTypePicker
            selectedType={type}
            onSelect={applyType}
            onCancel={type ? () => setPickingType(false) : undefined}
          />
        ) : (
          <FieldGroup className="gap-4">
            {type && selectedVisual && SelectedIcon ? (
              <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-muted/20 p-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md",
                    selectedVisual.wrap
                  )}
                >
                  <SelectedIcon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {nodeTypeLabels[type]}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nodeTypeDescriptions[type]}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => {
                    setPickingType(true)
                  }}
                >
                  Change
                </Button>
              </div>
            ) : null}
          {type === "HTTP" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${formId}-method`}>Method</FieldLabel>
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
                <FieldLabel htmlFor={`${formId}-headers`}>Headers</FieldLabel>
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
                  JSON object. Templates use {"{{ .Input.orgId }}"} on the first
                  level and {"{{ .Input.1.body.name }}"} on later levels.
                  Enqueue fields stay available as {"{{ .Input.salePrice }}"}.
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
                Returned as {'{ "message": "..." }'}. Insert pipeline input with{" "}
                {"{{ }}"}.
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
                Builds one object. Use this to reshape data or pass earlier
                level fields forward (only the previous level is visible by
                default). Values can use {"{{ .Input }}"}, {"{{ .Record }}"}, and
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
                    placeholder="{{ .Input.0.items }}"
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription>
                    A list, usually {"{{ .Input.0.items }}"} from a record list
                    or map-list step.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${formId}-as`}>Item name</FieldLabel>
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
                    {"{{ ." + (drafts.listMapper.as.trim() || "item") + " }}"}.
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
                <FieldLabel htmlFor={`${formId}-file-op`}>Operation</FieldLabel>
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
                  <FieldLabel htmlFor={`${formId}-file-id`}>File ID</FieldLabel>
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
                  {availableSchemas.length > 0 ? (
                    <Select
                      value={
                        availableSchemas.some(
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
                        {availableSchemas.map((schema) => (
                          <SelectItem key={schema.id} value={schema.id}>
                            {schema.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
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
                                  filters: current.record.filters.map((item) =>
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
                                  filters: current.record.filters.map((item) =>
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
                                  filters: current.record.filters.map((item) =>
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
                              isLoading || drafts.record.filters.length === 1
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
          {type === "TRIGGER_WORKFLOW" ? (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-trigger-workflow`}>
                  Workflow
                </FieldLabel>
                <Select
                  value={selectedTriggerWorkflow}
                  disabled={isLoading || workflowDefinitionsQuery.isLoading}
                  modal={false}
                  items={[
                    { value: CHOOSE_WORKFLOW, label: "Choose a workflow" },
                    ...workflowDefinitionItems.map((item) => ({
                      value: item.value,
                      label: item.label,
                    })),
                  ]}
                  onValueChange={(value) => {
                    if (!value || value === CHOOSE_WORKFLOW) {
                      return
                    }
                    setDrafts((current) => ({
                      ...current,
                      triggerWorkflow: {
                        ...current.triggerWorkflow,
                        workflow: value,
                      },
                    }))
                  }}
                >
                  <SelectTrigger id={`${formId}-trigger-workflow`}>
                    <SelectValue placeholder="Choose a workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CHOOSE_WORKFLOW}>
                      Choose a workflow
                    </SelectItem>
                    {workflowDefinitionItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {workflowDefinitionItems.length === 0 &&
                  !workflowDefinitionsQuery.isLoading
                    ? "No workflow definitions available in this workspace yet."
                    : 'Output is { "id": "...", "input": { ... } }.'}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Input</FieldLabel>
                <MappingFields
                  entries={drafts.triggerWorkflow.input}
                  onChange={(input) =>
                    setDrafts((current) => ({
                      ...current,
                      triggerWorkflow: {
                        ...current.triggerWorkflow,
                        input,
                      },
                    }))
                  }
                  groups={templateGroups}
                  disabled={isLoading}
                />
                <FieldDescription>
                  Mapped fields become the child workflow&apos;s{" "}
                  {"{{ .Input }}"}. Trigger data is also available as{" "}
                  {"{{ .Record }}"} here.
                </FieldDescription>
              </Field>
            </>
          ) : null}
          {type === "BULK" ? (
            <>
              <Field>
                <FieldLabel htmlFor={`${formId}-bulk-op`}>Operation</FieldLabel>
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
                        label: `Each loop item (${alias})`,
                        submenu: true,
                        variables: [
                          {
                            label: "Whole item",
                            token: listItemTemplate(alias),
                          },
                          {
                            label: "Field",
                            token: item.token,
                            caretOffset: item.caretOffset,
                          },
                        ],
                      },
                      ...(drafts.bulk.operation === "UPSERT"
                        ? [
                            {
                              label: "Existing record",
                              submenu: true,
                              variables: [
                                {
                                  label: "Record ID",
                                  token: "{{ .Context.id }}",
                                  hint: "context",
                                },
                                {
                                  label: "Record field",
                                  token: "{{ .Context.data. }}",
                                  caretOffset:
                                    "{{ .Context.data. }}".lastIndexOf(".") + 1,
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
                          <FieldLabel
                            htmlFor={`${formId}-bulk-schema-${record.key}`}
                          >
                            Record type
                          </FieldLabel>
                          {availableSchemas.length > 0 ? (
                            <Select
                              value={
                                availableSchemas.some(
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
                                    records: current.bulk.records.map((item) =>
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
                                {availableSchemas.map((schema) => (
                                  <SelectItem key={schema.id} value={schema.id}>
                                    {schema.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field>
                            <FieldLabel
                              htmlFor={`${formId}-bulk-from-${record.key}`}
                            >
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
                                    records: current.bulk.records.map((item) =>
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
                            <FieldLabel
                              htmlFor={`${formId}-bulk-as-${record.key}`}
                            >
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
                                    records: current.bulk.records.map((item) =>
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
                                    records: current.bulk.records.map((item) =>
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
        )}
      </div>
    </div>
  )
}
