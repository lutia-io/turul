import { useSyncExternalStore } from "react"
import { useLocation, useParams } from "react-router"

import type { StoredFile, StoredRecord } from "@/data/files"
import {
  getWorkspaceVersion,
  subscribeWorkspace,
  type Network,
  type Organization,
  type Schema,
  type WorkflowDefinition,
  type PipelineDefinition,
  type NodeDefinition,
} from "@/data/networks"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useGetNetworkQuery,
  useListNetworksQuery,
  type ApiNetwork,
} from "@/store/network-slice"
import {
  useGetOrganizationQuery,
  useListOrganizationsQuery,
  type ApiOrganization,
} from "@/store/organization-slice"
import { useListSchemasQuery, type ApiSchema } from "@/store/schema-slice"
import { useListRecordsQuery, type ApiRecord } from "@/store/record-slice"
import {
  useListFilesQuery,
  fileFromApi,
  type ApiFile,
} from "@/store/file-slice"
import {
  useListOrganizationUsersQuery,
  type ApiOrganizationUser,
} from "@/store/organization-user-slice"
import {
  useListWorkflowDefinitionsQuery,
  useListWorkflowsQuery,
  workflowDefinitionAsJson,
  type ApiWorkflowDefinition,
} from "@/store/workflow-slice"
import {
  useListPipelineDefinitionsQuery,
  useListPipelinesQuery,
  type ApiPipelineDefinition,
} from "@/store/pipeline-slice"
import {
  useListNodeDefinitionsQuery,
  type ApiNodeDefinition,
} from "@/store/node-slice"

export function useWorkspaceVersion() {
  return useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceVersion,
    getWorkspaceVersion
  )
}

export function networkWorkspacePath({
  networkId,
  organizationId,
  rest = "",
}: {
  networkId: string
  organizationId?: string | null
  rest?: string
}) {
  const organizationSegment = organizationId
    ? `/organizations/${organizationId}`
    : ""
  const restSegment = rest ? `/${rest}` : ""

  return `/app/networks/${networkId}${organizationSegment}${restSegment}`
}

export function parseNetworkPath(pathname: string) {
  const match = pathname.match(
    /^\/app\/networks\/([^/]+)(?:\/organizations\/([^/]+))?(?:\/(.*))?$/
  )

  if (!match) {
    return null
  }

  const [, networkId, organizationId, rest = ""] = match

  return {
    networkId,
    organizationId,
    rest,
  }
}

export function networkSectionRest(rest: string) {
  if (
    rest === "workflow-definitions" ||
    rest.startsWith("workflow-definitions/")
  ) {
    return "workflow-definitions"
  }

  if (
    rest === "pipeline-definitions" ||
    rest.startsWith("pipeline-definitions/")
  ) {
    return "pipeline-definitions"
  }

  if (rest === "node-definitions" || rest.startsWith("node-definitions/")) {
    return "pipeline-definitions"
  }

  if (rest === "workflows" || rest.startsWith("workflows/")) {
    return "workflows"
  }

  if (rest === "pipelines" || rest.startsWith("pipelines/")) {
    return "pipelines"
  }

  if (rest === "organizations" || rest.startsWith("organizations/")) {
    return "organizations"
  }

  if (rest === "organization-users" || rest.startsWith("organization-users/")) {
    return "organization-users"
  }

  if (rest === "records" || rest.startsWith("records/")) {
    return "records"
  }

  if (rest === "files" || rest.startsWith("files/")) {
    return "files"
  }

  if (rest === "schemas" || rest.startsWith("schemas/")) {
    return "schemas"
  }

  return ""
}

export function workspaceNetworkFromApi(network: ApiNetwork): Network {
  return {
    id: network.id,
    name: network.name,
    summary: network.slug,
    slug: network.slug,
    description: "",
    industry: "",
    headquarters: "",
    coverage: "",
    status: "Active",
    color: "purple",
    createdAt: network.createdAt,
    updatedAt: network.updatedAt,
    organizations: [],
    schemas: [],
    workflowDefinitions: [],
    pipelineDefinitions: [],
    nodeDefinitions: [],
  }
}

