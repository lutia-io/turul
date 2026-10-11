import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { PlusIcon, XIcon } from "lucide-react"

import { CreateActorFields } from "@/components/create-actor-fields"
import { columnLabel } from "@/components/schema-records-table"
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
  fileIdsFromValue,
  hasSchemaDefault,
  isAddressProperty,
  isCurrencyProperty,
  isFileArrayProperty,
  isFileProperty,
  isForeignProperty,
  isUserArrayProperty,
  isUserProperty,
  isTemplateExpression,
  userIdFromFormValue,
  parseJsonObject,
  type JsonObject,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  organizationUserName,
  useWorkspaceNetworkList,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
  workspaceFileFromApi,
  workspaceOrganizationUserFromApi,
  workspaceRecordFromApi,
} from "@/lib/network-workspace"
import { recordDisplayTitle } from "@/lib/records"
import { fromTimeInputValue, toTimeInputValue } from "@/lib/time"
import { getHumaErrorMessage } from "@/store/api"
import { useCreateFileMutation, useListFilesQuery } from "@/store/file-slice"
import { useListOrganizationUsersQuery } from "@/store/organization-user-slice"
import {
  useCreateRecordMutation,
  useGetRecordQuery,
  useListRecordsQuery,
  useUpdateRecordMutation,
} from "@/store/record-slice"

