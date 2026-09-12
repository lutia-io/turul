import {
  CheckIcon,
  ChevronDownIcon,
  FileJsonIcon,
  LayersIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type PipelineView = "canvas" | "levels" | "json"

const pipelineViews: {
  id: PipelineView
  label: string
  icon: LucideIcon
}[] = [
  { id: "levels", label: "Levels", icon: LayersIcon },
  { id: "canvas", label: "Canvas", icon: WorkflowIcon },
  { id: "json", label: "JSON", icon: FileJsonIcon },
]

export function PipelineViewMenu({
  value,
  onChange,
}: {
  value: PipelineView
  onChange: (view: PipelineView) => void
}) {
  const current =
    pipelineViews.find((view) => view.id === value) ?? pipelineViews[0]
  const Icon = current.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        <Icon />
        {current.label}
        <ChevronDownIcon data-icon="inline-end" className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {pipelineViews.map((view) => {
          const ViewIcon = view.icon
          const selected = view.id === value

          return (
            <DropdownMenuItem
              key={view.id}
              onClick={() => onChange(view.id)}
            >
              <ViewIcon />
              {view.label}
              {selected ? <CheckIcon className="ml-auto opacity-70" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
