import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  Building2Icon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  TableIcon,
  UsersIcon,
} from "lucide-react"

import { FileViewer } from "@/components/file-preview"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getBadgeColor } from "@/lib/badge"
import { fileKindLabel } from "@/lib/file-preview"
import { formatFileSize, recordsReferencingFile } from "@/lib/records"
import {
  networkWorkspacePath,
  organizationUserName,
  useNetworkWorkspace,
  useWorkspaceOrganizationUsers,
  useWorkspaceOrganizations,
  useWorkspaceRecords,
  useWorkspaceSchemas,
  workspaceFileFromApi,
} from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetFileContentQuery, useGetFileQuery } from "@/store/file-slice"

export default function FileDetail() {
  const { fileId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { organizationUsers } = useWorkspaceOrganizationUsers()
  const { records } = useWorkspaceRecords()
  const { schemas } = useWorkspaceSchemas()
  const fileQuery = useGetFileQuery(fileId ?? "", {
    skip: !isAuthenticated || !fileId,
  })
  const stored = fileQuery.data
    ? workspaceFileFromApi(fileQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork ||
    (stored?.networkId === workspaceNetwork.id &&
      (!organizationId || stored.organizationId === organizationId))
  const file = belongsToWorkspace ? stored : undefined
  const organization = file
    ? organizations.find((item) => item.id === file.organizationId)
    : undefined
  const user = file
    ? organizationUsers.find((item) => item.id === file.organizationUserId)
    : undefined
  const linkedRecords = file
    ? recordsReferencingFile(file.id, records, schemas)
    : []
  const contentQuery = useGetFileContentQuery(file?.id ?? "", {
    skip: !isAuthenticated || !file?.id,
  })

  if (fileQuery.isLoading) {
    return <FilePageSkeleton />
  }

  if (fileQuery.isError) {
    return (
      <FileStatusPage
        {...getHumaLoadErrorCopy(fileQuery.error, {
          resource: "File",
          notFoundMessage:
            "This file does not exist or is no longer available.",
        })}
      />
    )
  }

  if (!file) {
    return (
      <FileStatusPage
        title="File not found"
        message="This file does not exist or is no longer available."
      />
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {fileKindLabel(file)}
            <span className="text-muted-foreground/70">
              {` · ${formatFileSize(file.sizeBytes)}`}
            </span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-pretty">
            {file.filename}
          </h1>
        </div>
        {contentQuery.data ? (
          <a
            href={contentQuery.data.objectUrl}
            download={file.filename}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <DownloadIcon />
            Download
          </a>
        ) : null}
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="flex h-[min(70vh,40rem)] min-w-0 overflow-hidden rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10 sm:p-5">
          <FileViewer file={file} fill className="min-h-0 flex-1" />
        </section>

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
                      networkId: file.networkId,
                      organizationId: organization.id,
                    })}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{organization.name}</span>
                  </Link>
                </AsideRow>
              ) : null}
              {user ? (
                <AsideRow label="Uploaded by">
                  <Link
                    to={href(`organization-users/${user.id}`)}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <UsersIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {organizationUserName(user)}
                    </span>
                  </Link>
                </AsideRow>
              ) : (
                <AsideRow label="Uploaded by">Unknown</AsideRow>
              )}
              <AsideRow label="Created">
                {formatRelativeTime(file.createdAt)}
              </AsideRow>
              {file.updatedAt !== file.createdAt ? (
                <AsideRow label="Updated">
                  {formatRelativeTime(file.updatedAt)}
                </AsideRow>
              ) : null}
              <AsideRow label="Type">{file.contentType}</AsideRow>
              <AsideRow label="ID">
                <CopyIdButton value={file.id} />
              </AsideRow>
            </dl>
            <Link
              to={href("files")}
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all files
            </Link>
          </section>

          <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Records
            </h2>
            {linkedRecords.length > 0 ? (
              <div className="mt-3 flex flex-col gap-1">
                {linkedRecords.map((record) => {
                  const schema = schemas.find(
                    (item) => item.id === record.schemaId
                  )
                  const tone = getBadgeColor(schema?.color)

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
                          {schema?.name ?? record.schemaId}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {record.id}
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No records reference this file.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function FilePageSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="h-[min(70vh,40rem)] rounded-2xl" />
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

function FileStatusPage({
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
