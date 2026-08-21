import { Link } from "react-router"
import { ChevronRightIcon, FileJsonIcon } from "lucide-react"

import { schemaList } from "@/data/networks"
import { jsonSchemaPropertyCount } from "@/lib/json-definition"
import { useNetworkWorkspace } from "@/lib/network-workspace"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"

export default function SchemaList() {
  const { network, href } = useNetworkWorkspace()
  const items = network
    ? network.schemas.map((schema) => ({ schema, network }))
    : schemaList

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Schemas</h1>
        <p className="text-sm text-muted-foreground">
          {network
            ? `Data schemas used by the ${network.name} network.`
            : "Choose a schema to view its details."}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {items.map(({ schema, network: itemNetwork }) => (
          <Link
            key={schema.id}
            to={
              network
                ? href(`schemas/${schema.id}`)
                : `/app/schemas/${schema.id}`
            }
            className="block"
          >
            <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileJsonIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle>{schema.name}</CardTitle>
                <CardDescription>
                  {network
                    ? `${schema.slug} · ${jsonSchemaPropertyCount(schema.definition)} properties`
                    : `${itemNetwork.name} · ${schema.slug}`}
                </CardDescription>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
