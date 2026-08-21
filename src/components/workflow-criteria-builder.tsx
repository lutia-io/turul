import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import {
  compareOperators,
  emptyGroup,
  emptyLeaf,
  logicLabels,
  operatorLabels,
  type CompareOperator,
  type CriteriaGroupDraft,
  type CriteriaLeafDraft,
  type CriteriaLogic,
  type CriteriaNodeDraft,
} from "@/lib/workflow-definition"

const CUSTOM_FIELD = "__custom"

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
  leaf,
  field,
  onChange,
}: {
  leaf: CriteriaLeafDraft
  field?: JsonSchemaProperty
  onChange: (value: string) => void
}) {
  if (leaf.operator !== "in" && field?.type === "boolean") {
    return (
      <NativeSelect
        value={leaf.value || "false"}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="true">true</NativeSelectOption>
        <NativeSelectOption value="false">false</NativeSelectOption>
      </NativeSelect>
    )
  }

  if (
    leaf.operator !== "in" &&
    field?.enumValues &&
    field.enumValues.length > 0
  ) {
    return (
      <NativeSelect
        value={leaf.value}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="">Choose a value</NativeSelectOption>
        {field.enumValues.map((value) => (
          <NativeSelectOption key={value} value={value}>
            {value}
          </NativeSelectOption>
        ))}
      </NativeSelect>
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

function LeafEditor({
  leaf,
  fields,
  canRemove,
  onChange,
  onRemove,
}: {
  leaf: CriteriaLeafDraft
  fields: JsonSchemaProperty[]
  canRemove: boolean
  onChange: (patch: Partial<CriteriaLeafDraft>) => void
  onRemove: () => void
}) {
  const knownNames = new Set(fields.map((field) => field.name))
  const isCustom =
    leaf.customField || (leaf.field !== "" && !knownNames.has(leaf.field))
  const selectedField = isCustom ? CUSTOM_FIELD : leaf.field
  const field = fields.find((item) => item.name === leaf.field)

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">If</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2Icon />
          <span className="sr-only">Remove condition</span>
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Field>
          <FieldLabel>Field</FieldLabel>
          {fields.length > 0 ? (
            <NativeSelect
              value={selectedField}
              onChange={(event) => {
                const next = event.target.value
                if (next === CUSTOM_FIELD) {
                  onChange({
                    customField: true,
                    field: leaf.customField ? leaf.field : "",
                  })
                  return
                }
                onChange({ customField: false, field: next, value: "" })
              }}
            >
              <NativeSelectOption value="">Choose a field</NativeSelectOption>
              {fields.map((item) => (
                <NativeSelectOption key={item.name} value={item.name}>
                  {item.name}
                </NativeSelectOption>
              ))}
              <NativeSelectOption value={CUSTOM_FIELD}>
                Custom field…
              </NativeSelectOption>
            </NativeSelect>
          ) : (
            <Input
              value={leaf.field}
              onChange={(event) =>
                onChange({ field: event.target.value, customField: true })
              }
              placeholder="age"
              className="font-mono"
            />
          )}
        </Field>
        <Field>
          <FieldLabel>Operator</FieldLabel>
          <NativeSelect
            value={leaf.operator}
            onChange={(event) =>
              onChange({ operator: event.target.value as CompareOperator })
            }
          >
            {compareOperators.map((operator) => (
              <NativeSelectOption key={operator} value={operator}>
                {operatorLabels[operator]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel>{leaf.operator === "in" ? "Values" : "Value"}</FieldLabel>
          <ConditionValueInput
            leaf={leaf}
            field={field}
            onChange={(value) => onChange({ value })}
          />
        </Field>
      </div>
      {isCustom && fields.length > 0 ? (
        <Field>
          <FieldLabel>Custom field name</FieldLabel>
          <Input
            value={leaf.field}
            onChange={(event) =>
              onChange({ field: event.target.value, customField: true })
            }
            placeholder="address.city"
            className="font-mono"
          />
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
  function patchNode(
    key: string,
    updater: (current: CriteriaNodeDraft) => CriteriaNodeDraft
  ) {
    onChange(updateNode(group, key, updater) as CriteriaGroupDraft)
  }

  return (
    <div
      className={
        depth === 0
          ? "flex flex-col gap-3"
          : "flex flex-col gap-3 rounded-xl border border-dashed bg-muted/20 p-3"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <NativeSelect
          value={group.logic}
          className="w-auto max-w-full"
          onChange={(event) =>
            onChange({ ...group, logic: event.target.value as CriteriaLogic })
          }
        >
          {(Object.keys(logicLabels) as CriteriaLogic[]).map((logic) => (
            <NativeSelectOption key={logic} value={logic}>
              {logicLabels[logic]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {canRemove && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
          >
            <Trash2Icon />
            <span className="sr-only">Remove group</span>
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {group.conditions.map((child) =>
          child.kind === "leaf" ? (
            <LeafEditor
              key={child.key}
              leaf={child}
              fields={fields}
              canRemove={group.conditions.length > 1}
              onChange={(patch) =>
                patchNode(child.key, (current) =>
                  current.kind === "leaf" ? { ...current, ...patch } : current
                )
              }
              onRemove={() => onChange(removeFromGroup(group, child.key))}
            />
          ) : (
            <GroupEditor
              key={child.key}
              group={child}
              fields={fields}
              depth={depth + 1}
              canRemove={group.conditions.length > 1}
              onChange={(next) => patchNode(child.key, () => next)}
              onRemove={() => onChange(removeFromGroup(group, child.key))}
            />
          )
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(addToGroup(group, group.key, emptyLeaf()))}
        >
          <PlusIcon />
          Add condition
        </Button>
        {depth < 2 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
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
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-medium">When</h3>
        <p className="text-xs text-muted-foreground">
          This workflow runs when a new record on the selected schema matches
          these conditions.
        </p>
      </div>
      <GroupEditor
        group={value}
        fields={fields}
        depth={0}
        canRemove={false}
        onChange={onChange}
      />
    </div>
  )
}
