import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { useNavigate } from "react-router"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyPlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
import {
  DefinitionDialogBody,
  DefinitionJsonPane,
  definitionDialogClassName,
} from "@/components/definition-dialog-layout"
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
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { JsonSchemaPropertySpec } from "@/data/define-records"
import { getSchema } from "@/data/networks"
import {
  getJsonSchemaProperties,
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useWorkspaceNetworks,
  useWorkspaceOrganizations,
  workspaceSchemaFromApi,
} from "@/lib/network-workspace"
import { slugifyId, toFieldName } from "@/lib/slug"
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

const propertyTypeLabels: Record<(typeof propertyTypes)[number], string> = {
  string: "Text",
  number: "Number",
  integer: "Integer",
  boolean: "Yes / No",
  array: "List",
  object: "Object",
}

const formatOptions = ["", "date", "date-time", "email", "uri", "file"] as const

const formatLabels: Record<
  Exclude<(typeof formatOptions)[number], "">,
  string
> = {
  date: "Date",
  "date-time": "Date & time",
  email: "Email",
  uri: "URL",
  file: "File",
}

const itemTypes = ["string", "number", "integer", "boolean"] as const

type PropertyType = (typeof propertyTypes)[number]
type PropertyFormat = (typeof formatOptions)[number]

type PropertyDraft = {
  key: string
  name: string
  type: PropertyType
  required: boolean
  description: string
  format: PropertyFormat
  enumText: string
  itemsType: (typeof itemTypes)[number]
}

function emptyProperty(
  key: string,
  defaults?: Partial<PropertyDraft>
): PropertyDraft {
  return {
    key,
    name: "",
    type: "string",
    required: false,
    description: "",
    format: "",
    enumText: "",
    itemsType: "string",
    ...defaults,
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
    enumText: property.enumValues?.join(", ") ?? "",
    itemsType: asItemsType(property.itemsType),
  }))
}

