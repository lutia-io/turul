import { useLocation, useNavigate } from "react-router"

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
  networkWorkspacePath,
  parseNetworkPath,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useDeleteOrganizationMutation } from "@/store/organization-slice"

export function DeleteOrganizationDialog({
  organization,
  open,
  onOpenChange,
}: {
  organization: { id: string; name: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [deleteOrganization, deleteState] = useDeleteOrganizationMutation()

  async function handleDelete() {
    if (!organization) {
      return
    }

    try {
      await deleteOrganization(organization.id).unwrap()
      onOpenChange(false)
      const parsed = parseNetworkPath(pathname)
      if (parsed?.organizationId === organization.id) {
        navigate(
          networkWorkspacePath({
            networkId: parsed.networkId,
            rest: parsed.rest || "organizations",
          })
        )
      }
    } catch {
      // Error is rendered from the mutation state.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          deleteState.reset()
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Delete {organization?.name ?? "this organization"}?
          </DialogTitle>
          <DialogDescription>
            This will permanently delete the organization. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {deleteState.error ? (
          <p className="text-sm text-destructive">
            {getHumaErrorMessage(
              deleteState.error,
              "Failed to delete organization"
            )}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={deleteState.isLoading} />
            }
          >
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteState.isLoading || !organization}
          >
            {deleteState.isLoading ? "Deleting..." : "Delete organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
