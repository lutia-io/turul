import type { JsonObject } from "@/lib/json-definition"
import type { WorkflowDefinitionBody } from "@/lib/workflow-definition"
import { api } from "@/store/api"

export type ApiWorkflowDefinition = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  definition: WorkflowDefinitionBody
  schemaId: string
  networkId: string
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type CreateWorkflowDefinitionRequest = {
  name: string
  active: boolean
  definition: WorkflowDefinitionBody
  schemaId: string
  networkId: string
}

export type CreateWorkflowDefinitionResponse = {
  id: string
}

export type UpdateWorkflowDefinitionRequest = {
  id: string
  name: string
  active: boolean
  definition: WorkflowDefinitionBody
  schemaId: string
}

export type UpdateWorkflowDefinitionResponse = {
  id: string
}

export type StringFilterOp = "contains" | "eq" | "startsWith"
export type NumberFilterOp = "eq" | "gte" | "lte"
export type WorkflowDefinitionListSort =
  | "name"
  | "slug"
  | "status"
  | "schema"
  | "network"
  | "actions"
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
  active?: boolean
  name?: string
  nameOp?: StringFilterOp
  slug?: string
  slugOp?: StringFilterOp
  schema?: string
  schemaOp?: StringFilterOp
  network?: string
  networkOp?: StringFilterOp
  actions?: number
  actionsOp?: NumberFilterOp
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
  if (params.active != null) {
    query.active = String(params.active)
  }
  if (params.name) {
    query.name = params.name
    if (params.nameOp) {
      query.nameOp = params.nameOp
    }
  }
  if (params.slug) {
    query.slug = params.slug
    if (params.slugOp) {
      query.slugOp = params.slugOp
    }
  }
  if (params.schema) {
    query.schema = params.schema
    if (params.schemaOp) {
      query.schemaOp = params.schemaOp
    }
  }
  if (params.network) {
    query.network = params.network
    if (params.networkOp) {
      query.networkOp = params.networkOp
    }
  }
  if (params.actions != null) {
    query.actions = params.actions
    if (params.actionsOp) {
      query.actionsOp = params.actionsOp
    }
  }

  return query
}

export type ApiWorkflowStatus = "pending" | "running" | "completed" | "failed"

export type ApiWorkflow = {
  id: string
  workflowDefinitionId: string
  networkId: string
  recordId: string
  data: JsonObject
  organizationId: string
  organizationUserId: string
  definition: WorkflowDefinitionBody
  status: ApiWorkflowStatus
  currentAction: number
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
  if (params.name) {
    query.name = params.name
    if (params.nameOp) {
      query.nameOp = params.nameOp
    }
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.network) {
    query.network = params.network
    if (params.networkOp) {
      query.networkOp = params.networkOp
    }
  }
  if (params.organization) {
    query.organization = params.organization
    if (params.organizationOp) {
      query.organizationOp = params.organizationOp
    }
  }

  return query
}

export type ApiWorkflowActionStatus = "completed" | "failed"

export type ApiWorkflowAction = {
  id: string
  workflowId: string
  actionIndex: number
  attempt: number
  actionType: string
  status: ApiWorkflowActionStatus
  input?: JsonObject
  output?: JsonObject
  error?: string
  startedAt: string
  completedAt: string
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
              api.util.upsertQueryData(
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
      invalidatesTags: [{ type: "WorkflowDefinition", id: "LIST" }],
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
      invalidatesTags: (_result, _error, { id }) => [
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
              api.util.upsertQueryData("getWorkflow", workflow.id, workflow)
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
    listWorkflowActions: build.query<ApiWorkflowAction[], string>({
      query: (workflowId) => `/workflow/${workflowId}/action`,
      providesTags: (result, _error, workflowId) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "WorkflowAction" as const,
                id,
              })),
              { type: "WorkflowAction", id: `LIST-${workflowId}` },
            ]
          : [{ type: "WorkflowAction", id: `LIST-${workflowId}` }],
      async onQueryStarted(_workflowId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const action of data) {
            dispatch(
              api.util.upsertQueryData("getWorkflowAction", action.id, action)
            )
          }
        } catch {
          // List failed; getWorkflowAction cache stays unchanged.
        }
      },
    }),
    getWorkflowAction: build.query<ApiWorkflowAction, string>({
      query: (id) => `/workflow-action/${id}`,
      providesTags: (_result, _error, id) => [{ type: "WorkflowAction", id }],
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
  useListWorkflowActionsQuery,
  useGetWorkflowActionQuery,
} = workflowApi

export function workflowDefinitionAsJson(
  definition: WorkflowDefinitionBody
): JsonObject {
  return definition as unknown as JsonObject
}
