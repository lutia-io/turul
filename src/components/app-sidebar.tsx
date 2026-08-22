"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar"
import {
  BellIcon,
  CreditCardIcon,
  HomeIcon,
  ListIcon,
  UserIcon,
} from "lucide-react"

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
]

const navAccount = [
  {
    title: "Account",
    url: "/app/account",
    icon: <UserIcon />,
  },
  {
    title: "Billing",
    url: "/app/billing",
    icon: <CreditCardIcon />,
  },
  {
    title: "Notifications",
    url: "/app/notifications",
    icon: <BellIcon />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain label="Platform" items={navMain} />
        <NavMain label="Account" items={navAccount} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
