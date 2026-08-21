import { Link, useParams } from "react-router"
import {
  Building2Icon,
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
  SchemaPropertiesTable,
} from "@/components/json-definition-card"
import { Button } from "@/components/ui/button"
import { getBadgeColor } from "@/lib/badge"
import {
  definitionDescription,
  getJsonSchemaProperties,
  jsonSchemaPropertyCount,
} from "@/lib/json-definition"
import {
  schemaScopeLabel,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  workspaceSchemaFromApi,
  networkWorkspacePath,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetSchemaQuery } from "@/store/schema-slice"

export default function SchemaDetail() {
  const { schemaId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network: workspaceNetwork, organizationId, href } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { openEditSchema } = useCreateEntity()
  const schemaQuery = useGetSchemaQuery(schemaId ?? "", {
    skip: !isAuthenticated || !schemaId,
  })
  const schema = schemaQuery.data
    ? workspaceSchemaFromApi(schemaQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork ||
    (schema?.networkId === workspaceNetwork.id &&
      (!organizationId ||
        !schema.organizationId ||
        schema.organizationId === organizationId))
  const visibleSchema = belongsToWorkspace ? schema : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const organization = visibleSchema?.organizationId
    ? organizations.find((item) => item.id === visibleSchema.organizationId)
    : undefined
  const properties = visibleSchema
    ? getJsonSchemaProperties(visibleSchema.definition)
    : []
  const requiredCount = properties.filter(
    (property) => property.required
  ).length
  const relatedWorkflows =
    network?.workflowDefinitions.filter(
      (workflow) => workflow.schemaId === visibleSchema?.id
    ) ?? []
  const tone = getBadgeColor(visibleSchema?.color)
  const description = visibleSchema
    ? definitionDescription(visibleSchema.definition)
    : undefined

  if (schemaQuery.isLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Loading schema</h1>
        <p className="text-sm text-muted-foreground">
          Fetching this schema from the server.
        </p>
      </div>
    )
  }

  if (schemaQuery.isError) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Schema not found</h1>
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(
            schemaQuery.error,
            "This schema does not exist or is no longer available."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {visibleSchema && network ? (
        <>
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <FileJsonIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {visibleSchema.name}
                </h1>
                <DefinitionFlags
                  active={visibleSchema.active}
                  internal={visibleSchema.internal}
                />
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {schemaScopeLabel(visibleSchema, organizations)}
                </span>
              </div>
              {description ? (
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
              <p className="font-mono text-xs text-muted-foreground">
                {visibleSchema.slug}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => openEditSchema(visibleSchema.id)}
            >
              <PencilIcon />
              Edit
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <HashIcon className="size-3.5" />
                Properties
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {jsonSchemaPropertyCount(visibleSchema.definition)}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">Required</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {requiredCount}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">JSON Schema</p>
              <p className="mt-1 truncate font-medium">
                {typeof visibleSchema.definition.$schema === "string"
                  ? visibleSchema.definition.$schema.replace(
                      "https://json-schema.org/",
                      ""
                    )
                  : "object"}
              </p>
            </div>
          </div>

          <section className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Properties
              </h2>
              <p className="text-sm text-muted-foreground">
                Fields declared on this JSON Schema.
              </p>
            </div>
            <SchemaPropertiesTable properties={properties} />
          </section>

          <JsonDefinitionCard definition={visibleSchema.definition} />

          {relatedWorkflows.length > 0 ? (
            <section className="flex min-w-0 flex-col gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Workflows
                </h2>
                <p className="text-sm text-muted-foreground">
                  Workflow definitions that reference this schema.
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {relatedWorkflows.map((workflow) => (
                  <Link
                    key={workflow.id}
                    to={href(`workflow-definitions/${workflow.id}`)}
                    className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <WorkflowIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{workflow.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {workflow.slug}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex min-w-0 flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Network
              </h2>
              <p className="text-sm text-muted-foreground">
                {visibleSchema.organizationId
                  ? `This organization schema still belongs to the ${network.name} network.`
                  : `This schema is shared across the ${network.name} network.`}
              </p>
            </div>
            <Link
              to={networkWorkspacePath({ networkId: network.id })}
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

          {organization ? (
            <section className="flex min-w-0 flex-col gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Organization
                </h2>
                <p className="text-sm text-muted-foreground">
                  This schema belongs to {organization.name}.
                </p>
              </div>
              <Link
                to={networkWorkspacePath({
                  networkId: network.id,
                  organizationId: organization.id,
                })}
                className="flex min-w-0 items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{organization.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {organization.description || organization.type}
                  </p>
                </div>
              </Link>
            </section>
          ) : null}
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">Schema not found</h1>
          <p className="text-sm text-muted-foreground">
            This schema does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
