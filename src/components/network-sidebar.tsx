"use client"

import type { ComponentProps } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import {
  ArrowLeftIcon,
  Building2Icon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  LayersIcon,
  LayoutDashboardIcon,
  WorkflowIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
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
import { networkList } from "@/data/networks"
import {
  networkSectionRest,
  networkWorkspacePath,
  parseNetworkPath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"

export function NetworkSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const { network, organizationId } = useNetworkWorkspace()
  const parsed = parseNetworkPath(pathname)
  const rest = parsed?.rest ?? ""

  const networkItems = networkList.map((item) => ({
    id: item.id,
    name: item.name,
    logo: <GalleryVerticalEndIcon />,
    plan: item.industry,
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
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Workspace" items={navMain} />
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
