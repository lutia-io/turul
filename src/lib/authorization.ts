import { useNetworkWorkspace } from "@/lib/network-workspace"
import { useGetAuthorizationQuery } from "@/store/authorization-slice"

export function useAuthorization(scope?: {
  networkId?: string
  organizationId?: string | null
}) {
  const workspace = useNetworkWorkspace()
  const networkId = scope?.networkId ?? workspace.network?.id
  const organizationId =
    scope && "organizationId" in scope
      ? scope.organizationId ?? undefined
      : workspace.organizationId
  const query = useGetAuthorizationQuery(
    {
      networkId: networkId ?? "",
      organizationId,
    },
    { skip: !networkId }
  )
  const data = query.data
  const networkGrants = data?.network?.grants
  const orgGrants = data?.organization?.grants

  return {
    ...query,
    principalType: data?.principalType,
    isOrgUser: data?.principalType === "organization_user",
    creator: Boolean(data?.creator || data?.network?.creator),
    manageAccess: Boolean(data?.network?.manageAccess),
    canNetwork(resource: string, action: "create" | "read" | "update" | "delete" | "manageAccess") {
      const grant = networkGrants?.[resource]
      if (!grant) {
        return false
      }
      if (action === "manageAccess") {
        return Boolean(grant.manageAccess || data?.network?.manageAccess)
      }
      return Boolean(grant[action])
    },
    canOrg(resource: string, action: "create" | "read" | "update" | "delete") {
      return Boolean(orgGrants?.[resource]?.[action])
    },
  }
}
