import { useParams } from "react-router"

import { networks } from "@/data/networks"

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

  if (rest === "schemas" || rest.startsWith("schemas/")) {
    return "schemas"
  }

  return ""
}

export function useNetworkWorkspace() {
  const { networkId, organizationId } = useParams()
  const network = networkId ? networks[networkId] : undefined
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
    href,
  }
}
