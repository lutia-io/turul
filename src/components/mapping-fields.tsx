import { PlusIcon, Trash2Icon } from "lucide-react"

import {
  TemplateValueInput,
  type TemplateVariableGroup,
} from "@/components/template-value-input"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { emptyMappingEntry, type MappingEntry } from "@/lib/node-definition"

export function MappingFields({
  entries,
  onChange,
  groups,
  disabled,
  namePlaceholder = "field",
  valuePlaceholder = "{{ .Input. }}",
  addLabel = "Add field",
}: {
  entries: MappingEntry[]
  onChange: (entries: MappingEntry[]) => void
  groups: TemplateVariableGroup[]
  disabled?: boolean
  namePlaceholder?: string
  valuePlaceholder?: string
  addLabel?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <div
          key={entry.key}
          className="grid items-start gap-2 rounded-lg border bg-muted/20 p-2.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto]"
        >
          <Field className="gap-1">
            <FieldLabel>Field</FieldLabel>
            <Input
              value={entry.name}
              onChange={(event) =>
                onChange(
                  entries.map((item) =>
                    item.key === entry.key
                      ? { ...item, name: event.target.value }
                      : item
                  )
                )
              }
              placeholder={namePlaceholder}
              disabled={disabled}
            />
          </Field>
          <Field className="gap-1">
            <FieldLabel>Value</FieldLabel>
            <TemplateValueInput
              value={entry.value}
              onChange={(value) =>
                onChange(
                  entries.map((item) =>
                    item.key === entry.key ? { ...item, value } : item
                  )
                )
              }
              groups={groups}
              placeholder={valuePlaceholder}
              disabled={disabled}
            />
          </Field>
          <div className="flex h-8 items-center sm:mt-6">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={disabled || entries.length === 1}
              onClick={() =>
                onChange(entries.filter((item) => item.key !== entry.key))
              }
              aria-label="Remove field"
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...entries, emptyMappingEntry()])}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
      >
        <PlusIcon className="size-3.5" />
        {addLabel}
      </button>
    </div>
  )
}
