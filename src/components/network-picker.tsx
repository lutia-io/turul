"use client"

import * as React from "react"
import {
  CheckIcon,
  ChevronsUpDownIcon,
  GalleryVerticalEndIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Network } from "@/data/networks"
import { getBadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"

export function NetworkPicker({
  networks,
  value,
  onValueChange,
  className,
}: {
  networks: Network[]
  value: string
  onValueChange: (networkId: string) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const selected =
    networks.find((network) => network.id === value) ?? networks[0]
  const selectedTone = getBadgeColor(selected?.color)
  const trimmedQuery = query.trim().toLowerCase()
  const filtered = trimmedQuery
    ? networks.filter((network) => {
        return (
          network.name.toLowerCase().includes(trimmedQuery) ||
          network.summary.toLowerCase().includes(trimmedQuery) ||
          network.industry.toLowerCase().includes(trimmedQuery)
        )
      })
    : networks

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setQuery("")
    }
  }

  function handleSelect(networkId: string) {
    onValueChange(networkId)
    setOpen(false)
    setQuery("")
  }

  if (!selected) {
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label="Switch network"
            className={cn("max-w-64 gap-2 font-normal", className)}
          />
        }
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md text-white [&_svg]:size-3 [&_svg]:stroke-white",
            selectedTone.bg
          )}
        >
          <GalleryVerticalEndIcon />
        </span>
        <span className="truncate">{selected.name}</span>
        <ChevronsUpDownIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="flex w-72 flex-col overflow-hidden p-0"
        align="end"
        sideOffset={6}
      >
        <div className="shrink-0 space-y-1.5 p-1.5 pb-1">
          <p className="px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            Switch network
          </p>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") {
                  event.stopPropagation()
                }
                if (event.key === "Enter" && filtered[0]) {
                  event.preventDefault()
                  handleSelect(filtered[0].id)
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="Search networks…"
              aria-label="Search networks"
              className="h-8 border-transparent bg-muted/70 pl-8 text-sm shadow-none focus-visible:ring-1"
              autoFocus
            />
          </div>
        </div>
        <DropdownMenuGroup className="max-h-72 min-h-0 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No matching networks
            </p>
          ) : (
            filtered.map((network) => {
              const tone = getBadgeColor(network.color)
              const isActive = network.id === selected.id

              return (
                <DropdownMenuItem
                  key={network.id}
                  onClick={() => handleSelect(network.id)}
                  className="gap-2 p-2"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md text-white [&_svg]:size-3.5 [&_svg]:stroke-white",
                      tone.bg
                    )}
                  >
                    <GalleryVerticalEndIcon />
                  </span>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate font-medium">{network.name}</span>
                    {network.summary ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {network.summary}
                      </span>
                    ) : null}
                  </span>
                  {isActive ? (
                    <CheckIcon className="size-4 shrink-0 text-foreground" />
                  ) : null}
                </DropdownMenuItem>
              )
            })
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
