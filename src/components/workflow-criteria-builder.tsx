import { type ReactNode } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleHelpIcon,
  CopyPlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import { cn } from "@/lib/utils"
import {
  compareOperators,
  emptyGroup,
  emptyLeaf,
  logicLabels,
  newDraftKey,
  operatorLabels,
  type CompareOperator,
  type CriteriaGroupDraft,
  type CriteriaLeafDraft,
  type CriteriaLogic,
  type CriteriaNodeDraft,
} from "@/lib/workflow-definition"

const CUSTOM_FIELD = "__custom"
const CHOOSE_FIELD = "__choose_field__"
const CHOOSE_VALUE = "__choose_value__"

const fieldTypeLabels: Record<string, string> = {
  string: "Text",
  number: "Number",
  integer: "Integer",
  boolean: "Yes / No",
  array: "List",
  object: "Object",
}

function fieldOptionLabel(field: JsonSchemaProperty) {
  const type = fieldTypeLabels[field.type] ?? field.type
  return `${field.name} · ${type}`
}

function countLeaves(node: CriteriaNodeDraft): number {
  if (node.kind === "leaf") {
    return 1
  }
  return node.conditions.reduce((total, child) => total + countLeaves(child), 0)
}

function leafSummary(leaf: CriteriaLeafDraft) {
  if (!leaf.field.trim()) {
    return "Choose a field"
  }
  const operator = operatorLabels[leaf.operator]
  if (!leaf.value.trim()) {
    return `${leaf.field} ${operator} …`
  }
  return `${leaf.field} ${operator} ${leaf.value}`
}

function updateNode(
  node: CriteriaNodeDraft,
  key: string,
  patch: (current: CriteriaNodeDraft) => CriteriaNodeDraft
): CriteriaNodeDraft {
  if (node.key === key) {
    return patch(node)
  }
  if (node.kind !== "group") {
    return node
  }
  return {
    ...node,
    conditions: node.conditions.map((child) => updateNode(child, key, patch)),
  }
}

function removeFromGroup(
  group: CriteriaGroupDraft,
  key: string
): CriteriaGroupDraft {
  return {
    ...group,
    conditions: group.conditions
      .filter((child) => child.key !== key)
      .map((child) =>
        child.kind === "group" ? removeFromGroup(child, key) : child
      ),
  }
}

function addToGroup(
  group: CriteriaGroupDraft,
  key: string,
  child: CriteriaNodeDraft
): CriteriaGroupDraft {
  if (group.key === key) {
    return { ...group, conditions: [...group.conditions, child] }
  }
  return {
    ...group,
    conditions: group.conditions.map((node) =>
      node.kind === "group" ? addToGroup(node, key, child) : node
    ),
  }
}

