import type { JsonObject } from "@/lib/json-definition"
import type { WorkflowDefinitionBody } from "@/lib/workflow-definition"
import { setNumberFilterParam, setStringFilterParam } from "@/lib/list-query"
import { api, type ApiUserRef } from "@/store/api"

export type ApiWorkflowDefinition = {
  id: string
  name: string
  slug: string
  description: string
  active: boolean
  internal: boolean
  definition: WorkflowDefinitionBody
  schemaId?: string
  networkId: string
  organizationId?: string | null
  userId: string
  createdBy: ApiUserRef
  updatedBy: ApiUserRef
  createdAt: string
  updatedAt: string
}

export type CreateWorkflowDefinitionRequest = {
  name: string
  description: string
  active: boolean
  definition: WorkflowDefinitionBody
  schemaId?: string
  networkId: string
  organizationId?: string
}

export type CreateWorkflowDefinitionResponse = {
  id: string
}

export type UpdateWorkflowDefinitionRequest = {
  id: string
  name: string
  description: string
  active: boolean
  definition: WorkflowDefinitionBody
  schemaId?: string
}

export type UpdateWorkflowDefinitionResponse = {
  id: string
}

export type StringFilterOp = "contains" | "eq" | "startsWith" | "empty"
export type NumberFilterOp = "eq" | "gte" | "lte" | "empty"
export type WorkflowDefinitionListSort =
  | "name"
  | "slug"
  | "status"
  | "schema"
  | "network"
  | "scope"
  | "actions"
  | "stages"
  | "createdAt"
  | "updatedAt"

export type ListWorkflowDefinitionsParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: WorkflowDefinitionListSort
  order?: "asc" | "desc"
  networkId?: string
  organizationId?: string
  scope?: "network" | "organization"
  active?: boolean
  name?: string
  nameOp?: StringFilterOp
  slug?: string
  slugOp?: StringFilterOp
  schema?: string
  schemaOp?: StringFilterOp
  schemaId?: string
  field?: string
  internal?: boolean
  network?: string
  networkOp?: StringFilterOp
  actions?: number
  actionsOp?: NumberFilterOp
  stages?: number
  stagesOp?: NumberFilterOp
}

export type ApiWorkflowDefinitionList = {
  items: ApiWorkflowDefinition[]
  total: number
  page: number
  pageSize: number
}

function listWorkflowDefinitionQueryParams(
  params?: ListWorkflowDefinitionsParams
) {
  if (!params) {
    return undefined
  }

  const query: Record<string, string | number> = {}
  if (params.page != null) {
    query.page = params.page
  }
  if (params.pageSize != null) {
    query.pageSize = params.pageSize
  }
  if (params.q) {
    query.q = params.q
  }
  if (params.sort) {
    query.sort = params.sort
  }
  if (params.order) {
    query.order = params.order
  }
  if (params.networkId) {
    query.networkId = params.networkId
  }
  if (params.organizationId) {
    query.organizationId = params.organizationId
  }
  if (params.scope) {
    query.scope = params.scope
  }
  if (params.active != null) {
    query.active = String(params.active)
  }
  setStringFilterParam(query, "name", params.name, params.nameOp)
  setStringFilterParam(query, "slug", params.slug, params.slugOp)
  setStringFilterParam(query, "schema", params.schema, params.schemaOp)
  if (params.schemaId) {
    query.schemaId = params.schemaId
  }
  if (params.field) {
    query.field = params.field
  }
  if (params.internal != null) {
    query.internal = String(params.internal)
  }
  setStringFilterParam(query, "network", params.network, params.networkOp)
  setNumberFilterParam(query, "actions", params.actions, params.actionsOp)
  setNumberFilterParam(query, "stages", params.stages, params.stagesOp)

  return query
}

export type ApiWorkflowStatus = "pending" | "running" | "completed" | "failed"

export type ApiSnapshotNode = {
  type: string
  definition: JsonObject
}

export type ApiWorkflowRunDefinition = {
  trigger: WorkflowDefinitionBody["trigger"]
  criteria: WorkflowDefinitionBody["criteria"]
  nodes: ApiSnapshotNode[][]
}

export type ApiWorkflow = {
  id: string
  workflowDefinitionId: string
  networkId: string
  recordId?: string
  data?: JsonObject
  input: JsonObject
  organizationId: string
  organizationUserId: string
  definition: ApiWorkflowRunDefinition
  status: ApiWorkflowStatus
  currentLevel: number
  attempts: number
  maxAttempts: number
  error?: string
  createdAt: string
  completedAt?: string | null
}

export type WorkflowListSort =
  | "name"
  | "status"
  | "network"
  | "organization"
  | "currentLevel"
  | "currentAction"
  | "createdAt"
  | "completedAt"
  | "duration"

export type ListWorkflowsParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: WorkflowListSort
  order?: "asc" | "desc"
  networkId?: string
  organizationId?: string
  name?: string
  nameOp?: StringFilterOp
  status?: ApiWorkflowStatus
  network?: string
  networkOp?: StringFilterOp
  organization?: string
  organizationOp?: StringFilterOp
}

export type ApiWorkflowList = {
  items: ApiWorkflow[]
  total: number
  page: number
  pageSize: number
}

