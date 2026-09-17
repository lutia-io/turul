import { useState, type ReactNode } from "react"

import { AccessWorkspace } from "@/components/access-workspace"
import type { Network } from "@/data/networks"
import { useAuthorization } from "@/lib/authorization"
import { getHumaErrorMessage } from "@/store/api"
import {
  useAddNetworkGroupMemberMutation,
  useAssignNetworkPermissionMutation,
  useCreateNetworkGroupMutation,
  useUpdateNetworkGroupMutation,
  useCreateNetworkPermissionMutation,
  useDeleteNetworkGroupMutation,
  useDeleteNetworkPermissionMutation,
  useInviteNetworkMemberMutation,
  useListNetworkGroupsQuery,
  useListNetworkPermissionsQuery,
  useRemoveNetworkGroupMemberMutation,
  useUnassignNetworkPermissionMutation,
  useUpdateNetworkPermissionMutation,
} from "@/store/access-slice"

export default function NetworkAccess({
  network,
  description = "Groups hold people. Permissions describe what those people can do. Attach a permission to a group to grant it.",
  headerActions,
}: {
  network: Network
  description?: string
  headerActions?: ReactNode
}) {
  const { manageAccess, creator } = useAuthorization({
    networkId: network.id,
    organizationId: null,
  })
  const [error, setError] = useState("")

  const groupsQuery = useListNetworkGroupsQuery(network?.id ?? "", {
    skip: !network?.id,
  })
  const permissionsQuery = useListNetworkPermissionsQuery(network?.id ?? "", {
    skip: !network?.id,
  })
  const [inviteMember] = useInviteNetworkMemberMutation()
  const [createGroup] = useCreateNetworkGroupMutation()
  const [updateGroup] = useUpdateNetworkGroupMutation()
  const [deleteGroup] = useDeleteNetworkGroupMutation()
  const [addMember] = useAddNetworkGroupMemberMutation()
  const [removeMember] = useRemoveNetworkGroupMemberMutation()
  const [assignPermission] = useAssignNetworkPermissionMutation()
  const [unassignPermission] = useUnassignNetworkPermissionMutation()
  const [createPermission] = useCreateNetworkPermissionMutation()
  const [updatePermission] = useUpdateNetworkPermissionMutation()
  const [deletePermission] = useDeleteNetworkPermissionMutation()

  return (
    <AccessWorkspace
      kind="network"
      title={network.name}
      description={description}
      headerActions={headerActions}
      groups={groupsQuery.data ?? []}
      permissions={permissionsQuery.data ?? []}
      canManage={manageAccess}
      canRemoveMembers={creator}
      creatorId={network.createdBy?.id}
      addMemberMode="email"
      inviteLabel="Invite a platform user"
      inviteDescription="They must already have a Huma account. Invites join Members."
      isLoading={groupsQuery.isLoading || permissionsQuery.isLoading}
      error={error}
      onError={setError}
      formatError={getHumaErrorMessage}
      onInvite={async (email) => {
        setError("")
        await inviteMember({ networkId: network.id, email }).unwrap()
      }}
      onCreateGroup={async (name, description) => {
        setError("")
        const created = await createGroup({
          networkId: network.id,
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
      onAddMember={async (groupId, email) => {
        setError("")
        await addMember({ groupId, email }).unwrap()
      }}
      onRemoveMember={async (groupId, userId) => {
        setError("")
        await removeMember({ groupId, userId }).unwrap()
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
