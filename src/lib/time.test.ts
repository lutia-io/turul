import { describe, expect, it } from "vitest"

import { getJsonSchemaProperties } from "@/lib/json-definition"
import { formatCellValue } from "@/lib/records"
import {
  addColumn,
  emptyColumnDraft,
  emptyTableDefinition,
  kindFromProperty,
} from "@/lib/table-columns"
import { isMockTemplate, mockTokenForProperty } from "@/lib/template-mock"
import {
  formatTimeValue,
  fromTimeInputValue,
  toTimeInputValue,
} from "@/lib/time"

describe("time field", () => {
  it("round-trips format time", () => {
    const definition = addColumn(emptyTableDefinition("Hours"), {
      ...emptyColumnDraft(),
      title: "Opens at",
      kind: "time",
    })
    const [property] = getJsonSchemaProperties(definition)

    expect(property?.type).toBe("string")
    expect(property?.format).toBe("time")
    expect(
      kindFromProperty({
        type: property?.type ?? "",
        format: property?.format,
      })
    ).toBe("time")
    expect(mockTokenForProperty(property)).toBe("{{ mockTime }}")
    expect(isMockTemplate("{{ mockTime }}")).toBe(true)
    expect(isMockTemplate("{{ mockDate }}")).toBe(true)
    expect(isMockTemplate("{{ mockDateTime }}")).toBe(true)
  })

  it("stores a local clock time as UTC full-time and reads it back", () => {
    const stored = fromTimeInputValue("14:30")
    expect(stored).toMatch(/^\d{2}:\d{2}:\d{2}Z$/)
    expect(toTimeInputValue(stored ?? "")).toBe("14:30:00")
    expect(toTimeInputValue("09:15:05")).toBe("09:15:05")
    expect(fromTimeInputValue("24:00")).toBeUndefined()
    expect(formatTimeValue("not-a-time")).toBe("not-a-time")
  })

  it("formats a stored time for display", () => {
    const property = {
      name: "opensAt",
      type: "string",
      format: "time",
      required: false,
    }
    const stored = fromTimeInputValue("14:30:00")
    expect(formatCellValue(stored, property)).toBe(
      formatTimeValue(stored ?? "")
    )
  })
})
