import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useLocation, useNavigate } from "react-router"

import { CreateFileDialog } from "@/components/create-file-dialog"
import { CreateNetworkDialog } from "@/components/create-network-dialog"
import { CreateOrganizationDialog } from "@/components/create-organization-dialog"
import { CreateOrganizationUserDialog } from "@/components/create-organization-user-dialog"
import { CreateRecordDialog } from "@/components/create-record-dialog"
import { PipelineDefinitionDialog } from "@/components/pipeline-definition-dialog"
import { SchemaDefinitionDialog } from "@/components/schema-definition-dialog"
import { WorkflowDefinitionDialog } from "@/components/workflow-definition-dialog"
import { networkWorkspacePath, parseNetworkPath } from "@/lib/network-workspace"

type CreateState =
  | { kind: "network"; networkId?: string }
  | { kind: "organization"; networkId?: string; organizationId?: string }
  | {
      kind: "organizationUser"
      networkId?: string
      organizationId?: string
      organizationUserId?: string
    }
  | {
      kind: "schema"
      networkId?: string
      organizationId?: string
      schemaId?: string
    }
  | { kind: "workflow"; networkId?: string; organizationId?: string }
  | { kind: "pipeline"; networkId?: string; organizationId?: string }
  | {
      kind: "record"
      networkId?: string
      organizationId?: string
      schemaId?: string
      recordId?: string
    }
  | { kind: "file"; networkId?: string; organizationId?: string }
  | null

type DialogKind = NonNullable<CreateState>["kind"]

const initialDialogKeys: Record<DialogKind, number> = {
  network: 0,
  organization: 0,
  organizationUser: 0,
  schema: 0,
  workflow: 0,
  pipeline: 0,
  record: 0,
  file: 0,
}

type CreateEntityContextValue = {
  openCreateNetwork: () => void
  openEditNetwork: (networkId: string) => void
  openCreateOrganization: (networkId?: string) => void
  openEditOrganization: (organizationId: string) => void
  openCreateOrganizationUser: (scope?: {
    networkId?: string
    organizationId?: string
  }) => void
  openEditOrganizationUser: (organizationUserId: string) => void
  openCreateSchema: (scope?: {
    networkId?: string
    organizationId?: string
  }) => void
  openEditSchema: (schemaId: string) => void
  openCreateWorkflow: (scope?: {
    networkId?: string
    organizationId?: string
  }) => void
  openEditWorkflow: (workflowDefinitionId: string) => void
  openCreatePipeline: (scope?: {
    networkId?: string
    organizationId?: string
  }) => void
  openEditPipeline: (pipelineDefinitionId: string) => void
  openCreateRecord: (scope?: {
    networkId?: string
    organizationId?: string
    schemaId?: string
  }) => void
  openEditRecord: (recordId: string) => void
  openCreateFile: (scope?: {
    networkId?: string
    organizationId?: string
  }) => void
}

const CreateEntityContext = createContext<CreateEntityContextValue | null>(null)

