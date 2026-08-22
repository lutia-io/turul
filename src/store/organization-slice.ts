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

const organizationApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrganizations: build.query<ApiOrganization[], void>({
      query: () => "/organization",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "Organization" as const,
                id,
              })),
              { type: "Organization", id: "LIST" },
            ]
          : [{ type: "Organization", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const organization of data) {
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
  }),
})

export const {
  useListOrganizationsQuery,
  useGetOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
} = organizationApi
