import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import {
  PencilIcon,
  PlusIcon,
  ShieldIcon,
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
import { Textarea } from "@/components/ui/textarea"
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
} from "@/store/access-slice"

export type AccessCandidate = {
  id: string
  firstName: string
  lastName: string
  email: string
}

type Selection =
  | { type: "group"; id: string }
  | { type: "permission"; id: string }

export function AccessWorkspace({
  kind,
  title,
  description,
  groups,
  permissions,
  canManage,
  canRemoveMembers,
  creatorId,
  schemas = [],
  candidates = [],
  implicitMembers,
  addMemberMode,
  inviteLabel,
  inviteDescription,
  onInvite,
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
  isLoading,
  error,
  onError,
  formatError,
}: {
  kind: "network" | "organization"
  title: string
  description: string
  headerActions?: ReactNode
  groups: ApiAccessGroup[]
  permissions: ApiAccessPermission[]
  canManage: boolean
  canRemoveMembers: boolean
  creatorId?: string
  schemas?: AccessSchemaOption[]
  candidates?: AccessCandidate[]
  implicitMembers?: AccessCandidate[]
  addMemberMode: "email" | "select"
  inviteLabel?: string
  inviteDescription?: string
  onInvite?: (email: string) => Promise<void>
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
  isLoading?: boolean
  error?: string
  onError: (message: string) => void
  formatError: (err: unknown, fallback: string) => string
}) {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(
    null
  )
  const [inviteEmail, setInviteEmail] = useState("")
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [permissionName, setPermissionName] = useState("")
  const [permissionDescription, setPermissionDescription] = useState("")
  const [grants, setGrants] = useState<ApiGrant[]>([])
  const [memberValue, setMemberValue] = useState("")
  const [busy, setBusy] = useState(false)

  const selectedGroup =
    selection?.type === "group"
      ? groups.find((group) => group.id === selection.id)
      : undefined
  const selectedPermission =
    selection?.type === "permission"
      ? permissions.find((permission) => permission.id === selection.id)
      : undefined

  useEffect(() => {
    if (selectedGroup || selectedPermission) {
      return
    }
    const preferred =
      groups.find((group) => group.slug === "members") ??
      groups.find((group) => group.slug === "everyone") ??
      groups[0]
    if (preferred) {
      setSelection({ type: "group", id: preferred.id })
    }
  }, [groups, selectedGroup, selectedPermission])

  const groupPeople = useMemo(() => {
    if (!selectedGroup) {
      return [] as ApiAccessMember[]
    }
    if (selectedGroup.slug === "everyone" && implicitMembers) {
      return implicitMembers
    }
    return selectedGroup.members
  }, [implicitMembers, selectedGroup])

  const mergedRows = useMemo(() => {
    if (!selectedGroup) {
      return []
    }
    return outlineRows(
      grantsFromPermissions(permissions, selectedGroup.permissionIds),
      kind
    )
  }, [kind, permissions, selectedGroup])

  const attachedPermissions = permissions.filter((permission) =>
    selectedGroup?.permissionIds.includes(permission.id)
  )

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

  async function submitInvite(event: FormEvent) {
    event.preventDefault()
    if (!onInvite) {
      return
    }
    setBusy(true)
    try {
      await onInvite(inviteEmail)
      setInviteEmail("")
      setInviteOpen(false)
    } catch (err) {
      onError(formatError(err, "Could not invite that person."))
    } finally {
      setBusy(false)
    }
  }

  async function submitGroup(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      if (editingGroupId) {
        await onUpdateGroup(editingGroupId, groupName, groupDescription)
      } else {
        const id = await onCreateGroup(groupName, groupDescription)
        setSelection({ type: "group", id })
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
        setSelection({ type: "permission", id })
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

  return (
    <div className="flex min-h-[calc(100svh-var(--app-header-height))] min-w-0 flex-1 flex-col overflow-hidden bg-muted/40">
      <header className="shrink-0 border-b bg-background px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Access</p>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {headerActions}
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {onInvite ? (
                <Button variant="outline" onClick={() => setInviteOpen(true)}>
                  <UserPlusIcon />
                  Invite
                </Button>
              ) : null}
              <Button variant="outline" onClick={openNewGroup}>
                <PlusIcon />
                Add group
              </Button>
              <Button onClick={openNewOutline}>
                <PlusIcon />
                Add permission
              </Button>
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
        <aside className="w-full shrink-0 border-b bg-background lg:flex lg:h-full lg:w-72 lg:flex-col lg:overflow-hidden lg:border-r lg:border-b-0">
          <div className="space-y-6 overflow-y-auto p-4 lg:min-h-0 lg:flex-1">
            <RailSection
              icon={<UsersIcon className="size-3.5" />}
              label="Groups"
              hint="Who"
            >
              {isLoading && groups.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  Loading groups…
                </p>
              ) : null}
              {groups.map((group) => (
                <RailItem
                  key={group.id}
                  active={selectedGroup?.id === group.id}
                  onClick={() => setSelection({ type: "group", id: group.id })}
                  title={group.name}
                  subtitle={
                    group.slug === "everyone"
                      ? "Everyone in this organization"
                      : `${group.members.length} ${
                          group.members.length === 1 ? "person" : "people"
                        }`
                  }
                  action={
                    canManage ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEditGroup(group)}
                      >
                        <PencilIcon />
                        <span className="sr-only">Edit {group.name}</span>
                      </Button>
                    ) : null
                  }
                />
              ))}
            </RailSection>
            <RailSection
              icon={<ShieldIcon className="size-3.5" />}
              label="Permissions"
              hint="What"
            >
              {permissions.map((permission) => (
                <RailItem
                  key={permission.id}
                  active={selectedPermission?.id === permission.id}
                  onClick={() =>
                    setSelection({ type: "permission", id: permission.id })
                  }
                  title={permission.name}
                  subtitle={outlineSummary(outlineRows(permission.grants, kind))}
                  action={
                    canManage && !permission.system ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditOutline(permission)
                        }}
                      >
                        <PencilIcon />
                        <span className="sr-only">Edit {permission.name}</span>
                      </Button>
                    ) : null
                  }
                />
              ))}
              {permissions.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  Create a permission, then attach it.
                </p>
              ) : null}
            </RailSection>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {selectedGroup ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Group
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">
                      {selectedGroup.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedGroup.description ||
                        "People in this group receive every attached permission."}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-1">
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
                            void run(
                              () => onDeleteGroup(selectedGroup.id),
                              "Could not delete group."
                            )
                          }
                        >
                          <Trash2Icon />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Permissions on this group
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These permissions are attached. Access from each one adds
                      up.
                    </p>
                  </div>
                  {canManage ? (
                    <Button variant="outline" size="sm" onClick={openNewOutline}>
                      <PlusIcon />
                      Add permission
                    </Button>
                  ) : null}
                </div>
                {attachedPermissions.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No permissions attached yet.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
                    {attachedPermissions.map((permission) => (
                      <li
                        key={permission.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() =>
                            setSelection({
                              type: "permission",
                              id: permission.id,
                            })
                          }
                        >
                          <p className="text-sm font-medium">{permission.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {outlineSummary(outlineRows(permission.grants, kind))}
                          </p>
                        </button>
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
                              onClick={() =>
                                void run(
                                  () =>
                                    onUnassign(
                                      selectedGroup.id,
                                      permission.id
                                    ),
                                  "Could not detach that permission."
                                )
                              }
                            >
                              Detach
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {canManage &&
                permissions.some(
                  (permission) =>
                    !selectedGroup.permissionIds.includes(permission.id)
                ) ? (
                  <form className="mt-4">
                    <NativeSelect
                      value=""
                      onChange={(event) => {
                        const permissionId = event.target.value
                        if (!permissionId) {
                          return
                        }
                        void run(
                          () => onAssign(selectedGroup.id, permissionId),
                          "Could not attach that permission."
                        )
                      }}
                    >
                      <NativeSelectOption value="">
                        Attach a permission…
                      </NativeSelectOption>
                      {permissions
                        .filter(
                          (permission) =>
                            !selectedGroup.permissionIds.includes(permission.id)
                        )
                        .map((permission) => (
                          <NativeSelectOption
                            key={permission.id}
                            value={permission.id}
                          >
                            {permission.name}
                          </NativeSelectOption>
                        ))}
                    </NativeSelect>
                  </form>
                ) : null}
              </section>

              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
                <p className="text-xs font-medium text-muted-foreground">
                  What they can do
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  {outlineSummary(mergedRows)}
                </h3>
                <div className="mt-3">
                  <AccessOutline
                    rows={mergedRows}
                    schemas={schemas}
                    empty="Attach a permission to give this group access."
                  />
                </div>
              </section>

              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
                <p className="text-xs font-medium text-muted-foreground">
                  Who is in this group
                </p>
                {implicit ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Membership is automatic for every organization user.
                  </p>
                ) : null}
                {groupPeople.length === 0 && !implicit ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No people yet. Add someone to this group.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y">
                    {groupPeople.map((person) => {
                      const locked = person.id === creatorId
                      return (
                        <li
                          key={person.id}
                          className="flex items-center justify-between gap-3 py-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar size="sm">
                              <AvatarFallback>
                                {personInitials(person)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {personName(person)}
                                {locked ? (
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    Creator
                                  </span>
                                ) : null}
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
                              onClick={() =>
                                void run(
                                  () =>
                                    onRemoveMember(
                                      selectedGroup.id,
                                      person.id
                                    ),
                                  "Could not remove that person."
                                )
                              }
                            >
                              Remove
                            </Button>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
                {canManage && !implicit ? (
                  <form className="mt-4 flex gap-2" onSubmit={addToGroup}>
                    {addMemberMode === "email" ? (
                      <Input
                        type="email"
                        value={memberValue}
                        onChange={(event) => setMemberValue(event.target.value)}
                        placeholder="Add by email"
                        required
                      />
                    ) : (
                      <NativeSelect
                        value={memberValue}
                        onChange={(event) => setMemberValue(event.target.value)}
                        required
                      >
                        <NativeSelectOption value="">
                          Add organization user
                        </NativeSelectOption>
                        {candidates
                          .filter(
                            (person) =>
                              !groupPeople.some((member) => member.id === person.id)
                          )
                          .map((person) => (
                            <NativeSelectOption key={person.id} value={person.id}>
                              {personName(person)}
                            </NativeSelectOption>
                          ))}
                      </NativeSelect>
                    )}
                    <Button type="submit" variant="outline">
                      Add
                    </Button>
                  </form>
                ) : null}
              </section>
            </div>
          ) : null}

          {selectedPermission ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Permission
                      {selectedPermission.system ? (
                        <span className="ml-2 font-normal">Built-in</span>
                      ) : null}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">
                      {selectedPermission.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedPermission.description ||
                        "A named set of actions you can attach to groups."}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex gap-1">
                      {!selectedPermission.system ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditOutline(selectedPermission)}
                        >
                          <PencilIcon />
                          Edit
                        </Button>
                      ) : null}
                      {!selectedPermission.system ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            void run(
                              () => onDeletePermission(selectedPermission.id),
                              "Could not delete that permission."
                            )
                          }
                        >
                          <Trash2Icon />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
                <p className="text-xs font-medium text-muted-foreground">
                  Attached to
                </p>
                {groups.filter((group) =>
                  group.permissionIds.includes(selectedPermission.id)
                ).length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Not attached to any group yet.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
                    {groups
                      .filter((group) =>
                        group.permissionIds.includes(selectedPermission.id)
                      )
                      .map((group) => (
                        <li key={group.id}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                            onClick={() =>
                              setSelection({ type: "group", id: group.id })
                            }
                          >
                            <span className="text-sm font-medium">{group.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {group.slug === "everyone"
                                ? "Everyone"
                                : `${group.members.length} people`}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
              <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
                <p className="text-xs font-medium text-muted-foreground">
                  What this permission allows
                </p>
                <div className="mt-3">
                  <AccessOutline
                    rows={outlineRows(selectedPermission.grants, kind)}
                    schemas={schemas}
                  />
                </div>
              </section>
            </div>
          ) : null}

          {!selectedGroup && !selectedPermission && !isLoading ? (
            <div className="mx-auto max-w-lg rounded-2xl bg-card p-8 text-center shadow-xs ring-1 ring-foreground/10">
              <p className="text-sm font-medium">Start with a group</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Groups hold people. Permissions describe what those
                people can do. Attach a permission to a group to grant it.
              </p>
            </div>
          ) : null}
        </main>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form onSubmit={submitInvite}>
            <DialogHeader>
              <DialogTitle>{inviteLabel ?? "Invite someone"}</DialogTitle>
              <DialogDescription>
                {inviteDescription ??
                  "They must already have an account. Invites join Members."}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  required
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={busy}>
                Invite
              </Button>
            </DialogFooter>
          </form>
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
                  : "A group is a named set of people. Attach permissions to decide what they can do."}
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

      <Dialog open={outlineOpen} onOpenChange={setOutlineOpen}>
        <DialogContent className="sm:max-w-3xl">
          <form onSubmit={submitOutline}>
            <DialogHeader>
              <DialogTitle>
                {editingPermissionId ? "Edit permission" : "Create permission"}
              </DialogTitle>
              <DialogDescription>
                Name this permission, then choose the actions it should grant.
                Attach it to groups after you save.
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

function RailSection({
  icon,
  label,
  hint,
  children,
}: {
  icon: ReactNode
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2 px-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </p>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function RailItem({
  active,
  title,
  subtitle,
  onClick,
  action,
}: {
  active: boolean
  title: string
  subtitle: string
  onClick: () => void
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-start rounded-lg",
        active ? "bg-muted text-foreground" : "hover:bg-muted/60"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 px-2 py-2 text-left"
      >
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </button>
      {action ? <div className="shrink-0 pr-1 pt-1">{action}</div> : null}
    </div>
  )
}
