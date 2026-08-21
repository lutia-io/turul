import { useSyncExternalStore } from "react"
import { useParams } from "react-router"

import {
  getWorkspaceVersion,
  subscribeWorkspace,
  type Network,
  type Organization,
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
    color: "orange",
    networkId: organization.networkId,
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

export function useWorkspaceOrganizations() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListOrganizationsQuery(undefined, { skip: !isAuthenticated })

  return {
    ...query,
    organizations: (query.data ?? []).map(workspaceOrganizationFromApi),
  }
}

export function useWorkspaceNetworks() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListNetworksQuery(undefined, { skip: !isAuthenticated })
  const {
    organizations,
    isLoading: isOrganizationsLoading,
    isError: isOrganizationsError,
    error: organizationsError,
  } = useWorkspaceOrganizations()

  return {
    ...query,
    isLoading: query.isLoading || isOrganizationsLoading,
    isError: query.isError || isOrganizationsError,
    error: query.error ?? organizationsError,
    networks: (query.data ?? []).map((network) =>
      withNetworkOrganizations(workspaceNetworkFromApi(network), organizations)
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
  const { organizations } = useWorkspaceOrganizations()
  const network = networkQuery.data
    ? withNetworkOrganizations(
        workspaceNetworkFromApi(networkQuery.data),
        organizations
      )
    : undefined
  const organization =
    organizationQuery.data &&
    (!networkId || organizationQuery.data.networkId === networkId)
      ? workspaceOrganizationFromApi(organizationQuery.data)
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
    isOrganizationLoading: Boolean(organizationId) && organizationQuery.isLoading,
    isOrganizationError: organizationQuery.isError,
    href,
  }
}
