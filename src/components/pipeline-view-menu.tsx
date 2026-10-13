import {
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  FileJsonIcon,
  LayersIcon,
  ListTreeIcon,
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
export type WorkflowDefinitionView = "rule" | "canvas" | "preview" | "json"

const pipelineViews: {
  id: PipelineView
  label: string
  icon: LucideIcon
}[] = [
  { id: "levels", label: "Levels", icon: LayersIcon },
  { id: "canvas", label: "Canvas", icon: WorkflowIcon },
  { id: "json", label: "JSON", icon: FileJsonIcon },
]

const workflowViews: {
  id: WorkflowDefinitionView
  label: string
  icon: LucideIcon
}[] = [
  { id: "rule", label: "Rule", icon: ListTreeIcon },
  { id: "canvas", label: "Canvas", icon: WorkflowIcon },
  { id: "preview", label: "Preview", icon: EyeIcon },
  { id: "json", label: "JSON", icon: FileJsonIcon },
]

function ViewMenu<T extends string>({
  value,
  onChange,
  views,
}: {
  value: T
  onChange: (view: T) => void
  views: { id: T; label: string; icon: LucideIcon }[]
}) {
  const current = views.find((view) => view.id === value) ?? views[0]
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
        {views.map((view) => {
          const ViewIcon = view.icon
          const selected = view.id === value

          return (
            <DropdownMenuItem key={view.id} onClick={() => onChange(view.id)}>
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

export function PipelineViewMenu({
  value,
  onChange,
}: {
  value: PipelineView
  onChange: (view: PipelineView) => void
}) {
  return <ViewMenu value={value} onChange={onChange} views={pipelineViews} />
}

export function WorkflowViewMenu({
  value,
  onChange,
}: {
  value: WorkflowDefinitionView
  onChange: (view: WorkflowDefinitionView) => void
}) {
  return <ViewMenu value={value} onChange={onChange} views={workflowViews} />
}