function ConditionValueInput({
  id,
  leaf,
  field,
  onChange,
}: {
  id?: string
  leaf: CriteriaLeafDraft
  field?: JsonSchemaProperty
  onChange: (value: string) => void
}) {
  if (leaf.operator !== "in" && field?.type === "boolean") {
    return (
      <Select
        value={leaf.value || "false"}
        modal={false}
        items={[
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        onValueChange={(value) => {
          if (value) {
            onChange(value)
          }
        }}
      >
        <SelectTrigger id={id} aria-label="Condition value">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (
    leaf.operator !== "in" &&
    field?.enumValues &&
    field.enumValues.length > 0
  ) {
    return (
      <Select
        value={leaf.value || CHOOSE_VALUE}
        modal={false}
        items={[
          { value: CHOOSE_VALUE, label: "Choose a value" },
          ...field.enumValues.map((value) => ({ value, label: value })),
        ]}
        onValueChange={(value) => {
          if (!value || value === CHOOSE_VALUE) {
            onChange("")
            return
          }
          onChange(value)
        }}
      >
        <SelectTrigger id={id} aria-label="Condition value">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CHOOSE_VALUE}>Choose a value</SelectItem>
          {field.enumValues.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const numeric =
    field?.type === "integer" ||
    field?.type === "number" ||
    leaf.operator === "gt" ||
    leaf.operator === "gte" ||
    leaf.operator === "lt" ||
    leaf.operator === "lte"

  return (
    <Input
      id={id}
      value={leaf.value}
      onChange={(event) => onChange(event.target.value)}
      type={numeric && leaf.operator !== "in" ? "number" : "text"}
      placeholder={
        leaf.operator === "in"
          ? "draft, published"
          : field?.type === "number" || field?.type === "integer"
            ? "0"
            : "Value"
      }
    />
  )
}

function IconTooltipButton({
  label,
  disabled,
  onClick,
  destructive,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  destructive?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={onClick}
            className={cn(
              "text-muted-foreground",
              destructive && "hover:bg-destructive/10 hover:text-destructive"
            )}
          />
        }
      >
        {children}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function LeafEditor({
  leaf,
  fields,
  index,
  total,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  leaf: CriteriaLeafDraft
  fields: JsonSchemaProperty[]
  index: number
  total: number
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (patch: Partial<CriteriaLeafDraft>) => void
  onMove: (offset: number) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const knownNames = new Set(fields.map((field) => field.name))
  const isCustom =
    leaf.customField || (leaf.field !== "" && !knownNames.has(leaf.field))
  const selectedField = isCustom ? CUSTOM_FIELD : leaf.field || CHOOSE_FIELD
  const field = fields.find((item) => item.name === leaf.field)
  const fieldId = `${leaf.key}-field`
  const operatorId = `${leaf.key}-operator`
  const valueId = `${leaf.key}-value`
  const customId = `${leaf.key}-custom`

  return (
    <div className="rounded-xl border bg-background p-3 shadow-xs">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            Condition {index + 1}
            <span className="font-normal text-muted-foreground">
              {" "}
              of {total}
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {leafSummary(leaf)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconTooltipButton
            label="Move up"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon />
          </IconTooltipButton>
          <IconTooltipButton
            label="Move down"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon />
          </IconTooltipButton>
          <IconTooltipButton label="Duplicate condition" onClick={onDuplicate}>
            <CopyPlusIcon />
          </IconTooltipButton>
          <IconTooltipButton
            label="Remove condition"
            destructive
            onClick={onRemove}
          >
            <Trash2Icon />
          </IconTooltipButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
        <Field className="gap-1">
          <FieldLabel htmlFor={fieldId}>Field</FieldLabel>
          {fields.length > 0 ? (
            <Select
              value={selectedField}
              modal={false}
              items={[
                { value: CHOOSE_FIELD, label: "Choose a field" },
                ...fields.map((item) => ({
                  value: item.name,
                  label: fieldOptionLabel(item),
                })),
                { value: CUSTOM_FIELD, label: "Custom field…" },
              ]}
              onValueChange={(value) => {
                if (!value || value === CHOOSE_FIELD) {
                  onChange({ customField: false, field: "", value: "" })
                  return
                }
                if (value === CUSTOM_FIELD) {
                  onChange({
                    customField: true,
                    field: leaf.customField ? leaf.field : "",
                  })
                  return
                }
                onChange({ customField: false, field: value, value: "" })
              }}
            >
              <SelectTrigger id={fieldId} aria-label="Condition field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CHOOSE_FIELD}>Choose a field</SelectItem>
                {fields.map((item) => (
                  <SelectItem key={item.name} value={item.name}>
                    {fieldOptionLabel(item)}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_FIELD}>Custom field…</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={fieldId}
              value={leaf.field}
              onChange={(event) =>
                onChange({ field: event.target.value, customField: true })
              }
              placeholder="age"
              className="font-mono"
            />
          )}
        </Field>
        <Field className="gap-1">
          <FieldLabel htmlFor={operatorId}>Comparison</FieldLabel>
          <Select
            value={leaf.operator}
            modal={false}
            items={compareOperators.map((operator) => ({
              value: operator,
              label: operatorLabels[operator],
            }))}
            onValueChange={(value) => {
              if (value) {
                onChange({ operator: value as CompareOperator })
              }
            }}
          >
            <SelectTrigger id={operatorId} aria-label="Condition operator">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {compareOperators.map((operator) => (
                <SelectItem key={operator} value={operator}>
                  {operatorLabels[operator]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="gap-1">
          <FieldLabel htmlFor={valueId}>
            {leaf.operator === "in" ? "Values" : "Value"}
          </FieldLabel>
          <ConditionValueInput
            id={valueId}
            leaf={leaf}
            field={field}
            onChange={(value) => onChange({ value })}
          />
          {leaf.operator === "in" ? (
            <FieldDescription className="text-xs">
              Separate allowed values with commas.
            </FieldDescription>
          ) : null}
        </Field>
      </div>
      {isCustom && fields.length > 0 ? (
        <Field className="mt-3 gap-1">
          <FieldLabel htmlFor={customId}>Custom field name</FieldLabel>
          <Input
            id={customId}
            value={leaf.field}
            onChange={(event) =>
              onChange({ field: event.target.value, customField: true })
            }
            placeholder="address.city"
            className="font-mono"
          />
          <FieldDescription className="text-xs">
            Use a nested path if the field is not on this schema.
          </FieldDescription>
        </Field>
      ) : null}
    </div>
  )
}

function GroupEditor({
  group,
  fields,
  depth,
  canRemove,
  onChange,
  onRemove,
}: {
  group: CriteriaGroupDraft
  fields: JsonSchemaProperty[]
  depth: number
  canRemove: boolean
  onChange: (next: CriteriaGroupDraft) => void
  onRemove?: () => void
}) {
  const logicId = `${group.key}-logic`
  const childCount = group.conditions.length

  function patchNode(
    key: string,
    updater: (current: CriteriaNodeDraft) => CriteriaNodeDraft
  ) {
    onChange(updateNode(group, key, updater) as CriteriaGroupDraft)
  }

  function moveChild(index: number, offset: number) {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= group.conditions.length) {
      return
    }
    const next = [...group.conditions]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    onChange({ ...group, conditions: next })
  }

  function duplicateChild(index: number) {
    const source = group.conditions[index]
    if (!source || source.kind !== "leaf") {
      return
    }
    const copy: CriteriaLeafDraft = {
      ...source,
      key: newDraftKey("condition"),
    }
    const next = [...group.conditions]
    next.splice(index + 1, 0, copy)
    onChange({ ...group, conditions: next })
  }

  function addCondition() {
    onChange(addToGroup(group, group.key, emptyLeaf()))
  }

  return (
    <div
      className={
        depth === 0
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 rounded-xl border border-dashed bg-muted/20 p-3"
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Field className="w-full max-w-xs gap-1">
          <FieldLabel htmlFor={logicId}>Match if</FieldLabel>
          <Select
            value={group.logic}
            modal={false}
            items={(Object.keys(logicLabels) as CriteriaLogic[]).map(
              (logic) => ({
                value: logic,
                label: logicLabels[logic],
              })
            )}
            onValueChange={(value) => {
              if (value) {
                onChange({ ...group, logic: value as CriteriaLogic })
              }
            }}
          >
            <SelectTrigger id={logicId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(logicLabels) as CriteriaLogic[]).map((logic) => (
                <SelectItem key={logic} value={logic}>
                  {logicLabels[logic]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {canRemove && onRemove ? (
          <IconTooltipButton
            label="Remove group"
            destructive
            onClick={onRemove}
          >
            <Trash2Icon />
          </IconTooltipButton>
        ) : null}
      </div>
      {childCount === 0 ? (
        <button
          type="button"
          onClick={addCondition}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-full border border-dashed">
            <PlusIcon className="size-4" />
          </span>
          <span className="font-medium text-foreground">
            Add your first condition
          </span>
          <span>
            Choose a field from the record, how to compare it, and the value it
            should match.
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {group.conditions.map((child, index) =>
            child.kind === "leaf" ? (
              <LeafEditor
                key={child.key}
                leaf={child}
                fields={fields}
                index={
                  group.conditions
                    .slice(0, index)
                    .filter((item) => item.kind === "leaf").length
                }
                total={
                  group.conditions.filter((item) => item.kind === "leaf").length
                }
                canMoveUp={index > 0}
                canMoveDown={index < childCount - 1}
                onChange={(patch) =>
                  patchNode(child.key, (current) =>
                    current.kind === "leaf" ? { ...current, ...patch } : current
                  )
                }
                onMove={(offset) => moveChild(index, offset)}
                onDuplicate={() => duplicateChild(index)}
                onRemove={() => onChange(removeFromGroup(group, child.key))}
              />
            ) : (
              <GroupEditor
                key={child.key}
                group={child}
                fields={fields}
                depth={depth + 1}
                canRemove
                onChange={(next) => patchNode(child.key, () => next)}
                onRemove={() => onChange(removeFromGroup(group, child.key))}
              />
            )
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addCondition}
              className="flex min-w-40 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground"
            >
              <PlusIcon className="size-3.5" />
              Add condition
            </button>
            {depth < 2 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto rounded-xl px-3 py-3"
                onClick={() =>
                  onChange(addToGroup(group, group.key, emptyGroup("AND")))
                }
              >
                <PlusIcon />
                Add group
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export function WorkflowCriteriaBuilder({
  value,
  fields,
  onChange,
}: {
  value: CriteriaGroupDraft
  fields: JsonSchemaProperty[]
  onChange: (next: CriteriaGroupDraft) => void
}) {
  const count = countLeaves(value)

  return (
    <TooltipProvider delay={400}>
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium">When</h3>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                    />
                  }
                >
                  <CircleHelpIcon className="size-3.5" />
                  <span className="sr-only">About conditions</span>
                </TooltipTrigger>
                <TooltipContent>
                  The workflow runs when a new record matches these conditions.
                  Groups let you combine all, any, or none of the nested checks.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">
              {count === 0
                ? "Add the conditions that decide when this workflow runs."
                : `${count} ${count === 1 ? "condition" : "conditions"} · ${logicLabels[value.logic]}`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(addToGroup(value, value.key, emptyLeaf()))}
          >
            <PlusIcon />
            Add condition
          </Button>
        </div>
        <GroupEditor
          group={value}
          fields={fields}
          depth={0}
          canRemove={false}
          onChange={onChange}
        />
      </div>
    </TooltipProvider>
  )
}
