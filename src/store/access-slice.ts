import { api } from "@/store/api"

export type ApiAccessMember = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export type ApiAccessGroupSummary = {
  id: string
  name: string
  slug: string
  memberCount: number
}

export type ApiAccessGroup = {
  id: string
  networkId: string
  organizationId?: string
  name: string
  slug: string
  description: string
  system: boolean
  members: ApiAccessMember[]
  permissionIds: string[]
  permissions?: ApiAccessPermission[]
  createdAt: string
  updatedAt: string
}

export type ApiFieldGrant = {
  name: string
  access: "read" | "write"
}

export type ApiGrant = {
  resource: string
  actions: string[]
  resourceId?: string
  schemaId?: string
  fields?: ApiFieldGrant[]
}

export type ApiAccessPermission = {
  id: string
  networkId: string
  organizationId?: string
  name: string
  slug: string
  description: string
  system: boolean
  grants: ApiGrant[]
  groups?: ApiAccessGroupSummary[]
  createdAt: string
  updatedAt: string
}

export type ListAccessParams = {
  networkId: string
  organizationId?: string
  q?: string
  page?: number
  pageSize?: number
  excludeAssignedToGroupId?: string
}

export type ApiAccessGroupList = {
  items: ApiAccessGroup[]
  total: number
  page: number
  pageSize: number
}

export type ApiAccessPermissionList = {
  items: ApiAccessPermission[]
  total: number
  page: number
  pageSize: number
}

function listAccessQueryParams(params: ListAccessParams) {
  const query: Record<string, string | number> = {
    networkId: params.networkId,
  }
  if (params.organizationId) {
    query.organizationId = params.organizationId
  }
  if (params.q) {
    query.q = params.q
  }
  if (params.page != null) {
    query.page = params.page
  }
  if (params.pageSize != null) {
    query.pageSize = params.pageSize
  }
  if (params.excludeAssignedToGroupId) {
    query.excludeAssignedToGroupId = params.excludeAssignedToGroupId
  }
  return query
}

