import { useLayoutEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type TemplateVariable = {
  label: string
  token: string
  caretOffset?: number
  hint?: string
}

export type TemplateVariableGroup = {
  label?: string
  description?: string
  submenu?: boolean
  variables: TemplateVariable[]
  groups?: TemplateVariableGroup[]
}

export type TemplateValueOption = {
  value: string
  label: string
}

const CHOOSE_VALUE = "__choose_value__"

function groupIsVisible(group: TemplateVariableGroup): boolean {
  if (group.variables.length > 0) {
    return true
  }
  return (group.groups ?? []).some(groupIsVisible)
}

function unwrapTemplateToken(token: string) {
  const trimmed = token.trim()
  if (!trimmed.startsWith("{{") || !trimmed.endsWith("}}")) {
    return { token, prefixLength: 0 }
  }
  const inner = trimmed.slice(2, -2).trim()
  const prefixLength = token.indexOf(inner)
  return {
    token: inner,
    prefixLength: prefixLength < 0 ? 0 : prefixLength,
  }
}

function isInsideTemplateAction(value: string, start: number, end: number) {
  const before = value.slice(0, start)
  const open = before.lastIndexOf("{{")
  if (open === -1) {
    return false
  }
  if (before.indexOf("}}", open) !== -1) {
    return false
  }
  const after = value.slice(end)
  const close = after.indexOf("}}")
  if (close === -1) {
    return false
  }
  const nestedOpen = after.indexOf("{{")
  return nestedOpen === -1 || nestedOpen > close
}

function insertTemplateToken(
  value: string,
  token: string,
  selectionStart: number,
  selectionEnd: number,
  caretOffset = token.length
) {
  const start = Math.min(Math.max(selectionStart, 0), value.length)
  const end = Math.min(Math.max(selectionEnd, start), value.length)
  const caret = start + Math.min(Math.max(caretOffset, 0), token.length)
  return {
    value: `${value.slice(0, start)}${token}${value.slice(end)}`,
    caret,
  }
}

export function TemplateValueInput({
  id,
  value,
  onChange,
  groups,
  options,
  placeholder,
  disabled,
  multiline,
  required,
  inputClassName,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  groups: TemplateVariableGroup[]
  options?: TemplateValueOption[]
  placeholder?: string
  disabled?: boolean
  multiline?: boolean
  required?: boolean
  inputClassName?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectionRef = useRef({ start: value.length, end: value.length })
  const pendingCaret = useRef<number | null>(null)
  const visibleGroups = groups.filter(groupIsVisible)
  const presetOptions = options ?? []
  const hasPresets = presetOptions.length > 0
  const knownValues = new Set(presetOptions.map((option) => option.value))
  const extraOption =
    value && !knownValues.has(value) ? { value, label: value } : undefined

  useLayoutEffect(() => {
    const caret = pendingCaret.current
    if (caret == null) {
      return
    }
    pendingCaret.current = null
    const input = multiline ? textareaRef.current : inputRef.current
    if (!input) {
      return
    }
    input.focus()
    input.setSelectionRange(caret, caret)
  }, [multiline, value])

  function rememberSelection(input: HTMLInputElement | HTMLTextAreaElement) {
    selectionRef.current = {
      start: input.selectionStart ?? input.value.length,
      end: input.selectionEnd ?? input.value.length,
    }
  }

  function insert(variable: TemplateVariable) {
    if (hasPresets) {
      onChange(variable.token)
      return
    }
    const { start, end } = selectionRef.current
    let token = variable.token
    let caretOffset = variable.caretOffset
    if (isInsideTemplateAction(value, start, end)) {
      const unwrapped = unwrapTemplateToken(token)
      token = unwrapped.token
      if (caretOffset != null) {
        caretOffset = Math.min(
          Math.max(caretOffset - unwrapped.prefixLength, 0),
          token.length
        )
      }
    }
    const next = insertTemplateToken(value, token, start, end, caretOffset)
    pendingCaret.current = next.caret
    selectionRef.current = { start: next.caret, end: next.caret }
    onChange(next.value)
  }

  function renderInsertGroup(
    group: TemplateVariableGroup,
    groupKey: string,
    separated: boolean
  ) {
    const nested = (group.groups ?? []).filter(groupIsVisible)
    const items = (
      <>
        {group.variables.map((variable) => (
          <DropdownMenuItem
            key={`${groupKey}-${variable.label}-${variable.token}`}
            title={variable.token}
            onClick={() => insert(variable)}
            className="px-2.5"
          >
            <span className="min-w-0 flex-1 truncate">{variable.label}</span>
          </DropdownMenuItem>
        ))}
        {nested.map((child, index) =>
          renderInsertGroup(child, child.label ?? `${groupKey}-${index}`, false)
        )}
      </>
    )
    const useSubmenu = Boolean(group.submenu && group.label)

    return (
      <DropdownMenuGroup key={groupKey}>
        {separated ? <DropdownMenuSeparator /> : null}
        {useSubmenu ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="px-2.5">
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {items}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <>
            {group.label ? (
              <DropdownMenuLabel className="px-2.5">
                {group.label}
              </DropdownMenuLabel>
            ) : null}
            {items}
          </>
        )}
      </DropdownMenuGroup>
    )
  }

  return (
    <div
      className={cn(
        "flex min-w-0 overflow-hidden rounded-lg border border-input bg-transparent transition-colors dark:bg-input/30",
        multiline ? "items-start" : "h-8",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        "has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-3 has-[[aria-invalid=true]]:ring-destructive/20",
        "dark:has-[[aria-invalid=true]]:border-destructive/50 dark:has-[[aria-invalid=true]]:ring-destructive/40"
      )}
    >
      {hasPresets ? (
        <Select
          value={value || CHOOSE_VALUE}
          disabled={disabled}
          modal={false}
          items={[
            { value: CHOOSE_VALUE, label: placeholder ?? "Choose a value" },
            ...presetOptions,
            ...(extraOption ? [extraOption] : []),
          ]}
          onValueChange={(next) => {
            if (!next || next === CHOOSE_VALUE) {
              onChange("")
              return
            }
            onChange(next)
          }}
        >
          <SelectTrigger
            id={id}
            className="h-full min-w-0 rounded-none border-0 bg-transparent font-mono text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CHOOSE_VALUE}>
              {placeholder ?? "Choose a value"}
            </SelectItem>
            {presetOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {extraOption ? (
              <SelectItem value={extraOption.value}>
                {extraOption.label}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      ) : multiline ? (
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={cn(
            "min-h-16 min-w-0 flex-1 rounded-none border-0 bg-transparent font-mono text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-xs dark:bg-transparent",
            inputClassName
          )}
          onChange={(event) => {
            rememberSelection(event.currentTarget)
            onChange(event.currentTarget.value)
          }}
          onSelect={(event) => rememberSelection(event.currentTarget)}
          onKeyUp={(event) => rememberSelection(event.currentTarget)}
          onClick={(event) => rememberSelection(event.currentTarget)}
          onBlur={(event) => rememberSelection(event.currentTarget)}
        />
      ) : (
        <Input
          ref={inputRef}
          id={id}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={cn(
            "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent font-mono text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-xs dark:bg-transparent",
            inputClassName
          )}
          onChange={(event) => {
            rememberSelection(event.currentTarget)
            onChange(event.currentTarget.value)
          }}
          onSelect={(event) => rememberSelection(event.currentTarget)}
          onKeyUp={(event) => rememberSelection(event.currentTarget)}
          onClick={(event) => rememberSelection(event.currentTarget)}
          onBlur={(event) => rememberSelection(event.currentTarget)}
        />
      )}
      {visibleGroups.length > 0 ? (
        <>
          <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              disabled={disabled}
              render={
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={hasPresets ? "Choose a value" : "Insert a value"}
                  className="h-8 shrink-0 rounded-none px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                />
              }
            >
              Insert
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {visibleGroups.map((group, index) =>
                renderInsertGroup(
                  group,
                  group.label ?? `group-${index}`,
                  index > 0
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
    </div>
  )
}
