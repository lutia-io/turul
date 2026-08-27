import { Navigate } from "react-router"

import buildSvg from "@/assets/build.svg"
import { LoginForm } from "@/components/login-form"
import { MarketingHeader } from "@/components/marketing-header"
import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"

export default function Login() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <MarketingHeader />
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
        <div className="relative hidden bg-white lg:block">
          <img src={buildSvg} className="absolute inset-0 size-full object-contain p-10 lg:p-16" />
        </div>
      </div>
    </div>
  )
}
