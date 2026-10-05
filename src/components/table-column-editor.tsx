import { useEffect, useId, useState, type FormEvent } from "react"
import { PlusIcon } from "lucide-react"

import { columnLabel } from "@/components/schema-records-table"
import { CheckboxField } from "@/components/checkbox-field"
import {
  DataTableColumnHeader,
  type ColumnFilterConfig,
  type ColumnPinPosition,
} from "@/components/data-table-view"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import type { JsonObject, JsonSchemaProperty } from "@/lib/json-definition"
import {
  addColumn,
  columnChangeWarnings,
  columnImpact,
  columnNameError,
  deleteColumnWarning,
  draftFromProperty,
  emptyColumnDraft,
  fieldKinds,
  listItemTypeLabels,
  listItemTypes,
  removeColumn,
  updateColumn,
  type ColumnDraft,
  type FieldKind,
  type ListItemType,
} from "@/lib/table-columns"
import { getHumaErrorMessage } from "@/store/api"
import { useUpdateSchemaMutation } from "@/store/schema-slice"

type TableRef = {
  id: string
  name: string
  definition: JsonObject
}

type RelatedTable = {
  id: string
  name: string
}

export function AddColumnButton({
  table,
  tables,
}: {
  table: TableRef
  tables: RelatedTable[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Add column"
        className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground/50 outline-none hover:bg-muted hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <PlusIcon className="size-3" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <ColumnForm
          table={table}
          tables={tables}
          mode="add"
          onDone={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

export function ColumnHeaderMenu({
  table,
  tables,
  property,
  canEdit,
  title,
  sorted,
  onSort,
  filter,
  pin,
  onHide,
}: {
  table: TableRef
  tables: RelatedTable[]
  property: JsonSchemaProperty
  canEdit: boolean
  title: string
  sorted?: false | "asc" | "desc"
  onSort?: (descending: boolean) => void
  filter?: ColumnFilterConfig
  pin?: {
    position: ColumnPinPosition
    onPin: (position: ColumnPinPosition) => void
  }
  onHide?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <>
      <DataTableColumnHeader
        title={title}
        sorted={sorted}
        onSort={onSort}
        filter={filter}
        pin={pin}
        onHide={onHide}
        onEdit={canEdit ? () => setEditing(true) : undefined}
        onDelete={canEdit ? () => setDeleting(true) : undefined}
      />
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <ColumnForm
            table={table}
            tables={tables}
            mode="edit"
            property={property}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>
      <DeleteColumnDialog
        open={deleting}
        onOpenChange={setDeleting}
        table={table}
        property={property}
      />
    </>
  )
}

function DeleteColumnDialog({
  open,
  onOpenChange,
  table,
  property,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: TableRef
  property: JsonSchemaProperty
}) {
  const [updateSchema, { isLoading, error, reset }] = useUpdateSchemaMutation()
  const label = columnLabel(property)

  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  async function handleDelete() {
    try {
      await updateSchema({
        id: table.id,
        definition: removeColumn(table.definition, property.name),
      }).unwrap()
      onOpenChange(false)
    } catch {
      // The mutation error is shown in the dialog.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}</DialogTitle>
          <DialogDescription>
            {deleteColumnWarning(label)}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <FieldError>
            {getHumaErrorMessage(error, "Couldn't delete this column")}
          </FieldError>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading}
            onClick={() => void handleDelete()}
          >
            {isLoading ? "Deleting..." : "Delete column"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ColumnForm({
  table,
  tables,
  mode,
  property,
  onDone,
  onCancel,
}: {
  table: TableRef
  tables: RelatedTable[]
  mode: "add" | "edit"
  property?: JsonSchemaProperty
  onDone: () => void
  onCancel: () => void
}) {
  return (
    <ColumnFormBody
      key={property?.name ?? "add"}
      table={table}
      tables={tables}
      mode={mode}
      property={property}
      onDone={onDone}
      onCancel={onCancel}
    />
  )
}

function ColumnFormBody({
  table,
  mode,
  property,
  tables,
  onDone,
  onCancel,
}: {
  table: TableRef
  mode: "add" | "edit"
  property?: JsonSchemaProperty
  tables: RelatedTable[]
  onDone: () => void
  onCancel: () => void
}) {
  const formId = useId()
  const [draft, setDraft] = useState<ColumnDraft>(() =>
    property ? draftFromProperty(property) : emptyColumnDraft()
  )
  const [confirming, setConfirming] = useState(false)
  const [nameError, setNameError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [updateSchema, { isLoading, error, reset }] = useUpdateSchemaMutation()
  const label = draft.title.trim() || "This column"
  const warnings =
    mode === "edit" && property
      ? columnChangeWarnings(columnLabel(property), columnImpact(property, draft))
      : []

  useEffect(() => {
    reset()
  }, [reset])

  function update(next: Partial<ColumnDraft>) {
    setConfirming(false)
    if (next.title !== undefined) {
      setNameError(undefined)
    }
    setDraft((current) => ({ ...current, ...next }))
  }

  async function save() {
    const title = draft.title.trim()
    if (!title) {
      setNameError("Name is required.")
      setFormError(undefined)
      return
    }
    const duplicate = columnNameError(
      table.definition,
      draft,
      mode === "edit" ? property?.name : undefined
    )
    if (duplicate) {
      setNameError(duplicate)
      setFormError(undefined)
      return
    }
    setNameError(undefined)
    if (draft.kind === "choices" && draft.enumValues.every((value) => !value.trim())) {
      setFormError("Add at least one choice.")
      return
    }
    if (draft.kind === "foreign" && !draft.schemaId) {
      setFormError("Choose a related table.")
      return
    }
    setFormError(undefined)
    if (mode === "edit" && warnings.length > 0 && !confirming) {
      setConfirming(true)
      return
    }
    const definition =
      mode === "edit" && property
        ? updateColumn(table.definition, property.name, draft)
        : addColumn(table.definition, draft)
    try {
      await updateSchema({ id: table.id, definition }).unwrap()
      onDone()
    } catch {
      setConfirming(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save()
  }

  const heading = mode === "add" ? "Add column" : "Edit column"
  const wrapped = mode === "edit"
  const fields = (
    <>
      {confirming ? null : (
        <ColumnFields
          formId={formId}
          draft={draft}
          tables={tables}
          nameError={nameError}
          onChange={update}
        />
      )}
      {formError ? <FieldError>{formError}</FieldError> : null}
      {error ? (
        <FieldError>
          {getHumaErrorMessage(error, "Couldn't save this column")}
        </FieldError>
      ) : null}
    </>
  )
  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        size={wrapped ? "default" : "sm"}
        onClick={() => (confirming ? setConfirming(false) : onCancel())}
      >
        {confirming ? "Back" : "Cancel"}
      </Button>
      <Button
        type="submit"
        form={formId}
        size={wrapped ? "default" : "sm"}
        disabled={isLoading}
      >
        {saveLabel(mode, confirming, isLoading)}
      </Button>
    </>
  )

  if (wrapped) {
    return (
      <>
        <form id={formId} className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {confirming ? `Update ${label}` : heading}
            </DialogTitle>
            {confirming ? (
              <DialogDescription>
                {warnings.map((warning) => (
                  <span key={warning} className="block">
                    {warning}
                  </span>
                ))}
              </DialogDescription>
            ) : (
              <DialogDescription>
                The name you see can change. Values stay attached to this
                column.
              </DialogDescription>
            )}
          </DialogHeader>
          {fields}
        </form>
        <DialogFooter>{actions}</DialogFooter>
      </>
    )
  }

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <div className="grid gap-3 p-3">
        <div>
          <p className="text-sm font-medium">{heading}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a name and the kind of value this column holds.
          </p>
        </div>
        {fields}
      </div>
      <div className="flex justify-end gap-2 border-t px-3 py-2">{actions}</div>
    </form>
  )
}

function ColumnFields({
  formId,
  draft,
  tables,
  nameError,
  onChange,
}: {
  formId: string
  draft: ColumnDraft
  tables: { id: string; name: string }[]
  nameError?: string
  onChange: (next: Partial<ColumnDraft>) => void
}) {
  return (
    <div className="grid gap-3">
      <Field data-invalid={nameError ? true : undefined}>
        <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
        <Input
          id={`${formId}-name`}
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Status"
          required
          aria-invalid={nameError ? true : undefined}
        />
        {nameError ? <FieldError>{nameError}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={`${formId}-kind`}>Type</FieldLabel>
        <NativeSelect
          id={`${formId}-kind`}
          value={draft.kind}
          onChange={(event) =>
            onChange({ kind: event.target.value as FieldKind })
          }
        >
          {fieldKinds.map((kind) => (
            <NativeSelectOption key={kind.value} value={kind.value}>
              {kind.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      {draft.kind === "choices" ? (
        <Field>
          <FieldLabel htmlFor={`${formId}-choices`}>Choices</FieldLabel>
          <Textarea
            id={`${formId}-choices`}
            value={draft.enumValues.join("\n")}
            onChange={(event) =>
              onChange({ enumValues: event.target.value.split("\n") })
            }
            placeholder={"Open\nClosed"}
            rows={4}
          />
        </Field>
      ) : null}
      {draft.kind === "list" ? (
        <Field>
          <FieldLabel htmlFor={`${formId}-items`}>List of</FieldLabel>
          <NativeSelect
            id={`${formId}-items`}
            value={draft.itemsType}
            onChange={(event) =>
              onChange({ itemsType: event.target.value as ListItemType })
            }
          >
            {listItemTypes.map((item) => (
              <NativeSelectOption key={item} value={item}>
                {listItemTypeLabels[item]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      ) : null}
      {draft.kind === "foreign" ? (
        <Field>
          <FieldLabel htmlFor={`${formId}-related`}>Related table</FieldLabel>
          {tables.length > 0 ? (
            <NativeSelect
              id={`${formId}-related`}
              value={draft.schemaId}
              onChange={(event) => onChange({ schemaId: event.target.value })}
            >
              <NativeSelectOption value="">Choose a table</NativeSelectOption>
              {tables.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add a table before relating records.
            </p>
          )}
        </Field>
      ) : null}
      <CheckboxField
        id={`${formId}-required`}
        checked={draft.required}
        onChange={(required) => onChange({ required })}
        label="Required on new rows"
      />
    </div>
  )
}

function saveLabel(mode: "add" | "edit", confirming: boolean, isLoading: boolean) {
  if (isLoading) {
    return "Saving..."
  }
  if (confirming) {
    return "Save column"
  }
  return mode === "add" ? "Add column" : "Save"
}
