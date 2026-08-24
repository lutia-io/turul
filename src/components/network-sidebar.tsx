"use client"

import type { ComponentProps } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"
import {
  ActivityIcon,
  ArrowLeftIcon,
  Building2Icon,
  FileIcon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  LayersIcon,
  LayoutDashboardIcon,
  PlayIcon,
  TableIcon,
  UsersIcon,
  WorkflowIcon,
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
} from "@/lib/network-workspace"

export function NetworkSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const { isMobile, setOpenMobile } = useSidebar()
  const { network, organizationId } = useNetworkWorkspace()
  const { networks } = useWorkspaceNetworkList()
  const { openCreateNetwork, openCreateOrganization } = useCreateEntity()
  const parsed = parseNetworkPath(pathname)
  const rest = parsed?.rest ?? ""
  const recordsUrl = network
    ? networkWorkspacePath({
        networkId: network.id,
        organizationId,
        rest: "records",
      })
    : "/app/networks"
  const recordsSchemaId = searchParams.get("schema") ?? network?.schemas[0]?.id

  const switcherNetworks =
    network && !networks.some((item) => item.id === network.id)
      ? [network, ...networks]
      : networks
  const networkItems = switcherNetworks.map((item) => ({
    id: item.id,
    name: item.name,
    logo: <GalleryVerticalEndIcon />,
    plan: item.summary,
    color: item.color,
  }))

  const organizationItems = [
    {
      id: "all",
      name: "All organizations",
      logo: <Building2Icon />,
      plan: network
        ? `${network.organizations.length} in ${network.name}`
        : "Entire network",
    },
    ...(network?.organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      logo: <Building2Icon />,
      plan: organization.type,
      color: organization.color,
    })) ?? []),
  ]

  const navMain = [
    {
      title: "Overview",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
          })
        : "/app/networks",
      icon: <LayoutDashboardIcon />,
      exact: true,
    },
    {
      title: "Organizations",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: "organizations",
          })
        : "/app/networks",
      icon: <Building2Icon />,
      exact: true,
    },
    {
      title: "Records",
      url: recordsUrl,
      icon: <TableIcon />,
      items:
        network?.schemas.map((schema) => ({
          title: schema.name,
          url: `${recordsUrl}?schema=${schema.id}`,
          isActive: rest === "records" && schema.id === recordsSchemaId,
        })) ?? [],
    },
    {
      title: "Files",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: "files",
          })
        : "/app/networks",
      icon: <FileIcon />,
    },
    {
      title: "Workflows",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: "workflows",
          })
        : "/app/networks",
      icon: <PlayIcon />,
    },
    {
      title: "Pipelines",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: "pipelines",
          })
        : "/app/networks",
      icon: <ActivityIcon />,
    },
    {
      title: "Organization Users",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: "organization-users",
          })
        : "/app/networks",
      icon: <UsersIcon />,
    },
  ]

  const definitionItems = [
    {
      title: "Schemas",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: "schemas",
          })
        : "/app/networks",
      icon: <FileJsonIcon />,
    },
    {
      title: "Workflow Definitions",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: "workflow-definitions",
          })
        : "/app/networks",
      icon: <WorkflowIcon />,
    },
    {
      title: "Pipeline Definitions",
      url: network
        ? networkWorkspacePath({
            networkId: network.id,
            organizationId,
            rest: "pipeline-definitions",
          })
        : "/app/networks",
      icon: <LayersIcon />,
    },
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
          kind="organization"
          teams={organizationItems}
          activeId={organizationId ?? "all"}
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
        <NavMain label="Operations" items={navMain} />
        <NavMain label="Definitions" items={definitionItems} />
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
