import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  GalleryVerticalEndIcon,
  NetworkIcon,
  PlusIcon,
} from "lucide-react"

import { type Network } from "@/data/networks"
import { useCreateEntity } from "@/components/create-entity"
import { RefreshButton } from "@/components/refresh-button"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DashboardHeader,
  DashboardPage,
} from "@/components/workspace-dashboard"
import { getBadgeColor } from "@/lib/badge"
import {
  networkWorkspacePath,
  useWorkspaceNetworks,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage, useMeQuery } from "@/store/api"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function todayLabel(now = new Date()) {
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function NetworkCard({ network }: { network: Network }) {
  const tone = getBadgeColor(network.color)
  const networkPath = networkWorkspacePath({ networkId: network.id })
  const organizations = network.organizations
  const previewOrgs = organizations.slice(0, 3)
  const remaining = organizations.length - previewOrgs.length

  return (
    <Link
      to={networkPath}
      className="group flex h-full min-w-0 flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            tone.bg,
            tone.text
          )}
        >
          <GalleryVerticalEndIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{network.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {organizations.length === 0
              ? "No organizations yet"
              : `${organizations.length} ${
                  organizations.length === 1 ? "organization" : "organizations"
                }`}
          </p>
        </div>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {previewOrgs.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex -space-x-1.5">
            {previewOrgs.map((organization) => {
              const orgTone = getBadgeColor(organization.color)
              return (
                <span
                  key={organization.id}
                  title={organization.name}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md ring-2 ring-card",
                    orgTone.bg,
                    orgTone.text
                  )}
                >
                  <Building2Icon className="size-3" />
                  <span className="sr-only">{organization.name}</span>
                </span>
              )
            })}
          </div>
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {previewOrgs.map((organization) => organization.name).join(", ")}
            {remaining > 0 ? ` +${remaining}` : ""}
          </p>
        </div>
      ) : null}
    </Link>
  )
}

function HomeSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const { openCreateNetwork } = useCreateEntity()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { data: me } = useMeQuery(undefined, { skip: !isAuthenticated })
  const userName = me?.firstName.trim() || null
  const { networks, isLoading, isFetching, isError, error, refetch } =
    useWorkspaceNetworks()
  const greeting = greetingForHour(new Date().getHours())
  const organizations = networks.flatMap((network) => network.organizations)
  const isInitialLoading = isLoading && networks.length === 0 && !isError
  const subtitle = isError
    ? getHumaErrorMessage(error, "Failed to load networks")
    : networks.length > 0
      ? `${networks.length} network${networks.length === 1 ? "" : "s"} · ${organizations.length} organization${organizations.length === 1 ? "" : "s"}`
      : "Create a network to get started."

  return (
    <DashboardPage tone="workspace">
      <DashboardHeader
        eyebrow={todayLabel()}
        title={userName ? `${greeting}, ${userName}` : greeting}
        description={
          isInitialLoading ? (
            <Skeleton className="h-5 w-64 max-w-full" />
          ) : (
            <p className={isError ? "text-destructive" : undefined}>
              {subtitle}
            </p>
          )
        }
        actions={
          <>
            {networks.length > 0 || isFetching ? (
              <RefreshButton
                onRefresh={() => void refetch()}
                isRefreshing={isFetching}
                size="icon"
              />
            ) : null}
            <Button onClick={openCreateNetwork}>
              <PlusIcon />
              Create a network
            </Button>
          </>
        }
      />

      {isInitialLoading ? (
        <HomeSkeleton />
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load networks")}
        </p>
      ) : networks.length === 0 ? (
        <Card className="items-center px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <NetworkIcon className="size-6" />
          </div>
          <div className="flex max-w-md flex-col items-center gap-1.5">
            <CardTitle className="text-lg">Start with a network</CardTitle>
            <CardDescription className="text-pretty">
              A network is the workspace for organizations, records, and the
              workflows that run on them.
            </CardDescription>
          </div>
          <Button onClick={openCreateNetwork}>
            <PlusIcon />
            Create a network
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {networks.map((network) => (
            <NetworkCard key={network.id} network={network} />
          ))}
        </div>
      )}
    </DashboardPage>
  )
}
