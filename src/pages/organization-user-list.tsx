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
import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import {
  networkWorkspacePath,
  organizationUserName,
  useNetworkWorkspace,
  useWorkspaceOrganizationUsers,
  useWorkspaceOrganizations,
  workspaceOrganizationUserFromApi,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"

type OrganizationUser = ReturnType<typeof workspaceOrganizationUserFromApi>
type UserSortKey = "name" | "email" | "organization" | "createdAt"

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function OrganizationUserList() {
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreateOrganizationUser } = useCreateEntity()
  const { organizations } = useWorkspaceOrganizations()
  const { organizationUsers, isLoading, isFetching, isError, error, refetch } =
    useWorkspaceOrganizationUsers()
  const [query, setQuery] = useState("")
  const [orgFilter, setOrgFilter] = useState("all")
  const [sort, setSort] = useState<DataTableSort<UserSortKey>>({
    key: "name",
    direction: "asc",
  })
  const organizationsById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  )
  const scoped = organizationUsers.filter((user) => {
    if (network && user.networkId !== network.id) {
      return false
    }
    if (organizationId && user.organizationId !== organizationId) {
      return false
    }
    return true
  })
  const filtered = scoped.filter((user) => {
    if (orgFilter !== "all" && user.organizationId !== orgFilter) {
      return false
    }

    return matchesQuery(query, [
      organizationUserName(user),
      user.email,
      organizationsById.get(user.organizationId)?.name,
      user.id,
    ])
  })
  const rows = [...filtered].sort((left, right) => {
    const result = compareUsers(left, right, sort.key, organizationsById)
    return sort.direction === "asc" ? result : -result
  })
  const filtersActive = query.trim().length > 0 || orgFilter !== "all"

  function hrefFor(user: OrganizationUser) {
    return networkWorkspacePath({
      networkId: user.networkId,
      organizationId,
      rest: `organization-users/${user.id}`,
    })
  }

  const columns: DataTableColumn<OrganizationUser, UserSortKey>[] = [
    {
      key: "name",
      label: "Name",
      render: (user) => (
        <DataTableCellLink
          to={hrefFor(user)}
          className="max-w-[22rem] font-medium"
        >
          {organizationUserName(user)}
        </DataTableCellLink>
      ),
    },
    {
      key: "email",
      label: "Email",
      className: "text-muted-foreground",
      render: (user) => (
        <DataTableCellLink to={hrefFor(user)}>{user.email}</DataTableCellLink>
      ),
    },
    ...(!organizationId
      ? [
          {
            key: "organization" as const,
            label: "Organization",
            className: "text-muted-foreground",
            render: (user: OrganizationUser) => (
              <DataTableCellLink to={hrefFor(user)}>
                {organizationsById.get(user.organizationId)?.name ??
                  user.organizationId}
              </DataTableCellLink>
            ),
          },
        ]
      : []),
    {
      key: "createdAt",
      label: "Created",
      className: "text-muted-foreground",
      render: (user) => (
        <DataTableCellLink to={hrefFor(user)} className="whitespace-nowrap">
          {formatCreatedAt(user.createdAt)}
        </DataTableCellLink>
      ),
    },
  ]

  return (
    <DataTablePage
      title="Organization Users"
      description={
        organization
          ? `People who can sign in to ${organization.name}.`
          : network
            ? `People who can sign in to an organization in ${network.name}.`
            : "People who can sign in to an organization."
      }
      action={
        <Button
          onClick={() =>
            openCreateOrganizationUser({
              networkId: network?.id,
              organizationId,
            })
          }
        >
          <PlusIcon />
          Create organization user
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search organization users..."
        filters={
          !organizationId && organizations.length > 0 ? (
            <DataTableFilter
              label="Filter by organization"
              value={orgFilter}
              onChange={setOrgFilter}
              className="sm:w-52"
              options={[
                { value: "all", label: "All organizations" },
                ...organizations.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          ) : null
        }
        count={dataTableCount({
          isLoading,
          loadingLabel: "Loading organization users...",
          visible: rows.length,
          total: scoped.length,
          singular: "user",
        })}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load organization users")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          sort={sort}
          onSort={(key) =>
            setSort((current) => toggleSort(current, key, ["createdAt"]))
          }
          getRowId={(user) => user.id}
          isRefreshing={isFetching}
          empty={
            isLoading
              ? "Loading organization users..."
              : filtersActive
                ? "No organization users match this view."
                : "No organization users yet. Create one so people can sign in."
          }
        />
      )}
    </DataTablePage>
  )
}

function compareUsers(
  left: OrganizationUser,
  right: OrganizationUser,
  key: UserSortKey,
  organizationsById: Map<string, { name: string }>
) {
  if (key === "createdAt") {
    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
  }
  if (key === "organization") {
    return compareText(
      organizationsById.get(left.organizationId)?.name ?? "",
      organizationsById.get(right.organizationId)?.name ?? ""
    )
  }
  if (key === "name") {
    return compareText(organizationUserName(left), organizationUserName(right))
  }
  return compareText(left.email, right.email)
}
