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

export type HttpDefinitionDraft = {
  method: HttpMethod
  url: string
  headersText: string
  bodyText: string
}

export function httpDraftFromDefinition(definition: JsonObject): HttpDefinitionDraft {
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

export function httpDefinitionFromDraft(
  draft: HttpDefinitionDraft
): { definition?: JsonObject; error?: string } {
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
