import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react"
import { Link } from "react-router"
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  FileSpreadsheetIcon,
  ImageIcon,
  RotateCcwIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { StoredFile } from "@/data/files"
import { fileKindLabel, parseCsv } from "@/lib/file-preview"
import { formatFileSize } from "@/lib/records"
import { cn } from "@/lib/utils"
import { useGetFileContentQuery } from "@/store/file-slice"

const MIN_SCALE = 1
const MAX_SCALE = 8
const ZOOM_STEP = 1.25

export function FileThumbnail({
  file,
  className,
}: {
  file: StoredFile
  className?: string
}) {
  const isImage = file.contentType.startsWith("image/")
  const { data } = useGetFileContentQuery(file.id, { skip: !isImage })

  if (isImage && data) {
    return (
      <img
        src={data.objectUrl}
        alt=""
        className={cn(
          "size-8 shrink-0 rounded-sm object-cover ring-1 ring-foreground/10",
          className
        )}
      />
    )
  }

  const Icon = file.contentType.startsWith("image/")
    ? ImageIcon
    : file.contentType === "text/csv" ||
        file.contentType.includes("spreadsheet") ||
        file.filename.endsWith(".csv") ||
        file.filename.endsWith(".xlsx")
      ? FileSpreadsheetIcon
      : FileIcon

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
  fill = false,
}: {
  file: StoredFile
  className?: string
  fill?: boolean
}) {
  const { data, isLoading, isError } = useGetFileContentQuery(file.id)

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col", fill && "h-full", className)}>
      {isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading preview...</p>
      ) : isError || !data ? (
        <p className="p-4 text-sm text-muted-foreground">
          Preview is not available for this file.
        </p>
      ) : (
        <FilePreviewBody
          file={file}
          objectUrl={data.objectUrl}
          blob={data.blob}
          fill={fill}
        />
      )}
    </div>
  )
}

