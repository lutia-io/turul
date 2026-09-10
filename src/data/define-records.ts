import type { BadgeColor } from "@/lib/badge"
import type { JsonObject, JsonValue } from "@/lib/json-definition"
import type {
  WorkflowAction,
  WorkflowCriteria,
  WorkflowTrigger,
} from "@/lib/workflow-definition"

export type JsonSchemaPropertySpec = {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object"
  description: string
  format?: string
  schemaId?: string
  enum?: string[]
  items?: { type: string }
  default?: JsonValue
}

export function defineSchema({
  id,
  name,
  slug,
  color,
  description,
  properties,
  required,
  internal = false,
}: {
  id: string
  name: string
  slug: string
  color: BadgeColor
  description: string
  properties: Record<string, JsonSchemaPropertySpec>
  required?: string[]
  internal?: boolean
}) {
  const propertyNames = Object.keys(properties)

  return {
    id,
    name,
    slug,
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
  description = "",
  schemaId,
  trigger,
  steps,
  criteria,
  actions,
  active = true,
  internal = false,
  organizationId,
}: {
  id: string
  name: string
  slug: string
  description?: string
  schemaId: string
  trigger?: WorkflowTrigger | { type: string; event: string }
  steps?: { id: string; type: string; name: string }[]
  criteria?: WorkflowCriteria
  actions?: WorkflowAction[]
  active?: boolean
  internal?: boolean
  organizationId?: string
}) {
  const nextTrigger = normalizeMockTrigger(trigger)
  const nextActions =
    actions && actions.length > 0
      ? actions
      : mockActionsFromSteps(schemaId, steps)

  return {
    id,
    name,
    slug,
    description,
    active,
    internal,
    schemaId,
    organizationId,
    definition: {
      trigger: nextTrigger,
      criteria: criteria ?? {},
      actions: nextActions,
    } satisfies JsonObject,
  }
}

function normalizeMockTrigger(
  trigger?: WorkflowTrigger | { type: string; event: string }
): WorkflowTrigger {
  if (!trigger) {
    return { on: ["created"] }
  }
  if ("on" in trigger && trigger.on) {
    return trigger
  }
  if ("type" in trigger && trigger.type === "schedule") {
    return {
      on: ["schedule"],
      cron: "0 9 * * *",
      timezone: "America/Los_Angeles",
    }
  }
  return { on: ["created"] }
}

function mockActionsFromSteps(
  schemaId: string,
  steps?: { id: string; type: string; name: string }[]
): WorkflowAction[] {
  if (!steps || steps.length === 0) {
    return [
      {
        type: "CREATE_RECORD",
        context: { schemaId, data: {} },
      },
    ]
  }
  return steps.map((step) => ({
    type: "CREATE_RECORD" as const,
    context: { schemaId, data: { step: step.name } },
  }))
}

export function definePipeline({
  id,
  name,
  slug,
  description = "",
  source,
  stages,
  active = true,
  internal = false,
  organizationId,
}: {
  id: string
  name: string
  slug: string
  description?: string
  source: { type: string; name: string }
  stages: { id: string; type: string; name: string }[]
  active?: boolean
  internal?: boolean
  organizationId?: string
}) {
  return {
    id,
    name,
    slug,
    description,
    active,
    internal,
    organizationId,
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
