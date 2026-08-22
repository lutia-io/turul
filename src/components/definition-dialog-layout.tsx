import type { ReactNode } from "react"

import { FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

export const definitionDialogClassName = "sm:inset-x-[6vw] lg:inset-x-10"

export function DefinitionDialogBody({
  children,
  json,
}: {
  children: ReactNode
  json: ReactNode
}) {
  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)]">
      <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
        {children}
      </div>
      {json}
    </div>
  )
}

export function DefinitionJsonPane({
  id,
  title = "JSON definition",
  description,
  value,
  onChange,
  onBlur,
  error,
  readOnly = false,
}: {
  id?: string
  title?: string
  description: string
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  error?: string | null
  readOnly?: boolean
}) {
  return (
    <div className="flex min-h-0 flex-col border-t bg-muted/20 lg:border-t-0 lg:border-l">
      <div className="shrink-0 border-b px-4 py-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {readOnly ? (
        <pre className="min-h-48 flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed lg:min-h-0">
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
          className="field-sizing-fixed min-h-48 flex-1 resize-none rounded-none border-0 bg-transparent font-mono text-[12px] leading-relaxed shadow-none focus-visible:border-transparent focus-visible:ring-0 lg:min-h-0 dark:bg-transparent"
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
