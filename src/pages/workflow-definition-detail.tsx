import {
  useId,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import {
  ClockIcon,
  TableIcon,
  FilterIcon,
  GalleryVerticalEndIcon,
  Building2Icon,
  Loader,
  PlayIcon,
  PencilIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react"

import { EnabledField } from "@/components/checkbox-field"
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
import { PipelineFlowCanvas } from "@/components/pipeline-flow"
import {
  WorkflowViewMenu,
  type WorkflowDefinitionView,
} from "@/components/pipeline-view-menu"
import { WorkflowDefinitionPreview } from "@/components/workflow-definition-preview"
import { RunStatusPill } from "@/components/run-card"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  WorkflowCriteriaView,
  WorkflowNodesView,
  WorkflowSectionHeading,
  WorkflowTriggerBadges,
  workflowTriggerIconTone,
} from "@/components/workflow-rule"
import { WorkflowRuleEditor } from "@/components/workflow-rule-editor"
import type { Schema, WorkflowDefinition } from "@/data/networks"
import {
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
  workspaceWorkflowFromApi,
} from "@/lib/network-workspace"
import { apiWorkflowStatus, formatRelativeTime } from "@/lib/runs"
import {
  countCriteriaLeaves,
  criteriaFromApi,
  criteriaSummary,
  criteriaToApi,
  hasCriteria,
  logicLabels,
  parseWorkflowDefinition,
  schemaFieldOptions,
  triggerFromApi,
  triggerSummary,
  triggerToApi,
  workflowDraftSentence,
  workflowNodeCount,
  workflowNodesFromApi,
  workflowNodesToApi,
  workflowRuleSentence,
  type CriteriaGroupDraft,
  type CriteriaLogic,
  type TriggerDraft,
  type WorkflowDefinitionBody,
} from "@/lib/workflow-definition"
import {
  emptyPipelineLevels,
  type PipelineLevelDraft,
} from "@/lib/pipeline-definition"
import { getHumaErrorMessage, getHumaLoadErrorCopy } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useGetWorkflowDefinitionQuery,
  useCreateWorkflowMutation,
  useListWorkflowsQuery,
  useUpdateWorkflowDefinitionMutation,
} from "@/store/workflow-slice"

