import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspaceOrganizations,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import {
  useCreateOrganizationUserMutation,
  useGetOrganizationUserQuery,
  useUpdateOrganizationUserMutation,
} from "@/store/organization-user-slice"

export function CreateOrganizationUserDialog({
  open,
  onOpenChange,
  networkId,
  organizationId,
  organizationUserId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  organizationId?: string
  organizationUserId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const { organizations } = useWorkspaceOrganizations({ skip: !open })
  const editing = Boolean(organizationUserId)
  const lockNetwork = Boolean(networkId) || editing
  const lockOrganization = Boolean(organizationId) || editing
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networks[0]?.id ?? ""
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId ?? ""
  )
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [createOrganizationUser, createState] =
    useCreateOrganizationUserMutation()
  const [updateOrganizationUser, updateState] =
    useUpdateOrganizationUserMutation()
  const isLoading = createState.isLoading || updateState.isLoading
  const error = createState.error ?? updateState.error
  const existingQuery = useGetOrganizationUserQuery(organizationUserId ?? "", {
    skip: !open || !organizationUserId,
  })
  const firstNetworkId = networks[0]?.id ?? ""
  const networkOrganizations = useMemo(
    () =>
      organizations.filter(
        (organization) => organization.networkId === selectedNetworkId
      ),
    [organizations, selectedNetworkId]
  )
  const firstOrganizationId = networkOrganizations[0]?.id ?? ""

  useEffect(() => {
    if (!open) {
      return
    }
    createState.reset()
    updateState.reset()
    const current = organizationUserId ? existingQuery.currentData : undefined
    setFirstName(current?.firstName ?? "")
    setLastName(current?.lastName ?? "")
    setEmail(current?.email ?? "")
    setPassword("")
  }, [
    createState.reset,
    existingQuery.currentData,
    open,
    organizationUserId,
    updateState.reset,
  ])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedNetworkId((current) => {
      if (organizationUserId && existingQuery.currentData?.networkId) {
        return existingQuery.currentData.networkId
      }
      if (networkId) {
        return networkId
      }
      return current || firstNetworkId
    })
  }, [
    existingQuery.currentData?.networkId,
    firstNetworkId,
    networkId,
    open,
    organizationUserId,
  ])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedOrganizationId((current) => {
      if (organizationUserId && existingQuery.currentData?.organizationId) {
        return existingQuery.currentData.organizationId
      }
      if (organizationId) {
        return organizationId
      }
      if (networkOrganizations.some((item) => item.id === current)) {
        return current
      }
      return firstOrganizationId
    })
  }, [
    existingQuery.currentData?.organizationId,
    firstOrganizationId,
    networkOrganizations,
    open,
    organizationId,
    organizationUserId,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedEmail = email.trim()
    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      (!editing && !password) ||
      !selectedNetworkId ||
      !selectedOrganizationId
    ) {
      return
    }

    try {
      if (editing) {
        await updateOrganizationUser({
          id: organizationUserId!,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          password: password || undefined,
        }).unwrap()
        onOpenChange(false)
        return
      }

      const organizationUser = await createOrganizationUser({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        password,
        networkId: selectedNetworkId,
        organizationId: selectedOrganizationId,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: organizationId ?? undefined,
          rest: `organization-users/${organizationUser.id}`,
        })
      )
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit organization user" : "Create an organization user"}
          </DialogTitle>
          <DialogDescription>
            Organization users sign in to a specific organization in a network.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} autoComplete="off">
          <FieldGroup>
            {networks.length > 0 ? (
              <Field>
                <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                <NativeSelect
                  id={`${formId}-network`}
                  value={selectedNetworkId}
                  disabled={lockNetwork || isLoading}
                  onChange={(event) => setSelectedNetworkId(event.target.value)}
                  required
                >
                  {networks.map((network) => (
                    <NativeSelectOption key={network.id} value={network.id}>
                      {network.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            {networkOrganizations.length > 0 ? (
              <Field>
                <FieldLabel htmlFor={`${formId}-organization`}>
                  Organization
                </FieldLabel>
                <NativeSelect
                  id={`${formId}-organization`}
                  value={selectedOrganizationId}
                  disabled={lockOrganization || isLoading}
                  onChange={(event) =>
                    setSelectedOrganizationId(event.target.value)
                  }
                  required
                >
                  {networkOrganizations.map((organization) => (
                    <NativeSelectOption
                      key={organization.id}
                      value={organization.id}
                    >
                      {organization.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : (
              <p className="text-sm text-muted-foreground">
                Create an organization in this network before adding users.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor={`${formId}-first-name`}>
                  First name
                </FieldLabel>
                <Input
                  id={`${formId}-first-name`}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  required
                  disabled={isLoading}
                  aria-invalid={error ? true : undefined}
                />
              </Field>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor={`${formId}-last-name`}>
                  Last name
                </FieldLabel>
                <Input
                  id={`${formId}-last-name`}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  required
                  disabled={isLoading}
                  aria-invalid={error ? true : undefined}
                />
              </Field>
            </div>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
              <Input
                id={`${formId}-email`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jane.doe@example.com"
                autoComplete="email"
                required
                disabled={isLoading}
                aria-invalid={error ? true : undefined}
              />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`${formId}-password`}>
                {editing ? "New password" : "Password"}
              </FieldLabel>
              <Input
                id={`${formId}-password`}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required={!editing}
                disabled={isLoading}
                aria-invalid={error ? true : undefined}
                placeholder={
                  editing
                    ? "Leave blank to keep the current password"
                    : undefined
                }
              />
            </Field>
            {error ? (
              <FieldError>{getHumaErrorMessage(error)}</FieldError>
            ) : null}
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={isLoading} />}
          >
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={
              isLoading ||
              !firstName.trim() ||
              !lastName.trim() ||
              !email.trim() ||
              (!editing && !password) ||
              !selectedNetworkId ||
              !selectedOrganizationId
            }
          >
            {isLoading
              ? editing
                ? "Saving..."
                : "Creating..."
              : editing
                ? "Save organization user"
                : "Create organization user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
