import { LoginForm } from "@/components/login-form"
import { Navigate } from "react-router"

import { selectIsAuthenticated } from "@/store/auth-slice"
import { useAppSelector } from "@/store/hooks"

export default function Login() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
