import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  ArrowRightLeftIcon,
  FileIcon,
  FileJsonIcon,
  GalleryVerticalEndIcon,
  GlobeIcon,
  LayersIcon,
  MessageSquareIcon,
  PencilIcon,
  type LucideIcon,
} from "lucide-react"

import { useCreateEntity } from "@/components/create-entity"
import {
  AsideRow,
  CopyIdButton,
  DefinitionAsideCard,
  DefinitionCard,
  DefinitionColumns,
  DefinitionPage,
  DefinitionSkeleton,
  DefinitionStatusPage,
  PublicationPills,
} from "@/components/definition-detail"
import { JsonDefinitionCard } from "@/components/json-definition-card"
import { Button } from "@/components/ui/button"
import type { PipelineDefinition } from "@/data/networks"
import { getPipelineLevels, type JsonObject } from "@/lib/json-definition"
import {
  useNetworkWorkspace,
  useWorkspacePipelines,
  workspaceNodeFromApi,
} from "@/lib/network-workspace"
import {
  executableNodeTypes,
  httpDraftFromDefinition,
  isNodeType,
  nodeTypeLabel,
  type NodeType,
} from "@/lib/node-definition"
import { formatRelativeTime } from "@/lib/runs"
import { cn } from "@/lib/utils"
import { getHumaErrorMessage } from "@/store/api"
import { useAppSelector } from "@/store/hooks"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useGetNodeDefinitionQuery } from "@/store/node-slice"

type DefinitionView = "config" | "json"

const nodeTypeDescriptions: Record<NodeType, string> = {
  HTTP: "Sends this HTTP request when the node runs in a pipeline.",
  NOOP: "Returns a message and does no other work.",
  MAPPER:
    "Maps fields from the previous level into a new object. Not executed yet.",
  FILE: "File operation stored on this node. Not executed yet.",
}

const nodeTypeIcons: Record<NodeType, LucideIcon> = {
  HTTP: GlobeIcon,
  NOOP: MessageSquareIcon,
  MAPPER: ArrowRightLeftIcon,
  FILE: FileIcon,
}

const nodeConfigTitles: Record<NodeType, string> = {
  HTTP: "Request",
  NOOP: "No-op",
  MAPPER: "Mapping",
  FILE: "File",
}

