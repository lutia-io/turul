import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import {
  BracesIcon,
  CalendarClockIcon,
  CalendarIcon,
  ClockIcon,
  FileIcon,
  HashIcon,
  Link2Icon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  ToggleLeftIcon,
  TypeIcon,
  UserIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { columnLabel } from "@/components/schema-records-table"
import { useCreateEntity } from "@/components/create-entity"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useNetworkWorkspace } from "@/lib/network-workspace"
import { useSchemaWorkflows } from "@/lib/schema-workflows"
import { toFieldName } from "@/lib/slug"
import { getHumaErrorMessage } from "@/store/api"
import { useUpdateSchemaMutation } from "@/store/schema-slice"
import { WorkflowsSubmenu } from "@/components/table-workflows-menu"

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
  const { network, organizationId } = useNetworkWorkspace()
  const { openCreateWorkflow } = useCreateEntity()
  const { canRead, canCreate } = useSchemaWorkflows()
  const showWorkflows = canRead || canCreate

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
        workflows={
          showWorkflows ? (
            <WorkflowsSubmenu
              key="workflows"
              schemaId={table.id}
              field={property.name}
              showList={canRead}
              onCreate={
                canCreate
                  ? () =>
                      openCreateWorkflow({
                        networkId: network?.id,
                        organizationId,
                        schemaId: table.id,
                        field: property.name,
                      })
                  : undefined
              }
            />
          ) : undefined
        }
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
          <DialogDescription>{deleteColumnWarning(label)}</DialogDescription>
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
  const fieldKey =
    mode === "edit" && property
      ? property.name
      : draft.title.trim()
        ? toFieldName(draft.title)
        : ""
  const warnings =
    mode === "edit" && property
      ? columnChangeWarnings(
          columnLabel(property),
          columnImpact(property, draft)
        )
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
      setNameError("Display name is required.")
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
    if (
      draft.kind === "choices" &&
      draft.enumValues.every((value) => !value.trim())
    ) {
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
          fieldKey={fieldKey}
          keyLocked={mode === "edit"}
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
                The display name can change. The key and stored values stay on
                this column.
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
            Choose a display name and the kind of value this column holds.
          </p>
        </div>
        {fields}
      </div>
      <div className="flex justify-end gap-2 border-t px-3 py-2">{actions}</div>
    </form>
  )
}

