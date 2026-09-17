import * as React from "react"
import {
  BellIcon,
  CreditCardIcon,
  HomeIcon,
  ListIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useMeQuery } from "@/store/api"
import { useAppSelector } from "@/store/hooks"

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
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { data: me } = useMeQuery(undefined, { skip: !isAuthenticated })
  const isOrgUser = me?.principalType === "organization_user"
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
      title: "Access",
      url: "/app/access",
      icon: <ShieldIcon />,
    },
  ].filter((item) => item.title !== "Access" || !isOrgUser)

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
