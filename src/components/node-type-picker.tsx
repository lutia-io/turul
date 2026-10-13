import { useMemo, useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { pipelineNodeVisuals } from "@/components/pipeline-flow/pipeline-flow-nodes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  nodeTypeDescriptions,
  nodeTypeLabels,
  nodeTypes,
  type NodeType,
} from "@/lib/node-definition"
import { cn } from "@/lib/utils"

export function NodeTypePicker({
  onSelect,
  onCancel,
  selectedType,
  compact = false,
  autoFocus = true,
  className,
}: {
  onSelect: (type: NodeType) => void
  onCancel?: () => void
  selectedType?: NodeType | null
  compact?: boolean
  autoFocus?: boolean
  className?: string
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return [...nodeTypes]
    }
    return nodeTypes.filter((type) => {
      return (
        nodeTypeLabels[type].toLowerCase().includes(needle) ||
        nodeTypeDescriptions[type].toLowerCase().includes(needle) ||
        type.toLowerCase().includes(needle)
      )
    })
  }, [query])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes…"
            autoFocus={autoFocus}
            className={cn(
              "bg-background pl-8 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
              compact ? "h-8" : "h-9",
              query && "pr-8"
            )}
          />
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
      {filtered.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((type) => {
            const visual = pipelineNodeVisuals[type]
            const Icon = visual.icon
            const selected = selectedType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelect(type)}
                className={cn(
                  "flex min-w-0 items-start rounded-xl border bg-background text-left shadow-xs transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  compact ? "gap-2 p-3" : "gap-3 p-4",
                  selected
                    ? "border-primary/40 ring-1 ring-primary/20"
                    : "border-foreground/10"
                )}
              >
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-md",
                    visual.wrap,
                    compact ? "size-7" : "size-9"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {nodeTypeLabels[type]}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {nodeTypeDescriptions[type]}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
          No matching nodes
        </div>
      )}
    </div>
  )
}