function FilePreviewBody({
  file,
  objectUrl,
  blob,
  fill,
}: {
  file: StoredFile
  objectUrl: string
  blob: Blob
  fill: boolean
}) {
  if (file.contentType.startsWith("image/")) {
    return (
      <ZoomableImage
        src={objectUrl}
        alt={file.filename}
        className={fill ? "h-full min-h-0 flex-1" : "h-[min(70vh,40rem)]"}
      />
    )
  }

  if (file.contentType === "application/pdf") {
    return (
      <iframe
        title={file.filename}
        src={objectUrl}
        className={cn(
          "w-full rounded-xl bg-muted ring-1 ring-foreground/10",
          fill ? "h-full min-h-0 flex-1" : "h-[min(70vh,40rem)]"
        )}
      />
    )
  }

  if (file.contentType === "text/csv" || file.filename.endsWith(".csv")) {
    return (
      <div className={cn(fill && "min-h-0 flex-1 overflow-auto")}>
        <CsvPreview blob={blob} filename={file.filename} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border bg-background px-4 py-5">
      <p className="text-sm text-muted-foreground">
        This file type cannot be previewed in the browser.
      </p>
      <a
        href={objectUrl}
        download={file.filename}
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
      >
        <DownloadIcon className="size-3.5" />
        Download {file.filename}
      </a>
    </div>
  )
}

function ZoomableImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(MIN_SCALE)
  const translateRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const hoveredRef = useRef(false)
  const [scale, setScale] = useState(MIN_SCALE)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const commit = useCallback((nextScale: number, nextTranslate: { x: number; y: number }) => {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
    const next =
      clampedScale === MIN_SCALE ? { x: 0, y: 0 } : nextTranslate
    scaleRef.current = clampedScale
    translateRef.current = next
    setScale(clampedScale)
    setTranslate(next)
  }, [])

  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const container = containerRef.current
      if (!container) {
        return
      }

      const rect = container.getBoundingClientRect()
      const px = clientX - rect.left - rect.width / 2
      const py = clientY - rect.top - rect.height / 2
      const currentScale = scaleRef.current
      const currentTranslate = translateRef.current
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
      const ratio = clampedScale / currentScale

      commit(clampedScale, {
        x: px - (px - currentTranslate.x) * ratio,
        y: py - (py - currentTranslate.y) * ratio,
      })
    },
    [commit]
  )

  const zoomBy = useCallback(
    (factor: number) => {
      const container = containerRef.current
      if (!container) {
        return
      }
      const rect = container.getBoundingClientRect()
      zoomAt(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        scaleRef.current * factor
      )
    },
    [zoomAt]
  )

  const reset = useCallback(() => {
    commit(MIN_SCALE, { x: 0, y: 0 })
  }, [commit])

  useEffect(() => {
    reset()
  }, [src, reset])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      zoomAt(event.clientX, event.clientY, scaleRef.current * factor)
    }

    container.addEventListener("wheel", onWheel, { passive: false })
    return () => container.removeEventListener("wheel", onWheel)
  }, [zoomAt])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!hoveredRef.current) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.closest("input, textarea, select, [contenteditable=true]") ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        zoomBy(ZOOM_STEP)
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault()
        zoomBy(1 / ZOOM_STEP)
      } else if (event.key === "0") {
        event.preventDefault()
        reset()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [reset, zoomBy])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || scaleRef.current <= MIN_SCALE) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: translateRef.current.x,
      originY: translateRef.current.y,
    }
    setDragging(true)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    commit(scaleRef.current, {
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    })
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return
    }
    dragRef.current = null
    setDragging(false)
  }

  function onDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (scaleRef.current > MIN_SCALE) {
      reset()
      return
    }
    zoomAt(event.clientX, event.clientY, 2.5)
  }

  const percent = Math.round(scale * 100)

  return (
    <figure
      className={cn(
        "relative min-h-0 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-foreground/10",
        className
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          "flex size-full items-center justify-center overflow-hidden touch-none",
          scale > MIN_SCALE
            ? dragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-zoom-in"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
        onMouseEnter={() => {
          hoveredRef.current = true
        }}
        onMouseLeave={() => {
          hoveredRef.current = false
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
          >
            <ZoomOutIcon />
          </Button>
          <span className="min-w-12 text-center text-xs font-medium tabular-nums">
            {percent}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            <ZoomInIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={reset}
            disabled={scale <= MIN_SCALE}
            aria-label="Reset zoom"
          >
            <RotateCcwIcon />
          </Button>
        </div>
      </div>
    </figure>
  )
}

function CsvPreview({ blob, filename }: { blob: Blob; filename: string }) {
  const [table, setTable] = useState<{ headers: string[]; rows: string[][] }>()

  useEffect(() => {
    let cancelled = false
    blob.text().then((text) => {
      if (!cancelled) {
        setTable(parseCsv(text))
      }
    })
    return () => {
      cancelled = true
    }
  }, [blob])

  if (!table) {
    return <p className="text-sm text-muted-foreground">Loading preview...</p>
  }

  if (table.headers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">This CSV file is empty.</p>
    )
  }

  return (
    <SpreadsheetGrid
      name={filename}
      headers={table.headers}
      rows={table.rows}
    />
  )
}

function SpreadsheetGrid({
  name,
  headers,
  rows,
}: {
  name: string
  headers: string[]
  rows: string[][]
}) {
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
                  key={`${header}-${index}`}
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
                {headers.map((_, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className="border-b px-2.5 py-1.5 whitespace-nowrap"
                  >
                    {row[cellIndex] ?? ""}
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

export function FilePreviewDialog({
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,64rem)] w-full max-w-[min(96vw,80rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,80rem)]">
        {file ? (
          <>
            <DialogHeader className="shrink-0 gap-1 border-b px-5 py-4 pr-12">
              <DialogTitle className="truncate">{file.filename}</DialogTitle>
              <DialogDescription>
                {fileKindLabel(file)} · {formatFileSize(file.sizeBytes)}
                {file.contentType.startsWith("image/")
                  ? " · Scroll or use +/− to zoom, drag to pan, double-click to reset"
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30 p-4">
              <FileViewer file={file} fill className="min-h-0 flex-1" />
            </div>
            {href ? (
              <div className="shrink-0 border-t px-5 py-3">
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
        ) : open ? (
          <div className="p-4 text-sm text-muted-foreground">
            Loading file...
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export { FilePreviewDialog as FilePreviewSheet }
