import { describe, expect, it } from "vitest"

import { getJsonSchemaProperties } from "@/lib/json-definition"
import { formatCellValue, formatCurrency } from "@/lib/records"
import {
  addColumn,
  emptyColumnDraft,
  emptyTableDefinition,
  kindFromProperty,
} from "@/lib/table-columns"
import { mockTokenForProperty } from "@/lib/template-mock"

describe("currency field", () => {
  it("stores a decimal number with format currency", () => {
    const definition = addColumn(emptyTableDefinition("Invoices"), {
      ...emptyColumnDraft(),
      title: "Amount",
      kind: "currency",
    })
    const [property] = getJsonSchemaProperties(definition)

    expect(property?.type).toBe("number")
    expect(property?.format).toBe("currency")
    expect(
      kindFromProperty({
        type: property?.type ?? "",
        format: property?.format,
      })
    ).toBe("currency")
    expect(mockTokenForProperty(property)).toBe("{{ mockNumber }}")
  })

  it("displays a dollar sign", () => {
    const property = {
      name: "amount",
      type: "number",
      format: "currency",
      required: false,
    }

    expect(formatCellValue(12.5, property)).toBe(formatCurrency(12.5))
    expect(formatCellValue(12.5, property)).toBe("$12.50")
    expect(formatCellValue(1000, property)).toBe("$1,000.00")
    expect(formatCellValue(-4.25, property)).toBe("-$4.25")
    expect(formatCellValue(0, property)).toBe("$0.00")
  })
})
