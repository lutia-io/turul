import { Link } from "react-router"
import {
  ExternalLinkIcon,
  FileIcon,
  FileSpreadsheetIcon,
  ImageIcon,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { StoredFile } from "@/data/files"
import {
  fileKindLabel,
  getFilePreview,
  type DocumentPage,
  type FilePreview,
  type SheetPreview,
} from "@/lib/file-preview"
import { formatFileSize } from "@/lib/records"
import { cn } from "@/lib/utils"

export function FileThumbnail({
  file,
  className,
}: {
  file: StoredFile
  className?: string
}) {
  const preview = getFilePreview(file)

  if (preview.kind === "image") {
    return (
      <img
        src={preview.src}
        alt=""
        className={cn(
          "size-8 shrink-0 rounded-sm object-cover ring-1 ring-foreground/10",
          className
        )}
      />
    )
  }

  const Icon =
    preview.kind === "csv" || preview.kind === "spreadsheet"
      ? FileSpreadsheetIcon
      : preview.kind === "pdf"
        ? FileIcon
        : ImageIcon

  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground ring-1 ring-foreground/10",
        className
      )}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

export function FileViewer({
  file,
  className,
}: {
  file: StoredFile
  className?: string
}) {
  const preview = getFilePreview(file)

  return (
    <div className={cn("min-w-0", className)}>
      <FilePreviewBody preview={preview} filename={file.filename} />
    </div>
  )
}

function FilePreviewBody({
  preview,
  filename,
}: {
  preview: FilePreview
  filename: string
}) {
  if (preview.kind === "image") {
    return (
      <figure className="overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-foreground/10">
        <img
          src={preview.src}
          alt={preview.alt}
          className="mx-auto max-h-[min(70vh,40rem)] w-full object-contain"
        />
      </figure>
    )
  }

  if (preview.kind === "pdf") {
    return (
      <div className="flex flex-col items-center gap-4">
        {preview.pages.map((page, index) => (
          <PdfPage key={`${filename}-${index}`} page={page} />
        ))}
      </div>
    )
  }

  if (preview.kind === "csv") {
    return (
      <SpreadsheetGrid
        name={filename}
        headers={preview.headers}
        rows={preview.rows}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {preview.sheets.map((sheet) => (
        <SpreadsheetGrid
          key={sheet.name}
          name={sheet.name}
          headers={sheet.headers}
          rows={sheet.rows}
        />
      ))}
    </div>
  )
}

function PdfPage({ page }: { page: DocumentPage }) {
  return (
    <article className="w-full max-w-[44rem] rounded-sm bg-[#fbfaf6] px-8 py-9 text-zinc-900 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.45)] ring-1 ring-zinc-300/80 sm:px-12 sm:py-12">
      <header className="border-b border-zinc-300 pb-4">
        <p className="text-[11px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
          {page.subheading}
        </p>
        <h3 className="mt-1 font-serif text-2xl tracking-tight">
          {page.heading}
        </h3>
      </header>
      <dl className="mt-5 grid gap-2 sm:grid-cols-2">
        {page.meta.map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] tracking-wide text-zinc-500 uppercase">
              {item.label}
            </dt>
            <dd className="text-sm">{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-col gap-4">
        {page.sections.map((section, index) => (
          <section key={section.title ?? index}>
            {section.title ? (
              <h4 className="mb-1 text-sm font-semibold">{section.title}</h4>
            ) : null}
            {section.lines.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-zinc-700">
                {line}
              </p>
            ))}
          </section>
        ))}
      </div>
      {page.footer ? (
        <p className="mt-10 text-center text-[11px] text-zinc-400">
          {page.footer}
        </p>
      ) : null}
    </article>
  )
}

function SpreadsheetGrid({ name, headers, rows }: SheetPreview) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
      <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium">
        {name}
      </div>
      <div className="overflow-auto">
        <table className="min-w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="w-8 border-r border-b bg-muted/60 px-1.5 py-1 text-center text-[10px] font-medium text-muted-foreground" />
              {headers.map((header, index) => (
                <th
                  key={header}
                  className="border-b bg-muted/60 px-2.5 py-1.5 text-left font-medium"
                >
                  <span className="mr-2 text-[10px] text-muted-foreground">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border-r bg-muted/40 px-1.5 py-1 text-center text-[10px] text-muted-foreground">
                  {rowIndex + 1}
                </td>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="border-b px-2.5 py-1.5 whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FilePreviewSheet({
  file,
  open,
  onOpenChange,
  href,
}: {
  file?: StoredFile
  open: boolean
  onOpenChange: (open: boolean) => void
  href?: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {file ? (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="truncate pr-8">{file.filename}</SheetTitle>
              <SheetDescription>
                {fileKindLabel(file)} · {formatFileSize(file.sizeBytes)}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-auto bg-muted/30 p-4">
              <FileViewer file={file} />
            </div>
            {href ? (
              <div className="border-t p-3">
                <Link
                  to={href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  Open file
                  <ExternalLinkIcon className="size-3.5" />
                </Link>
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
