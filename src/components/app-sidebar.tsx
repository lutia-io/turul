"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Building2Icon,
  FileJsonIcon,
  HomeIcon,
  LayersIcon,
  ListIcon,
  WorkflowIcon,
} from "lucide-react"

const data = {
  teams: [
    {
      name: "DHL",
      logo: <Building2Icon />,
      plan: "Enterprise",
    },
    {
      name: "Acme Inc",
      logo: <Building2Icon />,
      plan: "Startup",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/app/home",
      icon: (
        <HomeIcon
        />
      ),
      isActive: true,
    },
    {
      title: "Networks",
      url: "/app/networks",
      icon: (
        <ListIcon
        />
      ),
      isActive: false,
    },
    {
      title: "Organizations",
      url: "/app/organizations",
      icon: (
        <Building2Icon
        />
      ),
      isActive: false,
    },
    {
      title: "Schemas",
      url: "/app/schemas",
      icon: (
        <FileJsonIcon
        />
      ),
      isActive: false,
    },
    {
      title: "Workflow Definitions",
      url: "/app/workflow-definitions",
      icon: (
        <WorkflowIcon
        />
      ),
      isActive: false,
    },
    {
      title: "Pipeline Definitions",
      url: "/app/pipeline-definitions",
      icon: (
        <LayersIcon
        />
      ),
      isActive: false,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
