import { Link } from "react-router"
import { Building2Icon, ChevronRightIcon } from "lucide-react"

import { organizationList } from "@/data/networks"
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"

export default function OrganizationList() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-lg font-semibold">Organizations</h1>
            <p className="text-sm text-muted-foreground">
              Choose an organization to view its details.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {organizationList.map(({ organization, network }) => (
              <Link
                key={organization.id}
                to={`/app/organizations/${organization.id}`}
                className="block"
              >
                <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Building2Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>{organization.name}</CardTitle>
                    <CardDescription>
                      {network.name} · {organization.type} ·{" "}
                      {organization.members} members
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
