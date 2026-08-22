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
    listWorkflowDefinitions: build.query<ApiWorkflowDefinition[], void>({
      query: () => "/workflow-definition",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "WorkflowDefinition" as const,
                id,
              })),
              { type: "WorkflowDefinition", id: "LIST" },
            ]
          : [{ type: "WorkflowDefinition", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const workflow of data) {
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
    listWorkflows: build.query<ApiWorkflow[], void>({
      query: () => "/workflow",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Workflow" as const, id })),
              { type: "Workflow", id: "LIST" },
            ]
          : [{ type: "Workflow", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const workflow of data) {
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
