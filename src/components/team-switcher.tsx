"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { getBadgeColor, type BadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"
import {
  ChevronsUpDownIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

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
  onAdd,
  onQueryChange,
  appliedQuery = "",
  isSearching = false,
  searchError,
  label,
  addLabel,
}: {
  kind: SwitcherKind
  teams: SwitcherItem[]
  activeId?: string | null
  onSelect?: (team: SwitcherItem) => void
  onAdd?: () => void
  onQueryChange?: (query: string) => void
  appliedQuery?: string
  isSearching?: boolean
  searchError?: string | null
  label?: string
  addLabel?: string | null
}) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [uncontrolledId, setUncontrolledId] = React.useState(
    activeId ?? teams[0]?.id
  )
  const onQueryChangeRef = React.useRef(onQueryChange)
  onQueryChangeRef.current = onQueryChange
  const selectedId = activeId === undefined ? uncontrolledId : activeId
  const matchedTeam = selectedId
    ? teams.find((team) => team.id === selectedId)
    : undefined
  const activeTeamRef = React.useRef<SwitcherItem | undefined>(undefined)
  if (matchedTeam) {
    activeTeamRef.current = matchedTeam
  }
  const activeTeam =
    matchedTeam ??
    (activeTeamRef.current?.id === selectedId
      ? activeTeamRef.current
      : undefined) ??
    (activeId === undefined ? teams[0] : undefined)
  const activeTone = getBadgeColor(activeTeam?.color)
  const copy = kindCopy[kind]
  const menuLabel = label ?? copy.plural
  const actionLabel =
    addLabel === undefined ? `Add ${copy.singular.toLowerCase()}` : addLabel
  const trimmedQuery = query.trim()
  const pending =
    trimmedQuery.length > 0 &&
    (trimmedQuery !== appliedQuery.trim() || isSearching)
  const showSearch =
    teams.length > 0 ||
    trimmedQuery.length > 0 ||
    Boolean(activeTeam) ||
    pending ||
    Boolean(searchError)

  React.useEffect(() => {
    if (!trimmedQuery) {
      onQueryChangeRef.current?.("")
      return
    }

    const timeout = window.setTimeout(() => {
      onQueryChangeRef.current?.(trimmedQuery)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [trimmedQuery])

  if (!activeTeam && !actionLabel && teams.length === 0 && !trimmedQuery) {
    return null
  }

  function resetQuery() {
    setQuery("")
    onQueryChangeRef.current?.("")
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    resetQuery()
  }

  function handleSelect(team: SwitcherItem) {
    if (activeId === undefined) {
      setUncontrolledId(team.id)
    }
    onSelect?.(team)
    setOpen(false)
    resetQuery()
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      onQueryChangeRef.current?.(trimmedQuery)
      if (
        trimmedQuery &&
        trimmedQuery === appliedQuery.trim() &&
        !isSearching &&
        !searchError &&
        teams[0]
      ) {
        handleSelect(teams[0])
      }
    }

    event.stopPropagation()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={
                  activeTeam
                    ? `${copy.singular}: ${activeTeam.name}`
                    : copy.plural
                }
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div
              className={cn(
                "flex aspect-square size-8 items-center justify-center rounded-lg [&_svg]:stroke-current",
                activeTeam
                  ? "text-white [&_svg]:stroke-white"
                  : "bg-muted text-muted-foreground",
                activeTeam ? activeTone.bg : null
              )}
            >
              {activeTeam?.logo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate text-xs text-muted-foreground">
                {copy.singular}
              </span>
              <span className="truncate font-medium">
                {activeTeam?.name ?? `Select ${copy.singular.toLowerCase()}`}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="flex w-64 flex-col overflow-hidden p-0"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <div className="shrink-0 p-1.5 pb-1">
              <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
                {menuLabel}
              </p>
              {showSearch ? (
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onPointerDown={(event) => event.stopPropagation()}
                    placeholder="Search"
                    aria-label={`Search ${copy.plural.toLowerCase()}`}
                    aria-busy={pending}
                    className="h-7 border-transparent bg-muted/70 pl-7 text-xs shadow-none focus-visible:ring-1"
                    autoFocus
                  />
                </div>
              ) : null}
            </div>
            <DropdownMenuGroup className="max-h-72 min-h-0 overflow-y-auto p-1">
              {pending ? (
                <p className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                  <LoaderCircleIcon className="size-3 animate-spin" />
                  Searching...
                </p>
              ) : searchError ? (
                <p className="px-2 py-1.5 text-xs text-destructive">
                  {searchError}
                </p>
              ) : trimmedQuery && teams.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  No matches
                </p>
              ) : (
                teams.map((team) => {
                  const tone = getBadgeColor(team.color)

                  return (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleSelect(team)}
                      className="gap-2 p-2"
                    >
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md text-white [&_svg]:stroke-white",
                          tone.bg
                        )}
                      >
                        {team.logo}
                      </div>
                      <div className="grid min-w-0 flex-1 text-left leading-tight">
                        <span className="truncate">{team.name}</span>
                        {team.plan ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {team.plan}
                          </span>
                        ) : null}
                      </div>
                    </DropdownMenuItem>
                  )
                })
              )}
            </DropdownMenuGroup>
            {actionLabel ? (
              <div className="shrink-0 p-1 pt-0">
                <DropdownMenuSeparator className="mx-0 my-1" />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-2 p-2" onClick={onAdd}>
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                      <PlusIcon className="size-4" />
                    </div>
                    <div className="font-medium text-muted-foreground">
                      {actionLabel}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </div>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
