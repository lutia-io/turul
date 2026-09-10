import type { JsonObject, JsonValue } from "@/lib/json-definition"

export const nodeTypes = [
  "NOOP",
  "HTTP",
  "MAPPER",
  "LIST_MAPPER",
  "FILE",
  "RECORD",
] as const

export type NodeType = (typeof nodeTypes)[number]

export const nodeTypeLabels: Record<NodeType, string> = {
  NOOP: "No-op",
  HTTP: "HTTP",
  MAPPER: "Mapper",
  LIST_MAPPER: "List mapper",
  FILE: "File",
  RECORD: "Record API",
}

export const executableNodeTypes = new Set<NodeType>(nodeTypes)

export const nowTemplate = "{{ now }}"

export const pipelineInputTemplate = "{{ .Input }}"

export function pipelineInputFieldTemplate(path = "") {
  return path ? `{{ .Input.${path} }}` : "{{ .Input. }}"
}

export function pipelineOutputTemplate(index: number) {
  return `{{ .Input.${index} }}`
}

export function listItemTemplate(alias: string, path = "") {
  const name = alias.trim() || "item"
  return path ? `{{ .${name}.${path} }}` : `{{ .${name} }}`
}

export type PipelineTemplateContext = {
  levelIndex: number
  previousOutputs: { index: number; label: string }[]
}

export function pipelineTemplateContextForLevel(
  levelIndex: number,
  previousNodes: { name: string }[]
): PipelineTemplateContext {
  return {
    levelIndex,
    previousOutputs: previousNodes.map((node, index) => ({
      index,
      label: node.name.trim() || `Output ${index}`,
    })),
  }
}

export const httpMethods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
] as const

export type HttpMethod = (typeof httpMethods)[number]

export const fileOperations = ["READ", "WRITE"] as const
export type FileOperation = (typeof fileOperations)[number]

export const recordOperations = [
  "LIST",
  "GET",
  "CREATE",
  "UPDATE",
  "UPSERT",
] as const
export type RecordOperation = (typeof recordOperations)[number]

export const recordFilterOps = [
  "eq",
  "contains",
  "startsWith",
  "empty",
  "gte",
  "lte",
] as const
export type RecordFilterOp = (typeof recordFilterOps)[number]

export const recordOperationLabels: Record<RecordOperation, string> = {
  LIST: "List records",
  GET: "Get a record",
  CREATE: "Create a record",
  UPDATE: "Update a record",
  UPSERT: "Create or update a record",
}

export const recordFilterOpLabels: Record<RecordFilterOp, string> = {
  eq: "is",
  contains: "contains",
  startsWith: "starts with",
  empty: "is empty",
  gte: "is at least",
  lte: "is at most",
}

export type NodeDefinitionBody = JsonObject

export type MappingEntry = {
  key: string
  name: string
  value: string
}

export type RecordFilterDraft = {
  key: string
  field: string
  op: RecordFilterOp
  value: string
}

function asObject(value: unknown): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject
  }
  return undefined
}

let draftSeq = 0

export function newDraftKey(prefix = "field") {
  draftSeq += 1
  return `${prefix}-${draftSeq}`
}

export function emptyMappingEntry(): MappingEntry {
  return { key: newDraftKey("map"), name: "", value: "" }
}

export function mappingEntriesFromObject(mapping?: JsonObject): MappingEntry[] {
  const entries = Object.entries(mapping ?? {}).map(([name, value]) => ({
    key: newDraftKey("map"),
    name,
    value:
      typeof value === "string"
        ? value
        : value == null
          ? ""
          : JSON.stringify(value),
  }))
  return entries.length > 0 ? entries : [emptyMappingEntry()]
}

export function mappingObjectFromEntries(entries: MappingEntry[]): JsonObject {
  const out: JsonObject = {}
  for (const entry of entries) {
    const name = entry.name.trim()
    if (!name) {
      continue
    }
    out[name] = entry.value
  }
  return out
}

export function defaultDefinition(type: NodeType): JsonObject {
  switch (type) {
    case "NOOP":
      return { message: "ok" }
    case "HTTP":
      return {
        method: "GET",
        url: "https://example.com",
        headers: {},
      }
    case "MAPPER":
      return { mapping: {} }
    case "LIST_MAPPER":
      return {
        from: "{{ .Input.0.records }}",
        as: "item",
        mapping: {},
      }
    case "FILE":
      return {
        operation: "WRITE",
        filename: "",
        contentType: "text/plain",
        content: "",
      }
    case "RECORD":
      return { operation: "LIST", schemaId: "", filters: [], data: {} }
  }
}

