import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyPlusIcon,
  FileJsonIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { DefinitionCard } from "@/components/definition-detail"
import { DefinitionJsonPane } from "@/components/definition-dialog-layout"
import { TemplateValueInput } from "@/components/template-value-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { JsonSchemaPropertySpec } from "@/data/define-records"
import { getSchema } from "@/data/networks"
import {
  ADDRESS_FORMAT,
  ADDRESS_REQUIRED_FIELDS,
  addressPropertySchema,
} from "@/lib/address"
import {
  getJsonSchemaProperties,
  parseJsonDefault,
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
  workspaceSchemaFromApi,
} from "@/lib/network-workspace"
import { slugifyId, toFieldName } from "@/lib/slug"
import { arithmeticTemplateVariables } from "@/lib/template-arithmetic"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import {
  useCreateSchemaMutation,
  useGetSchemaQuery,
  useUpdateSchemaMutation,
} from "@/store/schema-slice"

const propertyTypes = [
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object",
] as const

const formatOptions = [
  "",
  "date",
  "date-time",
  "email",
  "uri",
  "file",
  "foreign",
  "address",
] as const

const fieldKinds = [
  { value: "text", label: "Text" },
  { value: "choices", label: "Choices" },
  { value: "number", label: "Number" },
  { value: "integer", label: "Whole number" },
  { value: "boolean", label: "Yes / No" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & time" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "file", label: "File" },
  { value: "address", label: "Address" },
  { value: "foreign", label: "Related record" },
  { value: "list", label: "List" },
  { value: "object", label: "Object" },
] as const

type FieldKind = (typeof fieldKinds)[number]["value"]

function kindFromDraft(property: {
  type: PropertyType
  format: PropertyFormat
  enumValues?: string[]
}): FieldKind {
  if (property.format === "address") {
    return "address"
  }
  if (property.format === "foreign") {
    return "foreign"
  }
  if (property.format === "file") {
    return "file"
  }
  if (property.format === "email") {
    return "email"
  }
  if (property.format === "uri") {
    return "url"
  }
  if (property.format === "date") {
    return "date"
  }
  if (property.format === "date-time") {
    return "datetime"
  }
  if (property.type === "boolean") {
    return "boolean"
  }
  if (property.type === "integer") {
    return "integer"
  }
  if (property.type === "number") {
    return "number"
  }
  if (property.type === "array") {
    return "list"
  }
  if (property.type === "object") {
    return "object"
  }
  if ((property.enumValues?.length ?? 0) > 0) {
    return "choices"
  }
  return "text"
}

function draftFromKind(
  kind: FieldKind
): Pick<PropertyDraft, "type" | "format" | "schemaId" | "enumValues"> {
  switch (kind) {
    case "number":
      return { type: "number", format: "", schemaId: "", enumValues: [] }
    case "integer":
      return { type: "integer", format: "", schemaId: "", enumValues: [] }
    case "boolean":
      return { type: "boolean", format: "", schemaId: "", enumValues: [] }
    case "date":
      return { type: "string", format: "date", schemaId: "", enumValues: [] }
    case "datetime":
      return {
        type: "string",
        format: "date-time",
        schemaId: "",
        enumValues: [],
      }
    case "email":
      return { type: "string", format: "email", schemaId: "", enumValues: [] }
    case "url":
      return { type: "string", format: "uri", schemaId: "", enumValues: [] }
    case "file":
      return { type: "string", format: "file", schemaId: "", enumValues: [] }
    case "address":
      return { type: "object", format: "address", schemaId: "", enumValues: [] }
    case "foreign":
      return { type: "string", format: "foreign", schemaId: "", enumValues: [] }
    case "choices":
      return { type: "string", format: "", schemaId: "", enumValues: [] }
    case "list":
      return { type: "array", format: "", schemaId: "", enumValues: [] }
    case "object":
      return { type: "object", format: "", schemaId: "", enumValues: [] }
    default:
      return { type: "string", format: "", schemaId: "", enumValues: [] }
  }
}

const itemTypes = ["string", "number", "integer", "boolean"] as const

const itemTypeLabels: Record<(typeof itemTypes)[number], string> = {
  string: "Text",
  number: "Number",
  integer: "Whole number",
  boolean: "Yes / No",
}

const entireNetworkValue = "__network__"

type PropertyType = (typeof propertyTypes)[number]
type PropertyFormat = (typeof formatOptions)[number]

type PropertyDraft = {
  key: string
  name: string
  type: PropertyType
  required: boolean
  description: string
  format: PropertyFormat
  schemaId: string
  enumValues: string[]
  itemsType: (typeof itemTypes)[number]
  defaultValue: string
}

function emptyProperty(
  key: string,
  defaults?: Partial<PropertyDraft>
): PropertyDraft {
  return {
    name: "",
    type: "string",
    required: false,
    description: "",
    format: "",
    schemaId: "",
    itemsType: "string",
    defaultValue: "",
    ...defaults,
    key,
    enumValues: [...(defaults?.enumValues ?? [])],
  }
}

function asPropertyType(value: string): PropertyType {
  return propertyTypes.includes(value as PropertyType)
    ? (value as PropertyType)
    : "string"
}

function asFormat(value: string | undefined): PropertyFormat {
  return formatOptions.includes(value as PropertyFormat)
    ? (value as PropertyFormat)
    : ""
}

function draftsFromProperties(
  properties: JsonSchemaProperty[]
): PropertyDraft[] {
  return properties.map((property, index) => ({
    key: `property-${property.name}-${index}`,
    name: property.name,
    type: asPropertyType(property.type),
    required: property.required,
    description: property.description ?? "",
    format: asFormat(property.format),
    schemaId: property.schemaId ?? "",
    enumValues: [...(property.enumValues ?? [])],
    itemsType: asItemsType(property.itemsType),
    defaultValue: property.defaultValue ?? "",
  }))
}

function asItemsType(value: string | undefined): PropertyDraft["itemsType"] {
  return value === "number" || value === "integer" || value === "boolean"
    ? value
    : "string"
}

const schemaDefaultTemplateGroups = [
  {
    label: "Common values",
    variables: [
      { label: "Current time", token: "{{ now }}", hint: "now" },
      { label: "UUID", token: "{{ uuid }}", hint: "id" },
    ],
  },
]

function defaultTemplateGroups(type: PropertyType) {
  if (type !== "integer" && type !== "number") {
    return schemaDefaultTemplateGroups
  }
  return [
    ...schemaDefaultTemplateGroups,
    {
      label: "Math",
      variables: arithmeticTemplateVariables.map((item) => ({
        ...item,
        hint: "math",
      })),
    },
  ]
}

function asJsonObject(value: unknown): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject
  }
  return undefined
}

