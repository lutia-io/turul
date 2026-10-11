import { describe, expect, it } from "vitest"

import {
  getJsonSchemaProperties,
  isUserArrayProperty,
  isUserProperty,
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

  it("writes a list of users on each item", () => {
    const definition = addColumn(emptyTableDefinition("Expenses"), {
      ...emptyColumnDraft(),
      title: "Participants",
      kind: "list",
      itemsType: "user",
    })
    const items = (
      definition.properties as {
        participants: {
          type: string
          format?: string
          items: { type: string; format?: string }
        }
      }
    ).participants

    expect(items.type).toBe("array")
    expect(items.format).toBeUndefined()
    expect(items.items).toEqual({ type: "string", format: "user" })

    const [property] = getJsonSchemaProperties(definition)
    expect(property?.format).toBeUndefined()
    expect(property?.itemsType).toBe("user")
    expect(isUserProperty(property!)).toBe(false)
    expect(isUserArrayProperty(property!)).toBe(true)
    expect(kindFromProperty(property!)).toBe("list")
  })

  it("writes a single organization user id", () => {
    expect(
      userIdFromFormValue("  550e8400-e29b-41d4-a716-446655440000  ")
    ).toBe("550e8400-e29b-41d4-a716-446655440000")
    expect(userIdFromFormValue("   ")).toBeUndefined()
  })
})
