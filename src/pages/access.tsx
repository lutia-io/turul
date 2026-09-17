import { useAuthorization } from "@/lib/authorization"
import { useNetworkWorkspace } from "@/lib/network-workspace"
import NetworkAccess from "./network-access"
import OrganizationAccess from "./organization-access"

export default function AccessPage() {
  const { network, organizationId } = useNetworkWorkspace()
  const { manageAccess } = useAuthorization()
  if (!network) {
    return null
  }
  if (organizationId && manageAccess) {
    return <OrganizationAccess />
  }
  return <NetworkAccess network={network} />
}
