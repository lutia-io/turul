import { useLayoutEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
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
}

export type TemplateVariableGroup = {
  label?: string
  variables: TemplateVariable[]
}

export type TemplateValueOption = {
  value: string
  label: string
}

const CHOOSE_VALUE = "__choose_value__"

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
  const visibleGroups = groups.filter((group) => group.variables.length > 0)
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
    const next = insertTemplateToken(
      value,
      variable.token,
      start,
      end,
      variable.caretOffset
    )
    pendingCaret.current = next.caret
    selectionRef.current = { start: next.caret, end: next.caret }
    onChange(next.value)
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
                  className="h-8 shrink-0 rounded-none px-2 font-mono text-[11px] text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                />
              }
            >
              {"{{ }}"}
              <span className="sr-only">
                {hasPresets
                  ? "Set value from a variable"
                  : "Insert variable at cursor"}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-auto max-w-80 min-w-56"
            >
              <div className="px-1.5 py-1">
                <p className="text-xs font-medium">
                  {hasPresets ? "Use a variable" : "Insert at cursor"}
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {hasPresets
                    ? "Replaces the selected value with a template from the triggering record."
                    : `Adds {{ }} next to any text already in the field.`}
                </p>
              </div>
              {visibleGroups.map((group, index) => (
                <DropdownMenuGroup key={group.label ?? `group-${index}`}>
                  <DropdownMenuSeparator />
                  {group.label ? (
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  ) : null}
                  {group.variables.map((variable) => (
                    <DropdownMenuItem
                      key={`${group.label ?? index}-${variable.label}`}
                      onClick={() => insert(variable)}
                      className="items-baseline gap-3"
                    >
                      <span className="min-w-0 truncate">{variable.label}</span>
                      <DropdownMenuShortcut
                        title={variable.token}
                        className="max-w-[11rem] truncate font-mono text-[10px] tracking-normal"
                      >
                        {variable.token}
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
    </div>
  )
}
