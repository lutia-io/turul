import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import { Link, useParams, useSearchParams } from "react-router"
import {
  ClockIcon,
  FileJsonIcon,
  FilterIcon,
  GalleryVerticalEndIcon,
  Loader,
  PencilIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react"

import { CheckboxField } from "@/components/checkbox-field"
import { useCreateEntity } from "@/components/create-entity"
import {
  AsideRow,
  AuditStamp,
  CopyIdButton,
  DefinitionAsideCard,
  DefinitionCard,
  DefinitionColumns,
  DefinitionPage,
  DefinitionSkeleton,
  DefinitionStatusPage,
  PublicationPills,
} from "@/components/definition-detail"
import { DefinitionJsonPane } from "@/components/definition-dialog-layout"
import { JsonDefinitionCard } from "@/components/json-definition-card"
import { RunStatusPill } from "@/components/run-card"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  WorkflowActionView,
  WorkflowCriteriaView,
  WorkflowSectionHeading,
} from "@/components/workflow-rule"
import { WorkflowRuleEditor } from "@/components/workflow-rule-editor"
import type { PipelineDefinition, Schema, WorkflowDefinition } from "@/data/networks"
import {
  parseJsonObject,
  stringifyDefinition,
  type JsonObject,
} from "@/lib/json-definition"
import {
  useNetworkWorkspace,
  useWorkspacePipelines,
  useWorkspaceSchemas,
  useWorkspaceWorkflowRuns,
  workspaceWorkflowFromApi,
} from "@/lib/network-workspace"
import { apiWorkflowStatus, formatRelativeTime } from "@/lib/runs"
import {
  actionsFromApi,
  actionsToApi,
  countCriteriaLeaves,
  criteriaFromApi,
  criteriaToApi,
  logicLabels,
  parseWorkflowDefinition,
  schemaFieldOptions,
  triggerFromApi,
  triggerSummary,
  triggerToApi,
  workflowDraftSentence,
  workflowRuleSentence,
  type ActionDraft,
  type CriteriaGroupDraft,
  type CriteriaLogic,
  type TriggerDraft,
  type WorkflowDefinitionBody,
} from "@/lib/workflow-definition"
import { getHumaErrorMessage, getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useGetWorkflowDefinitionQuery,
  useUpdateWorkflowDefinitionMutation,
} from "@/store/workflow-slice"

type DefinitionView = "rule" | "json"

function workflowDefinitionError(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "JSON must be a workflow definition object"
    }
    if (!parseWorkflowDefinition(parsed as JsonObject)) {
      return "JSON must include actions"
    }
    return null
  } catch {
    return "Invalid JSON"
  }
}

