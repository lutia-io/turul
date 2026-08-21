import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { CheckboxField } from "@/components/checkbox-field"
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
import { files } from "@/data/files"
import { networkList } from "@/data/networks"
import { createRecord } from "@/data/records"
import {
  getJsonSchemaProperties,
  type JsonObject,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import { networkWorkspacePath } from "@/lib/network-workspace"

function emptyValue(property: JsonSchemaProperty): string {
  if (property.type === "boolean") {
    return "false"
  }

  if (property.enumValues?.[0]) {
    return property.enumValues[0]
  }

  return ""
}

function parseValue(
  property: JsonSchemaProperty,
  raw: string
): JsonValue | undefined {
  const value = raw.trim()

  if (property.type === "boolean") {
    return raw === "true"
  }

  if (!value) {
    return undefined
  }

  if (property.type === "integer") {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  if (property.type === "number") {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  if (property.type === "array") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (property.format === "date-time" && value && !value.includes("Z")) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toISOString()
  }

  return value
}

export function CreateRecordDialog({
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
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networkList[0]?.id ?? ""
  )
  const selectedNetwork = networkList.find(
    (network) => network.id === selectedNetworkId
  )
  const organizations = selectedNetwork?.organizations ?? []
  const schemas = selectedNetwork?.schemas ?? []
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId ?? organizations[0]?.id ?? ""
  )
  const [selectedSchemaId, setSelectedSchemaId] = useState(
    schemaId ?? schemas[0]?.id ?? ""
  )
  const schema = schemas.find((item) => item.id === selectedSchemaId)
  const properties = useMemo(
    () => (schema ? getJsonSchemaProperties(schema.definition) : []),
    [schema]
  )
  const [values, setValues] = useState<Record<string, string>>({})
  const orgFiles = files.filter(
    (file) =>
      file.networkId === selectedNetworkId &&
      file.organizationId === selectedOrganizationId
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const nextNetworkId = networkId ?? networkList[0]?.id ?? ""
    const nextNetwork = networkList.find(
      (network) => network.id === nextNetworkId
    )
    const nextOrganizationId =
      organizationId ?? nextNetwork?.organizations[0]?.id ?? ""
    const nextSchemaId = schemaId ?? nextNetwork?.schemas[0]?.id ?? ""
    const nextSchema = nextNetwork?.schemas.find(
      (item) => item.id === nextSchemaId
    )

    setSelectedNetworkId(nextNetworkId)
    setSelectedOrganizationId(nextOrganizationId)
    setSelectedSchemaId(nextSchemaId)
    setValues(
      Object.fromEntries(
        (nextSchema ? getJsonSchemaProperties(nextSchema.definition) : []).map(
          (property) => [property.name, emptyValue(property)]
        )
      )
    )
  }, [networkId, open, organizationId, schemaId])

  function applySchema(
    nextSchemaId: string,
    nextSchemas: typeof schemas = schemas
  ) {
    setSelectedSchemaId(nextSchemaId)
    const nextSchema = nextSchemas.find((item) => item.id === nextSchemaId)
    setValues(
      Object.fromEntries(
        (nextSchema ? getJsonSchemaProperties(nextSchema.definition) : []).map(
          (property) => [property.name, emptyValue(property)]
        )
      )
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedNetworkId || !selectedOrganizationId || !selectedSchemaId) {
      return
    }

    const data: JsonObject = {}
    for (const property of properties) {
      const parsed = parseValue(property, values[property.name] ?? "")
      if (parsed !== undefined) {
        data[property.name] = parsed
      } else if (property.required) {
        return
      }
    }

    const firstString = properties.find(
      (property) =>
        property.type === "string" && typeof data[property.name] === "string"
    )
    const keyValue =
      firstString && typeof data[firstString.name] === "string"
        ? String(data[firstString.name])
        : undefined

    const record = createRecord({
      schemaId: selectedSchemaId,
      organizationId: selectedOrganizationId,
      networkId: selectedNetworkId,
      data,
      key: keyValue
        ? `${selectedOrganizationId}:${selectedSchemaId}:${keyValue}`
        : undefined,
    })

    onOpenChange(false)
    navigate(
      networkWorkspacePath({
        networkId: selectedNetworkId,
        organizationId,
        rest: `records/${record.id}`,
      })
    )
  }

  const missingRequired = properties.some(
    (property) =>
      property.required &&
      property.type !== "boolean" &&
      !(values[property.name] ?? "").trim()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,56rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b p-4 pr-12">
          <DialogTitle>Add a record</DialogTitle>
          <DialogDescription>
            Values are stored against the selected schema&apos;s JSON
            properties.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={handleSubmit}
          autoComplete="off"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <FieldGroup>
              {!networkId ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                  <NativeSelect
                    id={`${formId}-network`}
                    value={selectedNetworkId}
                    onChange={(event) => {
                      const nextId = event.target.value
                      const nextNetwork = networkList.find(
                        (network) => network.id === nextId
                      )
                      setSelectedNetworkId(nextId)
                      setSelectedOrganizationId(
                        organizationId ??
                          nextNetwork?.organizations[0]?.id ??
                          ""
                      )
                      applySchema(
                        schemaId ?? nextNetwork?.schemas[0]?.id ?? "",
                        nextNetwork?.schemas ?? []
                      )
                    }}
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
              {!organizationId ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-organization`}>
                    Organization
                  </FieldLabel>
                  {organizations.length > 0 ? (
                    <NativeSelect
                      id={`${formId}-organization`}
                      value={selectedOrganizationId}
                      onChange={(event) =>
                        setSelectedOrganizationId(event.target.value)
                      }
                      required
                    >
                      {organizations.map((organization) => (
                        <NativeSelectOption
                          key={organization.id}
                          value={organization.id}
                        >
                          {organization.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Add an organization before creating records.
                    </p>
                  )}
                </Field>
              ) : null}
              {!schemaId ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-schema`}>Schema</FieldLabel>
                  {schemas.length > 0 ? (
                    <NativeSelect
                      id={`${formId}-schema`}
                      value={selectedSchemaId}
                      onChange={(event) => applySchema(event.target.value)}
                      required
                    >
                      {schemas.map((item) => (
                        <NativeSelectOption key={item.id} value={item.id}>
                          {item.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Create a schema before adding records.
                    </p>
                  )}
                </Field>
              ) : null}
              {properties.map((property) => (
                <Field key={property.name}>
                  <FieldLabel htmlFor={`${formId}-${property.name}`}>
                    {property.name}
                    {property.required ? " *" : ""}
                  </FieldLabel>
                  {property.type === "boolean" ? (
                    <CheckboxField
                      id={`${formId}-${property.name}`}
                      checked={values[property.name] === "true"}
                      onChange={(checked) =>
                        setValues((current) => ({
                          ...current,
                          [property.name]: checked ? "true" : "false",
                        }))
                      }
                      label={property.description ?? "Enabled"}
                    />
                  ) : property.enumValues && property.enumValues.length > 0 ? (
                    <NativeSelect
                      id={`${formId}-${property.name}`}
                      value={values[property.name] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [property.name]: event.target.value,
                        }))
                      }
                      required={property.required}
                    >
                      {!property.required ? (
                        <NativeSelectOption value="">None</NativeSelectOption>
                      ) : null}
                      {property.enumValues.map((option) => (
                        <NativeSelectOption key={option} value={option}>
                          {option}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  ) : property.format === "file" ? (
                    <NativeSelect
                      id={`${formId}-${property.name}`}
                      value={values[property.name] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [property.name]: event.target.value,
                        }))
                      }
                      required={property.required}
                    >
                      <NativeSelectOption value="">None</NativeSelectOption>
                      {orgFiles.map((file) => (
                        <NativeSelectOption key={file.id} value={file.id}>
                          {file.filename}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Input
                      id={`${formId}-${property.name}`}
                      type={
                        property.type === "integer" ||
                        property.type === "number"
                          ? "number"
                          : property.format === "date"
                            ? "date"
                            : property.format === "date-time"
                              ? "datetime-local"
                              : "text"
                      }
                      step={property.type === "integer" ? "1" : undefined}
                      value={values[property.name] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [property.name]: event.target.value,
                        }))
                      }
                      placeholder={property.description}
                      required={property.required}
                    />
                  )}
                </Field>
              ))}
            </FieldGroup>
          </div>
          <DialogFooter className="mx-0 mb-0">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={
                !selectedNetworkId ||
                !selectedOrganizationId ||
                !selectedSchemaId ||
                missingRequired
              }
            >
              Create record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
