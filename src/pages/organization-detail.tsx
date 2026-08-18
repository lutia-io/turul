import { Link, useParams } from "react-router"
import {
  Building2Icon,
  GalleryVerticalEndIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react"

import { getOrganization } from "@/data/networks"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function OrganizationDetail() {
  const { organizationId } = useParams()
  const result = organizationId ? getOrganization(organizationId) : undefined
  const organization = result?.organization
  const network = result?.network

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
          {organization && network ? (
            <>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold">{organization.name}</h1>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {organization.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {organization.description}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Card size="sm">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-1">
                      <UsersIcon className="size-3.5" />
                      Members
                    </CardDescription>
                    <CardTitle className="text-2xl">
                      {organization.members}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-1">
                      <MapPinIcon className="size-3.5" />
                      Location
                    </CardDescription>
                    <CardTitle>{organization.location}</CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm">
                  <CardHeader>
                    <CardDescription>Type</CardDescription>
                    <CardTitle>{organization.type}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-base font-semibold">Network</h2>
                  <p className="text-sm text-muted-foreground">
                    This organization belongs to the {network.name} network.
                  </p>
                </div>
                <Link to={`/app/networks/${network.id}`} className="block">
                  <Card className="flex-row items-center px-4 transition-colors hover:bg-muted/50">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <GalleryVerticalEndIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle>{network.name}</CardTitle>
                      <CardDescription>{network.description}</CardDescription>
                    </div>
                  </Card>
                </Link>
              </div>
            </>
          ) : (
            <div>
              <h1 className="text-lg font-semibold">Organization not found</h1>
              <p className="text-sm text-muted-foreground">
                This organization does not exist or is no longer available.
              </p>
            </div>
          )}
    </div>
  )
}
