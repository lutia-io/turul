import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"
import { PencilIcon, PlusIcon, ViewIcon } from "lucide-react"
import { useTable } from "@tanstack/react-table"

import {
  DataTableCellLink,
  DataTablePage,
  DataTableToolbar,
  dataTablePageSummary,
} from "@/components/data-table"
import {
  createManagedColumnHelper,
  DataTableActiveFilters,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableRowActions,
  DataTableView,
  DataTableViewOptions,
  managedTableFeatures,
  stringFilterOps,
  type ColumnPinningState,
  type DataTableActiveFilter,
  type PaginationState,
  type SortingState,
  type StringFilterOp,
} from "@/components/data-table-view"
import { useCreateEntity } from "@/components/create-entity"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  networkWorkspacePath,
  organizationUserName,
  useNetworkWorkspace,
  useWorkspaceOrganizations,
  workspaceOrganizationUserFromApi,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListOrganizationUsersQuery,
  type ListOrganizationUsersParams,
  type OrganizationUserListSort,
} from "@/store/organization-user-slice"

type OrganizationUserRow = ReturnType<typeof workspaceOrganizationUserFromApi>

const helper = createManagedColumnHelper<OrganizationUserRow>()
const EMPTY_USERS: OrganizationUserRow[] = []

type UserColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  email?: { op: StringFilterOp; value: string }
  organization?: { op: StringFilterOp; value: string }
}

const sortFields: OrganizationUserListSort[] = [
  "name",
  "email",
  "organization",
  "createdAt",
  "updatedAt",
]

function isUserSort(value: string): value is OrganizationUserListSort {
  return sortFields.includes(value as OrganizationUserListSort)
}

