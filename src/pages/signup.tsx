import { Navigate } from "react-router"

import sunSvg from "@/assets/sun.svg"
import { MarketingHeader } from "@/components/marketing-header"
import { SignupForm } from "@/components/signup-form"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"

export default function Signup() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <MarketingHeader />
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="relative hidden bg-white lg:block">
          <img
            src={sunSvg}
            alt="Person walking toward the sun"
            className="absolute inset-0 size-full object-contain p-10 lg:p-16"
          />
        </div>
        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-xs">
            <SignupForm />
          </div>
        </div>
      </div>
    </div>
  )
}
