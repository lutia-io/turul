import { useEffect, type ReactNode } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyPlusIcon,
  PlusIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"

import { type TemplateVariableGroup } from "@/components/template-value-input"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FriendlyValueInput } from "@/components/workflow-value-input"
import { WorkflowSectionHeading } from "@/components/workflow-rule"
import { propertyLabel } from "@/components/schema-records-table"
import type { PipelineDefinition, Schema } from "@/data/networks"
import {
  getJsonSchemaProperties,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import { arithmeticTemplateVariables } from "@/lib/template-arithmetic"
import { mockTemplateGroup } from "@/lib/template-mock"
import { cn } from "@/lib/utils"
import {
  actionTypeDescriptions,
  actionTypeLabels,
  addContextAndRecordTemplate,
  addContextFieldTemplate,
  addFieldTemplate,
  contextFieldTemplate,
  contextIDTemplate,
  emptyAction,
  emptyDataEntry,
  newDraftKey,
  nowTemplate,
  recordFieldTemplate,
  recordIDTemplate,
  workflowActionTypes,
  type ActionDraft,
  type DataEntryDraft,
  type WorkflowActionType,
} from "@/lib/workflow-definition"

const CHOOSE_SCHEMA = "__choose_schema__"
const CHOOSE_FIELD = "__choose_field__"
const CHOOSE_PIPELINE = "__choose_pipeline__"

function pipelineRef(pipeline: PipelineDefinition) {
  return pipeline.id
}

function findPipeline(pipelines: PipelineDefinition[], value: string) {
  return pipelines.find(
    (pipeline) => pipeline.id === value || pipeline.slug === value
  )
}

function writesRecord(type: WorkflowActionType) {
  return (
    type === "CREATE_RECORD" ||
    type === "UPDATE_RECORD" ||
    type === "UPSERT_RECORD"
  )
}

function dataForSchema(schema: Schema | undefined, current: DataEntryDraft[]) {
  const properties = schema ? getJsonSchemaProperties(schema.definition) : []
  const blank = current.every((entry) => !entry.name && !entry.value)
  if (blank && properties.length > 0) {
    return properties.map((property) => emptyDataEntry(property.name))
  }
  return current
}

function isNumericField(field: JsonSchemaProperty) {
  return field.type === "integer" || field.type === "number"
}

function namedSchema(name?: string) {
  const trimmed = name?.trim()
  return trimmed || undefined
}

function withMathHint(
  variables: { label: string; token: string; caretOffset?: number }[]
) {
  return variables.map((item) => ({ ...item, hint: "math" }))
}

function recordTemplateGroups(
  fields: JsonSchemaProperty[],
  schemaName?: string
): TemplateVariableGroup[] {
  const named = namedSchema(schemaName)
  const hint = named ?? "started this"
  const numeric = fields.filter(isNumericField)
  return [
    {
      label: named
        ? `The ${named} that started this`
        : "The record that started this",
      description: "Values from the record that triggered this workflow.",
      variables: [
        {
          label: named ? `${named} ID` : "Record ID",
          token: recordIDTemplate,
          hint,
        },
        ...fields.map((field) => ({
          label: propertyLabel(field.name),
          token: recordFieldTemplate(field.name),
          hint,
        })),
      ],
    },
    {
      label: named ? `Add to a number on that ${named}` : "Add to a number",
      description: "Starts with that number so you can add more to it.",
      variables: numeric.map((field) => {
        const token = addFieldTemplate(field.name)
        return {
          label: propertyLabel(field.name),
          token,
          caretOffset: token.length - "1 }}".length,
          hint,
        }
      }),
    },
    {
      label: "Other",
      variables: [
        { label: "Current time", token: nowTemplate, hint: "now" },
        ...withMathHint(arithmeticTemplateVariables),
      ],
    },
    mockTemplateGroup,
  ]
}

function contextTemplateGroups(
  fields: JsonSchemaProperty[],
  schemaName?: string
): TemplateVariableGroup[] {
  const named = namedSchema(schemaName)
  const hint = named ? `this ${named}` : "you're updating"
  const numeric = fields.filter(isNumericField)
  return [
    {
      label: named
        ? `This ${named} you're updating`
        : "The record you're updating",
      description: named
        ? `Current values already saved on this ${named}.`
        : "Current values already saved on the record this step is changing.",
      variables: [
        {
          label: named ? `${named} ID` : "Record ID",
          token: contextIDTemplate,
          hint,
        },
        ...fields.map((field) => ({
          label: propertyLabel(field.name),
          token: contextFieldTemplate(field.name),
          hint,
        })),
      ],
    },
    {
      label: named
        ? `Add to this ${named}`
        : "Add to the record you're updating",
      description: "Starts with the current value so you can add more to it.",
      variables: numeric.map((field) => {
        const token = addContextFieldTemplate(field.name)
        return {
          label: propertyLabel(field.name),
          token,
          caretOffset: token.length - "1 }}".length,
          hint,
        }
      }),
    },
  ]
}

function addFromTriggerGroups(
  entryName: string,
  targetFields: JsonSchemaProperty[],
  triggerFields: JsonSchemaProperty[],
  triggerSchemaName?: string,
  targetSchemaName?: string
): TemplateVariableGroup[] {
  const target = targetFields.find((field) => field.name === entryName)
  if (!target || !isNumericField(target)) {
    return []
  }
  const numericTrigger = triggerFields.filter(isNumericField)
  if (numericTrigger.length === 0) {
    return []
  }
  const named = namedSchema(triggerSchemaName)
  const targetNamed = namedSchema(targetSchemaName)
  return [
    {
      label: named
        ? `Add from the ${named} that started this`
        : "Add from the record that started this",
      description: targetNamed
        ? `Adds that number to this ${targetNamed} field.`
        : "Adds that number to this field.",
      variables: numericTrigger.map((field) => ({
        label: propertyLabel(field.name),
        token: addContextAndRecordTemplate(entryName, field.name),
        hint: named ?? "started this",
      })),
    },
  ]
}

function duplicateAction(action: ActionDraft): ActionDraft {
  return {
    ...action,
    key: newDraftKey("action"),
    data: action.data.map((entry) => ({
      ...entry,
      key: newDraftKey("data"),
    })),
  }
}

function IconTooltipButton({
  label,
  disabled,
  onClick,
  destructive,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  destructive?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "text-muted-foreground",
              destructive && "hover:bg-destructive/10 hover:text-destructive"
            )}
          />
        }
      >
        {children}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function DataEntriesEditor({
  entries,
  templateGroups,
  targetFields,
  triggerFields,
  includeContext,
  triggerSchemaName,
  targetSchemaName,
  onChange,
}: {
  entries: DataEntryDraft[]
  templateGroups: TemplateVariableGroup[]
  targetFields: JsonSchemaProperty[]
  triggerFields: JsonSchemaProperty[]
  includeContext: boolean
  triggerSchemaName?: string
  targetSchemaName?: string
  onChange: (entries: DataEntryDraft[]) => void
}) {
  const used = new Set(entries.map((entry) => entry.name).filter(Boolean))
  const unusedTargetFields = targetFields.filter(
    (field) => !used.has(field.name)
  )
  const filled = entries.filter((entry) => entry.name || entry.value)
  const visible = filled.length > 0 ? filled : entries.slice(0, 1)

  function update(key: string, patch: Partial<DataEntryDraft>) {
    onChange(
      entries.map((entry) =>
        entry.key === key ? { ...entry, ...patch } : entry
      )
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {visible.map((entry) => {
        const nameId = `${entry.key}-name`
        const valueId = `${entry.key}-value`
        const selectedField = targetFields.find(
          (field) => field.name === entry.name
        )
        return (
          <div
            key={entry.key}
            className="group/row grid items-start gap-2 rounded-lg border bg-muted/20 p-2.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto]"
          >
            <Field className="gap-1">
              <FieldLabel htmlFor={nameId}>Field</FieldLabel>
              {targetFields.length > 0 ? (
                <Select
                  value={entry.name || CHOOSE_FIELD}
                  modal={false}
                  items={[
                    { value: CHOOSE_FIELD, label: "Choose a field" },
                    ...targetFields.map((field) => ({
                      value: field.name,
                      label: propertyLabel(field.name),
                      disabled:
                        used.has(field.name) && field.name !== entry.name,
                    })),
                    ...(entry.name &&
                    !targetFields.some((field) => field.name === entry.name)
                      ? [{ value: entry.name, label: entry.name }]
                      : []),
                  ]}
                  onValueChange={(value) => {
                    if (!value || value === CHOOSE_FIELD) {
                      update(entry.key, { name: "" })
                      return
                    }
                    const nextField = targetFields.find(
                      (field) => field.name === value
                    )
                    const allowed = nextField?.enumValues
                    const nextValue =
                      allowed &&
                      allowed.length > 0 &&
                      entry.value &&
                      !allowed.includes(entry.value)
                        ? ""
                        : entry.value
                    update(entry.key, { name: value, value: nextValue })
                  }}
                >
                  <SelectTrigger id={nameId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CHOOSE_FIELD}>Choose a field</SelectItem>
                    {targetFields.map((field) => (
                      <SelectItem
                        key={field.name}
                        value={field.name}
                        disabled={
                          used.has(field.name) && field.name !== entry.name
                        }
                      >
                        {propertyLabel(field.name)}
                      </SelectItem>
                    ))}
                    {entry.name &&
                    !targetFields.some((field) => field.name === entry.name) ? (
                      <SelectItem value={entry.name}>{entry.name}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={nameId}
                  value={entry.name}
                  onChange={(event) =>
                    update(entry.key, { name: event.target.value })
                  }
                  placeholder="field"
                />
              )}
            </Field>
            <Field className="gap-1">
              <FieldLabel htmlFor={valueId}>Value</FieldLabel>
              <FriendlyValueInput
                id={valueId}
                value={entry.value}
                onChange={(next) => update(entry.key, { value: next })}
                triggerFields={triggerFields}
                targetField={selectedField}
                includeRecordId
                includeNow
                triggerSchemaName={triggerSchemaName}
                advancedGroups={[
                  ...templateGroups,
                  ...(includeContext
                    ? addFromTriggerGroups(
                        entry.name,
                        targetFields,
                        triggerFields,
                        triggerSchemaName,
                        targetSchemaName
                      )
                    : []),
                ]}
                placeholder={
                  selectedField?.enumValues?.length ? "Choose a value" : "Value"
                }
              />
            </Field>
            <div className="flex h-8 items-center opacity-100 sm:mt-6 sm:opacity-0 sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100">
              <IconTooltipButton
                label="Remove field"
                disabled={visible.length === 1 && !entry.name && !entry.value}
                destructive
                onClick={() => {
                  const next = entries.filter((item) => item.key !== entry.key)
                  onChange(next.length > 0 ? next : [emptyDataEntry()])
                }}
              >
                <Trash2Icon />
              </IconTooltipButton>
            </div>
          </div>
        )
      })}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...entries,
            emptyDataEntry(unusedTargetFields[0]?.name ?? ""),
          ])
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
      >
        <PlusIcon className="size-3.5" />
        Add field
      </button>
    </div>
  )
}

function ActionEditor({
  action,
  index,
  last,
  schemas,
  pipelines,
  triggerFields,
  triggerSchemaId,
  triggerSchemaName,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  action: ActionDraft
  index: number
  last: boolean
  schemas: Schema[]
  pipelines: PipelineDefinition[]
  triggerFields: JsonSchemaProperty[]
  triggerSchemaId?: string
  triggerSchemaName?: string
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (patch: Partial<ActionDraft>) => void
  onMove: (offset: number) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const needsSchema = writesRecord(action.type)
  const needsRecord =
    action.type === "UPDATE_RECORD" || action.type === "UPSERT_RECORD"
  const includeContext =
    action.type === "UPDATE_RECORD" ||
    (action.type === "UPSERT_RECORD" && action.recordId.trim() !== "")
  const targetSchema = schemas.find((schema) => schema.id === action.schemaId)
  const targetFields = targetSchema
    ? getJsonSchemaProperties(targetSchema.definition)
    : []
  const selectedPipeline = findPipeline(pipelines, action.pipeline)
  const pipelineValue = selectedPipeline
    ? pipelineRef(selectedPipeline)
    : action.pipeline || CHOOSE_PIPELINE

  useEffect(() => {
    if (selectedPipeline && action.pipeline !== selectedPipeline.id) {
      onChange({ pipeline: selectedPipeline.id })
    }
  }, [action.pipeline, onChange, selectedPipeline])
  const dataLabel = action.type === "TRIGGER_PIPELINE" ? "Input" : "Fields"
  const targetSchemaName = targetSchema?.name
  const triggerTemplateGroups = recordTemplateGroups(
    triggerFields,
    triggerSchemaName
  )
  const dataTemplateGroups = includeContext
    ? [
        ...triggerTemplateGroups,
        ...contextTemplateGroups(targetFields, targetSchemaName),
      ]
    : triggerTemplateGroups
  const typeId = `${action.key}-type`
  const schemaFieldId = `${action.key}-schema`
  const recordId = `${action.key}-record`
  const pipelineId = `${action.key}-pipeline`

  return (
    <li className="group/row relative flex gap-3.5">
      {last ? null : (
        <span className="absolute top-8 bottom-0 left-[15px] w-px bg-border" />
      )}
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-medium">
        {index + 1}
      </span>
      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        <div className="relative rounded-xl border bg-background p-4 shadow-xs">
          <div className="absolute top-2 right-2 flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100">
            <IconTooltipButton
              label="Move up"
              disabled={!canMoveUp}
              onClick={() => onMove(-1)}
            >
              <ChevronUpIcon />
            </IconTooltipButton>
            <IconTooltipButton
              label="Move down"
              disabled={!canMoveDown}
              onClick={() => onMove(1)}
            >
              <ChevronDownIcon />
            </IconTooltipButton>
            <IconTooltipButton label="Duplicate action" onClick={onDuplicate}>
              <CopyPlusIcon />
            </IconTooltipButton>
            <IconTooltipButton
              label="Remove action"
              destructive
              onClick={onRemove}
            >
              <Trash2Icon />
            </IconTooltipButton>
          </div>

          <Field className="gap-1 pr-24">
            <FieldLabel htmlFor={typeId}>What should happen</FieldLabel>
            <Select
              value={action.type}
              modal={false}
              items={workflowActionTypes.map((type) => ({
                value: type,
                label: actionTypeLabels[type],
              }))}
              onValueChange={(value) => {
                if (!value) {
                  return
                }
                const type = value as WorkflowActionType
                const schemaId =
                  writesRecord(type) && !action.schemaId && triggerSchemaId
                    ? triggerSchemaId
                    : action.schemaId
                const schema = schemas.find((item) => item.id === schemaId)
                onChange({
                  type,
                  schemaId,
                  recordId:
                    type === "UPDATE_RECORD" && !action.recordId.trim()
                      ? recordIDTemplate
                      : action.recordId,
                  data: writesRecord(type)
                    ? dataForSchema(schema, action.data)
                    : action.data,
                })
              }}
            >
              <SelectTrigger
                id={typeId}
                aria-label={`Action ${index + 1} type`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workflowActionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {actionTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription className="text-xs">
              {actionTypeDescriptions[action.type]}
            </FieldDescription>
          </Field>

          {needsSchema ? (
            <Field className="mt-3 gap-1">
              <FieldLabel htmlFor={schemaFieldId}>
                {action.type === "UPSERT_RECORD"
                  ? "Record type if a new record is created"
                  : action.type === "UPDATE_RECORD"
                    ? "Record type to update"
                    : "Record type to create"}
              </FieldLabel>
              {schemas.length > 0 ? (
                <Select
                  value={action.schemaId || CHOOSE_SCHEMA}
                  modal={false}
                  items={[
                    { value: CHOOSE_SCHEMA, label: "Choose a record type" },
                    ...schemas.map((schema) => ({
                      value: schema.id,
                      label: schema.name,
                    })),
                  ]}
                  onValueChange={(value) => {
                    const schemaId =
                      !value || value === CHOOSE_SCHEMA ? "" : value
                    const schema = schemas.find((item) => item.id === schemaId)
                    onChange({
                      schemaId,
                      data: dataForSchema(schema, action.data),
                    })
                  }}
                >
                  <SelectTrigger id={schemaFieldId}>
                    <SelectValue />
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
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create a record type before this action can write a record.
                </p>
              )}
            </Field>
          ) : null}
          {needsRecord ? (
            <Field className="mt-3 gap-1">
              <FieldLabel htmlFor={recordId}>
                {action.type === "UPSERT_RECORD"
                  ? "Update an existing record?"
                  : "Which record should be updated?"}
              </FieldLabel>
              {action.type === "UPSERT_RECORD" ? (
                <FieldDescription className="text-xs">
                  {targetSchemaName
                    ? `If you pick a record, we'll update it when it exists. Otherwise a new ${targetSchemaName} is created.`
                    : "If you pick a record, we'll update it when it exists. Otherwise a new one is created."}
                </FieldDescription>
              ) : null}
              <FriendlyValueInput
                id={recordId}
                value={action.recordId}
                onChange={(recordIdValue) =>
                  onChange({ recordId: recordIdValue })
                }
                triggerFields={triggerFields}
                includeRecordId
                includeNow={false}
                purpose="record"
                triggerSchemaName={triggerSchemaName}
                advancedGroups={triggerTemplateGroups}
                placeholder="Record ID"
              />
            </Field>
          ) : null}
          {action.type === "TRIGGER_PIPELINE" ? (
            <Field className="mt-3 gap-1">
              <FieldLabel htmlFor={pipelineId}>Pipeline</FieldLabel>
              {pipelines.length > 0 ? (
                <Select
                  value={pipelineValue}
                  modal={false}
                  items={[
                    { value: CHOOSE_PIPELINE, label: "Choose a pipeline" },
                    ...pipelines.map((pipeline) => ({
                      value: pipelineRef(pipeline),
                      label: pipeline.name,
                    })),
                    ...(action.pipeline && !selectedPipeline
                      ? [{ value: action.pipeline, label: action.pipeline }]
                      : []),
                  ]}
                  onValueChange={(value) => {
                    if (!value || value === CHOOSE_PIPELINE) {
                      onChange({ pipeline: "" })
                      return
                    }
                    onChange({ pipeline: value })
                  }}
                >
                  <SelectTrigger id={pipelineId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CHOOSE_PIPELINE}>
                      Choose a pipeline
                    </SelectItem>
                    {pipelines.map((pipeline) => (
                      <SelectItem
                        key={pipeline.id}
                        value={pipelineRef(pipeline)}
                      >
                        {pipeline.name}
                      </SelectItem>
                    ))}
                    {action.pipeline && !selectedPipeline ? (
                      <SelectItem value={action.pipeline}>
                        {action.pipeline}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Create a pipeline in this network before this action can run
                  one.
                </p>
              )}
            </Field>
          ) : null}
          {action.type === "TRIGGER_PIPELINE" ? (
            <div className="mt-3 flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium">{dataLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Values sent into the pipeline.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {action.data.map((entry) => (
                  <div
                    key={entry.key}
                    className="group/row grid items-start gap-2 rounded-lg border bg-muted/20 p-2.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto]"
                  >
                    <Field className="gap-1">
                      <FieldLabel>Field</FieldLabel>
                      <Input
                        value={entry.name}
                        onChange={(event) =>
                          onChange({
                            data: action.data.map((item) =>
                              item.key === entry.key
                                ? { ...item, name: event.target.value }
                                : item
                            ),
                          })
                        }
                        placeholder="field"
                      />
                    </Field>
                    <Field className="gap-1">
                      <FieldLabel>Value</FieldLabel>
                      <FriendlyValueInput
                        value={entry.value}
                        onChange={(next) =>
                          onChange({
                            data: action.data.map((item) =>
                              item.key === entry.key
                                ? { ...item, value: next }
                                : item
                            ),
                          })
                        }
                        triggerFields={triggerFields}
                        includeRecordId
                        includeNow
                        triggerSchemaName={triggerSchemaName}
                        advancedGroups={dataTemplateGroups}
                      />
                    </Field>
                    <div className="flex h-8 items-center sm:mt-6">
                      <IconTooltipButton
                        label="Remove field"
                        disabled={action.data.length === 1}
                        destructive
                        onClick={() =>
                          onChange({
                            data: action.data.filter(
                              (item) => item.key !== entry.key
                            ),
                          })
                        }
                      >
                        <Trash2Icon />
                      </IconTooltipButton>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onChange({ data: [...action.data, emptyDataEntry()] })
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
                >
                  <PlusIcon className="size-3.5" />
                  Add field
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium">{dataLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Set the fields on the record.
                </p>
              </div>
              <DataEntriesEditor
                entries={action.data}
                templateGroups={dataTemplateGroups}
                targetFields={targetFields}
                triggerFields={triggerFields}
                includeContext={includeContext}
                triggerSchemaName={triggerSchemaName}
                targetSchemaName={targetSchemaName}
                onChange={(data) => onChange({ data })}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export function WorkflowActionsBuilder({
  value,
  schemas,
  pipelines,
  triggerFields,
  triggerSchemaId,
  triggerSchemaName,
  onChange,
}: {
  value: ActionDraft[]
  schemas: Schema[]
  pipelines: PipelineDefinition[]
  triggerFields: JsonSchemaProperty[]
  triggerSchemaId?: string
  triggerSchemaName?: string
  onChange: (next: ActionDraft[]) => void
}) {
  function update(key: string, patch: Partial<ActionDraft>) {
    onChange(
      value.map((action) =>
        action.key === key ? { ...action, ...patch } : action
      )
    )
  }

  function move(index: number, offset: number) {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= value.length) {
      return
    }
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    onChange(next)
  }

  function makeAction(type: WorkflowActionType = "CREATE_RECORD") {
    const schema = schemas.find((item) => item.id === triggerSchemaId)
    return {
      ...emptyAction(type),
      schemaId: writesRecord(type) ? (triggerSchemaId ?? "") : "",
      recordId: type === "UPDATE_RECORD" ? recordIDTemplate : "",
      data: writesRecord(type)
        ? dataForSchema(schema, [emptyDataEntry()])
        : [emptyDataEntry()],
    }
  }

  function addAction(type?: WorkflowActionType) {
    onChange([...value, makeAction(type)])
  }

  return (
    <TooltipProvider delay={400}>
      <WorkflowSectionHeading
        icon={ZapIcon}
        title="Then"
        description="These steps run in order after the trigger and conditions match."
      />
      {value.length === 0 ? (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {workflowActionTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addAction(type)}
              className="rounded-xl border px-3 py-3 text-left transition-colors hover:bg-muted/40"
            >
              <p className="text-sm font-medium">{actionTypeLabels[type]}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {actionTypeDescriptions[type]}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <ol>
            {value.map((action, index) => (
              <ActionEditor
                key={action.key}
                action={action}
                index={index}
                last={index === value.length - 1}
                schemas={schemas}
                pipelines={pipelines}
                triggerFields={triggerFields}
                triggerSchemaId={triggerSchemaId}
                triggerSchemaName={triggerSchemaName}
                canMoveUp={index > 0}
                canMoveDown={index < value.length - 1}
                onChange={(patch) => update(action.key, patch)}
                onMove={(offset) => move(index, offset)}
                onDuplicate={() => {
                  const next = [...value]
                  next.splice(index + 1, 0, duplicateAction(action))
                  onChange(next)
                }}
                onRemove={() =>
                  onChange(value.filter((item) => item.key !== action.key))
                }
              />
            ))}
          </ol>
          <button
            type="button"
            onClick={() => addAction()}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
          >
            <PlusIcon className="size-3.5" />
            Add action
          </button>
        </div>
      )}
    </TooltipProvider>
  )
}