export default function WorkflowDefinitionDetail() {
  const { workflowDefinitionId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const createdBy = workflowQuery.data?.createdBy
  const updatedBy = workflowQuery.data?.updatedBy
  const editing =
    searchParams.get("edit") === "1" &&
    Boolean(visibleWorkflow) &&
    !visibleWorkflow?.internal

  if (workflowQuery.isLoading) {
    return <DefinitionSkeleton />
  }

  if (workflowQuery.isError) {
    return (
      <DefinitionStatusPage
        {...getHumaLoadErrorCopy(workflowQuery.error, {
          resource: "Workflow definition",
          notFoundMessage:
            "This workflow definition does not exist or is no longer available.",
        })}
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

  const aside = (
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
          <AsideRow label="Trigger">
            {triggerSummary(parsed?.trigger)}
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
              {actions.length} {actions.length === 1 ? "action" : "actions"}
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
          <AuditStamp label="Created" at={createdAt} user={createdBy} />
          {updatedAt && updatedAt !== createdAt ? (
            <AuditStamp label="Updated" at={updatedAt} user={updatedBy} />
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
                    <RunStatusPill status={apiWorkflowStatus(run.status)} />
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
  )

  if (editing) {
    return (
      <WorkflowDefinitionEdit
        key={visibleWorkflow.id}
        workflow={visibleWorkflow}
        schema={schema}
        schemas={schemas.filter(
          (item) => item.networkId === visibleWorkflow.networkId
        )}
        pipelines={pipelines.filter(
          (item) => item.networkId === visibleWorkflow.networkId
        )}
        href={href}
        aside={aside}
        onCancel={() => setSearchParams({})}
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
            {workflowRuleSentence(
              parsed?.trigger,
              parsed?.criteria,
              actions.length
            )}
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

      <DefinitionColumns aside={aside}>
        {definitionView === "json" ? (
          <JsonDefinitionCard
            definition={visibleWorkflow.definition}
            label="JSONB definition"
            description="Trigger, criteria, and actions stored on this workflow."
          />
        ) : (
          <>
            <DefinitionCard>
              <WorkflowSectionHeading
                icon={
                  parsed?.trigger.on?.includes("schedule")
                    ? ClockIcon
                    : WorkflowIcon
                }
                title="When"
                description={triggerSummary(parsed?.trigger)}
              />
            </DefinitionCard>

            <DefinitionCard>
              <WorkflowSectionHeading
                icon={FilterIcon}
                title="If"
                description={
                  schema
                    ? `These conditions are evaluated against the ${schema.name} record after the trigger fires.`
                    : "These conditions are evaluated against the triggering record after the trigger fires."
                }
              />
              <div className="mt-6">
                <WorkflowCriteriaView criteria={parsed?.criteria} />
              </div>
            </DefinitionCard>

            <DefinitionCard>
              <WorkflowSectionHeading
                icon={ZapIcon}
                title="Then"
                description="These steps run in order after the trigger and conditions match."
              />
              {actions.length > 0 ? (
                <ol className="mt-6">
                  {actions.map((action, index) => (
                    <WorkflowActionView
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

function WorkflowDefinitionEdit({
  workflow,
  schema,
  schemas,
  pipelines,
  href,
  aside,
  onCancel,
}: {
  workflow: WorkflowDefinition
  schema?: Schema
  schemas: Schema[]
  pipelines: PipelineDefinition[]
  href: (rest?: string) => string
  aside: ReactNode
  onCancel: () => void
}) {
  const formId = useId()
  const [updateWorkflow, updateState] = useUpdateWorkflowDefinitionMutation()
  const parsed = parseWorkflowDefinition(workflow.definition)
  const [definitionView, setDefinitionView] = useState<DefinitionView>("rule")
  const [name, setName] = useState(workflow.name)
  const [active, setActive] = useState(workflow.active)
  const [trigger, setTrigger] = useState<TriggerDraft>(() =>
    triggerFromApi(parsed?.trigger)
  )
  const [criteria, setCriteria] = useState<CriteriaGroupDraft>(() =>
    criteriaFromApi(parsed?.criteria)
  )
  const [actions, setActions] = useState<ActionDraft[]>(() =>
    actionsFromApi(parsed?.actions)
  )
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const jsonSourceRef = useRef<"builder" | "json">("builder")
  const triggerFields = schemaFieldOptions(schema?.definition)
  const isLoading = updateState.isLoading
  const error = updateState.error

  const definition = useMemo<WorkflowDefinitionBody | undefined>(() => {
    const nextActions = actionsToApi(actions)
    if (nextActions.length === 0) {
      return undefined
    }
    return {
      trigger: triggerToApi(trigger),
      criteria: criteriaToApi(criteria, triggerFields) ?? {},
      actions: nextActions,
    }
  }, [actions, criteria, trigger, triggerFields])

  const generatedJson = stringifyDefinition(
    definition ?? { trigger: triggerToApi(trigger), criteria: {}, actions: [] }
  )

  useEffect(() => {
    if (jsonSourceRef.current === "json") {
      return
    }
    setJsonText(generatedJson)
    setJsonError(null)
  }, [generatedJson])

  function markBuilderSource() {
    jsonSourceRef.current = "builder"
  }

  function applyWorkflowDefinition(body: WorkflowDefinitionBody) {
    jsonSourceRef.current = "json"
    setTrigger(triggerFromApi(body.trigger))
    setCriteria(criteriaFromApi(body.criteria))
    setActions(actionsFromApi(body.actions))
  }

  function handleJsonChange(text: string) {
    jsonSourceRef.current = "json"
    setJsonText(text)
    const parsedJson = parseJsonObject(text)
    if (!parsedJson) {
      setJsonError(workflowDefinitionError(text))
      return
    }
    const body = parseWorkflowDefinition(parsedJson)
    if (!body) {
      setJsonError("JSON must include actions")
      return
    }
    setJsonError(null)
    applyWorkflowDefinition(body)
  }

  function handleJsonBlur() {
    if (!jsonText.trim()) {
      jsonSourceRef.current = "builder"
      setJsonText(generatedJson)
      setJsonError(null)
      return
    }
    const parsedJson = parseJsonObject(jsonText)
    const body = parsedJson ? parseWorkflowDefinition(parsedJson) : undefined
    if (!parsedJson || !body) {
      setJsonError(workflowDefinitionError(jsonText))
      return
    }
    jsonSourceRef.current = "json"
    setJsonError(null)
    applyWorkflowDefinition(body)
    setJsonText(stringifyDefinition(parsedJson))
  }

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(definition) &&
    (definition?.actions.length ?? 0) > 0 &&
    !jsonError

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !definition) {
      return
    }
    const parsedJson = parseJsonObject(jsonText)
    const body = parsedJson ? parseWorkflowDefinition(parsedJson) : definition
    if (!body || body.actions.length === 0) {
      return
    }
    try {
      await updateWorkflow({
        id: workflow.id,
        name: name.trim(),
        active,
        definition: body,
        schemaId: workflow.schemaId,
      }).unwrap()
      onCancel()
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <DefinitionPage>
      <form
        id={formId}
        onSubmit={handleSubmit}
        autoComplete="off"
        className="flex min-w-0 flex-1 flex-col gap-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Link
              to={href("workflow-definitions")}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Workflow definition
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <Field className="min-w-56 max-w-md gap-1">
                <FieldLabel htmlFor={`${formId}-name`} className="sr-only">
                  Name
                </FieldLabel>
                <Input
                  id={`${formId}-name`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10 text-lg font-semibold"
                  required
                  disabled={isLoading}
                />
              </Field>
              <CheckboxField
                id={`${formId}-active`}
                checked={active}
                onChange={setActive}
                label="Enabled"
              />
            </div>
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
              {workflowDraftSentence(trigger, criteria, actions, triggerFields)}
            </p>
            {error ? (
              <FieldError>{getHumaErrorMessage(error)}</FieldError>
            ) : null}
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
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !canSubmit || Boolean(jsonError)}
              aria-busy={isLoading}
              className={isLoading ? "disabled:opacity-100" : undefined}
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" />
                  <span className="sr-only">Saving</span>
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>

        <DefinitionColumns aside={aside}>
          {definitionView === "json" ? (
            <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-2xl bg-card shadow-xs ring-1 ring-foreground/10">
              <DefinitionJsonPane
                id={`${formId}-json`}
                title="JSON definition"
                description="Updates as you edit. Paste a definition to fill the builder."
                value={jsonText}
                onChange={handleJsonChange}
                onBlur={handleJsonBlur}
                error={jsonError}
              />
            </div>
          ) : (
            <WorkflowRuleEditor
              trigger={trigger}
              criteria={criteria}
              actions={actions}
              fields={triggerFields}
              schemas={schemas}
              pipelines={pipelines}
              triggerSchemaId={workflow.schemaId}
              schemaName={schema?.name}
              onTriggerChange={(next) => {
                markBuilderSource()
                setTrigger(next)
              }}
              onCriteriaChange={(next) => {
                markBuilderSource()
                setCriteria(next)
              }}
              onActionsChange={(next) => {
                markBuilderSource()
                setActions(next)
              }}
            />
          )}
        </DefinitionColumns>
      </form>
    </DefinitionPage>
  )
}
