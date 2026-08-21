import { Link, useParams } from "react-router"
import {
  FileJsonIcon,
  GalleryVerticalEndIcon,
  HashIcon,
  WorkflowIcon,
} from "lucide-react"

import {
  DefinitionFlags,
  DefinitionStepsList,
  JsonDefinitionCard,
} from "@/components/json-definition-card"
import { getSchema, getWorkflowDefinition } from "@/data/networks"
import { getWorkflowSteps, workflowTriggerLabel } from "@/lib/json-definition"
import { useNetworkWorkspace } from "@/lib/network-workspace"

export default function WorkflowDefinitionDetail() {
  const { workflowDefinitionId } = useParams()
  const { network: workspaceNetwork, href } = useNetworkWorkspace()
  const result = workflowDefinitionId
    ? getWorkflowDefinition(workflowDefinitionId)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || result?.network.id === workspaceNetwork.id
  const workflowDefinition = belongsToWorkspace
    ? result?.workflowDefinition
    : undefined
  const network = belongsToWorkspace ? result?.network : undefined
  const schema = workflowDefinition
    ? getSchema(workflowDefinition.schemaId)?.schema
    : undefined
  const steps = workflowDefinition
    ? getWorkflowSteps(workflowDefinition.definition)
    : []
  const trigger = workflowDefinition
    ? workflowTriggerLabel(workflowDefinition.definition)
    : ""

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {workflowDefinition && network ? (
        <>
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-white">
              <WorkflowIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {workflowDefinition.name}
                </h1>
                <DefinitionFlags
                  active={workflowDefinition.active}
                  internal={workflowDefinition.internal}
                />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {workflowDefinition.slug}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <HashIcon className="size-3.5" />
                Steps
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {steps.length}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs sm:col-span-2">
              <p className="text-sm text-muted-foreground">Trigger</p>
              <p className="mt-1 truncate font-mono text-sm font-medium">
                {trigger}
              </p>
            </div>
          </div>

          {schema ? (
            <section className="flex min-w-0 flex-col gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Schema
                </h2>
                <p className="text-sm text-muted-foreground">
                  This workflow is bound to a schema row via schema_id.
                </p>
              </div>
              <Link
                to={href(`schemas/${schema.id}`)}
                className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileJsonIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{schema.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {schema.slug}
                  </p>
                </div>
              </Link>
            </section>
          ) : null}

          <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Steps</h2>
              <p className="text-sm text-muted-foreground">
                Ordered steps stored in the workflow JSONB definition.
              </p>
            </div>
            <DefinitionStepsList
              steps={steps}
              emptyLabel="This workflow definition does not declare any steps."
            />
          </section>

          <JsonDefinitionCard definition={workflowDefinition.definition} />

          <section className="flex min-w-0 flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Network
              </h2>
              <p className="text-sm text-muted-foreground">
                This workflow definition belongs to the {network.name} network.
              </p>
            </div>
            <Link
              to={href()}
              className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{network.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {network.description}
                </p>
              </div>
            </Link>
          </section>
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">
            Workflow definition not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This workflow definition does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
