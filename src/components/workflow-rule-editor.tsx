import { useId, useRef, useState, type ReactNode } from "react"
import { LayersIcon } from "lucide-react"

import { DefinitionCard } from "@/components/definition-detail"
import {
  PipelineDefinitionBuilder,
  type PipelineDefinitionBuilderHandle,
} from "@/components/pipeline-definition-builder"
import { WorkflowCriteriaBuilder } from "@/components/workflow-criteria-builder"
import { WorkflowDefinitionPreview } from "@/components/workflow-definition-preview"
import { WorkflowTriggerBuilder } from "@/components/workflow-trigger-builder"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import {
  pipelineDraftSentence,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import type {
  CriteriaGroupDraft,
  TriggerDraft,
} from "@/lib/workflow-definition"
import { cn } from "@/lib/utils"

export function WorkflowRuleEditor({
  trigger,
  criteria,
  levels,
  fields,
  schemaName,
  networkId,
  organizationId,
  schemaField,
  compact = false,
  showPreview = compact,
  onTriggerChange,
  onCriteriaChange,
  onLevelsChange,
  onNodeSessionChange,
  onJsonErrorChange,
}: {
  trigger: TriggerDraft
  criteria: CriteriaGroupDraft
  levels: PipelineLevelDraft[]
  fields: JsonSchemaProperty[]
  schemaName?: string
  networkId?: string
  organizationId?: string | null
  schemaField?: ReactNode
  compact?: boolean
  showPreview?: boolean
  onTriggerChange: (next: TriggerDraft) => void
  onCriteriaChange: (next: CriteriaGroupDraft) => void
  onLevelsChange: (next: PipelineLevelDraft[]) => void
  onNodeSessionChange?: (open: boolean) => void
  onJsonErrorChange?: (error: string | null) => void
}) {
  const builderRef = useRef<PipelineDefinitionBuilderHandle>(null)
  const jsonId = useId()
  const [nodeOpen, setNodeOpen] = useState(false)
  const cardClass = compact ? "rounded-xl p-4 sm:p-4" : undefined

  function handleNodeSessionChange(open: boolean) {
    setNodeOpen(open)
    onNodeSessionChange?.(open)
  }

  const thenBuilder = (
    <PipelineDefinitionBuilder
      ref={builderRef}
      levels={levels}
      onChange={onLevelsChange}
      view="levels"
      jsonInputId={jsonId}
      networkId={networkId}
      organizationId={organizationId ?? undefined}
      onNodeSessionChange={handleNodeSessionChange}
      onJsonErrorChange={onJsonErrorChange}
      variant="workflow"
      compact={compact}
      framed={false}
      showHeading={compact}
      className={
        compact
          ? nodeOpen
            ? "min-h-[20rem]"
            : undefined
          : "min-h-[24rem]"
      }
    />
  )

  const config = (
    <div className={cn(compact ? "space-y-3" : "space-y-5")}>
      {!nodeOpen ? (
        <>
          <DefinitionCard className={cardClass}>
            <WorkflowTriggerBuilder
              value={trigger}
              fields={fields}
              schemaField={schemaField}
              compact={compact}
              onChange={onTriggerChange}
            />
          </DefinitionCard>
          <DefinitionCard className={cardClass}>
            <WorkflowCriteriaBuilder
              value={criteria}
              fields={fields}
              schemaName={schemaName}
              compact={compact}
              onChange={onCriteriaChange}
            />
          </DefinitionCard>
        </>
      ) : null}

      {compact ? (
        <DefinitionCard className={cn(cardClass, nodeOpen && "min-h-[22rem]")}>
          {thenBuilder}
        </DefinitionCard>
      ) : (
        <DefinitionCard className="flex min-h-[28rem] flex-col">
          {!nodeOpen ? (
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <LayersIcon className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-medium">Then</h2>
                <p className="text-sm text-muted-foreground">
                  Nodes run level by level after the trigger and conditions
                  match.
                </p>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">
                  {pipelineDraftSentence(levels)}
                </p>
              </div>
            </div>
          ) : null}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              !nodeOpen && "mt-4"
            )}
          >
            {thenBuilder}
          </div>
        </DefinitionCard>
      )}
    </div>
  )

  if (!showPreview) {
    return config
  }

  return (
    <div
      className={cn(
        "grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]",
        compact
          ? "min-h-0 flex-1 overflow-hidden"
          : "items-start"
      )}
    >
      <div
        className={cn(
          nodeOpen && "flex flex-col",
          compact ? "min-h-0 overflow-y-auto" : "min-w-0"
        )}
      >
        {config}
      </div>
      <WorkflowDefinitionPreview
        trigger={trigger}
        criteria={criteria}
        levels={levels}
        fields={fields}
        schemaName={schemaName}
        className={cn(
          "hidden lg:flex",
          compact ? "min-h-0" : "xl:sticky xl:top-6"
        )}
        emptyThenHint={
          compact
            ? "Add nodes on the left to run after the rule matches"
            : "No nodes configured yet"
        }
      />
    </div>
  )
}
