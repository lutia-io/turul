export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type JsonObject = { [key: string]: JsonValue }

export type JsonSchemaProperty = {
  name: string
  type: string
  required: boolean
  description?: string
  format?: string
  schemaId?: string
  enumValues?: string[]
  itemsType?: string
  defaultValue?: string
}

export type DefinitionStep = {
  id: string
  type: string
  name: string
  order: number
}

function asObject(value: unknown): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject
  }
  return undefined
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined
}

export function isTemplateExpression(value: string) {
  return value.includes("{{")
}

export function formatJsonDefault(value: JsonValue): string {
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (value === null) {
    return "null"
  }
  return JSON.stringify(value)
}

export function parseJsonDefault(input: string, type: string): JsonValue {
  const raw = input.trim()
  if (isTemplateExpression(raw)) {
    return raw
  }
  if (raw === "null") {
    return null
  }
  if (type === "boolean") {
    if (raw === "true") {
      return true
    }
    if (raw === "false") {
      return false
    }
    return raw
  }
  if (type === "integer") {
    if (/^-?\d+$/.test(raw)) {
      return Number.parseInt(raw, 10)
    }
    return raw
  }
  if (type === "number") {
    const parsed = Number(raw)
    if (raw !== "" && Number.isFinite(parsed)) {
      return parsed
    }
    return raw
  }
  if (type === "object" || type === "array") {
    try {
      return JSON.parse(raw) as JsonValue
    } catch {
      return raw
    }
  }
  return raw
}

export function hasSchemaDefault(property: JsonSchemaProperty) {
  return property.defaultValue !== undefined
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const values = value.filter(
    (item): item is string => typeof item === "string"
  )
  return values.length > 0 ? values : undefined
}

export function stringifyDefinition(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function parseJsonObject(text: string): JsonObject | undefined {
  try {
    return asObject(JSON.parse(text) as unknown)
  } catch {
    return undefined
  }
}

export function definitionDescription(definition: JsonObject) {
  return asString(definition.description)
}

export function jsonSchemaPropertyCount(definition: JsonObject) {
  return getJsonSchemaProperties(definition).length
}

export function getJsonSchemaProperties(
  definition: JsonObject
): JsonSchemaProperty[] {
  const properties = asObject(definition.properties)
  const required = new Set(asStringArray(definition.required) ?? [])

  if (!properties) {
    return []
  }

  return Object.entries(properties).map(([name, spec]) => {
    const property = asObject(spec)
    const enumValues = asStringArray(property?.enum)
    const items = asObject(property?.items)
    const hasDefault = property != null && Object.hasOwn(property, "default")

    return {
      name,
      type: asString(property?.type) ?? "any",
      required: required.has(name),
      description: asString(property?.description),
      format: asString(property?.format),
      schemaId: asString(property?.schemaId),
      enumValues,
      itemsType: asString(items?.type),
      defaultValue: hasDefault
        ? formatJsonDefault(property.default as JsonValue)
        : undefined,
    }
  })
}

function getNamedSteps(value: unknown): DefinitionStep[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item, index) => {
    const step = asObject(item)
    const id = asString(step?.id)
    const type = asString(step?.type)
    const name = asString(step?.name)

    if (!id || !type || !name) {
      return []
    }

    return [
      {
        id,
        type,
        name,
        order: typeof step?.order === "number" ? step.order : index + 1,
      },
    ]
  })
}

export function getWorkflowSteps(definition: JsonObject) {
  return getNamedSteps(definition.steps)
}

export type PipelineLevelNode = {
  id: string
}

export function getPipelineLevels(
  definition: JsonObject
): PipelineLevelNode[][] {
  if (!Array.isArray(definition.nodes)) {
    return []
  }

  return definition.nodes.flatMap((level) => {
    if (!Array.isArray(level)) {
      return []
    }
    const nodes = level.flatMap((item) => {
      const node = asObject(item)
      const id = asString(node?.id)
      return id ? [{ id }] : []
    })
    return nodes.length > 0 ? [nodes] : []
  })
}

export function getPipelineStages(
  definition: JsonObject,
  names?: Map<string, string>
) {
  const levels = getPipelineLevels(definition)
  if (levels.length > 0) {
    return levels.map((level, index) => ({
      id: `level-${index}`,
      type: "level",
      name: level
        .map((node, nodeIndex) => names?.get(node.id) ?? `[${nodeIndex}]`)
        .join(", "),
      order: index + 1,
    }))
  }

  const fromStages = getNamedSteps(definition.stages)
  if (fromStages.length > 0) {
    return fromStages
  }
  if (!Array.isArray(definition.nodes)) {
    return []
  }
  return definition.nodes.flatMap((stage, index) => {
    if (!Array.isArray(stage)) {
      return []
    }
    const slugs = stage.flatMap((item) => {
      const node = asObject(item)
      const slug = asString(node?.slug)
      return slug ? [slug] : []
    })
    if (slugs.length === 0) {
      return []
    }
    return [
      {
        id: slugs.join("+"),
        type: "stage",
        name: slugs.join(", "),
        order: index + 1,
      },
    ]
  })
}

export function workflowTriggerLabel(definition: JsonObject) {
  const trigger = asObject(definition.trigger)
  return (
    asString(trigger?.event) ??
    asString(trigger?.name) ??
    asString(definition.trigger) ??
    "Unspecified trigger"
  )
}

export function pipelineSourceLabel(definition: JsonObject) {
  const source = asObject(definition.source)
  return (
    asString(source?.name) ??
    asString(source?.type) ??
    asString(definition.source) ??
    "Unspecified source"
  )
}

export function isFileProperty(property: JsonSchemaProperty) {
  return property.format === "file"
}

export function isForeignProperty(property: JsonSchemaProperty) {
  return property.format === "foreign"
}

export function isUriProperty(property: JsonSchemaProperty) {
  return property.format === "uri"
}

export function isEmailProperty(property: JsonSchemaProperty) {
  return property.format === "email"
}

export function isAddressProperty(property: JsonSchemaProperty) {
  return property.format === "address"
}

export function getRecordFileIds(
  data: JsonObject,
  properties: JsonSchemaProperty[]
) {
  return properties.flatMap((property) => {
    if (!isFileProperty(property)) {
      return []
    }

    const value = data[property.name]
    return typeof value === "string" && value ? [value] : []
  })
}

export function publicationStatus(active: boolean) {
  return active ? "Published" : "Draft"
}
