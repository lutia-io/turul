import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import { Link, useLocation } from "react-router"

export function NavMain({
  items,
  label = "Platform",
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    exact?: boolean
    items?: {
      title: string
      url: string
      isActive?: boolean
    }[]
  }[]
  label?: string
}) {
  const { pathname, search } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  function isItemActive(url: string, exact?: boolean) {
    const [urlPath, urlQuery] = url.split("?")
    const pathMatches = exact
      ? pathname === urlPath
      : pathname === urlPath || pathname.startsWith(`${urlPath}/`)

    if (!pathMatches) {
      return false
    }

    if (!urlQuery) {
      return true
    }

    const currentParams = new URLSearchParams(search)
    const urlParams = new URLSearchParams(urlQuery)

    for (const [key, value] of urlParams) {
      if (currentParams.get(key) !== value) {
        return false
      }
    }

    return true
  }

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              defaultOpen={item.isActive || isItemActive(item.url, item.exact)}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isItemActive(item.url, item.exact)}
                render={<Link to={item.url} />}
                onClick={closeMobileSidebar}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
              <CollapsibleTrigger
                render={<SidebarMenuAction />}
              >
                <ChevronRightIcon className="transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                <span className="sr-only">Toggle {item.title}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        isActive={
                          subItem.isActive ?? isItemActive(subItem.url)
                        }
                        render={<Link to={subItem.url} />}
                        onClick={closeMobileSidebar}
                      >
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isItemActive(item.url, item.exact)}
                render={<Link to={item.url} />}
                onClick={closeMobileSidebar}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
