import { useState, type ReactNode } from "react"
import {
  BadgeCheckIcon,
  CheckIcon,
  CircleDashedIcon,
  CopyIcon,
} from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { formatRelativeTime } from "@/lib/runs"
import { userDisplayName, userInitials, type UserRef } from "@/lib/user"
import { cn } from "@/lib/utils"

export function DefinitionPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-x-hidden bg-muted/40 p-4 sm:p-6 lg:p-8">
      {children}
    </div>
  )
}

export function DefinitionColumns({
  children,
  aside,
}: {
  children: ReactNode
  aside: ReactNode
}) {
  return (
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <aside className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-6">
        {aside}
      </aside>
    </div>
  )
}

export function DefinitionCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl bg-card p-6 shadow-xs ring-1 ring-foreground/10 sm:p-8",
        className
      )}
    >
      {children}
    </section>
  )
}

export function DefinitionAsideCard({
  title,
  children,
  footer,
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
      {footer}
    </section>
  )
}

export function PublicationPills({
  active,
  internal,
}: {
  active?: boolean
  internal: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active != null ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            active
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
          )}
        >
          {active ? (
            <BadgeCheckIcon className="size-3.5" />
          ) : (
            <CircleDashedIcon className="size-3.5" />
          )}
          {active ? "Published" : "Draft"}
        </span>
      ) : null}
      {internal ? (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Internal
        </span>
      ) : null}
    </div>
  )
}

export function AsideRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 text-sm font-medium">{children}</dd>
    </div>
  )
}

export function AuditStamp({
  label,
  at,
  user,
}: {
  label: string
  at?: string | null
  user?: UserRef | null
}) {
  if (!at && !user) {
    return null
  }

  const name = userDisplayName(user)
  const initials = userInitials(user)

  return (
    <AsideRow label={label}>
      <div className="flex min-w-0 items-center gap-2">
        {user ? (
          <HoverCard>
            <HoverCardTrigger
              render={
                <button
                  type="button"
                  className="inline-flex min-w-0 items-center gap-2 text-left"
                />
              }
            >
              <Avatar size="sm">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                {name ? <span className="block truncate">{name}</span> : null}
                {at ? (
                  <span
                    className={
                      name
                        ? "block truncate text-xs font-normal text-muted-foreground"
                        : undefined
                    }
                  >
                    {formatRelativeTime(at)}
                  </span>
                ) : null}
              </span>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="w-64">
              <div className="flex items-center gap-2.5">
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{name || "User"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        ) : at ? (
          formatRelativeTime(at)
        ) : null}
      </div>
    </AsideRow>
  )
}

export function CopyIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copyId() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copyId}
      className="inline-flex max-w-full items-center gap-1.5 font-mono text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <CheckIcon className="size-3.5 shrink-0" />
      ) : (
        <CopyIcon className="size-3.5 shrink-0" />
      )}
    </button>
  )
}

export function DefinitionSkeleton() {
  return (
    <DefinitionPage>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
          <div className="space-y-6">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
          <Skeleton className="h-3 w-16" />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </div>
      </div>
    </DefinitionPage>
  )
}

export function DefinitionStatusPage({
  title,
  message,
  destructive,
  action,
}: {
  title: string
  message: string
  destructive?: boolean
  action?: ReactNode
}) {
  return (
    <DefinitionPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p
            className={cn(
              "text-sm",
              destructive ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {message}
          </p>
        </div>
        {action}
      </div>
    </DefinitionPage>
  )
}
