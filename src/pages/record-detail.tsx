import { useState } from "react"
import { Link, useParams } from "react-router"
import { Building2Icon, FileJsonIcon, TableIcon } from "lucide-react"

import { FilePreviewSheet, FileThumbnail } from "@/components/file-preview"
import { JsonDefinitionCard } from "@/components/json-definition-card"
import { getFile, getOrganizationUser } from "@/data/files"
import { getOrganization, getSchema } from "@/data/networks"
import { getRecord } from "@/data/records"
import { getBadgeColor } from "@/lib/badge"
import { formatCellValue, formatFileSize } from "@/lib/records"
import {
  getJsonSchemaProperties,
  getRecordFileIds,
  isFileProperty,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"
import { cn } from "@/lib/utils"

export default function RecordDetail() {
  const { recordId } = useParams()
  const { network: workspaceNetwork, organizationId } = useNetworkWorkspace()
  const stored = recordId ? getRecord(recordId) : undefined
  const schemaResult = stored ? getSchema(stored.schemaId) : undefined
  const belongsToWorkspace =
    !workspaceNetwork || stored?.networkId === workspaceNetwork.id
  const record = belongsToWorkspace ? stored : undefined
  const schema = belongsToWorkspace ? schemaResult?.schema : undefined
  const network = belongsToWorkspace ? schemaResult?.network : undefined
  const organization = record
    ? getOrganization(record.organizationId)?.organization
    : undefined
  const user = record ? getOrganizationUser(record.organizationId) : undefined
  const properties = schema ? getJsonSchemaProperties(schema.definition) : []
  const fileIds = record ? getRecordFileIds(record.data, properties) : []
  const tone = getBadgeColor(schema?.color)
  const [previewFileId, setPreviewFileId] = useState<string>()
  const previewFile = previewFileId ? getFile(previewFileId) : undefined

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      {record && schema && network ? (
        <>
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg",
                tone.bg,
                tone.text
              )}
            >
              <TableIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {schema.name} record
                </h1>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {record.id}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {organization?.name ?? record.organizationId}
                {user ? ` · ${user.name}` : ""}
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-medium">Data</h2>
              <p className="text-xs text-muted-foreground">
                Values stored in the record JSONB column, shaped by this schema.
              </p>
            </div>
            <dl className="divide-y">
              {properties.map((property) => {
                const value = record.data[property.name]

                return (
                  <div
                    key={property.name}
                    className="grid gap-1 px-5 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start"
                  >
                    <dt className="font-mono text-xs text-muted-foreground">
                      {property.name}
                    </dt>
                    <dd className="min-w-0 text-sm">
                      {isFileProperty(property) &&
                      typeof value === "string" &&
                      value ? (
                        <FileChip
                          fileId={value}
                          onPreview={() => setPreviewFileId(value)}
                        />
                      ) : (
                        formatCellValue(value, property) || (
                          <span className="text-muted-foreground">—</span>
                        )
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>

          {fileIds.length > 0 ? (
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Files
                </h2>
                <p className="text-sm text-muted-foreground">
                  Click a file to preview it.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {fileIds.map((fileId) => {
                  const file = getFile(fileId)

                  return (
                    <button
                      key={fileId}
                      type="button"
                      onClick={() => setPreviewFileId(fileId)}
                      className="flex items-center gap-3 rounded-xl border bg-background px-3.5 py-3 text-left shadow-xs transition-colors hover:bg-muted/50"
                    >
                      {file ? (
                        <FileThumbnail file={file} className="size-12" />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                          <TableIcon className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {file?.filename ?? fileId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file
                            ? `${file.contentType} · ${formatFileSize(file.sizeBytes)}`
                            : "Missing file"}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          <JsonDefinitionCard definition={record.data} label="JSONB data" />

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to={`${networkWorkspacePath({
                networkId: network.id,
                organizationId,
                rest: "records",
              })}?schema=${schema.id}`}
              className="flex items-center gap-3.5 rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <FileJsonIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Schema</p>
                <p className="truncate font-medium">{schema.name}</p>
              </div>
            </Link>
            {organization ? (
              <Link
                to={networkWorkspacePath({
                  networkId: network.id,
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
          </div>

          <FilePreviewSheet
            file={previewFile}
            open={Boolean(previewFile)}
            onOpenChange={(open) => {
              if (!open) {
                setPreviewFileId(undefined)
              }
            }}
            href={
              previewFileId
                ? networkWorkspacePath({
                    networkId: network.id,
                    organizationId,
                    rest: `files/${previewFileId}`,
                  })
                : undefined
            }
          />
        </>
      ) : (
        <div>
          <h1 className="text-lg font-semibold">Record not found</h1>
          <p className="text-sm text-muted-foreground">
            This record does not exist or is no longer available.
          </p>
        </div>
      )}
    </div>
  )
}

function FileChip({
  fileId,
  onPreview,
}: {
  fileId: string
  onPreview: () => void
}) {
  const file = getFile(fileId)

  return (
    <button
      type="button"
      onClick={onPreview}
      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md bg-muted px-1.5 py-0.5 text-left text-xs font-medium hover:bg-muted/80"
    >
      {file ? <FileThumbnail file={file} className="size-5" /> : null}
      <span className="truncate">{file?.filename ?? fileId}</span>
    </button>
  )
}
