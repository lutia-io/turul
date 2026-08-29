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
  CircleHelpIcon,
  CopyPlusIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  useWorkspaceNetworkList,
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

const entireNetworkValue = "__network__"
const anyFormatValue = "__any__"

type PropertyType = (typeof propertyTypes)[number]
type PropertyFormat = (typeof formatOptions)[number]

type PropertyDraft = {
  key: string
  name: string
  type: PropertyType
  required: boolean
  description: string
  format: PropertyFormat
  enumValues: string[]
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
    enumValues: [],
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
    enumValues: property.enumValues ?? [],
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

    const enumValues = property.enumValues
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
  const { networks } = useWorkspaceNetworkList()
  const { organizations } = useWorkspaceOrganizations({ skip: !open })
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
    const nextPatch =
      patch.type && patch.type !== "string"
        ? { ...patch, format: "" as const, enumValues: [] }
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
                  <Field>
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

            <TooltipProvider delay={400}>
              <div className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-medium">Properties</h3>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                            />
                          }
                        >
                          <CircleHelpIcon className="size-3.5" />
                          <span className="sr-only">About properties</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Each property is a field on records that use this
                          schema. The name becomes the JSON key and column.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {properties.length === 0
                        ? "Add the fields you want on each record."
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
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full border border-dashed">
                      <PlusIcon className="size-4" />
                    </span>
                    <span className="font-medium text-foreground">
                      Add your first field
                    </span>
                    <span>
                      Name it, pick a type, and mark it required if every record
                      needs a value. You can also paste a JSON Schema on the
                      right.
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    {properties.map((property, index) => (
                      <PropertyRow
                        key={property.key}
                        property={property}
                        index={index}
                        total={properties.length}
                        jsonKey={propertyKeys[index]!}
                        isDuplicate={duplicateKeys.has(propertyKeys[index]!)}
                        focus={property.key === focusKey}
                        onUpdate={(patch) =>
                          updateProperty(property.key, patch)
                        }
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
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
                    >
                      <PlusIcon className="size-3.5" />
                      Add field
                    </button>
                  </div>
                )}
              </div>
            </TooltipProvider>
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
  const formatId = `${property.key}-format`
  const itemsId = `${property.key}-items`
  const enumId = `${property.key}-enum`

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return
    }
    event.preventDefault()
    onNameEnter()
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-background p-3 shadow-xs",
        focus && "ring-3 ring-ring/40"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Field {index + 1}
            <span className="font-normal text-muted-foreground">
              {" "}
              of {total}
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {propertyTypeLabels[property.type]}
            {property.required ? " · Required" : " · Optional"}
            {property.name.trim() ? ` · ${jsonKey}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
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
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_10rem_auto] sm:items-start">
        <Field className="gap-1">
          <FieldLabel htmlFor={nameId}>Name</FieldLabel>
          <Input
            id={nameId}
            value={property.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            onKeyDown={handleNameKeyDown}
            placeholder="shipmentId"
            className="font-mono"
            autoFocus={focus}
            required
            aria-invalid={isDuplicate || undefined}
          />
          {isDuplicate ? (
            <FieldError>Another field already uses this name.</FieldError>
          ) : (
            <FieldDescription className="text-xs">
              Becomes the JSON key{" "}
              <span className="font-mono text-foreground">{jsonKey}</span>
            </FieldDescription>
          )}
        </Field>
        <Field className="gap-1">
          <FieldLabel htmlFor={typeId}>Type</FieldLabel>
          <Select
            value={property.type}
            modal={false}
            items={propertyTypes.map((type) => ({
              value: type,
              label: propertyTypeLabels[type],
            }))}
            onValueChange={(value) => {
              if (value) {
                onUpdate({ type: asPropertyType(value) })
              }
            }}
          >
            <SelectTrigger id={typeId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {propertyTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {propertyTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="gap-1 sm:pt-6">
          <CheckboxField
            id={requiredId}
            checked={property.required}
            onChange={(checked) => onUpdate({ required: checked })}
            label="Required"
          />
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field className="gap-1 sm:col-span-2">
          <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
          <Input
            id={descriptionId}
            value={property.description}
            onChange={(event) => onUpdate({ description: event.target.value })}
            placeholder="What this field stores"
          />
        </Field>
        {property.type === "string" ? (
          <>
            <Field className="gap-1">
              <FieldLabel htmlFor={formatId}>Format</FieldLabel>
              <Select
                value={property.format || anyFormatValue}
                modal={false}
                items={[
                  { value: anyFormatValue, label: "Any text" },
                  ...(["date", "date-time", "email", "uri", "file"] as const).map(
                    (format) => ({
                      value: format,
                      label: formatLabels[format],
                    })
                  ),
                ]}
                onValueChange={(value) => {
                  if (!value || value === anyFormatValue) {
                    onUpdate({ format: "" })
                    return
                  }
                  onUpdate({ format: asFormat(value) })
                }}
              >
                <SelectTrigger id={formatId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={anyFormatValue}>Any text</SelectItem>
                  {(["date", "date-time", "email", "uri", "file"] as const).map(
                    (format) => (
                      <SelectItem key={format} value={format}>
                        {formatLabels[format]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field className="gap-1">
              <FieldLabel htmlFor={enumId}>Allowed values</FieldLabel>
              <TagInput
                id={enumId}
                values={property.enumValues}
                onChange={(enumValues) => onUpdate({ enumValues })}
                placeholder="Type a value and press Enter"
              />
              <FieldDescription className="text-xs">
                Optional. Leave empty to allow any text.
              </FieldDescription>
            </Field>
          </>
        ) : null}
        {property.type === "array" ? (
          <Field className="gap-1">
            <FieldLabel htmlFor={itemsId}>List item type</FieldLabel>
            <Select
              value={property.itemsType}
              modal={false}
              items={itemTypes.map((type) => ({
                value: type,
                label: propertyTypeLabels[type],
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
                    {propertyTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        {property.type === "object" ? (
          <FieldDescription className="sm:col-span-2">
            Object fields store nested JSON on the record.
          </FieldDescription>
        ) : null}
      </div>
    </div>
  )
}
