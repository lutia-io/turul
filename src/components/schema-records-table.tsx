import { useState } from "react"
import { Link } from "react-router"
import {
  ArrowUpRightIcon,
  EyeIcon,
  GlobeIcon,
  Link2Icon,
  MailIcon,
} from "lucide-react"

import { FileThumbnail } from "@/components/file-preview"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { StoredFile, StoredRecord } from "@/data/files"
import type { Schema } from "@/data/networks"
import { fileKindLabel } from "@/lib/file-preview"
import { getBadgeColor } from "@/lib/badge"
import {
  getJsonSchemaProperties,
  isEmailProperty,
  isFileProperty,
  isForeignProperty,
  isUriProperty,
  type JsonSchemaProperty,
  type JsonValue,
} from "@/lib/json-definition"
import { workspaceRecordFromApi } from "@/lib/network-workspace"
import {
  formatCellValue,
  formatFileSize,
  recordDisplayTitle,
} from "@/lib/records"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetRecordQuery, type RelatedRecord } from "@/store/record-slice"

const linkChipClass =
  "group/link inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-lg bg-muted/70 px-1.5 py-1 text-left text-xs font-medium text-foreground no-underline outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-muted"

export function RecordCell({
  record,
  property,
  filesById,
  relatedById,
  schemas,
  href,
  relatedHref,
  onPreviewFile,
}: {
  record: StoredRecord
  property: JsonSchemaProperty
  filesById: Map<string, StoredFile>
  relatedById?: Map<string, RelatedRecord>
  schemas?: Schema[]
  href: string
  relatedHref?: (recordId: string) => string
  onPreviewFile: (fileId: string) => void
}) {
  const value = record.data[property.name]

  if (isFileProperty(property) && typeof value === "string" && value) {
    return (
      <FileRecordCell
        fileId={value}
        file={filesById.get(value)}
        onPreview={() => onPreviewFile(value)}
      />
    )
  }

  if (isForeignProperty(property) && typeof value === "string" && value) {
    const related = relatedById?.get(value)
    const schema = schemas?.find(
      (item) => item.id === (related?.schemaId ?? property.schemaId)
    )

    return (
      <RelatedRecordLink
        recordId={value}
        title={related?.title}
        schema={schema}
        href={relatedHref?.(value) ?? href}
      />
    )
  }

  if (isUriProperty(property) && typeof value === "string" && value) {
    return <UriRecordLink value={value} />
  }

  if (isEmailProperty(property) && typeof value === "string" && value) {
    return <EmailRecordLink value={value} />
  }

  const text = formatCellValue(value, property)
  const tone =
    property.enumValues && typeof value === "string"
      ? enumTone(value)
      : undefined

  return (
    <Link
      to={href}
      className={cn(
        "block max-w-[18rem] min-w-[6rem] truncate",
        property.type === "number" || property.type === "integer"
          ? "text-right font-medium tabular-nums"
          : null
      )}
    >
      {property.enumValues && typeof value === "string" && text ? (
        <span
          className={cn(
            "inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium",
            tone
          )}
        >
          {text}
        </span>
      ) : text ? (
        text
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </Link>
  )
}

export function RelatedRecordLink({
  recordId,
  title,
  schema,
  href,
}: {
  recordId: string
  title?: string
  schema?: Schema
  href: string
}) {
  const [open, setOpen] = useState(false)
  const label = title || recordId
  const tone = getBadgeColor(schema?.color)

  return (
    <HoverCard onOpenChange={setOpen}>
      <HoverCardTrigger
        delay={350}
        closeDelay={150}
        render={<Link to={href} />}
        className={linkChipClass}
      >
        {schema ? (
          <span className={cn("size-1.5 shrink-0 rounded-full", tone.bg)} />
        ) : (
          <Link2Icon className="size-3 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 truncate">{label}</span>
        <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/link:text-foreground" />
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80 p-0">
        <RelatedRecordPreview
          recordId={recordId}
          title={label}
          schema={schema}
          href={href}
          open={open}
        />
      </HoverCardContent>
    </HoverCard>
  )
}

export function UriRecordLink({ value }: { value: string }) {
  const href = hrefForUri(value)
  const label = displayUri(value)

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={350}
        closeDelay={150}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkChipClass}
      >
        <GlobeIcon className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{label}</span>
        <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/link:text-foreground" />
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80 p-0">
        <ExternalLinkPreview
          href={href}
          label={value}
          description="Open this URL in a new tab."
          action="Open link"
          external
        />
      </HoverCardContent>
    </HoverCard>
  )
}

export function EmailRecordLink({ value }: { value: string }) {
  const email = displayEmail(value)
  const href = hrefForEmail(value)

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={350}
        closeDelay={150}
        href={href}
        className={linkChipClass}
      >
        <MailIcon className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{email}</span>
        <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/link:text-foreground" />
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80 p-0">
        <ExternalLinkPreview
          href={href}
          label={email}
          description="Compose an email to this address."
          action="Send email"
        />
      </HoverCardContent>
    </HoverCard>
  )
}

export function propertyLabel(name: string) {
  return name
    .replace(/Id$/, " ID")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase())
}

