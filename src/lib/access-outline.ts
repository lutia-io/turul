import type { ApiAccessPermission, ApiGrant } from "@/store/access-slice"

export type AccessAction = {
  id: string
  label: string
}

export type AccessResource = {
  id: string
  label: string
  actions: AccessAction[]
  fields?: boolean
}

export const ACCESS_ACTIONS: Record<string, AccessAction> = {
  create: { id: "create", label: "Create" },
  read: { id: "read", label: "View" },
  update: { id: "update", label: "Edit" },
  delete: { id: "delete", label: "Delete" },
  manage_access: { id: "manage_access", label: "Manage access" },
}

export const NETWORK_ACCESS_CATALOG: AccessResource[] = [
  {
    id: "network",
    label: "Network",
    actions: [
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.update,
      ACCESS_ACTIONS.delete,
      ACCESS_ACTIONS.manage_access,
    ],
  },
  {
    id: "organization",
    label: "Organizations",
    actions: [
      ACCESS_ACTIONS.create,
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.update,
      ACCESS_ACTIONS.delete,
    ],
  },
  {
    id: "organization_user",
    label: "Organization users",
    actions: [
      ACCESS_ACTIONS.create,
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.update,
      ACCESS_ACTIONS.delete,
    ],
  },
  {
    id: "schema",
    label: "Schemas",
    actions: [
      ACCESS_ACTIONS.create,
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.update,
      ACCESS_ACTIONS.delete,
    ],
  },
  {
    id: "workflow_definition",
    label: "Workflow definitions",
    actions: [
      ACCESS_ACTIONS.create,
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.update,
      ACCESS_ACTIONS.delete,
    ],
  },
  {
    id: "pipeline_definition",
    label: "Pipeline definitions",
    actions: [
      ACCESS_ACTIONS.create,
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.update,
      ACCESS_ACTIONS.delete,
    ],
  },
]

export const ORGANIZATION_ACCESS_CATALOG: AccessResource[] = [
  {
    id: "record",
    label: "Records",
    fields: true,
    actions: [
      ACCESS_ACTIONS.create,
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.update,
      ACCESS_ACTIONS.delete,
    ],
  },
  {
    id: "file",
    label: "Files",
    actions: [
      ACCESS_ACTIONS.create,
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.delete,
    ],
  },
  {
    id: "organization_user",
    label: "Organization users",
    actions: [
      ACCESS_ACTIONS.create,
      ACCESS_ACTIONS.read,
      ACCESS_ACTIONS.update,
    ],
  },
]

export type OutlineField = {
  name: string
  access: "read" | "write"
}

export type OutlineRow = {
  resource: AccessResource
  actions: AccessAction[]
  schemaId?: string
  fields: OutlineField[]
  allFields: boolean
}

export function catalogFor(kind: "network" | "organization") {
  return kind === "network" ? NETWORK_ACCESS_CATALOG : ORGANIZATION_ACCESS_CATALOG
}

export function resourceLabel(resource: string) {
  const match = [...NETWORK_ACCESS_CATALOG, ...ORGANIZATION_ACCESS_CATALOG].find(
    (item) => item.id === resource
  )
  return match?.label ?? resource
}

export function actionLabel(action: string) {
  return ACCESS_ACTIONS[action]?.label ?? action
}

export function grantsFromPermissions(
  permissions: ApiAccessPermission[],
  permissionIds: string[]
) {
  return permissions
    .filter((permission) => permissionIds.includes(permission.id))
    .flatMap((permission) => permission.grants)
}

