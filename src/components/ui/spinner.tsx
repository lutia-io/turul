import { Loader } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({
  className,
  label = "Loading",
  ...props
}: React.ComponentProps<"svg"> & { label?: string }) {
  return (
    <>
      <Loader
        data-slot="spinner"
        aria-hidden="true"
        className={cn("animate-spin", className)}
        {...props}
      />
      <span className="sr-only">{label}</span>
    </>
  )
}

export { Spinner }
