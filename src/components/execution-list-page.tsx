import { useState } from "react"
import { Link } from "react-router"
import { PlayIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RunCard, RunFilterBar } from "@/components/run-card"
import type { BadgeColor } from "@/lib/badge"
import type { RunStatus } from "@/data/runs"
import { isActiveRun, type RunFilter } from "@/lib/runs"
import type { Network } from "@/data/networks"

export type ExecutionListItem = {
  id: string
  name: string
  href: string
  status: RunStatus
  color: BadgeColor
  icon: LucideIcon
  network: Network
  organizationName?: string
  currentLabel?: string
  currentIndex: number
  total: number
  startedAt: string
  finishedAt?: string
}

export function ExecutionListPage({
  title,
  description,
  startLabel,
  itemLabel,
  unit,
  items,
  emptyLabel,
}: {
  title: string
  description: string
  startLabel: string
  itemLabel: string
  unit: string
  items: ExecutionListItem[]
  emptyLabel: string
}) {
  const [filter, setFilter] = useState<RunFilter>("active")
  const counts = {
    all: items.length,
    active: items.filter((item) => isActiveRun(item.status)).length,
    succeeded: items.filter((item) => item.status === "Succeeded").length,
    failed: items.filter((item) => item.status === "Failed").length,
  }
  const visible = items.filter((item) => {
    if (filter === "all") return true
    if (filter === "active") return isActiveRun(item.status)
    if (filter === "succeeded") return item.status === "Succeeded"
    return item.status === "Failed"
  })
  const grouped = visible.reduce<
    { network: Network; items: ExecutionListItem[] }[]
  >((groups, item) => {
    const existing = groups.find(
      (group) => group.network.id === item.network.id
    )

    if (existing) {
      existing.items.push(item)
      return groups
    }

    groups.push({ network: item.network, items: [item] })
    return groups
  }, [])

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Button>
          <PlayIcon />
          {startLabel}
        </Button>
      </div>

      <RunFilterBar value={filter} onChange={setFilter} counts={counts} />

      {grouped.length > 0 ? (
        <div className="flex flex-col gap-6">
          {grouped.map(({ network, items: networkItems }) => (
            <section
              key={network.id}
              className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {network.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {networkItems.length} {itemLabel}
                    {networkItems.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Link
                  to={`/app/networks/${network.id}`}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  View network
                </Link>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
                {networkItems.map((item) => (
                  <RunCard
                    key={item.id}
                    to={item.href}
                    name={item.name}
                    status={item.status}
                    color={item.color}
                    icon={item.icon}
                    networkName={network.name}
                    organizationName={item.organizationName}
                    currentLabel={item.currentLabel}
                    currentIndex={item.currentIndex}
                    total={item.total}
                    unit={unit}
                    startedAt={item.startedAt}
                    finishedAt={item.finishedAt}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  )
}