export function isNodeType(value: string): value is NodeType {
  return nodeTypes.includes(value as NodeType)
}

export function isHttpMethod(value: string): value is HttpMethod {
  return httpMethods.includes(value as HttpMethod)
}

export function isFileOperation(value: string): value is FileOperation {
  return fileOperations.includes(value as FileOperation)
}

export function isRecordOperation(value: string): value is RecordOperation {
  return recordOperations.includes(value as RecordOperation)
}

export function isRecordFilterOp(value: string): value is RecordFilterOp {
  return recordFilterOps.includes(value as RecordFilterOp)
}

export function nodeTypeLabel(type: string) {
  return isNodeType(type) ? nodeTypeLabels[type] : type
}

export function nodeConfigSummary(type: string, definition: JsonObject) {
  if (type === "HTTP") {
    const draft = httpDraftFromDefinition(definition)
    const url = draft.url.trim()
    return url ? `${draft.method} ${url}` : draft.method
  }
  if (type === "NOOP") {
    const message =
      typeof definition.message === "string" ? definition.message.trim() : ""
    return message || "Returns a message"
  }
  if (type === "MAPPER") {
    const mapping = asObject(definition.mapping)
    const count = mapping ? Object.keys(mapping).length : 0
    return count === 1 ? "1 mapped field" : `${count} mapped fields`
  }
  if (type === "LIST_MAPPER") {
    const mapping = asObject(definition.mapping)
    const count = mapping ? Object.keys(mapping).length : 0
    const alias =
      typeof definition.as === "string" && definition.as.trim()
        ? definition.as.trim()
        : "item"
    return count === 1
      ? `Maps each ${alias}`
      : `Maps each ${alias} · ${count} fields`
  }
  if (type === "FILE") {
    const operation =
      typeof definition.operation === "string" ? definition.operation : "FILE"
    const filename =
      typeof definition.filename === "string" ? definition.filename.trim() : ""
    if (operation === "WRITE" && filename) {
      return `WRITE ${filename}`
    }
    return operation
  }
  if (type === "RECORD") {
    const operation =
      typeof definition.operation === "string" &&
      isRecordOperation(definition.operation)
        ? recordOperationLabels[definition.operation]
        : "Record API"
    return operation
  }
  return nodeTypeLabel(type)
}

export type HttpDefinitionDraft = {
  method: HttpMethod
  url: string
  headersText: string
  bodyText: string
}

export function httpDraftFromDefinition(
  definition: JsonObject
): HttpDefinitionDraft {
  const method =
    typeof definition.method === "string" && isHttpMethod(definition.method)
      ? definition.method
      : "GET"
  const url = typeof definition.url === "string" ? definition.url : ""
  const headers = asObject(definition.headers) ?? {}
  const body = definition.body
  return {
    method,
    url,
    headersText: JSON.stringify(headers, null, 2),
    bodyText:
      body === undefined
        ? ""
        : typeof body === "string"
          ? body
          : JSON.stringify(body, null, 2),
  }
}

export function httpDefinitionFromDraft(draft: HttpDefinitionDraft): {
  definition?: JsonObject
  error?: string
} {
  let headers: JsonObject = {}
  if (draft.headersText.trim()) {
    try {
      const parsed = JSON.parse(draft.headersText) as unknown
      const object = asObject(parsed)
      if (!object) {
        return { error: "Headers must be a JSON object" }
      }
      headers = object
    } catch {
      return { error: "Headers must be valid JSON" }
    }
  }

  let body: JsonValue | undefined
  if (draft.bodyText.trim()) {
    try {
      body = JSON.parse(draft.bodyText) as JsonValue
    } catch {
      return { error: "Body must be valid JSON" }
    }
  }

  const definition: JsonObject = {
    method: draft.method,
    url: draft.url.trim(),
  }
  if (Object.keys(headers).length > 0) {
    definition.headers = headers
  }
  if (body !== undefined) {
    definition.body = body
  }
  return { definition }
}

export type FileDefinitionDraft = {
  operation: FileOperation
  fileId: string
  filename: string
  contentType: string
  content: string
}

