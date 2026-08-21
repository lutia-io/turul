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
import { Textarea } from "@/components/ui/textarea"
import { createNetwork } from "@/data/networks"
import { type BadgeColor } from "@/lib/badge"

const emptyForm = {
  name: "",
  summary: "",
  description: "",
  industry: "",
  headquarters: "",
  coverage: "",
  color: "purple" as BadgeColor,
}

export function CreateNetworkDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const formId = useId()
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) {
      setForm(emptyForm)
    }
  }, [open])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) {
      return
    }

    const network = createNetwork(form)
    onOpenChange(false)
    navigate(`/app/networks/${network.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a network</DialogTitle>
          <DialogDescription>
            Networks group organizations and the schemas, workflows, and
            pipelines they share.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} autoComplete="off">
          <FieldGroup>
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
                placeholder="Acme Logistics"
                autoFocus
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${formId}-industry`}>Industry</FieldLabel>
                <Input
                  id={`${formId}-industry`}
                  value={form.industry}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      industry: event.target.value,
                    }))
                  }
                  placeholder="Logistics & Supply Chain"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-coverage`}>Coverage</FieldLabel>
                <Input
                  id={`${formId}-coverage`}
                  value={form.coverage}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      coverage: event.target.value,
                    }))
                  }
                  placeholder="220+ countries"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${formId}-headquarters`}>
                Headquarters
              </FieldLabel>
              <Input
                id={`${formId}-headquarters`}
                value={form.headquarters}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    headquarters: event.target.value,
                  }))
                }
                placeholder="Bonn, Germany"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-summary`}>Summary</FieldLabel>
              <Input
                id={`${formId}-summary`}
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                placeholder="Global logistics network"
              />
            </Field>
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
                placeholder="What this network coordinates across partner organizations."
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
          <Button type="submit" form={formId} disabled={!form.name.trim()}>
            Create network
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
