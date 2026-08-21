import { useEffect, useId, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
import { ColorPicker } from "@/components/color-picker"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { JsonSchemaPropertySpec } from "@/data/define-records"
import {
  createSchema,
  getSchema,
  networkList,
  updateSchema,
} from "@/data/networks"
import { type BadgeColor } from "@/lib/badge"
import {
  getJsonSchemaProperties,
  stringifyDefinition,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import { networkWorkspacePath } from "@/lib/network-workspace"
import { slugifyId, toFieldName } from "@/lib/slug"

const propertyTypes = [
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object",
] as const

const formatOptions = ["", "date", "date-time", "email", "uri", "file"] as const

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
  itemsType: "string" | "number" | "integer" | "boolean"
}

function emptyProperty(index: number): PropertyDraft {
  return {
    key: `property-${index}`,
    name: index === 1 ? "id" : `field${index}`,
    type: "string",
    required: index === 1,
    description: "",
    format: "",
    enumText: "",
    itemsType: "string",
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
  if (properties.length === 0) {
    return [emptyProperty(1)]
  }

  return properties.map((property, index) => ({
    key: `property-${property.name}-${index}`,
    name: property.name,
    type: asPropertyType(property.type),
    required: property.required,
    description: property.description ?? "",
    format: asFormat(property.format),
    enumText: property.enumValues?.join(", ") ?? "",
    itemsType: "string",
  }))
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

    if (property.format) {
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
  schemaId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  schemaId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const existing = schemaId ? getSchema(schemaId) : undefined
  const editing = Boolean(existing)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? existing?.network.id ?? networkList[0]?.id ?? ""
  )
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState("")
  const [color, setColor] = useState<BadgeColor>("purple")
  const [active, setActive] = useState(false)
  const [internal, setInternal] = useState(false)
  const [properties, setProperties] = useState<PropertyDraft[]>([
    emptyProperty(1),
  ])

  useEffect(() => {
    if (!open) {
      return
    }

    const current = schemaId ? getSchema(schemaId) : undefined
    setSelectedNetworkId(
      networkId ?? current?.network.id ?? networkList[0]?.id ?? ""
    )
    setName(current?.schema.name ?? "")
    setSlug(current?.schema.slug ?? "")
    setSlugTouched(Boolean(current))
    setDescription(
      typeof current?.schema.definition.description === "string"
        ? current.schema.definition.description
        : ""
    )
    setColor(current?.schema.color ?? "purple")
    setActive(current?.schema.active ?? false)
    setInternal(current?.schema.internal ?? false)
    setProperties(
      current
        ? draftsFromProperties(
            getJsonSchemaProperties(current.schema.definition)
          )
        : [emptyProperty(1)]
    )
  }, [networkId, open, schemaId])

  const definitionPreview = stringifyDefinition({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: name.trim() || "Untitled schema",
    description: description.trim() || undefined,
    type: "object",
    additionalProperties: false,
    ...toSchemaInput(properties),
  })

  function updateProperty(key: string, patch: Partial<PropertyDraft>) {
    setProperties((current) =>
      current.map((property) =>
        property.key === key ? { ...property, ...patch } : property
      )
    )
  }

  function moveProperty(index: number, offset: number) {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !selectedNetworkId) {
      return
    }

    const input = {
      name,
      slug: slugTouched ? slug : slugifyId(name),
      description,
      color,
      active,
      internal,
      ...toSchemaInput(properties),
    }

    const schema = editing
      ? updateSchema(schemaId!, input)
      : createSchema(selectedNetworkId, input)

    onOpenChange(false)
    if (!editing) {
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          rest: `schemas/${schema.id}`,
        })
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,56rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>
            {editing ? "Edit schema" : "Create a schema"}
          </DialogTitle>
          <DialogDescription>
            Build the JSON Schema stored as JSONB. Properties become columns on
            records in this network.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            <FieldGroup>
              {networkList.length > 0 && !editing ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                  <NativeSelect
                    id={`${formId}-network`}
                    value={selectedNetworkId}
                    disabled={Boolean(networkId)}
                    onChange={(event) =>
                      setSelectedNetworkId(event.target.value)
                    }
                    required
                  >
                    {networkList.map((network) => (
                      <NativeSelectOption key={network.id} value={network.id}>
                        {network.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                  <Input
                    id={`${formId}-name`}
                    value={name}
                    onChange={(event) => {
                      const next = event.target.value
                      setName(next)
                      if (!slugTouched) {
                        setSlug(slugifyId(next))
                      }
                    }}
                    placeholder="Shipment Manifest"
                    autoFocus
                    required
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
              <Field>
                <FieldLabel htmlFor={`${formId}-description`}>
                  Description
                </FieldLabel>
                <Textarea
                  id={`${formId}-description`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What this schema represents for partner records."
                />
              </Field>
              <div className="flex flex-wrap items-center gap-5">
                <Field className="w-auto">
                  <FieldLabel>Color</FieldLabel>
                  <ColorPicker value={color} onChange={setColor} />
                </Field>
                <div className="flex flex-col gap-2">
                  <CheckboxField
                    id={`${formId}-active`}
                    checked={active}
                    onChange={setActive}
                    label="Published"
                  />
                  <CheckboxField
                    id={`${formId}-internal`}
                    checked={internal}
                    onChange={setInternal}
                    label="Internal"
                  />
                </div>
              </div>
            </FieldGroup>

            <div className="flex flex-col gap-2">
              <div>
                <h3 className="text-sm font-medium">Properties</h3>
                <p className="text-xs text-muted-foreground">
                  Each property becomes a JSON Schema field and a records
                  column.
                </p>
              </div>
              {properties.map((property, index) => (
                <div
                  key={property.key}
                  className="flex flex-col gap-3 rounded-xl border bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === 0}
                        onClick={() => moveProperty(index, -1)}
                      >
                        <ChevronUpIcon />
                        <span className="sr-only">Move up</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === properties.length - 1}
                        onClick={() => moveProperty(index, 1)}
                      >
                        <ChevronDownIcon />
                        <span className="sr-only">Move down</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={properties.length === 1}
                        onClick={() =>
                          setProperties((current) =>
                            current.filter((item) => item.key !== property.key)
                          )
                        }
                      >
                        <Trash2Icon />
                        <span className="sr-only">Remove property</span>
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input
                        value={property.name}
                        onChange={(event) =>
                          updateProperty(property.key, {
                            name: event.target.value,
                          })
                        }
                        placeholder="shipmentId"
                        className="font-mono"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Type</FieldLabel>
                      <NativeSelect
                        value={property.type}
                        onChange={(event) =>
                          updateProperty(property.key, {
                            type: asPropertyType(event.target.value),
                          })
                        }
                      >
                        {propertyTypes.map((type) => (
                          <NativeSelectOption key={type} value={type}>
                            {type}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel>Format</FieldLabel>
                      <NativeSelect
                        value={property.format}
                        onChange={(event) =>
                          updateProperty(property.key, {
                            format: asFormat(event.target.value),
                          })
                        }
                      >
                        <NativeSelectOption value="">None</NativeSelectOption>
                        {formatOptions.filter(Boolean).map((format) => (
                          <NativeSelectOption key={format} value={format}>
                            {format}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    {property.type === "array" ? (
                      <Field>
                        <FieldLabel>Item type</FieldLabel>
                        <NativeSelect
                          value={property.itemsType}
                          onChange={(event) =>
                            updateProperty(property.key, {
                              itemsType: event.target
                                .value as PropertyDraft["itemsType"],
                            })
                          }
                        >
                          {["string", "number", "integer", "boolean"].map(
                            (type) => (
                              <NativeSelectOption key={type} value={type}>
                                {type}
                              </NativeSelectOption>
                            )
                          )}
                        </NativeSelect>
                      </Field>
                    ) : (
                      <div className="flex items-end pb-1">
                        <CheckboxField
                          checked={property.required}
                          onChange={(checked) =>
                            updateProperty(property.key, { required: checked })
                          }
                          label="Required"
                        />
                      </div>
                    )}
                  </div>
                  {property.type === "array" ? (
                    <CheckboxField
                      checked={property.required}
                      onChange={(checked) =>
                        updateProperty(property.key, { required: checked })
                      }
                      label="Required"
                    />
                  ) : null}
                  <Field>
                    <FieldLabel>Description</FieldLabel>
                    <Input
                      value={property.description}
                      onChange={(event) =>
                        updateProperty(property.key, {
                          description: event.target.value,
                        })
                      }
                      placeholder="What this field stores"
                    />
                  </Field>
                  {property.type === "string" ? (
                    <Field>
                      <FieldLabel>Enum values</FieldLabel>
                      <Input
                        value={property.enumText}
                        onChange={(event) =>
                          updateProperty(property.key, {
                            enumText: event.target.value,
                          })
                        }
                        placeholder="draft, published, archived"
                      />
                    </Field>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  setProperties((current) => [
                    ...current,
                    emptyProperty(current.length + 1),
                  ])
                }
              >
                <PlusIcon />
                Add property
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border bg-muted/30">
              <div className="border-b px-3 py-2">
                <p className="text-xs font-medium">JSONB preview</p>
              </div>
              <pre className="max-h-48 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
                {definitionPreview}
              </pre>
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!name.trim() || !selectedNetworkId}>
              {editing ? "Save schema" : "Create schema"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
