import { DefinitionCard } from "@/components/definition-detail"
import { WorkflowActionsBuilder } from "@/components/workflow-actions-builder"
import { WorkflowCriteriaBuilder } from "@/components/workflow-criteria-builder"
import { WorkflowTriggerBuilder } from "@/components/workflow-trigger-builder"
import type { PipelineDefinition, Schema } from "@/data/networks"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import type {
  ActionDraft,
  CriteriaGroupDraft,
  TriggerDraft,
} from "@/lib/workflow-definition"

export function WorkflowRuleEditor({
  trigger,
  criteria,
  actions,
  fields,
  schemas,
  pipelines,
  triggerSchemaId,
  schemaName,
  onTriggerChange,
  onCriteriaChange,
  onActionsChange,
  canCreatePipeline,
  canUpdatePipeline,
  onCreatePipeline,
  onEditPipeline,
}: {
  trigger: TriggerDraft
  criteria: CriteriaGroupDraft
  actions: ActionDraft[]
  fields: JsonSchemaProperty[]
  schemas: Schema[]
  pipelines: PipelineDefinition[]
  triggerSchemaId?: string
  schemaName?: string
  onTriggerChange: (next: TriggerDraft) => void
  onCriteriaChange: (next: CriteriaGroupDraft) => void
  onActionsChange: (next: ActionDraft[]) => void
  canCreatePipeline?: boolean
  canUpdatePipeline?: boolean
  onCreatePipeline?: (actionKey: string) => void
  onEditPipeline?: (actionKey: string, pipelineId: string) => void
}) {
  return (
    <>
      <DefinitionCard>
        <WorkflowTriggerBuilder
          value={trigger}
          fields={fields}
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
      <DefinitionCard>
        <WorkflowActionsBuilder
          value={actions}
          schemas={schemas}
          pipelines={pipelines}
          triggerFields={fields}
          triggerSchemaId={triggerSchemaId}
          triggerSchemaName={schemaName}
          onChange={onActionsChange}
          canCreatePipeline={canCreatePipeline}
          canUpdatePipeline={canUpdatePipeline}
          onCreatePipeline={onCreatePipeline}
          onEditPipeline={onEditPipeline}
        />
      </DefinitionCard>
    </>
  )
}
