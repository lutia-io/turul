import type { CSSProperties } from "react"
import { Outlet } from "react-router"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function AppLayout() {
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
        <AppSidebar
          style={{
            top: "var(--app-header-height)",
            height: "calc(100svh - var(--app-header-height))",
          }}
        />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
