import type { JsonObject } from "@/lib/json-definition"
import type { PipelineDefinitionBody } from "@/lib/pipeline-definition"
import { setNumberFilterParam, setStringFilterParam } from "@/lib/list-query"
import { api } from "@/store/api"

export type ApiPipelineDefinition = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  definition: JsonObject
  networkId: string
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type CreatePipelineDefinitionRequest = {
  name: string
  active: boolean
  definition: PipelineDefinitionBody
  networkId: string
}

export type UpdatePipelineDefinitionRequest = {
  id: string
  name: string
  active: boolean
  definition: PipelineDefinitionBody
}

export type StringFilterOp = "contains" | "eq" | "startsWith" | "empty"
export type NumberFilterOp = "eq" | "gte" | "lte" | "empty"
export type PipelineDefinitionListSort =
  | "name"
  | "slug"
  | "status"
  | "network"
  | "source"
  | "stages"
  | "createdAt"
  | "updatedAt"

export type ListPipelineDefinitionsParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: PipelineDefinitionListSort
  order?: "asc" | "desc"
  networkId?: string
  active?: boolean
  name?: string
  nameOp?: StringFilterOp
  slug?: string
  slugOp?: StringFilterOp
  network?: string
  networkOp?: StringFilterOp
  source?: string
  sourceOp?: StringFilterOp
  stages?: number
  stagesOp?: NumberFilterOp
}

export type ApiPipelineDefinitionList = {
  items: ApiPipelineDefinition[]
  total: number
  page: number
  pageSize: number
}

function listPipelineDefinitionQueryParams(
  params?: ListPipelineDefinitionsParams
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
  if (params.active != null) {
    query.active = String(params.active)
  }
  setStringFilterParam(query, "name", params.name, params.nameOp)
  setStringFilterParam(query, "slug", params.slug, params.slugOp)
  setStringFilterParam(query, "network", params.network, params.networkOp)
  setStringFilterParam(query, "source", params.source, params.sourceOp)
  setNumberFilterParam(query, "stages", params.stages, params.stagesOp)

  return query
}

export type ApiPipelineStatus = "pending" | "running" | "completed" | "failed"

export type ApiSnapshotNode = {
  id: string
  name: string
  slug: string
  type: string
  definition: JsonObject
}

export type ApiPipelineSnapshot = {
  nodes: ApiSnapshotNode[][]
}

export type ApiPipeline = {
  id: string
  pipelineDefinitionId: string
  networkId: string
  input: JsonObject
  organizationId: string
  organizationUserId: string
  definition: ApiPipelineSnapshot
  status: ApiPipelineStatus
  currentLevel: number
  attempts: number
  maxAttempts: number
  error?: string
  createdAt: string
  completedAt?: string | null
}

export type PipelineListSort =
  | "name"
  | "status"
  | "network"
  | "organization"
  | "currentLevel"
  | "createdAt"
  | "completedAt"
  | "duration"

export type ListPipelinesParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: PipelineListSort
  order?: "asc" | "desc"
  networkId?: string
  organizationId?: string
  name?: string
  nameOp?: StringFilterOp
  status?: ApiPipelineStatus
  network?: string
  networkOp?: StringFilterOp
  organization?: string
  organizationOp?: StringFilterOp
}

export type ApiPipelineList = {
  items: ApiPipeline[]
  total: number
  page: number
  pageSize: number
}

function listPipelineQueryParams(params?: ListPipelinesParams) {
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

export type ApiPipelineNodeStatus = "completed" | "failed"

export type ApiPipelineNode = {
  id: string
  pipelineId: string
  levelIndex: number
  nodeIndex: number
  attempt: number
  nodeDefinitionId: string
  nodeSlug: string
  nodeType: string
  status: ApiPipelineNodeStatus | string
  input?: JsonObject
  output?: JsonObject
  error?: string
  startedAt: string
  completedAt: string
}

export type CreatePipelineRequest = {
  pipelineDefinitionId: string
  input: JsonObject
  dedupeKey?: string
}

const pipelineApi = api.injectEndpoints({
  endpoints: (build) => ({
    listPipelineDefinitions: build.query<
      ApiPipelineDefinitionList,
      ListPipelineDefinitionsParams | void
    >({
      query: (params) => ({
        url: "/pipeline-definition",
        params: listPipelineDefinitionQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "PipelineDefinition" as const,
                id,
              })),
              { type: "PipelineDefinition", id: "LIST" },
            ]
          : [{ type: "PipelineDefinition", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const pipeline of data.items) {
            dispatch(
              api.util.upsertQueryData(
                "getPipelineDefinition",
                pipeline.id,
                pipeline
              )
            )
          }
        } catch {
          // List failed; getPipelineDefinition cache stays unchanged.
        }
      },
    }),
    getPipelineDefinition: build.query<ApiPipelineDefinition, string>({
      query: (id) => `/pipeline-definition/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "PipelineDefinition", id },
      ],
    }),
    createPipelineDefinition: build.mutation<
      { id: string },
      CreatePipelineDefinitionRequest
    >({
      query: (body) => ({
        url: "/pipeline-definition",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : [{ type: "PipelineDefinition", id: "LIST" }],
    }),
    updatePipelineDefinition: build.mutation<
      { id: string },
      UpdatePipelineDefinitionRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/pipeline-definition/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, error, { id }) =>
        error
          ? []
          : [
              { type: "PipelineDefinition", id },
              { type: "PipelineDefinition", id: "LIST" },
            ],
    }),
    listPipelines: build.query<ApiPipelineList, ListPipelinesParams | void>({
      query: (params) => ({
        url: "/pipeline",
        params: listPipelineQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Pipeline" as const,
                id,
              })),
              { type: "Pipeline", id: "LIST" },
            ]
          : [{ type: "Pipeline", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const pipeline of data.items) {
            dispatch(
              api.util.upsertQueryData("getPipeline", pipeline.id, pipeline)
            )
          }
        } catch {
          // List failed; getPipeline cache stays unchanged.
        }
      },
    }),
    getPipeline: build.query<ApiPipeline, string>({
      query: (id) => `/pipeline/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Pipeline", id }],
    }),
    createPipeline: build.mutation<{ id: string }, CreatePipelineRequest>({
      query: (body) => ({
        url: "/pipeline",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : [{ type: "Pipeline", id: "LIST" }],
    }),
    listPipelineNodes: build.query<ApiPipelineNode[], string>({
      query: (pipelineId) => `/pipeline/${pipelineId}/node`,
      providesTags: (result, _error, pipelineId) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PipelineNode" as const,
                id,
              })),
              { type: "PipelineNode", id: `LIST-${pipelineId}` },
            ]
          : [{ type: "PipelineNode", id: `LIST-${pipelineId}` }],
      async onQueryStarted(_pipelineId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const node of data) {
            dispatch(api.util.upsertQueryData("getPipelineNode", node.id, node))
          }
        } catch {
          // List failed; getPipelineNode cache stays unchanged.
        }
      },
    }),
    getPipelineNode: build.query<ApiPipelineNode, string>({
      query: (id) => `/pipeline-node/${id}`,
      providesTags: (_result, _error, id) => [{ type: "PipelineNode", id }],
    }),
  }),
})

export const {
  useListPipelineDefinitionsQuery,
  useGetPipelineDefinitionQuery,
  useCreatePipelineDefinitionMutation,
  useUpdatePipelineDefinitionMutation,
  useListPipelinesQuery,
  useGetPipelineQuery,
  useCreatePipelineMutation,
  useListPipelineNodesQuery,
  useGetPipelineNodeQuery,
} = pipelineApi
