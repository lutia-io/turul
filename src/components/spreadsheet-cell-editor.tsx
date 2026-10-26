import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react"

import type { JsonSchemaProperty, JsonValue } from "@/lib/json-definition"
import { coercePasteValue } from "@/lib/spreadsheet-table"
import { cn } from "@/lib/utils"

const editorClass =
  "h-7 w-full min-w-0 rounded-md border border-primary bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

export function SpreadsheetCellEditor({
  property,
  value,
  initialDraft,
  onCommit,
  onCancel,
}: {
  property: JsonSchemaProperty
  value: JsonValue | undefined
  initialDraft?: string
  onCommit: (next: JsonValue | null) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)
  const cancelledRef = useRef(false)
  const committedRef = useRef(false)
  const onCommitRef = useRef(onCommit)
  const onCancelRef = useRef(onCancel)
  onCommitRef.current = onCommit
  onCancelRef.current = onCancel

  const [draft, setDraft] = useState(() => {
    if (initialDraft !== undefined) {
      return initialDraft
    }
    if (value == null) {
      return ""
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false"
    }
    return String(value)
  })
  const draftRef = useRef(draft)
  draftRef.current = draft
  const propertyRef = useRef(property)
  propertyRef.current = property

  useEffect(() => {
    const node = inputRef.current
    if (!node) {
      return
    }
    node.focus()
    if (node instanceof HTMLInputElement) {
      if (initialDraft !== undefined) {
        const end = node.value.length
        node.setSelectionRange(end, end)
      } else {
        node.select()
      }
    }
  }, [initialDraft])

  useEffect(() => {
    return () => {
      if (cancelledRef.current || committedRef.current) {
        return
      }
      const next = coercePasteValue(draftRef.current, propertyRef.current)
      if (next === undefined) {
        onCancelRef.current()
        return
      }
      onCommitRef.current(next === null ? null : next)
    }
  }, [])

  function commit() {
    if (cancelledRef.current || committedRef.current) {
      return
    }
    committedRef.current = true
    const next = coercePasteValue(draft, property)
    if (next === undefined) {
      onCancel()
      return
    }
    onCommit(next === null ? null : next)
  }

  function cancel() {
    cancelledRef.current = true
    onCancel()
  }

  function onKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
      commit()
    }
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      cancel()
    }
    event.stopPropagation()
  }

  if (property.enumValues && property.enumValues.length > 0) {
    return (
      <select
        ref={inputRef as RefObject<HTMLSelectElement>}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={editorClass}
      >
        <option value="">—</option>
        {property.enumValues.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    )
  }

  if (property.type === "boolean") {
    return (
      <select
        ref={inputRef as RefObject<HTMLSelectElement>}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={editorClass}
      >
        <option value="">—</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }

  return (
    <input
      ref={inputRef as RefObject<HTMLInputElement>}
      value={draft}
      type={
        property.type === "number" || property.type === "integer"
          ? "number"
          : "text"
      }
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className={cn(
        editorClass,
        (property.type === "number" || property.type === "integer") &&
          "text-right tabular-nums"
      )}
    />
  )
}
