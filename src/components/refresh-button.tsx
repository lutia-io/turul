import { type ReactNode } from "react"
import { Loader, RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  size = "icon-sm",
  label = "Refresh",
}: {
  onRefresh: () => void
  isRefreshing?: boolean
  size?: "icon" | "icon-sm"
  label?: string
}) {
  const Icon = isRefreshing ? Loader : RefreshCwIcon

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label={isRefreshing ? "Loading" : label}
      aria-busy={isRefreshing}
      className={isRefreshing ? "disabled:opacity-100" : undefined}
    >
      <Icon className={cn(isRefreshing && "animate-spin")} />
      <span className="sr-only">{isRefreshing ? "Loading" : label}</span>
    </Button>
  )
}

export function LoadingFrame({
  isLoading,
  className,
  label = "Loading",
  children,
}: {
  isLoading?: boolean
  className?: string
  label?: string
  children: ReactNode
}) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/70"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader className="size-6 animate-spin text-muted-foreground" />
          <span className="sr-only">{label}</span>
        </div>
      ) : null}
    </div>
  )
}
