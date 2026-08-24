import { Link } from "react-router"

import { FileThumbnail } from "@/components/file-preview"
import type { StoredFile, StoredRecord } from "@/data/files"
import type { Schema } from "@/data/networks"
import { getBadgeColor } from "@/lib/badge"
import {
  isFileProperty,
  type JsonSchemaProperty,
} from "@/lib/json-definition"
import { formatCellValue } from "@/lib/records"
import { cn } from "@/lib/utils"

export function RecordCell({
  record,
  property,
  filesById,
  href,
  onPreviewFile,
}: {
  record: StoredRecord
  property: JsonSchemaProperty
  filesById: Map<string, StoredFile>
  href: string
  onPreviewFile: (fileId: string) => void
}) {
  const value = record.data[property.name]

  if (isFileProperty(property) && typeof value === "string" && value) {
    const file = filesById.get(value)

    return (
      <button
        type="button"
        onClick={() => onPreviewFile(value)}
        className="inline-flex max-w-[16rem] items-center gap-2 truncate rounded-lg bg-muted/70 px-1.5 py-1 text-left text-xs font-medium transition-colors hover:bg-muted"
      >
        {file ? <FileThumbnail file={file} className="size-6" /> : null}
        <span className="truncate">{file?.filename ?? value}</span>
      </button>
    )
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

export function propertyLabel(name: string) {
  return name
    .replace(/Id$/, " ID")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase())
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
