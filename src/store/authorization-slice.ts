import { api } from "@/store/api"

export type ResourceActions = {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
  manageAccess?: boolean
}

export type NetworkEffective = {
  member: boolean
  creator: boolean
  manageAccess: boolean
  grants: Record<string, ResourceActions>
}

export type OrganizationEffective = {
  grants: Record<string, ResourceActions>
  fieldAccess: Record<string, Record<string, string>>
}

export type ApiAuthorization = {
  principalType: string
  creator: boolean
  network?: NetworkEffective
  organization?: OrganizationEffective
}

export type GetAuthorizationParams = {
  networkId: string
  organizationId?: string
}

const authorizationApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAuthorization: build.query<ApiAuthorization, GetAuthorizationParams>({
      query: ({ networkId, organizationId }) => ({
        url: "/authorization",
        params: {
          networkId,
          ...(organizationId ? { organizationId } : {}),
        },
      }),
      providesTags: (_result, _error, arg) => [
        {
          type: "Authorization",
          id: `${arg.networkId}:${arg.organizationId ?? ""}`,
        },
      ],
    }),
  }),
})

export const { useGetAuthorizationQuery } = authorizationApi
