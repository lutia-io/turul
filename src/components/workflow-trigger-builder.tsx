import { CircleHelpIcon } from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import {
  timezoneOptions,
  triggerKindLabels,
  type SchedulePreset,
  type TriggerDraft,
  type TriggerKind,
} from "@/lib/workflow-definition"

const kindItems: { value: TriggerKind; label: string }[] = [
  { value: "created", label: triggerKindLabels.created },
  { value: "updated", label: triggerKindLabels.updated },
  { value: "created_updated", label: triggerKindLabels.created_updated },
  { value: "schedule", label: triggerKindLabels.schedule },
]

const presetItems: { value: SchedulePreset; label: string }[] = [
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every Monday" },
  { value: "custom", label: "Custom cron" },
]

const hours = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
)
const minutes = ["00", "15", "30", "45"]

function hourLabel(hour: string) {
  const value = Number.parseInt(hour, 10)
  const period = value >= 12 ? "PM" : "AM"
  const hour12 = value % 12 === 0 ? 12 : value % 12
  return `${hour12}:00 ${period}`
}

export function WorkflowTriggerBuilder({
  value,
  fields,
  onChange,
}: {
  value: TriggerDraft
  fields: JsonSchemaProperty[]
  onChange: (next: TriggerDraft) => void
}) {
  const includesUpdate =
    value.kind === "updated" || value.kind === "created_updated"
  const zones = timezoneOptions(value.timezone)
  const minuteChoices = minutes.includes(value.minute)
    ? minutes
    : [...minutes, value.minute].sort()
  const hourChoices = hours.includes(value.hour) ? hours : [...hours, value.hour].sort()

  return (
    <TooltipProvider delay={400}>
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium">When</h3>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <CircleHelpIcon className="size-3.5" />
                <span className="sr-only">About the trigger</span>
              </TooltipTrigger>
              <TooltipContent>
                Choose the event that starts this workflow. Conditions below
                still have to match before actions run.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-muted-foreground">
            {triggerKindLabels[value.kind]}
          </p>
        </div>

        <Field>
          <FieldLabel>Trigger</FieldLabel>
          <Select
            value={value.kind}
            modal={false}
            items={kindItems}
            onValueChange={(next) => {
              if (!next) {
                return
              }
              onChange({ ...value, kind: next as TriggerKind })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kindItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {includesUpdate ? (
          <Field>
            <FieldLabel>Only if these fields change</FieldLabel>
            <FieldDescription>
              Leave empty to run on any update. To run when status becomes
              shipped, include Status here and add a condition{" "}
              <span className="font-medium">status is shipped</span> below.
            </FieldDescription>
            {fields.length > 0 ? (
              <div className="mt-2 flex flex-col gap-2">
                {fields.map((field) => (
                  <CheckboxField
                    key={field.name}
                    id={`trigger-changed-${field.name}`}
                    checked={value.changed.includes(field.name)}
                    label={field.name}
                    onChange={(checked) => {
                      const next = checked
                        ? [...value.changed, field.name]
                        : value.changed.filter((item) => item !== field.name)
                      onChange({ ...value, changed: next })
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a record type to choose fields.
              </p>
            )}
          </Field>
        ) : null}

        {value.kind === "schedule" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Repeat</FieldLabel>
              <Select
                value={value.preset}
                modal={false}
                items={presetItems}
                onValueChange={(next) => {
                  if (!next) {
                    return
                  }
                  onChange({ ...value, preset: next as SchedulePreset })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presetItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Timezone</FieldLabel>
              <Select
                value={value.timezone}
                modal={false}
                items={zones.map((zone) => ({ value: zone, label: zone }))}
                onValueChange={(next) => {
                  if (!next) {
                    return
                  }
                  onChange({ ...value, timezone: next })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {value.preset === "daily" || value.preset === "weekly" ? (
              <>
                <Field>
                  <FieldLabel>Hour</FieldLabel>
                  <Select
                    value={value.hour}
                    modal={false}
                    items={hourChoices.map((hour) => ({
                      value: hour,
                      label: hourLabel(hour),
                    }))}
                    onValueChange={(next) => {
                      if (!next) {
                        return
                      }
                      onChange({ ...value, hour: next })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hourChoices.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hourLabel(hour)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Minute</FieldLabel>
                  <Select
                    value={value.minute}
                    modal={false}
                    items={minuteChoices.map((minute) => ({
                      value: minute,
                      label: `:${minute}`,
                    }))}
                    onValueChange={(next) => {
                      if (!next) {
                        return
                      }
                      onChange({ ...value, minute: next })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minuteChoices.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          :{minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </>
            ) : null}
            {value.preset === "custom" ? (
              <Field className="sm:col-span-2">
                <FieldLabel>Cron</FieldLabel>
                <Input
                  value={value.cron}
                  onChange={(event) =>
                    onChange({ ...value, cron: event.target.value })
                  }
                  placeholder="0 9 * * *"
                  className="font-mono"
                />
                <FieldDescription>
                  Five-field cron: minute hour day-of-month month day-of-week.
                </FieldDescription>
              </Field>
            ) : null}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}
