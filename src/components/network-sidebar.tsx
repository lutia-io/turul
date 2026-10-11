"use client"

import { useState, type ComponentProps } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import {
  ActivityIcon,
  ArrowLeftIcon,
  Building2Icon,
  FileIcon,
  GalleryVerticalEndIcon,
  LayoutDashboardIcon,
  PlayIcon,
  ShieldIcon,
  TableIcon,
  UsersIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
import { useCreateEntity } from "@/components/create-entity"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  networkSectionRest,
  networkWorkspacePath,
  parseNetworkPath,
  useNetworkWorkspace,
  useWorkspaceNetworkList,
  workspaceNetworkFromApi,
  workspaceOrganizationFromApi,
} from "@/lib/network-workspace"
import { useAuthorization } from "@/lib/authorization"
import { getHumaErrorMessage } from "@/store/api"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"
import { useListNetworksQuery } from "@/store/network-slice"
import { useListOrganizationsQuery } from "@/store/organization-slice"

const switcherSearchPageSize = 100

export function NetworkSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const { network, organizationId, href } = useNetworkWorkspace()
  const { networks } = useWorkspaceNetworkList()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const [networkQuery, setNetworkQuery] = useState("")
  const [organizationQuery, setOrganizationQuery] = useState("")
  const [organizationScopeId, setOrganizationScopeId] = useState(network?.id)
  if (organizationScopeId !== network?.id) {
    setOrganizationScopeId(network?.id)
    setOrganizationQuery("")
  }
  const scopedOrganizationQuery =
    organizationScopeId === network?.id ? organizationQuery : ""
  const networkSearch = useListNetworksQuery(
    {
      page: 1,
      pageSize: switcherSearchPageSize,
      q: networkQuery,
      sort: "name",
      order: "asc",
    },
    { skip: !isAuthenticated || networkQuery.length === 0 }
  )
  const organizationSearch = useListOrganizationsQuery(
    {
      page: 1,
      pageSize: switcherSearchPageSize,
      networkId: network?.id,
      q: scopedOrganizationQuery,
      sort: "name",
      order: "asc",
    },
    {
      skip:
        !isAuthenticated ||
        !network?.id ||
        scopedOrganizationQuery.length === 0,
    }
  )
  const { openCreateNetwork, openCreateOrganization } = useCreateEntity()
  const { isOrgUser } = useAuthorization()
  const parsed = parseNetworkPath(pathname)
  const rest = parsed?.rest ?? ""
  const section = networkSectionRest(rest)
  const recordsUrl = href("records")

  const networkSearchActive = isAuthenticated && networkQuery.length > 0
  const organizationSearchActive =
    isAuthenticated &&
    Boolean(network?.id) &&
    scopedOrganizationQuery.length > 0
  const switcherNetworks = networkSearchActive
    ? (networkSearch.data?.items ?? []).map(workspaceNetworkFromApi)
    : network && !networks.some((item) => item.id === network.id)
      ? [network, ...networks]
      : networks
  const networkItems = switcherNetworks.map((item) => ({
    id: item.id,
    name: item.name,
    logo: <GalleryVerticalEndIcon />,
    plan: item.summary,
    color: item.color,
  }))
  const searchedOrganizations = (organizationSearch.data?.items ?? []).map(
    workspaceOrganizationFromApi
  )

  const organizationItems = organizationSearchActive
    ? searchedOrganizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        logo: <Building2Icon />,
        plan: organization.type,
        color: organization.color,
      }))
    : [
        {
          id: "all",
          name: "All organizations",
          logo: <Building2Icon />,
          plan: network
            ? `${network.organizations.length} in ${network.name}`
            : "Entire network",
          color: "gray" as const,
        },
        ...(network?.organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
          logo: <Building2Icon />,
          plan: organization.type,
          color: organization.color,
        })) ?? []),
      ]

  const overviewItems = [
    {
      title: "Overview",
      url: href(),
      icon: <LayoutDashboardIcon />,
      exact: true,
    },
  ]

  const dataItems = [
    {
      title: "Records",
      url: recordsUrl,
      icon: <TableIcon />,
    },
    {
      title: "Files",
      url: href("files"),
      icon: <FileIcon />,
    },
  ]

  const automationItems = [
    {
      title: "Workflows",
      url: href("workflows"),
      icon: <PlayIcon />,
      isActive: section === "workflows",
    },
    {
      title: "Pipelines",
      url: href("pipelines"),
      icon: <ActivityIcon />,
      isActive: section === "pipelines",
    },
  ]

  const peopleItems = [
    ...(organizationId
      ? []
      : [
          {
            title: "Organizations",
            url: href("organizations"),
            icon: <Building2Icon />,
            isActive: section === "organizations",
          },
        ]),
    {
      title: "Users",
      url: href("organization-users"),
      icon: <UsersIcon />,
    },
    ...(isOrgUser
      ? []
      : [
          {
            title: "Access",
            url: href("access"),
            icon: <ShieldIcon />,
          },
        ]),
  ]

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          kind="network"
          teams={networkItems}
          activeId={network?.id}
          onQueryChange={setNetworkQuery}
          appliedQuery={networkQuery}
          isSearching={networkSearchActive && networkSearch.isLoading}
          searchError={
            networkSearchActive && networkSearch.isError
              ? getHumaErrorMessage(
                  networkSearch.error,
                  "Failed to search networks"
                )
              : undefined
          }
          onSelect={(item) => {
            closeMobileSidebar()
            navigate(
              networkWorkspacePath({
                networkId: item.id,
                rest: networkSectionRest(rest),
              })
            )
          }}
          onAdd={() => {
            closeMobileSidebar()
            openCreateNetwork()
          }}
        />
        <TeamSwitcher
          key={network?.id ?? "organizations"}
          kind="organization"
          teams={organizationItems}
          activeId={organizationId ?? "all"}
          onQueryChange={setOrganizationQuery}
          appliedQuery={scopedOrganizationQuery}
          isSearching={organizationSearchActive && organizationSearch.isLoading}
          searchError={
            organizationSearchActive && organizationSearch.isError
              ? getHumaErrorMessage(
                  organizationSearch.error,
                  "Failed to search organizations"
                )
              : undefined
          }
          onSelect={(item) => {
            if (!network) {
              return
            }
            closeMobileSidebar()
            navigate(
              networkWorkspacePath({
                networkId: network.id,
                organizationId: item.id === "all" ? undefined : item.id,
                rest,
              })
            )
          }}
          onAdd={() => {
            if (!network) {
              return
            }
            closeMobileSidebar()
            openCreateOrganization(network.id)
          }}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={overviewItems} />
        <NavMain label="Data" items={dataItems} />
        <NavMain label="Automation" items={automationItems} />
        <NavMain label="People" items={peopleItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="All networks"
              render={<Link to="/app/networks" />}
              onClick={closeMobileSidebar}
            >
              <ArrowLeftIcon />
              <span>All networks</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
