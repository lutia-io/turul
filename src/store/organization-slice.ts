import { setStringFilterParam } from "@/lib/list-query"
import { api } from "@/store/api"

export type ApiOrganization = {
  id: string
  name: string
  slug: string
  networkId: string
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type CreateOrganizationRequest = {
  name: string
  networkId: string
}

export type CreateOrganizationResponse = {
  id: string
}

export type UpdateOrganizationRequest = {
  id: string
  name: string
}

export type UpdateOrganizationResponse = {
  id: string
}

export type StringFilterOp = "contains" | "eq" | "startsWith" | "empty"
export type OrganizationListSort =
  | "name"
  | "slug"
  | "network"
  | "createdAt"
  | "updatedAt"

export type ListOrganizationsParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: OrganizationListSort
  order?: "asc" | "desc"
  networkId?: string
  organizationId?: string
  name?: string
  nameOp?: StringFilterOp
  slug?: string
  slugOp?: StringFilterOp
  network?: string
  networkOp?: StringFilterOp
}

export type ApiOrganizationList = {
  items: ApiOrganization[]
  total: number
  page: number
  pageSize: number
}

function listOrganizationQueryParams(params?: ListOrganizationsParams) {
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
  setStringFilterParam(query, "slug", params.slug, params.slugOp)
  setStringFilterParam(query, "network", params.network, params.networkOp)

  return query
}

const organizationApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrganizations: build.query<
      ApiOrganizationList,
      ListOrganizationsParams | void
    >({
      query: (params) => ({
        url: "/organization",
        params: listOrganizationQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Organization" as const,
                id,
              })),
              { type: "Organization", id: "LIST" },
            ]
          : [{ type: "Organization", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const organization of data.items) {
            dispatch(
              api.util.upsertQueryData(
                "getOrganization",
                organization.id,
                organization
              )
            )
          }
        } catch {
          // List failed; getOrganization cache stays unchanged.
        }
      },
    }),
    getOrganization: build.query<ApiOrganization, string>({
      query: (id) => `/organization/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Organization", id }],
    }),
    createOrganization: build.mutation<
      CreateOrganizationResponse,
      CreateOrganizationRequest
    >({
      query: (body) => ({
        url: "/organization",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Organization", id: "LIST" }],
    }),
    updateOrganization: build.mutation<
      UpdateOrganizationResponse,
      UpdateOrganizationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/organization/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Organization", id },
        { type: "Organization", id: "LIST" },
      ],
    }),
    deleteOrganization: build.mutation<void, string>({
      query: (id) => ({
        url: `/organization/${id}`,
        method: "DELETE",
        responseHandler: (response) => response.text(),
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Organization", id },
        { type: "Organization", id: "LIST" },
        { type: "OrganizationUser", id: "LIST" },
      ],
    }),
  }),
})

export const {
  useListOrganizationsQuery,
  useGetOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
} = organizationApi
