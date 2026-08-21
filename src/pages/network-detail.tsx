import { Link } from "react-router"
import {
  Building2Icon,
  ChevronRightIcon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  GlobeIcon,
  LayersIcon,
  MapPinIcon,
  WorkflowIcon,
} from "lucide-react"

import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"
import {
  getPipelineStages,
  jsonSchemaPropertyCount,
  pipelineSourceLabel,
  getWorkflowSteps,
  workflowTriggerLabel,
} from "@/lib/json-definition"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function NetworkDetail() {
  const { network, href } = useNetworkWorkspace()

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {network ? (
        <>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold">{network.name}</h1>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {network.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {network.description}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Organizations</CardDescription>
                <CardTitle className="text-2xl">
                  {network.organizations.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Schemas</CardDescription>
                <CardTitle className="text-2xl">
                  {network.schemas.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Workflows</CardDescription>
                <CardTitle className="text-2xl">
                  {network.workflowDefinitions.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Pipelines</CardDescription>
                <CardTitle className="text-2xl">
                  {network.pipelineDefinitions.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription className="flex items-center gap-1">
                  <GlobeIcon className="size-3.5" />
                  Coverage
                </CardDescription>
                <CardTitle>{network.coverage}</CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription className="flex items-center gap-1">
                  <MapPinIcon className="size-3.5" />
                  Headquarters
                </CardDescription>
                <CardTitle>{network.headquarters}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">Organizations</h2>
              <p className="text-sm text-muted-foreground">
                Members of the {network.name} network.
              </p>
            </div>
            {network.organizations.map((organization) => (
              <Link
                key={organization.id}
                to={networkWorkspacePath({
                  networkId: network.id,
                  organizationId: organization.id,
                })}
                className="block"
              >
                <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Building2Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>{organization.name}</CardTitle>
                    <CardDescription>
                      {organization.type} · {organization.location} ·{" "}
                      {organization.members} members
                    </CardDescription>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">Schemas</h2>
              <p className="text-sm text-muted-foreground">
                Data schemas used by the {network.name} network.
              </p>
            </div>
            {network.schemas.map((schema) => (
              <Link
                key={schema.id}
                to={href(`schemas/${schema.id}`)}
                className="block"
              >
                <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileJsonIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>{schema.name}</CardTitle>
                    <CardDescription>
                      {schema.slug} ·{" "}
                      {jsonSchemaPropertyCount(schema.definition)} properties
                    </CardDescription>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">Workflow Definitions</h2>
              <p className="text-sm text-muted-foreground">
                Workflow definitions used by the {network.name} network.
              </p>
            </div>
            {network.workflowDefinitions.map((workflowDefinition) => (
              <Link
                key={workflowDefinition.id}
                to={href(`workflow-definitions/${workflowDefinition.id}`)}
                className="block"
              >
                <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <WorkflowIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>{workflowDefinition.name}</CardTitle>
                    <CardDescription>
                      {workflowTriggerLabel(workflowDefinition.definition)} ·{" "}
                      {getWorkflowSteps(workflowDefinition.definition).length}{" "}
                      steps
                    </CardDescription>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">Pipeline Definitions</h2>
              <p className="text-sm text-muted-foreground">
                Pipeline definitions used by the {network.name} network.
              </p>
            </div>
            {network.pipelineDefinitions.map((pipelineDefinition) => (
              <Link
                key={pipelineDefinition.id}
                to={href(`pipeline-definitions/${pipelineDefinition.id}`)}
                className="block"
              >
                <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <LayersIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>{pipelineDefinition.name}</CardTitle>
                    <CardDescription>
                      {pipelineSourceLabel(pipelineDefinition.definition)} ·{" "}
                      {getPipelineStages(pipelineDefinition.definition).length}{" "}
                      stages
                    </CardDescription>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">Network not found</h1>
          <p className="text-sm text-muted-foreground">
            This network does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
