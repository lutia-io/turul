import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { CreateActorFields } from "@/components/create-actor-fields"
import { propertyLabel } from "@/components/schema-records-table"
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
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { Schema } from "@/data/networks"
import {
  ADDRESS_FIELDS,
  addressToObject,
  isEmptyAddress,
  parseAddress,
  serializeAddress,
  type AddressFieldName,
} from "@/lib/address"
import {
  getJsonSchemaProperties,
  hasSchemaDefault,
  isAddressProperty,
  isFileProperty,
  isForeignProperty,
  isTemplateExpression,
  parseJsonObject,
  type JsonObject,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
  workspaceFileFromApi,
  workspaceOrganizationUserFromApi,
  workspaceRecordFromApi,
} from "@/lib/network-workspace"
import { recordDisplayTitle } from "@/lib/records"
import { getHumaErrorMessage } from "@/store/api"
import { useCreateFileMutation, useListFilesQuery } from "@/store/file-slice"
import { useListOrganizationUsersQuery } from "@/store/organization-user-slice"
import {
  useCreateRecordMutation,
  useListRecordsQuery,
} from "@/store/record-slice"

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
  const { networks } = useWorkspaceNetworkList()
  const { organizations } = useWorkspaceOrganizations({ skip: !open })
  const { schemas } = useWorkspaceSchemas({ skip: !open })
  const lockNetwork = Boolean(networkId)
  const lockOrganization = Boolean(organizationId)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networks[0]?.id ?? ""
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId ?? ""
  )
  const [selectedOrganizationUserId, setSelectedOrganizationUserId] =
    useState("")
  const [selectedSchemaId, setSelectedSchemaId] = useState(schemaId ?? "")
  const [values, setValues] = useState<Record<string, string>>({})
  const [uploads, setUploads] = useState<Record<string, File | undefined>>({})
  const [formError, setFormError] = useState<string>()
  const [createRecord, createState] = useCreateRecordMutation()
  const [createFile, createFileState] = useCreateFileMutation()
  const isLoading = createState.isLoading || createFileState.isLoading
  const mutationError = createState.error ?? createFileState.error
  const firstNetworkId = networks[0]?.id ?? ""
  const networkOrganizations = useMemo(
    () =>
      organizations.filter(
        (organization) => organization.networkId === selectedNetworkId
      ),
    [organizations, selectedNetworkId]
  )
  const firstOrganizationId = networkOrganizations[0]?.id ?? ""
  const availableSchemas = useMemo(
    () =>
      schemas.filter((schema) => {
        if (schema.networkId !== selectedNetworkId) {
          return false
        }
        if (!selectedOrganizationId) {
          return !schema.organizationId
        }
        return (
          !schema.organizationId ||
          schema.organizationId === selectedOrganizationId
        )
      }),
    [schemas, selectedNetworkId, selectedOrganizationId]
  )
  const selectedSchema = availableSchemas.find(
    (schema) => schema.id === selectedSchemaId
  )
  const properties = useMemo(
    () =>
      selectedSchema ? getJsonSchemaProperties(selectedSchema.definition) : [],
    [selectedSchema]
  )
  const organizationUsersQuery = useListOrganizationUsersQuery(
    {
      networkId: selectedNetworkId,
      organizationId: selectedOrganizationId,
      pageSize: 100,
      sort: "name",
      order: "asc",
    },
    { skip: !open || !selectedNetworkId || !selectedOrganizationId }
  )
  const organizationUsers = useMemo(
    () =>
      (organizationUsersQuery.data?.items ?? []).map(
        workspaceOrganizationUserFromApi
      ),
    [organizationUsersQuery.data]
  )
  const firstOrganizationUserId = organizationUsers[0]?.id ?? ""
  const firstSchemaId = availableSchemas[0]?.id ?? ""

  useEffect(() => {
    createState.reset()
    createFileState.reset()
    setFormError(undefined)
    setUploads({})
    // Reset only when the dialog opens or closes. `reset` changes after each
    // mutation (it closes over requestId) and would clear a 409 before render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedNetworkId((current) => {
      if (networkId) {
        return networkId
      }
      return current || firstNetworkId
    })
  }, [firstNetworkId, networkId, open])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedOrganizationId((current) => {
      if (organizationId) {
        return organizationId
      }
      const schemaOrgId = schemas.find(
        (schema) => schema.id === (schemaId || selectedSchemaId)
      )?.organizationId
      if (
        schemaOrgId &&
        networkOrganizations.some((item) => item.id === schemaOrgId)
      ) {
        return schemaOrgId
      }
      if (networkOrganizations.some((item) => item.id === current)) {
        return current
      }
      return firstOrganizationId
    })
  }, [
    firstOrganizationId,
    networkOrganizations,
    open,
    organizationId,
    schemaId,
    schemas,
    selectedSchemaId,
  ])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedOrganizationUserId((current) => {
      if (organizationUsers.some((item) => item.id === current)) {
        return current
      }
      return firstOrganizationUserId
    })
  }, [firstOrganizationUserId, open, organizationUsers])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedSchemaId((current) => {
      if (
        schemaId &&
        availableSchemas.some((schema) => schema.id === schemaId)
      ) {
        return schemaId
      }
      if (availableSchemas.some((schema) => schema.id === current)) {
        return current
      }
      return firstSchemaId
    })
  }, [availableSchemas, firstSchemaId, open, schemaId])

  useEffect(() => {
    if (!open) {
      return
    }
    setValues(emptyValues(properties))
    setUploads({})
    // Seed defaults when the selected schema changes. `properties` is a new
    // array whenever workspace schemas remap, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schema id + count
  }, [open, properties.length, selectedSchemaId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)
    if (
      !selectedSchemaId ||
      !selectedOrganizationUserId ||
      !selectedNetworkId ||
      !selectedOrganizationId
    ) {
      return
    }

    try {
      const data: JsonObject = {}
      for (const property of properties) {
        const uploaded = uploads[property.name]
        if (isFileProperty(property) && uploaded) {
          const created = await createFile({
            file: uploaded,
            organizationUserId: selectedOrganizationUserId,
          }).unwrap()
          data[property.name] = created.id
          continue
        }

        const coerced = coercePropertyValue(
          property,
          values[property.name] ?? ""
        )
        if (coerced === undefined) {
          if (inputRequired(property)) {
            setFormError(`${propertyLabel(property.name)} is required.`)
            return
          }
          continue
        }
        data[property.name] = coerced
      }

      const created = await createRecord({
        schemaId: selectedSchemaId,
        data,
        organizationUserId: selectedOrganizationUserId,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: organizationId ?? undefined,
          rest: `records/${created.id}`,
        })
      )
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  const schemaLocksOrganization = Boolean(selectedSchema?.organizationId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a record</DialogTitle>
          <DialogDescription>
            Records follow a schema and are created as an organization user.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} autoComplete="off">
          <FieldGroup>
            <CreateActorFields
              formId={formId}
              networks={networks}
              organizations={networkOrganizations}
              organizationUsers={organizationUsers}
              selectedNetworkId={selectedNetworkId}
              selectedOrganizationId={selectedOrganizationId}
              selectedOrganizationUserId={selectedOrganizationUserId}
              onNetworkChange={setSelectedNetworkId}
              onOrganizationChange={setSelectedOrganizationId}
              onOrganizationUserChange={setSelectedOrganizationUserId}
              lockNetwork={lockNetwork}
              lockOrganization={lockOrganization || schemaLocksOrganization}
              disabled={isLoading}
            />
            {availableSchemas.length > 0 ? (
              <Field>
                <FieldLabel htmlFor={`${formId}-schema`}>Schema</FieldLabel>
                <NativeSelect
                  id={`${formId}-schema`}
                  value={selectedSchemaId}
                  disabled={isLoading}
                  onChange={(event) => setSelectedSchemaId(event.target.value)}
                  required
                >
                  {availableSchemas.map((schema) => (
                    <NativeSelectOption key={schema.id} value={schema.id}>
                      {schema.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : (
              <p className="text-sm text-muted-foreground">
                Create a schema in this network first.
              </p>
            )}
            {properties.map((property) => (
              <RecordPropertyField
                key={property.name}
                formId={formId}
                property={property}
                schemas={schemas}
                networkId={selectedNetworkId}
                organizationId={selectedOrganizationId}
                value={values[property.name] ?? ""}
                upload={uploads[property.name]}
                disabled={isLoading || !selectedOrganizationId}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    [property.name]: value,
                  }))
                }
                onUpload={(file) =>
                  setUploads((current) => ({
                    ...current,
                    [property.name]: file,
                  }))
                }
              />
            ))}
            {formError ? <FieldError>{formError}</FieldError> : null}
            {mutationError ? (
              <FieldError>{getHumaErrorMessage(mutationError)}</FieldError>
            ) : null}
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={isLoading} />}
          >
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={
              isLoading ||
              !selectedNetworkId ||
              !selectedOrganizationId ||
              !selectedOrganizationUserId ||
              !selectedSchemaId
            }
          >
            {isLoading ? "Creating..." : "Create record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function inputRequired(property: JsonSchemaProperty) {
  return property.required && !hasSchemaDefault(property)
}

function staticDefaultValue(property: JsonSchemaProperty) {
  if (property.defaultValue === undefined) {
    return undefined
  }
  if (isTemplateExpression(property.defaultValue)) {
    return undefined
  }
  return property.defaultValue
}

function defaultHint(property: JsonSchemaProperty) {
  if (property.defaultValue === undefined) {
    return undefined
  }
  if (isTemplateExpression(property.defaultValue)) {
    return `Filled with ${property.defaultValue} if left blank.`
  }
  return `Defaults to ${property.defaultValue} if left blank.`
}

function emptyValues(properties: JsonSchemaProperty[]) {
  const values: Record<string, string> = {}
  for (const property of properties) {
    values[property.name] =
      staticDefaultValue(property) ??
      (property.type === "boolean" && inputRequired(property) ? "false" : "")
  }
  return values
}

function coercePropertyValue(
  property: JsonSchemaProperty,
  raw: string
): JsonValue | undefined {
  const trimmed = raw.trim()
  if (property.type === "boolean") {
    if (trimmed === "true") {
      return true
    }
    if (trimmed === "false") {
      return false
    }
    return undefined
  }
  if (property.type === "integer" || property.type === "number") {
    if (!trimmed) {
      return undefined
    }
    const parsed =
      property.type === "integer"
        ? Number.parseInt(trimmed, 10)
        : Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (isAddressProperty(property)) {
    const address = parseAddress(raw)
    if (isEmptyAddress(address)) {
      return undefined
    }
    return addressToObject(address)
  }
  if (property.type === "object") {
    if (!trimmed) {
      return undefined
    }
    return parseJsonObject(trimmed)
  }
  if (property.type === "array") {
    if (!trimmed) {
      return undefined
    }
    try {
      return JSON.parse(trimmed) as JsonValue
    } catch {
      return undefined
    }
  }
  if (property.format === "date-time" && trimmed) {
    const date = new Date(trimmed)
    if (Number.isNaN(date.getTime())) {
      return undefined
    }
    return date.toISOString()
  }
  return trimmed || undefined
}

function RecordPropertyField({
  formId,
  property,
  schemas,
  networkId,
  organizationId,
  value,
  upload,
  disabled,
  onChange,
  onUpload,
}: {
  formId: string
  property: JsonSchemaProperty
  schemas: Schema[]
  networkId: string
  organizationId: string
  value: string
  upload?: File
  disabled?: boolean
  onChange: (value: string) => void
  onUpload: (file?: File) => void
}) {
  const id = `${formId}-${property.name}`
  const label = propertyLabel(property.name)
  const required = inputRequired(property)
  const hint = defaultHint(property)

  if (isFileProperty(property)) {
    return (
      <RecordFileField
        id={id}
        label={label}
        required={required}
        description={property.description}
        networkId={networkId}
        organizationId={organizationId}
        value={value}
        upload={upload}
        disabled={disabled}
        onChange={onChange}
        onUpload={onUpload}
      />
    )
  }

  if (isForeignProperty(property)) {
    const relatedSchema = schemas.find((item) => item.id === property.schemaId)
    return (
      <Field>
        <FieldLabel htmlFor={id}>
          {label}
          {required ? "" : " (optional)"}
        </FieldLabel>
        <ForeignRecordSelect
          id={id}
          schema={relatedSchema}
          schemaId={property.schemaId ?? ""}
          networkId={networkId}
          organizationId={organizationId}
          value={value}
          required={required}
          disabled={disabled}
          onChange={onChange}
        />
        <FieldHint description={property.description} hint={hint} />
      </Field>
    )
  }

  if (property.enumValues && property.enumValues.length > 0) {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <NativeSelect
          id={id}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <NativeSelectOption value="">
            {required ? "Select a value" : "None"}
          </NativeSelectOption>
          {property.enumValues.map((item) => (
            <NativeSelectOption key={item} value={item}>
              {item}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldHint hint={hint} />
      </Field>
    )
  }

  if (property.type === "boolean") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <NativeSelect
          id={id}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {required ? null : (
            <NativeSelectOption value="">Unset</NativeSelectOption>
          )}
          <NativeSelectOption value="true">Yes</NativeSelectOption>
          <NativeSelectOption value="false">No</NativeSelectOption>
        </NativeSelect>
        <FieldHint hint={hint} />
      </Field>
    )
  }

  if (isAddressProperty(property)) {
    return (
      <AddressPropertyField
        id={id}
        label={label}
        value={value}
        required={required}
        disabled={disabled}
        description={property.description}
        onChange={onChange}
      />
    )
  }

  if (property.type === "array" || property.type === "object") {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Textarea
          id={id}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={property.type === "array" ? "[ ]" : "{ }"}
        />
        <FieldHint
          description={property.description}
          hint={hint}
          fallback={`JSON ${property.type}.`}
        />
      </Field>
    )
  }

  const inputType =
    property.format === "email"
      ? "email"
      : property.format === "uri"
        ? "url"
        : property.format === "date"
          ? "date"
          : property.format === "date-time"
            ? "datetime-local"
            : property.type === "integer" || property.type === "number"
              ? "number"
              : "text"

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={inputType}
        value={value}
        required={required}
        disabled={disabled}
        step={property.type === "integer" ? "1" : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          property.defaultValue && isTemplateExpression(property.defaultValue)
            ? property.defaultValue
            : undefined
        }
      />
      <FieldHint description={property.description} hint={hint} />
    </Field>
  )
}

