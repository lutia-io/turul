import { type ReactNode } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleHelpIcon,
  CopyPlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import {
  TemplateValueInput,
  type TemplateVariableGroup,
} from "@/components/template-value-input"
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
import type { PipelineDefinition, Schema } from "@/data/networks"
import {
  getJsonSchemaProperties,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import { cn } from "@/lib/utils"
import {
  actionTypeDescriptions,
  actionTypeLabels,
  addFieldTemplate,
  addTemplate,
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
  return pipeline.slug || pipeline.id
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

function recordTemplateGroups(fields: JsonSchemaProperty[]) {
  const numeric = fields.filter(isNumericField)
  return [
    {
      variables: [
        { label: "Record ID", token: recordIDTemplate },
        { label: "Current time", token: nowTemplate },
        {
          label: "Add numbers",
          token: addTemplate,
          caretOffset: addTemplate.indexOf("1"),
        },
      ],
    },
    {
      label: "Record fields",
      variables: fields.map((field) => ({
        label: field.name,
        token: recordFieldTemplate(field.name),
      })),
    },
    {
      label: "Add to a number",
      variables: numeric.map((field) => {
        const token = addFieldTemplate(field.name)
        return {
          label: field.name,
          token,
          caretOffset: token.length - "1 }}".length,
        }
      }),
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
  onChange,
}: {
  entries: DataEntryDraft[]
  templateGroups: TemplateVariableGroup[]
  targetFields: JsonSchemaProperty[]
  onChange: (entries: DataEntryDraft[]) => void
}) {
  const used = new Set(entries.map((entry) => entry.name).filter(Boolean))
  const unusedTargetFields = targetFields.filter(
    (field) => !used.has(field.name)
  )

  function update(key: string, patch: Partial<DataEntryDraft>) {
    onChange(
      entries.map((entry) =>
        entry.key === key ? { ...entry, ...patch } : entry
      )
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const nameId = `${entry.key}-name`
        const valueId = `${entry.key}-value`
        const selectedField = targetFields.find(
          (field) => field.name === entry.name
        )
        const enumOptions = (selectedField?.enumValues ?? []).map((value) => ({
          value,
          label: value,
        }))
        return (
          <div key={entry.key} className="rounded-lg border bg-muted/20 p-2.5">
            <div className="grid items-start gap-2 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto]">
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
                        label: field.name,
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
                      <SelectItem value={CHOOSE_FIELD}>
                        Choose a field
                      </SelectItem>
                      {targetFields.map((field) => (
                        <SelectItem
                          key={field.name}
                          value={field.name}
                          disabled={
                            used.has(field.name) && field.name !== entry.name
                          }
                        >
                          {field.name}
                        </SelectItem>
                      ))}
                      {entry.name &&
                      !targetFields.some(
                        (field) => field.name === entry.name
                      ) ? (
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
                    className="font-mono"
                  />
                )}
              </Field>
              <Field className="gap-1">
                <FieldLabel htmlFor={valueId}>Value</FieldLabel>
                <TemplateValueInput
                  id={valueId}
                  value={entry.value}
                  onChange={(next) => update(entry.key, { value: next })}
                  groups={templateGroups}
                  options={enumOptions}
                  placeholder={
                    enumOptions.length > 0
                      ? "Choose a value"
                      : "Hello {{ .Record.data.name }}"
                  }
                />
              </Field>
              <div className="flex h-8 items-center sm:mt-6">
                <IconTooltipButton
                  label="Remove field"
                  disabled={entries.length === 1}
                  destructive
                  onClick={() =>
                    onChange(entries.filter((item) => item.key !== entry.key))
                  }
                >
                  <Trash2Icon />
                </IconTooltipButton>
              </div>
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
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
      >
        <PlusIcon className="size-3.5" />
        Add field
      </button>
    </div>
  )
}

function ActionCard({
  action,
  index,
  total,
  schemas,
  pipelines,
  triggerFields,
  triggerSchemaId,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  action: ActionDraft
  index: number
  total: number
  schemas: Schema[]
  pipelines: PipelineDefinition[]
  triggerFields: JsonSchemaProperty[]
  triggerSchemaId?: string
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
  const targetSchema = schemas.find((schema) => schema.id === action.schemaId)
  const targetFields = targetSchema
    ? getJsonSchemaProperties(targetSchema.definition)
    : []
  const selectedPipeline = findPipeline(pipelines, action.pipeline)
  const pipelineValue = selectedPipeline
    ? pipelineRef(selectedPipeline)
    : action.pipeline || CHOOSE_PIPELINE
  const dataLabel =
    action.type === "TRIGGER_PIPELINE" ? "Pipeline input" : "Record fields"
  const templateGroups = recordTemplateGroups(triggerFields)
  const typeId = `${action.key}-type`
  const schemaFieldId = `${action.key}-schema`
  const recordId = `${action.key}-record`
  const pipelineId = `${action.key}-pipeline`

  return (
    <div className="rounded-xl border bg-background p-3 shadow-xs">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Action {index + 1}
            <span className="font-normal text-muted-foreground">
              {" "}
              of {total}
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {actionTypeLabels[action.type]}
            {needsSchema && targetSchema ? ` · ${targetSchema.name}` : ""}
            {action.type === "TRIGGER_PIPELINE" && selectedPipeline
              ? ` · ${selectedPipeline.name}`
              : action.type === "TRIGGER_PIPELINE" && action.pipeline.trim()
                ? ` · ${action.pipeline}`
                : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
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
      </div>

      <Field className="gap-1">
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
              data: writesRecord(type)
                ? dataForSchema(schema, action.data)
                : action.data,
            })
          }}
        >
          <SelectTrigger id={typeId} aria-label={`Action ${index + 1} type`}>
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
              ? "Schema if a new record is created"
              : action.type === "UPDATE_RECORD"
                ? "Update on schema"
                : "Create on schema"}
          </FieldLabel>
          {schemas.length > 0 ? (
            <Select
              value={action.schemaId || CHOOSE_SCHEMA}
              modal={false}
              items={[
                { value: CHOOSE_SCHEMA, label: "Choose a schema" },
                ...schemas.map((schema) => ({
                  value: schema.id,
                  label: schema.name,
                })),
              ]}
              onValueChange={(value) => {
                const schemaId = !value || value === CHOOSE_SCHEMA ? "" : value
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
                <SelectItem value={CHOOSE_SCHEMA}>Choose a schema</SelectItem>
                {schemas.map((schema) => (
                  <SelectItem key={schema.id} value={schema.id}>
                    {schema.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a schema before this action can write a record.
            </p>
          )}
          <FieldDescription className="text-xs">
            {action.type === "UPDATE_RECORD"
              ? "The fields below come from this schema."
              : "The written record will use the fields on this schema."}
          </FieldDescription>
        </Field>
      ) : null}
      {needsRecord ? (
        <Field className="mt-3 gap-1">
          <FieldLabel htmlFor={recordId}>
            {action.type === "UPSERT_RECORD"
              ? "Existing record ID (optional)"
              : "Record ID"}
          </FieldLabel>
          <TemplateValueInput
            id={recordId}
            value={action.recordId}
            onChange={(recordIdValue) => onChange({ recordId: recordIdValue })}
            groups={templateGroups}
            placeholder="{{ .Record.id }}"
          />
          <FieldDescription className="text-xs">
            Insert the triggering record id, or type another record id.
          </FieldDescription>
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
                  <SelectItem key={pipeline.id} value={pipelineRef(pipeline)}>
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
          <FieldDescription className="text-xs">
            The selected pipeline runs with the input fields below.
          </FieldDescription>
        </Field>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium">{dataLabel}</p>
          <p className="text-xs text-muted-foreground">
            Insert values from the triggering record, type text, or use the
            current time.
          </p>
        </div>
        <DataEntriesEditor
          entries={action.data}
          templateGroups={templateGroups}
          targetFields={action.type === "TRIGGER_PIPELINE" ? [] : targetFields}
          onChange={(data) => onChange({ data })}
        />
      </div>
    </div>
  )
}

export function WorkflowActionsBuilder({
  value,
  schemas,
  pipelines,
  triggerFields,
  triggerSchemaId,
  onChange,
}: {
  value: ActionDraft[]
  schemas: Schema[]
  pipelines: PipelineDefinition[]
  triggerFields: JsonSchemaProperty[]
  triggerSchemaId?: string
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

  function addAction() {
    const schema = schemas.find((item) => item.id === triggerSchemaId)
    onChange([
      ...value,
      {
        ...emptyAction(),
        schemaId: triggerSchemaId ?? "",
        data: dataForSchema(schema, [emptyDataEntry()]),
      },
    ])
  }

  return (
    <TooltipProvider delay={400}>
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium">Then</h3>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                    />
                  }
                >
                  <CircleHelpIcon className="size-3.5" />
                  <span className="sr-only">About actions</span>
                </TooltipTrigger>
                <TooltipContent>
                  These steps run in order after the conditions match. Create or
                  update records, or send data into a pipeline.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">
              {value.length === 0
                ? "Add the actions that run when the conditions match."
                : `${value.length} ${value.length === 1 ? "action" : "actions"} · run in order`}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addAction}>
            <PlusIcon />
            Add action
          </Button>
        </div>
        {value.length === 0 ? (
          <button
            type="button"
            onClick={addAction}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-full border border-dashed">
              <PlusIcon className="size-4" />
            </span>
            <span className="font-medium text-foreground">
              Add your first action
            </span>
            <span>
              Choose what should happen next: create or update a record, or run
              a pipeline.
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {value.map((action, index) => (
              <ActionCard
                key={action.key}
                action={action}
                index={index}
                total={value.length}
                schemas={schemas}
                pipelines={pipelines}
                triggerFields={triggerFields}
                triggerSchemaId={triggerSchemaId}
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
            <button
              type="button"
              onClick={addAction}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
            >
              <PlusIcon className="size-3.5" />
              Add action
            </button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
