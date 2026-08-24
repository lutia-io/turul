import type { JsonObject } from "@/lib/json-definition"
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
  }),
})

export const {
  useListPipelineDefinitionsQuery,
  useGetPipelineDefinitionQuery,
} = pipelineApi
