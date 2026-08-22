import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { CreateNetworkDialog } from "@/components/create-network-dialog"
import { CreateOrganizationDialog } from "@/components/create-organization-dialog"
import { CreateOrganizationUserDialog } from "@/components/create-organization-user-dialog"
import { PipelineDefinitionDialog } from "@/components/pipeline-definition-dialog"
import { SchemaDefinitionDialog } from "@/components/schema-definition-dialog"
import { WorkflowDefinitionDialog } from "@/components/workflow-definition-dialog"

type CreateState =
  | { kind: "network" }
  | { kind: "organization"; networkId?: string }
  | {
      kind: "organizationUser"
      networkId?: string
      organizationId?: string
    }
  | {
      kind: "schema"
      networkId?: string
      organizationId?: string
      schemaId?: string
    }
  | { kind: "workflow"; networkId?: string; workflowDefinitionId?: string }
  | { kind: "pipeline"; networkId?: string; pipelineDefinitionId?: string }
  | null

type CreateEntityContextValue = {
  openCreateNetwork: () => void
  openCreateOrganization: (networkId?: string) => void
  openCreateOrganizationUser: (scope?: {
    networkId?: string
    organizationId?: string
  }) => void
  openCreateSchema: (scope?: {
    networkId?: string
    organizationId?: string
  }) => void
  openEditSchema: (schemaId: string) => void
  openCreateWorkflow: (networkId?: string) => void
  openEditWorkflow: (workflowDefinitionId: string) => void
  openCreatePipeline: (networkId?: string) => void
  openEditPipeline: (pipelineDefinitionId: string) => void
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
      openCreateOrganizationUser(scope) {
        setState({ kind: "organizationUser", ...scope })
      },
      openCreateSchema(scope) {
        setState({ kind: "schema", ...scope })
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
      <CreateOrganizationUserDialog
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
      />
      <SchemaDefinitionDialog
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
