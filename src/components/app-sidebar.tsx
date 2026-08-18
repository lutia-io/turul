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
  HomeIcon,
  ListIcon,
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
