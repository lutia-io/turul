import { setStringFilterParam } from "@/lib/list-query"
import { api, type ApiUserRef } from "@/store/api"

export type ApiNetwork = {
  id: string
  name: string
  slug: string
  userId: string
  createdBy: ApiUserRef
  updatedBy: ApiUserRef
  createdAt: string
  updatedAt: string
}

export type CreateNetworkRequest = {
  name: string
}

export type CreateNetworkResponse = {
  id: string
}

export type UpdateNetworkRequest = {
  id: string
  name: string
}

export type UpdateNetworkResponse = {
  id: string
}

export type StringFilterOp = "contains" | "eq" | "startsWith" | "empty"
export type NetworkListSort = "name" | "slug" | "createdAt" | "updatedAt"

export type ListNetworksParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: NetworkListSort
  order?: "asc" | "desc"
  name?: string
  nameOp?: StringFilterOp
  slug?: string
  slugOp?: StringFilterOp
}

export type ApiNetworkList = {
  items: ApiNetwork[]
  total: number
  page: number
  pageSize: number
}

function listNetworkQueryParams(params?: ListNetworksParams) {
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
  setStringFilterParam(query, "name", params.name, params.nameOp)
  setStringFilterParam(query, "slug", params.slug, params.slugOp)

  return query
}

const networkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listNetworks: build.query<ApiNetworkList, ListNetworksParams | void>({
      query: (params) => ({
        url: "/network",
        params: listNetworkQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Network" as const,
                id,
              })),
              { type: "Network", id: "LIST" },
            ]
          : [{ type: "Network", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const network of data.items) {
            dispatch(
              networkApi.util.upsertQueryData("getNetwork", network.id, network)
            )
          }
        } catch {
          // List failed; getNetwork cache stays unchanged.
        }
      },
    }),
    getNetwork: build.query<ApiNetwork, string>({
      query: (id) => `/network/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Network", id }],
    }),
    createNetwork: build.mutation<CreateNetworkResponse, CreateNetworkRequest>({
      query: (body) => ({
        url: "/network",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : [{ type: "Network", id: "LIST" }],
    }),
    updateNetwork: build.mutation<UpdateNetworkResponse, UpdateNetworkRequest>({
      query: ({ id, ...body }) => ({
        url: `/network/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, error, { id }) =>
        error
          ? []
          : [
              { type: "Network", id },
              { type: "Network", id: "LIST" },
            ],
    }),
    deleteNetwork: build.mutation<void, string>({
      query: (id) => ({
        url: `/network/${id}`,
        method: "DELETE",
        responseHandler: (response) => response.text(),
      }),
      invalidatesTags: (_result, error, id) =>
        error
          ? []
          : [
              { type: "Network", id },
              { type: "Network", id: "LIST" },
              { type: "Organization", id: "LIST" },
            ],
    }),
  }),
})

export const {
  useListNetworksQuery,
  useGetNetworkQuery,
  useCreateNetworkMutation,
  useUpdateNetworkMutation,
  useDeleteNetworkMutation,
} = networkApi
