import { api } from "@/store/api"

export type ApiAccessMember = {
  id: string
  firstName: string
  lastName: string
  email: string
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
  createdAt: string
  updatedAt: string
}

const accessApi = api.injectEndpoints({
  endpoints: (build) => ({
    listNetworkGroups: build.query<ApiAccessGroup[], string>({
      query: (networkId) => ({
        url: "/network-group",
        params: { networkId },
      }),
      providesTags: [{ type: "NetworkGroup", id: "LIST" }],
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
      invalidatesTags: [{ type: "NetworkGroup", id: "LIST" }],
    }),
    deleteNetworkGroup: build.mutation<void, string>({
      query: (id) => ({ url: `/network-group/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "NetworkGroup", id: "LIST" }],
    }),
    addNetworkGroupMember: build.mutation<void, { groupId: string; email: string }>({
      query: ({ groupId, email }) => ({
        url: `/network-group/${groupId}/member`,
        method: "POST",
        body: { email },
      }),
      invalidatesTags: [
        { type: "NetworkGroup", id: "LIST" },
        { type: "Authorization", id: "LIST" },
      ],
    }),
    removeNetworkGroupMember: build.mutation<void, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/network-group/${groupId}/member/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "NetworkGroup", id: "LIST" }],
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
      invalidatesTags: [
        { type: "NetworkGroup", id: "LIST" },
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
      invalidatesTags: [
        { type: "NetworkGroup", id: "LIST" },
        { type: "Authorization" },
      ],
    }),
    listNetworkPermissions: build.query<ApiAccessPermission[], string>({
      query: (networkId) => ({
        url: "/network-permission",
        params: { networkId },
      }),
      providesTags: [{ type: "NetworkPermission", id: "LIST" }],
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
      invalidatesTags: [
        { type: "NetworkPermission", id: "LIST" },
        { type: "Authorization" },
      ],
    }),
    deleteNetworkPermission: build.mutation<void, string>({
      query: (id) => ({ url: `/network-permission/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "NetworkPermission", id: "LIST" },
        { type: "Authorization" },
      ],
    }),
    listOrganizationGroups: build.query<
      ApiAccessGroup[],
      { networkId: string; organizationId: string }
    >({
      query: (params) => ({ url: "/organization-group", params }),
      providesTags: [{ type: "OrganizationGroup", id: "LIST" }],
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
      invalidatesTags: [{ type: "OrganizationGroup", id: "LIST" }],
    }),
    deleteOrganizationGroup: build.mutation<void, string>({
      query: (id) => ({ url: `/organization-group/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "OrganizationGroup", id: "LIST" }],
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
      invalidatesTags: [
        { type: "OrganizationGroup", id: "LIST" },
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
      invalidatesTags: [{ type: "OrganizationGroup", id: "LIST" }],
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
      invalidatesTags: [
        { type: "OrganizationGroup", id: "LIST" },
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
      invalidatesTags: [
        { type: "OrganizationGroup", id: "LIST" },
        { type: "Authorization" },
      ],
    }),
    listOrganizationPermissions: build.query<
      ApiAccessPermission[],
      { networkId: string; organizationId: string }
    >({
      query: (params) => ({ url: "/organization-permission", params }),
      providesTags: [{ type: "OrganizationPermission", id: "LIST" }],
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
      invalidatesTags: [
        { type: "OrganizationPermission", id: "LIST" },
        { type: "Authorization" },
      ],
    }),
    deleteOrganizationPermission: build.mutation<void, string>({
      query: (id) => ({ url: `/organization-permission/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "OrganizationPermission", id: "LIST" },
        { type: "Authorization" },
      ],
    }),
  }),
})

export const {
  useListNetworkGroupsQuery,
  useCreateNetworkGroupMutation,
  useUpdateNetworkGroupMutation,
  useDeleteNetworkGroupMutation,
  useAddNetworkGroupMemberMutation,
  useRemoveNetworkGroupMemberMutation,
  useInviteNetworkMemberMutation,
  useAssignNetworkPermissionMutation,
  useUnassignNetworkPermissionMutation,
  useListNetworkPermissionsQuery,
  useCreateNetworkPermissionMutation,
  useUpdateNetworkPermissionMutation,
  useDeleteNetworkPermissionMutation,
  useListOrganizationGroupsQuery,
  useCreateOrganizationGroupMutation,
  useUpdateOrganizationGroupMutation,
  useDeleteOrganizationGroupMutation,
  useAddOrganizationGroupMemberMutation,
  useRemoveOrganizationGroupMemberMutation,
  useAssignOrganizationPermissionMutation,
  useUnassignOrganizationPermissionMutation,
  useListOrganizationPermissionsQuery,
  useCreateOrganizationPermissionMutation,
  useUpdateOrganizationPermissionMutation,
  useDeleteOrganizationPermissionMutation,
} = accessApi