function definitionFromDrafts({
  name,
  description,
  properties,
  base,
}: {
  name: string
  description: string
  properties: PropertyDraft[]
  base?: JsonObject
}): JsonObject {
  const input = toSchemaInput(properties)
  const previousProperties = asJsonObject(base?.properties)
  const mergedProperties: JsonObject = {}

  for (const [key, spec] of Object.entries(input.properties)) {
    const previous = asJsonObject(previousProperties?.[key])
    const merged: JsonObject = { ...(previous ?? {}), ...spec }
    if (spec.format !== "foreign") {
      delete merged.schemaId
    } else {
      delete merged.enum
    }
    if (!spec.format) {
      delete merged.format
    }
    if (spec.type !== "object") {
      delete merged.properties
      delete merged.additionalProperties
      delete merged.required
    }
    if (spec.type !== "array") {
      delete merged.items
    }
    if (!Object.hasOwn(spec, "default")) {
      delete merged.default
    }
    if (spec.format === ADDRESS_FORMAT) {
      merged.additionalProperties = false
      if (!asJsonObject(merged.properties)) {
        merged.properties = addressPropertySchema()
        merged.required = [...ADDRESS_REQUIRED_FIELDS]
      }
    }
    mergedProperties[key] = merged
  }

  const trimmedDescription = description.trim()
  const next: JsonObject = {
    $schema: base?.$schema ?? "https://json-schema.org/draft/2020-12/schema",
  }

  if (base?.$id !== undefined) {
    next.$id = base.$id
  }

  next.title = name.trim() || "Untitled schema"
  if (trimmedDescription) {
    next.description = trimmedDescription
  }
  next.type = base?.type ?? "object"
  next.additionalProperties =
    base?.additionalProperties === undefined ? false : base.additionalProperties
  next.properties = mergedProperties
  next.required = input.required

  if (base) {
    for (const [key, value] of Object.entries(base)) {
      if (key === "description" || Object.hasOwn(next, key)) {
        continue
      }
      next[key] = value
    }
  }

  return next
}

function jsonSchemaError(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!asJsonObject(parsed)) {
      return "JSON must be an object schema"
    }
    return null
  } catch {
    return "Invalid JSON"
  }
}

