import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  Building2Icon,
  CheckIcon,
  CopyIcon,
  FileIcon,
  FileJsonIcon,
  TableIcon,
  UsersIcon,
} from "lucide-react"

import { FilePreviewDialog, FileThumbnail } from "@/components/file-preview"
import { JsonDefinitionCard } from "@/components/json-definition-card"
import { propertyLabel } from "@/components/schema-records-table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getBadgeColor } from "@/lib/badge"
import { formatCellValue, formatFileSize } from "@/lib/records"
import {
  getJsonSchemaProperties,
  getRecordFileIds,
  isFileProperty,
  isForeignProperty,
  type JsonObject,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import {
  networkWorkspacePath,
  organizationUserName,
  useNetworkWorkspace,
  useWorkspaceOrganizationUsers,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
  workspaceFileFromApi,
  workspaceRecordFromApi,
} from "@/lib/network-workspace"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetFileQuery } from "@/store/file-slice"
import { useGetRecordQuery } from "@/store/record-slice"

type DataView = "fields" | "json"

export default function RecordDetail() {
  const { recordId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { organizations } = useWorkspaceOrganizations()
  const { organizationUsers } = useWorkspaceOrganizationUsers()
  const { schemas } = useWorkspaceSchemas()
  const recordQuery = useGetRecordQuery(recordId ?? "", {
    skip: !isAuthenticated || !recordId,
  })
  const stored = recordQuery.data
    ? workspaceRecordFromApi(recordQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork ||
    (stored?.networkId === workspaceNetwork.id &&
      (!organizationId || stored.organizationId === organizationId))
  const record = belongsToWorkspace ? stored : undefined
  const schema = record
    ? schemas.find((item) => item.id === record.schemaId)
    : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const organization = record
    ? organizations.find((item) => item.id === record.organizationId)
    : undefined
  const user = record
    ? organizationUsers.find((item) => item.id === record.organizationUserId)
    : undefined
  const properties = schema ? getJsonSchemaProperties(schema.definition) : []
  const fileIds = record ? getRecordFileIds(record.data, properties) : []
  const valueProperties = properties.filter(
    (property) => !isFileProperty(property)
  )
  const fileProperties = properties.filter((property) => {
    if (!isFileProperty(property) || !record) {
      return false
    }
    const value = record.data[property.name]
    return typeof value === "string" && value.length > 0
  })
  const tone = getBadgeColor(schema?.color)
  const title = record
    ? recordDisplayTitle(record.data, properties, schema?.name ?? "Record")
    : "Record"
  const [previewFileId, setPreviewFileId] = useState<string>()
  const [dataView, setDataView] = useState<DataView>("fields")
  const previewQuery = useGetFileQuery(previewFileId ?? "", {
    skip: !isAuthenticated || !previewFileId,
  })
  const previewFile = previewQuery.data
    ? workspaceFileFromApi(previewQuery.data)
    : undefined

  if (recordQuery.isLoading) {
    return <RecordPageSkeleton />
  }

  if (recordQuery.isError) {
    return (
      <RecordStatusPage
        {...getHumaLoadErrorCopy(recordQuery.error, {
          resource: "Record",
          notFoundMessage:
            "This record does not exist or is no longer available.",
        })}
      />
    )
  }

  if (!record || !network) {
    return (
      <RecordStatusPage
        title="Record not found"
        message="This record does not exist or is no longer available."
      />
    )
  }

  const recordsHref = `${href("records")}${schema ? `?schema=${schema.id}` : ""}`
  const showFieldGrid =
    schema && valueProperties.length > 0 && dataView === "fields"

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          {schema ? (
            <Link
              to={href(`schemas/${schema.id}`)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className={cn("size-1.5 rounded-full", tone.bg)} />
              {schema.name}
            </Link>
          ) : (
            <p className="text-xs font-medium text-muted-foreground">Record</p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-pretty">
            {title}
          </h1>
        </div>
        {schema && properties.length > 0 ? (
          <Button
            type="button"
            variant={dataView === "json" ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              setDataView((view) => (view === "fields" ? "json" : "fields"))
            }
          >
            <FileJsonIcon />
            {dataView === "json" ? "Fields" : "JSON"}
          </Button>
        ) : null}
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        {showFieldGrid ? (
          <section className="min-w-0 rounded-2xl bg-card p-6 shadow-xs ring-1 ring-foreground/10 sm:p-8">
            <dl className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
              {valueProperties.map((property) => (
                <FieldItem
                  key={property.name}
                  property={property}
                  value={record.data[property.name]}
                  related={recordQuery.data?.related}
                  schemas={schemas}
                  recordHref={(recordId) => href(`records/${recordId}`)}
                />
              ))}
            </dl>
          </section>
        ) : (
          <JsonDefinitionCard
            definition={record.data}
            label="JSONB data"
            description="Values stored on this record."
          />
        )}

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
              {user ? (
                <AsideRow label="Created by">
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
              ) : null}
              <AsideRow label="Created">
                {formatRelativeTime(record.createdAt)}
              </AsideRow>
              {record.updatedAt !== record.createdAt ? (
                <AsideRow label="Updated">
                  {formatRelativeTime(record.updatedAt)}
                </AsideRow>
              ) : null}
              <AsideRow label="ID">
                <CopyIdButton value={record.id} />
              </AsideRow>
            </dl>
            {schema ? (
              <Link
                to={recordsHref}
                className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <TableIcon className="size-3.5" />
                View all {schema.name} records
              </Link>
            ) : null}
          </section>

          {fileIds.length > 0 ? (
            <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Files
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {fileProperties.map((property) => {
                  const fileId = record.data[property.name]
                  if (typeof fileId !== "string") {
                    return null
                  }

                  return (
                    <RecordFileRow
                      key={property.name}
                      fileId={fileId}
                      label={propertyLabel(property.name)}
                      onPreview={() => setPreviewFileId(fileId)}
                    />
                  )
                })}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <FilePreviewDialog
        file={previewFile}
        open={Boolean(previewFileId)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFileId(undefined)
          }
        }}
        href={previewFileId ? href(`files/${previewFileId}`) : undefined}
      />
    </div>
  )
}

function RecordPageSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, index) => (
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

function RecordStatusPage({
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

function FieldItem({
  property,
  value,
  related,
  schemas,
  recordHref,
}: {
  property: JsonSchemaProperty
  value: JsonValue | undefined
  related?: Record<string, { id: string; schemaId: string; title: string }>
  schemas: { id: string; name: string }[]
  recordHref: (recordId: string) => string
}) {
  return (
    <div
      className={cn("min-w-0", isWideField(property, value) && "sm:col-span-2")}
    >
      <dt className="text-xs text-muted-foreground">
        {propertyLabel(property.name)}
      </dt>
      <dd className="mt-1.5 text-sm">
        <FieldValue
          property={property}
          value={value}
          related={related}
          schemas={schemas}
          recordHref={recordHref}
        />
      </dd>
    </div>
  )
}

function FieldValue({
  property,
  value,
  related,
  schemas,
  recordHref,
}: {
  property: JsonSchemaProperty
  value: JsonValue | undefined
  related?: Record<string, { id: string; schemaId: string; title: string }>
  schemas: { id: string; name: string }[]
  recordHref: (recordId: string) => string
}) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>
  }

  if (isForeignProperty(property) && typeof value === "string" && value) {
    const relatedRecord = related?.[value]
    const schemaName = schemas.find(
      (schema) => schema.id === (relatedRecord?.schemaId ?? property.schemaId)
    )?.name

    return (
      <Link
        to={recordHref(value)}
        className="inline-flex max-w-full flex-col gap-0.5 font-medium underline-offset-4 hover:underline"
      >
        <span className="truncate">{relatedRecord?.title || value}</span>
        {schemaName ? (
          <span className="text-xs font-normal text-muted-foreground">
            {schemaName}
          </span>
        ) : null}
      </Link>
    )
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
          value
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {value ? "Yes" : "No"}
      </span>
    )
  }

  if (property.enumValues && typeof value === "string") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium",
          enumTone(value)
        )}
      >
        {formatCellValue(value, property)}
      </span>
    )
  }

  const text = formatCellValue(value, property)

  return (
    <span
      className={cn(
        "break-words",
        (property.type === "number" || property.type === "integer") &&
          "tabular-nums"
      )}
    >
      {text || <span className="text-muted-foreground">—</span>}
    </span>
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

function useStoredFile(fileId: string) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useGetFileQuery(fileId, {
    skip: !isAuthenticated || !fileId,
  })
  return query.data ? workspaceFileFromApi(query.data) : undefined
}

