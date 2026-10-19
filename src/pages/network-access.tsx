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
  useRemoveNetworkGroupMemberMutation,
  useUnassignNetworkPermissionMutation,
  useUpdateNetworkPermissionMutation,
} from "@/store/access-slice"

export default function NetworkAccess({
  network,
  description = "Select a group to manage people and the permissions they receive.",
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
      networkId={network.id}
      title={network.name}
      description={description}
      headerActions={headerActions}
      canManage={manageAccess}
      canRemoveMembers={creator}
      creatorId={network.createdBy?.id}
      addMemberMode="email"
      error={error}
      onError={setError}
      formatError={getHumaErrorMessage}
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
