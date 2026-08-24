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
  stringFilterChipValue,
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
  useNetworkWorkspace,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import {
  useListOrganizationsQuery,
  type ApiOrganization,
  type ListOrganizationsParams,
  type OrganizationListSort,
} from "@/store/organization-slice"

type OrganizationRow = {
  id: string
  name: string
  slug: string
  networkId: string
  createdAt: string
  updatedAt: string
}

const helper = createManagedColumnHelper<OrganizationRow>()
const EMPTY_ORGANIZATIONS: OrganizationRow[] = []

type OrganizationColumnFilters = {
  name?: { op: StringFilterOp; value: string }
  slug?: { op: StringFilterOp; value: string }
}

const sortFields: OrganizationListSort[] = [
  "name",
  "slug",
  "createdAt",
  "updatedAt",
  "network",
]

function isOrganizationSort(value: string): value is OrganizationListSort {
  return sortFields.includes(value as OrganizationListSort)
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

function organizationFromApi(organization: ApiOrganization): OrganizationRow {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    networkId: organization.networkId,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  }
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export default function OrganizationList() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network, organization, organizationId } = useNetworkWorkspace()
  const { openCreateOrganization, openEditOrganization } = useCreateEntity()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [columnFilters, setColumnFilters] = useState<OrganizationColumnFilters>(
    {}
  )
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

  const listParams = useMemo<ListOrganizationsParams>(() => {
    const sort = sorting[0]
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      q: debouncedQuery.trim() || undefined,
      sort: sort && isOrganizationSort(sort.id) ? sort.id : "name",
      order: sort?.desc ? "desc" : "asc",
      networkId: network?.id,
      name: columnFilters.name?.value,
      nameOp: columnFilters.name?.op,
      slug: columnFilters.slug?.value,
      slugOp: columnFilters.slug?.op,
    }
  }, [
    columnFilters,
    debouncedQuery,
    network?.id,
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
  ])

  const { data, isLoading, isFetching, isError, error, refetch } =
    useListOrganizationsQuery(listParams, {
      skip: !isAuthenticated,
    })
  const dataRef = useRef(data)
  if (data) {
    dataRef.current = data
  }
  const list = data ?? dataRef.current
  const rows = useMemo(
    () => list?.items.map(organizationFromApi) ?? EMPTY_ORGANIZATIONS,
    [list]
  )
  const total = list?.total ?? 0
  const filtersActive =
    query.trim().length > 0 || Object.values(columnFilters).some(Boolean)

  const hrefFor = useCallback((item: OrganizationRow) => {
    return networkWorkspacePath({
      networkId: item.networkId,
      organizationId: item.id,
    })
  }, [])

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
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
              {row.original.name}
            </DataTableCellLink>
          ),
          size: 240,
          enableHiding: false,
        }),
        helper.accessor("slug", {
          header: ({ column }) => (
            <DataTableColumnHeader
              title="Slug"
              sorted={column.getIsSorted()}
              onSort={column.getToggleSortingHandler()}
              pin={headerPin(column)}
              filter={{
                type: "text",
                value: columnFilters.slug,
                onChange: (value) =>
                  setColumnFilters((current) => ({ ...current, slug: value })),
              }}
            />
          ),
          cell: ({ row }) => (
            <DataTableCellLink
              to={hrefFor(row.original)}
              className="font-mono text-muted-foreground"
            >
              {row.original.slug}
            </DataTableCellLink>
          ),
          size: 180,
        }),
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
          size: 140,
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
                    onClick={() => openEditOrganization(row.original.id)}
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
    [columnFilters, hrefFor, openEditOrganization]
  )

  const table = useTable({
    features: managedTableFeatures,
    columns,
    data: rows,
    getRowId: (item) => item.id,
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
        value: stringFilterChipValue(columnFilters.name.op, columnFilters.name.value),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, name: undefined })),
      })
    }
    if (columnFilters.slug) {
      chips.push({
        id: "slug",
        label: "Slug",
        value: stringFilterChipValue(columnFilters.slug.op, columnFilters.slug.value),
        onRemove: () =>
          setColumnFilters((current) => ({ ...current, slug: undefined })),
      })
    }
    return chips
  }, [columnFilters])

  return (
    <DataTablePage
      title="Organizations"
      description={
        organization
          ? `Organizations in ${network?.name ?? "this network"}. You are currently viewing ${organization.name}.`
          : network
            ? `Organizations that belong to ${network.name}. They can use shared network schemas and define their own.`
            : "Organizations belong to a network. They can use shared network schemas and define their own."
      }
      action={
        <Button onClick={() => openCreateOrganization(network?.id)}>
          <PlusIcon />
          Create organization
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search name or slug..."
        searchClassName="sm:max-w-3xl"
        chips={<DataTableActiveFilters filters={activeFilters} />}
        trailing={<DataTableViewOptions table={table} />}
        count={dataTablePageSummary({
          isLoading,
          loadingLabel: "Loading organizations...",
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          total,
          singular: "organization",
        })}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load organizations")}
        </p>
      ) : (
        <>
          <DataTableView
            table={table}
            isRefreshing={isFetching}
            empty={
              isLoading
                ? "Loading organizations..."
                : filtersActive
                  ? "No organizations match this view."
                  : "No organizations yet. Create one to start collaborating in this network."
            }
          />
          <DataTablePagination table={table} />
        </>
      )}
    </DataTablePage>
  )
}

