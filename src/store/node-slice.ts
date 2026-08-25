import type { JsonObject } from "@/lib/json-definition"
import { setStringFilterParam } from "@/lib/list-query"
import { api } from "@/store/api"

export type ApiNodeDefinition = {
  id: string
  name: string
  slug: string
  active: boolean
  internal: boolean
  type: string
  definition: JsonObject
  networkId: string
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type CreateNodeDefinitionRequest = {
  name: string
  active: boolean
  type: string
  definition: JsonObject
  networkId: string
}

export type UpdateNodeDefinitionRequest = {
  id: string
  name: string
  active: boolean
  type: string
  definition: JsonObject
}

export type StringFilterOp = "contains" | "eq" | "startsWith" | "empty"

export type NodeDefinitionListSort =
  | "name"
  | "slug"
  | "status"
  | "type"
  | "network"
  | "createdAt"
  | "updatedAt"

export type ListNodeDefinitionsParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: NodeDefinitionListSort
  order?: "asc" | "desc"
  networkId?: string
  active?: boolean
  name?: string
  nameOp?: StringFilterOp
  slug?: string
  slugOp?: StringFilterOp
  type?: string
  typeOp?: StringFilterOp
  network?: string
  networkOp?: StringFilterOp
}

export type ApiNodeDefinitionList = {
  items: ApiNodeDefinition[]
  total: number
  page: number
  pageSize: number
}

function listNodeDefinitionQueryParams(params?: ListNodeDefinitionsParams) {
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
  setStringFilterParam(query, "type", params.type, params.typeOp)
  setStringFilterParam(query, "network", params.network, params.networkOp)

  return query
}

const nodeApi = api.injectEndpoints({
  endpoints: (build) => ({
    listNodeDefinitions: build.query<
      ApiNodeDefinitionList,
      ListNodeDefinitionsParams | void
    >({
      query: (params) => ({
        url: "/node-definition",
        params: listNodeDefinitionQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "NodeDefinition" as const,
                id,
              })),
              { type: "NodeDefinition", id: "LIST" },
            ]
          : [{ type: "NodeDefinition", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const node of data.items) {
            dispatch(
              api.util.upsertQueryData("getNodeDefinition", node.id, node)
            )
          }
        } catch {
          // List failed; getNodeDefinition cache stays unchanged.
        }
      },
    }),
    getNodeDefinition: build.query<ApiNodeDefinition, string>({
      query: (id) => `/node-definition/${id}`,
      providesTags: (_result, _error, id) => [{ type: "NodeDefinition", id }],
    }),
    createNodeDefinition: build.mutation<
      { id: string },
      CreateNodeDefinitionRequest
    >({
      query: (body) => ({
        url: "/node-definition",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "NodeDefinition", id: "LIST" }],
    }),
    updateNodeDefinition: build.mutation<
      { id: string },
      UpdateNodeDefinitionRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/node-definition/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "NodeDefinition", id },
        { type: "NodeDefinition", id: "LIST" },
      ],
    }),
  }),
})

export const {
  useListNodeDefinitionsQuery,
  useGetNodeDefinitionQuery,
  useCreateNodeDefinitionMutation,
  useUpdateNodeDefinitionMutation,
} = nodeApi
