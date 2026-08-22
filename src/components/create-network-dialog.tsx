import { useEffect, useId, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

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
import { getHumaErrorMessage } from "@/store/api"
import {
  useCreateNetworkMutation,
  useGetNetworkQuery,
  useUpdateNetworkMutation,
} from "@/store/network-slice"

export function CreateNetworkDialog({
  open,
  onOpenChange,
  networkId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const editing = Boolean(networkId)
  const [name, setName] = useState("")
  const [createNetwork, createState] = useCreateNetworkMutation()
  const [updateNetwork, updateState] = useUpdateNetworkMutation()
  const isLoading = createState.isLoading || updateState.isLoading
  const error = createState.error ?? updateState.error
  const existingQuery = useGetNetworkQuery(networkId ?? "", {
    skip: !open || !networkId,
  })

  useEffect(() => {
    if (!open) {
      return
    }
    createState.reset()
    updateState.reset()
    setName(networkId ? (existingQuery.data?.name ?? "") : "")
  }, [
    createState.reset,
    existingQuery.data?.name,
    networkId,
    open,
    updateState.reset,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }

    try {
      if (editing) {
        await updateNetwork({ id: networkId!, name: trimmed }).unwrap()
        onOpenChange(false)
        return
      }

      const network = await createNetwork({ name: trimmed }).unwrap()
      onOpenChange(false)
      navigate(`/app/networks/${network.id}`)
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit network" : "Create a network"}
          </DialogTitle>
          <DialogDescription>
            Networks group organizations and the schemas, workflows, and
            pipelines they share.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} autoComplete="off">
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Logistics"
                autoFocus
                required
                disabled={isLoading}
                aria-invalid={error ? true : undefined}
              />
            </Field>
            {error ? (
              <FieldError>{getHumaErrorMessage(error)}</FieldError>
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
            disabled={isLoading || !name.trim()}
          >
            {isLoading
              ? editing
                ? "Saving..."
                : "Creating..."
              : editing
                ? "Save network"
                : "Create network"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
