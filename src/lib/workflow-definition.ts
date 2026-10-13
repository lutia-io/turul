import { columnLabel, propertyLabel } from "@/components/schema-records-table"
import {
  getJsonSchemaProperties,
  type JsonObject,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import {
  levelsFromApi,
  levelsToApi,
  parsePipelineDefinition,
  pipelineNodeCount,
  pipelineSummary,
  type PipelineLevelDraft,
  type PipelineNodeConfig,
} from "@/lib/pipeline-definition"

export type { PipelineLevelDraft, PipelineNodeConfig }
export { levelsFromApi, levelsToApi }

export const compareOperators = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
] as const

export type CompareOperator = (typeof compareOperators)[number]

export const criteriaLogics = ["AND", "OR", "NOT"] as const

export type CriteriaLogic = (typeof criteriaLogics)[number]

export type WorkflowCriteria = {
  logic?: CriteriaLogic
  conditions?: WorkflowCriteria[]
  field?: string
  operator?: CompareOperator
  value?: JsonValue
}

export type WorkflowDefinitionBody = {
  trigger: WorkflowTrigger
  criteria: WorkflowCriteria
  nodes: PipelineNodeConfig[][]
}

export const triggerOnValues = ["created", "updated", "schedule"] as const

export type TriggerOn = (typeof triggerOnValues)[number]

export type WorkflowTrigger = {
  on?: TriggerOn[]
  changed?: string[]
  cron?: string
  timezone?: string
}

export type TriggerKind = "created" | "updated" | "created_updated" | "schedule"

export type SchedulePreset = "hourly" | "daily" | "weekly" | "custom"

export type TriggerDraft = {
  kind: TriggerKind
  changed: string[]
  preset: SchedulePreset
  hour: string
  minute: string
  cron: string
  timezone: string
}

export const triggerKindLabels: Record<TriggerKind, string> = {
  created: "Record is created",
  updated: "Record is updated",
  created_updated: "Record is created or updated",
  schedule: "On a schedule",
}

export const triggerKindShortLabels: Record<TriggerKind, string> = {
  created: "Created",
  updated: "Updated",
  created_updated: "Created or updated",
  schedule: "On a schedule",
}

export const commonTimezones = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const

export type CriteriaLeafDraft = {
  kind: "leaf"
  key: string
  field: string
  customField: boolean
  operator: CompareOperator
  value: string
}

export type CriteriaGroupDraft = {
  kind: "group"
  key: string
  logic: CriteriaLogic
  conditions: CriteriaNodeDraft[]
}

export type CriteriaNodeDraft = CriteriaLeafDraft | CriteriaGroupDraft

let draftSeq = 0

