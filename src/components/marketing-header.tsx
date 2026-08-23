import { Link } from "react-router"

import { BrandMark } from "@/components/brand-mark"
import { buttonVariants } from "@/components/ui/button"

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link
            to="/app/login"
            className={buttonVariants({ variant: "ghost" })}
          >
            Log in
          </Link>
          <Link to="/app/signup" className={buttonVariants()}>
            Sign up
          </Link>
        </div>
      </div>
    </header>
  )
}
