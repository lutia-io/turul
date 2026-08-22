import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  Building2Icon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  PencilIcon,
  TableIcon,
  WorkflowIcon,
  type LucideIcon,
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
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  schemaScopeLabel,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceRecords,
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
  const relatedWorkflows =
    network?.workflowDefinitions.filter(
      (workflow) => workflow.schemaId === visibleSchema?.id
    ) ?? []
  const recordCount = records.filter(
    (record) => record.schemaId === visibleSchema?.id
  ).length
  const tone = getBadgeColor(visibleSchema?.color)
  const description = visibleSchema
    ? definitionDescription(visibleSchema.definition)
    : undefined
  const updatedAt = schemaQuery.data?.updatedAt

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
              </div>
              {description ? (
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{visibleSchema.slug}</span>
                <span>
                  {` · ${properties.length} ${properties.length === 1 ? "property" : "properties"}`}
                  {requiredCount > 0 ? ` · ${requiredCount} required` : ""}
                </span>
                {updatedAt ? (
                  <span>{` · Updated ${formatRelativeTime(updatedAt)}`}</span>
                ) : null}
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

          <div className="grid gap-3 sm:grid-cols-3">
            <DetailStat
              to={`${href("records")}?schema=${visibleSchema.id}`}
              icon={TableIcon}
              label="Records"
              value={recordCount}
              detail={
                recordCount === 1
                  ? "1 row stored against this schema"
                  : `${recordCount} rows stored against this schema`
              }
            />
            <DetailStat
              to={href("workflow-definitions")}
              icon={WorkflowIcon}
              label="Workflows"
              value={relatedWorkflows.length}
              detail={
                relatedWorkflows.length > 0
                  ? relatedWorkflows
                      .map((workflow) => workflow.name)
                      .join(" · ")
                  : "No workflows watch this schema yet"
              }
            />
            {organization ? (
              <DetailStat
                to={networkWorkspacePath({
                  networkId: network.id,
                  organizationId: organization.id,
                })}
                icon={Building2Icon}
                label="Organization"
                value={organization.name}
                detail={`${organization.description || organization.type} · ${network.name}`}
              />
            ) : (
              <DetailStat
                to={networkWorkspacePath({ networkId: network.id })}
                icon={GalleryVerticalEndIcon}
                label="Network"
                value={network.name}
                detail={`${schemaScopeLabel(visibleSchema, organizations)} schema · ${network.description || network.summary}`}
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-end justify-between gap-3 xl:hidden">
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight">
                  Definition
                </h2>
                <p className="text-sm text-muted-foreground">
                  Switch between the field table and the stored JSON Schema.
                </p>
              </div>
              <div
                className="inline-flex rounded-lg border bg-muted p-0.5"
                role="tablist"
                aria-label="Definition view"
              >
                <DefinitionTab
                  active={definitionView === "properties"}
                  onSelect={() => setDefinitionView("properties")}
                >
                  Properties
                </DefinitionTab>
                <DefinitionTab
                  active={definitionView === "json"}
                  onSelect={() => setDefinitionView("json")}
                >
                  JSON
                </DefinitionTab>
              </div>
            </div>

            <div className="grid min-w-0 items-stretch gap-6 xl:grid-cols-2">
              <section
                className={cn(
                  "flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6",
                  definitionView !== "properties" && "max-xl:hidden"
                )}
              >
                <div>
                  <h2 className="text-base font-semibold tracking-tight">
                    Properties
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Fields declared on this JSON Schema.
                  </p>
                </div>
                <div className="max-h-[32rem] min-h-0 overflow-auto">
                  <SchemaPropertiesTable properties={properties} />
                </div>
              </section>
              <JsonDefinitionCard
                className={cn(
                  "h-full",
                  definitionView !== "json" && "max-xl:hidden"
                )}
                definition={visibleSchema.definition}
                label="JSON Schema"
                description="Stored as JSONB on the definition column."
              />
            </div>
          </div>

          {relatedWorkflows.length > 0 ? (
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
                    <p className="text-xs text-muted-foreground">Workflow</p>
                    <p className="truncate font-medium">{workflow.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {workflow.slug}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
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

function DetailStat({
  to,
  icon: Icon,
  label,
  value,
  detail,
}: {
  to: string
  icon: LucideIcon
  label: string
  value: ReactNode
  detail: string
}) {
  return (
    <Link
      to={to}
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background shadow-xs transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold tracking-tight">
            {value}
          </p>
        </div>
      </div>
      <p className="truncate border-t bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground">
        {detail}
      </p>
    </Link>
  )
}

function DefinitionTab({
  active,
  onSelect,
  children,
}: {
  active: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm transition-colors",
        active
          ? "bg-background font-medium shadow-xs"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}
