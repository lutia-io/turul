import { useState } from "react"

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
type ValuePurpose = "value" | "record"

function namedSchema(name?: string) {
  const trimmed = name?.trim()
  return trimmed || undefined
}

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
  purpose,
  schemaName,
}: {
  fields: JsonSchemaProperty[]
  includeRecordId: boolean
  includeNow: boolean
  purpose: ValuePurpose
  schemaName?: string
}) {
  const named = namedSchema(schemaName)
  const started = named
    ? `The ${named} that started this`
    : "The record that started this"
  const startedId = named
    ? `ID of the ${named} that started this`
    : "ID of the record that started this"
  const fromStarted = named
    ? `From the ${named} that started this`
    : "From the record that started this"
  const fromField = named
    ? `A field from that ${named}`
    : "A field from the record that started this"

  if (purpose === "record") {
    return [
      ...(includeRecordId ? [{ value: "record-id", label: started }] : []),
      ...(fields.length > 0
        ? [{ value: "record-field", label: fromField }]
        : []),
      { value: "literal", label: "A specific record ID" },
      { value: "advanced", label: "Advanced" },
    ]
  }

  return [
    { value: "literal", label: "A specific value" },
    ...(fields.length > 0
      ? [{ value: "record-field", label: fromStarted }]
      : []),
    ...(includeRecordId ? [{ value: "record-id", label: startedId }] : []),
    ...(includeNow ? [{ value: "now", label: "Current time" }] : []),
    { value: "advanced", label: "Advanced" },
  ]
}

function sourceHelp({
  source,
  purpose,
  schemaName,
}: {
  source: ValueSource
  purpose: ValuePurpose
  schemaName?: string
}) {
  const named = namedSchema(schemaName) ?? "record"
  if (source === "record-id") {
    return purpose === "record"
      ? `This step will change the same ${named} that started this workflow.`
      : `Uses the ID of the ${named} that started this workflow.`
  }
  if (source === "now") {
    return "Uses the time the workflow runs."
  }
  if (source === "record-field" && purpose === "record") {
    return `Uses a field on the ${named} that started this to find which record to update.`
  }
  return undefined
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
  purpose = "value",
  triggerSchemaName,
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
  purpose?: ValuePurpose
  triggerSchemaName?: string
}) {
  const parsed = parseValueSource(value)
  const sources = sourceItems({
    fields: triggerFields,
    includeRecordId,
    includeNow,
    purpose,
    schemaName: triggerSchemaName,
  })
  const inferredSource = sources.some((item) => item.value === parsed.source)
    ? parsed.source
    : "advanced"
  const [forceAdvanced, setForceAdvanced] = useState(false)
  const selectedSource = forceAdvanced ? "advanced" : inferredSource
  const help = sourceHelp({
    source: selectedSource,
    purpose,
    schemaName: triggerSchemaName,
  })
  const chooseFieldLabel =
    purpose === "record" ? "Choose the field with the ID" : "Choose a field"

  function setSource(next: ValueSource) {
    if (next === "advanced") {
      setForceAdvanced(true)
      return
    }
    setForceAdvanced(false)
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
    }
  }

  return (
    <div
      className={
        purpose === "record"
          ? "grid min-w-0 gap-2"
          : "grid min-w-0 gap-2 sm:grid-cols-[minmax(11rem,1fr)_minmax(0,1.15fr)]"
      }
    >
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
        <SelectTrigger
          aria-label={purpose === "record" ? "Which record" : "Value source"}
        >
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
            { value: CHOOSE_FIELD, label: chooseFieldLabel },
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
          <SelectTrigger
            id={id}
            aria-label={
              purpose === "record" ? "Field with the record ID" : "Record field"
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CHOOSE_FIELD}>{chooseFieldLabel}</SelectItem>
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
          placeholder={
            placeholder ??
            (purpose === "record" ? "Record ID" : undefined)
          }
          onChange={onChange}
        />
      ) : null}
      {selectedSource === "advanced" ? (
        <TemplateValueInput
          id={id}
          value={value}
          onChange={onChange}
          groups={advancedGroups ?? []}
          placeholder={
            placeholder ??
            (purpose === "record" ? "Record ID" : "Value")
          }
        />
      ) : null}
      {help ? (
        <p
          className={
            selectedSource === "record-id" || selectedSource === "now"
              ? "flex min-h-8 items-center text-sm text-muted-foreground"
              : "text-sm text-muted-foreground sm:col-span-2"
          }
        >
          {help}
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