export function workspaceOrganizationFromApi(
  organization: ApiOrganization
): Organization {
  return {
    id: organization.id,
    name: organization.name,
    type: organization.slug,
    slug: organization.slug,
    location: "",
    members: 0,
    description: "",
    status: "Active",
    color: "cyan",
    networkId: organization.networkId,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  }
}

export function workspaceOrganizationUserFromApi(
  organizationUser: ApiOrganizationUser
) {
  return {
    id: organizationUser.id,
    firstName: organizationUser.firstName,
    lastName: organizationUser.lastName,
    email: organizationUser.email,
    organizationId: organizationUser.organizationId,
    networkId: organizationUser.networkId,
    createdAt: organizationUser.createdAt,
    updatedAt: organizationUser.updatedAt,
  }
}

export function organizationUserName(user: {
  firstName: string
  lastName: string
}) {
  return `${user.firstName} ${user.lastName}`.trim()
}

export function workspaceFileFromApi(file: ApiFile): StoredFile {
  return fileFromApi(file)
}

export function workspaceRecordFromApi(record: ApiRecord): StoredRecord {
  return {
    id: record.id,
    data: record.data,
    schemaId: record.schemaId,
    organizationId: record.organizationId,
    organizationUserId: record.organizationUserId,
    networkId: record.networkId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export function workspaceSchemaFromApi(schema: ApiSchema): Schema {
  return {
    id: schema.id,
    name: schema.name,
    slug: schema.slug,
    active: schema.active,
    internal: schema.internal,
    definition: schema.definition,
    color: "purple",
    networkId: schema.networkId,
    organizationId: schema.organizationId ?? undefined,
  }
}

export function workspaceWorkflowFromApi(
  workflow: ApiWorkflowDefinition
): WorkflowDefinition {
  return {
    id: workflow.id,
    name: workflow.name,
    slug: workflow.slug,
    active: workflow.active,
    internal: workflow.internal,
    schemaId: workflow.schemaId,
    definition: workflowDefinitionAsJson(workflow.definition),
    networkId: workflow.networkId,
  }
}

export function workspacePipelineFromApi(
  pipeline: ApiPipelineDefinition
): PipelineDefinition {
  return {
    id: pipeline.id,
    name: pipeline.name,
    slug: pipeline.slug,
    active: pipeline.active,
    internal: pipeline.internal,
    definition: pipeline.definition,
    networkId: pipeline.networkId,
  }
}

export function workspaceNodeFromApi(node: ApiNodeDefinition): NodeDefinition {
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    active: node.active,
    internal: node.internal,
    type: node.type,
    definition: node.definition,
    networkId: node.networkId,
  }
}

export function withNetworkOrganizations(
  network: Network,
  organizations: Organization[]
): Network {
  return {
    ...network,
    organizations: organizations.filter(
      (organization) => organization.networkId === network.id
    ),
  }
}

export function withNetworkSchemas(
  network: Network,
  schemas: Schema[],
  organizationId?: string
): Network {
  return {
    ...network,
    schemas: schemas.filter((schema) => {
      if (schema.networkId !== network.id) {
        return false
      }
      if (!organizationId) {
        return true
      }
      return !schema.organizationId || schema.organizationId === organizationId
    }),
  }
}

export function withNetworkWorkflows(
  network: Network,
  workflows: WorkflowDefinition[]
): Network {
  const schemaIds = new Set(network.schemas.map((schema) => schema.id))
  return {
    ...network,
    workflowDefinitions: workflows.filter(
      (workflow) =>
        workflow.networkId === network.id && schemaIds.has(workflow.schemaId)
    ),
  }
}

export function withNetworkPipelines(
  network: Network,
  pipelines: PipelineDefinition[]
): Network {
  return {
    ...network,
    pipelineDefinitions: pipelines.filter(
      (pipeline) => pipeline.networkId === network.id
    ),
  }
}

export function withNetworkNodes(
  network: Network,
  nodes: NodeDefinition[]
): Network {
  return {
    ...network,
    nodeDefinitions: nodes.filter((node) => node.networkId === network.id),
  }
}

export function schemaScopeLabel(
  schema: Schema,
  organizations: Organization[]
) {
  if (!schema.organizationId) {
    return "Network"
  }
  return (
    organizations.find(
      (organization) => organization.id === schema.organizationId
    )?.name ?? "Organization"
  )
}

type WorkspaceQueryOptions = {
  skip?: boolean
}

function useWorkspaceQuerySkip(options?: WorkspaceQueryOptions) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  return !isAuthenticated || Boolean(options?.skip)
}

