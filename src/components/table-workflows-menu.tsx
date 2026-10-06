import { useState } from "react"
import { Link } from "react-router"
import {
  BadgeCheckIcon,
  CircleDashedIcon,
  PlusIcon,
  SearchIcon,
  WorkflowIcon,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useNetworkWorkspace } from "@/lib/network-workspace"
import { cn } from "@/lib/utils"
import { useListWorkflowDefinitionsQuery } from "@/store/workflow-slice"

const menuPageSize = 8

export function WorkflowsSubmenu({
  schemaId,
  field,
  showList,
  onCreate,
}: {
  schemaId: string
  field?: string
  showList: boolean
  onCreate?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query.trim(), 200)
  const { network, organizationId, href } = useNetworkWorkspace()
  const list = useListWorkflowDefinitionsQuery(
    {
      schemaId,
      field,
      q: debouncedQuery || undefined,
      networkId: network?.id,
      organizationId,
      internal: false,
      sort: "name",
      order: "asc",
      page: 1,
      pageSize: menuPageSize,
    },
    { skip: !open || !showList || !schemaId || !network?.id }
  )
  const workflows = list.data?.items ?? []
  const total = list.data?.total ?? 0

  return (
    <DropdownMenuSub open={open} onOpenChange={setOpen}>
      <DropdownMenuSubTrigger>
        <WorkflowIcon />
        Workflows
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-72 p-1.5">
        {showList ? (
          <div className="px-1.5 pt-1 pb-1.5">
            <p className="flex items-baseline justify-between gap-2 text-[11px] font-medium text-muted-foreground">
              <span>Manage workflows</span>
              {total > 0 ? (
                <span className="font-normal tabular-nums">{total}</span>
              ) : null}
            </p>
            <div className="relative mt-1.5">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                placeholder="Search"
                aria-label="Search workflows"
                className="h-7 border-transparent bg-muted/70 pl-7 text-xs shadow-none focus-visible:ring-1"
                autoFocus
              />
            </div>
          </div>
        ) : null}
        {showList ? (
          list.isLoading ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>
          ) : workflows.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {debouncedQuery ? "No matches" : "No workflows"}
            </p>
          ) : (
            workflows.map((workflow) => (
              <DropdownMenuItem
                key={workflow.id}
                className="py-2 text-sm"
                render={
                  <Link to={href(`workflow-definitions/${workflow.id}`)} />
                }
              >
                <span className="min-w-0 flex-1 truncate">{workflow.name}</span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium [&_svg]:text-current!",
                    workflow.active
                      ? "bg-emerald-500/10 text-emerald-700! dark:text-emerald-400!"
                      : "bg-yellow-400/20 text-yellow-800! dark:text-yellow-400!"
                  )}
                >
                  {workflow.active ? (
                    <BadgeCheckIcon className="size-3" />
                  ) : (
                    <CircleDashedIcon className="size-3" />
                  )}
                  {workflow.active ? "Enabled" : "Disabled"}
                </span>
              </DropdownMenuItem>
            ))
          )
        ) : null}
        {onCreate ? (
          <>
            {showList ? <DropdownMenuSeparator className="my-1" /> : null}
            <DropdownMenuItem className="text-xs" onClick={onCreate}>
              <PlusIcon />
              New workflow
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
