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
import {
  pipelineDefinitionList,
  type PipelineDefinition,
} from "@/data/networks"
import {
  getPipelineStages,
  pipelineSourceLabel,
  publicationStatus,
} from "@/lib/json-definition"
import { useNetworkWorkspace } from "@/lib/network-workspace"

type PipelineSortKey = "name" | "network" | "source" | "stages" | "status"

type PipelineRow = {
  pipelineDefinition: PipelineDefinition
  networkName: string
}

export default function PipelineDefinitionList() {
  const { network, href } = useNetworkWorkspace()
  const { openCreatePipeline } = useCreateEntity()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sort, setSort] = useState<DataTableSort<PipelineSortKey>>({
    key: "name",
    direction: "asc",
  })
  const items: PipelineRow[] = network
    ? network.pipelineDefinitions.map((pipelineDefinition) => ({
        pipelineDefinition,
        networkName: network.name,
      }))
    : pipelineDefinitionList.map(({ pipelineDefinition, network: itemNetwork }) => ({
        pipelineDefinition,
        networkName: itemNetwork.name,
      }))
  const filtered = items.filter(({ pipelineDefinition, networkName }) => {
    if (statusFilter === "published" && !pipelineDefinition.active) {
      return false
    }
    if (statusFilter === "draft" && pipelineDefinition.active) {
      return false
    }

    return matchesQuery(query, [
      pipelineDefinition.name,
      pipelineDefinition.slug,
      networkName,
      pipelineSourceLabel(pipelineDefinition.definition),
      pipelineDefinition.id,
    ])
  })
  const rows = [...filtered].sort((left, right) => {
    const result = comparePipelines(left, right, sort.key)
    return sort.direction === "asc" ? result : -result
  })
  const filtersActive = query.trim().length > 0 || statusFilter !== "all"

  function hrefFor(row: PipelineRow) {
    return network
      ? href(`pipeline-definitions/${row.pipelineDefinition.id}`)
      : `/app/pipeline-definitions/${row.pipelineDefinition.id}`
  }

  const columns: DataTableColumn<PipelineRow, PipelineSortKey>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <DataTableCellLink
          to={hrefFor(row)}
          className="max-w-[22rem] font-medium"
        >
          {row.pipelineDefinition.name}
        </DataTableCellLink>
      ),
    },
    ...(!network
      ? [
          {
            key: "network" as const,
            label: "Network",
            className: "text-muted-foreground",
            render: (row: PipelineRow) => (
              <DataTableCellLink to={hrefFor(row)}>
                {row.networkName}
              </DataTableCellLink>
            ),
          },
        ]
      : []),
    {
      key: "source",
      label: "Source",
      className: "text-muted-foreground",
      render: (row) => (
        <DataTableCellLink to={hrefFor(row)}>
          {pipelineSourceLabel(row.pipelineDefinition.definition)}
        </DataTableCellLink>
      ),
    },
    {
      key: "stages",
      label: "Stages",
      className: "tabular-nums text-muted-foreground",
      render: (row) => (
        <DataTableCellLink to={hrefFor(row)}>
          {getPipelineStages(row.pipelineDefinition.definition).length}
        </DataTableCellLink>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = publicationStatus(row.pipelineDefinition.active)
        return (
          <DataTableCellLink
            to={hrefFor(row)}
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
      title="Pipeline Definitions"
      description={
        network
          ? `Pipeline definitions used by the ${network.name} network.`
          : "Ingest pipelines that move partner data into records."
      }
      action={
        <Button onClick={() => openCreatePipeline(network?.id)}>
          <PlusIcon />
          Create pipeline
        </Button>
      }
    >
      <DataTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search pipelines..."
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
          visible: rows.length,
          total: items.length,
          singular: "pipeline",
        })}
      />
      <DataTable
        columns={columns}
        rows={rows}
        sort={sort}
        onSort={(key) => setSort((current) => toggleSort(current, key))}
        getRowId={(row) => row.pipelineDefinition.id}
        empty={
          filtersActive
            ? "No pipelines match this view."
            : "No pipeline definitions yet."
        }
      />
    </DataTablePage>
  )
}

function comparePipelines(
  left: PipelineRow,
  right: PipelineRow,
  key: PipelineSortKey
) {
  if (key === "network") {
    return compareText(left.networkName, right.networkName)
  }
  if (key === "source") {
    return compareText(
      pipelineSourceLabel(left.pipelineDefinition.definition),
      pipelineSourceLabel(right.pipelineDefinition.definition)
    )
  }
  if (key === "stages") {
    return (
      getPipelineStages(left.pipelineDefinition.definition).length -
      getPipelineStages(right.pipelineDefinition.definition).length
    )
  }
  if (key === "status") {
    return (
      Number(left.pipelineDefinition.active) -
      Number(right.pipelineDefinition.active)
    )
  }
  return compareText(left.pipelineDefinition.name, right.pipelineDefinition.name)
}
