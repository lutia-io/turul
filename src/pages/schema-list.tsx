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
import type { Schema } from "@/data/networks"
import {
  definitionDescription,
  jsonSchemaPropertyCount,
  publicationStatus,
} from "@/lib/json-definition"
import {
  schemaScopeLabel,
  useNetworkWorkspace,
  useWorkspaceNetworks,
  useWorkspaceOrganizations,
  useWorkspaceSchemas,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"

type SchemaSortKey = "name" | "slug" | "scope" | "properties" | "status"

export default function SchemaList() {
  const { network, organization, organizationId, href } = useNetworkWorkspace()
  const { openCreateSchema } = useCreateEntity()
  const { networks } = useWorkspaceNetworks()
  const { organizations } = useWorkspaceOrganizations()
  const { schemas, isLoading, isFetching, isError, error, refetch } =
    useWorkspaceSchemas()
  const [query, setQuery] = useState("")
  const [scopeFilter, setScopeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sort, setSort] = useState<DataTableSort<SchemaSortKey>>({
    key: "name",
    direction: "asc",
  })
  const items = network ? network.schemas : schemas
  const networksById = useMemo(
    () => new Map(networks.map((item) => [item.id, item])),
    [networks]
  )
  const filtered = items.filter((schema) => {
    if (scopeFilter === "network" && schema.organizationId) {
      return false
    }
    if (scopeFilter === "organization" && !schema.organizationId) {
      return false
    }
    if (statusFilter === "published" && !schema.active) {
      return false
    }
    if (statusFilter === "draft" && schema.active) {
      return false
    }

    return matchesQuery(query, [
      schema.name,
      schema.slug,
      schemaScopeLabel(schema, organizations),
      schema.networkId ? networksById.get(schema.networkId)?.name : "",
      definitionDescription(schema.definition),
      schema.id,
    ])
  })
  const rows = [...filtered].sort((left, right) => {
    const result = compareSchemas(left, right, sort.key, organizations)
    return sort.direction === "asc" ? result : -result
  })
  const filtersActive =
    query.trim().length > 0 || scopeFilter !== "all" || statusFilter !== "all"

  function hrefFor(schema: Schema) {
    return network ? href(`schemas/${schema.id}`) : `/app/schemas/${schema.id}`
  }

  const columns: DataTableColumn<Schema, SchemaSortKey>[] = [
    {
      key: "name",
      label: "Name",
      className: "font-medium",
      render: (schema) => (
        <DataTableCellLink
          to={hrefFor(schema)}
          className="max-w-[22rem] font-medium"
        >
          {schema.name}
        </DataTableCellLink>
      ),
    },
    {
      key: "slug",
      label: "Slug",
      className: "font-mono text-muted-foreground",
      render: (schema) => (
        <DataTableCellLink to={hrefFor(schema)}>
          {schema.slug}
        </DataTableCellLink>
      ),
    },
    {
      key: "scope",
      label: "Scope",
      className: "text-muted-foreground",
      render: (schema) => (
        <DataTableCellLink to={hrefFor(schema)}>
          {schemaScopeLabel(schema, organizations)}
        </DataTableCellLink>
      ),
    },
    {
      key: "properties",
      label: "Properties",
      className: "tabular-nums text-muted-foreground",
      render: (schema) => (
        <DataTableCellLink to={hrefFor(schema)}>
          {jsonSchemaPropertyCount(schema.definition)}
        </DataTableCellLink>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (schema) => {
        const status = publicationStatus(schema.active)
        return (
          <DataTableCellLink
            to={hrefFor(schema)}
            className="inline-flex items-center gap-1.5"
          >
            <StatusBadge status={status} />
            <span className="text-muted-foreground">{status}</span>
          </DataTableCellLink>
        )
      },
    },
  ]

  return (
    <DataTablePage
      title="Schemas"
      description={
        organization
          ? `Network-wide schemas shared with ${organization.name}, plus schemas that belong only to this organization.`
          : network
            ? `JSON shapes used by records in ${network.name}.`
            : "JSON shapes used by records across your networks."
      }
      action={
        <Button
          onClick={() =>
            openCreateSchema({
              networkId: network?.id,
              organizationId,
            })
          }
        >
          <PlusIcon />
          Create schema
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search schemas..."
        filters={
          <>
            <DataTableFilter
              label="Filter by scope"
              value={scopeFilter}
              onChange={setScopeFilter}
              className="sm:w-44"
              options={[
                { value: "all", label: "All scopes" },
                { value: "network", label: "Network schemas" },
                { value: "organization", label: "Organization schemas" },
              ]}
            />
            <DataTableFilter
              label="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              className="sm:w-40"
              options={[
                { value: "all", label: "All statuses" },
                { value: "published", label: "Published" },
                { value: "draft", label: "Draft" },
              ]}
            />
          </>
        }
        count={dataTableCount({
          isLoading,
          loadingLabel: "Loading schemas...",
          visible: rows.length,
          total: items.length,
          singular: "schema",
        })}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load schemas")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          sort={sort}
          onSort={(key) => setSort((current) => toggleSort(current, key))}
          getRowId={(schema) => schema.id}
          isRefreshing={isFetching}
          empty={
            isLoading
              ? "Loading schemas..."
              : filtersActive
                ? "No schemas match this view."
                : "No schemas yet. Create one to define the JSONB shape of records."
          }
        />
      )}
    </DataTablePage>
  )
}

function compareSchemas(
  left: Schema,
  right: Schema,
  key: SchemaSortKey,
  organizations: Parameters<typeof schemaScopeLabel>[1]
) {
  if (key === "properties") {
    return (
      jsonSchemaPropertyCount(left.definition) -
      jsonSchemaPropertyCount(right.definition)
    )
  }
  if (key === "status") {
    return Number(left.active) - Number(right.active)
  }
  if (key === "scope") {
    return compareText(
      schemaScopeLabel(left, organizations),
      schemaScopeLabel(right, organizations)
    )
  }
  return compareText(String(left[key]), String(right[key]))
}
