import { api } from "@/store/api"

export type ApiOrganizationUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  organizationId: string
  networkId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type CreateOrganizationUserRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
  organizationId: string
  networkId: string
}

export type CreateOrganizationUserResponse = {
  id: string
}

export type UpdateOrganizationUserRequest = {
  id: string
  firstName: string
  lastName: string
  email: string
  password?: string
}

export type UpdateOrganizationUserResponse = {
  id: string
}

const organizationUserApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrganizationUsers: build.query<ApiOrganizationUser[], void>({
      query: () => "/organization-user",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "OrganizationUser" as const,
                id,
              })),
              { type: "OrganizationUser", id: "LIST" },
            ]
          : [{ type: "OrganizationUser", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const organizationUser of data) {
            dispatch(
              api.util.upsertQueryData(
                "getOrganizationUser",
                organizationUser.id,
                organizationUser
              )
            )
          }
        } catch {
          // List failed; getOrganizationUser cache stays unchanged.
        }
      },
    }),
    getOrganizationUser: build.query<ApiOrganizationUser, string>({
      query: (id) => `/organization-user/${id}`,
      providesTags: (_result, _error, id) => [{ type: "OrganizationUser", id }],
    }),
    createOrganizationUser: build.mutation<
      CreateOrganizationUserResponse,
      CreateOrganizationUserRequest
    >({
      query: (body) => ({
        url: "/organization-user",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "OrganizationUser", id: "LIST" }],
    }),
    updateOrganizationUser: build.mutation<
      UpdateOrganizationUserResponse,
      UpdateOrganizationUserRequest
    >({
      query: ({ id, password, ...body }) => ({
        url: `/organization-user/${id}`,
        method: "PATCH",
        body: password ? { ...body, password } : body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "OrganizationUser", id },
        { type: "OrganizationUser", id: "LIST" },
      ],
    }),
  }),
})

export const {
  useListOrganizationUsersQuery,
  useGetOrganizationUserQuery,
  useCreateOrganizationUserMutation,
  useUpdateOrganizationUserMutation,
} = organizationUserApi
