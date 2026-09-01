import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  Building2Icon,
  CheckIcon,
  CopyIcon,
  GalleryVerticalEndIcon,
  PencilIcon,
  TableIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { FileThumbnail } from "@/components/file-preview"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getBadgeColor } from "@/lib/badge"
import { fileKindLabel } from "@/lib/file-preview"
import {
  getJsonSchemaProperties,
  isFileProperty,
  isForeignProperty,
  type JsonObject,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  organizationUserName,
  useNetworkWorkspace,
  useWorkspaceFiles,
  useWorkspaceOrganizations,
  useWorkspaceRecords,
  useWorkspaceSchemas,
  workspaceOrganizationUserFromApi,
} from "@/lib/network-workspace"
import { formatFileSize } from "@/lib/records"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetOrganizationUserQuery } from "@/store/organization-user-slice"

export default function OrganizationUserDetail() {
  const { organizationUserId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { records } = useWorkspaceRecords()
  const { files } = useWorkspaceFiles()
  const { schemas } = useWorkspaceSchemas()
  const { openEditOrganizationUser } = useCreateEntity()
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
  const userRecords = visibleUser
    ? records.filter((record) => record.organizationUserId === visibleUser.id)
    : []
  const userFiles = visibleUser
    ? files.filter((file) => file.organizationUserId === visibleUser.id)
    : []

  if (organizationUserQuery.isLoading) {
    return <OrganizationUserSkeleton />
  }

  if (organizationUserQuery.isError) {
    return (
      <OrganizationUserStatusPage
        {...getHumaLoadErrorCopy(organizationUserQuery.error, {
          resource: "Organization user",
          notFoundMessage:
            "This organization user does not exist or is no longer available.",
        })}
      />
    )
  }

  if (!visibleUser || !network) {
    return (
      <OrganizationUserStatusPage
        title="Organization user not found"
        message="This organization user does not exist or is no longer available."
      />
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Organization user
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-pretty">
            {organizationUserName(visibleUser)}
          </h1>
          <a
            href={`mailto:${visibleUser.email}`}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {visibleUser.email}
          </a>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEditOrganizationUser(visibleUser.id)}
        >
          <PencilIcon />
          Edit
        </Button>
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="min-w-0 rounded-2xl bg-card p-6 shadow-xs ring-1 ring-foreground/10 sm:p-8">
            <dl className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
              <ProfileField label="First name" value={visibleUser.firstName} />
              <ProfileField label="Last name" value={visibleUser.lastName} />
              <ProfileField
                label="Email"
                className="sm:col-span-2"
                value={
                  <a
                    href={`mailto:${visibleUser.email}`}
                    className="hover:underline"
                  >
                    {visibleUser.email}
                  </a>
                }
              />
            </dl>
          </section>

          {userRecords.length > 0 ? (
            <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Records
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {userRecords.map((record) => {
                  const schema = schemas.find(
                    (item) => item.id === record.schemaId
                  )
                  const tone = getBadgeColor(schema?.color)
                  const properties = schema
                    ? getJsonSchemaProperties(schema.definition)
                    : []

                  return (
                    <Link
                      key={record.id}
                      to={href(`records/${record.id}`)}
                      className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-muted/60"
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-md",
                          tone.bg,
                          tone.text
                        )}
                      >
                        <TableIcon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {recordDisplayTitle(
                            record.data,
                            properties,
                            schema?.name ?? record.schemaId
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {schema?.name ?? record.schemaId}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ) : null}

          {userFiles.length > 0 ? (
            <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Files
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {userFiles.map((file) => (
                  <Link
                    key={file.id}
                    to={href(`files/${file.id}`)}
                    className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-muted/60"
                  >
                    <FileThumbnail file={file} className="size-9 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {file.filename}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {`${fileKindLabel(file)} · ${formatFileSize(file.sizeBytes)}`}
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
              {organization ? (
                <AsideRow label="Organization">
                  <Link
                    to={networkWorkspacePath({
                      networkId: network.id,
                      organizationId: organization.id,
                    })}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{organization.name}</span>
                  </Link>
                </AsideRow>
              ) : null}
              <AsideRow label="Network">
                <Link
                  to={networkWorkspacePath({ networkId: network.id })}
                  className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                >
                  <GalleryVerticalEndIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{network.name}</span>
                </Link>
              </AsideRow>
              <AsideRow label="Created">
                {formatRelativeTime(visibleUser.createdAt)}
              </AsideRow>
              {visibleUser.updatedAt !== visibleUser.createdAt ? (
                <AsideRow label="Updated">
                  {formatRelativeTime(visibleUser.updatedAt)}
                </AsideRow>
              ) : null}
              <AsideRow label="ID">
                <CopyIdButton value={visibleUser.id} />
              </AsideRow>
            </dl>
            <Link
              to={href("organization-users")}
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all organization users
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}

function OrganizationUserSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
            {Array.from({ length: 3 }, (_, index) => (
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

function OrganizationUserStatusPage({
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

function recordDisplayTitle(
  data: JsonObject,
  properties: JsonSchemaProperty[],
  fallback: string
) {
  for (const property of properties) {
    if (
      property.type !== "string" ||
      isFileProperty(property) ||
      isForeignProperty(property)
    ) {
      continue
    }
    if (property.enumValues?.length) {
      continue
    }
    const value = data[property.name]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return fallback
}
