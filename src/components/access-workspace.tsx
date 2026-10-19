import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import {
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  ShieldPlusIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react"

import {
  AccessOutline,
  GrantEditor,
  type AccessSchemaOption,
} from "@/components/access-outline"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  grantsFromPermissions,
  outlineRows,
  outlineSummary,
  personInitials,
  personName,
} from "@/lib/access-outline"
import { cn } from "@/lib/utils"
import type {
  ApiAccessGroup,
  ApiAccessMember,
  ApiAccessPermission,
  ApiGrant,
  ListAccessParams,
} from "@/store/access-slice"
import {
  useGetNetworkGroupQuery,
  useGetOrganizationGroupQuery,
  useListNetworkGroupsQuery,
  useListNetworkPermissionsQuery,
  useListOrganizationGroupsQuery,
  useListOrganizationPermissionsQuery,
} from "@/store/access-slice"

export type AccessCandidate = {
  id: string
  firstName: string
  lastName: string
  email: string
}

const RAIL_PAGE_SIZE = 50
const ATTACH_PAGE_SIZE = 20

export function AccessWorkspace({
  kind,
  networkId,
  organizationId,
  title,
  description,
  canManage,
  canRemoveMembers,
  creatorId,
  schemas = [],
  candidates = [],
  implicitMembers,
  addMemberMode,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddMember,
  onRemoveMember,
  onAssign,
  onUnassign,
  onCreatePermission,
  onUpdatePermission,
  onDeletePermission,
  headerActions,
  error,
  onError,
  formatError,
}: {
  kind: "network" | "organization"
  networkId: string
  organizationId?: string
  title: string
  description: string
  headerActions?: ReactNode
  canManage: boolean
  canRemoveMembers: boolean
  creatorId?: string
  schemas?: AccessSchemaOption[]
  candidates?: AccessCandidate[]
  implicitMembers?: AccessCandidate[]
  addMemberMode: "email" | "select"
  onCreateGroup: (name: string, description: string) => Promise<string>
  onUpdateGroup: (id: string, name: string, description: string) => Promise<void>
  onDeleteGroup: (id: string) => Promise<void>
  onAddMember: (groupId: string, value: string) => Promise<void>
  onRemoveMember: (groupId: string, memberId: string) => Promise<void>
  onAssign: (groupId: string, permissionId: string) => Promise<void>
  onUnassign: (groupId: string, permissionId: string) => Promise<void>
  onCreatePermission: (
    name: string,
    description: string,
    grants: ApiGrant[]
  ) => Promise<string>
  onUpdatePermission: (
    id: string,
    name: string,
    description: string,
    grants: ApiGrant[]
  ) => Promise<void>
  onDeletePermission: (id: string) => Promise<void>
  error?: string
  onError: (message: string) => void
  formatError: (err: unknown, fallback: string) => string
}) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupQuery, setGroupQuery] = useState("")
  const debouncedGroupQuery = useDebouncedValue(groupQuery)
  const [groupOpen, setGroupOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(
    null
  )
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [permissionName, setPermissionName] = useState("")
  const [permissionDescription, setPermissionDescription] = useState("")
  const [grants, setGrants] = useState<ApiGrant[]>([])
  const [memberValue, setMemberValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<ApiAccessMember | null>(
    null
  )
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "group"; id: string; name: string }
    | { type: "permission"; id: string; name: string }
    | null
  >(null)

  const scopeReady =
    Boolean(networkId) && (kind === "network" || Boolean(organizationId))

  const groupListParams = useMemo<ListAccessParams>(
    () => ({
      networkId,
      organizationId,
      q: debouncedGroupQuery.trim() || undefined,
      page: 1,
      pageSize: RAIL_PAGE_SIZE,
    }),
    [debouncedGroupQuery, networkId, organizationId]
  )

  const networkGroupsQuery = useListNetworkGroupsQuery(groupListParams, {
    skip: !scopeReady || kind !== "network",
  })
  const orgGroupsQuery = useListOrganizationGroupsQuery(groupListParams, {
    skip: !scopeReady || kind !== "organization",
  })

  const groupsQuery =
    kind === "network" ? networkGroupsQuery : orgGroupsQuery

  const groups = groupsQuery.data?.items ?? []
  const isLoading = groupsQuery.isLoading && groups.length === 0

  const networkGroupDetail = useGetNetworkGroupQuery(selectedGroupId ?? "", {
    skip: kind !== "network" || !selectedGroupId,
  })
  const orgGroupDetail = useGetOrganizationGroupQuery(selectedGroupId ?? "", {
    skip: kind !== "organization" || !selectedGroupId,
  })

  const selectedGroup: ApiAccessGroup | undefined =
    kind === "network" ? networkGroupDetail.data : orgGroupDetail.data

  useEffect(() => {
    setSelectedGroupId(null)
    setGroupQuery("")
    setAssignOpen(false)
  }, [networkId, organizationId, kind])

  useEffect(() => {
    setAssignOpen(false)
  }, [selectedGroupId])

  useEffect(() => {
    if (selectedGroupId) {
      return
    }
    if (groupsQuery.isLoading || groups.length === 0) {
      return
    }
    const preferred =
      groups.find((group) => group.slug === "members") ??
      groups.find((group) => group.slug === "everyone") ??
      groups[0]
    if (preferred) {
      setSelectedGroupId(preferred.id)
    }
  }, [groups, groupsQuery.isLoading, selectedGroupId])

  const groupPeople = useMemo(() => {
    if (!selectedGroup) {
      return [] as ApiAccessMember[]
    }
    if (selectedGroup.slug === "everyone" && implicitMembers) {
      return implicitMembers
    }
    return selectedGroup.members
  }, [implicitMembers, selectedGroup])

  const attachedPermissions = selectedGroup?.permissions ?? []

  const mergedRows = useMemo(() => {
    if (!selectedGroup) {
      return []
    }
    return outlineRows(
      grantsFromPermissions(
        attachedPermissions,
        selectedGroup.permissionIds
      ),
      kind
    )
  }, [attachedPermissions, kind, selectedGroup])

  function openNewGroup() {
    setEditingGroupId(null)
    setGroupName("")
    setGroupDescription("")
    setGroupOpen(true)
  }

  function openEditGroup(group: ApiAccessGroup) {
    setEditingGroupId(group.id)
    setGroupName(group.name)
    setGroupDescription(group.description)
    setGroupOpen(true)
  }

  function openNewOutline() {
    setEditingPermissionId(null)
    setPermissionName("")
    setPermissionDescription("")
    setGrants([])
    setOutlineOpen(true)
  }

  function openEditOutline(permission: ApiAccessPermission) {
    setEditingPermissionId(permission.id)
    setPermissionName(permission.name)
    setPermissionDescription(permission.description)
    setGrants(permission.grants)
    setOutlineOpen(true)
  }

  async function submitGroup(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      if (editingGroupId) {
        await onUpdateGroup(editingGroupId, groupName, groupDescription)
      } else {
        const id = await onCreateGroup(groupName, groupDescription)
        setSelectedGroupId(id)
      }
      setGroupName("")
      setGroupDescription("")
      setGroupOpen(false)
    } catch (err) {
      onError(
        formatError(
          err,
          editingGroupId ? "Could not save group." : "Could not create group."
        )
      )
    } finally {
      setBusy(false)
    }
  }

  async function submitOutline(event: FormEvent) {
    event.preventDefault()
    if (grants.length === 0) {
      onError("Choose at least one action for this permission.")
      return
    }
    setBusy(true)
    try {
      if (editingPermissionId) {
        await onUpdatePermission(
          editingPermissionId,
          permissionName,
          permissionDescription,
          grants
        )
      } else {
        const id = await onCreatePermission(
          permissionName,
          permissionDescription,
          grants
        )
        if (selectedGroupId) {
          await onAssign(selectedGroupId, id)
        }
      }
      setOutlineOpen(false)
    } catch (err) {
      onError(formatError(err, "Could not save that permission."))
    } finally {
      setBusy(false)
    }
  }

  async function addToGroup(event: FormEvent) {
    event.preventDefault()
    if (!selectedGroup || !memberValue) {
      return
    }
    try {
      await onAddMember(selectedGroup.id, memberValue)
      setMemberValue("")
    } catch (err) {
      onError(formatError(err, "Could not add that person."))
    }
  }

  async function run(task: () => Promise<void>, fallback: string) {
    try {
      await task()
    } catch (err) {
      onError(formatError(err, fallback))
    }
  }

  const implicit = selectedGroup?.slug === "everyone"
  const groupDetailQuery =
    kind === "network" ? networkGroupDetail : orgGroupDetail
  const detailPending =
    Boolean(selectedGroupId) &&
    (!selectedGroup || selectedGroup.id !== selectedGroupId) &&
    (groupDetailQuery.isLoading ||
      groupDetailQuery.isFetching ||
      groupDetailQuery.isUninitialized)

  return (
    <div className="flex h-[calc(100svh-var(--app-header-height))] min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/40">
      <header className="shrink-0 border-b bg-background px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Access</p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          {headerActions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive sm:px-6 lg:px-8">
          {error}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex max-h-[50vh] w-full shrink-0 flex-col overflow-hidden border-b bg-background lg:max-h-none lg:h-auto lg:min-h-0 lg:w-72 lg:self-stretch lg:border-r lg:border-b-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
            <RailSection
              icon={<UsersIcon className="size-3.5" />}
              label="Groups"
              action={
                canManage ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                    onClick={openNewGroup}
                  >
                    <PlusIcon className="size-3.5" />
                    Add
                  </Button>
                ) : null
              }
              query={groupQuery}
              onQueryChange={setGroupQuery}
              searchPlaceholder="Search groups…"
              searchLabel="Search groups"
              className="min-h-0 flex-1"
            >
              {isLoading ? <RailItemsSkeleton /> : null}
              {!isLoading && groups.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  {debouncedGroupQuery.trim()
                    ? "No matching groups"
                    : "No groups yet"}
                </p>
              ) : null}
              {groups.map((group) => (
                <RailItem
                  key={group.id}
                  active={selectedGroupId === group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  title={group.name}
                  subtitle={
                    group.slug === "everyone"
                      ? "Everyone in this organization"
                      : `${group.members.length} ${
                          group.members.length === 1 ? "person" : "people"
                        }`
                  }
                  badge={group.system ? "Built-in" : undefined}
                  action={
                    canManage ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditGroup(group)
                        }}
                      >
                        <PencilIcon />
                        <span className="sr-only">Edit {group.name}</span>
                      </Button>
                    ) : null
                  }
                />
              ))}
            </RailSection>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {detailPending ? (
            <div
              className="flex min-h-64 flex-col items-center justify-center gap-3"
              aria-busy="true"
              aria-live="polite"
            >
              <Spinner
                className="size-6 text-muted-foreground"
                label="Loading group"
              />
              <p className="text-sm text-muted-foreground">Loading group…</p>
            </div>
          ) : null}

          {selectedGroup && selectedGroup.id === selectedGroupId ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Group
                      </p>
                      {selectedGroup.system ? (
                        <AccessChip>Built-in</AccessChip>
                      ) : null}
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      {selectedGroup.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedGroup.description ||
                        "People in this group receive every assigned permission."}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <AccessChip>
                        <UsersIcon className="size-3" />
                        {groupPeople.length}{" "}
                        {groupPeople.length === 1 ? "person" : "people"}
                      </AccessChip>
                      <AccessChip>
                        <ShieldIcon className="size-3" />
                        {attachedPermissions.length}{" "}
                        {attachedPermissions.length === 1
                          ? "permission"
                          : "permissions"}
                      </AccessChip>
                    </div>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditGroup(selectedGroup)}
                      >
                        <PencilIcon />
                        Edit
                      </Button>
                      {!selectedGroup.system ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setConfirmDelete({
                              type: "group",
                              id: selectedGroup.id,
                              name: selectedGroup.name,
                            })
                          }
                        >
                          <Trash2Icon />
                          <span className="sr-only">Delete group</span>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    People
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {implicit
                      ? "Membership is automatic for every organization user."
                      : addMemberMode === "email"
                        ? "Add someone to this group by email."
                        : "Choose an organization user to include in this group."}
                  </p>
                </div>

                {canManage && !implicit ? (
                  <form
                    className="mt-4 flex flex-col gap-2 rounded-xl bg-muted/50 p-3 ring-1 ring-foreground/8 sm:flex-row sm:items-center"
                    onSubmit={addToGroup}
                  >
                    <div className="min-w-0 flex-1">
                      {addMemberMode === "email" ? (
                        <Input
                          type="email"
                          value={memberValue}
                          onChange={(event) =>
                            setMemberValue(event.target.value)
                          }
                          placeholder="Add by email"
                          required
                          className="bg-background"
                        />
                      ) : (
                        <NativeSelect
                          value={memberValue}
                          onChange={(event) =>
                            setMemberValue(event.target.value)
                          }
                          required
                          className="bg-background"
                        >
                          <NativeSelectOption value="">
                            Choose an organization user…
                          </NativeSelectOption>
                          {candidates
                            .filter(
                              (person) =>
                                !groupPeople.some(
                                  (member) => member.id === person.id
                                )
                            )
                            .map((person) => (
                              <NativeSelectOption
                                key={person.id}
                                value={person.id}
                              >
                                {personName(person)}
                              </NativeSelectOption>
                            ))}
                        </NativeSelect>
                      )}
                    </div>
                    <Button type="submit" className="shrink-0">
                      <UserPlusIcon />
                      Add to group
                    </Button>
                  </form>
                ) : null}

                {groupPeople.length === 0 && !implicit ? (
                  <p className="mt-4 rounded-xl border border-dashed border-foreground/15 px-4 py-8 text-center text-sm text-muted-foreground">
                    No people yet. Add someone to this group.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
                    {groupPeople.map((person) => {
                      const locked = person.id === creatorId
                      return (
                        <li
                          key={person.id}
                          className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar size="sm">
                              <AvatarFallback>
                                {personInitials(person)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 truncate text-sm font-medium">
                                <span className="truncate">
                                  {personName(person)}
                                </span>
                                {locked ? <AccessChip>Creator</AccessChip> : null}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {person.email}
                              </p>
                            </div>
                          </div>
                          {canRemoveMembers && !implicit && !locked ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setMemberToRemove(person)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight">
                      Permissions
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {attachedPermissions.length === 0
                        ? "Assign or create permissions to decide what this group can do."
                        : outlineSummary(mergedRows)}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignOpen(true)}
                      >
                        <ShieldPlusIcon />
                        Assign
                      </Button>
                      <Button size="sm" onClick={openNewOutline}>
                        <PlusIcon />
                        Create
                      </Button>
                    </div>
                  ) : null}
                </div>

                {attachedPermissions.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-foreground/15 px-4 py-6 text-center text-sm text-muted-foreground">
                    No permissions assigned yet.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
                    {attachedPermissions.map((permission) => (
                      <li
                        key={permission.id}
                        className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {permission.name}
                            {permission.system ? (
                              <AccessChip>Built-in</AccessChip>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {outlineSummary(
                              outlineRows(permission.grants, kind)
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {canManage && !permission.system ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => openEditOutline(permission)}
                            >
                              <PencilIcon />
                              Edit
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-muted-foreground"
                              onClick={() =>
                                void run(
                                  () =>
                                    onUnassign(
                                      selectedGroup.id,
                                      permission.id
                                    ),
                                  "Could not unassign that permission."
                                )
                              }
                            >
                              Unassign
                            </Button>
                          ) : null}
                          {canManage && !permission.system ? (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setConfirmDelete({
                                  type: "permission",
                                  id: permission.id,
                                  name: permission.name,
                                })
                              }
                            >
                              <Trash2Icon />
                              <span className="sr-only">
                                Delete {permission.name}
                              </span>
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {attachedPermissions.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Effective access
                    </p>
                    <AccessOutline
                      rows={mergedRows}
                      schemas={schemas}
                      empty="Assign a permission to give this group access."
                    />
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {!selectedGroup && !isLoading && !detailPending ? (
            <div className="mx-auto max-w-lg rounded-2xl bg-card p-8 text-center shadow-xs ring-1 ring-foreground/10">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted">
                <UsersIcon className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">Select a group</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a group to manage people and permissions.
              </p>
              {canManage ? (
                <div className="mt-5 flex justify-center">
                  <Button size="sm" onClick={openNewGroup}>
                    <PlusIcon />
                    Add group
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </main>
      </div>

      <Dialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToRemove(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from group?</DialogTitle>
            <DialogDescription>
              {memberToRemove
                ? `${personName(memberToRemove)} will lose access granted through this group.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!selectedGroup || !memberToRemove || busy}
              onClick={() => {
                if (!selectedGroup || !memberToRemove) {
                  return
                }
                const groupId = selectedGroup.id
                const userId = memberToRemove.id
                void run(async () => {
                  setBusy(true)
                  try {
                    await onRemoveMember(groupId, userId)
                    setMemberToRemove(null)
                  } finally {
                    setBusy(false)
                  }
                }, "Could not remove that person.")
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDelete?.type === "permission"
                ? "Delete permission?"
                : "Delete group?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDelete
                ? `“${confirmDelete.name}” will be permanently removed.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!confirmDelete || busy}
              onClick={() => {
                if (!confirmDelete) {
                  return
                }
                const pending = confirmDelete
                void run(async () => {
                  setBusy(true)
                  try {
                    if (pending.type === "group") {
                      await onDeleteGroup(pending.id)
                      setSelectedGroupId(null)
                    } else {
                      await onDeletePermission(pending.id)
                    }
                    setConfirmDelete(null)
                  } finally {
                    setBusy(false)
                  }
                }, `Could not delete that ${pending.type}.`)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <form onSubmit={submitGroup}>
            <DialogHeader>
              <DialogTitle>
                {editingGroupId ? "Edit group" : "Create a group"}
              </DialogTitle>
              <DialogDescription>
                {editingGroupId
                  ? "Change the group name and description."
                  : "A group is a named set of people. Assign permissions to decide what they can do."}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={groupDescription}
                  onChange={(event) => setGroupDescription(event.target.value)}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={busy}>
                {editingGroupId ? "Save group" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign permission</DialogTitle>
            <DialogDescription>
              Choose an existing permission to assign to{" "}
              {selectedGroup?.name ?? "this group"}.
            </DialogDescription>
          </DialogHeader>
          {selectedGroup ? (
            <div className="min-w-0 py-1">
              <PermissionAssignPicker
                kind={kind}
                networkId={networkId}
                organizationId={organizationId}
                groupId={selectedGroup.id}
                onSelect={(permissionId) =>
                  void run(async () => {
                    await onAssign(selectedGroup.id, permissionId)
                    setAssignOpen(false)
                  }, "Could not assign that permission.")
                }
              />
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={outlineOpen} onOpenChange={setOutlineOpen}>
        <DialogContent className="sm:max-w-3xl">
          <form onSubmit={submitOutline}>
            <DialogHeader>
              <DialogTitle>
                {editingPermissionId ? "Edit permission" : "Create permission"}
              </DialogTitle>
              <DialogDescription>
                {editingPermissionId
                  ? "Update the name and actions this permission grants."
                  : selectedGroupId
                    ? "Choose the actions to grant. It will be assigned to this group when you save."
                    : "Choose the actions to grant, then assign the permission to a group."}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    value={permissionName}
                    onChange={(event) => setPermissionName(event.target.value)}
                    placeholder="Editors"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Input
                    value={permissionDescription}
                    onChange={(event) =>
                      setPermissionDescription(event.target.value)
                    }
                    placeholder="Can view and edit records"
                  />
                </Field>
              </div>
              <GrantEditor
                kind={kind}
                grants={grants}
                onChange={setGrants}
                schemas={schemas}
              />
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={busy || grants.length === 0}>
                Save permission
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PermissionAssignPicker({
  kind,
  networkId,
  organizationId,
  groupId,
  onSelect,
}: {
  kind: "network" | "organization"
  networkId: string
  organizationId?: string
  groupId: string
  onSelect: (permissionId: string) => void
}) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const params = useMemo<ListAccessParams>(
    () => ({
      networkId,
      organizationId,
      q: debouncedQuery.trim() || undefined,
      page: 1,
      pageSize: ATTACH_PAGE_SIZE,
      excludeAssignedToGroupId: groupId,
    }),
    [debouncedQuery, groupId, networkId, organizationId]
  )
  const networkQuery = useListNetworkPermissionsQuery(params, {
    skip: kind !== "network",
  })
  const orgQuery = useListOrganizationPermissionsQuery(params, {
    skip: kind !== "organization",
  })
  const list = kind === "network" ? networkQuery : orgQuery
  const items = list.data?.items ?? []

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative min-w-0">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search permissions…"
          aria-label="Search permissions to assign"
          className="h-9 w-full min-w-0 pl-8"
          autoFocus
        />
      </div>
      {list.isFetching && items.length === 0 ? (
        <div className="flex flex-col gap-1.5" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : null}
      {items.length === 0 && !list.isFetching ? (
        <p className="px-1 py-4 text-center text-sm text-muted-foreground">
          {debouncedQuery.trim()
            ? "No matching permissions to assign"
            : "No unassigned permissions left"}
        </p>
      ) : (
        <ul className="max-h-64 min-w-0 overflow-y-auto rounded-xl ring-1 ring-foreground/10">
          {items.map((permission) => (
            <li
              key={permission.id}
              className="min-w-0 border-b border-foreground/5 last:border-b-0"
            >
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                onClick={() => {
                  onSelect(permission.id)
                  setQuery("")
                }}
              >
                <span className="min-w-0 flex-1 overflow-hidden">
                  <span className="block truncate font-medium">
                    {permission.name}
                  </span>
                  {permission.description ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {permission.description}
                    </span>
                  ) : null}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                  <ShieldPlusIcon className="size-3.5" />
                  Assign
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RailSection({
  icon,
  label,
  action,
  query,
  onQueryChange,
  searchPlaceholder,
  searchLabel,
  className,
  children,
}: {
  icon: ReactNode
  label: string
  action?: ReactNode
  query: string
  onQueryChange: (value: string) => void
  searchPlaceholder: string
  searchLabel: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn("flex min-h-0 flex-col overflow-hidden", className)}
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </p>
        {action}
      </div>
      <div className="relative mb-2 shrink-0 px-0.5">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className="h-8 border-transparent bg-muted/70 pl-8 text-sm shadow-none focus-visible:ring-1"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        {children}
      </div>
    </section>
  )
}

function RailItem({
  active,
  title,
  subtitle,
  badge,
  onClick,
  action,
}: {
  active: boolean
  title: string
  subtitle: string
  badge?: string
  onClick: () => void
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-start rounded-lg ring-1 ring-transparent transition-colors",
        active
          ? "bg-muted text-foreground ring-foreground/10"
          : "hover:bg-muted/60"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 px-2.5 py-2 text-left"
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge ? <AccessChip className="shrink-0">{badge}</AccessChip> : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </button>
      {action ? <div className="shrink-0 pr-1 pt-1">{action}</div> : null}
    </div>
  )
}

function AccessChip({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/8",
        className
      )}
    >
      {children}
    </span>
  )
}

function RailItemsSkeleton() {
  return (
    <div aria-busy="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-1.5 px-2 py-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}
