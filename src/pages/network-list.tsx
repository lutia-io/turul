import { useState } from "react"
import { PlusIcon } from "lucide-react"

import {
  DataTable,
  DataTableCellLink,
  DataTableFilter,
  DataTablePage,
  DataTableToolbar,
  compareText,
  dataTableCount,
  matchesQuery,
  toggleSort,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/data-table"
import { StatusBadge } from "@/components/json-definition-card"
import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import type { Network } from "@/data/networks"
import { useWorkspaceNetworks } from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"

type NetworkSortKey =
  | "name"
  | "status"
  | "industry"
  | "headquarters"
  | "organizations"
  | "schemas"

export default function NetworkList() {
  const { openCreateNetwork } = useCreateEntity()
  const { networks, isLoading, isError, error } = useWorkspaceNetworks()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sort, setSort] = useState<DataTableSort<NetworkSortKey>>({
    key: "name",
    direction: "asc",
  })
  const filtered = networks.filter((network) => {
    if (statusFilter !== "all" && network.status !== statusFilter) {
      return false
    }

    return matchesQuery(query, [
      network.name,
      network.status,
      network.industry,
      network.headquarters,
      network.coverage,
      network.summary,
      network.id,
    ])
  })
  const rows = [...filtered].sort((left, right) => {
    const result = compareNetworks(left, right, sort.key)
    return sort.direction === "asc" ? result : -result
  })
  const filtersActive = query.trim().length > 0 || statusFilter !== "all"

  const columns: DataTableColumn<Network, NetworkSortKey>[] = [
    {
      key: "name",
      label: "Name",
      render: (network) => (
        <DataTableCellLink
          to={`/app/networks/${network.id}`}
          className="max-w-[22rem] font-medium"
        >
          {network.name}
        </DataTableCellLink>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (network) => (
        <DataTableCellLink
          to={`/app/networks/${network.id}`}
          className="inline-flex items-center gap-1.5"
        >
          <StatusBadge status={network.status} />
          <span className="text-muted-foreground">{network.status}</span>
        </DataTableCellLink>
      ),
    },
    {
      key: "industry",
      label: "Industry",
      className: "text-muted-foreground",
      render: (network) => (
        <DataTableCellLink to={`/app/networks/${network.id}`}>
          {network.industry || network.summary || "—"}
        </DataTableCellLink>
      ),
    },
    {
      key: "headquarters",
      label: "Headquarters",
      className: "text-muted-foreground",
      render: (network) => (
        <DataTableCellLink to={`/app/networks/${network.id}`}>
          {network.headquarters || "—"}
        </DataTableCellLink>
      ),
    },
    {
      key: "organizations",
      label: "Organizations",
      className: "tabular-nums text-muted-foreground",
      render: (network) => (
        <DataTableCellLink to={`/app/networks/${network.id}`}>
          {network.organizations.length}
        </DataTableCellLink>
      ),
    },
    {
      key: "schemas",
      label: "Schemas",
      className: "tabular-nums text-muted-foreground",
      render: (network) => (
        <DataTableCellLink to={`/app/networks/${network.id}`}>
          {network.schemas.length}
        </DataTableCellLink>
      ),
    },
  ]

  return (
    <DataTablePage
      title="All Networks"
      description="Networks group organizations and the schemas they share. Open a row to inspect a network."
      action={
        <Button onClick={openCreateNetwork}>
          <PlusIcon />
          Create a network
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search networks..."
        filters={
          <DataTableFilter
            label="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            className="sm:w-40"
            options={[
              { value: "all", label: "All statuses" },
              { value: "Active", label: "Active" },
              { value: "Draft", label: "Draft" },
            ]}
          />
        }
        count={dataTableCount({
          isLoading,
          loadingLabel: "Loading networks...",
          visible: rows.length,
          total: networks.length,
          singular: "network",
        })}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load networks")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          sort={sort}
          onSort={(key) => setSort((current) => toggleSort(current, key))}
          getRowId={(network) => network.id}
          empty={
            isLoading
              ? "Loading networks..."
              : filtersActive
                ? "No networks match this view."
                : "You do not have any networks yet. Create one to get started."
          }
        />
      )}
    </DataTablePage>
  )
}

function compareNetworks(left: Network, right: Network, key: NetworkSortKey) {
  if (key === "organizations") {
    return left.organizations.length - right.organizations.length
  }
  if (key === "schemas") {
    return left.schemas.length - right.schemas.length
  }
  if (key === "industry") {
    return compareText(
      left.industry || left.summary,
      right.industry || right.summary
    )
  }
  return compareText(String(left[key] ?? ""), String(right[key] ?? ""))
}
