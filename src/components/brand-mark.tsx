import { FishIcon } from "lucide-react"
import { Link } from "react-router"

import { cn } from "@/lib/utils"

export function BrandMark({
  className,
  to = "/",
}: {
  className?: string
  to?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 text-xl font-semibold",
        className
      )}
    >
      <FishIcon className="size-6" />
      <span className="hidden md:inline">Lutia</span>
    </Link>
  )
}
