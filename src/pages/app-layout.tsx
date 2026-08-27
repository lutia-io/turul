import type { CSSProperties, ReactNode } from "react"
import { Outlet } from "react-router"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell({ sidebar, children }: {
  sidebar: ReactNode
  children?: ReactNode
}) {
  return (
    <SidebarProvider
      className="flex-col"
      style={
        {
          "--app-header-height": "4rem",
        } as CSSProperties
      }
    >
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        {sidebar}
        <SidebarInset className="min-w-0 overflow-x-hidden">
          {children ?? <Outlet />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export const appSidebarStyle = {
  top: "var(--app-header-height)",
  height: "calc(100svh - var(--app-header-height))",
} as const

export default function AppLayout() {
  return <AppShell sidebar={<AppSidebar style={appSidebarStyle} />} />
}
