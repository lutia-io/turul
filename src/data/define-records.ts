import type { BadgeColor } from "@/lib/badge"
import type { JsonObject } from "@/lib/json-definition"

type JsonSchemaPropertySpec = {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object"
  description: string
  format?: string
  enum?: string[]
  items?: { type: string }
}

export function defineSchema({
  id,
  name,
  slug,
  color,
  description,
  properties,
  required,
  active = true,
  internal = false,
}: {
  id: string
  name: string
  slug: string
  color: BadgeColor
  description: string
  properties: Record<string, JsonSchemaPropertySpec>
  required?: string[]
  active?: boolean
  internal?: boolean
}) {
  const propertyNames = Object.keys(properties)

  return {
    id,
    name,
    slug,
    active,
    internal,
    color,
    definition: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: `https://schemas.lutia.dev/${slug}`,
      title: name,
      description,
      type: "object",
      additionalProperties: false,
      properties,
      required:
        required ??
        propertyNames.slice(
          0,
          Math.max(1, Math.ceil(propertyNames.length * 0.65))
        ),
    } satisfies JsonObject,
  }
}

export function defineWorkflow({
  id,
  name,
  slug,
  schemaId,
  trigger,
  steps,
  active = true,
  internal = false,
}: {
  id: string
  name: string
  slug: string
  schemaId: string
  trigger: { type: string; event: string }
  steps: { id: string; type: string; name: string }[]
  active?: boolean
  internal?: boolean
}) {
  return {
    id,
    name,
    slug,
    active,
    internal,
    schemaId,
    definition: {
      version: 1,
      schemaId,
      trigger,
      steps: steps.map((step, index) => ({
        ...step,
        order: index + 1,
      })),
    } satisfies JsonObject,
  }
}

export function definePipeline({
  id,
  name,
  slug,
  source,
  stages,
  active = true,
  internal = false,
}: {
  id: string
  name: string
  slug: string
  source: { type: string; name: string }
  stages: { id: string; type: string; name: string }[]
  active?: boolean
  internal?: boolean
}) {
  return {
    id,
    name,
    slug,
    active,
    internal,
    definition: {
      version: 1,
      source,
      stages: stages.map((stage, index) => ({
        ...stage,
        order: index + 1,
      })),
    } satisfies JsonObject,
  }
}
