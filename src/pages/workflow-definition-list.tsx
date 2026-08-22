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
import type { WorkflowDefinition } from "@/data/networks"
import { publicationStatus } from "@/lib/json-definition"
import {
  useNetworkWorkspace,
  useWorkspaceNetworks,
  useWorkspaceSchemas,
  useWorkspaceWorkflows,
} from "@/lib/network-workspace"
import { workflowSummary } from "@/lib/workflow-definition"
import { getHumaErrorMessage } from "@/store/api"

type WorkflowSortKey = "name" | "network" | "schema" | "summary" | "status"

export default function WorkflowDefinitionList() {
  const { network, href } = useNetworkWorkspace()
  const { openCreateWorkflow } = useCreateEntity()
  const { networks } = useWorkspaceNetworks()
  const {
    schemas,
    isLoading: isSchemasLoading,
    isFetching: isSchemasFetching,
    refetch: refetchSchemas,
  } = useWorkspaceSchemas()
  const { workflows, isLoading, isFetching, isError, error, refetch } =
    useWorkspaceWorkflows()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sort, setSort] = useState<DataTableSort<WorkflowSortKey>>({
    key: "name",
    direction: "asc",
  })
  const items = network ? network.workflowDefinitions : workflows
  const schemasById = useMemo(
    () => new Map(schemas.map((schema) => [schema.id, schema])),
    [schemas]
  )
  const networksById = useMemo(
    () => new Map(networks.map((item) => [item.id, item])),
    [networks]
  )
  const filtered = items.filter((workflow) => {
    if (statusFilter === "published" && !workflow.active) {
      return false
    }
    if (statusFilter === "draft" && workflow.active) {
      return false
    }

    return matchesQuery(query, [
      workflow.name,
      workflow.slug,
      schemasById.get(workflow.schemaId)?.name,
      workflowSummary(workflow.definition),
      workflow.networkId ? networksById.get(workflow.networkId)?.name : "",
      workflow.id,
    ])
  })
  const rows = [...filtered].sort((left, right) => {
    const result = compareWorkflows(
      left,
      right,
      sort.key,
      schemasById,
      networksById
    )
    return sort.direction === "asc" ? result : -result
  })
  const loading = isLoading || isSchemasLoading
  const filtersActive = query.trim().length > 0 || statusFilter !== "all"

  function hrefFor(workflow: WorkflowDefinition) {
    return network
      ? href(`workflow-definitions/${workflow.id}`)
      : `/app/workflow-definitions/${workflow.id}`
  }

  const columns: DataTableColumn<WorkflowDefinition, WorkflowSortKey>[] = [
    {
      key: "name",
      label: "Name",
      render: (workflow) => (
        <DataTableCellLink
          to={hrefFor(workflow)}
          className="max-w-[22rem] font-medium"
        >
          {workflow.name}
        </DataTableCellLink>
      ),
    },
    ...(!network
      ? [
          {
            key: "network" as const,
            label: "Network",
            className: "text-muted-foreground",
            render: (workflow: WorkflowDefinition) => (
              <DataTableCellLink to={hrefFor(workflow)}>
                {workflow.networkId
                  ? (networksById.get(workflow.networkId)?.name ?? "—")
                  : "—"}
              </DataTableCellLink>
            ),
          },
        ]
      : []),
    {
      key: "schema",
      label: "Starts from",
      className: "text-muted-foreground",
      render: (workflow) => (
        <DataTableCellLink to={hrefFor(workflow)}>
          {schemasById.get(workflow.schemaId)?.name ?? "Record"}
        </DataTableCellLink>
      ),
    },
    {
      key: "summary",
      label: "Definition",
      className: "text-muted-foreground",
      render: (workflow) => (
        <DataTableCellLink to={hrefFor(workflow)} className="max-w-[28rem]">
          {workflowSummary(workflow.definition)}
        </DataTableCellLink>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (workflow) => {
        const status = publicationStatus(workflow.active)
        return (
          <DataTableCellLink
            to={hrefFor(workflow)}
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
      title="Workflow Definitions"
      description={
        network
          ? `When a record is created in ${network.name}, matching workflows run their actions.`
          : "Workflows that run when a matching record is created."
      }
      action={
        <Button onClick={() => openCreateWorkflow(network?.id)}>
          <PlusIcon />
          Create workflow
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search workflows..."
        filters={
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
        }
        count={dataTableCount({
          isLoading: loading,
          loadingLabel: "Loading workflows...",
          visible: rows.length,
          total: items.length,
          singular: "workflow",
        })}
        onRefresh={() => {
          void refetch()
          void refetchSchemas()
        }}
        isRefreshing={isFetching || isSchemasFetching}
      />
      {isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load workflows")}
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          sort={sort}
          onSort={(key) => setSort((current) => toggleSort(current, key))}
          getRowId={(workflow) => workflow.id}
          isRefreshing={isFetching || isSchemasFetching}
          empty={
            loading
              ? "Loading workflows..."
              : filtersActive
                ? "No workflows match this view."
                : "No workflow definitions yet. Create one to automate what happens when a record is created."
          }
        />
      )}
    </DataTablePage>
  )
}

function compareWorkflows(
  left: WorkflowDefinition,
  right: WorkflowDefinition,
  key: WorkflowSortKey,
  schemasById: Map<string, { name: string }>,
  networksById: Map<string, { name: string }>
) {
  if (key === "network") {
    return compareText(
      left.networkId ? (networksById.get(left.networkId)?.name ?? "") : "",
      right.networkId ? (networksById.get(right.networkId)?.name ?? "") : ""
    )
  }
  if (key === "schema") {
    return compareText(
      schemasById.get(left.schemaId)?.name ?? "",
      schemasById.get(right.schemaId)?.name ?? ""
    )
  }
  if (key === "summary") {
    return compareText(
      workflowSummary(left.definition),
      workflowSummary(right.definition)
    )
  }
  if (key === "status") {
    return Number(left.active) - Number(right.active)
  }
  return compareText(left.name, right.name)
}
