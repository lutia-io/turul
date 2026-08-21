import { useEffect, useId, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

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
import { createOrganization, networkList } from "@/data/networks"
import { type BadgeColor } from "@/lib/badge"
import { networkWorkspacePath } from "@/lib/network-workspace"

const emptyForm = {
  name: "",
  type: "",
  location: "",
  description: "",
  color: "orange" as BadgeColor,
}

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
  const defaultNetworkId = networkId ?? networkList[0]?.id ?? ""
  const [selectedNetworkId, setSelectedNetworkId] = useState(defaultNetworkId)
  const [form, setForm] = useState(emptyForm)
  const lockNetwork = Boolean(networkId)

  useEffect(() => {
    if (open) {
      setForm(emptyForm)
      setSelectedNetworkId(networkId ?? networkList[0]?.id ?? "")
    }
  }, [networkId, open])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !selectedNetworkId) {
      return
    }

    const organization = createOrganization(selectedNetworkId, form)
    onOpenChange(false)
    navigate(
      networkWorkspacePath({
        networkId: selectedNetworkId,
        organizationId: organization.id,
      })
    )
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
            {networkList.length > 0 ? (
              <Field>
                <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                <NativeSelect
                  id={`${formId}-network`}
                  value={selectedNetworkId}
                  disabled={lockNetwork}
                  onChange={(event) => setSelectedNetworkId(event.target.value)}
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
            <Field>
              <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
              <Input
                id={`${formId}-name`}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="DHL APAC"
                autoFocus
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${formId}-type`}>Type</FieldLabel>
                <Input
                  id={`${formId}-type`}
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  placeholder="Express delivery"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-location`}>Location</FieldLabel>
                <Input
                  id={`${formId}-location`}
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Singapore"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${formId}-description`}>
                Description
              </FieldLabel>
              <Textarea
                id={`${formId}-description`}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What this organization does in the network."
              />
            </Field>
            <Field>
              <FieldLabel>Color</FieldLabel>
              <ColorPicker
                value={form.color}
                onChange={(color) =>
                  setForm((current) => ({ ...current, color }))
                }
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={!form.name.trim() || !selectedNetworkId}
          >
            Create organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
