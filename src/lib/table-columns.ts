import {
  ADDRESS_FORMAT,
  ADDRESS_REQUIRED_FIELDS,
  addressPropertySchema,
} from "@/lib/address"
import { columnLabel, propertyLabel } from "@/components/schema-records-table"
import type {
  JsonObject,
  JsonSchemaProperty,
  JsonValue,
} from "@/lib/json-definition"
import { toFieldName } from "@/lib/slug"

export const fieldKinds = [
  { value: "text", label: "Text" },
  { value: "choices", label: "Choices" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "boolean", label: "Yes / No" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "Date & time" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "file", label: "File" },
  { value: "user", label: "User" },
  { value: "address", label: "Address" },
  { value: "foreign", label: "Related record" },
  { value: "list", label: "List" },
  { value: "object", label: "Object" },
] as const

export type FieldKind = (typeof fieldKinds)[number]["value"]

export const listItemTypes = ["string", "number", "boolean", "user"] as const

export type ListItemType = (typeof listItemTypes)[number]

export const listItemTypeLabels: Record<ListItemType, string> = {
  string: "Text",
  number: "Number",
  boolean: "Yes / No",
  user: "User",
}

export type ColumnDraft = {
  title: string
  kind: FieldKind
  required: boolean
  enumValues: string[]
  schemaId: string
  itemsType: ListItemType
}

export type ColumnImpact = {
  typeChanged: boolean
  requiredAdded: boolean
}

export function emptyColumnDraft(): ColumnDraft {
  return {
    title: "",
    kind: "text",
    required: false,
    enumValues: [],
    schemaId: "",
    itemsType: "string",
  }
}

export function emptyTableDefinition(name: string): JsonObject {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: name.trim() || "Untitled table",
    type: "object",
    additionalProperties: false,
    properties: {},
    required: [],
  }
}

export function kindFromProperty(property: {
  type: string
  format?: string
  enumValues?: string[]
}): FieldKind {
  if (property.type === "array") {
    return "list"
  }
  if (property.format === "address") {
    return "address"
  }
  if (property.format === "foreign") {
    return "foreign"
  }
  if (property.format === "file") {
    return "file"
  }
  if (property.format === "user") {
    return "user"
  }
  if (property.format === "email") {
    return "email"
  }
  if (property.format === "phone") {
    return "phone"
  }
  if (property.format === "currency") {
    return "currency"
  }
  if (property.format === "uri") {
    return "url"
  }
  if (property.format === "date") {
    return "date"
  }
  if (property.format === "time") {
    return "time"
  }
  if (property.format === "date-time") {
    return "datetime"
  }
  if (property.type === "boolean") {
    return "boolean"
  }
  if (property.type === "number" || property.type === "integer") {
    return "number"
  }
  if (property.type === "object") {
    return "object"
  }
  if ((property.enumValues?.length ?? 0) > 0) {
    return "choices"
  }
  return "text"
}

export function draftFromProperty(property: JsonSchemaProperty): ColumnDraft {
  const itemType =
    property.itemsType === "integer" ? "number" : property.itemsType
  const itemsType = listItemTypes.find((item) => item === itemType)
  return {
    title: property.title?.trim() || propertyLabel(property.name),
    kind: kindFromProperty(property),
    required: property.required,
    enumValues: [...(property.enumValues ?? [])],
    schemaId: property.schemaId ?? "",
    itemsType: itemsType ?? "string",
  }
}

export function columnImpact(
  previous: JsonSchemaProperty,
  draft: ColumnDraft
): ColumnImpact {
  const nextChoices = cleanChoices(draft.enumValues)
  const typeChanged =
    kindFromProperty(previous) !== draft.kind ||
    !sameList(previous.enumValues ?? [], nextChoices) ||
    (draft.kind === "foreign" &&
      (previous.schemaId ?? "") !== draft.schemaId.trim()) ||
    (draft.kind === "list" &&
      (previous.itemsType ?? "string") !== draft.itemsType)
  return {
    typeChanged,
    requiredAdded: !previous.required && draft.required,
  }
}

export function columnChangeWarnings(label: string, impact: ColumnImpact) {
  const warnings: string[] = []
  if (impact.typeChanged) {
    warnings.push(
      `${label} already has values on some rows. Those values stay stored, but they may no longer match this column. Later saves follow the updated column.`
    )
  }
  if (impact.requiredAdded) {
    warnings.push(
      `New rows must fill in ${label}. Rows that are already empty are not filled in for you.`
    )
  }
  return warnings
}

export function deleteColumnWarning(label: string) {
  return `${label} will leave this table. Rows are not rewritten, so values already stored stay on the record and stop appearing here.`
}

export function columnNameError(
  definition: JsonObject,
  draft: ColumnDraft,
  editingKey?: string
) {
  const title = draft.title.trim()
  if (!title) {
    return undefined
  }
  const wanted = normalizeFieldName(title)
  const properties = propertyMap(definition)
  for (const [key, value] of Object.entries(properties)) {
    if (key === editingKey) {
      continue
    }
    const spec = asObject(value)
    const display = columnLabel({
      name: key,
      title: typeof spec?.title === "string" ? spec.title : undefined,
    })
    if (normalizeFieldName(display) === wanted) {
      return duplicateFieldMessage(title)
    }
  }
  if (
    editingKey === undefined &&
    Object.hasOwn(properties, toFieldName(title))
  ) {
    return duplicateFieldMessage(title)
  }
  return undefined
}

