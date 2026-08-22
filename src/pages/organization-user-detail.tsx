import { Link, useParams } from "react-router"
import { Building2Icon, GalleryVerticalEndIcon, UsersIcon } from "lucide-react"

import { formatRelativeTime } from "@/lib/runs"
import {
  networkWorkspacePath,
  organizationUserName,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  workspaceOrganizationUserFromApi,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetOrganizationUserQuery } from "@/store/organization-user-slice"

export default function OrganizationUserDetail() {
  const { organizationUserId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network: workspaceNetwork, organizationId } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const organizationUserQuery = useGetOrganizationUserQuery(
    organizationUserId ?? "",
    { skip: !isAuthenticated || !organizationUserId }
  )
  const organizationUser = organizationUserQuery.data
    ? workspaceOrganizationUserFromApi(organizationUserQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork ||
    (organizationUser?.networkId === workspaceNetwork.id &&
      (!organizationId || organizationUser.organizationId === organizationId))
  const visibleUser = belongsToWorkspace ? organizationUser : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const organization = visibleUser
    ? organizations.find((item) => item.id === visibleUser.organizationId)
    : undefined

  if (organizationUserQuery.isLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Loading organization user</h1>
        <p className="text-sm text-muted-foreground">
          Fetching this organization user from the server.
        </p>
      </div>
    )
  }

  if (organizationUserQuery.isError) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Organization user not found</h1>
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(
            organizationUserQuery.error,
            "This organization user does not exist or is no longer available."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {visibleUser && network ? (
        <>
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UsersIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">
                {organizationUserName(visibleUser)}
              </h1>
              <p className="text-sm text-muted-foreground">{visibleUser.email}</p>
              <p className="text-xs text-muted-foreground">
                Created {formatRelativeTime(visibleUser.createdAt)}
              </p>
            </div>
          </div>

          {organization ? (
            <section className="flex min-w-0 flex-col gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Organization
                </h2>
                <p className="text-sm text-muted-foreground">
                  This user belongs to {organization.name}.
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

          <section className="flex min-w-0 flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Network
              </h2>
              <p className="text-sm text-muted-foreground">
                This user signs in through the {network.name} network.
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
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">Organization user not found</h1>
          <p className="text-sm text-muted-foreground">
            This organization user does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