const accessApi = api.injectEndpoints({
  endpoints: (build) => ({
    listNetworkGroups: build.query<ApiAccessGroupList, ListAccessParams>({
      query: (params) => ({
        url: "/network-group",
        params: listAccessQueryParams(params),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "NetworkGroup" as const,
                id,
              })),
              { type: "NetworkGroup", id: "LIST" },
            ]
          : [{ type: "NetworkGroup", id: "LIST" }],
    }),
    getNetworkGroup: build.query<ApiAccessGroup, string>({
      query: (id) => `/network-group/${id}`,
      providesTags: (_result, _error, id) => [{ type: "NetworkGroup", id }],
    }),
    createNetworkGroup: build.mutation<
      { id: string },
      { name: string; description?: string; networkId: string }
    >({
      query: (body) => ({ url: "/network-group", method: "POST", body }),
      invalidatesTags: [{ type: "NetworkGroup", id: "LIST" }],
    }),
    updateNetworkGroup: build.mutation<
      { id: string },
      { id: string; name?: string; description?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/network-group/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "NetworkGroup", id: "LIST" },
        { type: "NetworkGroup", id },
      ],
    }),
    deleteNetworkGroup: build.mutation<void, string>({
      query: (id) => ({ url: `/network-group/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "NetworkGroup", id: "LIST" },
        { type: "NetworkGroup", id },
      ],
    }),
    addNetworkGroupMember: build.mutation<void, { groupId: string; email: string }>({
      query: ({ groupId, email }) => ({
        url: `/network-group/${groupId}/member`,
        method: "POST",
        body: { email },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "NetworkGroup", id: "LIST" },
        { type: "NetworkGroup", id: groupId },
        { type: "Authorization", id: "LIST" },
      ],
    }),
    removeNetworkGroupMember: build.mutation<void, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/network-group/${groupId}/member/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "NetworkGroup", id: "LIST" },
        { type: "NetworkGroup", id: groupId },
      ],
    }),
    inviteNetworkMember: build.mutation<void, { networkId: string; email: string }>({
      query: (body) => ({ url: "/network-member", method: "POST", body }),
      invalidatesTags: [{ type: "NetworkGroup", id: "LIST" }],
    }),
    assignNetworkPermission: build.mutation<
      void,
      { groupId: string; permissionId: string }
    >({
      query: ({ groupId, permissionId }) => ({
        url: `/network-group/${groupId}/permission`,
        method: "POST",
        body: { permissionId },
      }),
      invalidatesTags: (_result, _error, { groupId, permissionId }) => [
        { type: "NetworkGroup", id: "LIST" },
        { type: "NetworkGroup", id: groupId },
        { type: "NetworkPermission", id: "LIST" },
        { type: "NetworkPermission", id: permissionId },
        { type: "Authorization" },
      ],
    }),
    unassignNetworkPermission: build.mutation<
      void,
      { groupId: string; permissionId: string }
    >({
      query: ({ groupId, permissionId }) => ({
        url: `/network-group/${groupId}/permission/${permissionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId, permissionId }) => [
        { type: "NetworkGroup", id: "LIST" },
        { type: "NetworkGroup", id: groupId },
        { type: "NetworkPermission", id: "LIST" },
        { type: "NetworkPermission", id: permissionId },
        { type: "Authorization" },
      ],
    }),
    listNetworkPermissions: build.query<ApiAccessPermissionList, ListAccessParams>({
      query: (params) => ({
        url: "/network-permission",
        params: listAccessQueryParams(params),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "NetworkPermission" as const,
                id,
              })),
              { type: "NetworkPermission", id: "LIST" },
            ]
          : [{ type: "NetworkPermission", id: "LIST" }],
    }),
    getNetworkPermission: build.query<ApiAccessPermission, string>({
      query: (id) => `/network-permission/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "NetworkPermission", id },
      ],
    }),
    createNetworkPermission: build.mutation<
      { id: string },
      { name: string; description?: string; networkId: string; grants: ApiGrant[] }
    >({
      query: (body) => ({ url: "/network-permission", method: "POST", body }),
      invalidatesTags: [
        { type: "NetworkPermission", id: "LIST" },
        { type: "Authorization" },
      ],
    }),
    updateNetworkPermission: build.mutation<
      { id: string },
      { id: string; name?: string; description?: string; grants?: ApiGrant[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/network-permission/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "NetworkPermission", id: "LIST" },
        { type: "NetworkPermission", id },
        { type: "Authorization" },
      ],
    }),
    deleteNetworkPermission: build.mutation<void, string>({
      query: (id) => ({ url: `/network-permission/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "NetworkPermission", id: "LIST" },
        { type: "NetworkPermission", id },
        { type: "Authorization" },
      ],
    }),
    listOrganizationGroups: build.query<ApiAccessGroupList, ListAccessParams>({
      query: (params) => ({
        url: "/organization-group",
        params: listAccessQueryParams(params),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "OrganizationGroup" as const,
                id,
              })),
              { type: "OrganizationGroup", id: "LIST" },
            ]
          : [{ type: "OrganizationGroup", id: "LIST" }],
    }),
    getOrganizationGroup: build.query<ApiAccessGroup, string>({
      query: (id) => `/organization-group/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "OrganizationGroup", id },
      ],
    }),
    createOrganizationGroup: build.mutation<
      { id: string },
      { name: string; description?: string; networkId: string; organizationId: string }
    >({
      query: (body) => ({ url: "/organization-group", method: "POST", body }),
      invalidatesTags: [{ type: "OrganizationGroup", id: "LIST" }],
    }),
    updateOrganizationGroup: build.mutation<
      { id: string },
      { id: string; name?: string; description?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/organization-group/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "OrganizationGroup", id: "LIST" },
        { type: "OrganizationGroup", id },
      ],
    }),
    deleteOrganizationGroup: build.mutation<void, string>({
      query: (id) => ({ url: `/organization-group/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "OrganizationGroup", id: "LIST" },
        { type: "OrganizationGroup", id },
      ],
    }),
    addOrganizationGroupMember: build.mutation<
      void,
      { groupId: string; organizationUserId: string }
    >({
      query: ({ groupId, organizationUserId }) => ({
        url: `/organization-group/${groupId}/member`,
        method: "POST",
        body: { organizationUserId },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "OrganizationGroup", id: "LIST" },
        { type: "OrganizationGroup", id: groupId },
        { type: "Authorization" },
      ],
    }),
    removeOrganizationGroupMember: build.mutation<
      void,
      { groupId: string; organizationUserId: string }
    >({
      query: ({ groupId, organizationUserId }) => ({
        url: `/organization-group/${groupId}/member/${organizationUserId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "OrganizationGroup", id: "LIST" },
        { type: "OrganizationGroup", id: groupId },
      ],
    }),
    assignOrganizationPermission: build.mutation<
      void,
      { groupId: string; permissionId: string }
    >({
      query: ({ groupId, permissionId }) => ({
        url: `/organization-group/${groupId}/permission`,
        method: "POST",
        body: { permissionId },
      }),
      invalidatesTags: (_result, _error, { groupId, permissionId }) => [
        { type: "OrganizationGroup", id: "LIST" },
        { type: "OrganizationGroup", id: groupId },
        { type: "OrganizationPermission", id: "LIST" },
        { type: "OrganizationPermission", id: permissionId },
        { type: "Authorization" },
      ],
    }),
    unassignOrganizationPermission: build.mutation<
      void,
      { groupId: string; permissionId: string }
    >({
      query: ({ groupId, permissionId }) => ({
        url: `/organization-group/${groupId}/permission/${permissionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId, permissionId }) => [
        { type: "OrganizationGroup", id: "LIST" },
        { type: "OrganizationGroup", id: groupId },
        { type: "OrganizationPermission", id: "LIST" },
        { type: "OrganizationPermission", id: permissionId },
        { type: "Authorization" },
      ],
    }),
    listOrganizationPermissions: build.query<
      ApiAccessPermissionList,
      ListAccessParams
    >({
      query: (params) => ({
        url: "/organization-permission",
        params: listAccessQueryParams(params),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "OrganizationPermission" as const,
                id,
              })),
              { type: "OrganizationPermission", id: "LIST" },
            ]
          : [{ type: "OrganizationPermission", id: "LIST" }],
    }),
    getOrganizationPermission: build.query<ApiAccessPermission, string>({
      query: (id) => `/organization-permission/${id}`,
      providesTags: (_result, _error, id) => [
        { type: "OrganizationPermission", id },
      ],
    }),
    createOrganizationPermission: build.mutation<
      { id: string },
      {
        name: string
        description?: string
        networkId: string
        organizationId: string
        grants: ApiGrant[]
      }
    >({
      query: (body) => ({ url: "/organization-permission", method: "POST", body }),
      invalidatesTags: [
        { type: "OrganizationPermission", id: "LIST" },
        { type: "Authorization" },
      ],
    }),
    updateOrganizationPermission: build.mutation<
      { id: string },
      { id: string; name?: string; description?: string; grants?: ApiGrant[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/organization-permission/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "OrganizationPermission", id: "LIST" },
        { type: "OrganizationPermission", id },
        { type: "Authorization" },
      ],
    }),
    deleteOrganizationPermission: build.mutation<void, string>({
      query: (id) => ({ url: `/organization-permission/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "OrganizationPermission", id: "LIST" },
        { type: "OrganizationPermission", id },
        { type: "Authorization" },
      ],
    }),
  }),
})

export const {
  useListNetworkGroupsQuery,
  useGetNetworkGroupQuery,
  useCreateNetworkGroupMutation,
  useUpdateNetworkGroupMutation,
  useDeleteNetworkGroupMutation,
  useAddNetworkGroupMemberMutation,
  useRemoveNetworkGroupMemberMutation,
  useInviteNetworkMemberMutation,
  useAssignNetworkPermissionMutation,
  useUnassignNetworkPermissionMutation,
  useListNetworkPermissionsQuery,
  useGetNetworkPermissionQuery,
  useCreateNetworkPermissionMutation,
  useUpdateNetworkPermissionMutation,
  useDeleteNetworkPermissionMutation,
  useListOrganizationGroupsQuery,
  useGetOrganizationGroupQuery,
  useCreateOrganizationGroupMutation,
  useUpdateOrganizationGroupMutation,
  useDeleteOrganizationGroupMutation,
  useAddOrganizationGroupMemberMutation,
  useRemoveOrganizationGroupMemberMutation,
  useAssignOrganizationPermissionMutation,
  useUnassignOrganizationPermissionMutation,
  useListOrganizationPermissionsQuery,
  useGetOrganizationPermissionQuery,
  useCreateOrganizationPermissionMutation,
  useUpdateOrganizationPermissionMutation,
  useDeleteOrganizationPermissionMutation,
} = accessApi
