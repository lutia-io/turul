import { Link, Navigate, useLocation } from "react-router"

import { NetworkSidebar } from "@/components/network-sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { AppShell, appSidebarStyle } from "@/pages/app-layout"
import {
  networkWorkspacePath,
  parseNetworkPath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"
import { getHumaLoadErrorCopy } from "@/store/api"

export default function NetworkLayout() {
  const { pathname } = useLocation()
  const {
    network,
    requestedOrganizationId,
    organization,
    isNetworkLoading,
    isNetworkError,
    networkError,
    isOrganizationLoading,
  } = useNetworkWorkspace()
  const parsed = parseNetworkPath(pathname)

  if (isNetworkLoading || (requestedOrganizationId && isOrganizationLoading)) {
    return (
      <AppShell sidebar={<NetworkSidebar style={appSidebarStyle} />}>
        <div
          className="flex flex-1 flex-col gap-4 p-4 sm:p-6"
          aria-busy="true"
        >
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    )
  }

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

  if (isNetworkError || !network) {
    const copy = isNetworkError
      ? getHumaLoadErrorCopy(networkError, {
          resource: "Network",
          notFoundMessage:
            "This network does not exist or is no longer available.",
        })
      : {
          title: "Network not found",
          message: "This network does not exist or is no longer available.",
          destructive: false,
        }
    return (
      <AppShell sidebar={<NetworkSidebar style={appSidebarStyle} />}>
        <div className="flex flex-1 flex-col gap-2 p-4">
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