function FieldHint({
  description,
  hint,
  fallback,
}: {
  description?: string
  hint?: string
  fallback?: string
}) {
  const text = [description, hint].filter(Boolean).join(" ") || fallback
  if (!text) {
    return null
  }
  return <FieldDescription>{text}</FieldDescription>
}

function AddressPropertyField({
  id,
  label,
  value,
  required,
  disabled,
  description,
  onChange,
}: {
  id: string
  label: string
  value: string
  required?: boolean
  disabled?: boolean
  description?: string
  onChange: (value: string) => void
}) {
  const address = parseAddress(value)
  const requireParts = Boolean(required || !isEmptyAddress(address))

  function updateField(name: AddressFieldName, next: string) {
    onChange(serializeAddress({ ...address, [name]: next }))
  }

  return (
    <FieldSet className="gap-3 rounded-xl border bg-background p-3 shadow-xs">
      <FieldLegend variant="label">
        {label}
        {required ? "" : " (optional)"}
      </FieldLegend>
      <div className="grid gap-3">
        {ADDRESS_FIELDS.slice(0, 2).map((field) => (
          <AddressLineInput
            key={field.name}
            id={id}
            field={field}
            value={address[field.name] ?? ""}
            required={requireParts && field.required}
            disabled={disabled}
            onChange={updateField}
          />
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          {ADDRESS_FIELDS.slice(2, 4).map((field) => (
            <AddressLineInput
              key={field.name}
              id={id}
              field={field}
              value={address[field.name] ?? ""}
              required={requireParts && field.required}
              disabled={disabled}
              onChange={updateField}
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ADDRESS_FIELDS.slice(4).map((field) => (
            <AddressLineInput
              key={field.name}
              id={id}
              field={field}
              value={address[field.name] ?? ""}
              required={requireParts && field.required}
              disabled={disabled}
              onChange={updateField}
            />
          ))}
        </div>
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </FieldSet>
  )
}

function AddressLineInput({
  id,
  field,
  value,
  required,
  disabled,
  onChange,
}: {
  id: string
  field: (typeof ADDRESS_FIELDS)[number]
  value: string
  required: boolean
  disabled?: boolean
  onChange: (name: AddressFieldName, value: string) => void
}) {
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor={`${id}-${field.name}`}>{field.label}</FieldLabel>
      <Input
        id={`${id}-${field.name}`}
        value={value}
        required={required}
        disabled={disabled}
        autoComplete={field.autoComplete}
        placeholder={field.placeholder}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    </Field>
  )
}

function RecordFileField({
  id,
  label,
  required,
  description,
  networkId,
  organizationId,
  value,
  upload,
  disabled,
  onChange,
  onUpload,
}: {
  id: string
  label: string
  required?: boolean
  description?: string
  networkId: string
  organizationId: string
  value: string
  upload?: File
  disabled?: boolean
  onChange: (value: string) => void
  onUpload: (file?: File) => void
}) {
  const { data, isFetching } = useListFilesQuery(
    {
      networkId,
      organizationId,
      pageSize: 100,
      sort: "createdAt",
      order: "desc",
    },
    { skip: !networkId || !organizationId }
  )
  const files = useMemo(
    () => (data?.items ?? []).map(workspaceFileFromApi),
    [data]
  )

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        value={upload ? "" : value}
        required={required && !upload}
        disabled={disabled || isFetching}
        onChange={(event) => {
          onUpload(undefined)
          onChange(event.target.value)
        }}
      >
        <NativeSelectOption value="">
          {upload ? `Upload: ${upload.name}` : "Select a file"}
        </NativeSelectOption>
        {files.map((file) => (
          <NativeSelectOption key={file.id} value={file.id}>
            {file.filename}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        type="file"
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.files?.[0]
          onUpload(next)
          if (next) {
            onChange("")
          }
        }}
      />
      <FieldDescription>
        {description ?? "Choose an existing file or upload a new one."}
      </FieldDescription>
    </Field>
  )
}

function ForeignRecordSelect({
  id,
  schema,
  schemaId,
  networkId,
  organizationId,
  value,
  required,
  disabled,
  onChange,
}: {
  id: string
  schema?: Schema
  schemaId: string
  networkId: string
  organizationId: string
  value: string
  required?: boolean
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const { data, isFetching } = useListRecordsQuery(
    {
      schemaId,
      networkId,
      organizationId,
      pageSize: 100,
      sort: "createdAt",
      order: "desc",
    },
    { skip: !schemaId || !networkId || !organizationId }
  )
  const properties = schema ? getJsonSchemaProperties(schema.definition) : []
  const records = useMemo(
    () => (data?.items ?? []).map(workspaceRecordFromApi),
    [data]
  )

  return (
    <NativeSelect
      id={id}
      value={value}
      required={required}
      disabled={disabled || isFetching || !schemaId}
      onChange={(event) => onChange(event.target.value)}
    >
      <NativeSelectOption value="">
        {schema ? `Select ${schema.name}` : "Select a record"}
      </NativeSelectOption>
      {records.map((record) => (
        <NativeSelectOption key={record.id} value={record.id}>
          {recordDisplayTitle(
            record.data,
            properties,
            schema?.name ?? "Record"
          )}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
