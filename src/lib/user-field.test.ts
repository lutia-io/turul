import { describe, expect, it } from "vitest"

import {
  getJsonSchemaProperties,
  userIdFromFormValue,
} from "@/lib/json-definition"
import {
  addColumn,
  emptyColumnDraft,
  emptyTableDefinition,
  kindFromProperty,
} from "@/lib/table-columns"

describe("user field", () => {
  it("round-trips format user", () => {
    const definition = addColumn(emptyTableDefinition("People"), {
      ...emptyColumnDraft(),
      title: "Owner",
      kind: "user",
    })
    const [property] = getJsonSchemaProperties(definition)

    expect(property?.type).toBe("string")
    expect(property?.format).toBe("user")
    expect(
      kindFromProperty({
        type: property?.type ?? "",
        format: property?.format,
      })
    ).toBe("user")
  })

  it("writes a single organization user id", () => {
    expect(
      userIdFromFormValue("  550e8400-e29b-41d4-a716-446655440000  ")
    ).toBe("550e8400-e29b-41d4-a716-446655440000")
    expect(userIdFromFormValue("   ")).toBeUndefined()
  })
})
