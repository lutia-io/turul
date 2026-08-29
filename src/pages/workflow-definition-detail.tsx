import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  FileJsonIcon,
  FilterIcon,
  GalleryVerticalEndIcon,
  PencilIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import {
  AsideRow,
  CopyIdButton,
  DefinitionAsideCard,
  DefinitionCard,
  DefinitionColumns,
  DefinitionPage,
  DefinitionSkeleton,
  DefinitionStatusPage,
  PublicationPills,
} from "@/components/definition-detail"
import { JsonDefinitionCard } from "@/components/json-definition-card"
import { RunStatusPill } from "@/components/run-card"
import { propertyLabel } from "@/components/schema-records-table"
import { Button } from "@/components/ui/button"
import type { PipelineDefinition, Schema } from "@/data/networks"
import {
  useNetworkWorkspace,
  useWorkspacePipelines,
  useWorkspaceSchemas,
  useWorkspaceWorkflowRuns,
  workspaceWorkflowFromApi,
} from "@/lib/network-workspace"
import { apiWorkflowStatus, formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import {
  actionTypeDescriptions,
  actionTypeLabels,
  criteriaSummary,
  logicLabels,
  operatorLabels,
  parseWorkflowDefinition,
  type CompareOperator,
  type CriteriaLogic,
  type WorkflowAction,
  type WorkflowCriteria,
} from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetWorkflowDefinitionQuery } from "@/store/workflow-slice"

type DefinitionView = "rule" | "json"

const logicExplanations: Record<CriteriaLogic, string> = {
  AND: "Every condition in this group must be true.",
  OR: "At least one condition in this group must be true.",
  NOT: "None of the conditions in this group may be true.",
}

const logicTone: Record<
  CriteriaLogic,
  { badge: string; text: string; accent: string }
> = {
  AND: {
    badge: "bg-sky-500/10 text-sky-800 dark:text-sky-300",
    text: "text-sky-700 dark:text-sky-300",
    accent: "border-l-sky-500",
  },
  OR: {
    badge: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    text: "text-amber-700 dark:text-amber-300",
    accent: "border-l-amber-500",
  },
  NOT: {
    badge: "bg-rose-500/10 text-rose-800 dark:text-rose-300",
    text: "text-rose-700 dark:text-rose-300",
    accent: "border-l-rose-500",
  },
}