export function outlineRows(
  grants: ApiGrant[],
  kind: "network" | "organization"
): OutlineRow[] {
  const catalog = catalogFor(kind)
  return catalog.flatMap((resource) => {
    const matching = grants.filter((grant) => grant.resource === resource.id)
    if (matching.length === 0) {
      return []
    }
    const byKey = new Map<string, OutlineRow>()
    for (const grant of matching) {
      const key = grant.schemaId || "*"
      const existing = byKey.get(key)
      const actions = new Set(existing?.actions.map((action) => action.id) ?? [])
      for (const action of grant.actions) {
        if (resource.actions.some((item) => item.id === action)) {
          actions.add(action)
        }
      }
      const fields = [...(existing?.fields ?? [])]
      for (const field of grant.fields ?? []) {
        const found = fields.find((item) => item.name === field.name)
        if (!found) {
          fields.push(field)
        } else if (field.access === "write") {
          found.access = "write"
        }
      }
      const allFields =
        (existing?.allFields ?? false) ||
        !grant.fields ||
        grant.fields.length === 0
      byKey.set(key, {
        resource,
        schemaId: grant.schemaId,
        actions: resource.actions.filter((action) => actions.has(action.id)),
        fields: allFields ? [] : fields,
        allFields,
      })
    }
    return [...byKey.values()].filter((row) => row.actions.length > 0)
  })
}

export function outlineSummary(rows: OutlineRow[]) {
  if (rows.length === 0) {
    return "No access yet"
  }
  const catalog = catalogFor(
    NETWORK_ACCESS_CATALOG.some((item) => item.id === rows[0].resource.id)
      ? "network"
      : "organization"
  )
  const allRead = rows.every(
    (row) => row.actions.length === 1 && row.actions[0].id === "read"
  )
  if (allRead) {
    return "View only"
  }
  const hasCreate = rows.some((row) =>
    row.actions.some((action) => action.id === "create")
  )
  const hasDelete = rows.some((row) =>
    row.actions.some((action) => action.id === "delete")
  )
  if (rows.length === catalog.length && hasCreate && hasDelete) {
    return "Full access"
  }
  if (rows.length <= 2) {
    return rows
      .map(
        (row) =>
          `${row.resource.label}: ${row.actions.map((action) => action.label).join(", ")}`
      )
      .join(" · ")
  }
  return `${rows
    .slice(0, 2)
    .map((row) => row.resource.label)
    .join(", ")} +${rows.length - 2}`
}

export function personName(person: {
  firstName: string
  lastName: string
}) {
  return `${person.firstName} ${person.lastName}`.trim()
}

export function personInitials(person: {
  firstName: string
  lastName: string
}) {
  const first = person.firstName.trim().charAt(0)
  const last = person.lastName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || "?"
}

export function hasAction(grants: ApiGrant[], resource: string, action: string) {
  return grants.some(
    (grant) => grant.resource === resource && grant.actions.includes(action)
  )
}

export function toggleGrantAction(
  grants: ApiGrant[],
  resource: string,
  action: string
): ApiGrant[] {
  const index = grants.findIndex((grant) => grant.resource === resource)
  if (index === -1) {
    return [...grants, { resource, actions: [action] }]
  }
  const current = grants[index]
  const actions = current.actions.includes(action)
    ? current.actions.filter((item) => item !== action)
    : [...current.actions, action]
  const next = [...grants]
  if (actions.length === 0) {
    next.splice(index, 1)
  } else {
    next[index] = { ...current, actions }
  }
  return next
}

export function recordGrant(grants: ApiGrant[]) {
  return grants.find((grant) => grant.resource === "record")
}

export function setRecordGrant(
  grants: ApiGrant[],
  patch: {
    actions?: string[]
    schemaId?: string
    fields?: OutlineField[]
    allFields?: boolean
  }
): ApiGrant[] {
  const current = recordGrant(grants)
  const actions = patch.actions ?? current?.actions ?? ["read"]
  const allFields = patch.allFields ?? !current?.fields?.length
  const fields = allFields ? undefined : (patch.fields ?? current?.fields)
  const schemaId =
    patch.schemaId === undefined ? current?.schemaId : patch.schemaId || undefined
  const nextGrant: ApiGrant = {
    resource: "record",
    actions,
    schemaId,
    fields: fields && fields.length > 0 ? fields : undefined,
  }
  const index = grants.findIndex((grant) => grant.resource === "record")
  if (actions.length === 0) {
    return grants.filter((grant) => grant.resource !== "record")
  }
  if (index === -1) {
    return [...grants, nextGrant]
  }
  const next = [...grants]
  next[index] = nextGrant
  return next
}