function toSchemaInput(properties: PropertyDraft[]) {
  const specs: Record<string, JsonSchemaPropertySpec> = {}
  const required: string[] = []
  const used = new Set<string>()

  properties.forEach((property, index) => {
    let name = toFieldName(property.name || `field${index + 1}`)
    if (used.has(name)) {
      let suffix = 2
      while (used.has(`${name}${suffix}`)) {
        suffix += 1
      }
      name = `${name}${suffix}`
    }
    used.add(name)

    const spec: JsonSchemaPropertySpec = {
      type: property.type,
      description: property.description.trim() || name,
    }

    if (
      property.format &&
      (property.type === "string" ||
        (property.type === "array" && property.format === "file") ||
        (property.type === "object" && property.format === ADDRESS_FORMAT))
    ) {
      spec.format = property.format
    }

    if (property.format === "foreign" && property.schemaId) {
      spec.schemaId = property.schemaId
    }

    if (property.type === "array") {
      spec.items =
        property.format === "file"
          ? { type: "string", format: "file" }
          : { type: property.itemsType }
    }

    const enumValues = property.enumValues
      .map((value) => value.trim())
      .filter(Boolean)

    if (
      enumValues.length > 0 &&
      property.type === "string" &&
      property.format !== "foreign"
    ) {
      spec.enum = enumValues
    }

    const defaultValue = property.defaultValue.trim()
    if (defaultValue) {
      spec.default = parseJsonDefault(defaultValue, property.type)
    }

    specs[name] = spec
    if (property.required) {
      required.push(name)
    }
  })

  return { properties: specs, required }
}

