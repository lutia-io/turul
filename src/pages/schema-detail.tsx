import { useState } from "react"
import { Link, useParams } from "react-router"
import {
  Building2Icon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  PencilIcon,
  TableIcon,
  WorkflowIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import {
  AsideRow,
  CopyIdButton,
  DefinitionAsideCard,
  DefinitionCard,
  DefinitionColumns,
  DefinitionPage,
  DefinitionSkeleton,
  DefinitionStatusPage,
  PublicationPills,
} from "@/components/definition-detail"
import { JsonDefinitionCard } from "@/components/json-definition-card"
import { propertyLabel } from "@/components/schema-records-table"
import { Button } from "@/components/ui/button"
import { getBadgeColor } from "@/lib/badge"
import {
  definitionDescription,
  getJsonSchemaProperties,
  isFileProperty,
  isForeignProperty,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceRecords,
  useWorkspaceWorkflows,
  workspaceSchemaFromApi,
} from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetSchemaQuery } from "@/store/schema-slice"

type DefinitionView = "properties" | "json"

export default function SchemaDetail() {
  const { schemaId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { records } = useWorkspaceRecords()
  const { workflows } = useWorkspaceWorkflows()
  const { openEditSchema } = useCreateEntity()
  const [definitionView, setDefinitionView] =
    useState<DefinitionView>("properties")
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
  const relatedWorkflows = visibleSchema
    ? workflows.filter((workflow) => workflow.schemaId === visibleSchema.id)
    : []
  const recordCount = visibleSchema
    ? records.filter((record) => record.schemaId === visibleSchema.id).length
    : 0
  const tone = getBadgeColor(visibleSchema?.color)
  const description = visibleSchema
    ? definitionDescription(visibleSchema.definition)
    : undefined
  const createdAt = schemaQuery.data?.createdAt
  const updatedAt = schemaQuery.data?.updatedAt

  if (schemaQuery.isLoading) {
    return <DefinitionSkeleton />
  }

  if (schemaQuery.isError) {
    return (
      <DefinitionStatusPage
        title="Schema not found"
        message={getHumaErrorMessage(
          schemaQuery.error,
          "This schema does not exist or is no longer available."
        )}
        destructive
      />
    )
  }

  if (!visibleSchema || !network) {
    return (
      <DefinitionStatusPage
        title="Schema not found"
        message="This schema does not exist or is no longer available."
      />
    )
  }

  const recordsHref = `${href("records")}?schema=${visibleSchema.id}`

  return (
    <DefinitionPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <Link
            to={href("schemas")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className={cn("size-1.5 rounded-full", tone.bg)} />
            Schema
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-pretty">
              {visibleSchema.name}
            </h1>
            <PublicationPills
              active={visibleSchema.active}
              internal={visibleSchema.internal}
            />
          </div>
          {description ? (
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={definitionView === "json" ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              setDefinitionView((view) =>
                view === "properties" ? "json" : "properties"
              )
            }
          >
            <FileJsonIcon />
            {definitionView === "json" ? "Properties" : "JSON"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={visibleSchema.internal}
            onClick={() => openEditSchema(visibleSchema.id)}
          >
            <PencilIcon />
            Edit
          </Button>
        </div>
      </div>

      <DefinitionColumns
        aside={
          <>
            <DefinitionAsideCard
              title="Details"
              footer={
                <Link
                  to={href("schemas")}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all schemas
                </Link>
              }
            >
              <dl className="mt-4 space-y-4">
                <AsideRow label="Slug">
                  <span className="font-mono text-xs font-normal">
                    {visibleSchema.slug}
                  </span>
                </AsideRow>
                <AsideRow label="Records">
                  <Link
                    to={recordsHref}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <TableIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="tabular-nums">
                      {recordCount} {recordCount === 1 ? "record" : "records"}
                    </span>
                  </Link>
                </AsideRow>
                <AsideRow label="Fields">
                  <span className="tabular-nums">
                    {properties.length}
                    {requiredCount > 0 ? ` · ${requiredCount} required` : ""}
                  </span>
                </AsideRow>
                {organization ? (
                  <AsideRow label="Organization">
                    <Link
                      to={networkWorkspacePath({
                        networkId: network.id,
                        organizationId: organization.id,
                      })}
                      className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                    >
                      <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{organization.name}</span>
                    </Link>
                  </AsideRow>
                ) : null}
                <AsideRow label="Network">
                  <Link
                    to={href()}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <GalleryVerticalEndIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{network.name}</span>
                  </Link>
                </AsideRow>
                {createdAt ? (
                  <AsideRow label="Created">
                    {formatRelativeTime(createdAt)}
                  </AsideRow>
                ) : null}
                {updatedAt && updatedAt !== createdAt ? (
                  <AsideRow label="Updated">
                    {formatRelativeTime(updatedAt)}
                  </AsideRow>
                ) : null}
                <AsideRow label="ID">
                  <CopyIdButton value={visibleSchema.id} />
                </AsideRow>
              </dl>
            </DefinitionAsideCard>

            <DefinitionAsideCard title="Workflows">
              {relatedWorkflows.length > 0 ? (
                <div className="mt-3 flex flex-col gap-1">
                  {relatedWorkflows.map((workflow) => (
                    <Link
                      key={workflow.id}
                      to={href(`workflow-definitions/${workflow.id}`)}
                      className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <WorkflowIcon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {workflow.name}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {workflow.slug}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No workflows watch this schema yet.
                </p>
              )}
            </DefinitionAsideCard>
          </>
        }
      >
        {definitionView === "json" ? (
          <JsonDefinitionCard
            definition={visibleSchema.definition}
            label="JSON Schema"
            description="Stored as JSONB on the definition column."
          />
        ) : (
          <DefinitionCard>
            <div className="mb-6">
              <h2 className="text-sm font-medium">Properties</h2>
              <p className="text-sm text-muted-foreground">
                {properties.length === 0
                  ? "This JSON Schema does not declare any properties."
                  : `${properties.length} ${properties.length === 1 ? "field" : "fields"} declared on this JSON Schema.`}
              </p>
            </div>
            {properties.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3.5 py-2.5">Field</th>
                      <th className="px-3.5 py-2.5">Type</th>
                      <th className="px-3.5 py-2.5">Required</th>
                      <th className="px-3.5 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((property) => (
                      <PropertyItem key={property.name} property={property} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </DefinitionCard>
        )}
      </DefinitionColumns>
    </DefinitionPage>
  )
}

function PropertyItem({ property }: { property: JsonSchemaProperty }) {
  return (
    <tr className="border-b align-top last:border-b-0">
      <td className="px-3.5 py-3">
        <p className="font-medium">{propertyLabel(property.name)}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {property.name}
        </p>
      </td>
      <td className="px-3.5 py-3">
        <p className="font-mono text-[13px] text-muted-foreground">
          {propertyTypeLabel(property)}
        </p>
        {property.enumValues?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {property.enumValues.map((value) => (
              <span
                key={value}
                className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {value}
              </span>
            ))}
          </div>
        ) : null}
      </td>
      <td className="px-3.5 py-3 text-muted-foreground">
        {property.required ? (
          <span className="font-medium text-foreground">Yes</span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3.5 py-3 text-pretty text-muted-foreground">
        {property.description ?? "—"}
      </td>
    </tr>
  )
}

function propertyTypeLabel(property: JsonSchemaProperty) {
  if (isFileProperty(property)) {
    return "file"
  }
  if (isForeignProperty(property)) {
    return "related record"
  }
  if (property.type === "array" && property.itemsType) {
    return `array of ${property.itemsType}`
  }
  if (property.format) {
    return `${property.type} (${property.format})`
  }
  return property.type
}
