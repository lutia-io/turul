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
} from "@/lib/network-workspace"
import { useAuthorization } from "@/lib/authorization"

export function NetworkSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const { isMobile, setOpenMobile } = useSidebar()
  const { network, organizationId, href } = useNetworkWorkspace()
  const { networks } = useWorkspaceNetworkList()
  const { openCreateNetwork, openCreateOrganization } = useCreateEntity()
  const { isOrgUser } = useAuthorization()
  const parsed = parseNetworkPath(pathname)
  const rest = parsed?.rest ?? ""
  const section = networkSectionRest(rest)
  const recordsUrl = href("records")
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
      items:
        network?.schemas.map((schema) => ({
          title: schema.name,
          url: `${recordsUrl}?schema=${schema.id}`,
          isActive: rest === "records" && schema.id === recordsSchemaId,
        })) ?? [],
    },
    {
      title: "Files",
      url: href("files"),
      icon: <FileIcon />,
    },
    {
      title: "Schemas",
      url: href("schemas"),
      icon: <FileJsonIcon />,
    },
  ]

  const automationItems = [
    {
      title: "Workflows",
      url: href("workflows"),
      icon: <PlayIcon />,
      isActive: section === "workflows",
      items: [
        {
          title: "Definitions",
          url: href("workflow-definitions"),
          isActive: section === "workflow-definitions",
        },
      ],
    },
    {
      title: "Pipelines",
      url: href("pipelines"),
      icon: <ActivityIcon />,
      isActive: section === "pipelines",
      items: [
        {
          title: "Definitions",
          url: href("pipeline-definitions"),
          isActive: section === "pipeline-definitions",
        },
      ],
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
