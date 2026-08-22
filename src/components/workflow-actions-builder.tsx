import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { Schema } from "@/data/networks"
import {
  getJsonSchemaProperties,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import {
  actionTypeDescriptions,
  actionTypeLabels,
  emptyAction,
  emptyDataEntry,
  nowTemplate,
  recordFieldTemplate,
  workflowActionTypes,
  type ActionDraft,
  type DataEntryDraft,
  type WorkflowActionType,
} from "@/lib/workflow-definition"

function TemplateValueInput({
  value,
  onChange,
  fields,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  fields: JsonSchemaProperty[]
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {fields.length > 0 ? (
        <NativeSelect
          value=""
          onChange={(event) => {
            const next = event.target.value
            if (!next) {
              return
            }
            onChange(next === "__now" ? nowTemplate : recordFieldTemplate(next))
          }}
        >
          <NativeSelectOption value="">Insert a value…</NativeSelectOption>
          <NativeSelectOption value="__now">Current time</NativeSelectOption>
          {fields.map((field) => (
            <NativeSelectOption key={field.name} value={field.name}>
              From the record: {field.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : null}
    </div>
  )
}

function DataEntriesEditor({
  entries,
  triggerFields,
  targetFields,
  onChange,
}: {
  entries: DataEntryDraft[]
  triggerFields: JsonSchemaProperty[]
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
      {entries.map((entry) => (
        <div
          key={entry.key}
          className="grid items-start gap-2 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto]"
        >
          {targetFields.length > 0 ? (
            <NativeSelect
              value={entry.name}
              onChange={(event) =>
                update(entry.key, { name: event.target.value })
              }
            >
              <NativeSelectOption value="">Choose a field</NativeSelectOption>
              {targetFields.map((field) => (
                <NativeSelectOption key={field.name} value={field.name}>
                  {field.name}
                </NativeSelectOption>
              ))}
              {entry.name &&
              !targetFields.some((field) => field.name === entry.name) ? (
                <NativeSelectOption value={entry.name}>
                  {entry.name}
                </NativeSelectOption>
              ) : null}
            </NativeSelect>
          ) : (
            <Input
              value={entry.name}
              onChange={(event) =>
                update(entry.key, { name: event.target.value })
              }
              placeholder="field"
              className="font-mono"
            />
          )}
          <TemplateValueInput
            value={entry.value}
            onChange={(next) => update(entry.key, { value: next })}
            fields={triggerFields}
            placeholder="Value or insert from the record"
          />
          <div className="flex h-8 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={entries.length === 1}
              onClick={() =>
                onChange(entries.filter((item) => item.key !== entry.key))
              }
            >
              <Trash2Icon />
              <span className="sr-only">Remove field</span>
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...entries,
              emptyDataEntry(unusedTargetFields[0]?.name ?? ""),
            ])
          }
        >
          <PlusIcon />
          Add field
        </Button>
      </div>
    </div>
  )
}

function ActionCard({
  action,
  index,
  schemas,
  triggerFields,
  canMoveUp,
  canMoveDown,
  canRemove,
  onChange,
  onMove,
  onRemove,
}: {
  action: ActionDraft
  index: number
  schemas: Schema[]
  triggerFields: JsonSchemaProperty[]
  canMoveUp: boolean
  canMoveDown: boolean
  canRemove: boolean
  onChange: (patch: Partial<ActionDraft>) => void
  onMove: (offset: number) => void
  onRemove: () => void
}) {
  const needsSchema =
    action.type === "CREATE_RECORD" || action.type === "UPSERT_RECORD"
  const needsRecord =
    action.type === "UPDATE_RECORD" || action.type === "UPSERT_RECORD"
  const targetSchema = schemas.find((schema) => schema.id === action.schemaId)
  const targetFields = targetSchema
    ? getJsonSchemaProperties(targetSchema.definition)
    : []
  const dataLabel =
    action.type === "TRIGGER_PIPELINE" ? "Pipeline input" : "Record fields"

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-muted font-mono text-xs">
          {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon />
            <span className="sr-only">Move up</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon />
            <span className="sr-only">Move down</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!canRemove}
            onClick={onRemove}
          >
            <Trash2Icon />
            <span className="sr-only">Remove action</span>
          </Button>
        </div>
      </div>
      <Field>
        <FieldLabel>Action</FieldLabel>
        <NativeSelect
          value={action.type}
          onChange={(event) => {
            const type = event.target.value as WorkflowActionType
            onChange({ type })
          }}
        >
          {workflowActionTypes.map((type) => (
            <NativeSelectOption key={type} value={type}>
              {actionTypeLabels[type]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">
          {actionTypeDescriptions[action.type]}
        </p>
      </Field>
      {needsSchema ? (
        <Field>
          <FieldLabel>Create on schema</FieldLabel>
          {schemas.length > 0 ? (
            <NativeSelect
              value={action.schemaId}
              onChange={(event) => {
                const schemaId = event.target.value
                const schema = schemas.find((item) => item.id === schemaId)
                const properties = schema
                  ? getJsonSchemaProperties(schema.definition)
                  : []
                const blank = action.data.every(
                  (entry) => !entry.name && !entry.value
                )
                onChange({
                  schemaId,
                  data:
                    blank && properties.length > 0
                      ? properties.map((property) =>
                          emptyDataEntry(property.name)
                        )
                      : action.data,
                })
              }}
            >
              <NativeSelectOption value="">Choose a schema</NativeSelectOption>
              {schemas.map((schema) => (
                <NativeSelectOption key={schema.id} value={schema.id}>
                  {schema.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a schema before this action can write a record.
            </p>
          )}
        </Field>
      ) : null}
      {needsRecord ? (
        <Field>
          <FieldLabel>
            {action.type === "UPSERT_RECORD"
              ? "Existing record ID (optional)"
              : "Record ID"}
          </FieldLabel>
          <TemplateValueInput
            value={action.recordId}
            onChange={(recordId) => onChange({ recordId })}
            fields={triggerFields}
            placeholder="Record id"
          />
        </Field>
      ) : null}
      {action.type === "TRIGGER_PIPELINE" ? (
        <Field>
          <FieldLabel>Pipeline</FieldLabel>
          <Input
            value={action.pipeline}
            onChange={(event) => onChange({ pipeline: event.target.value })}
            placeholder="noop-pipeline"
            className="font-mono"
          />
        </Field>
      ) : null}
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium">{dataLabel}</p>
          <p className="text-xs text-muted-foreground">
            Insert values from the triggering record, type text, or use the
            current time.
          </p>
        </div>
        <DataEntriesEditor
          entries={action.data}
          triggerFields={triggerFields}
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
  triggerFields,
  onChange,
}: {
  value: ActionDraft[]
  schemas: Schema[]
  triggerFields: JsonSchemaProperty[]
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

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-medium">Then</h3>
        <p className="text-xs text-muted-foreground">
          These actions run in order when the conditions match.
        </p>
      </div>
      {value.map((action, index) => (
        <ActionCard
          key={action.key}
          action={action}
          index={index}
          schemas={schemas}
          triggerFields={triggerFields}
          canMoveUp={index > 0}
          canMoveDown={index < value.length - 1}
          canRemove={value.length > 1}
          onChange={(patch) => update(action.key, patch)}
          onMove={(offset) => move(index, offset)}
          onRemove={() =>
            onChange(value.filter((item) => item.key !== action.key))
          }
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...value, emptyAction()])}
      >
        <PlusIcon />
        Add action
      </Button>
    </div>
  )
}