type DefinitionView = WorkflowDefinitionView

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
  const { organizations } = useWorkspaceOrganizations()
  const { openEditWorkflow } = useCreateEntity()
  const navigate = useNavigate()
  const [definitionView, setDefinitionView] = useState<DefinitionView>("rule")
  const [createWorkflow, createWorkflowState] = useCreateWorkflowMutation()
  const workflowQuery = useGetWorkflowDefinitionQuery(
    workflowDefinitionId ?? "",
    { skip: !isAuthenticated || !workflowDefinitionId }
  )
  const workflowDefinition = workflowQuery.data
    ? workspaceWorkflowFromApi(workflowQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork ||
    (workflowDefinition?.networkId === workspaceNetwork.id &&
      (!organizationId ||
        !workflowDefinition.organizationId ||
        workflowDefinition.organizationId === organizationId))
  const visibleWorkflow = belongsToWorkspace ? workflowDefinition : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const organization = visibleWorkflow?.organizationId
    ? organizations.find((item) => item.id === visibleWorkflow.organizationId)
    : undefined
  const schema = visibleWorkflow
    ? schemas.find((item) => item.id === visibleWorkflow.schemaId)
    : undefined
  const fields = schemaFieldOptions(schema?.definition)
  const parsed = visibleWorkflow
    ? parseWorkflowDefinition(visibleWorkflow.definition)
    : undefined
  const nodeCount = parsed ? workflowNodeCount(parsed) : 0
  const rootLogic = parsed?.criteria?.logic as CriteriaLogic | undefined
  const conditionCount = countCriteriaLeaves(parsed?.criteria)
  const viewLevels = useMemo(
    () => (parsed ? workflowNodesFromApi(parsed.nodes) : []),
    [parsed]
  )
  const canvasSentence = workflowRuleSentence(
    parsed?.trigger,
    parsed?.criteria,
    nodeCount,
    fields
  )
  const canvasPreamble = useMemo(
    () => ({
      when: {
        title: "When",
        subtitle: triggerSummary(parsed?.trigger, fields),
      },
      if: {
        title: "If",
        subtitle: hasCriteria(parsed?.criteria)
          ? criteriaSummary(parsed?.criteria, fields)
          : "Always",
      },
    }),
    [fields, parsed?.criteria, parsed?.trigger]
  )
  const relatedRunsQuery = useListWorkflowsQuery(
    {
      workflowDefinitionId: visibleWorkflow?.id,
      networkId: network?.id,
      organizationId,
      sort: "createdAt",
      order: "desc",
      page: 1,
      pageSize: 5,
    },
    { skip: !isAuthenticated || !visibleWorkflow?.id }
  )
  const relatedRuns = relatedRunsQuery.data?.items ?? []
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
          resource: "Workflow",
          notFoundMessage:
            "This workflow does not exist or is no longer available.",
        })}
      />
    )
  }

  if (!visibleWorkflow || !network) {
    return (
      <DefinitionStatusPage
        title="Workflow not found"
        message="This workflow does not exist or is no longer available."
      />
    )
  }

  const tableHref = schema
    ? `${href("records")}?schema=${encodeURIComponent(schema.id)}`
    : href("records")

  const aside = (
    <>
      <DefinitionAsideCard
        title="Details"
        footer={
          <Link
            to={tableHref}
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View table
          </Link>
        }
      >
        <dl className="mt-4 space-y-4">
          <AsideRow label="Slug">
            <span className="font-mono text-xs font-normal">
              {visibleWorkflow.slug}
            </span>
          </AsideRow>
          <AsideRow label="Table">
            {schema ? (
              <Link
                to={`${href("records")}?schema=${schema.id}`}
                className="inline-flex max-w-full items-center gap-1.5 hover:underline"
              >
                <TableIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{schema.name}</span>
              </Link>
            ) : (
              <span className="font-mono text-xs font-normal">
                {visibleWorkflow.schemaId}
              </span>
            )}
          </AsideRow>
          <AsideRow label="Trigger">
            {triggerSummary(parsed?.trigger, fields)}
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
          <AsideRow label="Nodes">
            <span className="tabular-nums">
              {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
            </span>
          </AsideRow>
          {organization ? (
            <AsideRow label="Organization">
              <Link
                to={href(`organization/${organization.id}`)}
                className="inline-flex max-w-full items-center gap-1.5 hover:underline"
              >
                <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{organization.name}</span>
              </Link>
            </AsideRow>
          ) : null}
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
        href={href}
        onCancel={() => setSearchParams({})}
      />
    )
  }

  return (
    <DefinitionPage fill>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 px-4 pt-5 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1.5">
          <Link
            to={tableHref}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {schema?.name ?? "Records"}
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
            {visibleWorkflow.description || canvasSentence}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              visibleWorkflow.internal ||
              !visibleWorkflow.active ||
              createWorkflowState.isLoading
            }
            onClick={async () => {
              try {
                const { id } = await createWorkflow({
                  workflowDefinitionId: visibleWorkflow.id,
                  input: {},
                }).unwrap()
                navigate(href(`workflows/${id}`))
              } catch {
                // createWorkflowState surfaces errors if needed later
              }
            }}
          >
            <PlayIcon />
            Run
          </Button>
          <WorkflowViewMenu
            value={definitionView}
            onChange={setDefinitionView}
          />
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

      <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-4 sm:px-6 lg:px-8">
        {definitionView === "canvas" ? (
          <PipelineFlowCanvas
            className="h-full min-h-0 flex-1"
            levels={viewLevels}
            sentence={canvasSentence}
            preamble={canvasPreamble}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DefinitionColumns aside={aside}>
              {definitionView === "preview" ? (
                <WorkflowDefinitionPreview
                  trigger={triggerFromApi(parsed?.trigger)}
                  criteria={criteriaFromApi(parsed?.criteria)}
                  levels={viewLevels}
                  fields={fields}
                  schemaName={schema?.name}
                  className="min-h-[28rem]"
                  emptyThenHint="No nodes configured yet"
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
                      description={triggerSummary(parsed?.trigger, fields)}
                      iconClassName={workflowTriggerIconTone(
                        triggerFromApi(parsed?.trigger).kind
                      )}
                      action={
                        <WorkflowTriggerBadges trigger={parsed?.trigger} />
                      }
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
                      iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    />
                    <div className="mt-6">
                      <WorkflowCriteriaView
                        criteria={parsed?.criteria}
                        fields={fields}
                      />
                    </div>
                  </DefinitionCard>

                  <DefinitionCard>
                    <WorkflowSectionHeading
                      icon={ZapIcon}
                      title="Actions"
                      description="These steps run in order after the trigger and conditions match."
                      iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
                    />
                    <WorkflowNodesView definition={parsed} />
                  </DefinitionCard>
                </>
              )}
            </DefinitionColumns>
          </div>
        )}
      </div>
    </DefinitionPage>
  )
}

