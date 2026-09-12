import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  Building2Icon,
  CheckIcon,
  CopyIcon,
  GalleryVerticalEndIcon,
  PencilIcon,
  UsersIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  networkWorkspacePath,
  organizationUserName,
  useNetworkWorkspace,
  useWorkspaceOrganizationUsers,
  workspaceOrganizationFromApi,
} from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetOrganizationQuery } from "@/store/organization-slice"

export default function OrganizationDetail() {
  const { orgId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network: workspaceNetwork, href } = useNetworkWorkspace()
  const { organizationUsers } = useWorkspaceOrganizationUsers()
  const { openEditOrganization } = useCreateEntity()
  const organizationQuery = useGetOrganizationQuery(orgId ?? "", {
    skip: !isAuthenticated || !orgId,
  })
  const organization = organizationQuery.data
    ? workspaceOrganizationFromApi(organizationQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || organization?.networkId === workspaceNetwork.id
  const visibleOrganization = belongsToWorkspace ? organization : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const members = visibleOrganization
    ? organizationUsers.filter(
        (user) => user.organizationId === visibleOrganization.id
      )
    : []

  if (organizationQuery.isLoading) {
    return <OrganizationSkeleton />
  }

  if (organizationQuery.isError) {
    return (
      <OrganizationStatusPage
        {...getHumaLoadErrorCopy(organizationQuery.error, {
          resource: "Organization",
          notFoundMessage:
            "This organization does not exist or is no longer available.",
        })}
      />
    )
  }

  if (!visibleOrganization || !network) {
    return (
      <OrganizationStatusPage
        title="Organization not found"
        message="This organization does not exist or is no longer available."
      />
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Organization
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-pretty">
            {visibleOrganization.name}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            {visibleOrganization.slug}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEditOrganization(visibleOrganization.id)}
        >
          <PencilIcon />
          Edit
        </Button>
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="min-w-0 rounded-2xl bg-card p-6 shadow-xs ring-1 ring-foreground/10 sm:p-8">
            <dl className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
              <ProfileField label="Name" value={visibleOrganization.name} />
              <ProfileField
                label="Slug"
                value={
                  <span className="font-mono">{visibleOrganization.slug}</span>
                }
              />
            </dl>
          </section>

          {members.length > 0 ? (
            <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Organization users
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {members.map((user) => (
                  <Link
                    key={user.id}
                    to={href(`organization-users/${user.id}`)}
                    className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-muted/60"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <UsersIcon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {organizationUserName(user)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-6">
          <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Details
            </h2>
            <dl className="mt-4 space-y-4">
              <AsideRow label="Network">
                <Link
                  to={networkWorkspacePath({ networkId: network.id })}
                  className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                >
                  <GalleryVerticalEndIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{network.name}</span>
                </Link>
              </AsideRow>
              <AsideRow label="Workspace">
                <Link
                  to={networkWorkspacePath({
                    networkId: network.id,
                    organizationId: visibleOrganization.id,
                  })}
                  className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                >
                  <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    Open {visibleOrganization.name}
                  </span>
                </Link>
              </AsideRow>
              <AsideRow label="Created">
                {formatRelativeTime(visibleOrganization.createdAt)}
              </AsideRow>
              {visibleOrganization.updatedAt !==
              visibleOrganization.createdAt ? (
                <AsideRow label="Updated">
                  {formatRelativeTime(visibleOrganization.updatedAt)}
                </AsideRow>
              ) : null}
              <AsideRow label="ID">
                <CopyIdButton value={visibleOrganization.id} />
              </AsideRow>
            </dl>
            <Link
              to={href("organizations")}
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all organizations
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}

function OrganizationSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <Skeleton className="h-3 w-16" />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}

function OrganizationStatusPage({
  title,
  message,
  destructive,
}: {
  title: string
  message: string
  destructive?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p
          className={cn(
            "text-sm",
            destructive ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

function ProfileField({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 truncate text-sm">{value || "—"}</dd>
    </div>
  )
}

function AsideRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{children}</dd>
    </div>
  )
}

function CopyIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copyId() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copyId}
      className="inline-flex max-w-full items-center gap-1.5 font-mono text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <CheckIcon className="size-3.5 shrink-0" />
      ) : (
        <CopyIcon className="size-3.5 shrink-0" />
      )}
    </button>
  )
}
