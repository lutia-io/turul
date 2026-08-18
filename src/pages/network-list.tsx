import { useMemo, useState } from "react"
import { Link } from "react-router"
import {
  ArrowRightIcon,
  Building2Icon,
  ChevronDownIcon,
  EllipsisIcon,
  GlobeIcon,
  MapPinIcon,
  PlusIcon,
  Settings2Icon,
  Table2Icon,
  type LucideIcon,
} from "lucide-react"

import { networkList, type Network, type Organization, type Schema } from "@/data/networks"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getBadgeColor,
  statusBadgeConfig,
  type BadgeColor,
} from "@/lib/badge"
import { cn } from "@/lib/utils"

type SortKey = "name" | "organizations" | "schemas"

const sortLabels: Record<SortKey, string> = {
  name: "Name",
  organizations: "Organization count",
  schemas: "Schema count",
}

function StatusBadge({ status }: { status: string }) {
  const config = statusBadgeConfig[status]
  const Icon = config?.icon ?? statusBadgeConfig.Active.icon
  const tone = getBadgeColor(config?.color)

  return (
    <span className="inline-flex" title={status}>
      <Icon className={cn("size-4", tone.fg)} />
      <span className="sr-only">{status}</span>
    </span>
  )
}

function EntityCard({
  to,
  name,
  subtitle,
  status,
  color,
  icon: Icon,
}: {
  to: string
  name: string
  subtitle: string
  status?: string
  color: BadgeColor
  icon: LucideIcon
}) {
  const tone = getBadgeColor(color)

  return (
    <Link
      to={to}
      className="group flex min-h-[88px] min-w-0 items-center gap-3.5 overflow-hidden rounded-xl border bg-background px-3.5 py-3 shadow-xs transition-colors hover:bg-muted/50"
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg",
          tone.bg,
          tone.text
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate font-medium">{name}</p>
          {status ? (
            <span className="shrink-0">
              <StatusBadge status={status} />
            </span>
          ) : null}
        </div>
        <p className="wrap-break-word text-sm text-muted-foreground sm:truncate">
          {subtitle}
        </p>
      </div>
    </Link>
  )
}

function OrganizationCard({ organization }: { organization: Organization }) {
  return (
    <EntityCard
      to={`/app/organizations/${organization.id}`}
      name={organization.name}
      status={organization.status}
      color={organization.color}
      icon={Building2Icon}
      subtitle={`${organization.type} · ${organization.location} · ${organization.members} members`}
    />
  )
}

function SchemaCard({ schema }: { schema: Schema }) {
  return (
    <EntityCard
      to={`/app/schemas/${schema.id}`}
      name={schema.name}
      status={schema.status}
      color={schema.color}
      icon={Table2Icon}
      subtitle={`${schema.format} · v${schema.version} · ${schema.fields} fields`}
    />
  )
}

function NetworkSection({ network }: { network: Network }) {
  return (
    <section className="flex min-w-0 flex-col gap-5 overflow-hidden rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{network.name}</h2>
            <StatusBadge status={network.status} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {network.industry}
            </span>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {network.description}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="size-3.5" />
              {network.headquarters}
            </span>
            <span className="inline-flex items-center gap-1">
              <GlobeIcon className="size-3.5" />
              {network.coverage}
            </span>
            <span>
              {network.organizations.length} organizations · {network.schemas.length}{" "}
              schemas · {network.workflowDefinitions.length} workflows ·{" "}
              {network.pipelineDefinitions.length} pipelines
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm">
            <PlusIcon />
            Create
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link to={`/app/networks/${network.id}`} />}
          >
            <Settings2Icon />
            Settings
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" />}
            >
              <EllipsisIcon />
              <span className="sr-only">More actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  render={<Link to={`/app/networks/${network.id}`} />}
                >
                  View network
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link to={`/app/organizations`} />}
                >
                  View organizations
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link to={`/app/schemas`} />}>
                  View schemas
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Organizations
        </h3>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {network.organizations.map((organization) => (
            <OrganizationCard key={organization.id} organization={organization} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Schemas</h3>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {network.schemas.map((schema) => (
            <SchemaCard key={schema.id} schema={schema} />
          ))}
        </div>
      </div>

      <Link
        to={`/app/networks/${network.id}`}
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        View network
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </section>
  )
}

export default function NetworkList() {
  const [sort, setSort] = useState<SortKey>("name")

  const sortedNetworks = useMemo(() => {
    return [...networkList].sort((a, b) => {
      if (sort === "organizations") {
        return b.organizations.length - a.organizations.length
      }
      if (sort === "schemas") {
        return b.schemas.length - a.schemas.length
      }
      return a.name.localeCompare(b.name)
    })
  }, [sort])

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">All Networks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Networks group organizations and the schemas they share. Open a
              card to inspect a member, or view the full network.
            </p>
          </div>
          <Button>
            <PlusIcon />
            Create a network
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              Sorted by {sortLabels[sort].toLowerCase()}
              <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => {
                  if (value === "name" || value === "organizations" || value === "schemas") {
                    setSort(value)
                  }
                }}
              >
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="organizations">
                  Organization count
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="schemas">
                  Schema count
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-6">
          {sortedNetworks.map((network) => (
            <NetworkSection key={network.id} network={network} />
          ))}
        </div>
    </div>
  )
}