export function SchemaDefinitionDialog({
  open,
  onOpenChange,
  networkId,
  organizationId,
  schemaId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  organizationId?: string
  schemaId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const { organizations } = useWorkspaceOrganizations({ skip: !open })
  const { schemas: workspaceSchemas } = useWorkspaceSchemas({ skip: !open })
  const [createSchema, createState] = useCreateSchemaMutation()
  const [updateSchema, updateState] = useUpdateSchemaMutation()
  const isLoading = createState.isLoading || updateState.isLoading
  const error = createState.error ?? updateState.error
  const apiSchemaQuery = useGetSchemaQuery(schemaId ?? "", {
    skip: !open || !schemaId,
  })
  const existing = schemaId ? getSchema(schemaId) : undefined
  const editing = Boolean(schemaId)
  const lockNetwork = Boolean(networkId)
  const lockOrganization = Boolean(organizationId)
  const propertyKeyRef = useRef(1)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? existing?.network.id ?? networks[0]?.id ?? ""
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId ?? existing?.schema.organizationId ?? ""
  )
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState("")
  const [properties, setProperties] = useState<PropertyDraft[]>([])
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [definitionBase, setDefinitionBase] = useState<JsonObject | undefined>()
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [definitionView, setDefinitionView] = useState<"properties" | "json">(
    "properties"
  )
  const jsonSourceRef = useRef<"builder" | "json">("builder")

  const firstNetworkId = networks[0]?.id ?? ""

  function nextPropertyKey() {
    propertyKeyRef.current += 1
    return `property-${propertyKeyRef.current}`
  }

  function createProperty(defaults?: Partial<PropertyDraft>) {
    return emptyProperty(nextPropertyKey(), defaults)
  }

  useEffect(() => {
    if (!open) {
      return
    }
    createState.reset()
    updateState.reset()
    setSelectedOrganizationId(organizationId ?? "")
    setDefinitionView("properties")
    // Reset only when the dialog opens or its org scope changes. `reset`
    // changes after each mutation (it closes over requestId) and would clear
    // a 409 before render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/org only
  }, [open, organizationId])

  useEffect(() => {
    if (!open) {
      return
    }

    const mockCurrent = schemaId ? getSchema(schemaId) : undefined
    const current =
      mockCurrent?.schema ??
      (schemaId && apiSchemaQuery.currentData
        ? workspaceSchemaFromApi(apiSchemaQuery.currentData)
        : undefined)
    setName(current?.name ?? "")
    setSlug(current?.slug ?? "")
    setSlugTouched(Boolean(current))
    setDescription(
      typeof current?.definition.description === "string"
        ? current.definition.description
        : ""
    )
    jsonSourceRef.current = "builder"
    setDefinitionBase(current?.definition)
    setJsonError(null)
    setFocusKey(null)
    propertyKeyRef.current = 1
    setProperties(
      current
        ? draftsFromProperties(getJsonSchemaProperties(current.definition))
        : []
    )
  }, [apiSchemaQuery.currentData, open, schemaId])

  useEffect(() => {
    if (!open) {
      return
    }
    const mockCurrent = schemaId ? getSchema(schemaId) : undefined
    const apiCurrent = schemaId ? apiSchemaQuery.currentData : undefined
    setSelectedNetworkId((current) => {
      if (networkId) {
        return networkId
      }
      return (
        (mockCurrent?.network.id ?? apiCurrent?.networkId ?? current) ||
        firstNetworkId
      )
    })
    setSelectedOrganizationId((current) => {
      if (organizationId) {
        return organizationId
      }
      return (
        mockCurrent?.schema.organizationId ??
        apiCurrent?.organizationId ??
        current
      )
    })
  }, [
    apiSchemaQuery.currentData,
    firstNetworkId,
    networkId,
    open,
    organizationId,
    schemaId,
  ])

  const networkOrganizations = organizations.filter(
    (organization) => organization.networkId === selectedNetworkId
  )
  const relatedSchemas = useMemo(
    () =>
      workspaceSchemas.filter((schema) => {
        if (schema.networkId !== selectedNetworkId) {
          return false
        }
        if (schemaId && schema.id === schemaId) {
          return false
        }
        if (!schema.organizationId) {
          return true
        }
        return (
          Boolean(selectedOrganizationId) &&
          schema.organizationId === selectedOrganizationId
        )
      }),
    [schemaId, selectedNetworkId, selectedOrganizationId, workspaceSchemas]
  )
  const requiredCount = properties.filter(
    (property) => property.required
  ).length
  const propertyKeys = properties.map((property, index) =>
    toFieldName(property.name || `field${index + 1}`)
  )
  const duplicateKeys = new Set(
    propertyKeys.filter((key, index) => propertyKeys.indexOf(key) !== index)
  )

  const generatedDefinition = useMemo(
    () =>
      definitionFromDrafts({
        name,
        description,
        properties,
        base: definitionBase,
      }),
    [definitionBase, description, name, properties]
  )
  const generatedJson = stringifyDefinition(generatedDefinition)

  useEffect(() => {
    if (jsonSourceRef.current === "json") {
      return
    }
    setJsonText(generatedJson)
    setJsonError(null)
  }, [generatedJson])

  function markBuilderSource() {
    jsonSourceRef.current = "builder"
  }

  function applyJsonSchema(definition: JsonObject) {
    const title =
      typeof definition.title === "string" ? definition.title.trim() : ""
    const nextDescription =
      typeof definition.description === "string" ? definition.description : ""

    jsonSourceRef.current = "json"
    setDefinitionBase(definition)
    if (title) {
      setName(title)
      if (!slugTouched && !editing) {
        setSlug(slugifyId(title))
      }
    }
    setDescription(nextDescription)
    setProperties(draftsFromProperties(getJsonSchemaProperties(definition)))
  }

  function handleJsonChange(text: string) {
    jsonSourceRef.current = "json"
    setJsonText(text)
    const parsed = parseJsonObject(text)
    if (!parsed) {
      setJsonError(jsonSchemaError(text))
      return
    }
    setJsonError(null)
    applyJsonSchema(parsed)
  }

  function handleJsonBlur() {
    if (!jsonText.trim()) {
      jsonSourceRef.current = "builder"
      setJsonText(generatedJson)
      setJsonError(null)
      return
    }
    const parsed = parseJsonObject(jsonText)
    if (!parsed) {
      setJsonError(jsonSchemaError(jsonText))
      return
    }
    jsonSourceRef.current = "json"
    setJsonError(null)
    applyJsonSchema(parsed)
    setJsonText(stringifyDefinition(parsed))
  }

  function updateProperty(key: string, patch: Partial<PropertyDraft>) {
    markBuilderSource()
    setProperties((current) =>
      current.map((property) => {
        if (property.key !== key) {
          return property
        }

        const next: PropertyDraft = { ...property, ...patch }

        if (patch.format === ADDRESS_FORMAT) {
          next.type = "object"
          next.enumValues = []
          next.schemaId = ""
        } else if (patch.format === "foreign") {
          next.type = "string"
          next.enumValues = []
        } else if (patch.format) {
          next.type = "string"
          next.schemaId = ""
        }

        if (patch.type === "object") {
          if (next.format !== ADDRESS_FORMAT) {
            next.format = ""
            next.enumValues = []
            next.schemaId = ""
          }
        } else if (patch.type && patch.type !== "string") {
          next.format = ""
          next.enumValues = []
          next.schemaId = ""
        } else if (patch.type === "string" && next.format === ADDRESS_FORMAT) {
          next.format = ""
        }

        if (next.format !== "foreign") {
          next.schemaId = ""
        }

        return next
      })
    )
  }

  function moveProperty(index: number, offset: number) {
    markBuilderSource()
    setProperties((current) => {
      const nextIndex = index + offset
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  function addProperty() {
    markBuilderSource()
    const next = createProperty()
    setProperties((current) => [...current, next])
    setFocusKey(next.key)
  }

  function duplicateProperty(index: number) {
    markBuilderSource()
    const source = properties[index]
    if (!source) {
      return
    }
    const copy = createProperty({
      ...source,
      name: source.name ? `${source.name}Copy` : "",
      enumValues: [...source.enumValues],
    })
    setProperties((current) => {
      const next = [...current]
      next.splice(index + 1, 0, copy)
      return next
    })
    setFocusKey(copy.key)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !selectedNetworkId || jsonError) {
      return
    }

    const definition = parseJsonObject(jsonText) ?? generatedDefinition

    try {
      if (editing) {
        await updateSchema({
          id: schemaId!,
          name: name.trim(),
          definition,
        }).unwrap()
        onOpenChange(false)
        return
      }

      const schema = await createSchema({
        name: name.trim(),
        definition,
        networkId: selectedNetworkId,
        organizationId: selectedOrganizationId || undefined,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: selectedOrganizationId || undefined,
          rest: `schemas/${schema.id}`,
        })
      )
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  const showNetwork = networks.length > 0 && !editing && !lockNetwork
  const showOrganization = !editing
  const sentence = description.trim()
    ? description.trim()
    : `${properties.length} ${properties.length === 1 ? "field" : "fields"} on this record type.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        className="sm:inset-x-[8vw] lg:inset-x-16 xl:inset-x-[12vw]"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <DialogTitle>
                {editing ? "Edit schema" : "Create a schema"}
              </DialogTitle>
              <DialogDescription>{sentence}</DialogDescription>
            </div>
            <Button
              type="button"
              variant={definitionView === "json" ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setDefinitionView((view) =>
                  view === "properties" ? "json" : "properties"
                )
              }
            >
              <FileJsonIcon />
              {definitionView === "json" ? "Properties" : "JSON"}
            </Button>
          </div>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return
            }
            const target = event.target
            if (
              target instanceof HTMLInputElement &&
              target.type !== "submit" &&
              target.type !== "checkbox"
            ) {
              event.preventDefault()
            }
          }}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden bg-muted/40 px-6 py-5">
            <FieldGroup className="shrink-0 gap-3 rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
              <div
                className={cn(
                  "grid gap-3",
                  showNetwork && showOrganization
                    ? "sm:grid-cols-2"
                    : showNetwork || showOrganization
                      ? "sm:grid-cols-3"
                      : "sm:grid-cols-2"
                )}
              >
                <Field className="gap-1">
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input
                    id={`${formId}-name`}
                    value={name}
                    onChange={(event) => {
                      const next = event.target.value
                      markBuilderSource()
                      setName(next)
                      if (!slugTouched) {
                        setSlug(slugifyId(next))
                      }
                    }}
                    placeholder="Shipment"
                    autoFocus
                    required
                    disabled={isLoading}
                    aria-invalid={error ? true : undefined}
                  />
                </Field>
                <Field className="gap-1">
                  <FieldLabel htmlFor={`${formId}-description`}>
                    Description
                  </FieldLabel>
                  <Input
                    id={`${formId}-description`}
                    value={description}
                    onChange={(event) => {
                      markBuilderSource()
                      setDescription(event.target.value)
                    }}
                    placeholder="Optional"
                    disabled={isLoading}
                  />
                </Field>
                {showNetwork ? (
                  <Field className="gap-1">
                    <FieldLabel htmlFor={`${formId}-network`}>
                      Network
                    </FieldLabel>
                    <Select
                      value={selectedNetworkId}
                      disabled={lockNetwork || isLoading}
                      required
                      modal={false}
                      items={networks.map((network) => ({
                        value: network.id,
                        label: network.name,
                      }))}
                      onValueChange={(value) => {
                        if (!value) {
                          return
                        }
                        setSelectedNetworkId(value)
                        setSelectedOrganizationId("")
                      }}
                    >
                      <SelectTrigger id={`${formId}-network`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {networks.map((network) => (
                          <SelectItem key={network.id} value={network.id}>
                            {network.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
                {showOrganization ? (
                  <Field className="gap-1">
                    <FieldLabel htmlFor={`${formId}-organization`}>
                      Organization
                    </FieldLabel>
                    <Select
                      value={selectedOrganizationId || entireNetworkValue}
                      disabled={lockOrganization || isLoading}
                      modal={false}
                      items={[
                        {
                          value: entireNetworkValue,
                          label: "Entire network",
                        },
                        ...networkOrganizations.map((organization) => ({
                          value: organization.id,
                          label: organization.name,
                        })),
                      ]}
                      onValueChange={(value) => {
                        if (!value || value === entireNetworkValue) {
                          setSelectedOrganizationId("")
                          return
                        }
                        setSelectedOrganizationId(value)
                      }}
                    >
                      <SelectTrigger id={`${formId}-organization`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={entireNetworkValue}>
                          Entire network
                        </SelectItem>
                        {networkOrganizations.map((organization) => (
                          <SelectItem
                            key={organization.id}
                            value={organization.id}
                          >
                            {organization.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
              </div>
              {error ? (
                <FieldError>{getHumaErrorMessage(error)}</FieldError>
              ) : null}
            </FieldGroup>

            {definitionView === "json" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
                <DefinitionJsonPane
                  id={`${formId}-json`}
                  title="JSON Schema"
                  description="Updates as you edit fields. Paste a schema to fill the builder."
                  value={jsonText}
                  onChange={handleJsonChange}
                  onBlur={handleJsonBlur}
                  error={jsonError}
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-hidden">
                <DefinitionCard className="flex h-full min-h-0 flex-col overflow-hidden p-5 sm:p-6">
                  <TooltipProvider delay={400}>
                    <div className="mb-4 flex shrink-0 items-end justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-medium">Fields</h2>
                        <p className="text-sm text-muted-foreground">
                          {properties.length === 0
                            ? "Add the columns each record should have."
                            : `${properties.length} ${properties.length === 1 ? "field" : "fields"}${
                                requiredCount > 0
                                  ? ` · ${requiredCount} required`
                                  : ""
                              }`}
                        </p>
                      </div>
                    </div>

                    {properties.length === 0 ? (
                      <button
                        type="button"
                        onClick={addProperty}
                        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-16 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
                      >
                        <span className="flex size-8 items-center justify-center rounded-full border border-dashed">
                          <PlusIcon className="size-4" />
                        </span>
                        <span className="font-medium text-foreground">
                          Add a field
                        </span>
                        <span>
                          Name it, pick a type, and check Required if every
                          record needs a value.
                        </span>
                      </button>
                    ) : (
                      <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
                        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                          <thead className="sticky top-0 z-10 border-b bg-muted/90 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-sm">
                            <tr>
                              <th className="px-3.5 py-2.5 font-medium">
                                Field
                              </th>
                              <th className="w-[11.5rem] px-3.5 py-2.5 font-medium">
                                Type
                              </th>
                              <th className="w-20 px-3.5 py-2.5 text-center font-medium">
                                Required
                              </th>
                              <th className="px-3.5 py-2.5 font-medium">
                                Default
                              </th>
                              <th className="px-3.5 py-2.5 font-medium">
                                Description
                              </th>
                              <th className="w-px px-2 py-2.5">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          {properties.map((property, index) => (
                            <PropertyRow
                              key={property.key}
                              property={property}
                              index={index}
                              total={properties.length}
                              jsonKey={propertyKeys[index]!}
                              isDuplicate={duplicateKeys.has(
                                propertyKeys[index]!
                              )}
                              focus={property.key === focusKey}
                              relatedSchemas={relatedSchemas}
                              onUpdate={(patch) =>
                                updateProperty(property.key, patch)
                              }
                              onMove={(offset) => moveProperty(index, offset)}
                              onDuplicate={() => duplicateProperty(index)}
                              onRemove={() => {
                                markBuilderSource()
                                setProperties((current) =>
                                  current.filter(
                                    (item) => item.key !== property.key
                                  )
                                )
                              }}
                              onNameEnter={() => {
                                if (index === properties.length - 1) {
                                  addProperty()
                                }
                              }}
                            />
                          ))}
                          <tfoot>
                            <tr>
                              <td colSpan={6} className="p-0">
                                <button
                                  type="button"
                                  onClick={addProperty}
                                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                                >
                                  <PlusIcon className="size-3.5" />
                                  Add field
                                </button>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </TooltipProvider>
                </DefinitionCard>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={isLoading} />}
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !name.trim() ||
                !selectedNetworkId ||
                Boolean(jsonError)
              }
            >
              {isLoading
                ? editing
                  ? "Saving..."
                  : "Creating..."
                : editing
                  ? "Save schema"
                  : "Create schema"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function splitTagTokens(value: string) {
  return value
    .split(/[,\n]/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function TagInput({
  id,
  values,
  onChange,
  placeholder,
}: {
  id?: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState("")

  function addTokens(raw: string) {
    const next = [...values]
    for (const token of splitTagTokens(raw)) {
      if (!next.includes(token)) {
        next.push(token)
      }
    }
    onChange(next)
    setDraft("")
  }

  return (
    <div
      className={cn(
        "flex min-h-8 w-full cursor-text flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1.5 py-1 transition-colors dark:bg-input/30",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {values.map((value) => (
        <span
          key={value}
          className="inline-flex h-6 max-w-full items-center gap-0.5 rounded-full border bg-muted px-2 text-xs font-medium"
        >
          <span className="truncate">{value}</span>
          <button
            type="button"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation()
              onChange(values.filter((item) => item !== value))
            }}
          >
            <XIcon className="size-3" />
            <span className="sr-only">Remove {value}</span>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        value={draft}
        onChange={(event) => {
          const next = event.target.value
          if (/[,\n]/.test(next)) {
            addTokens(next)
            return
          }
          setDraft(next)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            if (draft.trim()) {
              addTokens(draft)
            }
          }
          if (event.key === "Backspace" && !draft && values.length > 0) {
            event.preventDefault()
            onChange(values.slice(0, -1))
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            addTokens(draft)
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text")
          if (/[,\n]/.test(text)) {
            event.preventDefault()
            addTokens(`${draft}${text}`)
          }
        }}
        placeholder={values.length === 0 ? placeholder : undefined}
        className="min-w-16 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground md:text-sm"
      />
    </div>
  )
}

function IconTooltipButton({
  label,
  disabled,
  onClick,
  destructive,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  destructive?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "text-muted-foreground",
              destructive && "hover:bg-destructive/10 hover:text-destructive"
            )}
          />
        }
      >
        {children}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function PropertyRow({
  property,
  index,
  total,
  jsonKey,
  isDuplicate,
  focus,
  relatedSchemas,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
  onNameEnter,
}: {
  property: PropertyDraft
  index: number
  total: number
  jsonKey: string
  isDuplicate: boolean
  focus: boolean
  relatedSchemas: { id: string; name: string }[]
  onUpdate: (patch: Partial<PropertyDraft>) => void
  onMove: (offset: number) => void
  onDuplicate: () => void
  onRemove: () => void
  onNameEnter: () => void
}) {
  const nameId = `${property.key}-name`
  const typeId = `${property.key}-type`
  const requiredId = `${property.key}-required`
  const descriptionId = `${property.key}-description`
  const defaultId = `${property.key}-default`
  const relatedSchemaId = `${property.key}-schema`
  const itemsId = `${property.key}-items`
  const enumId = `${property.key}-enum`
  const derivedKind = kindFromDraft(property)
  const [kind, setKind] = useState<FieldKind>(derivedKind)
  const showJsonKey =
    Boolean(property.name.trim()) && property.name.trim() !== jsonKey

  useEffect(() => {
    const next = kindFromDraft(property)
    setKind((current) =>
      current === "choices" && next === "text" ? "choices" : next
    )
  }, [property.type, property.format, property.enumValues])

  function applyKind(next: FieldKind) {
    setKind(next)
    if (next === "choices") {
      onUpdate({
        type: "string",
        format: "",
        schemaId: "",
        enumValues: property.enumValues,
      })
      return
    }
    onUpdate(draftFromKind(next))
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return
    }
    event.preventDefault()
    onNameEnter()
  }

  const extra =
    kind === "foreign" ||
    kind === "list" ||
    kind === "choices" ||
    kind === "address" ||
    kind === "object" ||
    kind === "file"

  return (
    <tbody className={cn("group", focus && "bg-muted/30")}>
      <tr className={cn("align-top", !extra && "border-b")}>
        <td className="px-3.5 py-2">
          <Input
            id={nameId}
            value={property.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            onKeyDown={handleNameKeyDown}
            placeholder="Status"
            autoFocus={focus}
            required
            aria-label="Field name"
            aria-invalid={isDuplicate || undefined}
          />
          {isDuplicate ? (
            <FieldError className="mt-1">
              Another field already uses this name.
            </FieldError>
          ) : showJsonKey ? (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {jsonKey}
            </p>
          ) : null}
        </td>
        <td className="px-3.5 py-2">
          <Select
            value={kind}
            modal={false}
            items={fieldKinds.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            onValueChange={(value) => {
              if (value) {
                applyKind(value as FieldKind)
              }
            }}
          >
            <SelectTrigger id={typeId} aria-label="Field type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldKinds.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3.5 py-2 text-center">
          <Checkbox
            id={requiredId}
            checked={property.required}
            onCheckedChange={(checked) =>
              onUpdate({ required: checked === true })
            }
            aria-label="Required"
            className="mx-auto"
          />
        </td>
        <td className="px-3.5 py-2">
          <TemplateValueInput
            id={defaultId}
            value={property.defaultValue}
            onChange={(defaultValue) => onUpdate({ defaultValue })}
            groups={defaultTemplateGroups(property.type)}
            options={
              kind === "choices" && property.enumValues.length > 0
                ? property.enumValues.map((value) => ({ value, label: value }))
                : kind === "boolean"
                  ? [
                      { value: "true", label: "Yes" },
                      { value: "false", label: "No" },
                    ]
                  : undefined
            }
            placeholder={kind === "boolean" ? "None" : "Optional"}
          />
        </td>
        <td className="px-3.5 py-2">
          <Input
            id={descriptionId}
            value={property.description}
            onChange={(event) => onUpdate({ description: event.target.value })}
            placeholder="Optional"
            aria-label="Description"
          />
        </td>
        <td className="px-2 py-2 whitespace-nowrap">
          <div className="flex items-center justify-end gap-0.5 opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <IconTooltipButton
              label="Move up"
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ChevronUpIcon />
            </IconTooltipButton>
            <IconTooltipButton
              label="Move down"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            >
              <ChevronDownIcon />
            </IconTooltipButton>
            <IconTooltipButton label="Duplicate field" onClick={onDuplicate}>
              <CopyPlusIcon />
            </IconTooltipButton>
            <IconTooltipButton
              label="Remove field"
              destructive
              onClick={onRemove}
            >
              <Trash2Icon />
            </IconTooltipButton>
          </div>
        </td>
      </tr>
      {extra ? (
        <tr className="border-b">
          <td colSpan={6} className="px-3.5 pb-3">
            {kind === "foreign" ? (
              <div className="max-w-sm">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Related schema
                </p>
                <Select
                  value={property.schemaId || undefined}
                  modal={false}
                  items={relatedSchemas.map((schema) => ({
                    value: schema.id,
                    label: schema.name,
                  }))}
                  onValueChange={(value) => {
                    if (value) {
                      onUpdate({ schemaId: value })
                    }
                  }}
                >
                  <SelectTrigger id={relatedSchemaId}>
                    <SelectValue placeholder="Select a schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {relatedSchemas.map((schema) => (
                      <SelectItem key={schema.id} value={schema.id}>
                        {schema.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {kind === "list" ? (
              <div className="max-w-xs">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  List of
                </p>
                <Select
                  value={property.itemsType}
                  modal={false}
                  items={itemTypes.map((type) => ({
                    value: type,
                    label: itemTypeLabels[type],
                  }))}
                  onValueChange={(value) => {
                    if (value) {
                      onUpdate({
                        itemsType: value as PropertyDraft["itemsType"],
                      })
                    }
                  }}
                >
                  <SelectTrigger id={itemsId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {itemTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {itemTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {kind === "choices" ? (
              <div className="max-w-lg">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Allowed values
                </p>
                <TagInput
                  id={enumId}
                  values={property.enumValues}
                  onChange={(enumValues) => onUpdate({ enumValues })}
                  placeholder="Type a value and press Enter"
                />
              </div>
            ) : null}
            {kind === "file" ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  id={`${property.key}-multiple`}
                  checked={property.type === "array"}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      type: checked === true ? "array" : "string",
                      format: "file",
                      itemsType: "string",
                    })
                  }
                />
                Allow multiple files
              </label>
            ) : null}
            {kind === "address" ? (
              <p className="text-xs text-muted-foreground">
                Stores street, city, region, postal code, and country.
              </p>
            ) : null}
            {kind === "object" ? (
              <p className="text-xs text-muted-foreground">
                Stores nested JSON on the record.
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </tbody>
  )
}