function WorkflowDefinitionEdit({
  workflow,
  schema,
  href,
  onCancel,
}: {
  workflow: WorkflowDefinition
  schema?: Schema
  href: (rest?: string) => string
  onCancel: () => void
}) {
  const formId = useId()
  const tableHref = schema
    ? `${href("records")}?schema=${encodeURIComponent(schema.id)}`
    : href("records")
  const [updateWorkflow, updateState] = useUpdateWorkflowDefinitionMutation()
  const parsed = parseWorkflowDefinition(workflow.definition)
  const [name, setName] = useState(workflow.name)
  const [description, setDescription] = useState(workflow.description ?? "")
  const [active, setActive] = useState(workflow.active)
  const [trigger, setTrigger] = useState<TriggerDraft>(() =>
    triggerFromApi(parsed?.trigger)
  )
  const [criteria, setCriteria] = useState<CriteriaGroupDraft>(() =>
    criteriaFromApi(parsed?.criteria)
  )
  const [levels, setLevels] = useState<PipelineLevelDraft[]>(() =>
    workflowNodesFromApi(parsed?.nodes).length > 0
      ? workflowNodesFromApi(parsed?.nodes)
      : emptyPipelineLevels()
  )
  const triggerFields = schemaFieldOptions(schema?.definition)
  const isLoading = updateState.isLoading
  const error = updateState.error

  const definition = useMemo<WorkflowDefinitionBody | undefined>(() => {
    const nodes = workflowNodesToApi(levels)
    if (!nodes?.length) {
      return undefined
    }
    return {
      trigger: triggerToApi(trigger),
      criteria: criteriaToApi(criteria, triggerFields) ?? {},
      nodes,
    }
  }, [criteria, levels, trigger, triggerFields])

  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(definition) &&
    (definition?.nodes.length ?? 0) > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || !definition || definition.nodes.length === 0) {
      return
    }
    try {
      await updateWorkflow({
        id: workflow.id,
        name: name.trim(),
        description: description.trim(),
        active,
        definition,
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
          <div className="min-w-0 flex-1 space-y-3">
            <Link
              to={tableHref}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {schema?.name ?? "Records"}
            </Link>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,1fr))_auto]">
              <Field className="gap-1">
                <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
                <Input
                  id={`${formId}-name`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field className="gap-1">
                <FieldLabel htmlFor={`${formId}-description`}>
                  Description
                </FieldLabel>
                <Input
                  id={`${formId}-description`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What this workflow does"
                  disabled={isLoading}
                />
              </Field>
              <EnabledField
                formId={formId}
                checked={active}
                onChange={setActive}
              />
            </div>
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
              {workflowDraftSentence(trigger, criteria, levels, triggerFields)}
            </p>
            {error ? (
              <FieldError>{getHumaErrorMessage(error)}</FieldError>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
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
              disabled={isLoading || !canSubmit}
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

        <DefinitionColumns>
          <WorkflowRuleEditor
            trigger={trigger}
            criteria={criteria}
            levels={levels}
            fields={triggerFields}
            schemaName={schema?.name}
            networkId={workflow.networkId}
            organizationId={workflow.organizationId}
            onTriggerChange={setTrigger}
            onCriteriaChange={setCriteria}
            onLevelsChange={setLevels}
          />
        </DefinitionColumns>
      </form>
    </DefinitionPage>
  )
}
