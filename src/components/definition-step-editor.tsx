import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { slugifyId } from "@/lib/slug"

export type FlowStepDraft = {
  key: string
  id: string
  type: string
  name: string
}

export function newFlowStep(
  type: string,
  name = "",
  existing: FlowStepDraft[] = []
): FlowStepDraft {
  const base = slugifyId(name || type)
  const used = new Set(existing.map((step) => step.id))
  let id = base
  let suffix = 2
  while (used.has(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }

  return {
    key: `${id}-${existing.length + 1}`,
    id,
    type,
    name,
  }
}

export function DefinitionStepEditor({
  noun,
  steps,
  typeOptions,
  onChange,
}: {
  noun: "step" | "stage"
  steps: FlowStepDraft[]
  typeOptions: string[]
  onChange: (steps: FlowStepDraft[]) => void
}) {
  function update(key: string, patch: Partial<FlowStepDraft>) {
    onChange(
      steps.map((step) => {
        if (step.key !== key) {
          return step
        }

        const next = { ...step, ...patch }
        if (patch.name && !step.id) {
          next.id = slugifyId(patch.name)
        }
        return next
      })
    )
  }

  function move(index: number, offset: number) {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= steps.length) {
      return
    }

    const next = [...steps]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    onChange(next)
  }

  function addStep() {
    onChange([...steps, newFlowStep(typeOptions[0] ?? "transform", "", steps)])
  }

  if (steps.length === 0) {
    return (
      <button
        type="button"
        onClick={addStep}
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <PlusIcon className="size-4" />
        Add a {noun}.
      </button>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_8.5rem_minmax(7rem,0.9fr)_auto] gap-2 border-b bg-muted/40 px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:grid">
        <span>Name</span>
        <span>Type</span>
        <span>ID</span>
        <span className="sr-only">Actions</span>
      </div>
      {steps.map((step, index) => (
        <div
          key={step.key}
          className="grid gap-2 border-b px-3 py-2 sm:grid-cols-[minmax(0,1.4fr)_8.5rem_minmax(7rem,0.9fr)_auto] sm:items-center"
        >
          <Input
            value={step.name}
            onChange={(event) => update(step.key, { name: event.target.value })}
            placeholder={`${noun[0].toUpperCase()}${noun.slice(1)} name`}
            required
            aria-label={`${noun} ${index + 1} name`}
          />
          <NativeSelect
            value={step.type}
            aria-label={`${noun} ${index + 1} type`}
            onChange={(event) => update(step.key, { type: event.target.value })}
          >
            {typeOptions.map((type) => (
              <NativeSelectOption key={type} value={type}>
                {type}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            value={step.id}
            onChange={(event) => update(step.key, { id: event.target.value })}
            placeholder="id"
            className="font-mono"
            required
            aria-label={`${noun} ${index + 1} id`}
          />
          <div className="flex items-center justify-end gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ChevronUpIcon />
              <span className="sr-only">Move up</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={index === steps.length - 1}
              onClick={() => move(index, 1)}
            >
              <ChevronDownIcon />
              <span className="sr-only">Move down</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() =>
                onChange(steps.filter((item) => item.key !== step.key))
              }
            >
              <Trash2Icon />
              <span className="sr-only">Remove {noun}</span>
            </Button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addStep}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <PlusIcon className="size-3.5" />
        Add {noun}
      </button>
    </div>
  )
}
