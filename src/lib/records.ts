import type { StoredRecord } from "@/data/files"
import type { Schema } from "@/data/networks"
import {
  getJsonSchemaProperties,
  getRecordFileIds,
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

export function recordsReferencingFile(
  fileId: string,
  records: StoredRecord[],
  schemas: Schema[]
) {
  return records.filter((item) => {
    const schema = schemas.find((schema) => schema.id === item.schemaId)
    if (!schema) {
      return false
    }

    return getRecordFileIds(
      item.data,
      getJsonSchemaProperties(schema.definition)
    ).includes(fileId)
  })
}