export default function NodeDefinitionDetail() {
  const { nodeDefinitionId } = useParams()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { network: workspaceNetwork, href } = useNetworkWorkspace()
  const { pipelines } = useWorkspacePipelines()
  const { openEditNode } = useCreateEntity()
  const [definitionView, setDefinitionView] = useState<DefinitionView>("config")
  const nodeQuery = useGetNodeDefinitionQuery(nodeDefinitionId ?? "", {
    skip: !isAuthenticated || !nodeDefinitionId,
  })
  const nodeDefinition = nodeQuery.data
    ? workspaceNodeFromApi(nodeQuery.data)
    : undefined
  const belongsToWorkspace =
    !workspaceNetwork || nodeDefinition?.networkId === workspaceNetwork.id
  const visibleNode = belongsToWorkspace ? nodeDefinition : undefined
  const network = belongsToWorkspace ? workspaceNetwork : undefined
  const knownType =
    visibleNode && isNodeType(visibleNode.type) ? visibleNode.type : undefined
  const executable = knownType ? executableNodeTypes.has(knownType) : false
  const usedInPipelines = visibleNode
    ? pipelinesUsingNode(pipelines, visibleNode.id)
    : []
  const createdAt = nodeQuery.data?.createdAt
  const updatedAt = nodeQuery.data?.updatedAt

  if (nodeQuery.isLoading) {
    return <DefinitionSkeleton />
  }

  if (nodeQuery.isError) {
    return (
      <DefinitionStatusPage
        title="Node definition not found"
        message={getHumaErrorMessage(
          nodeQuery.error,
          "This node definition does not exist or is no longer available."
        )}
        destructive
      />
    )
  }

  if (!visibleNode || !network) {
    return (
      <DefinitionStatusPage
        title="Node definition not found"
        message="This node definition does not exist or is no longer available."
      />
    )
  }

  const typeLabel = nodeTypeLabel(visibleNode.type)
  const typeDescription = knownType
    ? nodeTypeDescriptions[knownType]
    : "Switch to JSON to inspect this node configuration."

  return (
    <DefinitionPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <Link
            to={href("node-definitions")}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {typeLabel} node
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-pretty">
              {visibleNode.name}
            </h1>
            <PublicationPills
              active={visibleNode.active}
              internal={visibleNode.internal}
            />
          </div>
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
            {typeLabel}
            {executable
              ? " · Runs in pipeline executions"
              : " · Stored, not executed yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={definitionView === "json" ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              setDefinitionView((view) =>
                view === "config" ? "json" : "config"
              )
            }
          >
            <FileJsonIcon />
            {definitionView === "json" ? "Config" : "JSON"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={visibleNode.internal}
            onClick={() => openEditNode(visibleNode.id)}
          >
            <PencilIcon />
            Edit
          </Button>
        </div>
      </div>

      <DefinitionColumns
        aside={
          <>
            <DefinitionAsideCard
              title="Details"
              footer={
                <Link
                  to={href("node-definitions")}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all node definitions
                </Link>
              }
            >
              <dl className="mt-4 space-y-4">
                <AsideRow label="Slug">
                  <span className="font-mono text-xs font-normal">
                    {visibleNode.slug}
                  </span>
                </AsideRow>
                <AsideRow label="Type">
                  <span className="font-mono text-xs font-normal">
                    {visibleNode.type}
                  </span>
                </AsideRow>
                <AsideRow label="Execution">
                  {executable
                    ? "Runs in pipeline executions"
                    : "Not implemented by the executor yet"}
                </AsideRow>
                <AsideRow label="Network">
                  <Link
                    to={href()}
                    className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  >
                    <GalleryVerticalEndIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{network.name}</span>
                  </Link>
                </AsideRow>
                {createdAt ? (
                  <AsideRow label="Created">
                    {formatRelativeTime(createdAt)}
                  </AsideRow>
                ) : null}
                {updatedAt && updatedAt !== createdAt ? (
                  <AsideRow label="Updated">
                    {formatRelativeTime(updatedAt)}
                  </AsideRow>
                ) : null}
                <AsideRow label="ID">
                  <CopyIdButton value={visibleNode.id} />
                </AsideRow>
              </dl>
            </DefinitionAsideCard>

            <DefinitionAsideCard title="Used in">
              {usedInPipelines.length > 0 ? (
                <div className="mt-3 flex flex-col gap-1">
                  {usedInPipelines.map(({ pipeline, levelIndexes }) => (
                    <Link
                      key={pipeline.id}
                      to={href(`pipeline-definitions/${pipeline.id}`)}
                      className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <LayersIcon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {pipeline.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {levelIndexes.length === 1
                            ? `Level ${levelIndexes[0]}`
                            : `Levels ${levelIndexes.join(", ")}`}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Not referenced by any pipeline yet.
                </p>
              )}
            </DefinitionAsideCard>
          </>
        }
      >
        {definitionView === "json" ? (
          <JsonDefinitionCard
            definition={visibleNode.definition}
            label="JSONB definition"
            description="Configuration stored on this node."
          />
        ) : (
          <DefinitionCard>
            <SectionHeading
              icon={knownType ? nodeTypeIcons[knownType] : FileJsonIcon}
              title={knownType ? nodeConfigTitles[knownType] : "Configuration"}
              description={typeDescription}
            />
            <div className="mt-6">
              <NodeConfigView
                type={visibleNode.type}
                definition={visibleNode.definition}
              />
            </div>
          </DefinitionCard>
        )}
      </DefinitionColumns>
    </DefinitionPage>
  )
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function NodeConfigView({
  type,
  definition,
}: {
  type: string
  definition: JsonObject
}) {
  if (type === "HTTP") {
    return <HttpConfig definition={definition} />
  }

  if (type === "NOOP") {
    const message =
      typeof definition.message === "string" ? definition.message : ""
    return (
      <ConfigPanel title="Message">
        <ConfigValue value={message || "—"} />
      </ConfigPanel>
    )
  }

  if (type === "MAPPER") {
    return <MapperConfig definition={definition} />
  }

  if (type === "FILE") {
    return <FileConfig definition={definition} />
  }

  return (
    <p className="text-sm text-muted-foreground">
      Switch to JSON to inspect this node configuration.
    </p>
  )
}

function HttpConfig({ definition }: { definition: JsonObject }) {
  const draft = httpDraftFromDefinition(definition)
  const headers = asRecord(definition.headers)
  const headerEntries = headers ? Object.entries(headers) : []

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-l-4 border-l-violet-500 bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold tracking-wider",
                  httpMethodClass(draft.method)
                )}
              >
                {draft.method}
              </span>
              <p className="text-sm font-medium">URL</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Templates can read pipeline input, for example{" "}
              {"{{ .Input.orgId }}"}.
            </p>
          </div>
        </div>
        <div className="p-4">
          <p className="font-mono text-sm break-all">{draft.url || "—"}</p>
        </div>
      </div>

      <ConfigPanel
        title="Headers"
        description={
          headerEntries.length === 0
            ? "This request does not declare any headers."
            : undefined
        }
        count={headerEntries.length}
      >
        {headerEntries.length > 0 ? (
          <EntryList entries={headerEntries} />
        ) : (
          <p className="px-1 py-1 text-sm text-muted-foreground">No headers.</p>
        )}
      </ConfigPanel>

      {draft.bodyText ? (
        <ConfigPanel title="Body">
          <pre className="overflow-auto rounded-xl border bg-background p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
            {draft.bodyText}
          </pre>
        </ConfigPanel>
      ) : (
        <ConfigPanel title="Body">
          <p className="px-1 py-1 text-sm text-muted-foreground">No body.</p>
        </ConfigPanel>
      )}
    </div>
  )
}

function MapperConfig({ definition }: { definition: JsonObject }) {
  const mapping = asRecord(definition.mapping)
  const entries = mapping ? Object.entries(mapping) : []

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This mapper does not declare any fields.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([name, value]) => {
        const formatted = formatValue(value)
        return (
          <div
            key={name}
            className="rounded-xl border bg-background p-4 shadow-xs"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ConfigPart label="Field">
                <p className="font-mono text-sm">{name}</p>
              </ConfigPart>
              <ConfigPart label="From">
                {formatted.multiline ? (
                  <pre className="overflow-auto font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
                    {formatted.text}
                  </pre>
                ) : (
                  <p className="font-mono text-sm break-all">
                    {formatted.text}
                  </p>
                )}
              </ConfigPart>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FileConfig({ definition }: { definition: JsonObject }) {
  const operation =
    typeof definition.operation === "string" ? definition.operation : "—"
  const extra = Object.entries(definition).filter(
    ([key]) => key !== "operation"
  )

  return (
    <div className="flex flex-col gap-3">
      <ConfigPanel title="Operation">
        <ConfigValue value={operation} mono />
      </ConfigPanel>
      {extra.length > 0 ? (
        <ConfigPanel title="Other fields" count={extra.length}>
          <EntryList entries={extra} />
        </ConfigPanel>
      ) : null}
    </div>
  )
}

function ConfigPanel({
  title,
  description,
  count,
  children,
}: {
  title: string
  description?: string
  count?: number
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-muted/20">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {count != null ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {count} {count === 1 ? "item" : "items"}
          </p>
        ) : null}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function ConfigPart({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function ConfigValue({ value, mono }: { value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-xs">
      <p className={cn("text-sm break-all", mono && "font-mono text-[13px]")}>
        {value}
      </p>
    </div>
  )
}

function EntryList({ entries }: { entries: [string, unknown][] }) {
  return (
    <ul className="flex flex-col gap-2">
      {entries.map(([name, value]) => {
        const formatted = formatValue(value)
        return (
          <li
            key={name}
            className="rounded-xl border bg-background p-4 shadow-xs"
          >
            <p className="font-mono text-xs text-muted-foreground">{name}</p>
            {formatted.multiline ? (
              <pre className="mt-1.5 overflow-auto font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
                {formatted.text}
              </pre>
            ) : (
              <p className="mt-1.5 font-mono text-sm break-all">
                {formatted.text}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function pipelinesUsingNode(pipelines: PipelineDefinition[], nodeId: string) {
  return pipelines.flatMap((pipeline) => {
    const levelIndexes = getPipelineLevels(pipeline.definition).flatMap(
      (level, index) => (level.some((ref) => ref.id === nodeId) ? [index] : [])
    )
    if (levelIndexes.length === 0) {
      return []
    }
    return [{ pipeline, levelIndexes }]
  })
}

function asRecord(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function formatValue(value: unknown) {
  if (value == null) {
    return { text: "empty", multiline: false }
  }
  if (typeof value === "string") {
    return { text: value, multiline: value.includes("\n") }
  }
  if (typeof value === "boolean") {
    return { text: value ? "true" : "false", multiline: false }
  }
  const text = JSON.stringify(value, null, 2)
  return { text, multiline: text.includes("\n") }
}

function httpMethodClass(method: string) {
  switch (method) {
    case "GET":
    case "HEAD":
      return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
    case "POST":
      return "bg-blue-500/10 text-blue-800 dark:text-blue-300"
    case "PUT":
    case "PATCH":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-300"
    case "DELETE":
      return "bg-rose-500/10 text-rose-800 dark:text-rose-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}
