import { Link, useParams } from "react-router"
import {
  Building2Icon,
  GalleryVerticalEndIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  workspaceNetworkFromApi,
  workspaceOrganizationFromApi,
} from "@/lib/network-workspace"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { getHumaLoadErrorCopy } from "@/store/api"
import { useGetNetworkQuery } from "@/store/network-slice"
import { useGetOrganizationQuery } from "@/store/organization-slice"

export default function OrganizationDetail() {
  const { organizationId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const organizationQuery = useGetOrganizationQuery(organizationId ?? "", {
    skip: !isAuthenticated || !organizationId,
  })
  const networkQuery = useGetNetworkQuery(
    organizationQuery.data?.networkId ?? "",
    { skip: !organizationQuery.data?.networkId }
  )
  const organization = organizationQuery.data
    ? workspaceOrganizationFromApi(organizationQuery.data)
    : undefined
  const network = networkQuery.data
    ? workspaceNetworkFromApi(networkQuery.data)
    : undefined

  if (organizationQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4">
        <h1 className="text-lg font-semibold">Loading organization</h1>
        <p className="text-sm text-muted-foreground">
          Fetching this organization from the server.
        </p>
      </div>
    )
  }

  if (organizationQuery.isError) {
    const copy = getHumaLoadErrorCopy(organizationQuery.error, {
      resource: "Organization",
      notFoundMessage:
        "This organization does not exist or is no longer available.",
    })
    return (
      <div className="flex flex-1 flex-col gap-6 p-4">
        <h1 className="text-lg font-semibold">{copy.title}</h1>
        <p
          className={
            copy.destructive
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {copy.message}
        </p>
      </div>
    )
  }

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
              {organization.description ? (
                <p className="text-sm text-muted-foreground">
                  {organization.description}
                </p>
              ) : organization.type ? (
                <p className="text-sm text-muted-foreground">
                  {organization.type}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {organization.members > 0 ? (
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
            ) : null}
            {organization.location ? (
              <Card size="sm">
                <CardHeader>
                  <CardDescription className="flex items-center gap-1">
                    <MapPinIcon className="size-3.5" />
                    Location
                  </CardDescription>
                  <CardTitle>{organization.location}</CardTitle>
                </CardHeader>
              </Card>
            ) : null}
            {organization.type ? (
              <Card size="sm">
                <CardHeader>
                  <CardDescription>Type</CardDescription>
                  <CardTitle>{organization.type}</CardTitle>
                </CardHeader>
              </Card>
            ) : null}
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
                  <CardDescription>
                    {network.description || network.summary}
                  </CardDescription>
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
