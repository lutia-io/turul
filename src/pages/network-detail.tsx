import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  FileIcon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  LayersIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TableIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { RefreshButton } from "@/components/refresh-button"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DashboardHeader,
  DashboardPage,
} from "@/components/workspace-dashboard"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { userDisplayName } from "@/lib/user"
import { cn } from "@/lib/utils"

function Shortcut({
  to,
  label,
  color,
  icon: Icon,
}: {
  to: string
  label: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-4" />
      </div>
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      <ArrowRightIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

export default function NetworkDetail() {
  const {
    network,
    organization,
    href,
    refetch: refetchWorkspace,
    isFetching: isWorkspaceFetching,
  } = useNetworkWorkspace()
  const { openCreateOrganization, openEditNetwork, openEditOrganization } =
    useCreateEntity()

  if (!network) {
    return (
      <DashboardPage>
        <DashboardHeader
          title="Network not found"
          description="This network does not exist or is no longer available."
          actions={
            <RefreshButton
              onRefresh={() => void refetchWorkspace()}
              isRefreshing={isWorkspaceFetching}
              size="icon"
            />
          }
        />
        <Link
          to="/app/networks"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to all networks
        </Link>
      </DashboardPage>
    )
  }

  const accentColor = organization?.color ?? network.color
  const HeaderIcon = organization ? Building2Icon : GalleryVerticalEndIcon
  const subject = organization ?? network
  const createdByName = userDisplayName(subject.createdBy)
  const updatedByName = userDisplayName(subject.updatedBy)
  const organizations = organization ? [] : network.organizations

  return (
    <DashboardPage tone="network">
      <DashboardHeader
        eyebrow={organization ? "Organization" : "Network"}
        icon={HeaderIcon}
        color={accentColor}
        title={organization?.name ?? network.name}
        description={
          <>
            {organization ? <p>In {network.name}</p> : null}
            {subject.createdAt ? (
              <p className={organization ? "mt-1" : undefined}>
                Created {formatRelativeTime(subject.createdAt)}
                {createdByName ? ` by ${createdByName}` : ""}
                {subject.updatedAt &&
                subject.updatedAt !== subject.createdAt ? (
                  <>
                    {" "}
                    · Updated {formatRelativeTime(subject.updatedAt)}
                    {updatedByName ? ` by ${updatedByName}` : ""}
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        }
        actions={
          <>
            <RefreshButton
              onRefresh={() => void refetchWorkspace()}
              isRefreshing={isWorkspaceFetching}
              size="icon"
            />
            <Button
              variant="outline"
              onClick={() =>
                organization
                  ? openEditOrganization(organization.id)
                  : openEditNetwork(network.id)
              }
            >
              <PencilIcon />
              {organization ? "Edit organization" : "Edit network"}
            </Button>
            {organization ? null : (
              <Button onClick={() => openCreateOrganization(network.id)}>
                <PlusIcon />
                Add organization
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Shortcut
          to={href("records")}
          label="Records"
          color="blue"
          icon={TableIcon}
        />
        <Shortcut
          to={href("files")}
          label="Files"
          color="gray"
          icon={FileIcon}
        />
        <Shortcut
          to={href("workflows")}
          label="Workflows"
          color="teal"
          icon={PlayIcon}
        />
        <Shortcut
          to={href("pipelines")}
          label="Pipelines"
          color="pink"
          icon={LayersIcon}
        />
        <Shortcut
          to={href("schemas")}
          label="Schemas"
          color="purple"
          icon={FileJsonIcon}
        />
        {organization ? (
          <Shortcut
            to={href("organization-users")}
            label="Users"
            color="cyan"
            icon={UsersIcon}
          />
        ) : (
          <Shortcut
            to={href("organizations")}
            label="Organizations"
            color="cyan"
            icon={Building2Icon}
          />
        )}
      </div>

      {organization ? null : (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              {organizations.length === 0
                ? "Add a team to start collecting records."
                : `${organizations.length} in this network`}
            </CardDescription>
            <CardAction>
              <Link
                to={href("organizations")}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                View all
                <ArrowRightIcon />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="-mx-3">
            {organizations.length > 0 ? (
              <div className="flex flex-col divide-y">
                {organizations.map((item) => {
                  const tone = getBadgeColor(item.color)
                  return (
                    <Link
                      key={item.id}
                      to={networkWorkspacePath({
                        networkId: network.id,
                        organizationId: item.id,
                      })}
                      className="group flex min-h-[52px] items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          tone.bg,
                          tone.text
                        )}
                      >
                        <Building2Icon className="size-3.5" />
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {item.name}
                      </p>
                      <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="px-3 pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCreateOrganization(network.id)}
                >
                  <PlusIcon />
                  Add organization
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardPage>
  )
}
