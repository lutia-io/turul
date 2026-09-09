import type { JsonSchemaProperty } from "@/lib/json-definition"
import {
  nowTemplate,
  recordFieldTemplate,
  recordIDTemplate,
} from "@/lib/workflow-definition"
import {
  TemplateValueInput,
  type TemplateVariableGroup,
} from "@/components/template-value-input"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { propertyLabel } from "@/components/schema-records-table"

const CHOOSE_FIELD = "__choose_field__"
const CHOOSE_VALUE = "__choose_value__"
const RECORD_FIELD_RE = /^\{\{\s*\.Record\.data\.([A-Za-z0-9_]+)\s*\}\}$/

type ValueSource = "literal" | "record-field" | "record-id" | "now" | "advanced"

function parseValueSource(value: string): {
  source: ValueSource
  field?: string
} {
  const trimmed = value.trim()
  if (trimmed === recordIDTemplate) {
    return { source: "record-id" }
  }
  if (trimmed === nowTemplate) {
    return { source: "now" }
  }
  const recordField = trimmed.match(RECORD_FIELD_RE)
  if (recordField?.[1]) {
    return { source: "record-field", field: recordField[1] }
  }
  if (trimmed.includes("{{")) {
    return { source: "advanced" }
  }
  return { source: "literal" }
}

function sourceItems({
  fields,
  includeRecordId,
  includeNow,
}: {
  fields: JsonSchemaProperty[]
  includeRecordId: boolean
  includeNow: boolean
}) {
  return [
    { value: "literal", label: "Specific value" },
    ...(fields.length > 0
      ? [{ value: "record-field", label: "From this record" }]
      : []),
    ...(includeRecordId
      ? [{ value: "record-id", label: "This record’s ID" }]
      : []),
    ...(includeNow ? [{ value: "now", label: "Current time" }] : []),
    { value: "advanced", label: "Advanced" },
  ]
}

export function FriendlyValueInput({
  id,
  value,
  onChange,
  triggerFields,
  targetField,
  includeRecordId = false,
  includeNow = true,
  advancedGroups,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  triggerFields: JsonSchemaProperty[]
  targetField?: JsonSchemaProperty
  includeRecordId?: boolean
  includeNow?: boolean
  advancedGroups?: TemplateVariableGroup[]
  placeholder?: string
}) {
  const parsed = parseValueSource(value)
  const sources = sourceItems({
    fields: triggerFields,
    includeRecordId,
    includeNow,
  })
  const selectedSource = sources.some((item) => item.value === parsed.source)
    ? parsed.source
    : "advanced"

  function setSource(next: ValueSource) {
    if (next === "literal") {
      onChange(selectedSource === "literal" ? value : "")
      return
    }
    if (next === "record-id") {
      onChange(recordIDTemplate)
      return
    }
    if (next === "now") {
      onChange(nowTemplate)
      return
    }
    if (next === "record-field") {
      const field =
        parsed.field && triggerFields.some((item) => item.name === parsed.field)
          ? parsed.field
          : (triggerFields[0]?.name ?? "")
      onChange(field ? recordFieldTemplate(field) : "")
      return
    }
    onChange(value)
  }

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(8.5rem,0.85fr)_minmax(0,1.15fr)]">
      <Select
        value={selectedSource}
        modal={false}
        items={sources}
        onValueChange={(next) => {
          if (next) {
            setSource(next as ValueSource)
          }
        }}
      >
        <SelectTrigger aria-label="Value source">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sources.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedSource === "record-field" ? (
        <Select
          value={parsed.field || CHOOSE_FIELD}
          modal={false}
          items={[
            { value: CHOOSE_FIELD, label: "Choose a field" },
            ...triggerFields.map((field) => ({
              value: field.name,
              label: propertyLabel(field.name),
            })),
          ]}
          onValueChange={(next) => {
            if (!next || next === CHOOSE_FIELD) {
              onChange("")
              return
            }
            onChange(recordFieldTemplate(next))
          }}
        >
          <SelectTrigger id={id} aria-label="Record field">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CHOOSE_FIELD}>Choose a field</SelectItem>
            {triggerFields.map((field) => (
              <SelectItem key={field.name} value={field.name}>
                {propertyLabel(field.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {selectedSource === "literal" ? (
        <LiteralValueInput
          id={id}
          value={value}
          field={targetField}
          placeholder={placeholder}
          onChange={onChange}
        />
      ) : null}
      {selectedSource === "advanced" ? (
        <div className="sm:col-span-1">
          <TemplateValueInput
            id={id}
            value={value}
            onChange={onChange}
            groups={advancedGroups ?? []}
            placeholder={placeholder ?? "{{ .Record.data.name }}"}
          />
        </div>
      ) : null}
      {selectedSource === "record-id" || selectedSource === "now" ? (
        <p className="flex h-8 items-center text-sm text-muted-foreground">
          {selectedSource === "record-id"
            ? "Uses the record that triggered this workflow."
            : "Uses the time the workflow runs."}
        </p>
      ) : null}
    </div>
  )
}

function LiteralValueInput({
  id,
  value,
  field,
  placeholder,
  onChange,
}: {
  id?: string
  value: string
  field?: JsonSchemaProperty
  placeholder?: string
  onChange: (value: string) => void
}) {
  if (field?.type === "boolean") {
    return (
      <Select
        value={value || "false"}
        modal={false}
        items={[
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        onValueChange={(next) => {
          if (next) {
            onChange(next)
          }
        }}
      >
        <SelectTrigger id={id} aria-label="Value">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (field?.enumValues && field.enumValues.length > 0) {
    return (
      <Select
        value={value || CHOOSE_VALUE}
        modal={false}
        items={[
          { value: CHOOSE_VALUE, label: "Choose a value" },
          ...field.enumValues.map((item) => ({ value: item, label: item })),
        ]}
        onValueChange={(next) => {
          if (!next || next === CHOOSE_VALUE) {
            onChange("")
            return
          }
          onChange(next)
        }}
      >
        <SelectTrigger id={id} aria-label="Value">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CHOOSE_VALUE}>Choose a value</SelectItem>
          {field.enumValues.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const numeric = field?.type === "integer" || field?.type === "number"

  return (
    <Input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      type={numeric ? "number" : "text"}
      placeholder={placeholder ?? (numeric ? "0" : "Value")}
    />
  )
}
