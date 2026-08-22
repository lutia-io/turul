import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

export default function OrganizationUserList() {
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreateOrganizationUser } = useCreateEntity()
  const { organizations } = useWorkspaceOrganizations()
  const { organizationUsers, isLoading, isError, error } =
    useWorkspaceOrganizationUsers()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<{
    key: UserSortKey
    direction: "asc" | "desc"
  }>({
    key: "name",
    direction: "asc",
  })
  const organizationsById = useMemo(
    () =>
      new Map(
        organizations.map((item) => [item.id, item])
      ),
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
  const searched = scoped.filter((user) => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return true
    }

    const organizationName =
      organizationsById.get(user.organizationId)?.name ?? ""
    return [organizationUserName(user), user.email, organizationName, user.id]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  })
  const rows = [...searched].sort((left, right) => {
    const result = compareUsers(left, right, sort.key, organizationsById)
    return sort.direction === "asc" ? result : -result
  })

  function toggleSort(key: UserSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : {
            key,
            direction: key === "createdAt" ? "desc" : "asc",
          }
    )
  }

  function hrefFor(user: OrganizationUser) {
    return networkWorkspacePath({
      networkId: user.networkId,
      organizationId,
      rest: `organization-users/${user.id}`,
    })
  }

  return (
    <div className="flex h-[calc(100svh-var(--app-header-height))] min-h-0 flex-col gap-4 overflow-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Organization Users
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {organization
              ? `People who can sign in to ${organization.name}.`
              : network
                ? `People who can sign in to an organization in ${network.name}.`
                : "People who can sign in to an organization."}
          </p>
        </div>
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
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search organization users..."
            className="h-8 bg-background pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {isLoading
            ? "Loading organization users..."
            : rows.length === scoped.length
              ? `${scoped.length} users`
              : `${rows.length} of ${scoped.length} users`}
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load organization users")}
        </p>
      ) : (
        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border bg-background shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <UserHead
                  label="Name"
                  sortKey="name"
                  sort={sort}
                  onSort={toggleSort}
                />
                <UserHead
                  label="Email"
                  sortKey="email"
                  sort={sort}
                  onSort={toggleSort}
                />
                {!organizationId ? (
                  <UserHead
                    label="Organization"
                    sortKey="organization"
                    sort={sort}
                    onSort={toggleSort}
                  />
                ) : null}
                <UserHead
                  label="Created"
                  sortKey="createdAt"
                  sort={sort}
                  onSort={toggleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        to={hrefFor(user)}
                        className="block max-w-[22rem] truncate font-medium"
                      >
                        {organizationUserName(user)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link to={hrefFor(user)} className="block truncate">
                        {user.email}
                      </Link>
                    </TableCell>
                    {!organizationId ? (
                      <TableCell className="text-muted-foreground">
                        <Link to={hrefFor(user)} className="block truncate">
                          {organizationsById.get(user.organizationId)?.name ??
                            user.organizationId}
                        </Link>
                      </TableCell>
                    ) : null}
                    <TableCell className="text-muted-foreground">
                      <Link
                        to={hrefFor(user)}
                        className="block whitespace-nowrap"
                      >
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(user.createdAt))}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={organizationId ? 3 : 4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isLoading
                      ? "Loading organization users..."
                      : query.trim()
                        ? "No organization users match this view."
                        : "No organization users yet. Create one so people can sign in."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function UserHead({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: UserSortKey
  sort: { key: UserSortKey; direction: "asc" | "desc" }
  onSort: (key: UserSortKey) => void
}) {
  const direction = sort.key === sortKey ? sort.direction : undefined
  const Icon =
    direction === "asc"
      ? ArrowUpIcon
      : direction === "desc"
        ? ArrowDownIcon
        : ChevronsUpDownIcon

  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <Icon className="size-3.5 opacity-60" />
      </button>
    </TableHead>
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
    const leftName = organizationsById.get(left.organizationId)?.name ?? ""
    const rightName = organizationsById.get(right.organizationId)?.name ?? ""
    return leftName.localeCompare(rightName)
  }

  if (key === "name") {
    return organizationUserName(left).localeCompare(
      organizationUserName(right),
      undefined,
      { sensitivity: "base" }
    )
  }

  return left.email.localeCompare(right.email, undefined, {
    sensitivity: "base",
  })
}