export function CreateRecordDialog({
  open,
  onOpenChange,
  networkId,
  organizationId,
  schemaId,
  recordId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  organizationId?: string
  schemaId?: string
  recordId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const { organizations } = useWorkspaceOrganizations({ skip: !open })
  const { schemas } = useWorkspaceSchemas({ skip: !open })
  const editing = Boolean(recordId)
  const existingQuery = useGetRecordQuery(recordId ?? "", {
    skip: !open || !recordId,
  })
  const existing = existingQuery.currentData
  const lockNetwork = Boolean(networkId) || editing
  const lockOrganization = Boolean(organizationId) || editing
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
  const [uploads, setUploads] = useState<Record<string, File[]>>({})
  const [formError, setFormError] = useState<string>()
  const [createRecord, createState] = useCreateRecordMutation()
  const [updateRecord, updateState] = useUpdateRecordMutation()
  const [createFile, createFileState] = useCreateFileMutation()
  const isLoading =
    createState.isLoading ||
    updateState.isLoading ||
    createFileState.isLoading ||
    (editing && existingQuery.isFetching && !existing)
  const mutationError =
    createState.error ?? updateState.error ?? createFileState.error
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
    updateState.reset()
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
      if (recordId && existing?.networkId) {
        return existing.networkId
      }
      if (networkId) {
        return networkId
      }
      return current || firstNetworkId
    })
  }, [existing?.networkId, firstNetworkId, networkId, open, recordId])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedOrganizationId((current) => {
      if (recordId && existing?.organizationId) {
        return existing.organizationId
      }
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
    existing?.organizationId,
    firstOrganizationId,
    networkOrganizations,
    open,
    organizationId,
    recordId,
    schemaId,
    schemas,
    selectedSchemaId,
  ])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedOrganizationUserId((current) => {
      if (recordId && existing?.organizationUserId) {
        return existing.organizationUserId
      }
      if (organizationUsers.some((item) => item.id === current)) {
        return current
      }
      return firstOrganizationUserId
    })
  }, [
    existing?.organizationUserId,
    firstOrganizationUserId,
    open,
    organizationUsers,
    recordId,
  ])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedSchemaId((current) => {
      if (
        recordId &&
        existing?.schemaId &&
        availableSchemas.some((schema) => schema.id === existing.schemaId)
      ) {
        return existing.schemaId
      }
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
  }, [
    availableSchemas,
    existing?.schemaId,
    firstSchemaId,
    open,
    recordId,
    schemaId,
  ])

  useEffect(() => {
    if (!open) {
      return
    }
    setUploads({})
    if (recordId) {
      if (existing?.data) {
        setValues(valuesFromData(properties, existing.data))
      }
      return
    }
    setValues(emptyValues(properties))
    // Seed defaults when the selected schema changes. `properties` is a new
    // array whenever workspace schemas remap, which would wipe in-progress input.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schema id + count
  }, [existing?.data, open, properties.length, recordId, selectedSchemaId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)
    if (editing) {
      if (!recordId || !selectedOrganizationUserId) {
        return
      }
    } else if (
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
        if (isUserArrayProperty(property)) {
          const ids = parseFileIds(values[property.name] ?? "")
          if (ids.length === 0) {
            if (inputRequired(property, editing)) {
              setFormError(`${columnLabel(property)} is required.`)
              return
            }
            continue
          }
          data[property.name] = ids
          continue
        }

        if (isUserProperty(property)) {
          const id = userIdFromFormValue(values[property.name] ?? "")
          if (!id) {
            if (inputRequired(property, editing)) {
              setFormError(`${columnLabel(property)} is required.`)
              return
            }
            continue
          }
          data[property.name] = id
          continue
        }

        if (isFileProperty(property)) {
          const ids = parseFileIds(values[property.name] ?? "")
          for (const uploaded of uploads[property.name] ?? []) {
            const created = await createFile({
              file: uploaded,
              organizationUserId: selectedOrganizationUserId,
            }).unwrap()
            ids.push(created.id)
          }
          if (ids.length === 0) {
            if (inputRequired(property, editing)) {
              setFormError(`${columnLabel(property)} is required.`)
              return
            }
            continue
          }
          data[property.name] = isFileArrayProperty(property) ? ids : ids[0]
          continue
        }

        const coerced = coercePropertyValue(
          property,
          values[property.name] ?? ""
        )
        if (coerced === undefined) {
          if (inputRequired(property, editing)) {
            setFormError(`${columnLabel(property)} is required.`)
            return
          }
          continue
        }
        data[property.name] = coerced
      }

      if (editing) {
        await updateRecord({ id: recordId!, data }).unwrap()
        onOpenChange(false)
        return
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
  const canSubmit = editing
    ? Boolean(recordId && existing && selectedOrganizationUserId)
    : Boolean(
        selectedNetworkId &&
        selectedOrganizationId &&
        selectedOrganizationUserId &&
        selectedSchemaId
      )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit record" : "Create a record"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the values stored on this record."
              : "Records belong to a table and are created as an organization user."}
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} autoComplete="off">
          <FieldGroup>
            {editing ? null : (
              <>
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
                    <FieldLabel htmlFor={`${formId}-schema`}>Table</FieldLabel>
                    <NativeSelect
                      id={`${formId}-schema`}
                      value={selectedSchemaId}
                      disabled={isLoading}
                      onChange={(event) =>
                        setSelectedSchemaId(event.target.value)
                      }
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
                    Add a table on the records page first.
                  </p>
                )}
              </>
            )}
            {editing && existingQuery.isError ? (
              <FieldError>
                {getHumaErrorMessage(
                  existingQuery.error,
                  "Failed to load record"
                )}
              </FieldError>
            ) : null}
            {properties.map((property) => (
              <RecordPropertyField
                key={property.name}
                formId={formId}
                property={property}
                schemas={schemas}
                networkId={selectedNetworkId}
                organizationId={selectedOrganizationId}
                organizationUsers={organizationUsers}
                value={values[property.name] ?? ""}
                uploads={uploads[property.name] ?? []}
                editing={editing}
                disabled={isLoading || !selectedOrganizationId}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    [property.name]: value,
                  }))
                }
                onUploadsChange={(files) =>
                  setUploads((current) => ({
                    ...current,
                    [property.name]: files,
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
            disabled={isLoading || !canSubmit}
          >
            {isLoading
              ? editing
                ? "Saving..."
                : "Creating..."
              : editing
                ? "Save"
                : "Create record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function inputRequired(property: JsonSchemaProperty, editing = false) {
  return property.required && (editing || !hasSchemaDefault(property))
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
    const fallback =
      property.type === "boolean" && inputRequired(property) ? "false" : ""
    const staticValue = staticDefaultValue(property)
    if (property.format === "time" && staticValue) {
      values[property.name] = toTimeInputValue(staticValue) || fallback
      continue
    }
    values[property.name] = staticValue ?? fallback
  }
  return values
}

function valuesFromData(
  properties: JsonSchemaProperty[],
  data: JsonObject
): Record<string, string> {
  const values: Record<string, string> = {}
  for (const property of properties) {
    values[property.name] = formValueFromData(property, data[property.name])
  }
  return values
}

function formValueFromData(
  property: JsonSchemaProperty,
  value: JsonValue | undefined
): string {
  if (isFileProperty(property)) {
    return serializeFileIds(
      fileIdsFromValue(value),
      isFileArrayProperty(property)
    )
  }
  if (isUserArrayProperty(property)) {
    return JSON.stringify(fileIdsFromValue(value))
  }
  if (value == null || value === "") {
    return ""
  }
  if (property.type === "boolean") {
    if (value === true) {
      return "true"
    }
    if (value === false) {
      return "false"
    }
    return ""
  }
  if (isAddressProperty(property)) {
    return serializeAddress(parseAddress(value))
  }
  if (property.type === "object" || property.type === "array") {
    return JSON.stringify(value, null, 2)
  }
  if (property.format === "date-time" && typeof value === "string") {
    return toDatetimeLocal(value)
  }
  if (property.format === "time" && typeof value === "string") {
    return toTimeInputValue(value)
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }
  return JSON.stringify(value)
}

function toDatetimeLocal(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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
  if (property.type === "number") {
    if (!trimmed) {
      return undefined
    }
    const parsed = Number(trimmed)
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
    return coerceListValue(property, trimmed)
  }
  if (property.format === "date-time" && trimmed) {
    const date = new Date(trimmed)
    if (Number.isNaN(date.getTime())) {
      return undefined
    }
    return date.toISOString()
  }
  if (property.format === "time" && trimmed) {
    return fromTimeInputValue(trimmed)
  }
  return trimmed || undefined
}

function coerceListValue(
  property: JsonSchemaProperty,
  trimmed: string
): JsonValue | undefined {
  if (!trimmed) {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return undefined
  }
  if (!Array.isArray(parsed)) {
    return undefined
  }
  if (
    isUserArrayProperty(property) ||
    property.itemsType === "string" ||
    !property.itemsType
  ) {
    const items = parsed.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    )
    return items.length > 0 ? items.map((item) => item.trim()) : undefined
  }
  if (property.itemsType === "number") {
    const items = parsed.filter(
      (item): item is number =>
        typeof item === "number" && Number.isFinite(item)
    )
    return items.length > 0 ? items : undefined
  }
  if (property.itemsType === "boolean") {
    const items = parsed.filter(
      (item): item is boolean => typeof item === "boolean"
    )
    return items.length > 0 ? items : undefined
  }
  return parsed.length > 0 ? (parsed as JsonValue) : undefined
}

function parseFileIds(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      )
    }
  } catch {
    // Single file IDs are stored as plain strings.
  }
  return [trimmed]
}