function headerPin(column: {
  getIsPinned: () => false | "start" | "end"
  pin: (position: false | "start" | "end") => void
}) {
  return {
    position: column.getIsPinned(),
    onPin: (position: false | "start" | "end") => column.pin(position),
  }
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function OrganizationUserList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreateOrganizationUser, openEditOrganizationUser } =
    useCreateEntity()
  const { organizations } = useWorkspaceOrganizations()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<UserColumnFilters>({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [columnVisibility, setColumnVisibility] = useState({})
  const [columnSizing, setColumnSizing] = useState({})
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    start: [],
    end: ["actions"],
  })

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [debouncedQuery, columnFilters, network?.id, organizationId])

  const listParams = useMemo<ListOrganizationUsersParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isUserSort(sort.id) ? sort.id : "name",
      order: sort?.desc ? "desc" : "asc",
      networkId: network?.id,
      organizationId,
      name: columnFilters.name?.value,
      nameOp: columnFilters.name?.op,
      email: columnFilters.email?.value,
      emailOp: columnFilters.email?.op,
      organization: columnFilters.organization?.value,
      organizationOp: columnFilters.organization?.op,
    }
  }, [
    columnFilters,
    debouncedQuery,
    network?.id,
    organizationId,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
  ])

  const { data, isLoading, isFetching, isError, error, refetch } =
    useListOrganizationUsersQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const rows = useMemo(
    () => list?.items.map(workspaceOrganizationUserFromApi) ?? EMPTY_USERS,
    [list]
  )
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)
  const organizationsById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  )

  const hrefFor = useCallback(
    (user: OrganizationUserRow) => {
      return networkWorkspacePath({
        networkId: user.networkId,
        organizationId,
        rest: `organization-users/${user.id}`,
      })
    },
    [organizationId]
  )

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor((user) => organizationUserName(user), {
          id: "name",
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Name"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "text",
                value: columnFilters.name,
                onChange: (value) =>
                  setColumnFilters((current) => ({ ...current, name: value })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="font-medium"
            >
              {organizationUserName(row.original)}
            </DataTableCellLink>
          ),
          size: 220,
          enableHiding: false,
        }),
        helper.accessor("email", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Email"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "text",
                value: columnFilters.email,
                onChange: (value) =>
                  setColumnFilters((current) => ({ ...current, email: value })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="text-muted-foreground"
            >
              {row.original.email}
            </DataTableCellLink>
          ),
          size: 240,
        }),
        ...(!organizationId
          ? [
              helper.accessor(
                (user) =>
                  organizationsById.get(user.organizationId)?.name ??
                  user.organizationId,
                {
                  id: "organization",
                  header: ({ column }) => (
                    <DataTableColumnHeader
                      title="Organization"
                      sorted={column.getIsSorted()}
                      onSort={column.getToggleSortingHandler()}
                      pin={headerPin(column)}
                      filter={{
                        type: "text",
                        value: columnFilters.organization,
                        onChange: (value) =>
                          setColumnFilters((current) => ({
                            ...current,
                            organization: value,
                          })),
                      }}
                    />
                  ),
                  cell: ({ row }) => (
                    <DataTableCellLink
                      to={hrefFor(row.original)}
                      className="text-muted-foreground"
                    >
                      {organizationsById.get(row.original.organizationId)
                        ?.name ?? row.original.organizationId}
                    </DataTableCellLink>
                  ),
                  size: 180,
                }
              ),
            ]
          : []),
        helper.accessor("createdAt", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Created"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="whitespace-nowrap text-muted-foreground"
            >
              {formatCreatedAt(row.original.createdAt)}
            </DataTableCellLink>
          ),
          size: 160,
        }),
        helper.display({
          id: "actions",
          enableSorting: false,
          enableHiding: false,
          enableResizing: false,
          size: 52,
          minSize: 52,
          maxSize: 52,
          cell: ({ row }) => (
            <DataTableRowActions
              items={
                <>
                  <DropdownMenuItem
                    render={<Link to={hrefFor(row.original)} />}
                  >
                    <ViewIcon />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openEditOrganizationUser(row.original.id)}
                  >
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>
                </>
              }
            />
          ),
        }),
      ]),
    [
      columnFilters,
      hrefFor,
      openEditOrganizationUser,
      organizationId,
      organizationsById,
    ]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (user) => user.id,
    defaultColumn: {
      minSize: 80,
      size: 160,
      maxSize: 480,
    },
    manualPagination: true,
    manualSorting: true,
    autoResetPageIndex: false,
    enableSortingRemoval: false,
    enableMultiSort: false,
    enableColumnResizing: true,
    enableColumnPinning: true,
    columnResizeMode: "onChange",
    rowCount: total,
    state: {
      pagination,
      sorting,
      columnVisibility,
      columnSizing,
      columnPinning,
    },
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(updater)
      setPagination((current) => ({ ...current, pageIndex: 0 }))
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
  })

  const activeFilters = useMemo<DataTableActiveFilter[]>(() => {
    const chips: DataTableActiveFilter[] = []
    if (columnFilters.name) {
      chips.push({
        id: "name",
        label: "Name",
        value: `${opLabel(columnFilters.name.op)} “${columnFilters.name.value}”`,
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, name: undefined })),
      })
    }
    if (columnFilters.email) {
      chips.push({
        id: "email",
        label: "Email",
        value: `${opLabel(columnFilters.email.op)} “${columnFilters.email.value}”`,
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, email: undefined })),
      })
    }
    if (columnFilters.organization) {
      chips.push({
        id: "organization",
        label: "Organization",
        value: `${opLabel(columnFilters.organization.op)} “${columnFilters.organization.value}”`,
        onRemove: () =>
          setColumnFilters((current) => ({
            ...current,
            organization: undefined,
          })),
      })
    }
    return chips
  }, [columnFilters])

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
        searchPlaceholder="Search name or email..."
        searchClassName="sm:max-w-3xl"
        chips={<DataTableActiveFilters filters={activeFilters} />}
        trailing={<DataTableViewOptions table={table} />}
        count={dataTablePageSummary({
          isLoading,
          loadingLabel: "Loading organization users...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
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
        <>
          <DataTableView
            table={table}
            isRefreshing={isFetching}
            empty={
              isLoading
                ? "Loading organization users..."
                : filtersActive
                  ? "No organization users match this view."
                  : "No organization users yet. Create one so people can sign in."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
    </DataTablePage>
  )
}

function opLabel(op: StringFilterOp) {
  return stringFilterOps.find((item) => item.value === op)?.label ?? op
}
