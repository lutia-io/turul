import { Navigate, useSearchParams } from "react-router"
import { PlusIcon, ShieldIcon } from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DashboardHeader,
  DashboardPage,
} from "@/components/workspace-dashboard"
import { useWorkspaceNetworks } from "@/lib/network-workspace"
import { getHumaErrorMessage, useMeQuery } from "@/store/api"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"
import NetworkAccess from "./network-access"

export default function PlatformAccess() {
  const { openCreateNetwork } = useCreateEntity()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { data: me } = useMeQuery(undefined, { skip: !isAuthenticated })
  const { networks, isLoading, isError, error } = useWorkspaceNetworks()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedId = searchParams.get("network")
  const network =
    networks.find((item) => item.id === requestedId) ?? networks[0]

  if (me?.principalType === "organization_user") {
    return <Navigate to="/app/home" replace />
  }

  if (isLoading && networks.length === 0 && !isError) {
    return (
      <DashboardPage>
        <DashboardHeader
          eyebrow="Access"
          title="Network access"
          description={<Skeleton className="h-5 w-72 max-w-full" />}
        />
        <Skeleton className="h-64 w-full rounded-xl" />
      </DashboardPage>
    )
  }

  if (isError) {
    return (
      <DashboardPage>
        <DashboardHeader
          eyebrow="Access"
          title="Network access"
          description="Groups and permissions for a network apply across all of its organizations."
        />
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load networks")}
        </p>
      </DashboardPage>
    )
  }

  if (!network) {
    return (
      <DashboardPage>
        <DashboardHeader
          eyebrow="Access"
          title="Network access"
          description="Create a network first, then invite people and outline what they can do."
        />
        <Card className="items-center px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldIcon className="size-6" />
          </div>
          <div className="flex max-w-md flex-col items-center gap-1.5">
            <CardTitle className="text-lg">No network to manage</CardTitle>
            <CardDescription className="text-pretty">
              Access lives on a network. Create one to invite platform users and
              set permissions that cover every organization in it.
            </CardDescription>
          </div>
          <Button onClick={openCreateNetwork}>
            <PlusIcon />
            Create a network
          </Button>
        </Card>
      </DashboardPage>
    )
  }

  return (
    <NetworkAccess
      network={network}
      description="Groups and permissions for this network apply across all organizations."
      headerActions={
        networks.length > 1 ? (
          <NativeSelect
            className="w-56"
            size="sm"
            aria-label="Network"
            value={network.id}
            onChange={(event) => {
              setSearchParams(
                { network: event.target.value },
                { replace: true }
              )
            }}
          >
            {networks.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : undefined
      }
    />
  )
}
