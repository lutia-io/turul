import type { StoredFile } from "@/data/files"
import type { StoredRecord } from "@/data/files"
import { records } from "@/data/records"
import { getSchema } from "@/data/networks"
import {
  getJsonSchemaProperties,
  getRecordFileIds,
  type JsonObject,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function cellSearchText(value: JsonValue | undefined): string {
  if (value == null) {
    return ""
  }

  if (Array.isArray(value)) {
    return value.map((item) => cellSearchText(item)).join(" ")
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return String(value)
}

export function formatCellValue(
  value: JsonValue | undefined,
  property: JsonSchemaProperty
) {
  if (value == null || value === "") {
    return ""
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ")
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (typeof value === "number") {
    if (property.name.toLowerCase().includes("cents")) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value / 100)
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (typeof value === "string" && property.format === "date") {
    return value
  }

  if (typeof value === "string" && property.format === "date-time") {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date)
    }
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  return value
}

export function compareCellValues(
  left: JsonValue | undefined,
  right: JsonValue | undefined,
  property: JsonSchemaProperty
) {
  const emptyLeft = left == null || left === ""
  const emptyRight = right == null || right === ""

  if (emptyLeft && emptyRight) {
    return 0
  }

  if (emptyLeft) {
    return 1
  }

  if (emptyRight) {
    return -1
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right)
  }

  if (
    typeof left === "string" &&
    typeof right === "string" &&
    (property.format === "date" || property.format === "date-time")
  ) {
    return new Date(left).getTime() - new Date(right).getTime()
  }

  return formatCellValue(left, property).localeCompare(
    formatCellValue(right, property),
    undefined,
    { numeric: true, sensitivity: "base" }
  )
}

export function recordMatchesQuery(
  record: StoredRecord,
  query: string,
  properties: JsonSchemaProperty[],
  filesById: Map<string, StoredFile>
) {
  const needle = query.trim().toLowerCase()

  if (!needle) {
    return true
  }

  const haystack = [
    record.id,
    record.organizationId,
    ...properties.map((property) => {
      const value = record.data[property.name]

      if (property.format === "file" && typeof value === "string") {
        return filesById.get(value)?.filename ?? value
      }

      return cellSearchText(value)
    }),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(needle)
}

export function uniqueColumnValues(
  rows: StoredRecord[],
  property: JsonSchemaProperty,
  filesById: Map<string, StoredFile>
) {
  const values = new Set<string>()

  for (const row of rows) {
    const value = row.data[property.name]

    if (property.format === "file" && typeof value === "string") {
      const filename = filesById.get(value)?.filename
      if (filename) {
        values.add(filename)
      } else if (value) {
        values.add(value)
      }
      continue
    }

    const text = formatCellValue(value, property)
    if (text) {
      values.add(text)
    }
  }

  return [...values].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )
}

export function getRecordDataValue(data: JsonObject, name: string) {
  return data[name]
}

export function recordsReferencingFile(fileId: string) {
  return records.filter((item) => {
    const result = getSchema(item.schemaId)
    if (!result) {
      return false
    }

    return getRecordFileIds(
      item.data,
      getJsonSchemaProperties(result.schema.definition)
    ).includes(fileId)
  })
}
