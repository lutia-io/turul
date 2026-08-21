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
  }),
})

export const {
  useListWorkflowDefinitionsQuery,
  useGetWorkflowDefinitionQuery,
  useCreateWorkflowDefinitionMutation,
} = workflowApi

export function workflowDefinitionAsJson(
  definition: WorkflowDefinitionBody
): JsonObject {
  return definition as unknown as JsonObject
}
