import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { CreateFileDialog } from "@/components/create-file-dialog"
import { CreateNetworkDialog } from "@/components/create-network-dialog"
import { CreateOrganizationDialog } from "@/components/create-organization-dialog"
import { CreateRecordDialog } from "@/components/create-record-dialog"
import { PipelineDefinitionDialog } from "@/components/pipeline-definition-dialog"
import { SchemaDefinitionDialog } from "@/components/schema-definition-dialog"
import { WorkflowDefinitionDialog } from "@/components/workflow-definition-dialog"

type CreateState =
  | { kind: "network" }
  | { kind: "organization"; networkId?: string }
  | { kind: "schema"; networkId?: string; schemaId?: string }
  | { kind: "workflow"; networkId?: string; workflowDefinitionId?: string }
  | { kind: "pipeline"; networkId?: string; pipelineDefinitionId?: string }
  | {
      kind: "record"
      networkId?: string
      organizationId?: string
      schemaId?: string
    }
  | { kind: "file"; networkId?: string; organizationId?: string }
  | null

type CreateEntityContextValue = {
  openCreateNetwork: () => void
  openCreateOrganization: (networkId?: string) => void
  openCreateSchema: (networkId?: string) => void
  openEditSchema: (schemaId: string) => void
  openCreateWorkflow: (networkId?: string) => void
  openEditWorkflow: (workflowDefinitionId: string) => void
  openCreatePipeline: (networkId?: string) => void
  openEditPipeline: (pipelineDefinitionId: string) => void
  openCreateRecord: (scope?: {
    networkId?: string
    organizationId?: string
    schemaId?: string
  }) => void
  openCreateFile: (scope?: {
    networkId?: string
    organizationId?: string
  }) => void
}

const CreateEntityContext = createContext<CreateEntityContextValue | null>(null)

export function CreateEntityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreateState>(null)

  const value = useMemo<CreateEntityContextValue>(
    () => ({
      openCreateNetwork() {
        setState({ kind: "network" })
      },
      openCreateOrganization(networkId) {
        setState({ kind: "organization", networkId })
      },
      openCreateSchema(networkId) {
        setState({ kind: "schema", networkId })
      },
      openEditSchema(schemaId) {
        setState({ kind: "schema", schemaId })
      },
      openCreateWorkflow(networkId) {
        setState({ kind: "workflow", networkId })
      },
      openEditWorkflow(workflowDefinitionId) {
        setState({ kind: "workflow", workflowDefinitionId })
      },
      openCreatePipeline(networkId) {
        setState({ kind: "pipeline", networkId })
      },
      openEditPipeline(pipelineDefinitionId) {
        setState({ kind: "pipeline", pipelineDefinitionId })
      },
      openCreateRecord(scope) {
        setState({ kind: "record", ...scope })
      },
      openCreateFile(scope) {
        setState({ kind: "file", ...scope })
      },
    }),
    []
  )

  function close() {
    setState(null)
  }

  return (
    <CreateEntityContext.Provider value={value}>
      {children}
      <CreateNetworkDialog
        open={state?.kind === "network"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
      />
      <CreateOrganizationDialog
        open={state?.kind === "organization"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "organization" ? state.networkId : undefined}
      />
      <SchemaDefinitionDialog
        open={state?.kind === "schema"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "schema" ? state.networkId : undefined}
        schemaId={state?.kind === "schema" ? state.schemaId : undefined}
      />
      <WorkflowDefinitionDialog
        open={state?.kind === "workflow"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "workflow" ? state.networkId : undefined}
        workflowDefinitionId={
          state?.kind === "workflow" ? state.workflowDefinitionId : undefined
        }
      />
      <PipelineDefinitionDialog
        open={state?.kind === "pipeline"}
        onOpenChange={(open) => {
          if (!open) {
            close()
          }
        }}
        networkId={state?.kind === "pipeline" ? state.networkId : undefined}
        pipelineDefinitionId={
          state?.kind === "pipeline" ? state.pipelineDefinitionId : undefined
        }
      />
      <CreateRecordDialog
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
      />
      <CreateFileDialog
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