export function useWorkspaceOrganizations(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListOrganizationsQuery(undefined, { skip })

  return {
    ...query,
    organizations: (query.data?.items ?? []).map(workspaceOrganizationFromApi),
  }
}

export function useWorkspaceOrganizationUsers(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListOrganizationUsersQuery(undefined, { skip })

  return {
    ...query,
    organizationUsers: (query.data?.items ?? []).map(
      workspaceOrganizationUserFromApi
    ),
  }
}

export function useWorkspaceFiles(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListFilesQuery(undefined, { skip })

  return {
    ...query,
    files: (query.data?.items ?? []).map(workspaceFileFromApi),
  }
}

export function useWorkspaceRecords(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListRecordsQuery(undefined, { skip })

  return {
    ...query,
    records: (query.data?.items ?? []).map(workspaceRecordFromApi),
  }
}

export function useWorkspaceSchemas(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListSchemasQuery(undefined, { skip })

  return {
    ...query,
    schemas: (query.data?.items ?? []).map(workspaceSchemaFromApi),
  }
}

export function useWorkspaceWorkflows(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListWorkflowDefinitionsQuery(undefined, { skip })

  return {
    ...query,
    workflows: (query.data?.items ?? []).map(workspaceWorkflowFromApi),
  }
}

export function useWorkspaceWorkflowRuns(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListWorkflowsQuery(undefined, { skip })

  return {
    ...query,
    runs: query.data?.items ?? [],
  }
}

export function useWorkspacePipelineRuns(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListPipelinesQuery(undefined, { skip })

  return {
    ...query,
    runs: query.data?.items ?? [],
  }
}

export function useWorkspacePipelines(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListPipelineDefinitionsQuery(undefined, { skip })

  return {
    ...query,
    pipelines: (query.data?.items ?? []).map(workspacePipelineFromApi),
  }
}

export function useWorkspaceNodes(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListNodeDefinitionsQuery(undefined, { skip })

  return {
    ...query,
    nodes: (query.data?.items ?? []).map(workspaceNodeFromApi),
  }
}

export function useWorkspaceNetworkList(options?: WorkspaceQueryOptions) {
  const skip = useWorkspaceQuerySkip(options)
  const query = useListNetworksQuery(undefined, { skip })

  return {
    ...query,
    networks: (query.data ?? []).map(workspaceNetworkFromApi),
  }
}

export function useWorkspaceNetworks(options?: WorkspaceQueryOptions) {
  const query = useWorkspaceNetworkList(options)
  const organizationsQuery = useWorkspaceOrganizations(options)

  return {
    ...query,
    isLoading: query.isLoading || organizationsQuery.isLoading,
    isFetching: query.isFetching || organizationsQuery.isFetching,
    isError: query.isError || organizationsQuery.isError,
    error: query.error ?? organizationsQuery.error,
    refetch: () => {
      void query.refetch()
      void organizationsQuery.refetch()
    },
    networks: (query.data ?? []).map((network) =>
      withNetworkOrganizations(
        workspaceNetworkFromApi(network),
        organizationsQuery.organizations
      )
    ),
  }
}