export function CreateEntityProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState<CreateState>(null)
  const [dialogKeys, setDialogKeys] = useState(initialDialogKeys)

  const value = useMemo<CreateEntityContextValue>(() => {
    function open(next: NonNullable<CreateState>) {
      setDialogKeys((keys) => ({
        ...keys,
        [next.kind]: keys[next.kind] + 1,
      }))
      setState(next)
    }

    return {
      openCreateNetwork() {
        open({ kind: "network" })
      },
      openEditNetwork(networkId) {
        open({ kind: "network", networkId })
      },
      openCreateOrganization(networkId) {
        open({ kind: "organization", networkId })
      },
      openEditOrganization(organizationId) {
        open({ kind: "organization", organizationId })
      },
      openCreateOrganizationUser(scope) {
        open({ kind: "organizationUser", ...scope })
      },
      openEditOrganizationUser(organizationUserId) {
        open({ kind: "organizationUser", organizationUserId })
      },
      openCreateSchema(scope) {
        open({ kind: "schema", ...scope })
      },
      openEditSchema(schemaId) {
        open({ kind: "schema", schemaId })
      },
      openCreateWorkflow(scope) {
        open({ kind: "workflow", ...scope })
      },
      openEditWorkflow(workflowDefinitionId) {
        const parsed = parseNetworkPath(location.pathname)
        if (!parsed) {
          return
        }
        navigate(
          `${networkWorkspacePath({
            networkId: parsed.networkId,
            organizationId: parsed.organizationId,
            rest: `workflow-definitions/${workflowDefinitionId}`,
          })}?edit=1`
        )
      },
      openCreatePipeline(scope) {
        open({ kind: "pipeline", ...scope })
      },
      openEditPipeline(pipelineDefinitionId) {
        const parsed = parseNetworkPath(location.pathname)
        if (!parsed) {
          return
        }
        navigate(
          `${networkWorkspacePath({
            networkId: parsed.networkId,
            organizationId: parsed.organizationId,
            rest: `pipeline-definitions/${pipelineDefinitionId}`,
          })}?edit=1`
        )
      },
      openCreateRecord(scope) {
        open({ kind: "record", ...scope })
      },
      openEditRecord(recordId) {
        open({ kind: "record", recordId })
      },
      openCreateFile(scope) {
        open({ kind: "file", ...scope })
      },
    }
  }, [location.pathname, navigate])

  function close() {
    setState(null)
  }

  return (
    <CreateEntityContext.Provider value={value}>
      {children}
      <CreateNetworkDialog
        key={`network-${dialogKeys.network}`}
        open={state?.kind === "network"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "network" ? state.networkId : undefined}
      />
      <CreateOrganizationDialog
        key={`organization-${dialogKeys.organization}`}
        open={state?.kind === "organization"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "organization" ? state.networkId : undefined}
        organizationId={
          state?.kind === "organization" ? state.organizationId : undefined
        }
      />
      <CreateOrganizationUserDialog
        key={`organizationUser-${dialogKeys.organizationUser}`}
        open={state?.kind === "organizationUser"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={
          state?.kind === "organizationUser" ? state.networkId : undefined
        }
        organizationId={
          state?.kind === "organizationUser" ? state.organizationId : undefined
        }
        organizationUserId={
          state?.kind === "organizationUser"
            ? state.organizationUserId
            : undefined
        }
      />
      <SchemaDefinitionDialog
        key={`schema-${dialogKeys.schema}`}
        open={state?.kind === "schema"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "schema" ? state.networkId : undefined}
        organizationId={
          state?.kind === "schema" ? state.organizationId : undefined
        }
        schemaId={state?.kind === "schema" ? state.schemaId : undefined}
      />
      <WorkflowDefinitionDialog
        key={`workflow-${dialogKeys.workflow}`}
        open={state?.kind === "workflow"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "workflow" ? state.networkId : undefined}
        organizationId={
          state?.kind === "workflow" ? state.organizationId : undefined
        }
      />
      <PipelineDefinitionDialog
        key={`pipeline-${dialogKeys.pipeline}`}
        open={state?.kind === "pipeline"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "pipeline" ? state.networkId : undefined}
        organizationId={
          state?.kind === "pipeline" ? state.organizationId : undefined
        }
      />
      <CreateRecordDialog
        key={`record-${dialogKeys.record}`}
        open={state?.kind === "record"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "record" ? state.networkId : undefined}
        organizationId={
          state?.kind === "record" ? state.organizationId : undefined
        }
        schemaId={state?.kind === "record" ? state.schemaId : undefined}
        recordId={state?.kind === "record" ? state.recordId : undefined}
      />
      <CreateFileDialog
        key={`file-${dialogKeys.file}`}
        open={state?.kind === "file"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "file" ? state.networkId : undefined}
        organizationId={
          state?.kind === "file" ? state.organizationId : undefined
        }
      />
    </CreateEntityContext.Provider>
  )
}

export function useCreateEntity() {
  const context = useContext(CreateEntityContext)
  if (!context) {
    throw new Error("useCreateEntity must be used within CreateEntityProvider")
  }
  return context
}
