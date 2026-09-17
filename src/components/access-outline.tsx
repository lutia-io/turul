import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { cn } from "@/lib/utils"
import {
  ACCESS_ACTIONS,
  catalogFor,
  hasAction,
  recordGrant,
  setRecordGrant,
  toggleGrantAction,
  type OutlineField,
  type OutlineRow,
} from "@/lib/access-outline"
import type { ApiGrant } from "@/store/access-slice"

export type AccessSchemaOption = {
  id: string
  name: string
  properties: string[]
}

const ACTION_COLUMNS = [
  ACCESS_ACTIONS.read,
  ACCESS_ACTIONS.create,
  ACCESS_ACTIONS.update,
  ACCESS_ACTIONS.delete,
  ACCESS_ACTIONS.manage_access,
]

function schemaName(
  schemaId: string | undefined,
  schemas: AccessSchemaOption[]
) {
  if (!schemaId) {
    return "All record types"
  }
  return schemas.find((schema) => schema.id === schemaId)?.name ?? "Records"
}

export function AccessOutline({
  rows,
  schemas = [],
  empty = "No access yet.",
}: {
  rows: OutlineRow[]
  schemas?: AccessSchemaOption[]
  empty?: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {rows.map((row) => (
        <li
          key={`${row.resource.id}:${row.schemaId ?? "*"}`}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.resource.label}</p>
            {row.resource.fields ? (
              <p className="text-xs text-muted-foreground">
                {row.allFields
                  ? `${schemaName(row.schemaId, schemas)} · All fields`
                  : `${schemaName(row.schemaId, schemas)} · ${row.fields
                      .map(
                        (field) =>
                          `${field.name} ${field.access === "write" ? "Edit" : "View"}`
                      )
                      .join(", ")}`}
              </p>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {row.actions.map((action) => action.label).join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function GrantEditor({
  kind,
  grants,
  onChange,
  schemas = [],
}: {
  kind: "network" | "organization"
  grants: ApiGrant[]
  onChange: (grants: ApiGrant[]) => void
  schemas?: AccessSchemaOption[]
}) {
  const catalog = catalogFor(kind)
  const columns = ACTION_COLUMNS.filter((action) =>
    catalog.some((resource) =>
      resource.actions.some((item) => item.id === action.id)
    )
  )
  const records = recordGrant(grants)
  const limitFields = Boolean(records?.fields?.length)
  const selectedSchema = schemas.find((schema) => schema.id === records?.schemaId)
  const fieldNames =
    selectedSchema?.properties ??
    [...new Set(schemas.flatMap((schema) => schema.properties))]

  function fieldAccess(name: string): "hidden" | "read" | "write" {
    const field = records?.fields?.find((item) => item.name === name)
    if (!field) {
      return "hidden"
    }
    return field.access
  }

  function setField(name: string, access: "hidden" | "read" | "write") {
    const current = records?.fields ?? []
    const next: OutlineField[] =
      access === "hidden"
        ? current.filter((field) => field.name !== name)
        : [
            ...current.filter((field) => field.name !== name),
            { name, access },
          ]
    onChange(
      setRecordGrant(grants, {
        fields: next,
        allFields: false,
        actions:
          records?.actions?.length
            ? records.actions
            : access === "hidden"
              ? ["read"]
              : access === "write"
                ? ["read", "update"]
                : ["read"],
      })
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium">What this permission allows</p>
        <p className="text-xs text-muted-foreground">
          Toggle the actions this permission grants. Groups that receive it get
          all of them.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Resource</th>
              {columns.map((action) => (
                <th
                  key={action.id}
                  className="px-1 py-2 text-center font-medium"
                >
                  {action.id === "manage_access" ? "Access" : action.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.map((resource) => (
              <tr key={resource.id} className="border-b last:border-b-0">
                <td className="px-3 py-1.5 font-medium">{resource.label}</td>
                {columns.map((action) => {
                  const allowed = resource.actions.some(
                    (item) => item.id === action.id
                  )
                  if (!allowed) {
                    return (
                      <td
                        key={action.id}
                        className="px-1 py-1.5 text-center text-muted-foreground/40"
                      >
                        —
                      </td>
                    )
                  }
                  const selected = hasAction(grants, resource.id, action.id)
                  return (
                    <td key={action.id} className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${action.label} ${resource.label}`}
                        onClick={() =>
                          onChange(
                            toggleGrantAction(grants, resource.id, action.id)
                          )
                        }
                        className={cn(
                          "inline-flex h-7 min-w-12 items-center justify-center rounded-md text-xs font-medium transition-colors",
                          selected
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {selected ? "On" : "Off"}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {kind === "organization" && hasAction(grants, "record", "read") ? (
        <div className="space-y-3 rounded-xl p-3 ring-1 ring-foreground/10">
          <div>
            <p className="text-sm font-medium">Record fields</p>
            <p className="text-xs text-muted-foreground">
              Leave this open for every field, or choose which fields this
              group can view and edit.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                onChange(setRecordGrant(grants, { allFields: true, fields: [] }))
              }
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                !limitFields
                  ? "bg-foreground text-background ring-foreground"
                  : "text-muted-foreground ring-foreground/15 hover:text-foreground"
              )}
            >
              All fields
            </button>
            <button
              type="button"
              onClick={() => {
                const seed: OutlineField[] = fieldNames.map((name) => ({
                  name,
                  access: "read" as const,
                }))
                onChange(
                  setRecordGrant(grants, {
                    allFields: false,
                    fields: seed,
                  })
                )
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                limitFields
                  ? "bg-foreground text-background ring-foreground"
                  : "text-muted-foreground ring-foreground/15 hover:text-foreground"
              )}
            >
              Specific fields
            </button>
          </div>
          {limitFields ? (
            <div className="space-y-3">
              {schemas.length > 0 ? (
                <NativeSelect
                  value={records?.schemaId ?? ""}
                  onChange={(event) =>
                    onChange(
                      setRecordGrant(grants, {
                        schemaId: event.target.value,
                        allFields: false,
                        fields: (
                          schemas.find((schema) => schema.id === event.target.value)
                            ?.properties ?? fieldNames
                        ).map((name) => ({
                          name,
                          access:
                            fieldAccess(name) === "hidden"
                              ? "read"
                              : fieldAccess(name),
                        })),
                      })
                    )
                  }
                >
                  <NativeSelectOption value="">All record types</NativeSelectOption>
                  {schemas.map((schema) => (
                    <NativeSelectOption key={schema.id} value={schema.id}>
                      {schema.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : null}
              {fieldNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No schema fields are available yet.
                </p>
              ) : (
                <ul className="divide-y rounded-lg ring-1 ring-foreground/10">
                  {fieldNames.map((name) => {
                    const access = fieldAccess(name)
                    return (
                      <li
                        key={name}
                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5"
                      >
                        <span className="font-mono text-[13px]">{name}</span>
                        <div className="flex gap-1">
                          {(
                            [
                              ["hidden", "Hidden"],
                              ["read", "View"],
                              ["write", "Edit"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setField(name, value)}
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 transition-colors",
                                access === value
                                  ? "bg-foreground text-background ring-foreground"
                                  : "text-muted-foreground ring-foreground/15 hover:text-foreground"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
