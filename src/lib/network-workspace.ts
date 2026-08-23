import { useSyncExternalStore } from "react"
import { useParams } from "react-router"

import type { StoredFile, StoredRecord } from "@/data/files"
import {
  getWorkspaceVersion,
  subscribeWorkspace,
  type Network,
  type Organization,
  type Schema,
  type WorkflowDefinition,
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

  if (rest === "workflows" || rest.startsWith("workflows/")) {
    return "workflows"
  }

  if (rest === "pipelines" || rest.startsWith("pipelines/")) {
    return "pipelines"
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
    description: "",
    industry: "",
    headquarters: "",
    coverage: "",
    status: "Active",
    color: "purple",
    organizations: [],
    schemas: [],
    workflowDefinitions: [],
    pipelineDefinitions: [],
  }
}

export function workspaceOrganizationFromApi(
  organization: ApiOrganization
): Organization {
  return {
    id: organization.id,
    name: organization.name,
    type: organization.slug,
    location: "",
    members: 0,
    description: "",
    status: "Active",
    color: "cyan",
    networkId: organization.networkId,
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

export function useWorkspaceOrganizations() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListOrganizationsQuery(undefined, { skip: !isAuthenticated })

  return {
    ...query,
    organizations: (query.data ?? []).map(workspaceOrganizationFromApi),
  }
}

export function useWorkspaceOrganizationUsers() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListOrganizationUsersQuery(undefined, {
    skip: !isAuthenticated,
  })

  return {
    ...query,
    organizationUsers: (query.data ?? []).map(workspaceOrganizationUserFromApi),
  }
}

export function useWorkspaceFiles() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListFilesQuery(undefined, { skip: !isAuthenticated })

  return {
    ...query,
    files: (query.data ?? []).map(workspaceFileFromApi),
  }
}

export function useWorkspaceRecords() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListRecordsQuery(undefined, { skip: !isAuthenticated })

  return {
    ...query,
    records: (query.data ?? []).map(workspaceRecordFromApi),
  }
}

export function useWorkspaceSchemas() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListSchemasQuery(undefined, { skip: !isAuthenticated })

  return {
    ...query,
    schemas: (query.data ?? []).map(workspaceSchemaFromApi),
  }
}

export function useWorkspaceWorkflows() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListWorkflowDefinitionsQuery(undefined, {
    skip: !isAuthenticated,
  })

  return {
    ...query,
    workflows: (query.data ?? []).map(workspaceWorkflowFromApi),
  }
}

export function useWorkspaceWorkflowRuns() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListWorkflowsQuery(undefined, { skip: !isAuthenticated })

  return {
    ...query,
    runs: query.data ?? [],
  }
}

export function useWorkspaceNetworks() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListNetworksQuery(undefined, { skip: !isAuthenticated })
  const organizationsQuery = useWorkspaceOrganizations()
  const schemasQuery = useWorkspaceSchemas()
  const workflowsQuery = useWorkspaceWorkflows()

  return {
    ...query,
    isLoading:
      query.isLoading ||
      organizationsQuery.isLoading ||
      schemasQuery.isLoading ||
      workflowsQuery.isLoading,
    isFetching:
      query.isFetching ||
      organizationsQuery.isFetching ||
      schemasQuery.isFetching ||
      workflowsQuery.isFetching,
    isError:
      query.isError ||
      organizationsQuery.isError ||
      schemasQuery.isError ||
      workflowsQuery.isError,
    error:
      query.error ??
      organizationsQuery.error ??
      schemasQuery.error ??
      workflowsQuery.error,
    refetch: () => {
      void query.refetch()
      void organizationsQuery.refetch()
      void schemasQuery.refetch()
      void workflowsQuery.refetch()
    },
    networks: (query.data ?? []).map((network) =>
      withNetworkWorkflows(
        withNetworkSchemas(
          withNetworkOrganizations(
            workspaceNetworkFromApi(network),
            organizationsQuery.organizations
          ),
          schemasQuery.schemas
        ),
        workflowsQuery.workflows
      )
    ),
  }
}

export function useNetworkWorkspace() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { networkId, organizationId } = useParams()
  const networkQuery = useGetNetworkQuery(networkId ?? "", {
    skip: !isAuthenticated || !networkId,
  })
  const organizationQuery = useGetOrganizationQuery(organizationId ?? "", {
    skip: !isAuthenticated || !organizationId,
  })
  const organizationsQuery = useWorkspaceOrganizations()
  const schemasQuery = useWorkspaceSchemas()
  const workflowsQuery = useWorkspaceWorkflows()
  const organization =
    organizationQuery.data &&
    (!networkId || organizationQuery.data.networkId === networkId)
      ? workspaceOrganizationFromApi(organizationQuery.data)
      : undefined
  const network = networkQuery.data
    ? withNetworkWorkflows(
        withNetworkSchemas(
          withNetworkOrganizations(
            workspaceNetworkFromApi(networkQuery.data),
            organizationsQuery.organizations
          ),
          schemasQuery.schemas,
          organization?.id
        ),
        workflowsQuery.workflows
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
    isOrganizationLoading:
      Boolean(organizationId) && organizationQuery.isLoading,
    isOrganizationError: organizationQuery.isError,
    isFetching:
      networkQuery.isFetching ||
      organizationQuery.isFetching ||
      organizationsQuery.isFetching ||
      schemasQuery.isFetching ||
      workflowsQuery.isFetching,
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
    },
    href,
  }
}
