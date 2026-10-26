import {
  isAddressProperty,
  isEmailProperty,
  isFileProperty,
  isForeignProperty,
  isPhoneProperty,
  isUriProperty,
  isUserArrayProperty,
  isUserProperty,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import { formatCellValue } from "@/lib/records"

export type SpreadsheetCellRef = {
  rowId: string
  columnId: string
}

export function isSimpleSpreadsheetProperty(property: JsonSchemaProperty) {
  if (
    isFileProperty(property) ||
    isForeignProperty(property) ||
    isUserProperty(property) ||
    isUserArrayProperty(property) ||
    isAddressProperty(property) ||
    isUriProperty(property) ||
    isEmailProperty(property) ||
    isPhoneProperty(property)
  ) {
    return false
  }
  if (property.type === "array") {
    return false
  }
  return (
    property.type === "string" ||
    property.type === "number" ||
    property.type === "integer" ||
    property.type === "boolean" ||
    Boolean(property.enumValues?.length)
  )
}

export function spreadsheetCellKey(cell: SpreadsheetCellRef) {
  return `${cell.rowId}:${cell.columnId}`
}

export function sameSpreadsheetCell(
  a: SpreadsheetCellRef | null | undefined,
  b: SpreadsheetCellRef | null | undefined
) {
  return Boolean(a && b && a.rowId === b.rowId && a.columnId === b.columnId)
}

export function selectionBounds(
  anchor: SpreadsheetCellRef,
  focus: SpreadsheetCellRef,
  rowIds: string[],
  columnIds: string[]
) {
  const rowA = rowIds.indexOf(anchor.rowId)
  const rowB = rowIds.indexOf(focus.rowId)
  const colA = columnIds.indexOf(anchor.columnId)
  const colB = columnIds.indexOf(focus.columnId)
  if (rowA < 0 || rowB < 0 || colA < 0 || colB < 0) {
    return null
  }
  return {
    rowStart: Math.min(rowA, rowB),
    rowEnd: Math.max(rowA, rowB),
    colStart: Math.min(colA, colB),
    colEnd: Math.max(colA, colB),
  }
}

export function isCellInSelection(
  cell: SpreadsheetCellRef,
  anchor: SpreadsheetCellRef | null,
  focus: SpreadsheetCellRef | null,
  rowIds: string[],
  columnIds: string[]
) {
  if (!anchor || !focus) {
    return false
  }
  const bounds = selectionBounds(anchor, focus, rowIds, columnIds)
  if (!bounds) {
    return false
  }
  const rowIndex = rowIds.indexOf(cell.rowId)
  const colIndex = columnIds.indexOf(cell.columnId)
  return (
    rowIndex >= bounds.rowStart &&
    rowIndex <= bounds.rowEnd &&
    colIndex >= bounds.colStart &&
    colIndex <= bounds.colEnd
  )
}

export function moveCellRef(
  cell: SpreadsheetCellRef,
  rowIds: string[],
  columnIds: string[],
  rowDelta: number,
  colDelta: number
): SpreadsheetCellRef {
  const rowIndex = rowIds.indexOf(cell.rowId)
  const colIndex = columnIds.indexOf(cell.columnId)
  const nextRow = Math.max(
    0,
    Math.min(rowIds.length - 1, rowIndex + rowDelta)
  )
  const nextCol = Math.max(
    0,
    Math.min(columnIds.length - 1, colIndex + colDelta)
  )
  return {
    rowId: rowIds[nextRow] ?? cell.rowId,
    columnId: columnIds[nextCol] ?? cell.columnId,
  }
}

export function encodeTsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (/[\t\n\r"]/.test(cell)) {
            return `"${cell.replaceAll('"', '""')}"`
          }
          return cell
        })
        .join("\t")
    )
    .join("\n")
}

export function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i]
    const next = normalized[i + 1]
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === "\t") {
      row.push(cell)
      cell = ""
      continue
    }
    if (char === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      continue
    }
    cell += char
  }
  row.push(cell)
  if (row.length > 1 || row[0] !== "" || rows.length === 0) {
    rows.push(row)
  }
  return rows
}

export function clipboardValueForProperty(
  value: JsonValue | undefined,
  property: JsonSchemaProperty
) {
  if (value == null) {
    return ""
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (typeof value === "number") {
    return String(value)
  }
  if (typeof value === "string") {
    return value
  }
  return formatCellValue(value, property)
}

export function coercePasteValue(
  raw: string,
  property: JsonSchemaProperty
): JsonValue | undefined {
  const trimmed = raw.trim()
  if (property.enumValues && property.enumValues.length > 0) {
    if (trimmed === "") {
      return null
    }
    const match = property.enumValues.find(
      (item) => item.toLowerCase() === trimmed.toLowerCase()
    )
    return match
  }
  if (property.type === "boolean") {
    if (trimmed === "") {
      return null
    }
    const lower = trimmed.toLowerCase()
    if (lower === "true" || lower === "yes" || lower === "1") {
      return true
    }
    if (lower === "false" || lower === "no" || lower === "0") {
      return false
    }
    return undefined
  }
  if (property.type === "number" || property.type === "integer") {
    if (trimmed === "") {
      return null
    }
    const parsed = Number(trimmed.replaceAll(",", ""))
    if (!Number.isFinite(parsed)) {
      return undefined
    }
    return property.type === "integer" ? Math.trunc(parsed) : parsed
  }
  if (trimmed === "") {
    return null
  }
  return raw
}
