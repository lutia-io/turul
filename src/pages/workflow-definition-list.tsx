import { Link } from "react-router"
import { ChevronRightIcon, PlusIcon, WorkflowIcon } from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { workflowDefinitionList } from "@/data/networks"
import {
  useNetworkWorkspace,
  useWorkspaceSchemas,
  useWorkspaceWorkflows,
} from "@/lib/network-workspace"
import { workflowSummary } from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"

export default function WorkflowDefinitionList() {
  const { network, href } = useNetworkWorkspace()
  const { openCreateWorkflow } = useCreateEntity()
  const { schemas, isLoading: isSchemasLoading } = useWorkspaceSchemas()
  const { workflows, isLoading, isError, error } = useWorkspaceWorkflows()
  const items = network ? network.workflowDefinitions : workflows

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Workflow Definitions</h1>
          <p className="text-sm text-muted-foreground">
            {network
              ? `When a record is created in ${network.name}, matching workflows run their actions.`
              : "Choose a workflow definition to view its details."}
          </p>
        </div>
        <Button onClick={() => openCreateWorkflow(network?.id)}>
          <PlusIcon />
          Create workflow
        </Button>
      </div>
      {isLoading || isSchemasLoading ? (
        <p className="text-sm text-muted-foreground">Loading workflows...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load workflows")}
        </p>
      ) : items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {items.map((workflowDefinition) => {
            const schema = schemas.find(
              (item) => item.id === workflowDefinition.schemaId
            )
            const itemNetwork =
              workflowDefinitionList.find(
                ({ workflowDefinition: item }) =>
                  item.id === workflowDefinition.id
              )?.network ?? network

            return (
              <Link
                key={workflowDefinition.id}
                to={
                  network
                    ? href(`workflow-definitions/${workflowDefinition.id}`)
                    : `/app/workflow-definitions/${workflowDefinition.id}`
                }
                className="block"
              >
                <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <WorkflowIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>{workflowDefinition.name}</CardTitle>
                    <CardDescription>
                      {schema?.name ?? "Record"} ·{" "}
                      {workflowSummary(workflowDefinition.definition)}
                      {!network && itemNetwork ? ` · ${itemNetwork.name}` : ""}
                    </CardDescription>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No workflow definitions yet. Create one to automate what happens when
          a record is created.
        </p>
      )}
    </div>
  )
}
