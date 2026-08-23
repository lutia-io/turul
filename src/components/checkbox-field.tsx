import type { ReactNode } from "react"

import { Checkbox } from "@/components/ui/checkbox"

export function CheckboxField({
  id,
  checked,
  onChange,
  label,
}: {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2 text-sm leading-none select-none"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
      />
      {label}
    </label>
  )
}
