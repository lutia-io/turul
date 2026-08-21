import { Link, useParams } from "react-router"
import {
  FileJsonIcon,
  GalleryVerticalEndIcon,
  HashIcon,
  PencilIcon,
  WorkflowIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import {
  DefinitionFlags,
  JsonDefinitionCard,
  WorkflowActionsList,
  WorkflowCriteriaTree,
} from "@/components/json-definition-card"
import { Button } from "@/components/ui/button"
import {
  useNetworkWorkspace,
  useWorkspaceSchemas,
  workspaceWorkflowFromApi,
} from "@/lib/network-workspace"
import {
  parseWorkflowDefinition,
  workflowSummary,
} from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetWorkflowDefinitionQuery } from "@/store/workflow-slice"

export default function WorkflowDefinitionDetail() {
  const { workflowDefinitionId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network: workspaceNetwork, href } = useNetworkWorkspace()
  const { schemas } = useWorkspaceSchemas()
  const { openEditWorkflow } = useCreateEntity()
  const workflowQuery = useGetWorkflowDefinitionQuery(
    workflowDefinitionId ?? "",
    { skip: !isAuthenticated || !workflowDefinitionId }
  )
  const workflowDefinition = workflowQuery.data
    ? workspaceWorkflowFromApi(workflowQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || workflowDefinition?.networkId === workspaceNetwork.id
  const visibleWorkflow = belongsToWorkspace ? workflowDefinition : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const schema = visibleWorkflow
    ? schemas.find((item) => item.id === visibleWorkflow.schemaId)
    : undefined
  const parsed = visibleWorkflow
    ? parseWorkflowDefinition(visibleWorkflow.definition)
    : undefined
  const actions = parsed?.actions ?? []

  if (workflowQuery.isLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Loading workflow</h1>
        <p className="text-sm text-muted-foreground">
          Fetching this workflow definition from the server.
        </p>
      </div>
    )
  }

  if (workflowQuery.isError) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Workflow definition not found</h1>
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(
            workflowQuery.error,
            "This workflow definition does not exist or is no longer available."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {visibleWorkflow && network ? (
        <>
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-white">
              <WorkflowIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {visibleWorkflow.name}
                </h1>
                <DefinitionFlags
                  active={visibleWorkflow.active}
                  internal={visibleWorkflow.internal}
                />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {visibleWorkflow.slug}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => openEditWorkflow(visibleWorkflow.id)}
            >
              <PencilIcon />
              Edit
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <HashIcon className="size-3.5" />
                Actions
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {actions.length}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs sm:col-span-2">
              <p className="text-sm text-muted-foreground">Runs when</p>
              <p className="mt-1 truncate text-sm font-medium">
                {workflowSummary(visibleWorkflow.definition)}
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
                  This workflow watches new records on this schema.
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
              <h2 className="text-base font-semibold tracking-tight">When</h2>
              <p className="text-sm text-muted-foreground">
                Conditions evaluated against the triggering record.
              </p>
            </div>
            <WorkflowCriteriaTree criteria={parsed?.criteria} />
          </section>

          <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Then</h2>
              <p className="text-sm text-muted-foreground">
                Actions that run in order when the conditions match.
              </p>
            </div>
            <WorkflowActionsList actions={actions} />
          </section>

          <JsonDefinitionCard definition={visibleWorkflow.definition} />

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
                  {network.description || network.summary}
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