function serializeFileIds(ids: string[], multiple: boolean) {
  if (multiple) {
    return JSON.stringify(ids)
  }
  return ids[0] ?? ""
}

function RecordPropertyField({
  formId,
  property,
  schemas,
  networkId,
  organizationId,
  organizationUsers,
  value,
  uploads,
  editing,
  disabled,
  onChange,
  onUploadsChange,
}: {
  formId: string
  property: JsonSchemaProperty
  schemas: Schema[]
  networkId: string
  organizationId: string
  organizationUsers: {
    id: string
    firstName: string
    lastName: string
    email: string
  }[]
  value: string
  uploads: File[]
  editing?: boolean
  disabled?: boolean
  onChange: (value: string) => void
  onUploadsChange: (files: File[]) => void
}) {
  const id = `${formId}-${property.name}`
  const label = columnLabel(property)
  const required = inputRequired(property, editing)
  const hint = editing ? undefined : defaultHint(property)

  if (isUserArrayProperty(property) || isUserProperty(property)) {
    return (
      <RecordUserField
        id={id}
        label={label}
        required={required}
        description={property.description}
        hint={hint}
        organizationUsers={organizationUsers}
        value={value}
        multiple={isUserArrayProperty(property)}
        disabled={disabled}
        onChange={onChange}
      />
    )
  }

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
        uploads={uploads}
        multiple={isFileArrayProperty(property)}
        disabled={disabled}
        onChange={onChange}
        onUploadsChange={onUploadsChange}
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

  if (
    property.type === "array" &&
    (property.itemsType === "string" ||
      property.itemsType === "number" ||
      property.itemsType === "boolean" ||
      !property.itemsType)
  ) {
    return (
      <RecordListField
        id={id}
        label={label}
        required={required}
        description={property.description}
        hint={hint}
        itemsType={
          property.itemsType === "number" || property.itemsType === "boolean"
            ? property.itemsType
            : "string"
        }
        value={value}
        disabled={disabled}
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

  if (isCurrencyProperty(property)) {
    return (
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            $
          </span>
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            step="any"
            className="pl-6 tabular-nums"
            value={value}
            required={required}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              property.defaultValue &&
              isTemplateExpression(property.defaultValue)
                ? property.defaultValue
                : "0.00"
            }
          />
        </div>
        <FieldHint description={property.description} hint={hint} />
      </Field>
    )
  }

  const inputType =
    property.format === "email"
      ? "email"
      : property.format === "phone"
        ? "tel"
        : property.format === "uri"
          ? "url"
          : property.format === "date"
            ? "date"
            : property.format === "time"
              ? "time"
              : property.format === "date-time"
                ? "datetime-local"
                : property.type === "number"
                  ? "number"
                  : "text"

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={inputType}
        step={inputType === "time" ? 1 : undefined}
        value={value}
        required={required}
        disabled={disabled}
        autoComplete={
          property.format === "phone"
            ? "tel"
            : property.format === "email"
              ? "email"
              : undefined
        }
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

function RecordListField({
  id,
  label,
  required,
  description,
  hint,
  itemsType,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  description?: string
  hint?: string
  itemsType: "string" | "number" | "boolean"
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const items = parseListRows(value)

  function write(next: JsonValue[]) {
    onChange(next.length > 0 ? JSON.stringify(next) : "")
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "" : " (optional)"}
      </FieldLabel>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {itemsType === "boolean" ? (
              <NativeSelect
                id={index === 0 ? id : undefined}
                className="flex-1"
                value={item === true ? "true" : "false"}
                disabled={disabled}
                onChange={(event) => {
                  const next = [...items]
                  next[index] = event.target.value === "true"
                  write(next)
                }}
              >
                <NativeSelectOption value="true">Yes</NativeSelectOption>
                <NativeSelectOption value="false">No</NativeSelectOption>
              </NativeSelect>
            ) : (
              <Input
                id={index === 0 ? id : undefined}
                className="flex-1"
                type={itemsType === "number" ? "number" : "text"}
                value={item == null ? "" : String(item)}
                disabled={disabled}
                onChange={(event) => {
                  const next = [...items]
                  next[index] =
                    itemsType === "number"
                      ? event.target.value === ""
                        ? ""
                        : Number(event.target.value)
                      : event.target.value
                  write(next)
                }}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={`Remove item ${index + 1}`}
              onClick={() =>
                write(items.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <XIcon />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={disabled}
          onClick={() =>
            write([
              ...items,
              itemsType === "number" ? 0 : itemsType === "boolean" ? false : "",
            ])
          }
        >
          <PlusIcon />
          Add
        </Button>
      </div>
      <FieldHint description={description} hint={hint} />
    </Field>
  )
}

function parseListRows(raw: string): JsonValue[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    return Array.isArray(parsed) ? (parsed as JsonValue[]) : []
  } catch {
    return []
  }
}

function RecordUserField({
  id,
  label,
  required,
  description,
  hint,
  organizationUsers,
  value,
  multiple,
  disabled,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  description?: string
  hint?: string
  organizationUsers: {
    id: string
    firstName: string
    lastName: string
    email: string
  }[]
  value: string
  multiple?: boolean
  disabled?: boolean
  onChange: (value: string) => void
}) {
  if (multiple) {
    return (
      <RecordUserListField
        id={id}
        label={label}
        required={required}
        description={description}
        hint={hint}
        organizationUsers={organizationUsers}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    )
  }

  const known = organizationUsers.some((user) => user.id === value)

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "" : " (optional)"}
      </FieldLabel>
      <NativeSelect
        id={id}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="">
          {required ? "Select a user" : "None"}
        </NativeSelectOption>
        {!known && value ? (
          <NativeSelectOption value={value}>{value}</NativeSelectOption>
        ) : null}
        {organizationUsers.map((user) => (
          <NativeSelectOption key={user.id} value={user.id}>
            {organizationUserName(user) || user.email}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldHint description={description} hint={hint} />
    </Field>
  )
}

function RecordUserListField({
  id,
  label,
  required,
  description,
  hint,
  organizationUsers,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  description?: string
  hint?: string
  organizationUsers: {
    id: string
    firstName: string
    lastName: string
    email: string
  }[]
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const selected = parseFileIds(value)
  const remaining = organizationUsers.filter(
    (user) => !selected.includes(user.id)
  )

  function write(ids: string[]) {
    onChange(ids.length > 0 ? JSON.stringify(ids) : "")
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "" : " (optional)"}
      </FieldLabel>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.map((userId) => {
            const user = organizationUsers.find((item) => item.id === userId)
            const name = user
              ? organizationUserName(user) || user.email
              : userId
            return (
              <span
                key={userId}
                className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-muted py-0.5 pr-0.5 pl-2 text-[11px] font-medium"
              >
                <span className="truncate">{name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  disabled={disabled}
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => write(selected.filter((id) => id !== userId))}
                >
                  <XIcon className="size-2.5" />
                </button>
              </span>
            )
          })}
        </div>
      ) : null}
      <NativeSelect
        id={id}
        value=""
        disabled={disabled || remaining.length === 0}
        onChange={(event) => {
          const next = event.target.value
          if (!next || selected.includes(next)) {
            return
          }
          write([...selected, next])
        }}
      >
        <NativeSelectOption value="">
          {remaining.length === 0 ? "No more users" : "Add a user"}
        </NativeSelectOption>
        {remaining.map((user) => (
          <NativeSelectOption key={user.id} value={user.id}>
            {organizationUserName(user) || user.email}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldHint description={description} hint={hint} />
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
  uploads,
  multiple,
  disabled,
  onChange,
  onUploadsChange,
}: {
  id: string
  label: string
  required?: boolean
  description?: string
  networkId: string
  organizationId: string
  value: string
  uploads: File[]
  multiple: boolean
  disabled?: boolean
  onChange: (value: string) => void
  onUploadsChange: (files: File[]) => void
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
  const selectedIds = parseFileIds(value)
  const availableFiles = files.filter((file) => !selectedIds.includes(file.id))

  function setSelectedIds(ids: string[]) {
    onChange(serializeFileIds(ids, multiple))
  }

  function removeSelected(fileId: string) {
    setSelectedIds(selectedIds.filter((id) => id !== fileId))
  }

  function removeUpload(index: number) {
    onUploadsChange(uploads.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiple && (selectedIds.length > 0 || uploads.length > 0) ? (
        <div className="flex flex-col gap-1">
          {selectedIds.map((fileId) => {
            const file = files.find((item) => item.id === fileId)
            return (
              <div
                key={fileId}
                className="flex min-w-0 items-center gap-2 rounded-lg border bg-background px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm">
                  {file?.filename ?? fileId}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  onClick={() => removeSelected(fileId)}
                  aria-label={`Remove ${file?.filename ?? "file"}`}
                >
                  <XIcon />
                </Button>
              </div>
            )
          })}
          {uploads.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex min-w-0 items-center gap-2 rounded-lg border bg-background px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                Upload: {file.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                onClick={() => removeUpload(index)}
                aria-label={`Remove upload ${file.name}`}
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <NativeSelect
        id={id}
        value={multiple || uploads.length > 0 ? "" : (selectedIds[0] ?? "")}
        required={required && selectedIds.length === 0 && uploads.length === 0}
        disabled={disabled || isFetching}
        onChange={(event) => {
          const next = event.target.value
          if (!next) {
            if (!multiple) {
              setSelectedIds([])
            }
            return
          }
          onUploadsChange(multiple ? uploads : [])
          setSelectedIds(multiple ? [...selectedIds, next] : [next])
        }}
      >
        <NativeSelectOption value="">
          {multiple
            ? "Add a file"
            : uploads.length > 0
              ? `Upload: ${uploads[0]?.name}`
              : "Select a file"}
        </NativeSelectOption>
        {!multiple &&
        selectedIds[0] &&
        !files.some((file) => file.id === selectedIds[0]) ? (
          <NativeSelectOption value={selectedIds[0]}>
            {selectedIds[0]}
          </NativeSelectOption>
        ) : null}
        {(multiple ? availableFiles : files).map((file) => (
          <NativeSelectOption key={file.id} value={file.id}>
            {file.filename}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        type="file"
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const next = Array.from(event.target.files ?? [])
          event.target.value = ""
          if (next.length === 0) {
            return
          }
          if (multiple) {
            onUploadsChange([...uploads, ...next])
            return
          }
          setSelectedIds([])
          onUploadsChange(next.slice(0, 1))
        }}
      />
      <FieldDescription>
        {description ??
          (multiple
            ? "Choose existing files or upload new ones."
            : "Choose an existing file or upload a new one.")}
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
      {value && !records.some((record) => record.id === value) ? (
        <NativeSelectOption value={value}>{value}</NativeSelectOption>
      ) : null}
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
