import { useState } from "react"
import { BracesIcon, CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { formatJsonText } from "@/lib/json-definition"
import { cn } from "@/lib/utils"

export function DefinitionJsonPane({
  id,
  title = "JSON definition",
  description,
  value,
  onChange,
  onBlur,
  error,
  readOnly = false,
  className,
}: {
  id?: string
  title?: string
  description: string
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: string | null
  readOnly?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const [formatStatus, setFormatStatus] = useState<"idle" | "done" | "invalid">(
    "idle"
  )

  async function copyDefinition() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  function formatDefinition() {
    const formatted = formatJsonText(value)
    if (!formatted || !onChange) {
      setFormatStatus("invalid")
      window.setTimeout(() => setFormatStatus("idle"), 1600)
      return
    }
    if (formatted !== value) {
      onChange(formatted)
    }
    setFormatStatus("done")
    window.setTimeout(() => setFormatStatus("idle"), 1600)
  }

  const formatLabel =
    formatStatus === "invalid"
      ? "Invalid"
      : formatStatus === "done"
        ? "Formatted"
        : "Format"

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col bg-muted/20",
        className
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onChange ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={formatDefinition}
            >
              {formatStatus === "done" ? <CheckIcon /> : <BracesIcon />}
              {formatLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copyDefinition()}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      {readOnly ? (
        <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed">
          {value}
        </pre>
      ) : (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
          spellCheck={false}
          readOnly={!onChange}
          aria-invalid={error ? true : undefined}
          style={{ fieldSizing: "fixed" }}
          className="h-full min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent font-mono text-[12px] leading-relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        />
      )}
      {error ? (
        <div className="shrink-0 border-t px-4 py-2">
          <FieldError>{error}</FieldError>
        </div>
      ) : null}
    </div>
  )
}
