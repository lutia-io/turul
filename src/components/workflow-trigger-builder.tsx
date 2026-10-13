import { ClockIcon, WorkflowIcon } from "lucide-react"
import type { ReactNode } from "react"

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
  WorkflowSectionHeading,
  WorkflowTriggerBadges,
  workflowTriggerIconTone,
  workflowTriggerKindTone,
} from "@/components/workflow-rule"
import { columnLabel } from "@/components/schema-records-table"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import { cn } from "@/lib/utils"
import {
  timezoneOptions,
  triggerKindShortLabels,
  triggerSummary,
  triggerToApi,
  type SchedulePreset,
  type TriggerDraft,
  type TriggerKind,
} from "@/lib/workflow-definition"

const kindItems: { value: TriggerKind; label: string }[] = [
  { value: "created", label: triggerKindShortLabels.created },
  { value: "updated", label: triggerKindShortLabels.updated },
  { value: "created_updated", label: triggerKindShortLabels.created_updated },
  { value: "schedule", label: triggerKindShortLabels.schedule },
]

const presetItems: { value: SchedulePreset; label: string }[] = [
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every Monday" },
  { value: "custom", label: "Custom" },
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
  schemaField,
  compact = false,
  onChange,
}: {
  value: TriggerDraft
  fields: JsonSchemaProperty[]
  schemaField?: ReactNode
  compact?: boolean
  onChange: (next: TriggerDraft) => void
}) {
  const includesUpdate =
    value.kind === "updated" || value.kind === "created_updated"
  const zones = timezoneOptions(value.timezone)
  const minuteChoices = minutes.includes(value.minute)
    ? minutes
    : [...minutes, value.minute].sort()
  const hourChoices = hours.includes(value.hour)
    ? hours
    : [...hours, value.hour].sort()
  const chipClass = cn(
    "rounded-full border transition-colors",
    compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
  )

  return (
    <>
      <WorkflowSectionHeading
        icon={value.kind === "schedule" ? ClockIcon : WorkflowIcon}
        title="When"
        description={triggerSummary(triggerToApi(value), fields)}
        compact={compact}
        iconClassName={workflowTriggerIconTone(value.kind)}
        action={<WorkflowTriggerBadges trigger={value} />}
      />
      <div
        className={cn(
          "flex flex-col",
          compact ? "mt-3 gap-3" : "mt-6 gap-4"
        )}
      >
        {schemaField ? (
          <div className="max-w-sm">{schemaField}</div>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {kindItems.map((item) => {
            const selected = value.kind === item.value
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange({ ...value, kind: item.value })}
                className={cn(
                  chipClass,
                  selected
                    ? workflowTriggerKindTone[item.value]
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {includesUpdate ? (
          <Field className={compact ? "gap-1" : undefined}>
            <FieldLabel>Only if these fields change</FieldLabel>
            <FieldDescription>
              Leave empty to run on any update.
            </FieldDescription>
            {fields.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {fields.map((field) => {
                  const selected = value.changed.includes(field.name)
                  return (
                    <button
                      key={field.name}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? value.changed.filter((item) => item !== field.name)
                          : [...value.changed, field.name]
                        onChange({ ...value, changed: next })
                      }}
                      className={cn(
                        chipClass,
                        selected
                          ? "border-foreground/15 bg-muted font-medium"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {columnLabel(field)}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Pick a table to choose columns.
              </p>
            )}
          </Field>
        ) : null}

        {value.kind === "schedule" ? (
          <div className={cn("grid sm:grid-cols-2", compact ? "gap-3" : "gap-4")}>
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
                items={zones.map((zone) => ({
                  value: zone,
                  label: zone.split("/").at(-1)?.replaceAll("_", " ") ?? zone,
                }))}
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
                      {zone.split("/").at(-1)?.replaceAll("_", " ") ?? zone}
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
                <FieldLabel>Custom schedule</FieldLabel>
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
    </>
  )
}