function listWorkflowQueryParams(params?: ListWorkflowsParams) {
  if (!params) {
    return undefined
  }

  const query: Record<string, string | number> = {}
  if (params.page != null) {
    query.page = params.page
  }
  if (params.pageSize != null) {
    query.pageSize = params.pageSize
  }
  if (params.q) {
    query.q = params.q
  }
  if (params.sort) {
    query.sort = params.sort
  }
  if (params.order) {
    query.order = params.order
  }
  if (params.networkId) {
    query.networkId = params.networkId
  }
  if (params.organizationId) {
    query.organizationId = params.organizationId
  }
  setStringFilterParam(query, "name", params.name, params.nameOp)
  if (params.status) {
    query.status = params.status
  }
  setStringFilterParam(query, "network", params.network, params.networkOp)
  setStringFilterParam(
    query,
    "organization",
    params.organization,
    params.organizationOp
  )

  return query
}

export type ApiWorkflowNodeStatus = "completed" | "failed"

export type ApiNodeFileRef = {
  fileId: string
  filename?: string
  contentType?: string
  sizeBytes?: number
}

export type ApiNodePayload = {
  files?: ApiNodeFileRef[]
}

export type ApiWorkflowNode = {
  id: string
  workflowId: string
  levelIndex: number
  nodeIndex: number
  attempt: number
  nodeType: string
  status: ApiWorkflowNodeStatus | string
  input?: JsonObject
  output?: JsonObject
  payload?: ApiNodePayload
  error?: string
  startedAt: string
  completedAt: string
}

export type CreateWorkflowRequest = {
  workflowDefinitionId: string
  input: JsonObject
  dedupeKey?: string
}

const workflowApi = api.injectEndpoints({
  endpoints: (build) => ({
    listWorkflowDefinitions: build.query<
      ApiWorkflowDefinitionList,
      ListWorkflowDefinitionsParams | void
    >({
      query: (params) => ({
        url: "/workflow-definition",
        params: listWorkflowDefinitionQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "WorkflowDefinition" as const,
                id,
              })),
              { type: "WorkflowDefinition", id: "LIST" },
            ]
          : [{ type: "WorkflowDefinition", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const workflow of data.items) {
            dispatch(
              workflowApi.util.upsertQueryData(
                "getWorkflowDefinition",
                workflow.id,
                workflow
              )
            )
          }
        } catch {
          // List failed; getWorkflowDefinition cache stays unchanged.
        }
      },
    }),
    getWorkflowDefinition: build.query<ApiWorkflowDefinition, string>({
      query: (id) => `/workflow-definition/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "WorkflowDefinition", id },
      ],
    }),
    createWorkflowDefinition: build.mutation<
      CreateWorkflowDefinitionResponse,
      CreateWorkflowDefinitionRequest
    >({
      query: (body) => ({
        url: "/workflow-definition",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : [{ type: "WorkflowDefinition", id: "LIST" }],
    }),
    updateWorkflowDefinition: build.mutation<
      UpdateWorkflowDefinitionResponse,
      UpdateWorkflowDefinitionRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/workflow-definition/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, error, { id }) =>
        error
          ? []
          : [
              { type: "WorkflowDefinition", id },
              { type: "WorkflowDefinition", id: "LIST" },
            ],
    }),
    listWorkflows: build.query<ApiWorkflowList, ListWorkflowsParams | void>({
      query: (params) => ({
        url: "/workflow",
        params: listWorkflowQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Workflow" as const,
                id,
              })),
              { type: "Workflow", id: "LIST" },
            ]
          : [{ type: "Workflow", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const workflow of data.items) {
            dispatch(
              workflowApi.util.upsertQueryData(
                "getWorkflow",
                workflow.id,
                workflow
              )
            )
          }
        } catch {
          // List failed; getWorkflow cache stays unchanged.
        }
      },
    }),
    getWorkflow: build.query<ApiWorkflow, string>({
      query: (id) => `/workflow/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Workflow", id }],
    }),
    createWorkflow: build.mutation<{ id: string }, CreateWorkflowRequest>({
      query: (body) => ({
        url: "/workflow",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : [{ type: "Workflow", id: "LIST" }],
    }),
    retryWorkflow: build.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/workflow/${id}/retry`,
        method: "POST",
      }),
      invalidatesTags: (_result, error, id) =>
        error
          ? []
          : [
              { type: "Workflow", id },
              { type: "Workflow", id: "LIST" },
              { type: "WorkflowNode", id: `LIST-${id}` },
            ],
    }),
    listWorkflowNodes: build.query<ApiWorkflowNode[], string>({
      query: (workflowId) => `/workflow/${workflowId}/node`,
      providesTags: (result, _error, workflowId) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "WorkflowNode" as const,
                id,
              })),
              { type: "WorkflowNode", id: `LIST-${workflowId}` },
            ]
          : [{ type: "WorkflowNode", id: `LIST-${workflowId}` }],
      async onQueryStarted(_workflowId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const node of data) {
            dispatch(
              workflowApi.util.upsertQueryData(
                "getWorkflowNode",
                node.id,
                node
              )
            )
          }
        } catch {
          // List failed; getWorkflowNode cache stays unchanged.
        }
      },
    }),
    getWorkflowNode: build.query<ApiWorkflowNode, string>({
      query: (id) => `/workflow-node/${id}`,
      providesTags: (_result, _error, id) => [{ type: "WorkflowNode", id }],
    }),
  }),
})

export const {
  useListWorkflowDefinitionsQuery,
  useGetWorkflowDefinitionQuery,
  useCreateWorkflowDefinitionMutation,
  useUpdateWorkflowDefinitionMutation,
  useListWorkflowsQuery,
  useGetWorkflowQuery,
  useCreateWorkflowMutation,
  useRetryWorkflowMutation,
  useListWorkflowNodesQuery,
  useGetWorkflowNodeQuery,
} = workflowApi

export function workflowDefinitionAsJson(
  definition: WorkflowDefinitionBody
): JsonObject {
  return definition as unknown as JsonObject
}
