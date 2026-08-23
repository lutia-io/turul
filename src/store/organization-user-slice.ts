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

export type StringFilterOp = "contains" | "eq" | "startsWith"
export type OrganizationUserListSort =
  | "name"
  | "email"
  | "organization"
  | "createdAt"
  | "updatedAt"

export type ListOrganizationUsersParams = {
  page?: number
  pageSize?: number
  q?: string
  sort?: OrganizationUserListSort
  order?: "asc" | "desc"
  networkId?: string
  organizationId?: string
  name?: string
  nameOp?: StringFilterOp
  email?: string
  emailOp?: StringFilterOp
  organization?: string
  organizationOp?: StringFilterOp
}

export type ApiOrganizationUserList = {
  items: ApiOrganizationUser[]
  total: number
  page: number
  pageSize: number
}

function listOrganizationUserQueryParams(params?: ListOrganizationUsersParams) {
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
  if (params.name) {
    query.name = params.name
    if (params.nameOp) {
      query.nameOp = params.nameOp
    }
  }
  if (params.email) {
    query.email = params.email
    if (params.emailOp) {
      query.emailOp = params.emailOp
    }
  }
  if (params.organization) {
    query.organization = params.organization
    if (params.organizationOp) {
      query.organizationOp = params.organizationOp
    }
  }

  return query
}

const organizationUserApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrganizationUsers: build.query<
      ApiOrganizationUserList,
      ListOrganizationUsersParams | void
    >({
      query: (params) => ({
        url: "/organization-user",
        params: listOrganizationUserQueryParams(params ?? undefined),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "OrganizationUser" as const,
                id,
              })),
              { type: "OrganizationUser", id: "LIST" },
            ]
          : [{ type: "OrganizationUser", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          for (const organizationUser of data.items) {
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
