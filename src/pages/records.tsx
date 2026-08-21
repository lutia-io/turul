import { useMemo } from "react"
import { useSearchParams } from "react-router"
import { PlusIcon, TableIcon } from "lucide-react"

import {
  SchemaRecordsTable,
  SchemaSheetTabs,
} from "@/components/schema-records-table"
import { Button } from "@/components/ui/button"
import { files } from "@/data/files"
import { networkList, organizationList, type Network } from "@/data/networks"
import { records } from "@/data/records"
import { getBadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"
import {
  networkWorkspacePath,
  useNetworkWorkspace,
} from "@/lib/network-workspace"

export default function RecordsPage() {
  const { network, organizationId } = useNetworkWorkspace()
  const [params, setParams] = useSearchParams()
  const networks = network ? [network] : networkList
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
    []
  )
  const organizationsById = useMemo(
    () =>
      new Map(
        organizationList.map(({ organization }) => [
          organization.id,
          organization,
        ])
      ),
    []
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Each schema is a table. Open a row for the record, or click a file
              to preview it.
            </p>
          </div>
          <Button>
            <PlusIcon />
            Add record
          </Button>
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

      {activeSchema ? (
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