export default function WorkflowDefinitionDetail() {
  const { workflowDefinitionId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const {
    network: workspaceNetwork,
    organizationId,
    href,
  } = useNetworkWorkspace()
  const { schemas } = useWorkspaceSchemas()
  const { pipelines } = useWorkspacePipelines()
  const { runs } = useWorkspaceWorkflowRuns()
  const { openEditWorkflow } = useCreateEntity()
  const [definitionView, setDefinitionView] = useState<DefinitionView>("rule")
  const workflowQuery = useGetWorkflowDefinitionQuery(
    workflowDefinitionId ?? "",
    { skip: !isAuthenticated || !workflowDefinitionId }
  )
  const workflowDefinition = workflowQuery.data
    ? workspaceWorkflowFromApi(workflowQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || workflowDefinition?.networkId === workspaceNetwork.id
  const visibleWorkflow = belongsToWorkspace ? workflowDefinition : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const schema = visibleWorkflow
    ? schemas.find((item) => item.id === visibleWorkflow.schemaId)
    : undefined
  const parsed = visibleWorkflow
    ? parseWorkflowDefinition(visibleWorkflow.definition)
    : undefined
  const actions = parsed?.actions ?? []
  const rootLogic = parsed?.criteria?.logic as CriteriaLogic | undefined
  const conditionCount = countCriteriaLeaves(parsed?.criteria)
  const relatedRuns = visibleWorkflow
    ? runs
        .filter(
          (run) =>
            run.workflowDefinitionId === visibleWorkflow.id &&
            (!organizationId || run.organizationId === organizationId)
        )
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 5)
    : []
  const createdAt = workflowQuery.data?.createdAt
  const updatedAt = workflowQuery.data?.updatedAt

  if (workflowQuery.isLoading) {
    return <DefinitionSkeleton />
  }

  if (workflowQuery.isError) {
    return (
      <DefinitionStatusPage
        title="Workflow definition not found"
        message={getHumaErrorMessage(
          workflowQuery.error,
          "This workflow definition does not exist or is no longer available."
        )}
        destructive
      />
    )
  }

  if (!visibleWorkflow || !network) {
    return (
      <DefinitionStatusPage
        title="Workflow definition not found"
        message="This workflow definition does not exist or is no longer available."
      />
    )
  }

  return (
    <DefinitionPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <Link
            to={href("workflow-definitions")}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Workflow definition
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-pretty">
              {visibleWorkflow.name}
            </h1>
            <PublicationPills
              active={visibleWorkflow.active}
              internal={visibleWorkflow.internal}
            />
          </div>
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
            {criteriaSummary(parsed?.criteria)}
            {actions.length > 0
              ? ` Then ${actions.length} ${actions.length === 1 ? "action" : "actions"} run in order.`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={definitionView === "json" ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              setDefinitionView((view) => (view === "rule" ? "json" : "rule"))
            }
          >
            <FileJsonIcon />
            {definitionView === "json" ? "Rule" : "JSON"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={visibleWorkflow.internal}
            onClick={() => openEditWorkflow(visibleWorkflow.id)}
          >
            <PencilIcon />
            Edit
          </Button>
        </div>
      </div>

      <DefinitionColumns
        aside={
          <>
            <DefinitionAsideCard
              title="Details"
              footer={
                <Link
                  to={href("workflow-definitions")}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all workflow definitions
                </Link>
              }
            >
              <dl className="mt-4 space-y-4">
                <AsideRow label="Slug">
                  <span className="font-mono text-xs font-normal">
                    {visibleWorkflow.slug}
                  </span>
                </AsideRow>
                <AsideRow label="Schema">
                  {schema ? (
                    <Link
                      to={href(`schemas/${schema.id}`)}
                      className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                    >
                      <FileJsonIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{schema.name}</span>
                    </Link>
                  ) : (
                    <span className="font-mono text-xs font-normal">
                      {visibleWorkflow.schemaId}
                    </span>
                  )}
                </AsideRow>
                <AsideRow label="Match">
                  {rootLogic ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-xs">{rootLogic}</span>
                      <span>{logicLabels[rootLogic]}</span>
                    </span>
                  ) : conditionCount > 0 ? (
                    "Single condition"
                  ) : (
                    "None"
                  )}
                </AsideRow>
                <AsideRow label="Criteria">
                  <span className="tabular-nums">
                    {conditionCount}{" "}
                    {conditionCount === 1 ? "condition" : "conditions"}
                  </span>
                </AsideRow>
                <AsideRow label="Actions">
                  <span className="tabular-nums">
                    {actions.length}{" "}
                    {actions.length === 1 ? "action" : "actions"}
                  </span>
                </AsideRow>
                <AsideRow label="Network">
                  <Link
                    to={href()}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <GalleryVerticalEndIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{network.name}</span>
                  </Link>
                </AsideRow>
                {createdAt ? (
                  <AsideRow label="Created">
                    {formatRelativeTime(createdAt)}
                  </AsideRow>
                ) : null}
                {updatedAt && updatedAt !== createdAt ? (
                  <AsideRow label="Updated">
                    {formatRelativeTime(updatedAt)}
                  </AsideRow>
                ) : null}
                <AsideRow label="ID">
                  <CopyIdButton value={visibleWorkflow.id} />
                </AsideRow>
              </dl>
            </DefinitionAsideCard>

            <DefinitionAsideCard
              title="Recent runs"
              footer={
                <Link
                  to={href("workflows")}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all workflow runs
                </Link>
              }
            >
              {relatedRuns.length > 0 ? (
                <div className="mt-3 flex flex-col gap-1">
                  {relatedRuns.map((run) => (
                    <Link
                      key={run.id}
                      to={href(`workflows/${run.id}`)}
                      className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <WorkflowIcon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <RunStatusPill
                            status={apiWorkflowStatus(run.status)}
                          />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {formatRelativeTime(run.createdAt)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No runs for this workflow yet.
                </p>
              )}
            </DefinitionAsideCard>
          </>
        }
      >
        {definitionView === "json" ? (
          <JsonDefinitionCard
            definition={visibleWorkflow.definition}
            label="JSONB definition"
            description="Criteria and actions stored on this workflow."
          />
        ) : (
          <>
            <DefinitionCard>
              <SectionHeading
                icon={FilterIcon}
                title="Criteria"
                description={
                  schema
                    ? `This workflow runs when a new ${schema.name} record matches the rule below.`
                    : "This workflow runs when the triggering record matches the rule below."
                }
              />
              <div className="mt-6">
                <CriteriaView criteria={parsed?.criteria} />
              </div>
            </DefinitionCard>

            <DefinitionCard>
              <SectionHeading
                icon={ZapIcon}
                title="Actions"
                description="These steps run in order after the criteria match."
              />
              {actions.length > 0 ? (
                <ol className="mt-6">
                  {actions.map((action, index) => (
                    <ActionCard
                      key={`${action.type}-${index}`}
                      action={action}
                      index={index}
                      last={index === actions.length - 1}
                      schemas={schemas}
                      pipelines={pipelines}
                      href={href}
                    />
                  ))}
                </ol>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">
                  This workflow does not declare any actions.
                </p>
              )}
            </DefinitionCard>
          </>
        )}
      </DefinitionColumns>
    </DefinitionPage>
  )
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FilterIcon
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function CriteriaView({ criteria }: { criteria?: WorkflowCriteria }) {
  if (!criteria || !hasCriteria(criteria)) {
    return (
      <p className="text-sm text-muted-foreground">
        This workflow does not declare any conditions.
      </p>
    )
  }

  if (criteria.logic) {
    return <CriteriaGroup criteria={criteria} depth={0} />
  }

  return <CriteriaLeaf criteria={criteria} />
}

function CriteriaGroup({
  criteria,
  depth,
}: {
  criteria: WorkflowCriteria
  depth: number
}) {
  const logic = (criteria.logic ?? "AND") as CriteriaLogic
  const conditions = Array.isArray(criteria.conditions)
    ? criteria.conditions
    : []
  const tone = logicTone[logic]

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-l-4 bg-muted/20",
        tone.accent,
        depth > 0 && "border-dashed bg-background"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold tracking-wider",
                tone.badge
              )}
            >
              {logic}
            </span>
            <p className="text-sm font-medium">{logicLabels[logic] ?? logic}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {logicExplanations[logic]}
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {conditions.length} {conditions.length === 1 ? "item" : "items"} in
          this group
        </p>
      </div>
      <div className="flex flex-col p-3">
        {conditions.length > 0 ? (
          conditions.map((condition, index) => (
            <div key={index}>
              {index > 0 ? <LogicJoiner logic={logic} /> : null}
              {condition.logic ? (
                <CriteriaGroup criteria={condition} depth={depth + 1} />
              ) : (
                <CriteriaLeaf criteria={condition} />
              )}
            </div>
          ))
        ) : (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No conditions in this group.
          </p>
        )}
      </div>
    </div>
  )
}

function LogicJoiner({ logic }: { logic: CriteriaLogic }) {
  return (
    <div className="flex items-center gap-3 py-2" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span
        className={cn(
          "font-mono text-[11px] font-semibold tracking-[0.18em]",
          logicTone[logic].text
        )}
      >
        {logic}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function CriteriaLeaf({ criteria }: { criteria: WorkflowCriteria }) {
  if (!criteria.field || !criteria.operator) {
    return (
      <div className="rounded-xl border bg-background px-4 py-3 text-sm text-muted-foreground">
        Incomplete condition.
      </div>
    )
  }

  const operator =
    operatorLabels[criteria.operator as CompareOperator] ?? criteria.operator

  return (
    <div className="rounded-xl border bg-background p-4 shadow-xs">
      <div className="grid gap-4 sm:grid-cols-3">
        <CriterionPart label="Field">
          <p className="text-sm font-medium">{propertyLabel(criteria.field)}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {criteria.field}
          </p>
        </CriterionPart>
        <CriterionPart label="Comparison">
          <p className="text-sm">{operator}</p>
        </CriterionPart>
        <CriterionPart label="Value">
          <p className="text-sm font-medium">
            {stringifyCriteriaValue(criteria.value)}
          </p>
        </CriterionPart>
      </div>
    </div>
  )
}

function CriterionPart({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function ActionCard({
  action,
  index,
  last,
  schemas,
  pipelines,
  href,
}: {
  action: WorkflowAction
  index: number
  last: boolean
  schemas: Schema[]
  pipelines: PipelineDefinition[]
  href: (rest?: string) => string
}) {
  const label = actionTypeLabels[action.type] ?? action.type
  const description = actionTypeDescriptions[action.type]
  const schemaId =
    typeof action.context.schemaId === "string"
      ? action.context.schemaId
      : undefined
  const recordId =
    typeof action.context.recordId === "string"
      ? action.context.recordId
      : undefined
  const pipelineRef =
    typeof action.context.pipeline === "string"
      ? action.context.pipeline
      : undefined
  const schema = schemaId
    ? schemas.find((item) => item.id === schemaId)
    : undefined
  const pipeline = pipelineRef
    ? pipelines.find(
        (item) => item.id === pipelineRef || item.slug === pipelineRef
      )
    : undefined
  const data = actionDataEntries(action)
  const hasMeta = Boolean(schemaId || recordId || pipelineRef || data.length)

  return (
    <li className="relative flex gap-3.5">
      {last ? null : (
        <span className="absolute top-8 bottom-0 left-[15px] w-px bg-border" />
      )}
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-medium">
        {index + 1}
      </span>
      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        <div className="rounded-xl border bg-background p-4 shadow-xs">
          <p className="text-sm font-medium">{label}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
          {hasMeta ? (
            <dl className="mt-4 space-y-3">
              {schemaId ? (
                <ActionMeta label="Schema">
                  {schema ? (
                    <Link
                      to={href(`schemas/${schema.id}`)}
                      className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                    >
                      <FileJsonIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{schema.name}</span>
                    </Link>
                  ) : (
                    <span className="font-mono text-xs font-normal">
                      {schemaId}
                    </span>
                  )}
                </ActionMeta>
              ) : null}
              {recordId ? (
                <ActionMeta label="Record">
                  <span className="font-mono text-xs font-normal">
                    {recordId}
                  </span>
                </ActionMeta>
              ) : null}
              {pipelineRef ? (
                <ActionMeta label="Pipeline">
                  {pipeline ? (
                    <Link
                      to={href(`pipeline-definitions/${pipeline.id}`)}
                      className="hover:underline"
                    >
                      {pipeline.name}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs font-normal">
                      {pipelineRef}
                    </span>
                  )}
                </ActionMeta>
              ) : null}
              {data.length > 0 ? (
                <ActionMeta
                  label={
                    action.type === "TRIGGER_PIPELINE" ? "Input" : "Fields"
                  }
                >
                  <ul className="space-y-1.5">
                    {data.map(([name, value]) => (
                      <li
                        key={name}
                        className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-baseline gap-3"
                      >
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {name}
                        </span>
                        <span className="truncate text-sm">
                          {stringifyCriteriaValue(value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ActionMeta>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function ActionMeta({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  )
}

function hasCriteria(criteria?: WorkflowCriteria) {
  if (!criteria) {
    return false
  }
  if (criteria.logic) {
    return true
  }
  return Boolean(criteria.field && criteria.operator)
}

function countCriteriaLeaves(criteria?: WorkflowCriteria): number {
  if (!criteria) {
    return 0
  }
  if (criteria.logic) {
    return (criteria.conditions ?? []).reduce(
      (total, child) => total + countCriteriaLeaves(child),
      0
    )
  }
  return criteria.field ? 1 : 0
}

function actionDataEntries(action: WorkflowAction): [string, unknown][] {
  const source =
    action.type === "TRIGGER_PIPELINE"
      ? action.context.input
      : action.context.data
  if (source && typeof source === "object" && !Array.isArray(source)) {
    return Object.entries(source as Record<string, unknown>)
  }
  return []
}

function stringifyCriteriaValue(value: unknown) {
  if (value == null) {
    return "empty"
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ")
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  return String(value)
}
