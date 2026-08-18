import { Link } from "react-router"
import { ChevronRightIcon, FileJsonIcon } from "lucide-react"

import { schemaList } from "@/data/networks"
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"

export default function SchemaList() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-lg font-semibold">Schemas</h1>
            <p className="text-sm text-muted-foreground">
              Choose a schema to view its details.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {schemaList.map(({ schema, network }) => (
              <Link
                key={schema.id}
                to={`/app/schemas/${schema.id}`}
                className="block"
              >
                <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FileJsonIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>{schema.name}</CardTitle>
                    <CardDescription>
                      {network.name} · {schema.format} · v{schema.version}
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
