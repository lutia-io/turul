import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { Network, Organization } from "@/data/networks"
import { organizationUserName } from "@/lib/network-workspace"

export type CreateActorUser = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function CreateActorFields({
  formId,
  networks,
  organizations,
  organizationUsers,
  selectedNetworkId,
  selectedOrganizationId,
  selectedOrganizationUserId,
  onNetworkChange,
  onOrganizationChange,
  onOrganizationUserChange,
  lockNetwork,
  lockOrganization,
  disabled,
}: {
  formId: string
  networks: Network[]
  organizations: Organization[]
  organizationUsers: CreateActorUser[]
  selectedNetworkId: string
  selectedOrganizationId: string
  selectedOrganizationUserId: string
  onNetworkChange: (networkId: string) => void
  onOrganizationChange: (organizationId: string) => void
  onOrganizationUserChange: (organizationUserId: string) => void
  lockNetwork?: boolean
  lockOrganization?: boolean
  disabled?: boolean
}) {
  return (
    <>
      {networks.length > 0 ? (
        <Field>
          <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
          <NativeSelect
            id={`${formId}-network`}
            value={selectedNetworkId}
            disabled={lockNetwork || disabled}
            onChange={(event) => onNetworkChange(event.target.value)}
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
      {organizations.length > 0 ? (
        <Field>
          <FieldLabel htmlFor={`${formId}-organization`}>
            Organization
          </FieldLabel>
          <NativeSelect
            id={`${formId}-organization`}
            value={selectedOrganizationId}
            disabled={lockOrganization || disabled}
            onChange={(event) => onOrganizationChange(event.target.value)}
            required
          >
            {organizations.map((organization) => (
              <NativeSelectOption key={organization.id} value={organization.id}>
                {organization.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      ) : (
        <p className="text-sm text-muted-foreground">
          Create an organization in this network first.
        </p>
      )}
      {selectedOrganizationId ? (
        organizationUsers.length > 0 ? (
          <Field>
            <FieldLabel htmlFor={`${formId}-organization-user`}>
              Organization user
            </FieldLabel>
            <NativeSelect
              id={`${formId}-organization-user`}
              value={selectedOrganizationUserId}
              disabled={disabled}
              onChange={(event) =>
                onOrganizationUserChange(event.target.value)
              }
              required
            >
              {organizationUsers.map((user) => (
                <NativeSelectOption key={user.id} value={user.id}>
                  {organizationUserName(user)} · {user.email}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>
              Created as this organization user.
            </FieldDescription>
          </Field>
        ) : (
          <p className="text-sm text-muted-foreground">
            Create an organization user in this organization first.
          </p>
        )
      ) : null}
    </>
  )
}
