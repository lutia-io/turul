import { useMemo, useState } from "react"
import { Navigate } from "react-router"

import { AccessWorkspace } from "@/components/access-workspace"
import { useAuthorization } from "@/lib/authorization"
import { getJsonSchemaProperties } from "@/lib/json-definition"
import {
  useNetworkWorkspace,
  useWorkspaceOrganizationUsers,
  useWorkspaceSchemas,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import {
  useAddOrganizationGroupMemberMutation,
  useAssignOrganizationPermissionMutation,
  useCreateOrganizationGroupMutation,
  useUpdateOrganizationGroupMutation,
  useCreateOrganizationPermissionMutation,
  useDeleteOrganizationGroupMutation,
  useDeleteOrganizationPermissionMutation,
  useListOrganizationGroupsQuery,
  useListOrganizationPermissionsQuery,
  useRemoveOrganizationGroupMemberMutation,
  useUnassignOrganizationPermissionMutation,
  useUpdateOrganizationPermissionMutation,
} from "@/store/access-slice"

export default function OrganizationAccess() {
  const { network, organization, organizationId, href } = useNetworkWorkspace()
  const { manageAccess } = useAuthorization()
  const { organizationUsers } = useWorkspaceOrganizationUsers()
  const { schemas } = useWorkspaceSchemas()
  const [error, setError] = useState("")

  const groupsQuery = useListOrganizationGroupsQuery(
    { networkId: network?.id ?? "", organizationId: organizationId ?? "" },
    { skip: !network?.id || !organizationId }
  )
  const permissionsQuery = useListOrganizationPermissionsQuery(
    { networkId: network?.id ?? "", organizationId: organizationId ?? "" },
    { skip: !network?.id || !organizationId }
  )
  const [createGroup] = useCreateOrganizationGroupMutation()
  const [updateGroup] = useUpdateOrganizationGroupMutation()
  const [deleteGroup] = useDeleteOrganizationGroupMutation()
  const [addMember] = useAddOrganizationGroupMemberMutation()
  const [removeMember] = useRemoveOrganizationGroupMemberMutation()
  const [assignPermission] = useAssignOrganizationPermissionMutation()
  const [unassignPermission] = useUnassignOrganizationPermissionMutation()
  const [createPermission] = useCreateOrganizationPermissionMutation()
  const [updatePermission] = useUpdateOrganizationPermissionMutation()
  const [deletePermission] = useDeleteOrganizationPermissionMutation()

  const members = organizationUsers.filter(
    (user) => user.organizationId === organizationId
  )
  const candidates = useMemo(
    () =>
      members.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      })),
    [members]
  )
  const schemaOptions = useMemo(
    () =>
      schemas
        .filter(
          (schema) =>
            !schema.organizationId || schema.organizationId === organizationId
        )
        .map((schema) => ({
          id: schema.id,
          name: schema.name,
          properties: getJsonSchemaProperties(schema.definition).map(
            (property) => property.name
          ),
        })),
    [organizationId, schemas]
  )

  if (!manageAccess) {
    return <Navigate to={href("")} replace />
  }
  if (!network || !organization || !organizationId) {
    return null
  }

  return (
    <AccessWorkspace
      kind="organization"
      title={organization.name}
      description="Everyone is already in this organization. Tighten records, files, and field access by attaching permissions to groups."
      groups={groupsQuery.data ?? []}
      permissions={permissionsQuery.data ?? []}
      canManage
      canRemoveMembers
      schemas={schemaOptions}
      candidates={candidates}
      implicitMembers={candidates}
      addMemberMode="select"
      isLoading={groupsQuery.isLoading || permissionsQuery.isLoading}
      error={error}
      onError={setError}
      formatError={getHumaErrorMessage}
      onCreateGroup={async (name, description) => {
        setError("")
        const created = await createGroup({
          networkId: network.id,
          organizationId,
          name,
          description,
        }).unwrap()
        return created.id
      }}
      onUpdateGroup={async (id, name, description) => {
        setError("")
        await updateGroup({ id, name, description }).unwrap()
      }}
      onDeleteGroup={async (id) => {
        setError("")
        await deleteGroup(id).unwrap()
      }}
      onAddMember={async (groupId, organizationUserId) => {
        setError("")
        await addMember({ groupId, organizationUserId }).unwrap()
      }}
      onRemoveMember={async (groupId, organizationUserId) => {
        setError("")
        await removeMember({ groupId, organizationUserId }).unwrap()
      }}
      onAssign={async (groupId, permissionId) => {
        setError("")
        await assignPermission({ groupId, permissionId }).unwrap()
      }}
      onUnassign={async (groupId, permissionId) => {
        setError("")
        await unassignPermission({ groupId, permissionId }).unwrap()
      }}
      onCreatePermission={async (name, description, grants) => {
        setError("")
        const created = await createPermission({
          networkId: network.id,
          organizationId,
          name,
          description,
          grants,
        }).unwrap()
        return created.id
      }}
      onUpdatePermission={async (id, name, description, grants) => {
        setError("")
        await updatePermission({ id, name, description, grants }).unwrap()
      }}
      onDeletePermission={async (id) => {
        setError("")
        await deletePermission(id).unwrap()
      }}
    />
  )
}
