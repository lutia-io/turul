import { Link, Navigate, useLocation } from "react-router"

import { NetworkSidebar } from "@/components/network-sidebar"
import { AppShell, appSidebarStyle } from "@/pages/app-layout"
import {
  networkWorkspacePath,
  parseNetworkPath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"

export default function NetworkLayout() {
  const { pathname } = useLocation()
  const { network, requestedOrganizationId, organization } =
    useNetworkWorkspace()
  const parsed = parseNetworkPath(pathname)

  if (network && requestedOrganizationId && !organization) {
    return (
      <Navigate
        to={networkWorkspacePath({
          networkId: network.id,
          rest: parsed?.rest,
        })}
        replace
      />
    )
  }

  if (!network) {
    return (
      <AppShell sidebar={<NetworkSidebar style={appSidebarStyle} />}>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h1 className="text-lg font-semibold">Network not found</h1>
          <p className="text-sm text-muted-foreground">
            This network does not exist or is no longer available.
          </p>
          <Link
            to="/app/networks"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to all networks
          </Link>
        </div>
      </AppShell>
    )
  }

  return <AppShell sidebar={<NetworkSidebar style={appSidebarStyle} />} />
}