export function fileDraftFromDefinition(
  definition: JsonObject
): FileDefinitionDraft {
  const operation =
    typeof definition.operation === "string" &&
    isFileOperation(definition.operation)
      ? definition.operation
      : "WRITE"
  return {
    operation,
    fileId: typeof definition.fileId === "string" ? definition.fileId : "",
    filename:
      typeof definition.filename === "string" ? definition.filename : "",
    contentType:
      typeof definition.contentType === "string" && definition.contentType
        ? definition.contentType
        : "text/plain",
    content: typeof definition.content === "string" ? definition.content : "",
  }
}

export function fileDefinitionFromDraft(
  draft: FileDefinitionDraft
): JsonObject {
  const definition: JsonObject = { operation: draft.operation }
  if (draft.operation === "READ") {
    definition.fileId = draft.fileId
    return definition
  }
  definition.filename = draft.filename
  if (draft.contentType.trim()) {
    definition.contentType = draft.contentType.trim()
  }
  definition.content = draft.content
  return definition
}

export type RecordDefinitionDraft = {
  operation: RecordOperation
  schemaId: string
  recordId: string
  filters: RecordFilterDraft[]
  data: MappingEntry[]
}

export function emptyRecordFilter(): RecordFilterDraft {
  return { key: newDraftKey("filter"), field: "", op: "eq", value: "" }
}

export function recordDraftFromDefinition(
  definition: JsonObject
): RecordDefinitionDraft {
  const operation =
    typeof definition.operation === "string" &&
    isRecordOperation(definition.operation)
      ? definition.operation
      : "LIST"
  const filters: RecordFilterDraft[] = []
  if (Array.isArray(definition.filters)) {
    for (const item of definition.filters) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        continue
      }
      const filter = item as { field?: unknown; op?: unknown; value?: unknown }
      filters.push({
        key: newDraftKey("filter"),
        field: typeof filter.field === "string" ? filter.field : "",
        op:
          typeof filter.op === "string" && isRecordFilterOp(filter.op)
            ? filter.op
            : "eq",
        value: typeof filter.value === "string" ? filter.value : "",
      })
    }
  }
  return {
    operation,
    schemaId:
      typeof definition.schemaId === "string" ? definition.schemaId : "",
    recordId:
      typeof definition.recordId === "string" ? definition.recordId : "",
    filters: filters.length > 0 ? filters : [emptyRecordFilter()],
    data: mappingEntriesFromObject(asObject(definition.data)),
  }
}

export function recordDefinitionFromDraft(
  draft: RecordDefinitionDraft
): JsonObject {
  const definition: JsonObject = { operation: draft.operation }
  if (
    draft.operation === "LIST" ||
    draft.operation === "CREATE" ||
    draft.operation === "UPSERT"
  ) {
    definition.schemaId = draft.schemaId
  }
  if (
    draft.operation === "GET" ||
    draft.operation === "UPDATE" ||
    draft.operation === "UPSERT"
  ) {
    definition.recordId = draft.recordId
  }
  if (draft.operation === "LIST") {
    const filters = draft.filters
      .map((filter) => {
        const field = filter.field.trim()
        if (!field) {
          return null
        }
        const item: JsonObject = { field, op: filter.op }
        if (filter.op !== "empty") {
          item.value = filter.value
        }
        return item
      })
      .filter((item): item is JsonObject => item != null)
    if (filters.length > 0) {
      definition.filters = filters
    }
  }
  if (
    draft.operation === "CREATE" ||
    draft.operation === "UPDATE" ||
    draft.operation === "UPSERT"
  ) {
    definition.data = mappingObjectFromEntries(draft.data)
  }
  return definition
}

export type ListMapperDefinitionDraft = {
  from: string
  as: string
  mapping: MappingEntry[]
}

export function listMapperDraftFromDefinition(
  definition: JsonObject
): ListMapperDefinitionDraft {
  return {
    from: typeof definition.from === "string" ? definition.from : "",
    as:
      typeof definition.as === "string" && definition.as.trim()
        ? definition.as.trim()
        : "item",
    mapping: mappingEntriesFromObject(asObject(definition.mapping)),
  }
}

export function listMapperDefinitionFromDraft(
  draft: ListMapperDefinitionDraft
): { definition?: JsonObject; error?: string } {
  const from = draft.from.trim()
  if (!from) {
    return { error: "List source is required" }
  }
  const alias = draft.as.trim() || "item"
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
    return { error: "Item name must be an identifier" }
  }
  if (alias === "Record" || alias === "Context" || alias === "Input") {
    return { error: "Item name is reserved" }
  }
  return {
    definition: {
      from,
      as: alias,
      mapping: mappingObjectFromEntries(draft.mapping),
    },
  }
}
