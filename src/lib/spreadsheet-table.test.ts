import { describe, expect, it } from "vitest"

import type { JsonSchemaProperty } from "@/lib/json-definition"
import {
  coercePasteValue,
  encodeTsv,
  isSimpleSpreadsheetProperty,
  moveCellRef,
  parseTsv,
  selectionBounds,
} from "@/lib/spreadsheet-table"

const textProperty: JsonSchemaProperty = {
  name: "title",
  type: "string",
  required: false,
}

const numberProperty: JsonSchemaProperty = {
  name: "amount",
  type: "number",
  required: false,
}

const enumProperty: JsonSchemaProperty = {
  name: "status",
  type: "string",
  required: false,
  enumValues: ["Open", "Closed"],
}

const fileProperty: JsonSchemaProperty = {
  name: "doc",
  type: "string",
  required: false,
  format: "file",
}

describe("spreadsheet-table", () => {
  it("classifies simple vs complex properties", () => {
    expect(isSimpleSpreadsheetProperty(textProperty)).toBe(true)
    expect(isSimpleSpreadsheetProperty(numberProperty)).toBe(true)
    expect(isSimpleSpreadsheetProperty(enumProperty)).toBe(true)
    expect(isSimpleSpreadsheetProperty(fileProperty)).toBe(false)
  })

  it("round-trips tsv with tabs and quotes", () => {
    const matrix = [
      ["a", "b\tc"],
      ['say "hi"', "2"],
    ]
    expect(parseTsv(encodeTsv(matrix))).toEqual(matrix)
  })

  it("coerces paste values", () => {
    expect(coercePasteValue("12.5", numberProperty)).toBe(12.5)
    expect(coercePasteValue("closed", enumProperty)).toBe("Closed")
    expect(coercePasteValue("nope", enumProperty)).toBeUndefined()
    expect(coercePasteValue("yes", { ...textProperty, type: "boolean" })).toBe(
      true
    )
  })

  it("moves and bounds selection", () => {
    const rows = ["r1", "r2", "r3"]
    const cols = ["a", "b", "c"]
    expect(moveCellRef({ rowId: "r1", columnId: "a" }, rows, cols, 1, 1)).toEqual(
      { rowId: "r2", columnId: "b" }
    )
    expect(
      selectionBounds(
        { rowId: "r3", columnId: "c" },
        { rowId: "r1", columnId: "a" },
        rows,
        cols
      )
    ).toEqual({ rowStart: 0, rowEnd: 2, colStart: 0, colEnd: 2 })
  })
})
