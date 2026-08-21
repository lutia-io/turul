import { Link } from "react-router"
import { ChevronRightIcon, FileJsonIcon, PlusIcon } from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import { jsonSchemaPropertyCount } from "@/lib/json-definition"
import {
  schemaScopeLabel,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
} from "@/lib/network-workspace"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import type { Schema } from "@/data/networks"
import { getHumaErrorMessage } from "@/store/api"

function SchemaCard({
  schema,
  to,
  scope,
}: {
  schema: Schema
  to: string
  scope: string
}) {
  return (
    <Link to={to} className="block">
      <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileJsonIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle>{schema.name}</CardTitle>
          <CardDescription>
            {scope} · {schema.slug} ·{" "}
            {jsonSchemaPropertyCount(schema.definition)} properties
          </CardDescription>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  )
}

export default function SchemaList() {
  const { network, organization, organizationId, href } = useNetworkWorkspace()
  const { openCreateSchema } = useCreateEntity()
  const { organizations } = useWorkspaceOrganizations()
  const { schemas, isLoading, isError, error } = useWorkspaceSchemas()
  const items = network ? network.schemas : schemas
  const networkSchemas = items.filter((schema) => !schema.organizationId)
  const organizationSchemas = items.filter((schema) => schema.organizationId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Schemas</h1>
          <p className="text-sm text-muted-foreground">
            {organization
              ? `Network-wide schemas shared with ${organization.name}, plus schemas that belong only to this organization.`
              : network
                ? `Network-wide schemas shared by every organization in ${network.name}, plus schemas owned by a single organization.`
                : "Network-wide and organization schemas."}
          </p>
        </div>
        <Button
          onClick={() =>
            openCreateSchema({
              networkId: network?.id,
              organizationId,
            })
          }
        >
          <PlusIcon />
          Create schema
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading schemas...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load schemas")}
        </p>
      ) : items.length > 0 ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-medium">Network schemas</h2>
              <p className="text-xs text-muted-foreground">
                Shared across every organization in the network.
              </p>
            </div>
            {networkSchemas.length > 0 ? (
              networkSchemas.map((schema) => (
                <SchemaCard
                  key={schema.id}
                  schema={schema}
                  scope="Network"
                  to={
                    network
                      ? href(`schemas/${schema.id}`)
                      : `/app/schemas/${schema.id}`
                  }
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No network-wide schemas yet.
              </p>
            )}
          </section>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-medium">Organization schemas</h2>
              <p className="text-xs text-muted-foreground">
                {organization
                  ? `Private to ${organization.name}.`
                  : "Owned by a single organization in this network."}
              </p>
            </div>
            {organizationSchemas.length > 0 ? (
              organizationSchemas.map((schema) => (
                <SchemaCard
                  key={schema.id}
                  schema={schema}
                  scope={schemaScopeLabel(schema, organizations)}
                  to={
                    network
                      ? href(`schemas/${schema.id}`)
                      : `/app/schemas/${schema.id}`
                  }
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No organization schemas yet.
                {organization
                  ? " Create one to define a shape that only this organization uses."
                  : ""}
              </p>
            )}
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No schemas yet. Create one to define the JSONB shape of records.
        </p>
      )}
    </div>
  )
}
