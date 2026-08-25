import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { nodeTypeLabel } from "@/lib/node-definition"
import type { NodeDefinition } from "@/data/networks"

export type PipelineLevelDraft = {
  key: string
  nodeIds: string[]
}

export function newPipelineLevel(
  existing: PipelineLevelDraft[] = []
): PipelineLevelDraft {
  return {
    key: `level-${existing.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
    nodeIds: [""],
  }
}

export function PipelineLevelsEditor({
  levels,
  nodes,
  onChange,
}: {
  levels: PipelineLevelDraft[]
  nodes: NodeDefinition[]
  onChange: (levels: PipelineLevelDraft[]) => void
}) {
  const nodeItems = nodes.map((node) => ({
    value: node.id,
    label: `${node.name} (${nodeTypeLabel(node.type)})`,
  }))

  function updateLevel(key: string, nodeIds: string[]) {
    onChange(
      levels.map((level) => (level.key === key ? { ...level, nodeIds } : level))
    )
  }

  function addLevel() {
    onChange([...levels, newPipelineLevel(levels)])
  }

  if (nodes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Create a node definition in this network before adding it to a
        pipeline.
      </p>
    )
  }

  if (levels.length === 0) {
    return (
      <button
        type="button"
        onClick={addLevel}
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <PlusIcon className="size-4" />
        Add a level.
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {levels.map((level, levelIndex) => (
        <div
          key={level.key}
          className="overflow-hidden rounded-xl border bg-background"
        >
          <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Level {levelIndex}</p>
              <p className="text-xs text-muted-foreground">
                Order is the 0-based index later levels read as{" "}
                {"{{ .Input."}
                {levelIndex === 0 ? "0" : String(levelIndex)}
                {" }}"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={levels.length === 1}
              onClick={() =>
                onChange(levels.filter((item) => item.key !== level.key))
              }
            >
              <Trash2Icon />
              <span className="sr-only">Remove level</span>
            </Button>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {level.nodeIds.map((nodeId, nodeIndex) => (
              <div key={`${level.key}-${nodeIndex}`} className="flex gap-2">
                <Select
                  value={nodeId || "__choose_node__"}
                  modal={false}
                  items={[
                    { value: "__choose_node__", label: "Choose a node" },
                    ...nodeItems,
                  ]}
                  onValueChange={(value) => {
                    const next = [...level.nodeIds]
                    next[nodeIndex] = value === "__choose_node__" ? "" : value
                    updateLevel(level.key, next)
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a node" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__choose_node__">
                      Choose a node
                    </SelectItem>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name}
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          {node.slug} · {nodeTypeLabel(node.type)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={level.nodeIds.length === 1}
                  onClick={() =>
                    updateLevel(
                      level.key,
                      level.nodeIds.filter((_, index) => index !== nodeIndex)
                    )
                  }
                >
                  <Trash2Icon />
                  <span className="sr-only">Remove node</span>
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateLevel(level.key, [...level.nodeIds, ""])}
            >
              <PlusIcon />
              Add node
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addLevel}>
        <PlusIcon />
        Add level
      </Button>
    </div>
  )
}
