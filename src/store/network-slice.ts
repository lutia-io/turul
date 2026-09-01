import { api } from "@/store/api"

export type ApiNetwork = {
  id: string
  name: string
  slug: string
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
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

const networkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listNetworks: build.query<ApiNetwork[], void>({
      query: () => "/network",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Network" as const, id })),
              { type: "Network", id: "LIST" },
            ]
          : [{ type: "Network", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const network of data) {
            dispatch(
              api.util.upsertQueryData("getNetwork", network.id, network)
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
