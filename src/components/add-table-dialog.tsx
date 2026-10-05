import { useId, useState, type FormEvent } from "react"

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
import { emptyTableDefinition } from "@/lib/table-columns"
import { getHumaErrorMessage } from "@/store/api"
import { useCreateSchemaMutation } from "@/store/schema-slice"

export function AddTableDialog({
  open,
  onOpenChange,
  networkId,
  organizationId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  organizationId?: string
  onCreated: (schemaId: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <AddTableForm
            networkId={networkId}
            organizationId={organizationId}
            onOpenChange={onOpenChange}
            onCreated={onCreated}
          />
        ) : (
          <DialogHeader>
            <DialogTitle>Add table</DialogTitle>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddTableForm({
  networkId,
  organizationId,
  onOpenChange,
  onCreated,
}: {
  networkId?: string
  organizationId?: string
  onOpenChange: (open: boolean) => void
  onCreated: (schemaId: string) => void
}) {
  const formId = useId()
  const [name, setName] = useState("")
  const [createSchema, { isLoading, error }] = useCreateSchemaMutation()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !networkId) {
      return
    }
    try {
      const created = await createSchema({
        name: trimmed,
        definition: emptyTableDefinition(trimmed),
        networkId,
        organizationId,
      }).unwrap()
      onOpenChange(false)
      onCreated(created.id)
    } catch {
      // The mutation error is shown under the form.
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add table</DialogTitle>
        <DialogDescription>
          A table holds the rows for one kind of record. You can add columns
          after it is created.
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
              {getHumaErrorMessage(error, "Couldn't add this table")}
            </FieldError>
          ) : null}
      </form>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" form={formId} disabled={isLoading || !name.trim()}>
          {isLoading ? "Adding..." : "Add table"}
        </Button>
      </DialogFooter>
    </>
  )
}
