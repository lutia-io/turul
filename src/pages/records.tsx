import { useMemo } from "react"
import { useSearchParams } from "react-router"
import { TableIcon } from "lucide-react"

import {
  SchemaRecordsTable,
  SchemaSheetTabs,
} from "@/components/schema-records-table"
import { type Network } from "@/data/networks"
import { getBadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
  useWorkspaceFiles,
  useWorkspaceNetworks,
  useWorkspaceOrganizations,
  useWorkspaceRecords,
} from "@/lib/network-workspace"
import { getHumaErrorMessage } from "@/store/api"

export default function RecordsPage() {
  const { network, organizationId } = useNetworkWorkspace()
  const { networks: workspaceNetworks } = useWorkspaceNetworks()
  const { organizations } = useWorkspaceOrganizations()
  const { records, isLoading, isError, error } = useWorkspaceRecords()
  const { files } = useWorkspaceFiles()
  const [params, setParams] = useSearchParams()
  const networks = network ? [network] : workspaceNetworks
  const requestedNetworkId = params.get("network")
  const activeNetwork =
    network ??
    networks.find((item) => item.id === requestedNetworkId) ??
    networks[0]
  const schemas = activeNetwork?.schemas ?? []
  const requestedSchemaId = params.get("schema")
  const activeSchema =
    schemas.find((item) => item.id === requestedSchemaId) ?? schemas[0]
  const filesById = useMemo(
    () => new Map(files.map((file) => [file.id, file])),
    [files]
  )
  const organizationsById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  )
  const visibleRecords = records.filter((record) => {
    if (activeSchema && record.schemaId !== activeSchema.id) {
      return false
    }

    if (activeNetwork && record.networkId !== activeNetwork.id) {
      return false
    }

    if (organizationId && record.organizationId !== organizationId) {
      return false
    }

    return true
  })

  function setWorkbook(next: { networkId?: string; schemaId?: string }) {
    const nextParams = new URLSearchParams(params)

    if (next.networkId && !network) {
      nextParams.set("network", next.networkId)
      nextParams.delete("schema")
    }

    if (next.schemaId) {
      nextParams.set("schema", next.schemaId)
    }

    setParams(nextParams, { replace: true })
  }

  return (
    <div className="flex h-[calc(100svh-var(--app-header-height))] min-h-0 flex-col gap-4 overflow-hidden bg-muted/40 p-4 sm:p-6">
      <div className="flex shrink-0 flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Each schema is a table. Open a row for the record, or click a file
            to preview it.
          </p>
        </div>

        {!network ? (
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {networks.map((item) => (
              <NetworkPill
                key={item.id}
                network={item}
                active={item.id === activeNetwork?.id}
                onSelect={() => setWorkbook({ networkId: item.id })}
              />
            ))}
          </div>
        ) : null}

        {schemas.length > 0 ? (
          <SchemaSheetTabs
            schemas={schemas}
            activeId={activeSchema?.id}
            onSelect={(schemaId) => setWorkbook({ schemaId })}
          />
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading records...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {getHumaErrorMessage(error, "Failed to load records")}
        </p>
      ) : activeSchema ? (
        <SchemaRecordsTable
          schema={activeSchema}
          records={visibleRecords}
          filesById={filesById}
          organizationsById={organizationsById}
          showOrganization={!organizationId}
          recordHref={(record) =>
            networkWorkspacePath({
              networkId: record.networkId,
              organizationId,
              rest: `records/${record.id}`,
            })
          }
          fileHref={(fileId) =>
            networkWorkspacePath({
              networkId: activeNetwork.id,
              organizationId,
              rest: `files/${fileId}`,
            })
          }
        />
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-xl border bg-background text-sm text-muted-foreground">
          <TableIcon className="mr-2 size-4" />
          No schemas in this network.
        </div>
      )}
    </div>
  )
}

function NetworkPill({
  network,
  active,
  onSelect,
}: {
  network: Network
  active: boolean
  onSelect: () => void
}) {
  const tone = getBadgeColor(network.color)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-foreground/15 bg-background font-medium shadow-xs"
          : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <span className={cn("size-2 rounded-full", tone.bg)} />
      {network.name}
    </button>
  )
}
