import type { JsonObject, JsonValue } from "@/lib/json-definition"

export const nodeTypes = ["NOOP", "HTTP", "MAPPER", "FILE"] as const

export type NodeType = (typeof nodeTypes)[number]

export const nodeTypeLabels: Record<NodeType, string> = {
  NOOP: "No-op",
  HTTP: "HTTP",
  MAPPER: "Mapper",
  FILE: "File",
}

export const executableNodeTypes = new Set<NodeType>(["NOOP", "HTTP"])

export const nowTemplate = "{{ now }}"

export const pipelineInputTemplate = "{{ .Input }}"

export function pipelineInputFieldTemplate(path = "") {
  return path ? `{{ .Input.${path} }}` : "{{ .Input. }}"
}

export function pipelineOutputTemplate(index: number) {
  return `{{ .Input.${index} }}`
}

export type PipelineTemplateContext = {
  levelIndex: number
  previousOutputs: { index: number; label: string }[]
}

export function pipelineTemplateContextForLevel(
  levelIndex: number,
  previousNodeIds: string[],
  nodeName: (id: string) => string | undefined
): PipelineTemplateContext {
  return {
    levelIndex,
    previousOutputs: previousNodeIds.filter(Boolean).map((id, index) => ({
      index,
      label: nodeName(id) ?? `Output ${index}`,
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

export type NodeDefinitionBody = JsonObject

function asObject(value: unknown): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject
  }
  return undefined
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
    case "FILE":
      return { operation: "READ" }
  }
}

export function isNodeType(value: string): value is NodeType {
  return nodeTypes.includes(value as NodeType)
}

export function isHttpMethod(value: string): value is HttpMethod {
  return httpMethods.includes(value as HttpMethod)
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
  if (type === "FILE") {
    return typeof definition.operation === "string"
      ? definition.operation
      : "File"
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
