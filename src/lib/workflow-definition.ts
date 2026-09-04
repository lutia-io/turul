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
  criteria: WorkflowCriteria
  actions: WorkflowAction[]
}

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
    conditions: [emptyLeaf()],
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
  UPDATE_RECORD: "Change fields on an existing record.",
  UPSERT_RECORD: "Update the record if it exists, otherwise create it.",
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

export function criteriaFromApi(
  criteria: WorkflowCriteria | undefined
): CriteriaGroupDraft {
  if (!criteria) {
    return emptyGroup()
  }
  const node = criteriaNodeFromApi(criteria)
  if (node.kind === "group") {
    return node.conditions.length > 0 ? node : emptyGroup(node.logic)
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
        conditions:
          children[0].conditions.length > 0
            ? children[0].conditions
            : [emptyLeaf()],
      }
    }
    return {
      kind: "group",
      key: newDraftKey("group"),
      logic: asLogic(criteria.logic),
      conditions: children.length > 0 ? children : [emptyLeaf()],
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
    return [emptyAction()]
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
    criteria: (criteria ?? {}) as WorkflowCriteria,
    actions,
  }
}

export function workflowSummary(definition: JsonObject): string {
  const parsed = parseWorkflowDefinition(definition)
  if (parsed) {
    const actionCount = parsed.actions.length
    return `${criteriaSummary(parsed.criteria)} · ${actionCount} ${actionCount === 1 ? "action" : "actions"}`
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
        ? "When 1 condition matches"
        : `When all ${count} conditions match`
    }
    if (criteria.logic === "OR") {
      return count === 1
        ? "When 1 condition matches"
        : `When any of ${count} conditions match`
    }
    return "When none of the conditions match"
  }
  if (criteria.field && criteria.operator) {
    return `When ${criteria.field} ${operatorLabels[asCompareOperator(criteria.operator)]} ${stringifyValue(criteria.value)}`
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

export const nowTemplate = "{{ now }}"

export const addTemplate = "{{ add 1 1 }}"

export function addFieldTemplate(field: string) {
  return `{{ add .Record.data.${field} 1 }}`
}

export function schemaFieldOptions(definition: JsonObject | undefined) {
  return definition ? getJsonSchemaProperties(definition) : []
}
