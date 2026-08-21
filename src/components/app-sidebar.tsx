"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar"
import { Building2Icon, HomeIcon, ListIcon } from "lucide-react"

const navMain = [
  {
    title: "Home",
    url: "/app/home",
    icon: <HomeIcon />,
  },
  {
    title: "Networks",
    url: "/app/networks",
    icon: <ListIcon />,
  },
  {
    title: "Organizations",
    url: "/app/organizations",
    icon: <Building2Icon />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
