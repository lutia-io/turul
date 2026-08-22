import { Link, useParams } from "react-router"
import { Building2Icon, TableIcon } from "lucide-react"

import { FileViewer } from "@/components/file-preview"
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
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetFileQuery } from "@/store/file-slice"

export default function FileDetail() {
  const { fileId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network: workspaceNetwork, organizationId } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { organizationUsers } = useWorkspaceOrganizationUsers()
  const { records } = useWorkspaceRecords()
  const { schemas } = useWorkspaceSchemas()
  const fileQuery = useGetFileQuery(fileId ?? "", {
    skip: !isAuthenticated || !fileId,
  })
  const stored = fileQuery.data ? workspaceFileFromApi(fileQuery.data) : undefined
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

  if (fileQuery.isLoading) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">Loading file</h1>
        <p className="text-sm text-muted-foreground">
          Fetching this file from the server.
        </p>
      </div>
    )
  }

  if (fileQuery.isError) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <h1 className="text-lg font-semibold">File not found</h1>
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(
            fileQuery.error,
            "This file does not exist or is no longer available."
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {file ? (
        <>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {file.filename}
            </h1>
            <p className="text-sm text-muted-foreground">
              {fileKindLabel(file)} · {formatFileSize(file.sizeBytes)}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{file.id}</p>
          </div>

          <section className="flex h-[min(70vh,40rem)] overflow-hidden rounded-2xl bg-card p-4 shadow-xs ring-1 ring-foreground/10 sm:p-5">
            <FileViewer file={file} fill className="min-h-0 flex-1" />
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">Organization</p>
              <p className="mt-1 font-medium">
                {organization?.name ?? file.organizationId}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">Uploaded by</p>
              <p className="mt-1 font-medium">
                {user ? organizationUserName(user) : "Unknown"}
              </p>
            </div>
            <div className="rounded-xl border bg-background px-3.5 py-3 shadow-xs">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="mt-1 font-medium">
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(file.createdAt))}
              </p>
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Records
              </h2>
              <p className="text-sm text-muted-foreground">
                Records whose JSONB data stores this file id.
              </p>
            </div>
            {linkedRecords.length > 0 ? (
              <div className="flex flex-col gap-2">
                {linkedRecords.map((record) => {
                  const schema = schemas.find((item) => item.id === record.schemaId)

                  return (
                    <Link
                      key={record.id}
                      to={networkWorkspacePath({
                        networkId: record.networkId,
                        organizationId,
                        rest: `records/${record.id}`,
                      })}
                      className="flex items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                        <TableIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {schema?.name ?? record.schemaId}
                        </p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {record.id}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No records reference this file.
              </p>
            )}
          </section>

          {organization ? (
            <Link
              to={networkWorkspacePath({
                networkId: file.networkId,
                organizationId: organization.id,
              })}
              className="flex items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Building2Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="truncate font-medium">{organization.name}</p>
              </div>
            </Link>
          ) : null}
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">File not found</h1>
          <p className="text-sm text-muted-foreground">
            This file does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}