function asItemsType(value: string | undefined): PropertyDraft["itemsType"] {
  return value === "number" || value === "integer" || value === "boolean"
    ? value
    : "string"
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
    mergedProperties[key] = previous ? { ...previous, ...spec } : spec
  }

  const next: JsonObject = {
    ...base,
    $schema: base?.$schema ?? "https://json-schema.org/draft/2020-12/schema",
    title: name.trim() || "Untitled schema",
    type: base?.type ?? "object",
    additionalProperties:
      base?.additionalProperties === undefined
        ? false
        : base.additionalProperties,
    properties: mergedProperties,
    required: input.required,
  }
  const trimmedDescription = description.trim()

  if (trimmedDescription) {
    next.description = trimmedDescription
  } else {
    delete next.description
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

    if (property.format && property.type === "string") {
      spec.format = property.format
    }

    if (property.type === "array") {
      spec.items = { type: property.itemsType }
    }

    const enumValues = property.enumText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    if (enumValues.length > 0 && property.type === "string") {
      spec.enum = enumValues
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
  const { networks } = useWorkspaceNetworks()
  const { organizations } = useWorkspaceOrganizations()
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
  const [active, setActive] = useState(false)
  const [properties, setProperties] = useState<PropertyDraft[]>(() => [
    emptyProperty("property-1", { name: "id", required: true }),
  ])
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [definitionBase, setDefinitionBase] = useState<JsonObject | undefined>()
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
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
    if (open) {
      createState.reset()
      updateState.reset()
      setSelectedOrganizationId(organizationId ?? "")
    }
  }, [createState.reset, open, organizationId, updateState.reset])

  useEffect(() => {
    if (!open) {
      return
    }

    const mockCurrent = schemaId ? getSchema(schemaId) : undefined
    const current =
      mockCurrent?.schema ??
      (apiSchemaQuery.data
        ? workspaceSchemaFromApi(apiSchemaQuery.data)
        : undefined)
    setName(current?.name ?? "")
    setSlug(current?.slug ?? "")
    setSlugTouched(Boolean(current))
    setDescription(
      typeof current?.definition.description === "string"
        ? current.definition.description
        : ""
    )
    setActive(current?.active ?? false)
    jsonSourceRef.current = "builder"
    setDefinitionBase(current?.definition)
    setJsonError(null)
    setFocusKey(null)
    propertyKeyRef.current = 1
    setProperties(
      current
        ? draftsFromProperties(getJsonSchemaProperties(current.definition))
        : [emptyProperty("property-1", { name: "id", required: true })]
    )
  }, [apiSchemaQuery.data, open, schemaId])

  useEffect(() => {
    if (!open) {
      return
    }
    const mockCurrent = schemaId ? getSchema(schemaId) : undefined
    setSelectedNetworkId((current) => {
      if (networkId) {
        return networkId
      }
      return (
        (mockCurrent?.network.id ??
          apiSchemaQuery.data?.networkId ??
          current) ||
        firstNetworkId
      )
    })
    setSelectedOrganizationId((current) => {
      if (organizationId) {
        return organizationId
      }
      return (
        mockCurrent?.schema.organizationId ??
        apiSchemaQuery.data?.organizationId ??
        current
      )
    })
  }, [
    apiSchemaQuery.data?.networkId,
    apiSchemaQuery.data?.organizationId,
    firstNetworkId,
    networkId,
    open,
    organizationId,
    schemaId,
  ])

  const networkOrganizations = organizations.filter(
    (organization) => organization.networkId === selectedNetworkId
  )
  const requiredCount = properties.filter(
    (property) => property.required
  ).length

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
    const nextPatch =
      patch.type && patch.type !== "string"
        ? { ...patch, format: "" as const, enumText: "" }
        : patch
    setProperties((current) =>
      current.map((property) =>
        property.key === key ? { ...property, ...nextPatch } : property
      )
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
          active,
          definition,
        }).unwrap()
        onOpenChange(false)
        return
      }

      const schema = await createSchema({
        name: name.trim(),
        active,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className={definitionDialogClassName}>
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>
            {editing ? "Edit schema" : "Create a schema"}
          </DialogTitle>
          <DialogDescription>
            {selectedOrganizationId
              ? "This schema will belong to the selected organization. Network schemas stay available to every organization."
              : "This schema will be shared across every organization in the network."}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <DefinitionDialogBody
            json={
              <DefinitionJsonPane
                id={`${formId}-json`}
                title="JSON Schema"
                description="Updates as you edit fields. Paste a schema to fill the builder."
                value={jsonText}
                onChange={handleJsonChange}
                onBlur={handleJsonBlur}
                error={jsonError}
              />
            }
          >
            <FieldGroup className="gap-4">
              {networks.length > 0 && !editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`${formId}-network`}>
                      Network
                    </FieldLabel>
                    <NativeSelect
                      id={`${formId}-network`}
                      value={selectedNetworkId}
                      disabled={lockNetwork || isLoading}
                      onChange={(event) => {
                        setSelectedNetworkId(event.target.value)
                        setSelectedOrganizationId("")
                      }}
                      required
                    >
                      {networks.map((network) => (
                        <NativeSelectOption key={network.id} value={network.id}>
                          {network.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-organization`}>
                      Organization
                    </FieldLabel>
                    <NativeSelect
                      id={`${formId}-organization`}
                      value={selectedOrganizationId}
                      disabled={lockOrganization || isLoading}
                      onChange={(event) =>
                        setSelectedOrganizationId(event.target.value)
                      }
                    >
                      <NativeSelectOption value="">
                        Entire network
                      </NativeSelectOption>
                      {networkOrganizations.map((organization) => (
                        <NativeSelectOption
                          key={organization.id}
                          value={organization.id}
                        >
                          {organization.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
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
                    placeholder="Shipment Manifest"
                    autoFocus
                    required
                    disabled={isLoading}
                    aria-invalid={error ? true : undefined}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${formId}-slug`}>Slug</FieldLabel>
                  <Input
                    id={`${formId}-slug`}
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true)
                      setSlug(event.target.value)
                    }}
                    placeholder="shipment-manifest"
                    className="font-mono"
                    disabled={editing}
                    required
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <Field>
                  <FieldLabel htmlFor={`${formId}-description`}>
                    Description
                  </FieldLabel>
                  <Textarea
                    id={`${formId}-description`}
                    value={description}
                    onChange={(event) => {
                      markBuilderSource()
                      setDescription(event.target.value)
                    }}
                    placeholder="What this schema represents for partner records."
                    className="min-h-16"
                  />
                </Field>
                <div className="pb-2">
                  <CheckboxField
                    id={`${formId}-active`}
                    checked={active}
                    onChange={setActive}
                    label="Published"
                  />
                </div>
              </div>
              {error ? (
                <FieldError>{getHumaErrorMessage(error)}</FieldError>
              ) : null}
            </FieldGroup>

            <div className="flex flex-col gap-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium">Properties</h3>
                  <p className="text-xs text-muted-foreground">
                    {properties.length === 0
                      ? "Add fields that become records columns."
                      : `${properties.length} ${properties.length === 1 ? "field" : "fields"}${
                          requiredCount > 0
                            ? ` · ${requiredCount} required`
                            : ""
                        }`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProperty}
                >
                  <PlusIcon />
                  Add field
                </Button>
              </div>

              {properties.length === 0 ? (
                <button
                  type="button"
                  onClick={addProperty}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  <PlusIcon className="size-4" />
                  Add a field, or paste a JSON Schema on the right.
                </button>
              ) : (
                <div className="overflow-hidden rounded-xl border bg-background">
                  <div className="hidden grid-cols-[minmax(0,1.3fr)_8.5rem_minmax(7rem,0.9fr)_4.75rem_auto] gap-2 border-b bg-muted/40 px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:grid">
                    <span>Name</span>
                    <span>Type</span>
                    <span>Options</span>
                    <span>Required</span>
                    <span className="sr-only">Actions</span>
                  </div>
                  {properties.map((property, index) => (
                    <PropertyRow
                      key={property.key}
                      property={property}
                      index={index}
                      total={properties.length}
                      focus={property.key === focusKey}
                      onUpdate={(patch) => updateProperty(property.key, patch)}
                      onMove={(offset) => moveProperty(index, offset)}
                      onDuplicate={() => duplicateProperty(index)}
                      onRemove={() => {
                        markBuilderSource()
                        setProperties((current) =>
                          current.filter((item) => item.key !== property.key)
                        )
                      }}
                      onNameEnter={() => {
                        if (index === properties.length - 1) {
                          addProperty()
                        }
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addProperty}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  >
                    <PlusIcon className="size-3.5" />
                    Add field
                  </button>
                </div>
              )}
            </div>
          </DefinitionDialogBody>
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

function PropertyRow({
  property,
  index,
  total,
  focus,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
  onNameEnter,
}: {
  property: PropertyDraft
  index: number
  total: number
  focus: boolean
  onUpdate: (patch: Partial<PropertyDraft>) => void
  onMove: (offset: number) => void
  onDuplicate: () => void
  onRemove: () => void
  onNameEnter: () => void
}) {
  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return
    }
    event.preventDefault()
    onNameEnter()
  }

  return (
    <div className="border-b last:border-b-0">
      <div className="grid gap-2 px-3 pt-2.5 pb-2 sm:grid-cols-[minmax(0,1.3fr)_8.5rem_minmax(7rem,0.9fr)_4.75rem_auto] sm:items-center">
        <Field className="gap-1">
          <FieldLabel className="sm:sr-only">Name</FieldLabel>
          <Input
            value={property.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            onKeyDown={handleNameKeyDown}
            placeholder="fieldName"
            className="font-mono"
            autoFocus={focus}
            required
            aria-label={`Property ${index + 1} name`}
          />
        </Field>
        <Field className="gap-1">
          <FieldLabel className="sm:sr-only">Type</FieldLabel>
          <NativeSelect
            value={property.type}
            aria-label={`Property ${index + 1} type`}
            onChange={(event) =>
              onUpdate({ type: asPropertyType(event.target.value) })
            }
          >
            {propertyTypes.map((type) => (
              <NativeSelectOption key={type} value={type}>
                {propertyTypeLabels[type]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="gap-1">
          <FieldLabel className="sm:sr-only">
            {property.type === "array" ? "Item type" : "Format"}
          </FieldLabel>
          {property.type === "string" ? (
            <NativeSelect
              value={property.format}
              aria-label={`Property ${index + 1} format`}
              onChange={(event) =>
                onUpdate({ format: asFormat(event.target.value) })
              }
            >
              <NativeSelectOption value="">No format</NativeSelectOption>
              {(["date", "date-time", "email", "uri", "file"] as const).map(
                (format) => (
                  <NativeSelectOption key={format} value={format}>
                    {formatLabels[format]}
                  </NativeSelectOption>
                )
              )}
            </NativeSelect>
          ) : property.type === "array" ? (
            <NativeSelect
              value={property.itemsType}
              aria-label={`Property ${index + 1} item type`}
              onChange={(event) =>
                onUpdate({
                  itemsType: event.target.value as PropertyDraft["itemsType"],
                })
              }
            >
              {itemTypes.map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {propertyTypeLabels[type]} items
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <p className="flex h-8 items-center text-xs text-muted-foreground">
              —
            </p>
          )}
        </Field>
        <div className="flex h-8 items-center">
          <CheckboxField
            checked={property.required}
            onChange={(checked) => onUpdate({ required: checked })}
            label={<span className="sm:sr-only">Required</span>}
          />
        </div>
        <div className="flex items-center justify-end gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon />
            <span className="sr-only">Move up</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon />
            <span className="sr-only">Move down</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onDuplicate}
          >
            <CopyPlusIcon />
            <span className="sr-only">Duplicate</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
          >
            <Trash2Icon />
            <span className="sr-only">Remove property</span>
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "grid gap-2 px-3 pb-2.5 sm:grid-cols-2 sm:pr-[calc(4.75rem+5.5rem)]"
        )}
      >
        <Input
          value={property.description}
          onChange={(event) => onUpdate({ description: event.target.value })}
          placeholder="Description"
          aria-label={`Property ${index + 1} description`}
        />
        {property.type === "string" ? (
          <Input
            value={property.enumText}
            onChange={(event) => onUpdate({ enumText: event.target.value })}
            placeholder="Enum values: draft, published"
            aria-label={`Property ${index + 1} enum values`}
          />
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
    </div>
  )
}
