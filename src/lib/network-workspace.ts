import { useSyncExternalStore } from "react"
import { useParams } from "react-router"

import {
  getWorkspaceVersion,
  subscribeWorkspace,
  type Network,
} from "@/data/networks"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useGetNetworkQuery,
  useListNetworksQuery,
  type ApiNetwork,
} from "@/store/network-slice"

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

export function useWorkspaceNetworks() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const query = useListNetworksQuery(undefined, { skip: !isAuthenticated })

  return {
    ...query,
    networks: (query.data ?? []).map(workspaceNetworkFromApi),
  }
}

export function useNetworkWorkspace() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { networkId, organizationId } = useParams()
  const networkQuery = useGetNetworkQuery(networkId ?? "", {
    skip: !isAuthenticated || !networkId,
  })
  const network = networkQuery.data
    ? workspaceNetworkFromApi(networkQuery.data)
    : undefined
  const organization = organizationId
    ? network?.organizations.find((item) => item.id === organizationId)
    : undefined

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
    network,
    organization,
    isNetworkLoading: networkQuery.isLoading,
    isNetworkError: networkQuery.isError,
    href,
  }
}
