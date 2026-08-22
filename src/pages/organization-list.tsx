import { useMemo, useState } from "react"
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
import type { Network, Organization } from "@/data/networks"
import {
  networkWorkspacePath,
  useWorkspaceNetworks,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"

type OrganizationSortKey =
  | "name"
  | "status"
  | "type"
  | "location"
  | "network"
  | "members"

type OrganizationRow = {
  organization: Organization
  network: Network
}

export default function OrganizationList() {
  const { openCreateOrganization } = useCreateEntity()
  const { networks, isLoading, isError, error } = useWorkspaceNetworks()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sort, setSort] = useState<DataTableSort<OrganizationSortKey>>({
    key: "name",
    direction: "asc",
  })
  const items = useMemo(
    () =>
      networks.flatMap((network) =>
        network.organizations.map((organization) => ({ organization, network }))
      ),
    [networks]
  )
  const filtered = items.filter(({ organization, network }) => {
    if (statusFilter !== "all" && organization.status !== statusFilter) {
      return false
    }

    return matchesQuery(query, [
      organization.name,
      organization.status,
      organization.type,
      organization.location,
      network.name,
      organization.id,
    ])
  })
  const rows = [...filtered].sort((left, right) => {
    const result = compareOrganizations(left, right, sort.key)
    return sort.direction === "asc" ? result : -result
  })
  const filtersActive = query.trim().length > 0 || statusFilter !== "all"

  function hrefFor(row: OrganizationRow) {
    return networkWorkspacePath({
      networkId: row.network.id,
      organizationId: row.organization.id,
    })
  }

  const columns: DataTableColumn<OrganizationRow, OrganizationSortKey>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <DataTableCellLink
          to={hrefFor(row)}
          className="max-w-[22rem] font-medium"
        >
          {row.organization.name}
        </DataTableCellLink>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <DataTableCellLink
          to={hrefFor(row)}
          className="inline-flex items-center gap-1.5"
        >
          <StatusBadge status={row.organization.status} />
          <span className="text-muted-foreground">
            {row.organization.status}
          </span>
        </DataTableCellLink>
      ),
    },
    {
      key: "type",
      label: "Type",
      className: "text-muted-foreground",
      render: (row) => (
        <DataTableCellLink to={hrefFor(row)}>
          {row.organization.type || "—"}
        </DataTableCellLink>
      ),
    },
    {
      key: "location",
      label: "Location",
      className: "text-muted-foreground",
      render: (row) => (
        <DataTableCellLink to={hrefFor(row)}>
          {row.organization.location || "—"}
        </DataTableCellLink>
      ),
    },
    {
      key: "network",
      label: "Network",
      className: "text-muted-foreground",
      render: (row) => (
        <DataTableCellLink to={hrefFor(row)}>
          {row.network.name}
        </DataTableCellLink>
      ),
    },
    {
      key: "members",
      label: "Members",
      className: "tabular-nums text-muted-foreground",
      render: (row) => (
        <DataTableCellLink to={hrefFor(row)}>
          {row.organization.members}
        </DataTableCellLink>
      ),
    },
  ]

  return (
    <DataTablePage
      title="All Organizations"
      description="Organizations belong to a network. They can use shared network schemas and define their own."
      action={
        <Button onClick={() => openCreateOrganization()}>
          <PlusIcon />
          Create an organization
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search organizations..."
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
          loadingLabel: "Loading organizations...",
          visible: rows.length,
          total: items.length,
          singular: "organization",
        })}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load organizations")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          sort={sort}
          onSort={(key) => setSort((current) => toggleSort(current, key))}
          getRowId={(row) => row.organization.id}
          empty={
            isLoading
              ? "Loading organizations..."
              : filtersActive
                ? "No organizations match this view."
                : "You do not have any organizations yet. Create one to get started."
          }
        />
      )}
    </DataTablePage>
  )
}

function compareOrganizations(
  left: OrganizationRow,
  right: OrganizationRow,
  key: OrganizationSortKey
) {
  if (key === "network") {
    return compareText(left.network.name, right.network.name)
  }
  if (key === "members") {
    return left.organization.members - right.organization.members
  }
  return compareText(
    String(left.organization[key] ?? ""),
    String(right.organization[key] ?? "")
  )
}
