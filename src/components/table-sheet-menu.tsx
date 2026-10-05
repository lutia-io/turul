import { useEffect, useId, useState, type FormEvent } from "react"
import { ChevronDownIcon, PencilIcon, Trash2Icon } from "lucide-react"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Schema } from "@/data/networks"
import { getHumaErrorMessage } from "@/store/api"
import {
  useDeleteSchemaMutation,
  useUpdateSchemaMutation,
} from "@/store/schema-slice"

export function TableSheetMenu({
  schema,
  canEdit,
  canDelete,
  onDeleted,
}: {
  schema: Schema
  canEdit: boolean
  canDelete: boolean
  onDeleted: (schemaId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!canEdit && !canDelete) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`${schema.name} actions`}
          className="mr-1 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          {canEdit ? (
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <PencilIcon />
              Edit table
            </DropdownMenuItem>
          ) : null}
          {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleting(true)}
            >
              <Trash2Icon />
              Delete table
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          {editing ? (
            <EditTableForm schema={schema} onDone={() => setEditing(false)} />
          ) : (
            <DialogHeader>
              <DialogTitle>Edit table</DialogTitle>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>
      <DeleteTableDialog
        schema={schema}
        open={deleting}
        onOpenChange={setDeleting}
        onDeleted={onDeleted}
      />
    </>
  )
}

function EditTableForm({
  schema,
  onDone,
}: {
  schema: Schema
  onDone: () => void
}) {
  const formId = useId()
  const [name, setName] = useState(schema.name)
  const [updateSchema, { isLoading, error }] = useUpdateSchemaMutation()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    if (trimmed === schema.name) {
      onDone()
      return
    }
    try {
      await updateSchema({ id: schema.id, name: trimmed }).unwrap()
      onDone()
    } catch {
      // The mutation error is shown under the form.
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit table</DialogTitle>
        <DialogDescription>
          Rows stay in this table. People see this name on the tab.
        </DialogDescription>
      </DialogHeader>
      <form id={formId} className="grid gap-4" onSubmit={handleSubmit}>
        <Field>
          <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
          <Input
            id={`${formId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Orders"
            autoFocus
            required
          />
        </Field>
        {error ? (
          <FieldError>
            {getHumaErrorMessage(error, "Couldn't save this table")}
          </FieldError>
        ) : null}
      </form>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          form={formId}
          disabled={isLoading || !name.trim()}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </>
  )
}

function DeleteTableDialog({
  schema,
  open,
  onOpenChange,
  onDeleted,
}: {
  schema: Schema
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (schemaId: string) => void
}) {
  const [deleteSchema, { isLoading, error, reset }] = useDeleteSchemaMutation()

  useEffect(() => {
    if (open) {
      reset()
    }
  }, [open, reset])

  async function handleDelete() {
    try {
      await deleteSchema(schema.id).unwrap()
      onOpenChange(false)
      onDeleted(schema.id)
    } catch {
      // The mutation error is shown in the dialog.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {schema.name}</DialogTitle>
          <DialogDescription>
            {schema.name} will be deleted. Its rows are deleted too, and
            workflows that use this table are removed. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <FieldError>
            {getHumaErrorMessage(error, "Couldn't delete this table")}
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
            {isLoading ? "Deleting..." : "Delete table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
