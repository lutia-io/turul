import { useId, useRef, useState, type ReactNode } from "react"

import { DefinitionCard } from "@/components/definition-detail"
import {
  PipelineDefinitionBuilder,
  type PipelineDefinitionBuilderHandle,
} from "@/components/pipeline-definition-builder"
import {
  PipelineViewMenu,
  type PipelineView,
} from "@/components/pipeline-view-menu"
import { WorkflowCriteriaBuilder } from "@/components/workflow-criteria-builder"
import { WorkflowTriggerBuilder } from "@/components/workflow-trigger-builder"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import { pipelineDraftSentence, type PipelineLevelDraft } from "@/lib/pipeline-definition"
import type { CriteriaGroupDraft, TriggerDraft } from "@/lib/workflow-definition"

export function WorkflowRuleEditor({
  trigger,
  criteria,
  levels,
  fields,
  schemaName,
  networkId,
  organizationId,
  schemaField,
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
  onTriggerChange: (next: TriggerDraft) => void
  onCriteriaChange: (next: CriteriaGroupDraft) => void
  onLevelsChange: (next: PipelineLevelDraft[]) => void
  onNodeSessionChange?: (open: boolean) => void
  onJsonErrorChange?: (error: string | null) => void
}) {
  const builderRef = useRef<PipelineDefinitionBuilderHandle>(null)
  const jsonId = useId()
  const [pipelineView, setPipelineView] = useState<PipelineView>("levels")

  return (
    <>
      <DefinitionCard>
        <WorkflowTriggerBuilder
          value={trigger}
          fields={fields}
          schemaField={schemaField}
          onChange={onTriggerChange}
        />
      </DefinitionCard>
      <DefinitionCard>
        <WorkflowCriteriaBuilder
          value={criteria}
          fields={fields}
          schemaName={schemaName}
          onChange={onCriteriaChange}
        />
      </DefinitionCard>
      <DefinitionCard className="flex min-h-[28rem] flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">Then</h2>
            <p className="text-sm text-muted-foreground">
              Nodes run level by level after the trigger and conditions match.
            </p>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              {pipelineDraftSentence(levels)}
            </p>
          </div>
          <PipelineViewMenu value={pipelineView} onChange={setPipelineView} />
        </div>
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <PipelineDefinitionBuilder
            ref={builderRef}
            levels={levels}
            onChange={onLevelsChange}
            view={pipelineView}
            jsonInputId={jsonId}
            networkId={networkId}
            organizationId={organizationId ?? undefined}
            onNodeSessionChange={onNodeSessionChange}
            onJsonErrorChange={onJsonErrorChange}
            className="min-h-[24rem]"
          />
        </div>
      </DefinitionCard>
    </>
  )
}
