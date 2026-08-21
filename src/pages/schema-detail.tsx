import { Link, useParams } from "react-router"
import {
  FileJsonIcon,
  GalleryVerticalEndIcon,
  HashIcon,
  WorkflowIcon,
} from "lucide-react"

import {
  DefinitionFlags,
  JsonDefinitionCard,
  SchemaPropertiesTable,
} from "@/components/json-definition-card"
import { getSchema } from "@/data/networks"
import { getBadgeColor } from "@/lib/badge"
import {
  definitionDescription,
  getJsonSchemaProperties,
  jsonSchemaPropertyCount,
} from "@/lib/json-definition"
import { useNetworkWorkspace } from "@/lib/network-workspace"
import { cn } from "@/lib/utils"

export default function SchemaDetail() {
  const { schemaId } = useParams()
  const { network: workspaceNetwork, href } = useNetworkWorkspace()
  const result = schemaId ? getSchema(schemaId) : undefined
  const belongsToWorkspace =
    !workspaceNetwork || result?.network.id === workspaceNetwork.id
  const schema = belongsToWorkspace ? result?.schema : undefined
  const network = belongsToWorkspace ? result?.network : undefined
  const properties = schema ? getJsonSchemaProperties(schema.definition) : []
  const requiredCount = properties.filter(
    (property) => property.required
  ).length
  const relatedWorkflows =
    network?.workflowDefinitions.filter(
      (workflow) => workflow.schemaId === schema?.id
    ) ?? []
  const tone = getBadgeColor(schema?.color)
  const description = schema
    ? definitionDescription(schema.definition)
    : undefined

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {schema && network ? (
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
                  {schema.name}
                </h1>
                <DefinitionFlags
                  active={schema.active}
                  internal={schema.internal}
                />
              </div>
              {description ? (
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
              <p className="font-mono text-xs text-muted-foreground">
                {schema.slug}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <HashIcon className="size-3.5" />
                Properties
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {jsonSchemaPropertyCount(schema.definition)}
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
                {typeof schema.definition.$schema === "string"
                  ? schema.definition.$schema.replace(
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

          <JsonDefinitionCard definition={schema.definition} />

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
                This schema belongs to the {network.name} network.
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
          <h1 className="text-lg font-semibold">Schema not found</h1>
          <p className="text-sm text-muted-foreground">
            This schema does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
