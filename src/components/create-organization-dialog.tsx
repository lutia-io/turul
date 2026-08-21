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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { networkWorkspacePath, useWorkspaceNetworks } from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useCreateOrganizationMutation } from "@/store/organization-slice"

export function CreateOrganizationDialog({
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
  const { networks } = useWorkspaceNetworks()
  const lockNetwork = Boolean(networkId)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networks[0]?.id ?? ""
  )
  const [name, setName] = useState("")
  const [createOrganization, { isLoading, error, reset }] =
    useCreateOrganizationMutation()
  const firstNetworkId = networks[0]?.id ?? ""

  useEffect(() => {
    if (open) {
      setName("")
      reset()
    }
  }, [open, reset])

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !selectedNetworkId) {
      return
    }

    try {
      const organization = await createOrganization({
        name: trimmed,
        networkId: selectedNetworkId,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: organization.id,
        })
      )
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create an organization</DialogTitle>
          <DialogDescription>
            Organizations belong to a network and share its schemas and
            definitions.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} autoComplete="off">
          <FieldGroup>
            {networks.length > 0 ? (
              <Field>
                <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                <NativeSelect
                  id={`${formId}-network`}
                  value={selectedNetworkId}
                  disabled={lockNetwork || isLoading}
                  onChange={(event) => setSelectedNetworkId(event.target.value)}
                  required
                >
                  {networks.map((network) => (
                    <NativeSelectOption key={network.id} value={network.id}>
                      {network.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="DHL APAC"
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
          <DialogClose render={<Button variant="outline" disabled={isLoading} />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={isLoading || !name.trim() || !selectedNetworkId}
          >
            {isLoading ? "Creating..." : "Create organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
