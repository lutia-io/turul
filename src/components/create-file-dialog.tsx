import { useEffect, useId, useState, type FormEvent } from "react"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { createFile } from "@/data/files"
import { networkList } from "@/data/networks"
import { networkWorkspacePath } from "@/lib/network-workspace"

const contentTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]

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
  const [selectedNetworkId, setSelectedNetworkId] = useState(
    networkId ?? networkList[0]?.id ?? ""
  )
  const selectedNetwork = networkList.find(
    (network) => network.id === selectedNetworkId
  )
  const organizations = selectedNetwork?.organizations ?? []
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId ?? organizations[0]?.id ?? ""
  )
  const [filename, setFilename] = useState("")
  const [contentType, setContentType] = useState("application/pdf")
  const [sizeBytes, setSizeBytes] = useState("128000")

  useEffect(() => {
    if (!open) {
      return
    }

    const nextNetworkId = networkId ?? networkList[0]?.id ?? ""
    const nextNetwork = networkList.find(
      (network) => network.id === nextNetworkId
    )
    setSelectedNetworkId(nextNetworkId)
    setSelectedOrganizationId(
      organizationId ?? nextNetwork?.organizations[0]?.id ?? ""
    )
    setFilename("")
    setContentType("application/pdf")
    setSizeBytes("128000")
  }, [networkId, open, organizationId])

  function handleFile(file?: File) {
    if (!file) {
      return
    }

    setFilename(file.name)
    setContentType(file.type || "application/octet-stream")
    setSizeBytes(String(file.size))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!filename.trim() || !selectedNetworkId || !selectedOrganizationId) {
      return
    }

    const stored = createFile({
      filename,
      contentType,
      sizeBytes: Number.parseInt(sizeBytes, 10) || 0,
      organizationId: selectedOrganizationId,
      networkId: selectedNetworkId,
    })

    onOpenChange(false)
    navigate(
      networkWorkspacePath({
        networkId: selectedNetworkId,
        organizationId,
        rest: `files/${stored.id}`,
      })
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload a file</DialogTitle>
          <DialogDescription>
            Attach a local file or enter metadata. The file is stored as a
            workspace record that schemas can reference.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} autoComplete="off">
          <FieldGroup>
            {!networkId ? (
              <Field>
                <FieldLabel htmlFor={`${formId}-network`}>Network</FieldLabel>
                <NativeSelect
                  id={`${formId}-network`}
                  value={selectedNetworkId}
                  onChange={(event) => {
                    const nextId = event.target.value
                    const nextNetwork = networkList.find(
                      (network) => network.id === nextId
                    )
                    setSelectedNetworkId(nextId)
                    setSelectedOrganizationId(
                      organizationId ?? nextNetwork?.organizations[0]?.id ?? ""
                    )
                  }}
                  required
                >
                  {networkList.map((network) => (
                    <NativeSelectOption key={network.id} value={network.id}>
                      {network.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
            {!organizationId ? (
              <Field>
                <FieldLabel htmlFor={`${formId}-organization`}>
                  Organization
                </FieldLabel>
                {organizations.length > 0 ? (
                  <NativeSelect
                    id={`${formId}-organization`}
                    value={selectedOrganizationId}
                    onChange={(event) =>
                      setSelectedOrganizationId(event.target.value)
                    }
                    required
                  >
                    {organizations.map((organization) => (
                      <NativeSelectOption
                        key={organization.id}
                        value={organization.id}
                      >
                        {organization.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add an organization before uploading files.
                  </p>
                )}
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor={`${formId}-file`}>File</FieldLabel>
              <Input
                id={`${formId}-file`}
                type="file"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-filename`}>Filename</FieldLabel>
              <Input
                id={`${formId}-filename`}
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="invoice.pdf"
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${formId}-type`}>Content type</FieldLabel>
                <NativeSelect
                  id={`${formId}-type`}
                  value={contentType}
                  onChange={(event) => setContentType(event.target.value)}
                >
                  {contentTypes.map((type) => (
                    <NativeSelectOption key={type} value={type}>
                      {type}
                    </NativeSelectOption>
                  ))}
                  {contentTypes.includes(contentType) ? null : (
                    <NativeSelectOption value={contentType}>
                      {contentType}
                    </NativeSelectOption>
                  )}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-size`}>Size (bytes)</FieldLabel>
                <Input
                  id={`${formId}-size`}
                  type="number"
                  min="0"
                  value={sizeBytes}
                  onChange={(event) => setSizeBytes(event.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={
              !filename.trim() || !selectedNetworkId || !selectedOrganizationId
            }
          >
            Upload file
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
