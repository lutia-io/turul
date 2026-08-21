"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"

export type SwitcherKind = "network" | "organization"

export type SwitcherItem = {
  id: string
  name: string
  logo: React.ReactNode
  plan: string
  color?: BadgeColor
}

const kindCopy: Record<SwitcherKind, { singular: string; plural: string }> = {
  network: { singular: "Network", plural: "Networks" },
  organization: { singular: "Organization", plural: "Organizations" },
}

export function TeamSwitcher({
  kind,
  teams,
  activeId,
  onSelect,
  label,
  addLabel,
}: {
  kind: SwitcherKind
  teams: SwitcherItem[]
  activeId?: string
  onSelect?: (team: SwitcherItem) => void
  label?: string
  addLabel?: string | null
}) {
  const { isMobile } = useSidebar()
  const [uncontrolledId, setUncontrolledId] = React.useState(
    activeId ?? teams[0]?.id
  )
  const selectedId = activeId ?? uncontrolledId
  const activeTeam = teams.find((team) => team.id === selectedId) ?? teams[0]
  const activeTone = getBadgeColor(activeTeam?.color)
  const copy = kindCopy[kind]
  const menuLabel = label ?? copy.plural
  const actionLabel = addLabel === undefined ? `Add ${copy.singular.toLowerCase()}` : addLabel

  if (!activeTeam) {
    return null
  }

  function handleSelect(team: SwitcherItem) {
    if (!activeId) {
      setUncontrolledId(team.id)
    }
    onSelect?.(team)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={`${copy.singular}: ${activeTeam.name}`}
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div
              className={cn(
                "flex aspect-square size-8 items-center justify-center rounded-lg",
                activeTone.bg,
                activeTone.text
              )}
            >
              {activeTeam.logo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate text-xs text-muted-foreground">
                {copy.singular}
              </span>
              <span className="truncate font-medium">{activeTeam.name}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {menuLabel}
              </DropdownMenuLabel>
              {teams.map((team, index) => {
                const tone = getBadgeColor(team.color)

                return (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => handleSelect(team)}
                    className="gap-2 p-2"
                  >
                    <div
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md",
                        tone.bg,
                        tone.text
                      )}
                    >
                      {team.logo}
                    </div>
                    <div className="grid flex-1 text-left leading-tight">
                      <span>{team.name}</span>
                      {team.plan ? (
                        <span className="text-xs text-muted-foreground">
                          {team.plan}
                        </span>
                      ) : null}
                    </div>
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            {actionLabel ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-2 p-2">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                      <PlusIcon className="size-4" />
                    </div>
                    <div className="font-medium text-muted-foreground">
                      {actionLabel}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