export function newDraftKey(prefix = "item") {
  draftSeq += 1
  return `${prefix}-${draftSeq}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyLeaf(): CriteriaLeafDraft {
  return {
    kind: "leaf",
    key: newDraftKey("condition"),
    field: "",
    customField: false,
    operator: "eq",
    value: "",
  }
}

export function emptyGroup(logic: CriteriaLogic = "AND"): CriteriaGroupDraft {
  return {
    kind: "group",
    key: newDraftKey("group"),
    logic,
    conditions: [],
  }
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

export function timezoneOptions(current?: string) {
  const values = new Set<string>(commonTimezones)
  const extra = current?.trim() || browserTimezone()
  if (extra) {
    values.add(extra)
  }
  return [...values].sort((left, right) => left.localeCompare(right))
}

export function emptyTrigger(): TriggerDraft {
  return {
    kind: "created",
    changed: [],
    preset: "daily",
    hour: "09",
    minute: "00",
    cron: "0 9 * * *",
    timezone: browserTimezone(),
  }
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0")
}

function cronFromDraft(draft: TriggerDraft) {
  const hour = Number.parseInt(draft.hour, 10)
  const minute = Number.parseInt(draft.minute, 10)
  const safeHour = Number.isFinite(hour) ? hour : 9
  const safeMinute = Number.isFinite(minute) ? minute : 0
  switch (draft.preset) {
    case "hourly":
      return "0 * * * *"
    case "daily":
      return `${safeMinute} ${safeHour} * * *`
    case "weekly":
      return `${safeMinute} ${safeHour} * * 1`
    case "custom":
      return draft.cron.trim() || "0 9 * * *"
  }
}

function draftFromCron(
  cron: string
): Pick<TriggerDraft, "preset" | "hour" | "minute" | "cron"> {
  const parts = cron.trim().split(/\s+/)
  if (parts.length === 5) {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
    if (
      minute === "0" &&
      hour === "*" &&
      dayOfMonth === "*" &&
      month === "*" &&
      dayOfWeek === "*"
    ) {
      return { preset: "hourly", hour: "09", minute: "00", cron }
    }
    if (
      dayOfMonth === "*" &&
      month === "*" &&
      /^\d+$/.test(minute) &&
      /^\d+$/.test(hour)
    ) {
      if (dayOfWeek === "*") {
        return {
          preset: "daily",
          hour: padTimePart(Number(hour)),
          minute: padTimePart(Number(minute)),
          cron,
        }
      }
      if (dayOfWeek === "1") {
        return {
          preset: "weekly",
          hour: padTimePart(Number(hour)),
          minute: padTimePart(Number(minute)),
          cron,
        }
      }
    }
  }
  return {
    preset: "custom",
    hour: "09",
    minute: "00",
    cron: cron.trim() || "0 9 * * *",
  }
}

function asTriggerOn(value: unknown): TriggerOn | undefined {
  return triggerOnValues.includes(value as TriggerOn)
    ? (value as TriggerOn)
    : undefined
}

export function triggerFromApi(
  trigger: WorkflowTrigger | undefined
): TriggerDraft {
  const draft = emptyTrigger()
  if (!trigger) {
    return draft
  }
  const on = Array.isArray(trigger.on)
    ? trigger.on.flatMap((item) => {
        const event = asTriggerOn(item)
        return event ? [event] : []
      })
    : []
  const hasCreated = on.includes("created") || on.length === 0
  const hasUpdated = on.includes("updated")
  const hasSchedule = on.includes("schedule")
  if (hasSchedule) {
    const fromCron = draftFromCron(trigger.cron ?? "")
    return {
      ...draft,
      kind: "schedule",
      ...fromCron,
      timezone: trigger.timezone?.trim() || draft.timezone,
    }
  }
  return {
    ...draft,
    kind:
      hasCreated && hasUpdated
        ? "created_updated"
        : hasUpdated
          ? "updated"
          : "created",
    changed: Array.isArray(trigger.changed)
      ? trigger.changed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim() !== ""
        )
      : [],
  }
}

export function triggerToApi(draft: TriggerDraft): WorkflowTrigger {
  if (draft.kind === "schedule") {
    return {
      on: ["schedule"],
      cron: cronFromDraft(draft),
      timezone: draft.timezone.trim() || browserTimezone(),
    }
  }
  const on: TriggerOn[] =
    draft.kind === "created_updated"
      ? ["created", "updated"]
      : draft.kind === "updated"
        ? ["updated"]
        : ["created"]
  const changed = on.includes("updated")
    ? draft.changed.map((item) => item.trim()).filter(Boolean)
    : []
  return changed.length > 0 ? { on, changed } : { on }
}

function formatClock(hour: string, minute: string) {
  const parsedHour = Number.parseInt(hour, 10)
  const parsedMinute = Number.parseInt(minute, 10)
  const safeHour = Number.isFinite(parsedHour) ? parsedHour : 9
  const safeMinute = Number.isFinite(parsedMinute) ? parsedMinute : 0
  const period = safeHour >= 12 ? "PM" : "AM"
  const hour12 = safeHour % 12 === 0 ? 12 : safeHour % 12
  return `${hour12}:${padTimePart(safeMinute)} ${period}`
}

export function triggerSummary(
  trigger: WorkflowTrigger | undefined,
  fields?: JsonSchemaProperty[]
): string {
  const draft = triggerFromApi(trigger)
  if (draft.kind === "schedule") {
    const zone =
      draft.timezone.split("/").at(-1)?.replaceAll("_", " ") ?? draft.timezone
    if (draft.preset === "hourly") {
      return "Every hour"
    }
    if (draft.preset === "daily") {
      return `Every day at ${formatClock(draft.hour, draft.minute)} ${zone}`
    }
    if (draft.preset === "weekly") {
      return `Every Monday at ${formatClock(draft.hour, draft.minute)} ${zone}`
    }
    return `Cron ${draft.cron}`
  }
  if (draft.kind === "created") {
    return "When a record is created"
  }
  if (draft.kind === "created_updated") {
    if (draft.changed.length === 1) {
      return `When a record is created or ${fieldSummaryLabel(draft.changed[0], fields)} changes`
    }
    if (draft.changed.length > 1) {
      return "When a record is created or selected fields change"
    }
    return "When a record is created or updated"
  }
  if (draft.changed.length === 1) {
    return `When ${fieldSummaryLabel(draft.changed[0], fields)} changes`
  }
  if (draft.changed.length > 1) {
    return "When selected fields change"
  }
  return "When a record is updated"
}

function fieldSummaryLabel(name: string, fields?: JsonSchemaProperty[]) {
  const match = fields?.find((field) => field.name === name)
  if (match) {
    return columnLabel(match)
  }
  return propertyLabel(name)
}

export const operatorLabels: Record<CompareOperator, string> = {
  eq: "is",
  neq: "is not",
  gt: "is greater than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  in: "is one of",
}

export const logicLabels: Record<CriteriaLogic, string> = {
  AND: "All of these match",
  OR: "Any of these match",
  NOT: "None of these match",
}

function asObject(value: unknown): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject
  }
  return undefined
}

function asCompareOperator(value: unknown): CompareOperator {
  return compareOperators.includes(value as CompareOperator)
    ? (value as CompareOperator)
    : "eq"
}

function asLogic(value: unknown): CriteriaLogic {
  return criteriaLogics.includes(value as CriteriaLogic)
    ? (value as CriteriaLogic)
    : "AND"
}

function stringifyValue(value: unknown) {
  if (value == null) {
    return ""
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ")
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  return String(value)
}

function parseValue(
  raw: string,
  operator: CompareOperator,
  field?: JsonSchemaProperty
): JsonValue {
  if (operator === "in") {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => coerceScalar(item, field))
  }
  return coerceScalar(raw, field)
}

function coerceScalar(raw: string, field?: JsonSchemaProperty): JsonValue {
  const value = raw.trim()
  if (field?.type === "boolean") {
    return value === "true"
  }
  if (
    field?.type === "number" ||
    (!field && value !== "" && Number.isFinite(Number(value)))
  ) {
    const parsed = Number.parseFloat(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return raw
}

export function hasCriteria(criteria?: WorkflowCriteria) {
  if (!criteria) {
    return false
  }
  if (criteria.logic) {
    return true
  }
  return Boolean(criteria.field && criteria.operator)
}

export function countCriteriaLeaves(criteria?: WorkflowCriteria): number {
  if (!criteria) {
    return 0
  }
  if (criteria.logic) {
    return (criteria.conditions ?? []).reduce(
      (total, child) => total + countCriteriaLeaves(child),
      0
    )
  }
  return criteria.field ? 1 : 0
}

export function stringifyWorkflowValue(value: unknown) {
  if (value == null) {
    return "empty"
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ")
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  return String(value)
}

export function criteriaFromApi(
  criteria: WorkflowCriteria | undefined
): CriteriaGroupDraft {
  if (!criteria || !hasCriteria(criteria)) {
    return emptyGroup()
  }
  const node = criteriaNodeFromApi(criteria)
  if (node.kind === "group") {
    return node
  }
  return {
    kind: "group",
    key: newDraftKey("group"),
    logic: "AND",
    conditions: [node],
  }
}

function criteriaNodeFromApi(criteria: WorkflowCriteria): CriteriaNodeDraft {
  if (criteria.logic) {
    const children = (criteria.conditions ?? []).map(criteriaNodeFromApi)
    if (
      criteria.logic === "NOT" &&
      children.length === 1 &&
      children[0]?.kind === "group"
    ) {
      return {
        kind: "group",
        key: newDraftKey("group"),
        logic: "NOT",
        conditions: children[0].conditions,
      }
    }
    return {
      kind: "group",
      key: newDraftKey("group"),
      logic: asLogic(criteria.logic),
      conditions: children,
    }
  }

  const knownField = Boolean(criteria.field)
  return {
    kind: "leaf",
    key: newDraftKey("condition"),
    field: criteria.field ?? "",
    customField: knownField && criteria.field?.includes(".") === true,
    operator: asCompareOperator(criteria.operator),
    value: stringifyValue(criteria.value),
  }
}

export function criteriaToApi(
  group: CriteriaGroupDraft,
  fields: JsonSchemaProperty[]
): WorkflowCriteria | undefined {
  const node = criteriaNodeToApi(group, fields)
  return node
}

function criteriaNodeToApi(
  node: CriteriaNodeDraft,
  fields: JsonSchemaProperty[]
): WorkflowCriteria | undefined {
  if (node.kind === "leaf") {
    const field = node.field.trim()
    if (!field) {
      return undefined
    }
    const property = fields.find((item) => item.name === field)
    return {
      field,
      operator: node.operator,
      value: parseValue(node.value, node.operator, property),
    }
  }

  const conditions = node.conditions
    .map((child) => criteriaNodeToApi(child, fields))
    .filter((child): child is WorkflowCriteria => Boolean(child))

  if (conditions.length === 0) {
    return undefined
  }

  if (node.logic === "NOT") {
    return {
      logic: "NOT",
      conditions:
        conditions.length === 1 ? conditions : [{ logic: "AND", conditions }],
    }
  }

  return {
    logic: node.logic,
    conditions,
  }
}

export function workflowNodesToApi(
  levels: PipelineLevelDraft[]
): PipelineNodeConfig[][] | undefined {
  return levelsToApi(levels)?.nodes
}

export function workflowNodesFromApi(
  nodes: PipelineNodeConfig[][] | undefined
): PipelineLevelDraft[] {
  return levelsFromApi(nodes ? { nodes } : undefined)
}

function parseTrigger(value: unknown): WorkflowTrigger {
  const object = asObject(value)
  if (!object) {
    return { on: ["created"] }
  }
  const on = Array.isArray(object.on)
    ? object.on.flatMap((item) => {
        const event = asTriggerOn(item)
        return event ? [event] : []
      })
    : []
  const trigger: WorkflowTrigger = {
    on: on.length > 0 ? on : ["created"],
  }
  if (Array.isArray(object.changed)) {
    const changed = object.changed.filter(
      (item): item is string => typeof item === "string" && item.trim() !== ""
    )
    if (changed.length > 0) {
      trigger.changed = changed
    }
  }
  if (typeof object.cron === "string" && object.cron.trim()) {
    trigger.cron = object.cron.trim()
  }
  if (typeof object.timezone === "string" && object.timezone.trim()) {
    trigger.timezone = object.timezone.trim()
  }
  return trigger
}

export function parseWorkflowDefinition(
  definition: JsonObject | WorkflowDefinitionBody | undefined
): WorkflowDefinitionBody | undefined {
  const object = asObject(definition)
  if (!object) {
    return undefined
  }
  const criteria = asObject(object.criteria) as WorkflowCriteria | undefined
  const nodes = parsePipelineDefinition({ nodes: object.nodes })?.nodes
  if (!nodes?.length) {
    return undefined
  }
  return {
    trigger: parseTrigger(object.trigger),
    criteria: (criteria ?? {}) as WorkflowCriteria,
    nodes,
  }
}

export function workflowNodeCount(body?: WorkflowDefinitionBody) {
  if (!body?.nodes) {
    return 0
  }
  return pipelineNodeCount({ nodes: body.nodes })
}

export function workflowRuleSentence(
  trigger: WorkflowTrigger | undefined,
  criteria: WorkflowCriteria | undefined,
  nodeCount: number,
  fields?: JsonSchemaProperty[]
) {
  const conditionCount = countCriteriaLeaves(criteria)
  return `${triggerSummary(trigger, fields)}${
    conditionCount > 0 ? ` · ${criteriaSummary(criteria, fields)}.` : "."
  }${
    nodeCount > 0
      ? ` Then ${nodeCount} ${nodeCount === 1 ? "node" : "nodes"} run level by level.`
      : ""
  }`
}

export function workflowDraftSentence(
  trigger: TriggerDraft,
  criteria: CriteriaGroupDraft,
  levels: PipelineLevelDraft[],
  fields: JsonSchemaProperty[]
) {
  const nodeCount = levels.reduce((count, level) => count + level.nodes.length, 0)
  return workflowRuleSentence(
    triggerToApi(trigger),
    criteriaToApi(criteria, fields),
    nodeCount,
    fields
  )
}

export function workflowColumnNames(
  definition: JsonObject | WorkflowDefinitionBody | undefined
): string[] {
  const parsed = parseWorkflowDefinition(definition)
  if (!parsed) {
    return []
  }
  const names = new Set<string>()
  for (const field of parsed.trigger.changed ?? []) {
    const name = field.trim()
    if (name) {
      names.add(name)
    }
  }
  collectCriteriaFields(parsed.criteria, names)
  return [...names]
}

function collectCriteriaFields(
  criteria: WorkflowCriteria | undefined,
  names: Set<string>
) {
  if (!criteria) {
    return
  }
  if (typeof criteria.field === "string") {
    const name = criteria.field.trim()
    if (name) {
      names.add(name)
    }
  }
  for (const condition of criteria.conditions ?? []) {
    collectCriteriaFields(condition, names)
  }
}

export function workflowSummary(
  definition: JsonObject,
  fields?: JsonSchemaProperty[]
): string {
  const parsed = parseWorkflowDefinition(definition)
  if (parsed) {
    const nodeCount = workflowNodeCount(parsed)
    const conditions = criteriaSummary(parsed.criteria, fields)
    const nodes = pipelineSummary({ nodes: parsed.nodes })
    return `${triggerSummary(parsed.trigger, fields)} · ${conditions} · ${nodeCount} ${nodeCount === 1 ? "node" : "nodes"} · ${nodes}`
  }
  return "Workflow"
}

export function criteriaSummary(
  criteria: WorkflowCriteria | undefined,
  fields?: JsonSchemaProperty[]
): string {
  if (!criteria) {
    return "No conditions"
  }
  if (criteria.logic) {
    const count = criteria.conditions?.length ?? 0
    if (criteria.logic === "AND") {
      return count === 1
        ? "All 1 condition matches"
        : `All ${count} conditions match`
    }
    if (criteria.logic === "OR") {
      return count === 1
        ? "1 condition matches"
        : `Any of ${count} conditions match`
    }
    return "None of the conditions match"
  }
  if (criteria.field && criteria.operator) {
    return `${fieldSummaryLabel(criteria.field, fields)} ${operatorLabels[asCompareOperator(criteria.operator)]} ${stringifyValue(criteria.value)}`
  }
  return "No conditions"
}

export function recordFieldTemplate(field: string) {
  return `{{ .Record.data.${field} }}`
}

export const recordIDTemplate = "{{ .Record.id }}"

export function contextFieldTemplate(field: string) {
  return `{{ .Context.data.${field} }}`
}

export const contextIDTemplate = "{{ .Context.id }}"

export const nowTemplate = "{{ now }}"

export function addFieldTemplate(field: string) {
  return `{{ add .Record.data.${field} 1 }}`
}

export function addContextFieldTemplate(field: string) {
  return `{{ add .Context.data.${field} 1 }}`
}

export function addContextAndRecordTemplate(
  contextField: string,
  recordField: string
) {
  return `{{ add .Context.data.${contextField} .Record.data.${recordField} }}`
}

export function schemaFieldOptions(definition: JsonObject | undefined) {
  return definition ? getJsonSchemaProperties(definition) : []
}