function FileRecordCell({
  fileId,
  file,
  onPreview,
}: {
  fileId: string
  file?: StoredFile
  onPreview: () => void
}) {
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={350}
        closeDelay={150}
        render={<button type="button" onClick={onPreview} />}
        className={linkChipClass}
      >
        {file ? <FileThumbnail file={file} className="size-6" /> : null}
        <span className="min-w-0 truncate">{file?.filename ?? fileId}</span>
        <EyeIcon className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/link:text-foreground" />
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72 p-0">
        <button
          type="button"
          onClick={onPreview}
          className="w-full overflow-hidden rounded-lg text-left"
        >
          {file?.contentType.startsWith("image/") ? (
            <FileThumbnail
              file={file}
              className="h-36 w-full rounded-none object-cover"
            />
          ) : null}
          <div className="space-y-1 p-3">
            <p className="truncate font-medium">{file?.filename ?? fileId}</p>
            <p className="text-xs text-muted-foreground">
              {file
                ? `${fileKindLabel(file)} · ${formatFileSize(file.sizeBytes)}`
                : "File"}
            </p>
            <p className="pt-1 text-xs text-muted-foreground">
              Click to preview
            </p>
          </div>
        </button>
      </HoverCardContent>
    </HoverCard>
  )
}

function RelatedRecordPreview({
  recordId,
  title,
  schema,
  href,
  open,
}: {
  recordId: string
  title: string
  schema?: Schema
  href: string
  open: boolean
}) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useGetRecordQuery(recordId, {
    skip: !isAuthenticated || !open,
  })
  const record = query.data ? workspaceRecordFromApi(query.data) : undefined
  const properties = schema ? getJsonSchemaProperties(schema.definition) : []
  const previewFields = properties
    .filter(
      (property) =>
        !isFileProperty(property) &&
        property.type !== "object" &&
        property.type !== "array"
    )
    .slice(0, 5)
  const heading =
    record && properties.length > 0
      ? recordDisplayTitle(record.data, properties, title)
      : title
  const tone = getBadgeColor(schema?.color)

  return (
    <div className="min-w-0">
      <div className="space-y-1 px-3 pt-3 pb-2">
        {schema ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", tone.bg)} />
            {schema.name}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Related record</p>
        )}
        <p className="truncate font-medium">{heading}</p>
      </div>
      {query.isFetching && !record ? (
        <div className="space-y-2 border-t px-3 py-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      ) : null}
      {record && previewFields.length > 0 ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t px-3 py-2.5">
          {previewFields.map((property) => {
            const value = record.data[property.name]
            const text = previewFieldText(property, value, query.data?.related)
            return (
              <div key={property.name} className="contents">
                <dt className="max-w-[7rem] truncate text-xs text-muted-foreground">
                  {propertyLabel(property.name)}
                </dt>
                <dd className="truncate text-xs font-medium">
                  {text || (
                    <span className="font-normal text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      ) : null}
      {query.isError ? (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          Couldn't load a preview for this record.
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
        <p className="truncate text-xs text-muted-foreground">
          {record
            ? `Created ${formatRelativeTime(record.createdAt)}`
            : "Open record"}
        </p>
        <Link
          to={href}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground hover:underline"
        >
          Open
          <ArrowUpRightIcon className="size-3" />
        </Link>
      </div>
    </div>
  )
}

function ExternalLinkPreview({
  href,
  label,
  description,
  action,
  external,
}: {
  href: string
  label: string
  description: string
  action: string
  external?: boolean
}) {
  return (
    <div className="min-w-0 p-3">
      <p className="text-sm font-medium break-all">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
      >
        {action}
        <ArrowUpRightIcon className="size-3" />
      </a>
    </div>
  )
}

function previewFieldText(
  property: JsonSchemaProperty,
  value: JsonValue | undefined,
  related?: Record<string, RelatedRecord>
) {
  if (isForeignProperty(property) && typeof value === "string" && value) {
    return related?.[value]?.title || value
  }
  if (isEmailProperty(property) && typeof value === "string" && value) {
    return displayEmail(value)
  }
  if (isUriProperty(property) && typeof value === "string" && value) {
    return displayUri(value)
  }
  return formatCellValue(value, property)
}

function hrefForUri(value: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value
  }
  return `https://${value}`
}

function displayUri(value: string) {
  try {
    const url = new URL(hrefForUri(value))
    const path = url.pathname === "/" ? "" : url.pathname
    return `${url.host}${path}${url.search}`
  } catch {
    return value
  }
}

function hrefForEmail(value: string) {
  return value.startsWith("mailto:") ? value : `mailto:${value}`
}

function displayEmail(value: string) {
  return value.replace(/^mailto:/i, "")
}

function enumTone(value: string) {
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
    ].includes(value)
  ) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  }

  if (["failed", "denied", "refused", "lapsed", "declined"].includes(value)) {
    return "bg-red-500/10 text-red-700 dark:text-red-400"
  }

  if (
    ["queued", "pending", "proposed", "frozen", "attempted", "draft"].includes(
      value
    )
  ) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400"
  }

  return undefined
}

export function SchemaSheetTabs({
  schemas,
  activeId,
  onSelect,
}: {
  schemas: Schema[]
  activeId?: string
  onSelect: (schemaId: string) => void
}) {
  return (
    <div className="flex min-w-0 gap-1 overflow-x-auto">
      {schemas.map((schema) => {
        const tone = getBadgeColor(schema.color)
        const active = schema.id === activeId

        return (
          <button
            key={schema.id}
            type="button"
            onClick={() => onSelect(schema.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
              active
                ? "border-foreground/15 bg-background font-medium shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className={cn("size-2 rounded-full", tone.bg)} />
            {schema.name}
          </button>
        )
      })}
    </div>
  )
}