export function addColumn(
  definition: JsonObject,
  draft: ColumnDraft
): JsonObject {
  const nameError = columnNameError(definition, draft)
  if (nameError) {
    throw new Error(nameError)
  }
  const properties = propertyMap(definition)
  const key = toFieldName(draft.title.trim() || "field")
  const nextProperties: JsonObject = {
    ...properties,
    [key]: propertySpec(draft, key),
  }
  return {
    ...definition,
    properties: nextProperties,
    required: setRequired(requiredNames(definition), key, draft.required),
  }
}

export function updateColumn(
  definition: JsonObject,
  key: string,
  draft: ColumnDraft
): JsonObject {
  const nameError = columnNameError(definition, draft, key)
  if (nameError) {
    throw new Error(nameError)
  }
  const properties = propertyMap(definition)
  const previous = asObject(properties[key])
  const nextProperties: JsonObject = {}
  let found = false
  for (const [name, value] of Object.entries(properties)) {
    if (name === key) {
      nextProperties[name] = propertySpec(draft, key, previous)
      found = true
    } else {
      nextProperties[name] = value
    }
  }
  if (!found) {
    nextProperties[key] = propertySpec(draft, key, previous)
  }
  return {
    ...definition,
    properties: nextProperties,
    required: setRequired(requiredNames(definition), key, draft.required),
  }
}

export function removeColumn(definition: JsonObject, key: string): JsonObject {
  const nextProperties: JsonObject = {}
  for (const [name, value] of Object.entries(propertyMap(definition))) {
    if (name !== key) {
      nextProperties[name] = value
    }
  }
  return {
    ...definition,
    properties: nextProperties,
    required: requiredNames(definition).filter((name) => name !== key),
  }
}

function propertySpec(
  draft: ColumnDraft,
  key: string,
  previous?: JsonObject
): JsonObject {
  const shape = shapeForKind(draft.kind)
  const title = draft.title.trim() || key
  const previousDescription =
    typeof previous?.description === "string" ? previous.description : ""
  const previousTitle =
    typeof previous?.title === "string" ? previous.title : ""
  const description =
    previousDescription &&
    previousDescription !== previousTitle &&
    previousDescription !== key
      ? previousDescription
      : title
  const spec: JsonObject = {
    ...(previous ?? {}),
    type: shape.type,
    title,
    description,
  }

  if (shape.format) {
    spec.format = shape.format
  } else {
    delete spec.format
  }

  if (draft.kind === "foreign" && draft.schemaId.trim()) {
    spec.schemaId = draft.schemaId.trim()
    delete spec.enum
  } else {
    delete spec.schemaId
  }

  const choices = cleanChoices(draft.enumValues)
  if (draft.kind === "choices" && choices.length > 0) {
    spec.enum = choices
  } else if (draft.kind !== "foreign") {
    delete spec.enum
  }

  if (shape.type !== "object") {
    delete spec.properties
    delete spec.additionalProperties
    delete spec.required
  }
  if (shape.type !== "array") {
    delete spec.items
  } else if (draft.itemsType === "user") {
    spec.items = { type: "string", format: "user" }
  } else {
    spec.items = { type: draft.itemsType }
  }

  const typeChanged =
    !previous ||
    previous.type !== shape.type ||
    (typeof previous.format === "string" ? previous.format : "") !==
      shape.format
  if (typeChanged || !Object.hasOwn(spec, "default")) {
    delete spec.default
  }

  if (shape.format === ADDRESS_FORMAT) {
    spec.additionalProperties = false
    if (!asObject(spec.properties)) {
      spec.properties = addressPropertySchema()
      spec.required = [...ADDRESS_REQUIRED_FIELDS]
    }
  }

  return spec
}

function shapeForKind(kind: FieldKind): { type: string; format: string } {
  switch (kind) {
    case "number":
      return { type: "number", format: "" }
    case "currency":
      return { type: "number", format: "currency" }
    case "boolean":
      return { type: "boolean", format: "" }
    case "date":
      return { type: "string", format: "date" }
    case "time":
      return { type: "string", format: "time" }
    case "datetime":
      return { type: "string", format: "date-time" }
    case "email":
      return { type: "string", format: "email" }
    case "phone":
      return { type: "string", format: "phone" }
    case "url":
      return { type: "string", format: "uri" }
    case "file":
      return { type: "string", format: "file" }
    case "user":
      return { type: "string", format: "user" }
    case "address":
      return { type: "object", format: ADDRESS_FORMAT }
    case "foreign":
      return { type: "string", format: "foreign" }
    case "choices":
      return { type: "string", format: "" }
    case "list":
      return { type: "array", format: "" }
    case "object":
      return { type: "object", format: "" }
    default:
      return { type: "string", format: "" }
  }
}

function duplicateFieldMessage(title: string) {
  return `A field named ${title} already exists.`
}

function normalizeFieldName(value: string) {
  return value.trim().toLowerCase()
}

function propertyMap(definition: JsonObject): JsonObject {
  return asObject(definition.properties) ?? {}
}

function requiredNames(definition: JsonObject) {
  if (!Array.isArray(definition.required)) {
    return []
  }
  return definition.required.filter(
    (item): item is string => typeof item === "string"
  )
}

function setRequired(names: string[], key: string, required: boolean) {
  const without = names.filter((name) => name !== key)
  return required ? [...without, key] : without
}

function cleanChoices(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function sameList(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function asObject(value: JsonValue | undefined): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value
  }
  return undefined
}
