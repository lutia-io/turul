import { describe, expect, it } from "vitest"

import { getJsonSchemaProperties } from "@/lib/json-definition"
import {
  addColumn,
  draftFromProperty,
  emptyColumnDraft,
  emptyTableDefinition,
  updateColumn,
} from "@/lib/table-columns"

describe("column description", () => {
  it("persists description when adding a column", () => {
    const definition = addColumn(emptyTableDefinition("Orders"), {
      ...emptyColumnDraft(),
      title: "PO number",
      description: "Purchase order number from the supplier",
    })
    const [property] = getJsonSchemaProperties(definition)

    expect(property?.description).toBe(
      "Purchase order number from the supplier"
    )
    expect(
      (definition.properties as Record<string, { description?: string }>)
        .poNumber?.description
    ).toBe("Purchase order number from the supplier")
  })

  it("updates and clears description on edit", () => {
    const created = addColumn(emptyTableDefinition("Orders"), {
      ...emptyColumnDraft(),
      title: "Status",
      description: "Current fulfillment state",
    })
    const updated = updateColumn(created, "status", {
      ...emptyColumnDraft(),
      title: "Status",
      description: "Where this order sits in the pipeline",
      kind: "text",
    })
    expect(getJsonSchemaProperties(updated)[0]?.description).toBe(
      "Where this order sits in the pipeline"
    )

    const cleared = updateColumn(updated, "status", {
      ...emptyColumnDraft(),
      title: "Status",
      description: "  ",
      kind: "text",
    })
    const clearedProperty = getJsonSchemaProperties(cleared)[0]
    expect(clearedProperty?.description).toBeUndefined()
    expect(
      (cleared.properties as Record<string, { description?: string }>).status
    ).not.toHaveProperty("description")
  })

  it("loads a custom description into the edit draft", () => {
    const definition = addColumn(emptyTableDefinition("Orders"), {
      ...emptyColumnDraft(),
      title: "SKU",
      description: "Internal stock keeping unit",
    })
    const [property] = getJsonSchemaProperties(definition)
    expect(draftFromProperty(property!).description).toBe(
      "Internal stock keeping unit"
    )
  })

  it("treats title-mirrored descriptions as unset in the draft", () => {
    const definition = addColumn(emptyTableDefinition("Orders"), {
      ...emptyColumnDraft(),
      title: "Notes",
    })
    const withMirror = {
      ...definition,
      properties: {
        notes: {
          type: "string",
          title: "Notes",
          description: "Notes",
        },
      },
    }
    const [property] = getJsonSchemaProperties(withMirror)
    expect(draftFromProperty(property!).description).toBe("")
  })
})
