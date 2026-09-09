import {
  getJsonSchemaProperties,
  type JsonObject,
  type JsonSchemaProperty,
} from "@/lib/json-definition"

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
  value?: unknown
}

export const workflowActionTypes = [
  "CREATE_RECORD",
  "UPDATE_RECORD",
  "UPSERT_RECORD",
  "TRIGGER_PIPELINE",
] as const

export type WorkflowActionType = (typeof workflowActionTypes)[number]

export type WorkflowAction = {
  type: WorkflowActionType
  context: Record<string, unknown>
}

export type WorkflowDefinitionBody = {
  trigger: WorkflowTrigger
  criteria: WorkflowCriteria
  actions: WorkflowAction[]
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

export type DataEntryDraft = {
  key: string
  name: string
  value: string
}

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

export type ActionDraft = {
  key: string
  type: WorkflowActionType
  schemaId: string
  recordId: string
  pipeline: string
  data: DataEntryDraft[]
}

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

export function emptyDataEntry(name = ""): DataEntryDraft {
  return {
    key: newDraftKey("data"),
    name,
    value: "",
  }
}

export function emptyAction(
  type: WorkflowActionType = "CREATE_RECORD"
): ActionDraft {
  return {
    key: newDraftKey("action"),
    type,
    schemaId: "",
    recordId: "",
    pipeline: "",
    data: [emptyDataEntry()],
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

function draftFromCron(cron: string): Pick<
  TriggerDraft,
  "preset" | "hour" | "minute" | "cron"
> {
  const parts = cron.trim().split(/\s+/)
  if (parts.length === 5) {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
    if (minute === "0" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      return { preset: "hourly", hour: "09", minute: "00", cron }
    }
    if (dayOfMonth === "*" && month === "*" && /^\d+$/.test(minute) && /^\d+$/.test(hour)) {
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
  return { preset: "custom", hour: "09", minute: "00", cron: cron.trim() || "0 9 * * *" }
}

function asTriggerOn(value: unknown): TriggerOn | undefined {
  return triggerOnValues.includes(value as TriggerOn)
    ? (value as TriggerOn)
    : undefined
}

export function triggerFromApi(trigger: WorkflowTrigger | undefined): TriggerDraft {
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
    kind: hasCreated && hasUpdated ? "created_updated" : hasUpdated ? "updated" : "created",
    changed: Array.isArray(trigger.changed)
      ? trigger.changed.filter((item): item is string => typeof item === "string" && item.trim() !== "")
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
  const changed =
    on.includes("updated")
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

export function triggerSummary(trigger: WorkflowTrigger | undefined): string {
  const draft = triggerFromApi(trigger)
  if (draft.kind === "schedule") {
    const zone = draft.timezone.split("/").at(-1)?.replaceAll("_", " ") ?? draft.timezone
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
      return `When a record is created or ${draft.changed[0]} changes`
    }
    if (draft.changed.length > 1) {
      return "When a record is created or selected fields change"
    }
    return "When a record is created or updated"
  }
  if (draft.changed.length === 1) {
    return `When ${draft.changed[0]} changes`
  }
  if (draft.changed.length > 1) {
    return "When selected fields change"
  }
  return "When a record is updated"
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

export const actionTypeLabels: Record<WorkflowActionType, string> = {
  CREATE_RECORD: "Create a record",
  UPDATE_RECORD: "Update a record",
  UPSERT_RECORD: "Create or update a record",
  TRIGGER_PIPELINE: "Run a pipeline",
}

export const actionTypeDescriptions: Record<WorkflowActionType, string> = {
  CREATE_RECORD: "Make a new record when this workflow runs.",
  UPDATE_RECORD: "Change fields on an existing record. You can read that record's current values while updating it.",
  UPSERT_RECORD: "Update the record if it exists, otherwise create it. Updates can read the existing record's current values.",
  TRIGGER_PIPELINE: "Send data into a pipeline.",
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined
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

function asActionType(value: unknown): WorkflowActionType {
  return workflowActionTypes.includes(value as WorkflowActionType)
    ? (value as WorkflowActionType)
    : "CREATE_RECORD"
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
): unknown {
  if (operator === "in") {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => coerceScalar(item, field))
  }
  return coerceScalar(raw, field)
}

function coerceScalar(raw: string, field?: JsonSchemaProperty): unknown {
  const value = raw.trim()
  if (field?.type === "boolean") {
    return value === "true"
  }
  if (
    field?.type === "integer" ||
    field?.type === "number" ||
    (!field && value !== "" && Number.isFinite(Number(value)))
  ) {
    const parsed =
      field?.type === "integer"
        ? Number.parseInt(value, 10)
        : Number.parseFloat(value)
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

export function actionDataEntries(action: WorkflowAction): [string, unknown][] {
  const source =
    action.type === "TRIGGER_PIPELINE"
      ? action.context.input
      : action.context.data
  if (source && typeof source === "object" && !Array.isArray(source)) {
    return Object.entries(source as Record<string, unknown>)
  }
  return []
}

export function criteriaFromApi(
  criteria: WorkflowCriteria | undefined
): CriteriaGroupDraft {
  if (!hasCriteria(criteria)) {
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

function entriesFromRecord(record: unknown): DataEntryDraft[] {
  const object = asObject(record)
  if (!object) {
    return [emptyDataEntry()]
  }
  const entries = Object.entries(object).map(([name, value]) => ({
    key: newDraftKey("data"),
    name,
    value: stringifyValue(value),
  }))
  return entries.length > 0 ? entries : [emptyDataEntry()]
}

function recordFromEntries(entries: DataEntryDraft[]) {
  const data: Record<string, unknown> = {}
  for (const entry of entries) {
    const name = entry.name.trim()
    if (!name) {
      continue
    }
    data[name] = entry.value
  }
  return data
}

export function actionsFromApi(
  actions: WorkflowAction[] | undefined
): ActionDraft[] {
  if (!actions || actions.length === 0) {
    return []
  }

  return actions.map((action) => {
    const context = asObject(action.context) ?? {}
    return {
      key: newDraftKey("action"),
      type: asActionType(action.type),
      schemaId: asString(context.schemaId) ?? "",
      recordId: asString(context.recordId) ?? "",
      pipeline: asString(context.pipeline) ?? "",
      data: entriesFromRecord(
        action.type === "TRIGGER_PIPELINE" ? context.input : context.data
      ),
    }
  })
}

export function actionsToApi(actions: ActionDraft[]): WorkflowAction[] {
  return actions.flatMap((action) => {
    const data = recordFromEntries(action.data)
    switch (action.type) {
      case "CREATE_RECORD":
        if (!action.schemaId) {
          return []
        }
        return [
          {
            type: action.type,
            context: { schemaId: action.schemaId, data },
          },
        ]
      case "UPDATE_RECORD":
        if (!action.recordId.trim()) {
          return []
        }
        return [
          {
            type: action.type,
            context: {
              ...(action.schemaId ? { schemaId: action.schemaId } : {}),
              recordId: action.recordId.trim(),
              data,
            },
          },
        ]
      case "UPSERT_RECORD":
        if (!action.schemaId) {
          return []
        }
        return [
          {
            type: action.type,
            context: {
              schemaId: action.schemaId,
              ...(action.recordId.trim()
                ? { recordId: action.recordId.trim() }
                : {}),
              data,
            },
          },
        ]
      case "TRIGGER_PIPELINE":
        if (!action.pipeline.trim()) {
          return []
        }
        return [
          {
            type: action.type,
            context: { pipeline: action.pipeline.trim(), input: data },
          },
        ]
    }
  })
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
  const actions = Array.isArray(object.actions)
    ? object.actions.flatMap((item) => {
        const action = asObject(item)
        const type = asActionType(action?.type)
        if (!action || !workflowActionTypes.includes(type)) {
          return []
        }
        return [
          {
            type,
            context: asObject(action.context) ?? {},
          },
        ]
      })
    : []
  if (!criteria && actions.length === 0) {
    return undefined
  }
  return {
    trigger: parseTrigger(object.trigger),
    criteria: (criteria ?? {}) as WorkflowCriteria,
    actions,
  }
}

export function workflowRuleSentence(
  trigger: WorkflowTrigger | undefined,
  criteria: WorkflowCriteria | undefined,
  actionCount: number
) {
  const conditionCount = countCriteriaLeaves(criteria)
  return `${triggerSummary(trigger)}${
    conditionCount > 0 ? ` · ${criteriaSummary(criteria)}.` : "."
  }${
    actionCount > 0
      ? ` Then ${actionCount} ${actionCount === 1 ? "action" : "actions"} run in order.`
      : ""
  }`
}

export function workflowDraftSentence(
  trigger: TriggerDraft,
  criteria: CriteriaGroupDraft,
  actions: ActionDraft[],
  fields: JsonSchemaProperty[]
) {
  return workflowRuleSentence(
    triggerToApi(trigger),
    criteriaToApi(criteria, fields),
    actions.length
  )
}

export function workflowSummary(definition: JsonObject): string {
  const parsed = parseWorkflowDefinition(definition)
  if (parsed) {
    const actionCount = parsed.actions.length
    const conditions = criteriaSummary(parsed.criteria)
    return `${triggerSummary(parsed.trigger)} · ${conditions} · ${actionCount} ${actionCount === 1 ? "action" : "actions"}`
  }
  return "Workflow definition"
}

export function criteriaSummary(
  criteria: WorkflowCriteria | undefined
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
    return `${criteria.field} ${operatorLabels[asCompareOperator(criteria.operator)]} ${stringifyValue(criteria.value)}`
  }
  return "No conditions"
}

export function actionSummary(action: WorkflowAction): string {
  return actionTypeLabels[asActionType(action.type)]
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