function RecordFileRow({
  fileId,
  label,
  onPreview,
}: {
  fileId: string
  label: string
  onPreview: () => void
}) {
  const file = useStoredFile(fileId)

  return (
    <button
      type="button"
      onClick={onPreview}
      className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-muted/60"
    >
      {file ? (
        <FileThumbnail file={file} className="size-9 rounded-md" />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileIcon className="size-3.5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {file?.filename ?? fileId}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {file ? `${label} · ${formatFileSize(file.sizeBytes)}` : label}
        </span>
      </span>
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

function isWideField(
  property: JsonSchemaProperty,
  value: JsonValue | undefined
) {
  if (property.type === "object" || property.type === "array") {
    return true
  }

  const name = property.name.toLowerCase()
  if (
    name.includes("description") ||
    name.includes("notes") ||
    name.includes("body") ||
    name.includes("message")
  ) {
    return true
  }

  return typeof value === "string" && value.length > 72
}

function enumTone(value: string) {
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_")

  if (
    [
      "delivered",
      "active",
      "confirmed",
      "paid",
      "complete",
      "accepted",
      "ready",
      "picked_up",
      "in_progress",
    ].includes(normalized)
  ) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  }

  if (
    [
      "failed",
      "denied",
      "refused",
      "lapsed",
      "declined",
      "cancelled",
      "blocked",
      "urgent",
    ].includes(normalized)
  ) {
    return "bg-red-500/10 text-red-700 dark:text-red-400"
  }

  if (
    [
      "queued",
      "pending",
      "proposed",
      "frozen",
      "attempted",
      "draft",
      "high",
    ].includes(normalized)
  ) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
  }

  return undefined
}