export function useWorkspaceNetworksWithDefinitions(
  options?: WorkspaceQueryOptions
) {
  const query = useWorkspaceNetworks(options)
  const schemasQuery = useWorkspaceSchemas(options)
  const workflowsQuery = useWorkspaceWorkflows(options)
  const pipelinesQuery = useWorkspacePipelines(options)
  const nodesQuery = useWorkspaceNodes(options)

  return {
    ...query,
    isLoading:
      query.isLoading ||
      schemasQuery.isLoading ||
      workflowsQuery.isLoading ||
      pipelinesQuery.isLoading ||
      nodesQuery.isLoading,
    isFetching:
      query.isFetching ||
      schemasQuery.isFetching ||
      workflowsQuery.isFetching ||
      pipelinesQuery.isFetching ||
      nodesQuery.isFetching,
    isError:
      query.isError ||
      schemasQuery.isError ||
      workflowsQuery.isError ||
      pipelinesQuery.isError ||
      nodesQuery.isError,
    error:
      query.error ??
      schemasQuery.error ??
      workflowsQuery.error ??
      pipelinesQuery.error ??
      nodesQuery.error,
    refetch: () => {
      query.refetch()
      void schemasQuery.refetch()
      void workflowsQuery.refetch()
      void pipelinesQuery.refetch()
      void nodesQuery.refetch()
    },
    networks: query.networks.map((network) =>
      withNetworkNodes(
        withNetworkPipelines(
          withNetworkWorkflows(
            withNetworkSchemas(network, schemasQuery.schemas),
            workflowsQuery.workflows
          ),
          pipelinesQuery.pipelines
        ),
        nodesQuery.nodes
      )
    ),
  }
}

export function useNetworkWorkspace() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { pathname } = useLocation()
  const params = useParams()
  const parsed = parseNetworkPath(pathname)
  const networkId = parsed?.networkId ?? params.networkId
  const organizationId = parsed
    ? parsed.organizationId || undefined
    : params.organizationId
  const networkQuery = useGetNetworkQuery(networkId ?? "", {
    skip: !isAuthenticated || !networkId,
  })
  const organizationQuery = useGetOrganizationQuery(organizationId ?? "", {
    skip: !isAuthenticated || !organizationId,
  })
  const organizationsQuery = useWorkspaceOrganizations()
  const schemasQuery = useWorkspaceSchemas()
  const workflowsQuery = useWorkspaceWorkflows()
  const pipelinesQuery = useWorkspacePipelines()
  const nodesQuery = useWorkspaceNodes()
  const organization =
    organizationId &&
    organizationQuery.data &&
    organizationQuery.data.id === organizationId &&
    (!networkId || organizationQuery.data.networkId === networkId)
      ? workspaceOrganizationFromApi(organizationQuery.data)
      : undefined
  const network = networkQuery.data
    ? withNetworkNodes(
        withNetworkPipelines(
          withNetworkWorkflows(
            withNetworkSchemas(
              withNetworkOrganizations(
                workspaceNetworkFromApi(networkQuery.data),
                organizationsQuery.organizations
              ),
              schemasQuery.schemas,
              organization?.id
            ),
            workflowsQuery.workflows
          ),
          pipelinesQuery.pipelines
        ),
        nodesQuery.nodes
      )
    : undefined
  const workspaceNetwork =
    network && organization
      ? network.organizations.some((item) => item.id === organization.id)
        ? network
        : {
            ...network,
            organizations: [organization, ...network.organizations],
          }
      : network

  function href(rest = "") {
    if (!networkId) {
      return "/app/networks"
    }

    return networkWorkspacePath({
      networkId,
      organizationId: organization?.id,
      rest,
    })
  }

  return {
    networkId,
    organizationId: organization?.id,
    requestedOrganizationId: organizationId,
    network: workspaceNetwork,
    organization,
    isNetworkLoading: networkQuery.isLoading,
    isNetworkError: networkQuery.isError,
    networkError: networkQuery.error,
    isOrganizationLoading:
      Boolean(organizationId) && organizationQuery.isLoading,
    isOrganizationError: organizationQuery.isError,
    organizationError: organizationQuery.error,
    isFetching:
      networkQuery.isFetching ||
      organizationQuery.isFetching ||
      organizationsQuery.isFetching ||
      schemasQuery.isFetching ||
      workflowsQuery.isFetching ||
      pipelinesQuery.isFetching ||
      nodesQuery.isFetching,
    refetch: () => {
      if (networkId) {
        void networkQuery.refetch()
      }
      if (organizationId) {
        void organizationQuery.refetch()
      }
      void organizationsQuery.refetch()
      void schemasQuery.refetch()
      void workflowsQuery.refetch()
      void pipelinesQuery.refetch()
      void nodesQuery.refetch()
    },
    href,
  }
}
