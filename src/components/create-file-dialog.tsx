import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import { CreateActorFields } from "@/components/create-actor-fields"
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
import {
  networkWorkspacePath,
  useWorkspaceNetworkList,
  useWorkspaceOrganizations,
  workspaceOrganizationUserFromApi,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useCreateFileMutation } from "@/store/file-slice"
import { useListOrganizationUsersQuery } from "@/store/organization-user-slice"

export function CreateFileDialog({
  open,
  onOpenChange,
  networkId,
  organizationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  networkId?: string
  organizationId?: string
}) {
  const navigate = useNavigate()
  const formId = useId()
  const { networks } = useWorkspaceNetworkList()
  const { organizations } = useWorkspaceOrganizations({ skip: !open })
  const lockNetwork = Boolean(networkId)
  const lockOrganization = Boolean(organizationId)
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networks[0]?.id ?? ""
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId ?? ""
  )
  const [selectedOrganizationUserId, setSelectedOrganizationUserId] =
    useState("")
  const [file, setFile] = useState<File | null>(null)
  const [filename, setFilename] = useState("")
  const [createFile, createState] = useCreateFileMutation()
  const firstNetworkId = networks[0]?.id ?? ""
  const networkOrganizations = useMemo(
    () =>
      organizations.filter(
        (organization) => organization.networkId === selectedNetworkId
      ),
    [organizations, selectedNetworkId]
  )
  const firstOrganizationId = networkOrganizations[0]?.id ?? ""
  const organizationUsersQuery = useListOrganizationUsersQuery(
    {
      networkId: selectedNetworkId,
      organizationId: selectedOrganizationId,
      pageSize: 100,
      sort: "name",
      order: "asc",
    },
    { skip: !open || !selectedNetworkId || !selectedOrganizationId }
  )
  const organizationUsers = useMemo(
    () =>
      (organizationUsersQuery.data?.items ?? []).map(
        workspaceOrganizationUserFromApi
      ),
    [organizationUsersQuery.data]
  )
  const firstOrganizationUserId = organizationUsers[0]?.id ?? ""

  useEffect(() => {
    createState.reset()
    setFile(null)
    setFilename("")
    // Reset only when the dialog opens or closes. `reset` changes after each
    // mutation (it closes over requestId) and would clear a 409 before render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedNetworkId((current) => {
      if (networkId) {
        return networkId
      }
      return current || firstNetworkId
    })
  }, [firstNetworkId, networkId, open])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedOrganizationId((current) => {
      if (organizationId) {
        return organizationId
      }
      if (networkOrganizations.some((item) => item.id === current)) {
        return current
      }
      return firstOrganizationId
    })
  }, [firstOrganizationId, networkOrganizations, open, organizationId])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedOrganizationUserId((current) => {
      if (organizationUsers.some((item) => item.id === current)) {
        return current
      }
      return firstOrganizationUserId
    })
  }, [firstOrganizationUserId, open, organizationUsers])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedFilename = filename.trim()
    if (!file || !selectedOrganizationUserId || !selectedNetworkId) {
      return
    }

    try {
      const created = await createFile({
        file,
        filename: trimmedFilename || undefined,
        organizationUserId: selectedOrganizationUserId,
      }).unwrap()
      onOpenChange(false)
      navigate(
        networkWorkspacePath({
          networkId: selectedNetworkId,
          organizationId: organizationId ?? undefined,
          rest: `files/${created.id}`,
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
          <DialogTitle>Upload a file</DialogTitle>
          <DialogDescription>
            Files belong to an organization user and can be referenced from
            record data.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} autoComplete="off">
          <FieldGroup>
            <CreateActorFields
              formId={formId}
              networks={networks}
              organizations={networkOrganizations}
              organizationUsers={organizationUsers}
              selectedNetworkId={selectedNetworkId}
              selectedOrganizationId={selectedOrganizationId}
              selectedOrganizationUserId={selectedOrganizationUserId}
              onNetworkChange={setSelectedNetworkId}
              onOrganizationChange={setSelectedOrganizationId}
              onOrganizationUserChange={setSelectedOrganizationUserId}
              lockNetwork={lockNetwork}
              lockOrganization={lockOrganization}
              disabled={createState.isLoading}
            />
            <Field data-invalid={createState.error ? true : undefined}>
              <FieldLabel htmlFor={`${formId}-file`}>File</FieldLabel>
              <Input
                id={`${formId}-file`}
                type="file"
                required
                disabled={createState.isLoading}
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null
                  setFile(next)
                  if (next && !filename.trim()) {
                    setFilename(next.name)
                  }
                }}
                aria-invalid={createState.error ? true : undefined}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-filename`}>Filename</FieldLabel>
              <Input
                id={`${formId}-filename`}
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder={file?.name}
                disabled={createState.isLoading}
              />
            </Field>
            {createState.error ? (
              <FieldError>{getHumaErrorMessage(createState.error)}</FieldError>
            ) : null}
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={createState.isLoading} />
            }
          >
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={
              createState.isLoading ||
              !file ||
              !selectedNetworkId ||
              !selectedOrganizationId ||
              !selectedOrganizationUserId
            }
          >
            {createState.isLoading ? "Uploading..." : "Upload file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