function ChoicesInput({
  id,
  values,
  onChange,
}: {
  id: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  const [pending, setPending] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function commit(raw: string) {
    const incoming = raw
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
    if (incoming.length === 0) {
      setPending("")
      return
    }
    const seen = new Set(values)
    const next = [...values]
    for (const value of incoming) {
      if (seen.has(value)) {
        continue
      }
      seen.add(value)
      next.push(value)
    }
    if (next.length !== values.length) {
      onChange(next)
    }
    setPending("")
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault()
      commit(pending)
      return
    }
    if (
      event.key === "Backspace" &&
      pending === "" &&
      values.length > 0 &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div
      className="flex min-h-8 w-full cursor-text flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1.5 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault()
          inputRef.current?.focus()
        }
      }}
    >
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-muted py-0.5 pr-0.5 pl-2 text-[11px] font-medium"
        >
          <span className="truncate">{value}</span>
          <button
            type="button"
            aria-label={`Remove ${value}`}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange(values.filter((_, item) => item !== index))}
          >
            <XIcon className="size-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        value={pending}
        onChange={(event) => {
          const value = event.target.value
          if (value.includes("\n")) {
            commit(value)
            return
          }
          setPending(value)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(pending)}
        placeholder="Hit Enter to submit"
        className="h-6 min-w-16 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

const fieldKindIcons = {
  text: TypeIcon,
  choices: ListChecksIcon,
  number: HashIcon,
  boolean: ToggleLeftIcon,
  date: CalendarIcon,
  time: ClockIcon,
  datetime: CalendarClockIcon,
  email: MailIcon,
  phone: PhoneIcon,
  url: LinkIcon,
  file: FileIcon,
  user: UserIcon,
  address: MapPinIcon,
  foreign: Link2Icon,
  list: ListIcon,
  object: BracesIcon,
} satisfies Record<FieldKind, LucideIcon>

const listItemIcons = {
  string: TypeIcon,
  number: HashIcon,
  boolean: ToggleLeftIcon,
} satisfies Record<ListItemType, LucideIcon>

function TypeOption({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  )
}

function FieldKindSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: FieldKind
  onChange: (kind: FieldKind) => void
}) {
  return (
    <Select
      value={value}
      modal={false}
      items={fieldKinds.map((kind) => ({
        value: kind.value,
        label: kind.label,
      }))}
      onValueChange={(next) => {
        if (next) {
          onChange(next)
        }
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue>
          {(selected: FieldKind | null) => {
            const kind = fieldKinds.find((item) => item.value === selected)
            return kind ? (
              <TypeOption
                icon={fieldKindIcons[kind.value]}
                label={kind.label}
              />
            ) : null
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {fieldKinds.map((kind) => (
          <SelectItem key={kind.value} value={kind.value} label={kind.label}>
            <TypeOption icon={fieldKindIcons[kind.value]} label={kind.label} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ListItemTypeSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: ListItemType
  onChange: (itemsType: ListItemType) => void
}) {
  return (
    <Select
      value={value}
      modal={false}
      items={listItemTypes.map((item) => ({
        value: item,
        label: listItemTypeLabels[item],
      }))}
      onValueChange={(next) => {
        if (next) {
          onChange(next)
        }
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue>
          {(selected: ListItemType | null) =>
            selected ? (
              <TypeOption
                icon={listItemIcons[selected]}
                label={listItemTypeLabels[selected]}
              />
            ) : null
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {listItemTypes.map((item) => (
          <SelectItem key={item} value={item} label={listItemTypeLabels[item]}>
            <TypeOption
              icon={listItemIcons[item]}
              label={listItemTypeLabels[item]}
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ColumnFields({
  formId,
  draft,
  tables,
  fieldKey,
  keyLocked,
  nameError,
  onChange,
}: {
  formId: string
  draft: ColumnDraft
  tables: { id: string; name: string }[]
  fieldKey: string
  keyLocked: boolean
  nameError?: string
  onChange: (next: Partial<ColumnDraft>) => void
}) {
  return (
    <div className="grid gap-3">
      <Field data-invalid={nameError ? true : undefined}>
        <FieldLabel htmlFor={`${formId}-name`}>Display name</FieldLabel>
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
        <FieldLabel htmlFor={`${formId}-key`}>Key</FieldLabel>
        <Input
          id={`${formId}-key`}
          value={fieldKey}
          readOnly
          tabIndex={-1}
          placeholder="status"
          className="font-mono text-muted-foreground"
        />
        <FieldDescription>
          {keyLocked
            ? "Workflows and stored values use this key. It does not change."
            : "Saved once from the display name. Renaming later does not change it."}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${formId}-kind`}>Type</FieldLabel>
        <FieldKindSelect
          id={`${formId}-kind`}
          value={draft.kind}
          onChange={(kind) => onChange({ kind })}
        />
      </Field>
      {draft.kind === "choices" ? (
        <Field>
          <FieldLabel htmlFor={`${formId}-choices`}>Choices</FieldLabel>
          <ChoicesInput
            id={`${formId}-choices`}
            values={draft.enumValues}
            onChange={(enumValues) => onChange({ enumValues })}
          />
        </Field>
      ) : null}
      {draft.kind === "list" ? (
        <Field>
          <FieldLabel htmlFor={`${formId}-items`}>List of</FieldLabel>
          <ListItemTypeSelect
            id={`${formId}-items`}
            value={draft.itemsType}
            onChange={(itemsType) => onChange({ itemsType })}
          />
        </Field>
      ) : null}
      {draft.kind === "foreign" ? (
        <Field>
          <FieldLabel htmlFor={`${formId}-related`}>Related table</FieldLabel>
          {tables.length > 0 ? (
            <Select
              value={draft.schemaId || null}
              modal={false}
              items={tables.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              onValueChange={(schemaId) => {
                if (schemaId) {
                  onChange({ schemaId })
                }
              }}
            >
              <SelectTrigger id={`${formId}-related`}>
                <SelectValue placeholder="Choose a table" />
              </SelectTrigger>
              <SelectContent align="start">
                {tables.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        label="Required"
      />
    </div>
  )
}

function saveLabel(
  mode: "add" | "edit",
  confirming: boolean,
  isLoading: boolean
) {
  if (isLoading) {
    return "Saving..."
  }
  if (confirming) {
    return "Save column"
  }
  return mode === "add" ? "Add column" : "Save"
}
